// Generates every Tiled-format map into public/maps/. Run: node tools/gen-maps.mjs
// The output is plain Tiled JSON (orthogonal, 16x16) - you can open/edit it in Tiled afterwards,
// or keep tweaking the layouts here. Coordinates below are TILE coordinates; the floor's top row is 12.
//
//   world1  INTRO        difficulty 1   10 fact coins, 2 bugs, one tiny pit
//   world2  EDUCATION    difficulty 2   3 classroom tasks (books / stomp / lever) -> 3 degrees, gates
//   world3  EXPERIENCE   difficulty 3   3 floors, each ends with a mini-boss + gate
//   world4  SKILLS       difficulty 4   4 coloured coin zones, moving platforms, long jumps, bonus pipe rooms
//   world5  AWARDS       difficulty 5   ? blocks -> certificates, printers, gaps, trophy hall
//   world6  FINAL BOSS   difficulty 5   single-screen arena: the Printer Monster (mouse-thrown paper planes)
//   world7  CONTACT      difficulty 1   rooftop, link terminals, HIRE ME flagpole -> credits
//   test-level / bonus-room             Day-1 "movement lab" (reachable with ?lab)
import { writeFileSync, mkdirSync } from 'node:fs';

const T = 16, G = 12;
export const TILE = {
  FLOOR_TOP: 1, FLOOR: 2, BRICK: 3, DESK: 4, PIPE_TL: 5, PIPE_TR: 6, PIPE_BL: 7, PIPE_BR: 8, WALL: 9, CEIL: 10,
  QBLOCK: 11, USED: 12, WOOD_TOP: 13, WOOD: 14, METAL_TOP: 15, METAL: 16, MARBLE_TOP: 17, MARBLE: 18,
  ROOF_TOP: 19, ROOF: 20, BOOK: 21, RACK: 22, LEDGE: 23, CRATE: 24,
};
const THEMES = {
  city:   { top: TILE.FLOOR_TOP,  fill: TILE.FLOOR,  plat: TILE.DESK },
  campus: { top: TILE.WOOD_TOP,   fill: TILE.WOOD,   plat: TILE.BOOK },
  office: { top: TILE.FLOOR_TOP,  fill: TILE.FLOOR,  plat: TILE.DESK },
  server: { top: TILE.METAL_TOP,  fill: TILE.METAL,  plat: TILE.RACK },
  gallery:{ top: TILE.MARBLE_TOP, fill: TILE.MARBLE, plat: TILE.LEDGE },
  sunset: { top: TILE.ROOF_TOP,   fill: TILE.ROOF,   plat: TILE.CRATE },
  none:   { top: TILE.FLOOR_TOP,  fill: TILE.FLOOR,  plat: TILE.DESK },
};
const px = (t) => t * T;
const mk = (v) => ({ name: '', type: typeof v === 'number' ? 'int' : 'string', value: v });

