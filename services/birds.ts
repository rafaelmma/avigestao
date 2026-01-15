import { supabase } from "../lib/supabase";

export async function getBirds() {
  return supabase
    .from("birds")
    .select("*")
    .order("created_at", { ascending: false });
}

export async function addBird(bird: any) {
  return supabase.from("birds").insert(bird);
}

export async function deleteBird(id: string) {
  return supabase.from("birds").delete().eq("id", id);
}
