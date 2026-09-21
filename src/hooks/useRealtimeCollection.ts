import { useCallback, useSyncExternalStore } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

interface WithId {
  id: string;
}

interface Snapshot {
  rows: WithId[];
  loading: boolean;
}

interface CollectionStore {
  key: string;
  table: string;
  coupleId: string;
  sortBy: (a: WithId, b: WithId) => number;
  snapshot: Snapshot;
  listeners: Set<() => void>;
  channel: RealtimeChannel | null;
  refCount: number;
}

/**
 * Un seul store par (table, couple), partagé par tous les composants montés.
 * Avant, chaque appel du hook avait sa propre copie : WidgetSync et la page
 * affichée chargeaient donc les mêmes données deux fois (deux requêtes, deux
 * canaux temps réel), et surtout une mise à jour optimiste ne touchait qu'une
 * copie — le widget continuait d'attendre l'écho réseau pour se rafraîchir.
 */
const stores = new Map<string, CollectionStore>();

const EMPTY_LOADING: Snapshot = { rows: [], loading: true };
const EMPTY_IDLE: Snapshot = { rows: [], loading: false };

function storeKey(table: string, coupleId: string): string {
  return `${table}:${coupleId}`;
}

function cacheKey(table: string, coupleId: string): string {
  return `orbit-cache-${table}-${coupleId}`;
}

function readCache(table: string, coupleId: string): WithId[] {
  try {
    const raw = localStorage.getItem(cacheKey(table, coupleId));
    return raw ? (JSON.parse(raw) as WithId[]) : [];
  } catch {
    return [];
  }
}

function writeCache(table: string, coupleId: string, rows: WithId[]): void {
  try {
    localStorage.setItem(cacheKey(table, coupleId), JSON.stringify(rows));
  } catch {
    // stockage indisponible : tant pis, pas de cache hors-ligne cette fois
  }
}

function publish(store: CollectionStore, snapshot: Snapshot): void {
  store.snapshot = snapshot;
  for (const listener of store.listeners) listener();
}

function publishRows(store: CollectionStore, rows: WithId[]): void {
  writeCache(store.table, store.coupleId, rows);
  publish(store, { rows, loading: false });
}

/** Vrai tant que ce store est bien celui enregistré (il a pu être relâché entre-temps). */
function isLive(store: CollectionStore): boolean {
  return stores.get(store.key) === store;
}

function start(store: CollectionStore): void {
  supabase
    .from(store.table)
    .select("*")
    .eq("couple_id", store.coupleId)
    .then(
      ({ data, error }) => {
        if (!isLive(store)) return;
        // hors ligne / erreur réseau : on garde le cache déjà affiché
        if (error || !data) {
          publish(store, { ...store.snapshot, loading: false });
          return;
        }
        publishRows(store, (data as WithId[]).slice().sort(store.sortBy));
      },
      () => {
        if (isLive(store)) publish(store, { ...store.snapshot, loading: false });
      }
    );

  // Nom de channel unique par store : Supabase réutilise un channel existant
  // du même nom déjà abonné, et le .on() suivant plante alors
  // ("cannot add postgres_changes callbacks ... after subscribe()").
  store.channel = supabase
    .channel(`orbit-${store.table}-${store.coupleId}-${Math.random().toString(36).slice(2)}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: store.table, filter: `couple_id=eq.${store.coupleId}` },
      (payload) => {
        if (!isLive(store)) return;
        const current = store.snapshot.rows;

        if (payload.eventType === "DELETE") {
          const removedId = (payload.old as Partial<WithId>)?.id;
          if (!removedId) return;
          const next = current.filter((row) => row.id !== removedId);
          if (next.length !== current.length) publishRows(store, next);
          return;
        }

        const incoming = payload.new as WithId;
        const exists = current.some((row) => row.id === incoming.id);
        const next = exists ? current.map((row) => (row.id === incoming.id ? incoming : row)) : [...current, incoming];
        publishRows(store, next.slice().sort(store.sortBy));
      }
    )
    .subscribe();
}

function acquire(table: string, coupleId: string, sortBy: (a: WithId, b: WithId) => number): CollectionStore {
  const key = storeKey(table, coupleId);
  let store = stores.get(key);

  if (!store) {
    // Cache local d'abord : affichage immédiat au lancement, même hors ligne.
    const cached = readCache(table, coupleId).slice().sort(sortBy);
    store = {
      key,
      table,
      coupleId,
      sortBy,
      snapshot: { rows: cached, loading: cached.length === 0 },
      listeners: new Set(),
      channel: null,
      refCount: 0,
    };
    stores.set(key, store);
    start(store);
  }

  store.refCount++;
  return store;
}

function release(store: CollectionStore): void {
  store.refCount--;
  if (store.refCount > 0) return;
  if (store.channel) supabase.removeChannel(store.channel);
  if (isLive(store)) stores.delete(store.key);
}

/**
 * Charge une table filtrée par couple_id puis la garde synchronisée en temps
 * réel (INSERT/UPDATE/DELETE) — factorise ce qui serait sinon dupliqué à
 * l'identique dans useEvents/useTasks/useJournal/useExpenses.
 *
 * Les données sont mises en cache dans localStorage et réaffichées avant même
 * la réponse réseau (lancement hors ligne). Écrire hors ligne reste impossible
 * et remonte l'erreur : pas de file d'attente à resynchroniser, pour éviter
 * les doublons/conflits sur des données partagées en temps réel.
 */
export function useRealtimeCollection<T extends WithId>(
  table: string,
  coupleId: string | null,
  sortBy: (a: T, b: T) => number
) {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!coupleId) return () => {};
      const store = acquire(table, coupleId, sortBy as (a: WithId, b: WithId) => number);
      store.listeners.add(onStoreChange);
      return () => {
        store.listeners.delete(onStoreChange);
        release(store);
      };
    },
    // sortBy est hors dépendances : il est recréé à chaque rendu par certains
    // appelants, et reste le même pour une table donnée (un seul hook par table).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [table, coupleId]
  );

  const getSnapshot = useCallback(() => {
    if (!coupleId) return EMPTY_IDLE;
    return stores.get(storeKey(table, coupleId))?.snapshot ?? EMPTY_LOADING;
  }, [table, coupleId]);

  const snapshot = useSyncExternalStore(subscribe, getSnapshot);

  /** Mise à jour optimiste : visible immédiatement par TOUS les composants (page + widget). */
  const setRows = useCallback(
    (updater: (prev: T[]) => T[]) => {
      if (!coupleId) return;
      const store = stores.get(storeKey(table, coupleId));
      if (!store) return;
      publishRows(store, updater(store.snapshot.rows as T[]) as WithId[]);
    },
    [table, coupleId]
  );

  return { rows: snapshot.rows as T[], loading: snapshot.loading, setRows };
}
