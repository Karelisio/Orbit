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
  context/       AuthContext (session, lien magique PKCE), CoupleContext
                 (couple lié, rôle owner/partner), ThemeModeContext
                 (clair/sombre/système), PreferencesContext (réglages par
                 appareil, localStorage : sections visibles, onglets, règles
                 dans calendrier/widget, texte des widgets, image de thème ou
                 fond d'écran — monté tout en haut, dans main.tsx)
  pages/         Home, Calendar, Tasks, Budget, Journal, Settings, Login,
                 Onboarding
  components/    EventSheet/TaskSheet/ExpenseSheet (saisie), BottomNav,
                 WidgetSync (pousse les données vers les widgets Android),
                 CycleWidget (résumé du cycle de la copine, lu depuis Wenn),
                 TogetherCounter, Toast (messages courts), OrbitLogo
  hooks/         useEvents, useTasks, useExpenses, useJournal,
                 useEventCategories, useRealtimeCollection (base commune
                 Supabase Realtime), useCycleDays (source unique de
                 cycle_days, Wenn) + useCyclePeriodDays / useCycleStatus
  lib/           balances (solde du budget, en centimes), cyclePredictions
                 (prédiction et phase du cycle, depuis les données Wenn),
                 deepLink (liens io.karelisio.orbit://...), notifications
                 (rappels d'événements), widgetSync + widgetLabels, paging
                 (lecture paginée), optimistic + toast (écritures optimistes
                 annulées), localData (purge locale), localDate,
                 taskRecurrence, togetherSince, materialYou, dynamicColor,
                 wallpaperColor, appUpdate, crashLog, supabase
  types/index.ts Types + constantes partagées (occurrences d'événements...)

android/app/src/main/java/io/karelisio/orbit/
  MainActivity.java              enregistre les plugins Capacitor custom
  WidgetDataPlugin.java          pont JS -> widgets (SharedPreferences + refresh, clear)
  OrbitCalendarWidgetProvider.java  widget mini-calendrier du mois
  OrbitTasksWidgetProvider.java     widget tâches en attente
  OrbitCombinedWidgetProvider.java  widget fusion événement + tâches + journal
  OrbitJournalWidgetProvider.java   widget dernière note du journal
  OrbitWidgetPrefs.java / OrbitWidgetTheme.java  clés partagées + thème Material You des widgets
  OrbitWidgetLabels.java         libellés relatifs (« Demain à 10:00 »...) recalculés à chaque rendu
  DynamicColorPlugin.java        couleurs système dynamiques (Android 12+) pour l'app
  CrashLogPlugin.java            capture les fermetures brutales de l'app (voir plus bas)
  ApkInstallerPlugin.java        lance l'installeur système pour l'APK téléchargé
  WallpaperColorPlugin.java      couleur dominante du fond d'écran (thème, avant Android 12)

supabase/schema.sql   schéma complet + policies RLS + migrations additives en fin de fichier (rejouable)
CHANGELOG.md           source des notes de version (voir workflow ci-dessous)
scripts/               smoke-test.ts (`npm run check`), archive-changelog.cjs (CI)
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
- Les événements « toute la journée » restent « à venir » jusqu'au soir
  (`occurrenceEnd`/`isOccurrenceUpcoming`, accueil et widgets), et non
  jusqu'à leur heure de début (9 h par défaut). Un 29 février annuel tombe
  le 28 les années non bissextiles (`yearlyOccurrence`, commun à
  `nextEventOccurrence` et `eventOccursOnDay`), jamais avant la date
  d'origine. Les rappels visent `nextEventStart` (prochaine occurrence pas
  encore commencée).
- Budget partagé : dépenses assignées, solde calculé par `lib/balances.ts`
  (qui doit combien à qui) en centimes entiers (`toCents`), affiché avec
  `formatEuros` (Intl fr-FR) ; « à jour » sous un centime d'écart.
- Tâches récurrentes : `lib/taskRecurrence.ts` (échéance lue en date
  locale, rattrapage jusqu'à aujourd'hui, jour d'ancrage des mensuelles).
  La colonne FACULTATIVE `orbit_tasks.recurrence_day` garde ce jour d'un
  coche à l'autre (31/01 -> 28/02 -> 31/03) ; elle n'est écrite que si les
  lignes lues la contiennent déjà (migration passée — appliquée sur le
  projet le 2026-09-30, fin de `supabase/schema.sql`), sinon rien ne change.
- Une date « aaaa-mm-jj » se lit TOUJOURS avec `parseISO` (date locale),
  jamais `new Date("aaaa-mm-jj")` : minuit UTC, soit la veille à l'ouest de
  Greenwich. Une date reçue de l'extérieur (lien, URL) passe par
  `parseDateParam` (lib/localDate.ts) avant tout `format()`.
- Le cycle/règles de la copine (widget "Orbite", pastilles dans le calendrier
  et le widget) est **lu depuis les tables Wenn** du même projet Supabase —
  Orbit n'écrit jamais ces données. Source unique `useCycleDays`
  (useRealtimeCollection sur `cycle_days`, colonnes `id, date, flow`
  seulement : temps réel, rechargement au premier plan, cache, lecture
  paginée), consommée par `useCyclePeriodDays` (calendrier, widget ;
  désactivable dans Réglages, chacun son interrupteur) et `useCycleStatus`
  (widget de l'accueil). Phase (`computeCycleStatus`) : « règles » d'après
  les vraies saisies (jour du cycle ≤ durée moyenne des règles, ou vrai
  flux — pas du spotting — saisi aujourd'hui), « retard » si la date prévue
  est passée sans nouvelles règles ; jamais d'après la seule date prédite.
  Règles enregistrées = point plein, seulement prévues = contour (app et
  widget).

## Widgets Android (quatre, au choix dans le sélecteur de widgets : Calendrier, Tâches, Fusion, Journal)

Tous lisent les mêmes `SharedPreferences` (`OrbitWidgetPrefs`), écrites par
`WidgetDataPlugin.update()` côté natif, appelé depuis `WidgetSync.tsx`
(monté globalement) à chaque changement de données. Toute nouvelle donnée à
exposer à un widget suit ce chemin : calculer dans `WidgetSync.tsx` →
ajouter un champ à `WidgetDataPlugin.update()` (JS + Java) → lire depuis
`SharedPreferences` dans le(s) `AppWidgetProvider`.

**Libellés relatifs** (« Demain à 10:00 », « Hier », « Il y a 3 j ») :
jamais calculés une fois pour toutes côté JS (ils restaient figés jusqu'à
la réouverture de l'app). L'app pousse des dates absolues — `nextEventsJson`
(10 prochaines occurrences : titre, début en ms epoch, journée entière) et
`journalCreatedAt` — en chaînes (`PluginCall` ne relit un nombre que selon
son type exact Integer/Long/Double), et `OrbitWidgetLabels` recalcule à
chaque rendu, avec les mêmes formulations que `lib/widgetLabels.ts` (à
garder alignées) ; le widget Fusion passe seul à l'événement suivant. Les
anciennes clés figées ne servent plus que de repli. `WidgetSync` ne pousse
rien avant que le thème soit résolu (`themeVersion` à 0 : palette violette
par défaut sinon) ni un contenu identique au précédent (`syncWidgets`
compare), et sa fenêtre de calendrier est mémoïsée par mois.
`WidgetDataPlugin.clear()` vide le contenu (déconnexion, espace quitté).

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

## Couleurs système dynamiques (branche d'expérimentation)

**Cette branche remplace le calcul JS (`material-color-utilities`) par les
couleurs système dynamiques d'Android (`@android:color/system_accent1_*`
etc.) comme source normale des couleurs, app ET widgets — l'inverse de ce
que `main` faisait jusqu'ici.** Contexte : les widgets recalculaient déjà
la palette (JS au lancement de l'app, puis un port Java natif ajouté
ensuite pour suivre un changement de fond d'écran app fermée), mais avec un
délai (poll `updatePeriodMillis`). Une autre app du même auteur (Mago)
suit le fond d'écran **instantanément, sans le moindre code de
synchronisation**, en utilisant directement les ressources système
dynamiques dans le XML des widgets plutôt qu'en les recalculant. Cette
branche teste la même approche sur Orbit — à confirmer sur appareil réel
avant fusion dans `main` ; si le rendu système diverge trop de la teinte de
marque sur certains lanceurs (c'était la raison du calcul JS à l'origine),
revenir à la version précédente (calcul natif + poll 30 min).

**Widgets** : chaque layout XML déclare `android:textColor`/
`android:backgroundTint` par défaut vers `@color/widget_dyn_*`
(`res/values/widget_dynamic_colors.xml` en repli statique < API 31,
`res/values-v31/` en clair, `res/values-night-v31/` en sombre — qualificatif
combiné nécessaire, `night` seul étant plus spécifique que `v31` seul et
gagnant sinon toujours, même en Android 12+). Ces couleurs sont résolues et
repeintes par le LANCEUR lui-même à chaque changement de thème système,
y compris quand Orbit ne tourne pas — `OrbitWidgetTheme` (dans
`textOnPrimaryContainer()`, `tintPrimary()`, `applyTileBackground()` etc.)
**ne fait alors rien** (`usingDynamicColor()` renvoie vrai). La seule
exception : une image de thème choisie dans l'app
(`KEY_SEED_FOLLOWS_WALLPAPER` faux) — dans ce cas seulement,
`OrbitWidgetTheme` applique par-dessus la palette poussée par
`WidgetSync.tsx` (deux variantes claire/sombre, `RemoteViews.setColorInt`/
`setColorStateList`, comme avant). `setBackgroundResource()` reste toujours
appelé (même en mode dynamique) : `View` réapplique automatiquement le
`backgroundTint` déjà posé à la nouvelle image du drawable, donc ça
n'annule rien du défaut système. Cas particulier : la case "aujourd'hui" du
widget Calendrier (fond + texte changent par jour, pas par thème) est
gérée par **deux vues superposées** (`widget_cell_day`/
`widget_cell_day_today` dans `widget_calendar_cell.xml`), chacune avec son
propre défaut XML correct, plutôt qu'une couleur conditionnelle à calculer.

**App (WebView)** : `DynamicColorPlugin.java` lit les mêmes ressources
système et les expose à `ThemeModeContext.applyTheme()` via
`dynamicColor.ts`/`materialYou.applyDynamicPalette()`, en priorité sur
l'ancien calcul JS (`getWallpaperSeedColor()` + `themeFromSourceColor()`,
gardé en repli pour Android < 12). Mêmes tons choisis des deux côtés
(commentaires "mêmes tons que ..." croisés entre les deux fichiers) : app
et widgets ne peuvent donc jamais diverger, contrairement à l'ancien risque
"widget marron, app violette" (qui venait d'une **asymétrie** — app sur
palette JS, widget sur palette système — pas de `system_accent1` en
lui-même).

Une image de thème (`profiles.theme_*`, partagé avec Wenn — ne jamais
l'effacer) ne passe devant le fond d'écran sur Android que si la
préférence par appareil `preferThemeImage` le veut (Réglages > Couleurs de
l'app, vrai par défaut) ; à faux, app et widgets reprennent les couleurs
système.

Plus de dépendance `com.google.android.material` (aucune classe
`color.utilities` n'est plus utilisée nulle part) : ni calcul natif ni
polling de rattrapage plus nécessaires pour la couleur, tout est
résolu par des références de ressource statiques.

**Clair/sombre d'un widget = mode nuit du lanceur, pas le thème choisi dans
Orbit** (inchangé) : les qualificatifs `values-v31`/`values-night-v31`
suivent nativement le mode nuit du lanceur, jamais le thème choisi dans
Orbit (Réglages > Thème) — cohérent avec ce que le mécanisme dual
`setColorInt`/`setColorStateList` visait déjà à garantir pour le cas
"image de thème".

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
  récents utilisent en priorité (valable aussi pour la largeur :
  250dp = 4 colonnes, 110dp = 2) ;
- `minWidth`/`minHeight`, le repli, qu'Android convertit en cases avec
  `70 × cases − 30` dp → **40dp = 1 ligne, 110dp = 2, 180dp = 3**. Une
  valeur "raisonnable" comme 120dp réclame donc 3 lignes entières, d'où une
  tuile énorme avec un grand vide sous le texte.

Ne jamais mettre de `maxResizeWidth`/`maxResizeHeight` en dessous de la
taille réellement posée : le lanceur n'a alors aucune plage valide et
désactive complètement les poignées de redimensionnement.

**Police adaptative (Tâches, Fusion, Journal)** : les tailles `sp` en dur
dans les layouts sont calées pour la hauteur minimale (1 ligne ; exception
assumée : Tâches reste calé sur 60dp, son ancien minHeight, bien que
déclaré à 40dp — sinon son compteur en 28sp grossirait d'un tiers). Comme un
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

Cet ajustement automatique ne suffit pas toujours : deux lanceurs peuvent
accorder des hauteurs très différentes pour "la même" tuile (ex. Smart
Launcher, tuile jugée trop grande malgré `heightScale()`). Réglages >
Widgets propose donc un facteur manuel (Petite/Normale/Grande, préférence
par appareil dans `PreferencesContext.tsx`, clé `widgetFontScale`) qui
**compose** avec `heightScale()` au lieu de le remplacer :
`OrbitWidgetTheme.userFontScale()` lit `KEY_FONT_SCALE` (poussé par
`WidgetSync.tsx` via `fontScale`), et chaque provider multiplie les deux
facteurs avant `scaleText()`.

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

Les rappels ne se programment **jamais au coup par coup** (création/
modification) : `resyncEventReminders(events)`, appelée par `WidgetSync.tsx`
(debounce 1,5 s) au démarrage et à chaque changement de `events` — y compris
ceux de l'autre téléphone reçus en temps réel —, aligne les alarmes de CE
téléphone sur la liste partagée (ids déterministes `événement|minutes|
occurrence`, `extra.kind = 'orbit-event'`, prochaine occurrence via
`nextEventOccurrence` pour les annuels). Sans ça, seul le téléphone qui
créait l'événement sonnait, un déplacement/suppression par l'autre laissait
sonner l'ancienne alarme, et un anniversaire ne sonnait qu'une fois.

Temps réel : Supabase ne livre **jamais un DELETE sur un abonnement filtré**
(`couple_id=eq...`, l'ancienne ligne ne contient que la clé primaire) —
`useRealtimeCollection`/`useCycleStatus` écoutent donc les DELETE à part,
sans filtre (id seulement), et rechargent au retour au premier plan.
`CoupleContext` dépend de `user?.id` et non de l'objet `user` (recréé à
chaque rafraîchissement de jeton, ce qui démontait toute l'app). Noms de
canaux toujours suffixés d'un aléatoire (sinon « tried to subscribe
multiple times » sur un remontage rapide).

Lectures : PostgREST plafonne silencieusement à 1000 lignes, d'où
`fetchAllRows` (lib/paging.ts, réexporté par lib/supabase.ts) avec un tri
stable. Écritures optimistes : toujours via `mutate` de
useRealtimeCollection — en cas d'échec, `revertOptimistic` remet les
lignes touchées (sans écraser un écho plus récent) et `showToast` le dit ;
avant, hors ligne, un élément disparaissait puis revenait sans
explication. Copies hors ligne (`orbit-couple-cache-*`, `orbit-cache-*`),
contenu des widgets et rappels programmés sont effacés par
`purgeLocalSpaceData` (lib/localData.ts) : espace quitté, SIGNED_OUT, ou
plus d'espace côté serveur alors que ce téléphone en gardait une copie.

## Connexion — lien magique en flux PKCE

`flowType: "pkce"` (lib/supabase.ts) : le lien ne porte plus qu'un `code`,
échangé par `exchangeCodeForSession` avec le vérificateur gardé sur le
téléphone qui a demandé le lien (même `emailRedirectTo`
`io.karelisio.orbit://login-callback`, sans paramètre ajouté : la liste
blanche Supabase reste valable). `deepLink.ts` :
- n'accepte JAMAIS `access_token`/`refresh_token` dans une URL (fragment
  ou paramètres) : un lien forgé connectait sinon l'app au compte de
  quelqu'un d'autre (injection de session) ;
- `token_hash` + `type` (magiclink/email) seulement si ce téléphone a
  demandé un lien il y a moins d'une heure (marqueur `orbit-pending-login`,
  posé par AuthContext) ;
- un code déjà échangé n'est pas rejoué (getLaunchUrl renvoie la même URL
  après un rechargement), mais un lien en échec reste réessayable ;
- en échec (autre téléphone, expiré) : message clair sur l'écran de
  connexion (`AuthContext.authLinkError`).
Les sessions déjà ouvertes ne sont pas touchées. Test sur téléphone :
se déconnecter, demander un lien, l'ouvrir depuis l'appli mail du même
téléphone -> connecté.

## Mise à jour in-app — piège CORS déjà résolu, ne pas régresser

`src/lib/appUpdate.ts` télécharge l'APK avec `CapacitorHttp.request()`, **pas**
`fetch()`. Les assets de release GitHub ne renvoient aucun header CORS ; un
`fetch()` dans la WebView Capacitor échoue silencieusement même si la
requête réussit côté réseau. Si un futur refactor réintroduit `fetch()` ici,
le téléchargement recassera.

## Workflow Git/CI — à suivre à chaque changement

La branche de travail est `claude/orbit-couple-calendar-ftaa40`. Le push sur
`main` déclenche, dans cet ordre (`build-android.yml`) : calcul de la
prochaine version (patch + 1, rien de poussé ; `versionCode` = majeur ×
1 000 000 + mineur × 1 000 + patch, toujours au-dessus des anciens codes
tirés du numéro d'exécution), extraction des notes de `## Non publié`
(`scripts/archive-changelog.cjs notes`, « Corrections et améliorations
internes. » si vide), `npm run check` (Node 22), build web, arrêt net si
un secret de signature manque, APK signé, puis seulement **Release GitHub +
tag** sur le commit construit (`target_commitish`), et enfin archivage de
`## Non publié` sous `## vX.Y.Z — DATE` (`archive-changelog.cjs archive`),
refait sur la pointe de `main` et repoussé avec nouvel essai si `main` a
bougé. Un build raté ne laisse donc ni tag orphelin ni notes archivées ;
deux exécutions sur `main` ne se chevauchent jamais (`concurrency`, sans
annulation). Sur une branche de travail : build de vérification seulement
(versionName `X.Y.Z-dev.<sha>`), ni tag, ni release, ni push.

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

## Tests

`npm run check` = `tsc --noEmit` + `scripts/smoke-test.ts` (Node 22,
`--experimental-strip-types` : les modules testés n'importent que des
paquets ou des types — `import type` —, jamais le client Supabase ni
Capacitor ; d'où la logique pure dans lib/). Dates construites en heure
locale : lancer aussi `TZ=Europe/Paris npm run check` et
`TZ=America/Montreal npm run check`.

## Style de commit / conventions

- Commits et code sans mention de modèle Claude ; l'attribution va dans les
  lignes `Co-Authored-By`/`Claude-Session` fournies par le système, en fin
  de message.
- Pas de sur-ingénierie : cette app sert un couple, pas un produit à grande
  échelle — préférer la solution la plus directe.

## RLS : performance (2026-09-30)

Toutes les policies utilisent `(select auth.uid())` (évalué une fois par
requête, pas par ligne), les policies « member write » (FOR ALL) sont
scindées en insert/update/delete (une seule policy permissive par rôle et
action) et chaque clé étrangère a son index — fin de `supabase/schema.sql`
pour les tables orbit_*, fin de celui de Wenn pour les tables communes. Déjà
appliqué sur le projet. Garder cette forme pour toute nouvelle policy
(advisor Supabase `performance`).
