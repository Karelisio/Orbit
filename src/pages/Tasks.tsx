import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useCouple } from "../context/CoupleContext";
import { useTasks } from "../hooks/useTasks";

export default function Tasks() {
  const { user } = useAuth();
  const { partnerId } = useCouple();
  const { tasks, addTask, toggleTask, deleteTask } = useTasks();
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState<string | null>(null);

  async function handleAdd() {
    if (!title.trim()) return;
    await addTask(title.trim(), assignee);
    setTitle("");
    setAssignee(null);
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
              <div key={task.id} className="list-item">
                <label className="checkbox-row" style={{ flex: 1 }}>
                  <input type="checkbox" checked={task.done} onChange={() => toggleTask(task)} />
                  <span>
                    {task.title}
                    {task.assigned_to && (
                      <span style={{ fontSize: 12, color: "var(--md-sys-color-on-surface-variant)", marginLeft: 8 }}>
                        {task.assigned_to === user?.id ? "(moi)" : "(partenaire)"}
                      </span>
                    )}
                  </span>
                </label>
                <button className="btn-icon" onClick={() => deleteTask(task.id)} aria-label="Supprimer">
                  🗑️
                </button>
              </div>
            ))}
          </div>

          {done.length > 0 && (
            <>
              <p className="section-title">Terminées</p>
              <div className="list">
                {done.map((task) => (
                  <div key={task.id} className="list-item">
                    <label className="checkbox-row" style={{ flex: 1 }}>
                      <input type="checkbox" checked={task.done} onChange={() => toggleTask(task)} />
                      <span className="done-text">{task.title}</span>
                    </label>
                    <button className="btn-icon" onClick={() => deleteTask(task.id)} aria-label="Supprimer">
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
