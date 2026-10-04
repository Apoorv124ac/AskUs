// Progress + login stored in the visitor's own browser (localStorage).
const KEY = 'officeQuest.save.v1';

const DEFAULTS = {
  email: '',
  name: '',
  emailSent: '',
  completed: [false, false, false, false, false, false],
  recruiter: false,
  coins: 0,
  xp: 0,
  level: 0,
  collected: [],
  lastWorld: 0,
  storySeen: false,
  degrees: [false, false, false, false],
  floors: [false, false, false, false, false],
};

function read() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
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
