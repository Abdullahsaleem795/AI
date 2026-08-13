# TESTING STRATEGY & E2E SUITE

## Test Coverage Overview

The platform includes automated end-to-end integration test suites (`server/tests/demo_scenario.test.js`) executed via Jest and Supertest.

### Tested Scenarios

1. **Shop Registration & Authentication**: Tenant owner registration, password hashing, and JWT token issuance.
2. **Customer & Opening Balance Creation**: Customer registration with Pakistani phone normalization (+92 format) and initial opening debt posting to Ledger.
3. **Credit Sale Billing**: Invoice creation, itemized calculation in Paisa, and DEBIT posting to Ledger.
4. **Partial Payment Posting**: Counter cash payment processing and CREDIT posting to Ledger.
5. **Raast Payment Request Generation**: Dynamic QR payload generation and payment URL creation.
6. **Automatic Reconciliation Workflow**: Bank webhook receipt, deterministic reference matching, 100% auto-reconciliation, and zero balance calculation.
7. **Idempotency Verification**: Duplicate webhook submission handling ensuring zero financial duplication.
8. **AI Assistant Integration**: Natural language Roman Urdu balance query verification against database truth.

---

## Running Tests

To run the automated test suite:

```bash
cd server
npm test
```
