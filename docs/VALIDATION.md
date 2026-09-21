# Validation — September 21, 2026

## Executed locally

- 27 simulation and real WebSocket checks pass. Coverage includes deterministic 3600-tick replays, player/enemy movement, digging, pump ownership and release, inflation/deflation, Fygar fire, ghosting, rock support/combination scoring, bonus collection, extra lives, death resets, protected co-op respawns, five-round results/ties, spectator admission, all 12 authored round starts and their repeat sequence, stale/malformed input, four clients, room isolation, capacity, host transfer, authenticated reconnect, score authority, rematches and origin rejection.
- A real WebSocket proxy introduces 75 ms each way (approximately 150 ms RTT). Predicted movement stays within the test's 20-pixel bound during movement and settles to under 2 pixels after input stops; terrain converges exactly. This is a test threshold, not a measured Internet latency guarantee.
- Four headless Edge browser tests pass: solo controls/pumping/pause/audio with screenshots and a 390-pixel viewport; alternating-player death/turn handoff and separate terrain; two-player competitive start and host departure; four-player co-op digging/state synchronization and page-refresh reconnect.
- Browser captures inspected: menu, arcade, co-op. Responsive capture is also saved. No JavaScript page errors in the solo smoke test.
- TypeScript checking and optimized Vite build pass. The framework bundle is approximately 348 KB gzip before the final copy-only change. Pixel art and interface fonts are bundled locally; no runtime font CDN request is needed.
- npm dependency audit reports zero known vulnerabilities after upgrading ws, Vite and Playwright.

## Deployment status

The public repository is https://github.com/thechaoticatmospheres/dug-dig . **GitHub Pages is live at https://thechaoticatmospheres.github.io/dug-dig/**. Workflow https://github.com/thechaoticatmospheres/dug-dig/actions/runs/35644585412 passed its build, all 27 simulation/network checks, all four Chromium browser tests and deployment for runtime commit `c9183b8`.

The initial CI run caught a type-narrowing error in the subsequently added profiling utility. That was corrected before the successful deployment. The live site was opened in the signed-in Codex browser; Arcade started, sprites rendered, gameplay advanced and lives updated. Online mode correctly displayed its unavailable message. The production build also passed a local preview check under `/dug-dig/`, including sprites and bundled fonts.

Render was inspected in the user's signed-in Codex browser. The dashboard states that the Hobby workspace is suspended after consuming its **5 GB free bandwidth allowance**. New service creation is disabled. No paid upgrade, card entry, additional account or attempt to bypass the limit was made. Consequently no Dug Dig Render service or public health URL exists yet, and public multiplayer cannot be verified. The separate free-service configuration is ready in render.yaml. Zombiino's service was not modified.

## Fidelity and remaining limits

The game is a functional reconstruction, not an exact original-game emulator. Manual scoring is implemented, but original ROM level tables, pixel-identical sprites, music/waveforms, measured original frame timings, precise enemy routing/escape behavior, attract sequence and round-256 hardware behavior are not verified/reproduced. These are substantive remaining differences from the requested 1:1 target. See reference/FIDELITY.md.

Tests verify the implemented reconstruction's internal behavior, not equivalence to a physical cabinet. Full reference-video timing comparison, physical gamepad play, extended Internet play and Render load/cold-start/restart testing remain unperformed.

## Bandwidth sample

`node --import tsx tools/profile.ts` simulated 60 seconds and sampled 20 snapshots per second: average raw snapshot 3,587 bytes; compressed snapshot 792 bytes. That synthetic case projects about 218 MiB per hour for a four-player room, excluding wire overhead. Profiling (including compression) took 104 ms locally. These are local workload observations, not a hosted capacity benchmark. Terrain is packed four cells per hex character, unchanged terrain is omitted, and snapshots use WebSocket compression.

Captured artifacts: screenshots/menu.png, screenshots/arcade.png, screenshots/coop.png, screenshots/competitive.png, screenshots/mobile.png.
