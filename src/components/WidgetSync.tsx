import { useEffect } from "react";
import { differenceInCalendarDays, format, isSameMonth } from "date-fns";
import { useEvents } from "../hooks/useEvents";
import { useTasks } from "../hooks/useTasks";
import { syncWidgets } from "../lib/widgetSync";

function eventTimeLabel(startsAt: string, allDay: boolean): string {
  const date = new Date(startsAt);
  const days = differenceInCalendarDays(date, new Date());
  const time = allDay ? "" : ` à ${format(date, "HH:mm")}`;
  if (days <= 0) return `Aujourd'hui${time}`;
  if (days === 1) return `Demain${time}`;
  if (days < 7) return `Dans ${days} j${time}`;
  return format(date, "d MMM") + time;
}

/** Tient les widgets d'écran d'accueil Android à jour à chaque changement de données. */
export default function WidgetSync() {
  const { events } = useEvents();
  const { tasks } = useTasks();

  useEffect(() => {
    const now = new Date();
    const nextEvent = events.filter((e) => new Date(e.starts_at).getTime() >= now.getTime())[0] ?? null;
    const pendingTasks = tasks.filter((t) => !t.done);
    const eventDaysThisMonth = Array.from(
      new Set(
        events
          .filter((e) => isSameMonth(new Date(e.starts_at), now))
          .map((e) => new Date(e.starts_at).getDate())
      )
    );

    syncWidgets({
      nextEventTitle: nextEvent?.title ?? null,
      nextEventTimeLabel: nextEvent ? eventTimeLabel(nextEvent.starts_at, nextEvent.all_day) : null,
      pendingTasksCount: pendingTasks.length,
      nextTaskTitle: pendingTasks[0]?.title ?? null,
      eventDaysThisMonth,
    });
  }, [events, tasks]);

  return null;
}
