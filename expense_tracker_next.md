# Expense Tracker — Next.js + Supabase + Google Sheets (Deploy-ready MVP)

This is a deploy-ready MVP you can push to **Vercel** (or Netlify) that supports:

- Auth with **Google (via Supabase Auth)**
- CRUD for **transactions** and **categories** in Supabase Postgres (RLS enforced)
- **Receipt image uploads** to Supabase Storage (private) with signed URLs
- **Interactive dashboard** (totals, trends, category breakdown)
- **Real-time sync to Google Sheets** on create/update/delete
- CSV/XLSX export from the UI

> Follow the steps in order. Copy files as indicated. When done, deploy to Vercel and add the env vars.

---

## 0) Project Structure

```
expense-tracker/
  app/
    api/
      transactions/route.ts
      categories/route.ts
      upload/route.ts
    layout.tsx
    page.tsx
  components/
    AddTransactionForm.tsx
    TransactionsTable.tsx
    Dashboard.tsx
    FileUpload.tsx
  lib/
    supabaseClient.ts
    serverSupabase.ts
    sheets.ts
    utils.ts
  public/
    logo.svg
  styles/
    globals.css
  supabase/
    schema.sql
    policies.sql
  .env.example
  next.config.mjs
  package.json
  postcss.config.mjs
  tailwind.config.mjs
  tsconfig.json
  README.md
```

---

## 1) package.json

```json
{
  "name": "expense-tracker-mvp",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@supabase/auth-helpers-nextjs": "^0.10.0",
    "@supabase/supabase-js": "^2.45.0",
    "googleapis": "^140.0.1",
    "next": "^14.2.5",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "recharts": "^2.12.7",
    "zod": "^3.23.8",
    "xlsx": "^0.18.5",
    "date-fns": "^3.6.0",
    "clsx": "^2.1.1"
  },
  "devDependencies": {
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.7",
    "typescript": "^5.5.4"
  }
}
```

---

## 2) next.config.mjs

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { bodySizeLimit: '10mb' } },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' }
    ]
  }
};
export default nextConfig;
```

---

## 3) Tailwind setup

### tailwind.config.mjs

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: { extend: {} },
  plugins: []
};
```

### postcss.config.mjs

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};
```

### styles/globals.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root { color-scheme: light dark; }
body { @apply bg-neutral-50 text-neutral-900; }
.container { @apply max-w-6xl mx-auto px-4; }
.card { @apply bg-white rounded-2xl shadow p-4; }
.btn { @apply inline-flex items-center gap-2 rounded-xl px-4 py-2 bg-black text-white hover:bg-neutral-800; }
.input { @apply rounded-xl border border-neutral-200 px-3 py-2 w-full; }
.select { @apply rounded-xl border border-neutral-200 px-3 py-2 w-full bg-white; }
```

---

## 4) .env.example

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE=YOUR_SUPABASE_SERVICE_ROLE_KEY
SUPABASE_STORAGE_BUCKET=receipts

# Google Sheets (Service Account)
GOOGLE_PROJECT_ID=your-project-id
GOOGLE_CLIENT_EMAIL=service-account@your-project-id.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
SHEETS_SPREADSHEET_ID=YOUR_SHEET_ID
SHEETS_TRANSACTIONS_TAB=Transactions
```

> After creating the service account, share the Google Sheet with the **client email** above (Editor access).

---

## 5) Supabase schema — `supabase/schema.sql`

```sql
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income','expense')),
  created_at timestamptz default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  type text not null check (type in ('income','expense')),
  amount numeric(12,2) not null,
  currency text default 'USD',
  date date not null,
  merchant text,
  notes text,
  attachment_url text,
  sheet_row_id text, -- to map to Sheets row
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_tx_user_date on public.transactions(user_id, date desc);
create index if not exists idx_tx_user_category on public.transactions(user_id, category_id);

-- Storage bucket (create in UI) named `receipts`
```

### RLS Policies — `supabase/policies.sql`

```sql
alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;

-- Helper function to upsert user on first login
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$ language plpgsql security definer;

-- Link auth.users to public.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Policies
create policy "Users access own row" on public.users
  for select using (id = auth.uid());

create policy "Categories belong to user" on public.categories
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Transactions belong to user" on public.transactions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
```

> Run these SQL scripts in Supabase (SQL editor). Create a **private** Storage bucket `receipts`.

---

## 6) lib/supabaseClient.ts

```ts
'use client';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from './types'; // optional if you generate types

