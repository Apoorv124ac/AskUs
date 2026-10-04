import { AUDIO } from '../config.js';

/**
 * Tiny WebAudio chiptune engine: no audio files, all original, loads instantly.
 * The AudioContext is created lazily on the first user gesture (browser autoplay rules).
 */
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);

// Original 8-bar office-groove loop (MIDI note numbers; 0 = rest). 8th-note steps.
const LEAD = [72, 0, 76, 0, 79, 76, 0, 74,  72, 0, 69, 0, 67, 0, 69, 72,  74, 0, 77, 0, 81, 77, 0, 76,  74, 72, 0, 71, 72, 0, 0, 0];
const BASS = [48, 0, 48, 55, 48, 0, 55, 0,  45, 0, 45, 52, 45, 0, 52, 0,  50, 0, 50, 57, 50, 0, 57, 0,  43, 0, 43, 50, 43, 0, 50, 55];

export class AudioSystem {
  constructor(save) {
    this.save = save;
    this.ctx = null;
    this.muted = save.settings.muted;
    this.musicOn = false;
    this.step = 0;
  }

  /** Call from any user gesture. */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : AUDIO.master;
      this.master.connect(this.ctx.destination);
      if (this.musicOn) this.#startLoop();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(m) {
    this.muted = m;
    this.save.settings.muted = m; this.save.save();
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : AUDIO.master, this.ctx.currentTime, 0.02);
  }
  toggleMute() { this.setMuted(!this.muted); return this.muted; }

  #tone(freq, dur, { type = 'square', vol = 0.2, slide = 0, delay = 0, bus = AUDIO.sfx } = {}) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    g.gain.setValueAtTime(vol * bus, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(this.master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  #noise(dur, vol = 0.15) {
    if (!this.ctx) return;
    const n = Math.floor(this.ctx.sampleRate * dur), buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = this.ctx.createBufferSource(), g = this.ctx.createGain();
    s.buffer = buf; g.gain.value = vol * AUDIO.sfx; s.connect(g); g.connect(this.master); s.start();
  }

  sfx(name) {
    if (!this.ctx || this.muted) return;
    switch (name) {
      case 'jump':     this.#tone(300, 0.16, { slide: 380, vol: 0.18 }); break;
      case 'longjump': this.#tone(260, 0.24, { slide: 560, vol: 0.2 }); break;
      case 'airjump':  this.#tone(520, 0.14, { slide: 420, vol: 0.18, type: 'triangle' }); break;
      case 'land':     this.#noise(0.05, 0.08); break;
      case 'bump':     this.#tone(120, 0.08, { type: 'square', vol: 0.2 }); break;
      case 'coin':     this.#tone(988, 0.07, { vol: 0.16 }); this.#tone(1319, 0.2, { vol: 0.16, delay: 0.07 }); break;
      case 'coffee':   [523, 659, 784, 1047].forEach((f, i) => this.#tone(f, 0.12, { delay: i * 0.06, vol: 0.18 })); break;
      case 'pipe':     this.#tone(400, 0.4, { slide: -330, type: 'triangle', vol: 0.25 }); break;
      case 'checkpoint': [659, 784, 988].forEach((f, i) => this.#tone(f, 0.1, { delay: i * 0.07, vol: 0.16 })); break;
      case 'levelup':  [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.#tone(f, 0.14, { delay: i * 0.08, vol: 0.2 })); break;
      case 'respawn':  this.#tone(500, 0.4, { slide: -420, vol: 0.2 }); break;
      case 'blip':     this.#tone(740 + Math.random() * 80, 0.03, { vol: 0.07 }); break;
      case 'grant':    [392, 523, 659, 784, 1047].forEach((f, i) => this.#tone(f, 0.16, { delay: i * 0.07, vol: 0.18, type: 'triangle' })); break;
      case 'deny':     this.#tone(200, 0.12, { vol: 0.2 }); this.#tone(150, 0.2, { vol: 0.2, delay: 0.12 }); break;
      case 'menu':     this.#tone(660, 0.05, { vol: 0.15 }); break;
      case 'confirm':  this.#tone(880, 0.08, { vol: 0.16 }); this.#tone(1175, 0.12, { delay: 0.07, vol: 0.16 }); break;
      default: break;
    }
  }

  startMusic() {
    if (!AUDIO.musicEnabled || this.musicOn) return;
    this.musicOn = true;
    if (this.ctx) this.#startLoop();
  }
  stopMusic() { this.musicOn = false; clearInterval(this.timer); this.timer = null; }

  #startLoop() {
    if (this.timer) return;
    const stepDur = 0.19;
    this.next = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => {
      while (this.next < this.ctx.currentTime + 0.25) {
        const i = this.step % LEAD.length;
        const play = (n, o) => n && this.#tone(NOTE(n), stepDur * 0.9, { ...o, delay: Math.max(0, this.next - this.ctx.currentTime) });
        if (!this.muted) {
          play(LEAD[i], { type: 'square', vol: 0.07, bus: AUDIO.music });
          play(BASS[i], { type: 'triangle', vol: 0.16, bus: AUDIO.music });
        }
        this.next += stepDur; this.step++;
      }
    }, 60);
  }
}
