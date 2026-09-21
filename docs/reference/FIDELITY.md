# Reference baseline

Target: Namco Dig Dug (1982), arcade revision 2 (`digdug` in MAME), upright cabinet; three lives, easy difficulty, bonus lives at 10,000 and each subsequent 40,000. No console-port mechanics are reference material.

Primary references:
- Atari TM-203 arcade operation manual, gameplay and scoring tables, mirrored at https://manualzz.com/doc/6278433/atari-dig-dug-arcade-game-operation--maintenance-and-serv...
- Original manual scan: https://www.mamechannel.it/files_free/arcade_manuals_unpacked/digdugat.pdf
- MAME hardware/revision source: https://github.com/mamedev/mame/blob/master/src/mame/namco/galaga.cpp and https://github.com/mamedev/mame/blob/master/src/mame/namco/digdug.cpp
- Cabinet and screen reference: https://www.arcade-museum.com/Videogame/dig-dug

## Verified manual facts

Four-way movement and one pump action. Inflated enemies can be walked through. Fygar's fire can cross thin dirt. Two dropped rocks trigger the vegetable. Pooka and vertical Fygar points by dirt depth: 200, 300, 400, 500; horizontal Fygar doubles these. Rock totals for 1–8 enemies: 1000, 2500, 4000, 6000, 8000, 10000, 12000, 15000. Vegetables: 400, 600, 800, then pairs of rounds at 1000, 2000, 3000, 4000, 5000, 6000, 7000; round 18+ awards 8000. Digging awards points.

## Measurement status and reconstruction choices

Logical display: 224 × 288 with a 192-pixel-wide underground arena and 16-pixel cells. Fixed 60 Hz simulation; numeric subpixel units make repeated input deterministic. Movement, pump cadence, ghost scheduling, fire timing, rock delay and collision dimensions are explicit reconstruction constants in rules.ts, NOT measurements from an original cabinet. No frame-perfect or pixel-perfect equivalence is claimed.

Round data and pixel animation frames are authored reconstructions. The first round uses the recognizable central entry shaft, lower horizontal junction and isolated monster caves. Later authored arrangements progress into repeating patterns. Exact original ROM level tables, original sound waveforms/melodies, attract sequence and round-256 bug are not yet reproduced. These remain fidelity gaps, not verified equivalence.

Audio uses synthesized arcade-style cues and an original movement-linked melody. Sprite sheets are hand-authored pixel matrices with animation frames, not extracted ROM data. See public/assets/manifest.json for provenance.

Multiplayer deliberately changes target selection, spawn protection, enemy counts, lives and scoring ownership. Arcade mode does not inherit player-count scaling or multiplayer respawn protection. Alternating players retain separate boards and progress between turns.

## Acceptance evidence

Record executed tests and browser captures in docs/VALIDATION.md. Screenshot review establishes the reconstruction's rendering quality; it does not establish pixel identity with the arcade. Reference timings must remain listed as unverified until independently measured.