class Level {
  constructor(name, w, theme, mapProps = {}) {
    this.name = name; this.w = w; this.h = 14; this.theme = theme; this.t = THEMES[theme];
    this.mapProps = { theme, ...mapProps };
    const grid = () => Array.from({ length: this.h }, () => Array(w).fill(0));
    this.ground = grid(); this.pipes = grid(); this.objs = []; this.id = 1;
  }
  // ---- terrain
  floor(x0, x1, top = G, topTile = this.t.top, fillTile = this.t.fill) {
    for (let x = x0; x <= x1; x++) for (let y = top; y < this.h; y++) this.ground[y][x] = y === top ? topTile : fillTile;
  }
  plat(x, row, len, tile = this.t.plat) { for (let i = 0; i < len; i++) this.ground[row][x + i] = tile; }
  bricks(x, row, len) { this.plat(x, row, len, TILE.BRICK); }
  rect(x, y, w, h, tile) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.ground[j][i] = tile; }
  pipe(x, topRow, rows) {
    for (let r = 0; r < rows; r++) {
      this.pipes[topRow + r][x] = r === 0 ? TILE.PIPE_TL : TILE.PIPE_BL;
      this.pipes[topRow + r][x + 1] = r === 0 ? TILE.PIPE_TR : TILE.PIPE_BR;
    }
  }
  // ---- objects (all take tile coords)
  o(type, x, y, extra = {}, props = {}, name = '') {
    const properties = Object.entries(props).map(([k, v]) => ({ ...mk(v), name: k }));
    this.objs.push({ id: this.id++, name, type, x, y, width: 0, height: 0, rotation: 0, visible: true, ...(properties.length ? { properties } : {}), ...extra });
  }
  spawn(name, tx, row, props = {}) { this.o('spawn', px(tx) + 8, px(row), {}, props, name); }
  coin(tx, ty, props = {}) { this.o('coin', px(tx) + 8, px(ty) + 8, {}, props); }
  coffee(tx, ty) { this.o('coffee', px(tx) + 8, px(ty) + 8); }
  checkpoint(tx, row = G) { this.o('checkpoint', px(tx) + 8, px(row)); }
  goal(tx, row = G, props = {}) { this.o('goal', px(tx) + 8, px(row), {}, props, 'goal'); }
  sign(tx, row, props) { this.o('sign', px(tx) + 8, px(row), {}, props); }
  enemy(kind, tx, row, props = {}) { this.o('enemy', px(tx) + 8, px(row), {}, { kind, ...props }); }
  gate(tx, id, rows = 5) { this.o('gate', px(tx), px(G - rows), { width: T, height: rows * T }, { id }); }
  task(tx, row, props) { this.o('task', px(tx) + 8, px(row), {}, props); }
  book(tx, ty, task) { this.o('book', px(tx) + 8, px(ty) + 8, {}, { task }); }
  lever(tx, row, task) { this.o('lever', px(tx) + 8, px(row), {}, { task }); }
  qblock(tx, row, award) { this.o('qblock', px(tx), px(row), {}, { award }); }
  mplat(tx, row, dxTiles, dyTiles = 0, speed = 32) { this.o('mplat', px(tx), px(row), {}, { dx: dxTiles * T, dy: dyTiles * T, speed }); }
  trophy(tx, row, award) { this.o('trophy', px(tx) + 8, px(row), {}, { award }); }
  link(tx, row, kind) { this.o('link', px(tx) + 8, px(row), {}, { kind }); }
  deco(kind, tx, row) { this.o('deco', px(tx) + 8, px(row), {}, { kind }); }
  spring(tx, row) { this.o('spring', px(tx) + 8, px(row)); }
  star(tx, ty) { this.o('star', px(tx) + 8, px(ty) + 8); }
  hblock(tx, row) { this.o('hblock', px(tx), px(row)); }                       // invisible block: bump it from below, a star pops out
  crumble(tx, row, len, f) { this.o('crumble', px(tx), px(row), {}, { len, f }); }   // f = tile frame (platform gid - 1)
  laser(tx, row, rows, props = {}) { this.o('laser', px(tx) + 6, px(row), { width: 4, height: rows * T }, props); }
  printerboss(tx, row = G) { this.o('printerboss', px(tx) + 8, px(row)); }
  pipeLink(tx, topRow, target, spawn) { this.o('pipe', px(tx), px(topRow) - 2, { width: 32, height: 4 }, { target, spawn }); }

  json() {
    return {
      compressionlevel: -1, type: 'map', version: '1.10', tiledversion: '1.10.2', orientation: 'orthogonal', renderorder: 'right-down',
      infinite: false, width: this.w, height: this.h, tilewidth: T, tileheight: T, nextlayerid: 4, nextobjectid: this.id,
      properties: Object.entries(this.mapProps).map(([k, v]) => ({ ...mk(v), name: k })),
      tilesets: [{ firstgid: 1, name: 'tiles', image: 'tiles.png', imagewidth: 384, imageheight: 16, tilewidth: T, tileheight: T, columns: 24, tilecount: 24, margin: 0, spacing: 0 }],
      layers: [
        { id: 1, name: 'ground', type: 'tilelayer', width: this.w, height: this.h, x: 0, y: 0, opacity: 1, visible: true, data: this.ground.flat() },
        { id: 2, name: 'pipes', type: 'tilelayer', width: this.w, height: this.h, x: 0, y: 0, opacity: 1, visible: true, data: this.pipes.flat() },
        { id: 3, name: 'objects', type: 'objectgroup', draworder: 'topdown', x: 0, y: 0, opacity: 1, visible: true, objects: this.objs },
      ],
    };
  }
}

/** floor with holes: floors(L, 0, 95, [[60, 61]]) leaves a pit at tiles 60-61 */
function floors(L, x0, x1, holes = [], top = G) {
  let x = x0;
  for (const [a, b] of [...holes].sort((p, q) => p[0] - q[0])) { if (a > x) L.floor(x, a - 1, top); x = b + 1; }
  if (x <= x1) L.floor(x, x1, top);
}
const out = {};

