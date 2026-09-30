import { differenceInCalendarDays, format } from "date-fns";
import { fr } from "date-fns/locale";

/**
 * Libellés relatifs des widgets. Ils servent de référence au calcul natif
 * (OrbitWidgetLabels.java), qui les recalcule à chaque rendu à partir des
 * dates absolues poussées par WidgetSync.tsx : un libellé calculé une fois
 * pour toutes ici restait figé (« Dentiste — Demain à 10:00 » encore affiché
 * le lendemain à 11 h). Les deux côtés doivent garder exactement les mêmes
 * formulations ; celui-ci n'est plus qu'un repli, stocké tel quel.
 */

/** « Aujourd'hui à 10:00 », « Demain », « Dans 3 j à 18:30 », « 12 oct. »... */
export function eventTimeLabel(start: Date, allDay: boolean, now: Date = new Date()): string {
  const days = differenceInCalendarDays(start, now);
  const time = allDay ? "" : ` à ${format(start, "HH:mm")}`;
  if (days <= 0) return `Aujourd'hui${time}`;
  if (days === 1) return `Demain${time}`;
  if (days < 7) return `Dans ${days} j${time}`;
  return format(start, "d MMM", { locale: fr }) + time;
}

/** Symétrique pour une date passée (dernière note du journal) : « Hier », « Il y a 3 j »... */
export function journalTimeLabel(createdAt: Date, now: Date = new Date()): string {
  const days = differenceInCalendarDays(now, createdAt);
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  if (days < 7) return `Il y a ${days} j`;
  return format(createdAt, "d MMM", { locale: fr });
}
