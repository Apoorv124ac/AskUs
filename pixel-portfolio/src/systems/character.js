// The playable hero. Every scene uses the texture key 'hero'; picking a character just redraws
// that canvas texture from the chosen sheet (public/assets/chars/<id>.png), so no other code changes.
import { FW, FH, COLS, HERO_FRAMES } from '../heroFrames.js';
import { CHARACTERS, characterById } from '../data/characters.js';
import { save, persist } from './save.js';

export const loadCharacterSheets = (scene) =>
  CHARACTERS.forEach((c) => scene.load.spritesheet(`char-${c.id}`, `assets/chars/${c.id}.png`, { frameWidth: FW, frameHeight: FH }));

export function createHeroTexture(scene) {
  const rows = Math.ceil(HERO_FRAMES.length / COLS);
  const tex = scene.textures.createCanvas('hero', FW * COLS, FH * rows);
  HERO_FRAMES.forEach((_, i) => tex.add(i, 0, (i % COLS) * FW, Math.floor(i / COLS) * FH, FW, FH));
  applyCharacter(scene, save.character);
}

export function applyCharacter(scene, id, remember = false) {
  const c = characterById(id);
  const tex = scene.textures.get('hero');
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, tex.width, tex.height);
  ctx.drawImage(scene.textures.get(`char-${c.id}`).getSourceImage(), 0, 0);
  tex.refresh();
  if (remember) {
    save.character = c.id;
    save.gender = c.gender;
    persist();
  }
  return c;
}
