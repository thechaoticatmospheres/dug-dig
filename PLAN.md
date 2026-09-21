# Dug Dig — browser game plan

Planning document, September 21, 2026. No game implementation or deployment is authorized by this planning document alone.

## Target

Recreate the original Dig Dug experience in a browser, then add simultaneous online multiplayer. User-confirmed choices: original 1982 arcade release, with both cooperative and competitive modes. Proposed online capacity: 2–4 players.

The arcade game used alternating two-player turns. Simultaneous play therefore needs its own rules. Keep an Arcade ruleset and a Multiplayer ruleset so multiplayer balancing cannot change the original solo experience. Arcade mode should include solo and the original alternating two-player option.

“1 for 1” is the fidelity target, not a claim to make before comparison. Lock one arcade revision and cabinet settings before tuning. Record the reference source, evidence, measured values, and uncertainties. Avoid mixing behavior from NES, Atari home versions, later arrangements, and arcade revisions.

## Fidelity requirements

| Area         | What must be matched and verified                                                                                                                                                                   |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Presentation | Original portrait playfield proportions, pixel grid, palette, dirt strata, tunnel shapes, character size, animation cadence, HUD, flowers, score popups, transitions and attract/title presentation |
| Movement     | Four directions, turn alignment, digging speed versus open-tunnel speed, facing, collision shapes, movement during pumping and action timing                                                        |
| Pump         | Hose reach, attachment, pumping cadence, inflation stages, stun, deflation, release, enemy vulnerability and scoring                                                                                |
| Enemies      | Pooka and Fygar movement, target selection, tunnel traversal, ghost transitions, fire direction/range/windup and final-enemy escape                                                                 |
| Rocks        | Support removal, wobble delay, fall timing, crushing multiple enemies, player crushing, stopping and disappearance                                                                                  |
| Progression  | Authored starting tunnels, enemy/rock placements, round pattern sequence, difficulty progression, lives, extra-life settings, death resets and late-round behavior                                  |
| Scoring      | Depth-dependent enemy points, directional Fygar bonus, multi-enemy rock awards, bonus item conditions, item values and high scores                                                                  |
| Audio        | Movement-linked music behavior, pumping, popping, fire, rock falls, death, start and round-clear cues; independent volume controls                                                                  |

Build a reference matrix before coding detailed rules. Unknown numbers remain explicitly unverified until measured. Store rules and round layouts as data. Preserve edge cases in Arcade mode when verified rather than silently modernizing them.

## Proposed cooperative multiplayer rules

These are new design choices, not claims about the original game.

- Private room codes and invitation links; 2–4 players, ready indicators and host-start countdown. No account required.
- Same fixed portrait board and shared tunnels, enemies and rocks. Distinct player colors and P1–P4 labels. Players pass through one another.
- Cooperative objective: clear rounds together. Team score is the main score; individual contributions are secondary.
- Pumps affect enemies only. One player attaches to an enemy at a time, with server-defined ordering for simultaneous attachment; release or disconnect frees the attachment.
- Falling rocks remain dangerous to all players. Make this explicit in the controls/lobby information.
- Starting proposal: three personal lives, short safe respawns while lives remain, spectating after elimination, and game over when the whole team is eliminated. Exact respawn location/delay and protection are multiplayer tuning data.
- Lock player count and difficulty at the start of each round. New arrivals wait for the next round; reconnecting players reclaim their existing slot.
- Start with original geometry and enemy behavior. Tune multiplayer enemy counts separately, using authored valid spawn positions, and document the balancing changes.
- A short connection loss allows rejoining the current in-memory room using an opaque reconnect token. Lobby ownership transfers if the host leaves; simulation continues on the server.
- Server restarts end in-memory matches. Explain this clearly and provide a return-to-lobby/recreate-room flow. Persistent match recovery and global leaderboards are outside the first release.

## Proposed competitive multiplayer rules

The user requested competitive play; the following score-race format is the recommended implementation default.

- 2–4 players compete simultaneously on the same board, using the same movement, enemies, pumps and rocks as cooperative play.
- A match lasts five cleared rounds, or ends early when every player is eliminated. Highest accumulated individual score wins; identical scores share the placing.
- Each player starts the match with three lives. Death consumes a life, with safe respawn while lives remain. Eliminated players spectate for the remainder of the match. Extra-life awards use the documented multiplayer scoring settings.
- Pump kills award points to the player who owns the pump attachment at the pop. A release/disconnect ends attachment ownership; another player may finish the enemy and claim the kill.
- Each falling rock records the player whose terrain edit removed its final support. That player receives the original rock-chain score for enemies crushed by that rock. Simultaneous edits resolve in deterministic server order. Environmental falls without a player owner award no individual points.
- Bonus items go to the first player to collect them according to authoritative simulation order. Never duplicate an item award between clients.
- Players pass through each other and cannot pump other players. Falling rocks can crush opponents or their owner; player deaths do not award kill points. Competition comes from scoring opportunities and rock placement.
- Scores, lives, current round out of five and final standings remain visible and readable. Include a rematch flow with ready confirmation and reset scores/lives.
- Lock the competitor roster when the match starts. New arrivals spectate until the next match; reconnects restore the existing player. If everyone disconnects, expire the room after a documented grace interval.

