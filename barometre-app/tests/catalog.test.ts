import { describe, expect, it } from 'vitest';
import { DILEMMES, PHASES } from '../shared/catalog';
import { CATALOG } from '../shared/items';
import { itemMax } from '../shared/scoring';
import { PHASE_KEYS } from '../shared/types';

describe('catalogue', () => {
  it('contient assez de questions pour renouveler chaque passage', () => {
    expect(CATALOG.length).toBeGreaterThanOrEqual(96);
  });

  it('a des identifiants uniques', () => {
    expect(new Set(CATALOG.map((i) => i.id)).size).toBe(CATALOG.length);
  });

  it('décrit les six phases', () => {
    expect(PHASES.map((p) => p.key).sort()).toEqual([...PHASE_KEYS].sort());
  });

  it('couvre les six dilemmes de « Un commun accord », avec au moins 5 situations chacun', () => {
    expect(DILEMMES).toHaveLength(6);
    for (const d of DILEMMES) expect(d.items.length).toBeGreaterThanOrEqual(5);
  });

  it('donne à chaque réponse au moins un point, avec des poids de 1 ou 2', () => {
    for (const it of CATALOG) {
      if (it.kind === 'affirmation') {
        expect(Object.keys(it.hi).length, it.q).toBeGreaterThan(0);
        continue;
      }
      expect(it.options.length, it.q).toBeGreaterThanOrEqual(4);
      for (const o of it.options) {
        const vals = Object.values(o.w);
        expect(vals.length, o.text).toBeGreaterThan(0);
        for (const v of vals) expect([1, 2], o.text).toContain(v);
      }
    }
  });

  it('ne trahit pas la phase par son vocabulaire', () => {
    const giveaways = /\b(déni|colère|marchandage|dépression|acceptation)\b/i;
    for (const it of CATALOG) {
      expect(it.q, it.id).not.toMatch(giveaways);
      if (it.kind !== 'affirmation') for (const o of it.options) expect(o.text, it.id).not.toMatch(giveaways);
    }
  });

  it('expose chaque phase de façon comparable sur l’ensemble du catalogue', () => {
    const total = Object.fromEntries(PHASE_KEYS.map((k) => [k, 0])) as Record<string, number>;
    for (const it of CATALOG) {
      const m = itemMax(it);
      for (const k of PHASE_KEYS) total[k]! += m[k];
    }
    const vals = Object.values(total);
    expect(Math.max(...vals) / Math.min(...vals)).toBeLessThan(1.35);
  });
});
