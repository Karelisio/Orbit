import type { OrbitExpense } from "../types";

export interface ExpenseBalance {
  totalsByPayer: Record<string, number>;
  total: number;
  /**
   * Ce que userA doit à userB. Positif : userA (celui qui regarde) doit
   * cette somme à userB. Négatif : userB lui doit. Nul si équilibré.
   */
  balance: number;
}

/**
 * Partage à parts égales entre les deux membres du couple : celui qui a
 * le moins payé doit la moitié de la différence à l'autre.
 */
export function computeBalance(expenses: OrbitExpense[], userAId: string, userBId: string): ExpenseBalance {
  const totalsByPayer: Record<string, number> = { [userAId]: 0, [userBId]: 0 };
  let total = 0;

  for (const expense of expenses) {
    total += expense.amount;
    if (expense.paid_by in totalsByPayer) {
      totalsByPayer[expense.paid_by] += expense.amount;
    }
  }

  const balance = (totalsByPayer[userBId] - totalsByPayer[userAId]) / 2;

  return { totalsByPayer, total, balance };
}

export function sumByCategory(expenses: OrbitExpense[]): Record<string, number> {
  const sums: Record<string, number> = {};
  for (const expense of expenses) {
    sums[expense.category] = (sums[expense.category] ?? 0) + expense.amount;
  }
  return sums;
}
