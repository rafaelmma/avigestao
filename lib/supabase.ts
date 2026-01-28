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
    
    // Interceptar requisições para logar possíveis problemas de query
    const originalFetch = _supabase.rest._fetch;
    _supabase.rest._fetch = async (url: string, options?: any) => {
      if (import.meta.env.DEV && url.includes('rest/v1')) {
        console.log('[Supabase REST] URL:', url, 'Method:', options?.method || 'GET');
      }
      const response = await originalFetch(url, options);
      if (!response.ok && response.status === 400 && import.meta.env.DEV) {
        console.error('[Supabase REST 400] URL:', url, 'Status:', response.status);
        try {
          const text = await response.clone().text();
          console.error('[Supabase REST 400] Response:', text);
        } catch (e) { /* ignore */ }
      }
      return response;
    };
    
    // Expor no window para facilitar debug no console do navegador.
    if (typeof window !== 'undefined') {
      (window as any).supabase = _supabase;
    }
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
  }
}

export const supabase = _supabase;
