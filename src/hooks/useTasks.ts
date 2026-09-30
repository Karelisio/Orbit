import { useAuth } from "../context/AuthContext";
import { useCouple } from "../context/CoupleContext";
import { supabase } from "../lib/supabase";
import { useRealtimeCollection } from "./useRealtimeCollection";
import { monthlyAnchorDay, nextDueDate } from "../lib/taskRecurrence";
import type { OrbitTask, TaskRecurrence } from "../types";

export type NewTask = {
  title: string;
  assignedTo: string | null;
  dueDate: string | null;
  recurrence: TaskRecurrence;
  recurrenceInterval: number;
};

/**
 * La colonne facultative orbit_tasks.recurrence_day (jour d'ancrage d'une
 * tâche mensuelle, voir lib/taskRecurrence.ts) n'est écrite que si elle
 * existe déjà en base, c'est-à-dire si les lignes lues la contiennent : tant
 * que la migration n'est pas passée, rien ne change pour les requêtes.
 */
function hasAnchorColumn(task: OrbitTask | undefined): boolean {
  return task !== undefined && "recurrence_day" in task;
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
  const { rows, loading, setRows, mutate } = useRealtimeCollection<OrbitTask>("orbit_tasks", couple?.id ?? null, sortTasks);

  // Ajout optimiste : sans ça, l'app (et le widget, qui réagit au même état
  // `tasks`) n'affichaient la nouvelle tâche qu'au retour de l'écho temps
  // réel Supabase, avec un délai réseau perceptible.
  async function addTask(fields: NewTask) {
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

  async function updateTask(id: string, fields: Partial<NewTask>) {
    const current = rows.find((t) => t.id === id);
    // Nouvelle échéance ou nouvelle récurrence : l'ancien jour d'ancrage ne
    // vaut plus, le prochain coche le reprendra de la nouvelle échéance.
    const resetAnchor =
      hasAnchorColumn(current) &&
      ((fields.dueDate !== undefined && fields.dueDate !== current?.due_date) ||
        (fields.recurrence !== undefined && fields.recurrence !== current?.recurrence));
    const { data, error } = await supabase
      .from("orbit_tasks")
      .update({
        ...(fields.title !== undefined && { title: fields.title }),
        ...(fields.assignedTo !== undefined && { assigned_to: fields.assignedTo }),
        ...(fields.dueDate !== undefined && { due_date: fields.dueDate }),
        ...(fields.recurrence !== undefined && { recurrence: fields.recurrence }),
        ...(fields.recurrenceInterval !== undefined && { recurrence_interval: fields.recurrenceInterval }),
        ...(resetAnchor && { recurrence_day: null }),
      })
      .eq("id", id)
      .select()
      .single();
    if (error) return { error: error.message };
    const updated = data as OrbitTask;
    setRows((prev) => prev.map((t) => (t.id === id ? updated : t)).sort(sortTasks));
    return { error: null };
  }

  // Une tâche récurrente ne se "termine" jamais : cocher fait juste avancer
  // son échéance à la prochaine occurrence, sans jamais passer par done=true.
  // Mise à jour optimiste, annulée avec un message si elle échoue (mutate).
  function toggleTask(task: OrbitTask) {
    if (task.recurrence !== "none") {
      const anchorDay =
        task.recurrence === "monthly" && task.due_date ? monthlyAnchorDay(task.due_date, task.recurrence_day) : undefined;
      const due = nextDueDate(task.due_date, task.recurrence, task.recurrence_interval, new Date(), anchorDay);
      // Jour d'ancrage gardé en base quand la colonne existe : sans lui, une
      // échéance ramenée au 28 février repartait du 28 au coche suivant.
      const patch =
        anchorDay !== undefined && hasAnchorColumn(task) ? { due_date: due, recurrence_day: anchorDay } : { due_date: due };
      return mutate(
        (prev) => prev.map((t) => (t.id === task.id ? { ...t, ...patch } : t)).sort(sortTasks),
        () => supabase.from("orbit_tasks").update(patch).eq("id", task.id),
        "Tâche non mise à jour : vérifie ta connexion."
      );
    }

    const done = !task.done;
    const doneAt = done ? new Date().toISOString() : null;
    return mutate(
      (prev) => prev.map((t) => (t.id === task.id ? { ...t, done, done_at: doneAt } : t)).sort(sortTasks),
      () => supabase.from("orbit_tasks").update({ done, done_at: doneAt }).eq("id", task.id),
      "Tâche non mise à jour : vérifie ta connexion."
    );
  }

  // Suppression optimiste : sans ça, la ligne restait affichée jusqu'à ce que
  // l'écho temps réel du DELETE revienne (ou un rechargement manuel).
  function deleteTask(id: string) {
    return mutate(
      (prev) => prev.filter((t) => t.id !== id),
      () => supabase.from("orbit_tasks").delete().eq("id", id),
      "Tâche non supprimée : vérifie ta connexion."
    );
  }

  return { tasks: rows, loading, addTask, updateTask, toggleTask, deleteTask };
}
