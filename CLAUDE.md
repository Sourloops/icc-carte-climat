# france4degres.fr

Ce dépôt est publié tel quel par GitHub Pages sur https://france4degres.fr (fichier `CNAME`) à chaque push sur `main`.

## Contenu

- **La carte de l'Indice de Confort Climatique** : `index.html`, `data/`, `vendor/` (MapLibre), `commune/` (une page par commune, environ 34 700 fichiers), `sitemap.xml`. Ce sont des fichiers générés. Ne les modifie pas en masse sans que Paul le demande.
- **Le Baromètre du deuil climatique**, servi sur https://france4degres.fr/barometre/ :
  - `barometre-app/` contient les sources (Vite + TypeScript, serveur Cloudflare pour les parties en famille). Ses règles sont dans `barometre-app/CLAUDE.md`.
  - `barometre/` contient la version publiée, générée par `npm run build:site` depuis `barometre-app/`. On ne l'édite jamais à la main.

## Règles

- Explique tes choix à Paul simplement, en français.
- Travaille sur une branche et propose une pull request, sauf si Paul demande de pousser directement sur `main`.
- Ne touche pas au fichier `CNAME`.
