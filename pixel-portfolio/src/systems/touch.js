// On-screen touch controls for phones and tablets: left / right, down (pipes), jump, run, and a
// "throw" button for the dragon fight. Plain HTML buttons laid over the game, so several can be
// held at once. They only appear on touch devices (or with ?touch in the address) and only while
// a level is being played.
export const touch = { left: false, right: false, down: false, run: false, jump: false, fire: false, _jumpEdge: false, _fireEdge: false };
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

const CSS = `
#oq-touch{position:fixed;inset:0;z-index:15;pointer-events:none;display:none;font-family:Silkscreen,monospace;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
#oq-touch button{pointer-events:auto;touch-action:none;-webkit-tap-highlight-color:transparent;position:absolute;border:3px solid rgba(255,255,255,.75);background:rgba(15,15,27,.45);color:#fff;font:700 15px Silkscreen,monospace;border-radius:50%;display:grid;place-items:center;padding:0;margin:0;backdrop-filter:blur(2px)}
#oq-touch button.on{background:rgba(248,216,120,.75);color:#0f0f1b;transform:scale(.94)}
#oq-touch .sq{border-radius:18px}
#oq-touch .l{left:max(12px,env(safe-area-inset-left));bottom:max(16px,env(safe-area-inset-bottom));width:74px;height:74px;font-size:30px}
#oq-touch .r{left:calc(max(12px,env(safe-area-inset-left)) + 86px);bottom:max(16px,env(safe-area-inset-bottom));width:74px;height:74px;font-size:30px}
#oq-touch .d{left:calc(max(12px,env(safe-area-inset-left)) + 43px);bottom:calc(max(16px,env(safe-area-inset-bottom)) + 84px);width:54px;height:54px;font-size:22px}
#oq-touch .j{right:max(14px,env(safe-area-inset-right));bottom:max(18px,env(safe-area-inset-bottom));width:92px;height:92px;background:rgba(228,0,43,.55);font-size:16px}
#oq-touch .j.on{background:rgba(255,160,150,.85)}
#oq-touch .run{right:calc(max(14px,env(safe-area-inset-right)) + 104px);bottom:calc(max(18px,env(safe-area-inset-bottom)) + 8px);width:62px;height:62px;font-size:12px}
#oq-touch .fire{right:calc(max(14px,env(safe-area-inset-right)) + 14px);bottom:calc(max(18px,env(safe-area-inset-bottom)) + 104px);width:66px;height:66px;font-size:11px;background:rgba(88,176,248,.55);display:none}
#oq-touch .pause{right:max(10px,env(safe-area-inset-right));top:max(8px,env(safe-area-inset-top));width:44px;height:44px;font-size:16px;border-radius:12px}
@media (max-height:420px){#oq-touch .l,#oq-touch .r{width:62px;height:62px}#oq-touch .r{left:calc(max(12px,env(safe-area-inset-left)) + 72px)}#oq-touch .j{width:78px;height:78px}#oq-touch .run{right:calc(max(14px,env(safe-area-inset-right)) + 90px);width:54px;height:54px}}
`;

function bind(btn, key) {
  const down = (e) => {
    e.preventDefault();
    try { btn.setPointerCapture(e.pointerId); } catch { /* not all browsers */ }
    touch[key] = true;
    if (key === 'jump') touch._jumpEdge = true;
    if (key === 'fire') touch._fireEdge = true;
    btn.classList.add('on');
    if (navigator.vibrate) navigator.vibrate(8);
  };
  const up = (e) => {
    e.preventDefault();
    touch[key] = false;
    btn.classList.remove('on');
  };
  btn.addEventListener('pointerdown', down);
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((t) => btn.addEventListener(t, up));
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
}

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
  mk('l', '◀', 'left', 'Move left');
  mk('r', '▶', 'right', 'Move right');
  mk('d', '▼', 'down', 'Down (enter pipe)');
  mk('j', 'JUMP', 'jump', 'Jump');
  mk('run', 'RUN', 'run', 'Run');
  fireBtn = mk('fire', 'THROW', 'fire', 'Throw pointer arrows');
  const p = mk('pause sq', 'II', null, 'Pause');
  p.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    window.__game?.scene.getScene('UI')?.togglePause();
  });
  document.body.appendChild(root);
  // never leave a button stuck down
  const clear = () => ['left', 'right', 'down', 'run', 'jump', 'fire'].forEach((k) => (touch[k] = false));
  window.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', clear);
}

// called by the game scene: show while playing, hide elsewhere
export function showTouch(on, { fire = false } = {}) {
  if (!isTouchDevice()) return;
  build();
  root.style.display = on ? 'block' : 'none';
  if (fireBtn) fireBtn.style.display = on && fire ? 'grid' : 'none';
  if (!on) ['left', 'right', 'down', 'run', 'jump', 'fire'].forEach((k) => (touch[k] = false));
}
