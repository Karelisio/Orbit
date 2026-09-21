import assert from "node:assert/strict";
import { computeBalance } from "../src/lib/balances.ts";
import { computeCycleSummary, predictedPeriodDatesUntil } from "../src/lib/cyclePredictions.ts";
import { reminderLabel, nextEventOccurrence, eventOccursOnDay, taskRecurrenceLabel } from "../src/types/index.ts";

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed++;
  console.log("  ok  " + name);
}

const expense = (amount: number, paid_by: string) =>
  ({ id: Math.random().toString(), couple_id: "c", description: "x", amount, category: "autre", paid_by, spent_at: "2026-09-20", created_by: paid_by, created_at: "" }) as never;

console.log("\nbalances");
check("le/la partenaire a tout payé -> je lui dois la moitié", () => {
  const b = computeBalance([expense(100, "partner")], "me", "partner");
  assert.equal(b.total, 100);
  assert.equal(b.balance, 50); // positif = userA (moi) doit à userB (partenaire)
});
check("j'ai tout payé -> il/elle me doit la moitié", () => {
  const b = computeBalance([expense(80, "me")], "me", "partner");
  assert.equal(b.balance, -40);
});
check("à parts égales -> équilibré", () => {
  const b = computeBalance([expense(50, "me"), expense(50, "partner")], "me", "partner");
  assert.equal(b.balance, 0);
});

console.log("\nreminderLabel");
check("préréglages inchangés", () => {
  assert.equal(reminderLabel(15), "15 min avant");
  assert.equal(reminderLabel(24 * 60), "1 jour avant");
});
check("personnalisés lisibles (le bug : « 4320 min avant »)", () => {
  assert.equal(reminderLabel(3 * 24 * 60), "3 jours avant");
  assert.equal(reminderLabel(2 * 7 * 24 * 60), "2 semaines avant");
  assert.equal(reminderLabel(3 * 60), "3 h avant");
  assert.equal(reminderLabel(7), "7 min avant");
});

console.log("\névénements récurrents");
const birthday = { starts_at: "2019-09-08T09:00:00.000Z", recurrence: "yearly" } as never;
const oneOff = { starts_at: "2026-09-25T09:00:00.000Z", recurrence: "none" } as never;
check("un anniversaire passé pointe sur l'occurrence de cette année", () => {
  const next = nextEventOccurrence(birthday, new Date("2026-03-01T12:00:00"));
  assert.equal(next.getFullYear(), 2026);
  assert.equal(next.getMonth(), 8); // septembre
});
check("si l'occurrence de l'année est passée, on vise l'an prochain", () => {
  const next = nextEventOccurrence(birthday, new Date("2026-10-01T12:00:00"));
  assert.equal(next.getFullYear(), 2027);
});
check("un événement simple garde sa date", () => {
  assert.equal(nextEventOccurrence(oneOff, new Date("2026-01-01")).getTime(), new Date(oneOff.starts_at).getTime());
});
check("l'anniversaire tombe le bon jour, n'importe quelle année", () => {
  assert.equal(eventOccursOnDay(birthday, new Date(2030, 8, 8)), true);
  assert.equal(eventOccursOnDay(birthday, new Date(2030, 8, 9)), false);
});
check("un événement simple ne tombe que son année", () => {
  assert.equal(eventOccursOnDay(oneOff, new Date(2026, 8, 25)), true);
  assert.equal(eventOccursOnDay(oneOff, new Date(2027, 8, 25)), false);
});

console.log("\nrécurrence des tâches");
check("libellés", () => {
  assert.equal(taskRecurrenceLabel("none", 1), "Ne se répète pas");
  assert.equal(taskRecurrenceLabel("daily", 1), "Tous les jours");
  assert.equal(taskRecurrenceLabel("weekly", 2), "Toutes les 2 semaines");
  assert.equal(taskRecurrenceLabel("monthly", 3), "Tous les 3 mois");
});

console.log("\nprédiction des règles");
// 3 cycles de 28 jours, règles de 4 jours
const days: { date: string; flow: string | null }[] = [];
for (const start of ["2026-06-01", "2026-06-29", "2026-07-27"]) {
  for (let i = 0; i < 4; i++) {
    const d = new Date(start + "T00:00:00");
    d.setDate(d.getDate() + i);
    days.push({ date: d.toISOString().slice(0, 10), flow: "moyen" });
  }
}
check("longueurs moyennes déduites de l'historique", () => {
  const s = computeCycleSummary(days);
  assert.equal(s.averageCycleLength, 28);
  assert.equal(s.averagePeriodLength, 4);
  assert.equal(s.nextPeriodStart, "2026-08-24");
});
check("la projection couvre les mois suivants (le bug d'origine)", () => {
  const s = computeCycleSummary(days);
  const predicted = predictedPeriodDatesUntil(s.nextPeriodStart, s.averageCycleLength, s.averagePeriodLength, new Date("2026-11-30"));
  assert.ok(predicted.has("2026-08-24"), "cycle suivant");
  assert.ok(predicted.has("2026-09-21"), "mois d'après");
  assert.ok(predicted.has("2026-10-19"), "encore le mois d'après");
  assert.ok(predicted.has("2026-11-16"), "et le suivant");
  assert.equal(predicted.has("2026-08-28"), false, "s'arrête après la durée des règles");
});
check("aucune prédiction sans historique", () => {
  const s = computeCycleSummary([]);
  assert.equal(s.nextPeriodStart, null);
  assert.equal(predictedPeriodDatesUntil(s.nextPeriodStart, 28, 5, new Date("2027-01-01")).size, 0);
});
check("pas de boucle infinie sur une plage très lointaine", () => {
  const s = computeCycleSummary(days);
  const predicted = predictedPeriodDatesUntil(s.nextPeriodStart, s.averageCycleLength, s.averagePeriodLength, new Date("2200-01-01"));
  assert.ok(predicted.size <= 24 * s.averagePeriodLength, "garde-fou des 24 cycles respecté");
});

console.log(`\n${passed} vérifications OK\n`);
