// Sound for Office Quest: everything is synthesised with the Web Audio API (no audio files).
// Philosophy: minimal. Soft background loops (lower volume while people talk), and short sound
// effects only where they tell the player something (jump, coin, hurt, break, power-up...).
// M toggles all sound; the choice is remembered.
import { save, persist } from './save.js';

let ctx = null;
let master = null;
let musicBus = null;
let sfxBus = null;
let noiseBuf = null;
let wanted = null; // { key, shift }
let playing = null; // { key, shift, gain, step, next, timer }
let ducked = false;

const MUSIC_VOL = 0.3;
const DUCK_VOL = 0.1;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ----------------------------------------------------------------- tunes
// lead / bass: [midiNote (0 = rest), length in eighth notes]
const bar = (...n) => n;
const TRACKS = {
  // gentle, for title / menus / story
  theme: {
    bpm: 84, leadWave: 'triangle', leadVol: 0.07, bassWave: 'sine', bassVol: 0.1,
    lead: [
      ...bar([60, 1], [64, 1], [67, 1], [72, 1], [67, 1], [64, 1], [67, 1], [64, 1]),
      ...bar([59, 1], [62, 1], [67, 1], [71, 1], [67, 1], [62, 1], [67, 1], [62, 1]),
      ...bar([57, 1], [60, 1], [64, 1], [69, 1], [64, 1], [60, 1], [64, 1], [60, 1]),
      ...bar([53, 1], [57, 1], [60, 1], [65, 1], [60, 1], [57, 1], [60, 1], [57, 1]),
    ],
    bass: [[48, 8], [43, 8], [45, 8], [41, 8]],
  },
  // light bouncy loop for the worlds
  play: {
    bpm: 124, leadWave: 'square', leadVol: 0.04, bassWave: 'triangle', bassVol: 0.09,
    lead: [
      ...bar([72, 1], [76, 1], [79, 1], [76, 1], [72, 1], [76, 1], [79, 2]),
      ...bar([69, 1], [72, 1], [76, 1], [72, 1], [69, 1], [72, 1], [76, 2]),
      ...bar([65, 1], [69, 1], [72, 1], [69, 1], [65, 1], [69, 1], [72, 2]),
      ...bar([67, 1], [71, 1], [74, 1], [71, 1], [67, 1], [71, 1], [74, 2]),
      ...bar([79, 2], [76, 2], [79, 1], [81, 1], [79, 1], [76, 1]),
      ...bar([81, 2], [76, 2], [72, 2], [76, 2]),
      ...bar([77, 2], [76, 1], [77, 1], [79, 2], [72, 2]),
      ...bar([74, 1], [76, 1], [77, 1], [76, 1], [74, 2], [71, 2]),
    ],
    bass: [
      ...[[48, 2], [55, 2], [48, 2], [55, 2], [45, 2], [52, 2], [45, 2], [52, 2]],
      ...[[41, 2], [48, 2], [41, 2], [48, 2], [43, 2], [50, 2], [43, 2], [50, 2]],
      ...[[48, 2], [55, 2], [48, 2], [55, 2], [45, 2], [52, 2], [45, 2], [52, 2]],
      ...[[41, 2], [48, 2], [41, 2], [48, 2], [43, 2], [50, 2], [43, 2], [50, 2]],
    ],
  },
  // quiet and sparse for bonus rooms and the lair before the fight
  cave: {
    bpm: 92, leadWave: 'triangle', leadVol: 0.07, bassWave: 'sine', bassVol: 0.1,
    lead: [
      ...bar([69, 2], [0, 2], [72, 2], [0, 2]),
      ...bar([65, 2], [0, 2], [69, 2], [72, 2]),
      ...bar([72, 2], [0, 2], [67, 2], [0, 2]),
      ...bar([68, 2], [71, 2], [76, 2], [0, 2]),
    ],
    bass: [[45, 4], [52, 4], [41, 4], [48, 4], [48, 4], [55, 4], [40, 4], [47, 4]],
  },
  // tense, for the dragon fight only
  boss: {
    bpm: 150, leadWave: 'square', leadVol: 0.045, bassWave: 'sawtooth', bassVol: 0.05,
    lead: [
      ...bar([62, 1], [0, 1], [62, 1], [65, 1], [0, 1], [69, 1], [65, 1], [62, 1]),
      ...bar([58, 1], [0, 1], [58, 1], [62, 1], [0, 1], [65, 1], [62, 1], [58, 1]),
      ...bar([60, 1], [0, 1], [60, 1], [64, 1], [0, 1], [67, 1], [64, 1], [60, 1]),
      ...bar([57, 1], [0, 1], [57, 1], [61, 1], [0, 1], [64, 1], [61, 1], [69, 1]),
    ],
    bass: [
      ...Array(8).fill([38, 1]), ...Array(8).fill([34, 1]), ...Array(8).fill([36, 1]), ...Array(8).fill([33, 1]),
    ],
  },
};

