import Phaser from "phaser";
import "@fontsource/space-mono/latin-400.css";
import "@fontsource/space-mono/latin-700.css";
import "./style.css";
import { ArcadeScene } from "./renderer";
import { ArcadeAudio } from "./audio";
import { Network, readStorage, writeStorage } from "./network";
import { createGame, Game, standings, step } from "../shared/simulation";
import { Direction, Input, Mode, neutral } from "../shared/rules";
const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const COLORS = ["#70ddff", "#ff8291", "#88efa3", "#d6a0ff"];
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
document.querySelector("#app")!.innerHTML = `
<header><div class="wordmark"><span class="mark"></span>DUG DIG <span class="edition">UNDERGROUND ARCADE</span></div><div class="top-actions"><span class="edition"><i class="online-dot"></i>READY TO DIG</span><button class="quiet" id="sound-toggle" aria-label="Toggle sound">SOUND ON</button><button class="quiet" id="settings-open">SETTINGS</button></div></header>
<main class="layout" id="layout"><section class="cabinet" aria-label="Arcade game"><div class="bezel-top"><span>DD / 1982</span><span>4 DIRECTIONS. 1 PUMP.</span></div><div class="screen" id="game" role="img" aria-label="Dig Dug arcade playfield"></div><div class="cabinet-bottom"><span>UNDERGROUND ARCADE SYSTEM</span><span>● FREE PLAY</span></div></section>
<section class="panel" id="menu-panel"><div class="eyebrow">BACK BELOW THE SURFACE</div><h1>Dig deep.<br>Stay one step ahead.</h1><p class="intro">Carve a path. Pump up the monsters.<br>Let gravity do the rest.</p>
<button class="mode primary" id="solo"><span class="number">01</span><span><strong>ARCADE</strong><small>One player · chase the high score</small></span><span class="arrow">↗</span></button>
<button class="mode" id="alternating"><span class="number">02</span><span><strong>TAKE TURNS</strong><small>Two players · one keyboard</small></span><span class="arrow">↗</span></button>
<button class="mode" id="coop"><span class="number">03</span><span><strong>ONLINE CO-OP</strong><small>2–4 players · dig together</small></span><span class="arrow">↗</span></button>
<button class="mode" id="versus"><span class="number">04</span><span><strong>SCORE RACE</strong><small>2–4 players · five rounds</small></span><span class="arrow">↗</span></button>
<div class="divider"></div><div class="instructions"><p><span>MOVE</span><span><kbd>W A S D</kbd> / <kbd>↑ ↓ ← →</kbd></span></p><p><span>PUMP / HOLD</span><span><kbd>SPACE</kbd> / <kbd>Z</kbd></span></p><p><span>PAUSE</span><kbd>ESC</kbd></p></div><p class="caption">Keyboard + gamepad. Solo runs in your browser.<br>Online play uses a free community server.</p></section>
<section class="panel" id="connect-panel" hidden><button class="small-link" id="connect-back">← BACK TO ARCADE</button><div class="eyebrow" id="connect-label">ONLINE CO-OP</div><h2>Bring your crew.</h2><p class="intro" id="connect-description">Share one underground world. Watch each other’s backs—and the falling rocks.</p><label class="field" for="player-name">YOUR NAME</label><input id="player-name" type="text" maxlength="14" autocomplete="nickname" placeholder="Digger"><label class="field" for="room-input">ROOM CODE · LEAVE EMPTY TO HOST</label><input id="room-input" class="room-code" type="text" maxlength="6" autocomplete="off" placeholder="ABC234"><button class="action" id="connect">CREATE / JOIN ROOM</button><p class="status" id="connect-status" role="status" aria-live="polite"></p><p class="caption">The first connection can take about a minute while the server wakes. Reconnects restore your slot for two minutes. A server restart ends the match.</p></section>
<section class="panel" id="room-panel" hidden><div class="eyebrow" id="room-mode">YOUR CREW</div><h2>Meet underground.</h2><div class="room-label">ROOM CODE</div><div class="code-value" id="room-code"></div><button class="small-link" id="copy-invite">COPY INVITE LINK ↗</button><ul class="members" id="members"></ul><button class="action secondary" id="ready">I’M READY</button><button class="action" id="start">START GAME</button><p class="status" id="room-status" role="status" aria-live="polite"></p><p class="notice">Players pass through each other. Pumps target monsters. Falling rocks can crush everyone.</p><button class="small-link" id="leave-room">← LEAVE ROOM</button></section>
<section class="panel" id="play-panel" hidden><div class="live-mode" id="play-mode">ARCADE</div><h2 id="play-heading">Keep digging.</h2><div class="players" id="players"></div><p class="status" id="play-status" role="status"></p><div class="divider"></div><div class="instructions"><p><span>MOVE</span><span><kbd>WASD</kbd> / <kbd>ARROWS</kbd></span></p><p><span>PUMP / HOLD</span><span><kbd>SPACE</kbd> / <kbd>Z</kbd></span></p><p><span>GAMEPAD</span><span>D-PAD + A</span></p></div><button class="action secondary" id="pause-button">PAUSE</button><button class="small-link" id="exit-button">← RETURN TO MENU</button><p class="caption" id="play-tip">Pump to stun. Release to escape.<br>Deeper monsters are worth more points.</p></section></main>
<footer class="foot"><span>AN ARCADE RECONSTRUCTION · BUILT FOR THE BROWSER</span><span>DIG. INFLATE. DROP. REPEAT.</span></footer>
<section class="dialog" id="settings" hidden role="dialog" aria-modal="true" aria-labelledby="settings-title"><div class="dialog-card"><h2 id="settings-title">Sound & controls</h2><label class="slider">MASTER<input type="range" id="master-volume" min="0" max="100" value="35"></label><label class="slider">MUSIC<input type="range" id="music-volume" min="0" max="100" value="60"></label><label class="slider">EFFECTS<input type="range" id="sfx-volume" min="0" max="100" value="80"></label><p>Move: arrows / WASD / gamepad D-pad or stick.<br>Pump: hold Space / Z / gamepad A.<br>Pause solo: Escape / gamepad Start.</p><p>Arcade: 3 lives. Bonus life at 10,000, 40,000 and every 40,000 after. Take Turns keeps a separate board for each player.</p><button class="action" id="settings-close">BACK TO GAME</button></div></section>
<section class="dialog" id="results" hidden role="dialog" aria-modal="true" aria-labelledby="results-title"><div class="dialog-card"><div class="eyebrow">THE DUST HAS SETTLED</div><h2 id="results-title">Game over</h2><div id="results-list"></div><button class="action" id="again">PLAY AGAIN</button><button class="small-link" id="results-exit">← RETURN TO MENU</button></div></section>
<section class="dialog" id="exit-dialog" hidden role="dialog" aria-modal="true" aria-labelledby="exit-title"><div class="dialog-card"><h2 id="exit-title">Leave this run?</h2><p id="exit-detail">Your current run will end. Your high score is saved in this browser.</p><button class="action" id="exit-confirm">LEAVE RUN</button><button class="action secondary" id="exit-cancel">KEEP DIGGING</button></div></section>`;
const scene = new ArcadeScene(),
  audio = new ArcadeAudio(),
  network = new Network();
