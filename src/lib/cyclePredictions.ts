import { addDays, differenceInCalendarDays, parseISO, format } from "date-fns";
import type { CyclePhase, CycleStatus } from "../types";

const DEFAULT_CYCLE_LENGTH = 28;
const DEFAULT_PERIOD_LENGTH = 5;
const OVULATION_OFFSET_BEFORE_NEXT_PERIOD = 14;
const FERTILE_WINDOW_BEFORE_OVULATION = 5;
const FERTILE_WINDOW_AFTER_OVULATION = 1;

interface MinimalCycleDay {
  date: string;
  flow: string | null;
}

/**
 * Seuls ces niveaux de flux comptent comme des règles pour la prédiction
 * (débuts de règles et durée des règles) : un spotting, souvent isolé en
 * milieu de cycle, devenait sinon un « début de règles » et décalait la
 * prochaine date d'environ deux semaines. Même règle côté Wenn.
 */
const PERIOD_FLOWS = new Set(["leger", "moyen", "abondant"]);

function isPeriodDay(day: MinimalCycleDay): boolean {
  return day.flow !== null && PERIOD_FLOWS.has(day.flow);
}

function toDate(dateStr: string): Date {
  return parseISO(dateStr);
}

/** Médiane : un cycle inhabituel isolé ne tire pas la durée retenue comme le ferait une moyenne. */
function median(values: number[]): number {
  const sorted = values.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function getPeriodStarts(days: MinimalCycleDay[]): string[] {
  const periodDates = days
    .filter(isPeriodDay)
    .map((d) => d.date)
    .sort();

  const starts: string[] = [];
  let previous: string | null = null;

  for (const date of periodDates) {
    if (!previous || differenceInCalendarDays(toDate(date), toDate(previous)) > 1) {
      starts.push(date);
    }
    previous = date;
  }

  return starts;
}

export interface CycleSummary {
  nextPeriodStart: string | null;
  averageCycleLength: number;
  averagePeriodLength: number;
  ovulationDate: string | null;
  fertileWindowStart: string | null;
  fertileWindowEnd: string | null;
  currentCycleDay: number | null;
}

function computeAveragePeriodLength(days: MinimalCycleDay[], fallback: number): number {
  const sortedFlowDays = days
    .filter(isPeriodDay)
    .map((d) => d.date)
    .sort();

  const runs: number[] = [];
  let currentRun = 0;
  for (let i = 0; i < sortedFlowDays.length; i++) {
    currentRun++;
    const next = sortedFlowDays[i + 1];
    if (!next || differenceInCalendarDays(toDate(next), toDate(sortedFlowDays[i])) > 1) {
      runs.push(currentRun);
      currentRun = 0;
    }
  }
  return runs.length ? Math.round(runs.reduce((a, b) => a + b, 0) / runs.length) : fallback;
}

/**
 * Version allégée de la prédiction de cycle de Wenn : Orbit ne lit que
 * cycle_days en lecture seule pour afficher un mini-widget (phase + jours
 * avant les prochaines règles), pas de graphiques ni de saisie.
 */
export function computeCycleSummary(
  days: MinimalCycleDay[],
  fallbackCycleLength = DEFAULT_CYCLE_LENGTH,
  fallbackPeriodLength = DEFAULT_PERIOD_LENGTH
): CycleSummary {
  const starts = getPeriodStarts(days);

  const cycleLengths: number[] = [];
  for (let i = 1; i < starts.length; i++) {
    const length = differenceInCalendarDays(toDate(starts[i]), toDate(starts[i - 1]));
    if (length >= 15 && length <= 60) cycleLengths.push(length);
  }

  const recentLengths = cycleLengths.slice(-6);
  const averageCycleLength = recentLengths.length ? Math.round(median(recentLengths)) : fallbackCycleLength;
  const averagePeriodLength = computeAveragePeriodLength(days, fallbackPeriodLength);

  const lastPeriodStart = starts.length ? starts[starts.length - 1] : null;

  if (!lastPeriodStart) {
    return {
      nextPeriodStart: null,
      averageCycleLength,
      averagePeriodLength,
      ovulationDate: null,
      fertileWindowStart: null,
      fertileWindowEnd: null,
      currentCycleDay: null,
    };
  }

  const next = addDays(toDate(lastPeriodStart), averageCycleLength);
  const nextPeriodStart = format(next, "yyyy-MM-dd");
  const ovulation = addDays(next, -OVULATION_OFFSET_BEFORE_NEXT_PERIOD);
  const ovulationDate = format(ovulation, "yyyy-MM-dd");

  return {
    nextPeriodStart,
    averageCycleLength,
    averagePeriodLength,
    ovulationDate,
    fertileWindowStart: format(addDays(ovulation, -FERTILE_WINDOW_BEFORE_OVULATION), "yyyy-MM-dd"),
    fertileWindowEnd: format(addDays(ovulation, FERTILE_WINDOW_AFTER_OVULATION), "yyyy-MM-dd"),
    currentCycleDay: differenceInCalendarDays(new Date(), toDate(lastPeriodStart)) + 1,
  };
}

const UNAVAILABLE_STATUS: CycleStatus = {
  available: false,
  phase: "inconnu",
  daysUntilNextPeriod: null,
  nextPeriodStart: null,
};

/**
 * État du cycle affiché par le widget cycle de l'accueil (CycleWidget), à la
 * date `today` : phase et jours avant les prochaines règles. Indisponible
 * sans historique de règles (ex. Wenn pas utilisée).
 */
export function computeCycleStatus(days: MinimalCycleDay[], today: Date = new Date()): CycleStatus {
  if (days.length === 0) return UNAVAILABLE_STATUS;
  const summary = computeCycleSummary(days);
  if (!summary.nextPeriodStart) return UNAVAILABLE_STATUS;

  const todayStr = format(today, "yyyy-MM-dd");
  const daysUntilNextPeriod = differenceInCalendarDays(toDate(summary.nextPeriodStart), today);

  let phase: CyclePhase = "normal";
  if (daysUntilNextPeriod <= 0 && daysUntilNextPeriod > -7) phase = "regles";
  else if (summary.ovulationDate === todayStr) phase = "ovulation";
  else if (isWithin(todayStr, summary.fertileWindowStart, summary.fertileWindowEnd)) phase = "fertile";

  return { available: true, phase, daysUntilNextPeriod, nextPeriodStart: summary.nextPeriodStart };
}

function isWithin(date: string, start: string | null, end: string | null): boolean {
  if (!start || !end) return false;
  return date >= start && date <= end;
}

/**
 * Jours de règles prédits, en projetant plusieurs cycles à partir de
 * `nextPeriodStart` jusqu'à couvrir la date `until` — pour que le calendrier
 * affiche la prédiction sur les mois suivants, pas seulement le tout
 * prochain cycle (même logique que Wenn).
 */
export function predictedPeriodDatesUntil(
  nextPeriodStart: string | null,
  averageCycleLength: number,
  averagePeriodLength: number,
  until: Date
): Set<string> {
  const result = new Set<string>();
  if (!nextPeriodStart) return result;

  let cursor = toDate(nextPeriodStart);
  const untilTime = until.getTime();
  // Garde-fou : au plus 24 cycles projetés (~2 ans), largement suffisant.
  for (let cycle = 0; cycle < 24 && cursor.getTime() <= untilTime; cycle++) {
    for (let i = 0; i < averagePeriodLength; i++) {
      result.add(format(addDays(cursor, i), "yyyy-MM-dd"));
    }
    cursor = addDays(cursor, averageCycleLength);
  }
  return result;
}
