// Unit tests for the pure movement model. Run: npm test
import assert from 'node:assert/strict';
import { MovementController } from '../src/systems/MovementController.js';
import { PHYSICS as P } from '../src/config.js';
import { validateEmail, submitEmail } from '../src/systems/LoginSystem.js';
import { isWorldUnlocked, nextWorldToPlay } from '../src/systems/Worlds.js';
import { analyse } from '../tools/validate-maps.mjs';
import { readFileSync } from 'node:fs';

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
const queue = [];
const test = (name, fn) => { queue.push([name, fn]); };

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

test('email validation accepts normal addresses and rejects junk', () => {
  for (const ok of ['a@b.co', ' first.last+tag@sub.example.org ', 'x_y@mail.example.com']) assert.ok(validateEmail(ok).ok, ok);
  assert.equal(validateEmail(' a@b.co ').value, 'a@b.co');
  for (const bad of ['', 'abc', 'a@b', 'a@@b.com', 'a b@c.com', '@x.com', 'a@.com', 'a@b..com', 'a@b.c', null, 'x'.repeat(300) + '@a.com']) assert.ok(!validateEmail(bad).ok, String(bad));
});

test('submitEmail never throws, posts JSON only when an endpoint is set', async () => {
  let called = null;
  const fakeOk = async (url, opt) => { called = { url, body: JSON.parse(opt.body), method: opt.method }; return { ok: true }; };
  assert.equal(await submitEmail(null, 'a@b.co', { fetchImpl: fakeOk }), false);
  assert.equal(called, null, 'no endpoint = nothing sent');
  assert.equal(await submitEmail('https://x.test/in', 'a@b.co', { fetchImpl: fakeOk }), true);
  assert.equal(called.method, 'POST'); assert.equal(called.body.email, 'a@b.co');
  assert.equal(await submitEmail('https://x.test/in', 'a@b.co', { fetchImpl: async () => { throw new Error('offline'); } }), false);
});

test('world unlock rules + recruiter mode', () => {
  const none = new Set();
  assert.ok(isWorldUnlocked(1, none, false));
  assert.ok(!isWorldUnlocked(2, none, false));
  assert.ok(isWorldUnlocked(2, new Set([1]), false));
  assert.ok(!isWorldUnlocked(3, new Set([1]), false));
  for (let i = 1; i <= 6; i++) assert.ok(isWorldUnlocked(i, none, true), 'recruiter unlocks ' + i);
  assert.equal(nextWorldToPlay(none, false), 1);
  assert.equal(nextWorldToPlay(new Set([1, 2]), false), 3);
});


const WORLD_JSON = JSON.parse(readFileSync(new URL('../src/data/worlds.json', import.meta.url), 'utf8')).worlds;
const R = {};
for (const n of ['world1', 'world2', 'world3', 'world4', 'world5', 'world6', 'world7', 'bonus-skills-a', 'bonus-skills-b']) R[n] = analyse(n);
const objsOf = (n, t) => R[n].objs.filter((o) => o.type === t);
const pv = (o, k) => (o.properties ?? []).find((p) => p.name === k)?.value;
const themeOf = (n) => R[n].map.properties.find((p) => p.name === 'theme').value;

test('every world is its own level: distinct maps + themes, difficulty 1-5 rising, boss, then a victory lap', () => {
  const maps = WORLD_JSON.map((w) => w.map);
  assert.equal(new Set(maps).size, 7, 'seven different maps');
  assert.equal(new Set(maps.map(themeOf)).size, 7, 'seven different themes');
  assert.deepEqual(WORLD_JSON.map((w) => w.difficulty), [1, 2, 3, 4, 5, 5, 1]);
  const hz = [1, 2, 3, 4, 5].map((i) => R['world' + i].hazards);
  console.log('      hazards (enemies+pits+movers) worlds 1-5:', hz.join(' < '));
  assert.ok(hz.every((h, i) => i === 0 || h > hz[i - 1]), 'hazards strictly increase from world 1 to 5');
});

test('every level is beatable, with the right jump skill for its difficulty', () => {
  for (const n of Object.keys(R)) assert.deepEqual(R[n].issues, [], n + ': ' + R[n].issues.join('; '));
  for (const n of ['world1', 'world2', 'world3', 'world7']) assert.equal(R[n].goalReach, 'normal', n + ' needs only normal jumps');
  for (const n of ['world4', 'world5']) assert.equal(R[n].goalReach, 'long', n + ' requires the Shift+Up long jump');
});

