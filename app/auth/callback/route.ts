import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const error = requestUrl.searchParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(`${requestUrl.origin}?error=${error}`);
    }

    if (code) {
      const supabase = createRouteHandlerClient({ cookies });
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      
      if (exchangeError) {
        console.error('Session exchange error:', exchangeError);
        return NextResponse.redirect(`${requestUrl.origin}?error=session_exchange_failed`);
      }
    }

    // URL to redirect to after sign in process completes
    return NextResponse.redirect(requestUrl.origin);
  } catch (error) {
    console.error('Callback route error:', error);
    return NextResponse.redirect(`${new URL(request.url).origin}?error=callback_failed`);
  }
} 