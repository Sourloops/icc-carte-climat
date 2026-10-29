import { describe, expect, it } from 'vitest';
import { summarizeTable } from '../shared/debate';
import { itemById } from '../shared/items';
import { mulberry32 } from '../shared/rng';
import {
  cleanName,
  createRoom,
  MAX_PLAYERS,
  parseClientMsg,
  publicView,
  reduce,
  type ClientMsg,
  type ReduceCtx,
  type RoomState,
} from '../shared/room';

const ctx = (connected: string[] = []): ReduceCtx => ({ now: 0, rng: mulberry32(1), connected: new Set(connected) });

function apply(state: RoomState, actor: string, msg: ClientMsg, connected: string[] = []): RoomState {
  const res = reduce(state, actor, msg, ctx(connected));
  if (!res.ok) throw new Error(res.error);
  return res.state;
}

function failMsg(state: RoomState, actor: string, msg: ClientMsg): string {
  const res = reduce(state, actor, msg, ctx());
  if (res.ok) throw new Error('aurait dû échouer');
  return res.error;
}

function lobby(...names: string[]): RoomState {
  let s = createRoom('ABCD', 0);
  names.forEach((n, i) => { s = apply(s, `joueur-${i}0000`, { type: 'join', playerId: `joueur-${i}0000`, name: n }); });
  return s;
}

function answerAll(s: RoomState, playerId: string, value = 0): RoomState {
  s.itemIds.forEach((_, i) => { s = apply(s, playerId, { type: 'answer', index: i, value }); });
  return s;
}

describe('salle de jeu', () => {
  it('fait du premier arrivé l’animateur', () => {
    const s = lobby('Paul', 'Violaine');
    expect(s.hostId).toBe('joueur-00000');
    expect(s.players.map((p) => p.name)).toEqual(['Paul', 'Violaine']);
  });

  it('réserve le lancement à l’animateur et tire 10 questions pour toute la table', () => {
    const s = lobby('Paul', 'Violaine');
    expect(failMsg(s, 'joueur-10000', { type: 'start' })).toMatch(/créé la salle/);
    const started = apply(s, 'joueur-00000', { type: 'start' });
    expect(started.status).toBe('playing');
    expect(started.itemIds).toHaveLength(10);
    expect(started.players.every((p) => p.answers.length === 10)).toBe(true);
  });

  it('passe aux résultats quand tout le monde a fini', () => {
    let s = apply(lobby('Paul', 'Violaine'), 'joueur-00000', { type: 'start' });
    s = answerAll(s, 'joueur-00000');
    expect(s.status).toBe('playing');
    s = answerAll(s, 'joueur-10000');
    expect(s.status).toBe('results');
  });

  it('cache les réponses des autres pendant la partie', () => {
    let s = apply(lobby('Paul', 'Violaine'), 'joueur-00000', { type: 'start' });
    s = apply(s, 'joueur-00000', { type: 'answer', index: 0, value: 1 });
    const view = publicView(s, new Set());
    expect(view.players[0]!.answered).toBe(1);
    expect(view.players[0]!.answers).toBeNull();
  });

  it('refuse les réponses hors limites', () => {
    const s = apply(lobby('Paul'), 'joueur-00000', { type: 'start' });
    expect(failMsg(s, 'joueur-00000', { type: 'answer', index: 0, value: 99 })).toMatch(/non reconnue/);
    expect(failMsg(s, 'joueur-00000', { type: 'answer', index: 42, value: 0 })).toMatch(/non reconnue/);
  });

  it('accepte un retardataire en cours de partie', () => {
    let s = apply(lobby('Paul'), 'joueur-00000', { type: 'start' });
    s = apply(s, 'tard-000000', { type: 'join', playerId: 'tard-000000', name: 'Mamie' });
    expect(s.players[1]!.answers).toHaveLength(10);
  });

  it('limite la taille de la salle', () => {
    const s = lobby(...Array.from({ length: MAX_PLAYERS }, (_, i) => `J${i}`));
    expect(failMsg(s, 'nouveau-0000', { type: 'join', playerId: 'nouveau-0000', name: 'Un de trop' })).toMatch(/complète/);
  });

  it('enchaîne une nouvelle manche avec de nouvelles questions', () => {
    let s = apply(lobby('Paul'), 'joueur-00000', { type: 'start' });
    s = answerAll(s, 'joueur-00000');
    const first = s.itemIds;
    s = apply(s, 'joueur-00000', { type: 'newRound' });
    expect(s.round).toBe(2);
    expect(s.itemIds.filter((id) => first.includes(id)).length).toBeLessThanOrEqual(1);
    expect(s.players[0]!.answers.every((a) => a === null)).toBe(true);
  });

  it('laisse reprendre l’animation si l’animateur est déconnecté', () => {
    const s = lobby('Paul', 'Violaine');
    const res = reduce(s, 'joueur-10000', { type: 'claimHost' }, ctx(['joueur-00000']));
    expect(res.ok).toBe(false);
    const taken = apply(s, 'joueur-10000', { type: 'claimHost' }, ['joueur-10000']);
    expect(taken.hostId).toBe('joueur-10000');
  });

  it('nettoie les prénoms', () => {
    expect(cleanName('  <b>Tonton</b>   Jean  ')).toBe('bTonton/b Jean');
    expect(cleanName('x'.repeat(40))).toHaveLength(24);
  });

  it('rejette les messages mal formés', () => {
    expect(parseClientMsg('pas du json')).toBeNull();
    expect(parseClientMsg(JSON.stringify({ type: 'join', playerId: '!!', name: 'a' }))).toBeNull();
    expect(parseClientMsg(JSON.stringify({ type: 'answer', index: 1.5, value: 0 }))).toBeNull();
    expect(parseClientMsg(JSON.stringify({ type: 'start' }))).toEqual({ type: 'start' });
  });
});

describe('résumé de la table', () => {
  it('trouve des sujets de débat là où les réponses divergent', () => {
    let s = apply(lobby('Paul', 'Violaine', 'Mamie'), 'joueur-00000', { type: 'start' });
    s.itemIds.forEach((id, i) => {
      const item = itemById(id)!;
      const n = item.kind === 'affirmation' ? 5 : item.options.length;
      s = apply(s, 'joueur-00000', { type: 'answer', index: i, value: 0 });
      s = apply(s, 'joueur-10000', { type: 'answer', index: i, value: 1 % n });
      s = apply(s, 'joueur-20000', { type: 'answer', index: i, value: 4 % n });
    });
    const sum = summarizeTable(s.itemIds, s.players);
    expect(sum.players).toHaveLength(3);
    expect(sum.topics.length).toBeGreaterThan(0);
    expect(sum.topics.length).toBeLessThanOrEqual(3);
    expect(sum.closest).not.toBeNull();
    expect(sum.leaning).not.toBeNull();
  });
});
