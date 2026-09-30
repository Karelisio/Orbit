import { Capacitor, registerPlugin } from "@capacitor/core";
import { widgetPalettesFromSeed, type WidgetPalette } from "./materialYou";

interface WidgetDataPlugin {
  update(data: {
    nextEventTitle?: string;
    nextEventTimeLabel?: string;
    nextEventsJson: string;
    pendingTasksCount: number;
    nextTaskTitle?: string;
    eventsCsv: string;
    periodDaysCsv: string;
    predictedPeriodDaysCsv: string;
    taskDaysCsv: string;
    journalContent?: string;
    journalAuthorLabel?: string;
    journalTimeLabel?: string;
    journalCreatedAt?: string;
    primaryColor?: string;
    onPrimaryColor?: string;
    primaryContainerColor?: string;
    onPrimaryContainerColor?: string;
    onSurfaceColor?: string;
    onSurfaceVariantColor?: string;
    darkPrimaryColor?: string;
    darkOnPrimaryColor?: string;
    darkPrimaryContainerColor?: string;
    darkOnPrimaryContainerColor?: string;
    darkOnSurfaceColor?: string;
    darkOnSurfaceVariantColor?: string;
    fontScale: number;
    seedFollowsWallpaper: boolean;
  }): Promise<void>;
  clear(): Promise<void>;
}

const WidgetData = registerPlugin<WidgetDataPlugin>("WidgetData");

/**
 * Les deux palettes (claire et sombre) de la couleur source courante. On
 * pousse les deux plutôt que la seule palette affichée : les widgets peuvent
 * alors suivre le mode nuit du téléphone d'eux-mêmes, y compris quand il
 * bascule pendant que l'app est fermée (voir OrbitWidgetTheme.java).
 */
function themeColorsForWidgets(seedColor: string) {
  const { light, dark } = widgetPalettesFromSeed(seedColor);
  const prefixDark = (palette: WidgetPalette) => ({
    darkPrimaryColor: palette.primary,
    darkOnPrimaryColor: palette.onPrimary,
    darkPrimaryContainerColor: palette.primaryContainer,
    darkOnPrimaryContainerColor: palette.onPrimaryContainer,
    darkOnSurfaceColor: palette.onSurface,
    darkOnSurfaceVariantColor: palette.onSurfaceVariant,
  });
  return {
    primaryColor: light.primary,
    onPrimaryColor: light.onPrimary,
    primaryContainerColor: light.primaryContainer,
    onPrimaryContainerColor: light.onPrimaryContainer,
    onSurfaceColor: light.onSurface,
    onSurfaceVariantColor: light.onSurfaceVariant,
    ...prefixDark(dark),
  };
}

/** Palettes de la dernière couleur source : recalculées seulement quand elle change. */
let paletteCache: { seed: string; colors: ReturnType<typeof themeColorsForWidgets> } | null = null;

function cachedThemeColors(seedColor: string) {
  if (paletteCache?.seed !== seedColor) paletteCache = { seed: seedColor, colors: themeColorsForWidgets(seedColor) };
  return paletteCache.colors;
}

/** Dernier contenu poussé aux widgets, pour ne pas les reconstruire à l'identique. */
let lastPushedPayload: string | null = null;

