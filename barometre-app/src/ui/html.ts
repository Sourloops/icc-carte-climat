/** Échappe tout texte venant d'un utilisateur (prénoms) avant de l'insérer dans la page. */
export function esc(s: unknown): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Typographie française : espace insécable avant ? ! : ; » et après «. À utiliser sur nos propres textes. */
export function typo(s: string): string {
  return s.replace(/ ([?!:;»])/g, ' $1').replace(/« /g, '« ');
}

/** Liste de prénoms lisible : « Paul, Violaine et Mamie ». Échappe les prénoms. */
export function nameList(names: string[]): string {
  const e = names.map(esc);
  if (e.length <= 1) return e.join('');
  return `${e.slice(0, -1).join(', ')} et ${e[e.length - 1]}`;
}

export function focusFirst(root: HTMLElement): void {
  const el = root.querySelector<HTMLElement>('[data-focus]');
  if (el) el.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

export const reduceMotion = (): boolean => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