// ====================================================================== WORLD 1: INTRO (difficulty 1)
{
  const L = new Level('world1', 96, 'city', { hud: 'facts', intro: 1 });
  floors(L, 0, 95, [[60, 61]]);
  L.spawn('start', 3, G);
  [[19, 9, 4], [26, 9, 4], [30, 7, 4], [45, 9, 3], [50, 7, 3], [70, 9, 4], [76, 7, 4], [82, 9, 3]].forEach(([x, r, n]) => L.plat(x, r, n));
  L.sign(5, 8, { dialogue: 'move' });
  L.sign(36, 8, { dialogue: 'bugs' });
  L.enemy('bug', 40, G, { range: 4 });
  L.enemy('bug', 66, G, { range: 4 });
  L.coffee(14, 10);
  L.checkpoint(48);
  // exactly 10 coins - each reveals an "about me" fact (never gated behind difficulty: all on the main path)
  [[9, 10], [15, 10], [20, 7], [28, 7], [31, 5], [39, 10], [46, 7], [51, 5], [60, 8], [77, 5]].forEach(([x, y], i) => L.coin(x, y, { fact: i }));
  L.hblock(88, 9);                       // SECRET: invisible block near the end - bump it from below for a star
  L.sign(89, 8, { dialogue: 'goal' });
  L.goal(92);
  [['lamp', 7], ['bench', 11], ['plant', 17], ['lamp', 34], ['vending', 54], ['plant', 65], ['bench', 73], ['lamp', 80], ['plant', 94]].forEach(([k, x]) => L.deco(k, x, G));
  out.world1 = L;
}

// ====================================================================== WORLD 2: EDUCATION (difficulty 2) - four degrees
{
  const L = new Level('world2', 172, 'campus', { hud: 'degrees', intro: 1 });
  floors(L, 0, 171, [[22, 23], [62, 63], [100, 101], [140, 141]]);
  L.spawn('start', 3, G);
  // --- classroom 1 (BSc): collect 5 books
  L.task(8, 9, { id: 't1', type: 'collect', need: 5, degree: 0, gate: 'g1', label: 'COLLECT 5 BOOKS' });
  [[14, 9, 3], [27, 9, 3], [32, 7, 3], [35, 9, 3]].forEach(([x, r, n]) => L.plat(x, r, n));
  [[10, 10], [15, 7], [28, 7], [33, 5], [37, 10]].forEach(([x, y]) => L.book(x, y, 't1'));
  L.enemy('bug', 18, G, { range: 2 });
  L.gate(40, 'g1');
  L.checkpoint(42);
  // --- classroom 2 (MA): stomp 3 bugs
  L.task(46, 9, { id: 't2', type: 'stomp', need: 3, degree: 1, gate: 'g2', label: 'STOMP 3 BUGS' });
  L.plat(51, 9, 3); L.plat(60, 7, 3); L.plat(66, 9, 4); L.plat(76, 9, 3);        // platforms sit beside the bugs' patrols, never over them
  [47, 56, 72].forEach((x) => L.enemy('bug', x, G, { task: 't2', range: 2 }));
  L.gate(84, 'g2');
  L.checkpoint(86);
  // --- classroom 3 (IIT Delhi): climb the stairs, pull the lever
  L.task(90, 9, { id: 't3', type: 'lever', need: 1, degree: 2, gate: 'g3', label: 'PULL THE LEVER' });
  L.plat(94, 10, 3); L.plat(99, 8, 3); L.plat(104, 6, 5);
  L.lever(107, 6, 't3');
  L.enemy('clock', 112, G, { range: 3 }); L.enemy('clock', 117, G, { range: 3 }); L.enemy('bug', 96, G, { range: 2 });
  L.hblock(112, 9);                      // SECRET star
  L.gate(122, 'g3');
  L.checkpoint(124);
  // --- classroom 4 (IIT Guwahati): springs! books on the high shelves
  L.task(128, 9, { id: 't4', type: 'collect', need: 5, degree: 3, gate: 'g4', label: 'COLLECT 5 BOOKS' });
  L.plat(128, 9, 3); L.plat(134, 7, 3); L.plat(146, 7, 4); L.plat(151, 9, 3);
  L.spring(144, G);                      // bounces you onto the 5-tile-high shelf
  [[126, 10], [129, 7], [147, 5], [149, 5], [152, 7]].forEach(([x, y]) => L.book(x, y, 't4'));
  L.enemy('clock', 132, G, { range: 2 }); L.enemy('clock', 156, G, { range: 2 });
  L.gate(162, 'g4');
  // coins (XP): 16
  [[8, 10], [22, 9], [23, 9], [52, 7], [61, 5], [63, 9], [77, 7], [95, 8], [100, 6], [106, 4], [110, 10], [118, 10], [135, 5], [141, 9], [142, 9], [158, 10]].forEach(([x, y]) => L.coin(x, y));
  L.coffee(60, 10);
  L.sign(165, 8, { dialogue: 'goal' });
  L.goal(167);
  [['cabinet', 6], ['globe', 12], ['bench', 20], ['whiteboard', 31], ['easel', 38], ['cabinet', 44], ['globe', 54], ['bench', 70], ['easel', 80], ['whiteboard', 90], ['cabinet', 120], ['globe', 126], ['bench', 138], ['easel', 160]]
    .forEach(([k, x]) => L.deco(k, x, G));
  out.world2 = L;
}

