// Pocket Edition levels (stage 4 is the PlaneScene, so it has no level here).
import { H, LEVELS } from '../levels.js';
import { OVERVIEW_CARDS, EXPERIENCE_CARDS, STUDIES } from './content.js';

const { newLevel, put, span, ground, pipe, label, npc, board, cheer, enemy, spring, spikes, crumble, wall } = H;

// ---------------------------------------------------------------- Stage 1: overview
function buildPk1() {
  const L = newLevel(76, 14, { room: 'pk1', world: 9, bg: 0x3cbcfc });
  ground(L, [[46, 48]]);
  Object.assign(L, { pocket: 1, cards: OVERVIEW_CARDS, cardTitle: 'FACT', fx: true, hud: '', chapterBanner: { title: 'STAGE 1', sub: 'OVERVIEW' } });
  npc(L, 'rita', 7, -1, true, 'pk1Rita');
  label(L, 12, 5, 'COINS TELL HIS STORY');
  span(L, 10, 12, 16, 'o');
  put(L, 18, 9, 'f'); // card 1: needs a jump
  spring(L, 22);
  span(L, 7, 24, 27, 'B');
  put(L, 25, 6, 'f'); // card 2: up the spring
  label(L, 20, 9, 'BOUNCE!');
  pipe(L, 32, 2);
  span(L, 8, 32, 33, 'o');
  enemy(L, 'turtle', 38);
  label(L, 36, 8, 'STOMP IT');
  span(L, 9, 41, 44, 'B');
  put(L, 42, 8, 'f'); // card 3
  put(L, 43, 11, 'c');
  label(L, 45, 7, 'JUMP THE GAP');
  put(L, 51, 11, 'F');
  span(L, 8, 53, 57, 'B');
  put(L, 55, 7, 'f'); // card 4
  span(L, 10, 59, 62, 'o');
  npc(L, 'meera', 66, -1, true, 'pk1End');
  put(L, 73, 11, 'G');
  L.decor = [
    { t: 'tree', col: 4 }, { t: 'plant', col: 10 }, { t: 'bush', col: 19 }, { t: 'torch', col: 29 }, { t: 'fern', col: 35 }, { t: 'tree', col: 40, front: false },
    { t: 'plant', col: 50 }, { t: 'torch', col: 58 }, { t: 'bush', col: 64 }, { t: 'tree', col: 70 }, { t: 'fern', col: 75 },
  ];
  return L;
}

// ---------------------------------------------------------------- Stage 2: studies (4 gates) + work (5 organisations)
function buildPk2() {
  const L = newLevel(132, 14, { room: 'pk2', world: 9, bg: 0x58b0f8 });
  ground(L);
  Object.assign(L, {
    pocket: 2, cards: EXPERIENCE_CARDS, cardTitle: 'FLOOR', fx: true, hud: 'STUDIES 0/4',
    chapterBanner: { title: 'STAGE 2', sub: 'EDUCATION AND WORK' },
    eduGates: [0, 1, 2, 3].map((k) => ({ k, col: 33 + k * 22 })),
  });
  npc(L, 'prof', 7, -1, true, 'pk2Prof');
  const gate = (k) => {
    const g = 33 + k * 22;
    pipe(L, g - 8, 2, `e${k}`, { room: `pkm${k + 1}`, pipe: 'r' });
    label(L, g - 13, 4, `STUDY ${k + 1}/4`);
    label(L, g - 13, 5, STUDIES[k].short);
    label(L, g - 10, 8, 'MINI-GAME');
    span(L, 10, g - 17, g - 14, 'o');
  };
  [0, 1, 2, 3].forEach(gate);
  // a little variety between the gates
  enemy(L, 'turtle', 24);
  span(L, 8, 41, 45, 'B');
  enemy(L, 'bat', 50, { row: 7, range: 3 });
  put(L, 55, 11, 'F');
  spring(L, 62);
  span(L, 6, 64, 67, 'B');
  span(L, 5, 64, 67, 'o');
  enemy(L, 'turtle', 76);
  span(L, 8, 80, 84, 'B');
  put(L, 77, 11, 'F');
  enemy(L, 'bat', 90, { row: 6, range: 3 });
  // work corridor
  npc(L, 'sam', 105, -1, true, 'pk2Sam');
  label(L, 108, 3, 'FIVE ORGANISATIONS');
  [[110, 9], [114, 8], [118, 9], [122, 8], [126, 9]].forEach(([c, r], i) => {
    span(L, r + 1, c - 1, c + 1, 'B');
    put(L, c, r, 'f');
    label(L, c - 2, r - 3, ['FREELANCE', 'BHOOMI', 'DELOITTE', 'JLL', 'WSP'][i]);
  });
  enemy(L, 'turtle', 112);
  enemy(L, 'turtle', 124);
  put(L, 130, 11, 'G');
  L.decor = [
    { t: 'tree', col: 4 }, { t: 'plant', col: 13 }, { t: 'bush', col: 22 }, { t: 'torch', col: 18 }, { t: 'fern', col: 29 },
    { t: 'plant', col: 38 }, { t: 'torch', col: 47 }, { t: 'tree', col: 52 }, { t: 'bush', col: 60 }, { t: 'fern', col: 70 },
    { t: 'plant', col: 80 }, { t: 'torch', col: 86 }, { t: 'tree', col: 94 }, { t: 'bush', col: 100 }, { t: 'torch', col: 108 },
    { t: 'plant', col: 116 }, { t: 'fern', col: 121 }, { t: 'tree', col: 128 },
  ];
  return L;
}

