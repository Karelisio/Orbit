import { useEffect } from "react";
import { differenceInCalendarDays, eachDayOfInterval, format } from "date-fns";
import { useAuth } from "../context/AuthContext";
import { useEvents } from "../hooks/useEvents";
import { useTasks } from "../hooks/useTasks";
import { useJournal } from "../hooks/useJournal";
import { useCouple } from "../context/CoupleContext";
import { useCyclePeriodDays } from "../hooks/useCyclePeriodDays";
import { usePreferences, type WidgetFontScale } from "../context/PreferencesContext";
import { useThemeMode } from "../context/ThemeModeContext";
import { syncWidgets } from "../lib/widgetSync";
import { eventDisplayColor, eventOccursOnDay, nextEventOccurrence } from "../types";

/**
 * Facteur manuel (Réglages > Widgets), composé avec l'ajustement automatique
 * à la hauteur réelle de la tuile (OrbitWidgetTheme.heightScale()) plutôt que
 * de le remplacer : un lanceur peut accorder une hauteur bien plus généreuse
 * qu'un autre pour "la même" tuile, et aucun calcul automatique ne convient
 * à tout le monde.
 */
const WIDGET_FONT_SCALE_FACTORS: Record<WidgetFontScale, number> = {
  petite: 0.75,
  normale: 1,
  grande: 1.25,
};

function eventTimeLabel(startsAt: string, allDay: boolean): string {
  const date = new Date(startsAt);
  const days = differenceInCalendarDays(date, new Date());
  const time = allDay ? "" : ` à ${format(date, "HH:mm")}`;
  if (days <= 0) return `Aujourd'hui${time}`;
  if (days === 1) return `Demain${time}`;
  if (days < 7) return `Dans ${days} j${time}`;
  return format(date, "d MMM") + time;
}

/** Symétrique de eventTimeLabel, mais pour une date passée (dernière note du journal). */
function journalTimeLabel(createdAt: string): string {
  const days = differenceInCalendarDays(new Date(), new Date(createdAt));
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  if (days < 7) return `Il y a ${days} j`;
  return format(new Date(createdAt), "d MMM");
}

/**
 * Nettoie un texte pour l'encodage compact envoyé au widget natif (retire les
 * séparateurs du format CSV). La troncature finale est laissée au widget
 * (ellipse "…" selon la largeur réelle de la case) : on envoie juste de quoi
 * remplir la tuile — 18 caractères pour un titre d'événement (pastille
 * étroite), plus pour le contenu du journal (tuile plus grande).
 */
