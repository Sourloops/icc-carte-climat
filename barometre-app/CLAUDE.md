# Baromètre du deuil climatique

Questionnaire qui indique à chacun dans quelle phase du « deuil climatique » il se trouve : déni, colère, marchandage, tristesse, action ou acceptation. On peut le faire seul, ou **en famille, chacun sur son téléphone**, puis comparer les profils et débattre.

**Objectif : en ligne sur https://france4degres.fr/barometre/ pour le soir du 24 décembre 2026.** La feuille de route est dans `ROADMAP.md`.

Ce dossier vit dans le dépôt `icc-carte-climat`, qui publie aussi la carte de l'Indice de Confort Climatique sur france4degres.fr. **Ne modifie rien en dehors de `barometre-app/` et `barometre/` sans que Paul le demande.**

Porteur du projet : Paul, qui n'est pas développeur. Explique tes choix simplement, en français, et privilégie les solutions robustes et sans entretien.

## Langue et ton

- Tout le contenu visible est en **français**, vouvoiement, phrases courtes et concrètes.
- Typographie française : espace insécable avant `? ! : ;` et à l'intérieur de `« »`. La fonction `typo()` (`src/ui/html.ts`) s'en charge pour nos textes.
- Apostrophe typographique `’` dans le contenu, jamais `'`.
- Le code (noms de variables) peut rester en anglais ; les commentaires sont en français.

## Commandes

```bash
npm install          # une fois, après chaque mise à jour de package.json
npm run dev          # site + serveur des parties en local : http://localhost:5173
npm test             # tests du contenu, du tirage, du calcul et des parties
npm run typecheck    # vérification des types
npm run check        # types, tests, construction des deux versions
npm run build:site   # construit la version publiée dans ../barometre (GitHub Pages)
npm run deploy:api   # met en ligne le serveur des parties sur Cloudflare (wrangler login la première fois)
```

`npm run dev` affiche aussi une adresse « Network » : on peut tester depuis un téléphone sur le même Wi-Fi.

**Avant de dire qu'un changement est fini, lance `npm run check`.** Pour un changement visible, ouvre la page et vérifie à 390 px de large (téléphone), en thème clair et sombre.

## Architecture

Site statique (Vite + TypeScript, sans framework) et un petit serveur Cloudflare Workers pour les parties en temps réel. Aucune base de données, aucun compte utilisateur.

Deux endroits en production :
- **Le site**, sur GitHub Pages. `npm run build:site` l'écrit dans `../barometre/`, servi sur france4degres.fr/barometre/. Ce dossier est généré : on ne l'édite jamais à la main, on le reconstruit puis on le commite.
- **Le serveur des parties**, sur Cloudflare Workers (`npm run deploy:api`). Son adresse en `.workers.dev` est renseignée dans `.env.pages` (`VITE_API_BASE`). Tant qu'elle est vide, le site publié n'offre que le mode solo. Le worker n'accepte que les origines listées dans `ALLOWED_ORIGINS` (`wrangler.jsonc`).

En local, `npm run dev` sert les deux au même endroit. Pour tester le site publié contre un serveur local, créez `.dev.vars` avec `ALLOWED_ORIGINS=http://localhost:8080`.

```
shared/        Code commun au site et au serveur, sans dépendance au navigateur : testable directement
  catalog.ts   LE CONTENU : phases, situations, affirmations, associations, dilemmes
  items.ts     Catalogue mis en forme avec identifiants stables, échelle d'accord
  draw.ts      Tirage des 10 questions (3 dilemmes de thèmes distincts, 4 situations, 2 affirmations, 1 association)
  scoring.ts   Calcul du profil
  room.ts      Règles d'une partie (fonction pure `reduce`) et format des messages
  debate.ts    Résultats de la table : penchant commun, paires proches et éloignées, sujets de débat
src/           Le site
  main.ts      Navigation par ancre : #, #solo, #creer, #rejoindre, #salle-ABCD
  config.ts    Adresse du serveur des parties (VITE_API_BASE) et adresse de la page
  screens/     Un fichier par écran (accueil, solo, création ou entrée, partie)
  ui/          Morceaux d'interface partagés, échappement HTML
  net/         Connexion WebSocket avec reconnexion automatique
  styles.css   Toute la mise en forme
worker/        Le serveur Cloudflare
  index.ts     API : POST /api/rooms, GET /api/rooms/:code, GET /api/rooms/:code/ws
  room-do.ts   Durable Object : une instance par partie, stocke l'état et diffuse à chaque téléphone
tests/         Tests Vitest sur shared/
```

