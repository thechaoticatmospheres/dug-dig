import type { Game } from "../shared/simulation";
export class ArcadeAudio {
  context: AudioContext | null = null;
  master: GainNode | null = null;
  volume = 0.35;
  music = 0.6;
  sfx = 0.8;
  muted = false;
  lastEvent = 0;
  lastNote = -1;
  async unlock() {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.connect(this.context.destination);
    }
    await this.context.resume();
    this.apply();
  }
  apply() {
    if (this.master && this.context)
      this.master.gain.setTargetAtTime(
        this.muted ? 0 : this.volume,
        this.context.currentTime,
        0.02,
      );
  }
  tone(
    freq: number,
    duration: number,
    type: OscillatorType = "square",
    volume = 0.12,
    delay = 0,
    end?: number,
  ) {
    if (!this.context || !this.master) return;
    const start = this.context.currentTime + delay,
      o = this.context.createOscillator(),
      gain = this.context.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, start);
    if (end)
      o.frequency.exponentialRampToValueAtTime(
        Math.max(20, end),
        start + duration,
      );
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    o.connect(gain);
    gain.connect(this.master);
    o.start(start);
    o.stop(start + duration + 0.02);
  }
  cue(kind: string) {
    const v = this.sfx;
    if (kind === "pump") this.tone(130, 0.12, "square", v * 0.2, 0, 420);
    else if (kind === "pop" || kind === "crush") {
      this.tone(500, 0.2, "sawtooth", v * 0.12, 0, 55);
      this.tone(950, 0.09, "square", v * 0.13);
    } else if (kind === "death") {
      [660, 622, 523, 440, 349, 220, 110].forEach((f, i) =>
        this.tone(f, 0.12, "square", v * 0.2, i * 0.09),
      );
    } else if (kind === "fire") this.tone(80, 0.4, "sawtooth", v * 0.2, 0, 38);
    else if (kind === "rock" || kind === "crumble")
      this.tone(95, 0.3, "triangle", v * 0.5, 0, 25);
    else if (["collect", "bonus", "life", "clear", "start"].includes(kind)) {
      [523, 659, 784, 1047].forEach((f, i) =>
        this.tone(f, 0.15, "square", v * 0.12, i * 0.1),
      );
    } else if (kind === "over") {
      [392, 330, 262, 196].forEach((f, i) =>
        this.tone(f, 0.3, "triangle", v * 0.3, i * 0.22),
      );
    }
  }
  update(g: Game, audible = true) {
    for (const e of g.events)
      if (e.id > this.lastEvent) {
        if (audible) this.cue(e.kind);
        this.lastEvent = e.id;
      }
    if (
      !audible ||
      g.phase !== "play" ||
      !g.players.some((p) => p.alive && p.moving)
    )
      return;
    const beat = Math.floor(g.tick / 9);
    if (beat === this.lastNote) return;
    this.lastNote = beat;
    const melody = [
      523, 659, 784, 659, 587, 698, 880, 698, 659, 784, 988, 784, 698, 659, 587,
      392, 523, 784, 659, 523, 587, 880, 698, 587, 659, 988, 784, 659, 587, 494,
      392, 494,
    ];
    this.tone(melody[beat % melody.length], 0.095, "square", this.music * 0.12);
    if (beat % 2 === 0)
      this.tone(
        [131, 175, 196, 147][Math.floor(beat / 8) % 4],
        0.1,
        "triangle",
        this.music * 0.2,
      );
  }
  reset() {
    this.lastEvent = 0;
    this.lastNote = -1;
  }
}
