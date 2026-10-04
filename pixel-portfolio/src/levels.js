// Levels are built in code from simple helpers (easy to read, no editor needed).
// Later days can swap these for Tiled JSON maps without touching the scenes.
//
// Grid characters:  . empty   # carpet(top)   d carpet(under)   B desk block
//   p q l r pipe pieces   o coin   f FACT coin   t TOOL coin   c coffee
//   F checkpoint   G goal door   T plant (decor)   D counter (decor)   K bookshelf (decor)
//   World 5: Q ? block (hit from below)   Y trophy   V curtain   World 6: P flagpole
//   World 4 skill coins: u (design) v (lead) w (tools)   M N O arcade cabinets (decor)
//   World 3 floors: k client badge   E elevator (decor)
//   World 2 tasks: s swatch   b typo bug   i idea bulb   1 2 3 4 data nodes (collect in order)
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
  label(L, 1, 7, 'UP IN AIR  DOUBLE JUMP');

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
  span(L, 8, 83, 85, 'B'); // steps back down, so you can always climb again
  put(L, 81, 5, 'i');
  label(L, 84, 5, 'SECRET ROOM');
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
  span(L, 10, 121, 122, 'B'); // step down on the far side
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

// World 3 "Office Floors": one room per role, climbed by elevator. Floor 1 = collect client
// badges; floors 2-5 = a boss tied to a real achievement (each stomp reveals one resume bullet).
const FLOOR_BG = [0x3cbcfc, 0x58b0f8, 0x6888fc, 0xf8a060, 0x6844fc];
const FLOOR_SPEC = [
  { w: 72, gate: 62, plats: [[10, 13, 16], [8, 25, 28], [10, 37, 40], [10, 45, 47], [8, 48, 50], [6, 51, 53], [8, 54, 56], [10, 57, 59]], npc: 'sam',
    skill: 'STAKEHOLDER COLLABORATION', badges: [[14, 9], [26, 7], [38, 9], [52, 5]] },
  { w: 84, gate: 72, arena: [51, 69], boss: { col: 60, hp: 2, name: 'THE VAGUE BRIEF' },
    plats: [[10, 12, 15], [8, 20, 23], [10, 28, 31], [8, 35, 38], [10, 42, 44]], coffee: [22, 7], npc: 'meera',
    skill: 'BRAND IDENTITY' },
  { w: 84, gate: 72, arena: [51, 69], boss: { col: 60, hp: 2, name: 'THE DEADLINE CLOCK' },
    plats: [[10, 12, 15], [8, 18, 21], [6, 24, 27], [8, 30, 33], [10, 36, 40], [8, 43, 46]], coffee: [26, 5], npc: 'rita',
    skill: 'MARKETING & CAMPAIGN DESIGN' },
  { w: 84, gate: 72, arena: [51, 69], boss: { col: 60, hp: 3, name: 'THE OFF-BRAND BEAST' },
    plats: [[10, 12, 14], [8, 17, 20], [10, 23, 26], [7, 29, 33], [10, 36, 39], [8, 42, 45]], coffee: [31, 6], npc: 'sam',
    team: true, skill: 'CREATIVE TEAM LEADERSHIP' },
  { w: 90, gate: 74, arena: [52, 70], boss: { col: 61, hp: 3, name: 'THE 100-SLIDE DECK' },
    plats: [[10, 12, 15], [8, 19, 22], [6, 26, 29], [8, 33, 36], [10, 39, 42], [8, 45, 48]], coffee: [27, 5], npc: 'ceo',
    skill: 'EXECUTIVE PRESENTATIONS', goal: true },
];

