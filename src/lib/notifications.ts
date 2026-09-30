import { Capacitor } from "@capacitor/core";
import {
  LocalNotifications,
  type LocalNotificationSchema,
  type PendingLocalNotificationSchema,
} from "@capacitor/local-notifications";
import { nextEventOccurrence, type OrbitEvent } from "../types";

/** Marqueur posé dans `extra` de chaque rappel d'événement (voir isOrbitReminder). */
const ORBIT_EVENT_KIND = "orbit-event";
const NOTIFICATION_TITLE = "Orbit";
/** Plus tôt que ça, trop tard pour programmer : le plugin refuse une date déjà passée. */
const MIN_LEAD_MS = 5_000;
const MAX_HORIZON_MS = 400 * 24 * 60 * 60_000;
/** Android refuse au-delà de 500 alarmes par app : on garde de la marge. */
const MAX_SCHEDULED_REMINDERS = 400;

/** Derniers événements reçus par resyncEventReminders (réutilisés quand une permission arrive). */
let lastEvents: OrbitEvent[] | null = null;
let resyncQueue: Promise<void> = Promise.resolve();
/**
 * Vrai tant qu'une passe complète reste à faire (au premier passage depuis le
 * lancement, ou après l'autorisation des alarmes exactes) : on reprogramme
 * alors TOUS les rappels voulus, pas seulement ceux qui manquent. Le plugin
 * liste en effet toujours comme « en attente » une alarme qu'Android a
 * pourtant effacée (arrêt forcé de l'app...).
 */
let fullResyncPending = true;

/**
 * Un id de notification Capacitor est un entier 32 bits. On en dérive un
 * (positif, 31 bits) de façon stable à partir de l'événement, du rappel ET
 * de l'occurrence visée : un événement déplacé, ou l'occurrence de l'année
 * suivante d'un anniversaire, donne un nouvel id — l'ancien rappel n'est
 * alors plus voulu et la resynchro l'annule.
 */
function reminderNotificationId(eventId: string, minutesBefore: number, occurrenceIso: string): number {
  let hash = 0;
  const key = `${eventId}|${minutesBefore}|${occurrenceIso}`;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return (hash & 0x7fffffff) || 1;
}

/**
 * Rappel d'événement programmé par Orbit. Ceux de l'ancien schéma (id =
 * hash de `${eventId}:${minutes}`, sans `extra`, programmés par le seul
 * téléphone qui créait l'événement) ne se reconnaissent pas par leur id :
 * il faudrait l'événement d'origine, peut-être supprimé depuis par l'autre
 * téléphone. Mais ils portent tous le titre fixe « Orbit », seul usage des
 * notifications locales dans l'app : la première resynchro les annule tous
 * et les reprogramme sous le nouveau schéma, sans doublon.
 */
function isOrbitReminder(notification: PendingLocalNotificationSchema): boolean {
  const kind = notification.extra?.kind;
  return kind === ORBIT_EVENT_KIND || (kind == null && notification.title === NOTIFICATION_TITLE);
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  const result = await LocalNotifications.requestPermissions();
  const granted = result.display === "granted";
  // Permission tout juste accordée : la dernière resynchro n'a rien pu
  // programmer, inutile d'attendre le prochain changement d'événement.
  if (granted && lastEvents) void resyncEventReminders(lastEvents);
  return granted;
}

/**
 * Sur Android 12+, déclarer SCHEDULE_EXACT_ALARM dans le manifeste ne suffit
 * plus : l'utilisatrice doit en plus accorder le réglage système "Alarmes et
 * rappels" (Settings > Apps > Orbit > Alarmes et rappels). Sans ça, un
 * rappel est programmé en alarme inexacte, que Doze/App Standby peut
 * reporter arbitrairement — d'où des rappels qui ne sonnent que si l'app est
 * rouverte entre-temps.
 */
export async function isExactAlarmGranted(): Promise<boolean> {
  if (Capacitor.getPlatform() !== "android") return true;
  try {
    const { exact_alarm } = await LocalNotifications.checkExactNotificationSetting();
    return exact_alarm === "granted";
  } catch {
    return true;
  }
}

