import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "./AuthContext";
import { supabase } from "../lib/supabase";
import { applyThemeFromImageUrl, applyThemeFromSeedColor, DEFAULT_SEED_COLOR, watchSystemThemeChanges } from "../lib/materialYou";
import { getWallpaperSeedColor } from "../lib/wallpaperColor";

type ThemeMode = "system" | "light" | "dark";

interface ThemeModeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  setThemeImageUrl: (url: string | null) => Promise<void>;
  /**
   * Incrémenté une fois qu'un changement de thème (manuel ou bascule système)
   * a fini d'être appliqué aux variables CSS. WidgetSync.tsx s'en sert pour
   * savoir quand relire et repousser les couleurs aux widgets — sans lui,
   * rien ne le lui indique (voir CHANGELOG : widget illisible en sombre).
   */
  themeVersion: number;
  /**
   * Couleur source effectivement retenue (image de thème, fond d'écran, ou
   * repli). WidgetSync.tsx en dérive les palettes claire ET sombre à pousser
   * aux widgets, ce que les variables CSS ne permettent pas : elles ne
   * contiennent que le mode actuellement affiché.
   */
  seedColor: string;
  /**
   * Vrai quand cette couleur source vient du fond d'écran Android (et non
   * d'une image de thème choisie dans l'app). Les widgets s'en servent pour
   * savoir s'ils peuvent recalculer la palette eux-mêmes au changement de
   * fond d'écran, app fermée (voir OrbitWidgetPalette.java).
   */
  seedFollowsWallpaper: boolean;
}

const ThemeModeContext = createContext<ThemeModeContextValue | undefined>(undefined);

function resolveDark(mode: ThemeMode): boolean | undefined {
  if (mode === "system") return undefined;
  return mode === "dark";
}

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const { user, profile, refreshProfile } = useAuth();
  const [mode, setModeState] = useState<ThemeMode>(() => (localStorage.getItem("orbit-theme-mode") as ThemeMode) || "system");
  const [themeVersion, setThemeVersion] = useState(0);
  const [seedColor, setSeedColor] = useState(DEFAULT_SEED_COLOR);
  const [seedFollowsWallpaper, setSeedFollowsWallpaper] = useState(false);

  function setMode(next: ThemeMode) {
    setModeState(next);
    localStorage.setItem("orbit-theme-mode", next);
  }

  async function applyTheme() {
    const dark = resolveDark(mode);
    try {
      if (profile?.theme_image_url) {
        try {
          setSeedColor(await applyThemeFromImageUrl(profile.theme_image_url, dark));
          setSeedFollowsWallpaper(false);
          return;
        } catch {
          // image invalide/inaccessible : on retombe sur la couleur de secours ci-dessous
        }
      }
      if (Capacitor.getPlatform() === "android") {
        const wallpaperColor = await getWallpaperSeedColor();
        if (wallpaperColor) {
          applyThemeFromSeedColor(wallpaperColor, dark);
          setSeedColor(wallpaperColor);
          setSeedFollowsWallpaper(true);
          return;
        }
      }
      const fallbackSeed = profile?.theme_seed_color ?? DEFAULT_SEED_COLOR;
      applyThemeFromSeedColor(fallbackSeed, dark);
      setSeedColor(fallbackSeed);
      setSeedFollowsWallpaper(false);
    } finally {
      // Les variables CSS ne sont posées qu'ici (fin réelle de l'application,
      // pas au déclenchement) : c'est le seul moment sûr pour dire à
      // WidgetSync.tsx de les relire.
      setThemeVersion((v) => v + 1);
    }
  }

  useEffect(() => {
    applyTheme();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, profile?.theme_image_url, profile?.theme_seed_color]);

  useEffect(() => watchSystemThemeChanges(() => mode === "system" && applyTheme()), [mode]);

  async function setThemeImageUrl(url: string | null) {
    if (!user) return;
    let seedColor: string | null = null;
    if (url) {
      try {
        seedColor = await applyThemeFromImageUrl(url, resolveDark(mode));
      } catch {
        // ignore, on enregistre quand même l'URL
      }
    }
    await supabase.from("profiles").update({ theme_image_url: url, theme_seed_color: seedColor }).eq("id", user.id);
    await refreshProfile();
  }

  return (
    <ThemeModeContext.Provider value={{ mode, setMode, setThemeImageUrl, themeVersion, seedColor, seedFollowsWallpaper }}>
      {children}
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode() {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) throw new Error("useThemeMode doit être utilisé dans ThemeModeProvider");
  return ctx;
}
