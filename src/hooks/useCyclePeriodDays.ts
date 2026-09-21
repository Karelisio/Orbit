import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useCouple } from "../context/CoupleContext";
import { supabase } from "../lib/supabase";
import { computeCycleSummary, predictedPeriodDatesUntil } from "../lib/cyclePredictions";

interface MinimalCycleDay {
  date: string;
  flow: string | null;
}

/**
 * Jours de règles (lecture seule, table cycle_days de Wenn) sur une plage de
 * dates — utilisé pour un affichage discret dans le calendrier d'Orbit,
 * activable/désactivable dans Réglages. Orbit n'écrit jamais dans cette table.
 *
 * Combine les jours déjà enregistrés (flow non nul) et les jours prédits
 * (projection du cycle moyen, comme Wenn) : sans la prédiction, seuls les
 * mois déjà vécus affichaient quelque chose, jamais les mois à venir.
 *
 * L'historique complet n'est chargé qu'une fois par couple : changer de mois
 * ne refait plus la requête, seul le filtrage local est recalculé.
 */
export function useCyclePeriodDays(rangeStart: Date, rangeEnd: Date, enabled: boolean): Set<string> {
  const { couple } = useCouple();
  const [cycleDays, setCycleDays] = useState<MinimalCycleDay[]>([]);

  const startStr = format(rangeStart, "yyyy-MM-dd");
  const endStr = format(rangeEnd, "yyyy-MM-dd");

  useEffect(() => {
    if (!enabled || !couple) {
      setCycleDays([]);
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
          setCycleDays(data as MinimalCycleDay[]);
        },
        () => {
          // hors ligne : on garde les jours de règles déjà chargés
        }
      );

    return () => {
      cancelled = true;
    };
  }, [enabled, couple?.id]);

  return useMemo(() => {
    if (!enabled || cycleDays.length === 0) return new Set<string>();

    const dates = new Set(
      cycleDays.filter((d) => d.flow && d.date >= startStr && d.date <= endStr).map((d) => d.date)
    );

    const summary = computeCycleSummary(cycleDays);
    const predicted = predictedPeriodDatesUntil(
      summary.nextPeriodStart,
      summary.averageCycleLength,
      summary.averagePeriodLength,
      rangeEnd
    );
    for (const date of predicted) {
      if (date >= startStr && date <= endStr) dates.add(date);
    }

    return dates;
  }, [enabled, cycleDays, startStr, endStr, rangeEnd]);
}
