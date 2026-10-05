// Generates every placeholder texture in code, so the project needs no art
// files yet. Day 2 swaps 'hero' for the real sprite sheet; the rest can be
// replaced one by one without changing game code (same texture keys).
import Phaser from 'phaser';
import { FW, FH, HERO_ANIMS, frameIndex } from '../heroFrames.js';
import { save, persist, resetSave } from '../systems/save.js';
import { NPC_ORDER, NPC_ANIMS } from '../npcFrames.js';
import { createCreatureTextures, createVignette } from '../art/creatures.js';
import { GAME_W, GAME_H, ZOOM } from '../config.js';
import { createPointerTexture } from '../systems/mouse.js';
import { CHARACTERS } from '../data/characters.js';
import { loadCharacterSheets, createHeroTexture } from '../systems/character.js';

function canvasTex(scene, key, w, h, draw) {
  const tex = scene.textures.createCanvas(key, w, h);
  draw(tex.getContext(), tex);
  tex.refresh();
  return tex;
}

const fill = (ctx, c, x, y, w, h) => {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
};

// --- Tiles ----------------------------------------------------------------
function drawGround(ctx) {
  fill(ctx, '#3c4c8c', 0, 0, 16, 16);
  fill(ctx, '#7c8ccc', 0, 0, 16, 2);
  fill(ctx, '#0f0f1b', 0, 2, 16, 1);
  fill(ctx, '#2c3a7c', 3, 7, 2, 2);
  fill(ctx, '#2c3a7c', 10, 11, 2, 2);
}
function drawDirt(ctx) {
  fill(ctx, '#2c3468', 0, 0, 16, 16);
  fill(ctx, '#3c4c8c', 2, 3, 2, 2);
  fill(ctx, '#3c4c8c', 9, 9, 2, 2);
  fill(ctx, '#1c2250', 12, 4, 2, 2);
}
function drawDesk(ctx) {
  fill(ctx, '#0f0f1b', 0, 0, 16, 16);
  fill(ctx, '#ac7c00', 1, 1, 14, 14);
  fill(ctx, '#fca044', 1, 1, 14, 3);
  fill(ctx, '#8c5c00', 2, 6, 12, 8);
  fill(ctx, '#f8d878', 6, 9, 4, 2);
}
// Pipe pieces: lip is 16 wide, body is inset 2px (classic look)
function drawPipeTop(ctx, right) {
  fill(ctx, '#0f0f1b', 0, 0, 16, 16);
  fill(ctx, '#00a800', 1, 1, 15, 14);
  if (right) {
    fill(ctx, '#0f0f1b', 15, 0, 1, 16);
    fill(ctx, '#00a800', 0, 1, 14, 14);
    fill(ctx, '#005800', 10, 1, 4, 14);
  } else {
    fill(ctx, '#58d854', 3, 1, 3, 14);
  }
}
function drawPipeBody(ctx, right) {
  const x = right ? 0 : 2;
  const w = 14;
  fill(ctx, '#0f0f1b', x, 0, w, 16);
  fill(ctx, '#00a800', right ? 0 : 3, 0, w - 1, 16);
  if (right) fill(ctx, '#005800', 8, 0, 4, 16);
  else fill(ctx, '#58d854', 5, 0, 3, 16);
}

