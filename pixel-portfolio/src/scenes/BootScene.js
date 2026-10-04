import Phaser from 'phaser';
import { GAME } from '../config.js';
import { SPRITESHEETS, IMAGES, HERO, MAPS } from '../assets/manifest.js';
import { generatePlaceholder, generateHero } from '../assets/placeholders.js';
import { text } from '../systems/UI.js';

/** Loads real assets named in the manifest, generates placeholders for the rest. */
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    const base = import.meta.env.BASE_URL;
    text(this, GAME.width / 2, GAME.height / 2, 'LOADING...');
    for (const [key, a] of Object.entries(SPRITESHEETS)) if (a.url) this.load.spritesheet(key, base + a.url, { frameWidth: a.frameWidth, frameHeight: a.frameHeight });
    for (const [key, a] of Object.entries(IMAGES)) if (a.url) this.load.image(key, base + a.url);
    if (HERO.url) for (let t = 0; t < HERO.tiers; t++) this.load.spritesheet(`hero_t${t}`, base + HERO.url.replace('{tier}', t), { frameWidth: HERO.frameWidth, frameHeight: HERO.frameHeight });
    for (const [key, url] of Object.entries(MAPS)) this.load.tilemapTiledJSON(key, base + url);
  }

  create() {
    for (const [key, a] of Object.entries({ ...SPRITESHEETS, ...IMAGES })) {
      if (!this.textures.exists(key)) generatePlaceholder(this, a.generator, key);
    }
    for (let t = 0; t < HERO.tiers; t++) if (!this.textures.exists(`hero_t${t}`)) generateHero(this, `hero_t${t}`, t);

    this.anims.create({ key: 'coin-spin', frames: this.anims.generateFrameNumbers('coin', { frames: [0, 1, 2, 3] }), frameRate: 8, repeat: -1 });
    this.scene.start('Title');
  }
}
