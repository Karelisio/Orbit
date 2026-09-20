import { useEffect } from "react";
import { differenceInCalendarDays, format, isSameMonth } from "date-fns";
import { useEvents } from "../hooks/useEvents";
import { useTasks } from "../hooks/useTasks";
import { useCouple } from "../context/CoupleContext";
import { syncWidgets } from "../lib/widgetSync";
import { eventDisplayColor } from "../types";

function eventTimeLabel(startsAt: string, allDay: boolean): string {
  const date = new Date(startsAt);
  const days = differenceInCalendarDays(date, new Date());
  const time = allDay ? "" : ` à ${format(date, "HH:mm")}`;
  if (days <= 0) return `Aujourd'hui${time}`;
  if (days === 1) return `Demain${time}`;
  if (days < 7) return `Dans ${days} j${time}`;
  return format(date, "d MMM") + time;
}

/** Nettoie un titre d'événement pour l'encodage compact envoyé au widget natif. */
function sanitizeForWidget(text: string): string {
  return text.replace(/[:;]/g, " ").trim().slice(0, 14);
}

/** Tient les widgets d'écran d'accueil Android à jour à chaque changement de données. */
export default function WidgetSync() {
  const { events } = useEvents();
  const { tasks } = useTasks();
  const { couple } = useCouple();

  useEffect(() => {
    const now = new Date();
    const nextEvent = events.filter((e) => new Date(e.starts_at).getTime() >= now.getTime())[0] ?? null;
    const pendingTasks = tasks.filter((t) => !t.done);

    // Un seul événement (le premier) affiché par jour du mois en cours, avec
    // son titre et sa couleur, pour dessiner de vraies pastilles colorées sur
    // le widget calendrier plutôt qu'un simple point.
    const byDay = new Map<number, { title: string; color: string }>();
    for (const e of events) {
      const d = new Date(e.starts_at);
      if (!isSameMonth(d, now)) continue;
      const day = d.getDate();
      if (!byDay.has(day)) {
        byDay.set(day, { title: sanitizeForWidget(e.title), color: eventDisplayColor(e, couple).replace("#", "") });
      }
    }
    const eventsThisMonth = Array.from(byDay.entries())
      .map(([day, { title, color }]) => `${day}:${title}:${color}`)
      .join(";");

    syncWidgets({
      nextEventTitle: nextEvent?.title ?? null,
      nextEventTimeLabel: nextEvent ? eventTimeLabel(nextEvent.starts_at, nextEvent.all_day) : null,
      pendingTasksCount: pendingTasks.length,
      nextTaskTitle: pendingTasks[0]?.title ?? null,
      eventsThisMonth,
    });
  }, [events, tasks, couple]);

  return null;
}
