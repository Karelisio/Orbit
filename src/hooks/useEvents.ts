import { useAuth } from "../context/AuthContext";
import { useCouple } from "../context/CoupleContext";
import { supabase } from "../lib/supabase";
import { useRealtimeCollection } from "./useRealtimeCollection";
import { requestNotificationPermission } from "../lib/notifications";
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
  const { rows, loading, setRows, mutate } = useRealtimeCollection<OrbitEvent>("orbit_events", couple?.id ?? null, sortEvents);

  // Ajout/modif optimistes : sans ça, l'app (et le widget, qui réagit au
  // même état `events`) n'affichaient le changement qu'au retour de l'écho
  // temps réel Supabase, avec un délai réseau perceptible.
  //
  // Les rappels ne se programment plus ici, au coup par coup : WidgetSync.tsx
  // resynchronise tous ceux de ce téléphone à chaque changement de `events`,
  // même venu de l'autre (voir resyncEventReminders). Seule la permission se
  // demande encore ici, au moment où un rappel est choisi.
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
    if (created.reminder_minutes_before.length > 0) await requestNotificationPermission();
    return { error: null };
  }

  async function updateEvent(id: string, fields: Partial<NewEvent>) {
    const { data, error } = await supabase.from("orbit_events").update(fields).eq("id", id).select().single();
    if (error) return { error: error.message };
    const updated = data as OrbitEvent;
    setRows((prev) => prev.map((e) => (e.id === id ? updated : e)).sort(sortEvents));
    if (updated.reminder_minutes_before.length > 0) await requestNotificationPermission();
    return { error: null };
  }

  // Suppression optimiste, annulée avec un message si elle échoue (voir mutate).
  function deleteEvent(event: OrbitEvent) {
    return mutate(
      (prev) => prev.filter((e) => e.id !== event.id),
      () => supabase.from("orbit_events").delete().eq("id", event.id),
      "Événement non supprimé : vérifie ta connexion."
    );
  }

  return { events: rows, loading, addEvent, updateEvent, deleteEvent };
}
