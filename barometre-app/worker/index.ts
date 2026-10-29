/**
 * Serveur des parties en famille (Cloudflare Worker).
 * Le site public est servi par GitHub Pages sur france4degres.fr/barometre/ ; ce worker ne sert que l'API.
 * (En local, `npm run dev` sert aussi le site, au même endroit.)
 *
 *   POST /api/rooms              crée une salle et renvoie { code }
 *   GET  /api/rooms/:code        { exists: boolean }
 *   GET  /api/rooms/:code/ws     connexion temps réel (WebSocket) à la salle
 */
import { CODE_RE, generateCode } from '../shared/room';
import { Room } from './room-do';

export { Room };

/** Le site lui-même (même adresse que le worker) est toujours autorisé ; ALLOWED_ORIGINS ajoute france4degres.fr. */
function allowedOrigin(request: Request, env: Env): string | null {
  const origin = request.headers.get('Origin');
  if (!origin) return null;
  if (origin === new URL(request.url).origin) return origin;
  const list = (env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return list.includes(origin) ? origin : null;
}

function json(data: unknown, status: number, origin: string | null): Response {
  const headers: Record<string, string> = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
  if (origin) {
    headers['access-control-allow-origin'] = origin;
    headers['vary'] = 'Origin';
  }
  return new Response(JSON.stringify(data), { status, headers });
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return new Response('Page introuvable', { status: 404 });

    const origin = allowedOrigin(request, env);
    // Un navigateur venant d'un autre site n'a rien à faire ici.
    if (request.headers.get('Origin') && !origin) return json({ error: 'Origine non autorisée.' }, 403, null);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': origin ?? '',
          'access-control-allow-methods': 'GET, POST, OPTIONS',
          'access-control-max-age': '86400',
          vary: 'Origin',
        },
      });
    }

    if (url.pathname === '/api/rooms' && request.method === 'POST') {
      for (let attempt = 0; attempt < 6; attempt++) {
        const code = generateCode(Math.random);
        if (await env.ROOMS.getByName(code).init(code)) return json({ code }, 201, origin);
      }
      return json({ error: 'Impossible de créer une partie pour le moment. Réessayez.' }, 503, origin);
    }

    const m = url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)(\/ws)?$/);
    if (m) {
      const code = m[1]!.toUpperCase();
      if (!CODE_RE.test(code)) return json({ error: 'Code de partie invalide.' }, 400, origin);
      const stub = env.ROOMS.getByName(code);
      if (m[2]) return stub.fetch(request);
      return json({ exists: await stub.exists() }, 200, origin);
    }

    return json({ error: 'Adresse inconnue.' }, 404, origin);
  },
} satisfies ExportedHandler<Env>;
