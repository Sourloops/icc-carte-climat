import './styles.css';
import { CODE_RE } from '../shared/room';
import { FAMILY_MODE_READY } from './config';
import { entry } from './screens/entry';
import { home } from './screens/home';
import { room } from './screens/room';
import { solo } from './screens/solo';

/**
 * Navigation par ancre (#) : le site reste un ensemble de fichiers statiques.
 *   #            accueil
 *   #solo        questionnaire seul
 *   #creer       créer une partie en famille
 *   #rejoindre   rejoindre avec un code
 *   #salle-ABCD  la partie ABCD
 */
const app = document.getElementById('app')!;
let cleanup: () => void = () => {};

function route() {
  cleanup();
  const h = decodeURIComponent(location.hash.slice(1));
  const m = h.match(/^salle-([A-Za-z0-9]+)$/);
  const family = h === 'creer' || h === 'rejoindre' || !!m;
  if (family && !FAMILY_MODE_READY) cleanup = unavailable(app);
  else if (h === 'solo') cleanup = solo(app);
  else if (h === 'creer') cleanup = entry(app, 'create');
  else if (h === 'rejoindre') cleanup = entry(app, 'join');
  else if (m && CODE_RE.test(m[1]!.toUpperCase())) cleanup = room(app, m[1]!.toUpperCase());
  else cleanup = home(app);
}

function unavailable(root: HTMLElement): () => void {
  root.innerHTML = `<section class="screen"><div class="intro-head">
    <p class="eyebrow">Partie en famille</p>
    <h1 tabindex="-1">Le mode famille arrive bientôt</h1>
    <p class="lede">Les parties à plusieurs ne sont pas encore ouvertes sur ce site. En attendant, vous pouvez faire le questionnaire seul.</p></div>
    <div class="actions"><a class="btn" href="#solo">Faire le questionnaire seul</a><a class="btn ghost" href="#">Accueil</a></div></section>`;
  return () => {};
}

window.addEventListener('hashchange', route);
route();
