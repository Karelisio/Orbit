import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useCouple } from "../context/CoupleContext";
import { useJournal } from "../hooks/useJournal";

export default function Journal() {
  const { user } = useAuth();
  const { partnerId } = useCouple();
  const { entries, addEntry, deleteEntry } = useJournal();
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!content.trim()) return;
    setSaving(true);
    await addEntry(content);
    setSaving(false);
    setContent("");
  }

  return (
    <div className="screen">
      <h1 style={{ marginBottom: 16 }}>Journal</h1>

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        <textarea
          className="input"
          placeholder="Un souvenir, une idée, un mot doux..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <button className="btn btn-primary" onClick={handleAdd} disabled={!content.trim() || saving}>
          {saving ? "Enregistrement..." : "Publier"}
        </button>
      </div>

      {entries.length === 0 ? (
        <p className="empty-state">Aucune note pour l'instant.</p>
      ) : (
        <div className="list">
          {entries.map((entry) => (
            <div key={entry.id} className="list-item" style={{ alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{entry.content}</p>
                <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--md-sys-color-on-surface-variant)" }}>
                  {entry.author_id === user?.id ? "Toi" : entry.author_id === partnerId ? "Ton/ta partenaire" : ""} ·{" "}
                  {new Date(entry.created_at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              {entry.author_id === user?.id && (
                <button className="btn-icon" onClick={() => deleteEntry(entry.id)} aria-label="Supprimer">
                  🗑️
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