## Architecture and hosting

- Browser: Phaser, TypeScript and Vite, with crisp nearest-neighbor pixel rendering and a fixed camera. DOM menus/lobby/settings; reproduce the arcade HUD at the game's pixel grid where fidelity requires it.
- Simulation: pure shared TypeScript modules independent of Phaser. Own movement, terrain, enemies, pumps, rocks, collision, score and rounds here.
- Solo: run the shared simulation locally, without requiring the multiplayer server to be awake.
- Multiplayer: authoritative Node.js server using WebSockets (`ws`). Clients send bounded, sequenced input commands; the server owns all consequential game state.
- Use a fixed simulation step, initially 60 Hz, then calibrate against the selected arcade reference. Snapshot delivery can start at 15–20 Hz and be adjusted after profiling. Rendering and network rates are separate.
- Predict local movement and reconcile with acknowledged authoritative inputs; interpolate remote players. Do not let clients award hits, score, lives or round completion.
- Synchronize terrain edits with revisions and send a complete current state on join/rejoin. Validate message sizes, input cadence, room capacity, protocol versions and allowed origins.
- Use one free Render web service with bounded rooms, idle cleanup, `/health`, secure WebSocket connections and graceful shutdown. No paid database or always-on service required.
- GitHub Pages serves the built client via GitHub Actions. Configure the repository base path and public game-server URL at build time. Server secrets never enter client builds.
- Prepare `render.yaml`, `.env.example`, build/deploy workflows and a deployment README.

Suggested structure:

```text
src/client/       Phaser rendering, input, audio, menus and network client
src/shared/       Simulation, rules, round data and protocol types
src/server/       WebSocket transport, authoritative rooms and lifecycle
public/assets/   Pixel art, animation data, fonts and audio
docs/reference/  Sources, measurements, fidelity checklist and comparison captures
tests/           Simulation, network integration and browser acceptance tests
```

Zombiino's local project was inspected at `C:/Users/joshu/OneDrive/Documents/ChatGPT/zombiino`. It already uses GitHub Pages, Vite, Node.js, `ws`, a free `render.yaml`, `/health`, allowed origins and a public server URL repository variable. Reuse those deployment patterns after checking applicability. Create a separate backend for this game.

## Free-tier constraints verified during planning

- GitHub Pages hosts static assets; GitHub Free requires a public repository for Pages.
- Render's free server sleeps after 15 minutes without inbound HTTP requests or WebSocket messages. Wake-up takes about one minute. Show waking/retrying/failed states with retry backoff.
- Normal incoming gameplay WebSocket traffic now counts as activity. Do not add external uptime pings to prevent idle sleep.
- Render grants 750 free instance hours per workspace each month, shared by its free services. Zombiino and this game consume the same pool if deployed in the same workspace.
- Free services can restart; filesystem and in-memory rooms are not persistent. Outbound bandwidth and build usage also have limits. A free compute plan does not mean unlimited hosting usage.

## Build order and acceptance gates

1. Reference specification: select version/settings, document measured mechanics and round patterns, prepare a source/asset manifest and visual reference sheet. Gate: no core rule relies on an unexplained guess.
2. Solo vertical slice: one accurate round with digging, both enemies, pumping, rocks, score, death and restart. Gate: compare a captured run with the reference and fix movement, scale and timing discrepancies.
3. Arcade completion: round sequence, difficulty, bonus items, extra lives, audio, animation, title/attract and alternating two-player mode. Gate: full fidelity checklist with known deviations listed.
4. Multiplayer: implement rooms, cooperative mode and competitive score races using the existing simulation. Gate: two and four independent clients agree on terrain, enemies, pump state, rocks, scores and round transitions; competitive attribution, match end and rematch are correct.
5. Reliability and polish: keyboard and gamepad controls, responsive integer scaling where space allows, focus-loss input cleanup, sound activation after user interaction, reconnect, host departure and cold-start UX. Touch controls are a later option unless requested.
6. Deployment: test production build under a repository subpath; deploy Pages and a separate free Render service when execution is requested; verify online create/join and gameplay with independent clients. Gate: return working URLs and report any remaining fidelity or hosting limitations.

Meaningful tests include pump/deflation transitions, rock support and multi-crush scoring, enemy fire and ghost states, scoring thresholds, round/death resets, deterministic input replay, conflicting player actions, room isolation, reconnect identity, disconnect cleanup, stale inputs and protocol rejection. Browser checks include real gameplay input, audio activation, screenshots, two/four-player play and roughly 150 ms simulated network latency. A claimed performance or capacity result must be measured.

## Sources

- Render free services: https://render.com/docs/free
- Render WebSockets: https://render.com/docs/websocket
- Render February 2026 activity change: https://render.com/changelog/free-web-services-now-remain-active-while-receiving-websocket-messages
- GitHub Pages setup: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- Official arcade release description: https://www.xbox.com/en-US/games/store/arcade-game-series-dig-dug/BV70995QL0QH
- Museum arcade catalog and manual links: https://www.arcade-museum.com/Videogame/dig-dug

These establish the planning baseline; the implementation phase still needs detailed arcade-reference measurements.
