import { useAuth } from "../context/AuthContext";
import { useCouple } from "../context/CoupleContext";
import { supabase } from "../lib/supabase";
import { useRealtimeCollection } from "./useRealtimeCollection";
import { cancelEventNotifications, scheduleEventNotifications } from "../lib/notifications";
import type { OrbitEvent } from "../types";

export type NewEvent = Pick<
  OrbitEvent,
  "title" | "description" | "location" | "category" | "color" | "starts_at" | "ends_at" | "all_day" | "reminder_minutes_before"
>;

export function useEvents() {
  const { user } = useAuth();
  const { couple } = useCouple();
  const { rows, loading } = useRealtimeCollection<OrbitEvent>("orbit_events", couple?.id ?? null, (a, b) =>
    a.starts_at.localeCompare(b.starts_at)
  );

  async function addEvent(fields: NewEvent) {
    if (!couple || !user) return { error: "Aucun couple lié" };
    const { data, error } = await supabase
      .from("orbit_events")
      .insert({ ...fields, couple_id: couple.id, created_by: user.id })
      .select()
      .single();
    if (error) return { error: error.message };
    await scheduleEventNotifications(data as OrbitEvent);
    return { error: null };
  }

  async function updateEvent(id: string, fields: Partial<NewEvent>) {
    const { data, error } = await supabase.from("orbit_events").update(fields).eq("id", id).select().single();
    if (error) return { error: error.message };
    await scheduleEventNotifications(data as OrbitEvent);
    return { error: null };
  }

  async function deleteEvent(event: OrbitEvent) {
    const { error } = await supabase.from("orbit_events").delete().eq("id", event.id);
    if (error) return { error: error.message };
    await cancelEventNotifications(event);
    return { error: null };
  }

  return { events: rows, loading, addEvent, updateEvent, deleteEvent };
}
