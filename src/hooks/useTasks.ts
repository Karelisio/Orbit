import { addDays, addMonths, addWeeks, format } from "date-fns";
import { useAuth } from "../context/AuthContext";
import { useCouple } from "../context/CoupleContext";
import { supabase } from "../lib/supabase";
import { useRealtimeCollection } from "./useRealtimeCollection";
import type { OrbitTask, TaskRecurrence } from "../types";

function nextDueDate(fromDate: string | null, recurrence: TaskRecurrence): string {
  const base = fromDate ? new Date(fromDate) : new Date();
  switch (recurrence) {
    case "daily":
      return format(addDays(base, 1), "yyyy-MM-dd");
    case "weekly":
      return format(addWeeks(base, 1), "yyyy-MM-dd");
    case "monthly":
      return format(addMonths(base, 1), "yyyy-MM-dd");
    default:
      return format(base, "yyyy-MM-dd");
  }
}

export function useTasks() {
  const { user } = useAuth();
  const { couple } = useCouple();
  const { rows, loading, setRows } = useRealtimeCollection<OrbitTask>("orbit_tasks", couple?.id ?? null, (a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.due_date && b.due_date && a.due_date !== b.due_date) return a.due_date.localeCompare(b.due_date);
    if (a.due_date && !b.due_date) return -1;
    if (!a.due_date && b.due_date) return 1;
    return b.created_at.localeCompare(a.created_at);
  });

  async function addTask(fields: {
    title: string;
    assignedTo: string | null;
    dueDate: string | null;
    recurrence: TaskRecurrence;
  }) {
    if (!couple || !user) return { error: "Aucun couple lié" };
    const { error } = await supabase.from("orbit_tasks").insert({
      couple_id: couple.id,
      title: fields.title,
      assigned_to: fields.assignedTo,
      due_date: fields.dueDate,
      recurrence: fields.recurrence,
      created_by: user.id,
    });
    return { error: error?.message ?? null };
  }

  // Une tâche récurrente ne se "termine" jamais : cocher fait juste avancer
  // son échéance à la prochaine occurrence, sans jamais passer par done=true.
  async function toggleTask(task: OrbitTask) {
    if (task.recurrence !== "none") {
      const due = nextDueDate(task.due_date, task.recurrence);
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
