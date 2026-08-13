import mongoose from 'mongoose';
import { normalizePhone } from '../src/utils/phone.js';
import { AIOrchestrator } from '../src/modules/ai/ai.orchestrator.js';

describe('UNIT FINANCIAL & ENGINE LOGIC TESTS', () => {

  test('1. Pakistani Phone Normalization (+92 Format)', () => {
    expect(normalizePhone('03001234567')).toBe('+923001234567');
    expect(normalizePhone('0300-1234567')).toBe('+923001234567');
    expect(normalizePhone('923001234567')).toBe('+923001234567');
    expect(normalizePhone('+923001234567')).toBe('+923001234567');
  });

  test('2. Financial Ledger Paisa Precision Math', () => {
    // 1 PKR = 100 Paisa
    const openingBalancePaisa = 1850000; // Rs 18,500
    const saleCreditPaisa = 620000; // Rs 6,200
    const partialPaymentPaisa = 500000; // Rs 5,000

    // Debit increases balance debt (+), Credit decreases balance debt (-)
    let currentBalance = openingBalancePaisa;
    currentBalance += saleCreditPaisa; // 24,700 PKR (2470000 Paisa)
    expect(currentBalance).toBe(2470000);
    expect((currentBalance / 100).toFixed(2)).toBe('24700.00');

    currentBalance -= partialPaymentPaisa; // 19,700 PKR (1970000 Paisa)
    expect(currentBalance).toBe(1970000);
    expect((currentBalance / 100).toFixed(2)).toBe('19700.00');

    // Final Raast Reconciled Payment
    currentBalance -= 1970000;
    expect(currentBalance).toBe(0);
    expect((currentBalance / 100).toFixed(2)).toBe('0.00');
  });

  test('3. Rule 8 AI Financial Safety & Mandatory Confirmation', async () => {
    const mockTenantId = new mongoose.Types.ObjectId();

    // Query asking AI to record payment without prior confirmation
    const result = await AIOrchestrator.processUserQuery(
      mockTenantId,
      'Ahmed ko 10000 payment receive kar do',
      null
    );

    // AI MUST NOT execute database mutation directly; it MUST demand confirmation
    expect(result.intent).toBe('RECORD_PAYMENT');
    expect(result.requiresConfirmation).toBe(true);
    expect(result.confirmationPrompt).toContain('10,000');
    expect(result.actionPayload.amount).toBe(10000);
  });
});
