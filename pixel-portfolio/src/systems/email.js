import { EMAIL_ENDPOINT } from '../config.js';

// Sends the visitor's email to your Google Sheet (via Apps Script). No-op if no
// endpoint is configured. Failures are silent: the game must never block on this.
export async function sendEmail({ email, name }) {
  if (!EMAIL_ENDPOINT) return false;
  try {
    await fetch(EMAIL_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors', // Apps Script doesn't send CORS headers; we don't need the reply
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        email,
        name,
        device: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      }),
    });
    return true;
  } catch {
    return false;
  }
}
