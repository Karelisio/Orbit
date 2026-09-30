import assert from "node:assert/strict";
import { addDays, addMonths, addYears, format } from "date-fns";
import { computeBalance, formatEuros, toCents } from "../src/lib/balances.ts";
import { computeCycleStatus, computeCycleSummary, predictedPeriodDatesUntil } from "../src/lib/cyclePredictions.ts";
import { parseDateParam } from "../src/lib/localDate.ts";
import { revertOptimistic } from "../src/lib/optimistic.ts";
import { monthlyAnchorDay, nextDueDate } from "../src/lib/taskRecurrence.ts";
import { fetchAllRows } from "../src/lib/paging.ts";
import { formatTogetherDuration, togetherDuration } from "../src/lib/togetherSince.ts";
import { eventTimeLabel, journalTimeLabel } from "../src/lib/widgetLabels.ts";
import {
  reminderLabel,
  nextEventOccurrence,
  nextEventStart,
  eventOccursOnDay,
  isOccurrenceUpcoming,
  taskRecurrenceLabel,
} from "../src/types/index.ts";

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed++;
  console.log("  ok  " + name);
}
async function checkAsync(name: string, fn: () => Promise<void>) {
  await fn();
  passed++;
  console.log("  ok  " + name);
}

// Dates construites en heure locale : les vérifications doivent passer quel
// que soit le fuseau (TZ=Europe/Paris, TZ=America/Montreal...).
const local = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min);
const iso = (y: number, m: number, d: number, h = 9, min = 0) => local(y, m, d, h, min).toISOString();

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
  assert.equal(b.settled, true);
});
check("centimes exacts (le bug : 10,10 + 20,20 contre 30,30 -> « Tu dois 0.00 € »)", () => {
  const b = computeBalance([expense(10.1, "me"), expense(20.2, "me"), expense(30.3, "partner")], "me", "partner");
  assert.equal(b.balance, 0);
  assert.equal(b.settled, true);
  assert.equal(b.total, 60.6);
  assert.equal(0.1 + 0.2 === 0.3, false, "rappel : les flottants ne tombent pas juste");
});
check("moins d'un centime d'écart : à jour ; au-delà : le montant exact", () => {
  assert.equal(computeBalance([expense(0.01, "partner")], "me", "partner").settled, true);
  const b = computeBalance([expense(0.03, "partner")], "me", "partner");
  assert.equal(b.settled, false);
  assert.equal(b.balance, 0.015);
  const c = computeBalance([expense(19.99, "partner"), expense(5.01, "me")], "me", "partner");
  assert.equal(c.balance, 7.49);
});
check("montants en centimes et format français", () => {
  assert.equal(toCents(10.1), 1010);
  assert.equal(toCents("12.34"), 1234);
  const space = (text: string) => text.replace(/\s/g, " ");
  assert.equal(space(formatEuros(1234.5)), "1 234,50 €");
  assert.equal(space(formatEuros(0.5)), "0,50 €");
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
const birthday = { starts_at: iso(2019, 9, 8), recurrence: "yearly" } as never;
const oneOff = { starts_at: iso(2026, 9, 25), recurrence: "none" } as never;
check("un anniversaire passé pointe sur l'occurrence de cette année", () => {
  const next = nextEventOccurrence(birthday, local(2026, 3, 1, 12));
  assert.equal(next.getFullYear(), 2026);
  assert.equal(next.getMonth(), 8); // septembre
});
check("si l'occurrence de l'année est passée, on vise l'an prochain", () => {
  const next = nextEventOccurrence(birthday, local(2026, 10, 1, 12));
  assert.equal(next.getFullYear(), 2027);
});
check("un événement simple garde sa date", () => {
  assert.equal(nextEventOccurrence(oneOff, local(2026, 1, 1)).getTime(), new Date(oneOff.starts_at).getTime());
});
check("l'anniversaire tombe le bon jour, n'importe quelle année", () => {
  assert.equal(eventOccursOnDay(birthday, new Date(2030, 8, 8)), true);
  assert.equal(eventOccursOnDay(birthday, new Date(2030, 8, 9)), false);
});
check("un événement simple ne tombe que son année", () => {
  assert.equal(eventOccursOnDay(oneOff, new Date(2026, 8, 25)), true);
  assert.equal(eventOccursOnDay(oneOff, new Date(2027, 8, 25)), false);
});

console.log("\njournées entières, anniversaires, 29 février (heure locale)");
const allDayToday = { starts_at: iso(2026, 9, 30), recurrence: "none", all_day: true } as never;
const birthdayAllDay = { starts_at: iso(1990, 9, 30), recurrence: "yearly", all_day: true } as never;
const dentist = { starts_at: iso(2026, 9, 30, 9, 0), recurrence: "none", all_day: false } as never;
check("une journée entière reste « à venir » jusqu'au soir (le bug : disparue dès 9 h)", () => {
  const at15h = local(2026, 9, 30, 15);
  assert.equal(isOccurrenceUpcoming(allDayToday, nextEventOccurrence(allDayToday, at15h), at15h), true);
  const at2359 = local(2026, 9, 30, 23, 59);
  assert.equal(isOccurrenceUpcoming(allDayToday, nextEventOccurrence(allDayToday, at2359), at2359), true);
  const tomorrow = local(2026, 10, 1, 0, 1);
  assert.equal(isOccurrenceUpcoming(allDayToday, nextEventOccurrence(allDayToday, tomorrow), tomorrow), false);
});
check("un événement horaire n'est plus « à venir » une fois commencé (inchangé)", () => {
  const at10h = local(2026, 9, 30, 10);
  assert.equal(isOccurrenceUpcoming(dentist, nextEventOccurrence(dentist, at10h), at10h), false);
  const at8h = local(2026, 9, 30, 8);
  assert.equal(isOccurrenceUpcoming(dentist, nextEventOccurrence(dentist, at8h), at8h), true);
});
check("anniversaire (journée entière) : aujourd'hui toute la journée, pas « dans 365 j »", () => {
  const next = nextEventOccurrence(birthdayAllDay, local(2026, 9, 30, 15));
  assert.equal(format(next, "yyyy-MM-dd"), "2026-09-30");
  assert.equal(format(nextEventOccurrence(birthdayAllDay, local(2026, 10, 1, 0, 1)), "yyyy-MM-dd"), "2027-09-30");
});
check("rappels : visent l'occurrence pas encore commencée (sémantique inchangée)", () => {
  assert.equal(format(nextEventStart(birthdayAllDay, local(2026, 9, 30, 8)), "yyyy-MM-dd HH:mm"), "2026-09-30 09:00");
  assert.equal(format(nextEventStart(birthdayAllDay, local(2026, 9, 30, 15)), "yyyy-MM-dd HH:mm"), "2027-09-30 09:00");
  assert.equal(nextEventStart(dentist, local(2026, 9, 30, 15)).getTime(), new Date(iso(2026, 9, 30, 9, 0)).getTime());
});
check("29 février : le 28 les années non bissextiles, partout pareil", () => {
  const leapBirthday = { starts_at: iso(2024, 2, 29), recurrence: "yearly", all_day: true } as never;
  assert.equal(format(nextEventOccurrence(leapBirthday, local(2027, 1, 10)), "yyyy-MM-dd"), "2027-02-28");
  assert.equal(format(nextEventStart(leapBirthday, local(2027, 1, 10)), "yyyy-MM-dd"), "2027-02-28");
  assert.equal(eventOccursOnDay(leapBirthday, local(2027, 2, 28)), true);
  assert.equal(eventOccursOnDay(leapBirthday, local(2027, 3, 1)), false);
  assert.equal(eventOccursOnDay(leapBirthday, local(2028, 2, 29)), true);
  assert.equal(eventOccursOnDay(leapBirthday, local(2028, 2, 28)), false);
  assert.equal(format(nextEventOccurrence(leapBirthday, local(2027, 3, 1)), "yyyy-MM-dd"), "2028-02-29");
});
check("jamais d'occurrence annuelle avant la date d'origine", () => {
  const future = { starts_at: iso(2027, 3, 10), recurrence: "yearly", all_day: false } as never;
  assert.equal(format(nextEventOccurrence(future, local(2026, 1, 1)), "yyyy-MM-dd"), "2027-03-10");
  assert.equal(format(nextEventStart(future, local(2026, 9, 30)), "yyyy-MM-dd"), "2027-03-10");
  assert.equal(eventOccursOnDay(future, local(2026, 3, 10)), false);
  assert.equal(eventOccursOnDay(future, local(2027, 3, 10)), true);
  assert.equal(eventOccursOnDay(future, local(2029, 3, 10)), true);
});
check("un anniversaire garde son heure locale d'une année sur l'autre (changement d'heure)", () => {
  const winter = { starts_at: iso(2020, 1, 15, 9, 30), recurrence: "yearly", all_day: false } as never;
  assert.equal(format(nextEventOccurrence(winter, local(2026, 7, 1)), "yyyy-MM-dd HH:mm"), "2027-01-15 09:30");
});

console.log("\nlibellés relatifs des widgets (référence de OrbitWidgetLabels.java)");
check("prochain événement : aujourd'hui, demain, dans N j, date", () => {
  const now = local(2026, 9, 29, 11, 0); // mardi 11:00
  assert.equal(eventTimeLabel(local(2026, 9, 29, 18, 30), false, now), "Aujourd'hui à 18:30");
  assert.equal(eventTimeLabel(local(2026, 9, 30, 10, 0), false, now), "Demain à 10:00");
  assert.equal(eventTimeLabel(local(2026, 9, 30, 9, 0), true, now), "Demain");
  assert.equal(eventTimeLabel(local(2026, 10, 2, 9, 0), true, now), "Dans 3 j");
  assert.equal(eventTimeLabel(local(2026, 10, 12, 20, 15), false, now), "12 oct. à 20:15");
});
check("le libellé suit l'heure qu'il est (le bug : « Demain à 10:00 » figé le lendemain)", () => {
  const dentist = local(2026, 9, 30, 10, 0);
  assert.equal(eventTimeLabel(dentist, false, local(2026, 9, 29, 11, 0)), "Demain à 10:00");
  assert.equal(eventTimeLabel(dentist, false, local(2026, 9, 30, 8, 0)), "Aujourd'hui à 10:00");
});
check("dernière note : aujourd'hui, hier, il y a N j, date (mois en français)", () => {
  const now = local(2026, 9, 30, 9, 0);
  assert.equal(journalTimeLabel(local(2026, 9, 30, 0, 5), now), "Aujourd'hui");
  assert.equal(journalTimeLabel(local(2026, 9, 29, 23, 50), now), "Hier");
  assert.equal(journalTimeLabel(local(2026, 9, 26, 12, 0), now), "Il y a 4 j");
  assert.equal(journalTimeLabel(local(2026, 2, 5, 12, 0), now), "5 févr.");
});

console.log("\nrécurrence des tâches");
check("libellés", () => {
  assert.equal(taskRecurrenceLabel("none", 1), "Ne se répète pas");
  assert.equal(taskRecurrenceLabel("daily", 1), "Tous les jours");
  assert.equal(taskRecurrenceLabel("weekly", 2), "Toutes les 2 semaines");
  assert.equal(taskRecurrenceLabel("monthly", 3), "Tous les 3 mois");
});
check("échéance lue en date locale (le bug : new Date() à minuit UTC)", () => {
  assert.equal(nextDueDate("2026-03-01", "monthly", 1, local(2026, 3, 1, 9)), "2026-04-01");
  assert.equal(nextDueDate("2026-09-30", "daily", 1, local(2026, 9, 30, 23, 30)), "2026-10-01");
});
check("cochée à l'heure : un intervalle plus loin", () => {
  assert.equal(nextDueDate("2026-09-30", "weekly", 1, local(2026, 9, 30, 9)), "2026-10-07");
  assert.equal(nextDueDate("2026-09-30", "weekly", 2, local(2026, 9, 30, 9)), "2026-10-14");
  assert.equal(nextDueDate("2026-10-05", "daily", 1, local(2026, 9, 30, 9)), "2026-10-06", "cochée en avance");
  assert.equal(nextDueDate(null, "weekly", 1, local(2026, 9, 30, 9)), "2026-10-07", "sans échéance");
});
check("en retard : avance jusqu'à aujourd'hui au moins, pas d'un seul intervalle", () => {
  assert.equal(nextDueDate("2026-09-01", "weekly", 1, local(2026, 9, 30, 9)), "2026-10-06");
  assert.equal(nextDueDate("2026-09-28", "daily", 1, local(2026, 9, 30, 9)), "2026-09-30");
  assert.equal(nextDueDate("2026-06-15", "monthly", 1, local(2026, 9, 30, 9)), "2026-10-15");
});
check("mensuelle : le jour d'ancrage tient (le bug : 31/01 -> 28/02 -> 28/03)", () => {
  assert.equal(nextDueDate("2026-01-31", "monthly", 1, local(2026, 1, 31, 9)), "2026-02-28");
  assert.equal(nextDueDate("2026-01-31", "monthly", 1, local(2026, 3, 15, 9)), "2026-03-31", "rattrapage en une fois");
  const anchor = monthlyAnchorDay("2026-02-28", 31);
  assert.equal(anchor, 31);
  assert.equal(nextDueDate("2026-02-28", "monthly", 1, local(2026, 2, 28, 9), anchor), "2026-03-31");
  assert.equal(nextDueDate("2026-03-31", "monthly", 1, local(2026, 3, 31, 9), monthlyAnchorDay("2026-03-31", 31)), "2026-04-30");
  assert.equal(nextDueDate("2026-01-31", "monthly", 2, local(2026, 1, 31, 9)), "2026-03-31");
});
check("jour d'ancrage : repli sûr sans colonne, ancre périmée ignorée", () => {
  assert.equal(monthlyAnchorDay("2026-02-28", null), 28, "sans la colonne : le jour de l'échéance");
  assert.equal(monthlyAnchorDay("2026-02-28", 28), 28, "vraie tâche du 28");
  assert.equal(monthlyAnchorDay("2026-06-15", 31), 15, "échéance changée depuis : ancre ignorée");
  assert.equal(monthlyAnchorDay("2026-06-30", 31), 31, "30 juin = fin de mois, ancre 31 conservée");
  assert.equal(monthlyAnchorDay("2028-02-29", 30), 30);
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

console.log("\nphase du cycle (widget de l'accueil)");
// Même historique : règles de 4 jours les 1/6, 29/6 et 27/7, prochaines prévues le 24/8.
const status = (today: Date, extra: { date: string; flow: string | null }[] = []) => computeCycleStatus([...days, ...extra], today);
check("pendant de vraies règles : « règles en cours » (le bug : « prochaines règles dans 26 j »)", () => {
  const s = status(new Date(2026, 6, 28, 18, 0));
  assert.equal(s.phase, "regles");
  assert.equal(s.currentCycleDay, 2);
  assert.equal(s.daysUntilNextPeriod, 27);
});
check("3 jours après la date prévue sans rien de saisi : « en retard », pas « règles en cours »", () => {
  const s = status(new Date(2026, 7, 27, 9, 0));
  assert.equal(s.phase, "retard");
  assert.equal(s.daysUntilNextPeriod, -3);
});
check("le jour prévu lui-même : pas encore en retard", () => {
  const s = status(new Date(2026, 7, 24, 7, 0));
  assert.equal(s.phase, "normal");
  assert.equal(s.daysUntilNextPeriod, 0);
});
check("les nouvelles règles saisies mettent fin au retard", () => {
  const s = status(new Date(2026, 7, 27, 9, 0), [{ date: "2026-08-27", flow: "abondant" }]);
  assert.equal(s.phase, "regles");
  assert.equal(s.currentCycleDay, 1);
  assert.equal(s.nextPeriodStart, "2026-09-24");
});
check("un vrai flux saisi aujourd'hui compte, même au-delà de la durée moyenne", () => {
  const s = status(new Date(2026, 6, 31, 12, 0), [{ date: "2026-07-31", flow: "leger" }]);
  assert.equal(s.currentCycleDay, 5);
  assert.equal(s.phase, "regles");
});
check("un spotting du jour n'est pas « règles en cours »", () => {
  assert.equal(status(new Date(2026, 7, 15, 12, 0), [{ date: "2026-08-15", flow: "spotting" }]).phase, "normal");
});
check("ovulation et période fertile inchangées", () => {
  assert.equal(status(new Date(2026, 7, 10, 12, 0)).phase, "ovulation");
  assert.equal(status(new Date(2026, 7, 7, 12, 0)).phase, "fertile");
  assert.equal(status(new Date(2026, 7, 3, 12, 0)).phase, "normal");
});
check("sans historique : widget masqué", () => {
  assert.equal(computeCycleStatus([], new Date(2026, 7, 3)).available, false);
  assert.equal(computeCycleStatus([{ date: "2026-08-01", flow: "spotting" }], new Date(2026, 7, 3)).available, false);
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

console.log("\nlien io.karelisio.orbit://calendar?date=...");
check("date valide acceptée telle quelle", () => {
  assert.equal(parseDateParam("2026-09-30"), "2026-09-30");
  assert.equal(parseDateParam("2028-02-29"), "2028-02-29");
});
check("date invalide ignorée (le bug : RangeError, écran d'erreur)", () => {
  for (const bad of ["2026-02-30", "2027-02-29", "2026-13-01", "2026-9-30", "abc", "", " 2026-09-30", "2026-09-30T10:00", null, undefined]) {
    assert.equal(parseDateParam(bad as string | null | undefined), null, String(bad));
  }
});

console.log("\nlecture paginée (plafond de 1000 lignes de PostgREST)");
function fakeTable(total: number, failAtFrom = -1) {
  const calls: [number, number][] = [];
  const build = (from: number, to: number) => {
    calls.push([from, to]);
    if (from === failAtFrom) return Promise.resolve({ data: null, error: { message: "Failed to fetch" } });
    const rows = Array.from({ length: Math.max(0, Math.min(to, total - 1) - from + 1) }, (_, i) => ({ id: String(from + i) }));
    return Promise.resolve({ data: rows, error: null });
  };
  return { calls, build };
}
await checkAsync("2500 lignes : trois pages, rien ne manque", async () => {
  const t = fakeTable(2500);
  const { data, error } = await fetchAllRows(t.build);
  assert.equal(error, null);
  assert.equal(data?.length, 2500);
  assert.deepEqual(t.calls, [[0, 999], [1000, 1999], [2000, 2999]]);
});
await checkAsync("pile 1000 lignes : une page vide confirme la fin", async () => {
  const t = fakeTable(1000);
  assert.equal((await fetchAllRows(t.build)).data?.length, 1000);
  assert.equal(t.calls.length, 2);
});
await checkAsync("une erreur réseau en cours de route est remontée telle quelle", async () => {
  const t = fakeTable(2500, 1000);
  const { data, error } = await fetchAllRows(t.build);
  assert.equal(data, null);
  assert.deepEqual(error, { message: "Failed to fetch" });
});

console.log("\nécriture optimiste annulée en cas d'échec");
check("suppression qui échoue : la ligne revient", () => {
  const a = { id: "a", v: 1 }, b = { id: "b", v: 1 };
  const before = [a, b];
  const after = before.filter((r) => r.id !== "a");
  assert.deepEqual(revertOptimistic(after, before, after)?.map((r) => r.id).sort(), ["a", "b"]);
});
check("tâche cochée qui échoue : l'ancienne version revient", () => {
  const t = { id: "t", done: false };
  const before = [t];
  const after = [{ ...t, done: true }];
  assert.deepEqual(revertOptimistic(after, before, after), [t]);
});
check("un écho plus récent entre-temps n'est pas écrasé, les autres lignes non plus", () => {
  const t = { id: "t", done: false }, u = { id: "u", done: false };
  const before = [t, u];
  const after = [{ ...t, done: true }, u];
  const newer = { id: "t", done: true, title: "renommée par l'autre" };
  const fresh = { id: "v", done: false };
  const current = [newer, u, fresh];
  assert.equal(revertOptimistic(current, before, after), null);
});
check("ligne supprimée puis déjà revenue par un rechargement : pas de doublon", () => {
  const a = { id: "a" };
  const reloaded = { id: "a" };
  assert.equal(revertOptimistic([reloaded], [a], []), null);
});
check("ajout optimiste qui échoue : retiré", () => {
  const a = { id: "a" }, tmp = { id: "tmp" };
  assert.deepEqual(revertOptimistic([a, tmp], [a], [a, tmp]), [a]);
});

console.log(`\n${passed} vérifications OK\n`);
