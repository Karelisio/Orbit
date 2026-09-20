import { addMonths, addYears, differenceInCalendarDays, differenceInCalendarMonths, differenceInCalendarYears, parseISO } from "date-fns";
import { useCouple } from "../context/CoupleContext";

export default function TogetherCounter() {
  const { couple } = useCouple();

  if (!couple?.together_since) {
    return (
      <div className="card">
        <p className="section-title" style={{ margin: 0 }}>
          Jours ensemble
        </p>
        <p style={{ color: "var(--md-sys-color-on-surface-variant)", margin: "6px 0 0" }}>
          Ajoute votre date de départ dans Réglages pour voir le compteur.
        </p>
      </div>
    );
  }

  const start = parseISO(couple.together_since);
  const now = new Date();
  const totalDays = differenceInCalendarDays(now, start) + 1;

  const years = differenceInCalendarYears(now, start);
  const afterYears = addYears(start, years);
  const months = differenceInCalendarMonths(now, afterYears);
  const afterMonths = addMonths(afterYears, months);
  const days = differenceInCalendarDays(now, afterMonths);

  return (
    <div className="card" style={{ textAlign: "center" }}>
      <p className="section-title" style={{ margin: 0 }}>
        Ensemble depuis
      </p>
      <p style={{ fontSize: 26, fontWeight: 800, margin: "6px 0 2px", color: "var(--md-sys-color-primary)" }}>
        {formatBreakdown(years, months, days)}
      </p>
      <p style={{ color: "var(--md-sys-color-on-surface-variant)", margin: 0, fontSize: 13 }}>
        {totalDays} jours au total · depuis le {formatDate(couple.together_since)}
      </p>
    </div>
  );
}

function formatBreakdown(years: number, months: number, days: number): string {
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} an${years > 1 ? "s" : ""}`);
  if (months > 0) parts.push(`${months} mois`);
  if (days > 0 || parts.length === 0) parts.push(`${days} jour${days > 1 ? "s" : ""}`);
  return parts.join(", ");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
