import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { supabase } from "./supabase";

export const NATIVE_AUTH_REDIRECT_URL = "io.karelisio.orbit://login-callback";

/**
 * Capte le lien magique de connexion reçu par e-mail (voir AuthContext.tsx +
 * android/.../AndroidManifest.xml pour le schéma "io.karelisio.orbit") pour
 * terminer la connexion sans jamais faire naviguer la WebView hors de l'app.
 */
export function initDeepLinks(): void {
  if (!Capacitor.isNativePlatform()) return;

  App.addListener("appUrlOpen", async ({ url }) => {
    try {
      const parsed = new URL(url);

      // Tap sur une case du widget calendrier (voir OrbitCalendarWidgetProvider.java) :
      // ouvre l'app directement sur ce jour, plutôt que sur l'accueil.
      if (parsed.host === "calendar") {
        const date = parsed.searchParams.get("date");
        if (date) window.location.hash = `#/calendar?date=${date}`;
        return;
      }

      const fragment = parsed.hash.startsWith("#") ? parsed.hash.slice(1) : "";
      const params = new URLSearchParams(fragment || parsed.search);

      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
        return;
      }

      const token_hash = params.get("token_hash");
      const type = params.get("type");
      if (token_hash && type === "magiclink") {
        await supabase.auth.verifyOtp({ token_hash, type: "magiclink" });
      }
    } catch {
      // URL non liée à l'authentification (ou malformée) : on ignore
    }
  });
}
