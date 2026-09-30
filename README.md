# Orbit

Calendrier de couple : événements partagés, tâches, budget, journal et un
mini-widget de cycle (lecture seule, synchronisé avec l'app **Wenn**). Deux
comptes liés, synchronisation en temps réel via Supabase Realtime, empaqueté
en app Android avec Capacitor.

## Stack

- React + TypeScript + Vite, `HashRouter` (nécessaire pour Capacitor : pas de
  serveur pour gérer les routes côté fichier `file://`).
- Capacitor 7 (Android + iOS). Android est la plateforme visée en priorité.
- Supabase : Postgres + Auth (lien magique) + Realtime + Storage — **le même
  projet Supabase que l'app Wenn** (voir plus bas).
- `@capacitor/local-notifications` pour les rappels d'événements, fiables même
  app fermée (AlarmManager natif, pas un timer JS).
- Material Design 3 / Material You (thème dynamique à partir du fond d'écran
  Android, ou d'une image choisie sur iOS/web).
- CI/CD : GitHub Actions build + signe l'APK à chaque push sur `main`, puis
  publie une Release GitHub taguée (voir plus bas).

## Repo map

```
src/
  context/     AuthContext (session Supabase, lien magique PKCE),
               CoupleContext (lien de couple, réutilise la table "couples"
               de Wenn), ThemeModeContext, PreferencesContext (préférences
               par appareil : sections d'accueil, onglets, règles dans le
               calendrier et le widget, texte des widgets, couleurs)
  hooks/       useRealtimeCollection (fetch paginé + sync temps réel
               générique, écritures optimistes annulées en cas d'échec),
               useEvents, useTasks, useJournal, useExpenses,
               useEventCategories, useCycleDays (lecture seule de
               cycle_days, source unique), useCycleStatus (widget de
               l'accueil), useCyclePeriodDays (overlay calendrier et widget)
  pages/       Home (dashboard), Calendar, Tasks, Budget, Journal, Settings,
               Login, Onboarding
  components/  BottomNav, TogetherCounter, CycleWidget, EventSheet,
               TaskSheet, ExpenseSheet, Toast, WidgetSync (pousse les
               données vers les widgets Android)
  lib/         supabase (+ paging), materialYou, dynamicColor, wallpaperColor,
               notifications, cyclePredictions (prédiction et phase, adapté
               de Wenn), balances (budget partagé, en centimes),
               taskRecurrence, togetherSince, widgetSync + widgetLabels,
               localData, localDate, optimistic, toast, appUpdate (mise à
               jour in-app), crashLog, deepLink

android/app/src/main/java/io/karelisio/orbit/
  MainActivity.java              enregistre les plugins Capacitor custom
  DynamicColorPlugin.java        couleurs système dynamiques (Android 12+)
  WallpaperColorPlugin.java      couleur dominante du fond d'écran (avant Android 12)
  ApkInstallerPlugin.java        lance l'installeur système pour l'APK téléchargé
  CrashLogPlugin.java            garde la dernière fermeture brutale (Réglages)
  WidgetDataPlugin.java          pont JS -> widgets (SharedPreferences + refresh)
  OrbitWidgetPrefs.java          clés SharedPreferences partagées
  OrbitWidgetTheme.java          couleurs et taille du texte des widgets
  OrbitWidgetLabels.java         libellés relatifs recalculés à chaque rendu
  OrbitCalendarWidgetProvider.java  widget mini calendrier du mois
  OrbitTasksWidgetProvider.java     widget "tâches en attente"
  OrbitCombinedWidgetProvider.java  widget "Fusion" : événement + tâches + journal
  OrbitJournalWidgetProvider.java   widget dernière note du journal

supabase/schema.sql   tables propres à Orbit (additif à celui de Wenn, voir plus bas)
```

## Widgets Android (quatre, au choix dans le sélecteur de widgets)

Calendrier, Tâches, Fusion (événement + tâches + journal) et Journal lisent
les mêmes `SharedPreferences` (`OrbitWidgetPrefs`), écrites par
`WidgetDataPlugin.update()` côté natif, appelé depuis `WidgetSync.tsx`
(monté dans `AppShell`) à chaque changement de données. Le widget
"Calendrier" construit une vraie mini-grille du mois en vues natives (une
case par jour : jour du jour surligné, pastilles d'événements, points de
tâches et de règles — plein si enregistrées, contour si prévues). Les
libellés relatifs (« Demain à 10:00 », « Hier ») sont recalculés à chaque
rendu à partir de dates absolues (`OrbitWidgetLabels`). Toute nouvelle
donnée à exposer à un widget suit le même chemin que sur Wenn : calculer
dans `WidgetSync.tsx` → ajouter un champ à `WidgetDataPlugin.update()`
(JS + Java) → lire depuis `SharedPreferences` dans le(s)
`AppWidgetProvider`.

## Mise à jour in-app

`Réglages → Mises à jour` vérifie la dernière Release GitHub du dépôt Orbit
et propose de l'installer directement (même mécanisme CORS/`CapacitorHttp`
que sur Wenn, voir `src/lib/appUpdate.ts`).

## Connexion au projet Supabase partagé avec Wenn — IMPORTANT

Orbit **n'a pas son propre projet Supabase** : il utilise exactement celui de
Wenn, pour que le widget de cycle lise les vraies données sans duplication de
saisie, et pour que les deux comptes du couple soient les mêmes des deux côtés.

- `profiles`, `couples`, `cycle_days`, `partner_notes` sont déjà créées par
  `supabase/schema.sql` de **Wenn** — Orbit ne les recrée pas.
- Le **lien de couple lui-même** (deux comptes liés par un code d'invitation)
  réutilise directement la table `couples` de Wenn plutôt que d'implémenter un
  second système d'invitation redondant : si le couple est déjà lié dans Wenn,
  il l'est automatiquement dans Orbit (même compte Supabase Auth).
- Le widget de cycle d'Orbit lit `cycle_days` en **lecture seule** (mêmes
  policies RLS "select member" que Wenn) — Orbit n'y écrit jamais.
- `supabase/schema.sql` d'Orbit n'ajoute que les cinq tables propres à
  Orbit (`orbit_events`, `orbit_event_categories`, `orbit_tasks`,
  `orbit_journal_entries`, `orbit_expenses`), une colonne additive sur
  `couples` (`together_since`, pour le compteur "jours ensemble") et la
  fonction `set_together_since`. Le fichier se rejoue sans erreur (policies
  et publication realtime idempotentes).

**Procédure** (à faire une fois, sur le projet Supabase existant, dans le SQL
Editor) : coller le contenu de `supabase/schema.sql` de ce dépôt. Comme pour
Wenn, toute évolution future de ce schéma s'ajoutera en fin de fichier comme
bloc `alter table ... add column if not exists ...` séparé — jamais rejouer
tout le fichier sur un projet déjà déployé.

### Lien magique de connexion — étape manuelle indispensable

Orbit et Wenn partagent le même projet Supabase, donc le même "Site URL" par
défaut (celui de Wenn, `https://wenn-five.vercel.app`). Sans configuration
supplémentaire, le lien magique envoyé par e-mail depuis Orbit rouvre donc
**l'app Wenn** (via son App Link Android) au lieu d'Orbit.

Pour corriger ça, Orbit envoie `io.karelisio.orbit://login-callback` comme
`emailRedirectTo` sur mobile (voir `src/context/AuthContext.tsx` +
`src/lib/deepLink.ts` + le schéma déclaré dans
`android/app/src/main/AndroidManifest.xml`) — mais Supabase n'accepte un
`emailRedirectTo` que s'il figure dans sa liste blanche. **Étape à faire une
fois, dans le dashboard Supabase :** Authentication → URL Configuration →
Redirect URLs → ajouter `io.karelisio.orbit://login-callback`. Ça n'affecte
en rien la configuration existante de Wenn (liste additive).

La connexion utilise le flux PKCE (`src/lib/supabase.ts`) : le lien reçu
ne fonctionne que sur l'appareil qui l'a demandé (il faut l'ouvrir depuis
l'appli mail de ce téléphone), et l'app n'accepte jamais de jetons de
session bruts dans une URL (`src/lib/deepLink.ts`).

### Variables d'environnement

Copie `.env.example` en `.env`. Les valeurs par défaut pointent déjà vers le
projet Supabase partagé avec Wenn (`VITE_SUPABASE_ANON_KEY` est la clé
publique/anon, faite pour être embarquée côté client — la sécurité vient des
policies RLS, pas du secret de cette clé).

## Développement

```bash
npm install
cp .env.example .env   # si pas déjà fait
npm run dev
```

```bash
npm run build       # build web (tsc + vite)
npm run cap:sync    # copie le build dans android/ et synchronise les plugins
npm run check       # types + tests de la logique pure (soldes, prédiction et phase
                    # du cycle, occurrences d'événements, récurrence des tâches,
                    # libellés des widgets...) — nécessite Node 22+ ; à lancer
                    # aussi avec TZ=Europe/Paris et TZ=America/Montreal
```

`scripts/smoke-test.ts` fige notamment le **sens du solde du budget** (qui doit
combien à qui) : une inversion de signe y est passée inaperçue une fois, le test
sert de garde-fou.

## CI/CD & signature Android

Le workflow `.github/workflows/build-android.yml`, à chaque push sur `main`
(une exécution à la fois) :
1. calcule la prochaine version (dernier tag `vX.Y.Z` + 1 patch, sans rien
   pousser) ; `versionCode` = X × 1 000 000 + Y × 1 000 + Z,
2. extrait les notes de la section `## Non publié` de `CHANGELOG.md`
   (`scripts/archive-changelog.cjs notes`, « Corrections et améliorations
   internes. » si elle est vide),
3. `npm run check` (types + tests, Node 22), build du frontend React
   (secrets `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`), `npx cap sync android`,
4. s'arrête avec un message clair si un secret de signature manque (sinon
   Gradle produirait un APK non signé), décode `ANDROID_KEYSTORE_BASE64` et
   build l'APK release signé (`ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`,
   `ANDROID_KEY_PASSWORD`), publié aussi en artifact GitHub Actions,
