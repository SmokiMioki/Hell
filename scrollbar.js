/* Page scrollbar drawn as a burning red rope: charred above the flame (the same flame as the intro), intact below it.
   Native scrollbars cannot be animated (and cannot be styled on phones at all), so the page scroll
   gets this custom element on every device. Lists and modals keep the static native version from style.css.
   If this script fails, the native scrollbar stays, because the hiding class is only added on success. */
(() => {
  const root = document.documentElement;
  const touch = matchMedia('(hover: none) and (pointer: coarse)');
  let box = null, thumb = null, hideTimer = 0, scrollTimer = 0, dragging = false, dragOffset = 0;
  let lastY = scrollY, heat = 0, heatRaf = 0;

  function build() {
    box = document.createElement('div');
    box.id = 'rope-scroll';
    box.setAttribute('aria-hidden', 'true');
    box.innerHTML =
      '<div class="rope-thread"></div>' +
      '<div class="rope-thumb">' +
        '<div class="rope-hot"></div>' +
        '<div class="rope-fw"><svg class="rope-fl" viewBox="0 0 100 160" aria-hidden="true">' +
          '<defs>' +
            '<radialGradient id="rgO" cx="50%" cy="85%" r="75%"><stop offset="0" stop-color="#ff5a3c"/><stop offset="1" stop-color="#8a0c18"/></radialGradient>' +
            '<radialGradient id="rgM" cx="50%" cy="85%" r="75%"><stop offset="0" stop-color="#ffb347"/><stop offset="1" stop-color="#ff5a2a"/></radialGradient>' +
            '<radialGradient id="rgI" cx="50%" cy="85%" r="75%"><stop offset="0" stop-color="#fff7d6"/><stop offset="1" stop-color="#ffd36b"/></radialGradient>' +
          '</defs>' +
          '<path class="f-o" fill="url(#rgO)" d="M50 4C58 34 92 58 88 100C85 134 66 156 50 156C34 156 15 134 12 100C9 66 38 48 50 4Z"/>' +
          '<path class="f-m" fill="url(#rgM)" d="M50 40C56 62 76 78 74 106C72 130 62 146 50 146C38 146 28 130 26 106C24 80 44 66 50 40Z"/>' +
          '<path class="f-i" fill="url(#rgI)" d="M50 84C54 98 64 106 62 122C61 134 56 142 50 142C44 142 39 134 38 122C36 106 46 98 50 84Z"/>' +
        '</svg></div>' +
        '<i class="rope-sp s1"></i><i class="rope-sp s2"></i><i class="rope-sp s3"></i><i class="rope-sp s4"></i><i class="rope-sp s5"></i>' +
      '</div>';
    document.body.appendChild(box);
    thumb = box.querySelector('.rope-thumb');
    box.addEventListener('pointerdown', onDown);
    box.addEventListener('pointermove', onMove);
    box.addEventListener('pointerup', onUp);
    box.addEventListener('pointercancel', onUp);
  }

  function metrics() {
    const max = Math.max(0, root.scrollHeight - innerHeight);
    const track = box.clientHeight;
    const h = Math.min(track, Math.max(80, track * innerHeight / Math.max(root.scrollHeight, 1)));
    return { max, track, h, range: Math.max(0, track - h) };
  }

  function update() {
    const m = metrics();
    if (m.max <= 2) { box.classList.remove('on'); return; }
    const ratio = Math.min(1, Math.max(0, scrollY / m.max));
    const y = (ratio * m.range).toFixed(1);
    thumb.style.height = m.h + 'px';
    thumb.style.transform = 'translateY(' + y + 'px)';
    box.style.setProperty('--burn', y + 'px'); // everything above the flame is burnt
    if (!touch.matches) box.classList.add('on'); // always visible with a mouse
  }

  function show() {
    if (metrics().max <= 2) return;
    box.classList.add('on');
    clearTimeout(hideTimer);
    if (touch.matches && !dragging) hideTimer = setTimeout(() => box.classList.remove('on'), 1400);
  }

  // the flame grows with scroll speed and cools down again
  function cool() {
    heat *= .9;
    if (heat < .01) { heat = 0; heatRaf = 0; }
    box.style.setProperty('--heat', heat.toFixed(3));
    if (heat) heatRaf = requestAnimationFrame(cool);
  }

  function onScroll() {
    const dy = Math.abs(scrollY - lastY);
    lastY = scrollY;
    heat = Math.min(1, Math.max(heat, dy / 40));
    if (!heatRaf) heatRaf = requestAnimationFrame(cool);
    update();
    show();
    box.classList.add('scrolling');
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => box.classList.remove('scrolling'), 220);
  }

  function scrollToThumbTop(clientY) {
    const m = metrics();
    if (!m.range) return;
    const top = clientY - dragOffset - box.getBoundingClientRect().top;
    const ratio = Math.min(1, Math.max(0, top / m.range));
    scrollTo({ top: ratio * m.max, behavior: 'instant' }); // html has smooth scrolling, which would lag the drag
  }

  function onDown(e) {
    if (e.button > 0) return;
    const m = metrics();
    const rect = thumb.getBoundingClientRect();
    // grabbing the flame keeps the grab point, clicking the rope elsewhere centers the flame on the click
    dragOffset = e.target.closest('.rope-thumb') ? e.clientY - rect.top : m.h / 2;
    dragging = true;
    box.classList.add('drag', 'on');
    clearTimeout(hideTimer);
    box.setPointerCapture(e.pointerId);
    scrollToThumbTop(e.clientY);
    e.preventDefault();
  }

  function onMove(e) {
    if (dragging) scrollToThumbTop(e.clientY);
  }

  function onUp(e) {
    if (!dragging) return;
    dragging = false;
    box.classList.remove('drag');
    try { box.releasePointerCapture(e.pointerId); } catch {}
    show();
  }

  function init() {
    build();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', update);
    if ('ResizeObserver' in window) new ResizeObserver(update).observe(root);
    touch.addEventListener('change', () => { box.classList.remove('on'); update(); });
    root.classList.add('rope-on');
    update();
  }

  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init);
})();
