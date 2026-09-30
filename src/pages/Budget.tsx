import { useMemo, useState } from "react";
import { parseISO } from "date-fns";
import { useAuth } from "../context/AuthContext";
import { useCouple } from "../context/CoupleContext";
import { useExpenses } from "../hooks/useExpenses";
import ExpenseSheet from "../components/ExpenseSheet";
import { computeBalance, formatEuros } from "../lib/balances";
import { EXPENSE_CATEGORY_LABELS } from "../types";

export default function Budget() {
  const { user } = useAuth();
  const { partnerId } = useCouple();
  const { expenses, addExpense, deleteExpense } = useExpenses();
  const [showSheet, setShowSheet] = useState(false);

  const balance = useMemo(
    () => (user && partnerId ? computeBalance(expenses, user.id, partnerId) : null),
    [expenses, user, partnerId]
  );

  return (
    <div className="screen">
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Budget</h1>
        <button className="btn-icon" onClick={() => setShowSheet(true)} aria-label="Ajouter une dépense">
          ＋
        </button>
      </div>

      {balance && (
        <div className="card" style={{ marginBottom: 20, textAlign: "center" }}>
          <p className="section-title" style={{ margin: 0 }}>
            Total dépensé
          </p>
          <p style={{ fontSize: 32, fontWeight: 800, margin: "4px 0", color: "var(--md-sys-color-primary)" }}>
            {formatEuros(balance.total)}
          </p>
          {balance.settled ? (
            <p style={{ margin: 0, fontSize: 13, color: "var(--md-sys-color-on-surface-variant)" }}>Vous êtes à jour.</p>
          ) : balance.balance > 0 ? (
            <p style={{ margin: 0, fontSize: 13 }}>
              Tu dois <strong>{formatEuros(balance.balance)}</strong> à ton/ta partenaire
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: 13 }}>
              Ton/ta partenaire te doit <strong>{formatEuros(Math.abs(balance.balance))}</strong>
            </p>
          )}
        </div>
      )}

      {expenses.length === 0 ? (
        <p className="empty-state">Aucune dépense enregistrée.</p>
      ) : (
        <div className="list">
          {expenses.map((expense) => (
            <div key={expense.id} className="list-item">
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 600 }}>{expense.description}</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--md-sys-color-on-surface-variant)" }}>
                  {EXPENSE_CATEGORY_LABELS[expense.category as keyof typeof EXPENSE_CATEGORY_LABELS] ?? expense.category} ·{" "}
                  {expense.paid_by === user?.id ? "payé par moi" : "payé par partenaire"} ·{" "}
                  {parseISO(expense.spent_at).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <span style={{ fontWeight: 700 }}>{formatEuros(Number(expense.amount))}</span>
              <button
                className="btn-icon"
                onClick={() => {
                  if (window.confirm(`Supprimer la dépense « ${expense.description} » ?`)) deleteExpense(expense.id);
                }}
                aria-label="Supprimer"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}

      {showSheet && <ExpenseSheet onSave={(fields) => addExpense(fields)} onClose={() => setShowSheet(false)} />}
    </div>
  );
}
