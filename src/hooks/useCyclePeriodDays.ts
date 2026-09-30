import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { computeCycleSummary, predictedPeriodDatesUntil } from "../lib/cyclePredictions";
import { useCycleDays } from "./useCycleDays";

export interface PeriodDays {
  /** Jours enregistrés dans Wenn (flow non nul, spotting compris : simple affichage de ce qui a été saisi). */
  recorded: Set<string>;
  /** Jours seulement prévus (projection du cycle moyen), hors jours déjà enregistrés. */
  predicted: Set<string>;
}

const NO_PERIOD_DAYS: PeriodDays = { recorded: new Set(), predicted: new Set() };

/**
 * Jours de règles (lecture seule, cycle_days de Wenn) sur une plage de dates
 * — affichage discret dans le calendrier d'Orbit et sur le widget
 * calendrier, activable/désactivable dans Réglages.
 *
 * Distingue les jours déjà enregistrés et les jours prédits (projection du
 * cycle moyen, comme Wenn — spotting exclu, voir cyclePredictions.ts), que
 * l'affichage différencie comme Wenn (point plein / simple contour) : sans la
 * prédiction, seuls les mois déjà vécus affichaient quelque chose, jamais
 * les mois à venir.
 *
 * L'historique complet vient de la source partagée useCycleDays (chargée
 * une fois, puis tenue à jour en temps réel) : changer de mois ne refait
 * aucune requête, seul le filtrage local est recalculé — à partir des dates
 * de la plage (chaînes), pas des objets Date, que certains appelants
 * recréent à chaque rendu.
 */
export function useCyclePeriodDays(rangeStart: Date, rangeEnd: Date, enabled: boolean): PeriodDays {
  const { days: cycleDays } = useCycleDays(enabled);

  const startStr = format(rangeStart, "yyyy-MM-dd");
  const endStr = format(rangeEnd, "yyyy-MM-dd");

  return useMemo(() => {
    if (!enabled || cycleDays.length === 0) return NO_PERIOD_DAYS;

    const recorded = new Set(
      cycleDays.filter((d) => d.flow && d.date >= startStr && d.date <= endStr).map((d) => d.date)
    );

    const summary = computeCycleSummary(cycleDays);
    const projection = predictedPeriodDatesUntil(
      summary.nextPeriodStart,
      summary.averageCycleLength,
      summary.averagePeriodLength,
      parseISO(endStr)
    );
    const predicted = new Set<string>();
    for (const date of projection) {
      if (date >= startStr && date <= endStr && !recorded.has(date)) predicted.add(date);
    }

    return { recorded, predicted };
  }, [enabled, cycleDays, startStr, endStr]);
}
