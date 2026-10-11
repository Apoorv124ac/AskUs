// Stage 2: the work corridor. Each office is its own room-like zone with its own backdrop.
// Walk through a doorway to join the next organisation: the office changes and its experience card opens.
import { sfx } from '../systems/audio.js';
import { save } from '../systems/save.js';
import { EXPERIENCE_CARDS } from './content.js';

export class Offices {
  constructor(scene) {
    this.s = scene;
    const L = scene.level;
    this.zones = L.offices.zones;
    this.seen = new Set();
    this.cur = -2;
    this.zones.forEach((z, i) => {
      const w = (z.to - z.from) * 16;
      scene.add.tileSprite(z.from * 16, 0, w, 192, `pk-office-${i}`).setOrigin(0).setDepth(1.1);
      const door = scene.add.sprite(z.from * 16, 192, 'pk-door', 0).setOrigin(0.5, 1).setDepth(3.4);
      door.anims.play('pk-door-glow');
    });
  }

  zoneAt(x) {
    return this.zones.findIndex((z) => x >= z.from * 16 && x < z.to * 16);
  }

  update() {
    const s = this.s;
    if (s.talking || s.mini) return;
    const i = this.zoneAt(s.player.x);
    if (i === this.cur) return;
    const first = this.cur === -2;
    this.cur = i;
    s.registry.set('hudInfo', i < 0 ? `DEGREES ${save.pocket.edu.filter(Boolean).length}/4` : `OFFICE ${i + 1}/${this.zones.length}`);
    if (first || this.seen.has(i)) return;
    this.seen.add(i);
    const z = this.zones[i];
    const card = EXPERIENCE_CARDS[i];
    sfx('win');
    s.cameras.main.flash(260, 255, 255, 255);
    s.game.events.emit('banner', `NEW OFFICE ${i + 1}/${this.zones.length}\n${z.name}`);
    s.time.delayedCall(1400, () => s.game.events.emit('fact', { icon: 'scroll', title: `OFFICE ${i + 1}/${this.zones.length}`, label: card.label, tag: card.tag, text: card.text }));
  }
}
