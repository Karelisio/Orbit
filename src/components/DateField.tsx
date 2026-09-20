import { useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { fr } from "date-fns/locale";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

interface DateFieldProps {
  value: string; // "yyyy-MM-dd" ou ""
  onChange: (value: string) => void;
  placeholder?: string;
  clearLabel?: string;
}

/**
 * Remplace `<input type="date">` : le date-picker natif Android rend un
 * dialogue cassé (vide, mal dimensionné) dans la WebView de Capacitor. Cette
 * mini-grille MD3 réutilise les styles/comportement du calendrier principal.
 */
export default function DateField({ value, onChange, placeholder = "Choisir une date", clearLabel = "Aucune date" }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => (value ? new Date(value) : new Date()));

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 }),
  });

  function pick(date: Date) {
    onChange(format(date, "yyyy-MM-dd"));
    setOpen(false);
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        className="input"
        style={{ textAlign: "left", cursor: "pointer" }}
        onClick={() => {
          setViewMonth(value ? new Date(value) : new Date());
          setOpen((v) => !v);
        }}
      >
        {value ? format(new Date(value), "d MMMM yyyy", { locale: fr }) : placeholder}
      </button>

      {open && (
        <div className="card" style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 20, padding: 14 }}>
          <div className="row" style={{ marginBottom: 8 }}>
            <button type="button" className="btn btn-icon" onClick={() => setViewMonth((m) => addMonths(m, -1))} aria-label="Mois précédent">
              ←
            </button>
            <span style={{ fontWeight: 700, textTransform: "capitalize", fontSize: 14 }}>
              {format(viewMonth, "MMMM yyyy", { locale: fr })}
            </span>
            <button type="button" className="btn btn-icon" onClick={() => setViewMonth((m) => addMonths(m, 1))} aria-label="Mois suivant">
              →
            </button>
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
              const classes = ["calendar-day"];
              if (!isSameMonth(date, viewMonth)) classes.push("outside");
              if (isToday(date)) classes.push("today");
              if (value && isSameDay(date, new Date(value))) classes.push("selected");
              return (
                <button key={date.toISOString()} type="button" className={classes.join(" ")} onClick={() => pick(date)}>
                  <span className="calendar-day-number">{format(date, "d")}</span>
                </button>
              );
            })}
          </div>
          {value && (
            <button
              type="button"
              className="btn btn-text"
              style={{ marginTop: 8 }}
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              {clearLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
