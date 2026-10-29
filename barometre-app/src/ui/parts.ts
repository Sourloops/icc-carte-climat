/** Morceaux d'interface partagés entre le mode solo et le mode famille. */
import { DILEMMES, PHASES } from '../../shared/catalog';
import { optionOrder } from '../../shared/draw';
import { KIND_LABEL, phase, SCALE, THEMES } from '../../shared/items';
import { answerPhase, type Result } from '../../shared/scoring';
import type { Answer, Item, PhaseKey } from '../../shared/types';
import { esc, typo } from './html';

export const phaseVar = (k: PhaseKey) => `var(--c-${phase(k).id})`;

/** Bandes de progression. `reveal` colore chaque bande selon la phase de la réponse. */
export function stripes(items: Item[], answers: Answer[], opts: { cls?: string; current?: number; reveal?: boolean } = {}): string {
  const out = items.map((it, i) => {
    const a = answers[i];
    const answered = a !== null && a !== undefined;
    let style = '';
    if (answered && opts.reveal) {
      const k = answerPhase(it, a);
      style = ` style="--pc:${k ? phaseVar(k) : 'var(--done)'}"`;
    } else if (answered) {
      style = ' style="--pc:var(--done)"';
    }
    return `<span class="stripe${i === opts.current ? ' current' : ''}"${style}></span>`;
  });
  return `<div class="stripes ${opts.cls ?? ''}" aria-hidden="true">${out.join('')}</div>`;
}

/** Bandes neutres pour suivre la progression d'un autre joueur (on ne connaît que son nombre de réponses). */
export function countStripes(total: number, answered: number): string {
  let out = '';
  for (let i = 0; i < total; i++) out += `<span class="stripe"${i < answered ? ' style="--pc:var(--done)"' : ''}></span>`;
  return `<div class="stripes" aria-hidden="true">${out}</div>`;
}

export function phaseLegend(): string {
  return `<ul class="phases">${PHASES.map(
    (p) => `<li style="--pc:var(--c-${p.id})"><span class="sw" aria-hidden="true"></span>
      <div><div class="pname">${p.name}</div><div class="pgloss">${typo(p.gloss)}</div></div></li>`,
  ).join('')}</ul>`;
}

export function dilemmaList(themes = DILEMMES.map((d) => d.key)): string {
  return `<ul class="dilemmas">${themes
    .map((k) => THEMES.get(k)!)
    .map((d) => `<li><span class="dl-label">${d.label}</span><span class="dl-q">${typo(d.q)}</span></li>`)
    .join('')}</ul>`;
}

/** Écran d'une question. Les boutons portent data-action="pick" et data-v (index de la réponse). */
export function questionView(p: {
  item: Item;
  index: number;
  total: number;
  answer: Answer;
  salt: string;
  progress: string;
  footer?: string;
}): string {
  const { item, index, total, answer } = p;
  const num = index + 1;
  let head: string;
  let body: string;
  if (item.kind === 'affirmation') {
    head = `<p class="prompt">Dans quelle mesure êtes-vous d’accord avec cette phrase&nbsp;?</p>
      <h2 class="q quote" id="q-title" tabindex="-1" data-focus>${typo(`« ${item.q} »`)}</h2>`;
    body = `<div class="opts scale" role="radiogroup" aria-labelledby="q-title">${SCALE.map(
      ([label], i) => `<button type="button" class="opt" role="radio" aria-checked="${answer === i}" data-action="pick" data-v="${i}">
        <span class="dot" aria-hidden="true"></span><span>${label}</span></button>`,
    ).join('')}</div>`;
  } else {
    head = `${item.kind === 'dilemme' && item.theme ? `<p class="dilemma-q">${typo(THEMES.get(item.theme)!.q)}</p>` : ''}
      <h2 class="q" id="q-title" tabindex="-1" data-focus>${typo(item.q)}</h2>`;
    body = `<div class="opts" role="radiogroup" aria-labelledby="q-title">${optionOrder(item, p.salt)
      .map(
        (i) => `<button type="button" class="opt" role="radio" aria-checked="${answer === i}" data-action="pick" data-v="${i}">
        <span class="dot" aria-hidden="true"></span><span>${typo(item.options[i]!.text)}</span></button>`,
      )
      .join('')}</div>`;
  }
  const kind = KIND_LABEL[item.kind] + (item.kind === 'dilemme' && item.theme ? ` · ${THEMES.get(item.theme)!.label}` : '');
  return `<section class="screen">
    <div class="progress">
      <div role="img" aria-label="Question ${num} sur ${total}">${p.progress}</div>
      <div class="q-meta"><p class="q-count">Question ${String(num).padStart(2, '0')} / ${total}</p><p class="q-count">${kind}</p></div>
    </div>
    <div class="intro-head">${head}</div>
    ${body}
    ${p.footer ?? ''}
  </section>`;
}

/** Texte lisible d'une réponse (pour les sujets de débat). */
export function answerText(item: Item, a: number): string {
  return item.kind === 'affirmation' ? `${SCALE[a]![0]} : « ${item.q} »` : item.options[a]!.text;
}

export function dominantNames(r: Result): string {
  if (r.empty) return '<span class="nm" style="--pc:var(--done)">Indéterminé</span>';
  return r.dominant
    .map((k) => `<span class="nm" style="--pc:${phaseVar(k)}">${phase(k).name}</span>`)
    .join('<span class="et">et</span>');
}

export function resultSubline(r: Result): string {
  if (r.empty) return 'Vos réponses sont restées très neutres : aucune phase ne se dégage. Refaites le questionnaire en tranchant un peu plus.';
  let s = '';
  if (r.second) s += `En arrière-plan : ${phase(r.second).name.toLowerCase()}. `;
  if (r.top < 0.24) s += 'Votre profil est très partagé : plusieurs phases coexistent chez vous en ce moment.';
  return s;
}

export function profileRows(r: Result): string {
  const max = r.top || 1;
  return `<div class="rows">${r.ranked
    .map((k) => {
      const pct = Math.round(r.share[k] * 100);
      return `<div class="row${r.dominant.includes(k) ? ' top' : ''}" style="--pc:${phaseVar(k)};--w:${((r.share[k] / max) * 100).toFixed(1)}%">
        <span class="rname">${phase(k).name}</span><span class="track"><span class="fill"></span></span><span class="rval">${pct}&nbsp;%</span></div>`;
    })
    .join('')}</div>`;
}

export function phaseDetails(r: Result): string {
  if (r.empty) return '';
  const multi = r.dominant.length > 1;
  return r.dominant
    .map((k) => {
      const p = phase(k);
      return `<article class="detail">
        ${multi ? `<h3 class="dname" style="--pc:${phaseVar(k)}"><span class="sw" aria-hidden="true"></span>${p.name}</h3>` : ''}
        <div class="block"><p class="label">Ce que cela peut vouloir dire</p><p>${typo(p.meaning)}</p></div>
        <div class="block"><p class="label">Ce qui peut aider</p><p>${typo(p.help)}</p></div>
      </article>`;
    })
    .join('');
}

export const ABOUT_NOTE = `<div class="note">
  <p>Ces six phases s’inspirent des étapes du deuil décrites par Elisabeth Kübler-Ross. On ne les traverse pas forcément dans l’ordre&nbsp;: on peut y revenir, ou en vivre plusieurs à la fois.</p>
  <p>Ce questionnaire est un outil de réflexion, pas un diagnostic. Si le sujet vous pèse beaucoup, un professionnel de santé peut vous aider.</p>
</div>`;

export { esc };
