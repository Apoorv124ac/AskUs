import Phaser from 'phaser';
import { PROGRESSION, COFFEE } from '../config.js';

/**
 * Runtime game state shared by every scene (coins, XP, career tier, coffee timer, collected ids).
 * Emits: 'coins', 'xp', 'tier' (index), 'levelup' (index), 'coffee'.
 */
export class GameState extends Phaser.Events.EventEmitter {
  constructor(save) {
    super();
    this.saveSys = save;
    const p = save.progress;
    this.coins = p.coins;
    this.xp = p.xp;
    this.collected = new Set(p.collected);
    this.coffeeMs = 0;
    this.checkpoint = null;      // { map, x, y }
  }

  get tier() {
    let t = 0;
    PROGRESSION.levels.forEach((l, i) => { if (this.xp >= l.xp) t = i; });
    return t;
  }
  get tierTitle() { return PROGRESSION.levels[this.tier].title; }
  /** 0..1 progress towards the next career level (1 at the top). */
  get tierProgress() {
    const L = PROGRESSION.levels, t = this.tier;
    if (t >= L.length - 1) return 1;
    return (this.xp - L[t].xp) / (L[t + 1].xp - L[t].xp);
  }

  hasCollected(id) { return this.collected.has(id); }

  collectCoin(id) {
    const before = this.tier;
    this.collected.add(id);
    this.coins += PROGRESSION.coinValue;
    this.xp += PROGRESSION.xpPerCoin;
    this.emit('coins', this.coins);
    this.emit('xp', this.xp);
    if (this.tier !== before) { this.emit('tier', this.tier); this.emit('levelup', this.tier); }
    this.persist();
  }

  /** Lose wallet coins (never XP). Returns how many were actually lost. */
  loseCoins(n) {
    const lost = Math.min(n, this.coins);
    this.coins -= lost;
    if (lost) { this.emit('coins', this.coins); this.persist(); }
    return lost;
  }

  startCoffee() { this.coffeeMs = COFFEE.durationMs; this.emit('coffee', true); }
  get coffeeActive() { return this.coffeeMs > 0; }
  tick(dtMs) {
    if (this.coffeeMs > 0) {
      this.coffeeMs = Math.max(0, this.coffeeMs - dtMs);
      if (this.coffeeMs === 0) this.emit('coffee', false);
    }
  }

  persist() {
    const p = this.saveSys.progress;
    p.coins = this.coins; p.xp = this.xp; p.collected = [...this.collected];
    this.saveSys.save();
  }
  reset() {
    this.saveSys.reset();
    this.coins = 0; this.xp = 0; this.collected.clear(); this.coffeeMs = 0; this.checkpoint = null;
    this.emit('coins', 0); this.emit('xp', 0); this.emit('tier', 0);
  }
}
