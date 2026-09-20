import { useAuth } from "../context/AuthContext";
import { useCouple } from "../context/CoupleContext";
import { supabase } from "../lib/supabase";
import { useRealtimeCollection } from "./useRealtimeCollection";
import type { OrbitTask } from "../types";

export function useTasks() {
  const { user } = useAuth();
  const { couple } = useCouple();
  const { rows, loading } = useRealtimeCollection<OrbitTask>("orbit_tasks", couple?.id ?? null, (a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return b.created_at.localeCompare(a.created_at);
  });

  async function addTask(title: string, assignedTo: string | null) {
    if (!couple || !user) return { error: "Aucun couple lié" };
    const { error } = await supabase
      .from("orbit_tasks")
      .insert({ couple_id: couple.id, title, assigned_to: assignedTo, created_by: user.id });
    return { error: error?.message ?? null };
  }

  async function toggleTask(task: OrbitTask) {
    const { error } = await supabase
      .from("orbit_tasks")
      .update({ done: !task.done, done_at: !task.done ? new Date().toISOString() : null })
      .eq("id", task.id);
    return { error: error?.message ?? null };
  }

  async function deleteTask(id: string) {
    const { error } = await supabase.from("orbit_tasks").delete().eq("id", id);
    return { error: error?.message ?? null };
  }

  return { tasks: rows, loading, addTask, toggleTask, deleteTask };
}
