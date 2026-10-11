// Stage 2 education: each study mini-game room earns one degree.
import { save, persist } from '../systems/save.js';
import { sfx } from '../systems/audio.js';
import { STUDIES } from './content.js';

export class EduGates {
  constructor(scene) {
    this.s = scene;
    const L = scene.level;
    if (L.offices) {
      const n = save.pocket.edu.filter(Boolean).length;
      scene.registry.set('hudInfo', `DEGREES ${n}/4`);
      // coming back from a mini-game room that was just won
      const m = /^e(\d)$/.exec(scene.viaPipe || '');
      if (m && save.pocket.edu[+m[1]]) scene.time.delayedCall(700, () => scene.game.events.emit('banner', `DEGREE ${n}/4 EARNED!`));
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
