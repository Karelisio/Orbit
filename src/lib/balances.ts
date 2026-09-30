import type { OrbitExpense } from "../types";

/**
 * Montant en centimes entiers. Les soldes se calculaient en euros flottants :
 * 10,10 + 20,20 d'un côté contre 30,30 de l'autre laissait ~1,8e-15 d'écart,
 * d'où « Tu dois 0.00 € » au lieu de « Vous êtes à jour ».
 */
export function toCents(amount: number | string): number {
  return Math.round(Number(amount) * 100);
}

const EURO_FORMAT = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

/** « 1 234,50 € » (format français, virgule décimale). */
export function formatEuros(amount: number): string {
  return EURO_FORMAT.format(amount);
}

export interface ExpenseBalance {
  totalsByPayer: Record<string, number>;
  total: number;
  /**
   * Ce que userA doit à userB, en euros. Positif : userA (celui qui regarde)
   * doit cette somme à userB. Négatif : userB lui doit. Peut tomber sur un
   * demi-centime (moitié d'un écart impair).
   */
  balance: number;
  /** Écart de moins d'un centime : « Vous êtes à jour ». */
  settled: boolean;
}

/**
 * Partage à parts égales entre les deux membres du couple : celui qui a
 * le moins payé doit la moitié de la différence à l'autre. Tout est additionné
 * en centimes entiers, converti en euros seulement à la fin.
 */
export function computeBalance(expenses: OrbitExpense[], userAId: string, userBId: string): ExpenseBalance {
  const centsByPayer: Record<string, number> = { [userAId]: 0, [userBId]: 0 };
  let totalCents = 0;

  for (const expense of expenses) {
    const cents = toCents(expense.amount);
    totalCents += cents;
    if (expense.paid_by in centsByPayer) {
      centsByPayer[expense.paid_by] += cents;
    }
  }

  const balanceCents = (centsByPayer[userBId] - centsByPayer[userAId]) / 2;

  return {
    totalsByPayer: { [userAId]: centsByPayer[userAId] / 100, [userBId]: centsByPayer[userBId] / 100 },
    total: totalCents / 100,
    balance: balanceCents / 100,
    settled: Math.abs(balanceCents) < 1,
  };
}

export function sumByCategory(expenses: OrbitExpense[]): Record<string, number> {
  const cents: Record<string, number> = {};
  for (const expense of expenses) {
    cents[expense.category] = (cents[expense.category] ?? 0) + toCents(expense.amount);
  }
  return Object.fromEntries(Object.entries(cents).map(([category, value]) => [category, value / 100]));
}
