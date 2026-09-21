import {
  at,
  BONUS_POINTS,
  CELL,
  COLS,
  Direction,
  DX,
  DY,
  Input,
  LEFT,
  Mode,
  neutral,
  ROCK_POINTS,
  ROWS,
  RULES,
  TERRAIN_H,
  TERRAIN_W,
  TERRAIN_X,
  TERRAIN_Y,
  TOP,
} from "./rules";
import { layoutFor } from "./levels";
export type Player = {
  id: string;
  name: string;
  color: number;
  x: number;
  y: number;
  dir: Direction;
  input: Input;
  ack: number;
  score: number;
  lives: number;
  nextLife: number;
  alive: boolean;
  connected: boolean;
  waiting: boolean;
  respawn: number;
  invulnerable: number;
  moving: boolean;
  pumping: boolean;
  digCredit: number;
  hose: number;
};
export type Enemy = {
  id: number;
  kind: "pooka" | "fygar";
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  dir: Direction;
  state: "walk" | "ghost" | "charge" | "fire" | "dead" | "escape";
  timer: number;
  age: number;
  inflation: number;
  pumpTicks: number;
  owner: string | null;
  deflate: number;
  fireDir: Direction;
};
export type Rock = {
  id: number;
  x: number;
  y: number;
  state: "rest" | "wobble" | "fall" | "crumble" | "gone";
  timer: number;
  owner: string | null;
  kills: number;
  awarded: number;
  distance: number;
};
export type GameEvent = {
  id: number;
  tick: number;
  kind: string;
  x: number;
  y: number;
  value?: number;
  player?: string;
};
export type Game = {
  mode: Mode;
  tick: number;
  seed: number;
  round: number;
  phase: "ready" | "play" | "death" | "clear" | "over";
  timer: number;
  players: Player[];
  enemies: Enemy[];
  rocks: Rock[];
  terrain: number[];
  terrainRevision: number;
  roundPlayers: number;
  teamScore: number;
  dropped: number;
  bonus: {
    x: number;
    y: number;
    timer: number;
    value: number;
    kind: number;
  } | null;
  bonusSpawned: boolean;
  events: GameEvent[];
  nextEvent: number;
};
export function event(
  g: Game,
  kind: string,
  x = 112,
  y = 144,
  value?: number,
  player?: string,
) {
  g.events.push({ id: g.nextEvent++, tick: g.tick, kind, x, y, value, player });
  if (g.events.length > 48) g.events.shift();
}
export function makePlayer(id: string, name: string, color: number): Player {
  return {
    id,
    name,
    color,
    ...at(5, 6),
    dir: 0,
    input: neutral(),
    ack: 0,
    score: 0,
    lives: 3,
    nextLife: 10000,
    alive: true,
    connected: true,
    waiting: false,
    respawn: 0,
    invulnerable: 0,
    moving: false,
    pumping: false,
    digCredit: 0,
    hose: 0,
  };
}
export function createGame(
  mode: Mode,
  people: { id: string; name: string; color?: number }[],
  seed = 12345,
): Game {
  const g: Game = {
    mode,
    tick: 0,
    seed: seed >>> 0,
    round: 1,
    phase: "ready",
    timer: RULES.readyTicks,
    players: people.map((p, i) => makePlayer(p.id, p.name, p.color ?? i)),
    enemies: [],
    rocks: [],
    terrain: [],
    terrainRevision: 0,
    roundPlayers: people.length,
    teamScore: 0,
    dropped: 0,
    bonus: null,
    bonusSpawned: false,
    events: [],
    nextEvent: 1,
  };
  loadRound(g);
  return g;
}
function random(g: Game) {
  let s = g.seed;
  s ^= s << 13;
  s ^= s >>> 17;
  s ^= s << 5;
  g.seed = s >>> 0;
  return g.seed / 4294967296;
}
export function solid(g: Game, x: number, y: number): boolean {
  const c = Math.floor((x - TERRAIN_X) / 4),
    r = Math.floor((y - TERRAIN_Y) / 4);
  return c < 0 || c >= TERRAIN_W || r < 0 || r >= TERRAIN_H
    ? true
    : !!g.terrain[r * TERRAIN_W + c];
}
export function carve(g: Game, x: number, y: number): number {
  let count = 0;
  for (let yy = -5; yy <= 5; yy += 2)
    for (let xx = -5; xx <= 5; xx += 2) {
      const c = Math.floor((x + xx - TERRAIN_X) / 4),
        r = Math.floor((y + yy - TERRAIN_Y) / 4);
      if (c >= 0 && c < TERRAIN_W && r >= 0 && r < TERRAIN_H) {
        const i = r * TERRAIN_W + c;
        if (g.terrain[i]) {
          g.terrain[i] = 0;
          count++;
        }
      }
    }
  if (count) g.terrainRevision++;
  return count;
}
function tunnel(g: Game, x1: number, y1: number, x2: number, y2: number) {
  const n = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
  for (let i = 0; i <= n; i += 2)
    carve(g, x1 + ((x2 - x1) * i) / (n || 1), y1 + ((y2 - y1) * i) / (n || 1));
}
export function loadRound(g: Game) {
  g.terrain = Array(TERRAIN_W * TERRAIN_H).fill(1);
  g.terrainRevision++;
  g.dropped = 0;
  g.bonus = null;
  g.bonusSpawned = false;
  const layout = layoutFor(g.round);
  tunnel(g, LEFT, TOP, LEFT + (COLS - 1) * CELL, TOP);
  tunnel(g, 104, TOP, 104, 152);
  tunnel(g, 88, 152, 136, 152);
  for (const [c, r, c2, r2] of layout.caves) {
    const a = at(c, r),
      b = at(c2, r2);
    tunnel(g, a.x, a.y, b.x, b.y);
  }
  g.rocks = layout.rocks.map(([c, r], i) => ({
    id: i,
    ...at(c, r),
    state: "rest",
    timer: 0,
    owner: null,
    kills: 0,
    awarded: 0,
    distance: 0,
  }));
  const entries = [...layout.enemies];
  g.roundPlayers = g.players.filter(
    (p) => p.connected && p.lives > 0 && (!p.waiting || g.mode === "coop"),
  ).length;
  if (g.mode !== "arcade")
    for (let i = 1; i < g.roundPlayers; i++) {
      const base = layout.enemies[(i * 2) % layout.enemies.length];
      entries.push([base[0], base[1], i % 2 ? "pooka" : "fygar"]);
    }
  g.enemies = entries.map(([c, r, kind], i) => ({
    id: i,
    kind,
    ...at(c, r),
    homeX: at(c, r).x,
    homeY: at(c, r).y,
    dir: (i % 2 ? 2 : 0) as Direction,
    state: "walk",
    timer: 0,
    age: i * 35,
    inflation: 0,
    pumpTicks: 0,
    owner: null,
    deflate: 0,
    fireDir: 0,
  }));
  for (const p of g.players) {
    if (p.waiting && p.connected && g.mode === "coop") {
      p.waiting = false;
      p.lives = 3;
    }
    p.alive = p.lives > 0 && !p.waiting;
    p.respawn = 0;
    p.invulnerable = 0;
    p.input = neutral();
    p.pumping = false;
    p.moving = false;
    const spawn = at(4 + p.color, 6);
    p.x = g.mode === "arcade" ? 104 : spawn.x;
    p.y = 152;
    if (p.alive) carve(g, p.x, p.y);
  }
  g.phase = "ready";
  g.timer = RULES.readyTicks;
  event(g, "ready");
}
export function award(
  g: Game,
  p: Player | undefined,
  points: number,
  x: number,
  y: number,
  popup = true,
) {
  if (!p) return;
  p.score += points;
  g.teamScore += points;
  while (p.score >= p.nextLife) {
    p.lives++;
    p.nextLife = p.nextLife === 10000 ? 40000 : p.nextLife + 40000;
    event(g, "life", p.x, p.y, undefined, p.id);
  }
  if (popup) event(g, "score", x, y, points, p.id);
}
const roundPos = (v: number) => Math.round(v * 1000) / 1000;
const nearLine = (v: number, origin: number) =>
  Math.abs(v - (Math.round((v - origin) / CELL) * CELL + origin)) <= 1.05;
