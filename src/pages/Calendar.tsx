import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  addMonths,
  addYears,
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
import { useCouple } from "../context/CoupleContext";
import EventSheet from "../components/EventSheet";
import { eventDisplayColor, eventOccursOnDay, type OrbitEvent } from "../types";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];
const MONTH_NAMES = Array.from({ length: 12 }, (_, i) => format(new Date(2000, i, 1), "MMM", { locale: fr }));

function eventTimeRange(event: OrbitEvent): string {
  if (event.all_day) return "Toute la journée";
  const start = format(new Date(event.starts_at), "HH:mm");
  if (!event.ends_at) return start;
  return `${start} – ${format(new Date(event.ends_at), "HH:mm")}`;
}

/** Les événements récurrents chaque année comptent pour n'importe quelle année. */
function eventsOnDay(events: OrbitEvent[], day: Date): OrbitEvent[] {
  return events.filter((e) => eventOccursOnDay(e, day));
}

export default function Calendar() {
  const { events, addEvent, updateEvent, deleteEvent } = useEvents();
  const { showPeriodInCalendar } = usePreferences();
  const { couple } = useCouple();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialDateParam = searchParams.get("date");
  const [month, setMonth] = useState(() => (initialDateParam ? new Date(initialDateParam) : new Date()));
  const [selectedDate, setSelectedDate] = useState(() => initialDateParam ?? format(new Date(), "yyyy-MM-dd"));
  const [sheet, setSheet] = useState<"none" | "new" | OrbitEvent>("none");
  const [quickJumpOpen, setQuickJumpOpen] = useState(false);

  // Ouvrir le calendrier sur un jour précis depuis l'extérieur (widget écran
  // d'accueil : tap sur une case du mois) : le lien natif dépose "?date=..."
  // dans l'URL, y compris si Calendar est déjà affiché (l'app était déjà
  // ouverte en arrière-plan). Consommé puis retiré pour ne pas rejouer au
  // prochain changement de mois manuel.
  useEffect(() => {
    const dateParam = searchParams.get("date");
    if (!dateParam) return;
    const parsed = new Date(dateParam);
    if (Number.isNaN(parsed.getTime())) return;
    setMonth(parsed);
    setSelectedDate(dateParam);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const periodDates = useCyclePeriodDays(days[0], days[days.length - 1], showPeriodInCalendar);

  const selectedEvents = useMemo(() => eventsOnDay(events, new Date(selectedDate)), [events, selectedDate]);

  return (
    <div className="screen">
      <div className="row" style={{ marginBottom: 12, position: "relative" }}>
        <button className="btn-icon" onClick={() => setMonth((m) => addMonths(m, -1))} aria-label="Mois précédent">
          ←
        </button>
        <button
          className="btn btn-text"
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <button type="button" className="btn btn-icon" onClick={() => setMonth((m) => addYears(m, -1))} aria-label="Année précédente">
                ←
              </button>
              <input
                className="input"
                type="number"
                value={month.getFullYear()}
                onChange={(e) => {
                  const y = Number(e.target.value);
                  if (!Number.isNaN(y)) setMonth((m) => setYear(m, y));
                }}
                style={{ width: 90, padding: "6px 8px", textAlign: "center" }}
              />
              <button type="button" className="btn btn-icon" onClick={() => setMonth((m) => addYears(m, 1))} aria-label="Année suivante">
                →
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
              {MONTH_NAMES.map((name, i) => (
                <button
                  key={i}
                  type="button"
                  className={`chip${month.getMonth() === i ? " selected" : ""}`}
                  style={{ padding: "6px 4px", fontSize: 12, textTransform: "capitalize", justifyContent: "center" }}
                  onClick={() => setMonth((m) => setDateMonth(m, i))}
                >
                  {name}
                </button>
              ))}
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
          const dayEvents = eventsOnDay(events, date);
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
                    <span key={e.id} className="dot" style={{ background: eventDisplayColor(e, couple) }} />
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
                <span className="dot" style={{ background: eventDisplayColor(event, couple) }} />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 600 }}>{event.title}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--md-sys-color-on-surface-variant)" }}>
                    {eventTimeRange(event)} · {event.category}
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
