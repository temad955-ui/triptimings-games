/* Tuk-Tuk Cairo — Trip Timings Games Hub
   Light 3D driving (shared/road3d.js) through busy Cairo streets.
   Drive through a waving passenger 🙋 to pick them up, then reach the 🏁
   drop-off before the timer runs out to earn the fare. Dodge microbuses,
   taxis, donkey carts and potholes. 📯 Horn makes the vehicle ahead move
   over (3 free per run, then rewarded ad early on, or ⭐). */
'use strict';
(() => {
  const hub = window.TTHub, eco = window.TTEco;
  const W = 360, H = 640, LANES = 3, CAM_BACK = 1000;
  const LX = [-0.67, 0, 0.67];
  const SKINS = [
    { id: 'red', icon: '🔴', body: '#d62828', roof: '#ffd23f' },
    { id: 'blue', icon: '🔵', body: '#1f5fd6', roof: '#f5f5f5' },
    { id: 'gold', icon: '🟡', body: '#d4af37', roof: '#1b1240', sku: 'tuktuk-gold', price: '$0.99', stars: 250 },
  ];
  const STR = {
    ar: { title: 'توك توك القاهرة', howto: 'اضغط مطوّل يمين أو شمال الشاشة عشان تلف. عدّي على الزبون اللي بيشاور 🙋 عشان تركّبه، ووصّله لحد 🏁 قبل ما الوقت يخلص وخد الأجرة. اوعى تخبط في الميكروباصات والحُفر!', hint: 'اضغط يمين/شمال للتوجيه · 📯 كلاكس',
      horn: 'كلاكس', red: 'أحمر', blue: 'أزرق', gold: 'ذهبي', locked: '{p} أو {s}⭐', unlockQ: 'افتح التوك توك الذهبي', picked: 'ركب زبون! 🙋 وصّله لـ 🏁', fare: 'أجرة +{n} 💰', lost: 'الزبون نزل… الوقت خلص', noCoins: 'نقاطك ⭐ مش كفاية', hole: 'حفرة! 🕳️', fares: 'زباين', beep: 'بيب بيب! 📯' },
    en: { title: 'Tuk-Tuk Cairo', howto: 'Hold the left or right side to steer. Drive through a waving passenger 🙋 to pick them up, then reach the 🏁 before time runs out to earn the fare. Don’t hit microbuses or potholes!', hint: 'Hold left/right to steer · 📯 horn',
      horn: 'Horn', red: 'Red', blue: 'Blue', gold: 'Gold', locked: '{p} or {s}⭐', unlockQ: 'Unlock the golden tuk-tuk', picked: 'Passenger on! 🙋 Drive to 🏁', fare: 'Fare +{n} 💰', lost: 'Passenger left… too slow', noCoins: 'Not enough ⭐', hole: 'Pothole! 🕳️', fares: 'Fares', beep: 'Beep beep! 📯' },
  };
  const A = TTArcade.create({
    id: 'tuktuk-cairo',
    str: { ar: STR.ar, en: STR.en },
    onStart: reset,
    starsFor: (s) => Math.min(100, Math.floor(s / 150)),
    canContinue: (s) => s < 2500,
    onContinue: () => { G.traffic = G.traffic.filter((c) => c.z < G.z - 200 || c.z > G.z + 2500); G.speed = 1500; G.shield = 2; G.alive = true; loop(); },
  });
  const cv = document.getElementById('board'), ctx = cv.getContext('2d');
  const S = Object.assign({ skin: 'red' }, hub.load('tuktuk.settings', {}));
  const own = (k) => !k.sku || (eco && eco.owns(k.sku));
  const $ = (s) => document.querySelector(s);
  let G = null, road = null, raf = 0, last = 0;

  function picker() {
    const box = $('#pickSkin'); box.innerHTML = '';
    SKINS.forEach((k) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = S.skin === k.id ? 'on' : '';
      b.innerHTML = '<span>🛺</span>' + k.icon + ' ' + A.T(k.id) + (own(k) ? '' : '<small>🔒 ' + A.T('locked', { p: k.price, s: k.stars }) + '</small>');
      b.onclick = () => {
        const pick = () => { S.skin = k.id; hub.store('tuktuk.settings', S); picker(); };
        if (own(k)) return pick();
        if (eco && eco.coins() >= k.stars && eco.spend(k.stars, 'tuktuk-unlock')) { eco.unlock(k.sku); return pick(); }
        eco && eco.purchase({ sku: k.sku, title: A.T('unlockQ'), price: k.price }).then((ok) => { if (ok) pick(); });
      };
      box.appendChild(b);
    });
  }
  document.addEventListener('tt:lang', () => { picker(); tools(); });
  picker();

  // ---------- street ----------
  function makeRoad() {
    const SPR = TTRoad.SPR;
    const colors = ['#c9a27a', '#b5835a', '#e0c9a0', '#9c6b4a', '#d8b48a'];
    const r = TTRoad.create({
      W, H, lanes: LANES,
      theme: { sky: ['#ffb36b', '#ffe3b8'], ground: ['#bfa98a', '#b8a283'], road: ['#4b4650', '#4f4a55'], rumble: ['#d9d2c4', '#a39b8c'], lane: 'rgba(255,255,255,.65)', fog: 'rgba(255,227,184,.55)', sun: '#fff1c4',
        skyline: (c, w, h, sx) => { // minarets and domes on the horizon
          c.fillStyle = '#c98a5a';
          for (let i = 0; i < 6; i++) { const bx = ((i * 70 - sx * 0.05) % (w + 80) + w + 80) % (w + 80) - 40; c.fillRect(bx, h / 2 - 50 - (i % 3) * 8, 6, 50 + (i % 3) * 8); c.beginPath(); c.arc(bx + 26, h / 2 - 16, 18, Math.PI, 0); c.fill(); c.fillRect(bx + 8, h / 2 - 16, 36, 16); }
        } },
      scenery: (s, i) => {
        if (i % 4 === 0) s.scenery.push({ x: -1.6, draw: SPR.building(colors[i % 5], 4 + (i % 4)) }, { x: 1.6, draw: SPR.building(colors[(i + 2) % 5], 3 + (i % 5)) });
        if (i % 8 === 2) s.scenery.push({ x: 1.15, draw: SPR.lamp });
        if (i % 160 === 80) s.scenery.push({ x: -1.15, draw: SPR.sign(hub.lang === 'ar' ? 'تريب تايمنجز' : 'Trip Timings', '#1b7f3a') });
      },
    });
    return r.build(1400, { curvy: 0.7, hilly: 0.3 });
  }

  const fit = () => A.fitCanvas(cv, W, H);
  window.addEventListener('resize', () => { fit(); if (G) draw(); });
  fit();
  function reset() {
    road = makeRoad();
    G = { skin: SKINS.find((k) => k.id === S.skin && own(k)) || SKINS[0], z: 0, x: 0, speed: 0, dist: 0, money: 0, fares: 0, traffic: [], holes: [], rider: null, pax: null, drop: null, alive: true, shield: 0, steer: 0, horns: 3, crash: 0, skyX: 0, slow: 0 };
    A.setScore(0); tools(); nextPassenger(); loop();
  }
  const maxSpeed = () => Math.min(6200, 3600 + G.dist / 600) * (G.slow > 0 ? 0.55 : 1);
  const score = () => Math.floor(G.dist / 200 + G.money);

  function nextPassenger() { const lane = Math.floor(Math.random() * LANES); G.pax = { z: G.z + 6000 + Math.random() * 6000, x: LX[lane] }; }
  function spawn() {
    const want = Math.min(10, 4 + Math.floor(G.dist / 120000));
    if (G.traffic.filter((c) => c.z > G.z).length < want) {
      const z = G.z + 3000 + Math.random() * 5000, lane = Math.floor(Math.random() * LANES);
      if (!G.traffic.some((c) => Math.abs(c.z - z) < 1000 && (c.lane === lane || G.traffic.filter((d) => Math.abs(d.z - z) < 800).length >= LANES - 1))) {
        const r = Math.random();
        const kind = r < 0.3 ? 'micro' : r < 0.55 ? 'taxi' : r < 0.7 ? 'cart' : r < 0.85 ? 'tuk' : 'car';
        const draw = kind === 'micro' ? TTRoad.SPR.micro() : kind === 'taxi' ? TTRoad.SPR.taxi() : kind === 'cart' ? cartSprite : kind === 'tuk' ? tukSprite('#2e8a3a', '#f5f5f5') : TTRoad.SPR.car(['#f5f5f5', '#7ad66b', '#a77bff'][Math.floor(Math.random() * 3)]);
        G.traffic.push({ z, lane, x: LX[lane], tx: LX[lane], speed: kind === 'cart' ? 700 : 1500 + Math.random() * 1500, w: kind === 'micro' ? 0.23 : 0.2, draw });
      }
    }
    if (G.holes.filter((h) => h.z > G.z).length < 2 && Math.random() < 0.01) G.holes.push({ z: G.z + 4000 + Math.random() * 3000, x: LX[Math.floor(Math.random() * LANES)] });
  }
  const keys = { l: 0, r: 0 };
  function update(dt) {
    const top = maxSpeed();
    G.speed += (G.speed < top ? 1600 : -2400) * dt; G.speed = Math.max(0, G.speed);
    G.slow = Math.max(0, G.slow - dt); G.shield = Math.max(0, G.shield - dt);
    const pct = G.speed / 6200;
    const steer = (keys.r ? 1 : 0) - (keys.l ? 1 : 0);
    G.steer += (steer - G.steer) * Math.min(1, dt * 9);
    G.x += G.steer * dt * 1.9; G.x -= road.curveAt(G.z) * pct * pct * dt * 0.3;
    G.skyX += road.curveAt(G.z) * pct * dt * 60;
    if (Math.abs(G.x) > 1) G.speed *= 1 - dt * 2;
    G.x = Math.max(-1.3, Math.min(1.3, G.x));
    G.z += G.speed * dt; G.dist += G.speed * dt;
    spawn();
    for (const c of G.traffic) {
      c.z += c.speed * dt; c.x += (c.tx - c.x) * Math.min(1, dt * 3);
      const dz = c.z - G.z, dx = Math.abs(c.x - G.x);
      if (G.shield <= 0 && dz > -150 && dz < 230 && dx < (c.w + 0.16) / 2 + 0.02) { crash(); return; }
    }
    G.traffic = G.traffic.filter((c) => c.z > G.z - CAM_BACK + 200);
    for (const h of G.holes) if (!h.hit && Math.abs(h.z - G.z) < 120 && Math.abs(h.x - G.x) < 0.2) { h.hit = true; G.slow = 1.2; G.speed *= 0.6; A.toast(A.T('hole')); buzz([30, 20, 30]); }
    G.holes = G.holes.filter((h) => h.z > G.z - CAM_BACK);
    // passenger pickup
    if (G.pax && !G.rider && Math.abs(G.pax.z - G.z) < 200 && Math.abs(G.pax.x - G.x) < 0.3) {
      const dist = 9000 + Math.random() * 9000;
      G.rider = { fare: Math.round(60 + dist / 150), left: 6 + dist / 2600 };
      G.drop = { z: G.z + dist, x: LX[Math.floor(Math.random() * LANES)] };
      G.pax = null; A.toast(A.T('picked')); buzz(15);
    } else if (G.pax && G.pax.z < G.z - 400) nextPassenger(); // missed: another one ahead
    if (G.rider) {
      G.rider.left -= dt;
      if (G.drop && Math.abs(G.drop.z - G.z) < 260 && Math.abs(G.drop.x - G.x) < 0.38) {
        G.money += G.rider.fare; G.fares++; A.toast(A.T('fare', { n: G.rider.fare })); buzz([15, 30, 15]);
        G.rider = null; G.drop = null; nextPassenger();
      } else if (G.rider.left <= 0 || (G.drop && G.drop.z < G.z - 400)) { A.toast(A.T('lost')); G.rider = null; G.drop = null; nextPassenger(); }
    }
    A.setScore(score());
  }
  function crash() { G.alive = false; G.crash = 1; buzz([60, 40, 90]); draw(); setTimeout(() => A.gameOver(score()), 700); }
  function buzz(p) { if (navigator.vibrate) try { navigator.vibrate(p); } catch (e) { /* ignore */ } }

  // ---------- sprites ----------
  function tukSprite(body, roof) {
    return (c, sx, sy, px) => {
      const w = 300 * px, h = 380 * px; if (w < 1) return;
      c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(sx - w * 0.55, sy - h * 0.06, w * 1.1, h * 0.1);
      c.fillStyle = '#111'; c.fillRect(sx - w * 0.5, sy - h * 0.16, w * 0.2, h * 0.16); c.fillRect(sx + w * 0.3, sy - h * 0.16, w * 0.2, h * 0.16);
      c.fillStyle = body; c.fillRect(sx - w * 0.46, sy - h * 0.62, w * 0.92, h * 0.5);
      c.fillStyle = roof; c.fillRect(sx - w / 2, sy - h, w, h * 0.16);
      c.fillStyle = 'rgba(20,20,40,.85)'; c.fillRect(sx - w * 0.36, sy - h * 0.84, w * 0.72, h * 0.24);
      c.fillStyle = '#ff2b4d'; c.fillRect(sx - w * 0.42, sy - h * 0.5, w * 0.12, h * 0.07); c.fillRect(sx + w * 0.3, sy - h * 0.5, w * 0.12, h * 0.07);
    };
  }
  function cartSprite(c, sx, sy, px) { // donkey cart with vegetables
    const w = 300 * px, h = 300 * px; if (w < 1) return;
    c.fillStyle = '#7a4a1e'; c.fillRect(sx - w / 2, sy - h * 0.55, w, h * 0.3);
    c.fillStyle = '#2e8a3a'; c.beginPath(); c.arc(sx - w * 0.2, sy - h * 0.6, w * 0.16, 0, Math.PI * 2); c.arc(sx + w * 0.15, sy - h * 0.62, w * 0.18, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#d62828'; c.beginPath(); c.arc(sx, sy - h * 0.58, w * 0.1, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#3a2a1a'; c.lineWidth = Math.max(1, 20 * px); c.beginPath(); c.arc(sx - w * 0.38, sy - h * 0.18, h * 0.18, 0, Math.PI * 2); c.arc(sx + w * 0.38, sy - h * 0.18, h * 0.18, 0, Math.PI * 2); c.stroke();
  }
  const holeSprite = (c, sx, sy, px) => { c.fillStyle = 'rgba(20,15,10,.85)'; c.beginPath(); c.ellipse(sx, sy, 220 * px, 50 * px, 0, 0, Math.PI * 2); c.fill(); };
  const paxSprite = (c, sx, sy, px) => {
    const h = 520 * px; if (h < 2) return;
    const t = performance.now() / 200;
    c.fillStyle = 'rgba(255,210,63,.35)'; c.beginPath(); c.ellipse(sx, sy, 300 * px, 70 * px, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#1f5fd6'; c.fillRect(sx - 60 * px, sy - h * 0.6, 120 * px, h * 0.6);
    c.fillStyle = '#f2c9a0'; c.beginPath(); c.arc(sx, sy - h * 0.72, 60 * px, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#f2c9a0'; c.lineWidth = Math.max(1, 30 * px); c.beginPath(); c.moveTo(sx + 50 * px, sy - h * 0.55); c.lineTo(sx + 140 * px + Math.sin(t) * 30 * px, sy - h * 0.95); c.stroke();
    if (h > 18) { c.font = Math.round(h * 0.35) + 'px sans-serif'; c.textAlign = 'center'; c.fillText('🙋', sx, sy - h * 1.15); }
  };
  const dropSprite = (c, sx, sy, px) => {
    const w = 900 * px, h = 900 * px; if (w < 2) return;
    c.fillStyle = 'rgba(122,214,107,.35)'; c.beginPath(); c.ellipse(sx, sy, w * 0.4, w * 0.09, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ddd'; c.fillRect(sx - 15 * px, sy - h, 30 * px, h);
    for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) { c.fillStyle = (r + k) % 2 ? '#111' : '#fff'; c.fillRect(sx + k * 70 * px, sy - h + r * 70 * px, 70 * px, 70 * px); }
  };
  function player() {
    const k = G.skin, cx = W / 2 + G.steer * 6, cy = H - 66;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(G.steer * 0.06);
    if (G.shield > 0 && Math.floor(G.shield * 8) % 2) ctx.globalAlpha = 0.45;
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(0, 26, 62, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111'; ctx.fillRect(-56, -2, 22, 28); ctx.fillRect(34, -2, 22, 28);
    ctx.fillStyle = k.body; ctx.beginPath(); ctx.moveTo(-54, 8); ctx.lineTo(-48, -70); ctx.lineTo(48, -70); ctx.lineTo(54, 8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = k.roof; ctx.fillRect(-60, -104, 120, 20);
    ctx.fillStyle = '#333'; ctx.fillRect(-50, -86, 6, 20); ctx.fillRect(44, -86, 6, 20);
    ctx.fillStyle = 'rgba(20,20,40,.9)'; ctx.fillRect(-38, -68, 76, 34);
    if (G.rider) { ctx.fillStyle = '#f2c9a0'; ctx.beginPath(); ctx.arc(-14, -50, 10, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#1f5fd6'; ctx.fillRect(-24, -40, 20, 6); }
    ctx.fillStyle = '#ff2b4d'; ctx.fillRect(-48, -20, 16, 8); ctx.fillRect(32, -20, 16, 8);
    ctx.fillStyle = '#fff'; ctx.font = '800 11px Cairo, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('TUK-TUK', 0, -2);
    ctx.restore();
  }
  function draw() {
    if (!road) return;
    const objects = G.traffic.map((c) => ({ z: c.z, x: c.x, draw: c.draw }))
      .concat(G.holes.map((h) => ({ z: h.z, x: h.x, draw: holeSprite })));
    if (G.pax) objects.push({ z: G.pax.z, x: G.pax.x, draw: paxSprite });
    if (G.drop) objects.push({ z: G.drop.z, x: G.drop.x, draw: dropSprite });
    road.render(ctx, { z: G.z - CAM_BACK, x: G.x, objects, skyX: G.skyX, camH: 0.9 });
    player();
    if (G.crash) { ctx.fillStyle = 'rgba(255,43,77,.35)'; ctx.fillRect(0, 0, W, H); }
    // HUD: fares + rider timer + distance to drop-off
    ctx.fillStyle = 'rgba(7,4,26,.6)'; ctx.fillRect(10, 10, 140, 46);
    ctx.fillStyle = '#fff'; ctx.font = '900 18px Cairo, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('💰 ' + G.money + '  🙋 ' + G.fares, 18, 40);
    if (G.rider) {
      const left = Math.max(0, G.rider.left), m = G.drop ? Math.max(0, Math.round((G.drop.z - G.z) / 100)) : 0;
      ctx.fillStyle = left < 5 ? 'rgba(255,43,77,.8)' : 'rgba(46,196,182,.8)'; ctx.fillRect(W - 150, 10, 140, 46);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; ctx.fillText('⏱ ' + left.toFixed(0) + 's · 🏁 ' + m + 'm', W - 18, 40);
    }
  }
  function loop() {
    cancelAnimationFrame(raf); last = performance.now();
    const f = (t) => { const dt = Math.min(0.05, (t - last) / 1000); last = t; if (G.alive) { update(dt); if (G.alive) draw(); raf = requestAnimationFrame(f); } };
    raf = requestAnimationFrame(f);
  }

  // ---------- input ----------
  const holds = new Map();
  const sync = () => { keys.l = 0; keys.r = 0; holds.forEach((s) => { if (s < 0) keys.l = 1; else keys.r = 1; }); };
  cv.addEventListener('pointerdown', (e) => { e.preventDefault(); const r = cv.getBoundingClientRect(); holds.set(e.pointerId, e.clientX - r.left < r.width / 2 ? -1 : 1); sync(); });
  const up = (e) => { holds.delete(e.pointerId); sync(); };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up); cv.addEventListener('pointerleave', up);
  window.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft' || e.key === 'a') { keys.l = 1; e.preventDefault(); } if (e.key === 'ArrowRight' || e.key === 'd') { keys.r = 1; e.preventDefault(); } if (e.key === ' ') { horn(); e.preventDefault(); } });
  window.addEventListener('keyup', (e) => { if (e.key === 'ArrowLeft' || e.key === 'a') keys.l = 0; if (e.key === 'ArrowRight' || e.key === 'd') keys.r = 0; });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && G && G.alive) loop(); });

  // ---------- horn ----------
  const hornBtn = $('#hornBtn');
  function tools() { hornBtn.querySelector('b').textContent = A.T('horn') + (G && !G.horns ? (score() < 1500 ? ' 🎬' : ' (15⭐)') : ' ×' + (G ? G.horns : 3)); }
  function horn() {
    if (!G || !G.alive) return;
    const go = () => {
      // the nearest vehicle ahead in your lane moves to a free lane
      const ahead = G.traffic.filter((c) => c.z > G.z && c.z < G.z + 4000 && Math.abs(c.x - G.x) < 0.4).sort((a, b) => a.z - b.z)[0];
      if (ahead) { const free = [0, 1, 2].filter((l) => l !== ahead.lane && !G.traffic.some((d) => d !== ahead && d.lane === l && Math.abs(d.z - ahead.z) < 900)); if (free.length) { ahead.lane = free[0]; ahead.tx = LX[free[0]]; } }
      A.toast(A.T('beep')); buzz(20); tools();
    };
    if (G.horns > 0) { G.horns--; go(); return; }
    if (!eco) return go();
    if (score() < 1500) { G.alive = false; eco.rewarded({ id: 'tuktuk-horn', title: A.T('horn') + ' ×3' }).then((ok) => { G.alive = true; loop(); if (ok) { G.horns = 2; go(); } }); }
    else if (eco.spend(15, 'tuktuk-horn')) go(); else eco.toast(A.T('noCoins'));
  }
  hornBtn.addEventListener('click', horn);
  ctx.fillStyle = '#ffb36b'; ctx.fillRect(0, 0, W, H);
  window.TTGame = { get state() { return G; } }; // read-only handle for automated QA
})();
