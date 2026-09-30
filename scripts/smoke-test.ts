import assert from "node:assert/strict";
import { addDays, addMonths, addYears, format } from "date-fns";
import { computeBalance } from "../src/lib/balances.ts";
import { computeCycleSummary, predictedPeriodDatesUntil } from "../src/lib/cyclePredictions.ts";
import { formatTogetherDuration, togetherDuration } from "../src/lib/togetherSince.ts";
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
/**
 * Règles de 4 jours à partir de chaque début. Date locale via format() :
 * toISOString() d'un minuit local donne la veille en France (UTC+1/+2).
 */
function periodDays(starts: string[]): { date: string; flow: string | null }[] {
  const result: { date: string; flow: string | null }[] = [];
  for (const start of starts) {
    for (let i = 0; i < 4; i++) {
      const d = new Date(start + "T00:00:00");
      d.setDate(d.getDate() + i);
      result.push({ date: format(d, "yyyy-MM-dd"), flow: "moyen" });
    }
  }
  return result;
}
// 3 cycles de 28 jours, règles de 4 jours
const days = periodDays(["2026-06-01", "2026-06-29", "2026-07-27"]);
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
check("un spotting en milieu de cycle ne décale pas la prochaine date", () => {
  const s = computeCycleSummary([...days, { date: "2026-08-10", flow: "spotting" }]);
  assert.equal(s.nextPeriodStart, "2026-08-24", "pas pris pour un début de règles (sinon 2026-09-07)");
  assert.equal(s.averageCycleLength, 28);
  assert.equal(s.averagePeriodLength, 4, "pas compté dans la durée des règles");
});
check("la médiane ignore un cycle aberrant", () => {
  // cycles de 28, 45 puis 28 jours : moyenne 34, médiane 28
  const s = computeCycleSummary(periodDays(["2026-06-01", "2026-06-29", "2026-08-13", "2026-09-10"]));
  assert.equal(s.averageCycleLength, 28);
  assert.equal(s.nextPeriodStart, "2026-10-08");
});

console.log("\ncompteur « Ensemble depuis »");
const together = (since: string, now: Date) => formatTogetherDuration(togetherDuration(since, now));
check("durées pleines, pas des changements d'année (le bug : « 1 an, 15 jours »)", () => {
  assert.equal(together("2025-12-15", new Date(2026, 8, 30, 15, 0)), "9 mois, 15 jours");
});
check("anniversaire pile : une année pleine", () => {
  assert.equal(together("2025-09-30", new Date(2026, 8, 30, 8, 0)), "1 an");
  assert.equal(together("2025-09-30", new Date(2026, 8, 29, 23, 59)), "11 mois, 30 jours");
});
check("premier jour : « 0 jour », 1 jour au total", () => {
  const d = togetherDuration("2026-09-30", new Date(2026, 8, 30, 0, 5));
  assert.equal(formatTogetherDuration(d), "0 jour");
  assert.equal(d.totalDays, 1);
});
check("jours au total, premier jour compris", () => {
  assert.equal(togetherDuration("2025-12-15", new Date(2026, 8, 30, 12, 0)).totalDays, 290);
});
check("fins de mois et 29 février", () => {
  assert.equal(together("2026-01-31", new Date(2026, 2, 1)), "1 mois, 1 jour");
  assert.equal(together("2024-02-29", new Date(2025, 1, 28)), "1 an");
  assert.equal(together("2023-06-10", new Date(2026, 8, 12)), "3 ans, 3 mois, 2 jours");
});
check("date future : rien de négatif", () => {
  assert.deepEqual(togetherDuration("2027-01-01", new Date(2026, 8, 30)), { years: 0, months: 0, days: 0, totalDays: 0 });
});
check("toujours cohérent : 0 ≤ mois < 12, jours ≥ 0, et on retombe sur aujourd'hui", () => {
  for (let s = 0; s < 800; s += 7) {
    const since = addDays(new Date(2023, 0, 1), s);
    const sinceStr = format(since, "yyyy-MM-dd");
    for (let n = 0; n < 1200; n += 13) {
      const now = addDays(since, n);
      const d = togetherDuration(sinceStr, now);
      assert.ok(d.months >= 0 && d.months < 12 && d.days >= 0, `${sinceStr} + ${n} j`);
      const rebuilt = addDays(addMonths(addYears(since, d.years), d.months), d.days);
      assert.equal(format(rebuilt, "yyyy-MM-dd"), format(now, "yyyy-MM-dd"), `${sinceStr} + ${n} j`);
    }
  }
});

console.log(`\n${passed} vérifications OK\n`);
