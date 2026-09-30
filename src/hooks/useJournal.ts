import { useAuth } from "../context/AuthContext";
import { useCouple } from "../context/CoupleContext";
import { supabase } from "../lib/supabase";
import { useRealtimeCollection } from "./useRealtimeCollection";
import type { OrbitJournalEntry } from "../types";

function sortEntries(a: OrbitJournalEntry, b: OrbitJournalEntry): number {
  return b.created_at.localeCompare(a.created_at);
}

export function useJournal() {
  const { user } = useAuth();
  const { couple } = useCouple();
  const { rows, loading, setRows, mutate } = useRealtimeCollection<OrbitJournalEntry>(
    "orbit_journal_entries",
    couple?.id ?? null,
    sortEntries
  );

  // Ajout optimiste : sans ça, l'app n'affichait la nouvelle note qu'au
  // retour de l'écho temps réel Supabase, avec un délai réseau perceptible.
  async function addEntry(content: string) {
    if (!couple || !user) return { error: "Aucun couple lié" };
    const trimmed = content.trim();
    if (!trimmed) return { error: "La note est vide" };
    const { data, error } = await supabase
      .from("orbit_journal_entries")
      .insert({ couple_id: couple.id, author_id: user.id, content: trimmed })
      .select()
      .single();
    if (error) return { error: error.message };
    const created = data as OrbitJournalEntry;
    setRows((prev) => (prev.some((e) => e.id === created.id) ? prev : [...prev, created].sort(sortEntries)));
    return { error: null };
  }

  // Suppression optimiste, annulée avec un message si elle échoue (voir mutate).
  function deleteEntry(id: string) {
    return mutate(
      (prev) => prev.filter((e) => e.id !== id),
      () => supabase.from("orbit_journal_entries").delete().eq("id", id),
      "Note non supprimée : vérifie ta connexion."
    );
  }

  return { entries: rows, loading, addEntry, deleteEntry };
}
