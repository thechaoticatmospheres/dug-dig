import test from "node:test";
import assert from "node:assert/strict";
import {
  award,
  carve,
  createGame,
  disconnect,
  Game,
  killPlayer,
  loadRound,
  movePlayer,
  setInput,
  solid,
  standings,
  step,
} from "../src/shared/simulation";
import { neutral, ROCK_POINTS, RULES } from "../src/shared/rules";
import { validInput } from "../src/shared/protocol";
const play = (mode: "arcade" | "coop" | "versus" = "arcade", count = 1) => {
  const g = createGame(
    mode,
    Array.from({ length: count }, (_, i) => ({
      id: `p${i}`,
      name: `Player ${i + 1}`,
    })),
  );
  g.phase = "play";
  return g;
};
const ticks = (g: Game, n: number) => {
  for (let i = 0; i < n; i++) step(g);
};
test("seeded simulation reproduces a 3600-frame input replay exactly", () => {
  const a = play("coop", 4),
    b = play("coop", 4);
  for (let i = 1; i <= 3600; i++) {
    for (const p of a.players) {
      const input = {
        dir: (Math.floor(i / 80) % 4) as 0 | 1 | 2 | 3,
        pump: i % 100 > 75,
        seq: i,
      };
      setInput(a, p.id, input);
      setInput(b, p.id, input);
    }
    step(a);
    step(b);
  }
  assert.deepEqual(a, b);
});
test("movement digs unique dirt, scores it once and respects board bounds", () => {
  const g = play(),
    p = g.players[0];
  g.enemies.forEach((e) => (e.age = -99999));
  const rev = g.terrainRevision;
  for (let i = 0; i < 200; i++)
    movePlayer(g, p, { dir: 0, pump: false, seq: i });
  assert.equal(p.x, 200);
  assert.ok(g.terrainRevision > rev);
  assert.ok(p.score > 0);
  const score = p.score;
  for (let i = 0; i < 100; i++)
    movePlayer(g, p, { dir: 2, pump: false, seq: i });
  assert.equal(p.score, score);
});
test("enemies actually move through caves instead of snapping to grid every tick", () => {
  const g = play();
  const initial = g.enemies.map((e) => [e.x, e.y]);
  ticks(g, 30);
  assert.ok(
    g.enemies.some(
      (e, i) => Math.hypot(e.x - initial[i][0], e.y - initial[i][1]) > 5,
    ),
  );
});
test("pump attaches, inflates four stages, awards depth and horizontal Fygar bonus", () => {
  const g = play(),
    p = g.players[0],
    e = g.enemies[0];
  e.kind = "fygar";
  e.x = p.x + 24;
  e.y = p.y;
  e.age = -100;
  for (let x = p.x; x <= e.x; x += 2) carve(g, x, p.y);
  p.input = { dir: 0, pump: true, seq: 1 };
  ticks(g, 56);
  assert.equal(e.state, "dead");
  assert.equal(p.score, 600);
  assert.ok(g.events.some((e) => e.kind === "pop"));
});
test("release frees ownership and deflates a stunned enemy", () => {
  const g = play(),
    p = g.players[0],
    e = g.enemies[0];
  e.x = p.x + 20;
  e.y = p.y;
  for (let x = p.x; x <= e.x; x += 2) carve(g, x, p.y);
  p.input = { dir: 0, pump: true, seq: 1 };
  step(g);
  assert.equal(e.inflation, 1);
  p.input = neutral();
  ticks(g, RULES.deflateTicks);
  assert.equal(e.owner, null);
  assert.equal(e.inflation, 0);
});
test("two pumps cannot award the same kill twice", () => {
  const g = play("versus", 2),
    [a, b] = g.players,
    e = g.enemies[0];
  a.x = b.x = 104;
  a.y = b.y = 152;
  e.x = 124;
  e.y = 152;
  for (let x = 104; x <= 124; x += 2) carve(g, x, 152);
  a.input = b.input = { dir: 0, pump: true, seq: 1 };
  ticks(g, 56);
  assert.equal(e.state, "dead");
  assert.ok(a.score > 0);
  assert.equal(b.score, 0);
  assert.equal(g.teamScore, a.score);
});
test("ghost crosses dirt and cannot be pumped", () => {
  const g = play(),
    p = g.players[0],
    e = g.enemies[0];
  e.x = p.x + 20;
  e.y = p.y;
  e.state = "ghost";
  e.timer = 150;
  p.input = { dir: 0, pump: true, seq: 1 };
  const x = e.x;
  step(g);
  assert.equal(e.inflation, 0);
  assert.ok(e.x < x);
});
test("Fygar charge becomes fire and fire harms players across thin dirt", () => {
  const g = play("coop"),
    p = g.players[0],
    e = g.enemies[0];
  e.kind = "fygar";
  e.x = p.x - 30;
  e.y = p.y;
  e.state = "charge";
  e.timer = 1;
  e.fireDir = 0;
  step(g);
  assert.equal(e.state, "fire");
  step(g);
  assert.equal(p.lives, 2);
});
test("rock support is removed by digging, owner is fixed at trigger", () => {
  const g = play("coop", 2),
    [p, q] = g.players,
    r = g.rocks[0];
  p.x = r.x - 1;
  p.y = r.y + 16;
  p.dir = 0;
  movePlayer(g, p, { dir: 0, pump: false, seq: 1 });
  assert.equal(r.state, "wobble");
  assert.equal(r.owner, p.id);
  q.x = r.x - 1;
  q.y = r.y + 16;
  q.dir = 0;
  movePlayer(g, q, { dir: 0, pump: false, seq: 1 });
  assert.equal(r.owner, p.id);
});
test("falling rock awards cumulative combo only once and crushes players without player-kill points", () => {
  const g = play("versus", 2),
    [owner, victim] = g.players,
    r = g.rocks[0];
  r.x = 104;
  r.y = 130;
  r.state = "fall";
  r.owner = owner.id;
  owner.x = 40;
  owner.y = 56;
  victim.x = 104;
  victim.y = 144;
  g.enemies.forEach((e, i) => {
    e.x = i < 2 ? 104 : 180;
    e.y = i < 2 ? 142 : 220;
  });
  for (let y = 128; y < 168; y += 2) carve(g, 104, y);
  ticks(g, 6);
  assert.equal(r.kills, 2);
  assert.equal(owner.score, ROCK_POINTS[2]);
  assert.equal(victim.lives, 2);
});
test("two falling rocks spawn one timed bonus and simultaneous collectors get one award", () => {
  const g = play("coop", 2);
  g.dropped = 2;
  for (const p of g.players) {
    p.x = 104;
    p.y = 152;
  }
  step(g);
  assert.equal(g.bonusSpawned, true);
  step(g);
  assert.equal(g.bonus, null);
  assert.equal(g.teamScore, 400);
  ticks(g, 5);
  assert.equal(g.teamScore, 400);
});
test("extra lives trigger at configured thresholds, including multiple thresholds in one award", () => {
  const g = play(),
    p = g.players[0];
  award(g, p, 85000, 0, 0);
  assert.equal(p.lives, 6);
  assert.equal(p.nextLife, 120000);
});
test("arcade death consumes one life and restores surviving enemies without resetting dug terrain", () => {
  const g = play(),
    p = g.players[0];
  carve(g, 40, 152);
  killPlayer(g, p);
  killPlayer(g, p);
  assert.equal(p.lives, 2);
  ticks(g, 100);
  assert.equal(g.phase, "ready");
  assert.equal(solid(g, 40, 152), false);
  assert.equal(p.x, 104);
});
test("co-op respawns have protection while arcade spawns do not", () => {
  const g = play("coop"),
    p = g.players[0];
  killPlayer(g, p);
  ticks(g, RULES.respawnTicks);
  assert.equal(p.alive, true);
  assert.ok(p.invulnerable > 0);
  killPlayer(g, p);
  assert.equal(p.lives, 2);
  assert.equal(play().players[0].invulnerable, 0);
});
test("five-round competitive race ends with tied placement supported", () => {
  const g = play("versus", 3);
  g.round = 5;
  g.phase = "clear";
  g.timer = 1;
  g.players[0].score = 1000;
  g.players[1].score = 1000;
  g.players[2].score = 500;
  step(g);
  assert.equal(g.phase, "over");
  assert.deepEqual(
    standings(g).map((p) => p.rank),
    [1, 1, 3],
  );
});
test("late co-op player enters next round, competitive player stays waiting during race", () => {
  const g = play("coop", 2);
  g.players[1].waiting = true;
  g.players[1].alive = false;
  loadRound(g);
  assert.equal(g.players[1].waiting, false);
  const race = play("versus", 2);
  race.players[1].waiting = true;
  race.players[1].alive = false;
  loadRound(race);
  assert.equal(race.players[1].waiting, true);
  assert.equal(race.players[1].alive, false);
});
test("all authored round rocks begin supported and outside the entry shaft", () => {
  const g = play();
  for (let round = 1; round <= 24; round++) {
    g.round = round;
    loadRound(g);
    for (const r of g.rocks) {
      assert.equal(
        solid(g, r.x, r.y + 10),
        true,
        `Round ${round}: rock ${r.id} unsupported`,
      );
      assert.equal(
        solid(g, r.x, r.y),
        true,
        `Round ${round}: rock ${r.id} overlaps a starting tunnel`,
      );
    }
  }
});
test("disconnect releases a pump and clears held movement", () => {
  const g = play("coop", 2),
    p = g.players[0],
    e = g.enemies[0];
  e.owner = p.id;
  p.input = { dir: 0, pump: true, seq: 10 };
  disconnect(g, p.id);
  assert.equal(e.owner, null);
  assert.equal(p.input.pump, false);
  assert.equal(p.connected, false);
});
test("stale input and malformed input are rejected", () => {
  const g = play();
  setInput(g, "p0", { dir: 0, pump: false, seq: 8 });
  setInput(g, "p0", { dir: 2, pump: true, seq: 7 });
  assert.equal(g.players[0].input.dir, 0);
  for (const v of [
    { dir: 10, pump: false, seq: 1 },
    { dir: 0, pump: 1, seq: 1 },
    { dir: 0, pump: false, seq: Infinity },
    null,
  ])
    assert.equal(validInput(v), false);
});
