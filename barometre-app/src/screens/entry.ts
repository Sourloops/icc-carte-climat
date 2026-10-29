/** Créer une salle (#creer) ou en rejoindre une avec son code (#rejoindre). */
import { cleanName, CODE_ALPHABET, CODE_LENGTH, CODE_RE } from '../../shared/room';
import { createRoom, roomExists } from '../net/room-client';
import { savedName } from '../storage';
import { esc, focusFirst } from '../ui/html';

export function entry(root: HTMLElement, mode: 'create' | 'join'): () => void {
  const create = mode === 'create';
  root.innerHTML = `<section class="screen">
    <div class="intro-head">
      <p class="eyebrow">${create ? 'Partie en famille' : 'Rejoindre une partie'}</p>
      <h1 tabindex="-1" data-focus>${create ? 'Créer une partie' : 'Entrez le code de la partie'}</h1>
      <p class="lede">${create
        ? 'Vous animerez la partie : vous lancerez les questions quand tout le monde aura rejoint, puis les manches suivantes.'
        : 'Le code à quatre caractères s’affiche sur le téléphone de la personne qui anime. Vous pouvez aussi scanner son QR code.'}</p>
    </div>
    <form class="form" id="entry-form" novalidate>
      ${create ? '' : `<div class="field"><label for="code">Code de la partie</label>
        <input class="input code" id="code" name="code" inputmode="text" autocomplete="off" autocapitalize="characters" maxlength="${CODE_LENGTH}" placeholder="ABCD" required></div>`}
      <div class="field"><label for="name">Votre prénom</label>
        <input class="input" id="name" name="name" autocomplete="given-name" maxlength="24" value="${esc(savedName.get())}" required></div>
      <p class="error" id="err" role="alert"></p>
      <div><button class="btn" type="submit" id="go">${create ? 'Créer la partie' : 'Rejoindre'}</button></div>
    </form>
    <p class="fine">Votre prénom n’est visible que des autres joueurs de la partie. Tout est effacé au bout de 12 heures.</p>
  </section>`;

  const form = root.querySelector<HTMLFormElement>('#entry-form')!;
  const err = root.querySelector<HTMLElement>('#err')!;
  const go = root.querySelector<HTMLButtonElement>('#go')!;
  const codeInput = root.querySelector<HTMLInputElement>('#code');
  codeInput?.addEventListener('input', () => {
    const allowed = new RegExp(`[^${CODE_ALPHABET}]`, 'g');
    codeInput.value = codeInput.value.toUpperCase().replace(/O/g, '0').replace(/I/g, '1').replace(allowed, '').slice(0, CODE_LENGTH);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.textContent = '';
    const name = cleanName((form.elements.namedItem('name') as HTMLInputElement).value);
    if (!name) { err.textContent = 'Indiquez votre prénom : il s’affichera auprès des autres joueurs.'; return; }
    savedName.set(name);
    go.disabled = true;
    try {
      if (create) {
        const code = await createRoom();
        location.hash = `salle-${code}`;
      } else {
        const code = (codeInput?.value ?? '').toUpperCase();
        if (!CODE_RE.test(code)) { err.textContent = `Le code compte ${CODE_LENGTH} caractères, lettres et chiffres.`; return; }
        if (!(await roomExists(code))) { err.textContent = 'Aucune partie avec ce code. Vérifiez-le, ou demandez à l’animateur s’il est toujours valable.'; return; }
        location.hash = `salle-${code}`;
      }
    } catch (ex) {
      err.textContent = ex instanceof Error ? ex.message : 'Une erreur est survenue. Réessayez.';
    } finally {
      go.disabled = false;
    }
  });

  focusFirst(root);
  (codeInput ?? root.querySelector<HTMLInputElement>('#name'))?.focus();
  return () => {};
}
