import { createGameServer } from "./server";
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS ||
  "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173"
)
  .split(",")
  .map((s) => s.trim());
const app = createGameServer({ allowedOrigins });
app.server.listen(
  Number(process.env.PORT || 3001),
  process.env.HOST || "0.0.0.0",
  () => console.log(`Dug Dig server ready on port ${process.env.PORT || 3001}`),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => {
    const deadline = setTimeout(() => process.exit(1), 5000);
    app.close().then(() => {
      clearTimeout(deadline);
      process.exit(0);
    });
  });