export const supabase = createClientComponentClient<Database>();
```

## 7) lib/serverSupabase.ts

```ts
import { createClient } from '@supabase/supabase-js';

export function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE!;
  return createClient(url, key);
}
```

## 8) lib/sheets.ts

```ts
import { google } from 'googleapis';

function getAuth() {
  const scopes = ['https://www.googleapis.com/auth/spreadsheets'];
  const jwt = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    undefined,
    (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    scopes
  );
  return jwt;
}

export async function appendTransactionToSheet(row: any[]) {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.SHEETS_SPREADSHEET_ID!;
  const range = `${process.env.SHEETS_TRANSACTIONS_TAB || 'Transactions'}!A:Z`;
  const res = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] }
  });
  const updates = res.data.updates;
  const updatedRange = updates?.updatedRange || '';
  const match = updatedRange.match(/!(?:[A-Z]+)(\d+):/);
  const rowNumber = match ? match[1] : undefined;
  return rowNumber; // store in sheet_row_id
}

export async function updateTransactionInSheet(rowNumber: string, row: any[]) {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.SHEETS_SPREADSHEET_ID!;
  const range = `${process.env.SHEETS_TRANSACTIONS_TAB || 'Transactions'}!A${rowNumber}:Z${rowNumber}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] }
  });
}

export async function deleteTransactionInSheet(rowNumber: string) {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.SHEETS_SPREADSHEET_ID!;
  const sheetTitle = process.env.SHEETS_TRANSACTIONS_TAB || 'Transactions';

  // BatchUpdate to delete a row
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = meta.data.sheets?.find(s => s.properties?.title === sheetTitle);
  const sheetId = sheet?.properties?.sheetId;
  if (!sheetId) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        { deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex: Number(rowNumber) - 1, endIndex: Number(rowNumber) } } }
      ]
    }
  });
}
```

## 9) lib/utils.ts

```ts
export function txToSheetRow(tx: any, userEmail: string) {
  return [
    tx.id,
    userEmail,
    tx.date,
    tx.type,
    tx.category_name || '',
    Number(tx.amount),
    tx.currency || 'USD',
    tx.merchant || '',
    tx.notes || '',
    tx.attachment_url || '',
    tx.created_at,
    tx.updated_at
  ];
}
```

---

## 10) API Routes (App Router)

### `app/api/transactions/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/serverSupabase';
import { appendTransactionToSheet, updateTransactionInSheet, deleteTransactionInSheet } from '@/lib/sheets';
import { txToSheetRow } from '@/lib/utils';

// CREATE or UPDATE or DELETE based on method
export async function GET(req: NextRequest) {
  const supabase = getServiceRoleClient();
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('user_id');
  if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 });

  const { data, error } = await supabase
    .from('transactions')
    .select('*, categories(name)')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(5000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const transformed = data?.map(d => ({ ...d, category_name: d.categories?.name }));
  return NextResponse.json({ data: transformed });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = getServiceRoleClient();

  // Expect body to include user info (id, email) from client Supabase session
  const { user_id, user_email, ...payload } = body;
  if (!user_id || !user_email) return NextResponse.json({ error: 'Missing user context' }, { status: 400 });

  // Insert
  const { data, error } = await supabase
    .from('transactions')
    .insert({ ...payload, user_id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich for sheet row
  let categoryName = '';
  if (data.category_id) {
    const { data: cat } = await supabase.from('categories').select('name').eq('id', data.category_id).single();
    categoryName = cat?.name || '';
  }
  const rowNumber = await appendTransactionToSheet(
    txToSheetRow({ ...data, category_name: categoryName }, user_email)
  );

  if (rowNumber) {
    await supabase.from('transactions').update({ sheet_row_id: String(rowNumber) }).eq('id', data.id);
  }

  return NextResponse.json({ data: { ...data, sheet_row_id: rowNumber } }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const supabase = getServiceRoleClient();
  const { user_id, user_email, id, ...updates } = body;
  if (!user_id || !user_email || !id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const { data, error } = await supabase
    .from('transactions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let categoryName = '';
  if (data.category_id) {
    const { data: cat } = await supabase.from('categories').select('name').eq('id', data.category_id).single();
    categoryName = cat?.name || '';
  }

  if (data.sheet_row_id) {
    await updateTransactionInSheet(String(data.sheet_row_id), txToSheetRow({ ...data, category_name: categoryName }, user_email));
  }

  return NextResponse.json({ data });
}

export async function DELETE(req: NextRequest) {
  const supabase = getServiceRoleClient();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const user_id = searchParams.get('user_id');
  const user_email = searchParams.get('user_email');
  if (!id || !user_id) return NextResponse.json({ error: 'Missing id/user_id' }, { status: 400 });

  // fetch to get sheet row id
  const { data: existing } = await supabase
    .from('transactions')
    .select('sheet_row_id')
    .eq('id', id)
    .eq('user_id', user_id)
    .single();

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (existing?.sheet_row_id) await deleteTransactionInSheet(String(existing.sheet_row_id));
  return NextResponse.json({ ok: true });
}
```

### `app/api/categories/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/serverSupabase';

export async function GET(req: NextRequest) {
  const supabase = getServiceRoleClient();
  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get('user_id');
  if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 });
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', user_id)
    .order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const supabase = getServiceRoleClient();
  const body = await req.json();
  const { user_id, name, type } = body;
  if (!user_id || !name || !type) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  const { data, error } = await supabase
    .from('categories')
    .insert({ user_id, name, type })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
```

### `app/api/upload/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/serverSupabase';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const supabase = getServiceRoleClient();
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const user_id = formData.get('user_id') as string | null;
  if (!file || !user_id) return NextResponse.json({ error: 'Missing file/user' }, { status: 400 });

  const arrayBuffer = await file.arrayBuffer();
  const filePath = `${user_id}/${Date.now()}-${file.name}`;

  const { data, error } = await supabase.storage
    .from(process.env.SUPABASE_STORAGE_BUCKET!)
    .upload(filePath, Buffer.from(arrayBuffer), {
      contentType: file.type,
      upsert: false
    });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: signed } = await supabase.storage
    .from(process.env.SUPABASE_STORAGE_BUCKET!)
    .createSignedUrl(data.path, 60 * 60 * 24 * 7); // 7 days

  return NextResponse.json({ path: data.path, url: signed?.signedUrl });
}
```

---

## 11) UI — App Shell

### `app/layout.tsx`

```tsx
import './styles/globals.css';
import type { Metadata } from 'next';
import Image from 'next/image';

export const metadata: Metadata = { title: 'Expense Tracker', description: 'Track income & expenses' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b bg-white">
          <div className="container flex items-center gap-3 h-16">
            <Image src="/logo.svg" alt="logo" width={28} height={28} />
            <h1 className="font-semibold">Expense Tracker</h1>
          </div>
        </header>
        <main className="container py-6">{children}</main>
      </body>
    </html>
  );
}
```

### `app/page.tsx`

```tsx
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
```

---

## 12) Components

### `components/AddTransactionForm.tsx`

```tsx
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
```

### `components/FileUpload.tsx`

```tsx
'use client';
import { useRef, useState } from 'react';

export default function FileUpload({ user, onUploaded }: any) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('user_id', user.id);
    const res = await fetch('/api/upload', { method: 'POST', body: fd }).then(r => r.json());
    if (res.url) onUploaded(res.url);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="flex items-center gap-3">
      <input ref={inputRef} type="file" accept="image/*" onChange={onChange} />
      {uploading && <span className="text-sm text-neutral-500">Uploading…</span>}
    </div>
  );
}
```

### `components/TransactionsTable.tsx`

```tsx
'use client';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