// --- Items ----------------------------------------------------------------
function drawCoins(ctx) {
  const widths = [10, 6, 2, 6];
  widths.forEach((w, i) => {
    const x = i * 16 + 8 - w / 2;
    fill(ctx, '#0f0f1b', x - 1, 2, w + 2, 12);
    fill(ctx, '#f8d878', x, 3, w, 10);
    if (w > 4) fill(ctx, '#fca044', x + 1, 4, Math.max(1, w - 4), 8);
  });
}
function drawCoffee(ctx) {
  fill(ctx, '#fcfcfc', 5, 0, 1, 3); // steam
  fill(ctx, '#fcfcfc', 9, 1, 1, 3);
  fill(ctx, '#0f0f1b', 2, 4, 11, 11);
  fill(ctx, '#fcfcfc', 3, 5, 9, 9);
  fill(ctx, '#ac4040', 3, 9, 9, 2); // sleeve
  fill(ctx, '#0f0f1b', 12, 6, 3, 6); // handle
  fill(ctx, '#fcfcfc', 13, 7, 1, 4);
  fill(ctx, '#ac7c00', 4, 6, 7, 2); // coffee
}
function drawFlag(ctx, on) {
  fill(ctx, '#0f0f1b', 6, 0, 4, 32);
  fill(ctx, '#bcbcbc', 7, 1, 2, 31);
  fill(ctx, '#0f0f1b', 9, 2, 7, 8);
  fill(ctx, on ? '#58d854' : '#f83800', 9, 3, 6, 6);
}
function drawDoor(ctx) {
  fill(ctx, '#0f0f1b', 1, 0, 14, 32);
  fill(ctx, '#ac7c00', 2, 1, 12, 31);
  fill(ctx, '#fca044', 3, 3, 4, 12);
  fill(ctx, '#fca044', 9, 3, 4, 12);
  fill(ctx, '#8c5c00', 3, 18, 10, 12);
  fill(ctx, '#f8d878', 11, 16, 2, 2);
}

const QMARK = ['.XXX.', 'X...X', '....X', '..XX.', '..X..', '.....', '..X..'];
function drawFactCoins(ctx) {
  [10, 6, 2, 6].forEach((w, i) => {
    const x = i * 16 + 8 - w / 2;
    fill(ctx, '#0f0f1b', x - 1, 1, w + 2, 14);
    fill(ctx, '#f8d878', x, 2, w, 12);
    if (w > 4) fill(ctx, '#fcfcfc', x + 1, 3, 1, 3); // glint
    if (w === 10) QMARK.forEach((row, ry) => [...row].forEach((ch, rx) => ch === 'X' && fill(ctx, '#ac4040', x + 2 + rx, 4 + ry, 1, 1)));
  });
}
function drawPlant(ctx) {
  fill(ctx, '#0f0f1b', 4, 9, 8, 7);
  fill(ctx, '#ac7c00', 5, 10, 6, 5);
  fill(ctx, '#0f0f1b', 3, 1, 10, 9);
  fill(ctx, '#00a800', 4, 2, 8, 7);
  fill(ctx, '#58d854', 5, 3, 2, 3);
  fill(ctx, '#005800', 9, 5, 2, 3);
}
function drawCounter(ctx) {
  fill(ctx, '#0f0f1b', 0, 0, 16, 16);
  fill(ctx, '#fca044', 0, 1, 16, 3);
  fill(ctx, '#ac7c00', 0, 4, 16, 12);
  fill(ctx, '#8c5c00', 2, 6, 12, 8);
}

