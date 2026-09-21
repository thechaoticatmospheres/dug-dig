export const W = 224,
  H = 288,
  CELL = 16,
  LEFT = 24,
  TOP = 56,
  COLS = 12,
  ROWS = 13;
export const TERRAIN_W = 48,
  TERRAIN_H = 52,
  TERRAIN_X = 16,
  TERRAIN_Y = 48;
export const RULES = {
  hz: 60,
  tunnelSpeed: 1,
  digSpeed: 0.8,
  pumpReach: 34,
  pumpInterval: 18,
  deflateTicks: 48,
  ghostAfter: 360,
  ghostDuration: 150,
  rockWobble: 48,
  rockSpeed: 2,
  respawnTicks: 120,
  protectionTicks: 120,
  readyTicks: 120,
  roundClearTicks: 150,
  bonusTicks: 600,
  matchRounds: 5,
} as const;
export const ROCK_POINTS = [
  0, 1000, 2500, 4000, 6000, 8000, 10000, 12000, 15000,
];
export const BONUS_POINTS = [
  400, 600, 800, 1000, 1000, 2000, 2000, 3000, 3000, 4000, 4000, 5000, 5000,
  6000, 6000, 7000, 7000, 8000,
];
export type Direction = 0 | 1 | 2 | 3; // right, down, left, up
export const DX = [1, 0, -1, 0],
  DY = [0, 1, 0, -1];
export type Mode = "arcade" | "coop" | "versus";
export type Input = { dir: Direction | -1; pump: boolean; seq: number };
export const neutral = (): Input => ({ dir: -1, pump: false, seq: 0 });
export const at = (c: number, r: number) => ({
  x: LEFT + c * CELL,
  y: TOP + r * CELL,
});
