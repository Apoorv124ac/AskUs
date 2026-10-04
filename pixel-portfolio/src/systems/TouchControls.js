/** Wires the DOM touch buttons (see index.html) into the InputSystem. */
export function setupTouchControls(input) {
  const forced = new URLSearchParams(location.search).has('touch');
  const isTouch = forced || window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  if (!isTouch) return false;
  document.body.classList.add('touch');

  document.querySelectorAll('#touch button').forEach((btn) => {
    const action = btn.dataset.a, also = btn.dataset.also;
    const press = (e) => { e.preventDefault(); btn.classList.add('on'); input.setVirtual(action, true); if (also) input.setVirtual(also, true); };
    const release = (e) => { e.preventDefault(); btn.classList.remove('on'); input.setVirtual(action, false); if (also) input.setVirtual(also, false); };
    btn.addEventListener('pointerdown', press);
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('pointerleave', release);
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  });
  return true;
}
