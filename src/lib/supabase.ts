import { createClient } from "@supabase/supabase-js";

// Lecture paginée (plafond de 1000 lignes de PostgREST) : module séparé,
// sans dépendance au client, pour rester testable (scripts/smoke-test.ts).
export { fetchAllRows } from "./paging";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.error(
    "Configuration Supabase manquante. Renseigne VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans un fichier .env (voir .env.example) — Orbit utilise le même projet Supabase que Wenn."
  );
}

export const supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "", {
  auth: {
    // Flux PKCE pour le lien magique : le lien ne contient plus qu'un code,
    // échangeable seulement avec le vérificateur gardé sur l'appareil qui a
    // demandé le lien (voir deepLink.ts) — plus de jetons de session en
    // clair dans une URL, ni de lien forgé qui connecterait l'app au compte
    // de quelqu'un d'autre. Les sessions déjà ouvertes ne sont pas touchées.
    flowType: "pkce",
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
