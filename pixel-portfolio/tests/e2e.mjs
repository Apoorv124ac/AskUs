// End-to-end check in real Chromium: drives the keyboard and asserts on game state.
// Run: npm run build && node tests/e2e.mjs   (starts its own preview server)
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';

mkdirSync('test-output', { recursive: true });
const PORT = 4179;
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 50; i++) { try { await fetch(`http://localhost:${PORT}/`); break; } catch { await sleep(200); } }

const base = '/opt/pw-browsers';
const dir = readdirSync(base).find((d) => d.startsWith('chromium-'));
const exe = existsSync(`${base}/chromium/chrome-linux/chrome`) ? `${base}/chromium/chrome-linux/chrome` : `${base}/${dir}/chrome-linux/chrome`;
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

const L = (fn, arg) => page.evaluate(`(() => { const s = window.__oq.game.scene.getScene('Level'); const p = s.player; const st = window.__oq.game.services.state; return (${fn.toString()})(s, p, st, ${JSON.stringify(arg ?? null)}); })()`);
const key = { down: (k) => page.keyboard.down(k), up: (k) => page.keyboard.up(k) };
const tap = async (k, ms = 60) => { await key.down(k); await sleep(ms); await key.up(k); };
const placeAt = (x, feetY) => L((s, p, st, a) => p.teleport(a[0], a[1]), [x, feetY]);
const settle = () => sleep(350);
let passed = 0;
// close any open dialogue box in the Level (world intro, facts, degrees...)
const dismiss = async () => {
  for (let i = 0; i < 40; i++) {
    const act = await page.evaluate(() => window.__oq.game.scene.getScene('Level')?.dlg?.active ?? false);
    if (!act) return;
    await tap('Enter', 30); await sleep(220);
  }
};
const ok = (name) => { passed++; console.log('  ok  ' + name); };

