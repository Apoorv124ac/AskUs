// Progress + login stored in the visitor's own browser (localStorage).
const KEY = 'officeQuest.save.v1';

const DEFAULTS = {
  email: '',
  name: '',
  emailSent: '',
  completed: [false, false, false, false, false, false, false],
  recruiter: false,
  coins: 0,
  xp: 0,
  level: 0,
  collected: [],
  lastWorld: 0,
  storySeen: false,
  degrees: [false, false, false, false],
  floors: [false, false, false, false, false],
  difficulty: 1, // 0 relaxed, 1 normal, 2 hard
  dragonDown: false,
  character: '', // chosen hero id ('' = not chosen yet)
  gender: '',
};

function read() {
  try {
    const s = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
    // older saves had 6 worlds; the Dragon's Lair now sits before the Rooftop
    if (s.completed.length === 6) s.completed.splice(5, 0, false);
    return s;
  } catch {
    return { ...DEFAULTS };
  }
}

export const save = read();

export function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    /* private mode / storage blocked: the game still works, just without saving */
  }
}

export function resetSave() {
  Object.assign(save, JSON.parse(JSON.stringify(DEFAULTS)));
  persist();
}

export const isValidEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);

// Display name: letters, spaces, apostrophes, hyphens, dots; 1-16 chars; upper-cased.
export function cleanName(raw) {
  const n = raw.replace(/[^\p{L}\p{M} '.\-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 16);
  return n.toUpperCase();
}
