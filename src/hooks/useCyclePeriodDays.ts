import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useCouple } from "../context/CoupleContext";
import { supabase } from "../lib/supabase";

/**
 * Jours de règles (lecture seule, table cycle_days de Wenn) sur une plage de
 * dates — utilisé pour un affichage discret dans le calendrier d'Orbit,
 * activable/désactivable dans Réglages. Orbit n'écrit jamais dans cette table.
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

    supabase
      .from("cycle_days")
      .select("date, flow")
      .eq("couple_id", couple.id)
      .not("flow", "is", null)
      .gte("date", startStr)
      .lte("date", endStr)
      .then(({ data }) => {
        if (cancelled) return;
        setPeriodDates(new Set(((data as { date: string }[]) ?? []).map((d) => d.date)));
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, couple?.id, startStr, endStr]);

  return periodDates;
}