test('world mechanics are present in the maps', () => {
  const coins1 = objsOf('world1', 'coin');
  assert.equal(coins1.length, 10, 'world 1 has exactly 10 coins');
  assert.deepEqual(coins1.map((c) => pv(c, 'fact')).sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 'each coin reveals a different fact');
  const resume = JSON.parse(readFileSync(new URL('../src/data/resume.json', import.meta.url), 'utf8'));
  assert.equal(resume.intro.facts.length, 10, '10 facts from the resume');
  const tasks = objsOf('world2', 'task');
  assert.equal(tasks.length, resume.education.length, 'one task (degree) per education entry');
  assert.equal(objsOf('world2', 'book').length, 10);
  assert.equal(objsOf('world2', 'enemy').filter((e) => pv(e, 'task')).length, 3);
  assert.equal(objsOf('world2', 'lever').length, 1);
  for (const t of tasks) assert.ok(objsOf('world2', 'gate').some((g) => pv(g, 'id') === pv(t, 'gate')), 'each task opens a gate');
  const bosses = objsOf('world3', 'enemy').filter((e) => pv(e, 'boss') !== undefined);
  assert.equal(bosses.length, resume.experience.length, 'one boss (floor) per job');
  for (const b of bosses) assert.ok(objsOf('world3', 'gate').some((g) => pv(g, 'id') === pv(b, 'gate')), 'each boss guards a gate');
  const perCat = [0, 1, 2, 3].map((c) => ['world4', 'bonus-skills-a', 'bonus-skills-b'].reduce((n, m) => n + objsOf(m, 'coin').filter((o) => pv(o, 'cat') === c).length, 0));
  assert.deepEqual(perCat, [7, 7, 7, 7], 'each skill bar is fed by 7 coins (matches the HUD)');
  assert.equal(resume.skills.length, 4);
  assert.equal(objsOf('world4', 'pipe').length, 2, 'two bonus pipes');
  assert.equal(objsOf('world5', 'qblock').length, resume.awards.length, 'one ? block per certificate');
  assert.equal(objsOf('world5', 'trophy').length, resume.awards.length);
  assert.equal(objsOf('world6', 'printerboss').length, 1, 'world 6 is the Printer Monster arena');
  assert.equal(objsOf('world6', 'goal').length, 0, 'the boss arena ends by defeating the boss');
  assert.equal(objsOf('world7', 'link').length, 3, 'e-mail, LinkedIn, resume');
  assert.ok(objsOf('world7', 'goal').some((g) => pv(g, 'hire')), 'the rooftop ends on the HIRE ME flag');
  const kinds = (n) => new Set(objsOf(n, 'enemy').map((e) => pv(e, 'kind')));
  assert.deepEqual([...kinds('world1')], ['bug']);
  assert.ok(kinds('world3').has('invite') && kinds('world3').has('spam') && kinds('world4').has('printer') && kinds('world5').has('printer'));
});

test('every world hides at least one star; every secret is reachable (springs / bumpable blocks)', () => {
  for (const n of ['world1', 'world2', 'world3', 'world4', 'world5', 'world6', 'world7']) assert.ok(R[n].stars >= 1, n + ' has a hidden star');
  assert.ok(objsOf('world4', 'spring').length && objsOf('world5', 'spring').length && objsOf('world2', 'spring').length, 'springs in worlds 2, 4, 5');
  assert.ok(objsOf('world4', 'laser').length >= 3 && objsOf('world5', 'crumble').length >= 3, 'lasers (4) and crumbling platforms (5)');
});

test('content comes from the resume PDF (no placeholders left)', () => {
  const resume = JSON.parse(readFileSync(new URL('../src/data/resume.json', import.meta.url), 'utf8'));
  const text = JSON.stringify(resume);
  assert.ok(!/PLACEHOLDER|YYYY|Company One|COMPANY ONE/i.test(text), 'no placeholder text left in resume.json');
  assert.equal(resume.meta.name, 'Apoorv Chaurasia');
  assert.ok(resume.contact.email.includes('@') && resume.contact.linkedin.includes('linkedin.com/in/'));
  assert.ok(!/\+91|9044966056/.test(text), 'phone number is not embedded in the game data');
});

test('XP ladder matches the coins available (a full run reaches HIRED!)', () => {
  const coins = ['world1', 'world2', 'world3', 'world4', 'bonus-skills-a', 'bonus-skills-b', 'world5', 'world7'].reduce((n, m) => n + objsOf(m, 'coin').length, 0) + objsOf('world5', 'qblock').length;
  console.log('      total XP available:', coins);
  assert.ok(coins >= 85, 'enough coins to reach the HIRED! threshold (85)');
});

for (const [name, fn] of queue) { await fn(); n++; console.log('  ok  ' + name); }
console.log(`\n${n} tests passed`);
