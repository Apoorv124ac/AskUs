// Unit tests for the pure movement model. Run: npm test
import assert from 'node:assert/strict';
import { MovementController } from '../src/systems/MovementController.js';
import { PHYSICS as P } from '../src/config.js';

const DT = 1 / 60;
const NO = { speedMult: 1, canAirJump: false };

/** Tiny world: flat floor at y=0; positive y is down. Optional ledge ends at x=ledgeX. */
function makeSim({ ledgeX = Infinity } = {}) {
  const ctrl = new MovementController();
  const s = { x: 0, y: 0, vx: 0, vy: 0, t: 0, events: [] };
  s.grounded = () => s.y >= 0 && s.x <= ledgeX;
  s.step = (input = {}, mods = NO) => {
    const inp = { dir: 0, run: false, jumpPressed: false, jumpHeld: false, ...input };
    const out = ctrl.step({ vx: s.vx, vy: s.vy, onGround: s.grounded(), ceiling: false }, inp, mods, DT);
    s.vx = out.vx; s.vy = out.vy; s.events.push(...out.events);
    s.x += s.vx * DT; s.y += s.vy * DT;
    if (s.y >= 0 && s.x <= ledgeX && s.vy > 0) { s.y = 0; s.vy = 0; }
    s.t += DT;
  };
  s.run = (n, input, mods) => { for (let i = 0; i < n; i++) s.step(typeof input === 'function' ? input(i) : input, mods); };
  s.ctrl = ctrl;
  return s;
}
const apexOf = (input) => {
  const s = makeSim(); let apex = 0, first = true;
  s.run(2, {});
  for (let i = 0; i < 120; i++) {
    s.step(input(i, first)); first = false; apex = Math.min(apex, s.y);
  }
  return -apex;
};
let n = 0;
const test = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };

test('walk accelerates to walkSpeed, run to runSpeed', () => {
  const a = makeSim(); a.run(90, { dir: 1 });
  assert.ok(Math.abs(a.vx - P.walkSpeed) < 0.5, `walk vx=${a.vx}`);
  const b = makeSim(); b.run(120, { dir: 1, run: true });
  assert.ok(Math.abs(b.vx - P.runSpeed) < 0.5, `run vx=${b.vx}`);
});

test('friction stops the hero when no key is held', () => {
  const s = makeSim(); s.run(60, { dir: 1, run: true }); s.run(60, {});
  assert.equal(s.vx, 0);
});

test('tap jump is lower than held jump (variable height)', () => {
  const tap = apexOf((i) => ({ jumpPressed: i === 0, jumpHeld: i < 3 }));
  const held = apexOf((i) => ({ jumpPressed: i === 0, jumpHeld: true }));
  console.log(`      tap=${tap.toFixed(1)}px held=${held.toFixed(1)}px`);
  assert.ok(held > tap * 1.6, 'held jump should be much higher than a tap');
  assert.ok(held >= 48 && held <= 70, `held jump ${held} should clear ~3 tiles`);
});

test('long jump goes higher and farther than a normal jump', () => {
  const measure = (run) => {
    const s = makeSim(); s.run(60, { dir: 1, run: false });
    let apex = 0, started = false, x0 = 0;
    for (let i = 0; i < 200; i++) {
      s.step({ dir: 1, run, jumpPressed: i === 0, jumpHeld: true });
      if (i === 0) { started = true; x0 = s.x; }
      apex = Math.min(apex, s.y);
      if (started && i > 5 && s.y >= 0) return { height: -apex, dist: s.x - x0 };
    }
  };
  const j = measure(false), l = measure(true);
  console.log(`      jump h=${j.height.toFixed(1)} d=${j.dist.toFixed(1)} | long h=${l.height.toFixed(1)} d=${l.dist.toFixed(1)}`);
  assert.ok(l.height > j.height + 8);
  assert.ok(l.dist > j.dist * 1.5);
  assert.ok(l.dist >= 5 * 16 + P.hitbox.width, 'long jump should clear the 5-tile test gap');
});

test('coyote time: jump still works just after walking off a ledge', () => {
  const s = makeSim({ ledgeX: 20 });
  s.run(200, { dir: 1 }, NO);                 // walk off the ledge
  const fellAt = s.t;
  assert.ok(!s.grounded());
  s.events.length = 0;
  // fresh sim for a precise check
  const t = makeSim({ ledgeX: 10 });
  while (t.grounded()) t.step({ dir: 1 });
  t.run(Math.round(P.coyoteTime * 60) - 3, { dir: 1 });
  t.step({ dir: 1, jumpPressed: true, jumpHeld: true });
  assert.ok(t.events.some((e) => e.type === 'jump'), 'jump inside coyote window');
  const u = makeSim({ ledgeX: 10 });
  while (u.grounded()) u.step({ dir: 1 });
  u.run(Math.round(P.coyoteTime * 60) + 6, { dir: 1 });
  u.step({ dir: 1, jumpPressed: true, jumpHeld: true });
  assert.ok(!u.events.some((e) => e.type === 'jump'), 'no jump after coyote expired');
  void fellAt;
});

test('jump buffer: an early press fires on landing', () => {
  const s = makeSim();
  s.run(2, {});
  s.step({ jumpPressed: true, jumpHeld: true });
  s.run(200, { jumpHeld: true });
  s.events.length = 0;
  // fall from a small hop, press a few frames before landing
  s.y = -8; s.vy = 0;
  let pressed = false;
  for (let i = 0; i < 60; i++) {
    const nearLanding = !pressed && s.y > -4;
    s.step({ jumpPressed: nearLanding, jumpHeld: true });
    if (nearLanding) pressed = true;
    if (s.events.some((e) => e.type === 'jump')) break;
  }
  assert.ok(pressed && s.events.some((e) => e.type === 'jump'), 'buffered jump should trigger on landing');
});

test('buffer expires: a press that is too early is ignored', () => {
  const s = makeSim(); s.y = -80; s.vy = 0;
  s.step({ jumpPressed: true });
  while (!s.grounded()) s.step({});
  s.events.length = 0;
  s.run(5, {});
  assert.ok(!s.events.some((e) => e.type === 'jump'));
});

test('coffee double jump works once per airtime, not without coffee', () => {
  const coffee = { speedMult: 1.25, canAirJump: true };
  const s = makeSim(); s.run(2, {}, coffee);
  s.step({ jumpPressed: true, jumpHeld: true }, coffee);
  s.run(15, { jumpHeld: true }, coffee);
  s.step({ jumpPressed: true, jumpHeld: true }, coffee);
  s.step({ jumpPressed: true, jumpHeld: true }, coffee);
  const kinds = s.events.map((e) => e.type).filter((k) => k.includes('jump'));
  assert.deepEqual(kinds, ['jump', 'airjump']);
  const n2 = makeSim(); n2.step({ jumpPressed: true, jumpHeld: true });
  n2.run(15, { jumpHeld: true });
  n2.step({ jumpPressed: true, jumpHeld: true });
  assert.deepEqual(n2.events.map((e) => e.type).filter((k) => k.includes('jump')), ['jump']);
});

test('reversing at speed skids', () => {
  const s = makeSim(); s.run(90, { dir: 1, run: true });
  s.step({ dir: -1, run: true });
  assert.ok(s.ctrl.skidding);
});

console.log(`\n${n} tests passed`);
