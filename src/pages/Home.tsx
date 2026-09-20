import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { differenceInCalendarDays, parseISO } from "date-fns";
import TogetherCounter from "../components/TogetherCounter";
import CycleWidget from "../components/CycleWidget";
import { useEvents } from "../hooks/useEvents";
import { useTasks } from "../hooks/useTasks";
import { EVENT_CATEGORY_COLORS } from "../types";

export default function Home() {
  const { events } = useEvents();
  const { tasks, toggleTask } = useTasks();

  const upcomingEvents = useMemo(() => {
    const now = Date.now();
    return events.filter((e) => new Date(e.starts_at).getTime() >= now).slice(0, 3);
  }, [events]);

  const pendingTasks = useMemo(() => tasks.filter((t) => !t.done).slice(0, 4), [tasks]);

  return (
    <div className="screen">
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Orbit</h1>
        <Link to="/settings" className="btn-icon" aria-label="Réglages">
          ⚙️
        </Link>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <TogetherCounter />
        <CycleWidget />

        <section>
          <p className="section-title">Prochains événements</p>
          {upcomingEvents.length === 0 ? (
            <p className="empty-state">Rien de prévu pour l'instant.</p>
          ) : (
            <div className="list">
              {upcomingEvents.map((event) => (
                <CountdownRow key={event.id} title={event.title} startsAt={event.starts_at} color={event.color ?? EVENT_CATEGORY_COLORS[event.category]} />
              ))}
            </div>
          )}
          <Link to="/calendar" className="btn btn-text" style={{ padding: "8px 0" }}>
            Voir le calendrier →
          </Link>
        </section>

        <section>
          <p className="section-title">Tâches en cours</p>
          {pendingTasks.length === 0 ? (
            <p className="empty-state">Tout est fait ✨</p>
          ) : (
            <div className="list">
              {pendingTasks.map((task) => (
                <label key={task.id} className="list-item checkbox-row">
                  <input type="checkbox" checked={task.done} onChange={() => toggleTask(task)} />
                  <span>{task.title}</span>
                </label>
              ))}
            </div>
          )}
          <Link to="/tasks" className="btn btn-text" style={{ padding: "8px 0" }}>
            Voir toutes les tâches →
          </Link>
        </section>
      </div>
    </div>
  );
}

function CountdownRow({ title, startsAt, color }: { title: string; startsAt: string; color: string }) {
  const days = differenceInCalendarDays(parseISO(startsAt), new Date());
  const label = days <= 0 ? "aujourd'hui" : days === 1 ? "demain" : `dans ${days} j`;
  return (
    <div className="list-item">
      <span className="dot" style={{ background: color }} />
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontWeight: 600 }}>{title}</p>
      </div>
      <span style={{ fontSize: 13, color: "var(--md-sys-color-on-surface-variant)" }}>{label}</span>
    </div>
  );
}
