import { useCycleStatus } from "../hooks/useCycleStatus";
import WennMark from "./WennMark";
import type { CycleStatus } from "../types";

const PHASE_LABELS: Record<string, string> = {
  regles: "Règles en cours",
  retard: "Règles en retard",
  fertile: "Période fertile",
  ovulation: "Jour d'ovulation",
  normal: "Cycle en cours",
};

function detailLabel(status: CycleStatus): string {
  const days = status.daysUntilNextPeriod;
  if (days === null) return "Prochaines règles : inconnu";
  if (status.phase === "regles" && status.currentCycleDay) return `Jour ${status.currentCycleDay} des règles`;
  if (status.phase === "retard") return days === -1 ? "Prévues hier" : `Prévues il y a ${-days} j`;
  if (days > 0) return `Prochaines règles dans ${days} j`;
  return "Règles prévues aujourd'hui";
}

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
        <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--md-sys-color-on-surface-variant)" }}>{detailLabel(status)}</p>
      </div>
      <WennMark size={28} />
    </div>
  );
}
