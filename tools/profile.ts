import { performance } from "node:perf_hooks";
import { deflateRawSync } from "node:zlib";
import { createGame, Game, loadRound, step } from "../src/shared/simulation";
import { packTerrain } from "../src/shared/protocol";
const game = createGame(
  "coop",
  Array.from({ length: 4 }, (_, i) => ({
    id: `player-${i}`,
    name: `Player ${i + 1}`,
  })),
);
game.phase = "play";
for (const p of game.players) p.invulnerable = 1000000;
let bytes = 0,
  rawBytes = 0,
  samples = 0;
const begin = performance.now();
for (let i = 0; i < 3600; i++) {
  for (const p of game.players)
    p.input = {
      dir: (Math.floor(i / 120) % 4) as 0 | 1 | 2 | 3,
      pump: i % 120 > 95,
      seq: i + 1,
    };
  step(game);
  if ((game as Game).phase === "over") loadRound(game);
  if (i % 3 === 0) {
    const data = JSON.stringify({
      ...game,
      terrain: packTerrain(game.terrain),
      events: game.events.filter((e) => game.tick - e.tick < 90),
    });
    rawBytes += Buffer.byteLength(data);
    bytes += deflateRawSync(data, { level: 3 }).length;
    samples++;
  }
}
console.log(
  JSON.stringify(
    {
      simulatedSeconds: 60,
      profilingWallMs: Math.round(performance.now() - begin),
      averageRawSnapshotBytes: Math.round(rawBytes / samples),
      averageCompressedSnapshotBytes: Math.round(bytes / samples),
      fourClientMiBPerHourEstimate: Math.round(
        ((bytes / samples) * 20 * 4 * 3600) / 1024 / 1024,
      ),
      note: "Local synthetic workload including compression profiling. Wire overhead excluded; real gameplay and hosted CPU differ.",
    },
    null,
    2,
  ),
);