// ====================================================================== WORLD 3: EXPERIENCE (difficulty 3) - five floors, five bosses
{
  const L = new Level('world3', 232, 'office', { hud: 'bosses', intro: 1 });
  floors(L, 0, 231, [[24, 25], [66, 67], [108, 109], [120, 122], [154, 155], [166, 167], [196, 197], [206, 208]]);
  L.spawn('start', 3, G);
  const floor = (i, s, boss, kind, boost, gateX) => {      // helper: sign, checkpoint, boss and gate for floor i starting at tile s
    L.sign(s + 2, 8, { job: i });
    L.checkpoint(s + 1);
    L.enemy(kind, boss, G, { boss: i, gate: 'g' + (i + 1), range: 4, boost });
    L.gate(gateX, 'g' + (i + 1));
    L.checkpoint(boss - 7);
  };
  // floor 1 - Freelance
  L.plat(12, 9, 3); L.plat(18, 7, 3); L.plat(28, 9, 4); L.plat(34, 7, 3);
  [[14, 'bug'], [30, 'bug'], [38, 'bug'], [21, 'clock']].forEach(([x, k]) => L.enemy(k, x, G, { range: 2 }));
  floor(0, 3, 42, 'megabug', 1.0, 46);
  // floor 2 - Bhoomi
  L.plat(52, 9, 3); L.plat(60, 9, 3); L.plat(71, 9, 4); L.plat(78, 7, 3);
  [[54, 'bug'], [62, 'clock'], [74, 'clock']].forEach(([x, k]) => L.enemy(k, x, G, { range: 2 })); L.enemy('invite', 70, 8, {});
  L.hblock(82, 9);                       // SECRET star on floor 2
  floor(1, 48, 88, 'megaclock', 1.1, 92);
  // floor 3 - Deloitte
  L.plat(98, 9, 3); L.plat(104, 9, 3); L.plat(116, 9, 3); L.plat(120, 9, 3); L.plat(124, 7, 3);       // 119-122 hop over the 3-tile pit
  [[100, 'bug'], [112, 'clock'], [128, 'bug']].forEach(([x, k]) => L.enemy(k, x, G, { range: 2 })); L.enemy('spam', 103, G); L.enemy('invite', 114, 8, {});
  L.coffee(106, 10);
  floor(2, 94, 132, 'megainvite', 1.2, 138);
  // floor 4 - JLL
  L.plat(146, 9, 3); L.plat(152, 9, 4); L.plat(157, 7, 3); L.plat(168, 9, 3);
  [[144, 'bug'], [150, 'clock'], [172, 'clock']].forEach(([x, k]) => L.enemy(k, x, G, { range: 2 })); L.enemy('spam', 148, G); L.enemy('spam', 158, G); L.enemy('invite', 162, 6, {});
  L.hblock(176, 9);                      // SECRET star on floor 4
  floor(3, 140, 180, 'megabug', 1.3, 184);
  // floor 5 - WSP
  L.plat(190, 9, 3); L.plat(198, 9, 3); L.plat(204, 9, 6); L.plat(211, 7, 3);
  [[192, 'clock'], [212, 'bug']].forEach(([x, k]) => L.enemy(k, x, G, { range: 2 })); L.enemy('spam', 194, G); L.enemy('spam', 202, G); L.enemy('invite', 208, 7, {});
  floor(4, 186, 219, 'megaclock', 1.4, 224);
  // coins: 20 (4 per floor)
  [[13, 7], [19, 5], [29, 7], [35, 5], [53, 7], [61, 7], [72, 7], [79, 5], [99, 7], [105, 7], [121, 7], [125, 5],
   [147, 7], [153, 7], [158, 5], [169, 7], [191, 7], [199, 7], [205, 7], [212, 5]].forEach(([x, y]) => L.coin(x, y));
  L.sign(227, 8, { dialogue: 'goal' });
  L.goal(229);
  [['plant', 8], ['cooler', 16], ['whiteboard', 36], ['cabinet', 44], ['plant', 56], ['cooler', 66], ['whiteboard', 84], ['cabinet', 100], ['plant', 110], ['cooler', 130],
   ['whiteboard', 142], ['plant', 164], ['cabinet', 178], ['cooler', 188], ['plant', 200], ['whiteboard', 218]].forEach(([k, x]) => L.deco(k, x, G));
  out.world3 = L;
}

