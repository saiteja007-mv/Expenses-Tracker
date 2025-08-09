'use client';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from './types'; // optional if you generate types

export const supabase = createClientComponentClient<Database>(); 