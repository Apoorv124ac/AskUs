import { FX as CFG, PALETTE as C } from '../config.js';

const hex = (s) => parseInt(s.slice(1), 16);

/** Juice helpers. Everything respects the reduced-motion setting. */
export class FX {
  constructor(scene, settings) { this.scene = scene; this.settings = settings; }
  get calm() { return this.settings.reducedMotion; }

  /** Burst of square pixels. */
  burst(x, y, { colors = [C.yellow, C.white], count = 8, speed = 70, life = 400, gravity = 200, size = 1 } = {}) {
    if (this.calm && count > 4) count = 4;
    const em = this.scene.add.particles(x, y, 'px', {
      speed: { min: speed * 0.4, max: speed }, angle: { min: 0, max: 360 }, lifespan: life, gravityY: gravity,
      scale: { start: size, end: 0 }, tint: colors.map(hex), emitting: false,
    }).setDepth(30);
    em.explode(count);
    this.scene.time.delayedCall(life + 100, () => em.destroy());
  }

  coinSparkle(x, y) { if (CFG.coinSparkle) this.burst(x, y, { count: 10, speed: 60, life: 350, gravity: 0, colors: [C.yellow, C.white, C.cream] }); }

  dust(x, y, dir = 0, count = 3) {
    if (!CFG.dust || this.calm) return;
    const em = this.scene.add.particles(x, y, 'px', {
      speedX: { min: -20 - dir * 10, max: 20 - dir * 10 }, speedY: { min: -18, max: -4 }, lifespan: 280,
      scale: { start: 1.5, end: 0 }, tint: [hex(C.lgrey), hex(C.white)], emitting: false,
    }).setDepth(4);
    em.explode(count);
    this.scene.time.delayedCall(400, () => em.destroy());
  }

  /** Slow ambient particles that give each theme some life (skipped in calm mode). */
  ambient(theme) {
    if (this.calm) return;
    const cfg = {
      city:    { colors: [C.white, C.cream], vx: [6, 16], vy: [-3, 3], freq: 520, life: [5000, 8000], alpha: 0.5 },
      campus:  { colors: [C.green, C.orange, C.yellow, C.lime], vx: [-10, 8], vy: [10, 22], freq: 420, life: [5000, 8000], alpha: 0.9, size: 1.6 },
      office:  { colors: [C.white], vx: [-3, 3], vy: [-4, 3], freq: 480, life: [5000, 9000], alpha: 0.35 },
      server:  { colors: [C.lime, C.cyan], vx: [-2, 2], vy: [-42, -18], freq: 260, life: [3000, 6000], alpha: 0.7 },
      gallery: { colors: [C.yellow, C.white], vx: [-4, 4], vy: [-5, 5], freq: 300, life: [2500, 5000], alpha: 0.9 },
      sunset:  { colors: [C.yellow, C.orange, C.cream], vx: [-8, 8], vy: [-9, 5], freq: 340, life: [4000, 8000], alpha: 0.9, size: 1.4 },
      boss:    { colors: [C.red, C.orange, C.yellow], vx: [-6, 6], vy: [-40, -15], freq: 160, life: [2500, 5000], alpha: 0.8 },
    }[theme];
    if (!cfg) return;
    const em = this.scene.add.particles(0, 0, 'px', {
      x: { min: 0, max: 256 }, y: { min: 0, max: 224 }, lifespan: { min: cfg.life[0], max: cfg.life[1] }, frequency: cfg.freq, quantity: 1,
      speedX: { min: cfg.vx[0], max: cfg.vx[1] }, speedY: { min: cfg.vy[0], max: cfg.vy[1] },
      scale: cfg.size ?? 1, alpha: { start: cfg.alpha, end: 0 }, tint: cfg.colors.map(hex),
    }).setScrollFactor(0).setDepth(-5);
    em.fastForward(3000);
  }

  shake(ms = CFG.shakeDurationMs, intensity = CFG.shakeIntensity) {
    if (!this.calm) this.scene.cameras.main.shake(ms, intensity);
  }

  /** Floating "+1" style text. */
  floatText(x, y, text, color = '#F8D878') {
    const t = this.scene.add.text(x, y, text, { fontFamily: '"Press Start 2P"', fontSize: '8px', color })
      .setOrigin(0.5).setDepth(40).setShadow(1, 1, '#0F0F1B', 0, false, true);
    this.scene.tweens.add({ targets: t, y: this.calm ? y : y - 14, alpha: 0, duration: 700, delay: 150, onComplete: () => t.destroy() });
  }
}