/** Ouvre l'écran système "Alarmes et rappels" pour Orbit. */
export async function openExactAlarmSettings(): Promise<boolean> {
  if (Capacitor.getPlatform() !== "android") return true;
  try {
    const { exact_alarm } = await LocalNotifications.changeExactNotificationSetting();
    const granted = exact_alarm === "granted";
    // Les rappels déjà programmés restent des alarmes inexactes : on les
    // reprogramme tous, cette fois en alarmes exactes.
    if (granted && lastEvents) {
      fullResyncPending = true;
      void resyncEventReminders(lastEvents);
    }
    return granted;
  } catch {
    return false;
  }
}

/**
 * Aligne les rappels programmés sur CE téléphone avec la liste partagée des
 * événements : chaque téléphone programme lui-même tous les rappels, y
 * compris pour un événement créé, déplacé ou supprimé par l'autre, rattrape
 * l'occurrence suivante d'un événement annuel, et un téléphone neuf retrouve
 * tout. Idempotente : annule nos rappels en attente qui ne sont plus voulus,
 * programme ceux qui manquent. Ne demande jamais la permission (seulement si
 * déjà accordée) ; erreurs silencieuses (console).
 */
export function resyncEventReminders(events: OrbitEvent[]): Promise<void> {
  if (!Capacitor.isNativePlatform()) return Promise.resolve();
  lastEvents = events;
  // Une passe à la fois, chacune sur les derniers événements connus : deux
  // passes entrelacées pourraient sinon annuler un rappel que l'autre vient
  // de programmer.
  resyncQueue = resyncQueue
    .then(() => applyEventReminders(lastEvents ?? []))
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error("Resynchro des rappels d'événements impossible :", err);
    });
  return resyncQueue;
}

async function applyEventReminders(events: OrbitEvent[]): Promise<void> {
  const { display } = await LocalNotifications.checkPermissions();
  if (display !== "granted") return;

  const now = Date.now();
  const upcoming: { at: number; notification: LocalNotificationSchema }[] = [];
  // Rappels encore valables mais trop proches pour être (re)programmés, ou
  // en retard sans avoir encore sonné (alarme reportée par Doze) : jamais
  // annulés, pour ne pas étouffer une alarme sur le point de sonner.
  const imminentIds = new Set<number>();

  for (const event of events) {
    if (event.reminder_minutes_before.length === 0) continue;
    // Même sémantique qu'avant pour les journées entières : l'heure de
    // starts_at telle quelle. Un événement annuel vise sa prochaine occurrence.
    const occurrence = nextEventOccurrence(event, new Date(now));
    for (const minutesBefore of event.reminder_minutes_before) {
      const at = occurrence.getTime() - minutesBefore * 60_000;
      const id = reminderNotificationId(event.id, minutesBefore, occurrence.toISOString());
      if (at <= now + MIN_LEAD_MS) {
        imminentIds.add(id);
        continue;
      }
      if (at >= now + MAX_HORIZON_MS) continue;
      upcoming.push({
        at,
        notification: {
          id,
          title: NOTIFICATION_TITLE,
          body: `${event.title} — ${formatRelative(minutesBefore)}`,
          schedule: { at: new Date(at), allowWhileIdle: true },
          extra: { kind: ORBIT_EVENT_KIND, eventId: event.id },
        },
      });
    }
  }

  const wanted = new Map<number, LocalNotificationSchema>();
  upcoming.sort((a, b) => a.at - b.at);
  for (const { notification } of upcoming.slice(0, MAX_SCHEDULED_REMINDERS)) {
    wanted.set(notification.id, notification);
  }

  const { notifications: pending } = await LocalNotifications.getPending();
  const stale = pending.filter((n) => isOrbitReminder(n) && !wanted.has(n.id) && !imminentIds.has(n.id));
  if (stale.length) await LocalNotifications.cancel({ notifications: stale.map((n) => ({ id: n.id })) });

  const pendingIds = new Set(pending.map((n) => n.id));
  const toSchedule = [...wanted.values()].filter((n) => fullResyncPending || !pendingIds.has(n.id));
  if (toSchedule.length) await LocalNotifications.schedule({ notifications: toSchedule });
  fullResyncPending = false;
}

function formatRelative(minutesBefore: number): string {
  if (minutesBefore >= 24 * 60) {
    const days = Math.round(minutesBefore / (24 * 60));
    return days === 1 ? "demain" : `dans ${days} jours`;
  }
  if (minutesBefore >= 60) return `dans ${Math.round(minutesBefore / 60)} h`;
  return `dans ${minutesBefore} min`;
}
