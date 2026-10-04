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

// "sarah.jones92@acme.com" -> "SARAH"
export function nameFromEmail(email) {
  const local = (email.split('@')[0] || '').split(/[^a-zA-Z]+/).find(Boolean) || 'GUEST';
  return local.slice(0, 12).toUpperCase();
}
