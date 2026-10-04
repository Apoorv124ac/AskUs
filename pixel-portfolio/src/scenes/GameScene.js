import Phaser from 'phaser';
import { TILE, PHYSICS as P, PROGRESSION } from '../config.js';
import { LEVELS, items, WORLD1_FACTS, countFacts } from '../levels.js';
import resume from '../data/resume.json';
import dialogue from '../data/dialogue.json';
import { save, persist } from '../systems/save.js';
import { WORLDS } from '../data/worlds.js';
import { txt, burst } from '../ui/pixel.js';
import { ZOOM, CLASSIC_RESUME_URL } from '../config.js';
import { CampusTasks } from '../systems/campus.js';
import { Enemies } from '../systems/enemies.js';
import { Gimmicks } from '../systems/gimmicks.js';
import { DragonBoss } from '../systems/dragon.js';
import { OfficeTasks } from '../systems/office.js';
import { ArcadeSkills, countSkills, TOTAL as SKILL_TOTAL } from '../systems/arcade.js';
import { TrophyHall, countCerts, CERT_ENTRIES } from '../systems/trophies.js';
import { Rooftop } from '../systems/finale.js';

const TILE_TEX = {
  '#': 'tile-ground',
  d: 'tile-dirt',
  B: 'tile-desk',
  p: 'pipe-tl',
  q: 'pipe-tr',
  l: 'pipe-bl',
  r: 'pipe-br',
};
const PIPE_CHARS = new Set(['p', 'q', 'l', 'r']);

