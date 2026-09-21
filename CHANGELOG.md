# Changelog

Source des notes affichées dans Réglages → Mises à jour à chaque nouvelle
version. Ajouter une puce sous « Non publié » avant de commiter un
changement visible par l'utilisatrice ; le workflow CI archive
automatiquement cette section sous le numéro de version à chaque release et
la vide.

## Non publié

## v1.0.27 — 2026-09-21
- Corrige les bandes blanches sur les côtés de l'app sur les écrans plus larges que prévu (une limite de largeur héritée d'un rendu web, inutile dans l'appli installée).

## v1.0.25 — 2026-09-21
- Widgets Fusion et Journal : marge de sécurité supplémentaire en bas (toujours coupés sur certains téléphones malgré le fix précédent).
- Corrige (vraiment) le clic sur un jour du widget calendrier : la navigation vers ce jour ne se propageait pas si l'app tournait déjà, elle restait sur aujourd'hui.

## v1.0.24 — 2026-09-21
- Corrige le bas de la dernière ligne du widget Fusion coupé (les lettres avec jambage comme "j" étaient tronquées) : sa taille par défaut était devenue trop petite pour son propre contenu.
- Corrige le clic sur un jour du widget calendrier qui n'ouvrait plus ce jour précis dans l'app depuis la dernière mise à jour.

## v1.0.23 — 2026-09-21
- Widgets Fusion et Journal : redevenus redimensionnables (une taille minimale trop stricte les bloquait à leur taille par défaut), et plafonnés pour ne plus être proposés en trop grand par défaut.

## v1.0.22 — 2026-09-21
- Corrige (pour de bon) le texte des widgets calendrier et Journal illisible en thème sombre : le fond suit maintenant la même donnée que la couleur du texte, au lieu du thème du téléphone qui pouvait différer du thème choisi dans l'app.
- Widgets Fusion et Journal plus compacts : moins d'espace vide en haut et en bas à leur taille par défaut.

## v1.0.21 — 2026-09-21
- Corrige le texte du widget calendrier illisible en thème sombre (couleurs qui ne suivaient pas un changement de thème, seulement les données affichées).
- Nouveau widget "Journal" : affiche la dernière note du journal.
- Le widget "Fusion" affiche maintenant aussi la dernière note du journal, en plus du calendrier et des tâches.

## v1.0.20 — 2026-09-21
- Corrige les cases du widget calendrier qui s'affichaient noires/marron au lieu du quadrillage discret prévu.
- Dégradé du widget calendrier : le blanc n'apparaît plus qu'à la toute fin, moins présent qu'avant.
- Le widget calendrier affiche maintenant jusqu'à 2 événements empilés par jour, au lieu d'un seul.
- Un réglage propose d'autoriser "Alarmes et rappels" si besoin, pour que les rappels d'événements sonnent même app fermée (avant, ils pouvaient attendre la réouverture de l'app).
- L'icône de notification est maintenant celle d'Orbit, plus une icône générique.

## v1.0.19 — 2026-09-21
- Taper sur un jour du widget calendrier ouvre maintenant l'app directement sur ce jour, au lieu de l'accueil.
- Widget calendrier : les jours de règles (Wenn, prédites ou enregistrées) s'affichent discrètement, désactivable dans Réglages → Widget calendrier (comme dans le calendrier de l'app).
- Widget calendrier plus joli : fond en dégradé Material You comme le reste de l'app, sous-titre avec la date du jour, et léger quadrillage entre les jours.

## v1.0.18 — 2026-09-21
- L'app ne peut plus se fermer toute seule à cause d'un widget : le rafraîchissement des widgets tourne dans le processus de l'app, et une erreur d'affichage y emportait l'app entière. Il est maintenant isolé — au pire un widget n'est pas rafraîchi tout de suite.
- Si l'app se ferme malgré tout de façon inattendue, Réglages affiche au redémarrage un rapport à copier/envoyer (jusque-là, la fermeture ne laissait aucune trace).

## v1.0.17 — 2026-09-21
- Widget calendrier vide et qui n'ouvrait plus l'app : agrandi, il dépassait la taille d'image autorisée pour un widget et Android refusait alors tout l'affichage. La grille est désormais faite de vraies cases, sans image géante.
- Widget calendrier plus lisible : texte de taille constante quelle que soit la taille de la tuile (avant, plus le widget était grand, plus le texte grossissait et se coupait), et titres d'événements tronqués proprement avec « … ».
- Le clic fonctionne désormais sur toute la tuile pour ouvrir l'app (les flèches gardent la navigation par mois).

