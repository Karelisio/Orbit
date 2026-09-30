import { useEffect, useState } from "react";
import { App } from "@capacitor/app";
import { differenceInCalendarDays, format as formatDate, parseISO } from "date-fns";
import { useCouple } from "../context/CoupleContext";
import { supabase } from "../lib/supabase";
import { computeCycleSummary } from "../lib/cyclePredictions";
import type { CyclePhase, CycleStatus } from "../types";

/**
 * Widget discret : lit cycle_days de Wenn en lecture seule (même couple_id,
 * mêmes policies RLS "select member" — Orbit n'écrit jamais dans cette table).
 * Si la couple n'a pas de données de cycle (ex: le partenaire n'utilise pas
 * Wenn), le widget reste simplement masqué (available: false).
 */
export function useCycleStatus(): CycleStatus {
  const { couple } = useCouple();
  const [status, setStatus] = useState<CycleStatus>({
    available: false,
    phase: "inconnu",
    daysUntilNextPeriod: null,
    nextPeriodStart: null,
  });

  useEffect(() => {
    if (!couple) {
      setStatus({ available: false, phase: "inconnu", daysUntilNextPeriod: null, nextPeriodStart: null });
      return;
    }

    let cancelled = false;

    async function load() {
      let data: { date: string; flow: string | null }[] | null = null;
      let error: unknown = null;
      try {
        const result = await supabase.from("cycle_days").select("date, flow").eq("couple_id", couple!.id).order("date");
        data = result.data;
        error = result.error;
      } catch (e) {
        error = e; // hors ligne : le widget reste sur son dernier état connu
      }

      if (cancelled) return;
      if (error || !data || data.length === 0) {
        if (!error) setStatus({ available: false, phase: "inconnu", daysUntilNextPeriod: null, nextPeriodStart: null });
        return;
      }

      const summary = computeCycleSummary(data as { date: string; flow: string | null }[]);
      if (!summary.nextPeriodStart) {
        setStatus({ available: false, phase: "inconnu", daysUntilNextPeriod: null, nextPeriodStart: null });
        return;
      }

      const today = new Date();
      const daysUntilNextPeriod = differenceInCalendarDays(parseISO(summary.nextPeriodStart), today);

      let phase: CyclePhase = "normal";
      if (daysUntilNextPeriod <= 0 && daysUntilNextPeriod > -7) phase = "regles";
      else if (summary.ovulationDate === format(today)) phase = "ovulation";
      else if (isWithin(format(today), summary.fertileWindowStart, summary.fertileWindowEnd)) phase = "fertile";

      setStatus({ available: true, phase, daysUntilNextPeriod, nextPeriodStart: summary.nextPeriodStart });
    }

    load();

    // Rechargement groupé (debounce) : une rafale de suppressions (espace
    // supprimé, en cascade) ou de reprises ne donne qu'une seule requête.
    let reloadTimer: ReturnType<typeof setTimeout> | undefined;
    function scheduleReload() {
      clearTimeout(reloadTimer);
      reloadTimer = setTimeout(load, 1000);
    }

    // Nom de channel unique (comme useRealtimeCollection) : Supabase
    // réutiliserait sinon le channel précédent encore en cours de fermeture.
    const channel = supabase
      .channel(`orbit-cycle-${couple.id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "cycle_days", filter: `couple_id=eq.${couple.id}` }, load)
      // Un DELETE n'est jamais livré sur un abonnement filtré (voir
      // useRealtimeCollection) : écouté à part, sans filtre — seul l'id
      // arrive, d'où un simple rechargement.
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "cycle_days" }, scheduleReload)
      .subscribe();

    // Retour au premier plan : rattrape ce que le temps réel a pu manquer
    // pendant que l'app dormait.
    const appStateListener = App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) scheduleReload();
    });

    return () => {
      cancelled = true;
      clearTimeout(reloadTimer);
      void appStateListener.then((handle) => handle.remove());
      supabase.removeChannel(channel);
    };
  }, [couple?.id]);

  return status;
}

/**
 * Date locale, pas UTC : avec toISOString(), entre minuit et 2h du matin en
 * France, "aujourd'hui" était comparé à la veille et la phase du cycle
 * (ovulation/fertile) pouvait être décalée d'un jour.
 */
function format(date: Date): string {
  return formatDate(date, "yyyy-MM-dd");
}

function isWithin(date: string, start: string | null, end: string | null): boolean {
  if (!start || !end) return false;
  return date >= start && date <= end;
}
