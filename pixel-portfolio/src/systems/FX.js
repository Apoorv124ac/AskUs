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
