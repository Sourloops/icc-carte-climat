/**
 * Adresse du serveur des parties.
 * - En local (`npm run dev`), le serveur tourne au même endroit que le site : on laisse vide.
 * - Pour france4degres.fr/barometre, le site est sur GitHub Pages et le serveur sur Cloudflare :
 *   l'adresse vient de VITE_API_BASE dans le fichier .env.pages (voir ROADMAP.md).
 */
const raw = (import.meta.env.VITE_API_BASE as string | undefined)?.trim() ?? '';

export const API_BASE = raw.replace(/\/+$/, '');

/** Le mode famille est disponible si le serveur est au même endroit (local) ou si son adresse est renseignée. */
export const FAMILY_MODE_READY = import.meta.env.MODE !== 'pages' || /^https?:\/\//.test(API_BASE);

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

export function wsUrl(path: string): string {
  if (API_BASE) return API_BASE.replace(/^http/, 'ws') + path;
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${location.host}${path}`;
}

/** Adresse de la page du baromètre (avec /barometre/ en production), pour les liens et le QR code. */
export function pageUrl(hash = ''): string {
  return `${location.origin}${location.pathname}${hash ? `#${hash}` : ''}`;
}