// --- World 2 (campus) props
function drawBug(ctx) {
  [0, 1].forEach((f) => {
    const o = f * 16;
    // legs alternate between frames
    [3, 6, 9, 12].forEach((x, i) => fill(ctx, '#0f0f1b', o + x, 13 + ((i + f) % 2), 1, 2));
    fill(ctx, '#0f0f1b', o + 2, 4, 12, 10);
    fill(ctx, '#f83800', o + 3, 5, 10, 8);
    fill(ctx, '#ac2800', o + 3, 10, 10, 3);
    fill(ctx, '#fcfcfc', o + 4, 6, 3, 3);
    fill(ctx, '#fcfcfc', o + 9, 6, 3, 3);
    fill(ctx, '#0f0f1b', o + 6, 7, 1, 2);
    fill(ctx, '#0f0f1b', o + 11, 7, 1, 2);
    fill(ctx, '#0f0f1b', o + 5, 3, 1, 1); // antennae
    fill(ctx, '#0f0f1b', o + 10, 3, 1, 1);
  });
}
function drawSwatches(ctx) {
  ['#f83800', '#f8d878', '#0058f8'].forEach((c, i) => {
    const o = i * 16;
    fill(ctx, '#0f0f1b', o + 2, 2, 12, 12);
    fill(ctx, c, o + 3, 3, 10, 10);
    fill(ctx, '#fcfcfc', o + 4, 4, 3, 1);
    fill(ctx, '#fcfcfc', o + 4, 5, 1, 2);
  });
}
function drawBulb(ctx) {
  fill(ctx, '#0f0f1b', 4, 1, 8, 9);
  fill(ctx, '#f8d878', 5, 2, 6, 7);
  fill(ctx, '#fcfcfc', 6, 3, 2, 2);
  fill(ctx, '#0f0f1b', 5, 10, 6, 5);
  fill(ctx, '#bcbcbc', 6, 10, 4, 3);
  fill(ctx, '#7c7c7c', 6, 13, 4, 1);
}
const DIGITS = [
  ['.X.', 'XX.', '.X.', '.X.', 'XXX'],
  ['XXX', '..X', 'XXX', 'X..', 'XXX'],
  ['XXX', '..X', 'XXX', '..X', 'XXX'],
  ['X.X', 'X.X', 'XXX', '..X', '..X'],
];
function drawNodes(ctx) {
  DIGITS.forEach((rows, i) => {
    const o = i * 16;
    fill(ctx, '#0f0f1b', o + 1, 1, 14, 14);
    fill(ctx, '#58b0f8', o + 2, 2, 12, 12);
    fill(ctx, '#0058f8', o + 2, 11, 12, 3);
    rows.forEach((row, ry) => [...row].forEach((ch, rx) => ch === 'X' && fill(ctx, '#fcfcfc', o + 5 + rx * 2, 3 + ry * 2, 2, 2)));
  });
}
function drawScroll(ctx) {
  fill(ctx, '#0f0f1b', 2, 3, 12, 11);
  fill(ctx, '#fcfcfc', 3, 4, 10, 9);
  fill(ctx, '#bcbcbc', 3, 12, 10, 1);
  fill(ctx, '#0f0f1b', 1, 2, 3, 13);
  fill(ctx, '#f8d878', 2, 3, 1, 11);
  fill(ctx, '#0f0f1b', 12, 2, 3, 13);
  fill(ctx, '#f8d878', 13, 3, 1, 11);
  fill(ctx, '#f83800', 7, 4, 2, 9); // ribbon
  fill(ctx, '#bcbcbc', 4, 6, 3, 1);
  fill(ctx, '#bcbcbc', 9, 6, 3, 1);
}
function drawBookshelf(ctx) {
  fill(ctx, '#0f0f1b', 0, 0, 16, 16);
  fill(ctx, '#8c5c00', 1, 1, 14, 14);
  fill(ctx, '#0f0f1b', 1, 7, 14, 1);
  ['#f83800', '#58b0f8', '#f8d878', '#58d854', '#6844fc'].forEach((c, i) => {
    fill(ctx, c, 2 + i * 3, 2 + (i % 2), 2, 5 - (i % 2));
    fill(ctx, c, 2 + i * 3, 9, 2, 5 - ((i + 1) % 2));
  });
}
function drawGate(ctx) {
  fill(ctx, '#0f0f1b', 0, 0, 16, 16);
  fill(ctx, '#f83800', 1, 0, 14, 16);
  for (let y = 0; y < 16; y += 4) fill(ctx, '#fcfcfc', 1, y, 14, 2);
  fill(ctx, '#0f0f1b', 0, 7, 16, 2);
}

