import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useCouple } from "../context/CoupleContext";
import { useExpenses } from "../hooks/useExpenses";
import ExpenseSheet from "../components/ExpenseSheet";
import { computeBalance } from "../lib/balances";
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
            {balance.total.toFixed(2)} €
          </p>
          {balance.balance === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: "var(--md-sys-color-on-surface-variant)" }}>Vous êtes à jour.</p>
          ) : balance.balance > 0 ? (
            <p style={{ margin: 0, fontSize: 13 }}>
              Tu dois <strong>{balance.balance.toFixed(2)} €</strong> à ton/ta partenaire
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: 13 }}>
              Ton/ta partenaire te doit <strong>{Math.abs(balance.balance).toFixed(2)} €</strong>
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
                  {new Date(expense.spent_at).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <span style={{ fontWeight: 700 }}>{expense.amount.toFixed(2)} €</span>
              <button className="btn-icon" onClick={() => deleteExpense(expense.id)} aria-label="Supprimer">
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
