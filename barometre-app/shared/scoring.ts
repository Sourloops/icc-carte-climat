import { SCALE } from './items';
import { PHASE_KEYS, zeroScores, type Answer, type Item, type PhaseKey, type Scores } from './types';

/** Points maximum qu'une question peut donner à chaque phase. */
export function itemMax(item: Item): Scores {
  const m = zeroScores();
  for (const k of PHASE_KEYS) {
    if (item.kind === 'affirmation') {
      m[k] = Math.max(item.hi[k] ?? 0, item.lo[k] ?? 0);
    } else {
      for (const o of item.options) m[k] = Math.max(m[k], o.w[k] ?? 0);
    }
  }
  return m;
}

/** Points donnés à chaque phase par une réponse. Sur l'échelle, « Mitigé » ne donne rien. */
export function itemPoints(item: Item, answer: Answer): Scores {
  const pts = zeroScores();
  if (answer === null || answer === undefined) return pts;
  if (item.kind === 'affirmation') {
    const v = SCALE[answer]?.[1] ?? 0;
    for (const k of PHASE_KEYS) {
      pts[k] = (item.hi[k] ?? 0) * Math.max(0, v) + (item.lo[k] ?? 0) * Math.max(0, -v);
    }
  } else {
    const w = item.options[answer]?.w ?? {};
    for (const k of PHASE_KEYS) pts[k] = w[k] ?? 0;
  }
  return pts;
}

/** Phase la plus nourrie par une réponse (sert à colorer les bandes et à repérer les désaccords). */
export function answerPhase(item: Item, answer: Answer): PhaseKey | null {
  const pts = itemPoints(item, answer);
  let best: PhaseKey | null = null;
  let bv = 0;
  for (const k of PHASE_KEYS) {
    if (pts[k] > bv) {
      bv = pts[k];
      best = k;
    }
  }
  return best;
}

export function exposure(items: Item[]): Scores {
  const e = zeroScores();
  for (const it of items) {
    const m = itemMax(it);
    for (const k of PHASE_KEYS) e[k] += m[k];
  }
  return e;
}

export interface Result {
  /** Part de chaque phase dans le profil, de 0 à 1, somme = 1. */
  share: Scores;
  /** Phases de la plus forte à la plus faible. */
  ranked: PhaseKey[];
  /** Phase(s) dominante(s) : plusieurs en cas de quasi-égalité. */
  dominant: PhaseKey[];
  /** Phase en arrière-plan, si elle pèse assez. */
  second: PhaseKey | null;
  top: number;
  empty: boolean;
}

export const TIE_MARGIN = 0.03;
export const SECOND_MIN = 0.17;

/**
 * Chaque phase est rapportée au maximum qu'elle pouvait atteindre avec les questions tirées
 * (+1 de lissage), pour que le hasard du tirage ne favorise aucune phase.
 */
export function computeResult(items: Item[], answers: Answer[]): Result {
  const score = zeroScores();
  items.forEach((it, i) => {
    const p = itemPoints(it, answers[i] ?? null);
    for (const k of PHASE_KEYS) score[k] += p[k];
  });
  const ex = exposure(items);
  const norm = zeroScores();
  let sum = 0;
  for (const k of PHASE_KEYS) {
    norm[k] = ex[k] ? score[k] / (ex[k] + 1) : 0;
    sum += norm[k];
  }
  const share = zeroScores();
  for (const k of PHASE_KEYS) share[k] = sum ? norm[k] / sum : 0;
  const ranked = PHASE_KEYS.slice().sort((a, b) => share[b] - share[a]);
  const top = share[ranked[0]!];
  const dominant = ranked.filter((k) => top > 0 && top - share[k] < TIE_MARGIN);
  const second = ranked.find((k) => !dominant.includes(k) && share[k] >= SECOND_MIN) ?? null;
  return { share, ranked, dominant, second, top, empty: sum === 0 };
}

/** Distance entre deux profils (0 = identiques, 1 = opposés). */
export function profileDistance(a: Scores, b: Scores): number {
  let d = 0;
  for (const k of PHASE_KEYS) d += Math.abs(a[k] - b[k]);
  return d / 2;
}