// --- World 3 (office floors): bosses, client badge, elevator
const disc = (ctx, cx, cy, r, c) => {
  ctx.fillStyle = c;
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r) ctx.fillRect(cx + x, cy + y, 1, 1);
};
const eyes = (ctx, o, y, angry = true) => {
  fill(ctx, '#fcfcfc', o + 8, y, 5, 5);
  fill(ctx, '#fcfcfc', o + 19, y, 5, 5);
  fill(ctx, '#0f0f1b', o + 10, y + 2, 2, 3);
  fill(ctx, '#0f0f1b', o + 20, y + 2, 2, 3);
  if (angry) {
    fill(ctx, '#0f0f1b', o + 7, y - 2, 6, 1);
    fill(ctx, '#0f0f1b', o + 19, y - 2, 6, 1);
    fill(ctx, '#0f0f1b', o + 12, y - 1, 1, 1);
    fill(ctx, '#0f0f1b', o + 19, y - 1, 1, 1);
  }
};
function drawBosses(ctx, which) {
  [0, 1].forEach((f) => {
    const o = f * 32;
    const bob = f;
    if (which === 0) {
      // THE VAGUE BRIEF: grey cloud with question marks
      disc(ctx, o + 16, 17 + bob, 13, '#0f0f1b');
      disc(ctx, o + 16, 17 + bob, 12, '#bcbcbc');
      disc(ctx, o + 9, 12 + bob, 6, '#bcbcbc');
      disc(ctx, o + 23, 12 + bob, 6, '#bcbcbc');
      eyes(ctx, o, 11 + bob);
      QMARK.forEach((row, ry) => [...row].forEach((ch, rx) => ch === 'X' && fill(ctx, '#7c7c7c', o + 14 + rx, 18 + bob + ry - 1, 1, 1)));
      fill(ctx, '#0f0f1b', o + 10, 25 + bob, 12, 1);
    } else if (which === 1) {
      // THE DEADLINE CLOCK: angry red clock
      disc(ctx, o + 16, 17 + bob, 13, '#0f0f1b');
      disc(ctx, o + 16, 17 + bob, 12, '#f83800');
      disc(ctx, o + 16, 17 + bob, 9, '#fcfcfc');
      fill(ctx, '#0f0f1b', o + 16, 10 + bob, 1, 8);
      fill(ctx, '#0f0f1b', o + 16, 17 + bob, 6, 1);
      fill(ctx, '#f83800', o + 15, 17 + bob, 3, 3);
      fill(ctx, '#0f0f1b', o + 8, 6 + bob, 6, 2);
      fill(ctx, '#0f0f1b', o + 18, 6 + bob, 6, 2);
      fill(ctx, '#0f0f1b', o + 12, 22 + bob, 8, 1);
    } else if (which === 2) {
      // THE OFF-BRAND BEAST: mismatched colour blocks
      fill(ctx, '#0f0f1b', o + 3, 4 + bob, 26, 26);
      fill(ctx, '#f83800', o + 4, 5 + bob, 12, 12);
      fill(ctx, '#0058f8', o + 16, 5 + bob, 12, 12);
      fill(ctx, '#58d854', o + 4, 17 + bob, 12, 12);
      fill(ctx, '#f8d878', o + 16, 17 + bob, 12, 12);
      eyes(ctx, o, 10 + bob);
      fill(ctx, '#0f0f1b', o + 9, 22 + bob, 14, 2);
      [11, 14, 17, 20].forEach((x) => fill(ctx, '#fcfcfc', o + x, 22 + bob, 2, 2));
    } else {
      // THE 100-SLIDE DECK: tower of papers
      [0, 1, 2].forEach((i) => {
        fill(ctx, '#0f0f1b', o + 3 + i * 2, 4 + bob + i * 2, 24, 25 - i * 2);
        fill(ctx, i === 2 ? '#fcfcfc' : '#bcbcbc', o + 4 + i * 2, 5 + bob + i * 2, 22, 23 - i * 2);
      });
      eyes(ctx, o, 11 + bob);
      [[1, 'XXX'], [0, 'X.X']].forEach(() => {});
      ['.X.', 'XX.', '.X.', '.X.', 'XXX'].forEach((row, ry) => [...row].forEach((ch, rx) => ch === 'X' && fill(ctx, '#f83800', o + 8 + rx, 19 + bob + ry, 1, 1)));
      ['XXX', 'X.X', 'X.X', 'X.X', 'XXX'].forEach((row, ry) => {
        [0, 1].forEach((d) => [...row].forEach((ch, rx) => ch === 'X' && fill(ctx, '#f83800', o + 13 + d * 4 + rx, 19 + bob + ry, 1, 1)));
      });
    }
  });
}
function drawBadge(ctx) {
  fill(ctx, '#0f0f1b', 3, 0, 10, 16);
  fill(ctx, '#fcfcfc', 4, 4, 8, 11);
  fill(ctx, '#f83800', 4, 1, 8, 3);
  fill(ctx, '#0f0f1b', 7, 0, 2, 1);
  fill(ctx, '#bcbcbc', 5, 11, 6, 1);
  fill(ctx, '#bcbcbc', 5, 13, 4, 1);
  disc(ctx, 8, 7, 2, '#e0a070');
}
function drawElevator(ctx) {
  [0, 1].forEach((f) => {
    const o = f * 16;
    fill(ctx, '#0f0f1b', o, 0, 16, 32);
    fill(ctx, '#7c7c7c', o + 1, 1, 14, 30);
    fill(ctx, '#0f0f1b', o + 4, 3, 8, 4); // indicator
    fill(ctx, f ? '#7c7c7c' : '#58d854', o + 6, 4, 4, 2);
    if (f === 0) {
      fill(ctx, '#0f0f1b', o + 3, 9, 10, 22); // open: dark doorway with light
      fill(ctx, '#f8d878', o + 4, 10, 8, 20);
      fill(ctx, '#fcfcfc', o + 5, 12, 2, 16);
    } else {
      fill(ctx, '#bcbcbc', o + 2, 9, 6, 22);
      fill(ctx, '#bcbcbc', o + 8, 9, 6, 22);
      fill(ctx, '#0f0f1b', o + 8, 9, 1, 22);
    }
  });
}

