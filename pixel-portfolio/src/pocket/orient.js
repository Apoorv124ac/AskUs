// Phones: a "turn your phone" prompt in portrait, a rotate / full-screen button, and a tip for iPhones.
const isTouch = () => new URLSearchParams(location.search).has('touch') || (window.matchMedia && matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;

const CSS = `
#oq-rotate{position:fixed;inset:0;z-index:40;background:rgba(15,15,27,.94);color:#fcfcfc;display:none;flex-direction:column;align-items:center;justify-content:center;gap:16px;text-align:center;padding:24px;font:700 14px Silkscreen,monospace;line-height:1.5}
#oq-rotate h2{margin:0;font:400 15px "Press Start 2P",monospace;color:#f8d878;line-height:1.5}
#oq-rotate .phone{width:46px;height:78px;border:4px solid #fcfcfc;border-radius:8px;position:relative;animation:oqturn 2.4s ease-in-out infinite}
#oq-rotate .phone::after{content:"";position:absolute;left:50%;bottom:5px;width:14px;height:3px;background:#fcfcfc;transform:translateX(-50%)}
@keyframes oqturn{0%,25%{transform:rotate(0)}60%,100%{transform:rotate(-90deg)}}
#oq-rotate button,#oq-fs{font:700 14px Silkscreen,monospace;color:#fcfcfc;background:#c83010;border:3px solid #fcfcfc;border-radius:10px;padding:12px 18px;min-width:220px;touch-action:manipulation}
#oq-rotate button.alt{background:#1c2250}
#oq-rotate small{color:#bcbcbc;max-width:300px}
#oq-fs{position:fixed;left:max(6px,env(safe-area-inset-left));top:46px;z-index:16;display:none;min-width:0;width:40px;height:40px;padding:0;font-size:18px;background:rgba(15,15,27,.5);opacity:.85}
`;

let dismissed = false;
let overlay = null;
let fsBtn = null;

async function goFull() {
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  try {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      return true;
    }
    if (req) await req.call(el);
    if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape');
    return !!req;
  } catch {
    return false;
  }
}

function update() {
  if (!overlay) return;
  const portrait = window.innerHeight > window.innerWidth;
  overlay.style.display = portrait && !dismissed ? 'flex' : 'none';
  if (!portrait) dismissed = false; // ask again next time they hold it upright
}

export function initOrient() {
  if (!isTouch()) return;
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);

  overlay = document.createElement('div');
  overlay.id = 'oq-rotate';
  overlay.innerHTML = '<div class="phone"></div><h2>TURN YOUR PHONE</h2><div>Sideways gives the best view and the controls fit under your thumbs.</div>';
  const b1 = document.createElement('button');
  b1.type = 'button';
  b1.textContent = 'ROTATE + FULLSCREEN';
  const hint = document.createElement('small');
  hint.textContent = 'Unlock rotation in your phone settings if it does not turn.';
  b1.addEventListener('click', async () => {
    const ok = await goFull();
    if (!ok) hint.textContent = 'On iPhone: tap Share, then "Add to Home Screen" for a full-screen game. Then turn your phone sideways.';
  });
  const b2 = document.createElement('button');
  b2.type = 'button';
  b2.className = 'alt';
  b2.textContent = 'PLAY ANYWAY';
  b2.addEventListener('click', () => {
    dismissed = true;
    update();
  });
  overlay.append(b1, b2, hint);
  document.body.appendChild(overlay);

  fsBtn = document.createElement('button');
  fsBtn.id = 'oq-fs';
  fsBtn.type = 'button';
  fsBtn.setAttribute('aria-label', 'Rotate screen and full screen');
  fsBtn.textContent = '⛶';
  fsBtn.style.display = 'block';
  fsBtn.addEventListener('click', goFull);
  document.body.appendChild(fsBtn);

  window.addEventListener('resize', update);
  window.addEventListener('orientationchange', () => setTimeout(update, 200));
  update();
}
