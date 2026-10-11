import Phaser from 'phaser';
import '@fontsource/press-start-2p';
import '@fontsource/silkscreen/400.css';
import '@fontsource/silkscreen/700.css';
import { GAME_W, GAME_H, ZOOM, PHYSICS } from '../config.js';
import dialogue from '../data/dialogue.json';
import PreloadScene from '../scenes/PreloadScene.js';
import GameScene from '../scenes/GameScene.js';
import UIScene from '../scenes/UIScene.js';
import CharacterScene from '../scenes/CharacterScene.js';
import LoginScene from '../scenes/LoginScene.js';
import { initAudio } from '../systems/audio.js';
import { richText } from '../ui/pixel.js';
import { registerPocketLevels } from './levels.js';
import { DIALOGUE } from './content.js';
import { PocketTitle, PocketPass, PocketIntro, PocketMenu } from './scenes.js';
import ProjectScene from './ProjectScene.js';
import PlaneScene from './PlaneScene.js';
import EndScene from './EndScene.js';
import { initOrient } from './orient.js';

const debug = new URLSearchParams(location.search).has('debug');

function start() {
  initAudio();
  initOrient();
  Object.assign(dialogue, DIALOGUE);
  registerPocketLevels();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: GAME_W * ZOOM,
    height: GAME_H * ZOOM,
    backgroundColor: '#0f0f1b',
    pixelArt: true,
    roundPixels: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { gravity: { y: PHYSICS.gravity }, debug } },
    scene: [PreloadScene, PocketTitle, CharacterScene, PocketPass, LoginScene, PocketIntro, PocketMenu, GameScene, UIScene, ProjectScene, PlaneScene, EndScene],
  });
  window.__game = game;
  window.__rich = richText;
}

Promise.all([document.fonts.load('8px "Press Start 2P"'), document.fonts.load('8px Silkscreen'), document.fonts.load('bold 8px Silkscreen')])
  .catch(() => {})
  .finally(start);