// ====================================================================== WORLD 4: SKILLS (difficulty 4)
{
  const L = new Level('world4', 192, 'server', { hud: 'skills', intro: 1 });
  // gaps: 30-37 moving platform | 62-66 long jump | 112-117 moving platform | 150-152 crumbling ledge
  floors(L, 0, 191, [[30, 37], [62, 66], [112, 117], [150, 152]]);
  L.spawn('start', 3, G);
  L.spawn('pipeA', 20.5, 10, { emerge: 1 }); L.spawn('pipeB', 100.5, 10, { emerge: 1 });   // .5 = centre of the 2-tile pipe
  L.pipe(20, 10, 2); L.pipeLink(20, 10, 'bonus-skills-a', 'in');
  L.pipe(100, 10, 2); L.pipeLink(100, 10, 'bonus-skills-b', 'in');
  L.sign(6, 8, { text: 'SKILL COINS HAVE\n4 COLOURS' });
  L.sign(16, 8, { text: 'PIPES = BONUS\nROOMS (DOWN)' });
  L.mplat(30, G, 6, 0, 30);
  L.plat(14, 9, 3); L.plat(24, 9, 3);
  L.enemy('bug', 10, G, { range: 3 }); L.enemy('bug', 27, G, { range: 1 }); L.enemy('clock', 40, G, { range: 3 });
  L.enemy('printer', 46, G); L.enemy('spam', 18, G);
  L.laser(44, 9, 3, { period: 2.8, on: 1.1, phase: 0 });
  [[15, 7], [25, 7], [33, 9], [41, 10]].forEach(([x, y]) => L.coin(x, y, { cat: 0 }));
  L.checkpoint(48);
  // zone 1
  L.plat(52, 9, 3); L.plat(57, 7, 3); L.plat(70, 9, 3); L.plat(76, 9, 3); L.plat(82, 7, 3);
  L.enemy('clock', 55, G, { range: 2 }); L.enemy('spam', 73, G); L.enemy('spam', 85, G); L.enemy('clock', 89, G, { range: 3 });
  L.enemy('printer', 60, G); L.enemy('bug', 79, G, { range: 2 }); L.enemy('spam', 57, G);
  L.spring(67, G); L.plat(68, 7, 3);                       // SECRET: spring up to the ledge...
  L.star(69, 5);                                           // ...where a star waits
  L.laser(90, 9, 3, { period: 3.0, on: 1.1, phase: 1.0 });
  [[58, 5], [64, 7], [71, 7], [83, 5]].forEach(([x, y]) => L.coin(x, y, { cat: 1 }));
  L.coffee(78, 10);
  L.checkpoint(94);
  // zone 2
  L.mplat(112, G, 4, 0, 34);
  L.plat(104, 9, 3); L.plat(120, 9, 3); L.plat(126, 7, 3); L.plat(132, 9, 3);
  L.enemy('spam', 98, G); L.enemy('spam', 108, G); L.enemy('invite', 122, 7, {}); L.enemy('invite', 134, 7, {}); L.enemy('clock', 125, G, { range: 2 });
  L.enemy('printer', 130, G); L.enemy('clock', 143, G, { range: 2 }); L.enemy('bug', 119, G, { range: 1 });
  L.laser(128, 9, 3, { period: 2.6, on: 1.0, phase: 0.5 }); L.laser(138, 9, 3, { period: 2.6, on: 1.0, phase: 1.8 });
  [[105, 7], [115, 9], [127, 5], [133, 7]].forEach(([x, y]) => L.coin(x, y, { cat: 2 }));
  L.checkpoint(140);
  // zone 3
  L.plat(145, 9, 3); L.plat(158, 9, 3); L.plat(164, 7, 3); L.plat(170, 9, 3);
  L.crumble(150, 9, 3, 21);                                // crumbling rack over the 3-tile pit
  L.crumble(160, 5, 2, 21);
  L.enemy('clock', 184, G, { range: 1 }); L.enemy('printer', 144, G); L.enemy('printer', 168, G); L.enemy('spam', 156, G); L.enemy('spam', 176, G); L.enemy('invite', 161, 7, {});
  L.enemy('clock', 148, G, { range: 1 }); L.enemy('clock', 180, G, { range: 2 });
  L.laser(174, 9, 3, { period: 2.8, on: 1.1, phase: 0.8 });
  [[146, 7], [152, 7], [165, 5], [171, 7]].forEach(([x, y]) => L.coin(x, y, { cat: 3 }));
  L.sign(186, 8, { dialogue: 'goal' });
  L.goal(188);
  [['fan', 8], ['cabinet', 12], ['fan', 34 - 8], ['crate', 42], ['fan', 56], ['cabinet', 62 - 4], ['fan', 92], ['crate', 96], ['fan', 108], ['cabinet', 124], ['fan', 146 - 2], ['crate', 178], ['fan', 184]]
    .forEach(([k, x]) => L.deco(k, x, G));
  out.world4 = L;
}
// bonus rooms for world 4 (3 coins each for two categories)
for (const [name, cats, back] of [['bonus-skills-a', [0, 1], 'pipeA'], ['bonus-skills-b', [2, 3], 'pipeB']]) {
  const L = new Level(name, 20, 'server', { hud: 'skills' });
  L.floor(0, 19, G); L.rect(0, 0, 20, 1, TILE.CEIL); L.rect(0, 1, 1, G - 1, TILE.WALL); L.rect(19, 1, 1, G - 1, TILE.WALL);
  L.plat(5, 9, 3, TILE.RACK); L.plat(10, 7, 3, TILE.RACK);
  L.pipe(16, 10, 2); L.pipeLink(16, 10, 'world4', back);
  L.spawn('in', 3, 2);
  L.sign(10, 4, { text: 'BONUS ROOM!' });
  [[4, 10, 0], [6, 8, 0], [8, 10, 0], [11, 6, 1], [13, 10, 1], [14, 8, 1]].forEach(([x, y, i]) => L.coin(x, y, { cat: cats[i] }));
  if (name === 'bonus-skills-b') L.hblock(9, 9);          // SECRET: a star hides in this bonus room
  out[name] = L;
}

