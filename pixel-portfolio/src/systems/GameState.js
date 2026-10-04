import Phaser from 'phaser';
import { PROGRESSION, COFFEE } from '../config.js';
import { isWorldUnlocked } from './Worlds.js';

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
    this.worlds = new Set(p.worlds);
    this.earned = { degrees: new Set(p.earned?.degrees), bosses: new Set(p.earned?.bosses), awards: new Set(p.earned?.awards) };
    this.lastWorld = p.lastWorld ?? 1;
  }

  /** Mark a degree / boss achievement / certificate as earned (kind: 'degrees' | 'bosses' | 'awards'). */
  earn(kind, index) { const fresh = !this.earned[kind].has(index); this.earned[kind].add(index); this.persist(); return fresh; }
  earnedCount(kind) { return this.earned[kind].size; }
  /** How many collected ids contain `marker` (e.g. ':fact:' or ':skill:2:'). */
  countCollected(marker) { let n = 0; for (const id of this.collected) if (id.includes(marker)) n++; return n; }
  /** The final flag: jump straight to the top of the career ladder. */
  promoteHired() {
    const top = PROGRESSION.levels[PROGRESSION.levels.length - 1].xp;
    if (this.xp < top) { this.xp = top; this.emit('xp', this.xp); this.emit('tier', this.tier); this.emit('levelup', this.tier); }
    this.persist();
  }

  get recruiter() { return !!this.saveSys.settings.recruiter; }
  setRecruiter(on) { this.saveSys.settings.recruiter = !!on; this.saveSys.save(); this.emit('recruiter', !!on); }
  isUnlocked(id) { return isWorldUnlocked(id, this.worlds, this.recruiter); }
  /** Mark a world cleared. Returns true if it was newly cleared. */
  completeWorld(id) {
    const fresh = !this.worlds.has(id);
    this.worlds.add(id);
    this.persist();
    this.emit('world', id);
    return fresh;
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
    p.worlds = [...this.worlds]; p.lastWorld = this.lastWorld;
    p.earned = { degrees: [...this.earned.degrees], bosses: [...this.earned.bosses], awards: [...this.earned.awards] };
    this.saveSys.save();
  }
  reset() {
    this.saveSys.reset();
    this.coins = 0; this.xp = 0; this.collected.clear(); this.coffeeMs = 0; this.checkpoint = null;
    this.worlds.clear(); this.lastWorld = 1;
    for (const k of Object.keys(this.earned)) this.earned[k].clear();
    this.emit('coins', 0); this.emit('xp', 0); this.emit('tier', 0);
  }
}
