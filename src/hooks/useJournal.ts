import { useAuth } from "../context/AuthContext";
import { useCouple } from "../context/CoupleContext";
import { supabase } from "../lib/supabase";
import { useRealtimeCollection } from "./useRealtimeCollection";
import type { OrbitJournalEntry } from "../types";

export function useJournal() {
  const { user } = useAuth();
  const { couple } = useCouple();
  const { rows, loading, setRows } = useRealtimeCollection<OrbitJournalEntry>("orbit_journal_entries", couple?.id ?? null, (a, b) =>
    b.created_at.localeCompare(a.created_at)
  );

  async function addEntry(content: string) {
    if (!couple || !user) return { error: "Aucun couple lié" };
    const trimmed = content.trim();
    if (!trimmed) return { error: "La note est vide" };
    const { error } = await supabase
      .from("orbit_journal_entries")
      .insert({ couple_id: couple.id, author_id: user.id, content: trimmed });
    return { error: error?.message ?? null };
  }

  async function deleteEntry(id: string) {
    setRows((prev) => prev.filter((e) => e.id !== id));
    const { error } = await supabase.from("orbit_journal_entries").delete().eq("id", id);
    return { error: error?.message ?? null };
  }

  return { entries: rows, loading, addEntry, deleteEntry };
}
