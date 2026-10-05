// Draws every playable hero's sprite sheet -> public/assets/chars/<id>.png (+ hero.png = Apoorv)
// Run:  node tools/make-hero.mjs        (no dependencies)
// Optional: node tools/make-hero.mjs --preview <out.png>  (8x contact sheet)
import fs from 'node:fs';
import { hex, Frame, limb, part, png } from './lib/raster.mjs';
import { FW, FH, COLS, HERO_FRAMES } from '../src/heroFrames.js';
import { CHARACTERS } from '../src/data/characters.js';

// --- palette ---------------------------------------------------------------
const C = {
  K: hex('#0f0f1b'), // outline
  E: hex('#0f0f1b'), // eye
  H: hex('#1b1512'), h: hex('#3b2c24'), // hair
  S: hex('#e8b890'), s: hex('#c98f68'), // skin (light)
  B: hex('#2b1e18'), b: hex('#4a362b'), // beard
  M: hex('#8c3b32'), W: hex('#fcfcfc'), // mouth, teeth
  blazer: hex('#2a2a48'), blazerHi: hex('#4a4a72'),
  shirt: hex('#fcfcfc'), shirtShade: hex('#bcbcbc'),
  red: hex('#e4002b'), // WSP red
  pants: hex('#3a3a58'),
  shoe: hex('#1f1f2e'), shoeHi: hex('#6c6c8c'),
  watch: hex('#bcbcbc'),
  cup: hex('#fcfcfc'), lid: hex('#ac7c00'), cupBand: hex('#ac4040'),
  gray: hex('#bcbcbc'), grayDark: hex('#7c7c7c'),
};

let LOOK = CHARACTERS[0].look;
// re-colour the shared palette for one character
function setLook(look) {
  LOOK = look;
  C.S = hex(look.skin);
  C.s = hex(look.skinS);
  C.H = hex(look.hair);
  C.h = hex(look.hairHi);
  C.M = hex(look.lips);
  C.blazer = hex(look.blazer);
  C.blazerHi = hex(look.blazerHi);
  C.red = hex(look.lanyard);
  C.pants = hex(look.pants);
}

// 14x14 head, facing right. See legend in C.
const HEAD = [
  '...KKKKKKKK...',
  '..KHHHhHHHHK..',
  '.KHHhHHHHHHHHK',
  'KHHHHHHHHHHHHK',
  'KHHHHHHHHHSSSK',
  'KHHHHHSSSHHHSK',
  'KHHHHSSSSSESSK',
  'KHHHSsSSSSESSK',
  'KBSSSSSSSSSsSK',
  'KBBBSSSSBBBBBK',
  'KBBBBBBBMWMBBK',
  'KBBBBBBBBBbBBK',
  '.KBBBBBBBBBBK.',
  '..KKKKKKKKKK..',
];
function headRows(kind) {
  const r = HEAD.slice();
  const set = (row, col, ch) => (r[row] = r[row].slice(0, col) + ch + r[row].slice(col + 1));
  if (kind === 'blink') {
    set(6, 10, 'S');
    set(7, 10, 'K');
  } else if (kind === 'hurt') {
    set(6, 10, 'K');
    set(7, 10, 'S');
    set(6, 9, 'K');
    r[10] = 'KBBBBBBBMMMBBK';
    r[10] = r[10].slice(0, 14);
  } else if (kind === 'open') {
    r[10] = 'KBBBBBBMMMMBBK';
    set(10, 8, 'W');
  }
  // no beard: the beard rows become plain face
  if (!LOOK.beard) for (let i = 8; i <= 12; i++) r[i] = r[i].replace(/[Bb]/g, 'S');
  // longer hair framing the face (bob / long)
  if (LOOK.hairStyle === 'bob' || LOOK.hairStyle === 'long') {
    for (const i of [7, 8, 9]) r[i] = r[i].slice(0, 1) + 'HHH' + r[i].slice(4);
    r[4] = 'KHHHHHHHHHHHSK';
  }
  return r;
}

