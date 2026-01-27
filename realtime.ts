import { supabase } from './supabaseClient';

export const subscribeTable = (
  table: string,
  userId: string,
  onChange: (payload: any) => void
) => {
  return supabase
    .channel(`realtime-${table}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
        filter: `user_id=eq.${userId}`,
      },
      (payload: any) => onChange(payload)
    )
    .subscribe();
};
