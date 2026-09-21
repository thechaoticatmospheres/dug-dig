import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { WebSocket, WebSocketServer } from "ws";
import { createGameServer } from "../src/server/server";
import { createGame, movePlayer, Game } from "../src/shared/simulation";
import type { Input } from "../src/shared/rules";
import { unpackTerrain } from "../src/shared/protocol";
test("150 ms round-trip delay preserves bounded movement prediction and eventual terrain agreement", async (t) => {
  const app = createGameServer();
  await new Promise<void>((r) => app.server.listen(0, "127.0.0.1", r));
  const port = (app.server.address() as any).port;
  const proxyHttp = createServer(),
    proxy = new WebSocketServer({ server: proxyHttp });
  await new Promise<void>((r) => proxyHttp.listen(0, "127.0.0.1", r));
  const proxyPort = (proxyHttp.address() as any).port;
  const timers = new Set<ReturnType<typeof setTimeout>>(),
    sockets: WebSocket[] = [];
  const later = (fn: () => void) => {
    const id = setTimeout(() => {
      timers.delete(id);
      fn();
    }, 75);
    timers.add(id);
  };
  proxy.on("connection", (front) => {
    const back = new WebSocket(`ws://127.0.0.1:${port}/game`);
    sockets.push(front, back);
    front.on("message", (b) =>
      later(() => {
        if (back.readyState === 1) back.send(b);
      }),
    );
    back.on("message", (b) =>
      later(() => {
        if (front.readyState === 1) front.send(b);
      }),
    );
    front.on("close", () => back.close());
  });
  t.after(async () => {
    for (const timer of timers) clearTimeout(timer);
    for (const s of sockets) s.terminate();
    await new Promise<void>((r) => proxy.close(() => r()));
    await new Promise<void>((r) => proxyHttp.close(() => r()));
    await app.close();
  });
  const ws = new WebSocket(`ws://127.0.0.1:${proxyPort}`);
  sockets.push(ws);
  let id = "",
    code = "",
    game: Game | null = null;
  const pending: Input[] = [];
  ws.on("message", (b) => {
    const m = JSON.parse(b.toString());
    if (m.type === "welcome") {
      id = m.id;
      code = m.room.code;
    }
    if (m.type === "state") {
      if (typeof m.game.terrain === "string")
        m.game.terrain = unpackTerrain(m.game.terrain);
      else if (!m.game.terrain.length && game) m.game.terrain = game.terrain;
      game = m.game;
      const p = game!.players.find((p) => p.id === id)!;
      while (pending.length && pending[0].seq <= p.ack) pending.shift();
      if (game!.phase === "play")
        for (const input of pending) movePlayer(game!, p, input, false);
    }
  });
  await new Promise<void>((r) => ws.once("open", r));
  ws.send(
    JSON.stringify({ type: "join", version: 1, mode: "coop", name: "Latency" }),
  );
  await wait(() => !!id);
  const room = app.rooms.get(code)!;
  room.game = createGame("coop", [{ id, name: "Latency" }]);
  room.game.phase = "play";
  room.game.enemies.forEach((e) => (e.age = -99999));
  await wait(() => !!game);
  let seq = 0;
  for (let i = 0; i < 40; i++) {
    const input: Input = { dir: 0, pump: false, seq: ++seq };
    pending.push(input);
    ws.send(JSON.stringify({ type: "input", input }));
    const g = game as unknown as Game;
    movePlayer(g, g.players[0], input, false);
    await new Promise((r) => setTimeout(r, 1000 / 60));
  }
  const predicted = (game as unknown as Game).players[0].x,
    authority = room.game.players[0].x;
  assert.ok(
    Math.abs(predicted - authority) < 20,
    `prediction error ${Math.abs(predicted - authority)}`,
  );
  ws.send(
    JSON.stringify({
      type: "input",
      input: { dir: -1, pump: false, seq: ++seq },
    }),
  );
  await new Promise((r) => setTimeout(r, 450));
  assert.deepEqual((game as unknown as Game).terrain, room.game.terrain);
  assert.ok(
    Math.abs((game as unknown as Game).players[0].x - room.game.players[0].x) <
      2,
  );
});
async function wait(fn: () => boolean) {
  const deadline = Date.now() + 3000;
  while (!fn()) {
    if (Date.now() > deadline) throw Error("timeout");
    await new Promise((r) => setTimeout(r, 10));
  }
}