// --- World 4 (arcade): cabinets
function drawCabinets(ctx) {
  ['#f83800', '#0058f8', '#00a800'].forEach((c, i) => {
    const o = i * 16;
    fill(ctx, '#0f0f1b', o, 2, 16, 30);
    fill(ctx, '#2c2c5c', o + 1, 3, 14, 29);
    fill(ctx, '#0f0f1b', o + 3, 5, 10, 9);
    fill(ctx, c, o + 4, 6, 8, 7);
    fill(ctx, '#fcfcfc', o + 5, 7, 2, 1);
    fill(ctx, '#fcfcfc', o + 8, 9, 3, 1);
    fill(ctx, '#0f0f1b', o + 2, 17, 12, 5);
    fill(ctx, '#7c7c7c', o + 3, 18, 10, 3);
    fill(ctx, '#f83800', o + 5, 15, 2, 2); // joystick ball
    fill(ctx, '#f8d878', o + 9, 19, 2, 2);
    fill(ctx, '#58d854', o + 12, 19, 1, 2);
    fill(ctx, c, o + 2, 3, 12, 1); // marquee glow
  });
}

// --- World 5/6 props: ? block, trophy, curtain, contact boards, flag
function drawQBlocks(ctx) {
  [0, 1].forEach((f) => {
    const o = f * 16;
    fill(ctx, '#0f0f1b', o, 0, 16, 16);
    fill(ctx, f ? '#8c5c00' : '#f8d878', o + 1, 1, 14, 14);
    fill(ctx, f ? '#6c4400' : '#fca044', o + 1, 12, 14, 3);
    fill(ctx, f ? '#6c4400' : '#fcfcfc', o + 2, 2, 2, 2);
    fill(ctx, f ? '#6c4400' : '#fcfcfc', o + 12, 2, 2, 2);
    if (!f) QMARK.forEach((row, ry) => [...row].forEach((ch, rx) => ch === 'X' && fill(ctx, '#ac4040', o + 5 + rx, 4 + ry, 1, 1)));
  });
}
function drawTrophy(ctx) {
  fill(ctx, '#0f0f1b', 4, 1, 8, 7);
  fill(ctx, '#f8d878', 5, 2, 6, 5);
  fill(ctx, '#fcfcfc', 6, 3, 1, 2);
  fill(ctx, '#0f0f1b', 2, 2, 2, 4);
  fill(ctx, '#0f0f1b', 12, 2, 2, 4);
  fill(ctx, '#0f0f1b', 7, 8, 2, 3);
  fill(ctx, '#f8d878', 7, 8, 2, 2);
  fill(ctx, '#0f0f1b', 4, 11, 8, 4);
  fill(ctx, '#ac7c00', 5, 12, 6, 2);
}
function drawCurtain(ctx) {
  fill(ctx, '#7c1010', 0, 0, 16, 16);
  [0, 4, 8, 12].forEach((x) => {
    fill(ctx, '#a02020', x + 1, 0, 2, 16);
    fill(ctx, '#500808', x, 0, 1, 16);
  });
  fill(ctx, '#f8d878', 0, 14, 16, 2);
}
function drawBoards(ctx) {
  const plate = (o, c) => {
    fill(ctx, '#0f0f1b', o + 7, 14, 2, 18); // post
    fill(ctx, '#8c5c00', o + 7, 15, 2, 17);
    fill(ctx, '#0f0f1b', o + 0, 2, 16, 13);
    fill(ctx, c, o + 1, 3, 14, 11);
  };
  plate(0, '#0a66c2');
  fill(ctx, '#fcfcfc', 3, 6, 2, 2); fill(ctx, '#fcfcfc', 3, 9, 2, 3);
  fill(ctx, '#fcfcfc', 7, 9, 2, 3); fill(ctx, '#fcfcfc', 7, 8, 5, 1); fill(ctx, '#fcfcfc', 11, 9, 2, 3);
  plate(16, '#f83800');
  fill(ctx, '#fcfcfc', 19, 6, 10, 7); fill(ctx, '#f83800', 20, 7, 8, 5);
  fill(ctx, '#fcfcfc', 20, 7, 2, 1); fill(ctx, '#fcfcfc', 22, 8, 2, 1); fill(ctx, '#fcfcfc', 24, 8, 2, 1); fill(ctx, '#fcfcfc', 26, 7, 2, 1);
  plate(32, '#00a800');
  fill(ctx, '#fcfcfc', 38, 5, 5, 9); fill(ctx, '#00a800', 39, 6, 3, 5); fill(ctx, '#0f0f1b', 40, 12, 1, 1);
  plate(48, '#bcbcbc');
  fill(ctx, '#fcfcfc', 53, 4, 8, 10); [6, 8, 10, 12].forEach((y) => fill(ctx, '#7c7c7c', 54, y, 6, 1));
  plate(64, '#f8d878');
  [[72, 5, 1, 2], [71, 7, 3, 1], [70, 8, 5, 2], [71, 10, 3, 1], [72, 11, 1, 1]].forEach(([x, y, w, h]) => fill(ctx, '#f83800', x, y, w, h));
}
function drawFlagpole(ctx) {
  fill(ctx, '#0f0f1b', 6, 0, 4, 64);
  fill(ctx, '#bcbcbc', 7, 4, 2, 60);
  fill(ctx, '#f8d878', 6, 0, 4, 4);
}
function drawHireFlag(ctx) {
  fill(ctx, '#0f0f1b', 0, 0, 22, 14);
  fill(ctx, '#f83800', 1, 1, 20, 12);
  fill(ctx, '#fcfcfc', 1, 5, 20, 4);
  // "HIRE" in tiny letters on the white band is too small; use a star instead
  fill(ctx, '#f83800', 9, 5, 4, 4);
}

