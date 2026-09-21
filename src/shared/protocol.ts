import type { Input, Mode } from "./rules";
import type { Game } from "./simulation";
export const PROTOCOL = 1;
export type Member = {
  id: string;
  name: string;
  color: number;
  ready: boolean;
  connected: boolean;
};
export type RoomView = {
  code: string;
  mode: Mode;
  host: string;
  members: Member[];
  started: boolean;
};
export type WireGame = Omit<Game, "terrain"> & { terrain: number[] | string };
export type ServerMessage =
  | {
      type: "welcome";
      version: number;
      id: string;
      token: string;
      room: RoomView;
    }
  | { type: "room"; room: RoomView }
  | { type: "state"; game: WireGame; room: RoomView }
  | { type: "error"; code: string; message: string }
  | { type: "shutdown"; message: string };
export function packTerrain(terrain: number[]) {
  let packed = "";
  for (let i = 0; i < terrain.length; i += 4)
    packed += (
      (terrain[i] << 3) |
      (terrain[i + 1] << 2) |
      (terrain[i + 2] << 1) |
      terrain[i + 3]
    ).toString(16);
  return packed;
}
export function unpackTerrain(packed: string) {
  const out: number[] = [];
  for (const char of packed) {
    const n = parseInt(char, 16);
    out.push((n >> 3) & 1, (n >> 2) & 1, (n >> 1) & 1, n & 1);
  }
  return out;
}
export function validInput(v: unknown): v is Input {
  if (!v || typeof v !== "object") return false;
  const p = v as Input;
  return (
    Number.isSafeInteger(p.seq) &&
    p.seq >= 0 &&
    p.seq <= 2 ** 31 - 1 &&
    Number.isInteger(p.dir) &&
    p.dir >= -1 &&
    p.dir <= 3 &&
    typeof p.pump === "boolean"
  );
}
