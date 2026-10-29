import { DurableObject } from 'cloudflare:workers';
import {
  createRoom,
  parseClientMsg,
  publicView,
  reduce,
  ROOM_TTL_MS,
  type RoomState,
  type ServerMsg,
} from '../shared/room';

interface Attachment { playerId: string | null }

/**
 * Une instance par salle (identifiée par son code). Utilise l'API WebSocket « hibernation » :
 * la salle ne consomme rien tant que personne n'envoie de message.
 * L'état est conservé dans le stockage de l'objet et effacé 12 heures après la création.
 */
export class Room extends DurableObject<Env> {
  private room: RoomState | null | undefined;

  private async load(): Promise<RoomState | null> {
    if (this.room === undefined) this.room = (await this.ctx.storage.get<RoomState>('room')) ?? null;
    return this.room;
  }

  private async save(): Promise<void> {
    await this.ctx.storage.put('room', this.room);
  }

  /** Appelé par le worker à la création. Retourne false si le code est déjà pris. */
  async init(code: string): Promise<boolean> {
    if (await this.load()) return false;
    this.room = createRoom(code, Date.now());
    await this.save();
    await this.ctx.storage.setAlarm(Date.now() + ROOM_TTL_MS);
    return true;
  }

  async exists(): Promise<boolean> {
    return !!(await this.load());
  }

  override async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('WebSocket attendu', { status: 426 });
    if (!(await this.load())) return new Response('Salle introuvable', { status: 404 });
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ playerId: null } satisfies Attachment);
    return new Response(null, { status: 101, webSocket: client });
  }

  override async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    const room = await this.load();
    if (!room) {
      this.send(ws, { type: 'error', message: 'Cette salle a expiré. Créez-en une nouvelle.' });
      ws.close(4404, 'Salle expirée');
      return;
    }
    const msg = parseClientMsg(raw);
    if (!msg) return this.send(ws, { type: 'error', message: 'Message non reconnu.' });

    const att = (ws.deserializeAttachment() as Attachment | null) ?? { playerId: null };
    const actorId = msg.type === 'join' ? msg.playerId : att.playerId;
    if (!actorId) return this.send(ws, { type: 'error', message: 'Rejoignez la salle d’abord.' });

    const res = reduce(room, actorId, msg, { now: Date.now(), rng: Math.random, connected: this.connectedIds() });
    if (!res.ok) return this.send(ws, { type: 'error', message: res.error });

    if (msg.type === 'join') ws.serializeAttachment({ playerId: actorId } satisfies Attachment);
    this.room = res.state;
    await this.save();
    if (msg.type === 'remove') {
      for (const s of this.ctx.getWebSockets()) {
        const a = s.deserializeAttachment() as Attachment | null;
        if (a?.playerId === msg.playerId) s.close(4001, 'Retiré de la salle');
      }
    }
    this.broadcast();
  }

  override async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    try { ws.close(code, reason); } catch { /* déjà fermée */ }
    await this.load();
    this.broadcast(ws);
  }

  override async webSocketError(ws: WebSocket): Promise<void> {
    await this.load();
    this.broadcast(ws);
  }

  override async alarm(): Promise<void> {
    for (const ws of this.ctx.getWebSockets()) {
      try { ws.close(4404, 'Salle expirée'); } catch { /* ignore */ }
    }
    await this.ctx.storage.deleteAll();
    this.room = null;
  }

  private openSockets(except?: WebSocket): WebSocket[] {
    return this.ctx.getWebSockets().filter((s) => s !== except && s.readyState === WebSocket.OPEN);
  }

  private connectedIds(except?: WebSocket): Set<string> {
    const ids = new Set<string>();
    for (const s of this.openSockets(except)) {
      const a = s.deserializeAttachment() as Attachment | null;
      if (a?.playerId) ids.add(a.playerId);
    }
    return ids;
  }

  private broadcast(except?: WebSocket): void {
    if (!this.room) return;
    const connected = this.connectedIds(except);
    const view = publicView(this.room, connected);
    for (const s of this.openSockets(except)) {
      const a = s.deserializeAttachment() as Attachment | null;
      const me = a?.playerId ? this.room.players.find((p) => p.id === a.playerId) : undefined;
      this.send(s, { type: 'state', room: view, you: me ? me.id : null, mine: me ? me.answers : null });
    }
  }

  private send(ws: WebSocket, msg: ServerMsg): void {
    try { ws.send(JSON.stringify(msg)); } catch { /* socket fermée entre-temps */ }
  }
}
