import { useAuth } from "../context/AuthContext";
import { useCouple } from "../context/CoupleContext";
import { supabase } from "../lib/supabase";
import { useRealtimeCollection } from "./useRealtimeCollection";
import type { OrbitExpense } from "../types";

export type NewExpense = Pick<OrbitExpense, "description" | "amount" | "category" | "paid_by" | "spent_at">;

function sortExpenses(a: OrbitExpense, b: OrbitExpense): number {
  return b.spent_at.localeCompare(a.spent_at) || b.created_at.localeCompare(a.created_at);
}

export function useExpenses() {
  const { user } = useAuth();
  const { couple } = useCouple();
  const { rows, loading, setRows } = useRealtimeCollection<OrbitExpense>("orbit_expenses", couple?.id ?? null, sortExpenses);

  // Ajout optimiste : sans ça, l'app n'affichait la nouvelle dépense qu'au
  // retour de l'écho temps réel Supabase, avec un délai réseau perceptible.
  async function addExpense(fields: NewExpense) {
    if (!couple || !user) return { error: "Aucun couple lié" };
    const { data, error } = await supabase
      .from("orbit_expenses")
      .insert({ ...fields, couple_id: couple.id, created_by: user.id })
      .select()
      .single();
    if (error) return { error: error.message };
    const created = data as OrbitExpense;
    setRows((prev) => (prev.some((e) => e.id === created.id) ? prev : [...prev, created].sort(sortExpenses)));
    return { error: null };
  }

  async function deleteExpense(id: string) {
    setRows((prev) => prev.filter((e) => e.id !== id));
    const { error } = await supabase.from("orbit_expenses").delete().eq("id", id);
    return { error: error?.message ?? null };
  }

  return { expenses: rows, loading, addExpense, deleteExpense };
}