// ----------------------------------------------------------------- setup
function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = save.muted ? 0 : 0.8;
  master.connect(ctx.destination);
  musicBus = ctx.createGain();
  musicBus.gain.value = ducked ? DUCK_VOL : MUSIC_VOL;
  musicBus.connect(master);
  sfxBus = ctx.createGain();
  sfxBus.gain.value = 0.55;
  sfxBus.connect(master);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}

// Browsers only allow sound after a click or key press: unlock on the first one.
export function initAudio() {
  const unlock = () => {
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume();
    startWanted();
  };
  ['pointerdown', 'keydown', 'touchstart'].forEach((e) => window.addEventListener(e, unlock, { capture: true }));
  window.addEventListener('keydown', (e) => {
    if ((e.key === 'm' || e.key === 'M') && !e.repeat && e.target.tagName !== 'INPUT') toggleMute();
  });
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else ctx.resume();
  });
}

export const isMuted = () => !!save.muted;

export function toggleMute() {
  save.muted = !save.muted;
  persist();
  if (master) master.gain.setTargetAtTime(save.muted ? 0 : 0.8, ctx.currentTime, 0.03);
  window.__game?.events.emit('banner', save.muted ? 'SOUND OFF' : 'SOUND ON');
  return save.muted;
}

// ----------------------------------------------------------------- music
export function music(key, shift = 0) {
  wanted = key ? { key, shift } : null;
  startWanted();
}

export function duck(on) {
  if (ducked === on) return;
  ducked = on;
  if (musicBus) musicBus.gain.setTargetAtTime(on ? DUCK_VOL : MUSIC_VOL, ctx.currentTime, 0.2);
}

function stopPlaying(fade = 0.35) {
  const p = playing;
  if (!p) return;
  playing = null;
  clearInterval(p.timer);
  p.gain.gain.setTargetAtTime(0, ctx.currentTime, fade / 3);
  setTimeout(() => p.gain.disconnect(), fade * 1000 + 200);
}

function startWanted() {
  if (!ctx || ctx.state !== 'running') return;
  if (!wanted) return stopPlaying();
  if (playing && playing.key === wanted.key && playing.shift === wanted.shift) return;
  stopPlaying();
  const def = TRACKS[wanted.key];
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.6);
  gain.connect(musicBus);
  const stepLen = 60 / def.bpm / 2;
  const expand = (arr) => {
    const out = [];
    let at = 0;
    arr.forEach(([n, len]) => {
      if (n) out.push({ at, n, len });
      at += len;
    });
    return { events: out, total: at };
  };
  const lead = expand(def.lead);
  const bass = expand(def.bass);
  const total = Math.max(lead.total, bass.total);
  const p = { key: wanted.key, shift: wanted.shift, gain, step: 0, next: ctx.currentTime + 0.1 };
  playing = p;
  const tick = () => {
    while (p.next < ctx.currentTime + 0.3) {
      const s = p.step % total;
      lead.events.filter((e) => e.at === s).forEach((e) => note(def.leadWave, mtof(e.n + p.shift), p.next, e.len * stepLen * 0.92, def.leadVol, gain));
      bass.events.filter((e) => e.at === s).forEach((e) => note(def.bassWave, mtof(e.n + p.shift), p.next, e.len * stepLen * 0.95, def.bassVol, gain));
      p.step++;
      p.next += stepLen;
    }
  };
  tick();
  p.timer = setInterval(tick, 60);
}

