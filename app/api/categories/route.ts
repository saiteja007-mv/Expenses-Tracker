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