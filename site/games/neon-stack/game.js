/* Neon Stack — Trip Timings Games Hub
   Tap to drop the sliding block. Whatever hangs over the edge is cut off,
   a perfect drop keeps the width (3 perfects in a row grow it back).
   The block speeds up with every floor. */
'use strict';
(() => {
  const hub = window.TTHub;
  const W = 360, H = 640, BH = 26, MAXW = 210;
  const A = TTArcade.create({
    id: 'neon-stack',
    str: {
      ar: { title: 'برج النيون', howto: 'اضغط في أي مكان لتُسقط البلوك فوق البرج. الجزء الزائد بيتقص، والإسقاط المثالي بيحافظ على العرض. ابنِ أعلى برج!', hint: 'اضغط أو استخدم المسافة لإسقاط البلوك', perfect: 'مثالي! ×{n}', grow: 'البلوك كبر! ✨' },
      en: { title: 'Neon Stack', howto: 'Tap anywhere to drop the block on the tower. Overhangs are cut off; a perfect drop keeps your width. Build the tallest tower!', hint: 'Tap or press Space to drop', perfect: 'Perfect! ×{n}', grow: 'Block grew! ✨' },
    },
    onStart: reset,
    starsFor: (s) => Math.min(60, Math.floor(s / 5)),
    canContinue: (s) => s < 40,          // easy part of the tower: free continue for an ad
    onContinue: () => { spawn(); G.alive = true; loop(); },
  });

  const cv = document.getElementById('board'), ctx = cv.getContext('2d');
  const fit = () => A.fitCanvas(cv, W, H);
  window.addEventListener('resize', () => { fit(); draw(); });
  fit();

  let G = null, raf = 0, last = 0;
  const STARS = Array.from({ length: 40 }, () => [Math.random(), Math.random()]);
  const hue = (i) => (190 + i * 11) % 360;

  function reset() {
    G = { stack: [{ x: (W - 200) / 2, w: 200 }], cur: null, score: 0, combo: 0, chips: [], cam: 0, alive: true, flash: 0 };
    A.setScore(0);
    spawn(); loop();
  }
  function speed() { const n = G.stack.length; return Math.min(560, 150 + n * 10); }
  function spawn() {
    const top = G.stack[G.stack.length - 1];
    const fromLeft = G.stack.length % 2 === 0;
    G.cur = { x: fromLeft ? -top.w * 0.6 : W - top.w * 0.4, w: top.w, dir: fromLeft ? 1 : -1 };
  }

  function drop() {
    if (!G || !G.alive || !G.cur) return;
    const top = G.stack[G.stack.length - 1], c = G.cur;
    const l = Math.max(c.x, top.x), r = Math.min(c.x + c.w, top.x + top.w);
    const level = G.stack.length;
    if (r - l <= 0) { // missed completely
      G.chips.push({ x: c.x, w: c.w, y: level, vy: 0, h: hue(level) });
      G.cur = null; G.alive = false; buzz([40, 30, 60]);
      setTimeout(() => A.gameOver(G.score), 700);
      return;
    }
    if (Math.abs(c.x - top.x) <= 5) { // perfect
      G.combo++;
      let w = top.w;
      if (G.combo >= 3) { w = Math.min(MAXW, w + 10); A.toast(A.T('grow')); }
      else A.toast(A.T('perfect', { n: G.combo }));
      G.stack.push({ x: top.x - (w - top.w) / 2, w });
      G.score += 2 + G.combo; G.flash = 1; buzz(12);
    } else {
      G.combo = 0;
      if (c.x < l) G.chips.push({ x: c.x, w: l - c.x, y: level, vy: 0, h: hue(level) });
      if (c.x + c.w > r) G.chips.push({ x: r, w: c.x + c.w - r, y: level, vy: 0, h: hue(level) });
      G.stack.push({ x: l, w: r - l });
      G.score += 1; buzz(6);
    }
    A.setScore(G.score);
    spawn();
  }
  function buzz(p) { if (navigator.vibrate) try { navigator.vibrate(p); } catch (e) { /* ignore */ } }

  function update(dt) {
    if (G.cur) {
      G.cur.x += G.cur.dir * speed() * dt;
      const top = G.stack[G.stack.length - 1];
      const minX = -top.w * 0.6, maxX = W - top.w * 0.4;
      if (G.cur.x < minX) { G.cur.x = minX; G.cur.dir = 1; }
      if (G.cur.x > maxX) { G.cur.x = maxX; G.cur.dir = -1; }
    }
    G.chips.forEach((p) => { p.vy += 900 * dt; p.fall = (p.fall || 0) + p.vy * dt; });
    G.chips = G.chips.filter((p) => p.fall < 900);
    const target = Math.max(0, (G.stack.length - 9) * BH);
    G.cam += (target - G.cam) * Math.min(1, dt * 6);
    G.flash = Math.max(0, G.flash - dt * 3);
  }

  const yOf = (level) => H - 90 - level * BH + G.cam;
  function block(x, y, w, h, color, glow) {
    ctx.save();
    ctx.shadowColor = color; ctx.shadowBlur = glow;
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, color); g.addColorStop(1, 'rgba(10,6,40,.9)');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h - 2);
    ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.5; ctx.strokeRect(x + .75, y + .75, w - 1.5, h - 3.5);
    ctx.restore();
  }
  function draw() {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    const h0 = hue(G ? G.stack.length : 0);
    bg.addColorStop(0, 'hsl(' + ((h0 + 60) % 360) + ',60%,10%)'); bg.addColorStop(1, '#07041a');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    // stars drift with the camera
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    for (let i = 0; i < 40; i++) { const sx = STARS[i][0] * W, sy = (STARS[i][1] * H + (G ? G.cam * 0.3 : 0)) % H; ctx.fillRect(sx, sy, 2, 2); }
    if (!G) return;
    ctx.fillStyle = 'rgba(0,240,255,.12)'; ctx.fillRect(0, yOf(-1) + BH, W, H);
    G.stack.forEach((b, i) => { const y = yOf(i); if (y > -BH && y < H) block(b.x, y, b.w, BH, 'hsl(' + hue(i) + ',100%,60%)', i === G.stack.length - 1 ? 18 + G.flash * 20 : 8); });
    G.chips.forEach((p) => { ctx.globalAlpha = Math.max(0, 1 - p.fall / 700); block(p.x, yOf(p.y) + p.fall, p.w, BH, 'hsl(' + p.h + ',100%,60%)', 6); ctx.globalAlpha = 1; });
    if (G.cur) {
      const n = G.stack.length;
      block(G.cur.x, yOf(n), G.cur.w, BH, 'hsl(' + hue(n) + ',100%,62%)', 22);
      // guide line from the top of the tower
      const top = G.stack[n - 1];
      ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.moveTo(top.x, yOf(n)); ctx.lineTo(top.x, yOf(n - 1)); ctx.moveTo(top.x + top.w, yOf(n)); ctx.lineTo(top.x + top.w, yOf(n - 1)); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = '#fff'; ctx.font = '900 54px Cairo, sans-serif'; ctx.textAlign = 'center';
    ctx.shadowColor = '#00f0ff'; ctx.shadowBlur = 16; ctx.fillText(String(G.score), W / 2, 90); ctx.shadowBlur = 0;
  }

  function loop() {
    cancelAnimationFrame(raf); last = performance.now();
    const frame = (t) => {
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      update(dt); draw();
      if (G.alive || G.chips.length) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  }

  cv.addEventListener('pointerdown', (e) => { e.preventDefault(); drop(); });
  window.addEventListener('keydown', (e) => { if (e.code === 'Space' || e.code === 'Enter') { if (G && G.alive) { e.preventDefault(); drop(); } } });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && G && G.alive) loop(); });
  draw();
})();
