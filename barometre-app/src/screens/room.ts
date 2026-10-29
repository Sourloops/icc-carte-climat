/** Salle de jeu en famille (#salle-CODE) : attente, questions, progression des autres, résultats de la table. */
import qrcode from 'qrcode-generator';
import { summarizeTable, TABLE_RULES } from '../../shared/debate';
import { itemById, KIND_LABEL, phase, THEMES } from '../../shared/items';
import { cleanName, type PublicRoom, type ServerMsg } from '../../shared/room';
import { computeResult } from '../../shared/scoring';
import type { Answer, Item } from '../../shared/types';
import { RoomClient, roomExists, type ConnStatus } from '../net/room-client';
import { pageUrl } from '../config';
import { playerId, savedName } from '../storage';
import { esc, focusFirst, nameList, reduceMotion, typo } from '../ui/html';
import {
  ABOUT_NOTE, answerText, countStripes, dominantNames, phaseDetails, phaseVar, profileRows, questionView, stripes,
} from '../ui/parts';

export function room(root: HTMLElement, code: string): () => void {
  const me = playerId();
  let name = savedName.get();
  let client: RoomClient | null = null;
  let state: PublicRoom | null = null;
  let mine: Answer[] = [];
  let index = 0;
  let round = -1;
  let conn: ConnStatus = 'connecting';
  let fatal: string | null = null;
  let flash: string | null = null;
  let lastKey = '';
  let timer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;

  const joinUrl = pageUrl(`salle-${code}`);
  const items = (): Item[] => (state?.itemIds ?? []).map((id) => itemById(id)).filter((x): x is Item => !!x);
  const isHost = () => state?.hostId === me;
  const firstOpen = () => { const i = mine.findIndex((a) => a === null); return i === -1 ? mine.length : i; };

  /* ---------- Écrans ---------- */

  function nameForm(): string {
    return `<section class="screen">
      <div class="intro-head">
        <p class="eyebrow">Partie ${esc(code)}</p>
        <h1 tabindex="-1" data-focus>Vous rejoignez une partie en famille</h1>
        <p class="lede">Indiquez votre prénom : il s’affichera auprès des autres joueurs.</p>
      </div>
      <form class="form" id="name-form" novalidate>
        <div class="field"><label for="name">Votre prénom</label>
          <input class="input" id="name" name="name" autocomplete="given-name" maxlength="24" required></div>
        <p class="error" id="err" role="alert"></p>
        <div><button class="btn" type="submit">Rejoindre la partie</button></div>
      </form>
    </section>`;
  }

  function message(title: string, text: string): string {
    return `<section class="screen"><div class="intro-head">
      <h1 tabindex="-1" data-focus>${title}</h1><p class="lede">${text}</p></div>
      <div class="actions"><a class="btn" href="#creer">Créer une nouvelle partie</a><a class="btn ghost" href="#">Accueil</a></div></section>`;
  }

  function qrSvg(): string {
    const qr = qrcode(0, 'M');
    qr.addData(joinUrl);
    qr.make();
    return qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  }

  function lobby(s: PublicRoom): string {
    const host = s.players.find((p) => p.id === s.hostId);
    const hostAway = !!host && !host.connected && !isHost();
    const list = s.players.map((p) => `<li class="player">
        <span class="on${p.connected ? '' : ' off'}" aria-label="${p.connected ? 'connecté' : 'déconnecté'}"></span>
        <span class="pn">${esc(p.name)}${p.id === me ? ' (vous)' : ''}</span>
        <span class="meta">${p.id === s.hostId ? 'anime' : isHost() ? `<button type="button" class="mini" data-action="remove" data-id="${esc(p.id)}">Retirer</button>` : ''}</span>
      </li>`).join('');
    return `<section class="screen">
      <div class="intro-head">
        <p class="eyebrow">Partie en famille · en attente des joueurs</p>
        <h1 tabindex="-1" data-focus>${isHost() ? 'Faites rejoindre la table' : 'Vous êtes dans la partie'}</h1>
        <p class="lede">${isHost()
          ? 'Chacun scanne le QR code ou va sur le site et entre le code. Lancez la partie quand tout le monde est là.'
          : `${host ? esc(host.name) : 'La personne qui anime'} lancera la partie quand tout le monde sera là.`}</p>
      </div>
      <div class="room-code">
        <div class="intro-head" style="gap:8px">
          <p class="label">Code de la partie</p>
          <p class="big">${esc(s.code)}</p>
          <p class="url">${esc(joinUrl)}</p>
          <div><button type="button" class="link" data-action="copy-link">Copier le lien</button></div>
        </div>
        <div class="qr" role="img" aria-label="QR code pour rejoindre la partie">${qrSvg()}</div>
      </div>
      <div class="intro-head"><p class="label">${s.players.length} joueur${s.players.length > 1 ? 's' : ''} à table</p><ul class="players">${list}</ul></div>
      ${isHost() ? `<div class="actions"><button type="button" class="btn" data-action="start">Lancer la partie</button></div>` : ''}
      ${hostAway ? `<div class="banner">${esc(host!.name)} semble déconnecté. <button type="button" class="mini" data-action="claim">Reprendre l’animation</button></div>` : ''}
      ${rulesCard()}
    </section>`;
  }

  function rulesCard(): string {
    return `<div class="rules-card"><p class="label">Les règles de la table</p><ol>${TABLE_RULES.map((r) => `<li>${typo(r)}</li>`).join('')}</ol></div>`;
  }

  function question(s: PublicRoom): string {
    const its = items();
    return questionView({
      item: its[index]!,
      index,
      total: its.length,
      answer: mine[index] ?? null,
      salt: `${s.code}:${s.round}`,
      progress: stripes(its, mine, { current: index }),
      footer: index > 0 ? '<div><button type="button" class="link" data-action="back">← Question précédente</button></div>' : '',
    });
  }

  function waiting(s: PublicRoom): string {
    const total = s.itemIds.length;
    const left = s.players.filter((p) => p.answered < total);
    const rows = s.players.map((p) => `<div class="prow"><span class="pn">${esc(p.name)}</span>${countStripes(total, p.answered)}</div>`).join('');
    return `<section class="screen">
      <div class="intro-head">
        <p class="eyebrow">Manche ${s.round} · vous avez terminé</p>
        <h1 tabindex="-1" data-focus>${left.length ? `On attend ${nameList(left.map((p) => p.name))}` : 'Tout le monde a terminé'}</h1>
        <p class="lede">Les résultats s’affichent sur tous les téléphones dès que la dernière personne a répondu.</p>
      </div>
      <div class="progress-rows">${rows}</div>
      <div class="actions">
        <button type="button" class="btn ghost" data-action="review">Revoir mes réponses</button>
        ${isHost() && left.length ? '<button type="button" class="btn" data-action="show">Afficher les résultats sans attendre</button>' : ''}
      </div>
      ${rulesCard()}
    </section>`;
  }

  function results(s: PublicRoom): string {
    const its = items();
    const sum = summarizeTable(s.itemIds, s.players.map((p) => ({ id: p.id, name: p.name, answers: p.answers ?? [] })));
    const meRes = computeResult(its, s.players.find((p) => p.id === me)?.answers ?? mine);
    const cards = sum.players.map((pr) => {
      const p = s.players.find((x) => x.id === pr.id)!;
      const r = pr.result;
      const label = r.empty ? 'Indéterminé' : r.dominant.map((k) => `<span style="--pc:${phaseVar(k)}">${phase(k).name}</span>`).join(' et ');
      return `<div class="pcard${pr.id === me ? ' me' : ''}">
        <span class="who">${esc(pr.name)}${pr.id === me ? ' (vous)' : ''}</span>
        <span class="ph">${label}</span>
        ${stripes(its, p.answers ?? [], { reveal: true })}
      </div>`;
    }).join('');
    const pairs = [
      sum.closest ? `<p>Sur la même longueur d’onde&nbsp;: <strong>${nameList(sum.closest)}</strong>.</p>` : '',
      sum.farthest ? `<p>Les plus éloignés&nbsp;: <strong>${nameList(sum.farthest)}</strong>. Laissez-les commencer.</p>` : '',
    ].join('');
    const topics = sum.topics.map((t) => {
      const kind = KIND_LABEL[t.item.kind] + (t.item.kind === 'dilemme' && t.item.theme ? ` · ${THEMES.get(t.item.theme)!.label}` : '');
      const q = t.item.kind === 'dilemme' && t.item.theme ? `${typo(THEMES.get(t.item.theme)!.q)}` : '';
      return `<article class="topic">
        <p class="label">${kind}</p>
        ${q ? `<p class="dilemma-q">${q}</p>` : ''}
        <h3>${typo(t.item.kind === 'affirmation' ? `« ${t.item.q} »` : t.item.q)}</h3>
        <ul class="groups">${t.groups.map((g) => `<li><span class="who-list">${nameList(g.names)}</span><span>${typo(t.item.kind === 'affirmation' ? (answerText(t.item, g.answer).split(' : ')[0] ?? '') : answerText(t.item, g.answer))}</span></li>`).join('')}</ul>
        <p class="relance">${typo(t.prompt)}</p>
      </article>`;
    }).join('');
    const leaning = sum.leaning ? phase(sum.leaning) : null;
    return `<section class="screen result">
      <div class="result-head">
        <p class="eyebrow">Manche ${s.round} · résultats de la table</p>
        <h2 class="names" tabindex="-1" data-focus>${leaning ? `<span class="et" style="margin-left:0">La table penche vers</span><br><span class="nm" style="--pc:${phaseVar(leaning.key)}">${leaning.name}</span>` : 'Résultats de la table'}</h2>
      </div>
      <div class="table-grid">${cards}</div>
      ${pairs ? `<div class="pairs">${pairs}</div>` : ''}
      ${topics ? `<div class="intro-head"><p class="label">${sum.topics.length > 1 ? `${sum.topics.length} sujets` : 'Un sujet'} pour la soirée</p><p class="fine">Les questions où vos réponses divergent le plus.</p>${topics}</div>` : '<p class="banner">Vous avez répondu de façon très proche. Refaites une manche pour trouver vos désaccords.</p>'}
      ${rulesCard()}
      <details class="mine"><summary>Votre profil en détail</summary>
        <p class="sub"><strong>${dominantNames(meRes).replace(/class="nm"/g, 'class="nm" style="font-size:1.4rem"')}</strong></p>
        ${profileRows(meRes)}
        ${phaseDetails(meRes)}
      </details>
      <div class="actions">
        ${isHost() ? '<button type="button" class="btn" data-action="new-round">Nouvelle manche, nouvelles questions</button>' : '<p class="fine">La personne qui anime peut lancer une nouvelle manche avec d’autres questions.</p>'}
      </div>
      ${ABOUT_NOTE}
    </section>`;
  }

  /* ---------- Rendu ---------- */

  function viewKey(): string {
    if (fatal) return `fatal:${fatal}`;
    if (!name) return 'name';
    if (!state) return `wait:${conn}`;
    if (state.status === 'playing' && index < mine.length) return `q:${state.round}:${index}`;
    return `${state.status}:${state.round}:${JSON.stringify(state.players)}:${state.hostId}`;
  }

  function render(force = false) {
    if (disposed) return;
    const key = viewKey();
    if (!force && key === lastKey) return;
    const screenChanged = key.split(':').slice(0, 3).join(':') !== lastKey.split(':').slice(0, 3).join(':');
    lastKey = key;

    let html: string;
    if (fatal) html = fatal;
    else if (!name) html = nameForm();
    else if (!state) html = `<section class="screen"><div class="intro-head"><p class="eyebrow">Partie ${esc(code)}</p><h1 tabindex="-1" data-focus>Connexion à la partie…</h1></div></section>`;
    else if (state.status === 'lobby') html = lobby(state);
    else if (state.status === 'playing') html = index < mine.length ? question(state) : waiting(state);
    else html = results(state);

    const banner = conn === 'lost' && !fatal ? '<p class="banner" role="status">Connexion perdue. Reconnexion en cours…</p>' : '';
    const flashHtml = flash ? `<p class="banner" role="alert">${esc(flash)}</p>` : '';
    root.innerHTML = banner + flashHtml + html;
    if (!screenChanged) root.querySelector('.screen')?.classList.add('still');
    if (screenChanged) focusFirst(root);
    const nf = root.querySelector<HTMLFormElement>('#name-form');
    if (nf) wireNameForm(nf);
  }

  function wireNameForm(form: HTMLFormElement) {
    const input = form.querySelector<HTMLInputElement>('#name')!;
    input.focus();
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const n = cleanName(input.value);
      if (!n) { form.querySelector('#err')!.textContent = 'Indiquez votre prénom pour rejoindre la partie.'; return; }
      name = n;
      savedName.set(n);
      connect();
      render();
    });
  }

  /* ---------- Réseau ---------- */

  function onMessage(msg: ServerMsg) {
    if (msg.type === 'error') {
      flash = msg.message;
      render(true);
      setTimeout(() => { flash = null; render(true); }, 4000);
      return;
    }
    state = msg.room;
    if (state.round !== round) {
      round = state.round;
      mine = msg.mine ?? state.itemIds.map(() => null);
      index = firstOpen();
    } else if (msg.mine) {
      // Le serveur fait foi, sauf pour la réponse en cours d'envoi.
      mine = msg.mine.map((a, i) => a ?? mine[i] ?? null);
    }
    if (state.status === 'playing' && mine.length !== state.itemIds.length) {
      mine = state.itemIds.map((_, i) => mine[i] ?? null);
      index = firstOpen();
    }
    render();
  }

  function onStatus(s: ConnStatus, info?: { code: number; reason: string }) {
    conn = s;
    if (s === 'closed') {
      fatal = info?.code === 4001
        ? message('Vous avez été retiré de la partie', 'La personne qui anime vous a retiré de cette partie. Demandez-lui le code pour revenir.')
        : message('Cette partie a expiré', 'Les parties sont effacées au bout de 12 heures. Créez-en une nouvelle pour rejouer.');
    }
    render(true);
  }

  function connect() {
    if (client || !name) return;
    client = new RoomClient(code, {
      onMessage,
      onStatus,
      hello: () => ({ type: 'join', playerId: me, name }),
    });
    client.connect();
  }

  /* ---------- Actions ---------- */

  function onClick(e: Event) {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!t || !client) return;
    switch (t.dataset.action) {
      case 'pick': {
        const v = Number(t.dataset.v);
        const i = index;
        mine[i] = v;
        client.send({ type: 'answer', index: i, value: v });
        root.querySelectorAll<HTMLElement>('.opt').forEach((b) => b.setAttribute('aria-checked', String(Number(b.dataset.v) === v)));
        root.querySelectorAll<HTMLElement>('.stripe')[i]?.style.setProperty('--pc', 'var(--done)');
        clearTimeout(timer);
        timer = setTimeout(() => {
          const next = mine.findIndex((a, j) => j > i && a === null);
          index = next === -1 ? firstOpen() : next;
          render();
        }, reduceMotion() ? 150 : 450);
        break;
      }
      case 'back': clearTimeout(timer); index = Math.max(0, index - 1); render(); break;
      case 'review': index = 0; render(); break;
      case 'start': client.send({ type: 'start' }); break;
      case 'show': client.send({ type: 'showResults' }); break;
      case 'new-round': client.send({ type: 'newRound' }); break;
      case 'claim': client.send({ type: 'claimHost' }); break;
      case 'remove': if (t.dataset.id) client.send({ type: 'remove', playerId: t.dataset.id }); break;
      case 'copy-link':
        navigator.clipboard?.writeText(joinUrl).then(
          () => { t.textContent = 'Lien copié'; },
          () => { t.textContent = joinUrl; },
        );
        break;
    }
  }

  root.addEventListener('click', onClick);
  render(true);
  roomExists(code).then((ok) => {
    if (disposed) return;
    if (!ok) {
      fatal = message('Partie introuvable', `Aucune partie ne porte le code ${esc(code)}. Elle a peut-être expiré : les parties sont effacées au bout de 12 heures.`);
      render(true);
    } else connect();
  }, () => connect());

  return () => {
    disposed = true;
    clearTimeout(timer);
    client?.close();
    root.removeEventListener('click', onClick);
  };
}
