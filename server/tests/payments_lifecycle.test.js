import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app.js';
import { Tenant } from '../src/modules/tenants/tenant.model.js';
import { Customer } from '../src/modules/customers/customer.model.js';
import { User } from '../src/modules/users/user.model.js';
import { Payment } from '../src/modules/payments/payment.model.js';
import { PaymentRequest } from '../src/modules/payments/paymentRequest.model.js';
import { ReconciliationRecord } from '../src/modules/reconciliation/reconciliation.model.js';
import crypto from 'crypto';
import { jest } from '@jest/globals';

jest.setTimeout(30000);

import { MongoMemoryServer } from 'mongodb-memory-server';

let server;
let tenantId;
let customerId;
let ownerToken;
let staffToken;
let otherTenantToken;
let mongoServer;
const testSecret = 'sandbox_raast_webhook_secret_67890';

beforeAll(async () => {
  console.log('Starting payments_lifecycle setup...');
  if (process.env.TEST_MONGODB_URI) {
    if (process.env.TEST_MONGODB_URI.includes('production')) {
      throw new Error('Safety Stop: Refusing to run tests against a production database.');
    }
    console.log('Connecting to TEST_MONGODB_URI...');
    await mongoose.connect(process.env.TEST_MONGODB_URI);
    await mongoose.connection.db.dropDatabase();
  } else {
    console.log('Starting MongoMemoryServer...');
    mongoServer = await MongoMemoryServer.create();
    console.log('Connecting to MongoMemoryServer...');
    await mongoose.connect(mongoServer.getUri());
  }
  console.log('Syncing indexes...');
  await mongoose.syncIndexes();

  // Create Tenant 1 & Owner
  console.log('Creating tenant 1...');
  const resRegister = await request(app)
    .post('/api/auth/register')
    .send({
      shopName: 'Payment Test Shop', ownerName: 'Owner', phone: '+923000000001', email: 'owner@shop.com', password: 'password123'
    });
  console.log('Tenant 1 Register Response Status:', resRegister.status);
  console.log('Tenant 1 Register Response Body:', JSON.stringify(resRegister.body, null, 2));
  ownerToken = resRegister.body?.data?.tokens?.accessToken;
  tenantId = resRegister.body?.data?.tenant?.id;

  // Create Tenant 2
  console.log('Creating tenant 2...');
  const resTenant2 = await request(app)
    .post('/api/auth/register')
    .send({
      shopName: 'Other Shop', ownerName: 'Other', phone: '+923000000003', email: 'other@shop.com', password: 'password123'
    });
  otherTenantToken = resTenant2.body.data.tokens.accessToken;

  // Force RaastAdapter signature validation bypass environment
  process.env.NODE_ENV = 'development';
  process.env.RAAST_WEBHOOK_SECRET = testSecret;

  console.log('Starting server...');
  server = app.listen(0);
  console.log('Setup complete.');
});

