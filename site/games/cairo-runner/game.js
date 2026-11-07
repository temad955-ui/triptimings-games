/* Cairo Runner — Trip Timings Games Hub
   Light 3D endless runner (shared/road3d.js) through Cairo streets.
   Swipe left/right (or tap the sides) to change lane, swipe up to jump over
   barriers, swipe down to slide under signs. Microbuses block a whole lane.
   Collect coins; speed rises over time. 🧲 Magnet pulls coins in for 10 s
   (rewarded ad early on, ⭐ later). One rewarded continue per run. */
'use strict';
(() => {
  const hub = window.TTHub, eco = window.TTEco;
  const W = 360, H = 640, CAM_BACK = 900;
  const LX = [-0.62, 0, 0.62];
  const STR = {
    ar: { title: 'عدّاء القاهرة', howto: 'اسحب يمين/شمال عشان تغيّر الحارة، لفوق عشان تنط فوق الحواجز، ولتحت عشان تتزحلق تحت اللافتات. اجمع العملات واوعى تخبط في الميكروباص!', hint: 'اسحب ⬅️➡️ للحارة · ⬆️ نط · ⬇️ زحلقة', magnet: 'مغناطيس', noCoins: 'نقاطك ⭐ مش كفاية', faster: 'أسرع! 🔥', coins: 'عملات' },
    en: { title: 'Cairo Runner', howto: 'Swipe left/right to change lane, up to jump over barriers and down to slide under signs. Grab coins and don’t hit the microbus!', hint: 'Swipe ⬅️➡️ lanes · ⬆️ jump · ⬇️ slide', magnet: 'Magnet', noCoins: 'Not enough ⭐', faster: 'Faster! 🔥', coins: 'Coins' },
  };
  const A = TTArcade.create({
    id: 'cairo-runner',
    str: { ar: STR.ar, en: STR.en },
    onStart: reset,
    starsFor: () => Math.min(100, Math.floor(G.coins / 4) + Math.floor(G.dist / 20000)),
    canContinue: (s) => s < 3000,
    onContinue: () => { G.items = G.items.filter((o) => o.kind === 'coin' || o.z > G.z + 2500); G.shield = 2; G.alive = true; loop(); },
  });
  const cv = document.getElementById('board'), ctx = cv.getContext('2d');
  const $ = (s) => document.querySelector(s);
  let G = null, road = null, raf = 0, last = 0;

  function makeRoad() {
    const SPR = TTRoad.SPR;
    const colors = ['#2a1a6b', '#3a1260', '#123b5a', '#4a2a10'];
    const r = TTRoad.create({
      W, H, lanes: 3,
      theme: { sky: ['#1b0f4a', '#ff7a3d'], ground: ['#2a2040', '#2f2447'], road: ['#3b3550', '#403a56'], rumble: ['#ffd23f', '#1b1240'], lane: 'rgba(0,240,255,.6)', edgeGlow: 'rgba(255,43,214,.7)', fog: 'rgba(255,122,61,.35)', sun: '#ffd27a',
        skyline: (c, w, h) => { c.fillStyle = '#1b0f4a'; c.fillRect(w * 0.15, h / 2 - 120, 10, 120); c.beginPath(); c.moveTo(w * 0.15 - 6, h / 2 - 120); c.lineTo(w * 0.15 + 5, h / 2 - 150); c.lineTo(w * 0.15 + 16, h / 2 - 120); c.fill(); for (let i = 0; i < 10; i++) c.fillRect(i * 40 - 10, h / 2 - 30 - (i * 17) % 40, 34, 30 + (i * 17) % 40); } },
      scenery: (s, i) => {
        if (i % 4 === 0) s.scenery.push({ x: -1.5, draw: SPR.building(colors[i % 4], 5 + (i % 4)) }, { x: 1.5, draw: SPR.building(colors[(i + 1) % 4], 4 + (i % 5)) });
        if (i % 6 === 2) s.scenery.push({ x: -1.12, draw: SPR.lamp }, { x: 1.12, draw: SPR.lamp });
      },
    });
    return r.build(1200, { curvy: 0.35, hilly: 0.5 });
  }
  const fit = () => A.fitCanvas(cv, W, H);
  window.addEventListener('resize', () => { fit(); if (G) draw(); });
  fit();

  function reset() {
    road = makeRoad();
    G = { z: 0, lane: 1, x: 0, speed: 2600, dist: 0, coins: 0, items: [], alive: true, shield: 0, jump: 0, slide: 0, crash: 0, magnet: 0, next: 2500, tier: 1, run: 0 };
    A.setScore(0); tools(); loop();
  }
  const score = () => Math.floor(G.dist / 100 + G.coins * 10);
  // a "row" of obstacles every so often; at least one lane is always passable by just running or by a jump/slide
  function spawnRow(z) {
    const lv = Math.min(1, G.dist / 300000);
    const lanes = [0, 1, 2].sort(() => Math.random() - 0.5);
    const blocks = Math.random() < 0.35 + lv * 0.4 ? 2 : 1;
    for (let k = 0; k < blocks; k++) {
      const r = Math.random();
      const kind = r < 0.4 ? 'barrier' : r < 0.7 ? 'sign' : 'bus';
      G.items.push({ z: z + (kind === 'bus' ? 400 : 0), lane: lanes[k], kind });
    }
    // coins in the free lane, sometimes arcing over a barrier
    const free = lanes[blocks];
    for (let c = 0; c < 6; c++) G.items.push({ z: z - 900 + c * 260, lane: free, kind: 'coin' });
  }
  const keys = {};
  function update(dt) {
    G.speed = Math.min(6400, 2600 + G.dist / 140);
    const tier = 1 + Math.floor(G.speed / 1000) - 2;
    if (tier > G.tier) { G.tier = tier; A.toast(A.T('faster')); }
    G.z += G.speed * dt; G.dist += G.speed * dt; G.run += dt * G.speed / 300;
    G.x += (LX[G.lane] - G.x) * Math.min(1, dt * 14);
    G.jump = Math.max(0, G.jump - dt); G.slide = Math.max(0, G.slide - dt);
    G.shield = Math.max(0, G.shield - dt); G.magnet = Math.max(0, G.magnet - dt);
    if (G.z + 6000 > G.next) { spawnRow(G.next + 6000); G.next += Math.max(1600, 3000 - G.dist / 400) + Math.random() * 800; }
    const air = G.jump > 0.12 && G.jump < 0.62, low = G.slide > 0;
    for (const o of G.items) {
      if (o.hit) continue;
      const dz = o.z - G.z, ox = LX[o.lane];
      if (o.kind === 'coin') {
        const near = G.magnet > 0 ? Math.abs(dz) < 1200 : Math.abs(dz) < 140 && Math.abs(ox - G.x) < 0.3;
        if (near && dz > -200) { o.hit = true; G.coins++; }
        continue;
      }
      const len = o.kind === 'bus' ? 900 : 120;
      if (G.shield > 0 || dz > 140 || dz < -len || Math.abs(ox - G.x) > 0.3) continue;
      if (o.kind === 'barrier' && air) continue;
      if (o.kind === 'sign' && low) continue;
      crash(); return;
    }
    G.items = G.items.filter((o) => o.z > G.z - CAM_BACK && !(o.kind === 'coin' && o.hit));
    A.setScore(score());
  }
  function crash() { G.alive = false; G.crash = 1; if (navigator.vibrate) try { navigator.vibrate([60, 40, 90]); } catch (e) { /* ignore */ } draw(); setTimeout(() => A.gameOver(score()), 700); }

  // ---------- sprites ----------
  const coin = (c, sx, sy, px) => { const r = 90 * px; if (r < 1) return; const t = performance.now() / 180; c.fillStyle = '#ffd23f'; c.shadowColor = '#ffd23f'; c.shadowBlur = 10; c.beginPath(); c.ellipse(sx, sy - 260 * px, r * Math.abs(Math.cos(t)) + 1, r, 0, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0; };
  const barrier = (c, sx, sy, px) => { const w = 700 * px, h = 260 * px; if (w < 1) return; c.fillStyle = '#ff2bd6'; c.fillRect(sx - w / 2, sy - h, w, h * 0.5); c.fillStyle = '#fff'; for (let k = 0; k < 4; k++) c.fillRect(sx - w / 2 + k * w / 4 + w / 16, sy - h, w / 10, h * 0.5); c.fillStyle = '#888'; c.fillRect(sx - w * 0.45, sy - h * 0.5, w * 0.06, h * 0.5); c.fillRect(sx + w * 0.39, sy - h * 0.5, w * 0.06, h * 0.5); };
  const sign = (c, sx, sy, px) => { const w = 760 * px, h = 900 * px; if (w < 1) return; c.fillStyle = '#777'; c.fillRect(sx - w / 2, sy - h, w * 0.05, h); c.fillRect(sx + w * 0.45, sy - h, w * 0.05, h); c.fillStyle = '#1b7f3a'; c.fillRect(sx - w / 2, sy - h, w, h * 0.32); if (w > 30) { c.fillStyle = '#fff'; c.font = '800 ' + Math.round(h * 0.12) + 'px Cairo, sans-serif'; c.textAlign = 'center'; c.fillText(hub.lang === 'ar' ? 'القاهرة ⬆' : 'CAIRO ⬆', sx, sy - h * 0.78); } };
  const bus = TTRoad.SPR.micro();
  function runner() {
    const cx = W / 2, cy = H - 70; // the camera follows the runner, so it stays centred
    const t = G.run;
    const jy = G.jump > 0 ? -Math.sin((1 - G.jump / 0.75) * Math.PI) * 90 : 0;
    ctx.save(); ctx.translate(cx, cy + jy);
    if (G.shield > 0 && Math.floor(G.shield * 8) % 2) ctx.globalAlpha = 0.45;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(0, 22 - jy, 34, 8, 0, 0, Math.PI * 2); ctx.fill();
    if (G.slide > 0) { // sliding: low pose
      ctx.fillStyle = '#1f5fd6'; ctx.fillRect(-30, -10, 60, 24); ctx.fillStyle = '#ff2bd6'; ctx.fillRect(-26, -34, 52, 26); ctx.fillStyle = '#f2c9a0'; ctx.beginPath(); ctx.arc(0, -44, 14, 0, Math.PI * 2); ctx.fill();
    } else {
      const a = Math.sin(t) * 10;
      ctx.fillStyle = '#1f5fd6'; ctx.fillRect(-16, -30 + (a > 0 ? 0 : 4), 13, 50 - (a > 0 ? 0 : 6)); ctx.fillRect(3, -30 + (a > 0 ? 4 : 0), 13, 50 - (a > 0 ? 6 : 0));
      ctx.fillStyle = '#ff2bd6'; ctx.fillRect(-22, -80, 44, 54);
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(-18, -76, 36, 12); // backpack strap
      ctx.fillStyle = '#f2c9a0'; ctx.fillRect(-30, -76 + a, 9, 30); ctx.fillRect(21, -76 - a, 9, 30);
      ctx.fillStyle = '#3a1f0c'; ctx.beginPath(); ctx.arc(0, -96, 17, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#00f0ff'; ctx.fillRect(-18, -110, 36, 8); // cap
    }
    ctx.restore();
    if (G.magnet > 0) { ctx.strokeStyle = 'rgba(255,210,63,.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy - 50, 60 + Math.sin(performance.now() / 100) * 6, 0, Math.PI * 2); ctx.stroke(); }
  }
  function draw() {
    if (!road) return;
    const objects = G.items.map((o) => ({ z: o.z, x: LX[o.lane], draw: o.kind === 'coin' ? coin : o.kind === 'barrier' ? barrier : o.kind === 'sign' ? sign : bus }));
    road.render(ctx, { z: G.z - CAM_BACK, x: G.x, objects, camH: 0.7 });
    runner();
    if (G.crash) { ctx.fillStyle = 'rgba(255,43,77,.35)'; ctx.fillRect(0, 0, W, H); }
    ctx.fillStyle = 'rgba(7,4,26,.6)'; ctx.fillRect(10, 10, 110, 40);
    ctx.fillStyle = '#ffd23f'; ctx.font = '900 20px Cairo, sans-serif'; ctx.textAlign = 'left'; ctx.fillText('🪙 ' + G.coins, 18, 38);
  }
  function loop() {
    cancelAnimationFrame(raf); last = performance.now();
    const f = (t) => { const dt = Math.min(0.05, (t - last) / 1000); last = t; if (G.alive) { update(dt); if (G.alive) draw(); raf = requestAnimationFrame(f); } };
    raf = requestAnimationFrame(f);
  }

  // ---------- input ----------
  function act(a) {
    if (!G || !G.alive) return;
    if (a === 'l') G.lane = Math.max(0, G.lane - 1);
    if (a === 'r') G.lane = Math.min(2, G.lane + 1);
    if (a === 'u' && G.jump <= 0) { G.jump = 0.75; G.slide = 0; }
    if (a === 'd' && G.slide <= 0) { G.slide = 0.7; G.jump = 0; }
    if (navigator.vibrate) try { navigator.vibrate(5); } catch (e) { /* ignore */ }
  }
  let sx = 0, sy = 0, done = false;
  cv.addEventListener('pointerdown', (e) => { e.preventDefault(); sx = e.clientX; sy = e.clientY; done = false; });
  cv.addEventListener('pointermove', (e) => {
    if (done || (!e.buttons && e.pointerType === 'mouse')) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 28) return;
    done = true;
    if (Math.abs(dx) > Math.abs(dy)) act(dx > 0 ? 'r' : 'l'); else act(dy < 0 ? 'u' : 'd');
  });
  cv.addEventListener('pointerup', (e) => { if (done) return; const r = cv.getBoundingClientRect(); act(e.clientX - r.left < r.width / 2 ? 'l' : 'r'); });
  window.addEventListener('keydown', (e) => {
    const m = { ArrowLeft: 'l', ArrowRight: 'r', ArrowUp: 'u', ArrowDown: 'd', a: 'l', d: 'r', w: 'u', s: 'd', ' ': 'u' }[e.key];
    if (m && G && G.alive) { e.preventDefault(); act(m); }
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && G && G.alive) loop(); });

  // ---------- magnet ----------
  const btn = $('#magnetBtn');
  function tools() { btn.querySelector('b').textContent = A.T('magnet') + (!G || score() < 1500 ? ' 🎬' : ' (20⭐)'); }
  document.addEventListener('tt:lang', tools);
  btn.addEventListener('click', () => {
    if (!G || !G.alive || G.magnet > 0) return;
    const go = () => { G.magnet = 10; hub.track('booster', { game: 'cairo-runner', id: 'magnet' }); tools(); };
    if (!eco) return go();
    if (score() < 1500) { G.alive = false; eco.rewarded({ id: 'runner-magnet', title: A.T('magnet') }).then((ok) => { G.alive = true; loop(); if (ok) go(); }); }
    else if (eco.spend(20, 'runner-magnet')) go(); else eco.toast(A.T('noCoins'));
  });
  ctx.fillStyle = '#1b0f4a'; ctx.fillRect(0, 0, W, H);
  window.TTGame = { get state() { return G; } }; // read-only handle for automated QA
})();
