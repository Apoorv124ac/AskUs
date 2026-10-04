// Levels are built in code from simple helpers (easy to read, no editor needed).
// Later days can swap these for Tiled JSON maps without touching the scenes.
//
// Grid characters:  . empty   # carpet(top)   d carpet(under)   B desk block
//   p q l r pipe pieces   o coin   f FACT coin   t TOOL coin   c coffee
//   F checkpoint   G goal door   T plant (decor)   D counter (decor)
import { TILE } from './config.js';

const GROUND_ROW = 12; // rows 12-13 are floor; row 11 is the first walkable row

function newLevel(w, h, extra = {}) {
  return {
    w,
    h,
    grid: Array.from({ length: h }, () => Array(w).fill('.')),
    pipes: [],
    labels: [],
    npcs: [],
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

// face: -1 = looks left (towards the player arriving from the left)
function npc(L, id, col, face = -1, autoTalk = true) {
  L.npcs.push({ id, x: col * TILE + 8, bottom: GROUND_ROW * TILE, face, autoTalk });
}

// World 1 "Reception": tutorial + 10 fact coins + a toolkit bonus room.
function buildWorld1() {
  const L = newLevel(110, 14, { room: 'world1' });
  ground(L, [
    [40, 44], // 5 tiles  -> needs a Shift+Up long jump
    [70, 76], // 7 tiles  -> long jump
  ]);

  // Reception area
  put(L, 4, 11, 'T');
  span(L, 11, 9, 11, 'D');
  put(L, 19, 11, 'T');
  npc(L, 'rita', 7);
  label(L, 1, 3, 'ARROWS  MOVE / JUMP');
  label(L, 1, 4, 'SHIFT+SIDE  RUN');
  label(L, 1, 5, 'SHIFT+UP  LONG JUMP');
  label(L, 1, 6, 'DOWN ON PIPE  ENTER');

  put(L, 14, 11, 'f'); // fact 1
  span(L, 10, 16, 19, 'B'); // platform A
  put(L, 17, 9, 'f'); // fact 2
  span(L, 8, 23, 26, 'B'); // platform B
  put(L, 24, 7, 'f'); // fact 3

  npc(L, 'raju', 28);
  label(L, 31, 7, 'TOOLKIT ROOM');
  pipe(L, 33, 2, 'a', { room: 'bonus', pipe: 'b' });

  put(L, 37, 11, 'f'); // fact 4
  label(L, 35, 8, 'HOLD SHIFT+UP!');
  put(L, 42, 8, 'f'); // fact 5 (collect it mid-air over the gap)

  put(L, 50, 11, 'F'); // checkpoint

  // Staircase
  [1, 2, 3, 2, 1].forEach((h, i) => {
    const col = 54 + i;
    for (let r = GROUND_ROW - h; r < GROUND_ROW; r++) put(L, col, r, 'B');
  });
  put(L, 56, 8, 'f'); // fact 6

  pipe(L, 62, 3);
  put(L, 66, 11, 'f'); // fact 7
  label(L, 67, 7, 'LONG JUMP!');
  put(L, 73, 8, 'f'); // fact 8 (over the wide gap)

  span(L, 10, 82, 86, 'B');
  put(L, 84, 9, 'f'); // fact 9
  put(L, 95, 11, 'f'); // fact 10
  put(L, 99, 11, 'T');
  npc(L, 'meera', 100, -1);
  put(L, 106, 11, 'G'); // goal door
  return L;
}

// Toolkit bonus room: one coin per design tool.
function buildBonus() {
  const L = newLevel(20, 14, { bg: 0x101830, theme: 'underground', room: 'bonus' });
  ground(L);
  span(L, 0, 0, 19, 'B');
  span(L, 1, 0, 19, 'B');
  label(L, 2, 3, 'THE TOOLKIT ROOM');
  label(L, 2, 4, 'GRAB ALL 5 TOOLS');
  [3, 5, 7, 9, 11].forEach((c) => put(L, c, 9, 't'));
  pipe(L, 16, 2, 'b', { room: 'world1', pipe: 'a' });
  return L;
}

export const LEVELS = { world1: buildWorld1(), bonus: buildBonus() };

// All collectible items of one kind, left to right (so "fact 1" is always the first one you meet).
export function items(L, ch) {
  const out = [];
  for (let r = 0; r < L.h; r++)
    for (let c = 0; c < L.w; c++) if (L.grid[r][c] === ch) out.push({ col: c, row: r, id: `${L.room}:${c},${r}` });
  out.sort((a, b) => a.col - b.col);
  return out.map((it, i) => ({ ...it, n: i }));
}
export const WORLD1_FACTS = items(LEVELS.world1, 'f');
export const countFacts = (collected) => WORLD1_FACTS.filter((f) => collected.has(f.id)).length;