const phaser = new Phaser.Game({
  type: Phaser.AUTO,
  width: 224,
  height: 288,
  parent: "game",
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  backgroundColor: "#000000",
  scene: [scene],
  banner: false,
  audio: { noAudio: true },
  scale: { mode: Phaser.Scale.NONE },
  fps: { target: 60, smoothStep: false },
});
let route: "menu" | "local" | "network" = "menu",
  boards: Game[] = [createGame("arcade", [{ id: "demo", name: "Digger" }])],
  active = 0,
  paused = false,
  onlineMode: Mode = "coop",
  keys: string[] = [],
  sequence = 0,
  last = performance.now(),
  accumulator = 0,
  ready = false,
  lastUi = 0,
  resultsShown = false,
  lastPadStart = false,
  wasPaused = false;
const modeTitle = (m: Mode) =>
  m === "coop" ? "ONLINE CO-OP" : m === "versus" ? "SCORE RACE" : "ARCADE";
const activeGame = () => (route === "network" ? network.game : boards[active]);
function panel(name: string) {
  for (const id of ["menu", "connect", "room", "play"])
    $(`${id}-panel`).hidden = id !== name;
  $("layout").classList.toggle("playing", name === "play");
}
function status(message: string, error = false) {
  for (const id of ["connect-status", "room-status", "play-status"]) {
    $(id).textContent = message;
    $(id).classList.toggle("error", error);
  }
}
function resetInput() {
  keys = [];
  const g = activeGame();
  if (route === "local" && g)
    g.players[0].input = { ...neutral(), seq: ++sequence };
  if (route === "network") network.input(neutral());
}
function closeDialogs() {
  for (const id of ["results", "settings", "exit-dialog"]) $(id).hidden = true;
}
function menu() {
  network.leave();
  route = "menu";
  paused = false;
  scene.paused = false;
  scene.attract = true;
  scene.online = false;
  active = 0;
  boards = [createGame("arcade", [{ id: "demo", name: "Digger" }])];
  audio.reset();
  closeDialogs();
  resetInput();
  panel("menu");
  status("");
  history.replaceState(null, "", location.pathname);
}
function startLocal(two = false) {
  network.leave();
  route = "local";
  boards = Array.from({ length: two ? 2 : 1 }, (_, i) =>
    createGame("arcade", [
      { id: `local-${i}`, name: `Player ${i + 1}`, color: i },
    ]),
  );
  active = 0;
  sequence = 0;
  paused = false;
  resultsShown = false;
  scene.attract = false;
  scene.online = false;
  audio.reset();
  closeDialogs();
  resetInput();
  panel("play");
  status("");
  void audio.unlock();
  $("pause-button").hidden = false;
  updateUi();
}
function connectPanel(mode: Mode) {
  ($("connect") as HTMLButtonElement).disabled = false;
  resultsShown = false;
  route = "network";
  onlineMode = mode;
  scene.attract = true;
  $("connect-label").textContent = modeTitle(mode);
  $("connect-description").textContent =
    mode === "coop"
      ? "Share one underground world. Watch each other’s backs—and the falling rocks."
      : "Five rounds. One shared board. Claim monsters, bonuses and rock combos to finish on top.";
  panel("connect");
  status("");
  $("player-name").focus();
}
function showResults(g: Game) {
  if (resultsShown) return;
  resultsShown = true;
  resetInput();
  $("results-title").textContent =
    g.mode === "versus"
      ? "Final standings"
      : g.mode === "coop"
        ? "The crew’s run"
        : "Game over";
  const people =
    route === "local" && boards.length > 1
      ? boards
          .flatMap((b) => b.players)
          .sort((a, b) => b.score - a.score)
          .map((p, i) => ({ ...p, rank: i + 1 }))
      : standings(g);
  $("results-list").innerHTML =
    (g.mode === "coop"
      ? `<div class="results-row"><strong>TEAM TOTAL</strong><strong>${g.teamScore.toLocaleString()}</strong></div>`
      : "") +
    people
      .map(
        (p) =>
          `<div class="results-row"><span style="color:${COLORS[p.color]}">${p.rank}. ${escape(p.name)}</span><strong>${p.score.toLocaleString()}</strong></div>`,
      )
      .join("");
  $("again").textContent =
    route === "network" ? "BACK TO ROOM / REMATCH" : "PLAY AGAIN";
  $("results").hidden = false;
  $("again").focus();
}
function updateUi() {
  const g = activeGame();
  if (!g) return;
  $("play-mode").textContent =
    route === "local" && boards.length > 1 ? "TAKE TURNS" : modeTitle(g.mode);
  $("play-heading").textContent =
    g.phase === "ready"
      ? `Round ${g.round}. Get ready.`
      : g.phase === "clear"
        ? "Nicely dug."
        : g.phase === "death"
          ? "One more tunnel."
          : g.mode === "versus"
            ? `Round ${g.round} of 5`
            : "Keep digging.";
  const players =
    route === "local" && boards.length > 1
      ? boards.flatMap((b) => b.players)
      : g.players;
  $("players").innerHTML = players
    .map(
      (p) =>
        `<div class="player"><span class="swatch" style="background:${COLORS[p.color]}"></span><span>${escape(p.name)}<br><small>${p.waiting ? "WAITING" : !p.connected ? "RECONNECTING" : !p.lives ? "SPECTATING" : `${p.lives} ${p.lives === 1 ? "LIFE" : "LIVES"}`}</small></span><span class="score">${p.score.toLocaleString()}</span></div>`,
    )
    .join("");
  if (route === "local" && boards.length > 1)
    status(`PLAYER ${active + 1}’S TURN`);
  if (route === "network")
    $("play-tip").textContent =
      g.mode === "versus"
        ? "Pump kills and rock combos go to their owner. Highest score wins."
        : "Teamwork clears the round. Falling rocks threaten everyone.";
}
network.onStatus = (m) => status(m);
network.onError = (m) => {
  status(m, true);
  ($("connect") as HTMLButtonElement).disabled = false;
};
network.onChange = () => {
  if (route !== "network") return;
  const r = network.room;
  if (!r) return;
  $("room-code").textContent = r.code;
  $("room-mode").textContent = modeTitle(r.mode);
  $("members").innerHTML = r.members
    .map(
      (m) =>
        `<li><span class="swatch" style="background:${COLORS[m.color]}"></span>${escape(m.name)}${m.id === r.host ? ' <span class="badge">HOST</span>' : ""}<span class="ready">${!m.connected ? "AWAY" : m.ready ? "READY" : "WAITING"}</span></li>`,
    )
    .join("");
  const me = r.members.find((m) => m.id === network.id);
  $("ready").textContent = me?.ready ? "CANCEL READY" : "I’M READY";
  $("start").hidden = network.id !== r.host;
  ($("start") as HTMLButtonElement).disabled =
    r.members.filter((m) => m.connected).length < 2 ||
    r.members.some((m) => m.connected && !m.ready);
  if (network.game) {
    if (network.previous && network.game.tick < network.previous.tick)
      audio.reset();
    scene.attract = false;
    scene.online = true;
    $("pause-button").hidden = true;
    if (network.game.phase !== "over") {
      resultsShown = false;
      panel("play");
    } else if (!resultsShown) showResults(network.game);
  } else panel("room");
};
$("solo").onclick = () => startLocal();
$("alternating").onclick = () => startLocal(true);
$("coop").onclick = () => connectPanel("coop");
$("versus").onclick = () => connectPanel("versus");
$("connect-back").onclick = menu;
$("leave-room").onclick = menu;
($("player-name") as HTMLInputElement).value = readStorage("dug-name");
$("connect").onclick = () => {
  void audio.unlock();
  const code = ($("room-input") as HTMLInputElement).value.trim().toUpperCase(),
    name = ($("player-name") as HTMLInputElement).value.trim() || "Digger";
  writeStorage("dug-name", name);
  ($("connect") as HTMLButtonElement).disabled = true;
  network.connect(code, name, onlineMode, true);
};
$("ready").onclick = () => {
  const me = network.room?.members.find((m) => m.id === network.id);
  network.send("ready", { ready: !me?.ready });
};
$("start").onclick = () => {
  audio.reset();
  network.send("start");
};
$("copy-invite").onclick = async () => {
  const url = new URL(location.href);
  url.search = `room=${network.room?.code}&mode=${network.room?.mode}`;
  try {
    await navigator.clipboard.writeText(url.href);
    status("Invite link copied.");
  } catch {
    status(`Share room code ${network.room?.code}`);
  }
};
function togglePause() {
  if (route !== "local" || !$("results").hidden) return;
  paused = !paused;
  scene.paused = paused;
  $("pause-button").textContent = paused ? "RESUME" : "PAUSE";
  resetInput();
}
$("pause-button").onclick = togglePause;
function exitPrompt() {
  wasPaused = paused;
  if (route === "local") {
    paused = true;
    scene.paused = true;
  }
  $("exit-detail").textContent =
    route === "network"
      ? "You will leave the room. Other connected players can keep playing."
      : "Your current run will end. Your high score is saved in this browser.";
  $("exit-dialog").hidden = false;
  resetInput();
  $("exit-cancel").focus();
}
$("exit-button").onclick = exitPrompt;
$("exit-confirm").onclick = menu;
$("exit-cancel").onclick = () => {
  $("exit-dialog").hidden = true;
  paused = wasPaused;
  scene.paused = paused;
  $("exit-button").focus();
};
$("again").onclick = () => {
  if (route === "local") startLocal(boards.length > 1);
  else {
    $("results").hidden = true;
    panel("room");
    status("Ready up for a new match.");
  }
};
$("results-exit").onclick = menu;
$("settings-open").onclick = () => {
  wasPaused = paused;
  if (route === "local") {
    paused = true;
    scene.paused = true;
  }
  $("settings").hidden = false;
  resetInput();
  $("settings-close").focus();
};
$("settings-close").onclick = () => {
  $("settings").hidden = true;
  paused = wasPaused;
  scene.paused = paused;
  $("settings-open").focus();
};
try {
  const saved = JSON.parse(readStorage("dug-audio") || "null");
  if (saved) {
    audio.volume = saved.volume;
    audio.music = saved.music;
    audio.sfx = saved.sfx;
    audio.muted = saved.muted;
  }
} catch {}
function saveAudio() {
  writeStorage(
    "dug-audio",
    JSON.stringify({
      volume: audio.volume,
      music: audio.music,
      sfx: audio.sfx,
      muted: audio.muted,
    }),
  );
  audio.apply();
  $("sound-toggle").textContent = audio.muted ? "SOUND OFF" : "SOUND ON";
}
for (const [id, key] of [
  ["master-volume", "volume"],
  ["music-volume", "music"],
  ["sfx-volume", "sfx"],
] as const) {
  const el = $(id) as HTMLInputElement;
  el.value = String(audio[key] * 100);
  el.oninput = () => {
    audio[key] = Number(el.value) / 100;
    saveAudio();
    void audio.unlock();
  };
}
$("sound-toggle").onclick = () => {
  audio.muted = !audio.muted;
  saveAudio();
  void audio.unlock();
};
saveAudio();
const bindings: Record<string, Direction> = {
  ArrowRight: 0,
  KeyD: 0,
  ArrowDown: 1,
  KeyS: 1,
  ArrowLeft: 2,
  KeyA: 2,
  ArrowUp: 3,
  KeyW: 3,
};
window.addEventListener("keydown", (e) => {
  if (
    e.target instanceof HTMLInputElement ||
    e.target instanceof HTMLSelectElement
  )
    return;
  if (e.code === "Escape" && !e.repeat) {
    if (!$("settings").hidden) $("settings-close").click();
    else if (!$("exit-dialog").hidden) $("exit-cancel").click();
    else togglePause();
    return;
  }
  if (route === "menu") return;
  if (e.code in bindings || ["Space", "KeyZ"].includes(e.code)) {
    e.preventDefault();
    if (!keys.includes(e.code)) keys.push(e.code);
  }
});
window.addEventListener("keyup", (e) => {
  keys = keys.filter((k) => k !== e.code);
});
window.addEventListener("blur", () => {
  resetInput();
  if (route === "local" && !paused) togglePause();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) resetInput();
});
function input(): Input {
  const out: Input = { dir: -1, pump: false, seq: ++sequence };
  if (
    !$("settings").hidden ||
    !$("results").hidden ||
    !$("exit-dialog").hidden ||
    document.hidden
  )
    return out;
  for (const key of keys) {
    if (key in bindings) out.dir = bindings[key];
    if (key === "Space" || key === "KeyZ") out.pump = true;
  }
  const pad = navigator.getGamepads?.()[0];
  if (pad) {
    if (pad.buttons[12]?.pressed || pad.axes[1] < -0.4) out.dir = 3;
    else if (pad.buttons[13]?.pressed || pad.axes[1] > 0.4) out.dir = 1;
    else if (pad.buttons[14]?.pressed || pad.axes[0] < -0.4) out.dir = 2;
    else if (pad.buttons[15]?.pressed || pad.axes[0] > 0.4) out.dir = 0;
    out.pump ||= !!pad.buttons[0]?.pressed;
    const start = !!pad.buttons[9]?.pressed;
    if (start && !lastPadStart) togglePause();
    lastPadStart = start;
  }
  return out;
}
function demoInput(g: Game): Input {
  const p = g.players[0],
    enemy = g.enemies.find(
      (e) =>
        e.state !== "dead" &&
        Math.abs(e.y - p.y) < 8 &&
        Math.abs(e.x - p.x) < 33,
    );
  if (enemy)
    return {
      dir: enemy.x < p.x ? 2 : 0,
      pump: p.dir === (enemy.x < p.x ? 2 : 0),
      seq: ++sequence,
    };
  return {
    dir: [0, 3, 2, 1][Math.floor(g.tick / 145) % 4] as Direction,
    pump: false,
    seq: ++sequence,
  };
}
function frame(time: number) {
  requestAnimationFrame(frame);
  if (!ready) {
    last = time;
    return;
  }
  accumulator += Math.min(time - last, 100);
  last = time;
  while (accumulator >= 1000 / 60) {
    accumulator -= 1000 / 60;
    const g = activeGame();
    if (route === "network") {
      if (network.game) network.input(input());
    } else if (g && !paused) {
      const before = g.phase;
      g.players[0].input = route === "menu" ? demoInput(g) : input();
      step(g);
      if (route === "menu" && g.phase === "over")
        boards = [createGame("arcade", [{ id: "demo", name: "Digger" }])];
      if (
        route === "local" &&
        boards.length > 1 &&
        before === "death" &&
        g.phase !== "death"
      ) {
        const other = (active + 1) % 2;
        if (boards[other].players[0].lives > 0) {
          active = other;
          audio.reset();
          resetInput();
        } else if (g.phase === "over") showResults(g);
      }
    }
  }
  const g = activeGame();
  if (g) {
    scene.state = g;
    scene.oldState = route === "network" ? network.previous : null;
    scene.receivedAt = network.receivedAt;
    scene.localId = route === "network" ? network.id : g.players[0].id;
    scene.alternateLabel =
      route === "local" && boards.length > 1 ? `PLAYER ${active + 1}` : "";
    audio.update(g, route !== "menu" && !paused);
    if (route !== "menu") {
      const high = Math.max(scene.highScore, ...g.players.map((p) => p.score));
      if (high > scene.highScore) {
        scene.highScore = high;
        writeStorage("dug-high", String(high));
      }
      if (
        g.phase === "over" &&
        (boards.length === 1 ||
          route === "network" ||
          boards.every((b) => b.phase === "over"))
      )
        showResults(g);
    }
    if (time - lastUi > 150) {
      updateUi();
      lastUi = time;
    }
  }
}
scene.highScore = Math.max(20000, Number(readStorage("dug-high")) || 0);
phaser.events.once("arcade-ready", () => {
  ready = true;
});
requestAnimationFrame(frame);
const params = new URLSearchParams(location.search);
if (params.has("room")) {
  ($("room-input") as HTMLInputElement).value = (
    params.get("room") || ""
  ).slice(0, 6);
  connectPanel(params.get("mode") === "versus" ? "versus" : "coop");
}
if (import.meta.env.DEV && params.has("qa"))
  (window as any).__dug = {
    state: () => activeGame(),
    route: () => route,
    network: () => ({
      id: network.id,
      room: network.room,
      pending: network.pending.length,
    }),
    audio: () => ({ state: audio.context?.state, volume: audio.volume }),
    pause: () => paused,
  };
