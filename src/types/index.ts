export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  theme_image_url: string | null;
  theme_seed_color: string | null;
  created_at: string;
  updated_at: string;
}

export interface Couple {
  id: string;
  owner_id: string;
  partner_id: string | null;
  invite_code: string;
  name: string;
  together_since: string | null;
  created_at: string;
}

/** Catégories par défaut, semées pour chaque nouveau couple (voir useEventCategories.ts). */
export const DEFAULT_EVENT_CATEGORIES: { name: string; color: string }[] = [
  { name: "Rendez-vous", color: "#6750a4" },
  { name: "Anniversaire", color: "#b3261e" },
  { name: "Sortie", color: "#386a20" },
  { name: "Voyage", color: "#0061a4" },
  { name: "Autre", color: "#79747e" },
];

/** Palette proposée pour choisir la couleur d'une nouvelle catégorie. */
export const EVENT_CATEGORY_COLOR_PALETTE = [
  "#6750a4",
  "#b3261e",
  "#386a20",
  "#0061a4",
  "#7d5260",
  "#e07000",
  "#006874",
  "#79747e",
];

export interface OrbitEventCategory {
  id: string;
  couple_id: string;
  name: string;
  color: string;
  created_at: string;
}

export const REMINDER_OPTIONS = [
  { minutes: 5, label: "5 min avant" },
  { minutes: 15, label: "15 min avant" },
  { minutes: 30, label: "30 min avant" },
  { minutes: 60, label: "1 h avant" },
  { minutes: 120, label: "2 h avant" },
  { minutes: 24 * 60, label: "1 jour avant" },
  { minutes: 2 * 24 * 60, label: "2 jours avant" },
  { minutes: 7 * 24 * 60, label: "1 semaine avant" },
] as const;

export const REMINDER_UNIT_OPTIONS = [
  { unit: "minutes", label: "minutes", toMinutes: (n: number) => n },
  { unit: "heures", label: "heures", toMinutes: (n: number) => n * 60 },
  { unit: "jours", label: "jours", toMinutes: (n: number) => n * 24 * 60 },
] as const;

export interface OrbitEvent {
  id: string;
  couple_id: string;
  title: string;
  description: string | null;
  location: string | null;
  category: string;
  color: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  reminder_minutes_before: number[];
  assigned_to: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const TASK_RECURRENCE_OPTIONS = ["none", "daily", "weekly", "monthly"] as const;
export type TaskRecurrence = (typeof TASK_RECURRENCE_OPTIONS)[number];

export const TASK_RECURRENCE_UNIT_LABELS: Record<TaskRecurrence, string> = {
  none: "Ne se répète pas",
  daily: "Jour(s)",
  weekly: "Semaine(s)",
  monthly: "Mois",
};

/** Libellé complet ex. "Tous les 2 jours" / "Toutes les 3 semaines" / "Tous les mois". */
export function taskRecurrenceLabel(recurrence: TaskRecurrence, interval: number): string {
  if (recurrence === "daily") return interval <= 1 ? "Tous les jours" : `Tous les ${interval} jours`;
  if (recurrence === "weekly") return interval <= 1 ? "Toutes les semaines" : `Toutes les ${interval} semaines`;
  if (recurrence === "monthly") return interval <= 1 ? "Tous les mois" : `Tous les ${interval} mois`;
  return "Ne se répète pas";
}

export interface OrbitTask {
  id: string;
  couple_id: string;
  title: string;
  notes: string | null;
  assigned_to: string | null;
  due_date: string | null;
  recurrence: TaskRecurrence;
  recurrence_interval: number;
  done: boolean;
  done_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface OrbitJournalEntry {
  id: string;
  couple_id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export const EXPENSE_CATEGORIES = ["courses", "logement", "sorties", "voyage", "cadeaux", "autre"] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  courses: "Courses",
  logement: "Logement",
  sorties: "Sorties",
  voyage: "Voyage",
  cadeaux: "Cadeaux",
  autre: "Autre",
};

export interface OrbitExpense {
  id: string;
  couple_id: string;
  description: string;
  amount: number;
  category: ExpenseCategory | string;
  paid_by: string;
  spent_at: string;
  created_by: string;
  created_at: string;
}

export type CyclePhase = "regles" | "fertile" | "ovulation" | "normal" | "inconnu";

export interface CycleStatus {
  available: boolean;
  phase: CyclePhase;
  daysUntilNextPeriod: number | null;
  nextPeriodStart: string | null;
}
