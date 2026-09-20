import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

interface WithId {
  id: string;
}

/**
 * Charge une table filtrée par couple_id puis la garde synchronisée en temps
 * réel (INSERT/UPDATE/DELETE) — factorise ce qui serait sinon dupliqué à
 * l'identique dans useEvents/useTasks/useJournal/useExpenses.
 */
export function useRealtimeCollection<T extends WithId>(
  table: string,
  coupleId: string | null,
  sortBy: (a: T, b: T) => number
) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!coupleId) {
      setRows([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    supabase
      .from(table)
      .select("*")
      .eq("couple_id", coupleId)
      .then(({ data }) => {
        if (cancelled) return;
        setRows(((data as T[]) ?? []).sort(sortBy));
        setLoading(false);
      });

    // Nom de channel unique par instance : plusieurs composants montent ce
    // hook en parallèle (WidgetSync + une page) pour la même table/couple,
    // et Supabase réutilise un channel existant du même nom déjà abonné, ce
    // qui fait planter le .on() suivant ("... after subscribe()").
    const channel = supabase
      .channel(`orbit-${table}-${coupleId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `couple_id=eq.${coupleId}` },
        (payload) => {
          setRows((prev) => {
            if (payload.eventType === "DELETE") {
              return prev.filter((row) => row.id !== (payload.old as T).id);
            }
            const incoming = payload.new as T;
            const exists = prev.some((row) => row.id === incoming.id);
            const next = exists ? prev.map((row) => (row.id === incoming.id ? incoming : row)) : [...prev, incoming];
            return next.sort(sortBy);
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [table, coupleId]);

  return { rows, loading, setRows };
}
