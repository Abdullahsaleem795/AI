import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { jest } from '@jest/globals';
import crypto from 'crypto';

const testSecret = process.env.RAAST_WEBHOOK_SECRET || 'sandbox_raast_webhook_secret_67890';
const generateSignature = (payload) => {
  return crypto.createHmac('sha256', testSecret).update(JSON.stringify(payload)).digest('hex');
};

describe('MASTER DEMO SCENARIO & END-TO-END VERIFICATION (Prompt Step 47)', () => {
  jest.setTimeout(30000); // 30 seconds for normal DB operations
  let token;
  let tenantId;
  let ahmedCustomerId;
  let saleId;
  let paymentRequestRef;
  let mongoServer;

  beforeAll(async () => {
    if (process.env.TEST_MONGODB_URI) {
      if (process.env.TEST_MONGODB_URI.includes('production')) {
        throw new Error('SAFETY GUARD: Do not use production database for tests.');
      }
      console.log('Using explicit TEST_MONGODB_URI for tests.');
      await mongoose.connect(process.env.TEST_MONGODB_URI);
      // Clean DB before starting
      await mongoose.connection.db.dropDatabase();
      await mongoose.syncIndexes();
    } else {
      console.log('Falling back to mongodb-memory-server...');
      mongoServer = await MongoMemoryServer.create();
      const uri = mongoServer.getUri();
      await mongoose.connect(uri);
      await mongoose.syncIndexes();
    }
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.dropDatabase();
      await mongoose.disconnect();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  });


  test('0. Register Shop Tenant & Owner User', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        shopName: 'E2E Hardware Store',
        ownerName: 'Test Owner',
        phone: '+923000000000',
        email: 'owner@e2ehardware.pk',
        password: 'password123'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tokens.accessToken).toBeDefined();

    token = res.body.data.tokens.accessToken;
    tenantId = res.body.data.tenant.id;
  });

  test('Step 1: Create customer Ahmed Khan with Opening Balance Rs 18,500', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Ahmed Khan',
        phone: '03001234567',
        openingBalance: 18500 // Rs 18,500
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.customer.name).toBe('Ahmed Khan');
    expect(res.body.data.customer.currentBalancePKR).toBe('18500.00');

    ahmedCustomerId = res.body.data.customer._id;
  });

  test('Step 2: Create credit sale of Rs 6,200 -> Balance becomes Rs 24,700', async () => {
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId: ahmedCustomerId,
        saleType: 'CREDIT',
        items: [
          { name: 'Sanitary Pipes', quantity: 2, unitPrice: 3100 } // 2 * 3100 = 6200
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sale.grandTotalPKR).toBe('6200.00');
    expect(res.body.data.customer.currentBalancePKR).toBe('24700.00');

    saleId = res.body.data.sale._id;
  });

  test('Step 3: Receive partial payment of Rs 5,000 -> Balance becomes Rs 19,700', async () => {
    const res = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId: ahmedCustomerId,
        amount: 5000,
        method: 'CASH'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.payment.amountPKR).toBe('5000.00');
    expect(res.body.data.customer.currentBalancePKR).toBe('19700.00');
  });

  test('Step 4: Generate Payment Request for Rs 19,700', async () => {
    const res = await request(app)
      .post('/api/payments/request')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId: ahmedCustomerId,
        amount: 19700,
        saleId
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.paymentRequest.reference).toBeDefined();
    expect(res.body.data.paymentRequest.qrPayload).toBeDefined();

    paymentRequestRef = res.body.data.paymentRequest.reference;
  });

  test('Step 5, 6, 7: Send Webhook Simulation -> Automatic Payment Reconciliation -> Balance becomes Rs 0', async () => {
    const webhookPayload = {
      providerTransactionId: 'TX-RAAST-E2E-1001',
      merchantReference: paymentRequestRef,
      amountPaisa: 1970000, // Rs 19,700 in Paisa
      customerPhone: '+923001234567',
      status: 'SUCCESS'
    };

    const res = await request(app)
      .post('/api/webhooks/raast')
      .set('x-tenant-id', tenantId)
      .set('x-webhook-signature', generateSignature(webhookPayload))
      .send(webhookPayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reconciled).toBe(true);

    // Verify Ahmed Khan Balance is now 0.00
    const custRes = await request(app)
      .get(`/api/customers/${ahmedCustomerId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(custRes.status).toBe(200);
    expect(custRes.body.data.customer.currentBalancePKR).toBe('0.00');
  });

  test('CRITICAL RULE 7: Duplicate Webhook Idempotency (Same Webhook Triggered Twice)', async () => {
    const webhookPayload = {
      providerTransactionId: 'TX-RAAST-E2E-1001', // Duplicate transaction ID
      merchantReference: paymentRequestRef,
      amountPaisa: 1970000,
      customerPhone: '+923001234567',
      status: 'SUCCESS'
    };

    const res = await request(app)
      .post('/api/webhooks/raast')
      .set('x-tenant-id', tenantId)
      .set('x-webhook-signature', generateSignature(webhookPayload))
      .send(webhookPayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify balance remains exactly Rs 0 (not negative Rs 19,700)
    const custRes = await request(app)
      .get(`/api/customers/${ahmedCustomerId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(custRes.body.data.customer.currentBalancePKR).toBe('0.00');
  });

  test('CRITICAL RULE 7: Concurrent Webhook Idempotency', async () => {
    const concurrentPayload = {
      providerTransactionId: 'TX-RAAST-E2E-CONCURRENT',
      merchantReference: 'NON-EXISTENT',
      amountPaisa: 500000, // 5000 PKR
      customerPhone: '+923001234567',
      status: 'SUCCESS'
    };

    // Fire two identical requests at the exact same time
    const [res1, res2] = await Promise.all([
      request(app).post('/api/webhooks/raast').set('x-tenant-id', tenantId).set('x-webhook-signature', generateSignature(concurrentPayload)).send(concurrentPayload),
      request(app).post('/api/webhooks/raast').set('x-tenant-id', tenantId).set('x-webhook-signature', generateSignature(concurrentPayload)).send(concurrentPayload)
    ]);

    // One should succeed, the other should fail or gracefully ignore (return 200 but not process)
    // Actually, uniqueness constraint will throw a Duplicate Key Error on insertion
    // The webhook handler should catch it and return 200 idempotently
    expect([res1.status, res2.status]).toContain(200);
    
    const custRes = await request(app).get(`/api/customers/${ahmedCustomerId}`).set('Authorization', `Bearer ${token}`);
    expect(custRes.body.data.customer.currentBalancePKR).toBe('-5000.00'); // Assuming it was 0, now overpaid by 5000
  });

  test('Step 8: Reconciliation Ambiguity (Multiple exact matches without reference)', async () => {
    // Create Bilal and Usman with 10k outstanding
    let bilalId;
    
    // Create Bilal
    const bRes = await request(app).post('/api/customers').set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bilal', phone: '03001111111', openingBalance: 10000 });
    bilalId = bRes.body.data.customer._id;

    // Create Usman
    await request(app).post('/api/customers').set('Authorization', `Bearer ${token}`)
      .send({ name: 'Usman', phone: '03002222222', openingBalance: 10000 });

    // Send ambiguous 10,000 webhook without reference
    const ambiguousPayload = {
      providerTransactionId: 'TX-RAAST-AMBIGUOUS',
      merchantReference: '',
      amountPaisa: 1000000,
      customerPhone: '+923009999999', // Unknown phone
      status: 'SUCCESS'
    };

    const res = await request(app).post('/api/webhooks/raast').set('x-tenant-id', tenantId).set('x-webhook-signature', generateSignature(ambiguousPayload)).send(ambiguousPayload);
    
    expect(res.status).toBe(200);
    expect(res.body.data.reconciled).toBe(false); // Must NOT auto reconcile
    expect(res.body.data.status).toBe('REVIEW_REQUIRED');

    // Send explicit reference for Bilal
    const explicitPayload = {
      providerTransactionId: 'TX-RAAST-EXPLICIT',
      merchantReference: 'BILAL-REF-001',
      amountPaisa: 1000000,
      customerPhone: '+923001111111', // Matches Bilal
      status: 'SUCCESS'
    };
    
    // First create a PaymentRequest to match against
    await request(app).post('/api/payments/request').set('Authorization', `Bearer ${token}`)
      .send({ customerId: bilalId, amount: 10000, reference: 'BILAL-REF-001' });

    const explicitRes = await request(app).post('/api/webhooks/raast').set('x-tenant-id', tenantId).set('x-webhook-signature', generateSignature(explicitPayload)).send(explicitPayload);
    expect(explicitRes.body.data.reconciled).toBe(true);
  });

  test('Step 10: Ask AI Assistant "Ahmed ka kitna khata hai?" -> Returns Rs 0 balance', async () => {

    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: 'Ahmed ka kitna khata hai?'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.intent).toBe('CUSTOMER_STATEMENT');
    expect(res.body.data.reply).toContain('0.00');
  });
});
