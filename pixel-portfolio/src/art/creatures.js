// All creature / gimmick art, drawn in code (no image files needed). Every sprite gets an
// automatic 1px dark outline so the whole cast matches the hero's look.
const INK = [15, 15, 27];

function canvas(scene, key, w, h, frames, draw) {
  const tex = scene.textures.createCanvas(key, w * frames, h);
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  for (let f = 0; f < frames; f++) {
    ctx.save();
    ctx.translate(f * w, 0);
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.clip();
    draw(ctx, f, w, h);
    ctx.restore();
  }
  crisp(ctx, w * frames, h);
  outline(ctx, w, h, frames);
  tex.refresh();
  for (let f = 0; f < frames; f++) tex.add(f, 0, f * w, 0, w, h);
  return tex;
}

// remove anti-aliasing from path fills (alpha -> 0 or 255)
function crisp(ctx, w, h) {
  const img = ctx.getImageData(0, 0, w, h);
  for (let i = 3; i < img.data.length; i += 4) img.data[i] = img.data[i] > 110 ? 255 : 0;
  ctx.putImageData(img, 0, 0);
}

// 1px ink outline around every opaque pixel cluster (per frame, so frames never bleed)
function outline(ctx, fw, h, frames) {
  const W = fw * frames;
  const img = ctx.getImageData(0, 0, W, h);
  const d = img.data;
  const src = new Uint8ClampedArray(d);
  const a = (x, y) => (x < 0 || y < 0 || x >= W || y >= h ? 0 : src[(y * W + x) * 4 + 3]);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < W; x++) {
      if (a(x, y)) continue;
      const fx = x % fw;
      const edge = (nx) => Math.floor(nx / fw) === Math.floor(x / fw);
      const hit =
        (edge(x - 1) && a(x - 1, y)) || (edge(x + 1) && a(x + 1, y)) || a(x, y - 1) || a(x, y + 1);
      if (hit && fx >= 0) {
        const i = (y * W + x) * 4;
        d[i] = INK[0];
        d[i + 1] = INK[1];
        d[i + 2] = INK[2];
        d[i + 3] = 255;
      }
    }
  ctx.putImageData(img, 0, 0);
}

const R = (ctx, c, x, y, w, h) => {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
};
const D = (ctx, c, cx, cy, r) => {
  ctx.fillStyle = c;
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) ctx.fillRect(cx + x, cy + y, 1, 1);
};
const P = (ctx, c, pts) => {
  ctx.fillStyle = c;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
};

