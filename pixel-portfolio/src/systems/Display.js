import { GAME } from '../config.js';

/**
 * Responsive canvas: the game renders at 256x224 and is scaled by CSS.
 * Integer scale factors when there is room (>=2x) for perfectly even pixels;
 * on small screens (phones) it falls back to a fractional fit.
 */
export function setupDisplay(game, save) {
  const stage = document.getElementById('stage');
  const fit = () => {
    const raw = Math.min(window.innerWidth / GAME.width, window.innerHeight / GAME.height);
    const s = raw >= 2 ? Math.floor(raw) : raw;
    const canvas = game.canvas;
    if (!canvas) return;
    const w = Math.floor(GAME.width * s), h = Math.floor(GAME.height * s);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    stage.style.width = w + 'px';
    stage.style.height = h + 'px';
    stage.style.setProperty('--s', String(w / GAME.width));
    game.scale.refresh();
  };
  fit();
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', () => setTimeout(fit, 100));

  const applyCrt = () => document.body.classList.toggle('crt', !!save.settings.crt);
  applyCrt();
  return {
    toggleCrt() { save.settings.crt = !save.settings.crt; save.save(); applyCrt(); return save.settings.crt; },
    fit,
  };
}
