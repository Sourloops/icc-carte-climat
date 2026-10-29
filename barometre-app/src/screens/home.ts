import { CATALOG } from '../../shared/items';
import { QUESTION_COUNT } from '../../shared/draw';
import { FAMILY_MODE_READY } from '../config';
import { focusFirst, typo } from '../ui/html';
import { dilemmaList, phaseLegend } from '../ui/parts';

export function home(root: HTMLElement): () => void {
  root.innerHTML = `<section class="screen">
    <div class="intro-head">
      <p class="eyebrow">${QUESTION_COUNT} questions · environ 4 minutes · seul ou à plusieurs</p>
      <h1 tabindex="-1" data-focus>${typo('Où en êtes-vous de votre <em>deuil climatique</em> ?')}</h1>
      <p class="lede">Face au dérèglement du climat, beaucoup de personnes traversent des émotions proches d’un deuil. Ce questionnaire vous aide à repérer la phase où vous vous trouvez en ce moment, et à en parler avec vos proches.</p>
    </div>

    <div class="choices">
      <a class="choice primary" href="#creer">
        <p class="label">En famille${FAMILY_MODE_READY ? '' : ' · bientôt'}</p>
        <h2>Créer une partie</h2>
        <p>Chacun répond sur son téléphone aux mêmes questions. À la fin, la table découvre ses profils et trois sujets de débat.</p>
      </a>
      <a class="choice" href="#rejoindre">
        <p class="label">On vous a donné un code</p>
        <h2>Rejoindre une partie</h2>
        <p>Entrez le code à quatre caractères affiché sur le téléphone de la personne qui anime.</p>
      </a>
      <a class="choice" href="#solo">
        <p class="label">Seul</p>
        <h2>Faire le questionnaire</h2>
        <p>Dix questions tirées au hasard, et votre profil à la fin.</p>
      </a>
    </div>

    <ul class="rules">
      <li><span>${typo(`Chaque partie tire ${QUESTION_COUNT} questions parmi ${CATALOG.length} : trois dilemmes de société, des situations du quotidien, des affirmations et une association d’idées.`)}</span></li>
      <li><span>Il n’y a pas de bonne réponse. Choisissez celle qui vous ressemble le plus, même imparfaitement.</span></li>
      <li><span>Une même réponse peut compter pour plusieurs phases. Le calcul ne se dévoile qu’à la fin.</span></li>
    </ul>

    <div class="intro-head"><p class="label">Les six phases</p>${phaseLegend()}</div>

    <div class="intro-head">
      <p class="label">Six dilemmes de société</p>
      <p class="fine">${typo('Une partie des questions s’inspire des six dilemmes retenus par l’assemblée citoyenne « Un commun accord ». Elles ne mesurent pas votre opinion sur ces débats, seulement la façon dont vous les vivez.')}</p>
      ${dilemmaList()}
    </div>

    <p class="fine">Un outil de réflexion, pas un test psychologique ni un diagnostic. Pas de compte, pas de publicité. Les salles de jeu et les réponses sont effacées au bout de 12 heures.</p>
  </section>`;
  focusFirst(root);
  return () => {};
}
