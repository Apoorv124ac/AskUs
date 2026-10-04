// Level validator: proves each map is beatable and that no collectible is out of reach.
// Model: standing surfaces (tile tops + moving-platform endpoints) joined by jumps that the real
// movement numbers can make (normal jump: 3 tiles high / ~2.5 tiles far; long jump: ~5.5 tiles far).
import { readFileSync } from 'node:fs';

const T = 16;
// Conservative envelopes derived from tests/run.mjs (jump 51px high, long jump 107px far incl. body width)
const RISE_MAX = 49;                                   // px a normal/long jump can climb
const gapMax = (rise, long) => {
  if (rise > 0) return long ? 88 - rise * 0.8 : 40 - rise * 0.5;      // climbing: shorter reach
  const d = -rise;                                                    // dropping: longer reach
  return long ? Math.min(130, 88 + d * 0.7) : Math.min(72, 40 + d * 0.5);
};

export function load(name) { return JSON.parse(readFileSync(new URL(`../public/maps/${name}.json`, import.meta.url), 'utf8')); }
const prop = (o, k) => (o.properties ?? []).find((p) => p.name === k)?.value;

export function surfaces(map) {
  const W = map.width, H = map.height;
  const g = map.layers.find((l) => l.name === 'ground').data, p = map.layers.find((l) => l.name === 'pipes').data;
  const solid = (x, y) => x >= 0 && x < W && y >= 0 && y < H && (g[y * W + x] || p[y * W + x]);
  const segs = [];
  for (let y = 0; y < H; y++) {
    let run = null;
    for (let x = 0; x <= W; x++) {
      const stand = x < W && solid(x, y) && !solid(x, y - 1) && !solid(x, y - 2);
      if (stand) { if (!run) run = { x0: x * T, x1: x * T + T, y: y * T }; else run.x1 = x * T + T; }
      else if (run) { segs.push(run); run = null; }
    }
  }
  const objs = map.layers.find((l) => l.name === 'objects').objects;
  for (const o of objs.filter((o) => o.type === 'mplat')) {
    const dx = prop(o, 'dx') ?? 0, dy = prop(o, 'dy') ?? 0;
    segs.push({ x0: o.x, x1: o.x + 32, y: o.y, mover: true }, { x0: o.x + dx, x1: o.x + dx + 32, y: o.y + dy, mover: true });
  }
  return segs;
}

export function canReach(a, b, long) {
  const gap = Math.max(0, b.x0 - a.x1, a.x0 - b.x1), rise = a.y - b.y;
  if (gap === 0) return rise <= RISE_MAX;
  if (rise > RISE_MAX) return false;
  return gap <= gapMax(rise, long);
}

export function reachable(segs, startIdx, long) {
  const seen = new Set([startIdx]), q = [startIdx];
  while (q.length) {
    const i = q.shift();
    segs.forEach((s, j) => { if (!seen.has(j) && canReach(segs[i], s, long)) { seen.add(j); q.push(j); } });
  }
  return seen;
}

const segAt = (segs, x, y) => segs.findIndex((s) => x >= s.x0 - 1 && x <= s.x1 + 1 && Math.abs(s.y - y) < 3);
/** Drop-in spawns (bonus rooms): the surface directly below. */
const segBelow = (segs, x, y) => {
  let best = -1;
  segs.forEach((s, i) => { if (x >= s.x0 && x <= s.x1 && s.y >= y && (best < 0 || s.y < segs[best].y)) best = i; });
  return best;
};

/** Full analysis of one map. */
export function analyse(name) {
  const map = load(name), segs = surfaces(map), objs = map.layers.find((l) => l.name === 'objects').objects;
  const spawn = objs.find((o) => o.type === 'spawn' && o.name === 'start') ?? objs.find((o) => o.type === 'spawn');
  const goal = objs.find((o) => o.type === 'goal');
  let si = segAt(segs, spawn.x, spawn.y);
  if (si < 0) si = segBelow(segs, spawn.x, spawn.y);
  const rn = si >= 0 ? reachable(segs, si, false) : new Set(), rl = si >= 0 ? reachable(segs, si, true) : new Set();
  const res = { name, map, segs, objs, startSeg: si, issues: [], needsLong: false, goalReach: 'n/a' };
  if (si < 0) res.issues.push('spawn is not standing on a surface');
  if (goal) {
    const gi = segAt(segs, goal.x, goal.y);
    res.goalReach = gi < 0 ? 'none' : rn.has(gi) ? 'normal' : rl.has(gi) ? 'long' : 'none';
    if (res.goalReach === 'none') res.issues.push('goal is not reachable');
    res.needsLong = res.goalReach === 'long';
  }
  // collectibles must be reachable from the main path
  const R = [...rl].map((i) => segs[i]);
  const near = (x, y, rule) => R.some((s) => rule(s, Math.max(0, s.x0 - x, x - s.x1)));
  for (const o of objs) {
    if (o.type === 'coin' || o.type === 'book') {
      // standing/jumping next to it, or an "arc coin" hanging over a gap that you collect mid-jump
      const stand = (s, dx) => dx <= 14 && o.y >= s.y - 85 && o.y <= s.y + 6;
      const arc = (s, dx) => dx <= 56 && o.y >= s.y - 75 && o.y <= s.y - 8;
      if (!near(o.x, o.y, (s, dx) => stand(s, dx) || arc(s, dx))) res.issues.push(`${o.type} at (${o.x},${o.y}) out of reach`);
    } else if (o.type === 'lever') {
      if (!near(o.x, o.y - 8, (s, dx) => dx <= 8 && Math.abs(s.y - o.y) < 3)) res.issues.push(`lever at (${o.x},${o.y}) not standing on a reachable surface`);
    } else if (o.type === 'qblock') {
      const bottom = o.y + 16, cx = o.x + 8;
      if (!near(cx, bottom, (s, dx) => dx <= 8 && s.y - bottom >= 28 && s.y - (bottom + 28) <= 51)) res.issues.push(`? block at (${o.x},${o.y}) cannot be bumped from the main path`);
    } else if (o.type === 'link' || o.type === 'trophy') {
      if (!near(o.x, o.y, (s, dx) => dx <= 8 && Math.abs(s.y - o.y) < 3)) res.issues.push(`${o.type} at (${o.x},${o.y}) unreachable`);
    }
  }
  // hazards (used to prove difficulty rises): enemies + pits + moving platforms
  const W = map.width, g = map.layers.find((l) => l.name === 'ground').data;
  let pits = 0, inPit = false;
  for (let x = 0; x < W; x++) { const empty = !g[13 * W + x]; if (empty && !inPit) pits++; inPit = empty; }
  res.enemies = objs.filter((o) => o.type === 'enemy').length;
  res.pits = pits; res.movers = objs.filter((o) => o.type === 'mplat').length;
  res.hazards = res.enemies + res.pits + res.movers;
  return res;
}

if (process.argv[1] && process.argv[1].endsWith('validate-maps.mjs')) {
  let bad = 0;
  for (const n of ['world1', 'world2', 'world3', 'world4', 'world5', 'world6', 'bonus-skills-a', 'bonus-skills-b']) {
    const r = analyse(n);
    console.log(`${n.padEnd(15)} goal:${String(r.goalReach).padEnd(6)} enemies:${String(r.enemies).padStart(2)} pits:${r.pits} movers:${r.movers} hazards:${String(r.hazards).padStart(2)} ${r.issues.length ? 'ISSUES' : 'ok'}`);
    r.issues.forEach((i) => { console.log('   - ' + i); bad++; });
  }
  process.exit(bad ? 1 : 0);
}
