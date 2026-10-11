// Sample project pages, drawn in code, so the on-screen PDF viewer has something to show.
// When the real projects arrive, drop page images into public/projects/ and list them in PROJECT_IMAGES.
import { PROJECTS } from './content.js';

export const PAGE_W = 480;
export const PAGE_H = 336;

// Real pages (optional). Example: { 0: ['projects/p1-1.png', 'projects/p1-2.png'] }  (project index -> list of images)
export const PROJECT_IMAGES = {};

const rnd = (seed) => {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
};

const FONT = 'Silkscreen, monospace';
const HEAD = '"Press Start 2P", monospace';

function box(c, color, x, y, w, h) {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
function label(c, str, x, y, size, color, font = FONT, align = 'left') {
  c.fillStyle = color;
  c.font = `${size}px ${font}`;
  c.textAlign = align;
  c.textBaseline = 'top';
  c.fillText(str, x, y);
}
function frame(c, x, y, w, h, fill, line = '#14262b') {
  box(c, line, x - 2, y - 2, w + 4, h + 4);
  box(c, fill, x, y, w, h);
}

// 4 page designs; the palette and layout details change with each project
function drawPage(c, pj, index) {
  const r = rnd(pj.seed * 7 + index * 13);
  const [A, B, C, D] = pj.palette;
  const light = '#fcfcf4';
  box(c, index % 2 ? light : '#f2f2ea', 0, 0, PAGE_W, PAGE_H);
  // header strip + footer
  box(c, A, 0, 0, PAGE_W, 22);
  label(c, `${pj.title}`, 14, 6, 9, B === '#fcfcfc' || B === '#fcfcfc' ? '#fcfcfc' : '#fcfcfc', HEAD);
  label(c, `${index + 1}/4`, PAGE_W - 14, 6, 9, '#fcfcfc', HEAD, 'right');
  label(c, 'SAMPLE PAGE. THE REAL PROJECT GOES HERE.', 14, PAGE_H - 16, 8, '#7c8a90');
  label(c, pj.pages[index], PAGE_W - 14, PAGE_H - 16, 8, '#7c8a90', FONT, 'right');

  if (index === 0) {
    // cover: big blocks + title
    box(c, A, 14, 40, 210, 250);
    box(c, D, 232, 40, 234, 120);
    box(c, C, 232, 168, 112, 122);
    box(c, B, 352, 168, 114, 122);
    for (let i = 0; i < 6; i++) box(c, i % 2 ? B : C, 28 + i * 30, 232 + (i % 3) * 8, 22, 44 - (i % 3) * 8);
    label(c, pj.title, 26, 62, 15, '#fcfcfc', HEAD);
    label(c, pj.client, 26, 104, 8, '#fcfcfc');
    box(c, '#fcfcfc', 26, 126, 70, 4);
    [0, 1, 2].forEach((k) => box(c, 'rgba(255,255,255,.55)', 26, 144 + k * 12, 150 - k * 22, 5));
    c.fillStyle = C;
    c.beginPath();
    c.arc(350, 100, 38 + r() * 8, 0, 6.3);
    c.fill();
    box(c, A, 300, 90, 100, 8);
    label(c, 'Aa', 262, 60, 30, B, HEAD);
  } else if (index === 1) {
    // grid of content cards
    const cols = 3;
    const rows = 2;
    const cw = 138;
    const ch = 116;
    for (let k = 0; k < cols * rows; k++) {
      const x = 14 + (k % cols) * (cw + 10);
      const y = 36 + Math.floor(k / cols) * (ch + 14);
      frame(c, x, y, cw, ch, k % 2 ? '#ffffff' : '#eef2f4');
      box(c, [A, C, D, B][k % 4], x, y, cw, 54);
      for (let j = 0; j < 4; j++) box(c, [B, A, C][(k + j) % 3], x + 10 + j * 28, y + 14 + ((j + k) % 3) * 7, 20, 26 - ((j + k) % 3) * 7);
      [0, 1, 2].forEach((t) => box(c, '#c8d2d6', x + 10, y + 66 + t * 12, cw - 20 - t * 24, 5));
    }
  } else if (index === 2) {
    // system: swatches, type, bars
    [A, B, C, D, '#c8d2d6'].forEach((col, k) => {
      frame(c, 14 + k * 62, 36, 54, 70, col);
      label(c, col.toUpperCase(), 16 + k * 62, 110, 6, '#14262b');
    });
    label(c, 'Aa Bb', 14, 134, 28, D === '#fcfcfc' ? '#14262b' : D, HEAD);
    label(c, 'HEADLINE  •  BODY  •  CAPTION', 14, 182, 8, '#14262b');
    [0, 1, 2, 3].forEach((k) => box(c, '#d8e0e3', 14, 204 + k * 14, 220 - k * 30, 6));
    frame(c, 262, 130, 204, 150, '#ffffff');
    const vals = [0.5, 0.8, 0.35, 0.95, 0.65, 0.78];
    vals.forEach((v, k) => box(c, [A, C, D][k % 3], 276 + k * 30, 266 - v * 120, 22, v * 120));
    box(c, '#14262b', 272, 266, 188, 2);
    label(c, 'RESULTS', 276, 138, 8, '#14262b', HEAD);
  } else {
    // mockups: a laptop and a phone showing the work
    frame(c, 24, 40, 270, 170, '#14262b');
    box(c, A, 30, 46, 258, 28);
    box(c, '#ffffff', 30, 74, 258, 130);
    box(c, C, 42, 86, 100, 60);
    box(c, D, 150, 86, 126, 28);
    [0, 1, 2].forEach((k) => box(c, '#c8d2d6', 150, 122 + k * 12, 126 - k * 20, 6));
    [0, 1, 2, 3].forEach((k) => box(c, [A, B, C, D][k], 42 + k * 62, 160, 54, 34));
    box(c, '#9aa6ab', 8, 214, 302, 8);
    frame(c, 330, 60, 120, 230, '#14262b');
    box(c, '#ffffff', 336, 68, 108, 214);
    box(c, A, 336, 68, 108, 36);
    box(c, C, 346, 114, 88, 50);
    [0, 1, 2, 3].forEach((k) => box(c, '#c8d2d6', 346, 174 + k * 14, 88 - k * 14, 6));
    box(c, D, 346, 246, 88, 22);
    label(c, 'GO', 390, 252, 8, '#fcfcfc', HEAD, 'center');
  }
}

// returns a texture key for page `index` of project `pi` (drawn once, then cached)
export function pageTexture(scene, pi, index) {
  const key = `pk-page-${pi}-${index}`;
  if (scene.textures.exists(key)) return key;
  const t = scene.textures.createCanvas(key, PAGE_W, PAGE_H);
  const c = t.getContext();
  c.imageSmoothingEnabled = false;
  drawPage(c, PROJECTS[pi], index);
  t.refresh();
  return key;
}
