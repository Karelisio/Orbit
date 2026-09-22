# Orbit — mémo pour Claude

App calendrier de couple (mode Duo uniquement, pas de mode Solo), pour un
couple réel : l'utilisateur et sa copine. Utilisateur non technique : il
relaie des retours/screenshots de sa copine, teste peu lui-même. **Toujours
répondre en français, court et direct.**

## Stack

- React + TypeScript + Vite, `HashRouter` (nécessaire pour Capacitor : pas de
  serveur pour gérer les routes côté fichier `file://`).
- Capacitor 7 (Android + iOS). Android est la plateforme réellement utilisée
  et testée ; iOS compile mais n'est quasiment jamais vérifié.
- Supabase : Postgres + Auth (lien magique) + Realtime + Storage — **projet
  partagé avec Wenn** (app de suivi de cycle de la copine), même `couples`
  et même code d'invitation des deux côtés.
- Material Design 3 / Material You (thème dynamique à partir du fond d'écran
  Android, ou d'une image choisie sur iOS/web).
- CI/CD : GitHub Actions build + signe l'APK, auto-tag et release à chaque
  push sur `main` (workflow `build-android.yml`).

## Repo map

```
src/
  context/       AuthContext, CoupleContext (couple lié, rôle owner/partner),
                 ThemeModeContext (clair/sombre/système), PreferencesContext
                 (réglages par appareil, localStorage : sections visibles,
                 onglets, règles dans calendrier/widget...)
  pages/         Home, Calendar, Tasks, Budget, Journal, Settings, Login,
                 Onboarding
  components/    EventSheet/ExpenseSheet (saisie), BottomNav, WidgetSync
                 (pousse les données vers les widgets Android), CycleWidget
                 (résumé du cycle de la copine, lu depuis Wenn), OrbitLogo
  hooks/         useEvents, useTasks, useExpenses, useJournal,
                 useEventCategories, useCyclePeriodDays (règles Wenn),
                 useRealtimeCollection (base commune Supabase Realtime)
  lib/           balances (calcul du solde du budget partagé), cyclePredictions
                 (prédiction règles, lu depuis les données Wenn),
                 deepLink (liens io.karelisio.orbit://...), notifications
                 (rappels d'événements), widgetSync, materialYou,
                 wallpaperColor, appUpdate, crashLog, supabase
  types/index.ts Types + constantes partagées

android/app/src/main/java/io/karelisio/orbit/
  MainActivity.java              enregistre les plugins Capacitor custom
  WidgetDataPlugin.java          pont JS -> widgets (SharedPreferences + refresh)
  OrbitCalendarWidgetProvider.java  widget mini-calendrier du mois
  OrbitTasksWidgetProvider.java     widget tâches en attente
  OrbitCombinedWidgetProvider.java  widget fusion calendrier + tâches
  OrbitWidgetPrefs.java / OrbitWidgetTheme.java  clés partagées + thème Material You des widgets
  CrashLogPlugin.java            capture les fermetures brutales de l'app (voir plus bas)
  ApkInstallerPlugin.java        lance l'installeur système pour l'APK téléchargé
  WallpaperColorPlugin.java      lit la couleur dominante du fond d'écran (thème)

supabase/schema.sql   schéma complet + policies RLS + migrations additives en fin de fichier
CHANGELOG.md           source des notes de version (voir workflow ci-dessous)
```

## Modèle de données / comptes

- **Duo uniquement** : deux comptes Supabase liés par un code d'invitation
  (le même que côté Wenn). La **titulaire** (`owner`, la copine) et le
  **partenaire** (`partner`, l'utilisateur) partagent événements, tâches,
  budget et journal.
- `OrbitEvent` : titre, dates début/fin, `all_day`, catégorie (personnalisable
  à la volée), assignation (Ensemble / Moi / Partenaire → couleur fixe par
  personne), `reminder_minutes_before[]` (rappels multiples possibles).
  Les événements "Anniversaire" (ou avec récurrence annuelle activée)
  comptent chaque année sans recréation (voir `nextEventOccurrence`/
  `eventOccursOnDay` dans `types/index.ts`).
- Budget partagé : dépenses assignées, solde calculé par `lib/balances.ts`
  (qui doit combien à qui).
- Le cycle/règles de la copine (widget "Orbite", pastilles dans le calendrier
  et le widget) est **lu depuis les tables Wenn** du même projet Supabase —
  Orbit n'écrit jamais ces données, seulement `useCyclePeriodDays`/
  `cyclePredictions.ts` les consomment en lecture, désactivable dans Réglages
  (calendrier et widget ont chacun leur propre interrupteur).

## Widgets Android (trois, au choix dans le sélecteur de widgets)

Tous lisent les mêmes `SharedPreferences` (`OrbitWidgetPrefs`), écrites par
`WidgetDataPlugin.update()` côté natif, appelé depuis `WidgetSync.tsx`
(monté globalement) à chaque changement de données. Toute nouvelle donnée à
exposer à un widget suit ce chemin : calculer dans `WidgetSync.tsx` →
ajouter un champ à `WidgetDataPlugin.update()` (JS + Java) → lire depuis
`SharedPreferences` dans le(s) `AppWidgetProvider`.

**Important — un rendu de widget qui plante emporte toute l'app** :
`AppWidgetProvider.onUpdate()`/`refreshAll()` tournent dans le processus de
l'app, pas un processus séparé. Toute erreur non rattrapée pendant la
construction des `RemoteViews` ferme donc Orbit entièrement, sans dialogue
ni accès facile au logcat depuis cet environnement. **Chaque appel de mise à
jour d'un widget doit être enveloppé `try { ... } catch (Throwable ignored)`**
(pas seulement `Exception`, pour attraper aussi `OutOfMemoryError`). En
complément, `CrashLogPlugin` capture toute fermeture brutale malgré tout
(installé en tout premier dans `MainActivity.onCreate`, avant les autres
plugins) et l'affiche dans Réglages au redémarrage — c'est le seul moyen de
diagnostiquer un crash sans accès à l'appareil.

Le fond en dégradé des widgets est monté en **deux couches** par
`OrbitWidgetTheme.applyTileBackground()`, sur une `ImageView` dédiée
(`widget_bg`) : une base unie (`widget_background_solid`) teintée avec le
`primary-container` poussé par l'app, plus un voile en dégradé translucide
(`widget_sheen`, variante `drawable-night/`) posé dessus en image. Deux
couches parce qu'un `GradientDrawable` multi-stops ne peut pas être teint (le
tint l'aplatit en une couleur unie) — et **ne jamais revenir à
`@android:color/system_accent1_*`** : cette palette suit le thème du
constructeur (HyperOS…) et divergeait visiblement de celle que l'app tire du
fond d'écran (widget marron, app violette).

**Clair/sombre d'un widget = mode nuit du lanceur, pas le thème choisi dans
Orbit.** L'app pousse la palette dans ses DEUX variantes (`WidgetSync.tsx` →
`widgetPalettesFromSeed()`, clés suffixées `_dark`), et chaque couleur est
posée avec les deux valeurs à la fois : `RemoteViews.setColorInt(vue,
méthode, clair, sombre)` et `setColorStateList(vue, méthode, clair, sombre)`
(API 31+), plus les qualificatifs `drawable-night/` pour le voile. Android
choisit alors lui-même **et refait ce choix au basculement**, sans que l'app
tourne — sinon un widget reste figé sur le mode actif au dernier lancement
de l'app. Fond, texte et pastilles viennent donc tous de la même décision :
jamais de widget mi-clair mi-sombre (le bug d'illisibilité d'origine venait
précisément de deux sources différentes). Un changement de **fond d'écran**
reste le seul cas qui demande d'ouvrir l'app une fois : la palette est
calculée en JS par `material-color-utilities`, impossible à refaire côté
natif sans réimplémenter tout l'algorithme M3.

Les éléments à couleur unie (pastille du jour, pastille d'événement,
quadrillage) sont teintés via les helpers de rôle de `OrbitWidgetTheme`
(`tintPrimary()`, `textOnSurface()`…, `setBackgroundTintList`, API 31+
seulement) — mais un `<shape>` sans
`<solid>` (contour seul) se remplit entièrement d'une couleur opaque par
défaut dès qu'un tint lui est appliqué (bug connu de `GradientDrawable`) :
toujours donner un `<solid>` explicite, même très translucide, à un drawable
qu'on compte teindre.

**Taille d'un widget** (`res/xml/widget_*_info.xml`) — deux règles se
cumulent, et il faut que les DEUX disent la même chose :
- `targetCellWidth`/`targetCellHeight` (Android 12+), ce que les lanceurs
  récents utilisent en priorité ;
- `minWidth`/`minHeight`, le repli, qu'Android convertit en cases avec
  `70 × cases − 30` dp → **40dp = 1 ligne, 110dp = 2, 180dp = 3**. Une
  valeur "raisonnable" comme 120dp réclame donc 3 lignes entières, d'où une
  tuile énorme avec un grand vide sous le texte.

Ne jamais mettre de `maxResizeWidth`/`maxResizeHeight` en dessous de la
taille réellement posée : le lanceur n'a alors aucune plage valide et
désactive complètement les poignées de redimensionnement.

**Police adaptative (Tâches, Fusion, Journal)** : les tailles `sp` en dur
dans les layouts sont calées pour la hauteur minimale (1 ligne). Comme un
lanceur peut accorder une tuile bien plus haute (grille plus grossière, ou
redimensionnement à la main), `OrbitWidgetTheme.heightScale()` compare la
hauteur réellement accordée (`AppWidgetManager.getAppWidgetOptions()` →
`OPTION_APPWIDGET_MIN_HEIGHT`) à cette hauteur minimale déclarée dans le
`_info.xml`, et `scaleText()` multiplie chaque taille de base par ce
facteur (`RemoteViews.setTextViewTextSize`, plafonné à ×1.6 pour ne pas
déborder). Ces trois providers implémentent aussi
`onAppWidgetOptionsChanged()` (rappelle simplement `updateWidget()`) pour
réappliquer l'échelle en direct pendant un redimensionnement, pas
seulement à la prochaine donnée poussée. Le widget Calendrier n'est pas
concerné : sa grille a une structure différente (cases fixes).

Tap sur une case du widget calendrier → ouvre directement l'app sur ce jour
via le schéma personnalisé `io.karelisio.orbit://calendar?date=...` (voir
`deepLink.ts` + intent-filter dédié dans `AndroidManifest.xml`, même
mécanisme que le lien magique de connexion). Deux pièges déjà corrigés, à
ne pas régresser :
- le plugin `App` de Capacitor n'émet `appUrlOpen` que depuis
  `onNewIntent`, donc **uniquement si l'app tournait déjà**. Un démarrage à
  froid n'est visible que via `App.getLaunchUrl()` — `initDeepLinks()` doit
  traiter les deux, sinon le lien est perdu et l'app s'ouvre sur l'accueil ;
- `HashRouter` n'écoute que `popstate`, jamais `hashchange` : après une
  affectation directe de `window.location.hash`, il faut un
  `window.dispatchEvent(new PopStateEvent("popstate"))` manuel, sinon le
  routeur ignore le changement quand l'app tourne déjà.

**Grille du widget Calendrier sur plusieurs mois** : `WidgetSync.tsx` pousse
`eventsCsv`/`periodDaysCsv`/`taskDaysCsv` (clés `OrbitWidgetPrefs.KEY_*_CSV`)
avec des **dates absolues** (`aaaa-mm-jj`, pas un simple numéro de jour), sur
une fenêtre glissante (mois courant + `WIDGET_MONTHS_AHEAD` mois à venir,
12 par défaut) — jamais les mois passés, hors périmètre. Un point "tâche"
(couleur primaire de l'app, `widget_task_dot.xml`) s'ajoute désormais à côté
du point "règles" dans une rangée sous le numéro du jour, pour les jours
ayant au moins une tâche en attente. `OrbitCalendarWidgetProvider` ne
construit toujours les `RemoteViews` que pour **un seul mois à la fois**
(celui affiché, via `offset`) : `parseEvents`/`parseDayList` filtrent les
CSV par préfixe `aaaa-mm` avant de les ré-indexer par numéro de jour — seul
le stockage couvre plusieurs mois, jamais le rendu. Une catégorie
"Anniversaire" est aussi préfixée `🎂 ` dans le titre de son événement
(même logique côté in-app, `Calendar.tsx`, où elle remplace carrément le
point coloré par un 🎂 — l'ancien "point rouge" pour les anniversaires
n'était qu'une coïncidence : `#b3261e`, la couleur par défaut de la
catégorie, est la même que celle du point "règles").

## Notifications (rappels d'événements)

`lib/notifications.ts` utilise `@capacitor/local-notifications` (natif,
`AlarmManager` côté Android) — pas de `setTimeout` JS, donc en théorie
fiable même app fermée. Deux pièges Android 12+ (targetSdk 35) déjà
rencontrés :
- Déclarer `SCHEDULE_EXACT_ALARM` dans le manifeste ne suffit pas :
  l'utilisatrice doit en plus accorder le réglage système "Alarmes et
  rappels" (`checkExactNotificationSetting`/`changeExactNotificationSetting`
  du plugin). Sans ça, l'alarme devient inexacte et Doze peut la reporter
  jusqu'à la réouverture de l'app — Réglages affiche une carte dédiée tant
  que ce n'est pas accordé.
- L'icône de la notification doit être une **silhouette blanche plate**
  (`smallIcon` dans `capacitor.config.ts`, ressource `drawable/ic_stat_*`) :
  sans ça, Android retombe sur une icône système générique, jamais sur
  l'icône colorée de l'app (interdite pour une icône de notif).

## Mise à jour in-app — piège CORS déjà résolu, ne pas régresser

`src/lib/appUpdate.ts` télécharge l'APK avec `CapacitorHttp.request()`, **pas**
`fetch()`. Les assets de release GitHub ne renvoient aucun header CORS ; un
`fetch()` dans la WebView Capacitor échoue silencieusement même si la
requête réussit côté réseau. Si un futur refactor réintroduit `fetch()` ici,
le téléchargement recassera.

## Workflow Git/CI — à suivre à chaque changement

La branche de travail est `claude/orbit-couple-calendar-ftaa40`. Le push sur
`main` déclenche le build + un **auto-tag patch** + une **Release GitHub**
(APK signé), en lisant `## Non publié` de `CHANGELOG.md`, en l'archivant
sous `## vX.Y.Z — DATE`, puis en repoussant ce commit directement sur `main`.

1. Avant de commiter un changement visible, ajouter une puce sous
   `## Non publié` dans `CHANGELOG.md`.
2. Commiter, pousser sur la branche de travail (jamais directement sur `main`).
3. Lancer `mcp__github__actions_run_trigger` (`build-android.yml`,
   `ref: claude/orbit-couple-calendar-ftaa40`), attendre ~110s, vérifier le
   run via `mcp__github__actions_list` (`conclusion: success`). Ne jamais
   pousser sur `main` sans ce vert — le code natif Android ne peut pas être
   testé autrement depuis cet environnement.
4. `git fetch origin main`. Si `origin/main` a avancé (commit "Changelog :
   vX.Y.Z" de la CI) : `git merge origin/main --no-edit`, résoudre le
   conflit dans `CHANGELOG.md` en gardant les puces locales de `## Non
   publié` suivies immédiatement du `## vX.Y.Z` entrant, `git add
   CHANGELOG.md && git commit --no-edit`, revalider (`npx tsc --noEmit`).
5. Pousser sur la branche de travail **et** sur `main`
   (`git push origin claude/orbit-couple-calendar-ftaa40:main`).

## Style de commit / conventions

- Commits et code sans mention de modèle Claude ; l'attribution va dans les
  lignes `Co-Authored-By`/`Claude-Session` fournies par le système, en fin
  de message.
- Pas de sur-ingénierie : cette app sert un couple, pas un produit à grande
  échelle — préférer la solution la plus directe.
