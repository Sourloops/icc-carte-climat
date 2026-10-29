import { drawItems } from '../../shared/draw';
import { computeResult, type Result } from '../../shared/scoring';
import { phase } from '../../shared/items';
import type { Answer, Item } from '../../shared/types';
import { pageUrl } from '../config';
import { seen } from '../storage';
import { focusFirst, reduceMotion, typo } from '../ui/html';
import {
  ABOUT_NOTE, dilemmaList, dominantNames, phaseDetails, profileRows, questionView, resultSubline, stripes,
} from '../ui/parts';

export function solo(root: HTMLElement): () => void {
  let items: Item[] = [];
  let answers: Answer[] = [];
  let index = 0;
  let salt = '';
  let done = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function newRun() {
    clearTimeout(timer);
    items = drawItems(Math.random, seen.get());
    seen.add(items.map((i) => i.id));
    answers = items.map(() => null);
    index = 0;
    done = false;
    salt = `solo:${Date.now()}`;
    render();
  }

  function resultView(r: Result): string {
    const multi = r.dominant.length > 1;
    const sub = resultSubline(r);
    const themes = items.filter((i) => i.kind === 'dilemme' && i.theme).map((i) => i.theme!);
    return `<section class="screen result">
      <div class="result-head">
        <p class="eyebrow">${multi ? 'Vous êtes à la croisée de' : 'Votre phase dominante'}</p>
        <h2 class="names${multi ? ' multi' : ''}" tabindex="-1" data-focus>${dominantNames(r)}</h2>
        ${sub ? `<p class="sub">${typo(sub)}</p>` : ''}
      </div>
      <div class="portrait">${stripes(items, answers, { cls: 'big', reveal: true })}
        <p class="cap">Vos ${items.length} réponses, une bande par question, colorée selon la phase qu’elle a le plus nourrie.</p></div>
      <div class="dist"><p class="label">Votre profil</p>${profileRows(r)}</div>
      ${phaseDetails(r)}
      <div class="intro-head"><p class="label">Les dilemmes que vous avez traversés</p>${dilemmaList(themes)}</div>
      <div class="banner">${typo('Envie de comparer ? Créez une partie en famille : chacun répond sur son téléphone, et la table découvre ses désaccords.')} <a href="#creer">Créer une partie</a></div>
      ${ABOUT_NOTE}
      <div class="actions">
        <button type="button" class="btn" data-action="restart">Refaire avec d’autres questions</button>
        <button type="button" class="btn ghost" data-action="copy">Copier mon résultat</button>
      </div>
      <p class="status" id="status" role="status" aria-live="polite"></p>
      <textarea class="copybox" id="copybox" rows="4" readonly hidden aria-label="Résultat à copier"></textarea>
    </section>`;
  }

  function render() {
    if (done) {
      root.innerHTML = resultView(computeResult(items, answers));
    } else {
      root.innerHTML = questionView({
        item: items[index]!,
        index,
        total: items.length,
        answer: answers[index] ?? null,
        salt,
        progress: stripes(items, answers, { current: index }),
        footer: '<div><button type="button" class="link" data-action="back">← Retour</button></div>',
      });
    }
    focusFirst(root);
  }

  function copy() {
    const r = computeResult(items, answers);
    const text = [
      'Baromètre du deuil climatique',
      `Phase dominante : ${r.empty ? 'indéterminée' : r.dominant.map((k) => phase(k).name).join(' et ')}`,
      `Profil : ${r.ranked.map((k) => `${phase(k).name} ${Math.round(r.share[k] * 100)} %`).join(' · ')}`,
      pageUrl(),
    ].join('\n');
    const status = root.querySelector<HTMLElement>('#status');
    const fallback = () => {
      const box = root.querySelector<HTMLTextAreaElement>('#copybox');
      if (!box) return;
      box.hidden = false;
      box.value = text;
      box.select();
      if (status) status.textContent = 'Sélectionnez le texte ci-dessous puis copiez-le.';
    };
    navigator.clipboard?.writeText(text).then(() => { if (status) status.textContent = 'Résultat copié.'; }, fallback) ?? fallback();
  }

  function onClick(e: Event) {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!t) return;
    const a = t.dataset.action;
    if (a === 'pick') {
      const v = Number(t.dataset.v);
      answers[index] = v;
      root.querySelectorAll<HTMLElement>('.opt').forEach((b) => b.setAttribute('aria-checked', String(Number(b.dataset.v) === v)));
      root.querySelectorAll<HTMLElement>('.stripe')[index]?.style.setProperty('--pc', 'var(--done)');
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (index < items.length - 1) index++;
        else done = true;
        render();
      }, reduceMotion() ? 150 : 450);
    } else if (a === 'back') {
      clearTimeout(timer);
      if (index > 0) { index--; render(); } else location.hash = '';
    } else if (a === 'restart') {
      newRun();
    } else if (a === 'copy') {
      copy();
    }
  }

  root.addEventListener('click', onClick);
  newRun();
  return () => {
    clearTimeout(timer);
    root.removeEventListener('click', onClick);
  };
}
