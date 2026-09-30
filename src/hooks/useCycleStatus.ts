import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { computeCycleStatus } from "../lib/cyclePredictions";
import { useCycleDays } from "./useCycleDays";
import type { CycleStatus } from "../types";

/**
 * Widget discret de l'accueil : phase du cycle et compte à rebours, calculés
 * depuis cycle_days de Wenn (lecture seule, source partagée et tenue à jour
 * en temps réel : voir useCycleDays). Sans données de cycle (ex. Wenn pas
 * utilisée), le widget reste simplement masqué (available: false).
 */
export function useCycleStatus(): CycleStatus {
  const { days } = useCycleDays(true);
  // Date locale du jour dans les dépendances : la phase se recalcule au
  // premier rendu qui suit minuit, pas seulement quand les données changent.
  const todayKey = format(new Date(), "yyyy-MM-dd");
  return useMemo(() => computeCycleStatus(days, parseISO(todayKey)), [days, todayKey]);
}
