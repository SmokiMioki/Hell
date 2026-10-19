.hero-core{position:relative;z-index:2}

/* ---------- место под твой PNG (раскомментируй <img class="hero-art"> в index.html) ---------- */
.hero-art{
  position:absolute;left:clamp(14px,7vw,110px);top:18vh;width:clamp(120px,18vw,260px);height:auto;
  pointer-events:none;z-index:1;transition:opacity .6s;
  filter:drop-shadow(0 0 24px rgba(242,58,82,.35));
}
.intro-on .hero-art{opacity:0}

/* ---------- лисьи огни (кицунэ-би) ---------- */
.foxfire-layer{position:fixed;inset:0;z-index:1;pointer-events:none;overflow:hidden}
.foxfire{
  position:absolute;border-radius:50% 50% 50% 50% / 68% 68% 32% 32%;
  background:radial-gradient(ellipse at 50% 70%,#e6f7ff 0,#8fd0ff 35%,rgba(90,150,255,.35) 65%,transparent 80%);
  box-shadow:0 0 18px 4px rgba(120,190,255,.45);
  opacity:.75;
  animation:fdrift 12s ease-in-out infinite alternate, fflick 1.6s ease-in-out infinite alternate;
}
@keyframes fdrift{
  0%{transform:translate(0,0)}
  33%{transform:translate(40px,-60px)}
  66%{transform:translate(-30px,-110px)}
  100%{transform:translate(25px,-170px)}
}
@keyframes fflick{from{opacity:.35;scale:.85}to{opacity:.9;scale:1.1}}
[data-theme="light"] .foxfire{
  background:radial-gradient(ellipse at 50% 70%,#cfe8ff 0,#5f9bf0 40%,rgba(60,110,220,.3) 65%,transparent 80%);
  box-shadow:0 0 14px 3px rgba(80,140,230,.4);opacity:.6;
}

/* ---------- тории-разделители ---------- */
.guide::before,.about::before{
  content:"";display:block;width:60px;height:44px;margin:0 auto 44px;opacity:.85;
  background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 44'%3E%3Cpath d='M2 8Q30 2 58 8L56 14Q30 9 4 14Z M10 18H50V23H10Z M14 14V42H20V14Z M40 14V42H46V14Z' fill='%23f23a52'/%3E%3C/svg%3E") center/contain no-repeat;
  filter:drop-shadow(0 0 8px rgba(242,58,82,.6));
}
.about::before{margin-left:0}

.fox-note{color:var(--ash);font-style:italic}
.fox-note b{color:#8fd0ff;font-weight:400;text-shadow:0 0 10px rgba(120,190,255,.7)}
[data-theme="light"] .fox-note b{color:#3d74c9;text-shadow:none}

@media (max-width:900px){
  .hero-art{width:90px;top:11vh;left:12px;opacity:.6}
}
@media (prefers-reduced-motion:reduce){
  .foxfire-layer{display:none}
}
