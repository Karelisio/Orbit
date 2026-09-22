import { Capacitor, registerPlugin } from "@capacitor/core";
import { widgetPalettesFromSeed, type WidgetPalette } from "./materialYou";

interface WidgetDataPlugin {
  update(data: {
    nextEventTitle?: string;
    nextEventTimeLabel?: string;
    pendingTasksCount: number;
    nextTaskTitle?: string;
    eventsCsv: string;
    periodDaysCsv: string;
    taskDaysCsv: string;
    journalContent?: string;
    journalAuthorLabel?: string;
    journalTimeLabel?: string;
    primaryColor?: string;
    onPrimaryColor?: string;
    primaryContainerColor?: string;
    onPrimaryContainerColor?: string;
    onSurfaceColor?: string;
    onSurfaceVariantColor?: string;
    tertiaryColor?: string;
    darkPrimaryColor?: string;
    darkOnPrimaryColor?: string;
    darkPrimaryContainerColor?: string;
    darkOnPrimaryContainerColor?: string;
    darkOnSurfaceColor?: string;
    darkOnSurfaceVariantColor?: string;
    darkTertiaryColor?: string;
  }): Promise<void>;
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
    darkTertiaryColor: palette.tertiary,
  });
  return {
    primaryColor: light.primary,
    onPrimaryColor: light.onPrimary,
    primaryContainerColor: light.primaryContainer,
    onPrimaryContainerColor: light.onPrimaryContainer,
    onSurfaceColor: light.onSurface,
    onSurfaceVariantColor: light.onSurfaceVariant,
    tertiaryColor: light.tertiary,
    ...prefixDark(dark),
  };
}

export async function syncWidgets(data: {
  nextEventTitle: string | null;
  nextEventTimeLabel: string | null;
  pendingTasksCount: number;
  nextTaskTitle: string | null;
  /** "aaaa-mm-jj:titre:couleurHexSansDièse;..." sur une fenêtre de plusieurs mois à venir (voir WidgetSync.tsx). */
  eventsCsv: string;
  /** "aaaa-mm-jj;aaaa-mm-jj;..." des jours de règles (déjà enregistrées ou prédites) sur la même fenêtre. */
  periodDaysCsv: string;
  /** "aaaa-mm-jj;aaaa-mm-jj;..." des jours ayant au moins une tâche en attente, sur la même fenêtre. */
  taskDaysCsv: string;
  /** Dernière entrée du journal, ou null s'il n'y en a aucune. */
  journalContent: string | null;
  journalAuthorLabel: string | null;
  journalTimeLabel: string | null;
  /** Couleur source du thème courant (voir ThemeModeContext.seedColor). */
  seedColor: string;
}): Promise<void> {
  if (Capacitor.getPlatform() !== "android") return;
  try {
    await WidgetData.update({
      nextEventTitle: data.nextEventTitle ?? undefined,
      nextEventTimeLabel: data.nextEventTimeLabel ?? undefined,
      pendingTasksCount: data.pendingTasksCount,
      nextTaskTitle: data.nextTaskTitle ?? undefined,
      eventsCsv: data.eventsCsv,
      periodDaysCsv: data.periodDaysCsv,
      taskDaysCsv: data.taskDaysCsv,
      journalContent: data.journalContent ?? undefined,
      journalAuthorLabel: data.journalAuthorLabel ?? undefined,
      journalTimeLabel: data.journalTimeLabel ?? undefined,
      ...themeColorsForWidgets(data.seedColor),
    });
  } catch {
    // plateforme sans widgets (ou plugin indisponible) : tant pis
  }
}
