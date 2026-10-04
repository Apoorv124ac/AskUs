/**
 * Hand-drawn pixel art for the hero (Apoorv): short dark hair, full beard + moustache,
 * light skin, formal outfit, watch and a red/white company lanyard.
 * 16x32 frames, front-facing 3/4 view (flipX handles direction), poses:
 *   0 idle, 1 walkA, 2 walkB, 3 jump, 4 skid
 * Career tiers change the outfit: shirt -> tie -> blazer -> pocket square -> gold.
 */
const COL = {
  k: '#0F0F1B',  // hair / outline
  b: '#3C2820',  // beard
  s: '#F8C890',  // skin
  d: '#D89868',  // skin shade
  e: '#0F0F1B',  // eyes
  w: '#FCFCFC',  // white
  l: '#BCBCBC',  // light grey
  g: '#7C7C7C',  // grey
  r: '#F83800',  // red
  n: '#2C2C44',  // charcoal (trousers / blazer)
  m: '#46466A',  // charcoal highlight
  o: '#503000',  // shoes
  h: '#AC7C00',  // shoe highlight
  y: '#F8D878',  // gold
  c: '#00B8F8',  // watch glow
  u: '#0058F8',  // blue
};

// 12 wide x 12 tall. Short hair; the outline pass supplies the dark edge around the face.
// Eyes sit slightly right of centre so flipX reads as "looking where he walks".
const HEAD = [
  '...kkkkkk...',
  '..kkmmkkkk..',
  '.kkkkkkkkkk.',
  '.kkkkkkkkkk.',
  '.kksssssskk.',
  '.sskksskkss.',   // brows
  '.sssesssess.',   // eyes
  '.bssssssssb.',   // cheeks / sideburn beard
  '.bbbbbbbbbb.',   // moustache
  '.bbbwwwwbbb.',   // smile
  '.bbbbbbbbbb.',   // beard
  '..bbbbbbbb..',   // chin
];

const TIERS = [
  /* 0 Intern    */ { shirt: 'w', sleeve: 'rolled', tie: null, blazer: null, pocket: null, star: false, watch: 'k' },
  /* 1 Junior    */ { shirt: 'w', sleeve: 'rolled', tie: 'g',  blazer: null, pocket: null, star: false, watch: 'k' },
  /* 2 Associate */ { shirt: 'w', sleeve: 'long',   tie: 'u',  blazer: null, pocket: null, star: false, watch: 'k' },
  /* 3 Senior    */ { shirt: 'w', sleeve: 'long',   tie: 'u',  blazer: 'n',  pocket: null, star: false, watch: 'k' },
  /* 4 Lead      */ { shirt: 'w', sleeve: 'long',   tie: 'n',  blazer: 'n',  pocket: 'r',  star: false, watch: 'k' },
  /* 5 Hired!    */ { shirt: 'w', sleeve: 'long',   tie: 'y',  blazer: 'n',  pocket: 'y',  star: true,  watch: 'y' },
];

