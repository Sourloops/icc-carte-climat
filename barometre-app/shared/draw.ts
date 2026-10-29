import { CATALOG } from './items';
import { shuffle, hashString, mulberry32, type Rng } from './rng';
import { exposure } from './scoring';
import { PHASE_KEYS, type Item } from './types';

/** Composition d'un questionnaire : 3 dilemmes (thèmes distincts), 4 situations, 2 affirmations, 1 association. */
export const MIX: Record<Item['kind'], number> = { dilemme: 3, situation: 4, affirmation: 2, association: 1 };
export const QUESTION_COUNT = Object.values(MIX).reduce((a, b) => a + b, 0);

/** Écart toléré entre la phase la plus exposée et la moins exposée. */
const BALANCE_TARGET = 1.5;
const ATTEMPTS = 80;

/**
 * Tire les questions d'un passage.
 * `seen` (facultatif) compte les questions déjà vues par cette personne : on préfère les nouvelles.
 * Garde le tirage le plus équilibré entre les six phases.
 */
export function drawItems(rng: Rng, seen: Record<string, number> = {}): Item[] {
  let best: Item[] = [];
  let bestRatio = Infinity;
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const pick: Item[] = [];
    for (const kind of Object.keys(MIX) as Item['kind'][]) {
      const pool = CATALOG.filter((it) => it.kind === kind)
        .map((it) => ({ it, key: (seen[it.id] ?? 0) + rng() * 0.9 }))
        .sort((x, y) => x.key - y.key)
        .map((x) => x.it);
      if (kind === 'dilemme') {
        const used = new Set<string>();
        for (const it of pool) {
          if (pick.filter((p) => p.kind === 'dilemme').length >= MIX.dilemme) break;
          if (it.kind === 'dilemme' && it.theme && !used.has(it.theme)) {
            used.add(it.theme);
            pick.push(it);
          }
        }
      } else {
        pick.push(...pool.slice(0, MIX[kind]));
      }
    }
    const e = exposure(pick);
    const vals = PHASE_KEYS.map((k) => e[k]);
    const ratio = Math.max(...vals) / Math.max(0.5, Math.min(...vals));
    if (ratio < bestRatio) {
      best = pick;
      bestRatio = ratio;
    }
    if (ratio <= BALANCE_TARGET) break;
  }
  return shuffle(best, rng);
}

/**
 * Ordre d'affichage des réponses d'une question. Reproductible : à salle et manche égales,
 * tout le monde voit les réponses dans le même ordre, ce qui facilite la discussion.
 */
export function optionOrder(item: Item, salt: string): number[] {
  if (item.kind === 'affirmation') return [0, 1, 2, 3, 4];
  const idx = item.options.map((_, i) => i);
  return shuffle(idx, mulberry32(hashString(`${salt}:${item.id}`)));
}
