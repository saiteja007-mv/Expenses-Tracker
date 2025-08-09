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

  // Handle optional category_id - if empty string, set to null
  if (payload.category_id === '') {
    payload.category_id = null;
  }

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

  // Handle optional category_id
  if (updates.category_id === '') {
    updates.category_id = null;
  }

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