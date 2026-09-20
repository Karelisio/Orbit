import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useCouple } from "../context/CoupleContext";
import { supabase } from "../lib/supabase";
import { computeCycleSummary, predictedPeriodDatesUntil } from "../lib/cyclePredictions";

/**
 * Jours de règles (lecture seule, table cycle_days de Wenn) sur une plage de
 * dates — utilisé pour un affichage discret dans le calendrier d'Orbit,
 * activable/désactivable dans Réglages. Orbit n'écrit jamais dans cette table.
 *
 * Combine les jours déjà enregistrés (flow non nul) et les jours prédits
 * (projection du cycle moyen, comme Wenn) : sans la prédiction, seuls les
 * mois déjà vécus affichaient quelque chose, jamais les mois à venir.
 */
export function useCyclePeriodDays(rangeStart: Date, rangeEnd: Date, enabled: boolean): Set<string> {
  const { couple } = useCouple();
  const [periodDates, setPeriodDates] = useState<Set<string>>(new Set());

  const startStr = format(rangeStart, "yyyy-MM-dd");
  const endStr = format(rangeEnd, "yyyy-MM-dd");

  useEffect(() => {
    if (!enabled || !couple) {
      setPeriodDates(new Set());
      return;
    }

    let cancelled = false;

    // L'historique complet (pas seulement la plage affichée) est nécessaire
    // pour calculer la longueur moyenne du cycle et projeter la prédiction.
    supabase
      .from("cycle_days")
      .select("date, flow")
      .eq("couple_id", couple.id)
      .order("date")
      .then(
        ({ data }) => {
          if (cancelled || !data) return;
          const days = data as { date: string; flow: string | null }[];

          const actual = days.filter((d) => d.flow && d.date >= startStr && d.date <= endStr).map((d) => d.date);

          const summary = computeCycleSummary(days);
          const predicted = predictedPeriodDatesUntil(
            summary.nextPeriodStart,
            summary.averageCycleLength,
            summary.averagePeriodLength,
            rangeEnd
          );

          const combined = new Set(actual);
          for (const d of predicted) {
            if (d >= startStr && d <= endStr) combined.add(d);
          }
          setPeriodDates(combined);
        },
        () => {
          // hors ligne : on garde les jours de règles déjà affichés
        }
      );

    return () => {
      cancelled = true;
    };
  }, [enabled, couple?.id, startStr, endStr, rangeEnd]);

  return periodDates;
}
