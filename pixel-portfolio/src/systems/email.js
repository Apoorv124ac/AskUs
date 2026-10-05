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
