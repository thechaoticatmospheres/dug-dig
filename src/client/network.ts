import {
  PROTOCOL,
  RoomView,
  ServerMessage,
  unpackTerrain,
} from "../shared/protocol";
import { Game, movePlayer } from "../shared/simulation";
import { Input, Mode } from "../shared/rules";
export class Network {
  socket: WebSocket | null = null;
  id = "";
  token = "";
  room: RoomView | null = null;
  game: Game | null = null;
  previous: Game | null = null;
  receivedAt = 0;
  pending: Input[] = [];
  seq = 0;
  attempt = 0;
  stopped = true;
  timer: ReturnType<typeof setTimeout> | undefined;
  join = { code: "", name: "Player", mode: "coop" as Mode };
  onChange = () => {};
  onStatus = (message: string) => {};
  onError = (message: string) => {};
  get endpoint() {
    return (
      import.meta.env.VITE_GAME_SERVER_URL ||
      (location.hostname === "localhost" || location.hostname === "127.0.0.1"
        ? "http://localhost:3001"
        : "")
    );
  }
  connect(code: string, name: string, mode: Mode, resume = false) {
    this.leave(false);
    this.join = { code, name, mode };
    this.id = "";
    this.seq = 0;
    this.pending = [];
    this.game = null;
    this.previous = null;
    this.room = null;
    this.token = resume ? readStorage(`dug-token-${code}`) : "";
    this.stopped = false;
    this.attempt = 0;
    this.open();
  }
  open() {
    if (this.stopped) return;
    if (!this.endpoint) {
      this.stopped = true;
      this.onError(
        "Online play is temporarily unavailable. Arcade and Take Turns are ready to play.",
      );
      return;
    }
    this.onStatus(
      this.attempt
        ? "Waking server / reconnecting…"
        : "Connecting to the underground…",
    );
    let url: URL;
    try {
      url = new URL(this.endpoint);
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      url.pathname = "/game";
      url.search = "";
    } catch {
      this.onError("The multiplayer server address is invalid.");
      return;
    }
    const ws = new WebSocket(url);
    this.socket = ws;
    const deadline = setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) ws.close();
    }, 18000);
    ws.onopen = () => {
      clearTimeout(deadline);
      ws.send(
        JSON.stringify({
          type: "join",
          version: PROTOCOL,
          ...this.join,
          token: this.token,
        }),
      );
    };
    ws.onmessage = (e) => {
      if (this.socket !== ws) return;
      let m: ServerMessage;
      try {
        m = JSON.parse(e.data);
      } catch {
        return;
      }
      if (m.type === "welcome") {
        this.id = m.id;
        this.token = m.token;
        this.room = m.room;
        this.join.code = m.room.code;
        this.attempt = 0;
        this.seq = 0;
        this.pending = [];
        writeStorage(`dug-token-${m.room.code}`, m.token);
        writeStorage("dug-last-room", m.room.code);
        this.onStatus("Connected");
        this.onChange();
      } else if (m.type === "room") {
        this.room = m.room;
        this.onChange();
      } else if (m.type === "state") {
        this.previous = this.game;
        const terrain =
          typeof m.game.terrain === "string"
            ? unpackTerrain(m.game.terrain)
            : m.game.terrain.length
              ? m.game.terrain
              : (this.game?.terrain ?? []);
        this.game = { ...m.game, terrain };
        this.room = m.room;
        this.receivedAt = performance.now();
        const p = this.game.players.find((p) => p.id === this.id);
        if (p) {
          this.pending = this.pending.filter((i) => i.seq > p.ack);
          if (this.game.phase === "play")
            for (const input of this.pending)
              movePlayer(this.game, p, input, false);
        }
        this.onChange();
      } else if (m.type === "error") {
        this.onError(m.message);
        if (
          ["missing", "full", "version", "mode", "capacity"].includes(m.code)
        ) {
          this.stopped = true;
          ws.close();
        }
        this.onChange();
      } else if (m.type === "shutdown") {
        this.game = null;
        this.onStatus(m.message);
      }
    };
    ws.onerror = () => {};
    ws.onclose = () => {
      clearTimeout(deadline);
      if (this.stopped || this.socket !== ws) return;
      this.game = null;
      this.onChange();
      if (++this.attempt > 10) {
        this.onError(
          "Could not reach the server. Try again from the lobby; solo Arcade still works.",
        );
        this.stopped = true;
        return;
      }
      this.onStatus("Connection lost. Rejoining your room…");
      this.timer = setTimeout(
        () => this.open(),
        Math.min(1000 * 2 ** (this.attempt - 1), 12000),
      );
    };
  }
  send(type: string, data: Record<string, unknown> = {}) {
    if (this.socket?.readyState === WebSocket.OPEN)
      this.socket.send(JSON.stringify({ type, ...data }));
  }
  input(input: Input) {
    if (
      !this.game ||
      this.game.phase === "over" ||
      this.socket?.readyState !== WebSocket.OPEN
    )
      return;
    const next = { ...input, seq: ++this.seq };
    this.send("input", { input: next });
    this.pending.push(next);
    if (this.pending.length > 120) this.pending.shift();
    const p = this.game.players.find((p) => p.id === this.id);
    if (p && this.game.phase === "play") movePlayer(this.game, p, next, false);
  }
  leave(notify = true) {
    this.stopped = true;
    clearTimeout(this.timer);
    if (notify) this.send("leave");
    this.socket?.close();
    this.socket = null;
    this.game = null;
    this.room = null;
  }
}
export function readStorage(key: string) {
  try {
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}
export function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}
