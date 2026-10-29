/** Connexion temps réel d'un téléphone à sa salle, avec reconnexion automatique. */
import type { ClientMsg, ServerMsg } from '../../shared/room';
import { apiUrl, wsUrl } from '../config';

export type ConnStatus = 'connecting' | 'open' | 'lost' | 'closed';

export interface RoomClientEvents {
  onMessage: (msg: ServerMsg) => void;
  onStatus: (s: ConnStatus, info?: { code: number; reason: string }) => void;
  /** Envoyé à chaque (re)connexion, avant tout autre message. */
  hello: () => ClientMsg;
}

/** Codes de fermeture envoyés par le serveur qui ne doivent pas déclencher de reconnexion. */
const FINAL_CODES = new Set([4001, 4404]);

export class RoomClient {
  private ws: WebSocket | null = null;
  private retry = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;
  private queue: ClientMsg[] = [];

  constructor(private code: string, private ev: RoomClientEvents) {}

  connect(): void {
    if (this.stopped) return;
    this.ev.onStatus(this.retry ? 'lost' : 'connecting');
    const ws = new WebSocket(wsUrl(`/api/rooms/${this.code}/ws`));
    this.ws = ws;
    ws.onopen = () => {
      this.retry = 0;
      ws.send(JSON.stringify(this.ev.hello()));
      for (const m of this.queue.splice(0)) ws.send(JSON.stringify(m));
      this.ev.onStatus('open');
    };
    ws.onmessage = (e) => {
      try {
        this.ev.onMessage(JSON.parse(String(e.data)) as ServerMsg);
      } catch {
        /* message illisible : ignoré */
      }
    };
    ws.onclose = (e) => {
      this.ws = null;
      if (this.stopped) return;
      if (FINAL_CODES.has(e.code)) {
        this.stopped = true;
        this.ev.onStatus('closed', { code: e.code, reason: e.reason });
        return;
      }
      this.ev.onStatus('lost');
      const delay = Math.min(8000, 600 * 2 ** this.retry++);
      this.timer = setTimeout(() => this.connect(), delay);
    };
  }

  send(msg: ClientMsg): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
    else this.queue.push(msg);
  }

  close(): void {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.ws?.close(1000, 'Fin');
  }
}

export async function createRoom(): Promise<string> {
  const res = await fetch(apiUrl('/api/rooms'), { method: 'POST' });
  const data = (await res.json().catch(() => ({}))) as { code?: string; error?: string };
  if (!res.ok || !data.code) throw new Error(data.error ?? 'Impossible de créer la salle. Vérifiez votre connexion et réessayez.');
  return data.code;
}

export async function roomExists(code: string): Promise<boolean> {
  const res = await fetch(apiUrl(`/api/rooms/${encodeURIComponent(code)}`));
  if (!res.ok) return false;
  const data = (await res.json().catch(() => ({}))) as { exists?: boolean };
  return !!data.exists;
}
