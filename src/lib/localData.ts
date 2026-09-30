import { resyncEventReminders } from "./notifications";
import { clearWidgets } from "./widgetSync";

/** Copies hors ligne de l'espace : couple (CoupleContext) et tables (useRealtimeCollection). */
const SPACE_CACHE_PREFIXES = ["orbit-couple-cache-", "orbit-cache-"];

/**
 * Efface ce qu'Orbit garde de l'espace partagé sur CE téléphone : copies
 * hors ligne (couple, événements, tâches, dépenses, notes, jours de cycle),
 * contenu des widgets et rappels programmés. Appelé en quittant l'espace, à
 * la déconnexion, et quand le serveur répond que ce compte n'a plus
 * d'espace (quitté ou supprimé depuis l'autre téléphone). Sans ça, un
 * lancement hors ligne réaffichait l'ancien couple et ses données, les
 * widgets gardaient leur contenu et les rappels continuaient de sonner.
 * Les réglages de l'appareil (thème, sections, onglets...) restent.
 */
export function purgeLocalSpaceData(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && SPACE_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix))) keys.push(key);
    }
    for (const key of keys) localStorage.removeItem(key);
  } catch {
    // stockage indisponible : rien à effacer
  }
  void clearWidgets();
  void resyncEventReminders([]);
}
