import { useEffect } from "react";
import { differenceInCalendarDays, format } from "date-fns";
import { useEvents } from "../hooks/useEvents";
import { useTasks } from "../hooks/useTasks";
import { useCouple } from "../context/CoupleContext";
import { syncWidgets } from "../lib/widgetSync";
import { eventDisplayColor, eventOccursOnDay, nextEventOccurrence } from "../types";

function eventTimeLabel(startsAt: string, allDay: boolean): string {
  const date = new Date(startsAt);
  const days = differenceInCalendarDays(date, new Date());
  const time = allDay ? "" : ` à ${format(date, "HH:mm")}`;
  if (days <= 0) return `Aujourd'hui${time}`;
  if (days === 1) return `Demain${time}`;
  if (days < 7) return `Dans ${days} j${time}`;
  return format(date, "d MMM") + time;
}

/**
 * Nettoie un titre d'événement pour l'encodage compact envoyé au widget natif.
 * La troncature finale est laissée au widget (ellipse "…" selon la largeur
 * réelle de la case) : on envoie juste de quoi remplir la pastille.
 */
function sanitizeForWidget(text: string): string {
  return text.replace(/[:;]/g, " ").trim().slice(0, 18);
}

/** Tient les widgets d'écran d'accueil Android à jour à chaque changement de données. */
export default function WidgetSync() {
  const { events } = useEvents();
  const { tasks } = useTasks();
  const { couple } = useCouple();

  useEffect(() => {
    const now = new Date();
    const upcoming = events
      .map((event) => ({ event, occursAt: nextEventOccurrence(event, now) }))
      .filter(({ occursAt }) => occursAt.getTime() >= now.getTime())
      .sort((a, b) => a.occursAt.getTime() - b.occursAt.getTime());
    const nextEvent = upcoming[0] ?? null;
    const pendingTasks = tasks.filter((t) => !t.done);

    // Un seul événement (le premier) affiché par jour du mois en cours, avec
    // son titre et sa couleur, pour dessiner de vraies pastilles colorées sur
    // le widget calendrier plutôt qu'un simple point. Un événement récurrent
    // chaque année compte pour n'importe quel jour du mois affiché qui
    // correspond, quelle que soit l'année de sa création.
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const byDay = new Map<number, { title: string; color: string }>();
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(now.getFullYear(), now.getMonth(), day);
      const match = events.find((e) => eventOccursOnDay(e, dayDate));
      if (match) {
        byDay.set(day, { title: sanitizeForWidget(match.title), color: eventDisplayColor(match, couple).replace("#", "") });
      }
    }
    const eventsThisMonth = Array.from(byDay.entries())
      .map(([day, { title, color }]) => `${day}:${title}:${color}`)
      .join(";");

    syncWidgets({
      nextEventTitle: nextEvent?.event.title ?? null,
      nextEventTimeLabel: nextEvent ? eventTimeLabel(nextEvent.occursAt.toISOString(), nextEvent.event.all_day) : null,
      pendingTasksCount: pendingTasks.length,
      nextTaskTitle: pendingTasks[0]?.title ?? null,
      eventsThisMonth,
    });
  }, [events, tasks, couple]);

  return null;
}
