/* Nile 8-Ball Pool — Trip Timings Games Hub
   8-ball against the computer on a portrait table.
   Aim: touch the table and drag; the cue points from your finger through the
   cue ball. Pull further for more power, release to shoot.
   Rules (simplified 8-ball): the first ball potted after the break decides
   solids / stripes. Pot your group, then the 8. Potting the cue ball or the
   8 too early is a foul / loss. Potting one of yours keeps the turn.
   📏 Long guide: rewarded ad (easy) or ⭐ for one shot. Premium cloths are IAP. */
'use strict';
(() => {
  const hub = window.TTHub, eco = window.TTEco;
  const $ = (s) => document.querySelector(s);
  const STR = {
    ar: { title: 'بلياردو النيل', howto: 'المس الطاولة واسحب عشان تصوّب، وكل ما تسحب أكتر الضربة تبقى أقوى. دخّل كوراتك (المصمتة أو المقلّمة) وبعدين الكورة 8 قبل الكمبيوتر.', wins: 'انتصارات', levelL: 'المستوى', play: 'ابدأ المباراة', again: 'مباراة جديدة', share: '📤 تحدَّ أصحابك +⭐', newGame: 'جديدة',
      easy: 'سهل', medium: 'متوسط', hard: 'صعب', you: 'دورك', cpu: 'دور الكمبيوتر…', solids: 'المصمتة ●', stripes: 'المقلّمة ◐', open: 'الطاولة مفتوحة', yours: 'كوراتك: {g}', guide: 'خط تصويب طويل',
      win: 'كسبت المباراة! 🏆', lose: 'الكمبيوتر كسب', foul: 'خطأ! الكورة البيضاء دخلت', early8: 'الكورة 8 دخلت بدري', stars: '+{n} ⭐ في محفظتك', noCoins: 'نقاطك ⭐ مش كفاية', adFor: 'شاهد الإعلان لتحصل على: {x}',
      shareText: 'كسبت الكمبيوتر في بلياردو النيل! تقدر تغلبه؟', thGreen: 'أخضر', thNeon: 'نيون', thNile: 'أزرق النيل', thRoyal: 'ملكي', bought: 'مفتوح', free: 'مجاني', guideOn: 'خط التصويب الطويل جاهز للضربة الجاية' },
    en: { title: 'Nile 8-Ball Pool', howto: 'Touch the table and drag to aim; the further you pull, the harder the shot. Pot your group (solids or stripes), then the 8-ball, before the computer.', wins: 'Wins', levelL: 'Level', play: 'Start match', again: 'New match', share: '📤 Challenge friends +⭐', newGame: 'New',
      easy: 'Easy', medium: 'Medium', hard: 'Hard', you: 'Your shot', cpu: 'Computer’s shot…', solids: 'Solids ●', stripes: 'Stripes ◐', open: 'Table is open', yours: 'You: {g}', guide: 'Long guide',
      win: 'You win the match! 🏆', lose: 'The computer wins', foul: 'Foul! Cue ball potted', early8: 'The 8-ball went in too early', stars: '+{n} ⭐ added to your wallet', noCoins: 'Not enough ⭐', adFor: 'Watch the ad to get: {x}',
      shareText: 'I beat the computer at Nile 8-Ball Pool! Can you?', thGreen: 'Green', thNeon: 'Neon', thNile: 'Nile blue', thRoyal: 'Royal', bought: 'Owned', free: 'Free', guideOn: 'Long guide ready for your next shot' },
  };
  const T = (k, v) => { let s = (STR[hub.lang] || STR.en)[k]; if (s == null) s = k; for (const x in v || {}) s = s.split('{' + x + '}').join(v[x]); return s; };
  const LEVELS = [{ id: 1, k: 'easy', stars: 20, err: 0.06 }, { id: 2, k: 'medium', stars: 40, err: 0.03 }, { id: 3, k: 'hard', stars: 80, err: 0.012 }];
  const THEMES = [
    { id: 'green', k: 'thGreen', cloth: '#0f6b3c', rail: '#5a3416' },
    { id: 'neon', k: 'thNeon', cloth: '#1a1050', rail: '#07041a', glow: '#00f0ff' },
    { id: 'nile', k: 'thNile', cloth: '#0d4f7a', rail: '#c49a52', sku: 'pool-cloth-nile', price: '$0.99' },
    { id: 'royal', k: 'thRoyal', cloth: '#5a1a5e', rail: '#d4af37', sku: 'pool-cloth-royal', price: '$0.99' },
  ];
  const S = Object.assign({ level: 1, theme: 'green', wins: 0 }, hub.load('pool.settings', {}));
  const save = () => hub.store('pool.settings', S);

  // table geometry (logical units)
  const W = 360, H = 640, RAIL = 22, X0 = 24 + RAIL, Y0 = 24 + RAIL, X1 = W - 24 - RAIL, Y1 = H - 24 - RAIL;
  const R = 10, POCKET = 17;
  const POCKETS = [[X0, Y0], [X1, Y0], [X0 - 3, (Y0 + Y1) / 2], [X1 + 3, (Y0 + Y1) / 2], [X0, Y1], [X1, Y1]];
  const COLORS = ['#fff', '#f5c518', '#1f5fd6', '#d62828', '#6a2fb5', '#f07a1a', '#1a8a4a', '#8a1c1c', '#111'];
  const cv = document.getElementById('board'), ctx = cv.getContext('2d');
  let G = null;

  // ---------- menu ----------
  function pickers() {
    const lv = $('#pickLevel'); lv.innerHTML = '';
    LEVELS.forEach((l) => { const b = document.createElement('button'); b.type = 'button'; b.className = S.level === l.id ? 'on' : ''; b.innerHTML = T(l.k) + '<small>+' + l.stars + ' ⭐</small>'; b.onclick = () => { S.level = l.id; save(); pickers(); }; lv.appendChild(b); });
    const th = $('#pickTheme'); th.innerHTML = '';
    THEMES.forEach((t) => {
      const owned = !t.sku || (eco && eco.owns(t.sku));
      const b = document.createElement('button'); b.type = 'button'; b.className = S.theme === t.id ? 'on' : '';
      b.innerHTML = '<i style="background:linear-gradient(90deg,' + t.cloth + ' 60%,' + t.rail + ' 60%)"></i>' + T(t.k) + '<small>' + (owned ? (t.sku ? T('bought') : T('free')) : '🔒 ' + t.price) + '</small>';
      b.onclick = () => {
        if (owned) { S.theme = t.id; save(); pickers(); draw(); return; }
        eco.purchase({ sku: t.sku, title: T('title') + ' · ' + T(t.k), price: t.price }).then((ok) => { if (ok) { S.theme = t.id; save(); pickers(); draw(); } });
      };
      th.appendChild(b);
    });
  }
  function labels() {
    document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = T(el.dataset.t); });
    document.title = T('title') + ' · Trip Timings Games';
    $('#wins').textContent = S.wins;
    $('#lvl').textContent = G ? T(LEVELS[G.level - 1].k) : '-';
    $('#guideBtn b').textContent = (S.level === 1 ? '🎬 ' : '') + T('guide') + (S.level === 1 ? '' : ' (15⭐)');
    pickers(); status();
  }
  document.addEventListener('tt:lang', labels);

  // ---------- setup ----------
  function rack() {
    const balls = [{ n: 0, x: (X0 + X1) / 2, y: Y1 - (Y1 - Y0) * 0.22, vx: 0, vy: 0, in: false }];
    // triangle near the top; 8 in the middle, a solid and a stripe in the back corners
    const order = [1, 9, 2, 10, 8, 3, 11, 4, 12, 13, 5, 14, 6, 15, 7];
    const ax = (X0 + X1) / 2, ay = Y0 + (Y1 - Y0) * 0.27;
    let k = 0;
    for (let row = 0; row < 5; row++) for (let i = 0; i <= row; i++) {
      balls.push({ n: order[k++], x: ax + (i - row / 2) * (R * 2 + 0.6), y: ay - row * (R * 1.75), vx: 0, vy: 0, in: false });
    }
    return balls;
  }
  function start() {
    G = { balls: rack(), level: S.level, turn: 'me', group: { me: null, cpu: null }, moving: false, aim: null, over: false, shot: null, guide: false, broke: false };
    $('#startPanel').hidden = true; $('#overPanel').hidden = true;
    document.body.classList.add('playing');
    hub.track('game_start', { game: 'pool', level: G.level });
    labels(); loop();
  }
  $('#startBtn').addEventListener('click', start);
  $('#againBtn').addEventListener('click', () => { $('#overPanel').hidden = true; $('#startPanel').hidden = false; document.body.classList.remove('playing'); });
  $('#newBtn').addEventListener('click', () => { if (G && G.moving) return; $('#startPanel').hidden = false; document.body.classList.remove('playing'); });
  $('#shareBtn').addEventListener('click', () => { if (eco) eco.share({ game: 'pool', text: T('shareText') }); });
  $('#guideBtn').addEventListener('click', () => {
    if (!G || G.over || G.turn !== 'me' || G.guide) return;
    const give = () => { G.guide = true; toast(T('guideOn')); hub.track('booster', { game: 'pool', id: 'guide' }); };
    if (!eco) return give();
    if (G.level === 1) eco.rewarded({ id: 'pool-guide', title: T('adFor', { x: T('guide') }) }).then((ok) => { if (ok) give(); });
    else if (eco.spend(15, 'pool-guide')) give(); else eco.toast(T('noCoins'));
  });

  const groupOf = (n) => (n === 0 ? 'cue' : n === 8 ? 'eight' : n < 8 ? 'solids' : 'stripes');
  const left = (g) => G.balls.filter((b) => !b.in && groupOf(b.n) === g).length;
  function status() {
    const el = $('#turn'); if (!G || G.over) { el.textContent = ''; return; }
    const g = G.group.me ? T('yours', { g: T(G.group.me) }) : T('open');
    el.textContent = (G.turn === 'me' ? T('you') : T('cpu')) + ' · ' + g;
    el.className = 'turn' + (G.turn === 'me' ? ' me' : '');
  }

  // ---------- physics ----------
  function shoot(angle, power) {
    const cue = G.balls[0];
    cue.vx = Math.cos(angle) * power; cue.vy = Math.sin(angle) * power;
    G.moving = true; G.aim = null; G.guide = false;
    G.shot = { by: G.turn, potted: [], firstHit: null };
    if (navigator.vibrate) try { navigator.vibrate(12); } catch (e) { /* ignore */ }
  }
  function step(dt) {
    const live = G.balls.filter((b) => !b.in);
    for (const b of live) {
      b.x += b.vx * dt; b.y += b.vy * dt;
      const sp = Math.hypot(b.vx, b.vy);
      if (sp > 0) { const ns = Math.max(0, sp - 140 * dt) * Math.pow(0.992, dt * 120); b.vx *= ns / sp; b.vy *= ns / sp; if (ns < 3) { b.vx = b.vy = 0; } }
      // pockets
      for (const [px, py] of POCKETS) if (Math.hypot(b.x - px, b.y - py) < POCKET) { b.in = true; b.vx = b.vy = 0; G.shot.potted.push(b.n); break; }
      if (b.in) continue;
      // cushions (pocket mouths are open)
      const nearPocket = POCKETS.some(([px, py]) => Math.hypot(b.x - px, b.y - py) < POCKET + 12);
      if (!nearPocket) {
        if (b.x < X0 + R) { b.x = X0 + R; b.vx = Math.abs(b.vx) * 0.8; }
        if (b.x > X1 - R) { b.x = X1 - R; b.vx = -Math.abs(b.vx) * 0.8; }
        if (b.y < Y0 + R) { b.y = Y0 + R; b.vy = Math.abs(b.vy) * 0.8; }
        if (b.y > Y1 - R) { b.y = Y1 - R; b.vy = -Math.abs(b.vy) * 0.8; }
      } else { // keep it on the table near a jaw
        b.x = Math.max(X0 - 12, Math.min(X1 + 12, b.x)); b.y = Math.max(Y0 - 12, Math.min(Y1 + 12, b.y));
      }
    }
    for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
      const a = live[i], b = live[j]; if (a.in || b.in) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      if (d >= 2 * R || d === 0) continue;
      const nx = dx / d, ny = dy / d, overlap = 2 * R - d;
      a.x -= nx * overlap / 2; a.y -= ny * overlap / 2; b.x += nx * overlap / 2; b.y += ny * overlap / 2;
      const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
      if (rel > 0) { a.vx -= rel * nx * 0.97; a.vy -= rel * ny * 0.97; b.vx += rel * nx * 0.97; b.vy += rel * ny * 0.97; }
      if (G.shot && G.shot.firstHit == null) { if (a.n === 0) G.shot.firstHit = b.n; else if (b.n === 0) G.shot.firstHit = a.n; }
    }
  }
  function settle() {
    G.moving = false;
    const s = G.shot, who = s.by, other = who === 'me' ? 'cpu' : 'me';
    const cueIn = s.potted.includes(0), eightIn = s.potted.includes(8);
    let keep = false, foul = cueIn;
    // groups are decided by the first ball potted after the break
    if (!G.group.me && G.broke) {
      const first = s.potted.find((n) => n !== 0 && n !== 8);
      if (first != null) { G.group[who] = groupOf(first); G.group[other] = groupOf(first) === 'solids' ? 'stripes' : 'solids'; }
    }
    G.broke = true;
    const mine = G.group[who];
    if (s.firstHit == null) foul = true;
    else if (mine) {
      const before = left(mine) + s.potted.filter((n) => groupOf(n) === mine).length; // own balls on the table before this shot
      if (before > 0 ? groupOf(s.firstHit) !== mine : s.firstHit !== 8) foul = true;
    }
    if (eightIn) {
      const cleared = mine && left(mine) === 0;
      return finish(cleared && !cueIn ? who : other, cleared ? null : T('early8'));
    }
    if (!foul && s.potted.some((n) => n !== 0 && (!mine || groupOf(n) === mine))) keep = true;
    if (cueIn) {
      const cue = G.balls[0]; cue.in = false; cue.vx = cue.vy = 0;
      cue.x = (X0 + X1) / 2; cue.y = Y1 - (Y1 - Y0) * 0.22;
      while (G.balls.some((b) => b !== cue && !b.in && Math.hypot(b.x - cue.x, b.y - cue.y) < 2 * R + 1)) cue.x += 2 * R;
      toast(T('foul'));
    }
    G.turn = keep ? who : other;
    status();
    if (G.turn === 'cpu') setTimeout(cpuShot, 700);
  }
  function finish(winner, why) {
    G.over = true;
    const won = winner === 'me';
    let stars = 0;
    if (won) { stars = LEVELS[G.level - 1].stars; S.wins++; save(); hub.setBest('pool', S.wins); if (eco) eco.add(stars, 'pool'); }
    hub.track('game_over', { game: 'pool', won, level: G.level });
    setTimeout(() => {
      document.body.classList.remove('playing');
      $('#overTitle').textContent = (why ? why + ' · ' : '') + (won ? T('win') : T('lose'));
      $('#overStars').textContent = stars ? T('stars', { n: stars }) : '';
      $('#overPanel').hidden = false;
      if (window.TTAds && TTAds.refresh) TTAds.refresh($('#overPanel .ad-slot'));
      labels();
    }, 700);
  }

  // ---------- computer ----------
  function clearPath(x1, y1, x2, y2, skip) {
    const dx = x2 - x1, dy = y2 - y1, L2 = dx * dx + dy * dy;
    return !G.balls.some((b) => {
      if (b.in || skip.includes(b)) return false;
      const t = Math.max(0, Math.min(1, ((b.x - x1) * dx + (b.y - y1) * dy) / L2));
      return Math.hypot(x1 + t * dx - b.x, y1 + t * dy - b.y) < 2 * R - 0.5;
    });
  }
  function cpuShot() {
    if (!G || G.over || G.turn !== 'cpu') return;
    const cue = G.balls[0], g = G.group.cpu;
    const targets = G.balls.filter((b) => !b.in && b.n !== 0 && (g ? (left(g) ? groupOf(b.n) === g : b.n === 8) : b.n !== 8));
    let best = null;
    for (const b of targets) for (const [px, py] of POCKETS) {
      const tx = px - b.x, ty = py - b.y, td = Math.hypot(tx, ty);
      const gx = b.x - tx / td * 2 * R, gy = b.y - ty / td * 2 * R; // ghost ball
      const ax = gx - cue.x, ay = gy - cue.y, ad = Math.hypot(ax, ay);
      const cut = (ax * tx + ay * ty) / (ad * td); // 1 = straight
      if (cut < 0.25) continue;
      if (!clearPath(cue.x, cue.y, gx, gy, [cue, b]) || !clearPath(b.x, b.y, px, py, [b])) continue;
      const score = cut * 2 - (ad + td) / 600;
      if (!best || score > best.score) best = { score, angle: Math.atan2(ay, ax), dist: ad + td };
    }
    const err = LEVELS[G.level - 1].err * (Math.random() * 2 - 1);
    if (best) shoot(best.angle + err, Math.min(1500, 380 + best.dist * 1.9));
    else { // no clean pot: hit the nearest legal ball firmly
      const t = targets.sort((a, b) => Math.hypot(a.x - cue.x, a.y - cue.y) - Math.hypot(b.x - cue.x, b.y - cue.y))[0] || G.balls.find((b) => !b.in && b.n);
      shoot(Math.atan2(t.y - cue.y, t.x - cue.x) + err * 2, 900);
    }
  }

  // ---------- input ----------
  const at = (e) => { const r = cv.getBoundingClientRect(), s = r.width / W; return [(e.clientX - r.left) / s, (e.clientY - r.top) / s]; };
  cv.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (!G || G.over || G.moving || G.turn !== 'me') return;
    const [x, y] = at(e); G.aim = { sx: x, sy: y, x, y };
    cv.setPointerCapture && cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointermove', (e) => { if (G && G.aim) { const [x, y] = at(e); G.aim.x = x; G.aim.y = y; } });
  cv.addEventListener('pointerup', () => {
    if (!G || !G.aim) return;
    const a = aimInfo(); G.aim = null;
    if (a && a.power > 60) shoot(a.angle, a.power);
  });
  // the cue points from the finger through the cue ball; pulling back from where you touched adds power
  function aimInfo() {
    const cue = G.balls[0], a = G.aim; if (!a) return null;
    const dx = cue.x - a.x, dy = cue.y - a.y; if (Math.hypot(dx, dy) < 4) return null;
    const pull = Math.hypot(a.x - a.sx, a.y - a.sy);
    return { angle: Math.atan2(dy, dx), power: Math.min(1500, pull * 9), pull };
  }

  // ---------- drawing ----------
  function toast(text) { const el = $('#toast'); el.textContent = text; el.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 1500); }
  function ball(b) {
    const c = COLORS[b.n > 8 ? b.n - 8 : b.n];
    ctx.save(); ctx.translate(b.x, b.y);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.arc(2, 3, R, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = b.n > 8 ? '#fff' : c; ctx.fillRect(-R, -R, 2 * R, 2 * R);
    if (b.n > 8) { ctx.fillStyle = c; ctx.fillRect(-R, -R * 0.55, 2 * R, R * 1.1); }
    if (b.n) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, R * 0.45, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#111'; ctx.font = '800 8px Cairo, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(b.n), 0, 0.5); }
    const g = ctx.createRadialGradient(-R * 0.4, -R * 0.4, 1, 0, 0, R);
    g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(0.4, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.35)');
    ctx.fillStyle = g; ctx.fillRect(-R, -R, 2 * R, 2 * R);
    ctx.restore();
  }
  function draw() {
    const th = THEMES.find((t) => t.id === S.theme) || THEMES[1];
    ctx.fillStyle = '#07041a'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = th.rail; ctx.beginPath(); (ctx.roundRect ? ctx.roundRect(24, 24, W - 48, H - 48, 18) : ctx.rect(24, 24, W - 48, H - 48)); ctx.fill();
    if (th.glow) { ctx.strokeStyle = th.glow; ctx.shadowColor = th.glow; ctx.shadowBlur = 16; ctx.lineWidth = 2; ctx.stroke(); ctx.shadowBlur = 0; }
    const cg = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, H / 1.6);
    cg.addColorStop(0, th.cloth); cg.addColorStop(1, 'rgba(0,0,0,.35)');
    ctx.fillStyle = th.cloth; ctx.fillRect(X0, Y0, X1 - X0, Y1 - Y0); ctx.fillStyle = cg; ctx.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
    // head string + spots
    ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.beginPath(); ctx.moveTo(X0, Y1 - (Y1 - Y0) * 0.22); ctx.lineTo(X1, Y1 - (Y1 - Y0) * 0.22); ctx.stroke();
    // diamonds on the rails
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    for (let k = 1; k < 4; k++) { const x = X0 + (X1 - X0) * k / 4; ctx.fillRect(x - 1.5, 33, 3, 3); ctx.fillRect(x - 1.5, H - 36, 3, 3); }
    for (let k = 1; k < 8; k++) { if (k === 4) continue; const y = Y0 + (Y1 - Y0) * k / 8; ctx.fillRect(33, y - 1.5, 3, 3); ctx.fillRect(W - 36, y - 1.5, 3, 3); }
    POCKETS.forEach(([x, y]) => { ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(x, y, POCKET, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.stroke(); });
    if (!G) { rack().forEach(ball); return; }
    G.balls.forEach((b) => { if (!b.in) ball(b); });
    // potted tray
    const tray = G.balls.filter((b) => b.in && b.n);
    tray.forEach((b, i) => { ball({ n: b.n, x: 34 + i * 22, y: 12 }); });
    // aiming
    const a = aimInfo();
    if (a && G.turn === 'me' && !G.moving) {
      const cue = G.balls[0], ux = Math.cos(a.angle), uy = Math.sin(a.angle);
      // guide: walk until a ball or cushion
      const long = G.guide || G.level === 1;
      let hx = cue.x, hy = cue.y, hit = null;
      for (let t = 0; t < (long ? 900 : 220); t += 2) {
        hx = cue.x + ux * t; hy = cue.y + uy * t;
        if (hx < X0 + R || hx > X1 - R || hy < Y0 + R || hy > Y1 - R) break;
        hit = G.balls.find((b) => !b.in && b.n && Math.hypot(b.x - hx, b.y - hy) < 2 * R);
        if (hit) break;
      }
      ctx.setLineDash([6, 6]); ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cue.x, cue.y); ctx.lineTo(hx, hy); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(hx, hy, R, 0, Math.PI * 2); ctx.stroke();
      if (hit && long) { // where the object ball will go
        const nx = hit.x - hx, ny = hit.y - hy, d = Math.hypot(nx, ny) || 1;
        ctx.strokeStyle = 'rgba(255,210,63,.85)'; ctx.beginPath(); ctx.moveTo(hit.x, hit.y); ctx.lineTo(hit.x + nx / d * 90, hit.y + ny / d * 90); ctx.stroke();
      }
      // cue stick, pulled back with power
      const back = 14 + Math.min(70, a.pull * 0.6);
      ctx.save(); ctx.translate(cue.x, cue.y); ctx.rotate(a.angle);
      const sg = ctx.createLinearGradient(-back - 240, 0, -back, 0); sg.addColorStop(0, '#3a1f0c'); sg.addColorStop(0.8, '#e8c48a'); sg.addColorStop(1, '#00f0ff');
      ctx.fillStyle = sg; ctx.fillRect(-back - 240, -3, 240, 6);
      ctx.restore();
      // power bar
      const pw = a.power / 1500;
      ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(W - 18, Y0, 8, Y1 - Y0);
      ctx.fillStyle = pw > 0.75 ? '#ff2b4d' : pw > 0.4 ? '#ffd23f' : '#7ad66b'; ctx.fillRect(W - 18, Y1 - (Y1 - Y0) * pw, 8, (Y1 - Y0) * pw);
    }
  }
  let raf = 0, last = 0;
  function loop() {
    cancelAnimationFrame(raf); last = performance.now();
    const f = (t) => {
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      if (G && G.moving) {
        for (let k = 0; k < 8; k++) step(dt / 8);
        if (G.balls.every((b) => b.in || (b.vx === 0 && b.vy === 0))) settle();
      }
      draw();
      raf = requestAnimationFrame(f);
    };
    raf = requestAnimationFrame(f);
  }
  function fit() {
    const box = cv.parentElement.getBoundingClientRect(), s = Math.min(box.width / W, box.height / H), dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.style.width = Math.floor(W * s) + 'px'; cv.style.height = Math.floor(H * s) + 'px';
    cv.width = Math.round(W * s * dpr); cv.height = Math.round(H * s * dpr);
    ctx.setTransform(s * dpr, 0, 0, s * dpr, 0, 0); draw();
  }
  window.addEventListener('resize', fit);
  labels(); fit();
  window.TTGame = { get state() { return G; } }; // read-only handle for automated QA
})();
