import test, { TestContext } from "node:test";
import assert from "node:assert/strict";
import { WebSocket } from "ws";
import { createGameServer } from "../src/server/server";
import { ServerMessage } from "../src/shared/protocol";
async function fixture(t: TestContext) {
  const app = createGameServer({ allowedOrigins: ["http://localhost:5173"] });
  await new Promise<void>((resolve) =>
    app.server.listen(0, "127.0.0.1", resolve),
  );
  const address = app.server.address() as { port: number };
  const url = `ws://127.0.0.1:${address.port}/game`;
  const clients: WebSocket[] = [];
  t.after(async () => {
    for (const ws of clients) ws.terminate();
    await app.close();
  });
  async function join(code = "", mode = "coop", token = "", name = "Player") {
    const ws = new WebSocket(url, { origin: "http://localhost:5173" });
    clients.push(ws);
    const messages: ServerMessage[] = [];
    ws.on("message", (b) => messages.push(JSON.parse(b.toString())));
    await new Promise<void>((resolve) => ws.once("open", resolve));
    ws.send(
      JSON.stringify({ type: "join", version: 1, code, mode, token, name }),
    );
    await until(() =>
      messages.some((m) => m.type === "welcome" || m.type === "error"),
    );
    return {
      ws,
      messages,
      welcome: messages.find((m) => m.type === "welcome") as Extract<
        ServerMessage,
        { type: "welcome" }
      >,
      send: (type: string, data: object = {}) =>
        ws.send(JSON.stringify({ type, ...data })),
    };
  }
  return { app, join, url };
}
async function until(fn: () => unknown, ms = 3000) {
  const start = Date.now();
  while (!fn()) {
    if (Date.now() - start > ms)
      throw Error("Timed out waiting for network state");
    await new Promise((r) => setTimeout(r, 10));
  }
}
test("four clients join, ready and see authoritative movement with room isolation", async (t) => {
  const { app, join } = await fixture(t);
  const a = await join(),
    code = a.welcome.room.code,
    b = await join(code),
    c = await join(code),
    d = await join(code),
    other = await join();
  for (const p of [a, b, c, d]) p.send("ready", { ready: true });
  await until(() => app.rooms.get(code)!.slots.every((s) => s.ready));
  a.send("start");
  await until(() => !!app.rooms.get(code)?.game);
  const room = app.rooms.get(code)!;
  room.game!.phase = "play";
  const player = room.game!.players[0],
    x = player.x;
  a.send("input", { input: { dir: 0, pump: false, seq: 1 } });
  await until(() => player.x > x + 4);
  await until(() =>
    [a, b, c, d].every((p) =>
      p.messages.some((m) => m.type === "state" && m.game.players[0].x > x + 3),
    ),
  );
  assert.equal(app.rooms.get(other.welcome.room.code)!.game, null);
  assert.equal(room.game!.players.length, 4);
});
test("host departure transfers host and token reconnect restores identity and score", async (t) => {
  const { app, join } = await fixture(t),
    a = await join(),
    code = a.welcome.room.code,
    b = await join(code);
  a.send("ready", { ready: true });
  b.send("ready", { ready: true });
  await until(() => app.rooms.get(code)!.slots.every((s) => s.ready));
  a.send("start");
  await until(() => !!app.rooms.get(code)?.game);
  app.rooms.get(code)!.game!.players[0].score = 1234;
  a.ws.close();
  await until(() => app.rooms.get(code)!.host === b.welcome.id);
  const restored = await join(code, "coop", a.welcome.token);
  assert.equal(restored.welcome.id, a.welcome.id);
  assert.equal(app.rooms.get(code)!.game!.players[0].score, 1234);
  assert.equal(app.rooms.get(code)!.game!.players[0].connected, true);
});
test("room refuses fifth player and unknown room", async (t) => {
  const { join } = await fixture(t),
    a = await join(),
    code = a.welcome.room.code;
  await join(code);
  await join(code);
  await join(code);
  const fifth = await join(code);
  assert.ok(
    fifth.messages.some((m) => m.type === "error" && m.code === "full"),
  );
  const missing = await join("ZZZZZZ");
  assert.ok(
    missing.messages.some((m) => m.type === "error" && m.code === "missing"),
  );
});
test("only host starts, everyone must be ready, active game cannot be restarted", async (t) => {
  const { app, join } = await fixture(t),
    a = await join(),
    code = a.welcome.room.code,
    b = await join(code);
  b.send("start");
  await until(() =>
    b.messages.some((m) => m.type === "error" && m.code === "host"),
  );
  a.send("start");
  await until(() =>
    a.messages.some((m) => m.type === "error" && m.code === "ready"),
  );
  a.send("ready", { ready: true });
  b.send("ready", { ready: true });
  await until(() => app.rooms.get(code)!.slots.every((s) => s.ready));
  a.send("start");
  await until(() => !!app.rooms.get(code)?.game);
  a.send("start");
  await until(() =>
    a.messages.some((m) => m.type === "error" && m.code === "active"),
  );
});
test("untrusted score fields and stale commands do not modify authoritative score", async (t) => {
  const { app, join } = await fixture(t),
    a = await join(),
    code = a.welcome.room.code,
    b = await join(code);
  a.send("ready", { ready: true });
  b.send("ready", { ready: true });
  await until(() => app.rooms.get(code)!.slots.every((s) => s.ready));
  a.send("start");
  await until(() => !!app.rooms.get(code)?.game);
  a.send("score", { score: 999999 });
  a.send("input", { input: { dir: -1, pump: false, seq: 5, score: 999999 } });
  a.send("input", { input: { dir: 0, pump: true, seq: 4 } });
  await new Promise((r) => setTimeout(r, 100));
  const p = app.rooms.get(code)!.game!.players[0];
  assert.equal(p.score, 0);
  assert.equal(p.input.seq, 5);
  assert.equal(p.input.dir, -1);
});
test("competitive late join spectates and rematch resets score and roster", async (t) => {
  const { app, join } = await fixture(t),
    a = await join("", "versus"),
    code = a.welcome.room.code,
    b = await join(code);
  a.send("ready", { ready: true });
  b.send("ready", { ready: true });
  await until(() => app.rooms.get(code)!.slots.every((s) => s.ready));
  a.send("start");
  await until(() => !!app.rooms.get(code)?.game);
  const c = await join(code);
  assert.equal(
    app.rooms.get(code)!.game!.players.find((p) => p.id === c.welcome.id)!
      .waiting,
    true,
  );
  app.rooms.get(code)!.game!.phase = "over";
  app.rooms.get(code)!.game!.players[0].score = 500;
  for (const p of [a, b, c]) p.send("ready", { ready: true });
  await until(() => app.rooms.get(code)!.slots.every((s) => s.ready));
  a.send("start");
  await until(() => app.rooms.get(code)!.game!.phase === "ready");
  assert.equal(app.rooms.get(code)!.game!.players[0].score, 0);
  assert.equal(app.rooms.get(code)!.game!.players[2].waiting, false);
});
test("invalid origin is denied before WebSocket upgrade", async (t) => {
  const { url } = await fixture(t);
  const ws = new WebSocket(url, { origin: "https://untrusted.example" });
  const error = await new Promise<Error>((resolve) =>
    ws.once("error", resolve),
  );
  assert.match(error.message, /403/);
});
