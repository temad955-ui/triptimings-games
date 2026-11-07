/* Nile Bubbles — Trip Timings Games Hub
   Hex-grid bubble shooter. Vanilla JS + Canvas, logical 400×600 space. */
'use strict';
(() => {
  const hub = window.TTHub;
  const STR = {
    ar: { title: 'فقاعات النيل', level: 'المستوى', score: 'النقاط', best: 'الأفضل', play: 'ابدأ اللعب',
      howto: 'صوّب الكرة لتلمس كرتين أو أكثر من نفس اللون فتنفجر. الكرات المعلّقة تسقط معها! كل 6 رميات بدون تفجير ينزل صف جديد.',
      hint: 'اسحب للتصويب وارفع إصبعك للإطلاق · اضغط على الكرة لتبديلها',
      over: 'انتهت اللعبة', again: 'العب مرة أخرى', newBest: 'رقم قياسي جديد! 🏆', bestIs: 'أفضل نتيجة: {n}',
      clear: 'المستوى {n}! 🎉', combo: 'رائع! +{n}', row: 'صف جديد ⬇' },
    en: { title: 'Nile Bubbles', level: 'Level', score: 'Score', best: 'Best', play: 'Play',
      howto: 'Shoot to touch two or more bubbles of the same colour and pop them. Anything left hanging falls too! Every 6 shots without a pop, a new row drops.',
      hint: 'Drag to aim, release to shoot · tap the bubble to swap',
      over: 'Game over', again: 'Play again', newBest: 'New record! 🏆', bestIs: 'Best: {n}',
      clear: 'Level {n}! 🎉', combo: 'Great! +{n}', row: 'New row ⬇' },
  };
  const T = (k, v) => { let s = (STR[hub.lang] || STR.ar)[k] || k; for (const x in v || {}) s = s.replace('{' + x + '}', v[x]); return s; };
  const $ = (s) => document.querySelector(s);
  document.querySelectorAll('[data-t]').forEach((el) => (el.textContent = T(el.dataset.t)));
  document.title = T('title') + ' · Trip Timings Games';

  // ---------- constants ----------
  const W = 400, H = 600, R = 20, COLS = 10;
  const ROW_H = R * Math.sqrt(3);
  const SHOOT_Y = H - 46;
  const DEAD_ROW = 13;
  const SPEED = 950;
  // misses allowed before a new row drops: 7 on level 1, one fewer every 2 levels, never below 3
  const missesFor = (level) => Math.max(3, 7 - Math.floor((level - 1) / 2));
  const COLORS = [
    { base: '#ff6b8b', dark: '#c2335a' }, // rose
    { base: '#2ec4b6', dark: '#13867b' }, // nile
    { base: '#f2b544', dark: '#b9831f' }, // gold
    { base: '#5aa9ff', dark: '#2e6fc2' }, // sky
    { base: '#a77bff', dark: '#6b42c9' }, // lotus
    { base: '#7ad66b', dark: '#3f9a33' }, // papyrus
  ];

  const canvas = $('#board');
  const ctx = canvas.getContext('2d');
  let scale = 1;

  let G = null;
  let aim = { angle: -Math.PI / 2, active: false };

  // ---------- grid helpers ----------
  const shifted = (r) => ((r + G.parity) & 1) === 1;
  const rowLen = (r) => (shifted(r) ? COLS - 1 : COLS);
  const cellX = (r, c) => R + c * 2 * R + (shifted(r) ? R : 0);
  const cellY = (r) => R + r * ROW_H;
  const get = (r, c) => (G.grid[r] && G.grid[r][c] != null ? G.grid[r][c] : null);

  function neighbors(r, c) {
    const s = shifted(r);
    const list = [[r, c - 1], [r, c + 1]];
    const off = s ? [0, 1] : [-1, 0];
    for (const dr of [-1, 1]) for (const o of off) list.push([r + dr, c + o]);
    return list.filter(([rr, cc]) => rr >= 0 && cc >= 0 && cc < rowLen(rr));
  }
  function ensureRow(r) { while (G.grid.length <= r) G.grid.push(new Array(rowLen(G.grid.length)).fill(null)); }

  function colorsInPlay() {
    const set = new Set();
    G.grid.forEach((row) => row.forEach((v) => v != null && set.add(v)));
    return [...set];
  }
  function randomColor() {
    const live = colorsInPlay();
    const pool = live.length ? live : [...Array(G.palette).keys()];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function newRow() {
    G.parity ^= 1;
    const len = shifted(0) ? COLS - 1 : COLS;
    const row = [];
    for (let c = 0; c < len; c++) row.push(Math.floor(Math.random() * G.palette));
    G.grid.unshift(row);
  }

  function newLevel(level) {
    G.level = level; G.parity = 0; G.grid = []; G.misses = 0;
    G.palette = Math.min(COLORS.length, 3 + Math.floor((level + 1) / 2));
    const rows = Math.min(9, 4 + level);
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < rowLen(r); c++) row.push(Math.floor(Math.random() * G.palette));
      G.grid.push(row);
    }
    G.current = randomColor(); G.next = randomColor();
    $('#level').textContent = level;
  }

  function start() {
    G = { score: 0, level: 1, grid: [], parity: 0, ball: null, falling: [], pops: [], over: false, misses: 0 };
    newLevel(1);
    $('#score').textContent = '0';
    $('#startPanel').hidden = true; $('#overPanel').hidden = true;
    hub.track('game_start', { game: 'bubble-shooter' });
  }

  // ---------- shooting ----------
  function shoot() {
    if (!G || G.ball || G.over) return;
    G.ball = { x: W / 2, y: SHOOT_Y, vx: Math.cos(aim.angle) * SPEED, vy: Math.sin(aim.angle) * SPEED, color: G.current };
    G.current = G.next; G.next = randomColor();
  }
  function swap() { if (G && !G.ball) { const t = G.current; G.current = G.next; G.next = t; } }

  function updateBall(dt) {
    const b = G.ball;
    const steps = 6;
    for (let i = 0; i < steps; i++) {
      b.x += (b.vx * dt) / steps; b.y += (b.vy * dt) / steps;
      if (b.x < R) { b.x = R; b.vx = Math.abs(b.vx); }
      if (b.x > W - R) { b.x = W - R; b.vx = -Math.abs(b.vx); }
      if (b.y <= R) return land(b);
      for (let r = 0; r < G.grid.length; r++) {
        for (let c = 0; c < G.grid[r].length; c++) {
          if (G.grid[r][c] == null) continue;
          const dx = b.x - cellX(r, c), dy = b.y - cellY(r);
          if (dx * dx + dy * dy < (R * 1.7) * (R * 1.7)) return land(b);
        }
      }
    }
  }

  function land(b) {
    // nearest empty cell that is in row 0 or touches an occupied cell
    const approx = Math.max(0, Math.round((b.y - R) / ROW_H));
    let best = null, bestD = Infinity;
    for (let r = Math.max(0, approx - 1); r <= approx + 1; r++) {
      for (let c = 0; c < rowLen(r); c++) {
        if (get(r, c) != null) continue;
        if (r !== 0 && !neighbors(r, c).some(([a, d]) => get(a, d) != null)) continue;
        const dx = b.x - cellX(r, c), dy = b.y - cellY(r), d = dx * dx + dy * dy;
        if (d < bestD) { bestD = d; best = [r, c]; }
      }
    }
    G.ball = null;
    if (!best) return;
    const [r, c] = best;
    ensureRow(r);
    G.grid[r][c] = b.color;
    resolve(r, c);
  }

  function resolve(r, c) {
    const color = G.grid[r][c];
    const seen = new Set([r + ',' + c]);
    const stack = [[r, c]], group = [];
    while (stack.length) {
      const [a, d] = stack.pop(); group.push([a, d]);
      for (const [x, y] of neighbors(a, d)) {
        const k = x + ',' + y;
        if (!seen.has(k) && get(x, y) === color) { seen.add(k); stack.push([x, y]); }
      }
    }
    if (group.length >= 3) {
      group.forEach(([a, d]) => { G.pops.push({ x: cellX(a, d), y: cellY(a), color: G.grid[a][d], t: 0 }); G.grid[a][d] = null; });
      const dropped = dropFloating();
      const gained = group.length * 10 + dropped * 20 * (dropped > 3 ? 2 : 1);
      addScore(gained);
      if (dropped >= 3 || group.length >= 6) toast(T('combo', { n: gained }));
      buzz(20);
      trimRows();
      if (!colorsInPlay().length) {
        addScore(500 * G.level);
        toast(T('clear', { n: G.level + 1 }));
        setTimeout(() => newLevel(G.level + 1), 700);
        return;
      }
      if (!colorsInPlay().includes(G.current)) G.current = randomColor();
      if (!colorsInPlay().includes(G.next)) G.next = randomColor();
    } else {
      G.misses++;
      if (G.misses >= missesFor(G.level)) { G.misses = 0; newRow(); toast(T('row')); }
    }
    checkLose();
  }

  function dropFloating() {
    const keep = new Set(), stack = [];
    if (G.grid[0]) G.grid[0].forEach((v, c) => { if (v != null) { keep.add('0,' + c); stack.push([0, c]); } });
    while (stack.length) {
      const [a, d] = stack.pop();
      for (const [x, y] of neighbors(a, d)) {
        const k = x + ',' + y;
        if (!keep.has(k) && get(x, y) != null) { keep.add(k); stack.push([x, y]); }
      }
    }
    let n = 0;
    G.grid.forEach((row, r) => row.forEach((v, c) => {
      if (v != null && !keep.has(r + ',' + c)) {
        G.falling.push({ x: cellX(r, c), y: cellY(r), vy: -60 - Math.random() * 80, vx: (Math.random() - .5) * 80, color: v });
        row[c] = null; n++;
      }
    }));
    return n;
  }
  function trimRows() { while (G.grid.length && G.grid[G.grid.length - 1].every((v) => v == null)) G.grid.pop(); }

  function checkLose() {
    trimRows();
    if (G.grid.length > DEAD_ROW) gameOver();
  }

  function gameOver() {
    G.over = true; buzz([60, 40, 60]);
    const record = hub.setBest('bubble-shooter', G.score);
    $('#best').textContent = hub.getBest('bubble-shooter');
    setTimeout(() => {
      $('#overScore').textContent = G.score;
      $('#overBest').textContent = record && G.score > 0 ? T('newBest') : T('bestIs', { n: hub.getBest('bubble-shooter') });
      $('#overBest').className = record && G.score > 0 ? 'new-best' : '';
      window.TTPromo && TTPromo.banner($('#overPromo'), { surface: 'bubble-over' });
      $('#overPanel').hidden = false;
      // shared wallet: 1 ⭐ per 100 points (max 50 per game)
      const stars = Math.min(50, Math.floor(G.score / 100));
      if (stars && window.TTEco) { TTEco.add(stars, 'bubble-shooter'); TTEco.toast('+' + stars + ' ⭐'); }
      window.TTPromo && TTPromo.gameOver({ score: G.score });
    }, 600);
  }

  function addScore(n) { G.score += n; $('#score').textContent = G.score; }
  let toastTimer = 0;
  function toast(msg) {
    const el = $('#toast'); el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 1000);
  }
  function buzz(p) { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { /* ignore */ } }

  // ---------- drawing ----------
  function bubble(x, y, color, rad = R - 1, alpha = 1) {
    const col = COLORS[color];
    ctx.globalAlpha = alpha;
    const g = ctx.createRadialGradient(x - rad * .35, y - rad * .4, rad * .1, x, y, rad);
    g.addColorStop(0, '#ffffff'); g.addColorStop(.25, col.base); g.addColorStop(1, col.dark);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
    // colour-blind glyph
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    const s = rad * .32;
    ctx.beginPath();
    switch (color) {
      case 0: ctx.arc(x, y + 2, s, 0, Math.PI * 2); break;
      case 1: ctx.moveTo(x, y - s + 2); ctx.lineTo(x + s, y + s + 2); ctx.lineTo(x - s, y + s + 2); break;
      case 2: ctx.rect(x - s * .85, y - s * .85 + 2, s * 1.7, s * 1.7); break;
      case 3: ctx.moveTo(x, y - s + 2); ctx.lineTo(x + s, y + 2); ctx.lineTo(x, y + s + 2); ctx.lineTo(x - s, y + 2); break;
      case 4: ctx.arc(x, y + 2, s, 0, Math.PI * 2); ctx.arc(x, y + 2, s * .5, 0, Math.PI * 2, true); break;
      default: ctx.rect(x - s, y - s * .3 + 2, s * 2, s * .6); ctx.rect(x - s * .3, y - s + 2, s * .6, s * 2);
    }
    ctx.fill('evenodd');
    ctx.globalAlpha = 1;
  }

  function guide() {
    let x = W / 2, y = SHOOT_Y, vx = Math.cos(aim.angle), vy = Math.sin(aim.angle);
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    let bounces = 0;
    for (let i = 0; i < 70 && y > R; i++) {
      x += vx * 12; y += vy * 12;
      if (x < R || x > W - R) { vx = -vx; x = Math.max(R, Math.min(W - R, x)); if (++bounces > 1) break; }
      if (i % 2 === 0) { ctx.beginPath(); ctx.arc(x, y, 2.4 - i * .02, 0, Math.PI * 2); ctx.fill(); }
    }
  }

  function draw() {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // danger line
    ctx.strokeStyle = 'rgba(255,107,139,.35)'; ctx.setLineDash([8, 8]); ctx.lineWidth = 1.5;
    const dy = cellY(DEAD_ROW) + R * .2;
    ctx.beginPath(); ctx.moveTo(0, dy); ctx.lineTo(W, dy); ctx.stroke(); ctx.setLineDash([]);
    if (!G) return;
    G.grid.forEach((row, r) => row.forEach((v, c) => v != null && bubble(cellX(r, c), cellY(r), v)));
    G.pops.forEach((p) => bubble(p.x, p.y, p.color, (R - 1) * (1 + p.t * 1.2), 1 - p.t));
    G.falling.forEach((f) => bubble(f.x, f.y, f.color));
    // misses meter
    for (let i = 0, mx = missesFor(G.level); i < mx; i++) {
      ctx.fillStyle = i < mx - G.misses ? 'rgba(242,181,68,.9)' : 'rgba(255,255,255,.15)';
      ctx.beginPath(); ctx.arc(18 + i * 14, H - 16, 4, 0, Math.PI * 2); ctx.fill();
    }
    if (!G.over) {
      if (!G.ball) guide();
      // launcher
      ctx.save(); ctx.translate(W / 2, SHOOT_Y); ctx.rotate(aim.angle + Math.PI / 2);
      ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(-7, -44, 14, 30); ctx.restore();
      if (!G.ball) bubble(W / 2, SHOOT_Y, G.current);
      bubble(W / 2 + 62, H - 22, G.next, R * .7);
    }
    if (G.ball) bubble(G.ball.x, G.ball.y, G.ball.color);
  }

  let last = 0;
  function loop(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (G && !G.over) {
      if (G.ball) updateBall(dt);
      G.pops = G.pops.filter((p) => (p.t += dt * 4) < 1);
      G.falling = G.falling.filter((f) => { f.vy += 1400 * dt; f.y += f.vy * dt; f.x += f.vx * dt; return f.y < H + R; });
    }
    draw();
    requestAnimationFrame(loop);
  }

  // ---------- input ----------
  function toLogical(e) {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  }
  function setAim(p) {
    let a = Math.atan2(p.y - SHOOT_Y, p.x - W / 2);
    if (a > 0) a = a > Math.PI / 2 ? -Math.PI + 0.12 : -0.12;
    aim.angle = Math.max(-Math.PI + 0.12, Math.min(-0.12, a));
  }
  canvas.addEventListener('pointerdown', (e) => {
    if (!G || G.over) return;
    const p = toLogical(e);
    if (Math.hypot(p.x - W / 2, p.y - SHOOT_Y) < R * 1.4) { swap(); return; }
    if (Math.hypot(p.x - (W / 2 + 62), p.y - (H - 22)) < R) { swap(); return; }
    aim.active = true; canvas.setPointerCapture(e.pointerId); setAim(p);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (aim.active || e.pointerType === 'mouse') setAim(toLogical(e));
  });
  canvas.addEventListener('pointerup', () => { if (aim.active) { aim.active = false; shoot(); } });
  canvas.addEventListener('pointercancel', () => { aim.active = false; });
  document.addEventListener('keydown', (e) => {
    if (!G) return;
    if (e.key === 'ArrowLeft') aim.angle = Math.max(-Math.PI + .12, aim.angle - .05);
    if (e.key === 'ArrowRight') aim.angle = Math.min(-.12, aim.angle + .05);
    if (e.key === ' ' || e.key === 'ArrowUp') { e.preventDefault(); shoot(); }
    if (e.key === 's' || e.key === 'ArrowDown') swap();
  });

  function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
    scale = canvas.width / W;
  }
  window.addEventListener('resize', resize);
  $('#startBtn').addEventListener('click', start);
  $('#againBtn').addEventListener('click', start);
  $('#best').textContent = hub.getBest('bubble-shooter');
  resize();
  requestAnimationFrame((t) => { last = t; loop(t); });
})();
