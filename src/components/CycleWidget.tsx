import { useCycleStatus } from "../hooks/useCycleStatus";

const PHASE_LABELS: Record<string, string> = {
  regles: "Règles en cours",
  fertile: "Période fertile",
  ovulation: "Jour d'ovulation",
  normal: "Cycle en cours",
};

/**
 * Widget discret uniquement, comme demandé : pas de graphiques ni de
 * symptômes ici — juste la phase et le compte à rebours, lus depuis Wenn.
 */
export default function CycleWidget() {
  const status = useCycleStatus();

  if (!status.available) return null;

  return (
    <div className="card row">
      <div>
        <p style={{ margin: 0, fontWeight: 700 }}>{PHASE_LABELS[status.phase] ?? "Cycle"}</p>
        <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--md-sys-color-on-surface-variant)" }}>
          {status.daysUntilNextPeriod === null
            ? "Prochaines règles : inconnu"
            : status.daysUntilNextPeriod > 0
              ? `Prochaines règles dans ${status.daysUntilNextPeriod} j`
              : "Règles prévues aujourd'hui"}
        </p>
      </div>
      <span style={{ fontSize: 24 }}>🌸</span>
    </div>
  );
}
