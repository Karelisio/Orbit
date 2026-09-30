import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { supabase } from "./supabase";
import { parseDateParam } from "./localDate";

export const NATIVE_AUTH_REDIRECT_URL = "io.karelisio.orbit://login-callback";

// ---------------------------------------------------------------------------
// Connexion par lien magique (flux PKCE, voir lib/supabase.ts)
// ---------------------------------------------------------------------------

const PENDING_LOGIN_KEY = "orbit-pending-login";
const PENDING_LOGIN_MAX_AGE_MS = 60 * 60 * 1000;
const USED_AUTH_LINK_KEY = "orbit-used-auth-link";

const LINK_FROM_ANOTHER_DEVICE =
  "Ce lien ne fonctionne que sur le téléphone qui l'a demandé (ou il a expiré). Redemande un lien depuis ce téléphone.";
const LINK_EXPIRED = "Ce lien a expiré ou a déjà servi. Redemande un lien depuis ce téléphone.";
const LINK_OUTDATED = "Ce lien de connexion n'est plus accepté. Redemande un lien depuis ce téléphone.";

/** Note qu'un lien magique vient d'être demandé depuis cet appareil (voir la branche token_hash de handleAuthCallback). */
export function markPendingLogin(): void {
  try {
    localStorage.setItem(PENDING_LOGIN_KEY, JSON.stringify({ at: Date.now() }));
  } catch {
    // stockage indisponible : seul le lien PKCE (code) restera accepté
  }
}

export function clearPendingLogin(): void {
  try {
    localStorage.removeItem(PENDING_LOGIN_KEY);
  } catch {
    // rien à faire
  }
}

function hasRecentPendingLogin(): boolean {
  try {
    const raw = localStorage.getItem(PENDING_LOGIN_KEY);
    if (!raw) return false;
    const { at } = JSON.parse(raw) as { at?: unknown };
    const age = typeof at === "number" ? Date.now() - at : -1;
    return age >= 0 && age < PENDING_LOGIN_MAX_AGE_MS;
  } catch {
    return false;
  }
}

/**
 * Message à afficher sur l'écran de connexion (lien ouvert sur un autre
 * téléphone, expiré...). Gardé ici plutôt que dans AuthContext : un lien peut
 * arriver avant même le montage de React (démarrage à froid, getLaunchUrl).
 */
let authLinkError: string | null = null;
const authLinkErrorListeners = new Set<(message: string | null) => void>();

function setAuthLinkError(message: string | null): void {
  authLinkError = message;
  for (const listener of authLinkErrorListeners) listener(message);
}

export function getAuthLinkError(): string | null {
  return authLinkError;
}

export function clearAuthLinkError(): void {
  setAuthLinkError(null);
}

export function subscribeAuthLinkError(listener: (message: string | null) => void): () => void {
  authLinkErrorListeners.add(listener);
  return () => {
    authLinkErrorListeners.delete(listener);
  };
}

/**
 * Codes/jetons à usage unique déjà traités (ou en cours) : getLaunchUrl()
 * renvoie la même URL de lancement pendant toute la vie de l'activité
 * (rechargement de la page compris), et appUrlOpen peut livrer le même lien
 * en parallèle. Rejouer un code déjà échangé afficherait une erreur alors
 * que la connexion a réussi.
 */
const inFlightCredentials = new Set<string>();

function alreadyUsed(credential: string): boolean {
  if (inFlightCredentials.has(credential)) return true;
  try {
    return localStorage.getItem(USED_AUTH_LINK_KEY) === credential;
  } catch {
    return false;
  }
}

function markUsed(credential: string): void {
  try {
    localStorage.setItem(USED_AUTH_LINK_KEY, credential);
  } catch {
    // au pire, un rechargement réafficherait une erreur sans conséquence
  }
}

async function consumeCredentialOnce(credential: string, run: () => Promise<{ error: unknown }>): Promise<void> {
  if (alreadyUsed(credential)) return;
  inFlightCredentials.add(credential);
  try {
    const { error } = await run();
    if (error) return;
    markUsed(credential);
    clearPendingLogin();
    setAuthLinkError(null);
  } finally {
    inFlightCredentials.delete(credential);
  }
}

/**
 * Retour du lien magique (io.karelisio.orbit://login-callback...). Seuls les
 * liens qui prouvent qu'ils ont été demandés depuis CE téléphone connectent :
 * - `code` (flux PKCE) : échangé contre une session avec le vérificateur
 *   gardé localement au moment de la demande — ouvert sur un autre appareil
 *   (ou intercepté), il échoue ;
 * - `token_hash` (modèle d'e-mail personnalisé) : accepté seulement si ce
 *   téléphone a demandé un lien il y a moins d'une heure ;
 * - jetons de session bruts (`access_token`/`refresh_token`, fragment ou
 *   paramètres) : plus jamais acceptés. N'importe quel lien forgé pouvait
 *   sinon connecter l'app au compte de quelqu'un d'autre (injection de
 *   session) ; seuls d'anciens liens (flux implicite, demandés avant cette
 *   version) en portent encore.
 */
async function handleAuthCallback(parsed: URL): Promise<void> {
  const fragment = new URLSearchParams(parsed.hash.startsWith("#") ? parsed.hash.slice(1) : "");
  const param = (name: string) => parsed.searchParams.get(name) ?? fragment.get(name);

  // Lien refusé par Supabase (expiré, déjà utilisé...) : l'erreur revient dans l'URL.
  if (param("error") || param("error_code")) {
    setAuthLinkError(LINK_EXPIRED);
    return;
  }

  const code = parsed.searchParams.get("code");
  if (code) {
    await consumeCredentialOnce(code, async () => {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) setAuthLinkError(LINK_FROM_ANOTHER_DEVICE);
      return { error };
    });
    return;
  }

  const tokenHash = param("token_hash");
  const type = param("type");
  if (tokenHash && (type === "magiclink" || type === "email")) {
    if (!hasRecentPendingLogin()) return;
    await consumeCredentialOnce(tokenHash, async () => {
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
      if (error) setAuthLinkError(LINK_EXPIRED);
      return { error };
    });
    return;
  }

  if (param("access_token") || param("refresh_token")) setAuthLinkError(LINK_OUTDATED);
}

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
      // Date validée ici (et à nouveau par Calendar.tsx) : une date
      // invalide ouvrait l'écran d'erreur au lieu du calendrier.
      const date = parseDateParam(parsed.searchParams.get("date"));
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

    if (parsed.host === "login-callback") await handleAuthCallback(parsed);
  } catch {
    // URL malformée (ou échec réseau inattendu) : on ignore
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