const approach = (v, target, step) =>
  v < target ? Math.min(v + step, target) : Math.max(v - step, target);

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  init(data) {
    this.roomKey = data.room || 'world1';
    this.viaPipe = data.viaPipe || null;
  }

  create() {
    const reg = this.registry;
    this.level = LEVELS[this.roomKey];
    const L = this.level;
    this.worldW = L.w * TILE;
    this.worldH = L.h * TILE;

    this.physics.world.setBounds(0, 0, this.worldW, this.worldH + 64);
    this.physics.world.setBoundsCollision(true, true, true, false); // pits are open
    const cam = this.cameras.main;
    cam.setZoom(ZOOM);
    cam.setBounds(0, 0, this.worldW, this.worldH);
    cam.setBackgroundColor(L.bg);
    cam.fadeIn(250);

    if (!reg.has('collected')) reg.set('collected', new Set());
    this.collected = reg.get('collected');
    this.coffeeMs = reg.get('coffeeMs') || 0;
    this.entering = false;
    this.goalShown = false;
    this.jumpPressedAt = -1e9;
    this.lastGrounded = -1e9;
    this.airJumps = 0;
    this.jumping = false;
    this.longJumping = false;
    this.ljDir = 1;
    this.wasGrounded = true;
    this.prevVy = 0;
    this.animLock = { key: null, until: 0 };
    this.talking = null;
    this.npcs = [];
    this.idleSince = 0;
    this.invulUntil = 0;
    this.campus = null;
    this.office = null;
    this.arcade = null;
    this.gimmicks = null;
    this.enemies = null;
    this.dragon = null;
    this.motes = [];
    this.nextDust = 0;
    this.trophies = null;
    this.finale = null;

    this.buildBackground();
    this.buildTiles();
    this.buildObjects();
    this.buildPlayer();
    this.buildNpcs();
    this.gimmicks = new Gimmicks(this);
    if (L.enemies && L.enemies.length) this.enemies = new Enemies(this);
    this.buildMotes();
    if (L.campus || L.forceStation !== undefined) this.campus = new CampusTasks(this);
    if (L.office) this.office = new OfficeTasks(this);
    if (L.arcade || L.arcadeRoom) this.arcade = new ArcadeSkills(this);
    else reg.set('skillBars', null);
    reg.set('bossBar', null);
    if (L.dragon) this.dragon = new DragonBoss(this);
    if (L.hall) this.trophies = new TrophyHall(this);
    if (L.finale) this.finale = new Rooftop(this);
    this.input.on('pointerdown', () => this.talking && this.advanceTalk());
    this.events.once('shutdown', () => this.game.events.emit('dialogue-end'));
    if (L.world === 0) {
      reg.set('factsTotal', WORLD1_FACTS.length);
      reg.set('facts', countFacts(this.collected));
    } else reg.set('factsTotal', 0);
    if (L.world === 0) reg.set('hudInfo', '');

    this.cursors = this.input.keyboard.createCursorKeys();
    this.shift = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    // event-based (not polled) so even a very quick tap of Enter/Space registers
    this.interactPressed = false;
    this.input.keyboard.on('keydown-ENTER', () => (this.interactPressed = true));
    this.input.keyboard.on('keydown-SPACE', () => (this.interactPressed = true));
    this.input.keyboard.on('keydown-R', () => this.returnToCheckpoint());

    if (!this.scene.isActive('UI')) this.scene.launch('UI');
    const w = WORLDS[L.world];
    if (w && !this.viaPipe && L.room !== 'bonus' && !L.office) {
      this.time.delayedCall(450, () => this.game.events.emit('chapter', { title: `CHAPTER ${w.id}`, sub: w.chapter || w.name }));
    }
  }

  // --- world building ------------------------------------------------------
  buildBackground() {
    this.parallax = [];
    if (this.level.theme !== 'office') return;
    [['skyline-far', 0.15], ['skyline-near', 0.4]].forEach(([key, f], i) => {
      // scroll-factor-0 objects ignore the camera scroll, so offset them for the zoomed view
      const ts = this.add.tileSprite(128 * (ZOOM - 1), 112 * (ZOOM - 1), 256, 224, key).setOrigin(0).setScrollFactor(0).setDepth(i);
      if (this.level.tint) ts.setTint(this.level.tint);
      this.parallax.push([ts, f]);
    });
  }

  buildTiles() {
    const L = this.level;
    this.solids = this.physics.add.staticGroup();
    for (let r = 0; r < L.h; r++) {
      for (let c = 0; c < L.w; c++) {
        const ch = L.grid[r][c];
        if (ch === 'T' || ch === 'D' || ch === 'K') {
          this.add.image(c * TILE + 8, r * TILE + 8, { T: 'plant', D: 'counter', K: 'bookshelf' }[ch]).setDepth(2);
          continue;
        }
        if (ch === 'Y' || ch === 'V') {
          this.add.image(c * TILE + 8, r * TILE + 8, ch === 'Y' ? 'trophy' : 'curtain').setDepth(2);
          continue;
        }
        if (ch === 'M' || ch === 'N' || ch === 'O') {
          this.add.image(c * TILE + 8, (r + 1) * TILE - 16, 'cabinet', 'MNO'.indexOf(ch)).setDepth(2);
          continue;
        }
        const tex = TILE_TEX[ch];
        if (!tex) continue;
        const t = this.solids.create(c * TILE + 8, r * TILE + 8, tex);
        t.setDepth(PIPE_CHARS.has(L.grid[r][c]) ? 6 : 3);
      }
    }
    L.labels.forEach((l) => {
      txt(this, l.x, l.y, l.text, { color: '#fcfcfc', depth: 2 });
    });
  }

  buildObjects() {
    const L = this.level;
    this.coins = this.physics.add.staticGroup();
    this.coffees = this.physics.add.staticGroup();
    this.flags = this.physics.add.staticGroup();
    this.goals = this.physics.add.staticGroup();
    this.factItems = this.physics.add.staticGroup();
    this.toolItems = this.physics.add.staticGroup();
    const factIdx = new Map(items(L, 'f').map((f) => [f.id, f.n]));
    const toolIdx = new Map(items(L, 't').map((f) => [f.id, f.n]));

    for (let r = 0; r < L.h; r++) {
      for (let c = 0; c < L.w; c++) {
        const ch = L.grid[r][c];
        const id = `${this.roomKey}:${c},${r}`;
        const x = c * TILE + 8;
        const y = r * TILE + 8;
        if ('ocft'.includes(ch) && ch !== '.' && this.collected.has(id)) continue;
        if (ch === 'o') {
          const s = this.coins.create(x, y, 'coin', 0).setDepth(4);
          s.setSize(10, 12);
          s.itemId = id;
          s.anims.play('coin-spin');
          s.anims.setProgress((c % 4) / 4);
        } else if (ch === 'f') {
          const s = this.factItems.create(x, y, 'fact', 0).setDepth(4);
          s.setSize(12, 14);
          s.itemId = id;
          s.n = factIdx.get(id);
          s.anims.play('fact-spin');
          s.anims.setProgress((c % 4) / 4);
          this.tweens.add({ targets: s, y: y - 2, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.inOut' });
        } else if (ch === 't') {
          const s = this.toolItems.create(x, y, 'coin', 0).setDepth(4).setTint(0x58d8ff);
          s.setSize(10, 12);
          s.itemId = id;
          s.n = toolIdx.get(id);
          s.anims.play('coin-spin');
        } else if (ch === 'c') {
          const s = this.coffees.create(x, y, 'coffee').setDepth(4);
          s.itemId = id;
          this.tweens.add({ targets: s, y: y - 2, yoyo: true, repeat: -1, duration: 500 });
        } else if (ch === 'F') {
          const s = this.flags.create(x, y - 8, 'flag-off').setDepth(2);
          s.refreshBody();
          s.cp = { x, bottom: (r + 1) * TILE };
        } else if (ch === 'G') {
          this.goals.create(x, y - 8, 'door').setDepth(2).refreshBody();
        }
      }
    }
  }

  buildPlayer() {
    const L = this.level;
    const reg = this.registry;
    let x = L.spawn.col * TILE + 8;
    let bottom = (L.spawn.row + 1) * TILE;

    const cp = reg.get('checkpoint');
    if (this.viaPipe) {
      const pipe = L.pipes.find((p) => p.id === this.viaPipe);
      x = pipe.x + TILE;
      bottom = pipe.y - 4;
    } else if (cp && cp.room === this.roomKey) {
      x = cp.x;
      bottom = cp.bottom;
    }
    this.spawnPoint = { x, bottom };

    const p = this.physics.add.sprite(x, bottom - 16, 'hero', 0).setDepth(5);
    p.body.setSize(10, 28).setOffset(7, 4);
    p.body.setMaxVelocity(400, P.maxFallSpeed);
    p.setCollideWorldBounds(true);
    this.player = p;
    // The physics sprite stays invisible; this visual twin lets us squash & stretch without
    // changing the hitbox, and a soft shadow grounds the hero in the world.
    p.setVisible(false);
    this.shadow = this.add.ellipse(x, bottom, 14, 4, 0x0f0f1b, 0.32).setDepth(2);
    this.vis = this.add.sprite(x, bottom, 'hero', 0).setOrigin(0.5, 1).setDepth(5);
    this.aura = this.add.sprite(x, bottom - 16, 'hero', 0).setDepth(4).setVisible(false);
    this.aura.setOrigin(0.5, 0.5);
    this.aura.setTint(0xffe080).setBlendMode(Phaser.BlendModes.ADD);
    this.cameras.main.startFollow(p, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(8, 40);

    this.physics.add.collider(p, this.solids);
    this.physics.add.overlap(p, this.coins, (_, coin) => this.collectCoin(coin));
    this.physics.add.overlap(p, this.factItems, (_, it) => this.collectFact(it));
    this.physics.add.overlap(p, this.toolItems, (_, it) => this.collectTool(it));
    this.physics.add.overlap(p, this.coffees, (_, cup) => this.collectCoffee(cup));
    this.physics.add.overlap(p, this.flags, (_, flag) => this.hitCheckpoint(flag));
    this.physics.add.overlap(p, this.goals, () => this.hitGoal());
  }

  // --- pickups -------------------------------------------------------------
  // +1 coin and +1 XP; may level the hero up
  award() {
    const reg = this.registry;
    reg.set('coins', reg.get('coins') + 1);
    const xp = reg.get('xp') + 1;
    reg.set('xp', xp);
    const lvl = PROGRESSION.thresholds.filter((t) => xp >= t).length - 1;
    if (lvl > reg.get('level')) {
      reg.set('level', lvl);
      this.game.events.emit('banner', `LEVEL UP!\n${PROGRESSION.titles[lvl]}`);
      this.lockAnim('celebrate', 900);
    }
  }

  collectCoin(coin) {
    this.collected.add(coin.itemId);
    this.popText(coin.x, coin.y - 6, '+1');
    coin.destroy();
    this.award();
  }

  collectFact(it) {
    this.collected.add(it.itemId);
    const n = it.n;
    this.popText(it.x, it.y - 8, `FACT ${n + 1}`);
    it.destroy();
    this.registry.set('facts', countFacts(this.collected));
    const f = resume.introFacts[n] || { tag: '?', label: '', text: '' };
    this.game.events.emit('fact', { title: `FACT ${n + 1}/${WORLD1_FACTS.length}`, ...f });
    burst(this, it.x, it.y, { n: 12 });
    this.lockAnim('celebrate', 500);
    this.award();
  }

  collectTool(it) {
    this.collected.add(it.itemId);
    const tool = resume.toolkit[it.n] || 'TOOL';
    this.popText(it.x, it.y - 8, '+1');
    it.destroy();
    this.game.events.emit('banner', `${tool}\nTOOL UNLOCKED`);
    this.award();
  }

  collectCoffee(cup) {
    this.collected.add(cup.itemId);
    this.popText(cup.x, cup.y - 8, 'COFFEE!');
    cup.destroy();
    this.powerUp();
  }

  powerUp() {
    this.coffeeMs = P.coffeeMs;
    this.game.events.emit('banner', 'CAFFEINATED!\nFASTER + TRIPLE JUMP');
    this.cameras.main.shake(120, 0.004);
    this.lockAnim('sip', 700);
  }

  // --- NPCs + dialogue -----------------------------------------------------
  buildNpcs() {
    this.level.npcs.forEach((d) => {
      let spr;
      if (d.board) {
        spr = this.add.image(d.x, d.bottom - 16, 'board', d.frame).setDepth(4);
      } else {
        spr = this.add.sprite(d.x, d.bottom - 16, 'npcs', 0).setDepth(4).setFlipX(d.face < 0);
        spr.anims.play(d.cheer ? `${d.id}-wave` : `${d.id}-idle`);
      }
      const mark = txt(this, d.x, d.bottom - 40, '!', { color: '#f8d878', bold: true, origin: 0.5, depth: 8 }).setVisible(false);
      this.tweens.add({ targets: mark, y: mark.y - 3, yoyo: true, repeat: -1, duration: 400 });
      this.npcs.push({ ...d, spr, mark, talked: false, noticed: false, arming: 0 });
    });
  }

  fmt(str) {
    return str.replace(/\{name\}/g, save.name || 'FRIEND').replace(/\{skills\}/g, String(countSkills(this.collected)))
      .replace(/\{certs\}/g, String(countCerts(this.collected)));
  }

  startTalk(npc) {
    const d = dialogue[npc.dlg || npc.id];
    npc.arming = 0;
    this.talking = { npc, lines: npc.talked && d.again ? d.again : d.lines, i: 0, d };
    npc.talked = true;
    npc.mark.setVisible(false);
    if (!npc.board) npc.spr.anims.play(`${npc.id}-talk`);
    this.showLine();
  }

  showLine() {
    const t = this.talking;
    this.game.events.emit('dialogue', {
      id: t.npc.id,
      color: t.d.color,
      ax: t.npc.x - this.cameras.main.worldView.x,
      ay: t.npc.bottom - 34 - this.cameras.main.worldView.y,
      title: `${t.d.name} · ${t.d.role}`,
      text: this.fmt(t.lines[t.i]),
      page: `${t.i + 1}/${t.lines.length}`,
    });
  }

  advanceTalk() {
    const t = this.talking;
    if (!t) return;
    // first press while text is still typing = show the whole line
    if (this.registry.get('typing')) {
      this.game.events.emit('dialogue-skip');
      return;
    }
    t.i++;
    if (t.i < t.lines.length) return this.showLine();
    this.talking = null;
    if (!t.npc.board) t.npc.spr.anims.play(`${t.npc.id}-idle`);
    this.game.events.emit('dialogue-end');
    if (t.d.giveCoffee) this.powerUp();
    // contact boards: the LAST page opens the link / copies the text
    if (t.d.link || t.d.copy) this.contactAction(t.d);
  }

  contactAction(d) {
    const link = d.link === '@resume' ? CLASSIC_RESUME_URL : d.link;
    if (d.copy && navigator.clipboard) {
      navigator.clipboard.writeText(d.copy).then(
        () => this.game.events.emit('banner', 'COPIED!\n' + d.copy),
        () => {}
      );
    }
    if (link) window.open(link, '_blank', 'noopener');
  }

  updateNpcs() {
    const p = this.player;
    const now = this.time.now;
    const pressed = this.interactPressed;
    this.interactPressed = false;
    if (this.talking) {
      if (pressed) this.advanceTalk();
      return;
    }
    for (const n of this.npcs) {
      if (n.cheer) continue;
      const dx = Math.abs(p.x - n.x);
      const dy = Math.abs(p.y - (n.bottom - 16));
      const seen = dx < 78 && dy < 40; // you're approaching: they notice you
      const near = dx < 38 && dy < 24; // close enough to talk
      if (seen && !n.noticed) {
        n.noticed = true;
        if (!n.board) n.spr.setFlipX(p.x < n.x);
        if (!n.talked && !n.board) {
          // greet: little wave + the "!" pops above their head
          n.spr.anims.play(`${n.id}-wave`);
          this.time.delayedCall(900, () => !this.talking && n.spr.anims.play(`${n.id}-idle`));
        }
        n.mark.setVisible(true).setScale(0);
        this.tweens.add({ targets: n.mark, scale: 1, duration: 260, ease: 'Back.out' });
      } else if (!seen && n.noticed) {
        n.noticed = false;
        n.arming = 0;
        n.mark.setVisible(false);
      }
      if (!seen) continue;
      if (!n.board) n.spr.setFlipX(p.x < n.x);
      if (!near) {
        n.arming = 0;
        continue;
      }
      // auto-start once, after a short beat so it never feels like a sudden freeze
      if (!n.talked && n.autoTalk && p.body.blocked.down) {
        if (!n.arming) n.arming = now + 450;
        else if (now >= n.arming) return this.startTalk(n);
      }
      if (pressed) return this.startTalk(n);
    }
  }

  hitCheckpoint(flag) {
    if (flag.texture.key === 'flag-on') return;
    flag.setTexture('flag-on');
    this.registry.set('checkpoint', { room: this.roomKey, ...flag.cp });
    this.game.events.emit('banner', 'CHECKPOINT!');
  }

  hitGoal() {
    if (this.goalShown) return;
    this.goalShown = true;
    save.completed[this.level.world] = true;
    save.lastWorld = Math.min(this.level.world + 1, 6);
    persist();
    const f =
      this.level.world === 0
        ? `\nFACTS ${countFacts(this.collected)}/${WORLD1_FACTS.length}`
        : this.level.world === 1
          ? `\nDEGREES ${save.degrees.filter(Boolean).length}/4`
          : this.level.world === 2
            ? `\nFLOORS ${save.floors.filter(Boolean).length}/5`
            : this.level.world === 3
              ? `\nSKILLS ${countSkills(this.collected)}/${SKILL_TOTAL}`
              : this.level.world === 4
                ? `\nCERTS ${countCerts(this.collected)}/${CERT_ENTRIES.length}`
                : '\nTHE DEADLINE DRAGON IS DOWN';
    this.game.events.emit('banner', `WORLD ${this.level.world + 1} COMPLETE!${f}`);
    this.lockAnim('celebrate', 2400);
    this.time.delayedCall(2600, () => {
      this.scene.stop('UI');
      this.cameras.main.fadeOut(250, 15, 15, 27);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Menu'));
    });
  }

  popText(x, y, msg) {
    const t = txt(this, x, y, msg, { color: '#f8d878', bold: true, origin: 0.5, depth: 20 });
    t.setScale(0.4);
    this.tweens.add({ targets: t, scale: 1.2, duration: 160, ease: 'Back.out' });
    this.tweens.add({ targets: t, y: y - 16, alpha: 0, delay: 350, duration: 450, onComplete: () => t.destroy() });
  }

  dust(x, y, n = 4) {
    for (let i = 0; i < n; i++) {
      const d = this.add.rectangle(x + Phaser.Math.Between(-4, 4), y, 2, 2, 0xfcfcfc).setDepth(4);
      this.tweens.add({
        targets: d,
        x: d.x + Phaser.Math.Between(-8, 8),
        y: y - Phaser.Math.Between(2, 7),
        alpha: 0,
        duration: 300,
        onComplete: () => d.destroy(),
      });
    }
  }

  // --- pipes ---------------------------------------------------------------
  tryEnterPipe() {
    const p = this.player;
    if (this.entering || !this.cursors.down.isDown || !p.body.blocked.down) return;
    for (const pipe of this.level.pipes) {
      if (!pipe.to) continue;
      if (Math.abs(p.x - (pipe.x + TILE)) < 10 && Math.abs(p.body.bottom - pipe.y) < 3) {
        this.enterPipe(pipe);
        return;
      }
    }
  }

  enterPipe(pipe) {
    const p = this.player;
    this.entering = true;
    p.body.enable = false;
    p.setVelocity(0, 0);
    p.anims.play('crouch', true);
    p.x = pipe.x + TILE;
    this.tweens.add({
      targets: p,
      y: p.y + 30,
      duration: 500,
      onComplete: () => {
        this.registry.set('coffeeMs', this.coffeeMs);
        this.cameras.main.fadeOut(200);
        this.cameras.main.once('camerafadeoutcomplete', () =>
          this.scene.start('Game', { room: pipe.to.room, viaPipe: pipe.to.pipe })
        );
      },
    });
  }

  // enemy contact: lose a coin, bounce back, brief invulnerability
  hurtPlayer(fromX) {
    const now = this.time.now;
    if (now < this.invulUntil || this.entering) return;
    this.invulUntil = now + 1200;
    const reg = this.registry;
    if (reg.get('coins') > 0) reg.set('coins', reg.get('coins') - 1);
    const p = this.player;
    this.popText(p.x, p.y - 20, '-1');
    p.setVelocity(p.x < fromX ? -130 : 130, -170);
    this.lockAnim('hurt', 450, now);
    this.cameras.main.shake(100, 0.004);
    this.tweens.add({ targets: p, alpha: 0.35, yoyo: true, repeat: 5, duration: 100, onComplete: () => p.setAlpha(1) });
  }

  // 'R' (or the pause menu): never stuck. Back to the last checkpoint, no penalty.
  returnToCheckpoint() {
    if (this.talking || this.entering) return;
    const p = this.player;
    p.setVelocity(0, 0);
    p.setPosition(this.spawnPoint.x, this.spawnPoint.bottom - 16);
    this.cameras.main.flash(180, 255, 255, 255);
    this.game.events.emit('banner', 'BACK AT CHECKPOINT');
  }

  respawn() {
    const reg = this.registry;
    reg.set('coins', Math.max(0, reg.get('coins') - P.pitCoinPenalty));
    const p = this.player;
    p.setVelocity(0, 0);
    p.setPosition(this.spawnPoint.x, this.spawnPoint.bottom - 16);
    this.cameras.main.flash(200, 255, 255, 255);
    this.game.events.emit('banner', `OOPS! -${P.pitCoinPenalty} COINS`);
    this.lockAnim('hurt', 600);
  }

  // --- main loop -----------------------------------------------------------
  update(time, delta) {
    const dt = delta / 1000;
    this.parallax.forEach(([ts, f]) => (ts.tilePositionX = this.cameras.main.scrollX * f));
    if (this.entering) return;

    const p = this.player;
    const b = p.body;
    const c = this.cursors;
    const shift = this.shift.isDown;
    const grounded = b.blocked.down;
    const crouching = grounded && c.down.isDown && !this.talking;
    const frozen = !!this.talking;
    const dir = crouching || frozen ? 0 : (c.right.isDown ? 1 : 0) - (c.left.isDown ? 1 : 0);

    // coffee timer + HUD value
    this.coffeeMs = Math.max(0, this.coffeeMs - delta);
    const powered = this.coffeeMs > 0;
    const ratio = Math.ceil((this.coffeeMs / P.coffeeMs) * 20) / 20;
    if (this.registry.get('coffee') !== ratio) this.registry.set('coffee', ratio);
    // golden aura behind the hero while caffeinated (blinks in the last 2 seconds)
    const auraOn = powered && (this.coffeeMs > 2000 || Math.floor(time / 90) % 2 === 0);
    this.aura.setVisible(auraOn);
    if (auraOn) {
      this.aura.setPosition(p.x, p.y).setFlipX(p.flipX).setFrame(p.frame.name);
      this.aura.setScale(1.18).setAlpha(0.35 + 0.15 * Math.sin(time / 120));
    }

    if (grounded) {
      this.lastGrounded = time;
      this.airJumps = powered ? P.coffeeAirJumps : P.baseAirJumps;
      this.longJumping = false;
      this.jumping = false;
      if (!this.wasGrounded && this.prevVy > 150) {
        this.dust(p.x, b.bottom, 5);
        this.lockAnim('land', 90, time);
        this.squash(1.25, 0.78, 150);
      }
    }

    // jumping: buffer + coyote + coffee double jump
    let fresh = false;
    if (Phaser.Input.Keyboard.JustDown(c.up) && !frozen) {
      this.jumpPressedAt = time;
      fresh = true;
    }
    if (time - this.jumpPressedAt <= P.jumpBufferMs) {
      if (time - this.lastGrounded <= P.coyoteMs) {
        this.doJump(shift, dir, powered);
      } else if (fresh && this.airJumps > 0) {
        this.airJumps--;
        this.doJump(false, dir, powered, true);
      }
    }
    // variable jump height: letting go of Up cuts the hop short
    if (this.jumping && c.up.isUp && b.velocity.y < 0) {
      b.setVelocityY(b.velocity.y * P.jumpCutFactor);
      this.jumping = false;
    }
    b.setGravityY(b.velocity.y > 0 ? P.fallExtraGravity : 0);

    // horizontal movement
    const boost = powered ? P.coffeeSpeedBoost : 1;
    let maxSpeed = (shift ? P.runSpeed : P.walkSpeed) * boost;
    let vx = b.velocity.x;
    let accel = P.accel * (grounded ? 1 : P.airControl);
    let target;
    if (this.longJumping && !grounded && (dir === 0 || dir === this.ljDir)) {
      target = this.ljDir * P.longJumpSpeed * boost;
      accel = P.accel;
    } else if (dir === 0) {
      target = 0;
      accel = grounded ? P.friction : P.airDrag;
    } else {
      // keep momentum in the air even if Shift is released
      if (!grounded && Math.sign(vx) === dir) maxSpeed = Math.max(maxSpeed, Math.abs(vx));
      target = dir * maxSpeed;
      if (vx !== 0 && Math.sign(vx) !== dir) accel *= P.skidMultiplier;
    }
    vx = approach(vx, target, accel * dt);
    b.setVelocityX(vx);
    if (dir !== 0) p.setFlipX(dir < 0);

    // animation: a short "lock" (sip, hurt, celebrate...) beats normal movement poses
    const moving = Math.abs(vx) > 8 || !grounded || crouching;
    if (moving) this.idleSince = time;
    if (time >= this.animLock.until && time - this.idleSince > 4000) {
      this.lockAnim('wave', 700, time);
      this.idleSince = time;
    }
    let anim;
    if (time < this.animLock.until) anim = this.animLock.key;
    else if (!grounded) anim = this.longJumping ? 'longjump' : b.velocity.y > 40 ? 'fall' : 'jump';
    else if (crouching) anim = 'crouch';
    else if (Math.abs(vx) > P.walkSpeed * 1.15 * boost * 0.9) anim = 'run';
    else if (Math.abs(vx) > 8) anim = 'walk';
    else anim = 'idle';
    p.anims.play(anim, true);

    // camera look-ahead
    this.cameras.main.setFollowOffset(-Phaser.Math.Clamp(vx * 0.15, -24, 24), 0);

    this.tryEnterPipe();
    this.updateNpcs();
    if (this.campus) this.campus.update();
    if (this.office) this.office.update();

    if (p.y > this.worldH + 30) this.respawn();

    this.syncHero(time, grounded, vx);
    if (this.dragon) this.dragon.update(time);
    if (this.gimmicks) this.gimmicks.update(time, delta);
    if (this.enemies) this.enemies.update(time, delta);
    this.updateMotes(dt);

    this.wasGrounded = grounded;
    this.prevVy = b.velocity.y;
  }

  // keep the visual hero glued to the physics body, with squash/stretch + shadow + run dust
  syncHero(time, grounded, vx) {
    const p = this.player;
    const v = this.vis;
    v.setPosition(p.x, p.body.bottom);
    v.setFlipX(p.flipX);
    if (p.frame && p.frame.name !== undefined) v.setFrame(p.frame.name);
    v.setAlpha(p.alpha);
    // shadow on the floor below (shrinks as you rise)
    const gy = this.groundYBelow(p.x, p.body.bottom - 2);
    const h = Math.max(0, gy - p.body.bottom);
    this.shadow.setPosition(p.x, gy).setScale(Math.max(0.35, 1 - h / 140), 1).setAlpha(grounded ? 0.32 : Math.max(0.1, 0.3 - h / 400));
    // dust when running
    if (grounded && Math.abs(vx) > 110 && time > this.nextDust) {
      this.nextDust = time + 130;
      this.dust(p.x - Math.sign(vx) * 5, p.body.bottom, 2);
    }
  }

  groundYBelow(x, y) {
    const L = this.level;
    const c = Math.floor(x / TILE);
    for (let r = Math.max(0, Math.floor(y / TILE)); r < L.h; r++) {
      const ch = (L.grid[r] || [])[c];
      if (ch && '#dBpqlrC><'.includes(ch)) return r * TILE;
    }
    return this.worldH + 40;
  }

  // squash & stretch on the hero's visual twin (the hitbox never changes)
  squash(sx, sy, ms = 170) {
    const v = this.vis;
    if (!v) return;
    this.tweens.killTweensOf(v);
    v.setScale(sx, sy);
    this.tweens.add({ targets: v, scaleX: 1, scaleY: 1, duration: ms, ease: 'Back.out' });
  }

  refillAirJumps() {
    this.airJumps = this.coffeeMs > 0 ? P.coffeeAirJumps : P.baseAirJumps;
  }

  // brief freeze-frame on impact: makes stomps feel heavy
  hitStop(ms = 60) {
    const w = this.physics.world;
    if (w.isPaused) return;
    w.pause();
    this.time.delayedCall(ms, () => w.resume());
  }

  // drifting light motes: depth + atmosphere
  buildMotes() {
    const warm = this.level.theme === 'office' ? 0xfff0c0 : 0xa0b8ff;
    for (let i = 0; i < 18; i++) {
      const m = this.add.rectangle(Phaser.Math.Between(0, 256), Phaser.Math.Between(20, 200), 1, 1, warm, 0.4).setDepth(7).setScrollFactor(0);
      m.sp = Phaser.Math.FloatBetween(3, 9);
      m.ph = Math.random() * 6;
      this.motes.push(m);
    }
  }

  updateMotes(dt) {
    const off = 128 * (ZOOM - 1);
    const offY = 112 * (ZOOM - 1);
    this.motes.forEach((m) => {
      m.ph += dt;
      m.y0 = (m.y0 ?? m.y - offY) - m.sp * dt;
      if (m.y0 < 16) m.y0 = 210;
      m.x0 = m.x0 ?? m.x - off;
      m.setPosition(m.x0 + Math.sin(m.ph) * 6 + off, m.y0 + offY);
    });
  }

  lockAnim(key, ms, now = this.time.now) {
    this.animLock = { key, until: now + ms };
    this.player.anims.play(key, true);
  }

  doJump(long, dir, powered, air = false) {
    const p = this.player;
    const b = p.body;
    let vy = long ? P.longJumpVelocity : P.jumpVelocity;
    if (air) vy *= P.airJumpFactor;
    if (powered) vy *= P.coffeeJumpBoost;
    b.setVelocityY(vy);
    if (long) {
      this.longJumping = true;
      this.ljDir = dir || (p.flipX ? -1 : 1);
      b.setVelocityX(this.ljDir * Math.max(Math.abs(b.velocity.x), P.longJumpSpeed));
    }
    this.jumping = true;
    this.jumpPressedAt = -1e9;
    this.lastGrounded = -1e9;
    this.dust(p.x, b.bottom, air ? 3 : 4);
    this.squash(0.8, 1.24, 180);
  }
}
