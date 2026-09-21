# Dug Dig

A browser reconstruction of the 1982 digging arcade game, with local solo, alternating two-player, online co-op and online score races for 2–4 players.

## Play locally

Node.js 22.12 or newer is required.

```sh
npm ci
npm run dev
```

Open http://localhost:5173. This starts both Vite and the multiplayer server on port 3001. Solo mode has no server dependency. The public client uses Phaser; shared TypeScript simulation runs locally in solo mode and authoritatively on Node for online matches.

| Action     | Keyboard           | Gamepad            |
| ---------- | ------------------ | ------------------ |
| Move       | Arrow keys or WASD | D-pad / left stick |
| Pump       | Hold Space or Z    | Hold A             |
| Pause solo | Escape             | Start              |

Sound unlocks after interaction. Master, music and effects volume, player name and high score persist locally. Alternating mode uses one keyboard and keeps each player's own board, score, round and lives.

## Online rules

Choose Co-op or Score Race. Leave the code empty to create a private room, then share the invite link. Everyone readies up; the host starts. Players pass through one another. Pumps target monsters; falling rocks threaten everyone.

Co-op shares a team score with three starting lives per player. Score Race runs for five cleared rounds or until everyone is eliminated; highest score wins, and equal scores tie. Pump kills go to the attachment owner, rocks retain the identity of the player who removed their final support, and bonus items have a single collector. No points for crushing another player. Personal extra lives use the 10,000 / 40,000 / every 40,000 thresholds. Respawns use the safest available spawn candidate with two seconds of protection.

Late co-op arrivals enter the next round. Late competitive arrivals spectate until the next match. Refreshing/reconnecting with the same browser token restores the slot within two minutes. Host ownership transfers on disconnect. Rooms are held only in server memory; server restarts end matches. Scores have no global leaderboard.

## Build and test

```sh
npm test
npm run build
npm run test:browser
```

Browser tests use installed Edge on Windows; on other systems install Chromium with `npx playwright install chromium`. Screenshots are in `docs/screenshots`. `npm run assets` regenerates the hand-authored pixel sprite sheet. Shared rules, levels, protocol, room lifecycle and actual WebSocket connections are tested independently of Phaser. A delayed WebSocket proxy tests approximately 150 ms network round-trip delay.

## Deploy

1. Create a public GitHub repository and push `main`. In Settings → Pages select GitHub Actions.
2. Create a **separate Free Node web service** on Render from this repository using `render.yaml`. Build: `npm ci --omit=dev`; start: `npm start`; health path: `/health`. Bind to Render's `PORT` and `0.0.0.0`.
3. Set `ALLOWED_ORIGINS` to the Pages origin, with no repository path. For this account: `https://thechaoticatmospheres.github.io`.
4. Set GitHub's Actions repository variable `GAME_SERVER_URL` to the deployed HTTPS Render URL. Re-run the Pages workflow to embed the public server address.
5. Verify `/health`, room creation, invite links and two independent players on the deployed Pages site. Deploy the same protocol-compatible commit to client and server.

The workflow checks types, simulation/network tests, production build and browser gameplay before publishing. Vite uses the GitHub repository subpath for assets. Only `dist/` is published; no server credentials enter the client. If the backend URL is absent, online mode explains the missing configuration while solo remains playable.

Render's free services sleep after 15 idle minutes; waking can take about one minute. UI retries are bounded. The 750 monthly free hours are shared with other free web services in the same workspace, including Zombiino. Bandwidth/build limits also apply. No external uptime pings, paid storage or paid services are required.

## Fidelity

This is a playable reconstruction, **not a verified 1:1 emulation**. Scoring tables and core verbs follow the arcade manual. Exact arcade revision timings, ROM level tables, original sprites, sound waveforms/melodies, attract sequence and late-game hardware bugs are not reproduced. See [the reference matrix](docs/reference/FIDELITY.md), [asset manifest](public/assets/manifest.json) and [validation report](docs/VALIDATION.md). Multiplayer adaptations are isolated from Arcade rules.

## Source layout

- `src/shared/`: deterministic rules, level data, simulation and protocol.
- `src/server/`: authoritative WebSocket rooms and lifecycle.
- `src/client/`: Phaser renderer, pixel font, audio, controls, menus and prediction.
- `public/assets/`: reproducible sprite sheet and provenance.
- `tests/`: simulation, transport, delayed-network and browser checks.
