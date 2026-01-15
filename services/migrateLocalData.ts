import { supabase } from "../lib/supabase";

export async function migrateLocalData(userId: string) {
  const migrated = localStorage.getItem("avigestao_migrated");
  if (migrated === "true") return;

  const raw = localStorage.getItem("avigestao_state");
  if (!raw) return;

  const data = JSON.parse(raw);

  try {
    // Helper to filter out rows that already exist by id
    async function filterExisting(table: string, items: any[]) {
      const ids = items.filter((i: any) => i && i.id).map((i: any) => i.id);
      if (ids.length === 0) return items;

      const { data: existing } = await supabase.from(table).select('id').in('id', ids as any[]);
      const existingIds = new Set((existing || []).map((r: any) => r.id));
      return items.filter((it: any) => !it.id || !existingIds.has(it.id));
    }

    // 🐦 Birds
    if (Array.isArray(data.birds) && data.birds.length) {
      const birdsToInsert = await filterExisting('birds', data.birds);
      if (birdsToInsert.length) {
        const birds = birdsToInsert.map((b: any) => ({ ...b, user_id: userId }));
        await supabase.from('birds').insert(birds);
      }
    }

    // 🔄 Movements
    if (Array.isArray(data.movements) && data.movements.length) {
      const movesToInsert = await filterExisting('movements', data.movements);
      if (movesToInsert.length) {
        const movements = movesToInsert.map((m: any) => ({ ...m, user_id: userId }));
        await supabase.from('movements').insert(movements);
      }
    }

    // 💰 Transactions
    if (Array.isArray(data.transactions) && data.transactions.length) {
      const txToInsert = await filterExisting('transactions', data.transactions);
      if (txToInsert.length) {
        const tx = txToInsert.map((t: any) => ({ ...t, user_id: userId }));
        await supabase.from('transactions').insert(tx);
      }
    }

    localStorage.setItem("avigestao_migrated", "true");
    console.info("Migração local → Supabase concluída");
  } catch (err) {
    console.error("Erro na migração:", err);
  }
}
