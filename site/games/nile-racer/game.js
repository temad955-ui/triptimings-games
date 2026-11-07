/* Nile Speed Racing — Trip Timings Games Hub
   Light 3D traffic racer (shared/road3d.js). Pick a vehicle: car, motorbike,
   truck or the premium formula car. Hold the left/right side of the screen
   (or arrow keys) to steer, weave through traffic, pass cars closely for
   bonus points. Speed and traffic grow the longer you last.
   🔥 Nitro: one free per run, then rewarded ad (early) or ⭐. */
'use strict';
(() => {
  const hub = window.TTHub, eco = window.TTEco;
  const W = 360, H = 640, LANES = 4, CAM_BACK = 1000; // the camera sits CAM_BACK behind the player
  const LX = [-0.75, -0.25, 0.25, 0.75];
  const VEH = [
    { id: 'car', icon: '🚗', max: 9000, accel: 2400, grip: 1.0, w: 0.17 },
    { id: 'moto', icon: '🏍️', max: 9600, accel: 2800, grip: 1.25, w: 0.09 },
    { id: 'truck', icon: '🚚', max: 7600, accel: 1700, grip: 0.8, w: 0.22 },
    { id: 'formula', icon: '🏎️', max: 11500, accel: 3400, grip: 1.35, w: 0.16, sku: 'racer-formula', price: '$1.99', stars: 400 },
  ];
  const TRACKS = [
    { id: 'cairo', sky: ['#0b0626', '#3a1260'], ground: ['#14112b', '#191535'], road: ['#2a2740', '#2e2b46'], rumble: ['#ff2bd6', '#f5f5f5'], lane: 'rgba(255,255,255,.75)', edgeGlow: 'rgba(0,240,255,.6)', fog: 'rgba(58,18,96,.55)', sun: null },
    { id: 'desert', sky: ['#ff9a3d', '#ffd9a0'], ground: ['#d9a75a', '#cf9c4f'], road: ['#555158', '#5b575e'], rumble: ['#d62828', '#f5f5f5'], lane: '#f5f5f5', fog: 'rgba(255,217,160,.5)', sun: '#fff3c0' },
    { id: 'coast', sky: ['#2b8fff', '#a8ddff'], ground: ['#e9d8a6', '#e3cf98'], road: ['#4a4a55', '#50505b'], rumble: ['#1f5fd6', '#f5f5f5'], lane: '#f5f5f5', fog: 'rgba(168,221,255,.5)', sun: '#ffffff' },
  ];
  const STR = {
    ar: { title: 'سباق النيل السريع', howto: 'اضغط مطوّل على يمين أو شمال الشاشة (أو الأسهم) عشان تلف. عدّي العربيات من قريب عشان بونص، واوعى تخبط! السرعة والزحمة بيزيدوا مع الوقت.', hint: 'اضغط يمين/شمال للتوجيه · 🔥 للنيترو',
      car: 'عربية', moto: 'موتوسيكل', truck: 'نقل', formula: 'فورمولا', nitro: 'نيترو', near: 'قريبة! +{n}', speedUp: 'السرعة زادت! 🔥', locked: '{p} أو {s}⭐', unlockQ: 'افتح الفورمولا', noCoins: 'نقاطك ⭐ مش كفاية', km: 'كم/س', track: { cairo: 'كورنيش القاهرة ليلًا', desert: 'طريق الصحراء', coast: 'ساحل البحر الأحمر' } },
    en: { title: 'Nile Speed Racing', howto: 'Hold the left or right side of the screen (or arrow keys) to steer. Pass cars closely for a bonus and don’t crash! Speed and traffic grow over time.', hint: 'Hold left/right to steer · 🔥 for nitro',
      car: 'Car', moto: 'Motorbike', truck: 'Truck', formula: 'Formula', nitro: 'Nitro', near: 'Close call! +{n}', speedUp: 'Faster! 🔥', locked: '{p} or {s}⭐', unlockQ: 'Unlock the formula car', noCoins: 'Not enough ⭐', km: 'km/h', track: { cairo: 'Cairo Corniche by night', desert: 'Desert highway', coast: 'Red Sea coast' } },
  };
  const A = TTArcade.create({
    id: 'nile-racer',
    str: { ar: STR.ar, en: STR.en },
    onStart: reset,
    starsFor: (s) => Math.min(120, Math.floor(s / 400)),
    canContinue: (s) => s < 6000,
    onContinue: () => { G.traffic = G.traffic.filter((c) => c.z < G.z - 200 || c.z > G.z + 2500); G.speed = G.v.max * 0.45; G.shield = 2; G.alive = true; loop(); },
  });
  const cv = document.getElementById('board'), ctx = cv.getContext('2d');
  const S = Object.assign({ veh: 'car' }, hub.load('racer.settings', {}));
  const own = (v) => !v.sku || (eco && eco.owns(v.sku));
  let G = null, road = null, raf = 0, last = 0;

  // ---------- vehicle picker ----------
  const $ = (s) => document.querySelector(s);
  function picker() {
    const box = $('#pickCar'); box.innerHTML = '';
    VEH.forEach((v) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = S.veh === v.id ? 'on' : '';
      b.innerHTML = '<span></span>' + A.T(v.id) + (own(v) ? '' : '<small>🔒 ' + A.T('locked', { p: v.price, s: v.stars }) + '</small>');
      b.querySelector('span').textContent = v.icon;
      b.onclick = () => {
        if (own(v)) { S.veh = v.id; hub.store('racer.settings', S); picker(); return; }
        // premium vehicle: stars if you have them, otherwise the in-app purchase
        if (eco && eco.coins() >= v.stars && eco.spend(v.stars, 'racer-unlock')) { eco.unlock(v.sku); S.veh = v.id; hub.store('racer.settings', S); picker(); return; }
        eco && eco.purchase({ sku: v.sku, title: A.T('unlockQ'), price: v.price }).then((ok) => { if (ok) { S.veh = v.id; hub.store('racer.settings', S); picker(); } });
      };
      box.appendChild(b);
    });
  }
  document.addEventListener('tt:lang', () => { picker(); tools(); });
  picker();

  // ---------- track ----------
  function makeRoad(tr) {
    const SPR = TTRoad.SPR;
    const r = TTRoad.create({
      W, H, lanes: LANES, theme: Object.assign({}, tr, {
        skyline: tr.id === 'cairo' ? (c, w, h, sx) => { c.fillStyle = '#1b1240'; for (let i = 0; i < 14; i++) { const bx = ((i * 37 - sx * 0.05) % (w + 60) + w + 60) % (w + 60) - 30, bh = 30 + ((i * 53) % 60); c.fillRect(bx, h / 2 - bh, 26, bh); } c.fillStyle = '#ffd27a'; c.fillRect(w * 0.7, h / 2 - 104, 4, 104); }
          : tr.id === 'desert' ? (c, w, h, sx) => { c.fillStyle = '#c98a4b'; const px = ((w * 0.3 - sx * 0.05) % (w + 200) + w + 200) % (w + 200) - 100; c.beginPath(); c.moveTo(px - 60, h / 2); c.lineTo(px, h / 2 - 50); c.lineTo(px + 60, h / 2); c.fill(); c.beginPath(); c.moveTo(px + 50, h / 2); c.lineTo(px + 90, h / 2 - 34); c.lineTo(px + 130, h / 2); c.fill(); }
          : (c, w, h) => { c.fillStyle = '#1f6fd6'; c.fillRect(0, h / 2 - 14, w, 14); },
      }),
      scenery: (s, i) => {
        if (tr.id === 'cairo') {
          if (i % 6 === 0) s.scenery.push({ x: -1.25, draw: SPR.lamp }, { x: 1.25, draw: SPR.lamp });
          if (i % 9 === 3) s.scenery.push({ x: i % 2 ? -2.4 : 2.4, draw: SPR.building(['#2a1a6b', '#3a1260', '#123b5a'][i % 3], 5 + (i % 5)) });
        } else if (tr.id === 'desert') {
          if (i % 7 === 0) s.scenery.push({ x: i % 2 ? -1.6 : 1.6, draw: SPR.palm });
          if (i % 97 === 50) s.scenery.push({ x: -6, draw: SPR.pyramid });
        } else {
          if (i % 5 === 0) s.scenery.push({ x: 1.5, draw: SPR.palm });
          if (i % 11 === 0) s.scenery.push({ x: -1.5, draw: SPR.palm });
        }
        if (i % 150 === 75) s.scenery.push({ x: 1.35, draw: SPR.sign(hub.lang === 'ar' ? 'تريب تايمنجز' : 'Trip Timings', '#1b7f3a') });
      },
    });
    return r.build(1600, { curvy: 1, hilly: tr.id === 'cairo' ? 0.4 : 1 });
  }

  // ---------- game ----------
  const fit = () => A.fitCanvas(cv, W, H);
  window.addEventListener('resize', () => { fit(); if (G) draw(); });
  fit();
  function reset() {
    const v = VEH.find((x) => x.id === S.veh && own(x)) || VEH[0];
    const tr = TRACKS[Math.floor(Math.random() * TRACKS.length)];
    road = makeRoad(tr);
    G = { v, tr, z: 0, x: 0, speed: 0, dist: 0, bonus: 0, traffic: [], alive: true, shield: 0, steer: 0, nitro: 0, nitroFree: 1, tier: 1, crash: 0, skyX: 0 };
    A.setScore(0); tools();
    A.toast(A.T('track')[tr.id] || '');
    loop();
  }
  const score = () => Math.floor(G.dist / 100 + G.bonus);
  const maxSpeed = () => Math.min(G.v.max * 1.25, G.v.max * (0.75 + G.tier * 0.06)) * (G.nitro > 0 ? 1.35 : 1);
  function spawn() {
    // keep traffic ahead; density rises with tier; never block all four lanes at one spot
    const ahead = G.traffic.filter((c) => c.z > G.z).length;
    const want = Math.min(14, 4 + G.tier * 2);
    if (ahead >= want) return;
    const z = G.z + 3000 + Math.random() * 6000;
    const lane = Math.floor(Math.random() * LANES);
    if (G.traffic.some((c) => Math.abs(c.z - z) < 900 && c.lane === lane)) return;
    const busy = G.traffic.filter((c) => Math.abs(c.z - z) < 700).length;
    if (busy >= LANES - 1) return;
    const r = Math.random();
    const kind = r < 0.2 ? 'taxi' : r < 0.35 ? 'micro' : r < 0.45 ? 'truck' : 'car';
    const color = ['#ff2bd6', '#00c2d6', '#ffd23f', '#7ad66b', '#ff7a3d', '#a77bff', '#f5f5f5'][Math.floor(Math.random() * 7)];
    const draw = kind === 'taxi' ? TTRoad.SPR.taxi() : kind === 'micro' ? TTRoad.SPR.micro() : kind === 'truck' ? TTRoad.SPR.truck() : TTRoad.SPR.car(color);
    G.traffic.push({ z, lane, x: LX[lane], speed: 2400 + Math.random() * 2200, w: kind === 'micro' || kind === 'truck' ? 0.24 : 0.19, draw, passed: false });
  }
  let keys = { l: 0, r: 0 };
  function update(dt) {
    const v = G.v, top = maxSpeed();
    G.speed += (G.speed < top ? v.accel : -v.accel * 1.5) * dt;
    G.speed = Math.max(0, Math.min(G.speed, top * 1.02));
    G.nitro = Math.max(0, G.nitro - dt); G.shield = Math.max(0, G.shield - dt);
    const pct = G.speed / v.max;
    // steering + curve pull
    const steer = (keys.r ? 1 : 0) - (keys.l ? 1 : 0);
    G.steer += (steer - G.steer) * Math.min(1, dt * 10);
    G.x += G.steer * dt * 1.9 * v.grip * Math.max(0.35, pct);
    G.x -= road.curveAt(G.z) * pct * pct * dt * 0.42;
    G.skyX += road.curveAt(G.z) * pct * dt * 60;
    if (Math.abs(G.x) > 1.05) { G.speed *= 1 - dt * 2.2; } // off-road: slow down
    G.x = Math.max(-1.6, Math.min(1.6, G.x));
    G.z += G.speed * dt; G.dist += G.speed * dt;
    // tiers: every ~ 2.5 km a bit faster with more traffic
    const tier = 1 + Math.floor(G.dist / 250000);
    if (tier > G.tier) { G.tier = tier; A.toast(A.T('speedUp')); }
    spawn();
    for (const c of G.traffic) {
      c.z += c.speed * dt;
      const dz = c.z - G.z, dx = Math.abs(c.x - G.x);
      const hitW = (c.w + v.w) / 2 + 0.02;
      if (G.shield <= 0 && dz > -150 && dz < 230 && dx < hitW) { crash(); return; }
      if (!c.passed && dz < -150) {
        c.passed = true;
        if (dx < hitW + 0.16) { const n = Math.round(30 + pct * 40); G.bonus += n; A.toast(A.T('near', { n })); buzz(10); }
        else G.bonus += 5;
      }
    }
    G.traffic = G.traffic.filter((c) => c.z > G.z - CAM_BACK + 200);
    A.setScore(score());
  }
  function crash() {
    G.alive = false; G.crash = 1; buzz([60, 40, 90]); draw();
    setTimeout(() => A.gameOver(score()), 700);
  }
  function buzz(p) { if (navigator.vibrate) try { navigator.vibrate(p); } catch (e) { /* ignore */ } }

  // ---------- player sprites (rear view, screen space) ----------
  function player() {
    const v = G.v, cx = W / 2 + (G.steer * 6), cy = H - 70, tilt = G.steer * 0.08;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(v.id === 'moto' ? G.steer * 0.35 : tilt);
    if (G.shield > 0 && Math.floor(G.shield * 8) % 2) ctx.globalAlpha = 0.45;
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(0, 26, v.id === 'moto' ? 26 : 70, 10, 0, 0, Math.PI * 2); ctx.fill();
    if (v.id === 'moto') {
      ctx.fillStyle = '#111'; ctx.fillRect(-9, -6, 18, 34);
      ctx.fillStyle = '#00d0e6'; ctx.fillRect(-16, -30, 32, 30);
      ctx.fillStyle = '#ff2b4d'; ctx.fillRect(-12, -4, 24, 5);
      ctx.fillStyle = '#2a1a6b'; ctx.fillRect(-18, -62, 36, 34); // rider
      ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(0, -72, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#111'; ctx.fillRect(-12, -76, 24, 8);
    } else if (v.id === 'formula') {
      ctx.fillStyle = '#111'; ctx.fillRect(-64, -10, 26, 34); ctx.fillRect(38, -10, 26, 34);
      ctx.fillStyle = '#ff2b4d'; ctx.beginPath(); ctx.moveTo(-36, 16); ctx.lineTo(-22, -30); ctx.lineTo(22, -30); ctx.lineTo(36, 16); ctx.fill();
      ctx.fillStyle = '#ff2b4d'; ctx.fillRect(-58, -48, 116, 12); ctx.fillStyle = '#fff'; ctx.fillRect(-58, -40, 116, 3);
      ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(0, -34, 11, 0, Math.PI * 2); ctx.fill();
      if (G.nitro > 0) { ctx.fillStyle = '#00f0ff'; ctx.shadowColor = '#00f0ff'; ctx.shadowBlur = 20; ctx.beginPath(); ctx.ellipse(0, 22, 8, 18 + Math.random() * 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; }
    } else {
      const big = v.id === 'truck';
      const bw = big ? 150 : 120, bh = big ? 150 : 86;
      ctx.fillStyle = '#111'; ctx.fillRect(-bw / 2 + 4, 6, 26, 20); ctx.fillRect(bw / 2 - 30, 6, 26, 20);
      ctx.fillStyle = big ? '#c49a52' : '#00d0e6'; ctx.fillRect(-bw / 2, -bh * 0.55, bw, bh * 0.75);
      ctx.fillStyle = big ? '#8a6a32' : '#00a8bd'; ctx.fillRect(-bw * 0.4, -bh, bw * 0.8, bh * 0.48);
      ctx.fillStyle = 'rgba(10,20,60,.9)'; ctx.fillRect(-bw * 0.34, -bh * 0.94, bw * 0.68, bh * 0.32);
      ctx.fillStyle = '#ff2b4d'; ctx.shadowColor = '#ff2b4d'; ctx.shadowBlur = 10; ctx.fillRect(-bw / 2 + 6, -bh * 0.4, 22, 9); ctx.fillRect(bw / 2 - 28, -bh * 0.4, 22, 9); ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(-18, -bh * 0.15, 36, 10);
      if (G.nitro > 0) { ctx.fillStyle = '#00f0ff'; ctx.shadowColor = '#00f0ff'; ctx.shadowBlur = 20; ctx.beginPath(); ctx.ellipse(-30, 24, 6, 14 + Math.random() * 8, 0, 0, Math.PI * 2); ctx.ellipse(30, 24, 6, 14 + Math.random() * 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; }
    }
    ctx.restore();
  }
  function draw() {
    if (!road) { ctx.fillStyle = '#0b0626'; ctx.fillRect(0, 0, W, H); return; }
    const objects = G.traffic.map((c) => ({ z: c.z, x: c.x, draw: c.draw }));
    road.render(ctx, { z: G.z - CAM_BACK, x: G.x, objects, skyX: G.skyX, camH: G.v.id === 'truck' ? 1.25 : G.v.id === 'formula' ? 0.75 : 1 });
    player();
    // speed lines with nitro
    if (G.nitro > 0) { ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; for (let k = 0; k < 10; k++) { const a = Math.random() * Math.PI * 2, r = 120 + Math.random() * 200; ctx.beginPath(); ctx.moveTo(W / 2 + Math.cos(a) * r, H / 2 + Math.sin(a) * r); ctx.lineTo(W / 2 + Math.cos(a) * (r + 60), H / 2 + Math.sin(a) * (r + 60)); ctx.stroke(); } }
    if (G.crash) { ctx.fillStyle = 'rgba(255,43,77,.35)'; ctx.fillRect(0, 0, W, H); }
    // HUD speedo
    ctx.fillStyle = 'rgba(7,4,26,.6)'; ctx.fillRect(10, 10, 120, 46);
    ctx.fillStyle = '#fff'; ctx.font = '900 26px Cairo, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(String(Math.round(G.speed / 50)), 18, 42);
    ctx.font = '700 12px Cairo, sans-serif'; ctx.fillStyle = '#00f0ff'; ctx.fillText(A.T('km'), 78, 42);
  }
  function loop() {
    cancelAnimationFrame(raf); last = performance.now();
    const f = (t) => {
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      if (G.alive) { update(dt); if (G.alive) draw(); raf = requestAnimationFrame(f); }
    };
    raf = requestAnimationFrame(f);
  }

  // ---------- input: hold halves / keys ----------
  const holds = new Map();
  function sync() { keys.l = 0; keys.r = 0; holds.forEach((side) => { if (side < 0) keys.l = 1; else keys.r = 1; }); }
  cv.addEventListener('pointerdown', (e) => { e.preventDefault(); const r = cv.getBoundingClientRect(); holds.set(e.pointerId, e.clientX - r.left < r.width / 2 ? -1 : 1); sync(); });
  const up = (e) => { holds.delete(e.pointerId); sync(); };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up); cv.addEventListener('pointerleave', up);
  window.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft' || e.key === 'a') { keys.l = 1; e.preventDefault(); } if (e.key === 'ArrowRight' || e.key === 'd') { keys.r = 1; e.preventDefault(); } if (e.key === ' ') { nitro(); e.preventDefault(); } });
  window.addEventListener('keyup', (e) => { if (e.key === 'ArrowLeft' || e.key === 'a') keys.l = 0; if (e.key === 'ArrowRight' || e.key === 'd') keys.r = 0; });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && G && G.alive) loop(); });

  // ---------- nitro ----------
  const nitroBtn = $('#nitroBtn');
  function tools() {
    const free = G ? G.nitroFree : 1;
    nitroBtn.querySelector('b').textContent = A.T('nitro') + (free ? ' ×' + free : (G && score() < 3000 ? ' 🎬' : ' (25⭐)'));
  }
  function nitro() {
    if (!G || !G.alive || G.nitro > 0) return;
    const go = () => { G.nitro = 3; G.shield = Math.max(G.shield, 0.5); hub.track('booster', { game: 'nile-racer', id: 'nitro' }); tools(); };
    if (G.nitroFree > 0) { G.nitroFree--; go(); return; }
    if (!eco) return go();
    if (score() < 3000) { G.alive = false; eco.rewarded({ id: 'racer-nitro', title: A.T('nitro') }).then((ok) => { G.alive = true; loop(); if (ok) go(); }); }
    else if (eco.spend(25, 'racer-nitro')) go(); else eco.toast(A.T('noCoins'));
  }
  nitroBtn.addEventListener('click', nitro);
  ctx.fillStyle = '#0b0626'; ctx.fillRect(0, 0, W, H);
  window.TTGame = { get state() { return G; } }; // read-only handle for automated QA
})();
