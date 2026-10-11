// Stage flow: finishing a stage unlocks its project (the on-screen PDF viewer).
import { save, persist } from '../systems/save.js';
import { sfx } from '../systems/audio.js';
import { STAGES } from './content.js';

// stage: 1..5. `from` is the scene that just finished (GameScene or PlaneScene)
export function finishStage(from, stage) {
  save.pocket.done[stage - 1] = true;
  persist();
  sfx('win');
  from.game.events.emit('banner', `STAGE ${stage} CLEAR!\n${STAGES[stage - 1].name}`);
  from.time.delayedCall(2200, () => {
    from.scene.stop('UI');
    from.cameras.main.fadeOut(300, 15, 15, 27);
    from.cameras.main.once('camerafadeoutcomplete', () => from.scene.start('Project', { stage }));
  });
}

export function pocketGoal(scene) {
  scene.lockAnim('celebrate', 2200);
  finishStage(scene, scene.level.pocket);
}

// open stage n (1..5) from any scene
export function startStage(from, n) {
  const st = STAGES[n - 1];
  from.registry.remove('checkpoint');
  from.scene.start(st.scene || 'Game', st.room ? { room: st.room } : undefined);
}