function sanitizeForWidget(text: string, maxLength = 18): string {
  return text.replace(/[:;]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

/** Tient les widgets d'écran d'accueil Android à jour à chaque changement de données. */
export default function WidgetSync() {
  const { user } = useAuth();
  const { events } = useEvents();
  const { tasks } = useTasks();
  const { entries: journalEntries } = useJournal();
  const { couple, partnerId } = useCouple();
  const { showPeriodInWidget, widgetFontScale } = usePreferences();
  const { themeVersion, seedColor } = useThemeMode();

  // Fenêtre poussée au widget calendrier : le mois courant plus quelques mois
  // à venir, pour que la navigation ‹ › du widget affiche de vraies données
  // au lieu de retomber sur une grille vide dès qu'on quitte le mois du jour
  // (voir OrbitCalendarWidgetProvider.java, qui ne rend qu'un mois à la fois
  // — seul le stockage couvre plusieurs mois, pas le rendu).
  const WIDGET_MONTHS_AHEAD = 12;
  const now = new Date();
  const windowStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const windowEnd = new Date(now.getFullYear(), now.getMonth() + 1 + WIDGET_MONTHS_AHEAD, 0);
  const periodDates = useCyclePeriodDays(windowStart, windowEnd, showPeriodInWidget);

  useEffect(() => {
    const now = new Date();
    const upcoming = events
      .map((event) => ({ event, occursAt: nextEventOccurrence(event, now) }))
      .filter(({ occursAt }) => occursAt.getTime() >= now.getTime())
      .sort((a, b) => a.occursAt.getTime() - b.occursAt.getTime());
    const nextEvent = upcoming[0] ?? null;
    const pendingTasks = tasks.filter((t) => !t.done);

    // Événements du jour affichés en pastilles empilées sur le widget
    // calendrier, jusqu'à 2 par jour (au-delà, la case n'a plus la place :
    // silencieusement tronqué, comme le titre l'est déjà à 18 caractères).
    // Le format CSV "date:titre:couleur;..." (date absolue, pas juste un
    // numéro de jour) supporte nativement plusieurs entrées pour un même
    // jour ET plusieurs mois dans la même chaîne — OrbitCalendarWidgetProvider
    // ne garde que les entrées du mois affiché au moment du rendu. Un
    // événement récurrent chaque année compte pour n'importe quel jour qui
    // correspond, quelle que soit l'année de sa création.
    const MAX_EVENTS_PER_DAY = 2;
    const windowDays = eachDayOfInterval({ start: windowStart, end: windowEnd });
    const entries: string[] = [];
    for (const dayDate of windowDays) {
      const matches = events
        .filter((e) => eventOccursOnDay(e, dayDate))
        .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
        .slice(0, MAX_EVENTS_PER_DAY);
      const dateStr = format(dayDate, "yyyy-MM-dd");
      for (const match of matches) {
        const isBirthday = match.category === "Anniversaire";
        const title = isBirthday ? `🎂 ${sanitizeForWidget(match.title, 16)}` : sanitizeForWidget(match.title);
        const color = eventDisplayColor(match, couple).replace("#", "");
        entries.push(`${dateStr}:${title}:${color}`);
      }
    }
    const eventsCsv = entries.join(";");

    // Jours de règles (déjà enregistrées ou prédites, voir useCyclePeriodDays)
    // sur la fenêtre poussée au widget, désactivable dans Réglages.
    // useCyclePeriodDays filtre déjà sur [windowStart, windowEnd].
    const periodDaysCsv = Array.from(periodDates).join(";");

    // Jours ayant au moins une tâche en attente, sur la même fenêtre : pas
    // besoin de boucler jour par jour, due_date est déjà une date absolue.
    const windowStartStr = format(windowStart, "yyyy-MM-dd");
    const windowEndStr = format(windowEnd, "yyyy-MM-dd");
    const taskDaysCsv = Array.from(
      new Set(
        tasks
          .filter((t) => !t.done && t.due_date && t.due_date >= windowStartStr && t.due_date <= windowEndStr)
          .map((t) => t.due_date as string)
      )
    ).join(";");

    // Dernière entrée du journal (déjà triée la plus récente en premier par
    // useJournal), pour le widget dédié et la 3e ligne du widget Fusion.
    const latestEntry = journalEntries[0] ?? null;
    const journalAuthorLabel = latestEntry
      ? latestEntry.author_id === user?.id
        ? "Toi"
        : latestEntry.author_id === partnerId
          ? "Ton/ta partenaire"
          : ""
      : null;

    syncWidgets({
      nextEventTitle: nextEvent?.event.title ?? null,
      nextEventTimeLabel: nextEvent ? eventTimeLabel(nextEvent.occursAt.toISOString(), nextEvent.event.all_day) : null,
      pendingTasksCount: pendingTasks.length,
      nextTaskTitle: pendingTasks[0]?.title ?? null,
      eventsCsv,
      periodDaysCsv,
      taskDaysCsv,
      journalContent: latestEntry ? sanitizeForWidget(latestEntry.content, 90) : null,
      journalAuthorLabel,
      journalTimeLabel: latestEntry ? journalTimeLabel(latestEntry.created_at) : null,
      seedColor,
      fontScale: WIDGET_FONT_SCALE_FACTORS[widgetFontScale],
    });
  }, [events, tasks, journalEntries, couple, partnerId, user, periodDates, themeVersion, seedColor, widgetFontScale]);

  return null;
}
