import { supabase } from "../lib/supabase";

export async function insertRow(table: string, payload: any) {
  const { error } = await supabase.from(table).insert(payload);
  if (error) throw error;
}

export async function updateRow(table: string, id: string, payload: any) {
  const { error } = await supabase.from(table).update(payload).eq("id", id);
  if (error) throw error;
}

export async function deleteRow(table: string, id: string) {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
}
