/* Scroll indicator for touch devices: a spider lily sliding along a red thread.
   Native scrollbars cannot be styled on phones, so this draws its own for the page scroll.
   Desktop uses the CSS-only scrollbar in style.css, this script does nothing there. */
(() => {
  const mq = matchMedia('(hover: none) and (pointer: coarse)');
  const root = document.documentElement;
  let box = null, thumb = null, hideTimer = 0, dragging = false, dragOffset = 0;

  function build() {
    box = document.createElement('div');
    box.id = 'lily-scroll';
    box.setAttribute('aria-hidden', 'true');
    box.innerHTML = '<div class="lily-thread"></div><div class="lily-thumb"></div>';
    document.body.appendChild(box);
    thumb = box.querySelector('.lily-thumb');
    thumb.addEventListener('pointerdown', onDown);
    thumb.addEventListener('pointermove', onMove);
    thumb.addEventListener('pointerup', onUp);
    thumb.addEventListener('pointercancel', onUp);
  }

  function metrics() {
    const max = Math.max(0, root.scrollHeight - innerHeight);
    const track = box.clientHeight;
    const h = Math.min(track, Math.max(80, track * innerHeight / Math.max(root.scrollHeight, 1)));
    return { max, track, h, range: Math.max(0, track - h) };
  }

  function update() {
    if (!box) return;
    const m = metrics();
    if (m.max <= 2) { box.classList.remove('on'); return; }
    const ratio = Math.min(1, Math.max(0, scrollY / m.max));
    thumb.style.height = m.h + 'px';
    thumb.style.transform = 'translateY(' + (ratio * m.range).toFixed(1) + 'px)';
  }

  function show() {
    if (!box) return;
    const m = metrics();
    if (m.max <= 2) return;
    box.classList.add('on');
    clearTimeout(hideTimer);
    if (!dragging) hideTimer = setTimeout(() => box.classList.remove('on'), 1400);
  }

  function onScroll() { update(); show(); }

  function onDown(e) {
    dragging = true;
    box.classList.add('drag', 'on');
    clearTimeout(hideTimer);
    dragOffset = e.clientY - thumb.getBoundingClientRect().top;
    thumb.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  function onMove(e) {
    if (!dragging) return;
    const m = metrics();
    if (!m.range) return;
    const top = e.clientY - dragOffset - box.getBoundingClientRect().top;
    const ratio = Math.min(1, Math.max(0, top / m.range));
    scrollTo({ top: ratio * m.max, behavior: 'instant' }); // html has smooth scrolling, which would lag the drag
  }

  function onUp(e) {
    if (!dragging) return;
    dragging = false;
    box.classList.remove('drag');
    try { thumb.releasePointerCapture(e.pointerId); } catch {}
    show();
  }

  function enable() {
    if (box) return;
    build();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', update);
    if ('ResizeObserver' in window) new ResizeObserver(update).observe(root);
    update();
  }

  function init() {
    if (mq.matches) enable();
    else mq.addEventListener('change', e => { if (e.matches) enable(); });
  }

  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init);
})();
