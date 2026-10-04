// Levels are built in code from simple helpers (easy to read, no editor needed).
//
// Grid characters:  . empty   # carpet(top)   d carpet(under)   B desk block
//   p q l r pipe pieces   o coin   f FACT coin   t TOOL coin   c coffee
//   F checkpoint   G goal door   T plant   D counter   K bookshelf   Y trophy   V curtain (decor)
//   M N O arcade cabinets (decor)   P flagpole   Q ? block (hit from below)
//   ^ spikes   S spring   C crumbling tile   > < conveyor belt (right / left)
//   World 2 tasks: s swatch   b typo bug   i idea bulb   1 2 3 4 data nodes (collect in order)
//   World 3 floors: k client badge   E elevator (decor)
//   World 4 skills: u (design) v (lead) w (tools)
// Enemies (turtle, croc, bat, diver, spiker, piranha) and moving platforms are listed separately.
import { TILE, CLASSIC_RESUME_URL } from './config.js';

const GROUND_ROW = 12; // rows 12-13 are floor; row 11 is the first walkable row

function newLevel(w, h, extra = {}) {
  return {
    w,
    h,
    grid: Array.from({ length: h }, () => Array(w).fill('.')),
    pipes: [],
    labels: [],
    npcs: [],
    enemies: [],
    movers: [],
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
function board(L, col, frame, dlg, autoTalk = false) {
  L.npcs.push({ id: 'board', frame, dlg, x: col * TILE + 8, bottom: GROUND_ROW * TILE, face: -1, autoTalk, board: true });
}
function cheer(L, id, col) {
  L.npcs.push({ id, dlg: null, x: col * TILE + 8, bottom: GROUND_ROW * TILE, face: -1, autoTalk: false, cheer: true });
}

// --- enemies & mechanics -----------------------------------------------------
// type: turtle | croc | spiker (walk on the ground at `col`), bat | diver (fly at `row`),
//       piranha (sits in the pipe whose top row is `row`). min: 0 relaxed+, 1 normal+, 2 hard only
const enemy = (L, type, col, o = {}) => L.enemies.push({ type, col, ...o });
const wall = (L, col, rows = 1) => {
  for (let i = 0; i < rows; i++) put(L, col, 11 - i, 'B');
};
const spring = (L, col, row = 11) => put(L, col, row, 'S');
const spikes = (L, c1, c2, row = 11) => span(L, row, c1, c2, '^');
const crumble = (L, c1, c2, row) => span(L, row, c1, c2, 'C');
const belt = (L, c1, c2, dir) => span(L, GROUND_ROW, c1, c2, dir > 0 ? '>' : '<');
// moving platform, 3 tiles wide: axis 'x' or 'y', range in tiles, speed ~1 = slow
const mover = (L, col, row, axis, range, speed = 1, phase = 0) =>
  L.movers.push({ col, row, tiles: 3, axis, range, speed, phase });

// ============================================================================
// WORLD 1  "Reception"  - friendly tutorial: spring, first turtle, moving platform, a bat
// ============================================================================
function buildWorld1() {
  const L = newLevel(96, 14, { room: 'world1' });
  ground(L, [[45, 49], [83, 85]]);

  // reception + controls
  put(L, 3, 11, 'T');
  span(L, 11, 9, 11, 'D');
  npc(L, 'rita', 6);
  label(L, 1, 3, 'ARROWS  MOVE / JUMP');
  label(L, 1, 4, 'SHIFT+SIDE  RUN');
  label(L, 1, 5, 'SHIFT+UP  LONG JUMP');
  label(L, 1, 6, 'UP IN AIR  DOUBLE JUMP');
  label(L, 1, 7, 'DOWN ON PIPE  ENTER');
  put(L, 14, 11, 'f'); // 1

  // spring up to a high ledge
  spring(L, 18);
  label(L, 16, 9, 'BOUNCE!');
  span(L, 7, 20, 23, 'B');
  put(L, 21, 6, 'f'); // 2

  // turtle yard: stomp -> shell -> kick
  wall(L, 26);
  wall(L, 34);
  enemy(L, 'turtle', 30);
  label(L, 26, 7, 'STOMP, THEN KICK THE SHELL');
  put(L, 31, 9, 'f'); // 3

  npc(L, 'raju', 38);
  label(L, 40, 8, 'TOOLKIT ROOM');
  pipe(L, 41, 2, 'a', { room: 'bonus', pipe: 'b' });

  // pit with a moving platform
  mover(L, 46, 11, 'x', 1.2, 1.1);
  label(L, 44, 8, 'RIDE THE PLATFORM');
  put(L, 47, 8, 'f'); // 4
  put(L, 52, 11, 'F');

  // bat over a ledge
  enemy(L, 'bat', 58, { row: 7, range: 3 });
  span(L, 10, 59, 62, 'B');
  put(L, 60, 9, 'f'); // 5

  // little hill
  [1, 2, 3, 2, 1].forEach((h, i) => {
    for (let r = GROUND_ROW - h; r < GROUND_ROW; r++) put(L, 66 + i, r, 'B');
  });
  put(L, 68, 8, 'f'); // 6

  // spiker yard: do NOT stomp the spiky one
  wall(L, 72);
  wall(L, 80);
  enemy(L, 'spiker', 76);
  label(L, 73, 6, "SPIKY! DON'T STOMP");
  span(L, 8, 75, 77, 'B');
  put(L, 76, 7, 'f'); // 7

  // spring launch over the last pit
  spring(L, 82);
  put(L, 84, 6, 'f'); // 8
  span(L, 10, 87, 90, 'B');
  put(L, 88, 9, 'f'); // 9
  put(L, 91, 11, 'f'); // 10
  npc(L, 'meera', 93, -1, true, 'meera');
  put(L, 95, 11, 'G');
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

// ============================================================================
// WORLD 2  "Training Campus" - four classrooms, each with its own mechanic
// ============================================================================
function buildWorld2() {
  const L = newLevel(112, 14, { room: 'world2', world: 1, bg: 0xa4e4fc });
  ground(L, [[21, 26]]);
  belt(L, 84, 92, -1);
  L.campus = true;
  L.stations = [
    { name: 'COLORS', title: 'BSC MULTIMEDIA', years: '2013-2016', from: 8, to: 31, gateCol: 31, kind: 'swatch',
      objective: 'COLLECT 3 COLOUR SWATCHES' },
    { name: 'BUGS', title: 'MA JOURNALISM', years: '2018-2020', from: 32, to: 55, gateCol: 55, kind: 'bug',
      objective: 'STOMP 3 TYPO BUGS' },
    { name: 'IDEAS', title: 'IIT DELHI', years: '2021-2022', from: 56, to: 79, gateCol: 79, kind: 'bulb',
      objective: 'FIND 3 IDEAS (ONE IS HIDDEN)' },
    { name: 'DATA', title: 'DATA SCIENCE', years: '2023-2024', from: 80, to: 103, gateCol: 103, kind: 'node',
      objective: 'COLLECT NODES IN ORDER 1-2-3-4' },
  ];

  // entrance
  npc(L, 'prof', 5, -1, true, 'prof');
  put(L, 2, 11, 'K');
  put(L, 3, 11, 'K');
  put(L, 8, 11, 'T');

  // 1. colour lab: crumbling tiles
  label(L, 10, 3, 'DEGREE 1/4');
  label(L, 10, 4, 'BSC MULTIMEDIA');
  label(L, 12, 6, 'CRUMBLING!');
  crumble(L, 12, 14, 9);
  put(L, 13, 8, 's');
  crumble(L, 18, 20, 7);
  put(L, 19, 6, 's');
  put(L, 22, 11, 'C');
  put(L, 24, 11, 'C');
  put(L, 24, 9, 's');
  put(L, 28, 11, 'F');
  put(L, 30, 11, 'T');

  // 2. newsroom: bugs + a flying spam bat
  label(L, 35, 3, 'DEGREE 2/4');
  label(L, 35, 4, 'MA JOURNALISM');
  wall(L, 34);
  wall(L, 53);
  [40, 45, 49].forEach((c) => put(L, c, 11, 'b'));
  enemy(L, 'bat', 44, { row: 6, range: 4 });
  span(L, 8, 37, 40, 'B');
  span(L, 8, 47, 50, 'B');
  put(L, 52, 11, 'F');

  // 3. idea lab: spikes, a moving platform, a spring
  label(L, 58, 3, 'DEGREE 3/4');
  label(L, 58, 4, 'IIT DELHI');
  span(L, 10, 59, 62, 'B');
  put(L, 60, 9, 'i');
  spikes(L, 64, 69);
  label(L, 63, 8, 'SPIKES! RIDE OVER');
  mover(L, 65, 9, 'x', 1.6, 1.1);
  span(L, 10, 70, 72, 'B');
  spring(L, 73);
  span(L, 7, 74, 77, 'B');
  put(L, 75, 6, 'i');
  label(L, 77, 9, 'SECRET ROOM');
  pipe(L, 77, 2, 'a', { room: 'lab', pipe: 'b' });
  put(L, 57, 11, 'F');

  // 4. data centre: conveyor belts push you back, a croc guards the end
  label(L, 82, 3, 'DEGREE 4/4');
  label(L, 82, 4, 'DATA SCIENCE');
  span(L, 10, 83, 86, 'B');
  put(L, 84, 9, '1');
  span(L, 8, 88, 91, 'B');
  put(L, 89, 7, '3');
  span(L, 10, 94, 97, 'B');
  put(L, 95, 9, '2');
  span(L, 8, 99, 102, 'B');
  put(L, 100, 7, '4');
  wall(L, 93);
  wall(L, 102);
  enemy(L, 'croc', 98);
  put(L, 81, 11, 'F');

  // graduation
  npc(L, 'prof', 107, -1, true, 'profEnd');
  put(L, 105, 11, 'T');
  put(L, 109, 11, 'K');
  put(L, 111, 11, 'G');
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

// ============================================================================
// WORLD 3  "Office Floors" - five floors, five different mechanics
// ============================================================================
const FLOOR_BG = [0x3cbcfc, 0x58b0f8, 0x6888fc, 0xf8a060, 0x6844fc];
const FLOOR_SPEC = [
  { w: 76, gate: 66, skill: 'STAKEHOLDER COLLABORATION', npc: 'sam', badges: true },
  { w: 72, gate: 62, arena: [38, 59], boss: { col: 49, hp: 2, name: 'THE VAGUE BRIEF' }, skill: 'BRAND IDENTITY', npc: 'meera' },
  { w: 72, gate: 62, arena: [42, 59], boss: { col: 51, hp: 2, name: 'THE DEADLINE CLOCK' }, skill: 'MARKETING & CAMPAIGN DESIGN', npc: 'rita' },
  { w: 72, gate: 62, arena: [42, 59], boss: { col: 51, hp: 3, name: 'THE OFF-BRAND BEAST' }, skill: 'CREATIVE TEAM LEADERSHIP', npc: 'sam', team: true },
  { w: 88, gate: 72, arena: [46, 69], boss: { col: 58, hp: 3, name: 'THE 100-SLIDE DECK' }, skill: 'EXECUTIVE PRESENTATIONS', npc: 'ceo', goal: true },
];

function buildFloor(k) {
  const f = FLOOR_SPEC[k];
  const L = newLevel(f.w, 14, { room: `floor${k + 1}`, world: 2, bg: FLOOR_BG[k] });
  const dlg = `floor${k + 1}`;
  npc(L, f.npc, 7, -1, true, dlg);
  if (f.team) npc(L, 'rita', 11, -1, false, 'cheer');
  put(L, 4, 11, k % 2 ? 'K' : 'T');
  put(L, 10, 11, 'D');

  if (k === 0) {
    // FREELANCE: moving platforms, a spring, four client badges
    ground(L, [[31, 36]]);
    enemy(L, 'bat', 20, { row: 7, range: 3 });
    span(L, 10, 13, 16, 'B');
    put(L, 14, 9, 'k');
    spring(L, 22);
    span(L, 6, 24, 28, 'B');
    put(L, 26, 5, 'k');
    put(L, 38, 11, 'F');
    mover(L, 32, 11, 'x', 1.7, 1.1);
    span(L, 10, 39, 42, 'B');
    put(L, 40, 9, 'k');
    wall(L, 45);
    wall(L, 53);
    enemy(L, 'turtle', 49);
    [[10, 55, 57], [8, 58, 60], [6, 61, 63], [8, 64, 65]].forEach(([r, a, b]) => span(L, r, a, b, 'B'));
    put(L, 62, 5, 'k');
    label(L, 12, 5, 'FREELANCE  2013-2016');
    [[18, 11], [30, 9], [47, 9]].forEach(([c, r]) => put(L, c, r, 'o'));
  } else if (k === 1) {
    // BHOOMI: conveyor belts against you, spikes, a turtle yard
    ground(L);
    belt(L, 12, 22, -1);
    span(L, 9, 13, 15, 'B');
    span(L, 9, 18, 20, 'B');
    [14, 19].forEach((c) => put(L, c, 8, 'o'));
    spikes(L, 25, 27);
    span(L, 8, 24, 28, 'B');
    put(L, 26, 7, 'c');
    wall(L, 30);
    wall(L, 36);
    enemy(L, 'turtle', 33);
    put(L, 31, 11, 'o');
  } else if (k === 2) {
    // DELOITTE: flying hawks + a crumbling bridge
    ground(L, [[32, 38]]);
    crumble(L, 32, 38, 11);
    enemy(L, 'diver', 16, { row: 5 });
    enemy(L, 'bat', 25, { row: 6, range: 3 });
    enemy(L, 'diver', 28, { row: 5, min: 2 });
    span(L, 10, 12, 15, 'B');
    span(L, 8, 20, 23, 'B');
    put(L, 21, 7, 'c');
    put(L, 30, 11, 'F');
    [[13, 9], [14, 9], [22, 7]].forEach(([c, r]) => put(L, c, r, 'o'));
  } else if (k === 3) {
    // JLL: springs and crocs (leading a team means knowing when to bounce back)
    ground(L);
    spring(L, 14);
    span(L, 5, 16, 19, 'B');
    put(L, 17, 4, 'c');
    spring(L, 26);
    span(L, 6, 28, 31, 'B');
    put(L, 29, 5, 'o');
    put(L, 30, 5, 'o');
    wall(L, 19);
    wall(L, 25);
    enemy(L, 'croc', 22);
    wall(L, 34);
    wall(L, 40);
    enemy(L, 'croc', 37);
  } else {
    // WSP: the grand finale of the office - pipes with piranhas, a moving platform, a hawk
    ground(L, [[32, 37]]);
    pipe(L, 14, 2);
    enemy(L, 'piranha', 14, { row: 10 });
    pipe(L, 24, 3);
    enemy(L, 'piranha', 24, { row: 9 });
    mover(L, 33, 11, 'x', 1.7, 1);
    enemy(L, 'diver', 30, { row: 5 });
    span(L, 8, 18, 21, 'B');
    put(L, 19, 7, 'c');
    span(L, 9, 27, 29, 'B');
    wall(L, 38);
    wall(L, 44);
    enemy(L, 'turtle', 41);
    put(L, 30, 11, 'F');
  }

  if (f.arena) {
    const [a, b] = f.arena;
    wall(L, a, 2);
    wall(L, b, 2);
    label(L, a + 2, 5, f.boss.name);
  }
  if (!f.arena) put(L, f.gate - 4, 11, 'F');
  put(L, f.gate + 3, 11, 'E');
  L.office = {
    floor: k,
    kind: f.badges ? 'clients' : 'boss',
    gateCol: f.gate,
    elevCol: f.gate + 3,
    boss: f.boss,
    skill: f.skill,
    goal: !!f.goal,
  };
  if (f.goal) {
    put(L, f.gate + 8, 11, 'G');
    npc(L, 'ceo', f.gate + 5, -1, true, 'floor5End');
    L.grid[11][f.gate + 3] = '.';
    L.office.elevCol = null;
  }
  return L;
}

// ============================================================================
// WORLD 4  "Skill Arcade" - three cabinets, three different gauntlets
// ============================================================================
function buildWorld4() {
  const L = newLevel(122, 14, { room: 'world4', world: 3, bg: 0x2a1a5c });
  ground(L, [[29, 33], [52, 58], [66, 70]]);
  belt(L, 86, 96, 1);
  L.arcade = true;
  npc(L, 'ravi', 5, -1, true, 'skill1');
  put(L, 3, 11, 'T');

  // Cabinet 1 - design craft: springs and crumbling stepping stones
  put(L, 9, 11, 'M');
  label(L, 11, 3, 'CABINET 1');
  label(L, 11, 4, 'DESIGN CRAFT');
  span(L, 10, 14, 17, 'B');
  put(L, 15, 9, 'u');
  spring(L, 20);
  span(L, 6, 22, 25, 'B');
  put(L, 23, 5, 'u');
  crumble(L, 29, 33, 11);
  enemy(L, 'bat', 28, { row: 7, range: 3 });
  span(L, 10, 36, 39, 'B');
  put(L, 37, 9, 'u');
  label(L, 40, 8, 'BONUS ROOM');
  pipe(L, 42, 2, 'a', { room: 'arc1', pipe: 'r' });
  put(L, 46, 11, 'F');

  // Cabinet 2 - leadership & impact: moving platforms over pits, a hawk
  put(L, 48, 11, 'N');
  label(L, 50, 3, 'CABINET 2');
  label(L, 50, 4, 'LEADERSHIP & IMPACT');
  mover(L, 54, 11, 'x', 1.5, 1.1);
  put(L, 55, 7, 'v');
  mover(L, 67, 11, 'x', 1.5, 1.0);
  span(L, 9, 61, 64, 'B');
  put(L, 62, 8, 'v');
  enemy(L, 'diver', 60, { row: 5 });
  span(L, 10, 71, 74, 'B');
  put(L, 72, 9, 'v');
  put(L, 75, 11, 'c');
  enemy(L, 'turtle', 78);
  wall(L, 76);
  wall(L, 82);
  label(L, 79, 8, 'BONUS ROOM');
  pipe(L, 84, 2, 'b', { room: 'arc2', pipe: 'r' });
  put(L, 60, 11, 'F');

  // Cabinet 3 - toolkit: conveyor + spikes gauntlet, a croc
  put(L, 87, 11, 'O');
  label(L, 89, 3, 'CABINET 3');
  label(L, 89, 4, 'TOOLKIT');
  span(L, 10, 88, 91, 'B');
  put(L, 89, 9, 'w');
  span(L, 7, 93, 96, 'B');
  put(L, 94, 6, 'w');
  spikes(L, 98, 99);
  span(L, 10, 101, 104, 'B');
  put(L, 102, 9, 'w');
  spring(L, 106);
  span(L, 6, 108, 111, 'B');
  put(L, 109, 5, 'w');
  wall(L, 100);
  wall(L, 105);
  enemy(L, 'croc', 102);
  label(L, 113, 8, 'BONUS ROOM');
  pipe(L, 112, 2, 'c', { room: 'arc3', pipe: 'r' });
  put(L, 86, 11, 'F');

  npc(L, 'ravi', 117, -1, true, 'skillEnd');
  put(L, 115, 11, 'T');
  put(L, 120, 11, 'G');
  return L;
}

function buildArcadeRoom(n, ch, name, count) {
  const L = newLevel(20, 14, { bg: 0x101830, theme: 'underground', room: `arc${n}`, world: 3 });
  ground(L);
  L.arcadeRoom = true;
  span(L, 0, 0, 19, 'B');
  span(L, 1, 0, 19, 'B');
  label(L, 2, 3, 'BONUS ROOM');
  label(L, 2, 4, name);
  const xs = count === 1 ? [8] : [6, 11];
  xs.forEach((c) => put(L, c, 9, ch));
  pipe(L, 16, 2, 'r', { room: 'world4', pipe: ['a', 'b', 'c'][n - 1] });
  return L;
}

// ============================================================================
// WORLD 5  "Trophy Hall" - hit 5 ? blocks from below; crocs, bats and a turtle patrol
// ============================================================================
function buildWorld5() {
  const L = newLevel(88, 14, { room: 'world5', world: 4, bg: 0x2a0a22, theme: 'hall' });
  ground(L);
  L.hall = true;
  span(L, 1, 0, 87, 'V');
  npc(L, 'curator', 6, -1, true, 'curator');
  put(L, 3, 11, 'Y');
  [[16, 8], [28, 7], [40, 8], [52, 7], [64, 8]].forEach(([c, r], i) => {
    put(L, c, r, 'Q');
    put(L, c, 11, 'D');
    put(L, c, 10, 'Y');
    label(L, c - 2, 3, `CERTIFICATE ${i + 1}/5`);
  });
  [[20, 9], [22, 9], [34, 9], [46, 9], [58, 9], [60, 9]].forEach(([c, r]) => put(L, c, r, 'o'));
  enemy(L, 'bat', 22, { row: 5, range: 3 });
  wall(L, 31);
  wall(L, 37);
  enemy(L, 'croc', 34);
  enemy(L, 'bat', 46, { row: 5, range: 3, min: 2 });
  put(L, 25, 11, 'c');
  put(L, 44, 11, 'F');
  wall(L, 56);
  wall(L, 61);
  enemy(L, 'turtle', 58);
  put(L, 70, 11, 'Y');
  npc(L, 'curator', 76, -1, true, 'curatorEnd');
  put(L, 84, 11, 'G');
  return L;
}

// ============================================================================
// WORLD 6  "Dragon's Lair" - the Deadline Dragon (see systems/dragon.js)
// ============================================================================
function buildDragon() {
  const L = newLevel(54, 14, { room: 'dragon', world: 5, bg: 0x38101a, tint: 0xff8060 });
  ground(L);
  L.dragon = { col: 41, gateCol: 49 };
  npc(L, 'meera', 6, -1, true, 'dragonIntro');
  put(L, 3, 11, 'T');
  put(L, 11, 11, 'F');
  // safe platforms to hop onto while the flames sweep the floor
  span(L, 9, 14, 17, 'B');
  span(L, 7, 21, 24, 'B');
  span(L, 9, 28, 31, 'B');
  [[15, 8], [16, 8], [22, 6], [23, 6], [29, 8], [30, 8]].forEach(([c, r]) => put(L, c, r, 'o'));
  put(L, 20, 11, 'c');
  put(L, 52, 11, 'G');
  return L;
}

// ============================================================================
// WORLD 7  "Rooftop" - contact boards, the cheering cast, the "hire me" flagpole
// ============================================================================
function buildWorld6() {
  const L = newLevel(98, 14, { room: 'world6', world: 6, bg: 0xf87858, tint: 0xffb878 });
  ground(L);
  L.finale = true;
  npc(L, 'meera', 8, -1, true, 'rooftop');
  put(L, 4, 11, 'T');
  board(L, 16, 0, 'bLinkedIn');
  board(L, 22, 1, 'bEmail');
  board(L, 28, 2, 'bPhone');
  if (CLASSIC_RESUME_URL) board(L, 34, 3, 'bResume');
  [13, 19, 25, 31, 37].forEach((c) => put(L, c, 11, 'T'));
  [[18, 9], [20, 9], [24, 9], [26, 9], [30, 9], [32, 9]].forEach(([c, r]) => put(L, c, r, 'o'));
  put(L, 42, 11, 'F');
  label(L, 44, 6, 'HOW TO REACH ME');
  span(L, 10, 46, 49, 'B');
  span(L, 8, 52, 55, 'B');
  [[47, 9], [48, 9], [53, 7], [54, 7]].forEach(([c, r]) => put(L, c, r, 'o'));
  board(L, 60, 4, 'bHire', true);
  ['rita', 'raju', 'prof', 'ceo', 'sam', 'ravi', 'curator'].forEach((id, i) => cheer(L, id, 67 + i * 3));
  put(L, 92, 11, 'P');
  label(L, 84, 5, 'RAISE THE FLAG!');
  return L;
}

export const LEVELS = {
  world1: buildWorld1(),
  bonus: buildBonus(),
  world2: buildWorld2(),
  lab: buildLab(),
  world4: buildWorld4(),
  arc1: buildArcadeRoom(1, 'u', 'DESIGN CRAFT', 2),
  arc2: buildArcadeRoom(2, 'v', 'LEADERSHIP & IMPACT', 1),
  arc3: buildArcadeRoom(3, 'w', 'TOOLKIT', 2),
  world5: buildWorld5(),
  dragon: buildDragon(),
  world6: buildWorld6(),
  ...Object.fromEntries([0, 1, 2, 3, 4].map((k) => [`floor${k + 1}`, buildFloor(k)])),
};

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
