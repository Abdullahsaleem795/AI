# AI Collections & Reconciliation Platform for Pakistani Retail Shops

> **Eliminate the manual register + calculator + payment-matching workflow used by credit-based retail shops.**

A production-grade multi-tenant SaaS platform built for credit-heavy Pakistani retail shops (hardware, sanitary, electrical, building materials, auto parts, general stores).

---

## Key Capabilities

- **Digital Khata & Immutable Ledger**: Append-only event store preserving financial auditability.
- **Automatic Payment Reconciliation Engine**: Deterministic multi-signal matching hierarchy (Payment Requests, Raast QR, Phone numbers, exact outstanding debt) with an interactive Review Queue for unmatched payments.
- **Collections Aging Dashboard**: Receivables aging breakdown (`0-7`, `8-30`, `31-60`, `61-90`, `90+` days) and batch WhatsApp reminder dispatcher.
- **Controlled Voice & Chat AI Assistant**: Natural language understanding in Roman Urdu & English ("Ahmed ka khata kholo", "Aaj ki sales kya hain?") with mandatory interactive 2-step financial confirmation.
- **Strict Multi-Tenancy & Financial Integrity**: Integer minor units (PKR Paisa) handling to prevent floating point calculation errors.

---

## Quick Start (Local Development)

### 1. Install Dependencies
```bash
# Install root, server & client dependencies
npm install
cd server && npm install
cd ../client && npm install
```

### 2. Seed Database
```bash
npm run seed
```

### 3. Run Automated Tests
```bash
npm test
```

### 4. Start Development Servers
```bash
# Terminal 1: Backend Server (Port 5000)
npm run dev:server

# Terminal 2: Frontend Client (Port 5173)
npm run dev:client
```

---

## Documentation Links

- [Architecture Guide](ARCHITECTURE.md)
- [REST API Specification](API.md)
- [Database Schema & Data Model](DATABASE.md)
- [Security & Multi-Tenancy Controls](SECURITY.md)
- [AI Voice & Tool Calling Architecture](AI.md)
- [Payment Gateways & Adapters](PAYMENTS.md)
- [Reconciliation Engine Matching Algorithm](RECONCILIATION.md)
- [Deployment & Infrastructure Setup](DEPLOYMENT.md)
- [Automated Testing & E2E Suite](TESTING.md)
