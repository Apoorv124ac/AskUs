// Levels are built in code from simple helpers (easy to read, no editor needed).
// Later days can swap these for Tiled JSON maps without touching the scenes.
//
// Grid characters:  . empty   # carpet(top)   d carpet(under)   B desk block
//   p q l r pipe pieces   o coin   f FACT coin   t TOOL coin   c coffee
//   F checkpoint   G goal door   T plant (decor)   D counter (decor)   K bookshelf (decor)
//   World 2 tasks: s swatch   b typo bug   i idea bulb   1 2 3 4 data nodes (collect in order)
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

// face: -1 = looks left (towards the player arriving from the left); dlg = key in dialogue.json
function npc(L, id, col, face = -1, autoTalk = true, dlg = id) {
  L.npcs.push({ id, dlg, x: col * TILE + 8, bottom: GROUND_ROW * TILE, face, autoTalk });
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

// World 2 "Training Campus": four classrooms, one per degree, each with a task + a gate.
function buildWorld2() {
  const L = newLevel(136, 14, { room: 'world2', world: 1, bg: 0xa4e4fc });
  ground(L);
  L.campus = true;
  L.stations = [
    { name: 'COLORS', title: 'BSC MULTIMEDIA', years: '2013-2016', from: 10, to: 35, gateCol: 35, kind: 'swatch',
      objective: 'COLLECT 3 COLOUR SWATCHES' },
    { name: 'BUGS', title: 'MA JOURNALISM', years: '2018-2020', from: 36, to: 63, gateCol: 63, kind: 'bug',
      objective: 'STOMP 3 TYPO BUGS' },
    { name: 'IDEAS', title: 'IIT DELHI', years: '2021-2022', from: 64, to: 93, gateCol: 93, kind: 'bulb',
      objective: 'FIND 3 IDEAS (ONE IS HIDDEN)' },
    { name: 'DATA', title: 'DATA SCIENCE', years: '2023-2024', from: 94, to: 123, gateCol: 123, kind: 'node',
      objective: 'COLLECT NODES IN ORDER 1-2-3-4' },
  ];

  // Entrance
  npc(L, 'prof', 6, -1, true, 'prof');
  put(L, 3, 11, 'K');
  put(L, 4, 11, 'K');
  put(L, 9, 11, 'T');

  // Classroom 1: colour lab
  label(L, 12, 3, 'DEGREE 1/4');
  label(L, 12, 4, 'BSC MULTIMEDIA');
  put(L, 12, 11, 'K');
  span(L, 10, 14, 17, 'B');
  put(L, 15, 9, 's');
  span(L, 8, 21, 24, 'B');
  put(L, 22, 7, 's');
  span(L, 10, 28, 31, 'B');
  put(L, 29, 9, 's');
  put(L, 33, 11, 'T');
  put(L, 36, 11, 'F');

  // Classroom 2: newsroom (bugs patrol between two low walls)
  label(L, 39, 3, 'DEGREE 2/4');
  label(L, 39, 4, 'MA JOURNALISM');
  put(L, 38, 11, 'B');
  put(L, 61, 11, 'B');
  [44, 50, 56].forEach((c) => put(L, c, 11, 'b'));
  span(L, 10, 46, 49, 'B');
  span(L, 8, 52, 55, 'B');

  // Classroom 3: idea lab (one bulb is up high, one is in the secret room)
  label(L, 66, 3, 'DEGREE 3/4');
  label(L, 66, 4, 'IIT DELHI');
  put(L, 65, 11, 'F');
  span(L, 10, 67, 70, 'B');
  put(L, 68, 9, 'i');
  span(L, 10, 74, 76, 'B');
  span(L, 8, 77, 79, 'B');
  span(L, 6, 80, 82, 'B');
  put(L, 81, 5, 'i');
  label(L, 84, 8, 'SECRET ROOM');
  pipe(L, 86, 2, 'a', { room: 'lab', pipe: 'b' });
  put(L, 90, 11, 'T');

  // Classroom 4: data centre (collect 1-2-3-4 in order; 2 hides behind 3)
  label(L, 96, 3, 'DEGREE 4/4');
  label(L, 96, 4, 'DATA SCIENCE');
  put(L, 95, 11, 'F');
  span(L, 10, 97, 100, 'B');
  put(L, 98, 9, '1');
  span(L, 8, 104, 107, 'B');
  put(L, 105, 7, '3');
  span(L, 10, 109, 112, 'B');
  put(L, 110, 9, '2');
  span(L, 10, 114, 116, 'B');
  span(L, 8, 117, 120, 'B');
  put(L, 119, 7, '4');

  // Graduation
  npc(L, 'prof', 127, -1, true, 'profEnd');
  put(L, 125, 11, 'T');
  put(L, 130, 11, 'K');
  put(L, 133, 11, 'G');
  return L;
}

// Secret idea-lab room (belongs to classroom 3)
function buildLab() {
  const L = newLevel(20, 14, { bg: 0x101830, theme: 'underground', room: 'lab', world: 1 });
  ground(L);
  L.forceStation = 2;
  span(L, 0, 0, 19, 'B');
  span(L, 1, 0, 19, 'B');
  label(L, 2, 3, 'THE SECRET IDEA LAB');
  label(L, 2, 4, 'GOOD IDEAS HIDE IN ODD PLACES');
  put(L, 8, 10, 'B');
  put(L, 9, 10, 'B');
  put(L, 8, 9, 'i');
  pipe(L, 16, 2, 'b', { room: 'world2', pipe: 'a' });
  return L;
}

export const LEVELS = { world1: buildWorld1(), bonus: buildBonus(), world2: buildWorld2(), lab: buildLab() };

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
