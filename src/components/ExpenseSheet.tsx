import { useState } from "react";
import { format } from "date-fns";
import { useAuth } from "../context/AuthContext";
import { useCouple } from "../context/CoupleContext";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS, type ExpenseCategory } from "../types";
import type { NewExpense } from "../hooks/useExpenses";

interface ExpenseSheetProps {
  onSave: (fields: NewExpense) => Promise<{ error: string | null }>;
  onClose: () => void;
}

export default function ExpenseSheet({ onSave, onClose }: ExpenseSheetProps) {
  const { user } = useAuth();
  const { partnerId } = useCouple();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("autre");
  const [paidBy, setPaidBy] = useState(user?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const parsedAmount = Number(amount.replace(",", "."));
    if (!description.trim() || !parsedAmount || parsedAmount <= 0) {
      setError("Description et montant valides sont obligatoires");
      return;
    }
    setSaving(true);
    setError(null);
    const { error } = await onSave({
      description: description.trim(),
      amount: parsedAmount,
      category,
      paid_by: paidBy,
      // Date locale, pas UTC : entre minuit et 2h du matin en France,
      // toISOString() renvoyait encore la veille.
      spent_at: format(new Date(), "yyyy-MM-dd"),
    });
    setSaving(false);
    if (error) setError(error);
    else onClose();
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h2 style={{ marginTop: 0 }}>Nouvelle dépense</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input className="input" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <input
            className="input"
            placeholder="Montant (€)"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          <p className="section-title" style={{ margin: "4px 0 0" }}>
            Catégorie
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {EXPENSE_CATEGORIES.map((c) => (
              <button key={c} type="button" className={`chip${category === c ? " selected" : ""}`} onClick={() => setCategory(c)}>
                {EXPENSE_CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>

          <p className="section-title" style={{ margin: "4px 0 0" }}>
            Payé par
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className={`chip${paidBy === user?.id ? " selected" : ""}`} onClick={() => setPaidBy(user!.id)}>
              Moi
            </button>
            {partnerId && (
              <button type="button" className={`chip${paidBy === partnerId ? " selected" : ""}`} onClick={() => setPaidBy(partnerId)}>
                Mon/ma partenaire
              </button>
            )}
          </div>

          {error && <p style={{ color: "var(--md-sys-color-error)", fontSize: 13, margin: 0 }}>{error}</p>}

          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Enregistrement..." : "Ajouter"}
          </button>
          <button className="btn btn-text" onClick={onClose}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
