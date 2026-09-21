import { spawn } from "node:child_process";
const children = [
  spawn(process.execPath, ["--import", "tsx", "src/server/index.ts"], {
    stdio: "inherit",
  }),
  spawn(
    process.execPath,
    ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1"],
    { stdio: "inherit" },
  ),
];
for (const p of children)
  p.on("exit", () => {
    for (const other of children) other.kill();
  });
process.on("SIGINT", () => {
  for (const p of children) p.kill();
  process.exit();
});
