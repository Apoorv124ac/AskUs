// Stage 2: four study gates. Each gate opens when its mini-game room is won.
import { save, persist } from '../systems/save.js';
import { sfx } from '../systems/audio.js';
import { STUDIES } from './content.js';

const GATE_ROWS = [3, 4, 5, 6, 7, 8, 9, 10, 11];

export class EduGates {
  constructor(scene) {
    this.s = scene;
    const L = scene.level;
    this.gates = scene.physics.add.staticGroup();
    this.tiles = [];
    (L.eduGates || []).forEach((g) => {
      if (save.pocket.edu[g.k]) return;
      GATE_ROWS.forEach((r) => this.tiles.push(this.gates.create(g.col * 16 + 8, r * 16 + 8, 'tile-gate').setDepth(3)));
    });
    if (L.eduGates) {
      scene.physics.add.collider(scene.player, this.gates);
      const n = save.pocket.edu.filter(Boolean).length;
      scene.registry.set('hudInfo', `STUDIES ${n}/4`);
      // coming back from a mini-game room that was just won
      const m = /^e(\d)$/.exec(scene.viaPipe || '');
      if (m && save.pocket.edu[+m[1]]) scene.time.delayedCall(700, () => scene.game.events.emit('banner', `DEGREE ${n}/4 EARNED!\nTHE GATE IS OPEN`));
    }
  }

  // called by a mini-game room when it is won
  roomWon(k) {
    const s = this.s;
    save.pocket.edu[k] = true;
    persist();
    const st = STUDIES[k];
    const n = save.pocket.edu.filter(Boolean).length;
    sfx('win');
    s.time.delayedCall(700, () => {
      s.game.events.emit('fact', { icon: 'scroll', title: `DEGREE ${n}/4`, label: st.short, tag: st.years, text: `*${st.school.toUpperCase()}*. ${st.story}` });
      s.game.events.emit('banner', 'DEGREE EARNED!\nHEADING BACK');
    });
    s.time.delayedCall(4200, () => {
      s.cameras.main.fadeOut(300, 15, 15, 27);
      s.cameras.main.once('camerafadeoutcomplete', () => s.scene.start('Game', { room: 'pk2', viaPipe: `e${k}` }));
    });
  }
}
