import Phaser from 'phaser';
import { GAME, CAMERA, RESPAWN, PALETTE as C } from '../config.js';
import dialogue from '../data/dialogue.json';
import { Player } from '../entities/Player.js';
import { FX } from '../systems/FX.js';
import { FONT } from '../systems/UI.js';

const props = (o) => Object.fromEntries((o.properties ?? []).map((p) => [p.name, p.value]));
const INDOOR = new Set(['bonus-room']);   // rooms without the skyline parallax

/**
 * Generic level scene: builds any Tiled JSON map from /public/maps.
 * Object layer types: spawn, pipe, coin, coffee, checkpoint, sign.
 * Day 1 hosts the test level and the bonus room; later segments reuse it for worlds 1-6.
 */
export class LevelScene extends Phaser.Scene {
  constructor() { super('Level'); }

  init(data) {
    this.mapKey = data?.map ?? 'test-level';
    this.spawnName = data?.spawn ?? 'start';
    this.transitioning = false;
    this.respawning = false;
  }

  create() {
    const sv = this.sv = this.game.services;
    this.fx = new FX(this, sv.save.settings);
    this.pipes = [];
    this.checkpoints = [];

    this.buildBackground();
    this.buildMap();
    this.buildObjects();
    this.buildPlayer();
    this.setupCamera();
    this.setupCollisions();

    if (!this.scene.isActive('HUD')) this.scene.launch('HUD'); else this.scene.bringToTop('HUD');

    this.onLevelUp = (tier) => { this.player.setTier(tier); sv.audio.sfx('levelup'); };
    sv.state.on('levelup', this.onLevelUp);
    this.onHidden = () => this.pauseGame();
    this.game.events.on('hidden', this.onHidden);
    this.events.once('shutdown', () => { sv.state.off('levelup', this.onLevelUp); this.game.events.off('hidden', this.onHidden); });

    this.cameras.main.fadeIn(CAMERA.fadeMs, 15, 15, 27);
  }

  // ---------------------------------------------------------------- building
  buildBackground() {
    this.cameras.main.setBackgroundColor(C.black);
    this.parallax = [];
    if (INDOOR.has(this.mapKey)) return;
    [['bg_far', 0.05, -30], ['bg_mid', 0.2, -20], ['bg_near', 0.45, -10]].forEach(([key, factor, depth]) => {
      const ts = this.add.tileSprite(0, 0, GAME.width, GAME.height, key).setOrigin(0).setScrollFactor(0).setDepth(depth);
      this.parallax.push({ ts, factor });
    });
  }

  buildMap() {
    this.map = this.make.tilemap({ key: this.mapKey });
    const tileset = this.map.addTilesetImage('tiles', 'tiles');
    this.groundLayer = this.map.createLayer('ground', tileset, 0, 0).setDepth(2);
    this.pipeLayer = this.map.createLayer('pipes', tileset, 0, 0).setDepth(6);   // above the hero so pipe entry hides him
    this.groundLayer.setCollisionByExclusion([-1]);
    this.pipeLayer.setCollisionByExclusion([-1]);
    this.mapW = this.map.widthInPixels; this.mapH = this.map.heightInPixels;
    this.physics.world.setBounds(0, 0, this.mapW, this.mapH + 96);
    this.physics.world.setBoundsCollision(true, true, true, false);   // open at the bottom: pits
  }