// ====================================================================== WORLD 5: AWARDS (difficulty 5)
{
  const L = new Level('world5', 208, 'gallery', { hud: 'awards', intro: 1 });
  // gaps: 34-36 (crumbling ledge) | 52-56 long jump | 78-80 stepping stone | 96-102 moving platform | 120-122 ledge | 136-140 long jump
  floors(L, 0, 207, [[34, 36], [52, 56], [78, 80], [96, 102], [120, 122], [136, 140]]);
  L.spawn('start', 3, G);
  L.sign(6, 8, { text: 'BUMP THE ? BLOCKS\nFROM BELOW' });
  // award blocks sit on the main path, 3 tiles above the floor: walk under them and jump
  L.qblock(20, 9, 0); L.qblock(66, 9, 1); L.qblock(127, 9, 2);
  // section A
  L.plat(12, 9, 3); L.plat(40, 9, 3);
  L.crumble(34, 9, 3, 22);
  L.enemy('printer', 26, G); L.enemy('bug', 14, G, { range: 2 }); L.enemy('spam', 30, G); L.enemy('invite', 35, 7, {}); L.enemy('clock', 44, G, { range: 2 });
  L.enemy('printer', 8, G); L.enemy('spam', 42, G);
  L.laser(48, 9, 3, { period: 2.6, on: 1.0, phase: 0.4 });
  [[13, 7], [35, 7], [41, 7]].forEach(([x, y]) => L.coin(x, y));
  L.checkpoint(46);
  [[53, 8], [54, 7], [55, 8]].forEach(([x, y]) => L.coin(x, y));
  // section B
  L.plat(71, 9, 2); L.plat(84, 9, 3); L.plat(89, 7, 3);
  L.crumble(79, 10, 1, 22); L.crumble(60, 9, 3, 22);
  L.enemy('printer', 70, G); L.enemy('spam', 63, G); L.enemy('clock', 75, G, { range: 1 }); L.enemy('invite', 80, 8, {}); L.enemy('clock', 91, G, { range: 2 });
  L.enemy('bug', 58, G, { range: 1 }); L.enemy('clock', 84, G, { range: 1 });
  L.spring(86, G); L.plat(87, 7, 3); L.star(88, 5);        // SECRET: spring onto the ledge -> star
  L.laser(92, 9, 3, { period: 2.6, on: 1.0, phase: 1.3 });
  [[72, 7], [79, 8], [90, 5]].forEach(([x, y]) => L.coin(x, y));
  L.checkpoint(94);
  L.mplat(96, G, 5, 0, 34);
  L.enemy('invite', 99, 8, {});
  // section C
  L.plat(106, 9, 3); L.plat(114, 9, 3); L.plat(120, 9, 3); L.plat(130, 9, 3); L.plat(134, 7, 3);
  L.crumble(124, 7, 3, 22);
  L.enemy('printer', 108, G); L.enemy('bug', 116, G, { range: 2 }); L.enemy('spam', 124, G); L.enemy('invite', 128, 6, {}); L.enemy('clock', 133, G, { range: 2 });
  L.enemy('printer', 104, G); L.enemy('spam', 112, G); L.enemy('bug', 110, G, { range: 1 });
  L.laser(118, 9, 3, { period: 2.8, on: 1.1, phase: 0.2 });
  [[107, 7], [121, 7], [131, 7], [135, 5]].forEach(([x, y]) => L.coin(x, y));
  L.coffee(100, 10);
  L.checkpoint(134);
  [[137, 8], [138, 7], [139, 8]].forEach(([x, y]) => L.coin(x, y));
  // section D
  L.plat(144, 9, 3); L.plat(155, 9, 3); L.plat(160, 7, 3);
  L.enemy('printer', 148, G); L.enemy('spam', 143, G); L.enemy('clock', 153, G, { range: 2 }); L.enemy('invite', 158, 7, {});
  L.enemy('printer', 162, G); L.enemy('clock', 166, G, { range: 2 });
  L.hblock(150, 9);                       // SECRET star #2
  [[156, 7], [161, 5]].forEach(([x, y]) => L.coin(x, y));
  L.checkpoint(168);
  // trophy hall
  L.sign(172, 8, { text: 'TROPHY HALL' });
  [178, 188, 198].forEach((x, i) => L.trophy(x, G, i));
  L.sign(204, 8, { dialogue: 'goal' });
  L.goal(205);
  [['statue', 10], ['easel', 18], ['lamp', 28], ['statue', 42], ['easel', 64], ['plant', 74], ['statue', 108], ['lamp', 126], ['easel', 142], ['statue', 172], ['statue', 183], ['statue', 193], ['plant', 203]]
    .forEach(([k, x]) => L.deco(k, x, G));
  out.world5 = L;
}

