import '@fontsource/press-start-2p/index.css';
import Phaser from 'phaser';
import { GAME } from './config.js';
import { SaveSystem } from './systems/SaveSystem.js';
import { InputSystem } from './systems/InputSystem.js';
import { AudioSystem } from './systems/AudioSystem.js';
import { GameState } from './systems/GameState.js';
import { setupDisplay } from './systems/Display.js';
import { setupTouchControls } from './systems/TouchControls.js';
import { BootScene } from './scenes/BootScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { LevelScene } from './scenes/LevelScene.js';
import { HUDScene } from './scenes/HUDScene.js';
import { PauseScene } from './scenes/PauseScene.js';

const params = new URLSearchParams(location.search);

async function start() {
  // make sure the pixel font is ready before any Phaser text is drawn
  try { await Promise.race([document.fonts.load('8px "Press Start 2P"'), new Promise((r) => setTimeout(r, 1500))]); } catch { /* fall back to monospace */ }

  if (params.has('reset')) { try { localStorage.clear(); } catch { /* ignore */ } }
  const save = new SaveSystem();
  const input = new InputSystem();
  const audio = new AudioSystem(save);
  const state = new GameState(save);
  input.onFirstGesture = () => audio.unlock();
  setupTouchControls(input);

  const game = new Phaser.Game({
    type: params.has('canvas') ? Phaser.CANVAS : Phaser.AUTO,
    parent: 'game',
    width: GAME.width,
    height: GAME.height,
    backgroundColor: GAME.background,
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    scale: { mode: Phaser.Scale.NONE },
    physics: { default: 'arcade', arcade: { gravity: { y: 0 }, fps: 60, debug: params.has('physics') } },
    fps: { target: 60 },
    scene: [BootScene, TitleScene, LevelScene, HUDScene, PauseScene],
  });

  const display = setupDisplay(game, save);
  game.services = { save, input, audio, state, display };
  input.hooks.mute = () => audio.toggleMute();
  input.hooks.crt = () => display.toggleCrt();
  // clear one-frame input edges after every scene has had its update
  game.events.on(Phaser.Core.Events.POST_STEP, () => input.endFrame());

  document.getElementById('boot')?.classList.add('hide');
  if (params.has('debug') || import.meta.env.DEV) window.__oq = { game };
}

start();
