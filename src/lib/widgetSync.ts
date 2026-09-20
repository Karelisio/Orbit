import { Capacitor, registerPlugin } from "@capacitor/core";

interface WidgetDataPlugin {
  update(data: {
    nextEventTitle?: string;
    nextEventTimeLabel?: string;
    pendingTasksCount: number;
    nextTaskTitle?: string;
  }): Promise<void>;
}

const WidgetData = registerPlugin<WidgetDataPlugin>("WidgetData");

export async function syncWidgets(data: {
  nextEventTitle: string | null;
  nextEventTimeLabel: string | null;
  pendingTasksCount: number;
  nextTaskTitle: string | null;
}): Promise<void> {
  if (Capacitor.getPlatform() !== "android") return;
  try {
    await WidgetData.update({
      nextEventTitle: data.nextEventTitle ?? undefined,
      nextEventTimeLabel: data.nextEventTimeLabel ?? undefined,
      pendingTasksCount: data.pendingTasksCount,
      nextTaskTitle: data.nextTaskTitle ?? undefined,
    });
  } catch {
    // plateforme sans widgets (ou plugin indisponible) : tant pis
  }
}
