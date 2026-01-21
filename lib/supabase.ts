import { createClient } from '@supabase/supabase-js';

const _env = (import.meta as any).env || {};

const VITE_SUPABASE_URL = _env.VITE_SUPABASE_URL || '';
const VITE_SUPABASE_ANON_KEY = _env.VITE_SUPABASE_ANON_KEY || '';

export const SUPABASE_MISSING = !VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY ||
  !(VITE_SUPABASE_URL.startsWith('http://') || VITE_SUPABASE_URL.startsWith('https://'));

let _supabase: any = null;
if (SUPABASE_MISSING) {
  console.error('Supabase not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY at build time');
} else {
  try {
    _supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);
    // Expor no window para facilitar debug no console do navegador.
    if (typeof window !== 'undefined') {
      (window as any).supabase = _supabase;
    }
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
  }
}

export const supabase = _supabase;
