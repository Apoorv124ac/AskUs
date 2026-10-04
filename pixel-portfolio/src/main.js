import Phaser from 'phaser';
import '@fontsource/press-start-2p';
import '@fontsource/silkscreen/400.css';
import '@fontsource/silkscreen/700.css';
import { GAME_W, GAME_H, ZOOM, PHYSICS } from './config.js';
import PreloadScene from './scenes/PreloadScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';
import TitleScene from './scenes/TitleScene.js';
import EntranceScene from './scenes/EntranceScene.js';
import LoginScene from './scenes/LoginScene.js';
import MenuScene from './scenes/MenuScene.js';
import StoryScene from './scenes/StoryScene.js';

const debug = new URLSearchParams(location.search).has('debug');

function start() {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: GAME_W * ZOOM,
    height: GAME_H * ZOOM,
    backgroundColor: '#0f0f1b',
    pixelArt: true,
    roundPixels: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: {
      default: 'arcade',
      arcade: { gravity: { y: PHYSICS.gravity }, debug },
    },
    scene: [PreloadScene, TitleScene, EntranceScene, LoginScene, StoryScene, MenuScene, GameScene, UIScene],
  });
  window.__game = game; // handy for debugging / automated tests
}

// make sure the pixel font is ready before any text is drawn
Promise.all([
  document.fonts.load('8px "Press Start 2P"'),
  document.fonts.load('8px Silkscreen'),
  document.fonts.load('bold 8px Silkscreen'),
])
  .catch(() => {})
  .finally(start);
