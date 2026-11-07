/* Nile Treasures — Trip Timings Games Hub
   Match-3 with a level map. Swap two neighbouring jewels to line up 3+.
   4 in a line makes a line-blaster, an L/T shape makes a bomb, 5 in a line
   makes a golden scarab that clears every jewel of one colour.
   Level goals rotate: reach a score, collect jewels of a colour, or clear the
   sand tiles. Boosters: 🔨 break one jewel and 🔀 shuffle (rewarded ad on the
   easy levels, ⭐ later); out of moves → +5 moves. */
'use strict';
(() => {
  const N = 8, CELL = 42, W = N * CELL + 24, TOP = 70, H = TOP + N * CELL + 16;
  const COLORS = ['#ff2bd6', '#00f0ff', '#ffd23f', '#7ad66b', '#ff7a3d', '#a77bff'];
  const NAMES = { ar: ['وردي', 'تركواز', 'ذهبي', 'أخضر', 'برتقالي', 'بنفسجي'], en: ['pink', 'turquoise', 'gold', 'green', 'orange', 'purple'] };
  const hub = window.TTHub;
  const L = TTLevels.create({
    id: 'nile-match',
    str: {
      ar: { title: 'كنوز النيل', howto: 'بدّل جوهرتين جنب بعض عشان تعمل 3 أو أكتر. 4 في خط = مدفع خط، شكل L = قنبلة، 5 في خط = جعران ذهبي يمسح لون كامل. حقق هدف المستوى قبل ما الحركات تخلص!', hint: 'اسحب جوهرة ناحية جارتها أو اضغط الاتنين', moves: 'الحركات', hammer: 'مطرقة', shuffle: 'خلط', revive: '+5 حركات', fail: 'خلصت الحركات', gScore: 'اجمع {n} نقطة', gColor: 'اجمع {n} {c}', gSand: 'امسح {n} بلاطة رمل', pickTile: 'اختار الجوهرة اللي عايز تكسرها', combo: 'رائع! ×{n}', reshuffle: 'مفيش حركات، بنخلط…' },
      en: { title: 'Nile Treasures', howto: 'Swap two neighbouring jewels to line up 3 or more. 4 in a line = line blaster, an L shape = bomb, 5 in a line = golden scarab that clears a whole colour. Reach the goal before you run out of moves!', hint: 'Swipe a jewel toward its neighbour, or tap both', moves: 'Moves', hammer: 'Hammer', shuffle: 'Shuffle', revive: '+5 moves', fail: 'Out of moves', gScore: 'Score {n} points', gColor: 'Collect {n} {c}', gSand: 'Clear {n} sand tiles', pickTile: 'Pick the jewel to smash', combo: 'Great! ×{n}', reshuffle: 'No moves, shuffling…' },
    },
    onLevel: build,
    reward: (n) => 6 + Math.floor(n / 2) + (G ? G.starsWon * 3 : 0),
  });
  const cv = document.getElementById('board'), ctx = cv.getContext('2d');
  const $ = (s) => document.querySelector(s);
  let G = null;

  // ---------- level design ----------
  function levelSpec(n) {
    const kinds = n < 6 ? 5 : 6;
    const moves = Math.max(16, 26 - Math.floor(n / 4));
    const type = n === 1 ? 'score' : ['sand', 'score', 'color'][n % 3];
    const spec = { kinds, moves, type };
    if (type === 'score') spec.target = 2500 + n * 500;
    if (type === 'color') { spec.color = n % kinds; spec.target = 12 + Math.floor(n * 1.5); }
    if (type === 'sand') {
      // a centred block of sand that grows with the level
      const r = Math.min(4, 1 + Math.floor(n / 6));
      spec.sand = [];
      for (let y = N / 2 - r; y < N / 2 + r; y++) for (let x = N / 2 - r; x < N / 2 + r; x++) spec.sand.push([x, y]);
      spec.target = spec.sand.length;
    }
    return spec;
  }

  const rnd = (k) => Math.floor(Math.random() * k);
  function fresh(k) { return { t: rnd(k), s: null, dy: 0, a: 1 }; }
  function build(n) {
    const spec = levelSpec(n);
    G = { spec, n, moves: spec.moves, score: 0, got: 0, busy: false, sel: null, hammer: false, grid: [], sand: [], starsWon: 0, idle: 0, hintMove: null, fx: [] };
    for (let y = 0; y < N; y++) { G.grid.push([]); G.sand.push(Array(N).fill(false)); for (let x = 0; x < N; x++) {
      let c; do { c = fresh(spec.kinds); } while ((x > 1 && G.grid[y][x - 1].t === c.t && G.grid[y][x - 2].t === c.t) || (y > 1 && G.grid[y - 1][x].t === c.t && G.grid[y - 2][x].t === c.t));
      c.dy = -(N + 2) * CELL + y * 6; G.grid[y].push(c);
    } }
    (spec.sand || []).forEach(([x, y]) => { G.sand[y][x] = true; });
    if (!findMove()) shuffle(true);
    hud(); tools(); start();
  }
  function goalLeft() {
    const s = G.spec;
    if (s.type === 'score') return Math.max(0, s.target - G.score);
    return Math.max(0, s.target - G.got);
  }
  function hud() {
    $('#moves').textContent = G ? G.moves : 0;
  }

  // ---------- matching ----------
  const inB = (x, y) => x >= 0 && y >= 0 && x < N && y < N;
  function runs() {
    const out = [];
    for (let y = 0; y < N; y++) { let x = 0; while (x < N) { const t = G.grid[y][x] && G.grid[y][x].t; let e = x + 1; if (t != null && t >= 0) while (e < N && G.grid[y][e] && G.grid[y][e].t === t) e++; if (t != null && t >= 0 && e - x >= 3) out.push({ h: true, x, y, len: e - x, t }); x = e; } }
    for (let x = 0; x < N; x++) { let y = 0; while (y < N) { const t = G.grid[y][x] && G.grid[y][x].t; let e = y + 1; if (t != null && t >= 0) while (e < N && G.grid[e][x] && G.grid[e][x].t === t) e++; if (t != null && t >= 0 && e - y >= 3) out.push({ h: false, x, y, len: e - y, t }); y = e; } }
    return out;
  }
  function findMove() {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) for (const [dx, dy] of [[1, 0], [0, 1]]) {
      const x2 = x + dx, y2 = y + dy; if (!inB(x2, y2)) continue;
      const a = G.grid[y][x], b = G.grid[y2][x2];
      if (a.s === 'color' || b.s === 'color') return [x, y, x2, y2];
      G.grid[y][x] = b; G.grid[y2][x2] = a;
      const ok = runs().length > 0;
      G.grid[y][x] = a; G.grid[y2][x2] = b;
      if (ok) return [x, y, x2, y2];
    }
    return null;
  }
  function shuffle(silent) {
    for (let k = 0; k < 50; k++) {
      const all = []; G.grid.forEach((r) => r.forEach((c) => all.push(c)));
      for (let i = all.length - 1; i > 0; i--) { const j = rnd(i + 1); [all[i], all[j]] = [all[j], all[i]]; }
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) G.grid[y][x] = all[y * N + x];
      if (!runs().length && findMove()) break;
    }
    if (!silent) L.toast(L.T('reshuffle'));
  }

  // ---------- turn resolution ----------
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function trySwap(x1, y1, x2, y2) {
    if (G.busy || L.done || G.moves <= 0) return;
    G.busy = true; G.sel = null; G.hintMove = null; G.idle = 0;
    const a = G.grid[y1][x1], b = G.grid[y2][x2];
    G.grid[y1][x1] = b; G.grid[y2][x2] = a;
    await anim(swapAnim(x1, y1, x2, y2));
    let cleared = false;
    if (a.s === 'color' || b.s === 'color') {
      const other = a.s === 'color' ? b : a, bombAt = a.s === 'color' ? [x2, y2] : [x1, y1];
      const set = new Set([bombAt.join(',')]);
      if (other.s === 'color') G.grid.forEach((r, y) => r.forEach((_, x) => set.add(x + ',' + y)));
      else G.grid.forEach((r, y) => r.forEach((c, x) => { if (c.t === other.t) set.add(x + ',' + y); }));
      G.grid[bombAt[1]][bombAt[0]].s = null;
      G.moves--; hud();
      await clearSet(set, 1); cleared = true;
    } else if (runs().length) {
      G.moves--; hud(); cleared = true;
    } else {
      G.grid[y1][x1] = a; G.grid[y2][x2] = b;
      await anim(swapAnim(x2, y2, x1, y1));
      buzz([10, 30, 10]);
    }
    if (cleared) await cascade([x1, y1], [x2, y2]);
    G.busy = false;
    endCheck();
  }
  function swapAnim(x1, y1, x2, y2) { // the two tiles slide into place
    const A = G.grid[y1][x1], B = G.grid[y2][x2];
    A.ox = (x2 - x1) * CELL; A.oy = (y2 - y1) * CELL; B.ox = -A.ox; B.oy = -A.oy;
    return 140;
  }
  function anim(ms) { return sleep(ms); }

  async function cascade(p1, p2) {
    let combo = 0;
    for (;;) {
      const rs = runs(); if (!rs.length) break;
      combo++;
      const set = new Set(), make = [];
      const count = {};
      rs.forEach((r) => { for (let k = 0; k < r.len; k++) { const x = r.h ? r.x + k : r.x, y = r.h ? r.y : r.y + k; const key = x + ',' + y; set.add(key); count[key] = (count[key] || 0) + 1; } });
      // specials: prefer the swapped cell as the spot the special appears on
      const spot = (cells) => { for (const p of [p1, p2]) if (p && cells.some(([x, y]) => x === p[0] && y === p[1])) return p; return cells[Math.floor(cells.length / 2)]; };
      rs.forEach((r) => {
        const cells = []; for (let k = 0; k < r.len; k++) cells.push(r.h ? [r.x + k, r.y] : [r.x, r.y + k]);
        const cross = cells.find(([x, y]) => count[x + ',' + y] > 1);
        if (r.len >= 5) make.push({ at: spot(cells), t: -1, s: 'color' });
        else if (cross && !make.some((m) => m.at[0] === cross[0] && m.at[1] === cross[1])) make.push({ at: cross, t: r.t, s: 'bomb' });
        else if (r.len === 4) make.push({ at: spot(cells), t: r.t, s: r.h ? 'h' : 'v' });
      });
      p1 = p2 = null;
      if (combo > 1) L.toast(L.T('combo', { n: combo }));
      await clearSet(set, combo, make);
    }
    if (!findMove() && !L.done) { await sleep(300); shuffle(false); await sleep(300); }
  }

  // clear a set of "x,y" cells, firing specials, then drop and refill
  async function clearSet(set, combo, make) {
    make = make || [];
    const queue = [...set], done = new Set();
    while (queue.length) {
      const key = queue.pop(); if (done.has(key)) continue; done.add(key);
      const [x, y] = key.split(',').map(Number), c = G.grid[y][x]; if (!c) continue;
      const keep = make.find((m) => m.at[0] === x && m.at[1] === y);
      if (c.s && !keep) { // chain specials
        const add = (a, b) => { if (inB(a, b)) queue.push(a + ',' + b); };
        if (c.s === 'h') for (let i = 0; i < N; i++) add(i, y);
        if (c.s === 'v') for (let i = 0; i < N; i++) add(x, i);
        if (c.s === 'bomb') for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) add(x + a, y + b);
        if (c.s === 'color') { const t = rnd(G.spec.kinds); G.grid.forEach((r, yy) => r.forEach((cc, xx) => { if (cc && cc.t === t) add(xx, yy); })); }
        G.fx.push({ x, y, s: c.s, t: 0 });
      }
    }
    let pts = 0;
    done.forEach((key) => {
      const [x, y] = key.split(',').map(Number), c = G.grid[y][x]; if (!c) return;
      const keep = make.find((m) => m.at[0] === x && m.at[1] === y);
      if (G.spec.type === 'color' && c.t === G.spec.color) G.got++;
      if (G.sand[y][x]) { G.sand[y][x] = false; if (G.spec.type === 'sand') G.got++; }
      pts += 60;
      if (keep) G.grid[y][x] = { t: keep.t, s: keep.s, dy: 0, a: 1 };
      else c.dying = true;
    });
    G.score += pts * combo; buzz(8);
    await sleep(170);
    // drop: surviving jewels fall, new ones come in from above
    for (let x = 0; x < N; x++) {
      const col = [];
      for (let y = N - 1; y >= 0; y--) { const c = G.grid[y][x]; if (c && !c.dying) col.push({ c, y }); }
      let missing = N - col.length;
      for (let y = N - 1, i = 0; y >= 0; y--, i++) {
        if (i < col.length) { const { c, y: from } = col[i]; c.dy = (from - y) * CELL; G.grid[y][x] = c; }
        else { const c = fresh(G.spec.kinds); c.dy = -(missing--) * CELL - 20; G.grid[y][x] = c; }
      }
    }
    hud();
    await sleep(230);
  }

  function endCheck() {
    if (L.done) return;
    if (goalLeft() <= 0) {
      const ratio = G.moves / G.spec.moves;
      G.starsWon = ratio > 0.35 ? 3 : ratio > 0.15 ? 2 : 1;
      const stars = hub.load('m3.stars', {}); stars[G.n] = Math.max(stars[G.n] || 0, G.starsWon); hub.store('m3.stars', stars);
      L.win(); drawMap();
      return;
    }
    if (G.moves <= 0) L.fail(L.T('fail'), () => { G.moves += 5; hud(); });
  }
  function buzz(p) { if (navigator.vibrate) try { navigator.vibrate(p); } catch (e) { /* ignore */ } }

  // ---------- input ----------
  let down = null;
  function cellAt(e) {
    const r = cv.getBoundingClientRect(), s = r.width / W;
    const x = Math.floor(((e.clientX - r.left) / s - 12) / CELL), y = Math.floor(((e.clientY - r.top) / s - TOP) / CELL);
    return inB(x, y) ? [x, y] : null;
  }
  cv.addEventListener('pointerdown', (e) => {
    e.preventDefault(); if (!G || G.busy || L.done) return;
    const c = cellAt(e); if (!c) return;
    G.idle = 0; G.hintMove = null;
    if (G.hammer) { G.hammer = false; smash(c[0], c[1]); return; }
    down = { c, x: e.clientX, y: e.clientY };
  });
  cv.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    const [x, y] = down.c; down = null;
    const [x2, y2] = Math.abs(dx) > Math.abs(dy) ? [x + Math.sign(dx), y] : [x, y + Math.sign(dy)];
    if (inB(x2, y2)) trySwap(x, y, x2, y2);
  });
  cv.addEventListener('pointerup', () => {
    if (!down) return;
    const [x, y] = down.c; down = null;
    if (G.sel && Math.abs(G.sel[0] - x) + Math.abs(G.sel[1] - y) === 1) { const s = G.sel; G.sel = null; trySwap(s[0], s[1], x, y); }
    else G.sel = G.sel && G.sel[0] === x && G.sel[1] === y ? null : [x, y];
  });
  async function smash(x, y) {
    G.busy = true;
    await clearSet(new Set([x + ',' + y]), 1);
    await cascade(null, null);
    G.busy = false; endCheck();
  }

  // ---------- boosters ----------
  function tools() {
    $('#hammerBtn b').textContent = L.boosterLabel('hammer', 30);
    $('#shuffleBtn b').textContent = L.boosterLabel('shuffle', 20);
  }
  document.addEventListener('tt:lang', () => { tools(); drawMap(); });
  $('#hammerBtn').addEventListener('click', () => {
    if (!G || G.busy || L.done) return;
    L.booster('hammer', 30, () => { G.hammer = true; L.toast(L.T('pickTile')); });
  });
  $('#shuffleBtn').addEventListener('click', () => {
    if (!G || G.busy || L.done) return;
    L.booster('shuffle', 20, () => { shuffle(true); });
  });

  // ---------- map ----------
  function drawMap() {
    const map = $('#map'); map.innerHTML = '';
    const stars = hub.load('m3.stars', {}), cur = L.level;
    for (let i = 1; i <= cur + 5; i++) {
      const d = document.createElement('div');
      d.className = 'node' + (i < cur ? ' done' : i === cur ? ' cur' : '');
      d.textContent = i;
      if (stars[i]) { const s = document.createElement('small'); s.textContent = '★'.repeat(stars[i]); d.appendChild(s); }
      map.appendChild(d);
    }
    map.scrollTop = map.scrollHeight;
    const curEl = map.querySelector('.cur'); if (curEl && curEl.scrollIntoView) curEl.scrollIntoView({ block: 'center' });
  }
  drawMap();

  // ---------- drawing ----------
  const SHAPES = [
    (r) => { ctx.arc(0, 0, r, 0, Math.PI * 2); },                                          // pearl
    (r) => { ctx.moveTo(0, -r); ctx.lineTo(r, 0); ctx.lineTo(0, r); ctx.lineTo(-r, 0); },     // diamond
    (r) => { ctx.moveTo(0, -r); ctx.lineTo(r, r * 0.8); ctx.lineTo(-r, r * 0.8); },           // pyramid
    (r) => { const k = r * 0.82; ctx.rect(-k, -k, k * 2, k * 2); },                            // block
    (r) => { for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } }, // hexagon
    (r) => { for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, q = i % 2 ? r * 0.45 : r; ctx.lineTo(Math.cos(a) * q, Math.sin(a) * q); } }, // star
  ];
  function jewel(c, cx, cy, size) {
    ctx.save(); ctx.translate(cx, cy);
    if (c.dying) { ctx.globalAlpha = 0.5; ctx.scale(1.25, 1.25); }
    if (c.s === 'color') {
      const g = ctx.createRadialGradient(-4, -4, 2, 0, 0, size);
      g.addColorStop(0, '#fff6b0'); g.addColorStop(1, '#c98a1b');
      ctx.fillStyle = g; ctx.shadowColor = '#ffd23f'; ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.ellipse(0, 2, size * 0.8, size * 0.95, 0, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      ctx.strokeStyle = '#7a4a00'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -size * 0.7); ctx.lineTo(0, size * 0.9); ctx.moveTo(-size * 0.6, -size * 0.2); ctx.lineTo(size * 0.6, -size * 0.2); ctx.stroke();
      ctx.restore(); return;
    }
    const col = COLORS[c.t];
    ctx.shadowColor = col; ctx.shadowBlur = c.s ? 18 : 8;
    const g = ctx.createLinearGradient(-size, -size, size, size);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.25, col); g.addColorStop(1, 'rgba(10,6,40,1)');
    ctx.fillStyle = g; ctx.beginPath(); SHAPES[c.t](size); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.5; ctx.stroke();
    if (c.s === 'h' || c.s === 'v') {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
      for (const k of [-0.35, 0.35]) { ctx.beginPath(); if (c.s === 'h') { ctx.moveTo(-size, k * size); ctx.lineTo(size, k * size); } else { ctx.moveTo(k * size, -size); ctx.lineTo(k * size, size); } ctx.stroke(); }
    }
    if (c.s === 'bomb') { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ff2b4d'; ctx.beginPath(); ctx.arc(0, 0, size * 0.16, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  function draw(dt) {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#1d1248'); bg.addColorStop(1, '#07041a');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    if (!G) return;
    // goal bar
    const s = G.spec, lang = hub.lang;
    const txt = s.type === 'score' ? L.T('gScore', { n: s.target.toLocaleString('en') }) : s.type === 'color' ? L.T('gColor', { n: s.target, c: (NAMES[lang] || NAMES.en)[s.color] }) : L.T('gSand', { n: s.target });
    const prog = s.type === 'score' ? G.score / s.target : G.got / s.target;
    ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(12, 40, W - 24, 12);
    const pg = ctx.createLinearGradient(12, 0, W - 12, 0); pg.addColorStop(0, '#00f0ff'); pg.addColorStop(1, '#ff2bd6');
    ctx.fillStyle = pg; ctx.fillRect(12, 40, (W - 24) * Math.min(1, prog), 12);
    ctx.fillStyle = '#fff'; ctx.font = '800 15px Cairo, sans-serif'; ctx.textAlign = 'center';
    const left = goalLeft();
    ctx.fillText(txt + '  ·  ' + (s.type === 'score' ? G.score.toLocaleString('en') : Math.min(G.got, s.target) + '/' + s.target), W / 2, 28);
    if (s.type === 'color') { ctx.save(); ctx.translate(24, 22); jewel({ t: s.color }, 0, 0, 9); ctx.restore(); }
    if (left <= 0) { ctx.fillStyle = '#7ad66b'; ctx.fillText('✓', W - 24, 28); }
    // board
    ctx.fillStyle = 'rgba(10,6,40,.75)'; ctx.fillRect(10, TOP - 2, N * CELL + 4, N * CELL + 4);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const px = 12 + x * CELL, py = TOP + y * CELL;
      ctx.fillStyle = (x + y) % 2 ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,.08)';
      ctx.fillRect(px, py, CELL, CELL);
      if (G.sand[y][x]) { ctx.fillStyle = 'rgba(214,160,80,.55)'; ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2); ctx.fillStyle = 'rgba(255,220,160,.35)'; ctx.fillRect(px + 6, py + 8, 3, 3); ctx.fillRect(px + 26, py + 22, 3, 3); ctx.fillRect(px + 14, py + 30, 2, 2); }
    }
    const sp = dt * 900;
    ctx.save(); ctx.beginPath(); ctx.rect(10, TOP - 2, N * CELL + 4, N * CELL + 4); ctx.clip();
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const c = G.grid[y][x]; if (!c) continue;
      if (c.dy < 0) c.dy = Math.min(0, c.dy + sp); else if (c.dy > 0) c.dy = Math.max(0, c.dy - sp);
      if (c.ox) c.ox = Math.abs(c.ox) < 4 ? 0 : c.ox * 0.6;
      if (c.oy) c.oy = Math.abs(c.oy) < 4 ? 0 : c.oy * 0.6;
      const cx = 12 + x * CELL + CELL / 2 + (c.ox || 0), cy = TOP + y * CELL + CELL / 2 + c.dy + (c.oy || 0);
      jewel(c, cx, cy, CELL * 0.36);
    }
    ctx.restore();
    // selection, hint and special effects
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 160);
    if (G.sel) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.strokeRect(12 + G.sel[0] * CELL + 2, TOP + G.sel[1] * CELL + 2, CELL - 4, CELL - 4); }
    if (G.hintMove) { ctx.strokeStyle = 'rgba(255,210,63,' + pulse + ')'; ctx.lineWidth = 3; const [a, b, c2, d] = G.hintMove; [[a, b], [c2, d]].forEach(([x, y]) => ctx.strokeRect(12 + x * CELL + 3, TOP + y * CELL + 3, CELL - 6, CELL - 6)); }
    if (G.hammer) { ctx.fillStyle = 'rgba(255,210,63,' + 0.12 * pulse + ')'; ctx.fillRect(12, TOP, N * CELL, N * CELL); }
    G.fx.forEach((f) => {
      f.t += dt * 2.5; ctx.globalAlpha = Math.max(0, 1 - f.t);
      ctx.strokeStyle = '#fff'; ctx.shadowColor = '#00f0ff'; ctx.shadowBlur = 20; ctx.lineWidth = 8 * (1 - f.t) + 1;
      const cx = 12 + f.x * CELL + CELL / 2, cy = TOP + f.y * CELL + CELL / 2;
      ctx.beginPath();
      if (f.s === 'h') { ctx.moveTo(12, cy); ctx.lineTo(12 + N * CELL, cy); }
      else if (f.s === 'v') { ctx.moveTo(cx, TOP); ctx.lineTo(cx, TOP + N * CELL); }
      else ctx.arc(cx, cy, CELL * (0.5 + f.t * 1.5), 0, Math.PI * 2);
      ctx.stroke(); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    });
    G.fx = G.fx.filter((f) => f.t < 1);
  }

  let raf = 0, last = 0;
  function start() {
    cancelAnimationFrame(raf); last = performance.now();
    const f = (t) => {
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      if (G && !G.busy && !L.done) { G.idle += dt; if (G.idle > 5 && !G.hintMove) G.hintMove = findMove(); }
      draw(dt);
      raf = requestAnimationFrame(f);
    };
    raf = requestAnimationFrame(f);
  }
  const fit = () => { L.fitCanvas(cv, W, H); draw(0); };
  window.addEventListener('resize', fit);
  fit();
  window.TTGame = { get state() { return G; } }; // read-only handle for automated QA
})();
