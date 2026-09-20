import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  setMonth as setDateMonth,
  setYear,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { fr } from "date-fns/locale";
import { useEvents } from "../hooks/useEvents";
import { useCyclePeriodDays } from "../hooks/useCyclePeriodDays";
import { usePreferences } from "../context/PreferencesContext";
import EventSheet from "../components/EventSheet";
import { EVENT_CATEGORY_COLORS, EVENT_CATEGORY_LABELS, type OrbitEvent } from "../types";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];
const MONTH_NAMES = Array.from({ length: 12 }, (_, i) => format(new Date(2000, i, 1), "MMMM", { locale: fr }));

export default function Calendar() {
  const { events, addEvent, updateEvent, deleteEvent } = useEvents();
  const { showPeriodInCalendar } = usePreferences();
  const [month, setMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [sheet, setSheet] = useState<"none" | "new" | OrbitEvent>("none");
  const [quickJumpOpen, setQuickJumpOpen] = useState(false);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const periodDates = useCyclePeriodDays(days[0], days[days.length - 1], showPeriodInCalendar);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, OrbitEvent[]>();
    for (const event of events) {
      const key = event.starts_at.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    return map;
  }, [events]);

  const selectedEvents = eventsByDate.get(selectedDate) ?? [];

  return (
    <div className="screen">
      <div className="row" style={{ marginBottom: 12, position: "relative" }}>
        <button className="btn-icon" onClick={() => setMonth((m) => addMonths(m, -1))} aria-label="Mois précédent">
          ←
        </button>
        <button
          className="btn-text"
          style={{ fontSize: 17, fontWeight: 700, textTransform: "capitalize", padding: "4px 10px" }}
          onClick={() => setQuickJumpOpen((v) => !v)}
        >
          {format(month, "MMMM yyyy", { locale: fr })}
        </button>
        <button className="btn-icon" onClick={() => setMonth((m) => addMonths(m, 1))} aria-label="Mois suivant">
          →
        </button>

        {quickJumpOpen && (
          <div
            className="card"
            style={{
              position: "absolute",
              top: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 10,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              padding: 14,
              width: 260,
            }}
          >
            <div style={{ display: "flex", gap: 8 }}>
              <select
                className="input"
                value={month.getMonth()}
                onChange={(e) => setMonth((m) => setDateMonth(m, Number(e.target.value)))}
                style={{ flex: 1 }}
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={i} value={i} style={{ textTransform: "capitalize" }}>
                    {name}
                  </option>
                ))}
              </select>
              <select
                className="input"
                value={month.getFullYear()}
                onChange={(e) => setMonth((m) => setYear(m, Number(e.target.value)))}
                style={{ width: 90 }}
              >
                {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <button
              className="btn btn-text"
              onClick={() => {
                const today = new Date();
                setMonth(today);
                setSelectedDate(format(today, "yyyy-MM-dd"));
                setQuickJumpOpen(false);
              }}
            >
              Aujourd'hui
            </button>
          </div>
        )}
      </div>

      <div className="calendar-grid" style={{ marginBottom: 4 }}>
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="calendar-weekday">
            {d}
          </div>
        ))}
      </div>
      <div className="calendar-grid">
        {days.map((date) => {
          const dateStr = format(date, "yyyy-MM-dd");
          const dayEvents = eventsByDate.get(dateStr) ?? [];
          const isPeriodDay = showPeriodInCalendar && periodDates.has(dateStr);
          const classes = ["calendar-day"];
          if (!isSameMonth(date, month)) classes.push("outside");
          if (isToday(date)) classes.push("today");
          if (isSameDay(date, new Date(selectedDate))) classes.push("selected");
          return (
            <button key={dateStr} className={classes.join(" ")} onClick={() => setSelectedDate(dateStr)}>
              <span className="calendar-day-number">{format(date, "d")}</span>
              {(dayEvents.length > 0 || isPeriodDay) && (
                <span className="calendar-day-dots">
                  {isPeriodDay && <span className="dot" style={{ background: "#b3261e" }} title="Règles" />}
                  {dayEvents.slice(0, isPeriodDay ? 2 : 3).map((e) => (
                    <span key={e.id} className="dot" style={{ background: e.color ?? EVENT_CATEGORY_COLORS[e.category] }} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 20 }}>
        <div className="row">
          <p className="section-title" style={{ margin: 0 }}>
            {format(new Date(selectedDate), "EEEE d MMMM", { locale: fr })}
          </p>
          <button className="btn-icon" onClick={() => setSheet("new")} aria-label="Ajouter un événement">
            ＋
          </button>
        </div>
        {selectedEvents.length === 0 ? (
          <p className="empty-state">Aucun événement ce jour-là.</p>
        ) : (
          <div className="list">
            {selectedEvents.map((event) => (
              <button key={event.id} className="list-item" style={{ textAlign: "left", cursor: "pointer" }} onClick={() => setSheet(event)}>
                <span className="dot" style={{ background: event.color ?? EVENT_CATEGORY_COLORS[event.category] }} />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 600 }}>{event.title}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--md-sys-color-on-surface-variant)" }}>
                    {event.all_day ? "Toute la journée" : format(new Date(event.starts_at), "HH:mm")} · {EVENT_CATEGORY_LABELS[event.category]}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {sheet === "new" && (
        <EventSheet initialDate={selectedDate} onSave={(fields) => addEvent(fields)} onClose={() => setSheet("none")} />
      )}
      {sheet !== "none" && sheet !== "new" && (
        <EventSheet
          event={sheet}
          onSave={(fields) => updateEvent(sheet.id, fields)}
          onDelete={() => {
            deleteEvent(sheet);
            setSheet("none");
          }}
          onClose={() => setSheet("none")}
        />
      )}
    </div>
  );
}