// the four mini-game rooms behind the pipes
function buildStudyRoom(k) {
  const L = newLevel(20, 14, { bg: 0x101830, theme: 'underground', room: `pkm${k + 1}`, world: 9 });
  ground(L);
  span(L, 0, 0, 19, 'B');
  span(L, 1, 0, 19, 'B');
  const games = ['memory', 'whack', 'lights', 'rhythm'];
  const names = ['TOOL MEMORY', 'TYPO SQUASH', 'IDEA LAB', 'SHORTCUT BEAT'];
  Object.assign(L, { mini: games[k], edu: k, noBreak: true, music: ['cave'] });
  label(L, 2, 2, `STUDY ${k + 1}: ${STUDIES[k].short}`);
  pipe(L, 16, 2, 'r', { room: 'pk2', pipe: `e${k}` });
  return L;
}

// ---------------------------------------------------------------- Stage 3: underwater skills
function buildPk3() {
  const L = newLevel(112, 14, { room: 'pk3', world: 9, bg: 0x1c4a9c, theme: 'water' });
  ground(L);
  Object.assign(L, {
    pocket: 3, water: true, gun: true, fx: true, hud: 'SKILLS 0/9', music: ['cave', 0],
    tileTex: { '#': 'tile-sand', d: 'tile-sandd', B: 'tile-coral' },
    chapterBanner: { title: 'STAGE 3', sub: 'SKILLS UNDERWATER' },
    sea: { arena: [80, 103], gateCol: 106 },
  });
  L.spawn = { col: 3, row: 7 };
  npc(L, 'ravi', 9, -1, true, 'pk3Intro');
  // coral steps and rocks to rest on
  span(L, 10, 14, 16, 'B');
  span(L, 9, 30, 33, 'B');
  span(L, 10, 46, 48, 'B');
  span(L, 8, 58, 61, 'B');
  span(L, 10, 70, 72, 'B');
  [[12, 7], [13, 7], [26, 6], [27, 6], [41, 8], [54, 6], [55, 6], [66, 8], [76, 7]].forEach(([c, r]) => put(L, c, r, 'o'));
  // six fish, each carries one skill; jellyfish between them
  [[20, 6], [29, 7], [38, 5], [50, 7], [60, 6], [70, 5]].forEach(([c, r], i) => enemy(L, 'fish', c, { row: r, range: 3 + (i % 2), skill: i }));
  [[25, 6], [44, 7], [56, 5], [66, 7]].forEach(([c, r]) => enemy(L, 'jelly', c, { row: r }));
  put(L, 40, 11, 'F');
  put(L, 77, 11, 'F');
  label(L, 78, 4, 'FISH DRAGON AHEAD');
  put(L, 109, 11, 'G');
  L.decor = [];
  [5, 11, 17, 23, 27, 35, 36, 43, 52, 57, 63, 68, 75, 92, 98].forEach((c, i) => L.decor.push({ t: i % 3 === 1 ? 'coral' : 'kelp', col: c }));
  [12, 24, 50, 64, 85, 100].forEach((c) => L.decor.push({ t: 'fern', col: c }));
  return L;
}

// ---------------------------------------------------------------- Stage 5: links (hop and collect stars)
function buildPk5() {
  const L = newLevel(100, 14, { room: 'pk5', world: 9, bg: 0xf87858, tint: 0xffb878 });
  ground(L, [[42, 47], [52, 57]]);
  Object.assign(L, { pocket: 5, stars: true, finale: true, fx: true, hud: '', chapterBanner: { title: 'STAGE 5', sub: 'LINKS' } });
  npc(L, 'rita', 7, -1, true, 'pk5Intro');
  board(L, 14, 0, 'bLinkedIn');
  board(L, 20, 1, 'bEmail');
  board(L, 26, 2, 'bPhone');
  board(L, 32, 3, 'bResume');
  label(L, 12, 5, 'HOW TO REACH APOORV');
  [10, 17, 23, 29, 35].forEach((c) => span(L, 10, c, c, 'o'));
  put(L, 38, 11, 'F');
  // hop across the sky: bricks you can also bump from below
  [[43, 9], [45, 8], [53, 9], [55, 8]].forEach(([c, r]) => {
    span(L, r, c, c + 1, 'B');
    put(L, c, r - 2, 'o');
    put(L, c + 1, r - 2, 'o');
  });
  span(L, 7, 48, 51, 'C');
  span(L, 5, 48, 51, 'o');
  put(L, 62, 11, 'F');
  [[64, 8], [67, 9]].forEach(([c, r]) => {
    span(L, r, c, c + 2, 'B');
    put(L, c + 1, r - 2, 'o');
  });
  board(L, 74, 4, 'bHire', true);
  ['rita', 'raju', 'prof', 'ceo', 'sam'].forEach((id, i) => cheer(L, id, 79 + i * 2));
  put(L, 94, 11, 'P');
  label(L, 86, 5, 'RAISE THE FLAG!');
  L.decor = [
    { t: 'tree', col: 4 }, { t: 'plant', col: 11 }, { t: 'torch', col: 13 }, { t: 'torch', col: 37 }, { t: 'bush', col: 40 },
    { t: 'fern', col: 60 }, { t: 'plant', col: 70 }, { t: 'torch', col: 72 }, { t: 'bush', col: 77 }, { t: 'torch', col: 91 }, { t: 'tree', col: 97 },
  ];
  return L;
}

export function registerPocketLevels() {
  Object.assign(LEVELS, {
    pk1: buildPk1(),
    pk2: buildPk2(),
    pkm1: buildStudyRoom(0),
    pkm2: buildStudyRoom(1),
    pkm3: buildStudyRoom(2),
    pkm4: buildStudyRoom(3),
    pk3: buildPk3(),
    pk5: buildPk5(),
  });
}