function drawHead(f, x, y, kind) {
  headRows(kind).forEach((row, j) =>
    [...row].forEach((ch, i) => {
      if (ch !== '.') f.set(x + i, y + j, C[ch]);
    })
  );
}

// --- body composer -----------------------------------------------------------
function arm(f, shoulder, [dx, dy], withWatch) {
  const [sx, sy] = shoulder;
  const ex = sx + dx;
  const ey = sy + dy;
  part(f, limb(sx, sy, ex, ey, 3), C.blazer);
  const len = Math.hypot(dx, dy) || 1;
  const hx = Math.round(ex + 0.5 + (dx / len) * 2);
  const hy = Math.round(ey + 0.5 + (dy / len) * 2);
  if (withWatch) f.rect(ex, ey + (dy > 0 ? 2 : dy < 0 ? 0 : 1), 3, 1, C.watch);
  part(f, [[hx, hy, 2, 2]], C.S);
  return [hx, hy];
}
function leg(f, x, hip, { dx = 0, lift = 0 } = {}) {
  const footTop = 30 - lift;
  const endY = Math.max(hip, footTop - 3);
  part(f, limb(x, hip, x + dx, endY, 4), C.pants);
  part(f, [[x + dx, footTop, 6, 2]], C.shoe);
  f.set(x + dx + 5, footTop, C.shoeHi);
}

function compose(o = {}) {
  const f = new Frame(FW, FH);
  const lean = o.lean || 0;
  const hd = o.headDy || 0;
  const hip = o.hip ?? 23;
  const ty = 14 + hd;
  const th = hip - ty;

  const back = arm(f, [8 + lean, ty + 1], o.backArm || [-1, 6], false);
  void back;
  if (!o.seated) leg(f, 8 + lean * 0, hip, o.backLeg);

  if (LOOK.hairStyle === 'long') part(f, [[5 + lean, hd + 7, 5, 13]], C.H);
  if (LOOK.hairStyle === 'curly') part(f, [[4 + lean, hd + 3, 5, 9]], C.H);
  // torso: blazer + shirt + lapel + lanyard + badge
  part(f, [[7 + lean, ty, 10, th]], C.blazer);
  f.rect(13 + lean, ty, 4, Math.min(7, th), C.shirt);
  f.rect(13 + lean, ty + 5, 4, 1, C.shirtShade);
  f.rect(12 + lean, ty, 1, Math.min(8, th), C.blazerHi);
  f.rect(14 + lean, ty, 2, Math.min(8, th), C.red);
  if (th > 3) f.set(14 + lean, ty + 2, C.W);
  if (th > 5) f.set(14 + lean, ty + 4, C.W);
  if (th >= 8) {
    f.rect(13 + lean, ty + 6, 4, 3, C.W);
    f.rect(13 + lean, ty + 6, 4, 1, C.red);
    f.set(14 + lean, ty + 8, C.grayDark);
  }

  // skirt + a lock of hair over the shoulder for the female looks
  if (LOOK.skirt && !o.seated) part(f, [[6 + lean, hip - 2, 11, 5]], C.blazer);
  if (LOOK.female && (LOOK.hairStyle === 'long' || LOOK.hairStyle === 'curly')) part(f, [[7 + lean, hd + 9, 3, 9]], C.H);

  if (o.seated) {
    part(f, limb(9, hip, 17, hip, 4), C.pants); // thigh
    part(f, limb(17, hip + 1, 17, 27, 4), C.pants); // shin
    part(f, [[17, 30, 6, 2]], C.shoe);
  } else {
    leg(f, 11 + lean * 0, hip, o.frontLeg);
  }

  if (o.preHead) o.preHead(f, ty);
  const hand = arm(f, [11 + lean, ty + 1], o.frontArm || [1, 6], true);
  if (o.extra) o.extra(f, hand, ty);
  drawHead(f, 5 + lean, hd, o.face || 'smile');
  const hx = 5 + lean;
  if (LOOK.hairStyle === 'bun') part(f, [[hx - 1, hd + 1, 4, 4]], C.H);
  if (LOOK.hairStyle === 'curly') {
    part(f, [[hx + 1, hd - 1 < 0 ? 0 : hd, 3, 3], [hx + 5, hd, 4, 2], [hx + 9, hd, 3, 2]], C.H);
    f.rect(hx + 2, hd, 2, 1, C.h);
  }
  if (LOOK.female) f.rect(hx + 11, hd + 5, 2, 1, C.K); // lashes
  if (LOOK.glasses) {
    [[hx + 8, hd + 5, 5, 1], [hx + 8, hd + 8, 5, 1], [hx + 8, hd + 5, 1, 4], [hx + 12, hd + 5, 1, 4]].forEach(([a, b, w, h]) => f.rect(a, b, w, h, C.K));
    f.rect(hx + 9, hd + 6, 1, 1, hex('#bcd8fc'));
  }
  if (o.postHead) o.postHead(f, hand, ty);
  return f;
}