function buildFloor(k) {
  const f = FLOOR_SPEC[k];
  const L = newLevel(f.w, 14, { room: `floor${k + 1}`, world: 2, bg: FLOOR_BG[k] });
  ground(L);
  const dlg = `floor${k + 1}`;
  npc(L, f.npc, 7, -1, true, dlg);
  if (f.team) npc(L, 'rita', 11, -1, false, 'cheer');
  put(L, 4, 11, k % 2 ? 'K' : 'T');
  put(L, 10, 11, 'D');
  f.plats.forEach(([row, c1, c2]) => {
    span(L, row, c1, c2, 'B');
    if (!f.badges) for (let c = c1 + 1; c < c2; c += 2) put(L, c, row - 1, 'o');
  });
  if (f.coffee) put(L, f.coffee[0], f.coffee[1], 'c');
  (f.badges || []).forEach(([c, r]) => put(L, c, r, 'k'));
  if (f.badges) {
    [[18, 11], [30, 11], [42, 11]].forEach(([c, r]) => put(L, c, r, 'o'));
    label(L, 12, 5, 'FREELANCE  2013-2016');
  }
  put(L, f.gate - 6, 11, 'F');
  if (f.arena) {
    const [a, b] = f.arena;
    put(L, a, 11, 'B');
    put(L, a, 10, 'B');
    put(L, b, 11, 'B');
    put(L, b, 10, 'B');
    label(L, a + 2, 5, f.boss.name);
  }
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
    L.grid[11][f.gate + 3] = '.'; // top floor: no elevator, just the exit door
    L.office.elevCol = null;
  }
  return L;
}

