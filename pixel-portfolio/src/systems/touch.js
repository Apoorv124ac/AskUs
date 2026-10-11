// On-screen touch controls for phones and tablets: left / right, down (pipes), jump, run, and a
// "throw" button for the dragon fight. Plain HTML buttons laid over the game, so several can be
// held at once. They only appear on touch devices (or with ?touch in the address) and only while
// a level is being played.
export const touch = { left: false, right: false, up: false, down: false, run: false, jump: false, fire: false, _jumpEdge: false, _fireEdge: false };
touch.takeJump = () => {
  const e = touch._jumpEdge;
  touch._jumpEdge = false;
  return e;
};
touch.takeFire = () => {
  const e = touch._fireEdge;
  touch._fireEdge = false;
  return e;
};

const isTouchDevice = () =>
  new URLSearchParams(location.search).has('touch') || (window.matchMedia && matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;

let root = null;
let fireBtn = null;
let jumpBtn = null;
let downBtn = null;

const CSS = `
#oq-touch{position:fixed;inset:0;z-index:15;pointer-events:none;display:none;font-family:Silkscreen,monospace;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
#oq-touch button{pointer-events:auto;touch-action:none;-webkit-tap-highlight-color:transparent;position:absolute;border:3px solid rgba(255,255,255,.75);background:rgba(15,15,27,.45);color:#fff;font:700 15px Silkscreen,monospace;border-radius:50%;display:grid;place-items:center;padding:0;margin:0;backdrop-filter:blur(2px)}
#oq-touch button.on{background:rgba(248,216,120,.75);color:#0f0f1b;transform:scale(.94)}
#oq-touch .sq{border-radius:18px}
#oq-touch .pad{pointer-events:auto;touch-action:none;position:absolute;left:max(12px,env(safe-area-inset-left));bottom:max(14px,env(safe-area-inset-bottom));width:210px;height:78px;border-radius:40px;border:3px solid rgba(255,255,255,.7);background:linear-gradient(90deg,rgba(15,15,27,.5),rgba(15,15,27,.28) 50%,rgba(15,15,27,.5))}
#oq-touch .pad::before,#oq-touch .pad::after{position:absolute;top:50%;transform:translateY(-50%);color:rgba(255,255,255,.55);font:700 20px Silkscreen,monospace;pointer-events:none}
#oq-touch .pad::before{content:'\\25C0';left:14px}
#oq-touch .pad::after{content:'\\25B6';right:14px}
#oq-touch .pad .thumb{position:absolute;left:50%;top:50%;width:62px;height:62px;margin:-31px 0 0 -31px;border-radius:50%;background:rgba(248,216,120,.85);border:3px solid #fff;box-shadow:0 2px 0 rgba(0,0,0,.35);pointer-events:none;transition:transform .09s ease-out}
#oq-touch .pad.drag .thumb{transition:none;background:rgba(255,235,160,.95)}
#oq-touch .pad.fast .thumb{background:rgba(255,120,90,.95)}
#oq-touch.plane .pad{width:156px;height:156px;border-radius:50%;background:radial-gradient(circle,rgba(15,15,27,.28),rgba(15,15,27,.5))}
#oq-touch.plane .pad::before{content:'\\25B2';left:50%;top:12px;transform:translateX(-50%)}
#oq-touch.plane .pad::after{content:'\\25BC';right:auto;left:50%;top:auto;bottom:2px;transform:translateX(-50%)}
#oq-touch .d{left:calc(max(12px,env(safe-area-inset-left)) + 8px);bottom:calc(max(14px,env(safe-area-inset-bottom)) + 92px);width:56px;height:56px;font-size:22px}
#oq-touch.plane .d{display:none}
#oq-touch .j{right:max(14px,env(safe-area-inset-right));bottom:max(18px,env(safe-area-inset-bottom));width:92px;height:92px;background:rgba(228,0,43,.55);font-size:16px}
#oq-touch .j.on{background:rgba(255,160,150,.85)}
#oq-touch .run{right:calc(max(14px,env(safe-area-inset-right)) + 104px);bottom:calc(max(18px,env(safe-area-inset-bottom)) + 8px);width:62px;height:62px;font-size:12px}
#oq-touch .fire{right:calc(max(14px,env(safe-area-inset-right)) + 14px);bottom:calc(max(18px,env(safe-area-inset-bottom)) + 104px);width:66px;height:66px;font-size:11px;background:rgba(88,176,248,.55);display:none}
#oq-touch.plane .j,#oq-touch.plane .run{display:none}
#oq-touch.plane .fire{right:max(14px,env(safe-area-inset-right));bottom:max(18px,env(safe-area-inset-bottom));width:92px;height:92px;font-size:14px}
#oq-touch.swim .run{display:none}
#oq-touch.swim .j{background:rgba(88,176,248,.6);font-size:13px}
#oq-touch.swim .d{width:74px;height:74px;font-size:12px;border-radius:50%;background:rgba(88,176,248,.4)}
#oq-touch .pause{right:max(10px,env(safe-area-inset-right));top:max(8px,env(safe-area-inset-top));width:44px;height:44px;font-size:16px;border-radius:12px}
@media (max-height:420px){#oq-touch .pad{width:176px;height:68px}#oq-touch .pad .thumb{width:54px;height:54px;margin:-27px 0 0 -27px}#oq-touch.plane .pad{width:132px;height:132px}#oq-touch .d{bottom:calc(max(14px,env(safe-area-inset-bottom)) + 80px);width:50px;height:50px}#oq-touch .j{width:84px;height:84px}#oq-touch .run{right:calc(max(14px,env(safe-area-inset-right)) + 96px);width:56px;height:56px}}
`;

function bind(btn, key) {
  const down = (e) => {
    e.preventDefault();
    try { btn.setPointerCapture(e.pointerId); } catch { /* not all browsers */ }
    touch[key] = true;
    if (key === 'run') touch._rb = true;
    if (key === 'jump') touch._jumpEdge = true;
    if (key === 'fire') touch._fireEdge = true;
    btn.classList.add('on');
    if (navigator.vibrate) navigator.vibrate(8);
  };
  const up = (e) => {
    e.preventDefault();
    touch[key] = false;
    if (key === 'run') {
      touch._rb = false;
      touch.run = !!touch._sr;
    }
    btn.classList.remove('on');
  };
  btn.addEventListener('pointerdown', down);
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((t) => btn.addEventListener(t, up));
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
}

// the move slider: drag the thumb left / right (push to the far end to run). In the air and
// underwater it becomes a round stick that also moves up and down.
function buildPad() {
  const pad = document.createElement('div');
  pad.className = 'pad';
  pad.setAttribute('aria-label', 'Move');
  const thumb = document.createElement('div');
  thumb.className = 'thumb';
  pad.appendChild(thumb);
  let id = null;
  let last = 0;
  const is2d = () => root.classList.contains('plane');
  const reset = () => {
    id = null;
    touch.left = touch.right = false;
    if (is2d()) touch.up = touch.down = false;
    touch._sr = false;
    touch.run = !!touch._rb;
    thumb.style.transform = '';
    pad.classList.remove('drag', 'fast');
  };
  const move = (e) => {
    const r = pad.getBoundingClientRect();
    const tr = thumb.offsetWidth / 2;
    const mx = Math.max(10, r.width / 2 - tr - 2);
    const my = Math.max(10, r.height / 2 - tr - 2);
    const dx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / mx));
    const dy = is2d() ? Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / my)) : 0;
    const len = Math.hypot(dx, dy);
    const k = len > 1 ? 1 / len : 1;
    thumb.style.transform = `translate(${dx * k * mx}px, ${dy * k * my}px)`;
    touch.left = dx < -0.2;
    touch.right = dx > 0.2;
    touch._sr = !is2d() && Math.abs(dx) > 0.88;
    touch.run = !!touch._rb || touch._sr;
    pad.classList.toggle('fast', touch._sr);
    if (is2d()) {
      touch.up = dy < -0.3;
      touch.down = dy > 0.3;
    }
    const dir = touch.left ? -1 : touch.right ? 1 : 0;
    if (dir !== last && navigator.vibrate) navigator.vibrate(5);
    last = dir;
  };
  pad.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (id !== null) return;
    id = e.pointerId;
    try { pad.setPointerCapture(id); } catch { /* ignore */ }
    pad.classList.add('drag');
    move(e);
  });
  pad.addEventListener('pointermove', (e) => {
    if (e.pointerId === id) {
      e.preventDefault();
      move(e);
    }
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((t) => pad.addEventListener(t, (e) => e.pointerId === id && reset()));
  pad.addEventListener('contextmenu', (e) => e.preventDefault());
  pad.reset = reset;
  root.appendChild(pad);
  return pad;
}

let padEl = null;

function build() {
  if (root) return;
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);
  root = document.createElement('div');
  root.id = 'oq-touch';
  const mk = (cls, label, key, aria) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.textContent = label;
    b.setAttribute('aria-label', aria);
    root.appendChild(b);
    if (key) bind(b, key);
    return b;
  };
  padEl = buildPad();
  downBtn = mk('d', '▼', 'down', 'Down (enter pipe)');
  jumpBtn = mk('j', 'JUMP', 'jump', 'Jump');
  mk('run', 'RUN', 'run', 'Run');
  fireBtn = mk('fire', 'THROW', 'fire', 'Throw pointer arrows');
  const p = mk('pause sq', 'II', null, 'Pause');
  p.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    window.__game?.scene.getScene('UI')?.togglePause();
  });
  document.body.appendChild(root);
  // never leave a button stuck down
  const clear = () => ['left', 'right', 'up', 'down', 'run', 'jump', 'fire'].forEach((k) => (touch[k] = false));
  window.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', clear);
}

// called by the game scene: show while playing, hide elsewhere
export function showTouch(on, { fire = false, plane = false, swim = false } = {}) {
  if (!isTouchDevice()) return;
  build();
  root.style.display = on ? 'block' : 'none';
  root.classList.toggle('plane', plane);
  root.classList.toggle('swim', swim);
  if (padEl) padEl.reset();
  if (jumpBtn) jumpBtn.textContent = swim ? 'SWIM UP' : 'JUMP';
  if (downBtn) downBtn.textContent = swim ? 'DOWN' : '▼';
  if (fireBtn) fireBtn.style.display = on && fire ? 'grid' : 'none';
  if (!on) ['left', 'right', 'up', 'down', 'run', 'jump', 'fire'].forEach((k) => (touch[k] = false));
}
