# La Boussole de l'Impro Qc

Site web qui rassemble en un seul endroit les spectacles, matchs, jams et auditions d'improvisation à travers le Québec. L'objectif : que trouver une soirée d'impro près de chez soi devienne facile.

Site en ligne : https://jaric-dev.github.io/pagesjaunesimpro/

## À propos du projet

La Boussole est un outil communautaire, pensé pour être mis à jour directement par les ligues, troupes et organisateur·rice·s de spectacles d'impro du Québec, sans qu'ils aient besoin d'un accès technique au code ou au Google Sheet.

Le site est un projet en développement actif. La mise en page, les fonctionnalités et la structure des données peuvent encore changer.

## Fonctionnement général

Le site est entièrement statique (HTML/CSS/JS, hébergé sur GitHub Pages) et va chercher ses données dans un Google Sheet public via l'API [OpenSheet](https://opensheet.elk.sh/), qui convertit chaque onglet en JSON.

**Structure des données** : le Google Sheet contient 8 onglets, un par jour de la semaine (`Impro_Lundi` à `Impro_Dimanche`) plus un onglet `Impro_Ponctuel` pour les spectacles à dates irrégulières (tournées, spectacles occasionnels dans plusieurs villes, etc.).

**Ajout et mise à jour des spectacles** : les organisateur·rice·s soumettent leurs informations via un Google Form. Un script Google Apps Script (`apps-script/routage-formulaire.gs`) route automatiquement chaque soumission vers un onglet de modération (`À_Valider`) dans le Sheet, où elles sont révisées manuellement avant d'être déplacées dans les onglets finaux.

Chaque fiche de spectacle sur le site inclut aussi un lien "Mettre à jour" qui pré-remplit le formulaire avec les informations déjà connues de ce spectacle, pour simplifier les corrections futures.

## Structure des fichiers

```
index.html              Page principale (liste des spectacles, filtres)
about.html               Page « À propos » et formulaire de contact
style.css                 Feuille de style du site
script.js                 Logique JS : chargement des données, filtres, affichage
favicon.png               Icône du site
apps-script/
  routage-formulaire.gs   Script de routage des soumissions du formulaire
logos/                     Logos des ligues et troupes
```

## Fonctionnalités principales

- Navigation par jour de la semaine, ou par plage de dates
- Filtres par type de spectacle, ville, et statut hors saison
- Fiches détaillées avec logo, description, prix, lien Google Maps vers le lieu, réseaux sociaux
- Lien de mise à jour pré-rempli pour chaque spectacle
- Bouton d'ajout d'un nouveau spectacle
- Page « À propos » avec formulaire de contact intégré

## Technologies utilisées

- HTML, CSS, JavaScript vanille (aucun framework)
- Google Sheets comme base de données
- Google Forms pour la soumission d'informations
- Google Apps Script pour l'automatisation du routage
- OpenSheet pour exposer le Google Sheet en API JSON
- GitHub Pages pour l'hébergement

## Contribuer

Ce projet est géré par Les Projets Oh?. Pour ajouter ou corriger les informations d'un spectacle, utilisez le formulaire accessible directement depuis le site (bouton « Ajouter un événement » ou lien « Mettre à jour » sur chaque fiche). Pour toute autre question, une boîte de contact est disponible sur la page « À propos ».
