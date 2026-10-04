// Levels are built in code from simple helpers (easy to read, no editor needed).
// Later days can swap these for Tiled JSON maps without touching the scenes.
//
// Grid characters:  . empty   # carpet(top)   d carpet(under)   B desk block
//                   p q l r pipe pieces   o coin   c coffee   F checkpoint   G goal door
import { TILE } from './config.js';

const GROUND_ROW = 12; // rows 12-13 are floor; row 11 is the first walkable row

function newLevel(w, h, extra = {}) {
  return {
    w,
    h,
    grid: Array.from({ length: h }, () => Array(w).fill('.')),
    pipes: [],
    labels: [],
    spawn: { col: 3, row: GROUND_ROW - 1 },
    bg: 0x3cbcfc,
    theme: 'office',
    world: 0, // index into WORLDS
    ...extra,
  };
}

const put = (L, col, row, ch) => (L.grid[row][col] = ch);
const span = (L, row, c1, c2, ch) => {
  for (let c = c1; c <= c2; c++) put(L, c, row, ch);
};

function ground(L, gaps = []) {
  for (let c = 0; c < L.w; c++) {
    if (gaps.some(([a, b]) => c >= a && c <= b)) continue;
    put(L, c, GROUND_ROW, '#');
    put(L, c, GROUND_ROW + 1, 'd');
  }
}

function pipe(L, col, height, id = null, to = null) {
  const top = GROUND_ROW - height;
  put(L, col, top, 'p');
  put(L, col + 1, top, 'q');
  for (let r = top + 1; r < GROUND_ROW; r++) {
    put(L, col, r, 'l');
    put(L, col + 1, r, 'r');
  }
  L.pipes.push({ id, x: col * TILE, y: top * TILE, to });
}

function label(L, col, row, text) {
  L.labels.push({ x: col * TILE, y: row * TILE, text });
}

function buildMain() {
  const L = newLevel(110, 14);
  ground(L, [
    [40, 44], // 5 tiles  -> needs a RUN jump
    [70, 76], // 7 tiles  -> needs a LONG jump
  ]);

  // Controls cheat-sheet at the start
  label(L, 1, 3, 'ARROWS  MOVE / JUMP');
  label(L, 1, 4, 'SHIFT+SIDE  RUN');
  label(L, 1, 5, 'SHIFT+UP  LONG JUMP');
  label(L, 1, 6, 'DOWN ON PIPE  ENTER');

  span(L, 11, 8, 11, 'o'); // warm-up coins

  span(L, 10, 14, 17, 'B'); // platform A
  span(L, 9, 14, 17, 'o');
  span(L, 8, 21, 24, 'B'); // platform B
  put(L, 21, 7, 'o');
  put(L, 22, 7, 'o');
  put(L, 23, 7, 'c'); // coffee!
  put(L, 24, 7, 'o');

  label(L, 26, 7, 'BONUS ROOM');
  pipe(L, 30, 2, 'a', { room: 'bonus', pipe: 'b' });

  label(L, 34, 8, 'HOLD SHIFT+UP!');
  span(L, 9, 41, 43, 'o');
  put(L, 42, 8, 'o');

  put(L, 50, 11, 'F'); // checkpoint

  // Staircase
  [1, 2, 3, 2, 1].forEach((h, i) => {
    const col = 54 + i;
    for (let r = GROUND_ROW - h; r < GROUND_ROW; r++) put(L, col, r, 'B');
    put(L, col, GROUND_ROW - h - 1, 'o');
  });

  pipe(L, 62, 3);

  label(L, 66, 7, 'LONG JUMP!');
  put(L, 71, 9, 'o');
  span(L, 8, 72, 74, 'o');
  put(L, 75, 9, 'o');

  span(L, 10, 82, 86, 'B');
  span(L, 9, 82, 86, 'o');
  put(L, 94, 11, 'c');

  put(L, 104, 11, 'G'); // goal door
  return L;
}

function buildBonus() {
  const L = newLevel(20, 14, { bg: 0x101830, theme: 'underground' });
  ground(L);
  span(L, 0, 0, 19, 'B');
  span(L, 1, 0, 19, 'B');
  label(L, 2, 3, 'BONUS ROOM');
  label(L, 2, 4, 'HOBBIES: DAY 4');
  span(L, 8, 4, 15, 'o');
  span(L, 10, 6, 13, 'o');
  pipe(L, 16, 2, 'b', { room: 'main', pipe: 'a' });
  return L;
}

export const LEVELS = { main: buildMain(), bonus: buildBonus() };
