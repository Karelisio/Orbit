import { parseISO } from "date-fns";
import { useCouple } from "../context/CoupleContext";
import { formatTogetherDuration, togetherDuration } from "../lib/togetherSince";

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

  const duration = togetherDuration(couple.together_since);

  return (
    <div className="card" style={{ textAlign: "center" }}>
      <p className="section-title" style={{ margin: 0 }}>
        Ensemble depuis
      </p>
      <p style={{ fontSize: 26, fontWeight: 800, margin: "6px 0 2px", color: "var(--md-sys-color-primary)" }}>
        {formatTogetherDuration(duration)}
      </p>
      <p style={{ color: "var(--md-sys-color-on-surface-variant)", margin: 0, fontSize: 13 }}>
        {duration.totalDays} jours au total · depuis le {formatDate(couple.together_since)}
      </p>
    </div>
  );
}

/** Date locale (parseISO) : new Date("aaaa-mm-jj") est lu à minuit UTC, soit la veille à l'ouest de Greenwich. */
function formatDate(iso: string): string {
  return parseISO(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
