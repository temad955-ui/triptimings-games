/* Neon Snake — Trip Timings Games Hub
   Vanilla JS + Canvas. Fixed-rate simulation, interpolated rendering. */
'use strict';
(() => {
  const hub = window.TTHub;
  const STR = {
    ar: { title: 'الثعبان النيون', score: 'النقاط', best: 'الأفضل', classic: 'كلاسيك', portal: 'بوابات', maze: 'متاهة',
      howto: 'اسحب على الشاشة أو استخدم الأسهم. كُل الفاكهة لتكبر، والتفاحة الذهبية تعطي نقاطًا مضاعفة قبل أن تختفي!',
      play: 'ابدأ اللعب', over: 'انتهت الجولة', again: 'العب مرة أخرى', newBest: 'رقم قياسي جديد! 🏆',
      bestIs: 'أفضل نتيجة: {n}', golden: 'تفاحة ذهبية! +50', paused: 'إيقاف مؤقت', speed: 'أسرع! ⚡' },
    en: { title: 'Neon Snake', score: 'Score', best: 'Best', classic: 'Classic', portal: 'Portal', maze: 'Maze',
      howto: 'Swipe or use the arrow keys. Eat fruit to grow — grab the golden apple for bonus points before it fades!',
      play: 'Play', over: 'Round over', again: 'Play again', newBest: 'New record! 🏆',
      bestIs: 'Best: {n}', golden: 'Golden apple! +50', paused: 'Paused', speed: 'Faster! ⚡' },
  };
  const T = (k, v) => { let s = (STR[hub.lang] || STR.ar)[k] || k; for (const x in v || {}) s = s.replace('{' + x + '}', v[x]); return s; };
  const $ = (s) => document.querySelector(s);
  function applyText() { document.querySelectorAll('[data-t]').forEach((el) => (el.textContent = T(el.dataset.t))); document.title = T('title') + ' · Trip Timings Games'; }
  applyText();

  const N = 20;
  const canvas = $('#board');
  const ctx = canvas.getContext('2d');
  let cell = 20, dpr = 1;

  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const MAZE = (() => {
    const w = [];
    for (let i = 4; i <= 15; i++) { w.push([i, 5]); w.push([i, 14]); }
    for (let i = 8; i <= 11; i++) { w.push([4, i]); w.push([15, i]); }
    return w;
  })();

  let mode = hub.load('snake.mode', 'classic');
  let S = null;          // game state
  let running = false, paused = false;
  let acc = 0, last = 0;

  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    cell = canvas.width / N;
    draw(1);
  }

  function walls() { return mode === 'maze' ? MAZE : []; }
  function isWall(x, y) { return walls().some((w) => w[0] === x && w[1] === y); }

  function reset() {
    const mid = Math.floor(N / 2);
    const body = [[mid, mid + 3], [mid, mid + 4], [mid, mid + 5]];
    if (mode === 'maze') { body[0] = [2, 17]; body[1] = [2, 18]; body[2] = [2, 19]; }
    S = { body, prev: body.map((p) => p.slice()), dir: 'up', queue: [], grow: 0, score: 0, eaten: 0,
      tps: 7, food: null, gold: null, goldUntil: 0, particles: [], dead: false };
    placeFood();
    $('#score').textContent = '0';
  }

  function freeCell() {
    for (let tries = 0; tries < 500; tries++) {
      const x = Math.floor(Math.random() * N), y = Math.floor(Math.random() * N);
      if (isWall(x, y)) continue;
      if (S.body.some((p) => p[0] === x && p[1] === y)) continue;
      if (S.food && S.food[0] === x && S.food[1] === y) continue;
      return [x, y];
    }
    return null;
  }
  function placeFood() { S.food = freeCell(); S.fruit = ['🍊', '🍉', '🍇', '🍓', '🥭'][Math.floor(Math.random() * 5)]; }

  function turn(d) {
    if (!running || paused) return;
    const lastDir = S.queue.length ? S.queue[S.queue.length - 1] : S.dir;
    const a = DIRS[d], b = DIRS[lastDir];
    if (a[0] === -b[0] && a[1] === -b[1]) return;
    if (d === lastDir) return;
    if (S.queue.length < 2) S.queue.push(d);
  }

  function step() {
    if (S.queue.length) S.dir = S.queue.shift();
    const [dx, dy] = DIRS[S.dir];
    let [x, y] = S.body[0];
    x += dx; y += dy;
    if (mode === 'portal') { x = (x + N) % N; y = (y + N) % N; }
    const hitsSelf = S.body.slice(0, S.body.length - (S.grow ? 0 : 1)).some((p) => p[0] === x && p[1] === y);
    if (x < 0 || y < 0 || x >= N || y >= N || isWall(x, y) || hitsSelf) return die();

    S.prev = S.body.map((p) => p.slice());
    S.body.unshift([x, y]);
    if (S.grow > 0) { S.grow--; S.prev.push(S.prev[S.prev.length - 1].slice()); } else S.body.pop();

    if (S.food && x === S.food[0] && y === S.food[1]) {
      S.grow += 2; S.eaten++; addScore(10, x, y, '#2ec4b6');
      if (S.eaten % 5 === 0) { S.gold = freeCell(); S.goldUntil = performance.now() + 6000; }
      if (S.eaten % 8 === 0) { S.tps = Math.min(16, S.tps + 1); toast(T('speed')); }
      placeFood(); buzz(15);
    }
    if (S.gold && x === S.gold[0] && y === S.gold[1]) {
      S.grow += 4; addScore(50, x, y, '#ffd27a'); S.gold = null; toast(T('golden')); buzz(40);
    }
    if (S.gold && performance.now() > S.goldUntil) S.gold = null;
  }

  function addScore(n, x, y, color) {
    S.score += n;
    $('#score').textContent = S.score;
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2, v = 0.04 + Math.random() * 0.08;
      S.particles.push({ x: x + 0.5, y: y + 0.5, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, color });
    }
  }

  function die() {
    S.dead = true; running = false; buzz([60, 40, 60]);
    const record = hub.setBest('snake', S.score);
    $('#best').textContent = hub.getBest('snake');
    setTimeout(() => {
      $('#overScore').textContent = S.score;
      $('#overBest').textContent = record && S.score > 0 ? T('newBest') : T('bestIs', { n: hub.getBest('snake') });
      $('#overBest').className = record && S.score > 0 ? 'new-best' : '';
      window.TTPromo && TTPromo.banner($('#overPromo'), { surface: 'snake-over' });
      $('#overPanel').hidden = false;
      window.TTPromo && TTPromo.gameOver({ score: S.score });
    }, 450);
  }

  let toastTimer = 0;
  function toast(msg) {
    const el = $('#toast'); el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 1200);
  }
  function buzz(p) { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { /* ignore */ } }

  // ---------- rendering ----------
  function draw(alpha) {
    const W = canvas.width;
    ctx.clearRect(0, 0, W, W);
    // grid
    ctx.strokeStyle = 'rgba(90,169,255,0.06)'; ctx.lineWidth = 1;
    for (let i = 1; i < N; i++) {
      ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, W); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(W, i * cell); ctx.stroke();
    }
    if (mode === 'portal') { ctx.strokeStyle = 'rgba(46,196,182,.55)'; ctx.setLineDash([cell * .4, cell * .3]); ctx.lineWidth = 2 * dpr; ctx.strokeRect(dpr, dpr, W - 2 * dpr, W - 2 * dpr); ctx.setLineDash([]); }
    // walls
    walls().forEach(([x, y]) => { ctx.fillStyle = '#3a4372'; rr(x * cell + 1, y * cell + 1, cell - 2, cell - 2, cell * .2); ctx.fill(); });
    if (!S) return;
    // food
    if (S.food) emoji(S.fruit, S.food[0], S.food[1], 1 + Math.sin(performance.now() / 200) * .06);
    if (S.gold) {
      const left = (S.goldUntil - performance.now()) / 6000;
      ctx.globalAlpha = left < .3 ? (Math.sin(performance.now() / 60) > 0 ? 1 : .35) : 1;
      ctx.shadowColor = '#ffd27a'; ctx.shadowBlur = 18 * dpr;
      emoji('🍎', S.gold[0], S.gold[1], 1.15);
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }
    // snake
    const n = S.body.length;
    for (let i = n - 1; i >= 0; i--) {
      const c = S.body[i], p = S.prev[i] || c;
      let x = c[0], y = c[1];
      if (Math.abs(c[0] - p[0]) <= 1 && Math.abs(c[1] - p[1]) <= 1) { x = p[0] + (c[0] - p[0]) * alpha; y = p[1] + (c[1] - p[1]) * alpha; }
      const t = i / Math.max(1, n - 1);
      const hue = 172 - t * 60;
      const pad = cell * (0.08 + t * 0.1);
      ctx.fillStyle = `hsl(${hue} 75% ${58 - t * 14}%)`;
      if (i === 0) { ctx.shadowColor = '#2ec4b6'; ctx.shadowBlur = 16 * dpr; }
      rr(x * cell + pad, y * cell + pad, cell - pad * 2, cell - pad * 2, cell * .32); ctx.fill();
      ctx.shadowBlur = 0;
      if (i === 0) eyes(x, y);
    }
    // particles
    S.particles.forEach((q) => { ctx.globalAlpha = q.life; ctx.fillStyle = q.color; ctx.fillRect(q.x * cell - 2 * dpr, q.y * cell - 2 * dpr, 4 * dpr, 4 * dpr); });
    ctx.globalAlpha = 1;
    if (paused) { ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(0, 0, W, W); ctx.fillStyle = '#fff'; ctx.font = `800 ${cell * 1.2}px Cairo, sans-serif`; ctx.textAlign = 'center'; ctx.fillText(T('paused'), W / 2, W / 2); }
  }
  function eyes(x, y) {
    const [dx, dy] = DIRS[S.dir];
    const cx = (x + .5) * cell, cy = (y + .5) * cell, o = cell * .18;
    ctx.fillStyle = '#0b1026';
    [[-1, 1], [1, -1]].forEach(([a]) => {
      const ex = cx + dx * o + (dy ? a * o : 0), ey = cy + dy * o + (dx ? a * o : 0);
      ctx.beginPath(); ctx.arc(ex, ey, cell * .08, 0, Math.PI * 2); ctx.fill();
    });
  }
  function emoji(ch, x, y, scale) {
    ctx.font = `${cell * .82 * scale}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(ch, (x + .5) * cell, (y + .55) * cell);
  }
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }

  // ---------- loop ----------
  function loop(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (running && !paused) {
      acc += dt;
      const stepT = 1 / S.tps;
      while (acc >= stepT && running) { acc -= stepT; step(); }
    }
    if (S) S.particles = S.particles.filter((q) => { q.x += q.vx; q.y += q.vy; q.life -= dt * 1.8; return q.life > 0; });
    draw(running && S ? Math.min(1, acc * S.tps) : 1);
    requestAnimationFrame(loop);
  }

  function start() {
    $('#startPanel').hidden = true; $('#overPanel').hidden = true;
    reset(); running = true; paused = false; acc = 0;
    hub.track('game_start', { game: 'snake', mode });
  }
  function togglePause() { if (running) paused = !paused; }

  // ---------- input ----------
  const KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };
  document.addEventListener('keydown', (e) => {
    if (KEYS[e.key]) { e.preventDefault(); turn(KEYS[e.key]); }
    else if (e.key === ' ' || e.key === 'p') { e.preventDefault(); running ? togglePause() : start(); }
    else if (e.key === 'Enter' && !running) start();
  });
  let touch = null;
  canvas.addEventListener('pointerdown', (e) => { touch = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointermove', (e) => {
    if (!touch) return;
    const dx = e.clientX - touch.x, dy = e.clientY - touch.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
    turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    touch = { x: e.clientX, y: e.clientY };
  });
  window.addEventListener('pointerup', () => (touch = null));
  document.querySelectorAll('.dpad button').forEach((b) => b.addEventListener('pointerdown', (e) => {
    e.preventDefault(); b.dataset.dir === 'pause' ? togglePause() : turn(b.dataset.dir);
  }));
  document.addEventListener('visibilitychange', () => { if (document.hidden && running) paused = true; });

  function setMode(m) {
    mode = m; hub.store('snake.mode', m);
    document.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-checked', String(c.dataset.mode === m)));
    if (running) start(); else { S = null; draw(1); }
  }
  document.querySelectorAll('.chip').forEach((c) => c.addEventListener('click', () => setMode(c.dataset.mode)));
  $('#startBtn').addEventListener('click', start);
  $('#againBtn').addEventListener('click', start);

  $('#best').textContent = hub.getBest('snake');
  setMode(mode);
  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame((t) => { last = t; loop(t); });
})();