// ====================================================================== WORLD 6: FINAL BOSS arena (difficulty 5) - one screen
{
  const L = new Level('world6', 16, 'boss', { boss: 1, intro: 1 });
  L.floor(0, 15, G, TILE.METAL_TOP, TILE.METAL);
  L.plat(1, 9, 3, TILE.RACK); L.plat(5, 8, 3, TILE.RACK); L.plat(9, 6, 2, TILE.RACK);     // keep the line of fire to the boss (floor level, right side) clear
  L.spawn('start', 2, G);
  L.hblock(4, 9);                        // SECRET: a star that grants immunity during the fight (bump it from the floor, left of the first shelf)
  L.printerboss(13, G);
  L.sign(8, 5, { text: 'AIM + CLICK TO THROW\nHOLD ENTER = AUTO' });
  out.world6 = L;
}

// ====================================================================== WORLD 7: CONTACT (difficulty 1) - the rooftop
{
  const L = new Level('world7', 128, 'sunset', { intro: 1 });
  floors(L, 0, 127);
  L.spawn('start', 3, G);
  L.sign(6, 8, { text: 'THE ROOFTOP\nSAY HELLO!' });
  [[12, 9, 3], [30, 9, 3], [50, 9, 3], [70, 9, 3], [92, 9, 3], [98, 7, 3]].forEach(([x, r, n]) => L.plat(x, r, n));
  L.link(24, G, 'email'); L.link(40, G, 'linkedin'); L.link(56, G, 'resumePdf');
  L.sign(32, 8, { text: 'STAND BY A TERMINAL\nPRESS ENTER' });
  L.enemy('bug', 80, G, { range: 3 });
  [[13, 7], [31, 7], [51, 7], [71, 7], [93, 7], [99, 5], [46, 10], [64, 10]].forEach(([x, y]) => L.coin(x, y));
  L.coffee(10, 10);
  L.spring(76, G); L.plat(77, 7, 3); L.star(78, 5);       // SECRET: spring up to a star
  L.hblock(108, 9);                                       // SECRET #2
  L.checkpoint(82);
  L.sign(116, 7, { text: 'HIRE ME!' });
  L.goal(120, G, { hire: 1 });
  [['antenna', 4], ['ac', 18], ['crate', 28], ['lamp', 36], ['ac', 48], ['antenna', 60], ['crate', 66], ['lamp', 74], ['ac', 86], ['crate', 90], ['antenna', 104], ['lamp', 112], ['ac', 124]]
    .forEach(([k, x]) => L.deco(k, x, G));
  out.world7 = L;
}

