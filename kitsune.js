(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /* ---------- лисьи огни ---------- */
  const layer = document.createElement('div');
  layer.className = 'foxfire-layer';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);

  const N = innerWidth < 700 ? 4 : 8;
  for (let i = 0; i < N; i++) {
    const o = document.createElement('span');
    o.className = 'foxfire';
    const s = 12 + Math.random() * 16;
    o.style.cssText =
      `left:${Math.random() * 100}%;top:${25 + Math.random() * 70}%;width:${s}px;height:${s * 1.35}px;` +
      `animation-duration:${9 + Math.random() * 9}s,${1.2 + Math.random()}s;` +
      `animation-delay:${-Math.random() * 12}s,${-Math.random()}s`;
    layer.appendChild(o);
  }

  /* ---------- клик по маске: огни разлетаются ---------- */
  const mask = document.getElementById('mask');
  if (!mask) return;
  mask.addEventListener('click', () => {
    const r = mask.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height * .42;
    for (let i = 0; i < 12; i++) {
      const b = document.createElement('span');
      b.className = 'fire-burst';
      b.style.left = cx + 'px'; b.style.top = cy + 'px';
      document.body.appendChild(b);
      const a = Math.random() * Math.PI * 2, d = 90 + Math.random() * 190;
      const an = b.animate(
        [{ transform: 'translate(0,0) scale(1)', opacity: 1 },
         { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d - 60}px) scale(.2)`, opacity: 0 }],
        { duration: 1100 + Math.random() * 700, easing: 'cubic-bezier(.2,.7,.3,1)' }
      );
      an.onfinish = () => b.remove();
    }
  });
})();
