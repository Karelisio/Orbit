import { useState } from "react";
import { addHours } from "date-fns";
import { useAuth } from "../context/AuthContext";
import { useCouple } from "../context/CoupleContext";
import { useEventCategories } from "../hooks/useEventCategories";
import DateTimeField from "./DateTimeField";
import { EVENT_CATEGORY_COLOR_PALETTE, REMINDER_OPTIONS, REMINDER_UNIT_OPTIONS, type OrbitEvent } from "../types";
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
  const { user } = useAuth();
  const { partnerId } = useCouple();
  const { categories, addCategory } = useEventCategories();

  const [title, setTitle] = useState(event?.title ?? "");
  const [category, setCategory] = useState<string>(event?.category ?? "Autre");
  const [assignedTo, setAssignedTo] = useState<string | null>(event?.assigned_to ?? null);
  const [location, setLocation] = useState(event?.location ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [allDay, setAllDay] = useState(event?.all_day ?? false);
  const [startsAt, setStartsAt] = useState(toLocalInput(event?.starts_at ?? (initialDate ? `${initialDate}T09:00` : null)));
  const [hasEnd, setHasEnd] = useState(Boolean(event?.ends_at));
  const [endsAt, setEndsAt] = useState(toLocalInput(event?.ends_at ?? null));
  const [reminders, setReminders] = useState<number[]>(event?.reminder_minutes_before ?? []);
  const [reminderAmount, setReminderAmount] = useState(10);
  const [reminderUnit, setReminderUnit] = useState<(typeof REMINDER_UNIT_OPTIONS)[number]["unit"]>("minutes");
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState(EVENT_CATEGORY_COLOR_PALETTE[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleHasEnd(checked: boolean) {
    setHasEnd(checked);
    if (checked && !endsAt && startsAt) {
      setEndsAt(toLocalInput(addHours(new Date(startsAt), 1).toISOString()));
    }
  }

  function toggleReminder(minutes: number) {
    setReminders((prev) => (prev.includes(minutes) ? prev.filter((m) => m !== minutes) : [...prev, minutes]));
  }

  function addCustomReminder() {
    const unit = REMINDER_UNIT_OPTIONS.find((u) => u.unit === reminderUnit)!;
    const minutes = unit.toMinutes(Math.max(1, reminderAmount));
    if (!reminders.includes(minutes)) setReminders((prev) => [...prev, minutes].sort((a, b) => a - b));
  }

  async function handleAddCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    const { error } = await addCategory(name, newCategoryColor);
    if (!error) {
      setCategory(name);
      setNewCategoryName("");
      setAddingCategory(false);
    }
  }

  async function handleSave() {
    if (!title.trim() || !startsAt) {
      setError("Titre et date sont obligatoires");
      return;
    }
    if (hasEnd && endsAt && new Date(endsAt) <= new Date(startsAt)) {
      setError("La fin doit être après le début");
      return;
    }
    setSaving(true);
    setError(null);
    const selectedColor = categories.find((c) => c.name === category)?.color ?? null;
    const { error } = await onSave({
      title: title.trim(),
      description: description.trim() || null,
      location: location.trim() || null,
      category,
      color: selectedColor,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: hasEnd && endsAt ? new Date(endsAt).toISOString() : null,
      all_day: allDay,
      reminder_minutes_before: reminders,
      assigned_to: assignedTo,
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
          <DateTimeField value={startsAt} onChange={setStartsAt} />
          <div className="checkbox-row">
            <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} id="all-day" />
            <label htmlFor="all-day">Toute la journée</label>
          </div>
          <div className="checkbox-row">
            <input type="checkbox" checked={hasEnd} onChange={(e) => toggleHasEnd(e.target.checked)} id="has-end" />
            <label htmlFor="has-end">Ajouter une heure de fin</label>
          </div>
          {hasEnd && <DateTimeField value={endsAt} onChange={setEndsAt} />}
          <input className="input" placeholder="Lieu (optionnel)" value={location} onChange={(e) => setLocation(e.target.value)} />
          <textarea
            className="input"
            placeholder="Description (optionnel)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <p className="section-title" style={{ margin: "4px 0 0" }}>
            Pour qui
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className={`chip${assignedTo === null ? " selected" : ""}`} onClick={() => setAssignedTo(null)}>
              Ensemble
            </button>
            <button type="button" className={`chip${assignedTo === user?.id ? " selected" : ""}`} onClick={() => setAssignedTo(user!.id)}>
              Moi
            </button>
            {partnerId && (
              <button type="button" className={`chip${assignedTo === partnerId ? " selected" : ""}`} onClick={() => setAssignedTo(partnerId)}>
                Mon/ma partenaire
              </button>
            )}
          </div>

          <p className="section-title" style={{ margin: "4px 0 0" }}>
            Catégorie
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`chip${category === c.name ? " selected" : ""}`}
                style={category === c.name ? { background: c.color, color: "#fff" } : undefined}
                onClick={() => setCategory(c.name)}
              >
                {c.name}
              </button>
            ))}
            <button type="button" className="chip" onClick={() => setAddingCategory((v) => !v)}>
              + Nouvelle
            </button>
          </div>

          {addingCategory && (
            <div className="card" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
              <input
                className="input"
                placeholder="Nom de la catégorie"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {EVENT_CATEGORY_COLOR_PALETTE.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={color}
                    onClick={() => setNewCategoryColor(color)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: color,
                      border: newCategoryColor === color ? "3px solid var(--md-sys-color-on-surface)" : "3px solid transparent",
                      cursor: "pointer",
                    }}
                  />
                ))}
              </div>
              <button type="button" className="btn btn-secondary" onClick={handleAddCategory} disabled={!newCategoryName.trim()}>
                Ajouter la catégorie
              </button>
            </div>
          )}

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
            {reminders
              .filter((m) => !REMINDER_OPTIONS.some((o) => o.minutes === m))
              .map((m) => (
                <button key={m} type="button" className="chip selected" onClick={() => toggleReminder(m)}>
                  {m} min avant
                </button>
              ))}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input
              className="input"
              type="number"
              min={1}
              max={999}
              value={reminderAmount}
              onChange={(e) => setReminderAmount(Math.max(1, Number(e.target.value) || 1))}
              style={{ width: 70, padding: "8px 10px" }}
            />
            {REMINDER_UNIT_OPTIONS.map((u) => (
              <button
                key={u.unit}
                type="button"
                className={`chip${reminderUnit === u.unit ? " selected" : ""}`}
                onClick={() => setReminderUnit(u.unit)}
              >
                {u.label}
              </button>
            ))}
            <button type="button" className="btn btn-secondary" onClick={addCustomReminder}>
              Ajouter
            </button>
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
