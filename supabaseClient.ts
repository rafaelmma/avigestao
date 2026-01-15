import { createClient } from '@supabase/supabase-js';

const _env = (import.meta as any).env;

export const supabase = createClient(
  _env.VITE_SUPABASE_URL!,
  _env.VITE_SUPABASE_ANON_KEY!
);
