import { STORAGE } from '../config.js';

const reducedMotionPref = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};

const defaults = () => ({
  version: 1,
  settings: { muted: false, crt: false, reducedMotion: reducedMotionPref(), recruiter: false },
  progress: { coins: 0, xp: 0, collected: [], worlds: [], lastWorld: 1, earned: { degrees: [], bosses: [], awards: [] } },
  flags: { introSeen: false, guest: false },
  email: null,
  emailAt: null,
});

/** localStorage wrapper that never throws (private windows, blocked storage...). */
export class SaveSystem {
  constructor() { this.data = this.#load(); }

  #load() {
    try {
      const raw = localStorage.getItem(STORAGE.key);
      if (!raw) return defaults();
      const d = JSON.parse(raw), base = defaults();
      return { ...base, ...d, settings: { ...base.settings, ...d.settings }, progress: { ...base.progress, ...d.progress }, flags: { ...base.flags, ...d.flags } };
    } catch { return defaults(); }
  }

  save() {
    try { localStorage.setItem(STORAGE.key, JSON.stringify(this.data)); } catch { /* storage unavailable */ }
  }
  get settings() { return this.data.settings; }
  get progress() { return this.data.progress; }
  get flags() { return this.data.flags; }
  /** Has the visitor already been through the login desk (e-mail or guest)? */
  get hasProfile() { return !!this.data.email || this.data.flags.guest; }
  setEmail(email) { this.data.email = email; this.data.emailAt = new Date().toISOString(); this.data.flags.guest = false; this.save(); }
  reset() {
    const keep = this.data.settings;
    this.data = defaults();
    this.data.settings = keep;
    this.save();
  }
}
