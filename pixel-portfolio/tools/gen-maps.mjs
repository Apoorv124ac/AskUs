// Generates the Day-1 Tiled-format maps into public/maps/. Run: node tools/gen-maps.mjs
// The output is plain Tiled JSON (orthogonal, 16x16), so you can open/edit it in Tiled
// afterwards - or keep regenerating it from here. Tile ids (gid) are documented in TILE.
import { writeFileSync } from 'node:fs';

const T = 16;
export const TILE = { FLOOR_TOP: 1, FLOOR: 2, BRICK: 3, DESK: 4, PIPE_TL: 5, PIPE_TR: 6, PIPE_BL: 7, PIPE_BR: 8, WALL: 9, CEIL: 10 };

function grid(w, h) { return Array.from({ length: h }, () => Array(w).fill(0)); }
function fillRect(g, x, y, w, h, id) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) g[j][i] = id; }
function floor(g, x0, x1, topRow) {
  for (let x = x0; x <= x1; x++) for (let y = topRow; y < g.length; y++) g[y][x] = y === topRow ? TILE.FLOOR_TOP : TILE.FLOOR;
}
function pipe(p, x, topRow, rows) {
  for (let r = 0; r < rows; r++) {
    p[topRow + r][x] = r === 0 ? TILE.PIPE_TL : TILE.PIPE_BL;
    p[topRow + r][x + 1] = r === 0 ? TILE.PIPE_TR : TILE.PIPE_BR;
  }
}
const prop = (name, value) => ({ name, type: typeof value === 'number' ? 'int' : 'string', value });
let nextId = 1;
const obj = (type, x, y, extra = {}, props = {}, name = '') => ({
  id: nextId++, name, type, x, y, width: 0, height: 0, rotation: 0, visible: true,
  ...(Object.keys(props).length ? { properties: Object.entries(props).map(([k, v]) => prop(k, v)) } : {}), ...extra,
});

function build({ w, h, ground, pipes, objects }) {
  const flat = (g) => g.flat();
  return {
    compressionlevel: -1, type: 'map', version: '1.10', tiledversion: '1.10.2', orientation: 'orthogonal',
    renderorder: 'right-down', infinite: false, width: w, height: h, tilewidth: T, tileheight: T, nextlayerid: 4,
    nextobjectid: nextId,
    tilesets: [{ firstgid: 1, name: 'tiles', image: 'tiles.png', imagewidth: 160, imageheight: 16, tilewidth: T, tileheight: T, columns: 10, tilecount: 10, margin: 0, spacing: 0 }],
    layers: [
      { id: 1, name: 'ground', type: 'tilelayer', width: w, height: h, x: 0, y: 0, opacity: 1, visible: true, data: flat(ground) },
      { id: 2, name: 'pipes', type: 'tilelayer', width: w, height: h, x: 0, y: 0, opacity: 1, visible: true, data: flat(pipes) },
      { id: 3, name: 'objects', type: 'objectgroup', draworder: 'topdown', x: 0, y: 0, opacity: 1, visible: true, objects },
    ],
  };
}
const px = (tile) => tile * T;

