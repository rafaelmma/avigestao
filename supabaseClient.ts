// Backwards-compatible reexport of the single Supabase client.
// Use this to avoid creating multiple GoTrue instances (which causes aborted signals).
export { supabase, SUPABASE_MISSING } from './lib/supabase';
