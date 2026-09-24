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

/**
 * Les seize rôles Material 3 dont l'app a besoin pour ses variables CSS
 * (voir global.css :root), quand ils viennent directement des couleurs
 * système dynamiques d'Android (voir dynamicColor.ts) plutôt que d'un calcul
 * JS. error/on-error ne sont pas dynamiques en M3 (couleur sémantique fixe),
 * ils restent aux valeurs par défaut de global.css.
 */
export interface DynamicPalette {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  tertiary: string;
  background: string;
  onBackground: string;
  surface: string;
  onSurface: string;
  surfaceVariant: string;
  onSurfaceVariant: string;
  outline: string;
}

const DYNAMIC_CSS_VAR_MAP: Record<keyof DynamicPalette, string> = {
  primary: "--md-sys-color-primary",
  onPrimary: "--md-sys-color-on-primary",
  primaryContainer: "--md-sys-color-primary-container",
  onPrimaryContainer: "--md-sys-color-on-primary-container",
  secondary: "--md-sys-color-secondary",
  onSecondary: "--md-sys-color-on-secondary",
  secondaryContainer: "--md-sys-color-secondary-container",
  onSecondaryContainer: "--md-sys-color-on-secondary-container",
  tertiary: "--md-sys-color-tertiary",
  background: "--md-sys-color-background",
  onBackground: "--md-sys-color-on-background",
  surface: "--md-sys-color-surface",
  onSurface: "--md-sys-color-on-surface",
  surfaceVariant: "--md-sys-color-surface-variant",
  onSurfaceVariant: "--md-sys-color-on-surface-variant",
  outline: "--md-sys-color-outline",
};

/** Applique une palette système dynamique aux variables CSS (voir dynamicColor.ts). */
export function applyDynamicPalette(palette: DynamicPalette, dark: boolean): void {
  const root = document.documentElement;
  for (const key of Object.keys(DYNAMIC_CSS_VAR_MAP) as (keyof DynamicPalette)[]) {
    root.style.setProperty(DYNAMIC_CSS_VAR_MAP[key], palette[key]);
  }
  root.style.colorScheme = dark ? "dark" : "light";
}

export function watchSystemThemeChanges(onChange: () => void): () => void {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const listener = () => onChange();
  mq.addEventListener("change", listener);
  return () => mq.removeEventListener("change", listener);
}