// ----------------------------------------------------------------- building blocks
function note(type, freq, t, dur, vol, bus = sfxBus, slideTo = null) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, 0.03));
  o.connect(g).connect(bus);
  o.start(t);
  o.stop(t + Math.max(dur, 0.03) + 0.05);
}

function noise(t, dur, vol, from = 3000, to = 600) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(sfxBus);
  src.start(t);
  src.stop(t + dur + 0.05);
}

const arp = (notes, step, type, vol, t, dur = step * 1.6) => notes.forEach((n, i) => note(type, n, t + i * step, dur, vol));

// ----------------------------------------------------------------- sound effects
const SFX = {
  jump: (t) => note('square', 260, t, 0.13, 0.1, sfxBus, 560),
  jump2: (t) => note('square', 420, t, 0.12, 0.09, sfxBus, 900),
  coin: (t) => {
    note('square', 988, t, 0.06, 0.07);
    note('square', 1319, t + 0.06, 0.16, 0.07);
  },
  fact: (t) => arp([659, 784, 988, 1319], 0.055, 'triangle', 0.11, t),
  stomp: (t) => {
    note('square', 240, t, 0.11, 0.1, sfxBus, 80);
    noise(t, 0.08, 0.12, 2500, 400);
  },
  pop: (t) => note('triangle', 500, t, 0.14, 0.12, sfxBus, 90),
  hurt: (t) => note('sawtooth', 320, t, 0.28, 0.1, sfxBus, 90),
  brick: (t) => {
    noise(t, 0.2, 0.3, 5000, 500);
    note('square', 180, t, 0.1, 0.08, sfxBus, 70);
  },
  power: (t) => arp([392, 494, 587, 784, 988, 1175], 0.06, 'square', 0.07, t),
  check: (t) => arp([784, 1047], 0.09, 'sine', 0.14, t, 0.25),
  pipe: (t) => note('triangle', 420, t, 0.4, 0.14, sfxBus, 90),
  spring: (t) => note('triangle', 200, t, 0.22, 0.14, sfxBus, 800),
  win: (t) => arp([523, 659, 784, 1047, 784, 1047, 1319], 0.1, 'square', 0.07, t, 0.18),
  level: (t) => arp([523, 659, 784, 1047, 1319], 0.07, 'triangle', 0.12, t),
  boss: (t) => {
    note('square', 160, t, 0.28, 0.14, sfxBus, 45);
    noise(t, 0.25, 0.25, 1800, 200);
  },
  fire: (t) => noise(t, 0.7, 0.28, 2200, 250),
  roar: (t) => {
    note('sawtooth', 95, t, 0.9, 0.12, sfxBus, 48);
    noise(t, 0.9, 0.12, 900, 150);
  },
  throw: (t) => note('square', 700, t, 0.07, 0.07, sfxBus, 1200),
  tick: (t) => note('square', 880, t, 0.04, 0.05),
  select: (t) => arp([660, 990], 0.05, 'square', 0.06, t, 0.09),
  buzz: (t) => note('square', 120, t, 0.22, 0.09, sfxBus, 90),
  // memory plates: five fixed pitches (a pentatonic scale)
  plate: (t, i = 0) => note('triangle', [262, 330, 392, 494, 587][i % 5], t, 0.28, 0.2),
  light: (t) => note('sine', 700, t, 0.08, 0.14, sfxBus, 1000),
  whack: (t) => {
    note('square', 300, t, 0.07, 0.1, sfxBus, 120);
    note('square', 900, t + 0.05, 0.08, 0.06);
  },
  beat: (t, i = 0) => note('square', [330, 392, 494][i % 3], t, 0.1, 0.07),
  snap: (t) => noise(t, 0.12, 0.2, 6000, 1200),
};

export function sfx(name, arg) {
  if (!ctx || ctx.state !== 'running' || save.muted) return;
  SFX[name]?.(ctx.currentTime + 0.005, arg);
}
