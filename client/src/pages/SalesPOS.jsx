import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { ShoppingCart, Plus, Trash2, CheckCircle, Printer } from 'lucide-react';

export const SalesPOS = () => {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [saleType, setSaleType] = useState('CREDIT');
  const [items, setItems] = useState([{ name: '', quantity: 1, unitPrice: '' }]);
  const [discount, setDiscount] = useState('0');
  const [tax, setTax] = useState('0');
  const [amountPaid, setAmountPaid] = useState('0');
  const [loading, setLoading] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await apiFetch('/customers');
      setCustomers(res.data.customers);
      if (res.data.customers.length > 0) {
        setSelectedCustomerId(res.data.customers[0]._id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addItemRow = () => {
    setItems([...items, { name: '', quantity: 1, unitPrice: '' }]);
  };

  const removeItemRow = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  // Compute live estimated subtotal
  const subtotal = items.reduce((sum, item) => {
    const q = parseInt(item.quantity) || 0;
    const p = parseFloat(item.unitPrice) || 0;
    return sum + q * p;
  }, 0);

  const grandTotal = Math.max(0, subtotal - (parseFloat(discount) || 0) + (parseFloat(tax) || 0));

  const handleSubmitSale = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      alert('Please select a customer.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/sales', {
        method: 'POST',
        body: JSON.stringify({
          customerId: selectedCustomerId,
          saleType,
          items,
          discount,
          tax,
          amountPaid: saleType === 'CASH' ? grandTotal : amountPaid
        })
      });

      setCreatedInvoice(res.data.sale);
      setItems([{ name: '', quantity: 1, unitPrice: '' }]);
      setDiscount('0');
      setAmountPaid('0');
    } catch (err) {
      alert(`Sale Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>New Sale / POS Billing</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Create itemized credit or cash invoices for customers</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Left Column: Form */}
        <div className="card">
          <form onSubmit={handleSubmitSale}>
            {/* Customer & Sale Type Selection */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="input-group">
                <label className="input-label">Select Customer Account *</label>
                <select
                  className="input-field"
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                >
                  {customers.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.customerCode}) - Balance: Rs. {c.currentBalancePKR}
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Sale Type *</label>
                <select
                  className="input-field"
                  value={saleType}
                  onChange={(e) => setSaleType(e.target.value)}
                >
                  <option value="CREDIT">Khata / Credit Sale (Udhari)</option>
                  <option value="CASH">Full Cash Sale</option>
                </select>
              </div>
            </div>

            {/* Items Table */}
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Itemized Items List</h3>
            {items.map((item, index) => (
              <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 40px', gap: '0.75rem', marginBottom: '0.75rem', alignItems: 'center' }}>
                <input
                  type="text"
                  required
                  placeholder="Item Name (e.g. Pipe 10ft)"
                  className="input-field"
                  value={item.name}
                  onChange={(e) => updateItem(index, 'name', e.target.value)}
                />
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="Qty"
                  className="input-field"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                />
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Price (PKR)"
                  className="input-field"
                  value={item.unitPrice}
                  onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                />
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItemRow(index)} className="btn btn-danger" style={{ padding: '0.5rem' }}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}

            <button type="button" onClick={addItemRow} className="btn btn-secondary" style={{ marginBottom: '1.5rem' }}>
              <Plus size={16} />
              + Add Item Row
            </button>

            {/* Submit */}
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', padding: '0.85rem', fontSize: '1rem' }}>
              <ShoppingCart size={20} />
              {loading ? 'Processing Sale...' : 'Complete & Print Invoice'}
            </button>
          </form>
        </div>

        {/* Right Column: Checkout Summary Box */}
        <div className="card" style={{ background: 'var(--bg-sidebar)', height: 'fit-content' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            Checkout Summary
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.95rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Subtotal:</span>
              <span style={{ fontWeight: 700 }}>Rs. {subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Discount (PKR):</span>
              <input
                type="number"
                className="input-field"
                style={{ width: '100px', padding: '0.3rem' }}
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.85rem', borderTop: '1px solid var(--border-color)', fontSize: '1.3rem', fontWeight: 800 }}>
              <span>Grand Total:</span>
              <span style={{ color: 'var(--accent-emerald)' }}>Rs. {grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Created Modal */}
      {createdInvoice && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <CheckCircle size={48} color="var(--accent-emerald)" style={{ margin: '0 auto' }} />
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '0.5rem' }}>Sale Invoice Generated!</h2>
              <span className="badge badge-emerald">{createdInvoice.invoiceNumber}</span>
            </div>

            <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              <div><strong>Invoice No:</strong> {createdInvoice.invoiceNumber}</div>
              <div><strong>Grand Total:</strong> Rs. {createdInvoice.grandTotalPKR}</div>
              <div><strong>Sale Type:</strong> {createdInvoice.saleType}</div>
              <div><strong>Status:</strong> {createdInvoice.paymentStatus}</div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => window.print()} className="btn btn-primary" style={{ flex: 1 }}>
                <Printer size={18} />
                Print Invoice Receipt
              </button>
              <button onClick={() => setCreatedInvoice(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
