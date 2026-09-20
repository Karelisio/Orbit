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

export const EVENT_CATEGORIES = ["rdv", "anniversaire", "sortie", "voyage", "autre"] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  rdv: "Rendez-vous",
  anniversaire: "Anniversaire",
  sortie: "Sortie",
  voyage: "Voyage",
  autre: "Autre",
};

export const EVENT_CATEGORY_COLORS: Record<EventCategory, string> = {
  rdv: "#6750a4",
  anniversaire: "#b3261e",
  sortie: "#386a20",
  voyage: "#0061a4",
  autre: "#79747e",
};

export const REMINDER_OPTIONS = [
  { minutes: 15, label: "15 min avant" },
  { minutes: 60, label: "1 h avant" },
  { minutes: 24 * 60, label: "1 jour avant" },
] as const;

export interface OrbitEvent {
  id: string;
  couple_id: string;
  title: string;
  description: string | null;
  location: string | null;
  category: EventCategory;
  color: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  reminder_minutes_before: number[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface OrbitTask {
  id: string;
  couple_id: string;
  title: string;
  notes: string | null;
  assigned_to: string | null;
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
