/* Cairo Parking Jam — Trip Timings Games Hub
   A packed garage of taxis, microbuses and tuk-tuks. Swipe a vehicle forward
   or back along its lane (tap = drive forward); it leaves the garage only if
   nothing is in the way. Every try uses a move. Levels are generated
   backwards from an empty garage, so every level has a solution. */
'use strict';
(() => {
  const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // up, right, down, left
  const KINDS = [
    { len: 1, body: '#ffd23f', roof: '#e63946', name: 'tuk' },   // tuk-tuk
    { len: 2, body: '#16161d', roof: '#f5f5f5', name: 'taxi' },  // Cairo black & white taxi
    { len: 2, body: '#00c2d6', roof: '#e8fbff', name: 'car' },
    { len: 2, body: '#ff2bd6', roof: '#ffe3f8', name: 'car' },
    { len: 2, body: '#7ad66b', roof: '#eaffe5', name: 'car' },
    { len: 3, body: '#f2f2f2', roof: '#2a6fdb', name: 'micro' }, // microbus
  ];
  const L = TTLevels.create({
    id: 'parking-jam',
    str: {
      ar: { title: 'زحمة الجراج', howto: 'اسحب العربية لقدام أو لورا في حارتها (أو اضغط عليها عشان تمشي لقدام). بتخرج من الجراج بس لو الطريق فاضي. كل محاولة بحركة، فخطط كويس!', hint: 'اسحب في اتجاه الحارة · اضغط = لقدام', moves: 'الحركات', hintB: 'تلميح', honk: 'بيييب! الطريق مقفول 🚗', fail: 'خلصت الحركات', revive: '+5 حركات' },
      en: { title: 'Cairo Parking Jam', howto: 'Swipe a vehicle forward or back along its lane (or tap to drive forward). It leaves the garage only if nothing is in the way. Every try uses a move, so plan ahead!', hint: 'Swipe along the lane · tap = forward', moves: 'Moves', hintB: 'Hint', honk: 'Beep! The way is blocked 🚗', fail: 'Out of moves', revive: '+5 moves' },
    },
    onLevel: build,
    reward: (n) => 5 + Math.floor(n / 2),
  });
  const cv = document.getElementById('board'), ctx = cv.getContext('2d');
  const W = 360, H = 480;
  let G = null;

  const sizeFor = (n) => Math.min(9, 5 + Math.floor((n - 1) / 4));
  const fillFor = (n) => Math.min(0.85, 0.55 + n * 0.012);
  function cells(c) { const out = []; for (let k = 0; k < c.len; k++) out.push(c.h ? [c.x + k, c.y] : [c.x, c.y + k]); return out; }
  // first vehicle in the way when car c drives in direction d, or null if the exit is clear
  function blocker(cars, n, c, d) {
    const occ = new Map();
    cars.forEach((o) => { if (o !== c && !o.gone) cells(o).forEach(([x, y]) => occ.set(x + ',' + y, o)); });
    const cs = cells(c);
    let [x, y] = d === 0 || d === 3 ? cs[0] : cs[cs.length - 1];
    for (;;) {
      x += DIRS[d][0]; y += DIRS[d][1];
      if (x < 0 || y < 0 || x >= n || y >= n) return null;
      const o = occ.get(x + ',' + y); if (o) return o;
    }
  }
  const axisDirs = (c) => (c.h ? [1, 3] : [0, 2]);

  function generate(lv) {
    const n = sizeFor(lv), target = Math.round(n * n * fillFor(lv));
    const cars = [], used = new Set();
    let filled = 0;
    for (let tries = 0; tries < n * n * 40 && filled < target; tries++) {
      const r = Math.random();
      const kind = lv < 3 ? KINDS[1 + Math.floor(Math.random() * 4)] : r < 0.15 ? KINDS[0] : r < 0.85 || n < 6 ? KINDS[1 + Math.floor(Math.random() * 4)] : KINDS[5];
      const h = Math.random() < 0.5;
      const x = Math.floor(Math.random() * (n - (h ? kind.len - 1 : 0))), y = Math.floor(Math.random() * (n - (h ? 0 : kind.len - 1)));
      const c = { x, y, h, len: kind.len, kind };
      if (cells(c).some(([a, b]) => used.has(a + ',' + b))) continue;
      // placed first = leaves last: it only has to get past the vehicles already placed
      const free = axisDirs(c).filter((d) => !blocker(cars, n, c, d));
      if (!free.length) continue;
      c.face = free[Math.floor(Math.random() * free.length)];
      cars.push(c); cells(c).forEach(([a, b]) => used.add(a + ',' + b)); filled += c.len;
    }
    return { n, cars };
  }

  function build(lv) {
    const g = generate(lv);
    G = Object.assign(g, { cell: Math.floor(Math.min(W - 40, H - 60) / g.n), moves: g.cars.length + Math.max(2, 6 - Math.floor(lv / 6)), anim: [], bump: null, hint: null });
    G.ox = (W - G.cell * G.n) / 2; G.oy = (H - G.cell * G.n) / 2 + 6;
    showMoves(); tools(); loop();
  }
  function showMoves() { document.getElementById('moves').textContent = G ? G.moves : 0; }

  function drive(c, d) {
    if (!G || L.done || c.gone || G.moves <= 0) return;
    G.hint = null; G.moves--; showMoves();
    const b = blocker(G.cars, G.n, c, d);
    if (!b) {
      c.gone = true; G.anim.push({ c, d, t: 0 }); buzz(8);
      if (G.cars.every((o) => o.gone)) { setTimeout(() => L.win(), 450); loop(); return; }
    } else { G.bump = { c, d, t: 0 }; buzz([30, 30, 50]); L.toast(L.T('honk')); }
    if (G.moves <= 0 && !G.cars.every((o) => o.gone)) L.fail(L.T('fail'), () => { G.moves += 5; showMoves(); loop(); });
    loop();
  }
  function buzz(p) { if (navigator.vibrate) try { navigator.vibrate(p); } catch (e) { /* ignore */ } }

  // input: swipe along the lane, or tap to drive forward
  let down = null;
  const at = (e) => { const r = cv.getBoundingClientRect(), s = r.width / W; return [(e.clientX - r.left) / s, (e.clientY - r.top) / s]; };
  function carAt(px, py) {
    const x = Math.floor((px - G.ox) / G.cell), y = Math.floor((py - G.oy) / G.cell);
    return G.cars.find((c) => !c.gone && cells(c).some(([a, b]) => a === x && b === y));
  }
  cv.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!G) return; const [x, y] = at(e); down = { x, y, c: carAt(x, y) }; });
  cv.addEventListener('pointerup', (e) => {
    if (!down || !down.c) { down = null; return; }
    const [x, y] = at(e), dx = x - down.x, dy = y - down.y, c = down.c; down = null;
    const dist = Math.hypot(dx, dy);
    if (dist < 14) { drive(c, c.face); return; }
    const d = c.h ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0);
    drive(c, d);
  });

  const $ = (s) => document.querySelector(s);
  function tools() { $('#hintBtn b').textContent = L.boosterLabel('hintB', 15); }
  document.addEventListener('tt:lang', tools);
  $('#hintBtn').addEventListener('click', () => {
    if (!G || L.done) return;
    L.booster('hintB', 15, () => {
      for (const c of G.cars) {
        if (c.gone) continue;
        const d = axisDirs(c).find((k) => !blocker(G.cars, G.n, c, k));
        if (d != null) { G.hint = { c, d }; loop(); return; }
      }
    });
  });
  $('#restartBtn').addEventListener('click', () => { if (G && !L.done) L.restart(); });

  // ---------- drawing ----------
  function rr(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
  function vehicle(c, ox, oy, glow) {
    const s = G.cell, pad = s * 0.1;
    const w = (c.h ? c.len : 1) * s - pad * 2, h = (c.h ? 1 : c.len) * s - pad * 2;
    const x = G.ox + c.x * s + pad + ox, y = G.oy + c.y * s + pad + oy;
    ctx.save(); ctx.translate(x + w / 2, y + h / 2);
    // draw as if facing up, then rotate to the facing direction
    ctx.rotate(c.face * Math.PI / 2);
    const L2 = c.h ? w : h, T2 = c.h ? h : w; // length along travel, width across
    const bw = T2, bl = L2;
    ctx.shadowColor = glow || 'rgba(0,0,0,.6)'; ctx.shadowBlur = glow ? 22 : 6;
    ctx.fillStyle = c.kind.body; rr(-bw / 2, -bl / 2, bw, bl, Math.min(bw, bl) * 0.28); ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = c.kind.name === 'taxi' ? '#ffd23f' : 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; ctx.stroke();
    if (c.kind.name === 'taxi') { // white lower half of the Cairo taxi
      ctx.fillStyle = '#f5f5f5'; ctx.fillRect(-bw / 2 + 2, -bl * 0.05, bw - 4, bl * 0.18);
    }
    if (c.kind.name === 'micro') { ctx.fillStyle = c.kind.roof; ctx.fillRect(-bw / 2 + 3, -bl * 0.1, bw - 6, bl * 0.12); }
    // windscreen at the front
    ctx.fillStyle = 'rgba(10,20,60,.85)'; rr(-bw * 0.36, -bl / 2 + bl * 0.1, bw * 0.72, Math.min(bl * 0.2, s * 0.34), 4); ctx.fill();
    // roof
    if (c.kind.name !== 'tuk') { ctx.fillStyle = c.kind.name === 'micro' ? '#ffffff' : c.kind.roof; ctx.globalAlpha = 0.85; rr(-bw * 0.3, -bl * 0.08, bw * 0.6, bl * 0.34, 4); ctx.fill(); ctx.globalAlpha = 1; }
    else { ctx.fillStyle = c.kind.roof; rr(-bw * 0.38, -bl * 0.05, bw * 0.76, bl * 0.42, 5); ctx.fill(); }
    if (c.kind.name === 'taxi') { ctx.fillStyle = '#ffd23f'; ctx.fillRect(-bw * 0.12, bl * 0.02, bw * 0.24, bl * 0.06); }
    // headlights
    ctx.fillStyle = '#fff6b0'; ctx.fillRect(-bw / 2 + 3, -bl / 2 + 1, bw * 0.18, 3); ctx.fillRect(bw / 2 - 3 - bw * 0.18, -bl / 2 + 1, bw * 0.18, 3);
    ctx.fillStyle = '#ff2b4d'; ctx.fillRect(-bw / 2 + 3, bl / 2 - 4, bw * 0.16, 3); ctx.fillRect(bw / 2 - 3 - bw * 0.16, bl / 2 - 4, bw * 0.16, 3);
    ctx.restore();
  }
  let raf = 0, last = 0;
  function loop() {
    cancelAnimationFrame(raf); last = performance.now();
    const f = (t) => {
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      if (G) {
        G.anim.forEach((a) => { a.t += dt * 1.8; }); G.anim = G.anim.filter((a) => a.t < 1);
        if (G.bump) { G.bump.t += dt * 3.5; if (G.bump.t >= 1) G.bump = null; }
      }
      draw();
      if (G && (G.anim.length || G.bump || G.hint)) raf = requestAnimationFrame(f);
    };
    raf = requestAnimationFrame(f);
  }
  function draw() {
    ctx.fillStyle = '#0b0820'; ctx.fillRect(0, 0, W, H);
    if (!G) return;
    const s = G.cell, n = G.n;
    // asphalt + parking lines + exits on every side
    ctx.fillStyle = '#1b1838'; ctx.fillRect(G.ox - 8, G.oy - 8, n * s + 16, n * s + 16);
    ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1;
    for (let i = 1; i < n; i++) {
      ctx.beginPath(); ctx.moveTo(G.ox + i * s, G.oy); ctx.lineTo(G.ox + i * s, G.oy + n * s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(G.ox, G.oy + i * s); ctx.lineTo(G.ox + n * s, G.oy + i * s); ctx.stroke();
    }
    ctx.strokeStyle = '#00f0ff'; ctx.lineWidth = 3; ctx.shadowColor = '#00f0ff'; ctx.shadowBlur = 12;
    ctx.setLineDash([10, 8]); ctx.strokeRect(G.ox - 8, G.oy - 8, n * s + 16, n * s + 16); ctx.setLineDash([]); ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = '800 13px Cairo, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('EXIT · خروج', W / 2, G.oy - 16);
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 140);
    G.cars.forEach((c) => {
      if (c.gone) return;
      let ox = 0, oy = 0;
      if (G.bump && G.bump.c === c) { const k = Math.sin(G.bump.t * Math.PI) * s * 0.22; ox = DIRS[G.bump.d][0] * k; oy = DIRS[G.bump.d][1] * k; }
      const hint = G.hint && G.hint.c === c;
      vehicle(c, ox, oy, hint ? 'rgba(255,210,63,' + (0.5 + 0.5 * pulse) + ')' : null);
      if (hint) { // arrow showing which way to swipe
        const cs = cells(c), mid = cs[Math.floor(cs.length / 2)];
        ctx.fillStyle = '#ffd23f'; ctx.font = '900 ' + Math.round(s * 0.5) + 'px Cairo, sans-serif';
        ctx.fillText(['⬆', '➡', '⬇', '⬅'][G.hint.d], G.ox + (mid[0] + 0.5) * s, G.oy + (mid[1] + 0.7) * s);
      }
    });
    G.anim.forEach((a) => {
      const k = a.t * a.t * (n + 3) * s;
      ctx.globalAlpha = Math.max(0, 1 - a.t * 0.8);
      vehicle(a.c, DIRS[a.d][0] * k, DIRS[a.d][1] * k, null);
      ctx.globalAlpha = 1;
    });
  }
  const fit = () => { L.fitCanvas(cv, W, H); draw(); };
  window.addEventListener('resize', fit);
  fit();
  window.TTGame = { get state() { return G; } }; // read-only handle for automated QA
})();
