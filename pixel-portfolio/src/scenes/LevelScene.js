import Phaser from 'phaser';
import { GAME, CAMERA, RESPAWN, ENEMIES, STAR, SPRING, PALETTE as C } from '../config.js';
import dialogue from '../data/dialogue.json';
import resume from '../data/resume.json';
import worldData from '../data/worlds.json';
import { Player } from '../entities/Player.js';
import { Enemy, Paper } from '../entities/Enemy.js';
import { PrinterBoss, Thrower } from '../entities/PrinterBoss.js';
import { FX } from '../systems/FX.js';
import { DialogueBox } from '../systems/DialogueBox.js';
import { FONT } from '../systems/UI.js';

const props = (o) => Object.fromEntries((o.properties ?? []).map((p) => [p.name, p.value]));
// Phaser hands map-level properties over as an object ({name: value}); layer/object ones stay Tiled arrays
const mapProps = (map) => (Array.isArray(map.properties) ? Object.fromEntries(map.properties.map((p) => [p.name, p.value])) : { ...(map.properties ?? {}) });
const hex = (s) => parseInt(s.slice(1), 16);

/**
 * Generic level scene: builds any Tiled JSON map from /public/maps. Every world is its own map with its own
 * rules; the rules are driven by object types in the map's object layer:
 *
 *   spawn, pipe, checkpoint, goal (+hire), sign, coffee           basics
 *   coin (+fact | +cat)     fact coins (World 1) / skill-coloured coins (World 4) / plain XP coins
 *   enemy (+kind, +task, +boss, +gate, +range)                    bug, clock, invite, spam, printer, megabug...
 *   task (+id,type,need,degree,gate,label), book, lever            "earn a degree" mini-tasks (World 2)
 *   gate (+id)                                                      wall that opens when a task / boss is done
 *   qblock (+award)                                                 "?" block that releases a certificate (World 5)
 *   trophy (+award), link (+kind)                                   interactables: press Enter / OK
 *   mplat (+dx,dy,speed)                                            moving platform
 *   star, hblock                                                    star power (immunity); hblock = invisible block that reveals a star
 *   spring, crumble (+len,f), laser (+period,on,phase)              springs, falling platforms, blinking laser gates
 *   deco (+kind)                                                    scenery props;  printerboss = the final boss arena
 */
export class LevelScene extends Phaser.Scene {
  constructor() { super('Level'); }

  init(data) {
    this.mapKey = data?.map ?? 'test-level';
    this.world = data?.world ?? null;      // world number when launched from the map
    this.spawnName = data?.spawn ?? 'start';
    this.finished = false; this.transitioning = false; this.respawning = false; this.frozen = false;
    // the scene object is reused for every map: clear anything a previous map left behind
    this.goal = null; this.boss = null; this.thrower = null; this.bossObj = null;
  }

  create() {
    const sv = this.sv = this.game.services;
    this.audio = sv.audio;
    this.fx = new FX(this, sv.save.settings);
    this.meta = worldData.worlds.find((w) => w.id === this.world);
    this.speedMult = 1 + ENEMIES.speedPerDifficulty * ((this.meta?.difficulty ?? 1) - 1);
    this.pipes = []; this.checkpoints = []; this.interactables = []; this.sayQueue = [];
    this.tasks = {}; this.gates = {}; this.movers = []; this.hblocks = []; this.lasers = [];

    this.buildMap();
    this.buildBackground();
    this.buildObjects();
    this.buildPlayer();
    this.setupCamera();
    this.setupCollisions();
    this.fx.ambient(this.mapOpts.theme);
    if (this.bossObj) this.setupBoss();

    this.dlg = new DialogueBox(this, sv, { y: 40, vars: { name: resume.meta.name.toUpperCase() } });
    this.prompt = this.add.text(0, 0, 'ENTER', { fontFamily: FONT, fontSize: '8px', color: C.yellow, backgroundColor: 'rgba(15,15,27,0.85)', padding: { x: 2, y: 2 } })
      .setOrigin(0.5, 1).setDepth(60).setVisible(false);

    if (!this.scene.isActive('HUD')) this.scene.launch('HUD'); else this.scene.bringToTop('HUD');

    this.onLevelUp = (tier) => { this.player.setTier(tier); sv.audio.sfx('levelup'); };
    sv.state.on('levelup', this.onLevelUp);
    this.onHidden = () => this.pauseGame();
    this.game.events.on('hidden', this.onHidden);
    this.onDefeated = (e) => this.enemyDefeated(e);
    this.events.on('enemy-defeated', this.onDefeated);
    this.events.once('shutdown', () => {
      sv.state.off('levelup', this.onLevelUp); this.game.events.off('hidden', this.onHidden);
      this.events.off('enemy-defeated', this.onDefeated);   // (the physics world is rebuilt on every scene start)
    });

    this.cameras.main.fadeIn(CAMERA.fadeMs, 15, 15, 27);
    if (this.mapOpts.intro && !sv.save.flags['seen_' + this.mapKey]) {
      sv.save.flags['seen_' + this.mapKey] = true; sv.save.save();
      this.time.delayedCall(450, () => this.say(dialogue.worldIntro[this.mapKey] ?? []));
    }
  }

  // ---------------------------------------------------------------- building
  buildBackground() {
    const theme = this.mapOpts.theme;
    this.cameras.main.setBackgroundColor(C.black);
    this.parallax = [];
    if (!theme || theme === 'none') return;
    const key = (layer) => (theme === 'city' ? `bg_${layer}` : `bg_${theme}_${layer}`);
    [['far', 0.05, -30], ['mid', 0.2, -20], ['near', 0.45, -10]].forEach(([layer, factor, depth]) => {
      const ts = this.add.tileSprite(0, 0, GAME.width, GAME.height, key(layer)).setOrigin(0).setScrollFactor(0).setDepth(depth);
      this.parallax.push({ ts, factor });
    });
  }