  buildObjects() {
    const { state, save } = this.sv;
    const calm = save.settings.reducedMotion;
    this.coinGroup = this.physics.add.group({ allowGravity: false, immovable: true });
    this.coffeeGroup = this.physics.add.group({ allowGravity: false, immovable: true });
    this.spawns = {};
    let coinIndex = 0;

    for (const o of this.map.getObjectLayer('objects').objects) {
      const p = props(o);
      switch (o.type) {
        case 'spawn': this.spawns[o.name] = { x: o.x, y: o.y, emerge: !!p.emerge }; break;
        case 'pipe': this.pipes.push({ x: o.x, y: o.y, w: o.width, target: p.target, spawn: p.spawn }); break;
        case 'checkpoint': {
          const flag = this.add.sprite(o.x, o.y, 'flag', 0).setOrigin(0.5, 1).setDepth(3);
          this.checkpoints.push({ x: o.x, y: o.y, flag, active: state.checkpoint?.map === this.mapKey && state.checkpoint.x === o.x });
          if (this.checkpoints.at(-1).active) flag.setFrame(1);
          break;
        }
        case 'coin': {
          const id = `${this.mapKey}:coin:${coinIndex++}`;
          if (state.hasCollected(id)) break;
          const s = this.physics.add.sprite(o.x, o.y, 'coin', 0).setDepth(8);
          s.body.setAllowGravity(false); s.body.setSize(10, 12);
          s.setData('id', id);
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
        case 'sign': {
          const str = dialogue.signs[p.dialogue] ?? p.dialogue;
          // dark backing keeps sign text readable on any background (contrast-safe)
          this.add.text(o.x, o.y, str, { fontFamily: FONT, fontSize: '8px', color: C.white, align: 'center', lineSpacing: 3,
            backgroundColor: 'rgba(15,15,27,0.82)', padding: { x: 3, y: 3 } })
            .setOrigin(0.5, 1).setDepth(3);
          break;
        }
        default: break;
      }
    }
  }

  buildPlayer() {
    const { state } = this.sv;
    const cp = state.checkpoint?.map === this.mapKey ? state.checkpoint : null;
    const sp = this.spawns[this.spawnName] ?? this.spawns.start ?? { x: 32, y: 192 };
    this.player = new Player(this, sp.x, sp.y, this.sv);
    this.spawnPoint = { x: sp.x, y: sp.y };
    void cp;
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
    this.physics.add.overlap(z, this.coinGroup, (_, coin) => this.collectCoin(coin));
    this.physics.add.overlap(z, this.coffeeGroup, (_, cup) => this.collectCoffee(cup));
  }

  // --------------------------------------------------------------- gameplay
  collectCoin(coin) {
    const { state, audio } = this.sv;
    state.collectCoin(coin.getData('id'));
    audio.sfx('coin');
    this.fx.coinSparkle(coin.x, coin.y);
    this.fx.floatText(coin.x, coin.y - 8, '+1 XP');
    coin.destroy();
  }

  collectCoffee(cup) {
    const { state, audio } = this.sv;
    state.startCoffee();
    audio.sfx('coffee');
    this.fx.burst(cup.x, cup.y, { count: 14, speed: 80, colors: [C.darkBrown, C.orange, C.white], life: 500 });
    this.fx.floatText(cup.x, cup.y - 8, 'COFFEE!', '#FCA044');
    cup.destroy();
  }

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
    cam.once('camerafadeoutcomplete', () => this.scene.restart({ map, spawn }));
  }

  respawn(coinLoss) {
    if (this.respawning) return;
    this.respawning = true;
    const { state, audio } = this.sv;
    const lost = state.loseCoins(coinLoss);
    audio.sfx('respawn');
    this.fx.shake(160, 0.006);
    this.cameras.main.flash(180, 255, 255, 255);
    if (lost) this.fx.floatText(this.player.x, Math.min(this.player.feetY, this.mapH - 8), `-${lost} COINS`, '#F83800');
    this.player.lock();
    this.time.delayedCall(RESPAWN.respawnDelayMs, () => {
      const cp = state.checkpoint?.map === this.mapKey ? state.checkpoint : this.spawnPoint;
      this.player.unlock();
      this.player.teleport(cp.x, cp.y);
      this.cameras.main.scrollX = Phaser.Math.Clamp(cp.x - GAME.width / 2, 0, Math.max(0, this.mapW - GAME.width));
      this.respawning = false;
    });
  }

  pauseGame() {
    if (this.transitioning || !this.scene.isActive()) return;
    this.scene.launch('Pause');
    this.scene.pause();
  }

  // ------------------------------------------------------------------ frame
  update(_, delta) {
    const { input, state, audio } = this.sv;
    const dt = Math.min(delta / 1000, 1 / 30);
    if (input.justPressed('pause')) { this.pauseGame(); return; }

    state.tick(delta);
    this.player.update(dt, input);

    // pipe entry: stand on it and press down
    if (!this.transitioning && input.isDown('down')) {
      const pipe = this.pipeUnderPlayer();
      if (pipe) {
        this.transitioning = true;
        this.player.enterPipe(() => { this.transitioning = false; this.goTo(pipe.target, pipe.spawn); });
      }
    }

    // checkpoints
    for (const cp of this.checkpoints) {
      if (!cp.active && Math.abs(this.player.x - cp.x) < 10 && Math.abs(this.player.feetY - cp.y) < 24) {
        this.checkpoints.forEach((c) => { c.active = false; c.flag.setFrame(0); });
        cp.active = true; cp.flag.setFrame(1);
        state.checkpoint = { map: this.mapKey, x: cp.x, y: cp.y };
        audio.sfx('checkpoint');
        this.fx.burst(cp.x, cp.y - 24, { count: 8, colors: [C.lime, C.white], gravity: 80 });
        this.fx.floatText(cp.x, cp.y - 36, 'CHECKPOINT', '#58D854');
      }
    }

    // fell into a pit
    if (!this.respawning && this.player.body.top > this.mapH + 24) this.respawn(RESPAWN.pitCoinLoss);

    this.updateCamera(dt);
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