export async function syncWidgets(data: {
  nextEventTitle: string | null;
  /** Libellé figé au moment de la synchro : simple repli, le widget recalcule le sien depuis nextEventsJson. */
  nextEventTimeLabel: string | null;
  /**
   * Prochaines occurrences, JSON `[{"t": titre, "s": début en ms epoch, "a": journée entière}]`,
   * dans l'ordre : le widget Fusion affiche la première pas encore passée,
   * avec un libellé relatif recalculé à chaque rendu (OrbitWidgetLabels.java).
   * Une chaîne plutôt qu'un tableau ou des nombres : côté Java, PluginCall
   * ne relit un nombre que selon son type exact (Integer/Long/Double).
   */
  nextEventsJson: string;
  pendingTasksCount: number;
  nextTaskTitle: string | null;
  /** "aaaa-mm-jj:titre:couleurHexSansDièse;..." sur une fenêtre de plusieurs mois à venir (voir WidgetSync.tsx). */
  eventsCsv: string;
  /** "aaaa-mm-jj;aaaa-mm-jj;..." des jours de règles enregistrés dans Wenn sur la même fenêtre. */
  periodDaysCsv: string;
  /** Même format : jours de règles seulement prévus (hors jours déjà enregistrés). */
  predictedPeriodDaysCsv: string;
  /** "aaaa-mm-jj;aaaa-mm-jj;..." des jours ayant au moins une tâche en attente, sur la même fenêtre. */
  taskDaysCsv: string;
  /** Dernière entrée du journal, ou null s'il n'y en a aucune. */
  journalContent: string | null;
  journalAuthorLabel: string | null;
  /** Libellé figé (repli), voir journalCreatedAt. */
  journalTimeLabel: string | null;
  /** Date de la note en ms epoch, en chaîne : « Hier »/« Il y a 3 j » recalculé à chaque rendu du widget. */
  journalCreatedAt: string | null;
  /**
   * Couleur source du thème courant (voir ThemeModeContext.seedColor) : sert
   * uniquement à dériver la palette de repli ci-dessous (image de thème
   * choisie, ou Android < 12 sans couleur système dynamique) — jamais
   * transmise telle quelle au natif.
   */
  seedColor: string;
  /** Vrai sauf si une image de thème est choisie : les widgets suivent alors les couleurs système dynamiques de leur XML plutôt que la palette ci-dessous. */
  seedFollowsWallpaper: boolean;
  /** Facteur manuel de taille de police des widgets (Réglages > Widgets), composé avec l'ajustement automatique à la hauteur. */
  fontScale: number;
}): Promise<void> {
  if (Capacitor.getPlatform() !== "android") return;
  const payload = {
    nextEventTitle: data.nextEventTitle ?? undefined,
    nextEventTimeLabel: data.nextEventTimeLabel ?? undefined,
    nextEventsJson: data.nextEventsJson,
    pendingTasksCount: data.pendingTasksCount,
    nextTaskTitle: data.nextTaskTitle ?? undefined,
    eventsCsv: data.eventsCsv,
    periodDaysCsv: data.periodDaysCsv,
    predictedPeriodDaysCsv: data.predictedPeriodDaysCsv,
    taskDaysCsv: data.taskDaysCsv,
    journalContent: data.journalContent ?? undefined,
    journalAuthorLabel: data.journalAuthorLabel ?? undefined,
    journalTimeLabel: data.journalTimeLabel ?? undefined,
    journalCreatedAt: data.journalCreatedAt ?? undefined,
    ...cachedThemeColors(data.seedColor),
    fontScale: data.fontScale,
    seedFollowsWallpaper: data.seedFollowsWallpaper,
  };
  // Même contenu que la dernière fois (écho temps réel d'une modif déjà
  // affichée, rafraîchissement de session...) : rien à reconstruire.
  const serialized = JSON.stringify(payload);
  if (serialized === lastPushedPayload) return;
  lastPushedPayload = serialized;
  try {
    await WidgetData.update(payload);
  } catch {
    // plateforme sans widgets (ou plugin indisponible) : tant pis — la
    // prochaine synchro retentera, même à contenu identique
    lastPushedPayload = null;
  }
}

/**
 * Vide le contenu des widgets (déconnexion, espace quitté : voir
 * lib/localData.ts), sans toucher à leurs réglages d'affichage.
 */
export async function clearWidgets(): Promise<void> {
  lastPushedPayload = null;
  if (Capacitor.getPlatform() !== "android") return;
  try {
    await WidgetData.clear();
  } catch {
    // plateforme sans widgets (ou plugin indisponible) : tant pis
  }
}