try {
  await page.goto(`http://localhost:${PORT}/?debug&reset`);
  await page.waitForFunction(() => window.__oq?.game?.scene.isActive('Title'), null, { timeout: 15000 });
  await sleep(500);
  await page.screenshot({ path: 'test-output/01-title.png' });
  ok('boots to title screen');

  // ================= DAY 2 FLOW: Title -> Entrance -> Login -> World map -> World 1 =================
  const active = (k) => page.waitForFunction((k) => window.__oq.game.scene.isActive(k), k, { timeout: 15000 });
  const sceneState = (fn) => page.evaluate(fn);
  const titleItems = await sceneState(() => window.__oq.game.scene.getScene('Title').items.map((i) => i.label));
  assert.deepEqual(titleItems, ['START', 'RECRUITER MODE'], 'first visit shows START + RECRUITER MODE');
  await tap('Enter');
  await active('Entrance');
  await page.waitForFunction(() => window.__oq.game.scene.getScene('Entrance').box.active, null, { timeout: 12000 });
  await sleep(1500);
  await page.screenshot({ path: 'test-output/02a-entrance.png' });
  ok('title START -> entrance cutscene with dialogue');
  const boundsOk = [];
  for (let i = 0; i < 60 && !(await page.evaluate(() => window.__oq.game.scene.isActive('Login'))); i++) {
    await sleep(500);   // let the typewriter finish so the whole page is on screen
    const b = await page.evaluate(() => { const d = window.__oq.game.scene.getScene('Entrance')?.box; if (!d?.active) return null; const r = d.body.getBounds(), q = d.rect; return { bottom: r.bottom - (q.y + q.h), right: r.right - (q.x + q.w), lines: d.body.text.split('\n').length }; });
    if (b) boundsOk.push(b);
    await tap('Enter', 40); await sleep(200);
  }
  assert.ok(boundsOk.length >= 3, 'dialogue pages were sampled (' + boundsOk.length + ')');
  for (const b of boundsOk) { assert.ok(b.bottom <= -3, 'dialogue text stays inside the box (bottom overhang ' + b.bottom + ')'); assert.ok(b.right <= -6, 'dialogue text stays inside the box (right overhang ' + b.right + ')'); assert.ok(b.lines <= 3); }
  ok('entrance dialogue: ' + boundsOk.length + ' pages measured, none overflow the box');
  await active('Login');
  await sleep(700);
  await page.screenshot({ path: 'test-output/02b-login.png' });
  assert.ok(await page.evaluate(() => document.activeElement?.id === 'email'), 'e-mail field focused');
  await page.fill('#email', 'not-an-email'); await page.keyboard.press('Enter'); await sleep(300);
  assert.ok(await page.evaluate(() => document.getElementById('email').classList.contains('bad')), 'invalid e-mail rejected');
  assert.equal(await page.evaluate(() => window.__oq.game.scene.isActive('Login')), true);
  assert.equal(await page.evaluate(() => localStorage.getItem('office-quest-save-v1')?.includes('not-an-email') ?? false), false, 'invalid address is not stored');
  await page.screenshot({ path: 'test-output/02c-login-denied.png' });
  await page.fill('#email', 'recruiter@example.com'); await page.keyboard.press('Enter'); await sleep(600);
  await page.screenshot({ path: 'test-output/02d-access-granted.png' });
  const savedEmail = await page.evaluate(() => JSON.parse(localStorage.getItem('office-quest-save-v1')).email);
  assert.equal(savedEmail, 'recruiter@example.com');
  ok('login: invalid rejected, valid -> ACCESS GRANTED, stored in localStorage');
  await active('WorldMap'); await sleep(700);
  await page.screenshot({ path: 'test-output/02e-worldmap.png' });
  const wm = () => page.evaluate(() => { const s = window.__oq.game.scene.getScene('WorldMap'); const st = window.__oq.game.services.state; return { sel: s.sel, unlocked: [1,2,3,4,5,6].map((i) => st.isUnlocked(i)), done: [...st.worlds] }; });
  let w = await wm();
  assert.deepEqual(w.unlocked, [true, false, false, false, false, false]);
  await tap('ArrowRight'); await sleep(200);
  assert.equal((await wm()).sel, 1, 'right selects next world');
  await tap('Enter'); await sleep(600);
  assert.equal(await page.evaluate(() => window.__oq.game.scene.isActive('WorldMap')), true, 'locked world does not start');
  await tap('Digit1'); await sleep(200);
  assert.equal((await wm()).sel, 0, 'number key jumps to world');
  ok('world map: select next/previous, locked world refuses to start');
  await tap('Enter');
  await active('Level'); await sleep(900);
  assert.equal(await L((s) => s.world), 1);
  await dismiss();
  // clear the level through the finish flag
  const goalPos = await L((s) => ({ x: s.goal.x, y: s.goal.y }));
  await L((s, p, st, a) => p.teleport(a.x, a.y), goalPos);
  await active('WorldMap'); await sleep(900);
  w = await wm();
  assert.deepEqual(w.done, [1]); assert.equal(w.unlocked[1], true, 'world 2 unlocked after clearing 1'); assert.equal(w.sel, 1);
  await page.screenshot({ path: 'test-output/02f-world1-cleared.png' });
  ok('finish flag clears World 1 -> World 2 unlocks, cursor moves on');

  // Recruiter Mode: unlock all, Contact shortcut
  await tap('KeyR'); await sleep(300);
  assert.deepEqual((await wm()).unlocked, [true, true, true, true, true, true]);
  await page.screenshot({ path: 'test-output/02g-recruiter.png' });
  await tap('KeyV'); await sleep(200);                                    // no resume URL yet -> friendly notice, no crash
  await tap('KeyH');
  await active('Level'); await sleep(700);
  assert.equal(await L((s) => s.world), 6);
  await dismiss();
  ok('Recruiter Mode unlocks everything; H jumps straight to Contact (world 6)');

  // pause menu -> WORLD MAP
  await tap('Escape'); await sleep(300);
  for (let i = 0; i < 5; i++) { await tap('ArrowDown', 40); await sleep(80); }
  await tap('Enter');
  await active('WorldMap'); await sleep(500);
  await tap('Enter');
  await active('Level'); await sleep(900);
  await dismiss();
  ok('pause menu returns to the world map; map starts a level again');

  // ================= DAY 3: EVERY WORLD IS ITS OWN LEVEL =================
  const startWorld = async (n, map = 'world' + n) => {
    await page.evaluate(([n, map]) => {
      const g = window.__oq.game, cur = ['Level', 'WorldMap', 'Title', 'Credits'].find((k) => g.scene.isActive(k));
      window.__prevPlayer = g.scene.getScene('Level')?.player ?? null;       // so we can tell the restart really happened
      g.scene.getScene(cur).scene.start('Level', { map, world: n, spawn: 'start' });
    }, [n, map]);
    await page.waitForFunction((map) => { const s = window.__oq.game.scene.getScene('Level'); return s?.mapKey === map && s.player && s.player !== window.__prevPlayer && s.sys.isActive(); }, map, { timeout: 8000 });
    await sleep(900);
  };
  const info = () => L((s, p, st) => ({ map: s.mapKey, theme: s.mapOpts.theme, coins: s.coinGroup.getLength(), enemies: s.enemies.getLength(), gates: s.gateGroup.getLength(), qblocks: s.qblocks.getLength(), mplats: s.mplats.getLength(), hud: s.hudInfo(), goal: s.goal && { x: s.goal.x, y: s.goal.y }, kinds: [...new Set(s.enemies.getChildren().map((e) => e.kind))].sort() }));
  const onto = (x, feetY) => L((s, p, st, a) => p.teleport(a[0], a[1]), [x, feetY]);
  const maps = {};
  for (const n of [1, 2, 3, 4, 5, 6]) { await startWorld(n); maps[n] = await info(); await page.screenshot({ path: `test-output/w${n}-start.png` }); }
  const themes = Object.values(maps).map((m) => m.theme);
  assert.equal(new Set(themes).size, 6, 'six different themes: ' + themes);
  assert.equal(new Set(Object.values(maps).map((m) => m.map)).size, 6, 'six different maps');
  const hazards = [1, 2, 3, 4, 5].map((n) => maps[n].enemies);
  console.log('      themes:', themes.join(', '), '| enemies per world:', Object.values(maps).map((m) => m.enemies).join(','));
  assert.ok(hazards.every((h, i) => i === 0 || h >= hazards[i - 1]), 'enemy count never drops from world 1 to 5');
  assert.deepEqual(maps[1].kinds, ['bug']); assert.ok(maps[3].kinds.includes('invite') && maps[3].kinds.includes('spam')); assert.ok(maps[4].kinds.includes('printer'));
  ok('six distinct levels: themes ' + themes.join('/') + ', enemy mix grows with difficulty');

  // ---------- WORLD 1: exactly 10 fact coins, each reveals a fact
  await startWorld(1);
  await dismiss();
  assert.equal(maps[1].coins, 10, 'exactly 10 coins in world 1');
  const coinsAt = await L((s) => s.coinGroup.getChildren().map((c) => ({ x: c.x, y: c.y, fact: c.getData('fact') })).sort((a, b) => a.fact - b.fact));
  assert.deepEqual(coinsAt.map((c) => c.fact), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const facts = await page.evaluate(() => window.__oq.resume.intro.facts);
  for (const c of coinsAt) {
    await onto(c.x, c.y + 14); await sleep(300);
    const shown = await L((s) => ({ active: s.dlg.active, who: s.dlg.name.text, text: s.dlg.full }));
    assert.ok(shown.active && shown.who === `FACT ${c.fact + 1}/10`, `fact ${c.fact + 1} appears`);
    assert.ok(facts[c.fact].startsWith(shown.text.replace(/\n/g, ' ').slice(0, 12)), 'fact text shown');
    await dismiss();
  }
  assert.equal((await L((s) => s.hudInfo())).text, 'FACTS 10/10');
  ok('world 1: 10 fact coins, each opens its own fact, HUD shows FACTS 10/10');

  // ---------- combat: stomp a bug, then get hurt by one
  await startWorld(1); await dismiss();
  const bug = await L((s) => { const e = s.enemies.getChildren()[0]; return { x: e.x, top: e.body.top }; });
  // in-page, frame-accurate: drop the hero onto the bug and record the strongest upward velocity afterwards
  const minVy = await page.evaluate(([x, feet]) => new Promise((res) => {
    const sc = window.__oq.game.scene.getScene('Level'), p = sc.player;
    p.teleport(x, feet); p.body.setVelocity(0, 0);
    let min = 0, t0 = performance.now();
    const key = (type) => window.dispatchEvent(new KeyboardEvent(type, { code: 'Enter' }));
    const tick = (t) => {
      if (sc.dlg.active) { key('keydown'); key('keyup'); }      // a fact coin on the way down may open its dialogue
      else min = Math.min(min, p.body.velocity.y);
      if (t - t0 > 2200) res(min); else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), [bug.x, bug.top - 44]);
  const alive = await L((s) => s.enemies.getChildren().filter((e) => !e.dead).length);
  console.log(`      stomp: bounce vy=${minVy.toFixed(0)}, bugs left=${alive}; target`, Math.round(bug.x), Math.round(bug.top), JSON.stringify(await L((s, p, st) => ({ bugs: s.enemies.getChildren().map((e) => [Math.round(e.x), Math.round(e.body.top), e.dead]), px: Math.round(p.x), feet: Math.round(p.feetY), coins: st.coins, resp: s.respawning, frozen: s.frozen }))));
  assert.ok(minVy < -150 && alive === 1, 'stomping defeats the bug and bounces the hero');
  const coinsBefore = await L((s, p, st) => st.coins);
  await L((s, p, st) => { st.coins = 8; });
  const b2 = await L((s) => { const e = s.enemies.getChildren().find((q) => !q.dead); return { x: e.x }; });
  await onto(b2.x - 7, 192);
  await page.waitForFunction(() => window.__oq.game.services.state.coins < 8, null, { timeout: 4000 });
  await sleep(900);
  const after = await L((s, p, st) => ({ coins: st.coins, x: p.x, inv: p.invulnerable }));
  console.log(`      hurt: coins 8 -> ${after.coins}, respawned at x=${after.x.toFixed(0)}`);
  assert.equal(after.coins, 5, 'being hit costs 3 coins'); assert.ok(after.x < 120, 'respawned at the start / checkpoint');
  void coinsBefore;
  ok('combat: stomp defeats + bounces, side hit costs 3 coins and respawns');

  // ---------- WORLD 2: three tasks -> three degrees, each opens a gate
  await startWorld(2); await dismiss();
  assert.equal(maps[2].gates, 3);
  const books = await L((s) => s.bookGroup.getChildren().map((b) => ({ x: b.x, y: b.y })));
  assert.equal(books.length, 5);
  for (const b of books) { await onto(b.x, b.y + 14); await sleep(260); }
  await sleep(400);
  assert.ok(await L((s) => s.dlg.active && s.dlg.name.text === 'DEGREE EARNED!'), 'degree 1 pop-up');
  await dismiss(); await sleep(700);
  assert.equal(await L((s) => s.gateGroup.getLength()), 2, 'gate 1 opened');
  await page.screenshot({ path: 'test-output/w2-degree1.png' });
  const stompTargets = await L((s) => s.enemies.getChildren().filter((e) => e.props.task === 't2').map((e) => e.x));
  assert.equal(stompTargets.length, 3);
  for (let i = 0; i < 3; i++) {
    const tgt = await L((s) => { const e = s.enemies.getChildren().find((q) => q.props.task === 't2' && !q.dead); return { x: e.x, top: e.body.top }; });
    await onto(tgt.x, tgt.top - 40); await sleep(700); await dismiss();
  }
  await sleep(500); await dismiss(); await sleep(700);
  assert.equal(await L((s) => s.gateGroup.getLength()), 1, 'gate 2 opened after 3 stomps');
  const lever = await L((s) => { const l = s.leverGroup.getChildren()[0]; return { x: l.x, y: l.y }; });
  await onto(lever.x, lever.y); await sleep(400); await dismiss(); await sleep(700);
  assert.equal(await L((s) => s.gateGroup.getLength()), 0, 'gate 3 opened after the lever');
  assert.equal((await L((s) => s.hudInfo())).text, 'DEGREES 3/3');
  ok('world 2: books, stomps and lever each earn a degree and open a gate (DEGREES 3/3)');

  // ---------- WORLD 3: mini-boss -> achievement -> gate
  await startWorld(3); await dismiss();
  assert.equal(maps[3].gates, 3);
  // in-page: drop onto the boss three times, waiting out its invulnerability blink between hits
  const bossLog = await page.evaluate(() => new Promise((res) => {
    const sc = window.__oq.game.scene.getScene('Level'), p = sc.player;
    const boss = sc.enemies.getChildren().find((q) => q.boss && q.props.boss === 0);
    const log = []; let nextDrop = 0, hits = 0, lastHp = boss.hp;
    const t0 = performance.now();
    const tick = (t) => {
      if (sc.dlg.active) { if (boss.dead) { res({ log, hits, dead: true }); return; } }
      if (boss.hp < lastHp) { hits++; log.push(boss.hp); lastHp = boss.hp; nextDrop = t + 1500; }
      if (!boss.dead && t >= nextDrop && !sc.respawning && !sc.dlg.active) { p.teleport(boss.x, boss.body.top - 44); p.body.setVelocity(0, 0); nextDrop = t + 700; }
      if (boss.dead || t - t0 > 14000) res({ log, hits, dead: boss.dead }); else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }));
  console.log('      boss hit log (hp after each stomp):', JSON.stringify(bossLog));
  assert.ok(bossLog.dead && bossLog.hits >= 2, 'boss defeated after repeated stomps');
  await sleep(400);
  const pages = [];
  for (let i = 0; i < 6; i++) { const d = await L((s) => ({ a: s.dlg.active, who: s.dlg.name.text })); if (!d.a) break; pages.push(d.who); await tap('Enter', 30); await sleep(250); await tap('Enter', 30); await sleep(250); }
  assert.ok(pages.includes('BOSS DEFEATED!') && pages.includes('ACHIEVEMENT'), 'boss shows its achievement: ' + pages.join('|'));
  await sleep(700);
  assert.equal(await L((s) => s.gateGroup.getLength()), 2, 'boss gate opened');
  assert.equal((await L((s) => s.hudInfo())).text, 'BOSSES 1/3');
  ok('world 3: three stomps beat the mini-boss, its achievement is shown, the floor gate opens');

  // ---------- WORLD 4: skill bars, moving platform, bonus pipe room
  await startWorld(4); await dismiss();
  assert.equal(maps[4].mplats, 2);
  const mp = await L((s) => { const m = s.movers[0]; return { x: m.s.x, y: m.s.y }; });
  await onto(mp.x, mp.y - 4);
  await sleep(350);
  const mx0 = await L((s, p) => p.x);
  await sleep(1400);
  const rode = await L((s, p) => ({ x: p.x, ground: p.onGround, feet: p.feetY, plat: s.movers[0].s.y - 4 }));
  console.log(`      moving platform carried the hero ${(rode.x - mx0).toFixed(0)}px, grounded=${rode.ground}`);
  assert.ok(rode.x - mx0 > 25 && rode.ground, 'rides the moving platform');
  await key.down('ArrowUp'); await sleep(120);
  const jumped = await L((s, p) => p.body.velocity.y < -80 || p.feetY < rode.feet - 8);
  await key.up('ArrowUp');
  assert.ok(jumped, 'can jump off a moving platform');
  await L((s) => s.enemies.getChildren().forEach((e) => { e.dead = true; e.body.enable = false; e.setVisible(false); }));   // coins are guarded by enemies; this check is about the skill bars
  const cat0 = await L((s) => s.coinGroup.getChildren().filter((c) => c.getData('cat') === 0).map((c) => ({ x: c.x, y: c.y })));
  assert.equal(cat0.length, 4);
  for (const c of cat0) { await onto(c.x, c.y + 14); await sleep(260); }
  let sk = (await L((s) => s.hudInfo())).skills;
  console.log('      skill bars:', sk.map((k) => k.frac.toFixed(2)).join(' '), '| coins left in level:', await L((s) => s.coinGroup.getLength()), '| collected ids:', await L((s, p, st) => [...st.collected].filter((i) => i.includes('skill')).join(',')));
  assert.ok(Math.abs(sk[0].frac - 4 / 7) < 0.01 && sk[1].frac === 0, 'skill bar 1 is 4/7 full');
  // bonus room through the pipe
  const pipeTop = await L((s) => ({ x: s.pipes[0].x + 16, y: s.pipes[0].y + 2 }));
  await onto(pipeTop.x, pipeTop.y); await sleep(300);
  await key.down('ArrowDown');
  await page.waitForFunction(() => window.__oq.game.scene.getScene('Level').mapKey === 'bonus-skills-a', null, { timeout: 4000 });
  await key.up('ArrowDown'); await sleep(1200);
  assert.equal(await L((s) => s.world), 4, 'bonus room keeps the world');
  const bc = await L((s) => s.coinGroup.getChildren().filter((c) => c.getData('cat') === 0).map((c) => ({ x: c.x, y: c.y })));
  assert.equal(bc.length, 3);
  for (const c of bc) { await onto(c.x, c.y + 14); await sleep(260); }
  sk = (await L((s) => s.hudInfo())).skills;
  assert.equal(sk[0].frac, 1, 'skill bar 1 full after bonus room');
  await page.screenshot({ path: 'test-output/w4-bonus.png' });
  const backPipe = await L((s) => ({ x: s.pipes[0].x + 16, y: s.pipes[0].y + 2 }));
  await onto(backPipe.x, backPipe.y); await sleep(300);
  await key.down('ArrowDown');
  await page.waitForFunction(() => window.__oq.game.scene.getScene('Level').mapKey === 'world4', null, { timeout: 4000 });
  await key.up('ArrowDown'); await sleep(1300);
  ok('world 4: moving platforms carry + allow jumping, coloured coins fill skill bars, bonus pipe room round-trip');

  // ---------- WORLD 5: ? blocks release certificates; printers shoot; trophy hall
  await startWorld(5); await dismiss();
  assert.equal(maps[5].qblocks, 4);
  await L((s) => s.enemies.getChildren().filter((e) => e.kind !== 'printer').forEach((e) => { e.dead = true; e.body.enable = false; e.setVisible(false); }));   // isolate the printer
  const pr = await L((s) => { const e = s.enemies.getChildren().find((q) => q.kind === 'printer'); return { x: e.x }; });
  await onto(pr.x + 70, 192);
  let shots = 0; const tp0 = Date.now();
  while (Date.now() - tp0 < 4500 && !shots) { shots = await L((s) => s.projectiles.getLength()); await sleep(100); }
  assert.ok(shots > 0, 'printer fires paper');
  await L((s) => s.enemies.getChildren().forEach((e) => { e.dead = true; e.body.enable = false; e.setVisible(false); }));   // the blocks check is about bumping, not the guards
  await L((s) => s.projectiles.getChildren().forEach((q) => q.destroy()));
  const blocks = await L((s) => s.qblocks.getChildren().map((b) => ({ x: b.x, y: b.y, award: b.getData('award') })));
  for (const b of blocks) {
    await page.evaluate(([x, feet]) => { const p = window.__oq.game.scene.getScene('Level').player; p.teleport(x, feet); }, [b.x, 192]);
    await sleep(500);
    await key.down('ArrowUp'); await sleep(260); await key.up('ArrowUp');
    await page.waitForFunction((i) => { const s = window.__oq.game.scene.getScene('Level'); return s.qblocks.getChildren().find((q) => q.getData('award') === i).getData('used'); }, b.award, { timeout: 3000 });
    await sleep(800);
    assert.ok(await L((s) => s.dlg.active && /CERTIFICATE/.test(s.dlg.name.text)), 'certificate pop-up for block ' + (b.award + 1));
    await dismiss();
  }
  assert.equal((await L((s) => s.hudInfo())).text, 'CERTS 4/4');
  ok('world 5: all four ? blocks release certificates (CERTS 4/4); printer jams fire paper');
  await startWorld(5); await dismiss();
  const golds = await L((s) => s.children.list.filter((c) => c.texture?.key === 'trophy' && c.frame.name === 1).length);
  assert.equal(golds, 4, 'trophy hall shows all four earned trophies');
  await onto(176 * 16 + 8, 192); await sleep(300);
  await tap('Enter'); await sleep(300);
  assert.ok(await L((s) => s.dlg.active && /CERTIFICATE 1/.test(s.dlg.name.text)), 'Enter at a trophy shows its certificate');
  await dismiss();
  await page.screenshot({ path: 'test-output/w5-hall.png' });
  ok('trophy hall: four gold trophies; Enter shows the certificate');

  // ---------- WORLD 6: link terminals, then the HIRE ME flag -> credits
  await startWorld(6); await dismiss();
  await page.evaluate(() => { window.__opened = []; window.open = (u) => { window.__opened.push(u); return null; }; });
  const term = await L((s) => { const i = s.interactables[0]; return { x: i.x, y: i.y + 8 }; });
  await onto(term.x, term.y); await sleep(300);
  await tap('Enter'); await sleep(300);
  assert.ok(await L((s) => s.dlg.active && /NOT SET/.test(s.dlg.name.text)), 'empty contact field explains how to set it');
  await dismiss();
  await page.evaluate(() => { window.__oq.resume.contact.email = 'hello@example.com'; });
  await tap('Enter'); await sleep(300);
  assert.deepEqual(await page.evaluate(() => window.__opened), ['mailto:hello@example.com'], 'terminal opens a mailto link');
  const links = await L((s) => s.interactables.length);
  assert.equal(links, 5);
  const hireGoal = await L((s) => ({ x: s.goal.x, y: s.goal.y, hire: s.goal.hire }));
  assert.ok(hireGoal.hire);
  await onto(hireGoal.x, hireGoal.y);
  await active('Credits'); await sleep(1200);
  await page.screenshot({ path: 'test-output/w6-credits.png' });
  assert.equal(await page.evaluate(() => window.__oq.game.services.state.tierTitle), 'HIRED!');
  await tap('Enter');
  await active('WorldMap'); await sleep(500);
  assert.ok((await wm()).done.includes(6));
  ok('world 6: link terminals open mailto/URLs, HIRE ME flag promotes to HIRED! and rolls the credits');

  // back to the Day-1 movement lab for the movement checks below
  await page.evaluate(() => window.__oq.game.scene.getScene('WorldMap').scene.start('Level', { map: 'test-level' }));
  await page.waitForFunction(() => window.__oq.game.scene.getScene('Level')?.mapKey === 'test-level' && window.__oq.game.scene.getScene('Level').player, null, { timeout: 8000 });
  await sleep(900);

  // ---------- walk vs run
  await placeAt(40 * 16, 192); await settle();
  let x0 = await L((s, p) => p.x);
  await key.down('ArrowRight'); await sleep(700);
  const walkV = await L((s, p) => p.body.velocity.x);
  await key.down('Shift'); await sleep(700);
  const runV = await L((s, p) => p.body.velocity.x);
  await key.up('Shift'); await key.up('ArrowRight');
  const x1 = await L((s, p) => p.x);
  console.log(`      walk vx=${walkV.toFixed(0)} run vx=${runV.toFixed(0)} moved=${(x1 - x0).toFixed(0)}px`);
  assert.ok(x1 > x0 + 40, 'hero moved right');
  assert.ok(walkV > 70 && walkV < 90, 'walk speed ~80');
  assert.ok(runV > walkV + 30, 'run is faster than walk');
  ok('walk and run');

  // ---------- jump height: tap vs hold
  const measureJump = async (holdMs) => {
    await placeAt(80, 192); await settle();
    const y0 = await L((s, p) => p.feetY);
    await key.down('ArrowUp'); 
    let minY = y0;
    const t0 = Date.now();
    while (Date.now() - t0 < 700) {
      if (Date.now() - t0 > holdMs) await key.up('ArrowUp').catch(() => {});
      minY = Math.min(minY, await L((s, p) => p.feetY));
      await sleep(8);
    }
    await key.up('ArrowUp');
    return y0 - minY;
  };
  const tapH = await measureJump(40), holdH = await measureJump(600);
  console.log(`      tap jump=${tapH.toFixed(0)}px hold jump=${holdH.toFixed(0)}px`);
  assert.ok(holdH > tapH * 1.5, 'variable jump height');
  assert.ok(holdH > 44 && holdH < 70, 'held jump about 3 tiles');
  ok('jump + variable height');

  // ---------- long jump over the 5 tile gap (x 51..55 tiles = 816..895px)
  await placeAt(48 * 16, 192); await settle();
  await key.down('Shift'); await key.down('ArrowRight'); await sleep(450);
  await key.down('ArrowUp'); await sleep(900);
  await key.up('ArrowUp'); await key.up('ArrowRight'); await key.up('Shift');
  await sleep(300);
  const lx = await L((s, p) => p.x), lyFeet = await L((s, p) => p.feetY);
  console.log(`      after long jump x=${lx.toFixed(0)} feetY=${lyFeet.toFixed(0)}`);
  assert.ok(lx > 56 * 16 && lyFeet <= 193, 'cleared the 5-tile gap and landed on the far side');
  ok('Shift+Up long jump clears the 5-tile gap');
  await page.screenshot({ path: 'test-output/03-after-longjump.png' });

  // ---------- camera look-ahead
  await placeAt(62 * 16, 192); await settle();
  await key.down('ArrowRight'); await sleep(900);
  const camR = await L((s, p) => s.cameras.main.scrollX + 128 - p.x);
  await key.up('ArrowRight'); await key.down('ArrowLeft'); await sleep(1200);
  const camL = await L((s, p) => s.cameras.main.scrollX + 128 - p.x);
  await key.up('ArrowLeft');
  console.log(`      camera lead moving right=${camR.toFixed(0)} left=${camL.toFixed(0)}`);
  assert.ok(camR > 8 && camL < -8, 'camera leads in the facing direction');
  ok('camera look-ahead');

  // ---------- coin pickup + XP
  const coins0 = await L((s, p, st) => st.coins), xp0 = await L((s, p, st) => st.xp);
  await placeAt(6 * 16 + 8, 192); await sleep(500);
  const coins1 = await L((s, p, st) => st.coins);
  const xp1 = await L((s, p, st) => st.xp);
  assert.ok(coins1 > coins0 && xp1 - xp0 === coins1 - coins0, `coin collected (${coins0}->${coins1}), XP rose by the same amount`);
  ok('coin pickup adds coins + XP');

  // ---------- coyote time (real physics): jump shortly AFTER walking off a ledge
  const raf = (fn, arg) => page.waitForFunction(`(() => { const s = window.__oq.game.scene.getScene('Level'); const p = s.player; return (${fn.toString()})(s, p, ${JSON.stringify(arg ?? null)}); })()`, null, { polling: 'raf', timeout: 4000 });
  const minVyAfter = async (ms) => { let m = 1e9; const t = Date.now(); globalThis.__s = []; while (Date.now() - t < ms) { const r = await L((s, p) => [Math.round(p.body.velocity.y), Math.round(p.feetY), p.onGround, p.ctrl.buffer]); globalThis.__s.push(r.join('/')); m = Math.min(m, r[0]); await sleep(6); } return m; };
  // all timing inside the page: walk off the ledge, wait delayMs after leaving it, press jump, record min vy
  const ledgeTest = (delayMs) => page.evaluate((delayMs) => new Promise((res) => {
    const key = (type, code) => window.dispatchEvent(new KeyboardEvent(type, { code }));
    const p = window.__oq.game.scene.getScene('Level').player;
    p.teleport(35 * 16 + 4, 192);
    let left = null, pressed = null, minVy = 1e9;
    key('keydown', 'ArrowRight');
    const tick = (t) => {
      if (left === null && !p.onGround && p.x > 36 * 16) left = t;
      if (left !== null && pressed === null && t - left >= delayMs) { key('keydown', 'ArrowUp'); pressed = t; }
      if (pressed !== null) minVy = Math.min(minVy, p.body.velocity.y);
      if (pressed !== null && t - pressed > 150) { key('keyup', 'ArrowUp'); key('keyup', 'ArrowRight'); res(minVy); }
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), delayMs);
  const late = await ledgeTest(50); await sleep(1400); const tooLate = await ledgeTest(220); await sleep(1400);
  console.log(`      coyote: jump 50ms after ledge -> min vy ${late.toFixed(0)}; 220ms after -> ${tooLate.toFixed(0)}`);
  assert.ok(late < -200, 'jump accepted within coyote window');
  assert.ok(tooLate > -50, 'jump rejected after coyote window');
  ok('coyote time in-engine (+ negative control)');

  // ---------- jump buffer in-engine: press jump just BEFORE landing
  // Frame-accurate, all inside the page (round-trips are too slow for a 70ms window):
  // teleport, wait until the hero falls below pressAt, dispatch ArrowUp, record min vy for 450ms.
  const bufferTest = (startFeetY, pressAtFeetY) => page.evaluate(([start, at]) => new Promise((res) => {
    const p = window.__oq.game.scene.getScene('Level').player;
    p.teleport(100, start); p.body.setVelocity(0, 0);
    let pressedAt = null, minVy = 1e9;
    const tick = (t) => {
      if (pressedAt === null && p.feetY > at) { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' })); pressedAt = t; }
      if (pressedAt !== null) minVy = Math.min(minVy, p.body.velocity.y);
      if (pressedAt !== null && t - pressedAt > 450) { window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowUp' })); res(minVy); }
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), [startFeetY, pressAtFeetY]);
  const early = await bufferTest(150, 180), tooEarly = await bufferTest(100, 112);
  console.log(`      buffer: press ~70ms before landing -> min vy ${early.toFixed(0)}; ~300ms before -> ${tooEarly.toFixed(0)}`);
  assert.ok(early < -200, 'buffered jump fired on landing');
  assert.ok(tooEarly > -50, 'press that is too early is ignored');
  ok('jump buffer in-engine (+ negative control)');
  await sleep(500);

  // ---------- pipe -> bonus room -> back
  await placeAt(12 * 16 + 16, 10 * 16); await settle();
  await key.down('ArrowDown');
  await page.waitForFunction(() => window.__oq.game.scene.getScene('Level').mapKey === 'bonus-room', null, { timeout: 4000 });
  await key.up('ArrowDown');
  await sleep(1200);
  await page.screenshot({ path: 'test-output/04-bonus-room.png' });
  ok('pipe entry teleports to bonus room');
  // collect a bonus coin, then go back
  await placeAt(3 * 16 + 8, 12 * 16); await sleep(400);
  await L((s, p) => p.teleport(16 * 16 + 16, 10 * 16));
  await settle();
  await key.down('ArrowDown');
  await page.waitForFunction(() => window.__oq.game.scene.getScene('Level').mapKey === 'test-level', null, { timeout: 4000 });
  await key.up('ArrowDown');
  await sleep(1400);
  const back = await L((s, p) => ({ x: p.x, map: s.mapKey, locked: p.locked }));
  console.log('      back in', back.map, 'x=' + back.x.toFixed(0));
  assert.ok(Math.abs(back.x - (12 * 16 + 16)) < 6 && !back.locked, 'emerged from the pipe, control returned');
  ok('exit pipe returns to the level');
  await page.screenshot({ path: 'test-output/05-back-from-pipe.png' });

  // ---------- coffee: speed + double jump + HUD meter
  await placeAt(63 * 16 + 8, 8 * 16 + 8); await sleep(500);
  assert.ok(await L((s, p, st) => st.coffeeActive), 'coffee active');
  await placeAt(80 * 12, 192); await settle();
  await key.down('ArrowUp'); await sleep(250); await key.up('ArrowUp'); await sleep(60);
  const y1 = await L((s, p) => p.feetY);
  await key.down('ArrowUp'); await sleep(200);
  let apex = y1;
  for (let i = 0; i < 40; i++) { apex = Math.min(apex, await L((s, p) => p.feetY)); await sleep(10); }
  await key.up('ArrowUp');
  console.log(`      double-jump apex height above floor = ${(192 - apex).toFixed(0)}px`);
  assert.ok(192 - apex > 75, 'double jump reaches higher than a single jump');
  await page.screenshot({ path: 'test-output/06-coffee.png' });
  ok('coffee: power-up + double jump');

  // ---------- pit respawn
  await placeAt(36 * 16 + 8, 192); await L((s, p) => p.body.setVelocity(0, 0));
  await key.down('ArrowRight'); await key.up('ArrowRight');
  await L((s, p) => p.teleport(36 * 16 + 24, 14 * 16 + 40));
  await sleep(1100);
  const rp = await L((s, p) => ({ x: p.x, y: p.feetY }));
  assert.ok(rp.y < 200 && rp.y > 100, 'respawned on solid ground');
  ok('pit respawn');

  // ---------- pause / mute / persistence
  await tap('Escape'); await sleep(300);
  assert.ok(await page.evaluate(() => window.__oq.game.scene.isActive('Pause')), 'pause opened');
  await page.screenshot({ path: 'test-output/07-pause.png' });
  await tap('Escape'); await sleep(400);
  assert.ok(await page.evaluate(() => window.__oq.game.scene.isActive('Level')), 'resumed');
  await tap('KeyM');
  assert.equal(await page.evaluate(() => window.__oq.game.services.audio.muted), true);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('office-quest-save-v1')));
  assert.ok(saved.progress.coins > 0 && saved.settings.muted === true, 'progress + settings saved to localStorage');
  ok('pause/resume, mute (M), localStorage save');

  // ---------- level-up look swap
  await L((s, p, st) => { for (let i = 0; i < 90; i++) st.collectCoin('test:x' + i); });
  await sleep(600);
  const tier = await L((s, p, st) => st.tier);
  assert.ok(tier >= 4);
  await page.screenshot({ path: 'test-output/08-levelup.png' });
  ok('career tier increased to ' + tier + ' with new hero look');

  // ---------- fps
  const fps = await page.evaluate(() => window.__oq.game.loop.actualFps);
  console.log('      actualFps (headless software GL):', fps.toFixed(0));

  // ---------- returning visitor: save persists across a reload, Title offers CONTINUE
  await page.goto(`http://localhost:${PORT}/?debug`);
  await active('Title'); await sleep(500);
  const items2 = await sceneState(() => window.__oq.game.scene.getScene('Title').items.map((i) => i.label));
  assert.deepEqual(items2, ['CONTINUE', 'RECRUITER MODE', 'REPLAY INTRO']);
  await tap('Enter'); await active('WorldMap'); await sleep(400);
  assert.ok((await wm()).done.includes(1) , 'cleared world persisted');
  ok('reload: save persisted, CONTINUE goes straight to the world map');

  // ---------- touch controls on a phone-sized landscape viewport
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  const tp = await ctx.newPage();
  tp.on('pageerror', (e) => errors.push('touch: ' + String(e)));
  await tp.goto(`http://localhost:${PORT}/?debug&reset&touch`);
  await tp.waitForFunction(() => window.__oq?.game?.scene.isActive('Title'), null, { timeout: 15000 });
  const hold = (sel, ms) => tp.evaluate(([sel, ms]) => new Promise((res) => {
    const el = document.querySelector(sel);
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }));
    setTimeout(() => { el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 })); res(); }, ms);
  }), [sel, ms]);
  const tActive = (k) => tp.waitForFunction((k) => window.__oq.game.scene.isActive(k), k, { timeout: 8000 });
  await hold('#abtns [data-a="jump"]', 80);                      // A confirms START on the title screen
  await tActive('Entrance');
  await sleep(500);
  await hold('#sys [data-a="pause"]', 80);                       // pause button skips the cutscene
  await tActive('Login');
  await sleep(600);
  await tp.screenshot({ path: 'test-output/09a-touch-login.png' });
  await tp.click('#login-skip');                                 // SKIP > continues as guest
  await tActive('WorldMap');
  await sleep(600);
  await tp.screenshot({ path: 'test-output/09b-touch-map.png' });
  await hold('#abtns [data-a="jump"]', 80);                      // A starts the selected world
  await tActive('Level');
  await sleep(1000);                                              // the intro dialogue opens ~0.45s after the level starts
  for (let k = 0; k < 20 && await tp.evaluate(() => window.__oq.game.scene.getScene('Level').dlg?.active ?? true); k++) { await hold('#abtns [data-a="jump"]', 40); await sleep(350); }   // A closes the intro dialogue
  await sleep(900);
  const tx0 = await tp.evaluate(() => window.__oq.game.scene.getScene('Level').player.x);
  await hold('#dpad [data-a="right"]', 600);
  const tx1 = await tp.evaluate(() => window.__oq.game.scene.getScene('Level').player.x);
  await sleep(300);
  const tj = tp.evaluate(() => new Promise((res) => { const p = window.__oq.game.scene.getScene('Level').player; const y0 = p.feetY; let m = y0; const t0 = performance.now(); const f = () => { m = Math.min(m, p.feetY); performance.now() - t0 > 600 ? res(y0 - m) : requestAnimationFrame(f); }; f(); }));
  await hold('#abtns [data-a="jump"]', 300);
  const jumpH = await tj;
  console.log('      touch state:', JSON.stringify(await tp.evaluate(() => { const l = window.__oq.game.scene.getScene('Level'); return { map: l.mapKey, dlg: l.dlg.active, frozen: l.frozen, resp: l.respawning, locked: l.player.locked, hud: l.hudInfo(), seen: window.__oq.game.services.save.flags }; })));
  await tp.screenshot({ path: 'test-output/09-touch.png' });
  console.log(`      touch: D-pad right moved ${(tx1 - tx0).toFixed(0)}px, A jump height ${jumpH.toFixed(0)}px`);
  assert.ok(tx1 - tx0 > 25, 'touch D-pad moves the hero');
  assert.ok(jumpH > 30, 'touch A button jumps');
  assert.ok(await tp.evaluate(() => getComputedStyle(document.getElementById('touch')).display !== 'none'), 'touch overlay visible');
  await tp.screenshot({ path: 'test-output/09-touch.png' });
  await ctx.close();
  ok('touch D-pad + A/B buttons work');

  assert.deepEqual(errors, [], 'no console/page errors');
  ok('no console or page errors');
  console.log(`\n${passed} e2e checks passed`);
} catch (e) {
  console.error('\nE2E FAILED:', e.message, (e.stack||'').split('\n').slice(1,3).join(' | '));
  console.error('errors seen:', errors);
  await page.screenshot({ path: 'test-output/failure.png' }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
  server.kill();
}
