import { mkdirSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";
const sprites: Record<string, string[]> = {
  miner: [
    ".....WWWWW......",
    "....WWWWWWW.....",
    "...WWWWWWWWW....",
    "...WBCCCCBWW....",
    "...WBCCCCBWW....",
    "....BBBBBWW.....",
    ".....WWWWW......",
    "...WWWWWWWW.....",
    "..WWBWWWWBWW....",
    "..WWBWWWWBWW....",
    "...BBWWWWBB.....",
    ".....BBBB.......",
    "....WW..WW......",
    "....WW..WW......",
    "...BBB..BBB.....",
    "................",
  ],
  pooka: [
    "................",
    ".....RRRRR......",
    "...RRRRRRRRR....",
    "..RRRRRRRRRRR...",
    ".RRYYYYYYYYYRR..",
    ".RYYBBBBBBBYYR..",
    ".RYBWWWBWWWB YR.".replace(" ", ""),
    ".RYBWWWBWWWB YR.".replace(" ", ""),
    ".RYYBBBBBBBYYR..",
    "..RRYYYYYYYRR...",
    "..RRRRRRRRRRR...",
    "...RRRRRRRRR....",
    "....RRRRRRR.....",
    "...WW.....WW....",
    "..WW.......WW...",
    "................",
  ],
  fygar: [
    "....GG..........",
    "...GGGG.........",
    "..GGGGGG........",
    ".GGGGWBGG.......",
    ".GGGGWBGGGG.....",
    ".GGGGGGGGGGGG...",
    "..GGGGGGGGGGG...",
    "..GGGGYGG.......",
    "...GGYYYGG......",
    "GG.GGYYYYGG.....",
    "GGGGGYYYGGG.....",
    ".GGGGYYGGGG.....",
    "..GGGGGGGG......",
    "...GG..GG.......",
    "..GGG..GGG......",
    "................",
  ],
  rock: [
    "................",
    "....AAAAAA......",
    "..AAWWWWAAA.....",
    ".AAWWWAAAAAA....",
    ".AWWAAAAAAWAA...",
    "AAWAAAAAAWWAAA..",
    "AAAAAAAAWWAAAA..",
    "AAADDAAAAAAADAA.",
    "AAADDAAAADDDDAA.",
    ".AAAAAAADDDDAA..",
    ".AAADAAAAADDAA..",
    "..AADDAAAAAAA...",
    "...AAAAAAAAA....",
    ".....AAAAA......",
    "................",
    "................",
  ],
  carrot: [
    ".......GG.......",
    "....G.GGG.......",
    ".....GGG........",
    ".....OOO........",
    "....OOOOO.......",
    "....OYO O.......".replace(" ", ""),
    "....OOOO........",
    "....OOOO........",
    ".....OOO........",
    ".....OO.........",
    ".....OO.........",
    ".....O..........",
    "................",
    "................",
    "................",
    "................",
  ],
  turnip: [
    "......GG........",
    "....GGGGGG......",
    ".....GGG........",
    "....WWWW........",
    "...WWWWWW.......",
    "..WWWWWWWW......",
    "..WPPPPPPW......",
    "...PPPPPP.......",
    "....PPPP........",
    ".....PP.........",
    ".....P..........",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  mushroom: [
    ".....RRRR.......",
    "...RRWWRRRR.....",
    "..RRWWWRRWRR....",
    ".RRRRRRRWWRRR...",
    ".RRWRRRRRRRRR...",
    "..RRRRRRRRRR....",
    ".....WWW........",
    ".....WWW........",
    "....WWWWW.......",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  cucumber: [
    ".........GG.....",
    ".......GGGG.....",
    "......GGYGG.....",
    ".....GGYGG......",
    "....GGYGG.......",
    "...GGYGG........",
    "..GGYGG.........",
    "..GGGG..........",
    "...GG...........",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  eggplant: [
    ".......GG.......",
    ".....GGGG.......",
    "....GGPPP.......",
    "....PPPPP.......",
    "...PPPLPP.......",
    "...PPLPPP.......",
    "..PPLPPPP.......",
    "..PPLPPP........",
    "..PPPPP.........",
    "...PPP..........",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  pepper: [
    "......GG........",
    "......G.........",
    "....GGGGG.......",
    "...GYGGGGG......",
    "..GYGGGGGG......",
    "..GYGGGGGG......",
    "..GYGGGGGG......",
    "...GGGGGG.......",
    "....GGGG........",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  tomato: [
    "......GG........",
    "....GGGGG.......",
    "...RRGRRR.......",
    "..RYYRRRRR......",
    ".RRYYRRRRRR.....",
    ".RRRRRRRRRR.....",
    ".RRRRRRRRRR.....",
    "..RRRRRRRR......",
    "...RRRRRR.......",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  onion: [
    "......GG........",
    "......G.........",
    ".....YYY........",
    "....YWWYY.......",
    "...YWWYYYY......",
    "..YWWYYYYYY.....",
    "..YWWYYYYYY.....",
    "...YYYYYYY......",
    "....YYYYY.......",
    ".....YYY........",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  melon: [
    ".....GGGG.......",
    "...GGYGYGGG.....",
    "..GGYGYGYGGG....",
    ".GGYGYGYGYGGG...",
    ".GGYGYGYGYGGG...",
    ".GGYGYGYGYGGG...",
    "..GGYGYGYGGG....",
    "...GGYGYGGG.....",
    ".....GGGG.......",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  galaxian: [
    ".......R........",
    "......RRR.......",
    "..B...RRR...B...",
    "..BB.RRRRR.BB...",
    "..BBBYYYYYBBB...",
    "...BBYYYYYBB....",
    "....BYYYYYB.....",
    ".....BYYYB......",
    "....BB...BB.....",
    "...BB.....BB....",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  pineapple: [
    ".....G.GG.......",
    "....GGGGGG......",
    ".....GGGG.......",
    "....YYYYYY......",
    "...YYOYYOYY.....",
    "...YOYYOYYY.....",
    "...YYOYYOYY.....",
    "...YOYYOYYY.....",
    "....YYYYYY......",
    ".....YYYY.......",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  flower: [
    ".....R.R........",
    "....RRRRR.......",
    ".....RYR........",
    "....RRRRR.......",
    ".....RGR........",
    "......G.........",
    "....GGG.........",
    "......GGG.......",
    "......G.........",
    "......G.........",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
};
const palette: Record<string, number[]> = {
  W: [250, 252, 242],
  B: [24, 41, 120],
  C: [37, 191, 239],
  R: [237, 42, 57],
  Y: [255, 231, 58],
  G: [48, 202, 61],
  A: [164, 94, 37],
  D: [91, 43, 28],
  O: [255, 132, 30],
  P: [180, 51, 203],
  L: [229, 126, 244],
};
const frames: Record<string, number> = {};
const list: { name: string; pixels: string[]; palette: typeof palette }[] = [];
for (let color = 0; color < 4; color++)
  for (let frame = 0; frame < 2; frame++) {
    const pixels = [...sprites.miner];
    if (frame) {
      pixels[12] = "....WWWWW.......";
      pixels[13] = "...WWW.WWW......";
      pixels[14] = "..BBB...BBB.....";
    }
    list.push({
      name: `player${color}-${frame}`,
      pixels,
      palette: {
        ...palette,
        B: [
          [24, 41, 120],
          [206, 48, 73],
          [36, 152, 90],
          [150, 63, 219],
        ][color],
        C: [
          [37, 191, 239],
          [255, 173, 164],
          [140, 255, 192],
          [232, 181, 255],
        ][color],
      },
    });
  }
for (const [name, pixels] of Object.entries(sprites))
  if (name !== "miner")
    for (
      let frame = 0;
      frame < (name === "pooka" || name === "fygar" ? 2 : 1);
      frame++
    ) {
      const p = [...pixels];
      if (frame) {
        p[13] = "....WW...WW.....".replaceAll(
          "W",
          name === "fygar" ? "G" : "W",
        );
        p[14] = "....WWW.WWW.....".replaceAll(
          "W",
          name === "fygar" ? "G" : "W",
        );
      }
      list.push({ name: `${name}${frame ? "-1" : ""}`, pixels: p, palette });
    }
const png = new PNG({ width: list.length * 16, height: 16 });
list.forEach((s, index) => {
  frames[s.name] = index;
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const c = s.palette[s.pixels[y]?.[x] || "."],
        offset = (y * png.width + index * 16 + x) * 4;
      if (c) {
        png.data[offset] = c[0];
        png.data[offset + 1] = c[1];
        png.data[offset + 2] = c[2];
        png.data[offset + 3] = 255;
      }
    }
});
mkdirSync("public/assets", { recursive: true });
writeFileSync("public/assets/sprites.png", PNG.sync.write(png));
writeFileSync("src/client/frames.json", JSON.stringify(frames, null, 2));
writeFileSync(
  "public/assets/manifest.json",
  JSON.stringify(
    {
      sprites: {
        file: "sprites.png",
        frameWidth: 16,
        frameHeight: 16,
        frames,
        source:
          "Hand-authored pixel matrices in tools/assets.ts; original reconstruction, not extracted arcade graphics",
      },
      audio: {
        source:
          "Web Audio synthesis in src/client/audio.ts; original melody and arcade-style cues",
      },
      font: { source: "Hand-authored 5x7 glyphs in src/client/font.ts" },
    },
    null,
    2,
  ),
);
