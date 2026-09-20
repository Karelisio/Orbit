import { useEffect, useRef } from "react";
import { useCouple } from "../context/CoupleContext";
import { supabase } from "../lib/supabase";
import { useRealtimeCollection } from "./useRealtimeCollection";
import { DEFAULT_EVENT_CATEGORIES, type OrbitEventCategory } from "../types";

/**
 * Catégories d'événements du couple, créées librement (plus un enum figé).
 * Un couple flambant neuf n'a encore aucune ligne : on sème les catégories
 * par défaut au premier chargement (une seule fois par couple, `unique
 * (couple_id, name)` protège d'un doublon si l'effet se rejoue).
 */
export function useEventCategories() {
  const { couple } = useCouple();
  const { rows, loading, setRows } = useRealtimeCollection<OrbitEventCategory>(
    "orbit_event_categories",
    couple?.id ?? null,
    (a, b) => a.created_at.localeCompare(b.created_at)
  );
  const seededFor = useRef<string | null>(null);

  useEffect(() => {
    if (!couple || loading || rows.length > 0) return;
    if (seededFor.current === couple.id) return;
    seededFor.current = couple.id;
    supabase
      .from("orbit_event_categories")
      .insert(DEFAULT_EVENT_CATEGORIES.map((cat) => ({ couple_id: couple.id, name: cat.name, color: cat.color })))
      .select()
      .then(({ data }) => {
        if (data) setRows(() => data as OrbitEventCategory[]);
      });
  }, [couple, loading, rows.length, setRows]);

  async function addCategory(name: string, color: string) {
    if (!couple) return { error: "Aucun couple lié" };
    const { error } = await supabase.from("orbit_event_categories").insert({ couple_id: couple.id, name, color });
    return { error: error?.message ?? null };
  }

  return { categories: rows, loading, addCategory };
}
