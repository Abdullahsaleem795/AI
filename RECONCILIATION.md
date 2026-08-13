# AUTOMATIC PAYMENT RECONCILIATION ENGINE

## Overview & Purpose
The Reconciliation Engine automatically matches incoming bank transfers and Raast digital payments to the correct customer khata account, sale invoice, and outstanding debt balance.

---

## Signal Hierarchy & Scoring Matrix

| Signal | Description | Confidence Score | Action Taken |
|---|---|---|---|
| **Signal 1: Exact Reference Match** | `merchantReference` matches active `PaymentRequest` reference | **100%** | `AUTO_RECONCILED` → Ledger Updated & Invoice Marked Paid |
| **Signal 2: Phone Match** | `customerPhone` matches registered Customer number | **85%** | `AUTO_RECONCILED` → Ledger Updated |
| **Signal 3: Single Amount Match** | Payment amount exactly equals debt of a single active customer | **80%** | `AUTO_RECONCILED` → Ledger Updated |
| **Signal 4: Ambiguous Candidates** | Multiple customers owe identical amount | **65%** | `REVIEW_REQUIRED` → Placed in Review Queue |
| **Signal 5: Unmatched** | No reference, phone, or customer debt match found | **0%** | `UNMATCHED` → Placed in Review Queue |

---

## Idempotency Rules

1. Webhooks are checked against `providerTransactionId`.
2. Re-sent webhooks return HTTP 200 OK with previous reconciliation status without creating duplicate financial records or double-crediting customer balances.
