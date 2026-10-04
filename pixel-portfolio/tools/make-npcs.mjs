// Draws the NPC sprite sheet -> public/assets/npcs.png
// Run: node tools/make-npcs.mjs   (or: npm run npcs)
// Layout: 4 frames per row (idle0, idle1, talk, wave), one row per character.
import fs from 'node:fs';
import { hex, Frame, limb, part, png } from './lib/raster.mjs';
import { NPC_ORDER } from '../src/npcFrames.js';

const FW = 24;
const FH = 32;
const K = hex('#0f0f1b');

const LOOKS = {
  rita: { skin: '#c98f68', skinS: '#a87048', hair: '#14100e', long: true, top: '#00a8a8', topHi: '#58d8d8', bottom: '#2a2a48', shoe: '#3a2a2a', headset: true },
  raju: { skin: '#b07a52', skinS: '#8c5c3c', hair: '#14100e', long: false, top: '#e8e8e8', topHi: '#fcfcfc', bottom: '#3a3a58', shoe: '#2a2a2a', vest: '#7c7c7c', tray: true },
  meera: { skin: '#e0a070', skinS: '#c98f68', hair: '#4a2a18', long: false, bun: true, top: '#2c3a7c', topHi: '#4a5aac', bottom: '#2c3a7c', shoe: '#14141f', glasses: true, clip: true },
};

// 12x12 head, facing right
const HEAD = [
  '..KKKKKKKK..',
  '.KHHHHHHHHK.',
  'KHHHHHHHHHHK',
  'KHHHHHSSSSSK',
  'KHHHHSSSSSSK',
  'KHHHSSSSESSK',
  'KHHSSSSSESSK',
  'KHHSSSSSSSsK',
  '.KSSSSSSMMSK',
  '.KSSSSSSSSK.',
  '..KKSSSSKK..',
  '....KKKK....',
];

function drawHead(f, x, y, look, mood) {
  const c = {
    K,
    H: hex(look.hair),
    S: hex(look.skin),
    s: hex(look.skinS),
    E: K,
    M: hex('#8c3b32'),
  };
  const rows = HEAD.slice();
  const set = (r, col, ch) => (rows[r] = rows[r].slice(0, col) + ch + rows[r].slice(col + 1));
  if (mood === 'blink') {
    set(5, 9, 'S');
    set(6, 9, 'K');
  }
  if (mood === 'talk') rows[8] = '.KSSSSSMMMSK';
  if (look.long) for (let r = 7; r < 12; r++) for (let col = 1; col <= 3; col++) set(r, col, col === 1 ? 'K' : 'H');
  rows.forEach((row, j) =>
    [...row].forEach((ch, i) => {
      if (ch !== '.') f.set(x + i, y + j, c[ch]);
    })
  );
  if (look.bun) {
    part(f, [[x - 1, y + 1, 4, 4]], hex(look.hair));
  }
  if (look.glasses) {
    f.rect(x + 7, y + 5, 4, 2, hex('#0f0f1b'));
    f.rect(x + 8, y + 5, 2, 1, hex('#bcd8fc'));
  }
  if (look.headset) {
    f.rect(x + 2, y + 1, 7, 1, hex('#14141f'));
    part(f, [[x + 3, y + 6, 3, 3]], hex('#14141f'));
    f.rect(x + 8, y + 9, 3, 1, hex('#14141f')); // mic
  }
}

function npcFrame(look, pose) {
  const f = new Frame(FW, FH);
  const bob = pose === 'idle1' ? 1 : 0;
  const hy = 2 + bob;
  const ty = 14 + bob;
  const top = hex(look.top);
  const sk = hex(look.skin);

  // back arm, legs
  part(f, limb(8, ty + 1, 7, ty + 7, 3), top);
  part(f, limb(9, 24, 9, 28, 4), hex(look.bottom));
  part(f, [[9, 30, 6, 2]], hex(look.shoe));
  part(f, limb(12, 24, 12, 28, 4), hex(look.bottom));
  part(f, [[12, 30, 6, 2]], hex(look.shoe));
  // torso
  part(f, [[8, ty, 9, 10]], top);
  f.rect(15, ty, 2, 8, hex(look.topHi));
  if (look.vest) part(f, [[8, ty + 1, 7, 9]], hex(look.vest));
  // front arm per pose
  let hand;
  if (pose === 'wave') {
    part(f, limb(12, ty + 1, 14, ty - 8, 3), top);
    hand = [14, ty - 10];
  } else if (pose === 'talk') {
    part(f, limb(12, ty + 1, 17, ty + 4, 3), top);
    hand = [18, ty + 4];
  } else {
    part(f, limb(12, ty + 1, 13, ty + 7, 3), top);
    hand = [13, ty + 9];
  }
  part(f, [[hand[0], hand[1], 2, 2]], sk);
  if (look.tray) {
    // tray with two cups held out in front
    part(f, [[16, ty + 5 + (pose === 'talk' ? 1 : 0), 8, 2]], hex('#bcbcbc'));
    const cy = ty + 1 + (pose === 'talk' ? 1 : 0);
    part(f, [[17, cy, 3, 4]], hex('#fcfcfc'));
    part(f, [[21, cy, 3, 4]], hex('#fcfcfc'));
    f.rect(18, cy + 1, 1, 1, hex('#ac7c00'));
    f.rect(22, cy + 1, 1, 1, hex('#ac7c00'));
  }
  if (look.clip) part(f, [[17, ty + 3, 5, 7]], hex('#ac7c00'));
  if (look.clip) f.rect(18, ty + 5, 3, 1, hex('#fcfcfc'));
  drawHead(f, 6, hy, look, pose === 'talk' ? 'talk' : pose === 'idle1' ? 'blink' : '');
  return f;
}

const POSES = ['idle0', 'idle1', 'talk', 'wave'];
const W = POSES.length * FW;
const H = NPC_ORDER.length * FH;
const rgba = new Uint8Array(W * H * 4);
NPC_ORDER.forEach((id, row) =>
  POSES.forEach((pose, col) => {
    const fr = npcFrame(LOOKS[id], pose === 'idle0' ? 'idle0' : pose);
    fr.p.forEach((c, k) => {
      if (!c) return;
      const x = col * FW + (k % FW);
      const y = row * FH + Math.floor(k / FW);
      const o = (y * W + x) * 4;
      rgba.set([c[0], c[1], c[2], 255], o);
    });
  })
);
fs.mkdirSync(new URL('../public/assets/', import.meta.url), { recursive: true });
fs.writeFileSync(new URL('../public/assets/npcs.png', import.meta.url), png(W, H, rgba));
console.log(`wrote public/assets/npcs.png (${W}x${H}, ${NPC_ORDER.length} characters)`);

if (process.argv.includes('--preview')) {
  const S = 6;
  const out = new Uint8Array(W * S * H * S * 4);
  for (let y = 0; y < H * S; y++)
    for (let x = 0; x < W * S; x++) {
      const o = (Math.floor(y / S) * W + Math.floor(x / S)) * 4;
      const col = rgba[o + 3] ? [rgba[o], rgba[o + 1], rgba[o + 2]] : [88, 176, 248];
      out.set([col[0], col[1], col[2], 255], (y * W * S + x) * 4);
    }
  fs.writeFileSync(process.argv[process.argv.indexOf('--preview') + 1], png(W * S, H * S, out));
}
