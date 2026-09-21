# Changelog

Source des notes affichées dans Réglages → Mises à jour à chaque nouvelle
version. Ajouter une puce sous « Non publié » avant de commiter un
changement visible par l'utilisatrice ; le workflow CI archive
automatiquement cette section sous le numéro de version à chaque release et
la vide.

## Non publié
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
