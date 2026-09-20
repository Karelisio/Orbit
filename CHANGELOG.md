# Changelog

Source des notes affichées dans Réglages → Mises à jour à chaque nouvelle
version. Ajouter une puce sous « Non publié » avant de commiter un
changement visible par l'utilisatrice ; le workflow CI archive
automatiquement cette section sous le numéro de version à chaque release et
la vide.

## Non publié

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