export function drawHeroFrame(ctx, ox, pose, tier) {
  const T = TIERS[tier];
  const px = (c, x, y, w = 1, h = 1) => { ctx.fillStyle = COL[c]; ctx.fillRect(ox + x, y, w, h); };
  const lean = pose === 'skid' ? -1 : 0;
  const bodyC = T.blazer ?? T.shirt;
  const shade = T.blazer ? 'm' : 'l';

  // ---- legs & shoes ------------------------------------------------------
  const legs = {
    idle:  { L: [4, 23, 4, 6, 0], R: [9, 23, 4, 6, 0] },
    walkA: { L: [5, 23, 4, 4, -2], R: [9, 23, 4, 6, 0] },
    walkB: { L: [4, 23, 4, 6, 0], R: [8, 23, 4, 4, -2] },
    jump:  { L: [3, 23, 4, 4, -1], R: [10, 23, 4, 3, -2] },
    skid:  { L: [3, 23, 4, 6, 0], R: [10, 23, 4, 6, 0] },
  }[pose];
  for (const side of ['L', 'R']) {
    const [x, y, w, h, lift] = legs[side];
    px('n', x, y, w, h);
    px('m', x, y, 1, h);
    const sy = y + h + (lift ? 0 : 0);
    px('o', x - 1, sy, w + 1, 2);
    px('h', x - 1, sy, w + 1, 1);
  }
  px('k', 4, 23, 9, 1);                                          // belt

  // ---- torso -------------------------------------------------------------
  px(bodyC, 3 + lean, 13, 10, 10);
  px(shade, 12 + lean, 14, 1, 9);                                // side shading
  if (T.blazer) {                                                // open blazer: shirt V in the middle
    px(T.shirt, 6 + lean, 13, 4, 5); px(T.shirt, 7 + lean, 18, 2, 3);
    px('k', 6 + lean, 13, 1, 5); px('k', 9 + lean, 13, 1, 5);   // lapel edges
    px('k', 7 + lean, 18, 1, 3); px('k', 8 + lean, 18, 1, 3);
    px('w', 7 + lean, 18, 2, 3);
  } else {
    px('l', 5 + lean, 13, 1, 1); px('l', 10 + lean, 13, 1, 1);   // collar points
    px('l', 6 + lean, 14, 1, 1); px('l', 9 + lean, 14, 1, 1);
  }
  if (T.pocket) px(T.pocket, 4 + lean, 16, 2, 1);                // pocket square
  if (T.star) { px('y', 11 + lean, 15, 1, 1); px('w', 11 + lean, 14, 1, 1); px('y', 10 + lean, 15, 1, 1); }

  // ---- tie ---------------------------------------------------------------
  if (T.tie) {
    px(T.tie, 7 + lean, 14, 2, 1);
    px(T.tie, 7 + lean, 15, 2, 4);
    px('k', 7 + lean, 14, 2, 1); px(T.tie, 7 + lean, 14, 2, 1);
  }

  // ---- red/white lanyard + badge ----------------------------------------
  for (let y = 13; y <= 18; y++) {
    const c = y % 2 ? 'r' : 'w';
    px(c, 5 + lean, y); px(c, 10 + lean, y);
  }
  px('r', 6 + lean, 18); px('r', 9 + lean, 18);
  px('w', 6 + lean, 19, 4, 4); px('r', 6 + lean, 19, 4, 1); px('k', 7 + lean, 21, 2, 1); px('l', 6 + lean, 22, 4, 1);

  // ---- arms --------------------------------------------------------------
  const swing = pose === 'walkA' ? [-1, 1] : pose === 'walkB' ? [1, -1] : pose === 'jump' ? [-3, -3] : [0, 0];
  const arm = (x, dy) => {
    const top = 14 + dy;
    px(bodyC, x, top, 2, 5);
    px(shade, x + 1, top, 1, 5);
    if (T.sleeve === 'rolled') { px('s', x, top + 5, 2, 3); px('d', x + 1, top + 5, 1, 3); }
    else { px(bodyC, x, top + 5, 2, 3); px(T.shirt, x, top + 7, 2, 1); }
    px('s', x, top + 8, 2, 2);                                   // hand
  };
  arm(1 + lean, swing[0]);
  arm(13 + lean, swing[1]);
  // watch on the left wrist
  const wy = 14 + swing[0] + 6;
  px(T.watch, 1 + lean, wy, 2, 2); px('c', 1 + lean, wy, 1, 1);
  if (T.watch === 'y') px('w', 2 + lean, wy + 1, 1, 1);

  // ---- head --------------------------------------------------------------
  HEAD.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) {
      const ch = row[rx];
      if (ch !== '.') px(ch === 'e' ? 'e' : ch, 2 + lean + rx, 1 + ry);
    }
  });
  px('d', 4 + lean, 5, 1, 1);                                    // soft forehead shade
}

export const HERO_POSES = ['idle', 'walkA', 'walkB', 'jump', 'skid'];
export const HERO_TIER_COUNT = TIERS.length;
