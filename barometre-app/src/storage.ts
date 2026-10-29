/** Petites préférences locales. Tout est facultatif : la page marche même si le navigateur refuse le stockage. */

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* stockage indisponible : on continue sans */
  }
}

const SEEN = 'bdc-vus';
const PLAYER = 'bdc-joueur';
const NAME = 'bdc-prenom';

/** Questions déjà vues en solo, pour proposer du neuf au passage suivant. */
export const seen = {
  get: (): Record<string, number> => read(SEEN, {}),
  add(ids: string[]) {
    const s = read<Record<string, number>>(SEEN, {});
    for (const id of ids) s[id] = (s[id] ?? 0) + 1;
    write(SEEN, s);
  },
};

let memoryId: string | null = null;

/** Identifiant de ce téléphone dans les salles (permet de revenir après une coupure). */
export function playerId(): string {
  let id = read<string | null>(PLAYER, null) ?? memoryId;
  if (!id || !/^[a-z0-9-]{8,64}$/.test(id)) {
    id = crypto.randomUUID?.() ?? `j-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    write(PLAYER, id);
  }
  memoryId = id;
  return id;
}

export const savedName = {
  get: (): string => read(NAME, ''),
  set: (n: string) => write(NAME, n),
};
