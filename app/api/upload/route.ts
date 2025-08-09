import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/serverSupabase';

export async function POST(req: NextRequest) {
  try {
    const supabase = getServiceRoleClient();
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const user_id = formData.get('user_id') as string | null;
    
    if (!file || !user_id) {
      return NextResponse.json({ error: 'Missing file or user_id' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const filePath = `${user_id}/${Date.now()}-${file.name}`;

    const { data, error } = await supabase.storage
      .from(process.env.SUPABASE_STORAGE_BUCKET || 'receipts')
      .upload(filePath, Buffer.from(arrayBuffer), {
        contentType: file.type,
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: signed } = await supabase.storage
      .from(process.env.SUPABASE_STORAGE_BUCKET || 'receipts')
      .createSignedUrl(data.path, 60 * 60 * 24 * 7); // 7 days

    return NextResponse.json({ 
      path: data.path, 
      url: signed?.signedUrl 
    });
  } catch (error) {
    console.error('Upload route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 