// Generates every placeholder texture in code, so the project needs no art
// files yet. Day 2 swaps 'hero' for the real sprite sheet; the rest can be
// replaced one by one without changing game code (same texture keys).
import Phaser from 'phaser';
import { FW, FH, HERO_ANIMS, frameIndex } from '../heroFrames.js';
import { save, persist, resetSave } from '../systems/save.js';
import { NPC_ORDER, NPC_ANIMS } from '../npcFrames.js';

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
    this.load.spritesheet('hero', 'assets/hero.png', { frameWidth: FW, frameHeight: FH });
    this.load.spritesheet('npcs', 'assets/npcs.png', { frameWidth: FW, frameHeight: FH });
  }

  create() {
    const t = this.textures;

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
    const bug = canvasTex(this, 'bug', 32, 16, drawBug);
    [0, 1].forEach((i) => bug.add(i, 0, i * 16, 0, 16, 16));
    const sw = canvasTex(this, 'swatch', 48, 16, drawSwatches);
    [0, 1, 2].forEach((i) => sw.add(i, 0, i * 16, 0, 16, 16));
    canvasTex(this, 'bulb', 16, 16, drawBulb);
    const nodes = canvasTex(this, 'nodes', 64, 16, drawNodes);
    [0, 1, 2, 3].forEach((i) => nodes.add(i, 0, i * 16, 0, 16, 16));
    canvasTex(this, 'scroll', 16, 16, drawScroll);
    canvasTex(this, 'bookshelf', 16, 16, drawBookshelf);
    canvasTex(this, 'tile-gate', 16, 16, drawGate);
    canvasTex(this, 'counter', 16, 16, drawCounter);

    canvasTex(this, 'skyline-far', 256, 224, (c) => drawSkyline(c, '#6888fc', '#a4c4fc', 7, 70, 130));
    canvasTex(this, 'skyline-near', 256, 224, (c) => drawSkyline(c, '#3858c8', '#f8d878', 13, 40, 90));
    t.get('skyline-far'); // keep reference quiet for bundlers

    const a = this.anims;
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
