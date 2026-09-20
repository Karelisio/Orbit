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
}

const ThemeModeContext = createContext<ThemeModeContextValue | undefined>(undefined);

function resolveDark(mode: ThemeMode): boolean | undefined {
  if (mode === "system") return undefined;
  return mode === "dark";
}

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const { user, profile, refreshProfile } = useAuth();
  const [mode, setModeState] = useState<ThemeMode>(() => (localStorage.getItem("orbit-theme-mode") as ThemeMode) || "system");

  function setMode(next: ThemeMode) {
    setModeState(next);
    localStorage.setItem("orbit-theme-mode", next);
  }

  async function applyTheme() {
    const dark = resolveDark(mode);
    if (profile?.theme_image_url) {
      try {
        await applyThemeFromImageUrl(profile.theme_image_url, dark);
        return;
      } catch {
        // image invalide/inaccessible : on retombe sur la couleur de secours ci-dessous
      }
    }
    if (Capacitor.getPlatform() === "android") {
      const wallpaperColor = await getWallpaperSeedColor();
      if (wallpaperColor) {
        applyThemeFromSeedColor(wallpaperColor, dark);
        return;
      }
    }
    applyThemeFromSeedColor(profile?.theme_seed_color ?? DEFAULT_SEED_COLOR, dark);
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

  return <ThemeModeContext.Provider value={{ mode, setMode, setThemeImageUrl }}>{children}</ThemeModeContext.Provider>;
}

export function useThemeMode() {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) throw new Error("useThemeMode doit être utilisé dans ThemeModeProvider");
  return ctx;
}
