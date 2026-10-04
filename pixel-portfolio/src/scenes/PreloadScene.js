// Generates every placeholder texture in code, so the project needs no art
// files yet. Day 2 swaps 'hero' for the real sprite sheet; the rest can be
// replaced one by one without changing game code (same texture keys).
import Phaser from 'phaser';

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

// --- Hero (16x32 x 4 frames: idle, walk A, walk B, jump) ------------------
const HAIR = '#2a1a0e';
const SKIN = '#e0a070';
const SHIRT = '#0058f8';
const PANTS = '#2c2c5c';
const SHOE = '#ac7c00';

function heroRects(pose) {
  const r = [];
  const add = (x, y, w, h, c) => r.push([x, y, w, h, c]);
  // head
  add(4, 2, 8, 9, SKIN);
  add(4, 2, 8, 3, HAIR);
  add(3, 3, 2, 6, HAIR);
  add(9, 6, 1, 2, '#0f0f1b'); // eye
  add(9, 9, 2, 1, '#ac4040'); // smile
  add(7, 11, 3, 1, SKIN); // neck
  // torso + lanyard + badge
  add(4, 12, 8, 9, SHIRT);
  add(7, 12, 1, 6, '#f8d878');
  add(6, 18, 3, 3, '#fcfcfc');
  // arms, legs by pose
  if (pose === 3) {
    add(3, 9, 2, 5, SHIRT);
    add(11, 9, 2, 5, SHIRT);
    add(3, 8, 2, 2, SKIN);
    add(11, 8, 2, 2, SKIN);
    add(3, 21, 4, 6, PANTS);
    add(9, 21, 4, 5, PANTS);
    add(2, 26, 5, 2, SHOE);
    add(9, 25, 5, 2, SHOE);
  } else {
    const swing = pose === 1 ? 1 : pose === 2 ? -1 : 0;
    add(3 - swing, 13, 2, 7, SHIRT);
    add(11 + swing, 13, 2, 7, SHIRT);
    add(3 - swing, 20, 2, 2, SKIN);
    add(11 + swing, 20, 2, 2, SKIN);
    const lx = 5 - swing;
    const rx = 9 + swing;
    add(lx, 21, 3, 8, PANTS);
    add(rx, 21, 3, 8, PANTS);
    add(lx - 1, 29, 4, 2, SHOE);
    add(rx, 29, 4, 2, SHOE);
  }
  return r;
}

function drawHero(ctx) {
  for (let f = 0; f < 4; f++) {
    const rects = heroRects(f);
    ctx.fillStyle = '#0f0f1b';
    for (const [x, y, w, h] of rects) ctx.fillRect(f * 16 + x - 1, y - 1, w + 2, h + 2);
    for (const [x, y, w, h, c] of rects) fill(ctx, c, f * 16 + x, y, w, h);
  }
}

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

  create() {
    const t = this.textures;
    const hero = canvasTex(this, 'hero', 64, 32, drawHero);
    for (let i = 0; i < 4; i++) hero.add(i, 0, i * 16, 0, 16, 32);

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

    canvasTex(this, 'skyline-far', 256, 224, (c) => drawSkyline(c, '#6888fc', '#a4c4fc', 7, 70, 130));
    canvasTex(this, 'skyline-near', 256, 224, (c) => drawSkyline(c, '#3858c8', '#f8d878', 13, 40, 90));
    t.get('skyline-far'); // keep reference quiet for bundlers

    const a = this.anims;
    a.create({ key: 'idle', frames: [{ key: 'hero', frame: 0 }], frameRate: 1 });
    a.create({
      key: 'walk',
      frames: [1, 0, 2, 0].map((frame) => ({ key: 'hero', frame })),
      frameRate: 8,
      repeat: -1,
    });
    a.create({
      key: 'run',
      frames: [1, 0, 2, 0].map((frame) => ({ key: 'hero', frame })),
      frameRate: 14,
      repeat: -1,
    });
    a.create({ key: 'jump', frames: [{ key: 'hero', frame: 3 }], frameRate: 1 });
    a.create({
      key: 'coin-spin',
      frames: [0, 1, 2, 3].map((frame) => ({ key: 'coin', frame })),
      frameRate: 8,
      repeat: -1,
    });

    const reg = this.registry;
    reg.set('coins', 0);
    reg.set('xp', 0);
    reg.set('level', 0);
    reg.set('coffee', 0);
    reg.set('coffeeMs', 0);

    this.scene.start('Game', { room: 'main' });
  }
}
