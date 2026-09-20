import { differenceInCalendarDays, parseISO } from "date-fns";
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

  const days = differenceInCalendarDays(new Date(), parseISO(couple.together_since)) + 1;

  return (
    <div className="card" style={{ textAlign: "center" }}>
      <p className="section-title" style={{ margin: 0 }}>
        Jours ensemble
      </p>
      <p style={{ fontSize: 40, fontWeight: 800, margin: "4px 0", color: "var(--md-sys-color-primary)" }}>{days}</p>
      <p style={{ color: "var(--md-sys-color-on-surface-variant)", margin: 0, fontSize: 13 }}>depuis le {formatDate(couple.together_since)}</p>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
