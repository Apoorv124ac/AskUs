import Phaser from 'phaser';
import '@fontsource/press-start-2p';
import { GAME_W, GAME_H, PHYSICS } from './config.js';
import PreloadScene from './scenes/PreloadScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';

const debug = new URLSearchParams(location.search).has('debug');

function start() {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: GAME_W,
    height: GAME_H,
    backgroundColor: '#0f0f1b',
    pixelArt: true,
    roundPixels: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: {
      default: 'arcade',
      arcade: { gravity: { y: PHYSICS.gravity }, debug },
    },
    scene: [PreloadScene, GameScene, UIScene],
  });
  window.__game = game; // handy for debugging / automated tests
}

// make sure the pixel font is ready before any text is drawn
document.fonts
  .load('8px "Press Start 2P"')
  .catch(() => {})
  .finally(start);