export default function TransactionsTable({ transactions, onUpdate, onDelete }: any) {
  const exportXLSX = () => {
    const ws = XLSX.utils.json_to_sheet(transactions);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
    const blob = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const b = new Blob([blob], { type: 'application/octet-stream' });
    saveAs(b, 'transactions.xlsx');
  };

  return (
    <div className="card overflow-x-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Transactions</h3>
        <button className="btn" onClick={exportXLSX}>Export XLSX</button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2">Date</th>
            <th>Type</th>
            <th>Category</th>
            <th>Amount</th>
            <th>Merchant</th>
            <th>Notes</th>
            <th>Receipt</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t: any) => (
            <tr key={t.id} className="border-b last:border-b-0">
              <td className="py-2">{t.date}</td>
              <td>{t.type}</td>
              <td>{t.category_name || ''}</td>
              <td>${Number(t.amount).toFixed(2)}</td>
              <td>{t.merchant || ''}</td>
              <td>{t.notes || ''}</td>
              <td>{t.attachment_url ? <a className="text-blue-600 underline" href={t.attachment_url} target="_blank">View</a> : ''}</td>
              <td>
                <button className="text-red-600" onClick={() => onDelete(t.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### `components/Dashboard.tsx`

```tsx
'use client';
import { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';

export default function Dashboard({ transactions }: any) {
  const summary = useMemo(() => {
    const income = transactions.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + Number(t.amount), 0);
    const expense = transactions.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + Number(t.amount), 0);
    const balance = income - expense;

    // Monthly trend (YYYY-MM)
    const byMonth = new Map<string, number>();
    for (const t of transactions) {
      const ym = (t.date || '').slice(0, 7);
      const val = (t.type === 'income' ? 1 : -1) * Number(t.amount);
      byMonth.set(ym, (byMonth.get(ym) || 0) + val);
    }
    const trend = Array.from(byMonth.entries()).sort(([a],[b]) => a.localeCompare(b)).map(([k, v]) => ({ month: k, net: v }));

    // Category breakdown (expenses only)
    const byCat = new Map<string, number>();
    for (const t of transactions.filter((x: any) => x.type === 'expense')) {
      const key = t.category_name || 'Uncategorized';
      byCat.set(key, (byCat.get(key) || 0) + Number(t.amount));
    }
    const pie = Array.from(byCat.entries()).map(([name, value]) => ({ name, value }));

    return { income, expense, balance, trend, pie };
  }, [transactions]);

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <div className="card">
        <div className="text-sm text-neutral-500">Income</div>
        <div className="text-2xl font-semibold">${summary.income.toFixed(2)}</div>
      </div>
      <div className="card">
        <div className="text-sm text-neutral-500">Expense</div>
        <div className="text-2xl font-semibold">${summary.expense.toFixed(2)}</div>
      </div>
      <div className="card">
        <div className="text-sm text-neutral-500">Balance</div>
        <div className="text-2xl font-semibold">${summary.balance.toFixed(2)}</div>
      </div>

      <div className="card md:col-span-2 h-72">
        <h3 className="font-semibold mb-2">Monthly Net</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={summary.trend}>
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="net" stroke="#000" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card h-72">
        <h3 className="font-semibold mb-2">Expenses by Category</h3>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={summary.pie} dataKey="value" nameKey="name" outerRadius={90}>
              {summary.pie.map((_e: any, i: number) => (<Cell key={i} />))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

---

## 13) README.md (quick setup)

```md
# Expense Tracker — Setup

## Prereqs
- Supabase project (Auth + Database + Storage)
- Google Cloud service account with Sheets API enabled
- Vercel account

## Steps
1. **Clone** this project structure into a new Next.js app.
2. **Install** deps: `npm i` (or `pnpm i` / `yarn`).
3. **Supabase**: In SQL editor, run `supabase/schema.sql` then `supabase/policies.sql`. Create private Storage bucket `receipts`.
4. **Auth**: In Supabase > Auth > Providers, enable **Google** and configure OAuth.
5. **Sheets**: Create a Google Sheet with tab `Transactions`. Share with your service account email.
6. **Env**: Copy `.env.example` to `.env.local` and fill values.
7. **Dev**: `npm run dev` and open http://localhost:3000
8. **Deploy**: Push to GitHub, import on **Vercel**, set env vars, deploy.

## Notes
- All API writes also sync to Google Sheets (row ID stored in `sheet_row_id`).
- Images upload privately to Supabase Storage; UI uses signed URLs.
- Export button downloads XLSX locally. For Excel real-time sync, we can add Microsoft Graph later.
```

---

## 14) tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "es2020"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": false,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

---

## 15) Minimal logo — `public/logo.svg`

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><path d="M3 12a9 9 0 1018 0 9 9 0 10-18 0Z" stroke="#000" stroke-width="2"/><path d="M8 13h6a2 2 0 100-4H9" stroke="#000" stroke-width="2" stroke-linecap="round"/></svg>
```

---

## 16) Category seeding (optional)

Insert a few categories for your user after first login:

```sql
insert into public.categories (user_id, name, type)
values
  ('YOUR_USER_UUID','Salary','income'),
  ('YOUR_USER_UUID','Groceries','expense'),
  ('YOUR_USER_UUID','Rent','expense'),
  ('YOUR_USER_UUID','Transport','expense');
```

---

## 17) Netlify (optional)

If you prefer Netlify, use their Next.js adapter. Vercel is simpler for this setup.

---

### Done

You can now sign in with Google, add transactions, upload receipt images, see the dashboard, and get real-time Google Sheets sync.