// --- Parallax skyline (tiles horizontally) ---------------------------------
function drawSkyline(ctx, base, windowCol, seed, minH, maxH) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  let x = 0;
  while (x < 256) {
    const w = 24 + Math.floor(rnd() * 20);
    const bw = Math.min(w, 256 - x);
    const h = minH + Math.floor(rnd() * (maxH - minH));
    fill(ctx, base, x, 224 - h, bw, h);
    for (let wy = 224 - h + 6; wy < 224 - 8; wy += 10) {
      for (let wx = x + 4; wx < x + bw - 5; wx += 8) {
        if (rnd() > 0.35) fill(ctx, windowCol, wx, wy, 3, 5);
      }
    }
    x += bw + 2 + Math.floor(rnd() * 4);
  }
}

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload() {
    // Hero sprite sheet: made by tools/make-hero.mjs (replace with your own art any time)
    loadCharacterSheets(this);
    this.load.spritesheet('npcs', 'assets/npcs.png', { frameWidth: FW, frameHeight: FH });
  }

  create() {
    const t = this.textures;
    createHeroTexture(this);
    createPointerTexture(this);

    canvasTex(this, 'tile-ground', 16, 16, drawGround);
    canvasTex(this, 'tile-dirt', 16, 16, drawDirt);
    canvasTex(this, 'tile-desk', 16, 16, drawDesk);
    canvasTex(this, 'pipe-tl', 16, 16, (c) => drawPipeTop(c, false));
    canvasTex(this, 'pipe-tr', 16, 16, (c) => drawPipeTop(c, true));
    canvasTex(this, 'pipe-bl', 16, 16, (c) => drawPipeBody(c, false));
    canvasTex(this, 'pipe-br', 16, 16, (c) => drawPipeBody(c, true));

    const coin = canvasTex(this, 'coin', 64, 16, drawCoins);
    for (let i = 0; i < 4; i++) coin.add(i, 0, i * 16, 0, 16, 16);
    canvasTex(this, 'coffee', 16, 16, drawCoffee);
    canvasTex(this, 'flag-off', 16, 32, (c) => drawFlag(c, false));
    canvasTex(this, 'flag-on', 16, 32, (c) => drawFlag(c, true));
    canvasTex(this, 'door', 16, 32, drawDoor);
    const fact = canvasTex(this, 'fact', 64, 16, drawFactCoins);
    for (let i = 0; i < 4; i++) fact.add(i, 0, i * 16, 0, 16, 16);
    canvasTex(this, 'plant', 16, 16, drawPlant);
    const qb = canvasTex(this, 'qblock', 32, 16, drawQBlocks);
    [0, 1].forEach((i) => qb.add(i, 0, i * 16, 0, 16, 16));
    canvasTex(this, 'trophy', 16, 16, drawTrophy);
    canvasTex(this, 'curtain', 16, 16, drawCurtain);
    const bd = canvasTex(this, 'board', 80, 32, drawBoards);
    [0, 1, 2, 3, 4].forEach((i) => bd.add(i, 0, i * 16, 0, 16, 32));
    canvasTex(this, 'flagpole', 16, 64, drawFlagpole);
    canvasTex(this, 'hireflag', 22, 14, drawHireFlag);
    const cab = canvasTex(this, 'cabinet', 48, 32, drawCabinets);
    [0, 1, 2].forEach((i) => cab.add(i, 0, i * 16, 0, 16, 32));
    const bug = canvasTex(this, 'bug', 32, 16, drawBug);
    [0, 1].forEach((i) => bug.add(i, 0, i * 16, 0, 16, 16));
    const sw = canvasTex(this, 'swatch', 48, 16, drawSwatches);
    [0, 1, 2].forEach((i) => sw.add(i, 0, i * 16, 0, 16, 16));
    canvasTex(this, 'bulb', 16, 16, drawBulb);
    const nodes = canvasTex(this, 'nodes', 64, 16, drawNodes);
    [0, 1, 2, 3].forEach((i) => nodes.add(i, 0, i * 16, 0, 16, 16));
    canvasTex(this, 'scroll', 16, 16, drawScroll);
    canvasTex(this, 'badge', 16, 16, drawBadge);
    const lift = canvasTex(this, 'elevator', 32, 32, drawElevator);
    [0, 1].forEach((i) => lift.add(i, 0, i * 16, 0, 16, 32));
    [0, 1, 2, 3].forEach((n) => {
      const b = canvasTex(this, `boss${n}`, 64, 32, (c) => drawBosses(c, n));
      [0, 1].forEach((i) => b.add(i, 0, i * 32, 0, 32, 32));
      this.anims.create({ key: `boss${n}-idle`, frames: [0, 1].map((frame) => ({ key: `boss${n}`, frame })), frameRate: 4, repeat: -1 });
    });
    canvasTex(this, 'bookshelf', 16, 16, drawBookshelf);
    canvasTex(this, 'tile-gate', 16, 16, drawGate);
    canvasTex(this, 'counter', 16, 16, drawCounter);

    canvasTex(this, 'skyline-far', 256, 224, (c) => drawSkyline(c, '#6888fc', '#a4c4fc', 7, 70, 130));
    canvasTex(this, 'skyline-near', 256, 224, (c) => drawSkyline(c, '#3858c8', '#f8d878', 13, 40, 90));
    t.get('skyline-far'); // keep reference quiet for bundlers

    createCreatureTextures(this);
    createVignette(this, GAME_W * ZOOM, GAME_H * ZOOM);
    const a = this.anims;
    const seq = (key, tex, frames, fps, repeat = -1) =>
      a.create({ key, frames: frames.map((frame) => ({ key: tex, frame })), frameRate: fps, repeat });
    seq('turtle-walk', 'turtle', [0, 1], 5);
    seq('turtle-shell', 'turtle', [2], 1, 0);
    seq('turtle-spin', 'turtle', [3, 4], 14);
    seq('croc-walk', 'croc', [0, 1], 5);
    seq('croc-snap', 'croc', [2], 1, 0);
    seq('bat-fly', 'bat', [0, 1, 2, 1], 10);
    seq('diver-fly', 'diver', [0, 1], 7);
    seq('diver-dive', 'diver', [2], 1, 0);
    seq('spiker-walk', 'spiker', [0, 1], 5);
    seq('piranha-bite', 'piranha', [0, 1], 4);
    seq('flame-burn', 'flame', [0, 1, 2], 14);
    seq('fireball-spin', 'fireball', [0, 1], 12);
    seq('conv', 'tile-conveyor', [0, 1], 6);
    seq('dragon-idle', 'dragon', [0, 1], 2);
    seq('dragon-windup', 'dragon', [2], 1, 0);
    seq('dragon-breath', 'dragon', [3], 1, 0);
    seq('dragon-hurt', 'dragon', [4], 1, 0);
    NPC_ORDER.forEach((id) =>
      Object.entries(NPC_ANIMS(id)).forEach(([key, def]) =>
        a.create({ key, frames: def.frames.map((frame) => ({ key: 'npcs', frame })), frameRate: def.fps, repeat: def.repeat })
      )
    );
    a.create({ key: 'bug-walk', frames: [0, 1].map((frame) => ({ key: 'bug', frame })), frameRate: 6, repeat: -1 });
    a.create({ key: 'fact-spin', frames: [0, 1, 2, 3].map((frame) => ({ key: 'fact', frame })), frameRate: 6, repeat: -1 });
    Object.entries(HERO_ANIMS).forEach(([key, def]) => {
      a.create({
        key,
        frames: def.frames.map((n) => ({ key: 'hero', frame: frameIndex(n) })),
        frameRate: def.fps,
        repeat: def.repeat,
      });
    });
    // per-character idle/walk/wave for the picker (the in-game hero uses the 'hero' texture)
    CHARACTERS.forEach((c) =>
      ['idle', 'walk', 'wave'].forEach((k) =>
        a.create({
          key: `${k}-${c.id}`,
          frames: HERO_ANIMS[k].frames.map((n) => ({ key: `char-${c.id}`, frame: frameIndex(n) })),
          frameRate: HERO_ANIMS[k].fps,
          repeat: HERO_ANIMS[k].repeat,
        })
      )
    );
    a.create({
      key: 'coin-spin',
      frames: [0, 1, 2, 3].map((frame) => ({ key: 'coin', frame })),
      frameRate: 8,
      repeat: -1,
    });

    const params = new URLSearchParams(location.search);
    if (params.has('reset')) resetSave();

    // restore saved progress into the shared registry
    const reg = this.registry;
    reg.set('coins', save.coins);
    reg.set('xp', save.xp);
    reg.set('level', save.level);
    reg.set('coffee', 0);
    reg.set('coffeeMs', 0);
    reg.set('collected', new Set(save.collected));
    reg.events.on('changedata', (_, key) => {
      if (!['coins', 'xp', 'level'].includes(key)) return;
      save.coins = reg.get('coins');
      save.xp = reg.get('xp');
      save.level = reg.get('level');
      save.collected = [...reg.get('collected')];
      persist();
    });

    // ?scene=Game jumps straight into gameplay (handy while developing)
    const only = params.get('scene');
    if (only === 'Game') this.scene.start('Game', { room: params.get('room') || 'world1' });
    else this.scene.start(only || 'Title');

  }
}
