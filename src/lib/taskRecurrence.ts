import { addDays, addMonths, addWeeks, format, getDaysInMonth, parseISO } from "date-fns";
import type { TaskRecurrence } from "../types";

/** Garde-fou : une échéance vieille de plusieurs siècles ne bloque pas l'app. */
const MAX_STEPS = 100_000;

/**
 * Jour du mois visé par une tâche mensuelle (« le 31 »). Une échéance déjà
 * ramenée au dernier jour d'un mois trop court (31 janvier -> 28 février)
 * ne dit plus d'elle-même quel était ce jour : `storedDay` (colonne
 * facultative orbit_tasks.recurrence_day, voir useTasks) le garde. Il est
 * ignoré s'il ne correspond plus à l'échéance (modifiée entre-temps, par
 * exemple depuis une version de l'app qui ne le connaît pas).
 */
export function monthlyAnchorDay(dueDate: string, storedDay?: number | null): number {
  const due = parseISO(dueDate);
  const day = due.getDate();
  if (storedDay && storedDay >= 1 && storedDay <= 31) {
    if (storedDay === day) return storedDay;
    if (day === getDaysInMonth(due) && storedDay > day) return storedDay;
  }
  return day;
}

/**
 * Prochaine échéance d'une tâche récurrente qu'on coche : le premier multiple
 * de l'intervalle, compté depuis l'échéance actuelle (ou aujourd'hui s'il n'y
 * en a pas), qui tombe aujourd'hui ou plus tard. Avant :
 * - l'échéance était lue avec new Date("aaaa-mm-jj"), à minuit UTC (la
 *   veille à l'ouest de Greenwich) ;
 * - une tâche en retard n'avançait que d'un intervalle par coche ;
 * - une tâche mensuelle glissait (31/01 -> 28/02 -> 28/03) : chaque mois est
 *   maintenant recalculé depuis le jour d'ancrage (`anchorDay`, voir
 *   monthlyAnchorDay), ramené au dernier jour des mois trop courts.
 */
export function nextDueDate(
  dueDate: string | null,
  recurrence: TaskRecurrence,
  interval: number,
  today: Date = new Date(),
  anchorDay?: number
): string {
  const todayStr = format(today, "yyyy-MM-dd");
  const base = parseISO(dueDate ?? todayStr);
  if (recurrence === "none") return format(base, "yyyy-MM-dd");
  const step = Math.max(1, Math.floor(interval) || 1);
  const day = anchorDay ?? base.getDate();

  for (let k = 1; k <= MAX_STEPS; k++) {
    let candidate: Date;
    if (recurrence === "daily") {
      candidate = addDays(base, step * k);
    } else if (recurrence === "weekly") {
      candidate = addWeeks(base, step * k);
    } else {
      const month = addMonths(new Date(base.getFullYear(), base.getMonth(), 1), step * k);
      candidate = new Date(month.getFullYear(), month.getMonth(), Math.min(day, getDaysInMonth(month)));
    }
    const candidateStr = format(candidate, "yyyy-MM-dd");
    if (candidateStr >= todayStr) return candidateStr;
  }
  return todayStr;
}