// World 4 "Skill Arcade": three cabinets, 15 skill coins (some hidden in pipe rooms).
function buildWorld4() {
  const L = newLevel(158, 14, { room: 'world4', world: 3, bg: 0x2a1a5c });
  ground(L, [[30, 33], [70, 74], [124, 128]]);
  L.arcade = true;
  npc(L, 'ravi', 6, -1, true, 'skill1');
  put(L, 3, 11, 'T');

  // Cabinet 1: design craft
  put(L, 10, 11, 'M');
  label(L, 12, 3, 'CABINET 1');
  label(L, 12, 4, 'DESIGN CRAFT');
  span(L, 10, 15, 18, 'B');
  put(L, 16, 9, 'u');
  span(L, 8, 23, 26, 'B');
  put(L, 24, 7, 'u');
  span(L, 10, 35, 38, 'B');
  put(L, 36, 9, 'u');
  label(L, 40, 8, 'BONUS ROOM');
  pipe(L, 43, 2, 'a', { room: 'arc1', pipe: 'r' });
  put(L, 49, 11, 'F');

  // Cabinet 2: leadership & impact
  put(L, 56, 11, 'N');
  label(L, 58, 3, 'CABINET 2');
  label(L, 58, 4, 'LEADERSHIP & IMPACT');
  span(L, 10, 60, 63, 'B');
  put(L, 61, 9, 'v');
  span(L, 8, 64, 66, 'B');
  span(L, 6, 67, 69, 'B');
  put(L, 68, 5, 'v');
  span(L, 10, 79, 82, 'B');
  put(L, 80, 9, 'v');
  put(L, 76, 11, 'c');
  label(L, 87, 8, 'BONUS ROOM');
  pipe(L, 90, 2, 'b', { room: 'arc2', pipe: 'r' });
  put(L, 96, 11, 'F');

  // Cabinet 3: toolkit
  put(L, 104, 11, 'O');
  label(L, 106, 3, 'CABINET 3');
  label(L, 106, 4, 'TOOLKIT');
  span(L, 10, 108, 111, 'B');
  put(L, 109, 9, 'w');
  span(L, 8, 115, 118, 'B');
  put(L, 116, 7, 'w');
  span(L, 10, 130, 133, 'B');
  put(L, 131, 9, 'w');
  span(L, 8, 134, 136, 'B');
  span(L, 6, 137, 139, 'B');
  put(L, 138, 5, 'w');
  label(L, 141, 8, 'BONUS ROOM');
  pipe(L, 144, 2, 'c', { room: 'arc3', pipe: 'r' });
  put(L, 120, 11, 'F');

  npc(L, 'ravi', 149, -1, true, 'skillEnd');
  put(L, 152, 11, 'T');
  put(L, 155, 11, 'G');
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

// extra NPC kinds: signboards (contact info) and cheering cast
function board(L, col, frame, dlg, autoTalk = false) {
  L.npcs.push({ id: 'board', frame, dlg, x: col * TILE + 8, bottom: GROUND_ROW * TILE, face: -1, autoTalk, board: true });
}
function cheer(L, id, col) {
  L.npcs.push({ id, dlg: null, x: col * TILE + 8, bottom: GROUND_ROW * TILE, face: -1, autoTalk: false, cheer: true });
}

// World 5 "Trophy Hall": hit 5 ? blocks from below to release the certificates.
function buildWorld5() {
  const L = newLevel(100, 14, { room: 'world5', world: 4, bg: 0x2a0a22, theme: 'hall' });
  ground(L);
  L.hall = true;
  span(L, 1, 0, 99, 'V'); // velvet valance along the top
  npc(L, 'curator', 6, -1, true, 'curator');
  put(L, 3, 11, 'Y');
  [[16, 8], [30, 7], [44, 8], [58, 7], [72, 8]].forEach(([c, r], i) => {
    put(L, c, r, 'Q');
    put(L, c, 11, 'D');
    put(L, c, 10, 'Y');
    label(L, c - 2, 3, `CERTIFICATE ${i + 1}/5`);
  });
  [[22, 9], [24, 9], [37, 9], [38, 9], [51, 9], [52, 9], [65, 9], [66, 9]].forEach(([c, r]) => put(L, c, r, 'o'));
  put(L, 34, 11, 'c');
  put(L, 50, 11, 'F');
  put(L, 82, 11, 'Y');
  npc(L, 'curator', 86, -1, true, 'curatorEnd');
  put(L, 94, 11, 'G');
  return L;
}

// World 6 "Rooftop": contact boards, the cheering cast, and the "hire me" flagpole.
function buildWorld6() {
  const L = newLevel(122, 14, { room: 'world6', world: 5, bg: 0xf87858, tint: 0xffb878 });
  ground(L);
  L.finale = true;
  npc(L, 'meera', 8, -1, true, 'rooftop');
  put(L, 4, 11, 'T');
  board(L, 16, 0, 'bLinkedIn');
  board(L, 24, 1, 'bEmail');
  board(L, 32, 2, 'bPhone');
  if (CLASSIC_RESUME_URL) board(L, 40, 3, 'bResume');
  [12, 20, 28, 36, 44].forEach((c) => put(L, c, 11, 'T'));
  [[18, 9], [20, 9], [26, 9], [28, 9], [34, 9], [36, 9]].forEach(([c, r]) => put(L, c, r, 'o'));
  put(L, 52, 11, 'F');
  label(L, 54, 6, 'HOW TO REACH ME');
  span(L, 10, 56, 59, 'B');
  span(L, 8, 62, 65, 'B');
  [[57, 9], [58, 9], [63, 7], [64, 7]].forEach(([c, r]) => put(L, c, r, 'o'));
  board(L, 74, 4, 'bHire', true);
  ['rita', 'raju', 'prof', 'ceo', 'sam', 'ravi', 'curator'].forEach((id, i) => cheer(L, id, 84 + i * 3));
  put(L, 108, 11, 'P');
  label(L, 100, 5, 'RAISE THE FLAG!');
  return L;
}

export const LEVELS = {
  world1: buildWorld1(),
  bonus: buildBonus(),
  world2: buildWorld2(),
  lab: buildLab(),
  world5: buildWorld5(),
  world6: buildWorld6(),
  world4: buildWorld4(),
  arc1: buildArcadeRoom(1, 'u', 'DESIGN CRAFT', 2),
  arc2: buildArcadeRoom(2, 'v', 'LEADERSHIP & IMPACT', 1),
  arc3: buildArcadeRoom(3, 'w', 'TOOLKIT', 2),
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
