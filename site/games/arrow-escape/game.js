/* Arrow Escape — Trip Timings Games Hub
   Every arrow slides out of the board in the direction it points, but only
   if nothing is in its way. Tap them in the right order to clear the board.
   A blocked tap costs a heart. Levels are generated backwards from an empty
   board, so every level always has a solution. */
'use strict';
(() => {
  const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // up, right, down, left
  const HUES = [190, 300, 50, 120, 20, 260];
  const L = TTLevels.create({
    id: 'arrow-escape',
    str: {
      ar: { title: 'هروب الأسهم', howto: 'كل سهم بيخرج من اللوحة في اتجاهه لو الطريق فاضي. اضغط الأسهم بالترتيب الصح لحد ما اللوحة تفضى. لو السهم اتخبط بتخسر قلب!', hint: 'اضغط على السهم اللي طريقه فاضي', lives: 'المحاولات', hintB: 'تلميح', blocked: 'الطريق مقفول! 💥', fail: 'خلصت القلوب 💔', revive: '+3 ❤️' },
      en: { title: 'Arrow Escape', howto: 'Each arrow slides off the board in the direction it points, if its path is clear. Tap them in the right order to clear the board. A blocked arrow costs a heart!', hint: 'Tap an arrow whose path is clear', lives: 'Lives', hintB: 'Hint', blocked: 'Blocked! 💥', fail: 'Out of hearts 💔', revive: '+3 ❤️' },
    },
    onLevel: build,
    reward: (n) => 4 + Math.floor(n / 2),
  });
  const cv = document.getElementById('board'), ctx = cv.getContext('2d');
  const W = 360, H = 460;
  let G = null;

  function sizeFor(n) { return Math.min(10, 4 + Math.floor((n - 1) / 3)); }
  function densityFor(n) { return Math.min(0.92, 0.6 + n * 0.015); }

  const inside = (x, y) => x >= 0 && y >= 0 && x < G.n && y < G.n;
  function pathClear(grid, n, x, y, d) {
    let cx = x + DIRS[d][0], cy = y + DIRS[d][1];
    while (cx >= 0 && cy >= 0 && cx < n && cy < n) { if (grid[cy][cx] != null) return [cx, cy]; cx += DIRS[d][0]; cy += DIRS[d][1]; }
    return null;
  }
  function generate(lv) {
    const n = sizeFor(lv), target = Math.round(n * n * densityFor(lv));
    const grid = Array.from({ length: n }, () => Array(n).fill(null));
    let placed = 0;
    // Placed first = removed last, so each new arrow only has to clear the arrows already placed.
    for (let tries = 0; tries < n * n * 30 && placed < target; tries++) {
      const x = Math.floor(Math.random() * n), y = Math.floor(Math.random() * n);
      if (grid[y][x] != null) continue;
      const dirs = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
      for (const d of dirs) {
        if (!pathClear(grid, n, x, y, d)) { grid[y][x] = d; placed++; break; }
      }
    }
    return { n, grid };
  }

  function build(lv) {
    const g = generate(lv);
    G = Object.assign(g, { lives: 3, cell: Math.floor(Math.min(W - 24, H - 24) / g.n), moving: [], shake: null, hint: null });
    G.ox = (W - G.cell * G.n) / 2; G.oy = (H - G.cell * G.n) / 2;
    hearts(); tools(); loop();
  }
  function hearts() { document.getElementById('lives').textContent = G ? '❤️'.repeat(Math.max(0, G.lives)) || '💔' : '❤️❤️❤️'; }

  function tap(x, y) {
    if (!G || L.done || G.lives <= 0) return;
    const d = G.grid[y][x]; if (d == null) return;
    G.hint = null;
    const hit = pathClear(G.grid, G.n, x, y, d);
    if (!hit) {
      G.grid[y][x] = null;
      G.moving.push({ x, y, d, t: 0 });
      buzz(8);
      if (G.grid.every((r) => r.every((v) => v == null))) setTimeout(() => L.win(), 350);
    } else {
      G.lives--; hearts(); buzz([30, 30, 50]);
      G.shake = { x, y, d, t: 0, hx: hit[0], hy: hit[1] };
      L.toast(L.T('blocked'));
      if (G.lives <= 0) L.fail(L.T('fail'), () => { G.lives = 3; hearts(); loop(); });
    }
    loop();
  }
  function buzz(p) { if (navigator.vibrate) try { navigator.vibrate(p); } catch (e) { /* ignore */ } }

  cv.addEventListener('pointerdown', (e) => {
    e.preventDefault(); if (!G) return;
    const r = cv.getBoundingClientRect(), s = r.width / W;
    const x = Math.floor(((e.clientX - r.left) / s - G.ox) / G.cell), y = Math.floor(((e.clientY - r.top) / s - G.oy) / G.cell);
    if (inside(x, y)) tap(x, y);
  });

  const $ = (s) => document.querySelector(s);
  function tools() { $('#hintBtn b').textContent = L.boosterLabel('hintB', 15); }
  document.addEventListener('tt:lang', () => { tools(); });
  $('#hintBtn').addEventListener('click', () => {
    if (!G || L.done) return;
    L.booster('hintB', 15, () => {
      for (let y = 0; y < G.n; y++) for (let x = 0; x < G.n; x++) {
        if (G.grid[y][x] != null && !pathClear(G.grid, G.n, x, y, G.grid[y][x])) { G.hint = [x, y]; loop(); return; }
      }
    });
  });
  $('#restartBtn').addEventListener('click', () => { if (G && !L.done) L.restart(); });

  // ---------- drawing ----------
  function arrow(cx, cy, d, size, color, glow) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(d * Math.PI / 2);
    ctx.shadowColor = color; ctx.shadowBlur = glow;
    ctx.fillStyle = color; ctx.beginPath();
    const s = size / 2;
    ctx.moveTo(0, -s * 0.8); ctx.lineTo(s * 0.62, -s * 0.05); ctx.lineTo(s * 0.22, -s * 0.05); ctx.lineTo(s * 0.22, s * 0.78);
    ctx.lineTo(-s * 0.22, s * 0.78); ctx.lineTo(-s * 0.22, -s * 0.05); ctx.lineTo(-s * 0.62, -s * 0.05); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  const colorOf = (x, y) => 'hsl(' + HUES[(x * 7 + y * 3) % HUES.length] + ',100%,62%)';
  let raf = 0, last = 0;
  function loop() {
    cancelAnimationFrame(raf); last = performance.now();
    const f = (t) => {
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      if (G) {
        G.moving.forEach((m) => { m.t += dt * 2.6; });
        G.moving = G.moving.filter((m) => m.t < 1);
        if (G.shake) { G.shake.t += dt * 3; if (G.shake.t >= 1) G.shake = null; }
      }
      draw();
      if (G && (G.moving.length || G.shake || G.hint)) raf = requestAnimationFrame(f);
    };
    raf = requestAnimationFrame(f);
  }
  function draw() {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#140c38'); bg.addColorStop(1, '#07041a');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    if (!G) return;
    const c = G.cell;
    ctx.strokeStyle = 'rgba(0,240,255,.12)'; ctx.lineWidth = 1;
    for (let i = 0; i <= G.n; i++) {
      ctx.beginPath(); ctx.moveTo(G.ox + i * c, G.oy); ctx.lineTo(G.ox + i * c, G.oy + G.n * c); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(G.ox, G.oy + i * c); ctx.lineTo(G.ox + G.n * c, G.oy + i * c); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,43,214,.6)'; ctx.lineWidth = 2; ctx.strokeRect(G.ox - 3, G.oy - 3, G.n * c + 6, G.n * c + 6);
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 150);
    for (let y = 0; y < G.n; y++) for (let x = 0; x < G.n; x++) {
      const d = G.grid[y][x]; if (d == null) continue;
      let px = G.ox + (x + 0.5) * c, py = G.oy + (y + 0.5) * c;
      if (G.shake && G.shake.x === x && G.shake.y === y) {
        const k = Math.sin(G.shake.t * Math.PI) * c * 0.25;
        px += DIRS[d][0] * k; py += DIRS[d][1] * k;
      }
      const isHint = G.hint && G.hint[0] === x && G.hint[1] === y;
      if (isHint) { ctx.fillStyle = 'rgba(255,210,63,' + (0.2 + 0.3 * pulse) + ')'; ctx.fillRect(G.ox + x * c + 2, G.oy + y * c + 2, c - 4, c - 4); }
      arrow(px, py, d, c * 0.82, isHint ? '#ffd23f' : colorOf(x, y), isHint ? 20 : 8);
    }
    G.moving.forEach((m) => {
      const k = m.t * m.t * (G.n + 1) * c;
      ctx.globalAlpha = 1 - m.t;
      arrow(G.ox + (m.x + 0.5) * c + DIRS[m.d][0] * k, G.oy + (m.y + 0.5) * c + DIRS[m.d][1] * k, m.d, c * 0.82, colorOf(m.x, m.y), 14);
      ctx.globalAlpha = 1;
    });
  }
  const fit = () => { L.fitCanvas(cv, W, H); draw(); };
  window.addEventListener('resize', fit);
  fit();
  window.TTGame = { get state() { return G; } }; // read-only handle for automated QA
})();
