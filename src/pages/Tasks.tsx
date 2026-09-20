import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuth } from "../context/AuthContext";
import { useCouple } from "../context/CoupleContext";
import { useTasks } from "../hooks/useTasks";
import DateField from "../components/DateField";
import { TASK_RECURRENCE_OPTIONS, TASK_RECURRENCE_UNIT_LABELS, taskRecurrenceLabel, type TaskRecurrence } from "../types";

export default function Tasks() {
  const { user } = useAuth();
  const { partnerId } = useCouple();
  const { tasks, addTask, toggleTask, deleteTask } = useTasks();
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState("");
  const [recurrence, setRecurrence] = useState<TaskRecurrence>("none");
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [showOptions, setShowOptions] = useState(false);

  async function handleAdd() {
    if (!title.trim()) return;
    await addTask({
      title: title.trim(),
      assignedTo: assignee,
      dueDate: dueDate || null,
      recurrence,
      recurrenceInterval: recurrence === "none" ? 1 : recurrenceInterval,
    });
    setTitle("");
    setAssignee(null);
    setDueDate("");
    setRecurrence("none");
    setRecurrenceInterval(1);
    setShowOptions(false);
  }

  const pending = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  return (
    <div className="screen">
      <h1 style={{ marginBottom: 16 }}>Tâches</h1>

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        <input
          className="input"
          placeholder="Nouvelle tâche..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
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

        <button type="button" className="btn btn-text" style={{ padding: "4px 0", alignSelf: "flex-start" }} onClick={() => setShowOptions((v) => !v)}>
          {showOptions ? "Masquer" : "Échéance et récurrence"} {showOptions ? "▲" : "▼"}
        </button>

        {showOptions && (
          <>
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
          </>
        )}

        <button className="btn btn-primary" onClick={handleAdd} disabled={!title.trim()}>
          Ajouter
        </button>
      </div>

      {pending.length === 0 && done.length === 0 ? (
        <p className="empty-state">Aucune tâche pour l'instant.</p>
      ) : (
        <>
          <div className="list" style={{ marginBottom: 20 }}>
            {pending.map((task) => (
              <TaskRow key={task.id} task={task} isMe={task.assigned_to === user?.id} onToggle={() => toggleTask(task)} onDelete={() => deleteTask(task.id)} />
            ))}
          </div>

          {done.length > 0 && (
            <>
              <p className="section-title">Terminées</p>
              <div className="list">
                {done.map((task) => (
                  <TaskRow key={task.id} task={task} isMe={task.assigned_to === user?.id} onToggle={() => toggleTask(task)} onDelete={() => deleteTask(task.id)} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function TaskRow({
  task,
  isMe,
  onToggle,
  onDelete,
}: {
  task: import("../types").OrbitTask;
  isMe: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const isRecurring = task.recurrence !== "none";
  return (
    <div className="list-item">
      <label className="checkbox-row" style={{ flex: 1 }}>
        <input type="checkbox" checked={task.done} onChange={onToggle} />
        <span>
          <span className={task.done ? "done-text" : undefined}>{task.title}</span>
          {task.assigned_to && (
            <span style={{ fontSize: 12, color: "var(--md-sys-color-on-surface-variant)", marginLeft: 8 }}>
              {isMe ? "(moi)" : "(partenaire)"}
            </span>
          )}
          {(task.due_date || isRecurring) && (
            <span style={{ display: "block", fontSize: 12, color: "var(--md-sys-color-on-surface-variant)", marginTop: 2 }}>
              {isRecurring && "🔁 "}
              {task.due_date ? format(new Date(task.due_date), "d MMM", { locale: fr }) : ""}
              {isRecurring && task.due_date ? " · " : ""}
              {isRecurring ? taskRecurrenceLabel(task.recurrence, task.recurrence_interval) : ""}
            </span>
          )}
        </span>
      </label>
      <button className="btn-icon" onClick={onDelete} aria-label="Supprimer">
        🗑️
      </button>
    </div>
  );
}
