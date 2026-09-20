import { useAuth } from "../context/AuthContext";
import { useCouple } from "../context/CoupleContext";
import { supabase } from "../lib/supabase";
import { useRealtimeCollection } from "./useRealtimeCollection";
import { cancelEventNotifications, scheduleEventNotifications } from "../lib/notifications";
import type { OrbitEvent } from "../types";

export type NewEvent = Pick<
  OrbitEvent,
  | "title"
  | "description"
  | "location"
  | "category"
  | "color"
  | "starts_at"
  | "ends_at"
  | "all_day"
  | "reminder_minutes_before"
  | "assigned_to"
  | "recurrence"
>;

function sortEvents(a: OrbitEvent, b: OrbitEvent): number {
  return a.starts_at.localeCompare(b.starts_at);
}

export function useEvents() {
  const { user } = useAuth();
  const { couple } = useCouple();
  const { rows, loading, setRows } = useRealtimeCollection<OrbitEvent>("orbit_events", couple?.id ?? null, sortEvents);

  // Ajout/modif optimistes : sans ça, l'app (et le widget, qui réagit au
  // même état `events`) n'affichaient le changement qu'au retour de l'écho
  // temps réel Supabase, avec un délai réseau perceptible.
  async function addEvent(fields: NewEvent) {
    if (!couple || !user) return { error: "Aucun couple lié" };
    const { data, error } = await supabase
      .from("orbit_events")
      .insert({ ...fields, couple_id: couple.id, created_by: user.id })
      .select()
      .single();
    if (error) return { error: error.message };
    const created = data as OrbitEvent;
    setRows((prev) => (prev.some((e) => e.id === created.id) ? prev : [...prev, created].sort(sortEvents)));
    await scheduleEventNotifications(created);
    return { error: null };
  }

  async function updateEvent(id: string, fields: Partial<NewEvent>) {
    const { data, error } = await supabase.from("orbit_events").update(fields).eq("id", id).select().single();
    if (error) return { error: error.message };
    const updated = data as OrbitEvent;
    setRows((prev) => prev.map((e) => (e.id === id ? updated : e)).sort(sortEvents));
    await scheduleEventNotifications(updated);
    return { error: null };
  }

  async function deleteEvent(event: OrbitEvent) {
    setRows((prev) => prev.filter((e) => e.id !== event.id));
    const { error } = await supabase.from("orbit_events").delete().eq("id", event.id);
    if (error) return { error: error.message };
    await cancelEventNotifications(event);
    return { error: null };
  }

  return { events: rows, loading, addEvent, updateEvent, deleteEvent };
}
