import { describe, expect, it } from 'vitest';
import { drawItems, optionOrder, QUESTION_COUNT } from '../shared/draw';
import { mulberry32 } from '../shared/rng';
import { computeResult, exposure } from '../shared/scoring';
import { PHASE_KEYS, type Item, type PhaseKey } from '../shared/types';

/** Réponses d'une personne qui choisit toujours la réponse la plus typique d'une phase. */
function persona(items: Item[], k: PhaseKey): number[] {
  return items.map((it) => {
    if (it.kind === 'affirmation') {
      const hi = it.hi[k] ?? 0;
      const lo = it.lo[k] ?? 0;
      return hi >= lo && hi > 0 ? 4 : lo > 0 ? 0 : 2;
    }
    let best = 0;
    let bv = -Infinity;
    it.options.forEach((o, i) => {
      const total = Object.values(o.w).reduce((a, b) => a + b, 0);
      const v = (o.w[k] ?? 0) * 10 - total;
      if (v > bv) { bv = v; best = i; }
    });
    return best;
  });
}

describe('tirage', () => {
  it('tire 10 questions, dont 3 dilemmes de thèmes différents', () => {
    const rng = mulberry32(1);
    for (let n = 0; n < 200; n++) {
      const items = drawItems(rng);
      expect(items).toHaveLength(QUESTION_COUNT);
      const themes = items.filter((i) => i.kind === 'dilemme').map((i) => i.theme);
      expect(themes).toHaveLength(3);
      expect(new Set(themes).size).toBe(3);
    }
  });

  it('équilibre les six phases dans chaque tirage', () => {
    const rng = mulberry32(2);
    for (let n = 0; n < 200; n++) {
      const e = exposure(drawItems(rng));
      const vals = PHASE_KEYS.map((k) => e[k]);
      expect(Math.max(...vals) / Math.min(...vals)).toBeLessThanOrEqual(1.5);
    }
  });

  it('est reproductible à graine égale', () => {
    const a = drawItems(mulberry32(42)).map((i) => i.id);
    const b = drawItems(mulberry32(42)).map((i) => i.id);
    expect(a).toEqual(b);
  });

  it('préfère les questions jamais vues', () => {
    const rng = mulberry32(3);
    const seen: Record<string, number> = {};
    const first = drawItems(rng);
    for (const it of first) seen[it.id] = 1;
    const second = drawItems(rng, seen);
    const repeated = second.filter((it) => seen[it.id]).length;
    expect(repeated).toBeLessThanOrEqual(1);
  });

  it('donne le même ordre de réponses à tous les joueurs d’une manche', () => {
    const item = drawItems(mulberry32(5)).find((i) => i.kind === 'situation')!;
    expect(optionOrder(item, 'ABCD:1')).toEqual(optionOrder(item, 'ABCD:1'));
  });
});

describe('notation', () => {
  it('retrouve toujours la phase d’une personne qui répond dans son sens', () => {
    const rng = mulberry32(7);
    for (const k of PHASE_KEYS) {
      for (let n = 0; n < 100; n++) {
        const items = drawItems(rng);
        expect(computeResult(items, persona(items, k)).dominant[0]).toBe(k);
      }
    }
  });

  it('ne favorise aucune phase quand on répond au hasard', () => {
    const rng = mulberry32(9);
    const wins = Object.fromEntries(PHASE_KEYS.map((k) => [k, 0])) as Record<PhaseKey, number>;
    const runs = 3000;
    for (let n = 0; n < runs; n++) {
      const items = drawItems(rng);
      const answers = items.map((it) => Math.floor(rng() * (it.kind === 'affirmation' ? 5 : it.options.length)));
      const r = computeResult(items, answers);
      wins[r.dominant[0]!]++;
    }
    for (const k of PHASE_KEYS) {
      expect(wins[k] / runs, k).toBeGreaterThan(0.12);
      expect(wins[k] / runs, k).toBeLessThan(0.22);
    }
  });

  it('signale un profil vide si tout est « Mitigé » et sans réponse', () => {
    const items = drawItems(mulberry32(11));
    const r = computeResult(items, items.map(() => null));
    expect(r.empty).toBe(true);
    expect(r.dominant).toEqual([]);
  });

  it('produit des parts qui somment à 1', () => {
    const items = drawItems(mulberry32(13));
    const r = computeResult(items, persona(items, 'a'));
    const sum = PHASE_KEYS.reduce((s, k) => s + r.share[k], 0);
    expect(sum).toBeCloseTo(1, 6);
  });
});
