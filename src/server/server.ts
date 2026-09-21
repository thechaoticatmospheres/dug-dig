import { createServer } from "node:http";
import { randomBytes, randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { WebSocketServer, WebSocket } from "ws";
import {
  createGame,
  disconnect,
  Game,
  makePlayer,
  setInput,
  step,
} from "../shared/simulation";
import { Mode, neutral } from "../shared/rules";
import {
  Member,
  packTerrain,
  PROTOCOL,
  RoomView,
  ServerMessage,
  validInput,
} from "../shared/protocol";
type Slot = Member & {
  token: string;
  socket: WebSocket | null;
  lastInput: number;
  leftAt: number;
  terrainRevision: number;
};
type Room = {
  code: string;
  mode: Mode;
  host: string;
  slots: Slot[];
  game: Game | null;
  idleAt: number;
};
export function createGameServer(
  options: {
    allowedOrigins?: string[];
    maxRooms?: number;
    clock?: () => number;
  } = {},
) {
  const now = options.clock ?? Date.now,
    rooms = new Map<string, Room>();
  const server = createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      res.end(
        JSON.stringify({
          ok: true,
          game: "dug-dig",
          protocol: PROTOCOL,
          rooms: rooms.size,
        }),
      );
    } else {
      res.writeHead(404);
      res.end("Not found");
    }
  });
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: 2048,
    perMessageDeflate: {
      threshold: 1024,
      serverNoContextTakeover: true,
      clientNoContextTakeover: true,
      concurrencyLimit: 4,
      zlibDeflateOptions: { level: 3 },
    },
  });
  server.on("upgrade", (req, socket, head) => {
    const origin = req.headers.origin;
    if (
      req.url !== "/game" ||
      (options.allowedOrigins?.length &&
        (!origin || !options.allowedOrigins.includes(origin)))
    ) {
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) =>
      wss.emit("connection", ws, req),
    );
  });
  function send(ws: WebSocket, msg: ServerMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      if (ws.bufferedAmount > 512000) {
        ws.close(1013, "Slow connection");
        return;
      }
      ws.send(JSON.stringify(msg));
    }
  }
  const view = (r: Room): RoomView => ({
    code: r.code,
    mode: r.mode,
    host: r.host,
    started: !!r.game,
    members: r.slots.map(({ id, name, color, ready, connected }) => ({
      id,
      name,
      color,
      ready,
      connected,
    })),
  });
  function broadcast(r: Room, state = false) {
    let packed: string | undefined;
    for (const s of r.slots)
      if (s.socket) {
        if (state && r.game) {
          const terrain =
            s.terrainRevision === r.game.terrainRevision
              ? []
              : (packed ??= packTerrain(r.game.terrain));
          const game = {
            ...r.game,
            terrain,
            events: r.game.events.filter((e) => r.game!.tick - e.tick < 90),
          };
          send(s.socket, { type: "state", game, room: view(r) });
          s.terrainRevision = r.game.terrainRevision;
        } else send(s.socket, { type: "room", room: view(r) });
      }
  }
  function fail(ws: WebSocket, code: string, message: string) {
    send(ws, { type: "error", code, message });
  }
  wss.on("connection", (ws) => {
    let room: Room | undefined,
      slot: Slot | undefined,
      count = 0,
      windowAt = now();
    const handshake = setTimeout(() => {
      if (!slot) ws.close(1008, "Join timeout");
    }, 10000);
    ws.on("message", (raw) => {
      if (now() - windowAt >= 1000) {
        count = 0;
        windowAt = now();
      }
      if (++count > 100) {
        ws.close(1008, "Message rate exceeded");
        return;
      }
      let m: any;
      try {
        m = JSON.parse(raw.toString());
      } catch {
        fail(ws, "invalid", "Invalid message.");
        return;
      }
      if (!m || typeof m !== "object") return;
      if (!slot) {
        if (m.type !== "join" || m.version !== PROTOCOL) {
          fail(ws, "version", "Refresh the page to update this game.");
          return;
        }
        const code =
          typeof m.code === "string"
            ? m.code
                .toUpperCase()
                .replace(/[^A-Z2-9]/g, "")
                .slice(0, 6)
            : "";
        if (code) {
          room = rooms.get(code);
          if (!room) {
            fail(
              ws,
              "missing",
              "That room no longer exists. The server may have restarted. Create a new room.",
            );
            return;
          }
        } else {
          if (rooms.size >= (options.maxRooms ?? 32)) {
            fail(ws, "capacity", "The server is full. Try again shortly.");
            return;
          }
          if (m.mode !== "coop" && m.mode !== "versus") {
            fail(ws, "mode", "Choose cooperative or competitive play.");
            return;
          }
          let newCode = "";
          do {
            newCode = Array.from(
              randomBytes(6),
              (v) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[v % 32],
            ).join("");
          } while (rooms.has(newCode));
          room = {
            code: newCode,
            mode: m.mode as Mode,
            host: "",
            slots: [],
            game: null,
            idleAt: now(),
          };
          rooms.set(newCode, room);
        }
        const existing =
          typeof m.token === "string"
            ? room.slots.find((s) => s.token === m.token)
            : undefined;
        if (existing) {
          slot = existing;
          const previous = slot.socket;
          slot.socket = ws;
          slot.connected = true;
          slot.leftAt = 0;
          slot.terrainRevision = -1;
          if (previous && previous !== ws)
            previous.close(1000, "Reconnected elsewhere");
          const p = room.game?.players.find((p) => p.id === slot!.id);
          if (p) {
            p.connected = true;
            p.input = neutral();
            p.ack = 0;
          }
        } else {
          if (room.slots.length >= 4) {
            fail(ws, "full", "This room has four players.");
            return;
          }
          const name =
            (typeof m.name === "string" ? m.name : "Player")
              .replace(/[\x00-\x1f<>]/g, "")
              .trim()
              .slice(0, 14) || "Player";
          slot = {
            id: randomUUID(),
            token: randomBytes(24).toString("hex"),
            name,
            color:
              [0, 1, 2, 3].find(
                (c) => !room!.slots.some((s) => s.color === c),
              ) ?? 0,
            ready: false,
            connected: true,
            socket: ws,
            lastInput: now(),
            leftAt: 0,
            terrainRevision: -1,
          };
          room.slots.push(slot);
          if (room.game) {
            const p = makePlayer(slot.id, name, slot.color);
            p.waiting = true;
            p.alive = false;
            room.game.players.push(p);
          }
        }
        clearTimeout(handshake);
        if (!room.slots.some((s) => s.id === room!.host && s.connected))
          room.host = slot.id;
        room.idleAt = now();
        send(ws, {
          type: "welcome",
          version: PROTOCOL,
          id: slot.id,
          token: slot.token,
          room: view(room),
        });
        broadcast(room, !!room.game);
        return;
      }
      if (!room || slot.socket !== ws) return;
      if (m.type === "input" && validInput(m.input) && room.game) {
        slot.lastInput = now();
        room.idleAt = now();
        setInput(room.game, slot.id, m.input);
      } else if (
        m.type === "ready" &&
        typeof m.ready === "boolean" &&
        (!room.game || room.game.phase === "over")
      ) {
        slot.ready = m.ready;
        room.idleAt = now();
        broadcast(room);
      } else if (m.type === "start") {
        if (slot.id !== room.host) {
          fail(ws, "host", "Only the room host can start.");
          return;
        }
        if (room.game && room.game.phase !== "over") {
          fail(ws, "active", "A match is already running.");
          return;
        }
        const active = room.slots.filter((s) => s.connected);
        if (active.length < 2 || active.some((s) => !s.ready)) {
          fail(
            ws,
            "ready",
            "At least two players must be connected and everyone must be ready.",
          );
          return;
        }
        room.slots = active;
        room.idleAt = now();
        room.game = createGame(
          room.mode,
          active,
          randomBytes(4).readUInt32LE(),
        );
        for (const s of active) {
          s.ready = false;
          s.terrainRevision = -1;
        }
        broadcast(room, true);
      } else if (m.type === "leave") {
        slot.leftAt = now() - 120001;
        ws.close(1000, "Left room");
      }
    });
    ws.on("error", () => {});
    ws.on("close", () => {
      clearTimeout(handshake);
      if (!room || !slot || slot.socket !== ws) return;
      slot.socket = null;
      slot.connected = false;
      slot.ready = false;
      slot.leftAt = slot.leftAt || now();
      if (room.game) disconnect(room.game, slot.id);
      if (room.host === slot.id)
        room.host = room.slots.find((s) => s.connected)?.id ?? "";
      if (!room.slots.some((s) => s.connected)) room.idleAt = now();
      broadcast(room);
    });
  });
  let last = performance.now(),
    accumulator = 0,
    frames = 0;
  const loop = setInterval(() => {
    const time = performance.now();
    accumulator += Math.min(time - last, 250);
    last = time;
    let steps = 0;
    while (accumulator >= 1000 / 60 && steps++ < 15) {
      accumulator -= 1000 / 60;
      for (const room of rooms.values())
        if (room.game && room.slots.some((s) => s.connected)) {
          for (const s of room.slots) {
            if (now() - s.lastInput > 750) {
              const p = room.game.players.find((p) => p.id === s.id);
              if (p) p.input = { ...neutral(), seq: p.input.seq };
            }
          }
          step(room.game);
        }
      if (++frames % 3 === 0)
        for (const room of rooms.values()) if (room.game) broadcast(room, true);
    }
  }, 8);
  const cleanup = setInterval(() => {
    for (const [code, room] of rooms) {
      if (
        (!room.game || room.game.phase === "over") &&
        now() - room.idleAt > 600000
      ) {
        for (const slot of room.slots)
          slot.socket?.close(1000, "Idle lobby expired");
        rooms.delete(code);
        continue;
      }
      if (
        !room.slots.some((s) => s.connected) &&
        now() - room.idleAt > 120000
      ) {
        rooms.delete(code);
        continue;
      }
      for (const s of [...room.slots])
        if (!s.connected && now() - s.leftAt > 120000) {
          if (room.game) {
            const p = room.game.players.find((p) => p.id === s.id);
            if (p) {
              p.lives = 0;
              p.alive = false;
              p.waiting = true;
            }
          }
          room.slots = room.slots.filter((other) => other !== s);
          broadcast(room);
        }
    }
  }, 1000);
  async function close() {
    clearInterval(loop);
    clearInterval(cleanup);
    for (const ws of wss.clients) {
      send(ws, {
        type: "shutdown",
        message:
          "The server is restarting. This match has ended; reconnect to create a new room.",
      });
      ws.close(1012, "Server restart");
    }
    await new Promise<void>((resolve) => wss.close(() => resolve()));
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  return { server, wss, rooms, close };
}