// ============================================================ TEST LEVEL (80x14)
function testLevel() {
  nextId = 1;
  const W = 80, H = 14, G = 12; // G = top row of the floor
  const ground = grid(W, H), pipes = grid(W, H);
  floor(ground, 0, 35, G);        // start area
  // 2-tile pit at x=36..37 (walk-jumpable)
  floor(ground, 38, 50, G);
  // 5-tile gap at x=51..55 -> needs a Shift+Up long jump
  floor(ground, 56, 79, G);
  pipe(pipes, 12, 10, 2);         // pipe A -> bonus room
  // desk platforms (3 tiles above floor = reachable by normal jump)
  fillRect(ground, 20, 9, 4, 1, TILE.DESK);
  fillRect(ground, 26, 7, 3, 1, TILE.DESK);   // needs hopping from the desk below
  fillRect(ground, 32, 9, 3, 1, TILE.DESK);
  fillRect(ground, 62, 9, 4, 1, TILE.DESK);   // coffee desk
  fillRect(ground, 70, 5, 5, 1, TILE.DESK);   // high ledge: coffee double-jump only
  fillRect(ground, 42, 9, 1, 1, TILE.BRICK); fillRect(ground, 44, 9, 1, 1, TILE.BRICK);

  const o = [];
  o.push(obj('spawn', px(3) + 8, px(G), {}, {}, 'start'));
  o.push(obj('spawn', px(12) + 16, px(10), {}, { emerge: 1 }, 'pipeA'));
  o.push(obj('pipe', px(12), px(10) - 2, { width: 32, height: 4 }, { target: 'bonus-room', spawn: 'in' }, 'pipeA'));
  o.push(obj('checkpoint', px(40), px(G) , {}, {}, 'cp1'));
  const coin = (tx, ty) => o.push(obj('coin', px(tx) + 8, px(ty) + 8));
  [4, 6, 8, 10].forEach((x) => coin(x, 10));                       // intro row on the ground (clear of the pipe)
  coin(12, 8); coin(13, 8);                                        // hovering above the pipe
  for (let i = 0; i < 3; i++) coin(21 + i, 7);                     // over first desk
  coin(27, 5); coin(28, 5);                                        // over high desk
  coin(33, 7); coin(34, 7);
  coin(36, 9); coin(37, 9);                                        // over the pit
  coin(48, 10);
  [[50, 9], [52, 8], [53, 7], [54, 8], [56, 9]].forEach(([x, y]) => coin(x, y)); // arc over the long gap
  for (let i = 0; i < 4; i++) coin(70 + i, 3);                     // reward on the high ledge
  o.push(obj('coffee', px(63) + 8, px(8) + 8));
  o.push(obj('goal', px(77) + 8, px(G), {}, {}, 'goal'));
  o.push(obj('sign', px(74) + 8, px(8) , {}, { dialogue: 'goal' }));
  o.push(obj('sign', px(5) + 8, px(8), {}, { dialogue: 'move' }));
  o.push(obj('sign', px(13) + 8, px(7) - 4, {}, { dialogue: 'pipe' }));
  o.push(obj('sign', px(46) + 8, px(7), {}, { dialogue: 'longjump' }));
  o.push(obj('sign', px(66) + 8, px(7), {}, { dialogue: 'coffee' }));
  return build({ w: W, h: H, ground, pipes, objects: o });
}

// ============================================================ BONUS ROOM (20x14)
function bonusRoom() {
  nextId = 1;
  const W = 20, H = 14, G = 12;
  const ground = grid(W, H), pipes = grid(W, H);
  floor(ground, 0, W - 1, G);
  fillRect(ground, 0, 0, W, 1, TILE.CEIL);
  fillRect(ground, 0, 1, 1, G - 1, TILE.WALL);
  fillRect(ground, W - 1, 1, 1, G - 1, TILE.WALL);
  fillRect(ground, 5, 9, 3, 1, TILE.BRICK);
  fillRect(ground, 9, 7, 3, 1, TILE.BRICK);
  pipe(pipes, 16, 10, 2);
  const o = [];
  o.push(obj('spawn', px(3) + 8, px(2), {}, {}, 'in'));
  o.push(obj('pipe', px(16), px(10) - 2, { width: 32, height: 4 }, { target: 'test-level', spawn: 'pipeA' }, 'exit'));
  const coin = (tx, ty) => o.push(obj('coin', px(tx) + 8, px(ty) + 8));
  for (let i = 0; i < 5; i++) coin(3 + i * 2, 10);
  for (let i = 0; i < 3; i++) coin(5 + i, 8);
  for (let i = 0; i < 3; i++) coin(9 + i, 6);
  coin(14, 8);
  o.push(obj('sign', px(10), px(3) + 8, {}, { dialogue: 'bonus' }));
  return build({ w: W, h: H, ground, pipes, objects: o });
}

writeFileSync(new URL('../public/maps/test-level.json', import.meta.url), JSON.stringify(testLevel()));
writeFileSync(new URL('../public/maps/bonus-room.json', import.meta.url), JSON.stringify(bonusRoom()));
console.log('maps written');
