import { ASSOCIATIONS, DILEMMES, PHASES, SITUATIONS, STATEMENTS } from './catalog';
import type { Item, PhaseKey, ThemeKey } from './types';

/** Échelle d'accord des affirmations : libellé et valeur de -1 à 1. */
export const SCALE: [label: string, value: number][] = [
  ['Pas du tout', -1],
  ['Plutôt pas', -0.5],
  ['Mitigé', 0],
  ['Plutôt', 0.5],
  ['Tout à fait', 1],
];

export const KIND_LABEL: Record<Item['kind'], string> = {
  situation: 'Situation',
  affirmation: 'Affirmation',
  association: 'Association',
  dilemme: 'Dilemme',
};

/** Le catalogue complet, avec des identifiants stables (voir la règle en tête de catalog.ts). */
export const CATALOG: Item[] = [
  ...SITUATIONS.map(([q, o], i): Item => ({ id: `s${i}`, kind: 'situation', q, options: o.map(([text, w]) => ({ text, w })) })),
  ...STATEMENTS.map(([q, hi, lo], i): Item => ({ id: `a${i}`, kind: 'affirmation', q, hi, lo })),
  ...ASSOCIATIONS.map(([q, o], i): Item => ({ id: `w${i}`, kind: 'association', q, options: o.map(([text, w]) => ({ text, w })) })),
  ...DILEMMES.flatMap((d) =>
    d.items.map(([q, o], i): Item => ({ id: `x-${d.key}-${i}`, kind: 'dilemme', theme: d.key, q, options: o.map(([text, w]) => ({ text, w })) })),
  ),
];

const BY_ID = new Map(CATALOG.map((it) => [it.id, it]));
export function itemById(id: string): Item | undefined {
  return BY_ID.get(id);
}

export const THEMES = new Map<ThemeKey, (typeof DILEMMES)[number]>(DILEMMES.map((d) => [d.key, d]));
export const PHASE_BY_KEY = new Map<PhaseKey, (typeof PHASES)[number]>(PHASES.map((p) => [p.key, p]));

export function phase(k: PhaseKey) {
  return PHASE_BY_KEY.get(k)!;
}

/** Nombre de réponses possibles pour une question. */
export function answerCount(item: Item): number {
  return item.kind === 'affirmation' ? SCALE.length : item.options.length;
}

export function isValidAnswer(item: Item, value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < answerCount(item);
}
