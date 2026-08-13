import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { Tenant } from '../modules/tenants/tenant.model.js';
import { User } from '../modules/users/user.model.js';
import { Customer } from '../modules/customers/customer.model.js';
import { Sale } from '../modules/sales/sale.model.js';
import { Payment } from '../modules/payments/payment.model.js';
import { LedgerService } from '../modules/ledger/ledger.service.js';
import { ReconciliationEngine } from '../modules/reconciliation/reconciliation.service.js';
import logger from './logger.js';

const seedDatabase = async () => {
  try {
    await connectDB();
    logger.info('Clearing old development database data...');

    await Tenant.deleteMany({});
    await User.deleteMany({});
    await Customer.deleteMany({});
    await Sale.deleteMany({});
    await Payment.deleteMany({});
    await mongoose.connection.collection('ledgerentries').deleteMany({});
    await mongoose.connection.collection('reconciliationrecords').deleteMany({});

    // 1. Create Tenant
    const tenant = new Tenant({
      name: 'ABC Hardware & Sanitary Store',
      phone: '+923001234567',
      email: 'owner@abchardware.pk',
      address: 'Main Commercial Market, Gulberg, Lahore',
      currency: 'PKR',
      businessType: 'HARDWARE_RETAIL'
    });
    await tenant.save();

    // 2. Create Owner User
    const passwordHash = await User.hashPassword('password123');
    const owner = new User({
      tenantId: tenant._id,
      name: 'Abdullah Saleem',
      phone: '+923001234567',
      email: 'owner@abchardware.pk',
      passwordHash,
      roles: ['OWNER'],
      status: 'ACTIVE'
    });
    await owner.save();

    tenant.ownerId = owner._id;
    await tenant.save();

    logger.info(`Tenant created: ${tenant.name} (${tenant._id})`);

    // 3. Create Seed Customers
    const c1 = new Customer({
      tenantId: tenant._id,
      customerCode: 'CUST-0001',
      name: 'Ahmed Khan',
      phone: '+923001112233',
      address: 'Shop 12, Hardware Lane, Lahore',
      creditLimit: 5000000, // Rs 50,000 in Paisa
      openingBalance: 1850000, // Rs 18,500 in Paisa
      currentBalance: 0,
      qrIdentifier: 'KHT-CUST-AHMED'
    });
    await c1.save();
    await LedgerService.recordEvent({
      tenantId: tenant._id,
      customerId: c1._id,
      type: 'OPENING_BALANCE',
      direction: 'DEBIT',
      amount: 1850000,
      description: 'Opening credit balance for Ahmed Khan',
      createdBy: owner._id
    });

    const c2 = new Customer({
      tenantId: tenant._id,
      customerCode: 'CUST-0002',
      name: 'Bilal Traders',
      phone: '+923004445566',
      address: 'Factory Area, Faisalabad',
      creditLimit: 10000000, // Rs 100,000
      openingBalance: 4850000, // Rs 48,500
      currentBalance: 0,
      qrIdentifier: 'KHT-CUST-BILAL'
    });
    await c2.save();
    await LedgerService.recordEvent({
      tenantId: tenant._id,
      customerId: c2._id,
      type: 'OPENING_BALANCE',
      direction: 'DEBIT',
      amount: 4850000,
      description: 'Opening balance for Bilal Traders',
      createdBy: owner._id
    });

    const c3 = new Customer({
      tenantId: tenant._id,
      customerCode: 'CUST-0003',
      name: 'Usman Ali',
      phone: '+923007778899',
      address: 'Model Town, Lahore',
      creditLimit: 3000000, // Rs 30,000
      openingBalance: 1720000, // Rs 17,200
      currentBalance: 0,
      qrIdentifier: 'KHT-CUST-USMAN'
    });
    await c3.save();
    await LedgerService.recordEvent({
      tenantId: tenant._id,
      customerId: c3._id,
      type: 'OPENING_BALANCE',
      direction: 'DEBIT',
      amount: 1720000,
      description: 'Opening balance for Usman Ali',
      createdBy: owner._id
    });

    logger.info('Customers created: Ahmed Khan, Bilal Traders, Usman Ali');

    // 4. Create Sale for Ahmed Khan (Rs 6,200) -> Balance becomes Rs 24,700
    const sale1 = new Sale({
      tenantId: tenant._id,
      customerId: c1._id,
      invoiceNumber: 'INV-0001',
      saleType: 'CREDIT',
      items: [
        { name: 'PVR Water Pipes 10ft', quantity: 10, unitPrice: 42000, total: 420000 },
        { name: 'Brass Valves 2 inch', quantity: 4, unitPrice: 50000, total: 200000 }
      ],
      subtotal: 620000,
      discount: 0,
      tax: 0,
      grandTotal: 620000,
      amountPaid: 0,
      amountDue: 620000,
      paymentStatus: 'UNPAID',
      createdBy: owner._id
    });
    await sale1.save();
    await LedgerService.recordEvent({
      tenantId: tenant._id,
      customerId: c1._id,
      type: 'SALE',
      direction: 'DEBIT',
      amount: 620000,
      referenceType: 'SALE',
      referenceId: sale1._id.toString(),
      description: 'Invoice INV-0001 created',
      createdBy: owner._id
    });

    // 5. Partial payment by Ahmed Khan (Rs 5,000) -> Balance becomes Rs 19,700
    const p1 = new Payment({
      tenantId: tenant._id,
      customerId: c1._id,
      saleId: sale1._id,
      amount: 500000,
      currency: 'PKR',
      method: 'CASH',
      provider: 'MANUAL',
      providerTransactionId: 'CASH-001',
      status: 'SUCCESS',
      initiatedAt: new Date(),
      confirmedAt: new Date(),
      createdBy: owner._id
    });
    await p1.save();
    await LedgerService.recordEvent({
      tenantId: tenant._id,
      customerId: c1._id,
      type: 'PAYMENT',
      direction: 'CREDIT',
      amount: 500000,
      referenceType: 'PAYMENT',
      referenceId: p1._id.toString(),
      description: 'Partial cash payment received',
      createdBy: owner._id
    });

    // 6. Simulate Incoming Raast Webhook Payment for Bilal Traders (Rs 20,000) -> Auto Reconciled
    await ReconciliationEngine.processIncomingPayment(tenant._id, {
      providerTransactionId: 'RAAST-SEED-TX-999',
      merchantReference: 'REQ-SEED-BILAL',
      amountPaisa: 2000000, // Rs 20,000
      customerPhone: '+923004445566',
      method: 'RAAST_QR',
      provider: 'RAAST'
    });

    // 7. Simulate Ambiguous Incoming Payment (Rs 15,000) -> Flagger to REVIEW_REQUIRED
    await ReconciliationEngine.processIncomingPayment(tenant._id, {
      providerTransactionId: 'RAAST-UNMATCHED-101',
      merchantReference: '',
      amountPaisa: 1500000, // Rs 15,000
      customerPhone: '+923990001122',
      method: 'RAAST_QR',
      provider: 'RAAST'
    });

    logger.info('Database seed completed successfully!');
    logger.info('Owner Login Credentials: Phone: +923001234567 | Password: password123');

    await disconnectDB();
  } catch (error) {
    logger.error('Database seed error:', error);
    process.exit(1);
  }
};

seedDatabase();