// ====================================================================== DAY-1 MOVEMENT LAB (kept for tests / ?lab)
{
  const L = new Level('test-level', 80, 'city', {});
  floors(L, 0, 79, [[36, 37], [51, 55]]);
  L.pipe(12, 10, 2);
  L.plat(20, 9, 4); L.plat(26, 7, 3); L.plat(32, 9, 3); L.plat(62, 9, 4); L.plat(70, 5, 5); L.bricks(42, 9, 1); L.bricks(44, 9, 1);
  L.spawn('start', 3, G);
  L.spawn('pipeA', 12.5, 10, { emerge: 1 });
  L.pipeLink(12, 10, 'bonus-room', 'in');
  L.checkpoint(40);
  [4, 6, 8, 10].forEach((x) => L.coin(x, 10)); L.coin(12, 8); L.coin(13, 8);
  for (let i = 0; i < 3; i++) L.coin(21 + i, 7);
  L.coin(27, 5); L.coin(28, 5); L.coin(33, 7); L.coin(34, 7); L.coin(36, 9); L.coin(37, 9); L.coin(48, 10);
  [[50, 9], [52, 8], [53, 7], [54, 8], [56, 9]].forEach(([x, y]) => L.coin(x, y));
  for (let i = 0; i < 4; i++) L.coin(70 + i, 3);
  L.coffee(63, 8);
  L.goal(77);
  L.sign(5, 8, { dialogue: 'move' }); L.sign(13, 7, { dialogue: 'pipe' }); L.sign(46, 7, { dialogue: 'longjump' }); L.sign(66, 7, { dialogue: 'coffee' }); L.sign(74, 8, { dialogue: 'goal' });
  out['test-level'] = L;
}
{
  const L = new Level('bonus-room', 20, 'none', {});
  L.floor(0, 19, G); L.rect(0, 0, 20, 1, TILE.CEIL); L.rect(0, 1, 1, G - 1, TILE.WALL); L.rect(19, 1, 1, G - 1, TILE.WALL);
  L.bricks(5, 9, 3); L.bricks(9, 7, 3);
  L.pipe(16, 10, 2); L.pipeLink(16, 10, 'test-level', 'pipeA');
  L.spawn('in', 3, 2);
  for (let i = 0; i < 5; i++) L.coin(3 + i * 2, 10);
  for (let i = 0; i < 3; i++) { L.coin(5 + i, 8); L.coin(9 + i, 6); }
  L.coin(14, 8);
  L.sign(10, 4, { dialogue: 'bonus' });
  out['bonus-room'] = L;
}

mkdirSync(new URL('../public/maps/', import.meta.url), { recursive: true });
for (const [name, L] of Object.entries(out)) writeFileSync(new URL(`../public/maps/${name}.json`, import.meta.url), JSON.stringify(L.json()));
console.log('maps written:', Object.keys(out).join(', '));
