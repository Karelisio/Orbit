import { useEffect } from "react";
import { differenceInCalendarDays, format } from "date-fns";
import { useAuth } from "../context/AuthContext";
import { useEvents } from "../hooks/useEvents";
import { useTasks } from "../hooks/useTasks";
import { useJournal } from "../hooks/useJournal";
import { useCouple } from "../context/CoupleContext";
import { useCyclePeriodDays } from "../hooks/useCyclePeriodDays";
import { usePreferences } from "../context/PreferencesContext";
import { useThemeMode } from "../context/ThemeModeContext";
import { syncWidgets } from "../lib/widgetSync";
import { eventDisplayColor, eventOccursOnDay, nextEventOccurrence } from "../types";

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
  const { showPeriodInWidget } = usePreferences();
  const { themeVersion, seedColor } = useThemeMode();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const periodDates = useCyclePeriodDays(monthStart, monthEnd, showPeriodInWidget);

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
    // Le format CSV "jour:titre:couleur;..." supporte nativement plusieurs
    // entrées pour un même jour, pas besoin d'un nouveau séparateur. Un
    // événement récurrent chaque année compte pour n'importe quel jour du
    // mois affiché qui correspond, quelle que soit l'année de sa création.
    const MAX_EVENTS_PER_DAY = 2;
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const entries: string[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(now.getFullYear(), now.getMonth(), day);
      const matches = events
        .filter((e) => eventOccursOnDay(e, dayDate))
        .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
        .slice(0, MAX_EVENTS_PER_DAY);
      for (const match of matches) {
        const title = sanitizeForWidget(match.title);
        const color = eventDisplayColor(match, couple).replace("#", "");
        entries.push(`${day}:${title}:${color}`);
      }
    }
    const eventsThisMonth = entries.join(";");

    // Jours de règles (déjà enregistrées ou prédites, voir useCyclePeriodDays)
    // du mois affiché sur le widget, désactivable dans Réglages.
    const periodDaysThisMonth: number[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = format(new Date(now.getFullYear(), now.getMonth(), day), "yyyy-MM-dd");
      if (periodDates.has(dateStr)) periodDaysThisMonth.push(day);
    }

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
      eventsThisMonth,
      periodDaysThisMonth: periodDaysThisMonth.join(";"),
      journalContent: latestEntry ? sanitizeForWidget(latestEntry.content, 90) : null,
      journalAuthorLabel,
      journalTimeLabel: latestEntry ? journalTimeLabel(latestEntry.created_at) : null,
      seedColor,
    });
  }, [events, tasks, journalEntries, couple, partnerId, user, periodDates, themeVersion, seedColor]);

  return null;
}
