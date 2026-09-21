import Phaser from "phaser";
import { Game } from "../shared/simulation";
import {
  DX,
  DY,
  H,
  TERRAIN_H,
  TERRAIN_W,
  TERRAIN_X,
  TERRAIN_Y,
  W,
} from "../shared/rules";
import { FONT } from "./font";
import frames from "./frames.json";
const COLORS = [0x70ddff, 0xff8291, 0x88efa3, 0xd6a0ff];
export class ArcadeScene extends Phaser.Scene {
  g!: Phaser.GameObjects.Graphics;
  terrain!: Phaser.GameObjects.Graphics;
  images: Phaser.GameObjects.Image[] = [];
  imageCount = 0;
  revision = -1;
  lastTerrain: number[] | null = null;
  state: Game | null = null;
  oldState: Game | null = null;
  receivedAt = 0;
  online = false;
  localId = "";
  attract = true;
  paused = false;
  highScore = 20000;
  alternateLabel = "";
  constructor() {
    super("arcade");
  }
  preload() {
    this.load.spritesheet(
      "sprites",
      `${import.meta.env.BASE_URL}assets/sprites.png`,
      { frameWidth: 16, frameHeight: 16 },
    );
  }
  create() {
    this.cameras.main.setBackgroundColor("#000000");
    this.terrain = this.add.graphics();
    this.g = this.add.graphics().setDepth(10);
    this.game.events.emit("arcade-ready");
  }
  sprite(
    key: string,
    x: number,
    y: number,
    scaleX = 1,
    scaleY = scaleX,
    flip = false,
    alpha = 1,
    rotation = 0,
  ) {
    let image = this.images[this.imageCount++];
    if (!image) {
      image = this.add.image(0, 0, "sprites").setDepth(5);
      this.images.push(image);
    }
    image
      .setFrame(frames[key as keyof typeof frames] ?? 0)
      .setPosition(Math.round(x), Math.round(y))
      .setScale(scaleX, scaleY)
      .setFlipX(flip)
      .setAlpha(alpha)
      .setRotation(rotation)
      .setVisible(true);
    return image;
  }
  text(
    text: string,
    x: number,
    y: number,
    color = 0xffffff,
    scale = 1,
    center = false,
  ) {
    const value = text.toUpperCase();
    if (center) x -= Math.floor(((value.length * 6 - 1) * scale) / 2);
    this.g.fillStyle(color);
    for (const char of value) {
      const pattern = FONT[char] || FONT[" "];
      for (let i = 0; i < 35; i++)
        if (pattern[i] === "1")
          this.g.fillRect(
            x + (i % 5) * scale,
            y + Math.floor(i / 5) * scale,
            scale,
            scale,
          );
      x += 6 * scale;
    }
  }
  update() {
    if (!this.g || !this.state) return;
    const s = this.state;
    this.imageCount = 0;
    this.g.clear();
    if (this.lastTerrain !== s.terrain || this.revision !== s.terrainRevision) {
      this.terrain.clear();
      this.terrain.fillStyle(0x000000).fillRect(0, 0, W, H);
      this.terrain.fillStyle(0x1472d0).fillRect(16, 40, 192, 16);
      const colors = [0xf5ca69, 0xdd942d, 0xbe5920, 0x9e321c];
      for (let r = 0; r < TERRAIN_H; r++)
        for (let c = 0; c < TERRAIN_W; c++)
          if (s.terrain[r * TERRAIN_W + c]) {
            const band = Math.min(
                3,
                Math.max(0, Math.floor((r * 4 - 16) / 48)),
              ),
              x = TERRAIN_X + c * 4,
              y = TERRAIN_Y + r * 4;
            this.terrain.fillStyle(colors[band]).fillRect(x, y, 4, 4);
            if ((c * 13 + r * 7) % 5 === 0)
              this.terrain
                .fillStyle(
                  band === 0
                    ? 0xdbac4b
                    : band === 1
                      ? 0xc87c29
                      : band === 2
                        ? 0xa94a20
                        : 0x822818,
                )
                .fillRect(x + 1, y + 1, 1, 1);
          }
      this.lastTerrain = s.terrain;
      this.revision = s.terrainRevision;
    }
    this.text(s.mode === "coop" ? "TEAM SCORE" : "1UP", 18, 4, 0xf55361);
    this.text("HIGH SCORE", 104, 4, 0xf55361);
    this.text(
      String(
        s.mode === "coop"
          ? s.teamScore
          : (s.players.find((p) => p.id === this.localId)?.score ??
              s.players[0]?.score ??
              0),
      ).padStart(6, "0"),
      18,
      15,
    );
    this.text(
      String(
        Math.max(this.highScore, ...s.players.map((p) => p.score)),
      ).padStart(6, "0"),
      118,
      15,
    );
    if (s.mode === "versus")
      this.text(`RACE ${s.round}/5`, 112, 29, 0xffed76, 1, true);
    else
      this.text(this.alternateLabel || "DIG DUG", 112, 29, 0xffffff, 1, true);
    for (let i = 0; i < Math.min(10, s.round); i++)
      this.sprite("flower", 198 - i * 12, 40);
    for (const r of s.rocks)
      if (r.state !== "gone") {
        const wobble =
          r.state === "wobble" ? Math.round(Math.sin(s.tick * 1.5)) : 0;
        this.sprite(
          "rock",
          r.x + wobble,
          r.y,
          1,
          r.state === "crumble" ? 0.65 : 1,
          false,
          r.state === "crumble" ? Math.max(0.2, r.timer / 35) : 1,
        );
      }
    if (s.bonus) {
      const names = [
        "carrot",
        "turnip",
        "mushroom",
        "cucumber",
        "cucumber",
        "eggplant",
        "eggplant",
        "pepper",
        "pepper",
        "tomato",
        "tomato",
        "onion",
        "onion",
        "melon",
        "melon",
        "galaxian",
        "galaxian",
        "pineapple",
      ];
      if (s.bonus.timer > 120 || Math.floor(s.tick / 8) % 2)
        this.sprite(names[s.bonus.kind], s.bonus.x, s.bonus.y);
    }
    const alpha = this.online
      ? Math.min(1, (performance.now() - this.receivedAt) / 50)
      : 1;
    for (const e of s.enemies) {
      if (e.state === "dead") continue;
      const old = this.oldState?.enemies.find((other) => other.id === e.id),
        x = old ? Phaser.Math.Linear(old.x, e.x, alpha) : e.x,
        y = old ? Phaser.Math.Linear(old.y, e.y, alpha) : e.y;
      if (e.state === "ghost") {
        this.g
          .fillStyle(0xffffff)
          .fillRect(x - 5, y - 2, 4, 5)
          .fillRect(x + 2, y - 2, 4, 5);
        this.g
          .fillStyle(0x205ed1)
          .fillRect(x - 3, y, 2, 3)
          .fillRect(x + 4, y, 2, 3);
        continue;
      }
      const animation = Math.floor(s.tick / 9) % 2 === 0 ? "" : "-1";
      this.sprite(
        `${e.kind}${animation}`,
        x,
        y,
        1 + e.inflation * 0.22,
        1 + e.inflation * 0.16,
        e.dir === 2,
      );
      if (e.state === "charge" && Math.floor(s.tick / 5) % 2)
        this.text("!", x, y - 18, 0xffffff, 1, true);
      if (e.state === "fire") {
        const dir = DX[e.fireDir];
        for (let i = 1; i < 43; i += 3) {
          const height =
            3 + Math.floor(Math.sin(i + s.tick) * 2) + Math.floor(i / 8);
          this.g
            .fillStyle(i % 2 ? 0xffe22e : 0xff4e20)
            .fillRect(x + dir * (i + 7), y - height / 2, 3, height);
        }
      }
    }
    for (const p of s.players) {
      if (!p.alive || p.waiting) continue;
      if (p.invulnerable > 0 && Math.floor(s.tick / 5) % 2) continue;
      const old = this.oldState?.players.find((other) => other.id === p.id);
      const interpolate = this.online && p.id !== this.localId && old;
      const x = interpolate ? Phaser.Math.Linear(old.x, p.x, alpha) : p.x,
        y = interpolate ? Phaser.Math.Linear(old.y, p.y, alpha) : p.y;
      if (p.pumping) {
        this.g
          .lineStyle(2, 0xebebec)
          .lineBetween(x, y, x + DX[p.dir] * p.hose, y + DY[p.dir] * p.hose);
        this.g
          .fillStyle(0x79ddff)
          .fillRect(
            x + DX[p.dir] * p.hose - 1,
            y + DY[p.dir] * p.hose - 1,
            3,
            3,
          );
      }
      this.sprite(
        `player${p.color % 4}-${p.moving ? Math.floor(s.tick / 7) % 2 : 0}`,
        x,
        y,
        1,
        1,
        p.dir === 2,
        p.connected ? 1 : 0.35,
        p.dir === 1 ? Math.PI / 2 : p.dir === 3 ? -Math.PI / 2 : 0,
      );
      if (s.mode !== "arcade")
        this.text(`P${p.color + 1}`, x, y - 16, COLORS[p.color], 1, true);
    }
    for (const e of s.events) {
      const age = s.tick - e.tick;
      if (age > 55) continue;
      if (e.kind === "score" && e.value)
        this.text(
          String(e.value),
          e.x,
          e.y - 10 - Math.floor(age / 5),
          0xffffff,
          1,
          true,
        );
      if (e.kind === "pop") {
        this.g.lineStyle(1, 0xffed82);
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4,
            r = age / 3 + 4;
          this.g.lineBetween(
            e.x + Math.cos(a) * r,
            e.y + Math.sin(a) * r,
            e.x + Math.cos(a) * (r + 3),
            e.y + Math.sin(a) * (r + 3),
          );
        }
      }
      if (e.kind === "death" && age < 45) {
        this.sprite(
          `player${s.players.find((p) => p.id === e.player)?.color ?? 0}-0`,
          e.x,
          e.y,
          1,
          1,
          false,
          1 - age / 45,
          age * 0.15,
        );
      }
    }
    const player = s.players.find((p) => p.id === this.localId) || s.players[0];
    for (let i = 0; i < Math.min(6, Math.max(0, (player?.lives || 0) - 1)); i++)
      this.sprite(`player${player?.color || 0}-0`, 24 + i * 16, 270);
    this.text(`ROUND ${s.round}`, 200, 265, 0xffffff, 1, false); // right aligned below
    this.g.fillStyle(0x000000).fillRect(143, 262, 81, 20);
    this.text(`ROUND ${s.round}`, 147, 267);
    if (this.attract) {
      this.g.fillStyle(0x000000, 0.88).fillRect(31, 108, 162, 62);
      this.text("DUG DIG", 112, 118, 0xffd262, 3, true);
      this.text("THE UNDERGROUND ARCADE", 112, 151, 0xffffff, 1, true);
    } else if (this.paused || ["ready", "clear", "over"].includes(s.phase)) {
      const message = this.paused
        ? "PAUSED"
        : s.phase === "ready"
          ? "READY!"
          : s.phase === "clear"
            ? "ROUND CLEAR"
            : "GAME OVER";
      this.g.fillStyle(0x000000, 0.8).fillRect(36, 130, 152, 30);
      this.text(
        message,
        112,
        141,
        s.phase === "over" ? 0xff6977 : 0xffec68,
        1,
        true,
      );
    }
    for (let i = this.imageCount; i < this.images.length; i++)
      this.images[i].setVisible(false);
  }
}