5. seulement alors, crée la Release GitHub et son tag sur le commit construit,
   avec ces notes (affichées dans Réglages > Mises à jour côté app),
6. archive `## Non publié` sous `## vX.Y.Z — DATE` et repousse ce commit
   « Changelog : vX.Y.Z » sur `main` (refait sur la pointe de `main` si elle a
   bougé entre-temps).

Un build raté ne laisse ni tag ni notes archivées. Lancé sur une autre
branche (workflow_dispatch), il ne fait que construire l'APK (versionName
`X.Y.Z-dev.<sha>`), sans tag, release ni push. Un tag `v*` poussé à la main
publie la Release de ce tag, sans archivage.

**Avant de commiter un changement visible par l'utilisatrice**, ajouter une
puce sous `## Non publié` dans `CHANGELOG.md`. Comme la CI repousse un commit
sur `main` après chaque release, penser à `git fetch origin main` avant tout
nouveau push sur `main` dans la même session pour éviter un conflit sur ce
fichier (même piège que sur Wenn).

### Générer le keystore de signature (une fois)

```bash
keytool -genkeypair -v -keystore orbit-release.keystore \
  -alias orbit -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 orbit-release.keystore > orbit-release.keystore.base64
```

### Secrets GitHub à configurer (Settings → Secrets and variables → Actions)

