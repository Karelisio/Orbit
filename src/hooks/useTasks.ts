import { addDays, addMonths, addWeeks, format } from "date-fns";
import { useAuth } from "../context/AuthContext";
import { useCouple } from "../context/CoupleContext";
import { supabase } from "../lib/supabase";
import { useRealtimeCollection } from "./useRealtimeCollection";
import type { OrbitTask, TaskRecurrence } from "../types";

function nextDueDate(fromDate: string | null, recurrence: TaskRecurrence, interval: number): string {
  const base = fromDate ? new Date(fromDate) : new Date();
  switch (recurrence) {
    case "daily":
      return format(addDays(base, interval), "yyyy-MM-dd");
    case "weekly":
      return format(addWeeks(base, interval), "yyyy-MM-dd");
    case "monthly":
      return format(addMonths(base, interval), "yyyy-MM-dd");
    default:
      return format(base, "yyyy-MM-dd");
  }
}

function sortTasks(a: OrbitTask, b: OrbitTask): number {
  if (a.done !== b.done) return a.done ? 1 : -1;
  if (a.due_date && b.due_date && a.due_date !== b.due_date) return a.due_date.localeCompare(b.due_date);
  if (a.due_date && !b.due_date) return -1;
  if (!a.due_date && b.due_date) return 1;
  return b.created_at.localeCompare(a.created_at);
}

export function useTasks() {
  const { user } = useAuth();
  const { couple } = useCouple();
  const { rows, loading, setRows } = useRealtimeCollection<OrbitTask>("orbit_tasks", couple?.id ?? null, sortTasks);

  // Ajout optimiste : sans ça, l'app (et le widget, qui réagit au même état
  // `tasks`) n'affichaient la nouvelle tâche qu'au retour de l'écho temps
  // réel Supabase, avec un délai réseau perceptible.
  async function addTask(fields: {
    title: string;
    assignedTo: string | null;
    dueDate: string | null;
    recurrence: TaskRecurrence;
    recurrenceInterval: number;
  }) {
    if (!couple || !user) return { error: "Aucun couple lié" };
    const { data, error } = await supabase
      .from("orbit_tasks")
      .insert({
        couple_id: couple.id,
        title: fields.title,
        assigned_to: fields.assignedTo,
        due_date: fields.dueDate,
        recurrence: fields.recurrence,
        recurrence_interval: fields.recurrenceInterval,
        created_by: user.id,
      })
      .select()
      .single();
    if (error) return { error: error.message };
    const created = data as OrbitTask;
    setRows((prev) => (prev.some((t) => t.id === created.id) ? prev : [...prev, created].sort(sortTasks)));
    return { error: null };
  }

  // Une tâche récurrente ne se "termine" jamais : cocher fait juste avancer
  // son échéance à la prochaine occurrence, sans jamais passer par done=true.
  async function toggleTask(task: OrbitTask) {
    if (task.recurrence !== "none") {
      const due = nextDueDate(task.due_date, task.recurrence, task.recurrence_interval);
      setRows((prev) => prev.map((t) => (t.id === task.id ? { ...t, due_date: due } : t)));
      const { error } = await supabase.from("orbit_tasks").update({ due_date: due }).eq("id", task.id);
      return { error: error?.message ?? null };
    }

    const done = !task.done;
    setRows((prev) => prev.map((t) => (t.id === task.id ? { ...t, done, done_at: done ? new Date().toISOString() : null } : t)));
    const { error } = await supabase
      .from("orbit_tasks")
      .update({ done, done_at: done ? new Date().toISOString() : null })
      .eq("id", task.id);
    return { error: error?.message ?? null };
  }

  // Suppression optimiste : sans ça, la ligne restait affichée jusqu'à ce que
  // l'écho temps réel du DELETE revienne (ou un rechargement manuel).
  async function deleteTask(id: string) {
    setRows((prev) => prev.filter((t) => t.id !== id));
    const { error } = await supabase.from("orbit_tasks").delete().eq("id", id);
    return { error: error?.message ?? null };
  }

  return { tasks: rows, loading, addTask, toggleTask, deleteTask };
}
