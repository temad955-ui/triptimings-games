/* Nile Blocks — Trip Timings Games Hub
   Drag the three pieces onto the 8×8 grid. Full rows and columns clear.
   The game ends when no piece fits. Bigger, awkward pieces become more
   common as the score grows. Booster: a fresh set of pieces
   (rewarded ad while the score is low, ⭐ after that). */
'use strict';
(() => {
  const hub = window.TTHub, eco = window.TTEco;
  const W = 360, H = 580, N = 8, C = 40, GX = 20, GY = 16, TRAY_Y = 372, SLOT = 120;
  const EASY_SCORE = 1000, REFRESH_COST = 40;
  const A = TTArcade.create({
    id: 'nile-blocks',
    str: {
      ar: { title: 'بلوكات النيل', howto: 'اسحب القطع للشبكة. كل صف أو عمود يكتمل بيختفي ويديك نقط. اللعبة بتخلص لما مفيش قطعة تدخل.', hint: 'اسحب القطعة وحطها على الشبكة', refresh: 'قطع جديدة', lines: '{n} خطوط! 🔥', refAd: 'شاهد الإعلان لتحصل على قطع جديدة', noCoins: 'نقاطك ⭐ مش كفاية', refCost: 'قطع جديدة ({n}⭐)' },
      en: { title: 'Nile Blocks', howto: 'Drag the pieces onto the grid. Every full row or column clears and scores. The game ends when no piece fits.', hint: 'Drag a piece onto the grid', refresh: 'New pieces', lines: '{n} lines! 🔥', refAd: 'Watch the ad for a fresh set of pieces', noCoins: 'Not enough ⭐', refCost: 'New pieces ({n}⭐)' },
    },
    onStart: reset,
    starsFor: (s) => Math.min(80, Math.floor(s / 60)),
    canContinue: (s) => s < 1500,
    onContinue: () => { // clear the middle 4×4 and deal a fresh tray
      for (let r = 2; r < 6; r++) for (let c = 2; c < 6; c++) G.grid[r][c] = 0;
      deal(); G.alive = true; draw();
    },
  });

  // shapes as [row, col] cells; weight = [early, late]
  const SHAPES = [
    { c: [[0, 0]], w: [5, 2] }, { c: [[0, 0], [0, 1]], w: [6, 3] }, { c: [[0, 0], [1, 0]], w: [6, 3] },
    { c: [[0, 0], [0, 1], [0, 2]], w: [5, 4] }, { c: [[0, 0], [1, 0], [2, 0]], w: [5, 4] },
    { c: [[0, 0], [0, 1], [1, 0], [1, 1]], w: [6, 5] },
    { c: [[0, 0], [1, 0], [1, 1]], w: [4, 4] }, { c: [[0, 1], [1, 0], [1, 1]], w: [4, 4] }, { c: [[0, 0], [0, 1], [1, 0]], w: [4, 4] }, { c: [[0, 0], [0, 1], [1, 1]], w: [4, 4] },
    { c: [[0, 0], [0, 1], [0, 2], [0, 3]], w: [2, 4] }, { c: [[0, 0], [1, 0], [2, 0], [3, 0]], w: [2, 4] },
    { c: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]], w: [1, 4] }, { c: [[0, 2], [1, 2], [2, 0], [2, 1], [2, 2]], w: [1, 4] },
    { c: [[0, 0], [0, 1], [0, 2], [1, 1]], w: [2, 4] }, { c: [[0, 1], [1, 0], [1, 1], [1, 2]], w: [2, 4] },
    { c: [[0, 0], [0, 1], [1, 1], [1, 2]], w: [1, 3] }, { c: [[0, 1], [0, 2], [1, 0], [1, 1]], w: [1, 3] },
    { c: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]], w: [0, 3] }, { c: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]], w: [0, 3] },
    { c: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]], w: [0, 3] },
  ];
  const COLORS = ['#00f0ff', '#ff2bd6', '#ffd27a', '#7ad66b', '#a77bff', '#ff8f5a', '#5aa9ff'];

  const cv = document.getElementById('board'), ctx = cv.getContext('2d');
  let scale = 1;
  const fit = () => { scale = A.fitCanvas(cv, W, H); };
  window.addEventListener('resize', () => { fit(); if (G) draw(); });
  fit();

  let G = null, drag = null, flash = [];
  function reset() {
    G = { grid: Array.from({ length: N }, () => Array(N).fill(0)), tray: [], score: 0, alive: true, combo: 0 };
    A.setScore(0); deal(); draw();
  }
  function pickShape() {
    const t = Math.min(1, G.score / 4000);
    const ws = SHAPES.map((s) => s.w[0] * (1 - t) + s.w[1] * t);
    let x = Math.random() * ws.reduce((a, b) => a + b, 0);
    for (let i = 0; i < SHAPES.length; i++) { x -= ws[i]; if (x < 0) return SHAPES[i]; }
    return SHAPES[0];
  }
  function deal() {
    G.tray = [0, 1, 2].map(() => ({ cells: pickShape().c, color: 1 + Math.floor(Math.random() * COLORS.length) }));
    // early game: make sure at least one piece fits
    if (G.score < EASY_SCORE && !G.tray.some((p) => canPlaceAny(p))) G.tray[0] = { cells: [[0, 0]], color: 1 };
    updateTools();
  }
  const size = (cells) => [Math.max(...cells.map((c) => c[0])) + 1, Math.max(...cells.map((c) => c[1])) + 1];
  function fits(p, r0, c0) {
    return p.cells.every(([r, c]) => r0 + r >= 0 && r0 + r < N && c0 + c >= 0 && c0 + c < N && !G.grid[r0 + r][c0 + c]);
  }
  function canPlaceAny(p) {
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (fits(p, r, c)) return true;
    return false;
  }

  function place(i, r0, c0) {
    const p = G.tray[i];
    p.cells.forEach(([r, c]) => { G.grid[r0 + r][c0 + c] = p.color; });
    G.tray[i] = null;
    G.score += p.cells.length;
    // clear full lines
    const rows = [], cols = [];
    for (let r = 0; r < N; r++) if (G.grid[r].every(Boolean)) rows.push(r);
    for (let c = 0; c < N; c++) if (G.grid.every((row) => row[c])) cols.push(c);
    const lines = rows.length + cols.length;
    if (lines) {
      G.combo++;
      rows.forEach((r) => { for (let c = 0; c < N; c++) { flash.push({ r, c, col: G.grid[r][c], t: 1 }); G.grid[r][c] = 0; } });
      cols.forEach((c) => { for (let r = 0; r < N; r++) { if (G.grid[r][c]) flash.push({ r, c, col: G.grid[r][c], t: 1 }); G.grid[r][c] = 0; } });
      G.score += 10 * lines * lines + 5 * (G.combo - 1) * lines;
      if (lines > 1) A.toast(A.T('lines', { n: lines }));
      if (navigator.vibrate) try { navigator.vibrate(lines > 1 ? [20, 30, 20] : 15); } catch (e) { /* ignore */ }
      animate();
    } else G.combo = 0;
    A.setScore(G.score); updateTools();
    if (G.tray.every((x) => !x)) deal();
    checkOver();
  }
  function checkOver() {
    if (G.tray.some((p) => p && canPlaceAny(p))) return;
    G.alive = false; updateTools();
    setTimeout(() => A.gameOver(G.score), 600);
  }

  // ---------- drawing ----------
  function cell(x, y, s, color, alpha) {
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = s * 0.3;
    ctx.fillRect(x + 2, y + 2, s - 4, s - 4);
    ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(x + 4, y + 4, s - 8, (s - 8) * 0.3);
    ctx.globalAlpha = 1;
  }
  function trayPos(i, p) {
    const [h, w] = size(p.cells), s = C * 0.6;
    return { x: i * SLOT + (SLOT - w * s) / 2, y: TRAY_Y + (190 - h * s) / 2 - 10, s };
  }
  function draw() {
    ctx.fillStyle = '#0b0726'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(0,240,255,.05)'; ctx.fillRect(GX - 6, GY - 6, N * C + 12, N * C + 12);
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      ctx.fillStyle = (r + c) % 2 ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,.07)';
      ctx.fillRect(GX + c * C + 1, GY + r * C + 1, C - 2, C - 2);
      if (G && G.grid[r][c]) cell(GX + c * C, GY + r * C, C, COLORS[G.grid[r][c] - 1]);
    }
    flash.forEach((f) => { ctx.globalAlpha = f.t; ctx.fillStyle = '#fff'; ctx.fillRect(GX + f.c * C + 2, GY + f.r * C + 2, C - 4, C - 4); ctx.globalAlpha = 1; });
    ctx.strokeStyle = 'rgba(0,240,255,.35)'; ctx.lineWidth = 2; ctx.strokeRect(GX - 6, GY - 6, N * C + 12, N * C + 12);
    if (!G) return;
    // ghost preview
    if (drag && drag.cell) {
      const p = G.tray[drag.i];
      const ok = fits(p, drag.cell[0], drag.cell[1]);
      p.cells.forEach(([r, c]) => {
        const rr = drag.cell[0] + r, cc = drag.cell[1] + c;
        if (rr >= 0 && rr < N && cc >= 0 && cc < N) { ctx.fillStyle = ok ? 'rgba(0,240,255,.3)' : 'rgba(255,43,214,.25)'; ctx.fillRect(GX + cc * C + 2, GY + rr * C + 2, C - 4, C - 4); }
      });
    }
    // tray
    ctx.fillStyle = 'rgba(255,255,255,.04)'; ctx.fillRect(0, TRAY_Y - 6, W, H - TRAY_Y + 6);
    G.tray.forEach((p, i) => {
      if (!p || (drag && drag.i === i)) return;
      const t = trayPos(i, p), fitsAny = canPlaceAny(p);
      p.cells.forEach(([r, c]) => cell(t.x + c * t.s, t.y + r * t.s, t.s, COLORS[p.color - 1], fitsAny ? 1 : 0.3));
    });
    if (drag) {
      const p = G.tray[drag.i];
      p.cells.forEach(([r, c]) => cell(drag.x + c * C, drag.y + r * C, C, COLORS[p.color - 1], 0.95));
    }
  }
  let animRaf = 0;
  function animate() {
    cancelAnimationFrame(animRaf);
    const step = () => { flash.forEach((f) => (f.t -= 0.06)); flash = flash.filter((f) => f.t > 0); draw(); if (flash.length) animRaf = requestAnimationFrame(step); };
    animRaf = requestAnimationFrame(step);
  }

  // ---------- input ----------
  function local(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / scale, (e.clientY - r.top) / scale]; }
  const LIFT = 70; // piece floats above the finger so it stays visible
  cv.addEventListener('pointerdown', (e) => {
    if (!G || !G.alive) return;
    const [x, y] = local(e);
    if (y < TRAY_Y - 10) return;
    const i = Math.min(2, Math.floor(x / SLOT)), p = G.tray[i];
    if (!p) return;
    e.preventDefault(); cv.setPointerCapture(e.pointerId);
    const [h, w] = size(p.cells);
    drag = { i, w, h, x: x - (w * C) / 2, y: y - h * C - LIFT, cell: null };
    move(x, y); draw();
  });
  function move(x, y) {
    drag.x = x - (drag.w * C) / 2; drag.y = y - drag.h * C - LIFT;
    const c = Math.round((drag.x - GX) / C), r = Math.round((drag.y - GY) / C);
    drag.cell = r > -drag.h && r < N && c > -drag.w && c < N ? [r, c] : null;
  }
  cv.addEventListener('pointermove', (e) => { if (!drag) return; const [x, y] = local(e); move(x, y); draw(); });
  const end = () => {
    if (!drag) return;
    const d = drag; drag = null;
    if (d.cell && fits(G.tray[d.i], d.cell[0], d.cell[1])) place(d.i, d.cell[0], d.cell[1]);
    draw();
  };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', () => { drag = null; draw(); });

  // ---------- booster: fresh pieces ----------
  const btn = document.getElementById('refreshBtn');
  function updateTools() {
    const easy = !G || G.score < EASY_SCORE;
    btn.disabled = !G || !G.alive;
    btn.querySelector('b').textContent = easy ? '🎬 ' + A.T('refresh') : A.T('refCost', { n: REFRESH_COST });
  }
  btn.addEventListener('click', () => {
    if (!G || !G.alive || !eco) return;
    if (G.score < EASY_SCORE) {
      eco.rewarded({ id: 'blocks-refresh', title: A.T('refAd') }).then((ok) => { if (ok && G.alive) { deal(); draw(); hub.track('booster', { game: 'nile-blocks', id: 'refresh-ad' }); } });
    } else if (eco.spend(REFRESH_COST, 'blocks-refresh')) { deal(); draw(); hub.track('booster', { game: 'nile-blocks', id: 'refresh-coins' }); }
    else eco.toast(A.T('noCoins'));
  });
  document.addEventListener('tt:lang', updateTools);
  updateTools();
  draw();
})();
