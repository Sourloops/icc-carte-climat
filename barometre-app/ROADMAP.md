# Feuille de route : en ligne sur france4degres.fr/barometre pour le 24 décembre 2026

Il reste huit semaines. Le principe : tout ce qui compte est en place et testé en vrai avant le **15 décembre**. Après cette date, on ne corrige plus que des bugs.

Légende : 🧑 Paul s'en occupe · 🤖 à demander à Claude Code · ✅ déjà fait

## Où en est le projet

- ✅ Questionnaire solo : 96 questions, 10 tirées par passage, notation cachée et équilibrée
- ✅ Parties en famille : code et QR code, prénoms, mêmes questions pour tous, suivi de la progression, reprise après une coupure, nouvelles manches sans répétition
- ✅ Résultats de la table : penchant commun, profils de chacun, personnes les plus proches et les plus éloignées, trois sujets de débat avec relances, règles de la table
- ✅ 28 tests automatiques, partie à trois testée de bout en bout

## Semaine 1 · du 29 octobre au 4 novembre : prendre le projet en main

- 🧑 Installer Node.js (LTS), Git et Claude Code sur le PC
- 🧑 Valider la pull request « Baromètre du deuil climatique » sur GitHub. Le mode solo sera alors en ligne sur france4degres.fr/barometre.
- 🧑 Cloner le dépôt `icc-carte-climat`, ouvrir `barometre-app` dans Claude Code : « Lance le projet en local et explique-moi comment tester avec mon téléphone »
- 🧑 Faire une partie test avec Violaine, chacun sur son téléphone, sur le Wi-Fi de la maison

## Semaine 2 · du 5 au 11 novembre : ouvrir le mode famille en ligne

- ✅ Créer un compte Cloudflare gratuit
- 🧑 Créer un jeton Cloudflare (modèle « Edit Cloudflare Workers ») et l'enregistrer comme secret Codespaces `CLOUDFLARE_API_TOKEN` (voir « Travailler dans GitHub Codespaces » dans le README)
- 🧑 Ouvrir un Codespace sur la branche, puis lancer `npm run deploy:api` dans `barometre-app`. Cloudflare affiche une adresse en `.workers.dev`.
- 🤖 « Renseigne cette adresse dans .env.pages, reconstruis le site et pousse » : le mode famille s'ouvre sur france4degres.fr/barometre.
- 🧑 Faire une partie en 4G depuis deux téléphones pour vérifier

## Semaine 3 · du 12 au 18 novembre : intégration à france4degres.fr

- 🧑 Décider où mettre un lien vers le baromètre sur la carte (menu, bandeau, page d'une commune…)
- 🤖 « Ajoute un lien vers /barometre/ sur la carte, et ajoute la page au sitemap »
- 🧑 Facultatif, plus tard : faire gérer le DNS de france4degres.fr par Cloudflare (gratuit) pour que le serveur des parties ait une adresse du type `jeu.france4degres.fr` au lieu de `.workers.dev`. Les joueurs ne voient pas cette adresse, ce n'est donc pas nécessaire pour Noël.

## Semaine 4 · du 19 au 25 novembre : relecture du contenu

- 🧑 Faire relire les questions par deux ou trois proches d'horizons différents. Ce qu'il faut repérer : une réponse qui trahit trop sa phase, ou une formulation qui sent un parti pris politique.
- 🤖 « Voici les retours des relecteurs, applique-les en respectant les règles du catalogue »
- 🤖 Si l'envie est là : « Ajoute 5 situations par dilemme » (le catalogue passerait de 96 à 126 questions)

## Semaine 5 · du 26 novembre au 2 décembre : finitions et obligations

- 🤖 « Ajoute une page Mentions légales et confidentialité ». En France, un site public doit indiquer son éditeur et son hébergeur (loi pour la confiance dans l'économie numérique). Je ne suis pas juriste : faites vérifier la page si vous avez un doute.
- 🤖 « Crée une image d'aperçu pour le partage du lien » : l'image qui s'affiche quand on envoie le lien par WhatsApp ou SMS
- 🤖 Facultatif, une touche de Noël : par exemple un mode « Soirée de Noël » avec une relance de débat supplémentaire au dessert
- 🧑 Décider si l'on veut une mesure d'audience. Si oui, prendre un outil sans cookie, par exemple Cloudflare Web Analytics, inclus et gratuit.

## Semaine 6 · du 3 au 9 décembre : répétition générale

- 🧑 Organiser un vrai dîner test avec 5 ou 6 personnes, en 4G et pas seulement en Wi-Fi, avec au moins un téléphone ancien
- 🧑 Noter tout ce qui bloque : quelqu'un qui ne trouve pas le QR code, un texte trop petit, une question mal comprise
- 🤖 « Voici mes notes du dîner test, corrige ces points »

## Semaine 7 · du 10 au 16 décembre : gel des fonctionnalités le 15

- 🤖 Corrections issues du dîner test
- 🧑 Préparer le message d'invitation à envoyer aux familles. Claude peut le rédiger.
- **15 décembre : plus de nouvelles fonctionnalités, seulement des corrections**

## Semaine 8 · du 17 au 23 décembre : diffusion

- 🧑 Envoyer le lien à la famille et aux amis, pour qu'ils puissent essayer le mode solo avant le réveillon
- 🧑 Vérifier la veille que france4degres.fr/barometre répond et qu'une partie se crée, depuis un téléphone en 4G

## 24 décembre

Le soir : une personne crée la partie, la table scanne le QR code, puis on débat.

## Plus tard, si le projet plaît

- Un mode « explorer un dilemme » : une partie entière consacrée à l'eau, à l'IA…
- Un affichage « grand écran » sur la télévision du salon pendant que chacun répond sur son téléphone
- Une version anglaise
