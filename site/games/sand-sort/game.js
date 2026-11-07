/* Siwa Sand Sort — Trip Timings Games Hub
   Tap a bottle, then another, to pour its top sand layer across. A pour only
   lands on the same colour or in an empty bottle. Sort every bottle to one
   colour. Levels add colours; a built-in solver checks each level is solvable
   and powers the 💡 hint. */
'use strict';
(() => {
  const CAP = 4;
  const COLORS = ['#ff2bd6', '#00f0ff', '#ffd23f', '#7ad66b', '#ff7a3d', '#a77bff', '#ff4d6d', '#2ec4b6', '#f5f5f5', '#5aa9ff', '#c98a4b', '#ff9de6'];
  const L = TTLevels.create({
    id: 'sand-sort',
    str: {
      ar: { title: 'رمال سيوة', howto: 'اضغط على زجاجة ثم على زجاجة تانية لتصب الطبقة اللي فوق. الرمل بينزل بس على نفس اللون أو في زجاجة فاضية. رتّب كل زجاجة بلون واحد!', hint: 'اضغط زجاجة ثم الزجاجة اللي هتصب فيها', undo: 'رجوع', hintB: 'تلميح', tube: 'زجاجة زيادة', stuck: 'مفيش حركات! جرّب رجوع أو زجاجة زيادة', oneTube: 'أضفت زجاجة بالفعل في المستوى ده', noUndo: 'مفيش حركة ترجعها' },
      en: { title: 'Siwa Sand Sort', howto: 'Tap a bottle, then another, to pour the top layer. Sand only lands on the same colour or in an empty bottle. Sort every bottle to a single colour!', hint: 'Tap a bottle, then the bottle to pour into', undo: 'Undo', hintB: 'Hint', tube: 'Extra bottle', stuck: 'No moves left! Try undo or an extra bottle', oneTube: 'You already added a bottle this level', noUndo: 'Nothing to undo' },
    },
    onLevel: build,
    reward: (n) => 5 + Math.floor(n / 2),
  });
  const cv = document.getElementById('board'), ctx = cv.getContext('2d');
  let G = null, W = 360, H = 520;

  // ---------- generation + solver ----------
  function colorsFor(n) { return Math.min(COLORS.length, 3 + Math.floor((n - 1) / 2)); }
  function canPour(a, b) {
    if (!a.length || b.length >= CAP) return false;
    return !b.length || b[b.length - 1] === a[a.length - 1];
  }
  function pour(t, i, j) {
    const a = t[i], b = t[j], c = a[a.length - 1];
    let n = 0;
    while (a.length && a[a.length - 1] === c && b.length < CAP) { b.push(a.pop()); n++; }
    return n;
  }
  const solvedTube = (x) => !x.length || (x.length === CAP && x.every((v) => v === x[0]));
  const solved = (t) => t.every(solvedTube);
  const keyOf = (t) => t.map((x) => x.join(',')).sort().join('|');
  // depth-first search with a visited set; returns the move list or null
  function solve(start, limit) {
    const seen = new Set(), path = [];
    let nodes = 0;
    function dfs(t) {
      if (solved(t)) return true;
      if (++nodes > limit) return false;
      const k = keyOf(t); if (seen.has(k)) return false; seen.add(k);
      for (let i = 0; i < t.length; i++) {
        const a = t[i];
        if (!a.length || solvedTube(a)) continue;
        const uniform = a.every((v) => v === a[0]);
        for (let j = 0; j < t.length; j++) {
          if (i === j || !canPour(a, t[j])) continue;
          if (uniform && !t[j].length) continue; // pointless move
          const c = t.map((x) => x.slice()); pour(c, i, j);
          path.push([i, j]);
          if (dfs(c)) return true;
          path.pop();
          if (nodes > limit) return false;
        }
      }
      return false;
    }
    return dfs(start) ? path.slice() : null;
  }
  function generate(n) {
    const k = colorsFor(n);
    for (let tries = 0; tries < 60; tries++) {
      const bag = [];
      for (let c = 0; c < k; c++) for (let r = 0; r < CAP; r++) bag.push(c);
      for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
      const t = [];
      for (let c = 0; c < k; c++) t.push(bag.slice(c * CAP, c * CAP + CAP));
      t.push([], []);
      if (t.some((x) => x.length && solvedTube(x))) continue;
      if (solve(t, 40000)) return t;
    }
    // fallback: still a valid level, just not proven
    const t = []; for (let c = 0; c < k; c++) t.push([c, (c + 1) % k, c, (c + 1) % k]);
    t.push([], []); return t;
  }

  // ---------- layout ----------
  function layout() {
    const n = G.tubes.length, perRow = n <= 6 ? n : Math.ceil(n / 2), rows = Math.ceil(n / perRow);
    const tw = 44, th = CAP * 34 + 22, gapX = 14, gapY = 56;
    W = Math.max(320, perRow * (tw + gapX) + 30);
    H = rows * (th + gapY) + 70;
    G.pos = G.tubes.map((_, i) => {
      const r = Math.floor(i / perRow), inRow = Math.min(perRow, n - r * perRow), c = i - r * perRow;
      const x0 = (W - inRow * (tw + gapX) + gapX) / 2;
      return { x: x0 + c * (tw + gapX), y: 50 + r * (th + gapY), w: tw, h: th };
    });
    L.fitCanvas(cv, W, H);
  }
  window.addEventListener('resize', () => { if (G) { layout(); draw(); } });

  function build(n) {
    const t = generate(n);
    G = { start: t.map((x) => x.slice()), tubes: t, sel: -1, hist: [], undos: 3, extra: false, hint: null, anim: null, grains: [] };
    layout(); tools(); draw();
  }

  // ---------- play ----------
  function tap(i) {
    if (!G || L.done || G.anim) return;
    G.hint = null;
    if (G.sel < 0) { if (G.tubes[i].length) { G.sel = i; buzz(5); } draw(); return; }
    if (G.sel === i) { G.sel = -1; draw(); return; }
    const from = G.sel; G.sel = -1;
    if (!canPour(G.tubes[from], G.tubes[i])) { if (G.tubes[i].length) { G.sel = i; } buzz([10, 30, 10]); draw(); return; }
    G.hist.push(G.tubes.map((x) => x.slice()));
    const color = G.tubes[from][G.tubes[from].length - 1];
    const moved = pour(G.tubes, from, i);
    G.anim = { from, to: i, color, t: 0, n: moved };
    buzz(8); animate();
  }
  function animate() {
    let last = performance.now();
    const step = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      G.anim.t += dt / 0.35;
      draw();
      if (G.anim.t < 1) requestAnimationFrame(step);
      else { G.anim = null; draw(); afterMove(); }
    };
    requestAnimationFrame(step);
  }
  function afterMove() {
    if (solved(G.tubes)) { L.win(); return; }
    const any = G.tubes.some((a, i) => a.length && G.tubes.some((b, j) => i !== j && canPour(a, b) && !(a.every((v) => v === a[0]) && !b.length)));
    if (!any) L.toast(L.T('stuck'));
  }
  function buzz(p) { if (navigator.vibrate) try { navigator.vibrate(p); } catch (e) { /* ignore */ } }

  cv.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const r = cv.getBoundingClientRect(), s = r.width / W;
    const x = (e.clientX - r.left) / s, y = (e.clientY - r.top) / s;
    const i = G ? G.pos.findIndex((p) => x > p.x - 8 && x < p.x + p.w + 8 && y > p.y - 30 && y < p.y + p.h + 10) : -1;
    if (i >= 0) tap(i);
  });

  // ---------- tools ----------
  const $ = (s) => document.querySelector(s);
  function tools() {
    $('#undoN').textContent = G ? G.undos : 3;
    $('#hintBtn b').textContent = L.boosterLabel('hintB', 20);
    $('#tubeBtn b').textContent = L.boosterLabel('tube', 50);
  }
  document.addEventListener('tt:lang', tools);
  $('#undoBtn').addEventListener('click', () => {
    if (!G || L.done || G.anim) return;
    if (!G.hist.length) { L.toast(L.T('noUndo')); return; }
    const doUndo = () => { G.tubes = G.hist.pop(); G.sel = -1; G.hint = null; if (G.tubes.length !== G.pos.length) layout(); draw(); };
    if (G.undos > 0) { G.undos--; tools(); doUndo(); }
    else L.booster('undo', 10, () => { G.undos += 3; tools(); doUndo(); });
  });
  $('#hintBtn').addEventListener('click', () => {
    if (!G || L.done || G.anim) return;
    L.booster('hintB', 20, () => {
      const path = solve(G.tubes.map((x) => x.slice()), 60000);
      if (path && path.length) { G.hint = path[0]; G.sel = -1; draw(); }
      else L.toast(L.T('stuck'));
    });
  });
  $('#tubeBtn').addEventListener('click', () => {
    if (!G || L.done || G.anim) return;
    if (G.extra) { L.toast(L.T('oneTube')); return; }
    L.booster('tube', 50, () => { G.extra = true; G.tubes.push([]); G.hist.forEach((h) => h.push([])); layout(); draw(); });
  });
  $('#restartBtn').addEventListener('click', () => { if (G && !L.done && !G.anim) { G.tubes = G.start.map((x) => x.slice()); G.hist = []; G.sel = -1; G.hint = null; G.extra = false; layout(); draw(); } });

  // ---------- drawing ----------
  function rr(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
  // fixed speckle pattern so the sand looks grainy without flicker
  const SPECK = Array.from({ length: 14 }, () => [Math.random(), Math.random(), Math.random()]);
  function sandLayer(x, y, w, h, color) {
    ctx.fillStyle = color; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    SPECK.forEach(([a, b, c]) => ctx.fillRect(x + a * (w - 2), y + b * (h - 2), 2, 2));
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    SPECK.forEach(([a, b, c]) => ctx.fillRect(x + c * (w - 2), y + a * (h - 2), 1.5, 1.5));
  }
  function draw() {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#1a1040'); bg.addColorStop(1, '#07041a');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    if (!G) return;
    const lift = (i) => (G.sel === i ? -18 : 0) + (G.anim && G.anim.from === i ? -26 * Math.sin(Math.min(1, G.anim.t) * Math.PI) : 0);
    G.tubes.forEach((t, i) => {
      const p = G.pos[i], y = p.y + lift(i);
      const isHint = G.hint && (G.hint[0] === i || G.hint[1] === i);
      // glass
      ctx.save();
      ctx.shadowColor = isHint ? '#ffd23f' : solvedTube(t) && t.length ? COLORS[t[0]] : '#00f0ff';
      ctx.shadowBlur = isHint ? 26 : solvedTube(t) && t.length ? 18 : 8;
      rr(p.x, y, p.w, p.h, 16); ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fill();
      ctx.restore();
      // sand (count shown as during pour so the stream reads right)
      ctx.save(); rr(p.x + 4, y + 18, p.w - 8, p.h - 22, 12); ctx.clip();
      const show = t.slice();
      if (G.anim && G.anim.to === i) show.length = Math.max(0, t.length - Math.round(G.anim.n * (1 - Math.min(1, G.anim.t))));
      if (G.anim && G.anim.from === i) for (let k = 0; k < Math.round(G.anim.n * (1 - Math.min(1, G.anim.t))); k++) show.push(G.anim.color);
      const lh = (p.h - 22) / CAP;
      show.forEach((c, k) => sandLayer(p.x + 4, y + p.h - 4 - (k + 1) * lh, p.w - 8, lh + 0.5, COLORS[c]));
      ctx.restore();
      ctx.strokeStyle = isHint ? '#ffd23f' : 'rgba(180,240,255,.75)'; ctx.lineWidth = 2.5;
      rr(p.x, y, p.w, p.h, 16); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(p.x + 8, y + 22, 4, p.h - 40);
      // cork rim
      ctx.fillStyle = '#c98a4b'; rr(p.x + 6, y - 6, p.w - 12, 10, 4); ctx.fill();
    });
    if (G.anim && G.anim.t < 1) { // falling stream
      const a = G.pos[G.anim.from], b = G.pos[G.anim.to];
      const x1 = a.x + a.w / 2, y1 = a.y - 24, x2 = b.x + b.w / 2, y2 = b.y + 18;
      ctx.strokeStyle = COLORS[G.anim.color]; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.shadowColor = COLORS[G.anim.color]; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo((x1 + x2) / 2, Math.min(y1, y2) - 50, x2, y2); ctx.stroke();
      ctx.shadowBlur = 0;
    }
    if (G.hint) {
      const b = G.pos[G.hint[1]];
      ctx.fillStyle = '#ffd23f'; ctx.font = '900 22px Cairo, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('⬇', b.x + b.w / 2, b.y - 14);
    }
  }
  L.fitCanvas(cv, W, H); draw();
  window.TTGame = { get state() { return G; } }; // read-only handle for automated QA
})();
