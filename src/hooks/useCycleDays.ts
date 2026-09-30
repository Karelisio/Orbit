import { useCouple } from "../context/CoupleContext";
import { useRealtimeCollection } from "./useRealtimeCollection";

/** Ce qu'Orbit lit d'une ligne de cycle_days (Wenn) : ni symptômes, ni humeur, ni notes. */
export interface CycleDayRow {
  id: string;
  date: string;
  flow: string | null;
}

const CYCLE_DAY_COLUMNS = ["id", "date", "flow"] as const;

function sortByDate(a: CycleDayRow, b: CycleDayRow): number {
  return a.date.localeCompare(b.date);
}

/**
 * Source unique des jours de cycle de Wenn pour tout Orbit — widget cycle de
 * l'accueil (useCycleStatus), points de règles du calendrier et du widget
 * calendrier (useCyclePeriodDays) : un seul chargement (paginé), un seul
 * abonnement temps réel (INSERT/UPDATE filtrés par couple, DELETE sans
 * filtre), rechargé au retour au premier plan et gardé en cache pour un
 * lancement hors ligne — même mécanique que les tables d'Orbit (voir
 * useRealtimeCollection). Avant, le calendrier et le widget chargeaient
 * l'historique une seule fois par couple, sans temps réel : une saisie faite
 * dans Wenn n'y apparaissait qu'au redémarrage d'Orbit.
 *
 * Lecture seule : Orbit n'écrit jamais dans cycle_days (mêmes policies RLS
 * "select member" que Wenn). `enabled` à faux (affichage désactivé dans
 * Réglages) : aucune lecture, liste vide.
 */
export function useCycleDays(enabled: boolean): { days: CycleDayRow[]; loading: boolean } {
  const { couple } = useCouple();
  const { rows, loading } = useRealtimeCollection<CycleDayRow>(
    "cycle_days",
    enabled ? couple?.id ?? null : null,
    sortByDate,
    { columns: CYCLE_DAY_COLUMNS }
  );
  return { days: rows, loading };
}
