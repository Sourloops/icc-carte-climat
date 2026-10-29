/**
 * Logique d'une salle de jeu en famille, sans dépendance au serveur : testable telle quelle.
 * Le Durable Object (worker/room-do.ts) se contente de stocker l'état, d'appeler `reduce`
 * et de diffuser `publicView` à chaque téléphone.
 */
import { drawItems } from './draw';
import { itemById, isValidAnswer } from './items';
import type { Rng } from './rng';
import type { Answer } from './types';

export const MAX_PLAYERS = 12;
export const NAME_MAX = 24;
export const ROOM_TTL_MS = 12 * 60 * 60 * 1000;
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 4;
export const CODE_RE = new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`);
export const PLAYER_ID_RE = /^[a-z0-9-]{8,64}$/;

export type Status = 'lobby' | 'playing' | 'results';

export interface Player {
  id: string;
  name: string;
  answers: Answer[];
  joinedAt: number;
}

export interface RoomState {
  code: string;
  status: Status;
  round: number;
  hostId: string | null;
  itemIds: string[];
  /** Questions déjà posées dans cette salle, toutes manches confondues. */
  history: string[];
  players: Player[];
  createdAt: number;
}

export type ClientMsg =
  | { type: 'join'; playerId: string; name: string }
  | { type: 'start' }
  | { type: 'answer'; index: number; value: number }
  | { type: 'showResults' }
  | { type: 'newRound' }
  | { type: 'remove'; playerId: string }
  | { type: 'claimHost' };

export interface PublicPlayer {
  id: string;
  name: string;
  answered: number;
  connected: boolean;
  /** Visible par tous uniquement à l'écran des résultats. */
  answers: Answer[] | null;
}

export interface PublicRoom {
  code: string;
  status: Status;
  round: number;
  hostId: string | null;
  itemIds: string[];
  players: PublicPlayer[];
}

export type ServerMsg =
  | { type: 'state'; room: PublicRoom; you: string | null; mine: Answer[] | null }
  | { type: 'error'; message: string };

export interface ReduceCtx {
  now: number;
  rng: Rng;
  connected: Set<string>;
}

export type ReduceResult = { ok: true; state: RoomState } | { ok: false; error: string };

export function createRoom(code: string, now: number): RoomState {
  return { code, status: 'lobby', round: 0, hostId: null, itemIds: [], history: [], players: [], createdAt: now };
}

export function generateCode(rng: Rng): string {
  let s = '';
  for (let i = 0; i < CODE_LENGTH; i++) s += CODE_ALPHABET[Math.floor(rng() * CODE_ALPHABET.length)];
  return s;
}

export function cleanName(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
}

function fail(error: string): ReduceResult {
  return { ok: false, error };
}

function newDraw(state: RoomState, ctx: ReduceCtx): RoomState {
  // Les questions des manches précédentes passent en dernier : chaque manche apporte du neuf.
  const seen: Record<string, number> = {};
  for (const id of state.history ?? []) seen[id] = (seen[id] ?? 0) + 1;
  const itemIds = drawItems(ctx.rng, seen).map((it) => it.id);
  return {
    ...state,
    status: 'playing',
    round: state.round + 1,
    itemIds,
    history: [...(state.history ?? []), ...itemIds],
    players: state.players.map((p) => ({ ...p, answers: itemIds.map(() => null) })),
  };
}

export function isDone(p: Player, state: RoomState): boolean {
  return state.itemIds.length > 0 && p.answers.length === state.itemIds.length && p.answers.every((a) => a !== null);
}

export function reduce(state: RoomState, actorId: string, msg: ClientMsg, ctx: ReduceCtx): ReduceResult {
  const actor = state.players.find((p) => p.id === actorId);
  const isHost = state.hostId === actorId;

  switch (msg.type) {
    case 'join': {
      const name = cleanName(msg.name);
      if (!name) return fail('Indiquez un prénom pour rejoindre la partie.');
      if (actor) {
        return { ok: true, state: { ...state, players: state.players.map((p) => (p.id === actorId ? { ...p, name } : p)) } };
      }
      if (state.players.length >= MAX_PLAYERS) return fail(`La salle est complète (${MAX_PLAYERS} joueurs au maximum).`);
      const player: Player = {
        id: actorId,
        name,
        answers: state.status === 'playing' ? state.itemIds.map(() => null) : [],
        joinedAt: ctx.now,
      };
      return { ok: true, state: { ...state, hostId: state.hostId ?? actorId, players: [...state.players, player] } };
    }

    case 'start': {
      if (!isHost) return fail('Seule la personne qui a créé la salle peut lancer la partie.');
      if (state.status !== 'lobby') return fail('La partie a déjà commencé.');
      return { ok: true, state: newDraw(state, ctx) };
    }

    case 'answer': {
      if (!actor) return fail('Rejoignez la salle avant de répondre.');
      if (state.status !== 'playing') return fail('Les réponses sont fermées pour cette manche.');
      const id = state.itemIds[msg.index];
      const item = id ? itemById(id) : undefined;
      if (!item || !isValidAnswer(item, msg.value)) return fail('Réponse non reconnue.');
      const players = state.players.map((p) => {
        if (p.id !== actorId) return p;
        const answers = state.itemIds.map((_, i) => p.answers[i] ?? null);
        answers[msg.index] = msg.value;
        return { ...p, answers };
      });
      let next: RoomState = { ...state, players };
      if (next.players.every((p) => isDone(p, next))) next = { ...next, status: 'results' };
      return { ok: true, state: next };
    }

    case 'showResults': {
      if (!isHost) return fail('Seule la personne qui a créé la salle peut afficher les résultats.');
      if (state.status !== 'playing') return fail('Aucune manche en cours.');
      return { ok: true, state: { ...state, status: 'results' } };
    }

    case 'newRound': {
      if (!isHost) return fail('Seule la personne qui a créé la salle peut lancer une nouvelle manche.');
      if (state.status !== 'results') return fail('Terminez la manche en cours avant d’en lancer une autre.');
      return { ok: true, state: newDraw(state, ctx) };
    }

    case 'remove': {
      if (!isHost) return fail('Seule la personne qui a créé la salle peut retirer un joueur.');
      if (msg.playerId === actorId) return fail('Vous ne pouvez pas vous retirer vous-même.');
      let next: RoomState = { ...state, players: state.players.filter((p) => p.id !== msg.playerId) };
      if (next.status === 'playing' && next.players.length > 0 && next.players.every((p) => isDone(p, next))) {
        next = { ...next, status: 'results' };
      }
      return { ok: true, state: next };
    }

    case 'claimHost': {
      if (!actor) return fail('Rejoignez la salle d’abord.');
      if (state.hostId && ctx.connected.has(state.hostId)) return fail('La personne qui anime la partie est toujours connectée.');
      return { ok: true, state: { ...state, hostId: actorId } };
    }
  }
}

export function publicView(state: RoomState, connected: Set<string>): PublicRoom {
  const reveal = state.status === 'results';
  return {
    code: state.code,
    status: state.status,
    round: state.round,
    hostId: state.hostId,
    itemIds: state.itemIds,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      answered: p.answers.filter((a) => a !== null).length,
      connected: connected.has(p.id),
      answers: reveal ? p.answers : null,
    })),
  };
}

/** Valide la forme d'un message reçu d'un téléphone. Retourne null si le message est invalide. */
export function parseClientMsg(raw: unknown): ClientMsg | null {
  if (typeof raw !== 'string' || raw.length > 2000) return null;
  let m: unknown;
  try {
    m = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!m || typeof m !== 'object') return null;
  const o = m as Record<string, unknown>;
  switch (o.type) {
    case 'join':
      return typeof o.playerId === 'string' && PLAYER_ID_RE.test(o.playerId) && typeof o.name === 'string'
        ? { type: 'join', playerId: o.playerId, name: o.name }
        : null;
    case 'answer':
      return Number.isInteger(o.index) && Number.isInteger(o.value)
        ? { type: 'answer', index: o.index as number, value: o.value as number }
        : null;
    case 'remove':
      return typeof o.playerId === 'string' ? { type: 'remove', playerId: o.playerId } : null;
    case 'start':
    case 'showResults':
    case 'newRound':
    case 'claimHost':
      return { type: o.type };
    default:
      return null;
  }
}