function canStep(g: Game, x: number, y: number) {
  return (
    x >= LEFT &&
    x <= LEFT + (COLS - 1) * CELL &&
    y >= TOP &&
    y <= TOP + (ROWS - 1) * CELL &&
    !g.rocks.some(
      (r) =>
        r.state === "rest" && Math.abs(x - r.x) < 10 && Math.abs(y - r.y) < 10,
    )
  );
}
export function movePlayer(g: Game, p: Player, input: Input, edit = true) {
  p.moving = false;
  p.pumping = input.pump;
  p.hose = input.pump ? RULES.pumpReach : 0;
  if (!p.alive || !p.connected || p.waiting || input.pump || input.dir < 0)
    return;
  const wanted = input.dir as Direction;
  if (wanted % 2 === p.dir % 2) p.dir = wanted;
  else if (nearLine(wanted % 2 ? p.x : p.y, wanted % 2 ? LEFT : TOP)) {
    if (wanted % 2) p.x = Math.round((p.x - LEFT) / CELL) * CELL + LEFT;
    else p.y = Math.round((p.y - TOP) / CELL) * CELL + TOP;
    p.dir = wanted;
  }
  const digging = solid(g, p.x + DX[p.dir] * 7, p.y + DY[p.dir] * 7),
    speed = digging ? RULES.digSpeed : RULES.tunnelSpeed;
  const x = roundPos(p.x + DX[p.dir] * speed),
    y = roundPos(p.y + DY[p.dir] * speed);
  if (canStep(g, x, y)) {
    p.x = x;
    p.y = y;
    p.moving = true;
    if (edit) {
      p.digCredit += carve(g, x, y);
      while (p.digCredit >= 12) {
        p.digCredit -= 12;
        award(g, p, 10, x, y, false);
      }
      for (const rock of g.rocks)
        if (rock.state === "rest" && !solid(g, rock.x, rock.y + 10)) {
          rock.state = "wobble";
          rock.timer = RULES.rockWobble;
          rock.owner = p.id;
          event(g, "wobble", rock.x, rock.y);
        }
    }
  }
}
function resetSurvivors(g: Game) {
  for (const e of g.enemies)
    if (e.state !== "dead") {
      e.x = e.homeX;
      e.y = e.homeY;
      e.state = "walk";
      e.inflation = 0;
      e.owner = null;
      e.age = 0;
    }
  for (const p of g.players)
    if (p.lives > 0) {
      p.alive = true;
      p.x = 104;
      p.y = 152;
      p.input = neutral();
      p.pumping = false;
      carve(g, p.x, p.y);
    }
  g.phase = "ready";
  g.timer = RULES.readyTicks;
}
export function killPlayer(g: Game, p: Player) {
  if (!p.alive || p.invulnerable > 0) return;
  p.alive = false;
  p.lives--;
  p.respawn = RULES.respawnTicks;
  p.pumping = false;
  p.input = neutral();
  for (const e of g.enemies) if (e.owner === p.id) e.owner = null;
  event(g, "death", p.x, p.y, undefined, p.id);
  if (g.mode === "arcade") {
    g.phase = "death";
    g.timer = 100;
  }
}
function respawn(g: Game, p: Player) {
  const candidates = [
    at(5, 6),
    at(4, 6),
    at(6, 6),
    at(5, 0),
    at(0, 0),
    at(11, 0),
  ];
  const safe = candidates.sort((a, b) => danger(g, b) - danger(g, a))[0];
  p.x = safe.x;
  p.y = safe.y;
  carve(g, p.x, p.y);
  p.alive = true;
  p.invulnerable = RULES.protectionTicks;
  event(g, "respawn", p.x, p.y, undefined, p.id);
}
function danger(g: Game, a: { x: number; y: number }) {
  return Math.min(
    999,
    ...g.enemies
      .filter((e) => e.state !== "dead")
      .map((e) => Math.hypot(a.x - e.x, a.y - e.y)),
    ...g.rocks
      .filter((r) => r.state === "fall" || r.state === "wobble")
      .map((r) => Math.hypot(a.x - r.x, a.y - r.y)),
  );
}
function pump(g: Game, p: Player) {
  if (!p.pumping || !p.alive || !p.connected) return;
  const targets = g.enemies
    .filter(
      (e) =>
        e.state !== "dead" &&
        e.state !== "ghost" &&
        (!e.owner || e.owner === p.id),
    )
    .filter((e) => {
      const forward = (e.x - p.x) * DX[p.dir] + (e.y - p.y) * DY[p.dir],
        side = Math.abs((e.x - p.x) * DY[p.dir] - (e.y - p.y) * DX[p.dir]);
      return forward >= 0 && forward <= RULES.pumpReach && side < 9;
    })
    .sort(
      (a, b) =>
        Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y),
    );
  const e = targets[0];
  if (!e) return;
  const length = Math.hypot(e.x - p.x, e.y - p.y);
  for (let d = 8; d < length - 6; d += 4)
    if (solid(g, p.x + DX[p.dir] * d, p.y + DY[p.dir] * d)) return;
  p.hose = length;
  if (e.owner !== p.id) {
    e.owner = p.id;
    e.pumpTicks = RULES.pumpInterval - 1;
  }
  e.deflate = RULES.deflateTicks;
  e.pumpTicks++;
  if (e.pumpTicks >= RULES.pumpInterval) {
    e.pumpTicks = 0;
    e.inflation++;
    event(g, "pump", e.x, e.y);
    if (e.inflation >= 4) {
      e.state = "dead";
      e.owner = null;
      const depth = Math.min(3, Math.max(0, Math.floor((e.y - 72) / 48)));
      award(
        g,
        p,
        (200 + depth * 100) * (e.kind === "fygar" && p.dir % 2 === 0 ? 2 : 1),
        e.x,
        e.y,
      );
      event(g, "pop", e.x, e.y);
    }
  }
}
function enemyStep(g: Game, e: Enemy) {
  if (e.state === "dead") return;
  if (e.owner) {
    const p = g.players.find((p) => p.id === e.owner);
    const forward = p ? (e.x - p.x) * DX[p.dir] + (e.y - p.y) * DY[p.dir] : -1;
    const side = p
      ? Math.abs((e.x - p.x) * DY[p.dir] - (e.y - p.y) * DX[p.dir])
      : 99;
    if (
      !p?.alive ||
      !p.connected ||
      !p.pumping ||
      forward < 0 ||
      forward > RULES.pumpReach ||
      side >= 9
    )
      e.owner = null;
  }
  if (e.inflation) {
    if (!e.owner && --e.deflate <= 0) {
      e.inflation--;
      e.deflate = RULES.deflateTicks;
    }
    return;
  }
  const players = g.players.filter((p) => p.alive && p.connected && !p.waiting);
  if (!players.length) return;
  const target = players.reduce((a, b) =>
    Math.hypot(a.x - e.x, a.y - e.y) <= Math.hypot(b.x - e.x, b.y - e.y)
      ? a
      : b,
  );
  e.age++;
  if (e.state === "charge") {
    if (--e.timer <= 0) {
      e.state = "fire";
      e.timer = 45;
      event(g, "fire", e.x, e.y);
    }
    return;
  }
  if (e.state === "fire") {
    for (const p of players) {
      const f = (p.x - e.x) * DX[e.fireDir];
      if (f > 0 && f < 47 && Math.abs(p.y - e.y) < 7) killPlayer(g, p);
    }
    if (--e.timer <= 0) {
      e.state = "walk";
      e.age = 0;
    }
    return;
  }
  if (
    e.state === "walk" &&
    e.kind === "fygar" &&
    e.age > 100 &&
    e.age % 60 === 0 &&
    Math.abs(target.y - e.y) < 8 &&
    Math.abs(target.x - e.x) < 56
  ) {
    e.state = "charge";
    e.timer = 40;
    e.fireDir = target.x < e.x ? 2 : 0;
    e.dir = e.fireDir;
    return;
  }
  const remaining = g.enemies.filter((other) => other.state !== "dead").length;
  if (remaining === 1 && e.age > 120 && e.state !== "escape") {
    e.state = "escape";
    event(g, "escape", e.x, e.y);
  }
  if (e.state === "escape") {
    const goal = e.y > TOP ? { x: e.x, y: TOP } : { x: LEFT - 12, y: TOP };
    const dx = goal.x - e.x,
      dy = goal.y - e.y;
    const len = Math.hypot(dx, dy) || 1;
    e.x = roundPos(e.x + (dx / len) * 1.1);
    e.y = roundPos(e.y + (dy / len) * 1.1);
    if (e.x < LEFT - 8) e.state = "dead";
    return;
  }
  if (e.state === "ghost") {
    const dx = target.x - e.x,
      dy = target.y - e.y,
      len = Math.hypot(dx, dy) || 1;
    e.x = roundPos(e.x + (dx / len) * 0.65);
    e.y = roundPos(e.y + (dy / len) * 0.65);
    e.timer--;
    const gx = Math.round((e.x - LEFT) / CELL) * CELL + LEFT,
      gy = Math.round((e.y - TOP) / CELL) * CELL + TOP;
    if (
      e.timer < 90 &&
      !solid(g, gx, gy) &&
      Math.hypot(e.x - gx, e.y - gy) < 5
    ) {
      e.x = gx;
      e.y = gy;
      e.state = "walk";
      e.age = 0;
    } else if (e.timer <= -180) {
      e.state = "walk";
      e.x = gx;
      e.y = gy;
      e.age = 0;
    }
    return;
  }
  if (e.age > Math.max(150, RULES.ghostAfter - g.round * 8) + e.id * 17) {
    e.state = "ghost";
    e.timer = RULES.ghostDuration;
    e.owner = null;
    return;
  }
  const speed = Math.min(
    1.3,
    (e.kind === "pooka" ? 0.75 : 0.65) + Math.min(g.round - 1, 20) * 0.018,
  );
  if (
    Math.abs((e.x - LEFT) / CELL - Math.round((e.x - LEFT) / CELL)) < 0.0001 &&
    Math.abs((e.y - TOP) / CELL - Math.round((e.y - TOP) / CELL)) < 0.0001
  ) {
    e.x = Math.round((e.x - LEFT) / CELL) * CELL + LEFT;
    e.y = Math.round((e.y - TOP) / CELL) * CELL + TOP;
    const options = ([0, 1, 2, 3] as Direction[]).filter(
      (d) =>
        canStep(g, e.x + DX[d] * CELL, e.y + DY[d] * CELL) &&
        !solid(g, e.x + DX[d] * CELL, e.y + DY[d] * CELL),
    );
    const choices = options.filter((d) => d !== (e.dir + 2) % 4);
    const pool = choices.length ? choices : options;
    if (pool.length) {
      const ordered = pool
        .map((d) => ({
          d,
          rank:
            Math.abs(target.x - e.x - DX[d] * CELL) +
            Math.abs(target.y - e.y - DY[d] * CELL) +
            random(g) * 18,
        }))
        .sort((a, b) => a.rank - b.rank);
      e.dir = ordered[0].d;
    }
  }
  const axis = e.dir % 2 ? e.y - TOP : e.x - LEFT,
    mod = ((axis % CELL) + CELL) % CELL;
  const distance =
    e.dir === 0 || e.dir === 1
      ? mod < 0.001
        ? CELL
        : CELL - mod
      : mod < 0.001
        ? CELL
        : mod;
  const delta = Math.min(speed, distance);
  const nx = roundPos(e.x + DX[e.dir] * delta),
    ny = roundPos(e.y + DY[e.dir] * delta);
  if (canStep(g, nx, ny) && !solid(g, nx + DX[e.dir] * 5, ny + DY[e.dir] * 5)) {
    e.x = nx;
    e.y = ny;
  } else {
    e.dir = ((e.dir + 2) % 4) as Direction;
    e.age += 2;
  }
}
function rocksStep(g: Game) {
  for (const r of g.rocks) {
    if (r.state === "rest" && !solid(g, r.x, r.y + 10)) {
      r.state = "wobble";
      r.timer = RULES.rockWobble;
    }
    if (r.state === "wobble" && --r.timer <= 0) {
      r.state = "fall";
      g.dropped++;
      event(g, "rock", r.x, r.y);
    }
    if (r.state === "fall") {
      r.y += RULES.rockSpeed;
      r.distance += RULES.rockSpeed;
      for (const e of g.enemies)
        if (
          e.state !== "dead" &&
          Math.abs(e.x - r.x) < 12 &&
          Math.abs(e.y - r.y) < 12
        ) {
          e.state = "dead";
          e.owner = null;
          r.kills++;
          const total = ROCK_POINTS[Math.min(8, r.kills)];
          award(
            g,
            g.players.find((p) => p.id === r.owner),
            total - r.awarded,
            r.x,
            r.y,
          );
          r.awarded = total;
          event(g, "crush", e.x, e.y);
        }
      for (const p of g.players)
        if (Math.abs(p.x - r.x) < 11 && Math.abs(p.y - r.y) < 12)
          killPlayer(g, p);
      if (r.y >= TOP + (ROWS - 1) * CELL || solid(g, r.x, r.y + 9)) {
        r.state = "crumble";
        r.timer = 35;
        event(g, "crumble", r.x, r.y);
      }
    } else if (r.state === "crumble" && --r.timer <= 0) r.state = "gone";
  }
  if (g.dropped >= 2 && !g.bonusSpawned) {
    g.bonusSpawned = true;
    g.bonus = {
      x: 104,
      y: 152,
      timer: RULES.bonusTicks,
      value: BONUS_POINTS[Math.min(17, g.round - 1)],
      kind: Math.min(17, g.round - 1),
    };
    event(g, "bonus", 104, 152);
  }
}
export function step(g: Game) {
  g.tick++;
  for (const p of g.players) p.ack = p.input.seq;
  if (g.phase === "over") return;
  if (g.phase !== "play") {
    if (--g.timer > 0) return;
    if (g.phase === "ready") {
      g.phase = "play";
      event(g, "start");
    } else if (g.phase === "death") {
      if (g.players.some((p) => p.lives > 0)) resetSurvivors(g);
      else {
        g.phase = "over";
        event(g, "over");
      }
    } else if (g.phase === "clear") {
      if (g.mode === "versus" && g.round >= RULES.matchRounds) {
        g.phase = "over";
        event(g, "over");
      } else {
        g.round++;
        loadRound(g);
      }
    }
    return;
  }
  for (const p of g.players) {
    p.ack = p.input.seq;
    if (p.invulnerable > 0) p.invulnerable--;
    if (
      !p.alive &&
      p.lives > 0 &&
      p.connected &&
      g.mode !== "arcade" &&
      !p.waiting &&
      --p.respawn <= 0
    )
      respawn(g, p);
    movePlayer(g, p, p.input);
  }
  for (const p of g.players) pump(g, p);
  for (const e of g.enemies) {
    enemyStep(g, e);
    if (e.state !== "dead" && !e.inflation)
      for (const p of g.players)
        if (p.alive && Math.abs(e.x - p.x) < 9 && Math.abs(e.y - p.y) < 9)
          killPlayer(g, p);
  }
  rocksStep(g);
  if (g.bonus) {
    g.bonus.timer--;
    const p = g.players.find(
      (p) =>
        p.alive &&
        p.connected &&
        Math.abs(p.x - g.bonus!.x) < 9 &&
        Math.abs(p.y - g.bonus!.y) < 9,
    );
    if (p) {
      award(g, p, g.bonus.value, g.bonus.x, g.bonus.y);
      event(g, "collect", g.bonus.x, g.bonus.y);
      g.bonus = null;
    } else if (g.bonus.timer <= 0) g.bonus = null;
  }
  if (g.phase !== "play") return;
  if (!g.players.some((p) => p.lives > 0 && !p.waiting)) {
    g.phase = "over";
    event(g, "over");
    return;
  }
  if (g.enemies.every((e) => e.state === "dead")) {
    g.phase = "clear";
    g.timer = RULES.roundClearTicks;
    event(g, "clear");
  }
}
export function setInput(g: Game, id: string, input: Input) {
  const p = g.players.find((p) => p.id === id);
  if (p && input.seq > p.input.seq) p.input = { ...input };
}
export function disconnect(g: Game, id: string) {
  const p = g.players.find((p) => p.id === id);
  if (p) {
    p.connected = false;
    p.input = neutral();
    p.pumping = false;
  }
  for (const e of g.enemies) if (e.owner === id) e.owner = null;
}
export function standings(g: Game) {
  return [...g.players]
    .sort((a, b) => b.score - a.score)
    .map((p, i, all) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      rank: all.findIndex((q) => q.score === p.score) + 1,
      color: p.color,
    }));
}
