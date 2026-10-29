# Baromètre du deuil climatique

En ligne sur <https://france4degres.fr/barometre/>, à côté de la carte de l'Indice de Confort Climatique.

Dix questions pour savoir où l'on en est face au dérèglement climatique : déni, colère, marchandage, tristesse, action ou acceptation.

- **Seul** : on obtient son profil à la fin.
- **En famille** : chacun répond sur son téléphone aux mêmes questions. À la fin, la table découvre les profils de chacun, qui est sur la même longueur d'onde, et trois sujets de débat là où les réponses divergent.

Le questionnaire tire chaque fois 10 questions parmi 96, dont trois dilemmes inspirés de l'assemblée citoyenne « Un commun accord ».

## Démarrer sur Windows

1. Installez **Node.js** (version LTS) depuis <https://nodejs.org> et **Git** depuis <https://git-scm.com>.
2. Clonez le dépôt `icc-carte-climat`, ouvrez le dossier `barometre-app` dans un terminal (clic droit dans le dossier → « Ouvrir dans le Terminal »), puis lancez :

   ```bash
   npm install
   npm run dev
   ```

3. Ouvrez <http://localhost:5173>. Pour tester à plusieurs, ouvrez l'adresse « Network » affichée dans le terminal sur des téléphones connectés au même Wi-Fi.

Avec Claude Code, ouvrez ce dossier et demandez simplement : « Lance le projet en local ». Le fichier `CLAUDE.md` donne à Claude tout le contexte du projet.

## Commandes

| Commande | Ce qu'elle fait |
| --- | --- |
| `npm run dev` | Site et parties en local, avec rechargement automatique |
| `npm test` | Tests du contenu, du tirage, du calcul et des parties |
| `npm run check` | Types, tests et construction : à lancer avant chaque mise en ligne |
| `npm run build:site` | Construit la version publiée dans `../barometre` |
| `npm run deploy:api` | Met en ligne le serveur des parties sur Cloudflare |

## Modifier les questions

Tout le contenu est dans `shared/catalog.ts`. Lisez les règles de la section « Règles pour le contenu » de `CLAUDE.md` avant de toucher au catalogue : on ajoute toujours en fin de liste, et la phase dépend de la posture, jamais d'une opinion politique.

## Hébergement

Le site est publié par GitHub Pages, comme la carte, dans le dossier `barometre/` du dépôt. Les parties en famille passent par un petit serveur sur Cloudflare Workers (offre gratuite). Chaque partie y est un Durable Object qui vit 12 heures. Il n'y a ni base de données ni compte utilisateur.

## Crédits

Les six phases s'inspirent des étapes du deuil décrites par Elisabeth Kübler-Ross. Les dilemmes de société s'inspirent des six questions retenues par l'assemblée citoyenne « Un commun accord ». Ce projet est indépendant de cette initiative.
