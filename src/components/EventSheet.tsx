import { useState } from "react";
import { EVENT_CATEGORIES, EVENT_CATEGORY_LABELS, REMINDER_OPTIONS, type EventCategory, type OrbitEvent } from "../types";
import type { NewEvent } from "../hooks/useEvents";

interface EventSheetProps {
  initialDate?: string;
  event?: OrbitEvent;
  onSave: (fields: NewEvent) => Promise<{ error: string | null }>;
  onDelete?: () => void;
  onClose: () => void;
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EventSheet({ initialDate, event, onSave, onDelete, onClose }: EventSheetProps) {
  const [title, setTitle] = useState(event?.title ?? "");
  const [category, setCategory] = useState<EventCategory>(event?.category ?? "autre");
  const [location, setLocation] = useState(event?.location ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [allDay, setAllDay] = useState(event?.all_day ?? false);
  const [startsAt, setStartsAt] = useState(toLocalInput(event?.starts_at ?? (initialDate ? `${initialDate}T09:00` : null)));
  const [reminders, setReminders] = useState<number[]>(event?.reminder_minutes_before ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleReminder(minutes: number) {
    setReminders((prev) => (prev.includes(minutes) ? prev.filter((m) => m !== minutes) : [...prev, minutes]));
  }

  async function handleSave() {
    if (!title.trim() || !startsAt) {
      setError("Titre et date sont obligatoires");
      return;
    }
    setSaving(true);
    setError(null);
    const { error } = await onSave({
      title: title.trim(),
      description: description.trim() || null,
      location: location.trim() || null,
      category,
      color: null,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: null,
      all_day: allDay,
      reminder_minutes_before: reminders,
    });
    setSaving(false);
    if (error) setError(error);
    else onClose();
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h2 style={{ marginTop: 0 }}>{event ? "Modifier l'événement" : "Nouvel événement"}</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input className="input" placeholder="Titre" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input
            className="input"
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
          <div className="checkbox-row">
            <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} id="all-day" />
            <label htmlFor="all-day">Toute la journée</label>
          </div>
          <input className="input" placeholder="Lieu (optionnel)" value={location} onChange={(e) => setLocation(e.target.value)} />
          <textarea
            className="input"
            placeholder="Description (optionnel)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <p className="section-title" style={{ margin: "4px 0 0" }}>
            Catégorie
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {EVENT_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                className={`chip${category === c ? " selected" : ""}`}
                onClick={() => setCategory(c)}
              >
                {EVENT_CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>

          <p className="section-title" style={{ margin: "4px 0 0" }}>
            Rappels
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {REMINDER_OPTIONS.map((option) => (
              <button
                key={option.minutes}
                type="button"
                className={`chip${reminders.includes(option.minutes) ? " selected" : ""}`}
                onClick={() => toggleReminder(option.minutes)}
              >
                {option.label}
              </button>
            ))}
          </div>

          {error && <p style={{ color: "var(--md-sys-color-error)", fontSize: 13, margin: 0 }}>{error}</p>}

          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
          {onDelete && (
            <button className="btn btn-danger" onClick={onDelete}>
              Supprimer l'événement
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