// --- pose library ------------------------------------------------------------
function walkFrame(i, amp, run) {
  const s = Math.sin((i / 6) * Math.PI * 2);
  const c = Math.cos((i / 6) * Math.PI * 2);
  const sw = Math.round(amp * s);
  const aSw = Math.round(amp * 0.8 * s);
  return compose({
    lean: run ? 1 : 0,
    headDy: i % 3 === 0 ? 1 : 0,
    backLeg: { dx: -sw, lift: c < -0.2 ? 1 : 0 },
    frontLeg: { dx: sw, lift: c > 0.2 ? 1 : 0 },
    backArm: [aSw - 1, run ? 5 : 6],
    frontArm: [-aSw + 1, run ? 5 : 6],
  });
}

const cup = (f, x, y, tilt) => {
  part(f, [[x, y, 4, 5]], C.cup);
  f.rect(x, y + 2, 4, 1, C.cupBand);
  f.rect(x - (tilt ? 0 : 0), y, 4, 1, C.lid);
};

function pose(name) {
  switch (name) {
    case 'idle':
      return compose();
    case 'blink':
      return compose({ face: 'blink' });
    case 'jump':
      return compose({ frontArm: [5, -5], backArm: [-3, 5], frontLeg: { dx: 3, lift: 3 }, backLeg: { dx: -3, lift: 1 } });
    case 'fall':
      return compose({ frontArm: [4, -4], backArm: [-4, -3], frontLeg: { dx: 2, lift: 0 }, backLeg: { dx: -2, lift: 1 } });
    case 'longjump':
      return compose({ lean: 2, headDy: 1, hip: 24, frontArm: [8, -1], backArm: [-6, -2], frontLeg: { dx: 5, lift: 1 }, backLeg: { dx: -5, lift: 2 } });
    case 'land':
      return compose({ headDy: 3, hip: 26, frontArm: [3, 4], backArm: [-3, 4], frontLeg: { dx: 2 }, backLeg: { dx: -2 } });
    case 'crouch':
      return compose({ headDy: 6, hip: 27, frontArm: [3, 3], backArm: [-2, 3], frontLeg: { dx: 1 }, backLeg: { dx: -1 } });
    case 'sip0':
      return compose({ frontArm: [5, -1], extra: (f, h) => cup(f, h[0] + 1, h[1] - 3) });
    case 'sip1':
      return compose({
        frontArm: [4, -3],
        postHead: (f, h) => {
          // cup raised to the mouth, drawn over the beard edge
          cup(f, h[0] + 1, h[1] - 3);
        },
      });
    case 'celebrate0':
      return compose({ face: 'open', frontArm: [3, -9], backArm: [-4, -8], frontLeg: { dx: 1 }, backLeg: { dx: -1 } });
    case 'celebrate1':
      return compose({ face: 'open', headDy: -1, frontArm: [4, -9], backArm: [-5, -8], frontLeg: { dx: 1, lift: 2 }, backLeg: { dx: -1, lift: 2 } });
    case 'hurt':
      return compose({ face: 'hurt', lean: -1, frontArm: [5, -6], backArm: [-5, -5], frontLeg: { dx: 3, lift: 1 }, backLeg: { dx: -3 } });
    case 'wave0':
      return compose({ frontArm: [2, -9], backArm: [-1, 6] });
    case 'wave1':
      return compose({ frontArm: [5, -8], backArm: [-1, 6] });
    case 'type0':
    case 'type1': {
      const up = name === 'type0' ? 0 : 1;
      return compose({
        seated: true,
        headDy: 2,
        hip: 24,
        frontArm: [8, 2 - up],
        backArm: [7, 3 + up],
        preHead: (f) => {
          part(f, [[16, 21, 8, 2]], C.gray); // laptop base
          part(f, [[22, 11, 2, 10]], C.grayDark); // screen (side view)
        },
      });
    }
    default:
      if (name.startsWith('walk')) return walkFrame(+name.slice(4), 3, false);
      if (name.startsWith('run')) return walkFrame(+name.slice(3), 4, true);
      throw new Error(`no pose: ${name}`);
  }
}

