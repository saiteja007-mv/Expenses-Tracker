'use client';
import { useState } from 'react';
import FileUpload from './FileUpload';

export default function AddTransactionForm({ categories, onAdd, user }: any) {
  const [form, setForm] = useState({
    type: 'expense',
    amount: '',
    currency: 'USD',
    date: new Date().toISOString().slice(0, 10),
    category_id: '',
    merchant: '',
    notes: '',
    attachment_url: ''
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, amount: Number(form.amount) };
    await onAdd(payload);
    setForm(prev => ({ ...prev, amount: '', merchant: '', notes: '', attachment_url: '' }));
  };

  return (
    <form onSubmit={submit} className="card space-y-3">
      <h3 className="font-semibold">Add Transaction</h3>
      <div className="grid md:grid-cols-6 gap-3">
        <select className="select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
        <input className="input" type="number" step="0.01" placeholder="Amount" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
        <input className="input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
        <select className="select" value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
          <option value="">Select category</option>
          {categories?.map((c: any) => (
            <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
          ))}
        </select>
        <input className="input" placeholder="Merchant" value={form.merchant} onChange={e => setForm({ ...form, merchant: e.target.value })} />
        <input className="input" placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
      </div>
      <FileUpload user={user} onUploaded={(url: string) => setForm({ ...form, attachment_url: url })} />
      <button className="btn" type="submit">Save</button>
    </form>
  );
} 