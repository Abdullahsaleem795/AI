import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { jest } from '@jest/globals';

describe('AI SAFETY TESTS', () => {
  jest.setTimeout(30000);
  let mongoServer;
  let token;
  let tenantId;

  beforeAll(async () => {
    if (process.env.TEST_MONGODB_URI) {
      if (process.env.TEST_MONGODB_URI.includes('production')) {
        throw new Error('SAFETY GUARD: Do not use production database for tests.');
      }
      await mongoose.connect(process.env.TEST_MONGODB_URI);
      await mongoose.connection.db.dropDatabase();
    } else {
      mongoServer = await MongoMemoryServer.create();
      const uri = mongoServer.getUri();
      await mongoose.connect(uri);
    }
    
    const res = await request(app).post('/api/auth/register').send({
      shopName: 'AI Shop', ownerName: 'AI Owner', phone: '+923999999999', email: 'ai@shop.pk', password: 'password123'
    });
    token = res.body.data.tokens.accessToken;
    tenantId = res.body.data.tenant.id;
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

  test('AI Regex Injection Prevention (ReDoS)', async () => {
    // Pass a heavily nested regex that would normally cause ReDoS if not escaped
    const maliciousQuery = '.*.*.*.*.*.*.*.*.*.*.*.*.*a ka khata';
    const startTime = Date.now();
    
    const res = await request(app).post('/api/ai/chat').set('Authorization', `Bearer ${token}`).send({
      query: maliciousQuery
    });
    
    const duration = Date.now() - startTime;
    // Should return very quickly (well under 1 second) because it's escaped
    expect(res.status).toBe(200);
    expect(duration).toBeLessThan(1000);
  });

  test('AI Mutation requires explicit confirmation payload', async () => {
    const res = await request(app).post('/api/ai/chat').set('Authorization', `Bearer ${token}`).send({
      query: 'Ahmed ka Rs. 10000 payment record karo'
    });
    
    expect(res.status).toBe(200);
    expect(res.body.data.requiresConfirmation).toBe(true);
    expect(res.body.data.actionPayload).toBeDefined();
    expect(res.body.data.actionPayload.actionType).toBe('RECORD_PAYMENT');
  });
});
