// Pocket Edition art. Everything is drawn in code, in the same 16-bit pixel style as the main game.
// Extra animated life: swaying plants and trees, flaming torches, kelp and coral, fish, a sea dragon,
// a little plane and its flying enemies, explosions made of fire, and spinning stars.
import { canvas, R, D, P } from '../art/creatures.js';

const INK = '#0f0f1b';

export function createPocketTextures(scene) {
  if (scene.textures.exists('pk-plant')) return;

  // ---------------------------------------------------------------- tiles (underwater stage)
  canvas(scene, 'tile-sand', 16, 16, 1, (c) => {
    R(c, '#e8c878', 0, 0, 16, 16);
    R(c, '#f8e8a8', 0, 0, 16, 2);
    R(c, '#c8a050', 0, 2, 16, 1);
    [[3, 7], [10, 11], [12, 5], [6, 13]].forEach(([x, y]) => R(c, '#c8a050', x, y, 2, 1));
    R(c, '#fcf4c8', 7, 8, 1, 1);
  });
  canvas(scene, 'tile-sandd', 16, 16, 1, (c) => {
    R(c, '#c8a050', 0, 0, 16, 16);
    [[2, 3, 2], [9, 8, 3], [5, 12, 2], [12, 3, 2]].forEach(([x, y, w]) => R(c, '#a88038', x, y, w, 2));
    [[7, 5], [13, 12]].forEach(([x, y]) => R(c, '#e8c878', x, y, 2, 1));
  });
  canvas(scene, 'tile-coral', 16, 16, 1, (c) => {
    R(c, '#f06890', 0, 0, 16, 16);
    R(c, '#ff9ab0', 1, 1, 14, 3);
    R(c, '#c04070', 0, 12, 16, 4);
    [[3, 6], [9, 7], [6, 10], [12, 10]].forEach(([x, y]) => R(c, '#c04070', x, y, 2, 2));
    [[4, 7], [10, 8]].forEach(([x, y]) => R(c, '#ffd0dc', x, y, 1, 1));
  });

  // ---------------------------------------------------------------- swaying plants (3 frames)
  const sway = [-1.6, 0, 1.6];
  canvas(scene, 'pk-plant', 16, 24, 3, (c, f) => {
    const dx = (h) => Math.round(sway[f] * (h / 20));
    for (let h = 0; h < 20; h++) R(c, h % 5 === 0 ? '#2c8a3c' : '#38a848', 7 + dx(h), 23 - h, 2, 1);
    [[5, 1], [10, -1], [15, 1]].forEach(([h, side], i) => {
      const x = 8 + dx(h) + (side > 0 ? 1 : -5);
      R(c, '#58d854', x, 23 - h - 2, 5, 2);
      R(c, '#98f070', x + (side > 0 ? 0 : 1), 23 - h - 2, 3, 1);
      R(c, '#2c8a3c', x, 23 - h, 5, 1);
      if (i === 2) R(c, '#38a848', x + (side > 0 ? 4 : -1), 23 - h - 4, 2, 2);
    });
    const tx = 7 + dx(20);
    R(c, '#ff7090', tx - 1, 2, 5, 4);
    R(c, '#ffb0c0', tx, 2, 2, 1);
    R(c, '#ffd048', tx + 1, 3, 2, 2);
  });
  canvas(scene, 'pk-fern', 16, 12, 3, (c, f) => {
    [[2, 7, -1], [5, 9, 0], [8, 11, 0], [11, 9, 1], [14, 6, 1]].forEach(([x, h, side], i) => {
      const lean = Math.round(sway[f] * 0.9 * (i % 2 ? 1 : 0.7)) + side;
      for (let y = 0; y < h; y++) {
        const px = x + Math.round(lean * (y / h) * 2);
        R(c, y > h - 3 ? '#98f070' : '#48b848', px, 11 - y, 2, 1);
      }
    });
    R(c, '#2c8a3c', 0, 11, 16, 1);
  });
  canvas(scene, 'pk-tree', 40, 56, 3, (c, f) => {
    const dx = sway[f];
    R(c, '#8c5c2c', 17, 26, 6, 30);
    R(c, '#b87c3c', 17, 26, 2, 30);
    R(c, '#6a4220', 21, 26, 2, 30);
    R(c, '#8c5c2c', 13, 52, 14, 4);
    const blob = (x, y, r, k) => {
      D(c, '#2c8a3c', Math.round(x + dx * k), y, r);
      D(c, '#48b048', Math.round(x + dx * k) - 1, y - 1, r - 2);
      D(c, '#88e060', Math.round(x + dx * k) - 3, y - 4, Math.max(2, r - 7));
    };
    blob(20, 22, 12, 0.6);
    blob(9, 27, 8, 0.4);
    blob(31, 27, 8, 0.4);
    blob(20, 11, 9, 1);
    [[14, 24], [26, 20], [22, 30], [10, 30]].forEach(([x, y]) => R(c, '#f83800', Math.round(x + dx * 0.5), y, 2, 2));
  });
  canvas(scene, 'pk-bush', 24, 16, 3, (c, f) => {
    const dx = Math.round(sway[f] / 2);
    D(c, '#2c8a3c', 7, 10, 6);
    D(c, '#2c8a3c', 17, 10, 6);
    D(c, '#48b048', 12 + dx, 7, 7);
    D(c, '#88e060', 10 + dx, 5, 3);
    [[6, 9], [15, 8], [18, 11]].forEach(([x, y]) => R(c, '#ffd048', x + dx, y, 2, 2));
  });

  // ---------------------------------------------------------------- torch with a living flame
  canvas(scene, 'pk-torch', 12, 28, 4, (c, f) => {
    R(c, '#6a4220', 5, 14, 2, 14);
    R(c, '#8c5c2c', 5, 14, 1, 14);
    R(c, '#7c7c7c', 2, 12, 8, 3);
    R(c, '#bcbcbc', 2, 12, 8, 1);
    const tipx = 6 + [0, 1, 0, -1][f];
    const tipy = [1, 0, 2, 0][f];
    P(c, '#f83800', [[2, 12], [3, 7], [tipx, tipy], [9, 7], [10, 12]]);
    P(c, '#fca044', [[4, 12], [5, 8], [tipx, tipy + 3], [8, 8], [8, 12]]);
    P(c, '#f8d878', [[5, 12], [6, 9], [tipx, tipy + 6], [7, 9], [7, 12]]);
    R(c, '#f8d878', 3 + ((f * 3) % 6), 2 + (f % 2) * 2, 1, 1);
  });

  // ---------------------------------------------------------------- sea plants
  canvas(scene, 'pk-kelp', 12, 48, 3, (c, f) => {
    for (let y = 47; y >= 0; y--) {
      const k = 1 - y / 48;
      const x = Math.round(6 + Math.sin(y / 6 + f * 2.1) * 3 * k);
      R(c, y % 7 < 3 ? '#2ca048' : '#38c058', x - 1, y, 3, 1);
      if (y % 12 === 5) R(c, '#78e090', x + (y % 24 === 5 ? 2 : -3), y, 3, 2);
    }
  });
  canvas(scene, 'pk-coral', 16, 20, 2, (c, f) => {
    R(c, '#f06890', 6, 8, 4, 12);
    R(c, '#f06890', 2, 4 + f, 3, 10);
    R(c, '#f06890', 11, 2, 3, 12);
    R(c, '#c04070', 2, 12, 12, 8);
    R(c, '#ff9ab0', 6, 8, 1, 6);
    [[3, 3 + f], [12, 1], [7, 6]].forEach(([x, y]) => R(c, '#ffd0dc', x, y, 2, 2));
  });

  // ---------------------------------------------------------------- underwater creatures
  canvas(scene, 'pk-fish', 16, 12, 2, (c, f) => {
    D(c, '#fca044', 7, 6, 5);
    R(c, '#fca044', 2, 3, 10, 7);
    R(c, '#f8d878', 4, 8, 7, 2);
    R(c, '#f83800', 5, 1, 4, 2);
    P(c, '#f83800', [[11, 6], [15, 1 + f], [15, 11 - f]]);
    R(c, '#fcfcfc', 3, 4, 3, 3);
    R(c, INK, 4, 5, 1, 2);
    R(c, '#f83800', 1, 7, 2, 1);
  });
  canvas(scene, 'pk-jelly', 14, 16, 2, (c, f) => {
    D(c, '#c864f8', 7, 6, 6);
    R(c, '#c864f8', 1, 6, 12, 3);
    R(c, '#e8a0ff', 4, 2, 4, 1);
    R(c, '#fcfcfc', 4, 5, 1, 2);
    R(c, '#fcfcfc', 9, 5, 1, 2);
    [2, 5, 8, 11].forEach((x, i) => R(c, '#a040d8', x + ((i + f) % 2), 9, 1, 6));
  });
  canvas(scene, 'pk-orb', 8, 8, 2, (c, f) => {
    D(c, '#58b0f8', 4, 4, 3 + f * 0.4);
    D(c, '#a8e0ff', 3, 3, 1);
    R(c, '#fcfcfc', 2, 2, 1, 1);
  });

  // the fish dragon: big, teal, spiky, facing left (4 frames: swim, swim, wind-up, hurt)
  canvas(scene, 'pk-seadragon', 64, 48, 4, (c, f) => {
    const wob = f === 1 ? 1 : 0;
    // tail fin
    P(c, '#fca044', [[50, 22 + wob], [63, 10], [60, 24], [63, 38], [50, 28 - wob]]);
    P(c, '#f83800', [[54, 24], [62, 14], [59, 24], [62, 34], [54, 26]]);
    // body
    D(c, '#0f9a8a', 34, 25 + wob, 15);
    R(c, '#0f9a8a', 14, 15, 38, 21);
    R(c, '#58d8c8', 18, 28, 30, 6); // belly
    R(c, '#0b6e66', 16, 33, 34, 3);
    // back spikes
    [20, 26, 32, 38, 44].forEach((x, i) => P(c, '#fca044', [[x, 16], [x + 3, 7 - ((i + f) % 2) * 2], [x + 6, 16]]));
    // fins
    P(c, '#f83800', [[30, 36], [24, 46], [40, 40]]);
    P(c, '#f83800', [[40, 34], [36, 44], [50, 38]]);
    // head + jaw
    D(c, '#0f9a8a', 12, 24, 11);
    const open = f === 2 ? 7 : 2;
    R(c, '#0f9a8a', 1, 18 - (open > 3 ? 2 : 0), 14, 7);
    R(c, '#0f9a8a', 1, 25 + open, 14, 5);
    R(c, '#7c1020', 2, 25, 12, open);
    [2, 5, 8, 11].forEach((x) => {
      R(c, '#fcfcfc', x, 24, 2, 2);
      R(c, '#fcfcfc', x + 1, 25 + open - 1, 2, 2);
    });
    if (f === 2) R(c, '#a8e0ff', 3, 26, 9, 4);
    // eye + brow + horn
    R(c, '#f8d878', 12, 15, 6, 6);
    R(c, INK, 14, 16, 2, 4);
    R(c, '#0b6e66', 10, 13, 9, 2);
    P(c, '#fca044', [[14, 13], [20, 3], [18, 14]]);
    // scales
    [[26, 20], [32, 19], [38, 21], [30, 25], [36, 26], [42, 25]].forEach(([x, y]) => R(c, '#58d8c8', x, y, 3, 1));
    if (f === 3) {
      R(c, '#fcfcfc', 14, 15, 4, 6);
      R(c, '#f83800', 3, 18, 3, 2);
    }
  });

  // ---------------------------------------------------------------- the air stage
  canvas(scene, 'pk-plane', 40, 20, 2, (c, f) => {
    R(c, '#e4002b', 5, 8, 28, 8); // fuselage
    R(c, '#ff6a78', 5, 8, 28, 2);
    R(c, '#fcfcfc', 12, 12, 16, 2);
    P(c, '#e4002b', [[33, 8], [39, 3], [39, 9], [36, 12]]); // tail
    P(c, '#fcfcfc', [[34, 6], [38, 2], [38, 4]]);
    R(c, '#58b0f8', 17, 4, 9, 5); // canopy
    R(c, '#a8e0ff', 18, 4, 3, 2);
    R(c, '#7c7c7c', 12, 17, 2, 3); // gear
    R(c, '#7c7c7c', 24, 17, 2, 3);
    R(c, INK, 11, 19, 4, 1);
    R(c, INK, 23, 19, 4, 1);
    R(c, '#c8c8d8', 14, 15, 20, 2); // lower wing
    R(c, '#c8c8d8', 16, 2, 14, 2); // upper wing
    R(c, '#7c7c7c', 20, 2, 1, 7);
    R(c, '#7c7c7c', 3, 10, 3, 4); // nose
    R(c, '#fcfcfc', 1, f ? 5 : 9, 1, 10); // propeller
    R(c, '#bcbcbc', 2, f ? 7 : 11, 1, 6);
  });
  canvas(scene, 'pk-crow', 16, 12, 2, (c, f) => {
    D(c, '#35465a', 8, 7, 4);
    R(c, '#35465a', 4, 5, 8, 5);
    P(c, '#ffb347', [[0, 6], [4, 5], [4, 8]]);
    P(c, '#4a6078', [[7, 6], [11, f ? 0 : 3], [13, f ? 4 : 6], [9, 8]]);
    P(c, '#35465a', [[12, 7], [16, 6 + f], [16, 10], [12, 9]]);
    R(c, '#fcfcfc', 4, 4, 2, 2);
    R(c, '#f83800', 5, 5, 1, 1);
  });
  canvas(scene, 'pk-drone', 14, 12, 2, (c, f) => {
    R(c, '#c8c8d8', 3, 6, 8, 4);
    R(c, '#7c7c7c', 3, 9, 8, 1);
    R(c, '#f83800', 6, 7, 2, 2);
    R(c, '#7c7c7c', 2, 3, 1, 3);
    R(c, '#7c7c7c', 11, 3, 1, 3);
    R(c, f ? '#fcfcfc' : '#bcbcbc', 0, 2, 5, 1);
    R(c, f ? '#bcbcbc' : '#fcfcfc', 9, 2, 5, 1);
  });
  canvas(scene, 'pk-balloon', 20, 30, 1, (c) => {
    D(c, '#e8e8f0', 10, 10, 9);
    R(c, '#e8e8f0', 3, 8, 14, 7);
    P(c, '#e8e8f0', [[4, 16], [16, 16], [11, 21], [9, 21]]);
    R(c, '#fcfcfc', 5, 3, 4, 2);
    R(c, '#bcbcc8', 12, 14, 4, 2);
    R(c, '#8c5c2c', 9, 24, 3, 1);
    R(c, '#8c5c2c', 7, 25, 7, 4);
    R(c, '#6a4220', 7, 28, 7, 1);
    R(c, '#bcbcc8', 10, 21, 1, 3);
  });
  canvas(scene, 'pk-boom', 24, 24, 5, (c, f) => {
    const r = [3, 6, 9, 10, 8][f];
    if (f < 4) {
      D(c, '#f83800', 12, 12, r);
      D(c, '#fca044', 12, 12, Math.max(1, r - 2));
      D(c, '#f8d878', 12, 12, Math.max(1, r - 5));
    } else {
      D(c, '#5c5c6c', 12, 11, 8);
      D(c, '#7c7c8c', 11, 10, 5);
    }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + f;
      R(c, f < 3 ? '#f8d878' : '#fca044', 12 + Math.round(Math.cos(a) * (r + 1)), 12 + Math.round(Math.sin(a) * (r + 1)), 2, 2);
    }
  });
  canvas(scene, 'pk-cloud', 56, 24, 1, (c) => {
    D(c, '#fcfcfc', 14, 15, 8);
    D(c, '#fcfcfc', 28, 11, 10);
    D(c, '#fcfcfc', 42, 15, 8);
    R(c, '#fcfcfc', 8, 15, 40, 8);
    R(c, '#d8ecff', 8, 21, 40, 2);
    R(c, '#d8ecff', 20, 18, 12, 2);
  });

  // ---------------------------------------------------------------- stars for the last stage
  canvas(scene, 'pk-star', 16, 16, 4, (c, f) => {
    const k = [1, 0.62, 0.2, 0.62][f];
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 ? 3.4 : 7.4;
      pts.push([8 + Math.cos(a) * r * k, 8.4 + Math.sin(a) * r]);
    }
    P(c, '#ffc928', pts);
    if (f !== 2) {
      P(c, '#fff3a8', [[8 - 2 * k, 5], [8, 2.6], [8 + 1.4 * k, 5.4], [8, 8]]);
      R(c, '#e29a08', 8 + Math.round(2 * k), 10, 2, 2);
    }
  });

  const A = (key, tex, frames, rate, repeat = -1) => scene.anims.create({ key, frames: frames.map((frame) => ({ key: tex, frame })), frameRate: rate, repeat });
  A('pk-plant-sway', 'pk-plant', [0, 1, 2, 1], 3);
  A('pk-fern-sway', 'pk-fern', [0, 1, 2, 1], 3);
  A('pk-tree-sway', 'pk-tree', [0, 1, 2, 1], 2);
  A('pk-bush-sway', 'pk-bush', [0, 1, 2, 1], 2.5);
  A('pk-torch-burn', 'pk-torch', [0, 1, 2, 3], 9);
  A('pk-kelp-sway', 'pk-kelp', [0, 1, 2, 1], 3);
  A('pk-coral-sway', 'pk-coral', [0, 1], 2);
  A('pk-fish-swim', 'pk-fish', [0, 1], 6);
  A('pk-jelly-pulse', 'pk-jelly', [0, 1], 3);
  A('pk-orb-spin', 'pk-orb', [0, 1], 8);
  A('pk-sea-swim', 'pk-seadragon', [0, 1], 3);
  A('pk-sea-windup', 'pk-seadragon', [2], 1, 0);
  A('pk-sea-hurt', 'pk-seadragon', [3], 1, 0);
  A('pk-plane-fly', 'pk-plane', [0, 1], 18);
  A('pk-crow-fly', 'pk-crow', [0, 1], 8);
  A('pk-drone-fly', 'pk-drone', [0, 1], 14);
  A('pk-boom-burn', 'pk-boom', [0, 1, 2, 3, 4], 16, 0);
  A('pk-star-spin', 'pk-star', [0, 1, 2, 3], 8);
}
