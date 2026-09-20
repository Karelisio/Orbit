import { addDays, differenceInCalendarDays, parseISO, format } from "date-fns";

const DEFAULT_CYCLE_LENGTH = 28;
const OVULATION_OFFSET_BEFORE_NEXT_PERIOD = 14;
const FERTILE_WINDOW_BEFORE_OVULATION = 5;
const FERTILE_WINDOW_AFTER_OVULATION = 1;

interface MinimalCycleDay {
  date: string;
  flow: string | null;
}

function toDate(dateStr: string): Date {
  return parseISO(dateStr);
}

function getPeriodStarts(days: MinimalCycleDay[]): string[] {
  const periodDates = days
    .filter((d) => d.flow)
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
  ovulationDate: string | null;
  fertileWindowStart: string | null;
  fertileWindowEnd: string | null;
  currentCycleDay: number | null;
}

/**
 * Version allégée de la prédiction de cycle de Wenn : Orbit ne lit que
 * cycle_days en lecture seule pour afficher un mini-widget (phase + jours
 * avant les prochaines règles), pas de graphiques ni de saisie.
 */
export function computeCycleSummary(days: MinimalCycleDay[], fallbackCycleLength = DEFAULT_CYCLE_LENGTH): CycleSummary {
  const starts = getPeriodStarts(days);

  const cycleLengths: number[] = [];
  for (let i = 1; i < starts.length; i++) {
    const length = differenceInCalendarDays(toDate(starts[i]), toDate(starts[i - 1]));
    if (length >= 15 && length <= 60) cycleLengths.push(length);
  }

  const recentLengths = cycleLengths.slice(-6);
  const averageCycleLength = recentLengths.length
    ? Math.round(recentLengths.reduce((a, b) => a + b, 0) / recentLengths.length)
    : fallbackCycleLength;

  const lastPeriodStart = starts.length ? starts[starts.length - 1] : null;

  if (!lastPeriodStart) {
    return {
      nextPeriodStart: null,
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
    ovulationDate,
    fertileWindowStart: format(addDays(ovulation, -FERTILE_WINDOW_BEFORE_OVULATION), "yyyy-MM-dd"),
    fertileWindowEnd: format(addDays(ovulation, FERTILE_WINDOW_AFTER_OVULATION), "yyyy-MM-dd"),
    currentCycleDay: differenceInCalendarDays(new Date(), toDate(lastPeriodStart)) + 1,
  };
}
