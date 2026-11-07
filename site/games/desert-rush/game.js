/* Desert Rush — Trip Timings Games Hub
   Three-lane desert racer. Tap the left/right half (or swipe, or arrow keys)
   to change lanes, dodge rocks and barriers, grab ⭐. Speed rises over time
   and obstacles come in tighter waves. */
'use strict';
(() => {
  const W = 360, H = 640, LANES = [75, 180, 285], CAR_Y = 540;
  const A = TTArcade.create({
    id: 'desert-rush',
    str: {
      ar: { title: 'سباق الصحراء', howto: 'اضغط يمين أو شمال الشاشة (أو اسحب) لتغيّر الحارة. اتفادى الصخور والحواجز واجمع النجوم. السرعة بتزيد كل ما تكمل!', hint: 'اضغط يمين/شمال أو اسحب · الأسهم على الكمبيوتر', speed: 'السرعة بتزيد! 🔥', star: '+⭐' },
      en: { title: 'Desert Rush', howto: 'Tap the left or right side (or swipe) to switch lanes. Dodge rocks and barriers and grab stars. It gets faster the longer you last!', hint: 'Tap left/right or swipe · arrow keys on desktop', speed: 'Speed up! 🔥', star: '+⭐' },
    },
    onStart: reset,
    starsFor: () => Math.min(80, Math.floor(G.dist / 400) + G.stars),
    canContinue: (s) => s < 1500,
    onContinue: () => { G.items = G.items.filter((o) => o.y < CAR_Y - 260); G.shield = 2; G.alive = true; loop(); },
  });

  const cv = document.getElementById('board'), ctx = cv.getContext('2d');
  const fit = () => A.fitCanvas(cv, W, H);
  window.addEventListener('resize', () => { fit(); if (G) draw(); });
  fit();

  let G = null, raf = 0, last = 0;
  function reset() {
    G = { lane: 1, x: LANES[1], speed: 300, dist: 0, items: [], gap: 0, stars: 0, alive: true, shield: 0, road: 0, nextTier: 600, crash: 0 };
    A.setScore(0); loop();
  }
  const score = () => Math.floor(G.dist / 10);

  function steer(d) {
    if (!G || !G.alive) return;
    G.lane = Math.max(0, Math.min(2, G.lane + d));
    if (navigator.vibrate) try { navigator.vibrate(5); } catch (e) { /* ignore */ }
  }

  function wave() {
    // never block all three lanes; harder waves block two
    const lv = Math.min(1, G.dist / 25000);
    const blocked = Math.random() < 0.25 + lv * 0.45 ? 2 : 1;
    const lanes = [0, 1, 2].sort(() => Math.random() - 0.5);
    for (let i = 0; i < blocked; i++) G.items.push({ lane: lanes[i], y: -60, kind: Math.random() < 0.5 ? 'rock' : 'bar' });
    if (Math.random() < 0.55) G.items.push({ lane: lanes[2], y: -60 - 90 * Math.random(), kind: 'star' });
    G.gap = Math.max(170, 330 - lv * 160) + Math.random() * 80;
  }

  function update(dt) {
    G.speed = Math.min(780, G.speed + dt * (G.speed < 520 ? 9 : 4));
    const dy = G.speed * dt;
    G.dist += dy; G.road = (G.road + dy) % 80;
    G.x += (LANES[G.lane] - G.x) * Math.min(1, dt * 14);
    G.gap -= dy; if (G.gap <= 0) wave();
    G.shield = Math.max(0, G.shield - dt);
    G.items.forEach((o) => { o.y += dy; });
    for (const o of G.items) {
      if (o.hit) continue;
      const ox = LANES[o.lane];
      if (Math.abs(ox - G.x) < 44 && Math.abs(o.y - CAR_Y) < (o.kind === 'star' ? 50 : 56)) {
        if (o.kind === 'star') { o.hit = true; G.stars++; G.dist += 100; A.toast(A.T('star')); }
        else if (!G.shield) { crash(); return; }
      }
    }
    G.items = G.items.filter((o) => o.y < H + 80 && !(o.kind === 'star' && o.hit));
    if (G.dist > G.nextTier) { G.nextTier *= 2.2; A.toast(A.T('speed')); }
    A.setScore(score());
  }
  function crash() {
    G.alive = false; G.crash = 1;
    if (navigator.vibrate) try { navigator.vibrate([60, 40, 80]); } catch (e) { /* ignore */ }
    draw();
    setTimeout(() => A.gameOver(score()), 650);
  }

  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
  function draw() {
    // sky-less top-down desert: dunes on the sides, neon road in the middle
    const sand = ctx.createLinearGradient(0, 0, W, 0);
    sand.addColorStop(0, '#3a1f0c'); sand.addColorStop(0.12, '#6b3d16'); sand.addColorStop(0.88, '#6b3d16'); sand.addColorStop(1, '#3a1f0c');
    ctx.fillStyle = sand; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#120b26'; ctx.fillRect(25, 0, W - 50, H);
    ctx.strokeStyle = '#ff2bd6'; ctx.lineWidth = 3; ctx.shadowColor = '#ff2bd6'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.moveTo(26, 0); ctx.lineTo(26, H); ctx.moveTo(W - 26, 0); ctx.lineTo(W - 26, H); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(0,240,255,.55)'; ctx.lineWidth = 4; ctx.setLineDash([36, 44]); ctx.lineDashOffset = -(G ? G.road : 0);
    ctx.beginPath(); ctx.moveTo(127, 0); ctx.lineTo(127, H); ctx.moveTo(233, 0); ctx.lineTo(233, H); ctx.stroke(); ctx.setLineDash([]);
    // dune ridges scroll by
    ctx.fillStyle = 'rgba(255,200,120,.12)';
    for (let i = 0; i < 8; i++) { const y = ((i * 97 + (G ? G.road * 1.5 : 0)) % (H + 40)) - 20; ctx.fillRect(4, y, 14, 3); ctx.fillRect(W - 18, (y + 50) % H, 14, 3); }
    if (!G) return;
    for (const o of G.items) {
      const x = LANES[o.lane], y = o.y;
      if (o.kind === 'star') {
        ctx.save(); ctx.translate(x, y); ctx.rotate(G.dist / 200);
        ctx.fillStyle = '#ffd27a'; ctx.shadowColor = '#ffd27a'; ctx.shadowBlur = 16; ctx.beginPath();
        for (let k = 0; k < 10; k++) { const r = k % 2 ? 8 : 18, a = k * Math.PI / 5 - Math.PI / 2; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
        ctx.closePath(); ctx.fill(); ctx.restore();
      } else if (o.kind === 'rock') {
        ctx.fillStyle = '#8a5a2b'; ctx.shadowColor = '#ff8f5a'; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.moveTo(x - 34, y + 22); ctx.lineTo(x - 22, y - 14); ctx.lineTo(x + 2, y - 26); ctx.lineTo(x + 30, y - 6); ctx.lineTo(x + 34, y + 22); ctx.closePath(); ctx.fill();
        ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,220,180,.5)'; ctx.lineWidth = 2; ctx.stroke();
      } else {
        ctx.fillStyle = '#ff2bd6'; ctx.shadowColor = '#ff2bd6'; ctx.shadowBlur = 14; rr(x - 40, y - 12, 80, 24, 6); ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff'; for (let k = -1; k <= 1; k++) { ctx.save(); ctx.translate(x + k * 26, y); ctx.rotate(-0.6); ctx.fillRect(-4, -11, 8, 22); ctx.restore(); }
      }
    }
    ctx.shadowBlur = 0;
    // car
    const cx = G.x, cy = CAR_Y, tilt = (LANES[G.lane] - G.x) / 300;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(tilt);
    if (G.shield > 0 && Math.floor(G.shield * 8) % 2 === 0) ctx.globalAlpha = 0.45;
    ctx.fillStyle = 'rgba(0,240,255,.25)'; ctx.beginPath(); ctx.ellipse(0, 50, 30, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowColor = '#00f0ff'; ctx.shadowBlur = 18; ctx.fillStyle = '#00d0e6'; rr(-24, -42, 48, 84, 14); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#0a0030'; rr(-17, -26, 34, 20, 6); ctx.fill(); rr(-17, 12, 34, 16, 5); ctx.fill();
    ctx.fillStyle = '#fff6b0'; ctx.fillRect(-20, -44, 9, 5); ctx.fillRect(11, -44, 9, 5);
    ctx.fillStyle = '#ff2bd6'; ctx.fillRect(-20, 40, 9, 4); ctx.fillRect(11, 40, 9, 4);
    ctx.restore();
    if (G.crash) { ctx.fillStyle = 'rgba(255,43,214,' + (0.35 * G.crash) + ')'; ctx.fillRect(0, 0, W, H); }
    // HUD speed
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = '800 15px Cairo, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(Math.round(G.speed / 4) + ' km/h  ·  ⭐ ' + G.stars, 36, 26);
  }

  function loop() {
    cancelAnimationFrame(raf); last = performance.now();
    const frame = (t) => {
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      if (G.alive) { update(dt); draw(); raf = requestAnimationFrame(frame); }
    };
    raf = requestAnimationFrame(frame);
  }

  // input: tap halves, swipe, keys
  let sx = 0, sy = 0, swiped = false;
  cv.addEventListener('pointerdown', (e) => { e.preventDefault(); sx = e.clientX; sy = e.clientY; swiped = false; });
  cv.addEventListener('pointermove', (e) => {
    if (swiped || !e.buttons && e.pointerType === 'mouse') return;
    const dx = e.clientX - sx;
    if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(e.clientY - sy)) { steer(dx > 0 ? 1 : -1); swiped = true; }
  });
  cv.addEventListener('pointerup', (e) => {
    if (swiped) return;
    const r = cv.getBoundingClientRect();
    steer(e.clientX - r.left < r.width / 2 ? -1 : 1);
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a') { e.preventDefault(); steer(-1); }
    if (e.key === 'ArrowRight' || e.key === 'd') { e.preventDefault(); steer(1); }
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && G && G.alive) loop(); });
  draw();
})();
