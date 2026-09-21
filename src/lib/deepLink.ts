import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { supabase } from "./supabase";

export const NATIVE_AUTH_REDIRECT_URL = "io.karelisio.orbit://login-callback";

/**
 * Traite un lien "io.karelisio.orbit://..." : tap sur une case du widget
 * calendrier, ou lien magique de connexion reçu par e-mail (voir
 * AuthContext.tsx + android/.../AndroidManifest.xml pour le schéma).
 */
async function handleUrl(url: string): Promise<void> {
  try {
    const parsed = new URL(url);

    // Tap sur une case du widget calendrier (voir OrbitCalendarWidgetProvider.java) :
    // ouvre l'app directement sur ce jour, plutôt que sur l'accueil.
    if (parsed.host === "calendar") {
      const date = parsed.searchParams.get("date");
      if (date) {
        window.location.hash = `#/calendar?date=${date}`;
        // HashRouter (react-router-dom) ne se resynchronise que sur
        // l'événement "popstate", jamais sur "hashchange" — que déclenche
        // seule une affectation directe de location.hash. Sans ce
        // popstate manuel, le routeur ignore complètement le changement
        // quand l'app tournait déjà (l'URL change, mais Calendar.tsx ne
        // voit jamais le nouveau "date", et reste affiché sur aujourd'hui).
        window.dispatchEvent(new PopStateEvent("popstate"));
      }
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
}

export function initDeepLinks(): void {
  if (!Capacitor.isNativePlatform()) return;

  // Deux chemins, et il faut les deux : le plugin App de Capacitor n'émet
  // "appUrlOpen" que depuis onNewIntent, c'est-à-dire uniquement quand
  // l'app tournait DÉJÀ. Sur un démarrage à froid (app fermée, le cas le
  // plus courant depuis l'écran d'accueil), l'intent de lancement n'est
  // lisible que via getLaunchUrl() — sans ça le lien était simplement
  // perdu, et taper un jour du widget ouvrait l'app sur l'accueil.
  App.addListener("appUrlOpen", ({ url }) => {
    void handleUrl(url);
  });

  void App.getLaunchUrl()
    .then((result) => {
      if (result?.url) void handleUrl(result.url);
    })
    .catch(() => {
      // pas d'URL de lancement : démarrage normal
    });
}
