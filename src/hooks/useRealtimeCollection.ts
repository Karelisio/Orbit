import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

interface WithId {
  id: string;
}

function cacheKey(table: string, coupleId: string): string {
  return `orbit-cache-${table}-${coupleId}`;
}

function readCache<T>(table: string, coupleId: string): T[] {
  try {
    const raw = localStorage.getItem(cacheKey(table, coupleId));
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeCache<T>(table: string, coupleId: string, rows: T[]): void {
  try {
    localStorage.setItem(cacheKey(table, coupleId), JSON.stringify(rows));
  } catch {
    // stockage indisponible : tant pis, pas de cache hors-ligne cette fois
  }
}

/**
 * Charge une table filtrée par couple_id puis la garde synchronisée en temps
 * réel (INSERT/UPDATE/DELETE) — factorise ce qui serait sinon dupliqué à
 * l'identique dans useEvents/useTasks/useJournal/useExpenses.
 *
 * Hydrate immédiatement depuis un cache localStorage (dernière copie connue)
 * avant même la réponse réseau : lancement hors ligne ou connexion lente,
 * l'app affiche tout de suite les dernières données vues plutôt qu'un écran
 * vide. Le cache est ensuite tenu à jour à chaque changement de `rows`.
 * Écrire pendant qu'on est hors ligne reste possible mais échoue (l'erreur
 * réseau remonte normalement) : pas de file d'attente à resynchroniser plus
 * tard, pour éviter les doublons/conflits d'un système de sync maison sur
 * des données partagées en temps réel.
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

    const cached = readCache<T>(table, coupleId);
    if (cached.length > 0) {
      setRows(cached.sort(sortBy));
      setLoading(false);
    } else {
      setLoading(true);
    }

    supabase
      .from(table)
      .select("*")
      .eq("couple_id", coupleId)
      .then(
        ({ data, error }) => {
          if (cancelled) return;
          setLoading(false);
          if (error || !data) return; // hors ligne / erreur réseau : le cache déjà affiché reste
          setRows((data as T[]).sort(sortBy));
        },
        () => {
          if (!cancelled) setLoading(false);
        }
      );

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

  useEffect(() => {
    if (coupleId) writeCache(table, coupleId, rows);
  }, [rows, table, coupleId]);

  return { rows, loading, setRows };
}