Déroulement d'une partie : l'animateur crée la salle (code à 4 caractères et QR code). Les joueurs rejoignent avec leur prénom, puis l'animateur lance. Le serveur tire 10 questions, les mêmes pour tous, et chacun répond à son rythme. Les réponses des autres restent cachées jusqu'aux résultats, qui s'affichent quand tout le monde a fini ou quand l'animateur le décide. Une nouvelle manche tire des questions encore jamais posées dans la salle. Les parties s'effacent 12 heures après leur création (alarme du Durable Object).

Le serveur fait autorité : toute règle de jeu se modifie dans `shared/room.ts` (avec un test), jamais seulement dans l'interface.

## Règles pour le contenu (`shared/catalog.ts`)

Ce sont les règles les plus importantes du projet.

1. **Ajouter uniquement en fin de liste, ne jamais réordonner ni insérer au milieu.** L'identifiant d'une question dépend de sa position (`s12`, `a3`, `x-eau-2`…). Corriger le texte d'une question existante ne pose pas de problème.
2. **Ne pas trahir la phase.** Aucune réponse ne nomme l'émotion (« ça m'énerve », « je suis triste », « j'accepte »). Toutes les réponses doivent paraître raisonnables et socialement acceptables. Un test refuse les mots déni, colère, marchandage, dépression et acceptation.
3. **Neutralité politique.** La phase dépend de la *posture* face à la question, jamais du camp choisi : minimiser (déni), s'indigner ou désigner des responsables (colère), poser des conditions ou compter sur une compensation (marchandage), ressentir la perte (tristesse), s'impliquer concrètement (action), assumer l'arbitrage sereinement (acceptation). Être pour ou contre l'usine, l'éolienne ou la voiture doit pouvoir mener à n'importe quelle phase.
4. **Poids de 1 ou 2.** Une réponse donne 2 points à une phase, ou 1 point à deux phases (c'est ce qui rend le calcul illisible pour le joueur). Pas de 0, pas de 3.
5. Situations, associations et dilemmes ont **4 à 7 réponses**, pas forcément une par phase.
6. Après tout ajout, `npm test` vérifie l'équilibre entre phases sur l'ensemble du catalogue et sur chaque tirage. Si un test d'équilibre échoue, rééquilibre les poids plutôt que d'assouplir le test.
7. Les dilemmes s'inspirent des six questions retenues par l'assemblée citoyenne « Un commun accord » (portée par Jean-Marc Jancovici, hébergée par le Shift Project). Cite l'initiative par son nom, sans laisser entendre un partenariat ni utiliser son logo.

## Calcul (`shared/scoring.ts`)

Chaque phase est rapportée au maximum qu'elle pouvait atteindre avec les questions tirées (+1 de lissage), puis on calcule la part de chaque phase. Plusieurs phases dominantes si l'écart est inférieur à 3 points. Les tests garantissent que :

- une personne qui répond toujours dans le sens d'une phase retrouve cette phase ;
- une personne qui répond au hasard n'obtient aucune phase plus souvent qu'une autre (chaque phase entre 12 % et 22 % des cas).

Ne modifie pas ces seuils sans relancer les tests et sans expliquer le changement à Paul.

## Design

- Couleurs uniquement via les variables CSS de `:root` dans `src/styles.css`. Le thème sombre redéfinit les mêmes variables (`prefers-color-scheme` et `[data-theme]`).
- Chaque phase a sa couleur (`--c-deni`, `--c-colere`…). **Pendant le questionnaire, aucune couleur de phase n'apparaît** : les bandes restent grises (`--done`) et ne se colorent qu'aux résultats.
- Polices : Newsreader (titres), Instrument Sans (texte), IBM Plex Mono (étiquettes, codes).
- Conçu d'abord pour le téléphone : colonne de 42 rem maximum, marges latérales d'au moins 16 px, aucun défilement horizontal.
- Tout prénom affiché passe par `esc()`.

## Données personnelles

- Aucun compte, aucun cookie publicitaire, aucune mesure d'audience par défaut.
- Seuls le prénom saisi et les réponses transitent par le serveur, et sont effacés au bout de 12 heures.
- Le navigateur garde localement un identifiant de joueur, le dernier prénom et les questions déjà vues en solo.
- Si on ajoute un jour une mesure d'audience, choisir un outil sans cookie et mettre à jour la page de mentions légales.

## Mise en ligne

1. Serveur : `npm run deploy:api` (seulement si `worker/` ou `shared/room.ts` a changé).
2. Site : `npm run build:site`, puis commit de `barometre-app/` et `barometre/` ensemble. GitHub Pages publie au push sur `main`.

Si un changement touche à la fois le serveur et le format des messages (`shared/room.ts`), déploie le serveur avant de publier le site.
