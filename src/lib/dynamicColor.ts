import { registerPlugin, Capacitor } from "@capacitor/core";
import type { DynamicPalette } from "./materialYou";

interface DynamicColorPlugin {
  getColors(): Promise<{ available: boolean; light?: DynamicPalette; dark?: DynamicPalette }>;
}

const DynamicColor = registerPlugin<DynamicColorPlugin>("DynamicColor");

/**
 * Palette Material You du SYSTÈME (Android 12+, dérivée du fond d'écran par
 * Android lui-même), dans ses deux variantes claire/sombre. Contrairement à
 * `getWallpaperSeedColor()` (une couleur, à recalculer en JS), c'est ici déjà
 * la palette complète — les mêmes valeurs que celles lues en XML par les
 * widgets (voir CLAUDE.md "Couleurs système dynamiques") : app et widgets ne
 * peuvent donc jamais diverger, et suivent un changement de fond d'écran
 * sans le moindre code de synchronisation, y compris app fermée pour les
 * widgets (c'est Android/le lanceur qui repeint).
 *
 * `null` en dessous d'Android 12 ou hors Android : appelant retombe alors sur
 * `getWallpaperSeedColor()` + le calcul JS (material-color-utilities).
 */
export async function getSystemDynamicColors(): Promise<{ light: DynamicPalette; dark: DynamicPalette } | null> {
  if (Capacitor.getPlatform() !== "android") return null;
  try {
    const { available, light, dark } = await DynamicColor.getColors();
    if (!available || !light || !dark) return null;
    return { light, dark };
  } catch {
    return null;
  }
}