export function createCreatureTextures(scene) {
  // ---------------------------------------------------------------- TURTLE
  // frames: 0,1 walk | 2 shell | 3,4 shell spinning
  canvas(scene, 'turtle', 16, 16, 5, (c, f) => {
    if (f <= 1) {
      D(c, '#00a800', 9, 8, 5);
      R(c, '#58d854', 7, 4, 3, 2);
      R(c, '#005800', 5, 8, 9, 2);
      R(c, '#f8d878', 4, 11, 11, 3);
      R(c, '#f8d878', 1, 5, 5, 6); // head
      R(c, '#fcfcfc', 2, 6, 2, 2);
      R(c, '#0f0f1b', 2, 7, 1, 1);
      R(c, '#f8d878', f ? 5 : 3, 13, 3, 2);
      R(c, '#f8d878', f ? 10 : 12, 13, 3, 2);
    } else {
      const rot = f === 3 ? 0 : f === 4 ? 1 : 0;
      D(c, '#00a800', 8, 8, 6);
      R(c, '#58d854', 5, 4 + rot, 3, 2);
      R(c, '#005800', 3, 8, 10, 2);
      R(c, '#f8d878', 3, 12, 10, 2);
      if (f >= 3) R(c, '#fcfcfc', 6 + rot * 3, 6, 2, 2);
    }
  });

  // ---------------------------------------------------------------- CROC (24x16)
  // 0,1 walk | 2 snap (mouth open)
  canvas(scene, 'croc', 24, 16, 3, (c, f) => {
    R(c, '#00a800', 6, 6, 14, 7); // body
    R(c, '#005800', 6, 11, 14, 2);
    R(c, '#58d854', 9, 4, 2, 2); // back ridges
    R(c, '#58d854', 13, 4, 2, 2);
    R(c, '#58d854', 17, 4, 2, 2);
    R(c, '#00a800', 20, 8, 4, 3); // tail
    R(c, '#00a800', 1, f === 2 ? 3 : 6, 7, 4); // upper jaw
    R(c, '#00a800', 1, f === 2 ? 10 : 9, 7, 3); // lower jaw
    if (f === 2) {
      R(c, '#f83800', 2, 7, 6, 3);
      [2, 4, 6].forEach((x) => R(c, '#fcfcfc', x, 6, 1, 2));
      [3, 5, 7].forEach((x) => R(c, '#fcfcfc', x, 9, 1, 2));
    } else [2, 4, 6].forEach((x) => R(c, '#fcfcfc', x, 9, 1, 1));
    R(c, '#f8d878', 7, 4, 3, 3); // eye
    R(c, '#0f0f1b', 8, 5, 1, 2);
    R(c, '#00a800', f ? 8 : 10, 13, 3, 2); // legs
    R(c, '#00a800', f ? 15 : 13, 13, 3, 2);
  });

  // ---------------------------------------------------------------- BAT "spam bat" (3 wing frames)
  canvas(scene, 'bat', 16, 16, 3, (c, f) => {
    const wy = f === 0 ? 2 : f === 1 ? 6 : 9;
    P(c, '#6844fc', [[8, 7], [1, wy], [3, wy + 4], [6, 10]]);
    P(c, '#6844fc', [[8, 7], [15, wy], [13, wy + 4], [10, 10]]);
    D(c, '#8c6cff', 8, 9, 3);
    R(c, '#f83800', 6, 8, 1, 2);
    R(c, '#f83800', 9, 8, 1, 2);
    R(c, '#fcfcfc', 7, 11, 1, 1);
    R(c, '#fcfcfc', 9, 11, 1, 1);
    R(c, '#6844fc', 5, 5, 2, 2);
    R(c, '#6844fc', 9, 5, 2, 2);
  });

  // ---------------------------------------------------------------- DIVER "email hawk" (0,1 flap | 2 dive)
  canvas(scene, 'diver', 16, 16, 3, (c, f) => {
    if (f === 2) {
      P(c, '#fca044', [[8, 14], [3, 5], [13, 5]]);
      R(c, '#fcfcfc', 6, 3, 4, 4);
      R(c, '#f8d878', 7, 13, 2, 3);
      R(c, '#f83800', 7, 5, 1, 1);
      R(c, '#f83800', 9, 5, 1, 1);
    } else {
      D(c, '#fca044', 8, 9, 4);
      P(c, '#fca044', [[8, 8], [1, f ? 9 : 4], [5, 11]]);
      P(c, '#fca044', [[8, 8], [15, f ? 9 : 4], [11, 11]]);
      R(c, '#fcfcfc', 3, 6, 4, 4);
      R(c, '#f8d878', 1, 8, 3, 2);
      R(c, '#0f0f1b', 4, 7, 1, 1);
    }
  });

  // ---------------------------------------------------------------- SPIKER (spiny beetle, 2 walk frames)
  canvas(scene, 'spiker', 16, 16, 2, (c, f) => {
    D(c, '#7c7c7c', 8, 9, 5);
    [[4, 2], [7, 0], [10, 2], [12, 4], [2, 5]].forEach(([x, y]) => P(c, '#fcfcfc', [[x, y + 5], [x + 2, y + 5], [x + 1, y]]));
    R(c, '#f83800', 2, 9, 3, 3);
    R(c, '#fcfcfc', 2, 9, 1, 1);
    R(c, '#0f0f1b', 3, 10, 1, 1);
    R(c, '#7c7c7c', f ? 4 : 6, 13, 3, 2);
    R(c, '#7c7c7c', f ? 10 : 8, 13, 3, 2);
  });

  // ---------------------------------------------------------------- PIRANHA plant (16x24, 2 frames)
  canvas(scene, 'piranha', 16, 24, 2, (c, f) => {
    R(c, '#00a800', 7, 12, 2, 12);
    D(c, '#f83800', 8, 7, 6);
    [[5, 3], [10, 5], [6, 9]].forEach(([x, y]) => R(c, '#fcfcfc', x, y, 2, 2));
    // mouth
    R(c, '#0f0f1b', 2, f ? 7 : 8, 12, f ? 4 : 2);
    [3, 6, 9, 12].forEach((x) => R(c, '#fcfcfc', x, f ? 7 : 8, 1, 1));
    R(c, '#00a800', 3, 15, 4, 2);
    R(c, '#00a800', 9, 17, 4, 2);
  });

  // ---------------------------------------------------------------- FIRE + fireball
  canvas(scene, 'flame', 16, 16, 3, (c, f) => {
    const h = [12, 14, 11][f];
    P(c, '#f83800', [[2, 15], [8 - f, 15 - h], [14, 15]]);
    P(c, '#fca044', [[4, 15], [8, 15 - h + 4], [12, 15]]);
    P(c, '#f8d878', [[6, 15], [8, 15 - h + 8], [10, 15]]);
  });
  canvas(scene, 'fireball', 12, 12, 2, (c, f) => {
    D(c, '#f83800', 6, 6, 4);
    D(c, '#fca044', 6, 6, 3);
    D(c, '#f8d878', 6, 6, 1);
    R(c, '#f83800', f ? 9 : 10, 5, 2, 2);
  });

  // ---------------------------------------------------------------- gimmicks
  canvas(scene, 'spring', 16, 16, 2, (c, f) => {
    const top = f ? 5 : 10;
    R(c, '#7c7c7c', 3, 13, 10, 2);
    for (let y = top + 2; y < 13; y += 3) R(c, '#bcbcbc', 4, y, 8, 1);
    R(c, '#f83800', 1, top, 14, 3);
    R(c, '#fca044', 2, top, 12, 1);
  });
  canvas(scene, 'spikes', 16, 16, 1, (c) => {
    [0, 5, 10].forEach((x) => P(c, '#bcbcbc', [[x, 15], [x + 3, 4], [x + 6, 15]]));
    [0, 5, 10].forEach((x) => R(c, '#fcfcfc', x + 2, 6, 1, 6));
  });
  canvas(scene, 'tile-crumble', 16, 16, 1, (c) => {
    R(c, '#ac7c00', 0, 0, 16, 16);
    R(c, '#fca044', 0, 0, 16, 3);
    R(c, '#0f0f1b', 4, 4, 1, 5);
    R(c, '#0f0f1b', 5, 8, 3, 1);
    R(c, '#0f0f1b', 11, 6, 1, 6);
    R(c, '#8c5c00', 2, 11, 12, 4);
  });
  canvas(scene, 'tile-conveyor', 16, 16, 2, (c, f) => {
    R(c, '#4a4a6a', 0, 0, 16, 16);
    R(c, '#bcbcbc', 0, 0, 16, 3);
    for (let x = f ? 2 : 0; x < 16; x += 4) R(c, '#f8d878', x, 6, 2, 2);
    R(c, '#f8d878', 13, 5, 2, 1);
    R(c, '#f8d878', 14, 6, 1, 3);
    R(c, '#2c2c44', 0, 12, 16, 4);
  });
  canvas(scene, 'mover', 48, 8, 1, (c) => {
    R(c, '#7c7c7c', 0, 0, 48, 8);
    R(c, '#bcbcbc', 0, 0, 48, 2);
    R(c, '#f8d878', 2, 4, 4, 2);
    R(c, '#f8d878', 42, 4, 4, 2);
    for (let x = 10; x < 40; x += 6) R(c, '#4a4a6a', x, 3, 3, 4);
  });

  // ---------------------------------------------------------------- DRAGON (96x64, facing left)
  // 0,1 idle (wings up/down) | 2 wind-up | 3 breath | 4 hurt
  canvas(scene, 'dragon', 96, 64, 5, (c, f) => {
    const wingUp = f === 0 || f === 2;
    // wing (behind)
    P(c, '#8c1808', wingUp ? [[56, 30], [62, 2], [92, 8], [84, 34]] : [[56, 32], [66, 22], [94, 36], [80, 44]]);
    P(c, '#c82810', wingUp ? [[60, 28], [64, 8], [86, 12], [80, 32]] : [[60, 32], [68, 26], [88, 38], [78, 42]]);
    // tail
    P(c, '#c82810', [[72, 44], [95, 54], [95, 60], [72, 54]]);
    P(c, '#f8d878', [[90, 52], [95, 46], [95, 58]]);
    // legs
    R(c, '#a02010', 44, 52, 9, 12);
    R(c, '#a02010', 64, 52, 9, 12);
    [44, 64].forEach((x) => [0, 3, 6].forEach((d) => R(c, '#f8d878', x + d, 61, 2, 3)));
    // body
    D(c, '#c82810', 58, 40, 20);
    D(c, '#f8a860', 52, 46, 13);
    for (let y = 36; y < 58; y += 4) R(c, '#fcc888', 42, y, 20, 1);
    // back spikes
    [[50, 22], [58, 20], [66, 22], [73, 27]].forEach(([x, y]) => P(c, '#f8d878', [[x, y + 6], [x + 3, y - 3], [x + 6, y + 6]]));
    // neck + head
    R(c, '#c82810', 26, 26, 22, 16);
    D(c, '#d83818', 24, 26, 13);
    R(c, '#d83818', 6, 24, 20, 11); // snout
    R(c, '#a02010', 8, 26, 2, 2); // nostril
    // jaw
    const open = f === 2 ? 3 : f === 3 ? 7 : 0;
    R(c, '#a02010', 8, 35 + open, 18, 5);
    if (f >= 2) {
      R(c, '#0f0f1b', 8, 35, 18, open);
      R(c, f === 3 ? '#f8d878' : '#f83800', 10, 35, 14, open);
    }
    [9, 13, 17, 21].forEach((x) => P(c, '#fcfcfc', [[x, 35], [x + 2, 35], [x + 1, 38]]));
    // horns
    P(c, '#f8d878', [[28, 15], [32, 4], [36, 15]]);
    P(c, '#f8d878', [[36, 17], [44, 8], [42, 20]]);
    // eye
    D(c, f === 4 ? '#fcfcfc' : '#f8d878', 24, 24, 4);
    if (f === 4) {
      R(c, '#0f0f1b', 21, 21, 7, 1);
      R(c, '#0f0f1b', 22, 24, 5, 1);
    } else {
      R(c, '#0f0f1b', 24, 21, 2, 7);
      R(c, '#0f0f1b', 19, 19, 9, 2); // angry brow
    }
    // glow in the throat when winding up
    if (f === 2) R(c, '#f8d878', 22, 30, 3, 3);
  });
}

// the soft vignette overlay (smooth, rendered at the real canvas size)
export function createVignette(scene, w, h) {
  if (scene.textures.exists('vignette')) return;
  const tex = scene.textures.createCanvas('vignette', w, h);
  const c = tex.getContext();
  const g = c.createRadialGradient(w / 2, h / 2, h * 0.38, w / 2, h / 2, h * 0.85);
  g.addColorStop(0, 'rgba(10,8,30,0)');
  g.addColorStop(1, 'rgba(10,8,30,0.55)');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  tex.refresh();
}
