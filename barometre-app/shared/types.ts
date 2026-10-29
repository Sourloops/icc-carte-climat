/** d déni · c colère · m marchandage · t tristesse · a action · p acceptation */
export type PhaseKey = 'd' | 'c' | 'm' | 't' | 'a' | 'p';
export const PHASE_KEYS: PhaseKey[] = ['d', 'c', 'm', 't', 'a', 'p'];

export type Weights = Partial<Record<PhaseKey, number>>;
export type Scores = Record<PhaseKey, number>;

export type ThemeKey = 'alim' | 'ia' | 'carbu' | 'terr' | 'eau' | 'indus';

export interface Option { text: string; w: Weights }

interface ItemBase { id: string; q: string; /** Uniquement pour les dilemmes. */ theme?: ThemeKey }
export interface ChoiceItem extends ItemBase { kind: 'situation' | 'association' | 'dilemme'; options: Option[] }
export interface ScaleItem extends ItemBase { kind: 'affirmation'; hi: Weights; lo: Weights }
export type Item = ChoiceItem | ScaleItem;

/** Réponse : index de l'option (choix) ou index sur l'échelle d'accord (0 à 4). null = pas encore répondu. */
export type Answer = number | null;

export function zeroScores(): Scores {
  return { d: 0, c: 0, m: 0, t: 0, a: 0, p: 0 };
}
