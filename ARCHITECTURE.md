# ARCHITECTURE GUIDE

## Modular Monolith Design
The system is built as a **Modular Monolith** with isolated business domain boundaries to simplify deployment while maintaining clean service boundaries for future microservice extraction.

```
                    ┌─────────────────────────┐
                    │     Web Dashboard       │
                    │   React / PWA / Mobile  │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │       API Gateway       │
                    │ Auth / Rate Limit / ACL │
                    └────────────┬────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
 ┌──────────────┐       ┌────────────────┐      ┌────────────────┐
 │Customer/Khata│       │ Sales & Credit │      │ Payments       │
 │Module        │       │ Module         │      │ Module         │
 └──────┬───────┘       └───────┬────────┘      └───────┬────────┘
        │                         │                       │
        └────────────────┬────────┴───────────────────────┘
                         ▼
                ┌────────────────────┐
                │ Reconciliation     │
                │ Engine             │
                └─────────┬──────────┘
                          │
              ┌───────────┼────────────┐
              ▼           ▼            ▼
        Collections   Notifications    AI
          Engine         Engine      Assistant
              │           │            │
              └───────────┼────────────┘
                          ▼
                ┌────────────────────┐
                │ MongoDB + Redis    │
                │ Object Storage     │
                └────────────────────┘
```

---

## Core System Modules

1. **Auth & Multi-Tenancy**: Tenant context isolation, role-based permission checks (`OWNER`, `MANAGER`, `CASHIER`, `COLLECTION_AGENT`, `ACCOUNTANT`).
2. **Customer & Ledger Module**: Manages Pakistani mobile number normalization (+92 format) and maintains an append-only immutable financial event ledger (`SALE`, `PAYMENT`, `OPENING_BALANCE`, `REVERSAL`).
3. **Sales & Billing Module**: Calculates itemized invoice totals server-side, checks credit limits, and posts debit events to ledger.
4. **Payments & Webhooks Module**: Manages manual cash receipts, dynamic Raast QR payment request links, and processes bank webhooks idempotently.
5. **Reconciliation Engine**: Scores incoming digital payments deterministically (100% Exact Ref, 85% Phone Match, 65% Amount Match) and exposes an unresolved review queue.
6. **Collections & Aging Engine**: Computes debt aging buckets (0-7, 8-30, 31-60, 61-90, 90+ days) and queues WhatsApp reminders.
7. **AI Voice & Tool Calling Assistant**: Orchestrates natural language queries in Roman Urdu and English with two-step interactive financial action confirmations.
