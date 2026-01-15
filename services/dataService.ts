import { supabase } from "../lib/supabase";
import { INITIAL_SETTINGS } from "../constants";

export async function loadInitialData(userId: string) {
  const queries = await Promise.all([
    supabase.from("birds").select("*").eq("user_id", userId),
    supabase.from("movements").select("*").eq("user_id", userId),
    supabase.from("transactions").select("*").eq("user_id", userId),
    supabase.from("tasks").select("*").eq("user_id", userId),
    supabase.from("tournaments").select("*").eq("user_id", userId),
    supabase.from("medications").select("*").eq("user_id", userId),
    supabase.from("settings").select("*").eq("user_id", userId).maybeSingle(),
  ]);

  const [birds, movements, transactions, tasks, tournaments, medications, settings] = queries;

  return {
    birds: birds.data ?? [],
    movements: movements.data ?? [],
    transactions: transactions.data ?? [],
    tasks: tasks.data ?? [],
    tournaments: tournaments.data ?? [],
    medications: medications.data ?? [],
    settings: settings.data ?? INITIAL_SETTINGS,
  };
}
