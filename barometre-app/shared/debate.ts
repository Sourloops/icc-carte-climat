/** Ce qui nourrit la discussion à table une fois les résultats affichés. */
import { itemById, THEMES } from './items';
import { answerPhase, computeResult, profileDistance, type Result } from './scoring';
import { PHASE_KEYS, zeroScores, type Answer, type Item, type PhaseKey, type Scores } from './types';

export interface PlayerAnswers { id: string; name: string; answers: Answer[] }

export interface PlayerResult { id: string; name: string; result: Result }

export interface DebateTopic {
  item: Item;
  /** Nombre de phases différentes dans les réponses de la table. */
  spread: number;
  /** Réponses regroupées : même réponse, mêmes personnes. */
  groups: { answer: number; names: string[] }[];
  prompt: string;
}

export interface TableSummary {
  players: PlayerResult[];
  /** Profil moyen de la table. */
  share: Scores;
  leaning: PhaseKey | null;
  closest: [string, string] | null;
  farthest: [string, string] | null;
  topics: DebateTopic[];
}

/** Relances pour les questions qui ne sont pas des dilemmes. */
export const GENERIC_PROMPTS = [
  'Vous avez réagi différemment. Qu’est-ce qui, dans votre vie, explique votre réponse ?',
  'Qui aurait répondu autrement il y a dix ans ? Qu’est-ce qui a changé ?',
  'Laquelle de ces réponses vous surprend le plus venant de la personne qui l’a choisie ?',
  'Si vous deviez convaincre l’autre camp de la table, sans lui donner tort, que lui diriez-vous ?',
];

export const TABLE_RULES = [
  'On écoute chaque réponse jusqu’au bout.',
  'On cherche à comprendre, pas à convaincre.',
  'Chacun peut passer son tour, et la bûche passe avant tout.',
];

export function summarizeTable(itemIds: string[], players: PlayerAnswers[]): TableSummary {
  const items = itemIds.map((id) => itemById(id)).filter((x): x is Item => !!x);
  const results: PlayerResult[] = players.map((p) => ({ id: p.id, name: p.name, result: computeResult(items, p.answers) }));
  const scored = results.filter((r) => !r.result.empty);

  const share = zeroScores();
  for (const r of scored) for (const k of PHASE_KEYS) share[k] += r.result.share[k] / scored.length;
  const leaning = scored.length ? PHASE_KEYS.slice().sort((a, b) => share[b] - share[a])[0]! : null;

  let closest: [string, string] | null = null;
  let farthest: [string, string] | null = null;
  let dMin = Infinity;
  let dMax = -Infinity;
  for (let i = 0; i < scored.length; i++) {
    for (let j = i + 1; j < scored.length; j++) {
      const d = profileDistance(scored[i]!.result.share, scored[j]!.result.share);
      if (d < dMin) { dMin = d; closest = [scored[i]!.name, scored[j]!.name]; }
      if (d > dMax) { dMax = d; farthest = [scored[i]!.name, scored[j]!.name]; }
    }
  }
  if (scored.length < 3) farthest = null;

  const topics: DebateTopic[] = [];
  items.forEach((item, i) => {
    const answered = players.filter((p) => p.answers[i] !== null && p.answers[i] !== undefined);
    if (answered.length < 2) return;
    const phases = new Set(answered.map((p) => answerPhase(item, p.answers[i]!)).filter(Boolean));
    const byAnswer = new Map<number, string[]>();
    for (const p of answered) {
      const a = p.answers[i]!;
      byAnswer.set(a, [...(byAnswer.get(a) ?? []), p.name]);
    }
    const prompt = item.kind === 'dilemme' && item.theme
      ? THEMES.get(item.theme)!.relance
      : GENERIC_PROMPTS[i % GENERIC_PROMPTS.length]!;
    topics.push({
      item,
      spread: phases.size,
      groups: [...byAnswer.entries()].sort((a, b) => b[1].length - a[1].length).map(([answer, names]) => ({ answer, names })),
      prompt,
    });
  });
  // Les questions qui divisent le plus d'abord ; à égalité, les dilemmes de société.
  topics.sort((a, b) => b.spread - a.spread || Number(b.item.kind === 'dilemme') - Number(a.item.kind === 'dilemme'));

  return {
    players: results,
    share,
    leaning,
    closest: scored.length >= 2 ? closest : null,
    farthest,
    topics: topics.filter((t) => t.spread >= 2).slice(0, 3),
  };
}
