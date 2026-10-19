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
})();
