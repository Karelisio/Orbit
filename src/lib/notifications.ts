import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import type { OrbitEvent } from "../types";

/**
 * Un id de notification Capacitor est un entier 32 bits. On en dérive un de
 * façon stable à partir de l'uuid de l'événement + de l'offset de rappel
 * (un même événement avec plusieurs rappels = plusieurs notifications).
 */
function notificationId(eventId: string, minutesBefore: number): number {
  let hash = 0;
  const key = `${eventId}:${minutesBefore}`;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 2147483647;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  const result = await LocalNotifications.requestPermissions();
  return result.display === "granted";
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
    return exact_alarm === "granted";
  } catch {
    return false;
  }
}

export async function cancelEventNotifications(event: Pick<OrbitEvent, "id" | "reminder_minutes_before">): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const ids = event.reminder_minutes_before.map((m) => ({ id: notificationId(event.id, m) }));
  if (ids.length) await LocalNotifications.cancel({ notifications: ids });
}

/**
 * Planifie les rappels locaux natifs d'un événement (fiable même app fermée :
 * Capacitor délègue à AlarmManager sur Android / UNUserNotificationCenter sur iOS).
 * À rappeler après chaque création/modification/suppression d'événement.
 */
export async function scheduleEventNotifications(event: OrbitEvent): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  await cancelEventNotifications(event);
  if (event.reminder_minutes_before.length === 0) return;

  const granted = await requestNotificationPermission();
  if (!granted) return;

  const startsAt = new Date(event.starts_at);
  const notifications = event.reminder_minutes_before
    .map((minutesBefore) => {
      const triggerDate = new Date(startsAt.getTime() - minutesBefore * 60_000);
      if (triggerDate.getTime() <= Date.now()) return null;
      return {
        id: notificationId(event.id, minutesBefore),
        title: "Orbit",
        body: `${event.title} — ${formatRelative(minutesBefore)}`,
        schedule: { at: triggerDate, allowWhileIdle: true },
      };
    })
    .filter((n): n is NonNullable<typeof n> => n !== null);

  if (notifications.length) await LocalNotifications.schedule({ notifications });
}

function formatRelative(minutesBefore: number): string {
  if (minutesBefore >= 24 * 60) {
    const days = Math.round(minutesBefore / (24 * 60));
    return days === 1 ? "demain" : `dans ${days} jours`;
  }
  if (minutesBefore >= 60) return `dans ${Math.round(minutesBefore / 60)} h`;
  return `dans ${minutesBefore} min`;
}
