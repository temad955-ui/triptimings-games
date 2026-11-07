/* Pharaoh Memory — Trip Timings Games Hub
   Flip two cards at a time and match every pair before the timer runs out.
   Each level adds pairs and gives less time per pair. Helpers: 👁 a 2-second
   peek at every card (free with a rewarded ad on the easy levels, ⭐ later)
   and ⏱ +10 seconds (⭐). */
'use strict';
(() => {
  const hub = window.TTHub, eco = window.TTEco;
  const ICONS = ['🐫', '🏺', '🦂', '🌴', '☀️', '🐊', '🪲', '🔺', '👁️', '⚱️', '🐈', '🦅', '🌙', '🛶', '🗝️', '🐍', '🌊', '💎'];
  const EASY_LEVELS = 3, PEEK_COST = 30, TIME_COST = 40;
  // level → [cols, rows]
  const LAYOUT = [[3, 2], [4, 3], [4, 4], [5, 4], [6, 4], [6, 5], [6, 6]];
  const A = TTArcade.create({
    id: 'pharaoh-memory',
    str: {
      ar: { title: 'ذاكرة الفراعنة', howto: 'اقلب كارتين في كل مرة ووصّل كل الأزواج المتشابهة قبل ما الوقت يخلص. كل مستوى فيه كروت أكتر ووقت أقل.', hint: 'اضغط على كارت لتقلبه', peek: 'لمحة', time: '+10 ث', clear: 'المستوى {n} ✓', combo: 'تتابع ×{n}!', peekAd: 'شاهد الإعلان لتشوف كل الكروت لثانيتين', noCoins: 'نقاطك ⭐ مش كفاية' },
      en: { title: 'Pharaoh Memory', howto: 'Flip two cards at a time and match every pair before time runs out. Each level has more cards and less time.', hint: 'Tap a card to flip it', peek: 'Peek', time: '+10 s', clear: 'Level {n} ✓', combo: 'Combo ×{n}!', peekAd: 'Watch the ad to see every card for 2 seconds', noCoins: 'Not enough ⭐' },
    },
    onStart: reset,
    starsFor: () => G.level * 3 + Math.floor(G.score / 500),
    canContinue: () => G.level <= 4,
    onContinue: () => { G.left = 15; G.alive = true; tick(); },
  });
  const $ = (s) => document.querySelector(s);
  const box = $('#cards');
  let G = null, timer = 0;

  function reset() { G = { level: 1, score: 0, alive: true }; A.setScore(0); newLevel(); }
  function newLevel() {
    const [cols, rows] = LAYOUT[Math.min(G.level - 1, LAYOUT.length - 1)];
    const pairs = (cols * rows) / 2;
    const deck = ICONS.slice().sort(() => Math.random() - 0.5).slice(0, pairs);
    const cards = deck.concat(deck).sort(() => Math.random() - 0.5);
    // time per pair shrinks: 6 s on level 1 → 3 s from level 7
    const per = Math.max(3, 6.5 - G.level * 0.5);
    Object.assign(G, { cards: cards.map((v) => ({ v, open: false, done: false })), first: null, lock: false, combo: 0, left: Math.round(pairs * per + 6), total: 0 });
    G.total = G.left;
    $('#level').textContent = G.level;
    G.cols = cols; G.rows = rows; sizeGrid();
    box.innerHTML = '';
    G.cards.forEach((c, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'card';
      b.innerHTML = '<span class="back">☥</span><span class="face"></span>';
      b.querySelector('.face').textContent = c.v;
      b.setAttribute('aria-label', 'card ' + (i + 1));
      b.addEventListener('click', () => flip(i));
      box.appendChild(b); c.el = b;
    });
    updateTools(); tick();
  }
  // cards keep a 4:5 shape and always fit the board, whatever the grid size
  function sizeGrid() {
    if (!G || !G.cols) return;
    const r = box.getBoundingClientRect(), gap = 8;
    const w = Math.floor(Math.min((r.width - (G.cols - 1) * gap) / G.cols, ((r.height - (G.rows - 1) * gap) / G.rows) * 0.8, 120));
    box.style.gridTemplateColumns = 'repeat(' + G.cols + ', ' + Math.max(30, w) + 'px)';
  }
  window.addEventListener('resize', sizeGrid);

  function flip(i) {
    const c = G.cards[i];
    if (!G.alive || G.lock || c.open || c.done) return;
    c.open = true; c.el.classList.add('open');
    if (G.first == null) { G.first = i; return; }
    const a = G.cards[G.first]; G.first = null;
    if (a.v === c.v) {
      a.done = c.done = true; a.el.classList.add('done'); c.el.classList.add('done');
      G.combo++;
      G.score += 100 + (G.combo - 1) * 50;
      if (G.combo >= 3) A.toast(A.T('combo', { n: G.combo }));
      if (navigator.vibrate) try { navigator.vibrate(12); } catch (e) { /* ignore */ }
      A.setScore(G.score);
      if (G.cards.every((x) => x.done)) levelUp();
    } else {
      G.combo = 0; G.lock = true;
      setTimeout(() => { a.open = c.open = false; a.el.classList.remove('open'); c.el.classList.remove('open'); G.lock = false; }, 650);
    }
  }
  function levelUp() {
    clearTimeout(timer);
    G.score += Math.round(G.left) * 10 * G.level;
    A.setScore(G.score);
    A.toast(A.T('clear', { n: G.level }));
    G.level++;
    setTimeout(newLevel, 900);
  }
  function tick() {
    clearTimeout(timer);
    $('#timeFill').style.transform = 'scaleX(' + Math.max(0, G.left / G.total) + ')';
    $('#timeFill').classList.toggle('low', G.left <= 5);
    if (G.left <= 0) { G.alive = false; updateTools(); A.gameOver(G.score); return; }
    timer = setTimeout(() => { if (!document.hidden) G.left -= 0.25; tick(); }, 250);
  }

  // ---------- helpers ----------
  const peekBtn = $('#peekBtn'), timeBtn = $('#timeBtn');
  function updateTools() {
    const easy = G && G.level <= EASY_LEVELS;
    peekBtn.disabled = timeBtn.disabled = !G || !G.alive;
    peekBtn.querySelector('b').textContent = (easy ? '🎬 ' : '') + A.T('peek') + (easy ? '' : ' (' + PEEK_COST + '⭐)');
    timeBtn.querySelector('b').textContent = A.T('time') + ' (' + TIME_COST + '⭐)';
  }
  function peek() {
    G.lock = true;
    G.cards.forEach((c) => c.el.classList.add('open'));
    setTimeout(() => { G.cards.forEach((c) => { if (!c.done && !c.open) c.el.classList.remove('open'); }); G.lock = false; }, 2000);
    hub.track('booster', { game: 'pharaoh-memory', id: 'peek' });
  }
  peekBtn.addEventListener('click', () => {
    if (!G || !G.alive || G.lock || !eco) return;
    if (G.first != null) { const c = G.cards[G.first]; c.open = false; c.el.classList.remove('open'); G.first = null; }
    if (G.level <= EASY_LEVELS) {
      const paused = G.left; clearTimeout(timer);
      eco.rewarded({ id: 'memory-peek', title: A.T('peekAd') }).then((ok) => { G.left = paused; tick(); if (ok) peek(); });
    } else if (eco.spend(PEEK_COST, 'memory-peek')) peek();
    else eco.toast(A.T('noCoins'));
  });
  timeBtn.addEventListener('click', () => {
    if (!G || !G.alive || !eco) return;
    if (eco.spend(TIME_COST, 'memory-time')) { G.left += 10; G.total = Math.max(G.total, G.left); hub.track('booster', { game: 'pharaoh-memory', id: 'time' }); }
    else eco.toast(A.T('noCoins'));
  });
  document.addEventListener('tt:lang', updateTools);
  updateTools();
})();
