/* Pharaoh Chess — Trip Timings Games Hub
   Chess against the computer: easy / medium / hard (engine.js).
   Tap a piece, then a highlighted square. Pawns promote to a queen.
   Boosters: ↩️ take back (free on easy, otherwise rewarded ad or ⭐) and
   💡 best move (rewarded ad on easy, ⭐ on medium/hard).
   Premium board themes are in-app purchases; ⭐ are paid for wins and draws. */
'use strict';
(() => {
  const hub = window.TTHub, eco = window.TTEco, C = window.TTChess;
  const $ = (s) => document.querySelector(s);
  const STR = {
    ar: { title: 'شطرنج الفراعنة', howto: 'العب شطرنج ضد الكمبيوتر. اضغط على القطعة وبعدين على المربع المضيء. اختار المستوى واللون وشكل الرقعة.', wins: 'انتصارات', levelL: 'المستوى', play: 'ابدأ المباراة', again: 'مباراة جديدة', share: '📤 تحدَّ أصحابك +⭐', newGame: 'جديدة',
      easy: 'سهل', medium: 'متوسط', hard: 'صعب', white: '⚪ أبيض', black: '⚫ أسود', you: 'دورك', thinking: 'الكمبيوتر بيفكر…', check: 'كش ملك!', undo: 'رجوع', hint: 'أفضل نقلة',
      win: 'كش مات! كسبت 🏆', lose: 'كش مات… الكمبيوتر كسب', draw: 'تعادل 🤝', stale: 'تعادل (لا توجد نقلات)', stars: '+{n} ⭐ في محفظتك', noCoins: 'نقاطك ⭐ مش كفاية', adFor: 'شاهد الإعلان لتحصل على: {x}',
      shareText: 'كسبت الكمبيوتر في شطرنج الفراعنة على مستوى {l}! تقدر تعملها؟', thClassic: 'كلاسيك', thNeon: 'نيون', thPapyrus: 'بردي', thMarble: 'رخام', bought: 'مفتوح', free: 'مجاني' },
    en: { title: 'Pharaoh Chess', howto: 'Play chess against the computer. Tap a piece, then a highlighted square. Pick a level, your colour and a board.', wins: 'Wins', levelL: 'Level', play: 'Start match', again: 'New match', share: '📤 Challenge friends +⭐', newGame: 'New',
      easy: 'Easy', medium: 'Medium', hard: 'Hard', white: '⚪ White', black: '⚫ Black', you: 'Your move', thinking: 'Computer is thinking…', check: 'Check!', undo: 'Undo', hint: 'Best move',
      win: 'Checkmate! You win 🏆', lose: 'Checkmate… the computer wins', draw: 'Draw 🤝', stale: 'Stalemate (draw)', stars: '+{n} ⭐ added to your wallet', noCoins: 'Not enough ⭐', adFor: 'Watch the ad to get: {x}',
      shareText: 'I beat the computer at Pharaoh Chess on {l}! Can you?', thClassic: 'Classic', thNeon: 'Neon', thPapyrus: 'Papyrus', thMarble: 'Marble', bought: 'Owned', free: 'Free' },
  };
  const T = (k, v) => { let s = (STR[hub.lang] || STR.en)[k]; if (s == null) s = k; for (const x in v || {}) s = s.split('{' + x + '}').join(v[x]); return s; };
  const LEVELS = [{ id: 1, k: 'easy', stars: 15 }, { id: 2, k: 'medium', stars: 35 }, { id: 3, k: 'hard', stars: 70 }];
  const THEMES = [
    { id: 'classic', k: 'thClassic', light: '#f0d9b5', dark: '#b58863' },
    { id: 'neon', k: 'thNeon', light: '#2a2060', dark: '#120b33', line: '#00f0ff' },
    { id: 'papyrus', k: 'thPapyrus', light: '#f3e2b3', dark: '#c49a52', sku: 'chess-theme-papyrus', price: '$0.99' },
    { id: 'marble', k: 'thMarble', light: '#eef1f5', dark: '#5b6b80', sku: 'chess-theme-marble', price: '$0.99' },
  ];
  const S = Object.assign({ level: 1, color: 'w', theme: 'neon', wins: 0 }, hub.load('chess.settings', {}));
  const save = () => hub.store('chess.settings', S);

  const cv = document.getElementById('board'), ctx = cv.getContext('2d');
  const SZ = 360;
  let G = null;

  // ---------- menu ----------
  function pickers() {
    const lv = $('#pickLevel'); lv.innerHTML = '';
    LEVELS.forEach((l) => { const b = document.createElement('button'); b.type = 'button'; b.className = S.level === l.id ? 'on' : ''; b.innerHTML = T(l.k) + '<small>+' + l.stars + ' ⭐</small>'; b.onclick = () => { S.level = l.id; save(); pickers(); }; lv.appendChild(b); });
    const co = $('#pickColor'); co.innerHTML = '';
    ['w', 'b'].forEach((c) => { const b = document.createElement('button'); b.type = 'button'; b.className = S.color === c ? 'on' : ''; b.textContent = T(c === 'w' ? 'white' : 'black'); b.onclick = () => { S.color = c; save(); pickers(); }; co.appendChild(b); });
    const th = $('#pickTheme'); th.innerHTML = '';
    THEMES.forEach((t) => {
      const owned = !t.sku || (eco && eco.owns(t.sku));
      const b = document.createElement('button'); b.type = 'button'; b.className = S.theme === t.id ? 'on' : '';
      b.innerHTML = '<i style="background:linear-gradient(90deg,' + t.light + ' 50%,' + t.dark + ' 50%)"></i>' + T(t.k) + '<small>' + (owned ? (t.sku ? T('bought') : T('free')) : '🔒 ' + t.price) + '</small>';
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
    pickers(); tools(); turnText();
  }
  document.addEventListener('tt:lang', labels);
  if (eco && eco.on) eco.on(pickers);

  function start() {
    G = { pos: C.fromFEN(C.START), level: S.level, me: S.color, sel: -1, moves: [], hint: null, over: false, hist: [], busy: false };
    $('#startPanel').hidden = true; $('#overPanel').hidden = true;
    document.body.classList.add('playing');
    hub.track('game_start', { game: 'chess', level: G.level });
    labels(); draw();
    if (G.me === 'b') aiMove();
  }
  $('#startBtn').addEventListener('click', start);
  $('#againBtn').addEventListener('click', () => { $('#overPanel').hidden = true; $('#startPanel').hidden = false; document.body.classList.remove('playing'); });
  $('#newBtn').addEventListener('click', () => { if (G && G.busy) return; $('#startPanel').hidden = false; document.body.classList.remove('playing'); });
  $('#shareBtn').addEventListener('click', () => { if (eco) eco.share({ game: 'chess', text: T('shareText', { l: T(LEVELS[(G ? G.level : 1) - 1].k) }) }); });

  // ---------- play ----------
  const flip = () => G && G.me === 'b';
  const toScreen = (i) => { const f = i & 7, r = i >> 3; return flip() ? [7 - f, 7 - r] : [f, r]; };
  const fromScreen = (x, y) => (flip() ? (7 - y) * 8 + (7 - x) : y * 8 + x);

  function turnText() {
    const el = $('#turn'); if (!G) { el.textContent = ''; return; }
    if (G.over) { el.textContent = ''; return; }
    const mine = G.pos.side === G.me;
    el.textContent = (C.inCheck(G.pos) ? T('check') + ' · ' : '') + (mine ? T('you') : T('thinking'));
    el.className = 'turn' + (mine ? ' me' : '');
  }
  function doMove(m) {
    G.hist.push(G.pos);
    G.pos = C.play(G.pos, m);
    G.sel = -1; G.moves = []; G.hint = null;
    if (navigator.vibrate) try { navigator.vibrate(G.pos.captured !== '.' ? 18 : 6); } catch (e) { /* ignore */ }
    draw(); turnText();
    const st = C.status(G.pos);
    if (st === 'check') L_toast(T('check'));
    if (st !== 'play' && st !== 'check') { end(st); return true; }
    return false;
  }
  function aiMove() {
    G.busy = true; turnText();
    setTimeout(() => {
      const m = C.bestMove(G.pos, G.level);
      G.busy = false;
      if (m && !G.over) doMove(m);
      turnText();
    }, 250);
  }
  function tap(i) {
    if (!G || G.over || G.busy || G.pos.side !== G.me) return;
    const p = G.pos.board[i];
    const m = G.moves.find((x) => x.to === i && (!x.promo || x.promo === 'q'));
    if (G.sel >= 0 && m) { if (!doMove(m)) aiMove(); return; }
    if (C.colorOf(p) === G.me) { G.sel = i; G.moves = C.legal(G.pos).filter((x) => x.from === i); }
    else { G.sel = -1; G.moves = []; }
    draw();
  }
  function end(st) {
    G.over = true;
    let title, stars = 0;
    if (st === 'mate') {
      const iWon = G.pos.side !== G.me;
      title = iWon ? T('win') : T('lose');
      if (iWon) { stars = LEVELS[G.level - 1].stars; S.wins++; save(); hub.setBest('chess', S.wins); }
    } else { title = st === 'stalemate' ? T('stale') : T('draw'); stars = 5; }
    if (stars && eco) eco.add(stars, 'chess');
    hub.track('game_over', { game: 'chess', result: st, level: G.level });
    setTimeout(() => {
      document.body.classList.remove('playing');
      $('#overTitle').textContent = title;
      $('#overStars').textContent = stars ? T('stars', { n: stars }) : '';
      $('#overPanel').hidden = false;
      if (window.TTAds && TTAds.refresh) TTAds.refresh($('#overPanel .ad-slot'));
      labels();
    }, 900);
  }
  cv.addEventListener('pointerdown', (e) => {
    e.preventDefault(); if (!G) return;
    const r = cv.getBoundingClientRect(), s = r.width / SZ;
    const x = Math.floor((e.clientX - r.left) / s / (SZ / 8)), y = Math.floor((e.clientY - r.top) / s / (SZ / 8));
    if (x >= 0 && x < 8 && y >= 0 && y < 8) tap(fromScreen(x, y));
  });

  // ---------- boosters ----------
  function booster(name, cost, freeOnEasy, adOnEasy, fn) {
    if (!eco || (freeOnEasy && G.level === 1)) return fn();
    if (adOnEasy && G.level === 1) return eco.rewarded({ id: 'chess-' + name, title: T('adFor', { x: T(name) }) }).then((ok) => { if (ok) fn(); });
    if (eco.spend(cost, 'chess-' + name)) fn(); else eco.toast(T('noCoins'));
  }
  function tools() {
    const easy = !G || G.level === 1;
    $('#undoBtn b').textContent = T('undo') + (easy ? '' : ' (10⭐)');
    $('#hintBtn b').textContent = (easy ? '🎬 ' : '') + T('hint') + (easy ? '' : ' (25⭐)');
  }
  $('#undoBtn').addEventListener('click', () => {
    if (!G || G.over || G.busy || G.hist.length < 2 || G.pos.side !== G.me) return;
    booster('undo', 10, true, false, () => { G.hist.pop(); G.pos = G.hist.pop(); G.sel = -1; G.moves = []; G.hint = null; draw(); turnText(); });
  });
  $('#hintBtn').addEventListener('click', () => {
    if (!G || G.over || G.busy || G.pos.side !== G.me) return;
    booster('hint', 25, false, true, () => { G.hint = C.bestMove(G.pos, 3); draw(); hub.track('booster', { game: 'chess', id: 'hint' }); });
  });

  // ---------- drawing ----------
  const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
  function draw() {
    const th = THEMES.find((t) => t.id === S.theme) || THEMES[1], c = SZ / 8;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      ctx.fillStyle = (x + y) % 2 ? th.dark : th.light; ctx.fillRect(x * c, y * c, c, c);
    }
    if (th.line) { ctx.strokeStyle = 'rgba(0,240,255,.25)'; ctx.lineWidth = 1; for (let k = 0; k <= 8; k++) { ctx.beginPath(); ctx.moveTo(k * c, 0); ctx.lineTo(k * c, SZ); ctx.moveTo(0, k * c); ctx.lineTo(SZ, k * c); ctx.stroke(); } }
    // coordinates
    ctx.font = '700 10px Cairo, sans-serif'; ctx.textAlign = 'left';
    for (let k = 0; k < 8; k++) {
      const f = flip() ? 7 - k : k, r = flip() ? k + 1 : 8 - k;
      ctx.fillStyle = (k + 7) % 2 ? th.light : th.dark; ctx.fillText('abcdefgh'[f], k * c + 3, SZ - 3);
      ctx.fillStyle = k % 2 ? th.light : th.dark; ctx.fillText(String(r), 2, k * c + 11);
    }
    if (!G) { drawPieces(C.fromFEN(C.START).board, c); return; }
    const mark = (i, color) => { const [x, y] = toScreen(i); ctx.fillStyle = color; ctx.fillRect(x * c, y * c, c, c); };
    if (G.pos.last) { mark(G.pos.last.from, 'rgba(255,210,63,.35)'); mark(G.pos.last.to, 'rgba(255,210,63,.45)'); }
    if (C.inCheck(G.pos)) { const k = G.pos.board.indexOf(G.pos.side === 'w' ? 'K' : 'k'); mark(k, 'rgba(255,43,77,.6)'); }
    if (G.sel >= 0) mark(G.sel, 'rgba(0,240,255,.45)');
    if (G.hint) { mark(G.hint.from, 'rgba(122,214,107,.55)'); mark(G.hint.to, 'rgba(122,214,107,.55)'); }
    drawPieces(G.pos.board, c);
    G.moves.forEach((m) => {
      const [x, y] = toScreen(m.to);
      ctx.fillStyle = 'rgba(0,240,255,.75)'; ctx.beginPath();
      if (G.pos.board[m.to] !== '.') { ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,240,255,.8)'; ctx.arc(x * c + c / 2, y * c + c / 2, c * 0.44, 0, Math.PI * 2); ctx.stroke(); }
      else { ctx.arc(x * c + c / 2, y * c + c / 2, c * 0.14, 0, Math.PI * 2); ctx.fill(); }
    });
  }
  function drawPieces(board, c) {
    const neon = !!(THEMES.find((t) => t.id === S.theme) || {}).line;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = Math.round(c * 0.78) + 'px "DejaVu Sans", "Segoe UI Symbol", "Noto Sans Symbols2", "Apple Symbols", serif';
    for (let i = 0; i < 64; i++) {
      const p = board[i]; if (p === '.') continue;
      const [x, y] = G ? toScreen(i) : [i & 7, i >> 3];
      const w = p === p.toUpperCase(), g = GLYPH[p.toLowerCase()] + '︎';
      const cx = x * c + c / 2, cy = y * c + c / 2 + c * 0.04;
      ctx.lineWidth = 3; ctx.strokeStyle = w ? '#1a1030' : neon ? '#2a0030' : '#e8e0ff';
      ctx.shadowColor = w ? 'rgba(0,240,255,.6)' : 'rgba(255,43,214,.6)'; ctx.shadowBlur = 6;
      ctx.strokeText(g, cx, cy);
      ctx.shadowBlur = 0; ctx.fillStyle = w ? '#ffffff' : neon ? '#ff4fdc' : '#1a1030';
      ctx.fillText(g, cx, cy);
    }
    ctx.textBaseline = 'alphabetic';
  }
  function L_toast(text) {
    const el = $('#toast'); el.textContent = text; el.classList.add('show');
    clearTimeout(L_toast.t); L_toast.t = setTimeout(() => el.classList.remove('show'), 1400);
  }

  function fit() {
    const box = cv.parentElement.getBoundingClientRect(), s = Math.min(box.width, box.height) / SZ, dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.style.width = Math.floor(SZ * s) + 'px'; cv.style.height = Math.floor(SZ * s) + 'px';
    cv.width = Math.round(SZ * s * dpr); cv.height = Math.round(SZ * s * dpr);
    ctx.setTransform(s * dpr, 0, 0, s * dpr, 0, 0); draw();
  }
  window.addEventListener('resize', fit);
  labels(); fit();
  window.TTGame = { get state() { return G; } }; // read-only handle for automated QA
})();