  buildMap() {
    this.map = this.make.tilemap({ key: this.mapKey });
    this.mapOpts = mapProps(this.map);
    const tileset = this.map.addTilesetImage('tiles', 'tiles');
    this.groundLayer = this.map.createLayer('ground', tileset, 0, 0).setDepth(2);
    this.pipeLayer = this.map.createLayer('pipes', tileset, 0, 0).setDepth(6);   // above the hero so pipe entry hides him
    this.groundLayer.setCollisionByExclusion([-1]);
    this.pipeLayer.setCollisionByExclusion([-1]);
    this.mapW = this.map.widthInPixels; this.mapH = this.map.heightInPixels;
    this.physics.world.setBounds(0, 0, this.mapW, this.mapH + 96);
    this.physics.world.setBoundsCollision(true, true, true, false);   // open at the bottom: pits
  }

  solidAt(x, y) { return this.groundLayer.hasTileAtWorldXY(x, y) || this.pipeLayer.hasTileAtWorldXY(x, y); }

  buildObjects() {
    const { state, save } = this.sv;
    const calm = save.settings.reducedMotion;
    this.coinGroup = this.physics.add.group({ allowGravity: false, immovable: true });
    this.coffeeGroup = this.physics.add.group({ allowGravity: false, immovable: true });
    this.enemies = this.add.group();
    this.projectiles = this.add.group();
    this.gateGroup = this.physics.add.staticGroup();
    this.qblocks = this.physics.add.staticGroup();
    this.mplats = this.physics.add.group({ allowGravity: false, immovable: true });
    this.bookGroup = this.physics.add.group({ allowGravity: false, immovable: true });
    this.leverGroup = this.physics.add.group({ allowGravity: false, immovable: true });
    this.starGroup = this.physics.add.group({ allowGravity: false, immovable: true });
    this.springs = this.physics.add.group({ allowGravity: false, immovable: true });
    this.crumbles = this.physics.add.staticGroup();
    this.solidBlocks = this.physics.add.staticGroup();
    this.spawns = {};
    let coinIndex = 0;

    for (const o of this.map.getObjectLayer('objects').objects) {
      const p = props(o);
      switch (o.type) {
        case 'spawn': this.spawns[o.name] = { x: o.x, y: o.y, emerge: !!p.emerge }; break;
        case 'pipe': this.pipes.push({ x: o.x, y: o.y, w: o.width, target: p.target, spawn: p.spawn }); break;
        case 'goal': {
          const flag = this.add.sprite(o.x, o.y, 'flag', 1).setOrigin(0.5, 1).setDepth(3).setTint(p.hire ? 0xf8d878 : 0xf8d878);
          if (p.hire) flag.setScale(1.5);
          this.goal = { x: o.x, y: o.y, hire: !!p.hire, flag };
          break;
        }
        case 'checkpoint': {
          const flag = this.add.sprite(o.x, o.y, 'flag', 0).setOrigin(0.5, 1).setDepth(3);
          const cp = { x: o.x, y: o.y, flag, active: state.checkpoint?.map === this.mapKey && state.checkpoint.x === o.x };
          if (cp.active) flag.setFrame(1);
          this.checkpoints.push(cp);
          break;
        }
        case 'coin': {
          const idx = coinIndex++;
          const kind = p.fact !== undefined ? 'fact' : p.cat !== undefined ? `skill:${p.cat}` : 'coin';
          const id = `${this.mapKey}:${kind === 'coin' ? 'coin' : kind}:${idx}`;
          const seen = state.hasCollected(id);
          if (seen && kind !== 'fact') break;                                   // fact coins always re-appear (as ghosts)
          const s = this.physics.add.sprite(o.x, o.y, 'coin', 0).setDepth(8);
          s.body.setAllowGravity(false); s.body.setSize(10, 12);
          s.setData({ id, fact: p.fact, cat: p.cat, ghost: seen });
          if (p.cat !== undefined) s.setTint(hex(resume.skills[p.cat].color));
          if (p.fact !== undefined) s.setTint(0xfce0a8);
          if (seen) s.setAlpha(0.45);
          if (!calm) { s.anims.play('coin-spin'); s.anims.setProgress(Math.random()); }
          this.coinGroup.add(s);
          break;
        }
        case 'coffee': {
          const s = this.physics.add.sprite(o.x, o.y, 'coffee').setDepth(8);
          s.body.setAllowGravity(false);
          if (!calm) this.tweens.add({ targets: s, y: o.y - 3, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
          this.coffeeGroup.add(s);
          break;
        }
        case 'sign': this.makeSign(o, p); break;
        case 'enemy': {
          const e = new Enemy(this, o.x, o.y, p.kind, p, this.speedMult);
          this.enemies.add(e);
          break;
        }
        case 'task': this.makeTask(o, p); break;
        case 'book': {
          const s = this.physics.add.sprite(o.x, o.y, 'book').setDepth(8); s.body.setAllowGravity(false); s.setData('task', p.task);
          if (!calm) this.tweens.add({ targets: s, y: o.y - 2, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
          this.bookGroup.add(s);
          break;
        }
        case 'lever': {
          const s = this.physics.add.sprite(o.x, o.y, 'lever', 0).setOrigin(0.5, 1).setDepth(4); s.body.setAllowGravity(false); s.setData('task', p.task);
          this.leverGroup.add(s);
          break;
        }
        case 'gate': {
          const g = this.add.tileSprite(o.x + o.width / 2, o.y + o.height / 2, o.width, o.height, 'tiles', 2).setDepth(3);
          this.gateGroup.add(g);
          (this.gates[p.id] ??= []).push(g);
          break;
        }
        case 'qblock': {
          const b = this.add.image(o.x + 8, o.y + 8, 'tiles', 10).setDepth(3);
          this.qblocks.add(b); b.setData({ award: p.award, used: false });
          break;
        }
        case 'mplat': {
          const s = this.physics.add.image(o.x + 16, o.y + 4, 'mplat').setDepth(4);
          s.body.setAllowGravity(false); s.body.setImmovable(true); s.body.setSize(32, 8);
          const mv = { s, x0: o.x + 16, y0: o.y + 4, x1: o.x + 16 + (p.dx ?? 0), y1: o.y + 4 + (p.dy ?? 0), speed: p.speed ?? 30, toEnd: true };
          this.movers.push(mv); this.mplats.add(s);
          s.body.setFrictionX(1);          // physics groups reset friction to 0; 1 = the rider is carried along with the platform
          break;
        }
        case 'trophy': {
          const done = state.earned.awards.has(p.award);
          this.add.sprite(o.x, o.y, 'trophy', done ? 1 : 0).setOrigin(0.5, 1).setDepth(4);
          this.add.rectangle(o.x, o.y, 22, 6, 0x7c7c7c).setOrigin(0.5, 0).setDepth(3);
          this.interactables.push({ x: o.x, y: o.y - 8, r: 22, run: () => this.showAward(p.award, done) });
          break;
        }
        case 'link': this.makeLink(o, p); break;
        case 'deco': {
          const d = this.add.sprite(o.x, o.y, `deco_${p.kind}`, p.kind === 'fan' ? 0 : undefined).setOrigin(0.5, 1).setDepth(1.5);
          if (p.kind === 'fan' && !calm) d.anims.play('fan-spin');
          break;
        }
        case 'star': this.makeStar(o.x, o.y); break;
        case 'hblock': {
          const hb = { x: o.x + 8, y: o.y + 8, used: false };
          if (state.recruiter) {                       // Recruiter Mode: the secret is out in the open
            hb.used = true;
            this.add.image(hb.x, hb.y, 'tiles', 10).setAlpha(0.5).setDepth(3);
            this.makeStar(hb.x, hb.y - 20);
          } else this.hblocks.push(hb);
          break;
        }
        case 'spring': {
          const sp = this.physics.add.sprite(o.x, o.y, 'spring', 0).setOrigin(0.5, 1).setDepth(4);
          sp.body.setAllowGravity(false); sp.body.setImmovable(true); sp.body.setSize(14, 8); sp.body.setOffset(1, 8);
          this.springs.add(sp);
          break;
        }
        case 'crumble': {
          const len = p.len ?? 2;
          const c = this.add.tileSprite(o.x + len * 8, o.y + 8, len * 16, 16, 'tiles', p.f ?? 21).setDepth(3);
          this.crumbles.add(c);
          c.setData({ homeX: c.x, homeY: c.y, state: 'idle', at: 0 });
          break;
        }
        case 'laser': {
          const w = o.width || 4, cx = o.x + w / 2;
          const l = { x: o.x, y: o.y, w, h: o.height, period: p.period ?? 2.6, on: p.on ?? 1.2, phase: p.phase ?? 0 };
          l.glow = this.add.rectangle(cx, o.y + o.height / 2, w + 6, o.height, 0xf83800, 0.28).setDepth(5.9).setAlpha(0);
          l.beam = this.add.rectangle(cx, o.y + o.height / 2, w, o.height, 0xfcfcfc).setStrokeStyle(1, 0xf83800).setDepth(6).setAlpha(0);
          this.add.rectangle(cx, o.y - 3, 12, 6, 0x2c2c44).setStrokeStyle(1, 0x0f0f1b).setDepth(6);
          this.add.rectangle(cx, o.y + o.height + 3, 12, 6, 0x2c2c44).setStrokeStyle(1, 0x0f0f1b).setDepth(6);
          this.lasers.push(l);
          break;
        }
        case 'printerboss': this.bossObj = o; break;
        default: break;
      }
    }
  }

  makeSign(o, p) {
    let str = dialogue.signs[p.dialogue] ?? p.text ?? p.dialogue ?? '';
    if (p.job !== undefined) { const j = resume.experience[p.job]; str = `FLOOR ${p.job + 1}\n${j.short ?? j.company.slice(0, 16)}`; }
    // dark backing keeps sign text readable on any background (contrast-safe)
    this.add.text(o.x, o.y, str, { fontFamily: FONT, fontSize: '8px', color: C.white, align: 'center', lineSpacing: 3,
      backgroundColor: 'rgba(15,15,27,0.82)', padding: { x: 3, y: 3 } }).setOrigin(0.5, 1).setDepth(3);
  }

  makeTask(o, p) {
    const t = { id: p.id, type: p.type, need: p.need ?? 1, count: 0, done: false, degree: p.degree, gate: p.gate };
    t.text = this.add.text(o.x, o.y, '', { fontFamily: FONT, fontSize: '8px', color: C.yellow, align: 'center', lineSpacing: 3,
      backgroundColor: 'rgba(15,15,27,0.85)', padding: { x: 3, y: 3 } }).setOrigin(0.5, 1).setDepth(3);
    t.label = p.label;
    this.tasks[p.id] = t;
    this.refreshTask(t);
  }

  refreshTask(t) {
    t.text.setText(t.done ? `DEGREE ${t.degree + 1}: EARNED!` : `${t.label}\n${t.count}/${t.need}`).setColor(t.done ? C.lime : C.yellow);
  }

  makeLink(o, p) {
    const label = { email: 'E-MAIL', linkedin: 'LINKEDIN', github: 'GITHUB', website: 'WEBSITE', resumePdf: 'RESUME' }[p.kind] ?? p.kind.toUpperCase();
    this.add.sprite(o.x, o.y, 'terminal').setOrigin(0.5, 1).setDepth(4);
    this.add.text(o.x, o.y - 18, label, { fontFamily: FONT, fontSize: '8px', color: C.cyan, backgroundColor: 'rgba(15,15,27,0.85)', padding: { x: 2, y: 2 } })
      .setOrigin(0.5, 1).setDepth(4);
    this.interactables.push({ x: o.x, y: o.y - 8, r: 20, run: () => this.openLink(p.kind, label) });
  }

  openLink(kind, label) {
    const v = (resume.contact[kind] ?? '').trim();
    if (!v) { this.say([{ who: `${label}: NOT SET YET`, text: `Add your ${label.toLowerCase()} to src/data/resume.json (contact.${kind}) and it will open from here.` }]); return; }
    const url = kind === 'email' ? `mailto:${v}` : kind === 'resumePdf' ? new URL(v, location.href).href : /^(https?:|mailto:)/i.test(v) ? v : `https://${v}`;
    this.audio.sfx('confirm');
    window.open(url, '_blank', 'noopener');
  }

  buildPlayer() {
    const sp = this.spawns[this.spawnName] ?? this.spawns.start ?? { x: 32, y: 192 };
    this.player = new Player(this, sp.x, sp.y, this.sv);
    this.spawnPoint = { x: sp.x, y: sp.y };
    if (sp.emerge) this.player.emerge();
  }

  setupCamera() {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.mapW, this.mapH);
    cam.setRoundPixels(true);
    cam.startFollow(this.player.zone, true, CAMERA.followLerpX, CAMERA.followLerpY);
    cam.setDeadzone(CAMERA.deadzone.width, CAMERA.deadzone.height);
    this.look = 0;
    cam.scrollX = Phaser.Math.Clamp(this.player.x - GAME.width / 2, 0, Math.max(0, this.mapW - GAME.width));
  }

  setupCollisions() {
    const z = this.player.zone;
    this.physics.add.collider(z, this.groundLayer);
    this.physics.add.collider(z, this.pipeLayer);
    // bodies that are not tiles report contact through platformContact so the hero can stand on and jump off them
    const ride = () => { if (z.body.touching.down) this.player.platformContact = true; };
    this.physics.add.collider(z, this.gateGroup, ride);
    this.physics.add.collider(z, this.mplats, ride);
    this.physics.add.collider(z, this.qblocks, (_, blk) => { ride(); this.tryBump(blk); });
    this.physics.add.collider(z, this.solidBlocks, ride);
    this.physics.add.collider(z, this.crumbles, (_, c) => { ride(); this.stepCrumble(c); });
    this.physics.add.overlap(z, this.springs, (_, sp) => this.hitSpring(sp));
    this.physics.add.overlap(z, this.starGroup, (_, st) => this.collectStar(st));
    // enemies live in a plain group (so their body settings stay intact); give each its own colliders
    for (const e of this.enemies.getChildren()) {
      this.physics.add.collider(e, this.groundLayer);
      this.physics.add.collider(e, this.pipeLayer);
      this.physics.add.collider(e, this.gateGroup);
      this.physics.add.overlap(z, e, () => this.onEnemyTouch(e));
    }
    this.physics.add.overlap(z, this.coinGroup, (_, coin) => this.collectCoin(coin));
    this.physics.add.overlap(z, this.coffeeGroup, (_, cup) => this.collectCoffee(cup));
    this.physics.add.overlap(z, this.bookGroup, (_, b) => this.collectBook(b));
    this.physics.add.overlap(z, this.leverGroup, (_, l) => this.pullLever(l));
  }

  // --------------------------------------------------------------- dialogue
  /** Show dialogue pages; the world freezes while the box is open. */
  say(lines, done) {
    if (!lines.length) { done?.(); return; }
    this.sayQueue.push([lines, done]);
    if (!this.dlg.active) this.nextSay();
  }
  nextSay() {
    const n = this.sayQueue.shift();
    if (!n) { this.frozen = false; this.physics.world.resume(); return; }
    this.frozen = true; this.physics.world.pause();
    this.dlg.say(n[0], () => { n[1]?.(); this.nextSay(); });
  }

  // --------------------------------------------------------------- pickups
  collectCoin(coin) {
    const { state, audio } = this.sv;
    const id = coin.getData('id'), fact = coin.getData('fact'), ghost = coin.getData('ghost');
    if (!ghost) state.collectCoin(id);
    this.fx.coinSparkle(coin.x, coin.y);
    const cat = coin.getData('cat');
    if (cat !== undefined && !ghost) {       // skill coins name the skill you just "learned"
      const k = resume.skills[cat], n = state.countCollected(`:skill:${cat}:`);
      this.fx.floatText(coin.x, coin.y - 8, k.items[(n - 1) % k.items.length].toUpperCase(), k.color);
    } else if (!ghost) this.fx.floatText(coin.x, coin.y - 8, '+1 XP');
    coin.destroy();
    if (fact !== undefined) {
      audio.sfx('fact');
      this.say([{ who: `FACT ${fact + 1}/10`, text: resume.intro.facts[fact] ?? '' }]);
    } else audio.sfx('coin');
  }

  collectCoffee(cup) {
    const { state, audio } = this.sv;
    state.startCoffee();
    audio.sfx('coffee');
    this.fx.burst(cup.x, cup.y, { count: 14, speed: 80, colors: [C.darkBrown, C.orange, C.white], life: 500 });
    this.fx.floatText(cup.x, cup.y - 8, 'COFFEE!', '#FCA044');
    cup.destroy();
  }

  collectBook(b) {
    this.audio.sfx('coin');
    this.fx.coinSparkle(b.x, b.y);
    this.taskProgress(b.getData('task'));
    b.destroy();
  }

  pullLever(l) {
    if (l.frame.name === 1 || l.frame.name === '1') return;
    l.setFrame(1);
    this.audio.sfx('lever');
    this.fx.burst(l.x, l.y - 8, { count: 8, colors: [C.lime, C.white] });
    this.taskProgress(l.getData('task'));
  }

  // -------------------------------------------- star power, springs, secrets
  makeStar(x, y) {
    const { save, state } = this.sv, calm = save.settings.reducedMotion;
    const st = this.physics.add.sprite(x, y, 'star', 0).setDepth(8);
    st.body.setAllowGravity(false); st.body.setSize(12, 12);
    if (!calm) { st.anims.play('star-spin'); this.tweens.add({ targets: st, y: y - 3, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); }
    this.starGroup.add(st);
    if (state.recruiter) {                              // Recruiter Mode: stars are marked with a beacon so nothing is hidden
      const beam = this.add.rectangle(x, y - 26, 4, 46, 0xf8d878, 0.4).setDepth(7);
      const tag = this.add.text(x, y - 52, 'STAR', { fontFamily: FONT, fontSize: '8px', color: C.yellow, backgroundColor: 'rgba(15,15,27,0.85)', padding: { x: 2, y: 2 } }).setOrigin(0.5, 1).setDepth(7);
      if (!calm) this.tweens.add({ targets: [beam, tag], alpha: 0.35, duration: 450, yoyo: true, repeat: -1 });
      st.on('destroy', () => { beam.destroy(); tag.destroy(); });
    } else if (!calm) {                                 // normal mode: only a faint glint gives a hidden star away
      this.time.addEvent({ delay: 2200, loop: true, callback: () => { if (st.active) this.fx.burst(st.x, st.y, { count: 2, speed: 14, gravity: 0, life: 600, colors: ['#F8D878', '#FCFCFC'] }); } });
    }
    return st;
  }

  collectStar(st) {
    this.sv.state.startStar();
    this.audio.sfx('star');
    this.fx.burst(st.x, st.y, { count: 20, speed: 100, colors: STAR.colors.map((c) => '#' + c.toString(16).padStart(6, '0')), life: 600, gravity: 20 });
    this.fx.floatText(st.x, st.y - 10, dialogue.star.got, '#F8D878');
    st.destroy();
  }

  hitSpring(sp) {
    const p = this.player, b = p.body;
    if (this.time.now < (sp.getData('cool') ?? 0) || b.velocity.y < 10 || b.bottom - sp.body.top > 10) return;
    sp.setData('cool', this.time.now + 250);
    p.launch(SPRING.vy);
    this.audio.sfx('spring');
    sp.setFrame(1); this.time.delayedCall(170, () => sp.active && sp.setFrame(0));
  }

  /** Invisible block: bump it from below and a star pops out. */
  revealHidden(hb) {
    hb.used = true;
    const p = this.player, calm = this.sv.save.settings.reducedMotion;
    const blk = this.add.image(hb.x, hb.y, 'tiles', 11).setDepth(3);
    this.solidBlocks.add(blk);
    p.teleport(p.x, p.feetY + Math.max(0, hb.y + 8 - p.body.top) + 1);      // knock the hero out of the new block
    this.audio.sfx('bump');
    if (!calm) this.tweens.add({ targets: blk, y: hb.y - 4, duration: 90, yoyo: true });
    const st = this.makeStar(hb.x, hb.y, false);
    this.tweens.add({ targets: st, y: hb.y - 22, duration: calm ? 40 : 300, ease: 'Back.easeOut' });
    this.fx.floatText(hb.x, hb.y - 26, 'SECRET!', '#F8D878');
  }

  stepCrumble(c) {
    if (c.getData('state') !== 'idle' || !this.player.body.touching.down) return;
    c.setData({ state: 'shake', at: this.time.now + 450 });
  }

  updateCrumbles() {
    const now = this.time.now, calm = this.sv.save.settings.reducedMotion;
    for (const c of this.crumbles.getChildren()) {
      const st = c.getData('state');
      if (st === 'shake') {
        if (!calm) c.x = c.getData('homeX') + Phaser.Math.Between(-1, 1);
        if (now >= c.getData('at')) {
          c.setData({ state: 'gone', at: now + 2600 }); c.x = c.getData('homeX'); c.body.enable = false;
          this.tweens.add({ targets: c, y: c.getData('homeY') + (calm ? 0 : 56), alpha: 0, duration: calm ? 60 : 380 });
          this.fx.burst(c.x, c.y, { count: 6, colors: [C.lgrey, C.white], gravity: 120, life: 400 });
        }
      } else if (st === 'gone' && now >= c.getData('at')) {
        c.y = c.getData('homeY'); c.setAlpha(1); c.body.enable = true; c.body.updateFromGameObject(); c.setData('state', 'idle');
      }
    }
  }

  updateLasers() {
    const t = this.time.now / 1000, calm = this.sv.save.settings.reducedMotion, b = this.player.body;
    for (const l of this.lasers) {
      const ph = (t + l.phase) % l.period, on = ph < l.on, warn = !on && ph > l.period - 0.5;
      l.beam.setAlpha(on ? 1 : warn && !calm && Math.floor(t * 14) % 2 ? 0.4 : 0);
      l.glow.setAlpha(on ? 0.5 : 0);
      if (on && !this.respawning && !this.finished && b.right > l.x && b.left < l.x + l.w && b.bottom > l.y && b.top < l.y + l.h) this.hurtPlayer();
    }
  }

  // ------------------------------------------------------------- final boss
  setupBoss() {
    const o = this.bossObj, z = this.player.zone;
    this.boss = new PrinterBoss(this, o.x, o.y);
    this.thrower = new Thrower(this);
    const burstAt = (x, y) => this.fx.burst(x, y, { count: 6, colors: [C.white, C.lgrey], gravity: 100, life: 250 });
    this.physics.add.overlap(this.thrower.planes, this.boss.sprite, (a, b) => { const plane = a.texture?.key === 'plane' ? a : b; if (this.boss.dead) return; plane.destroy(); this.boss.damage(1); });
    this.physics.add.overlap(this.thrower.planes, this.boss.jams, (a, b) => { const plane = a.texture.key === 'plane' ? a : b, jam = plane === a ? b : a; burstAt(jam.x, jam.y); plane.destroy(); jam.destroy(); this.audio.sfx('stomp'); });
    this.physics.add.overlap(this.thrower.planes, this.boss.deadlines, (a, b) => {
      const plane = a.texture.key === 'plane' ? a : b, dl = plane === a ? b : a;
      plane.destroy(); const hp = dl.getData('hp') - 1; dl.setData('hp', hp); dl.setTint(0xff8888);
      if (hp <= 0) { burstAt(dl.x, dl.y); dl.destroy(); this.audio.sfx('stomp'); }
    });
    this.physics.add.overlap(z, this.boss.jams, (_, j) => { j.destroy(); this.hurtPlayer(); });
    this.physics.add.overlap(z, this.boss.deadlines, (_, d) => { if (this.sv.state.immune) { d.destroy(); return; } this.hurtPlayer(); });
  }

  bossDefeated() {
    if (this.finished) return;
    this.finished = true;
    const { state } = this.sv;
    state.completeWorld(this.world ?? 6);
    this.say([{ who: dialogue.boss.win, text: 'The Printer Monster is shut down for good. Nice throwing! Now up to the rooftop.' }], () => {
      const cam = this.cameras.main;
      cam.fadeOut(CAMERA.fadeMs, 15, 15, 27);
      cam.once('camerafadeoutcomplete', () => { this.scene.stop('HUD'); this.scene.start('WorldMap', { cleared: this.world ?? 6 }); });
    });
  }

  // ----------------------------------------------------------- tasks / gates
  taskProgress(id, n = 1) {
    const t = this.tasks[id];
    if (!t || t.done) return;
    t.count = Math.min(t.need, t.count + n);
    if (t.count >= t.need) {
      t.done = true;
      const first = this.sv.state.earn('degrees', t.degree);
      void first;
      const edu = resume.education[t.degree];
      this.audio.sfx('degree');
      this.fx.burst(this.player.x, this.player.feetY - 20, { count: 20, speed: 100, colors: [C.yellow, C.white, C.lime], life: 600 });
      this.say([{ who: 'DEGREE EARNED!', text: `${edu.degree}\n${edu.school} ${edu.years}` }], () => this.unlockGate(t.gate));
    }
    this.refreshTask(t);
  }

  unlockGate(id) {
    const list = this.gates[id];
    if (!list?.length) return;
    this.audio.sfx('unlock');
    const calm = this.sv.save.settings.reducedMotion;
    this.fx.floatText(list[0].x, list[0].y - list[0].height / 2 - 8, 'OPEN!', '#58D854');
    for (const g of list) {
      this.tweens.add({ targets: g, alpha: 0, y: g.y - (calm ? 0 : 24), duration: calm ? 60 : 450, onComplete: () => g.destroy() });
      g.body.enable = false;
    }
    delete this.gates[id];
  }

  // --------------------------------------------------------------- "?" blocks
  tryBump(blk) {
    const p = this.player, b = p.body;
    if (blk.getData('used')) return;
    // the collision has already zeroed vy, so use the velocity the controller last commanded: must be moving UP (walking under a block is fine)
    if (p.ctrl.lastVy < -60 && b.top >= blk.y + 8 - 6 && Math.abs(p.x - blk.x) < 13) this.bumpBlock(blk);
  }

  bumpBlock(blk) {
    blk.setData('used', true);
    blk.setFrame(11);
    const calm = this.sv.save.settings.reducedMotion;
    this.audio.sfx('bump');
    if (!calm) this.tweens.add({ targets: blk, y: blk.y - 5, duration: 90, yoyo: true });
    const idx = blk.getData('award');
    const cert = this.add.image(blk.x, blk.y - 6, 'cert').setDepth(9);
    this.tweens.add({ targets: cert, y: blk.y - (calm ? 6 : 26), duration: calm ? 50 : 320, ease: 'Back.easeOut', onComplete: () => {
      this.fx.burst(cert.x, cert.y, { count: 10, colors: [C.yellow, C.white], gravity: 0 });
      cert.destroy();
      this.collectCert(idx);
    } });
  }

  collectCert(idx) {
    const { state, audio } = this.sv;
    const first = state.earn('awards', idx);
    if (first) state.collectCoin(`award:${idx}`);
    audio.sfx('cert');
    this.showAward(idx, !first);
  }

  showAward(idx, again) {
    const a = resume.awards[idx];
    this.say([{ who: again ? `CERTIFICATE ${idx + 1}/${resume.awards.length}` : 'CERTIFICATE UNLOCKED!', text: `${a.title}\n${a.issuer} ${a.year}` }]);
  }

  // ----------------------------------------------------------------- combat
  onEnemyTouch(e) {
    if (e.dead || this.respawning || this.finished || this.frozen) return;
    const p = this.player, b = p.body;
    const falling = b.velocity.y > 10 && b.bottom - e.body.top < 14 + b.velocity.y * 0.03;
    if (falling) {
      const r = e.stomp();
      p.bounce(this.sv.input.isDown('jump'));
      this.audio.sfx(r === 'hurt' ? 'boss' : 'stomp');
      if (r !== 'dead') this.fx.burst(e.x, e.body.top, { count: 5, colors: [C.white, C.yellow], gravity: 100, life: 250 });
      this.fx.shake(60, 0.003);
      return;
    }
    if (this.sv.state.immune) { this.starStrike(e); return; }
    this.hurtPlayer();
  }

  /** With star power (or Recruiter Mode) touching an enemy defeats it; bosses lose one hit point per touch. */
  starStrike(e) {
    if (e.dead) return;
    if (e.boss) { if (this.time.now < e.invulnUntil) return; e.stomp(); this.audio.sfx('boss'); } else { e.defeat(); this.audio.sfx('stomp'); }
    this.fx.burst(e.x, e.y, { count: 8, colors: STAR.colors.map((c) => '#' + c.toString(16).padStart(6, '0')), gravity: 60, life: 400 });
  }

  hurtPlayer() {
    if (this.sv.state.immune || this.player.invulnerable || this.respawning || this.finished) return;
    this.audio.sfx('hurt');
    this.respawn(RESPAWN.hitCoinLoss, 'hit');
  }

  enemyDefeated(e) {
    const p = e.props;
    if (p.task) this.taskProgress(p.task);
    if (e.boss) {
      const idx = p.boss ?? 0, job = resume.experience[idx] ?? {};
      this.sv.state.earn('bosses', idx);
      this.audio.sfx('unlock');
      this.say([
        { who: 'BOSS DEFEATED!', text: `${job.company ?? ''} - ${job.role ?? ''}` },
        { who: 'ACHIEVEMENT', text: job.achievement ?? '' },
      ], () => this.unlockGate(p.gate));
    }
  }

  firePaper(printer) {
    const pr = new Paper(this, printer.x + printer.dir * 8, printer.y - 2, printer.dir, ENEMIES.printer.paperSpeed * this.speedMult);
    this.projectiles.add(pr);
    this.physics.add.overlap(this.player.zone, pr, () => { pr.destroy(); this.hurtPlayer(); });
  }

  // ------------------------------------------------------------- transitions
  pipeUnderPlayer() {
    const p = this.player;
    if (!p.onGround || p.locked) return null;
    return this.pipes.find((pp) => Math.abs(p.feetY - (pp.y + 2)) < 3 && p.x > pp.x + 4 && p.x < pp.x + pp.w - 4) ?? null;
  }

  goTo(map, spawn) {
    if (this.transitioning) return;
    this.transitioning = true;
    const cam = this.cameras.main;
    cam.fadeOut(CAMERA.fadeMs, 15, 15, 27);
    cam.once('camerafadeoutcomplete', () => this.scene.restart({ map, spawn, world: this.world }));
  }

  respawn(coinLoss, reason = 'pit') {
    if (this.respawning) return;
    this.respawning = true;
    const { state, audio } = this.sv;
    const lost = state.loseCoins(coinLoss);
    if (reason === 'pit') audio.sfx('respawn');
    this.fx.shake(160, 0.006);
    this.cameras.main.flash(180, 255, 255, 255);
    if (lost) {
      this.fx.floatText(this.player.x, Math.min(this.player.feetY, this.mapH - 8), `-${lost} COINS`, '#F83800');
      this.fx.burst(this.player.x, Math.min(this.player.feetY, this.mapH) - 14, { count: Math.min(14, lost * 3), speed: 110, colors: [C.yellow, C.cream], life: 600, gravity: 260 });
    }
    this.player.lock();
    this.time.delayedCall(RESPAWN.respawnDelayMs, () => {
      const cp = state.checkpoint?.map === this.mapKey ? state.checkpoint : this.spawnPoint;
      this.player.unlock();
      this.player.teleport(cp.x, cp.y);
      this.player.invulnUntil = this.time.now + RESPAWN.invulnMs;
      this.cameras.main.scrollX = Phaser.Math.Clamp(cp.x - GAME.width / 2, 0, Math.max(0, this.mapW - GAME.width));
      this.respawning = false;
    });
  }

  /** Touching the finish flag clears the current world. The Hire Me flag (World 6) plays the credits. */
  reachGoal() {
    this.finished = true;
    const { state, audio } = this.sv;
    state.completeWorld(this.world ?? 1);
    this.player.lock();
    const hire = this.goal.hire;
    if (hire) state.promoteHired();
    audio.sfx('levelup');
    const burst = () => this.fx.burst(this.goal.x + Phaser.Math.Between(-60, 60), this.goal.y - Phaser.Math.Between(30, 110), { count: 26, speed: 110, colors: [C.yellow, C.white, C.lime, C.red, C.cyan], life: 800, gravity: 60 });
    burst();
    if (hire) { this.time.addEvent({ delay: 380, repeat: 6, callback: burst }); }
    this.add.text(GAME.width / 2, 86, hire ? 'YOU\'RE HIRED!' : 'WORLD CLEAR!', { fontFamily: FONT, fontSize: '16px', color: C.yellow, backgroundColor: 'rgba(15,15,27,0.85)', padding: { x: 6, y: 5 } })
      .setOrigin(0.5).setScrollFactor(0).setDepth(200);
    this.time.delayedCall(hire ? 3200 : 1900, () => {
      const cam = this.cameras.main;
      cam.fadeOut(CAMERA.fadeMs, 15, 15, 27);
      cam.once('camerafadeoutcomplete', () => { this.scene.stop('HUD'); this.scene.start(hire ? 'Credits' : 'WorldMap', { cleared: this.world ?? 1 }); });
    });
  }

  pauseGame() {
    if (this.transitioning || this.frozen || !this.scene.isActive()) return;
    this.scene.launch('Pause');
    this.scene.pause();
  }

  // ---------------------------------------------------------------- HUD data
  /** Read by the HUD scene each frame. */
  hudInfo() {
    const s = this.sv.state;
    switch (this.mapOpts.hud) {
      case 'facts':   return { text: `FACTS ${s.countCollected(':fact:')}/10` };
      case 'degrees': return { text: `DEGREES ${s.earnedCount('degrees')}/${resume.education.length}` };
      case 'bosses':  return { text: `BOSSES ${s.earnedCount('bosses')}/${resume.experience.length}` };
      case 'awards':  return { text: `CERTS ${s.earnedCount('awards')}/${resume.awards.length}` };
      case 'skills':  return { skills: resume.skills.map((k, i) => ({ name: (k.short ?? k.category).toUpperCase(), color: k.color, frac: Math.min(1, s.countCollected(`:skill:${i}:`) / 7) })) };
      default: return {};
    }
  }

  /** Everything the HUD needs in one object. */
  hud() {
    const s = this.sv.state, out = { ...this.hudInfo() };
    if (s.immune) out.star = { frac: s.recruiter ? 1 : s.starMs / STAR.durationMs, recruiter: s.recruiter };
    if (this.boss) out.boss = { name: dialogue.boss.name, hp: this.boss.hp, frac: this.boss.frac, phase: this.boss.phase };
    return out;
  }

  // ------------------------------------------------------------------ frame
  update(_, delta) {
    const { input, state } = this.sv;
    const dt = Math.min(delta / 1000, 1 / 30);
    if (this.dlg.active) { this.dlg.update(dt); this.updateCamera(dt); this.prompt.setVisible(false); return; }
    if (input.justPressed('pause')) { this.pauseGame(); return; }

    state.tick(delta);
    this.player.update(dt, input);
    this.enemies.getChildren().forEach((e) => e.update(dt));
    this.projectiles.getChildren().forEach((p) => p.update(dt));
    this.updateMovers();
    this.updateCrumbles();
    this.updateLasers();
    for (const hb of this.hblocks) {
      const b = this.player.body;
      if (!hb.used && b.velocity.y < -30 && b.top <= hb.y + 11 && b.top >= hb.y - 6 && Math.abs(this.player.x - hb.x) < 12) this.revealHidden(hb);
    }
    if (this.boss) this.boss.update(dt);
    this.thrower?.update(dt, input);

    // pipe entry: stand on it and press down
    if (!this.transitioning && input.isDown('down')) {
      const pipe = this.pipeUnderPlayer();
      if (pipe) {
        this.transitioning = true;
        this.player.enterPipe(() => { this.transitioning = false; this.goTo(pipe.target, pipe.spawn); });
      }
    }

    // interactables (signs of the trade: links, trophies): Enter / OK
    let near = null;
    for (const it of this.interactables) if (Math.hypot(this.player.x - it.x, this.player.feetY - 8 - it.y) < it.r) { near = it; break; }
    this.prompt.setVisible(!!near && !this.finished);
    if (near) {
      this.prompt.setPosition(near.x, near.y - 22);
      if (input.justPressed('interact')) near.run();
    }

    // checkpoints
    for (const cp of this.checkpoints) {
      if (!cp.active && Math.abs(this.player.x - cp.x) < 10 && Math.abs(this.player.feetY - cp.y) < 24) {
        this.checkpoints.forEach((c) => { c.active = false; c.flag.setFrame(0); });
        cp.active = true; cp.flag.setFrame(1);
        state.checkpoint = { map: this.mapKey, x: cp.x, y: cp.y };
        this.audio.sfx('checkpoint');
        this.fx.burst(cp.x, cp.y - 24, { count: 8, colors: [C.lime, C.white], gravity: 80 });
        this.fx.floatText(cp.x, cp.y - 36, 'CHECKPOINT', '#58D854');
      }
    }

    if (this.goal && !this.finished && Math.abs(this.player.x - this.goal.x) < 12 && Math.abs(this.player.feetY - this.goal.y) < 30) this.reachGoal();

    // fell into a pit
    if (!this.finished && !this.respawning && this.player.body.top > this.mapH + 24) this.respawn(RESPAWN.pitCoinLoss, 'pit');

    this.updateCamera(dt);
  }

  updateMovers() {
    for (const m of this.movers) {
      const tx = m.toEnd ? m.x1 : m.x0, ty = m.toEnd ? m.y1 : m.y0;
      const dx = tx - m.s.x, dy = ty - m.s.y, d = Math.hypot(dx, dy);
      if (d < 2) { m.toEnd = !m.toEnd; continue; }
      m.s.body.setVelocity((dx / d) * m.speed, (dy / d) * m.speed);
    }
  }

  updateCamera(dt) {
    const cam = this.cameras.main, p = this.player;
    const speedFrac = Math.min(1, Math.abs(p.body.velocity.x) / 90);
    const target = p.facing * CAMERA.lookAhead * (CAMERA.lookAheadMin + (1 - CAMERA.lookAheadMin) * speedFrac);
    this.look += (target - this.look) * (1 - Math.exp(-dt * CAMERA.lookSmoothing));
    cam.setFollowOffset(-Math.round(this.look), 0);
    for (const { ts, factor } of this.parallax) ts.tilePositionX = Math.round(cam.scrollX * factor);
  }
}
