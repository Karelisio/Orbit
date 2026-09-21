import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useCouple } from "../context/CoupleContext";
import DateField from "./DateField";
import { TASK_RECURRENCE_OPTIONS, TASK_RECURRENCE_UNIT_LABELS, taskRecurrenceLabel, type OrbitTask, type TaskRecurrence } from "../types";
import type { NewTask } from "../hooks/useTasks";

interface TaskSheetProps {
  task?: OrbitTask;
  onSave: (fields: NewTask) => Promise<{ error: string | null }>;
  onDelete?: () => void;
  onClose: () => void;
}

export default function TaskSheet({ task, onSave, onDelete, onClose }: TaskSheetProps) {
  const { user } = useAuth();
  const { partnerId } = useCouple();

  const [title, setTitle] = useState(task?.title ?? "");
  const [assignee, setAssignee] = useState<string | null>(task?.assigned_to ?? null);
  const [dueDate, setDueDate] = useState(task?.due_date ?? "");
  const [recurrence, setRecurrence] = useState<TaskRecurrence>(task?.recurrence ?? "none");
  const [recurrenceInterval, setRecurrenceInterval] = useState(task?.recurrence_interval ?? 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!title.trim()) {
      setError("Le titre est obligatoire");
      return;
    }
    setSaving(true);
    setError(null);
    const { error } = await onSave({
      title: title.trim(),
      assignedTo: assignee,
      dueDate: dueDate || null,
      recurrence,
      recurrenceInterval: recurrence === "none" ? 1 : recurrenceInterval,
    });
    setSaving(false);
    if (error) setError(error);
    else onClose();
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h2 style={{ marginTop: 0 }}>{task ? "Modifier la tâche" : "Nouvelle tâche"}</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input className="input" placeholder="Titre" value={title} onChange={(e) => setTitle(e.target.value)} />

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className={`chip${assignee === null ? " selected" : ""}`} onClick={() => setAssignee(null)}>
              Ensemble
            </button>
            <button type="button" className={`chip${assignee === user?.id ? " selected" : ""}`} onClick={() => setAssignee(user!.id)}>
              Moi
            </button>
            {partnerId && (
              <button type="button" className={`chip${assignee === partnerId ? " selected" : ""}`} onClick={() => setAssignee(partnerId)}>
                Mon/ma partenaire
              </button>
            )}
          </div>

          <DateField value={dueDate} onChange={setDueDate} placeholder="Échéance (optionnel)" />

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {TASK_RECURRENCE_OPTIONS.map((r) => (
              <button key={r} type="button" className={`chip${recurrence === r ? " selected" : ""}`} onClick={() => setRecurrence(r)}>
                {TASK_RECURRENCE_UNIT_LABELS[r]}
              </button>
            ))}
          </div>
          {recurrence !== "none" && (
            <div className="row" style={{ justifyContent: "flex-start", gap: 10 }}>
              <span style={{ fontSize: 13, color: "var(--md-sys-color-on-surface-variant)" }}>{taskRecurrenceLabel(recurrence, recurrenceInterval)}</span>
              <span style={{ fontSize: 13, color: "var(--md-sys-color-on-surface-variant)" }}>· intervalle :</span>
              <input
                className="input"
                type="number"
                min={1}
                max={99}
                value={recurrenceInterval}
                onChange={(e) => setRecurrenceInterval(Math.max(1, Number(e.target.value) || 1))}
                style={{ width: 70, padding: "8px 10px" }}
              />
            </div>
          )}

          {error && <p style={{ color: "var(--md-sys-color-error)", fontSize: 13, margin: 0 }}>{error}</p>}

          <button className="btn btn-primary" onClick={handleSave} disabled={!title.trim() || saving}>
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
          {onDelete && (
            <button className="btn btn-danger" onClick={onDelete}>
              Supprimer la tâche
            </button>
          )}
          <button className="btn btn-text" onClick={onClose}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
