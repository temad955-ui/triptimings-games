/* =========================================================================
   Dominoes — one app, four ways to play (Trip Timings Games Hub)
   UI, board renderer, AI turns, boosters, shop and rewards.
   Rules live in engine.js.
   ========================================================================= */
'use strict';
(() => {
  const hub = window.TTHub, eco = window.TTEco, E = window.DominoEngine;
  const $ = (s) => document.querySelector(s);
  const cfgStore = (k, f) => hub.load('dom.' + k, f);
  const cfgSave = (k, v) => hub.store('dom.' + k, v);

  // ------------------------------------------------------------ strings
  const STR = {
    ar: {
      title: 'دومينو', sub: 'كل أنواع الدومينو في لعبة واحدة', chooseMode: 'اختر طريقة اللعب', chooseDiff: 'المستوى',
      play: 'العب الآن', shop: '🎨 المتجر والأطقم', invite: '🤝 ادعُ صديق +⭐', hint: 'تلميح', peek: 'كشف',
      easy: 'سهل', medium: 'متوسط', hard: 'صعب',
      noteEasy: '🎬 مساعدات مجانية بمشاهدة إعلان · مكافأة الفوز {r} ⭐',
      noteMedium: '🎬 مساعدات مجانية بمشاهدة إعلان · مكافأة الفوز {r} ⭐',
      noteHard: '🔥 كمبيوتر ذكي يتذكر ما ينقصك · مكافأة {r} ⭐ · المساعدات بالنقاط فقط',
      target: 'حتى {n}', you: 'أنت', us: 'إحنا', them: 'هم', cpu: 'الكمبيوتر', partner: 'شريكك', right: 'يمين', left: 'يسار',
      yourTurn: 'دورك — اختر حجرًا', thinking: '{p} يفكر…', passed: '{p}: باص', drew: '{p} سحب حجرًا',
      mustDraw: 'لا يوجد لعب — اسحب من الكومة', mustPass: 'لا يوجد لعب — باص', drawBtn: '🂠 اسحب ({n})', passBtn: 'باص ⏭',
      pickSide: 'اختر الطرف', onEnd: 'على {v}', fives: '+{n} خمسات!',
      wonRound: 'كسبت الجولة! 🎉', wonRoundT: 'فريقكم كسب الجولة! 🎉', lostRound: 'خسرت الجولة', lostRoundT: 'الفريق الآخر كسب الجولة',
      blocked: 'اللعبة اتقفلت 🔒', blockedTie: 'تعادل في النقط — لا نقاط لأحد', roundPts: '+{n} نقطة لـ {w}',
      next: 'الجولة التالية', wonMatch: 'فزت بالمباراة! 🏆', lostMatch: 'خسرت المباراة', matchPts: 'ربحت {n} ⭐',
      again: 'مباراة جديدة', menu: 'القائمة', double: '🎬 ضاعف المكافأة', share: '📤 شارك +⭐', hintNone: 'لا يوجد لعب متاح',
      noBoost: 'لا يوجد لديك {b}', getBoost: 'احصل على {b}', watchAd: '🎬 شاهد إعلان (+1)', buyCoins: '{n} ⭐', notEnough: 'نقاطك غير كافية',
      boostAdTitle: 'شاهد الإعلان لتحصل على {b} مجانًا', doubleAdTitle: 'شاهد الإعلان لمضاعفة مكافأتك',
      hardNoAds: 'في المستوى الصعب المساعدات بالنقاط فقط', got: '+1 {b}',
      shopTitle: 'المتجر', sets: 'أطقم الدومينو', boosters: 'المساعدات', equip: 'استخدم', equipped: 'مُستخدم ✓',
      free: 'مجاني', shareUnlock: 'شارك {n} مرات', proTitle: 'Trip Timings Pro', proText: 'كل الأطقم المميزة + 10 تلميحات + 10 كشف',
      proOwned: 'Pro مفعّل ✓', or: 'أو', hintDesc: 'يوضح لك أفضل حركة', peekDesc: 'يكشف أحجار المنافسين 4 ثوانٍ',
      simNote: 'المشتريات والإعلانات هنا محاكاة على الويب. في تطبيق أندرويد تعمل عبر Google Play وAdMob.',
      stats: 'لعبت {p} · فزت {w}', proUpsell: 'جرّب أطقم Pro الفاخرة للمستويات الصعبة',
      pipsLeft: '{n} نقطة', round: 'الجولة {n}', shareText: 'فزت في الدومينو على تريب تايمنجز!',
      shared: 'اكتشف كل أنواع الدومينو!', quit: 'إنهاء المباراة والعودة للقائمة؟', resume: 'متابعة', leave: 'خروج',
    },
    en: {
      title: 'Dominoes', sub: 'Every way to play dominoes, in one game', chooseMode: 'Choose a game mode', chooseDiff: 'Difficulty',
      play: 'Play now', shop: '🎨 Shop & sets', invite: '🤝 Invite a friend +⭐', hint: 'Hint', peek: 'Peek',
      easy: 'Easy', medium: 'Medium', hard: 'Hard',
      noteEasy: '🎬 Free helpers for watching an ad · win reward {r} ⭐',
      noteMedium: '🎬 Free helpers for watching an ad · win reward {r} ⭐',
      noteHard: '🔥 Smart AI that remembers what you lack · reward {r} ⭐ · helpers cost points',
      target: 'to {n}', you: 'You', us: 'Us', them: 'Them', cpu: 'CPU', partner: 'Partner', right: 'Right', left: 'Left',
      yourTurn: 'Your turn: pick a tile', thinking: '{p} is thinking…', passed: '{p} passed', drew: '{p} drew a tile',
      mustDraw: 'No move: draw from the boneyard', mustPass: 'No move: pass', drawBtn: '🂠 Draw ({n})', passBtn: 'Pass ⏭',
      pickSide: 'Choose an end', onEnd: 'On {v}', fives: '+{n} fives!',
      wonRound: 'You won the round! 🎉', wonRoundT: 'Your team won the round! 🎉', lostRound: 'You lost the round', lostRoundT: 'The other team won the round',
      blocked: 'Blocked game 🔒', blockedTie: 'Tied on pips: no points', roundPts: '+{n} points to {w}',
      next: 'Next round', wonMatch: 'You won the match! 🏆', lostMatch: 'You lost the match', matchPts: 'You earned {n} ⭐',
      again: 'New match', menu: 'Menu', double: '🎬 Double the reward', share: '📤 Share +⭐', hintNone: 'No playable tile',
      noBoost: 'No {b} left', getBoost: 'Get {b}', watchAd: '🎬 Watch ad (+1)', buyCoins: '{n} ⭐', notEnough: 'Not enough points',
      boostAdTitle: 'Watch the ad to get a free {b}', doubleAdTitle: 'Watch the ad to double your reward',
      hardNoAds: 'On Hard, helpers cost points', got: '+1 {b}',
      shopTitle: 'Shop', sets: 'Domino sets', boosters: 'Helpers', equip: 'Use', equipped: 'In use ✓',
      free: 'Free', shareUnlock: 'Share {n} times', proTitle: 'Trip Timings Pro', proText: 'All premium sets + 10 hints + 10 peeks',
      proOwned: 'Pro active ✓', or: 'or', hintDesc: 'Shows your best move', peekDesc: 'Reveals rival tiles for 4 seconds',
      simNote: 'Purchases and ads are simulated on the web. In the Android app they run through Google Play and AdMob.',
      stats: 'Played {p} · won {w}', proUpsell: 'Try the luxury Pro sets made for hard mode',
      pipsLeft: '{n} pips', round: 'Round {n}', shareText: 'I just won at Dominoes on Trip Timings!',
      shared: 'Discover every kind of dominoes!', quit: 'End this match and go back to the menu?', resume: 'Resume', leave: 'Leave',
    },
  };
  const T = (k, v) => { let s = (STR[hub.lang] || STR.en)[k]; if (s == null) s = k; for (const x in v || {}) s = s.split('{' + x + '}').join(v[x]); return s; };
  const tt = (d) => hub.t(d);

  // ------------------------------------------------------------ catalogue
  const MODES = [
    { id: 'arabic', icon: '🤝', name: { ar: 'دومينو عربي (شراكة)', en: 'Arabic Partners' },
      desc: { ar: '4 لاعبين، أنت وشريكك ضد فريق. بدون سحب، والباص لما تتقفل.', en: '4 players, you and a partner vs a team. No drawing; pass when stuck.' } },
    { id: 'draw', icon: '🂠', name: { ar: 'دومينو السحب (أمريكي)', en: 'Draw (American)' },
      desc: { ar: 'اسحب من الكومة حتى تجد حجرًا يركب. الفائز يأخذ نقط المنافس.', en: 'Draw from the boneyard until you can play. Winner takes the rival’s pips.' } },
    { id: 'block', icon: '🧱', name: { ar: 'دومينو البلوك', en: 'Block' },
      desc: { ar: 'بدون سحب: لو مفيش لعب تقول باص. تكتيك وحسابات.', en: 'No drawing: if you can’t play, you pass. Pure tactics.' } },
    { id: 'fives', icon: '5️⃣', name: { ar: 'الخمسات (All Fives)', en: 'All Fives (Muggins)' },
      desc: { ar: 'اجمع نقطًا كل ما مجموع الأطراف يقبل القسمة على 5.', en: 'Score whenever the open ends add up to a multiple of five.' } },
    // Domino 31 is its own engine (repo temad955-ui/domino31), opened from this menu
    { id: 'd31', icon: '🎯', link: '../domino31/', tag: { ar: '31 بالظبط · 2–4 👤', en: 'Exactly 31 · 2–4 👤' },
      name: { ar: 'دومينو 31 (مصري)', en: 'Domino 31 (Egyptian)' },
      desc: { ar: 'وصّل مجموع أحجارك لـ 31 بالظبط أو نام صح. ضد الكمبيوتر أو مع أصحابك.', en: 'Reach exactly 31 or call it right. Play the computer or friends.' } },
  ];
  const DIFF = {
    easy:   { reward: 20, delay: 750, freeHint: 1 },
    medium: { reward: 40, delay: 700, freeHint: 0 },
    hard:   { reward: 80, delay: 650, freeHint: 0 },
  };
  const BOOST = {
    hint: { cost: 30, icon: '💡' },
    peek: { cost: 50, icon: '👁️' },
  };
  // Tile sets. face/edge/pip/line colours + table gradient. sku = in-app product id.
  const SETS = [
    { id: 'neon', free: true, name: { ar: 'نيون', en: 'Neon' }, face: '#120c2e', edge: '#00f0ff', pip: '#00f0ff', line: '#3a2f7a', table: ['#1b1150', '#07041a'], glow: '#00f0ff' },
    { id: 'ivory', free: true, name: { ar: 'عاجي كلاسيك', en: 'Classic Ivory' }, face: '#f7f1e3', edge: '#d9cdb0', pip: '#1b1b1b', line: '#bdb194', table: ['#0f6b45', '#06331f'] },
    { id: 'friend', share: true, name: { ar: 'الصداقة', en: 'Friendship' }, face: '#fff1f5', edge: '#ff6b8b', pip: '#e0306b', line: '#f5b3c4', table: ['#4a1530', '#1a0612'] },
    { id: 'pharaoh', sku: 'set_pharaoh_gold', price: '$1.99', coins: 2500, name: { ar: 'ذهب الفراعنة', en: 'Pharaoh Gold' }, face: '#1d1407', edge: '#f2b544', pip: '#ffd27a', line: '#6b4a12', table: ['#3d2a08', '#120b02'], glow: '#f2b544' },
    { id: 'nile', sku: 'set_nile_marble', price: '$0.99', coins: 1500, name: { ar: 'رخام النيل', en: 'Nile Marble' }, face: '#eef7f6', edge: '#2ec4b6', pip: '#0b5d61', line: '#a8d8d3', table: ['#0b4a5a', '#05202a'] },
    { id: 'cyber', sku: 'set_cyber_violet', price: '$1.99', coins: 2500, name: { ar: 'سايبر بنفسجي', en: 'Cyber Violet' }, face: '#19042b', edge: '#ff2bd6', pip: '#ff2bd6', line: '#5a1a72', table: ['#2a0748', '#07010f'], glow: '#ff2bd6' },
  ];
  const PRO = { sku: 'pro_pass', price: '$4.99' };

  // ------------------------------------------------------------ settings
  const S = Object.assign({ mode: 'arabic', diff: 'easy', set: 'neon', sound: true }, cfgStore('settings', {}));
  const ST = Object.assign({ played: 0, won: 0 }, cfgStore('stats', {}));
  const saveS = () => cfgSave('settings', S);
  if (!E.MODES[S.mode]) S.mode = 'arabic';
  const ownsSet = (s) => s.free || eco.owns('pro_pass') || eco.owns(s.sku || ('set-' + s.id)) || (s.share && eco.owns('set-friend'));
  const curSet = () => { const s = SETS.find((x) => x.id === S.set) || SETS[0]; return ownsSet(s) ? s : SETS[0]; };

  // ------------------------------------------------------------ sound
  let actx = null;
  function clack(f) {
    if (!S.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = 'triangle'; o.frequency.value = f || 420;
      g.gain.setValueAtTime(0.18, actx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.09);
      o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + 0.1);
    } catch (e) { /* no audio */ }
    if (navigator.vibrate) navigator.vibrate(8);
  }

  // ------------------------------------------------------------ game state
  let G = null;          // engine state
  let busy = false;      // AI move / animation in progress
  let pick = null;       // { tile, moves } when the human must choose an end
  let hintMv = null;     // highlighted hint
  let peekUntil = 0;
  let glow = null;       // last placed tile { side, idx, until }
  let aiTimer = 0;
  let matchReward = 0;

  const seatOf = (i) => (G.players.length === 2 ? ['bottom', 'top'][i] : ['bottom', 'right', 'top', 'left'][i]);
  function playerName(i) {
    if (i === 0) return T('you');
    if (G.players.length === 2) return T('cpu');
    return i === 2 ? T('partner') : T('cpu') + ' ' + (i === 1 ? T('right') : T('left'));
  }
  const human = () => G.players[0];

  // ------------------------------------------------------------ tile SVG (hand, reveal, shop)
  const PIPS = {
    0: [], 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]],
    4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
    6: [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 0], [1, 1]],
  };
  function tileSVG(a, b, set, horizontal) {
    set = set || curSet();
    const W = horizontal ? 100 : 50, H = horizontal ? 50 : 100;
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">' +
      '<rect x="2" y="2" width="' + (W - 4) + '" height="' + (H - 4) + '" rx="8" fill="' + set.face + '" stroke="' + set.edge + '" stroke-width="2.5"/>';
    s += horizontal
      ? '<line x1="50" y1="8" x2="50" y2="42" stroke="' + set.line + '" stroke-width="2"/>'
      : '<line x1="8" y1="50" x2="42" y2="50" stroke="' + set.line + '" stroke-width="2"/>';
    [a, b].forEach((v, h) => {
      const cx = horizontal ? 25 + h * 50 : 25, cy = horizontal ? 25 : 25 + h * 50;
      PIPS[v].forEach(([x, y]) => {
        // rotate the pattern on horizontal tiles so a 6 runs along the short side
        const ox = horizontal ? y : x, oy = horizontal ? x : y;
        s += '<circle cx="' + (cx + ox * 12) + '" cy="' + (cy + oy * 12) + '" r="5" fill="' + set.pip + '"/>';
      });
    });
    return s + '</svg>';
  }

  // ------------------------------------------------------------ board layout (units: tile = 2×1)
  const DIRS = { E: [1, 0], W: [-1, 0], S: [0, 1], N: [0, -1] };
  function layout(lim) {
    const out = [], c = G.chain;
    if (!c) return { tiles: out, ends: null };
    const rd = E.isDouble(c.root);
    if (rd) out.push({ x: -0.5, y: -1, w: 1, h: 2, a: c.root[0], b: c.root[1], dir: 'E', key: 'root' });
    else out.push({ x: -1, y: -0.5, w: 2, h: 1, a: c.root[0], b: c.root[1], dir: 'E', key: 'root' });
    const half = rd ? 0.5 : 1, hw0 = rd ? 1 : 0.5;
    const ends = {};
    [['R', 'E', 'S'], ['L', 'W', 'N']].forEach(([side, h0, vdir]) => {
      let p = [side === 'R' ? half : -half, 0], d = h0, hdir = h0, hw = hw0, vcount = -1;
      c[side].forEach((t, k) => {
        let turned = false;
        const lenGuess = t.d ? 1 : 2;
        const horiz = d === 'E' || d === 'W';
        if (horiz && ((d === 'E' && p[0] + lenGuess > lim) || (d === 'W' && p[0] - lenGuess < -lim))) {
          const nd = vdir;
          p = [p[0] - DIRS[d][0] * 0.5 + DIRS[nd][0] * hw, p[1] - DIRS[d][1] * 0.5 + DIRS[nd][1] * hw];
          d = nd; turned = true; vcount = 0;
        } else if (!horiz && vcount >= 1) {
          const nd = hdir === 'E' ? 'W' : 'E';
          p = [p[0] - DIRS[d][0] * 0.5 + DIRS[nd][0] * hw, p[1] - DIRS[d][1] * 0.5 + DIRS[nd][1] * hw];
          d = nd; hdir = nd; turned = true;
        }
        const perp = t.d && !turned;
        const len = perp ? 1 : 2, across = perp ? 2 : 1;
        const dv = DIRS[d];
        let x, y, w, h;
        if (dv[1] === 0) { w = len; h = across; x = dv[0] > 0 ? p[0] : p[0] - len; y = p[1] - across / 2; }
        else { w = across; h = len; y = dv[1] > 0 ? p[1] : p[1] - len; x = p[0] - across / 2; }
        out.push({ x, y, w, h, a: t.i, b: t.o, dir: d, perp, key: side + k });
        p = [p[0] + dv[0] * len, p[1] + dv[1] * len]; hw = across / 2;
        if (d === 'S' || d === 'N') vcount++;
      });
      ends[side] = { x: p[0], y: p[1], dir: d };
    });
    return { tiles: out, ends };
  }

  // ------------------------------------------------------------ board rendering
  const cv = $('#board'), ctx = cv.getContext('2d');
  let view = null; // last transform for hit-testing
  function fit() {
    const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.height * dpr));
    draw();
  }
  function bestLayout(cw, ch) {
    let best = null;
    for (let lim = 3; lim <= 12; lim++) {
      const L = layout(lim);
      let x0 = -1, y0 = -1, x1 = 1, y1 = 1;
      L.tiles.forEach((t) => { x0 = Math.min(x0, t.x); y0 = Math.min(y0, t.y); x1 = Math.max(x1, t.x + t.w); y1 = Math.max(y1, t.y + t.h); });
      if (L.ends) Object.values(L.ends).forEach((e) => { x0 = Math.min(x0, e.x - 1.2); x1 = Math.max(x1, e.x + 1.2); y0 = Math.min(y0, e.y - 1.2); y1 = Math.max(y1, e.y + 1.2); });
      const pad = 1;
      const sc = Math.min(cw / (x1 - x0 + pad * 2), ch / (y1 - y0 + pad * 2));
      if (!best || sc > best.sc + 1e-6) best = { L, sc, x0, y0, x1, y1 };
    }
    return best;
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function drawTile(px, py, pw, ph, first, second, set, hl) {
    const u = Math.min(pw, ph), r = u * 0.16;
    ctx.save();
    if (set.glow || hl) { ctx.shadowColor = hl || set.glow; ctx.shadowBlur = u * (hl ? 0.9 : 0.35); }
    roundRect(px + 1, py + 1, pw - 2, ph - 2, r); ctx.fillStyle = set.face; ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = Math.max(1, u * 0.05); ctx.strokeStyle = hl || set.edge; ctx.stroke();
    const vertical = ph > pw;
    ctx.strokeStyle = set.line; ctx.lineWidth = Math.max(1, u * 0.04); ctx.beginPath();
    if (vertical) { ctx.moveTo(px + u * 0.18, py + ph / 2); ctx.lineTo(px + pw - u * 0.18, py + ph / 2); }
    else { ctx.moveTo(px + pw / 2, py + u * 0.18); ctx.lineTo(px + pw / 2, py + ph - u * 0.18); }
    ctx.stroke();
    ctx.fillStyle = set.pip;
    [first, second].forEach((v, h) => {
      const cx = vertical ? px + pw / 2 : px + pw / 4 + h * pw / 2;
      const cy = vertical ? py + ph / 4 + h * ph / 2 : py + ph / 2;
      PIPS[v].forEach(([x, y]) => {
        const ox = vertical ? x : y, oy = vertical ? y : x;
        ctx.beginPath(); ctx.arc(cx + ox * u * 0.24, cy + oy * u * 0.24, u * 0.085, 0, Math.PI * 2); ctx.fill();
      });
    });
    ctx.restore();
  }
  function draw() {
    const set = curSet(), W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);
    if (!G || !G.chain) { view = null; return; }
    // keep clear of the seat badges (top, and left/right in 4-player games)
    const k = W / Math.max(1, cv.clientWidth);
    const padT = 44 * k, padB = 8 * k, padS = (G.players.length === 4 ? 66 : 8) * k;
    const aw = Math.max(40, W - 2 * padS), ah = Math.max(40, H - padT - padB);
    const B = bestLayout(aw, ah);
    const u = Math.min(B.sc, Math.min(aw, ah) / 9);
    const ox = padS + aw / 2 - ((B.x0 + B.x1) / 2) * u, oy = padT + ah / 2 - ((B.y0 + B.y1) / 2) * u;
    view = { u, ox, oy, ends: B.L.ends };
    const now = performance.now();
    B.L.tiles.forEach((t) => {
      const forward = t.dir === 'E' || t.dir === 'S';
      const first = forward ? t.a : t.b, second = forward ? t.b : t.a;
      const hl = glow && glow.key === t.key && now < glow.until ? '#fff' : null;
      drawTile(ox + t.x * u, oy + t.y * u, t.w * u, t.h * u, first, second, set, hl);
    });
    // end markers while the human chooses a side
    if (pick && B.L.ends) {
      const pulse = 0.5 + 0.5 * Math.sin(now / 160);
      pick.moves.forEach((m) => {
        const e = B.L.ends[m.side], d = DIRS[e.dir];
        const cx = ox + (e.x + d[0] * 1) * u, cy = oy + (e.y + d[1] * 1) * u;
        ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, u * (0.55 + pulse * 0.12), 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,240,255,' + (0.18 + pulse * 0.2) + ')'; ctx.fill();
        ctx.lineWidth = Math.max(2, u * 0.08); ctx.strokeStyle = '#00f0ff'; ctx.shadowColor = '#00f0ff'; ctx.shadowBlur = 16; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = '900 ' + Math.round(u * 0.6) + 'px Cairo, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(G.ends[m.side === 'L' ? 0 : 1]), cx, cy + 1);
        ctx.restore();
        m.hit = { x: cx, y: cy, r: u * 0.9 };
      });
    }
    if ((pick || (glow && now < glow.until)) && !document.hidden) requestAnimationFrame(draw);
  }
  cv.addEventListener('pointerdown', (e) => {
    if (!pick) return;
    const r = cv.getBoundingClientRect(), sx = cv.width / r.width;
    const x = (e.clientX - r.left) * sx, y = (e.clientY - r.top) * sx;
    const m = pick.moves.find((mv) => mv.hit && Math.hypot(mv.hit.x - x, mv.hit.y - y) < mv.hit.r);
    if (m) humanPlay(m);
  });

  // ------------------------------------------------------------ rendering: HUD
  function renderScores() {
    const box = $('#scores'); box.innerHTML = '';
    const names = G.M.teams ? [T('us'), T('them')] : [T('you'), T('cpu')];
    G.scores.forEach((s, i) => {
      const d = document.createElement('div'); d.className = 'sc' + (i === 0 ? ' me' : '');
      const sm = document.createElement('small'); sm.textContent = names[i];
      const b = document.createElement('b'); b.textContent = s;
      d.append(sm, b); box.appendChild(d);
    });
    const tg = document.createElement('div'); tg.className = 'sc target';
    const sm = document.createElement('small'); sm.textContent = tt(MODES.find((m) => m.id === G.mode).name);
    const b = document.createElement('b'); b.textContent = T('target', { n: G.M.target });
    tg.append(sm, b); box.appendChild(tg);
  }
  function renderSeats() {
    ['#seat1', '#seat2', '#seat3'].forEach((s) => ($(s).hidden = true));
    const peek = performance.now() < peekUntil;
    G.players.forEach((p, i) => {
      if (i === 0) return;
      const seat = seatOf(i);
      const el = $(seat === 'top' ? '#seat2' : seat === 'right' ? '#seat1' : '#seat3');
      el.hidden = false; el.innerHTML = '';
      el.classList.toggle('turn', G.turn === i && !G.roundOver);
      el.classList.toggle('mate', G.M.teams && p.team === 0);
      const n = document.createElement('div'); n.className = 'nm';
      n.textContent = (G.M.teams && p.team === 0 ? '🤝 ' : '🤖 ') + (seat === 'top' ? playerName(i) : T(seat));
      const c = document.createElement('div'); c.className = 'cnt';
      if (peek && p.team !== 0) {
        c.classList.add('open');
        p.hand.forEach((t) => { const s = document.createElement('span'); s.className = 'mini'; s.innerHTML = tileSVG(t[0], t[1]); c.appendChild(s); });
      } else {
        for (let k = 0; k < p.hand.length; k++) { const s = document.createElement('i'); c.appendChild(s); }
      }
      const b = document.createElement('b'); b.textContent = p.hand.length;
      el.append(n, c, b);
    });
  }
  function renderHand() {
    const h = $('#hand'); h.innerHTML = '';
    const me = human();
    const myTurn = G.turn === 0 && !busy && !G.roundOver;
    const moves = myTurn ? E.legal(G, me.hand) : [];
    me.hand.slice().sort((x, y) => x[0] - y[0] || x[1] - y[1]).forEach((t) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'tile';
      const playable = moves.filter((m) => E.same(m.tile, t));
      if (myTurn) b.classList.add(playable.length ? 'ok' : 'no');
      if (pick && E.same(pick.tile, t)) b.classList.add('sel');
      if (hintMv && E.same(hintMv.tile, t)) b.classList.add('hint');
      b.innerHTML = tileSVG(t[0], t[1]);
      b.setAttribute('aria-label', t[0] + '-' + t[1]);
      b.disabled = !playable.length;
      b.addEventListener('click', () => tapTile(t, playable));
      h.appendChild(b);
    });
    h.classList.toggle('many', me.hand.length > 9);
  }
  function renderActions() {
    const myTurn = G.turn === 0 && !busy && !G.roundOver;
    const me = human();
    const moves = myTurn ? E.legal(G, me.hand) : [];
    $('#hintN').textContent = eco.count('hint');
    $('#peekN').textContent = eco.count('peek');
    $('#hintBtn').disabled = !myTurn || !moves.length;
    $('#peekBtn').disabled = !!G.roundOver;
    const db = $('#drawBtn');
    if (myTurn && !moves.length) {
      db.hidden = false;
      db.textContent = E.canDraw(G) ? T('drawBtn', { n: G.boneyard.length }) : T('passBtn');
    } else db.hidden = true;
    ['L', 'R'].forEach((s) => {
      const btn = $('#side' + s), m = pick && pick.moves.find((x) => x.side === s);
      btn.hidden = !m;
      if (m) btn.textContent = (s === 'L' ? '◀ ' : '') + T('onEnd', { v: G.ends[s === 'L' ? 0 : 1] }) + (s === 'R' ? ' ▶' : '');
    });
  }
  function status(text) { $('#status').textContent = text; }
  function floatText(text) {
    const f = $('#float'); f.textContent = text; f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
  }
  function render() { renderScores(); renderSeats(); renderHand(); renderActions(); draw(); }

  // ------------------------------------------------------------ turn flow
  function startMatch() {
    clearTimeout(aiTimer);
    G = E.newMatch(S.mode);
    matchReward = 0;
    const d = DIFF[S.diff];
    if (d.freeHint && eco.count('hint') < d.freeHint) eco.give('hint', d.freeHint - eco.count('hint'));
    ST.played++; cfgSave('stats', ST);
    hub.track('game_start', { game: 'dominoes', mode: S.mode, diff: S.diff });
    show('table');
    newRound();
  }
  function newRound() {
    E.deal(G);
    pick = null; hintMv = null; busy = false; glow = null;
    $('#roundPanel').hidden = true;
    render();
    floatText(T('round', { n: G.round }));
    setTimeout(step, 500);
  }
  function step() {
    if (!G || G.roundOver) return;
    render();
    const i = G.turn, p = G.players[i];
    const moves = E.legal(G, p.hand);
    if (i === 0) {
      if (moves.length) status(T('yourTurn'));
      else status(E.canDraw(G) ? T('mustDraw') : T('mustPass'));
      return;
    }
    busy = true; renderHand(); renderActions();
    status(T('thinking', { p: playerName(i) }));
    aiTimer = setTimeout(() => aiTurn(i), DIFF[S.diff].delay + Math.random() * 300);
  }
  function aiTurn(i) {
    if (!G || G.roundOver || G.turn !== i) return;
    const mv = E.choose(G, i, S.diff);
    if (mv) { apply(mv); return; }
    if (E.canDraw(G)) {
      E.draw(G); status(T('drew', { p: playerName(i) })); renderSeats();
      aiTimer = setTimeout(() => aiTurn(i), 320);
      return;
    }
    const r = E.pass(G);
    floatText(T('passed', { p: playerName(i) }));
    busy = false;
    if (r.blocked) return roundEnd();
    aiTimer = setTimeout(step, 450);
  }
  function apply(mv) {
    const res = E.play(G, mv);
    clack(res.tile[0] === res.tile[1] ? 360 : 440);
    const side = G.chain.L.length + G.chain.R.length === 0 ? 'root' : mv.side;
    glow = { key: side === 'root' ? 'root' : side + (G.chain[side].length - 1), until: performance.now() + 900 };
    if (res.fives) floatText(T('fives', { n: res.fives }));
    pick = null; hintMv = null; busy = false;
    status('');
    render();
    if (res.domino) return setTimeout(roundEnd, 650);
    aiTimer = setTimeout(step, 250);
  }

  // human input
  function tapTile(t, playable) {
    if (G.turn !== 0 || busy || G.roundOver || !playable.length) return;
    if (playable.length === 1) return humanPlay(playable[0]);
    pick = { tile: t, moves: playable.map((m) => Object.assign({}, m)) };
    status(T('pickSide'));
    renderHand(); renderActions(); draw();
  }
  function humanPlay(m) {
    if (G.turn !== 0 || busy) return;
    apply({ tile: m.tile, side: m.side });
  }
  $('#sideL').addEventListener('click', () => { const m = pick && pick.moves.find((x) => x.side === 'L'); if (m) humanPlay(m); });
  $('#sideR').addEventListener('click', () => { const m = pick && pick.moves.find((x) => x.side === 'R'); if (m) humanPlay(m); });
  $('#drawBtn').addEventListener('click', () => {
    if (G.turn !== 0 || busy || G.roundOver) return;
    if (E.legal(G, human().hand).length) return;
    if (E.canDraw(G)) { E.draw(G); clack(300); render(); step(); return; }
    const r = E.pass(G); floatText(T('passed', { p: T('you') }));
    if (r.blocked) return roundEnd();
    step();
  });

  // ------------------------------------------------------------ boosters
  const boostName = (id) => T(id);
  function useBoost(id) {
    if (eco.use(id)) return true;
    offerBoost(id);
    return false;
  }
  function offerBoost(id, after) {
    const allowAd = S.diff !== 'hard';
    const b = BOOST[id];
    const wrap = document.createElement('div'); wrap.className = 'tt-eco-modal';
    const box = document.createElement('div'); box.className = 'tt-eco-box'; wrap.appendChild(box);
    const h = document.createElement('h3'); h.textContent = b.icon + ' ' + T('getBoost', { b: boostName(id) });
    const p = document.createElement('p'); p.textContent = T(id + 'Desc');
    box.append(h, p);
    if (allowAd) {
      const ad = document.createElement('button'); ad.className = 'tt-eco-btn'; ad.textContent = T('watchAd');
      ad.onclick = () => {
        wrap.remove();
        eco.rewarded({ id, title: T('boostAdTitle', { b: boostName(id) }) }).then((ok) => {
          if (ok) { eco.give(id, 1); eco.toast(T('got', { b: boostName(id) })); renderActions(); after && after(); }
        });
      };
      box.appendChild(ad);
    } else {
      const n = document.createElement('p'); n.className = 'tt-eco-note'; n.textContent = T('hardNoAds'); box.appendChild(n);
    }
    const buy = document.createElement('button'); buy.className = 'tt-eco-btn ' + (allowAd ? 'ghost' : ''); buy.textContent = T('buyCoins', { n: b.cost }) + ' (⭐ ' + eco.coins() + ')';
    buy.onclick = () => {
      if (!eco.spend(b.cost, 'booster-' + id)) { eco.toast(T('notEnough')); return; }
      wrap.remove(); eco.give(id, 1); eco.toast(T('got', { b: boostName(id) })); renderActions(); after && after();
    };
    const close = document.createElement('button'); close.className = 'tt-eco-btn ghost'; close.textContent = '✕';
    close.onclick = () => wrap.remove();
    box.append(buy, close);
    document.body.appendChild(wrap);
  }
  $('#hintBtn').addEventListener('click', () => {
    if (G.turn !== 0 || busy) return;
    if (!E.legal(G, human().hand).length) { eco.toast(T('hintNone')); return; }
    if (!useBoost('hint')) return;
    hintMv = E.choose(G, 0, 'hard');
    hub.track('booster', { game: 'dominoes', id: 'hint' });
    renderHand(); renderActions();
    const ends = hintMv && G.ends ? ' → ' + T('onEnd', { v: G.ends[hintMv.side === 'L' ? 0 : 1] }) : '';
    status('💡 ' + hintMv.tile.join('|') + ends);
  });
  $('#peekBtn').addEventListener('click', () => {
    if (!G || G.roundOver) return;
    if (!useBoost('peek')) return;
    hub.track('booster', { game: 'dominoes', id: 'peek' });
    peekUntil = performance.now() + 4000;
    renderSeats(); renderActions();
    setTimeout(() => G && renderSeats(), 4050);
  });

  // ------------------------------------------------------------ round & match end
  function roundEnd() {
    clearTimeout(aiTimer); busy = false; pick = null;
    const R = G.roundOver;
    render();
    const panel = $('#roundPanel');
    const meTeam = 0, won = R.team === meTeam;
    let title;
    if (R.blocked && R.team == null) title = T('blocked');
    else if (G.M.teams) title = won ? T('wonRoundT') : T('lostRoundT');
    else title = won ? T('wonRound') : T('lostRound');
    if (R.blocked && R.team != null) title = T('blocked') + ' · ' + title;
    $('#rTitle').textContent = title;
    const names = G.M.teams ? [T('us'), T('them')] : [T('you'), T('cpu')];
    $('#rText').textContent = R.team == null ? T('blockedTie') : T('roundPts', { n: R.points, w: names[R.team] });
    // reveal the remaining hands
    const rh = $('#rHands'); rh.innerHTML = '';
    G.players.forEach((p, i) => {
      if (!p.hand.length) return;
      const row = document.createElement('div'); row.className = 'rv';
      const nm = document.createElement('small'); nm.textContent = playerName(i) + ' · ' + T('pipsLeft', { n: E.handPips(p.hand) });
      const tl = document.createElement('div'); tl.className = 'rv-tiles';
      p.hand.forEach((t) => { const s = document.createElement('span'); s.className = 'mini'; s.innerHTML = tileSVG(t[0], t[1]); tl.appendChild(s); });
      row.append(nm, tl); rh.appendChild(row);
    });
    const sc = $('#rScores'); sc.innerHTML = '';
    G.scores.forEach((s, i) => {
      const d = document.createElement('div'); d.className = i === 0 ? 'me' : '';
      const sm = document.createElement('small'); sm.textContent = names[i];
      const b = document.createElement('b'); b.textContent = s + ' / ' + G.M.target;
      d.append(sm, b); sc.appendChild(d);
    });
    const act = $('#rActions'); act.innerHTML = '';
    const btn = (cls, text, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn ' + cls; b.textContent = text; b.onclick = fn; act.appendChild(b); return b; };
    if (R.matchWinner == null) {
      btn('', T('next'), newRound);
    } else {
      const iWon = R.matchWinner === 0;
      $('#rTitle').textContent = iWon ? T('wonMatch') : T('lostMatch');
      matchReward = iWon ? DIFF[S.diff].reward : Math.round(DIFF[S.diff].reward / 4);
      eco.add(matchReward, 'dominoes-' + S.diff);
      if (iWon) { ST.won++; cfgSave('stats', ST); }
      hub.setBest('dominoes', ST.won);
      $('#rText').textContent = T('matchPts', { n: matchReward });
      hub.track('game_over', { game: 'dominoes', mode: S.mode, diff: S.diff, won: iWon ? 1 : 0 });
      if (S.diff !== 'hard') {
        const dbl = btn('nile', T('double'), () => {
          eco.rewarded({ id: 'double', title: T('doubleAdTitle') }).then((ok) => {
            if (ok) { eco.add(matchReward, 'double-ad'); eco.toast('+' + matchReward + ' ⭐'); dbl.remove(); }
          });
        });
      } else if (!eco.owns(PRO.sku)) {
        const up = btn('nile', '👑 ' + T('proUpsell'), openShop);
        up.classList.add('small');
      }
      btn('', T('again'), startMatch);
      btn('ghost', T('share'), () => eco.share({ game: 'dominoes', text: T('shareText') }));
      btn('ghost', T('menu'), () => show('menu'));
      window.TTPromo && TTPromo.gameOver({ score: G.scores[0] });
    }
    panel.hidden = false;
    window.TTAds && TTAds.refresh && TTAds.refresh(panel.querySelector('.ad-slot'));
  }

  // ------------------------------------------------------------ menu
  function renderMenu() {
    document.querySelectorAll('[data-t]').forEach((el) => (el.textContent = T(el.dataset.t)));
    document.title = T('title') + ' · Trip Timings Games';
    $('#langBtn').textContent = hub.lang === 'ar' ? 'EN' : 'عربي';
    const mb = $('#modes'); mb.innerHTML = '';
    MODES.forEach((m) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'mode' + (S.mode === m.id ? ' on' : '');
      b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', S.mode === m.id);
      const ic = document.createElement('span'); ic.className = 'mi'; ic.textContent = m.icon;
      const tx = document.createElement('span'); tx.className = 'mt';
      const nb = document.createElement('b'); nb.textContent = tt(m.name);
      const ds = document.createElement('small'); ds.textContent = tt(m.desc);
      tx.append(nb, ds);
      const tg = document.createElement('i');
      tg.textContent = m.link ? tt(m.tag) + ' ↗' : T('target', { n: E.MODES[m.id].target }) + ' · ' + E.MODES[m.id].players + '👤';
      b.append(ic, tx, tg);
      b.onclick = m.link
        ? () => { hub.track('mode_open', { game: 'dominoes', mode: m.id }); location.href = m.link; }
        : () => { S.mode = m.id; saveS(); renderMenu(); };
      mb.appendChild(b);
    });
    const db = $('#diffs'); db.innerHTML = '';
    Object.keys(DIFF).forEach((d) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = S.diff === d ? 'on' : '';
      b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', S.diff === d);
      b.textContent = T(d);
      b.onclick = () => { S.diff = d; saveS(); renderMenu(); };
      db.appendChild(b);
    });
    $('#diffNote').textContent = T('note' + S.diff[0].toUpperCase() + S.diff.slice(1), { r: DIFF[S.diff].reward });
    $('#statsLine').textContent = ST.played ? T('stats', { p: ST.played, w: ST.won }) : '';
    document.querySelectorAll('.lt').forEach((r) => { r.setAttribute('fill', curSet().face); r.setAttribute('stroke', curSet().edge); });
    document.querySelectorAll('.lp').forEach((r) => r.setAttribute('fill', curSet().pip));
    document.querySelectorAll('.ll').forEach((r) => r.setAttribute('stroke', curSet().line));
  }
  function applySet() {
    const s = curSet();
    document.documentElement.style.setProperty('--felt-a', s.table[0]);
    document.documentElement.style.setProperty('--felt-b', s.table[1]);
    document.documentElement.style.setProperty('--set-glow', s.glow || s.edge);
  }

  function show(which) {
    $('#menu').hidden = which !== 'menu';
    $('#table').hidden = which !== 'table';
    $('#roundPanel').hidden = true;
    document.body.classList.toggle('playing', which === 'table');
    if (which === 'menu') { clearTimeout(aiTimer); G = null; renderMenu(); }
    else requestAnimationFrame(fit);
  }

  // ------------------------------------------------------------ shop
  function openShop() {
    $('#shopPanel').hidden = false;
    renderShop();
    hub.track('shop_open', { game: 'dominoes' });
  }
  function renderShop() {
    const pro = $('#proBox'); pro.innerHTML = '';
    const ph = document.createElement('b'); ph.textContent = '👑 ' + T('proTitle');
    const pp = document.createElement('small'); pp.textContent = T('proText');
    pro.append(ph, pp);
    if (eco.owns(PRO.sku)) { const ok = document.createElement('span'); ok.className = 'own'; ok.textContent = T('proOwned'); pro.appendChild(ok); }
    else {
      const b = document.createElement('button'); b.className = 'btn'; b.type = 'button'; b.textContent = PRO.price;
      b.onclick = () => eco.purchase({ sku: PRO.sku, title: T('proTitle'), price: PRO.price }).then((ok) => {
        if (ok) { eco.give('hint', 10); eco.give('peek', 10); applySet(); renderShop(); }
      });
      pro.appendChild(b);
    }
    const box = $('#sets'); box.innerHTML = '';
    SETS.forEach((s) => {
      const c = document.createElement('div'); c.className = 'set' + (curSet().id === s.id ? ' on' : '');
      const pv = document.createElement('div'); pv.className = 'pv'; pv.style.background = 'linear-gradient(160deg,' + s.table[0] + ',' + s.table[1] + ')';
      pv.innerHTML = tileSVG(6, 5, s, true) + tileSVG(3, 3, s);
      const nm = document.createElement('b'); nm.textContent = tt(s.name);
      c.append(pv, nm);
      const act = document.createElement('div'); act.className = 'sa';
      if (ownsSet(s)) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small' + (curSet().id === s.id ? ' ghost' : '');
        b.textContent = curSet().id === s.id ? T('equipped') : T('equip');
        b.onclick = () => { S.set = s.id; saveS(); applySet(); renderShop(); renderMenu(); if (G) render(); };
        act.appendChild(b);
      } else if (s.share) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small nile';
        b.textContent = '🤝 ' + T('shareUnlock', { n: eco.config.friendSetShares });
        b.onclick = () => eco.openInvite('dominoes');
        act.appendChild(b);
      } else {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small'; b.textContent = s.price;
        b.onclick = () => eco.purchase({ sku: s.sku, title: tt(s.name), price: s.price }).then((ok) => { if (ok) { S.set = s.id; saveS(); applySet(); renderShop(); } });
        const c2 = document.createElement('button'); c2.type = 'button'; c2.className = 'btn small ghost'; c2.textContent = '⭐ ' + s.coins.toLocaleString('en');
        c2.onclick = () => {
          if (!eco.spend(s.coins, 'set-' + s.id)) { eco.toast(T('notEnough')); return; }
          eco.unlock(s.sku); S.set = s.id; saveS(); applySet(); renderShop();
        };
        act.append(b, c2);
      }
      c.appendChild(act); box.appendChild(c);
    });
    const bb = $('#boosters'); bb.innerHTML = '';
    Object.keys(BOOST).forEach((id) => {
      const row = document.createElement('div'); row.className = 'brow';
      const t = document.createElement('div');
      const n = document.createElement('b'); n.textContent = BOOST[id].icon + ' ' + T(id) + ' × ' + eco.count(id);
      const d = document.createElement('small'); d.textContent = T(id + 'Desc');
      t.append(n, d);
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small'; b.textContent = T('getBoost', { b: T(id) });
      b.onclick = () => offerBoost(id, renderShop);
      row.append(t, b); bb.appendChild(row);
    });
  }
  document.addEventListener('tt:coins', () => { if (!$('#shopPanel').hidden) renderShop(); if (G) renderActions(); });
  $('#shopClose').addEventListener('click', () => { $('#shopPanel').hidden = true; renderMenu(); });

  // ------------------------------------------------------------ wiring
  $('#playBtn').addEventListener('click', startMatch);
  $('#shopBtn').addEventListener('click', openShop);
  $('#inviteBtn').addEventListener('click', () => eco.openInvite('dominoes'));
  $('#langBtn').addEventListener('click', () => hub.setLang(hub.lang === 'ar' ? 'en' : 'ar'));
  document.addEventListener('tt:lang', () => { renderMenu(); if (G) render(); });
  $('#menuBtn').addEventListener('click', () => {
    const wrap = document.createElement('div'); wrap.className = 'tt-eco-modal';
    const box = document.createElement('div'); box.className = 'tt-eco-box'; wrap.appendChild(box);
    const h = document.createElement('h3'); h.textContent = T('quit');
    const r = document.createElement('button'); r.className = 'tt-eco-btn'; r.textContent = T('resume'); r.onclick = () => wrap.remove();
    const snd = document.createElement('button'); snd.className = 'tt-eco-btn ghost'; snd.textContent = S.sound ? '🔊' : '🔇';
    snd.onclick = () => { S.sound = !S.sound; saveS(); snd.textContent = S.sound ? '🔊' : '🔇'; };
    const l = document.createElement('button'); l.className = 'tt-eco-btn ghost'; l.textContent = T('leave'); l.onclick = () => { wrap.remove(); show('menu'); };
    box.append(h, r, snd, l); document.body.appendChild(wrap); r.focus();
  });
  window.addEventListener('resize', () => { if (G) fit(); });
  if (window.ResizeObserver) new ResizeObserver(() => { if (G) fit(); }).observe($('#felt'));

  eco.chip($('#coinChip'));
  eco.chip($('#menuCoins'));
  eco.chip($('#shopCoins'));
  applySet();
  show('menu');

  // test hook (used by the automated browser check)
  window.__dominoes = { get G() { return G; }, start: startMatch, S };
})();
