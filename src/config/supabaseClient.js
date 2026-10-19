// src/config/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing at build time');
}

// Placeholders keep module import from throwing (which 500s all SSR pages) when env vars are absent.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);

// Restore session on page load so Realtime auth.uid() works after refresh
if (typeof window !== 'undefined' && window.localStorage) {
  const existingToken = localStorage.getItem('access_token');
  if (existingToken) {
    supabase.auth.setSession({
      access_token: existingToken,
      refresh_token: '',
    }).catch(() => {});
  }
}