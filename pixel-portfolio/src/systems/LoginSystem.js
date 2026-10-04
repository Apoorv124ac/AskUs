/** Pure helpers for the login desk (no Phaser, unit-tested in tests/run.mjs). */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** @returns {{ok:true,value:string}|{ok:false}} */
export function validateEmail(raw) {
  const value = String(raw ?? '').trim();
  if (value.length < 6 || value.length > 254 || !EMAIL_RE.test(value)) return { ok: false };
  const [local, domain] = value.split('@');
  if (local.length > 64 || domain.startsWith('.') || domain.includes('..')) return { ok: false };
  return { ok: true, value };
}

/**
 * Optionally POST the e-mail to the configured endpoint. Never throws and never blocks the game:
 * resolves true/false. With no endpoint nothing leaves the device.
 */
export async function submitEmail(endpoint, email, { fetchImpl = globalThis.fetch, timeoutMs = 4000 } = {}) {
  if (!endpoint || !fetchImpl) return false;
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl && setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, source: 'office-quest', at: new Date().toISOString() }),
      keepalive: true,
      signal: ctrl?.signal,
    });
    return !!res.ok;
  } catch { return false; } finally { if (timer) clearTimeout(timer); }
}
