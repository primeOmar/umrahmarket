// src/config/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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