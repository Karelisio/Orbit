import { Capacitor, registerPlugin } from "@capacitor/core";

interface WidgetDataPlugin {
  update(data: {
    nextEventTitle?: string;
    nextEventTimeLabel?: string;
    pendingTasksCount: number;
    nextTaskTitle?: string;
    eventDaysThisMonth: string;
    primaryColor?: string;
    onPrimaryColor?: string;
    onPrimaryContainerColor?: string;
    onSurfaceColor?: string;
    onSurfaceVariantColor?: string;
    tertiaryColor?: string;
  }): Promise<void>;
}

const WidgetData = registerPlugin<WidgetDataPlugin>("WidgetData");

/** Couleurs Material You courantes (variables CSS --md-sys-color-*), pour thémer les widgets natifs. */
function currentThemeColors() {
  const style = getComputedStyle(document.documentElement);
  const read = (name: string) => style.getPropertyValue(name).trim() || undefined;
  return {
    primaryColor: read("--md-sys-color-primary"),
    onPrimaryColor: read("--md-sys-color-on-primary"),
    onPrimaryContainerColor: read("--md-sys-color-on-primary-container"),
    onSurfaceColor: read("--md-sys-color-on-surface"),
    onSurfaceVariantColor: read("--md-sys-color-on-surface-variant"),
    tertiaryColor: read("--md-sys-color-tertiary"),
  };
}

export async function syncWidgets(data: {
  nextEventTitle: string | null;
  nextEventTimeLabel: string | null;
  pendingTasksCount: number;
  nextTaskTitle: string | null;
  eventDaysThisMonth: number[];
}): Promise<void> {
  if (Capacitor.getPlatform() !== "android") return;
  try {
    await WidgetData.update({
      nextEventTitle: data.nextEventTitle ?? undefined,
      nextEventTimeLabel: data.nextEventTimeLabel ?? undefined,
      pendingTasksCount: data.pendingTasksCount,
      nextTaskTitle: data.nextTaskTitle ?? undefined,
      eventDaysThisMonth: data.eventDaysThisMonth.join(","),
      ...currentThemeColors(),
    });
  } catch {
    // plateforme sans widgets (ou plugin indisponible) : tant pis
  }
}
