import { EMAIL_ENDPOINT } from '../config.js';

// Sends the visitor's email to your Google Sheet (via Apps Script). No-op if no endpoint is
// configured. A plain GET with the details in the link is the most reliable way to reach Apps Script
// from a web page. Failures are silent: the game must never block on this.
export async function sendEmail({ email, name }) {
  if (!EMAIL_ENDPOINT) return false;
  const q = new URLSearchParams({
    email,
    name,
    device: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
  });
  try {
    await fetch(`${EMAIL_ENDPOINT}?${q}`, { method: 'GET', mode: 'no-cors', cache: 'no-store' });
    return true;
  } catch {
    return false;
  }
}

// Pocket Edition: the final feedback. It rides in the same Google Sheet row format, so the existing
// script stores it without any change: the "Device" column holds "feedback 4/5 | comment".
export async function sendFeedback({ email, name, rating, comment }) {
  if (!EMAIL_ENDPOINT) return false;
  const q = new URLSearchParams({ email: email || '', name: name || '', device: `feedback ${rating}/5 | ${comment || ''}`.slice(0, 480) });
  try {
    await fetch(`${EMAIL_ENDPOINT}?${q}`, { method: 'GET', mode: 'no-cors', cache: 'no-store' });
    return true;
  } catch {
    return false;
  }
}
