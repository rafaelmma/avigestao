import { supabase } from "../lib/supabase";

// Helper to persist any entity to Supabase
export async function persistToSupabase(
  table: string,
  data: any,
  userId: string,
  operation: 'insert' | 'update' | 'delete' = 'insert'
) {
  try {
    if (operation === 'insert') {
      const { error } = await supabase.from(table).insert({ ...data, user_id: userId });
      if (error) throw error;
    } else if (operation === 'update') {
      const { id, ...rest } = data;
      const { error } = await supabase.from(table).update(rest).eq('id', id).eq('user_id', userId);
      if (error) throw error;
    } else if (operation === 'delete') {
      const { error } = await supabase.from(table).update({ deleted_at: new Date().toISOString() }).eq('id', data.id).eq('user_id', userId);
      if (error) throw error;
    }
  } catch (error) {
    console.error(`Error persisting to ${table}:`, error);
    throw error;
  }
}
