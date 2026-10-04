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
  for (let i = 0; i < 40 && !(await page.evaluate(() => window.__oq.game.scene.isActive('Login'))); i++) { await tap('Enter', 40); await sleep(350); }
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
  // clear the level through the finish flag
  await placeAt(76 * 16, 192); await sleep(300);
  await L((s, p) => p.teleport(77 * 16 + 8, 192));
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
  ok('Recruiter Mode unlocks everything; H jumps straight to Contact (world 6)');

  // pause menu -> WORLD MAP
  await tap('Escape'); await sleep(300);
  for (let i = 0; i < 5; i++) { await tap('ArrowDown', 40); await sleep(80); }
  await tap('Enter');
  await active('WorldMap'); await sleep(500);
  await tap('Enter');
  await active('Level'); await sleep(900);
  ok('pause menu returns to the world map; map starts a level again');

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
  const coins0 = await L((s, p, st) => st.coins);
  await placeAt(6 * 16 + 8, 192); await sleep(500);
  const coins1 = await L((s, p, st) => st.coins);
  const xp1 = await L((s, p, st) => st.xp);
  assert.ok(coins1 > coins0 && xp1 === coins1, `coin collected (${coins0}->${coins1})`);
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
  await L((s, p, st) => { for (let i = 0; i < 30; i++) st.collectCoin('test:x' + i); });
  await sleep(600);
  const tier = await L((s, p, st) => st.tier);
  assert.ok(tier >= 3);
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
  await sleep(900);
  const tx0 = await tp.evaluate(() => window.__oq.game.scene.getScene('Level').player.x);
  await hold('#dpad [data-a="right"]', 600);
  const tx1 = await tp.evaluate(() => window.__oq.game.scene.getScene('Level').player.x);
  await sleep(300);
  const tj = tp.evaluate(() => new Promise((res) => { const p = window.__oq.game.scene.getScene('Level').player; const y0 = p.feetY; let m = y0; const t0 = performance.now(); const f = () => { m = Math.min(m, p.feetY); performance.now() - t0 > 600 ? res(y0 - m) : requestAnimationFrame(f); }; f(); }));
  await hold('#abtns [data-a="jump"]', 300);
  const jumpH = await tj;
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