## v1.0.16 — 2026-09-21
- Budget : le sens du solde était inversé — l'app affichait « ton/ta partenaire te doit » alors que c'était à toi de rembourser (et inversement).
- Les rappels d'un événement qu'on retire ne sonnent plus : seuls les rappels de la nouvelle liste étaient annulés, les anciens restaient programmés.
- Un rappel de plusieurs jours annonçait « demain » dans la notification, et un rappel personnalisé s'affichait « 4320 min avant » au lieu de « 3 jours avant ».
- Widgets en thème sombre : le texte clair se retrouvait sur le fond clair de la tuile, donc illisible — fond et texte suivent maintenant la même palette.
- La barre noire en haut de l'écran disparaît (un masquage de la barre d'état, resté du mode plein écran annulé, la faisait réafficher en surimpression).
- Une dépense créée après minuit n'est plus datée de la veille.
- L'app et les widgets partagent enfin les mêmes données en mémoire : un ajout se voit instantanément des deux côtés, avec deux fois moins de requêtes réseau.
- Changer de mois dans le calendrier ne recharge plus tout l'historique de cycle à chaque fois.

## v1.0.15 — 2026-09-20
- Le calendrier affiche maintenant aussi les règles prédites (pas seulement celles déjà enregistrées dans Wenn), y compris sur les mois suivants.

## v1.0.14 — 2026-09-20
- Corrige la bande sombre qui apparaissait sous la barre d'état sur certains appareils (le fond derrière l'horloge/les icônes système ne correspondait pas au reste de l'en-tête), et laisse un peu plus d'air en haut de l'écran.
- Ajoute le logo Orbit à côté du titre sur l'accueil, et remplace l'icône fleur du widget cycle par le logo Wenn.

## v1.0.13 — 2026-09-20
- Anniversaires : les événements de catégorie "Anniversaire" (ou avec l'option "Se répète chaque année" activée) comptent désormais chaque année automatiquement, sans avoir à les recréer.
- Ajout/modification instantanés : créer un événement, une tâche, une dépense ou une note se reflète immédiatement dans l'app et sur les widgets, sans attendre un aller-retour réseau.
- Widget calendrier : la couleur des pastilles suit bien la personne assignée à chaque rendez-vous (comme dans l'app).

## v1.0.12 — 2026-09-20
- Barre d'état : corrige le contenu masqué/collé sous l'horloge et les icônes système sur Android 15 (affichage bord à bord imposé par défaut).
- Lancement hors ligne : l'app affiche immédiatement les dernières données connues (couple, événements, tâches, budget, journal) même sans réseau, au lieu d'un écran de chargement bloqué. Créer/modifier reste impossible hors ligne (réessaie une fois connecté·e) — pas de file d'attente de synchronisation automatique pour l'instant, afin d'éviter tout risque de doublon sur des données partagées à deux.

## v1.0.11 — 2026-09-20
- Ajout d'une heure de fin optionnelle sur les événements du calendrier (affichée en plage "début–fin").
- La couleur d'un événement suit maintenant la personne assignée (toi et ton/ta partenaire avez chacun une couleur fixe) plutôt que la catégorie, quand il n'est pas assigné "Ensemble".

## v1.0.10 — 2026-09-20
- Corrige l'ajout de tâche qui échouait silencieusement (l'erreur s'affiche maintenant si l'enregistrement échoue).
- Remplace les derniers menus déroulants natifs (heure/minute d'un événement, unité de rappel, mois/année) par des contrôles maison, pour éviter le même bug d'affichage cassé que sur les anciens sélecteurs de date.
- Le sélecteur de date permet de choisir l'année directement (saisie) et le mois en un clic, sans avoir à cliquer mois par mois.
- Widget calendrier : rendu à la taille réelle du widget, ne devient plus flou/pixelisé en l'agrandissant.

## v1.0.9 — 2026-09-20
- Récurrence des tâches à intervalle libre (tous les X jours/semaines/mois, plus limité aux presets fixes).
- « Ensemble depuis » affiche maintenant années, mois et jours (plus seulement un nombre de jours).
- Corrige le bug d'affichage cassé en créant/modifiant un événement (date/heure) dans le calendrier.
- Les événements sont assignables (Ensemble / Moi / Partenaire), comme les tâches.
- Catégories d'événements personnalisables : le couple peut en créer de nouvelles à la volée.
- Rappels d'événements modulables : plus de préréglages, et un rappel personnalisé (minutes/heures/jours).
- Widget calendrier repensé : le titre du premier événement du jour s'affiche dans une pastille colorée.
