// Underwater physics + atmosphere. Gravity is tiny, speeds are slower and floaty, JUMP means
// "swim up" while it is held, DOWN lets you sink. Bubbles, light rays and a blue tint sell it.
import Phaser from 'phaser';
import { PHYSICS as P, ZOOM } from '../config.js';

const OFF_X = 128 * (ZOOM - 1);
const OFF_Y = 112 * (ZOOM - 1);

export class Water {
  constructor(scene) {
    this.s = scene;
    const p = scene.player;
    p.body.setMaxVelocity(110, 78);
    this.nextBubble = 0;
    this.nextAmbient = 0;

    // tint + soft light rays (screen space, above the world, below the HUD)
    scene.add.rectangle(OFF_X, OFF_Y, 256, 224, 0x1f6fd0, 0.22).setOrigin(0).setScrollFactor(0).setDepth(8);
    this.rays = [0, 1, 2, 3].map((i) => {
      const r = scene.add.rectangle(OFF_X + 30 + i * 62, OFF_Y - 10, 18, 260, 0xbfeaff, 0.07).setOrigin(0.5, 0).setScrollFactor(0).setDepth(8).setAngle(14);
      scene.tweens.add({ targets: r, alpha: 0.02, x: r.x + 14, yoyo: true, repeat: -1, duration: 2600 + i * 500, ease: 'Sine.inOut' });
      return r;
    });
    // the sea itself: two parallax layers of dark kelp + a few far-away fish
    scene.parallax = scene.parallax || [];
    ['pk-seabg-far', 'pk-seabg-near'].forEach((key, i) => {
      if (!scene.textures.exists(key)) this.makeBg(key, i);
      const ts = scene.add.tileSprite(OFF_X, OFF_Y, 256, 224, key).setOrigin(0).setScrollFactor(0).setDepth(i);
      scene.parallax.push([ts, 0.12 + i * 0.22]);
    });
    for (let i = 0; i < 7; i++) {
      const f = scene.add.sprite(Phaser.Math.Between(0, scene.worldW), Phaser.Math.Between(30, 150), 'pk-fish', 0).setDepth(0.8).setAlpha(0.45).setScale(0.7).setTint(0x2a5ca8);
      f.anims.play('pk-fish-swim');
      const dir = i % 2 ? 1 : -1;
      f.setFlipX(dir > 0);
      scene.tweens.add({ targets: f, x: f.x + dir * 160, yoyo: true, repeat: -1, duration: 5200 + i * 700, ease: 'Sine.inOut', onYoyo: () => f.setFlipX(dir < 0), onRepeat: () => f.setFlipX(dir > 0) });
    }
    scene.cameras.main.setBackgroundColor(scene.level.bg);
  }

  makeBg(key, i) {
    const t = this.s.textures.createCanvas(key, 256, 224);
    const c = t.getContext();
    c.imageSmoothingEnabled = false;
    if (i === 0) {
      const g = c.createLinearGradient(0, 0, 0, 224);
      g.addColorStop(0, '#2a7fd8');
      g.addColorStop(0.55, '#1c4a9c');
      g.addColorStop(1, '#12306c');
      c.fillStyle = g;
      c.fillRect(0, 0, 256, 224);
      for (let k = 0; k < 40; k++) {
        c.fillStyle = k % 3 ? '#3a8ee0' : '#4aa2f0';
        c.fillRect((k * 47) % 256, (k * 29) % 120, 2, 1);
      }
      // distant rocks
      c.fillStyle = '#17408a';
      [[10, 60], [70, 90], [130, 50], [200, 80]].forEach(([x, h]) => {
        c.beginPath();
        c.moveTo(x, 224);
        c.lineTo(x + 20, 224 - h);
        c.lineTo(x + 46, 224);
        c.fill();
      });
    } else {
      c.clearRect(0, 0, 256, 224);
      c.fillStyle = '#1a5a8a';
      for (let x = 6; x < 256; x += 38) {
        const h = 50 + ((x * 7) % 40);
        for (let y = 0; y < h; y++) c.fillRect(x + Math.round(Math.sin(y / 7 + x) * 3), 224 - y, 4, 1);
        c.fillRect(x - 6, 224 - h + 10, 4, 2);
        c.fillRect(x + 8, 224 - h + 24, 4, 2);
      }
    }
    t.refresh();
  }

  // called every frame from GameScene.update
  apply(dt, up, down) {
    const p = this.s.player;
    const b = p.body;
    b.setGravityY(-P.gravity + 110); // net gravity ~110: you drift down slowly
    if (up) b.velocity.y = Math.max(b.velocity.y - 420 * dt, -78);
    else if (down) b.velocity.y = Math.min(b.velocity.y + 360 * dt, 78);
    const now = this.s.time.now;
    const moving = Math.abs(b.velocity.x) > 12 || Math.abs(b.velocity.y) > 20;
    if (moving && now > this.nextBubble) {
      this.nextBubble = now + 380;
      this.bubble(p.x + (p.flipX ? -5 : 5), p.y - 14, 3);
    }
    if (now > this.nextAmbient) {
      this.nextAmbient = now + 320;
      const cam = this.s.cameras.main;
      this.bubble(cam.worldView.x + Phaser.Math.Between(0, 256), cam.worldView.bottom - 6, 2, 150);
    }
  }

  bubble(x, y, size, rise = 40) {
    const s = this.s;
    const b = s.add.rectangle(x, y, size, size, 0xd8f4ff, 0.8).setDepth(7).setStrokeStyle(1, 0x6ab8f0, 0.8);
    s.tweens.add({ targets: b, y: y - rise - Phaser.Math.Between(0, 30), x: x + Phaser.Math.Between(-8, 8), alpha: 0, duration: 900 + rise * 6, ease: 'Sine.out', onComplete: () => b.destroy() });
  }
}