// --- sheet + PNG ---------------------------------------------------------------
function buildSheet() {
  const rows = Math.ceil(HERO_FRAMES.length / COLS);
  const W = COLS * FW;
  const H = rows * FH;
  const rgba = new Uint8Array(W * H * 4);
  HERO_FRAMES.forEach((name, idx) => {
    const fr = pose(name);
    const ox = (idx % COLS) * FW;
    const oy = Math.floor(idx / COLS) * FH;
    fr.p.forEach((c, k) => {
      if (!c) return;
      const x = ox + (k % FW);
      const y = oy + Math.floor(k / FW);
      const o = (y * W + x) * 4;
      rgba[o] = c[0];
      rgba[o + 1] = c[1];
      rgba[o + 2] = c[2];
      rgba[o + 3] = 255;
    });
  });
  return { W, H, rgba };
}

const dir = new URL('../public/assets/chars/', import.meta.url);
fs.mkdirSync(dir, { recursive: true });
let W = 0;
let H = 0;
const sheets = {};
for (const ch of CHARACTERS) {
  setLook(ch.look);
  const sheet = buildSheet();
  ({ W, H } = sheet);
  sheets[ch.id] = sheet.rgba;
  fs.writeFileSync(new URL(`${ch.id}.png`, dir), png(W, H, sheet.rgba));
  if (ch.id === 'apoorv') fs.writeFileSync(new URL('../hero.png', dir), png(W, H, sheet.rgba));
}
console.log(`wrote ${CHARACTERS.length} character sheets (${W}x${H}, ${HERO_FRAMES.length} frames each)`);

// --preview <file>: contact sheet of every character (idle + walk + jump + wave frames), 6x
const pi = process.argv.indexOf('--preview');
if (pi > -1) {
  const S = 6;
  const pick = [0, 3, 14, 24]; // idle, walk, jump, wave
  const PW = pick.length * FW * S;
  const PH = CHARACTERS.length * FH * S;
  const out = new Uint8Array(PW * PH * 4);
  CHARACTERS.forEach((ch, row) =>
    pick.forEach((fi, col) => {
      for (let y = 0; y < FH * S; y++)
        for (let x = 0; x < FW * S; x++) {
          const sx = (fi % COLS) * FW + Math.floor(x / S);
          const sy = Math.floor(fi / COLS) * FH + Math.floor(y / S);
          const o = (sy * W + sx) * 4;
          const d = ((row * FH * S + y) * PW + col * FW * S + x) * 4;
          const a = sheets[ch.id][o + 3];
          const c = a ? [sheets[ch.id][o], sheets[ch.id][o + 1], sheets[ch.id][o + 2]] : [88, 176, 248];
          out[d] = c[0];
          out[d + 1] = c[1];
          out[d + 2] = c[2];
          out[d + 3] = 255;
        }
    })
  );
  fs.writeFileSync(process.argv[pi + 1], png(PW, PH, out));
}
