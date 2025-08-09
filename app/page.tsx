'use client';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import AddTransactionForm from '@/components/AddTransactionForm';
import TransactionsTable from '@/components/TransactionsTable';
import Dashboard from '@/components/Dashboard';

export default function HomePage() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<{ id: string; email: string } | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    supabase.auth.onAuthStateChange((_evt, s) => setSession(s));
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!session?.user) return;
      const { id, email } = session.user;
      setProfile({ id, email });
      // categories
      const cats = await fetch(`/api/categories?user_id=${id}`).then(r => r.json());
      setCategories(cats.data || []);
      // transactions
      const txs = await fetch(`/api/transactions?user_id=${id}`).then(r => r.json());
      setTransactions(txs.data || []);
    };
    load();
  }, [session]);

  const onAdd = async (payload: any) => {
    if (!profile) return;
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, user_id: profile.id, user_email: profile.email })
    }).then(r => r.json());
    if (res.data) setTransactions(prev => [res.data, ...prev]);
  };

  const onUpdate = async (id: string, updates: any) => {
    if (!profile) return;
    const res = await fetch('/api/transactions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates, user_id: profile.id, user_email: profile.email })
    }).then(r => r.json());
    if (res.data) setTransactions(prev => prev.map(t => (t.id === id ? res.data : t)));
  };

  const onDelete = async (id: string) => {
    if (!profile) return;
    const res = await fetch(`/api/transactions?id=${id}&user_id=${profile.id}&user_email=${profile.email}`, { method: 'DELETE' }).then(r => r.json());
    if (res.ok) setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const signInGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };
  const signOut = async () => { await supabase.auth.signOut(); setProfile(null); };

  if (!session) {
    return (
      <div className="grid place-items-center min-h-[60vh]">
        <button className="btn" onClick={signInGoogle}>Sign in with Google</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Welcome</h2>
          <p className="text-sm text-neutral-500">{profile?.email}</p>
        </div>
        <button className="btn" onClick={signOut}>Sign out</button>
      </div>

      <Dashboard transactions={transactions} />
      <AddTransactionForm categories={categories} onAdd={onAdd} user={profile} />
      <TransactionsTable transactions={transactions} onUpdate={onUpdate} onDelete={onDelete} />
    </div>
  );
} 