afterAll(async () => {
  console.log('Tearing down...');
  if (mongoose.connection.readyState) {
    await mongoose.connection.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
  if (server) {
    server.close();
  }
});

const generateSignature = (payload) => {
  return crypto.createHmac('sha256', testSecret).update(JSON.stringify(payload)).digest('hex');
};

describe('Payment Lifecycle & Security Tests', () => {
  jest.setTimeout(30000); // 30 seconds for normal DB operations
  let customer;

  beforeEach(async () => {
    // Create fresh customer for each test
    const randomPhone = '+92300' + Math.floor(1000000 + Math.random() * 9000000).toString();
    const resCust = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Test Customer ' + Date.now(), phone: randomPhone });
    customer = resCust.body?.data?.customer;
  });

  test('1. Payment request test & invalid signature test', async () => {
    const resReq = await request(app)
      .post('/api/payments/request')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ customerId: customer._id, amount: 5000 });
    
    expect(resReq.statusCode).toBe(201);
    const paymentRequestRef = resReq.body.data.paymentRequest.reference;
    expect(paymentRequestRef).toBeDefined();

    // Invalid webhook signature
    // Because NODE_ENV=development in test environment, we MUST use a truly wrong signature
    // Wait, development uses sandbox_valid_signature fallback. We won't use it here.
    const payload = {
      providerTransactionId: 'TX-INVALID',
      merchantReference: paymentRequestRef,
      amountPaisa: 500000,
      status: 'SUCCESS'
    };

    const resWebhook = await request(app)
      .post('/api/webhooks/raast')
      .set('x-tenant-id', tenantId)
      .set('x-raast-signature', 'wrong_signature')
      .send(payload);

    // Development environment will accept the fallback if it's strictly 'sandbox_valid_signature'
    // But since we sent 'wrong_signature', it should fail! 
    expect(resWebhook.statusCode).toBe(401);
  });

  test('2. Webhook payload FAILED skips ledger', async () => {
    const payload = {
      providerTransactionId: 'TX-FAILED-1',
      amountPaisa: 100000,
      status: 'FAILED',
      customerPhone: customer.phone
    };
    
    const res = await request(app)
      .post('/api/webhooks/raast')
      .set('x-tenant-id', tenantId)
      .set('x-raast-signature', generateSignature(payload))
      .send(payload);
    
    expect(res.statusCode).toBe(200);

    const p = await Payment.findOne({ providerTransactionId: 'TX-FAILED-1' });
    expect(p.status).toBe('FAILED');

    const c = await Customer.findById(customer._id);
    expect(c.currentBalance).toBe(0);
  });

  test('3. Overpayment policy test', async () => {
    const payload = {
      providerTransactionId: 'TX-OVERPAY',
      amountPaisa: 500000,
      status: 'SUCCESS',
      customerPhone: customer.phone
    };

    await request(app)
      .post('/api/webhooks/raast')
      .set('x-tenant-id', tenantId)
      .set('x-raast-signature', generateSignature(payload))
      .send(payload);
    
    const c = await Customer.findById(customer._id);
    expect(c.currentBalance).toBe(-500000);
  });

  test('4. Payment Reversal & RBAC Test', async () => {
    const resPay = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ customerId: customer._id, amount: 2000, method: 'CASH' });
    
    expect(resPay.statusCode).toBe(201);
    const paymentId = resPay.body.data.payment._id;

    const resStaffRev = await request(app)
      .post(`/api/payments/${paymentId}/reverse`)
      .set('Authorization', `Bearer ${otherTenantToken}`)
      .send({ reason: 'Mistake' });
    expect(resStaffRev.statusCode).toBe(404); // Should be 404 because payment belongs to another tenant

    const resUnauth = await request(app)
      .post(`/api/payments/${paymentId}/reverse`)
      .send({ reason: 'Mistake' });
    expect(resUnauth.statusCode).toBe(401);

    const resCrossRev = await request(app)
      .post(`/api/payments/${paymentId}/reverse`)
      .set('Authorization', `Bearer ${otherTenantToken}`)
      .send({ reason: 'Mistake' });
    expect(resCrossRev.statusCode).toBe(404);

    const resRev = await request(app)
      .post(`/api/payments/${paymentId}/reverse`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ reason: 'Mistake' });
    expect(resRev.statusCode).toBe(200);

    const p = await Payment.findById(paymentId);
    expect(p.status).toBe('REVERSED');

    const cAfter = await Customer.findById(customer._id);
    expect(cAfter.currentBalance).toBe(0);
  });

  test('5. Webhook duplicate handling test (Idempotency)', async () => {
    const payload = {
      providerTransactionId: 'TX-DUP',
      amountPaisa: 5000,
      status: 'SUCCESS',
      customerPhone: customer.phone
    };
    const signature = generateSignature(payload);

    const res1 = await request(app).post('/api/webhooks/raast').set('x-tenant-id', tenantId).set('x-raast-signature', signature).send(payload);
    expect(res1.statusCode).toBe(200);

    const res2 = await request(app).post('/api/webhooks/raast').set('x-tenant-id', tenantId).set('x-raast-signature', signature).send(payload);
    expect(res2.statusCode).toBe(200);
    expect(res2.body.data.duplicate).toBe(true);
    
    const count = await Payment.countDocuments({ providerTransactionId: 'TX-DUP' });
    expect(count).toBe(1);
  });

  test('6. Concurrent webhook test (Race Condition Idempotency)', async () => {
    const payload = {
      providerTransactionId: 'TX-CONCURRENT',
      amountPaisa: 5000,
      status: 'SUCCESS',
      customerPhone: customer.phone
    };
    const signature = generateSignature(payload);

    const reqs = Array(3).fill().map(() => 
      request(app).post('/api/webhooks/raast').set('x-tenant-id', tenantId).set('x-raast-signature', signature).send(payload)
    );

    const responses = await Promise.all(reqs);
    responses.forEach(r => expect(r.statusCode).toBe(200));

    const count = await Payment.countDocuments({ providerTransactionId: 'TX-CONCURRENT' });
    expect(count).toBe(1);
  });

  test('7. Amount tampering test', async () => {
    const resReq = await request(app)
      .post('/api/payments/request')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ customerId: customer._id, amount: 2000 });
    const ref = resReq.body.data.paymentRequest.reference;

    const payload = {
      providerTransactionId: 'TX-TAMPER',
      merchantReference: ref,
      amountPaisa: 10000,
      status: 'SUCCESS',
      customerPhone: customer.phone
    };
    const signature = generateSignature(payload);

    await request(app)
      .post('/api/webhooks/raast')
      .set('x-tenant-id', tenantId)
      .set('x-raast-signature', signature)
      .send(payload);

    const c = await Customer.findById(customer._id);
    expect(c.currentBalance).toBe(-10000); // Only 100 PKR credited
  });
});