| Secret | Description |
| --- | --- |
| `VITE_SUPABASE_URL` | URL du projet Supabase partagé |
| `VITE_SUPABASE_ANON_KEY` | Clé anon/publique du projet Supabase partagé |
| `ANDROID_KEYSTORE_BASE64` | Contenu de `orbit-release.keystore.base64` |
| `ANDROID_KEYSTORE_PASSWORD` | Mot de passe du keystore |
| `ANDROID_KEY_ALIAS` | Alias de la clé (`orbit` dans l'exemple ci-dessus) |
| `ANDROID_KEY_PASSWORD` | Mot de passe de la clé |

Garder le même keystore entre les versions est indispensable pour que les
mises à jour s'installent sans désinstallation préalable.

## Modèle de données / comptes

- Authentification : lien magique par e-mail (même mécanisme que Wenn), sur
  les mêmes comptes Supabase Auth.
- Couple : partage **total et symétrique** — les deux membres peuvent créer,
  modifier ou supprimer n'importe quel événement/tâche/dépense/note (RLS
  Postgres l'autorise pour les deux `owner_id` et `partner_id` de la table
  `couples`), contrairement à Wenn où seule la titulaire écrit les données
  de cycle.
- Conflits de sync : dernière écriture gagnante (`updated_at` maintenu par
  trigger), combinée à la synchronisation Supabase Realtime qui pousse chaque
  changement aux deux appareils quasi instantanément — la fenêtre de conflit
  réel est donc très courte, ce qui est suffisant pour un usage à deux
  personnes (pas de fusion à trois voies).
- Rappels d'événements : jusqu'à plusieurs rappels par événement (15 min / 1 h
  / 1 jour avant, ou personnalisés), notifications locales natives que
  chaque téléphone resynchronise sur la liste partagée à chaque changement
  (y compris ceux faits par l'autre), anniversaires compris.
