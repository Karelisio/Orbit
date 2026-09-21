import { applyTheme, argbFromHex, hexFromArgb, themeFromImage, themeFromSourceColor, type Scheme } from "@material/material-color-utilities";

// Violet Material You par défaut, tant qu'aucune image de thème n'a été choisie.
export const DEFAULT_SEED_COLOR = "#6750a4";

function prefersDark(): boolean {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Applique un thème Material You (variables CSS --md-sys-color-*) au document.
 * `dark` force le mode clair/sombre ; omis, il suit la préférence système.
 */
export async function applyThemeFromImageUrl(imageUrl: string, dark?: boolean): Promise<string> {
  const image = await loadImage(imageUrl);
  const theme = await themeFromImage(image);
  const isDark = dark ?? prefersDark();
  applyTheme(theme, { target: document.documentElement, dark: isDark });
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  return hexFromArgb(theme.source);
}

export function applyThemeFromSeedColor(hex: string, dark?: boolean): void {
  const theme = themeFromSourceColor(argbFromHex(hex));
  const isDark = dark ?? prefersDark();
  applyTheme(theme, { target: document.documentElement, dark: isDark });
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Les sept couleurs dont les widgets natifs ont besoin (voir OrbitWidgetPrefs.java). */
export interface WidgetPalette {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  onSurface: string;
  onSurfaceVariant: string;
  tertiary: string;
}

/**
 * Les deux variantes (claire et sombre) de la palette d'une même couleur
 * source. Les widgets reçoivent les deux d'un coup et laissent Android
 * choisir selon le mode nuit du téléphone : sans ça, ils resteraient figés
 * dans le mode qui était actif au dernier lancement de l'app.
 *
 * Calculé directement depuis la couleur source, sans passer par les
 * variables CSS : celles-ci ne contiennent que le mode actuellement affiché.
 */
export function widgetPalettesFromSeed(hex: string): { light: WidgetPalette; dark: WidgetPalette } {
  const theme = themeFromSourceColor(argbFromHex(hex));
  const pick = (scheme: Scheme): WidgetPalette => ({
    primary: hexFromArgb(scheme.primary),
    onPrimary: hexFromArgb(scheme.onPrimary),
    primaryContainer: hexFromArgb(scheme.primaryContainer),
    onPrimaryContainer: hexFromArgb(scheme.onPrimaryContainer),
    onSurface: hexFromArgb(scheme.onSurface),
    onSurfaceVariant: hexFromArgb(scheme.onSurfaceVariant),
    tertiary: hexFromArgb(scheme.tertiary),
  });
  return { light: pick(theme.schemes.light), dark: pick(theme.schemes.dark) };
}

export function watchSystemThemeChanges(onChange: () => void): () => void {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const listener = () => onChange();
  mq.addEventListener("change", listener);
  return () => mq.removeEventListener("change", listener);
}
