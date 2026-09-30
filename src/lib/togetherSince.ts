import { addMonths, addYears, differenceInCalendarDays, differenceInMonths, differenceInYears, parseISO, startOfDay } from "date-fns";

export interface TogetherDuration {
  years: number;
  months: number;
  days: number;
  /** Jours ensemble, le premier jour compris. */
  totalDays: number;
}

/**
 * Durée écoulée depuis `since` ("aaaa-mm-jj", date locale) en années, mois
 * et jours PLEINS. Avant, des écarts « calendaires » (changements d'année ou
 * de mois, pas des durées) faisaient compter une année entière du
 * 15 décembre au 30 septembre suivant : « 1 an, 15 jours » au lieu de
 * « 9 mois, 15 jours ».
 */
export function togetherDuration(since: string, now: Date = new Date()): TogetherDuration {
  const start = parseISO(since);
  const today = startOfDay(now);
  if (today.getTime() < start.getTime()) return { years: 0, months: 0, days: 0, totalDays: 0 };

  let years = differenceInYears(today, start);
  let months = differenceInMonths(today, addYears(start, years));
  // Du 29 février au 28 février suivant, differenceInYears ne voit pas encore
  // d'année pleine mais differenceInMonths y compte 12 mois : on replie.
  years += Math.floor(months / 12);
  months %= 12;
  let days = differenceInCalendarDays(today, addMonths(addYears(start, years), months));
  // Garde-fou (fins de mois) : jamais de jours négatifs.
  while (days < 0 && months > 0) {
    months--;
    days = differenceInCalendarDays(today, addMonths(addYears(start, years), months));
  }

  return { years, months, days: Math.max(0, days), totalDays: differenceInCalendarDays(today, start) + 1 };
}

/** « 1 an, 2 mois, 3 jours » — les parties nulles sont omises (« 0 jour » le premier jour). */
export function formatTogetherDuration({ years, months, days }: TogetherDuration): string {
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} an${years > 1 ? "s" : ""}`);
  if (months > 0) parts.push(`${months} mois`);
  if (days > 0 || parts.length === 0) parts.push(`${days} jour${days > 1 ? "s" : ""}`);
  return parts.join(", ");
}
