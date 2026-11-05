/* =========================================================================
   CyberBreaker — neon brick breaker
   Vanilla ES6+, HTML5 Canvas 2D, no dependencies, no build step.

   Sections
     1. Config & constants
     2. Persistence (localStorage, fault tolerant)
     3. Audio (WebAudio synth) & haptics
     4. DOM helpers, screens, toasts
     5. Canvas layout & responsive sizing
     6. Shape geometry & collision
     7. Sprite cache (pre-rendered neon glow)
     8. Game state, row generation, turn flow
     9. Reward cards & bonus
    10. Input (pointer, slider, keyboard)
    11. Simulation (fixed sub-stepping physics)
    12. Rendering
    13. UI screens (menu, stage map, modals)
    14. Main loop & boot

   State machine (G.state):
     menu / level_select are screen-level (no G running)
     aiming    → player can aim, use cards, take bonus
     targeting → a card is armed; next tap picks a row/column
     turning   → balls in flight
     dropping  → rows animating down one step
     paused | game_over | stage_clear
   ========================================================================= */
'use strict';

(() => {
  // ---------------------------------------------------------------------
  // 1. Config & constants
  // ---------------------------------------------------------------------
  const CFG = {
    cols: 7,
    rows: 10,              // playable rows above the danger line
    topPadCells: 0.35,     // empty space above the first row
    launchCells: 1.25,     // space between danger line and floor
    stagesPerMode: 100,
    ballRadius: 0.115,     // × cell
    ballSpeed: 15,         // cells per second at 1×
    fireInterval: 0.075,   // seconds between consecutive balls at 1×
    pad: 0.07,             // shape inset × cell
    minAngle: 0.13,        // radians from horizontal
    comboForCard: 6,       // bricks destroyed in one turn to earn a card
    milestoneEvery: 10,    // every N lines spawned earns a card
    reviveCost: 60,
    maxParticles: 450,
  };

  const MODES = {
    classic: { shapes: ['square'] },
    polygon: { shapes: ['triangle', 'hexagon', 'circle', 'diamond'] },
    mixed:   { shapes: ['square', 'triangle', 'hexagon', 'circle', 'diamond'] },
    chaos:   { shapes: ['square', 'triangle', 'hexagon', 'circle', 'diamond'], chaos: true },
  };
  // Health scaling per shape (smaller hit area → less HP, bigger → more)
  const SHAPE_HP = { square: 1, triangle: 0.75, hexagon: 1.25, circle: 0.9, diamond: 0.8 };

  // Enemy brick behaviours. `from` = first stage (or endless tier) they appear.
  const BEHAVIORS = [
    { id: 'bomb',  from: 3,  rate: 0.05 },  // explodes into its 8 neighbours
    { id: 'regen', from: 5,  rate: 0.06 },  // heals 15% max HP every turn
    { id: 'ghost', from: 8,  rate: 0.06 },  // phases out every other turn
    { id: 'split', from: 12, rate: 0.05 },  // splits into two small bricks
    { id: 'mover', from: 16, rate: 0.05 },  // slides sideways every turn
  ];

  // Row layout patterns (true = brick). Stages cycle through them.
  const PATTERNS = {
    random:  null,
    checker: (line, c) => (line + c) % 2 === 0,
    pillars: (line, c) => c % 3 !== 1,
    vee:     (line, c) => Math.abs(c - 3) >= line % 4,
    zigzag:  (line, c) => { const k = line % 12, p = k < 6 ? k : 11 - k; return c !== p && c !== p + 1; },
    walls:   (line, c) => line % 3 !== 0 || c === 0 || c === 6,
    center:  (line, c) => c >= 2 && c <= 4 ? true : (line % 2 === 0),
  };
  const PATTERN_CYCLE = ['random', 'checker', 'random', 'pillars', 'vee', 'random', 'zigzag', 'walls', 'center', 'random'];

  const CARDS = {
    h: { cost: 40 },
    v: { cost: 40 },
    x: { cost: 70 },
  };

  const PLAY_STATES = ['aiming', 'targeting', 'turning', 'dropping'];

  // ---------------------------------------------------------------------
  // Language: English + Arabic. "auto" follows the phone/browser language.
  // ---------------------------------------------------------------------
  const STR = {
    en: {
      tagline: '// NEON GRID PROTOCOL',
      m_classic: 'Classic', m_polygon: 'Polygon', m_mixed: 'Mixed', m_chaos: 'Chaos',
      s_classic: 'Squares', s_polygon: 'Tri · Hex · Gem', s_mixed: 'All shapes', s_chaos: 'All threats',
      stageMap: 'Stage Map', endless: 'Endless Run', mapTitle: 'STAGE MAP',
      score: 'SCORE', best: 'BEST', lines: 'LINES', reward: 'REWARD', fire: 'FIRE', bonus: 'BONUS',
      paused: 'PAUSED', resume: 'Resume', restart: 'Restart', settings: 'Settings', quit: 'Quit',
      settingsTitle: 'SETTINGS', sound: 'Sound effects', haptics: 'Vibration', fxHigh: 'High glow effects',
      guide: 'Long aim guide', language: 'Language', langAuto: 'Phone language', reset: 'Reset progress',
      resetConfirm: 'Tap again to confirm', resetDone: 'Progress reset', done: 'Done',
      overTitle: 'SYSTEM BREACH', overSub: 'The grid reached your launcher.', newBest: 'New personal best!',
      revive: 'Revive', retry: 'Retry', exit: 'Exit',
      clearTitle: 'STAGE CLEARED', next: 'Next Stage', replay: 'Replay',
      bonusTitle: 'BONUS BOOST', bonusSub: 'Simulated reward break (no real ads).',
      bonusNext: '+{n} balls for your next shot', bonusLoaded: '+{n} bonus balls loaded',
      helpTitle: 'HOW TO PLAY', gotIt: 'Got it',
      help: [
        '<b>Aim</b> by dragging anywhere on the board, then let go to fire. The slider and FIRE button work too.',
        'Each shape shows its <b>HP</b>. Its color shifts from pink to purple to cyan as it weakens.',
        'After every shot the grid drops one row. If a shape crosses the <b>red line</b>, the game ends.',
        '<b>Rings</b> give +1 ball. <b>Gems</b> give diamonds. <b>Lightning</b> items zap a whole row or column each time a ball passes. <b>Orange orbs</b> make your next shot hit twice as hard. <b>Swirls</b> bounce balls in a random direction.',
        '<b>Enemy bricks:</b> 💣 bombs blow up their neighbours, ✚ green ones heal each turn, 👻 ghosts phase out every other turn, ◐ splitters break into two, ⇄ movers slide sideways. Every 10th stage has a <b>boss</b>.',
        '<b>Cards</b> (row, column and cross lasers) come from big combos, every 10 lines, gold-core bricks, or diamonds. Tap a card, then tap the board.',
        'Clear every line of a stage to earn up to 3 stars. Fewer extra turns means more stars.',
      ],
      stage: 'STAGE', endlessTag: 'ENDLESS',
      lineOf: 'LINE {a} / {b}', lineCard: 'LINE {a} · CARD AT {b}', clearLeft: 'CLEAR THE GRID · {n} LEFT',
      menuBest: '{mode}: stage {n} unlocked · endless best {b}',
      gift: 'Daily Cache · +25', giftDone: 'Cache claimed today', giftToast: '+25 ◆ claimed',
      starsOf: '{a} / {b}', unlocked: '{a} / {b} unlocked', locked: 'Clear stage {n} first', boss: 'BOSS',
      cardsBetween: 'Cards work between shots', needGems: 'Need {n} ◆ for {card}', bought: 'Bought {card}',
      cardEarned: '{reason} → {card} card!', milestone: 'Line {n} milestone', coreShard: 'Core shard', combo: 'Combo ×{n}',
      wiped: 'GRID WIPED  +{n}', plusBalls: '+{n} BALLS', power2x: '2× POWER',
      c_h: 'Row Laser', c_v: 'Column Laser', c_x: 'Cross Blast',
      t_h: 'Tap a row to fire the Row Laser', t_v: 'Tap a column to fire the Column Laser', t_x: 'Tap a cell for the Cross Blast',
      th_bomb: 'New threat: bomb bricks explode into their neighbours',
      th_regen: 'New threat: green bricks heal every turn',
      th_ghost: 'New threat: ghost bricks phase out every other turn',
      th_split: 'New threat: splitters break into two small bricks',
      th_mover: 'New threat: movers slide sideways every turn',
      th_boss: 'Boss stage! Break the crowned hexagon for +10 ◆',
      th_chaos: 'Chaos mode: every threat is active',
    },
    ar: {
      tagline: '// بروتوكول الشبكة النيون',
      m_classic: 'كلاسيك', m_polygon: 'مضلعات', m_mixed: 'مختلط', m_chaos: 'فوضى',
      s_classic: 'مربعات', s_polygon: 'مثلث · سداسي · معين', s_mixed: 'كل الأشكال', s_chaos: 'كل الأعداء',
      stageMap: 'خريطة المراحل', endless: 'لعب بلا نهاية', mapTitle: 'خريطة المراحل',
      score: 'النقاط', best: 'الأفضل', lines: 'الصفوف', reward: 'المكافأة', fire: 'إطلاق', bonus: 'مكافأة',
      paused: 'إيقاف مؤقت', resume: 'متابعة', restart: 'إعادة', settings: 'الإعدادات', quit: 'خروج',
      settingsTitle: 'الإعدادات', sound: 'المؤثرات الصوتية', haptics: 'الاهتزاز', fxHigh: 'توهج قوي',
      guide: 'خط تصويب طويل', language: 'اللغة', langAuto: 'لغة الهاتف', reset: 'مسح التقدم',
      resetConfirm: 'اضغط مرة أخرى للتأكيد', resetDone: 'تم مسح التقدم', done: 'تم',
      overTitle: 'تم اختراق النظام', overSub: 'وصلت الأشكال إلى المدفع.', newBest: 'رقم قياسي جديد!',
      revive: 'إحياء', retry: 'حاول مجددًا', exit: 'خروج',
      clearTitle: 'اجتزت المرحلة', next: 'المرحلة التالية', replay: 'إعادة اللعب',
      bonusTitle: 'دفعة إضافية', bonusSub: 'استراحة مكافأة تجريبية (بدون إعلانات حقيقية).',
      bonusNext: '+{n} كرة للرمية القادمة', bonusLoaded: 'تمت إضافة {n} كرة',
      helpTitle: 'طريقة اللعب', gotIt: 'فهمت',
      help: [
        '<b>صوّب</b> بالسحب في أي مكان على اللوحة ثم ارفع إصبعك للإطلاق. يمكنك أيضًا استخدام الشريط وزر الإطلاق.',
        'كل شكل يعرض <b>نقاط حياته</b>. لونه يتغير من الوردي إلى البنفسجي إلى السماوي كلما ضعف.',
        'بعد كل رمية تنزل الشبكة صفًا. إذا عبر أي شكل <b>الخط الأحمر</b> تنتهي اللعبة.',
        '<b>الحلقات</b> تعطي كرة إضافية. <b>الجواهر</b> تعطي ماسات. <b>البرق</b> يضرب الصف أو العمود كله مع كل كرة تمر. <b>الكرة البرتقالية</b> تضاعف قوة الرمية القادمة. <b>الدوامة</b> تغيّر اتجاه الكرة عشوائيًا.',
        '<b>الأعداء:</b> 💣 القنابل تنفجر في جيرانها، ✚ الخضراء تعالج نفسها كل دور، 👻 الأشباح تختفي دورًا وتظهر دورًا، ◐ المنقسمة تتحول إلى قطعتين، ⇄ المتحركة تنتقل يمينًا ويسارًا. كل مرحلة عاشرة فيها <b>زعيم</b>.',
        '<b>البطاقات</b> (ليزر الصف والعمود والانفجار المتقاطع) تحصل عليها من الضربات المتتالية، وكل 10 صفوف، والأشكال ذات القلب الذهبي، أو تشتريها بالماس. اضغط البطاقة ثم اضغط على اللوحة.',
        'امسح كل صفوف المرحلة لتحصل على 3 نجوم. كلما قلّت الأدوار الزائدة زادت النجوم.',
      ],
      stage: 'المرحلة', endlessTag: 'بلا نهاية',
      lineOf: 'الصف {a} / {b}', lineCard: 'الصف {a} · بطاقة عند {b}', clearLeft: 'امسح الشبكة · متبقي {n}',
      menuBest: '{mode}: المرحلة {n} مفتوحة · أفضل نتيجة {b}',
      gift: 'هدية يومية · +25', giftDone: 'تم استلام هدية اليوم', giftToast: 'حصلت على 25 ◆',
      starsOf: '{a} / {b}', unlocked: '{a} / {b} مفتوحة', locked: 'أكمل المرحلة {n} أولًا', boss: 'زعيم',
      cardsBetween: 'البطاقات تعمل بين الرميات', needGems: 'تحتاج {n} ◆ لشراء {card}', bought: 'تم شراء {card}',
      cardEarned: '{reason} ← بطاقة {card}!', milestone: 'إنجاز الصف {n}', coreShard: 'قلب ذهبي', combo: 'ضربة متتالية ×{n}',
      wiped: 'تم مسح الشبكة  +{n}', plusBalls: '+{n} كرات', power2x: 'قوة ×2',
      c_h: 'ليزر الصف', c_v: 'ليزر العمود', c_x: 'الانفجار المتقاطع',
      t_h: 'اضغط على صف لإطلاق الليزر', t_v: 'اضغط على عمود لإطلاق الليزر', t_x: 'اضغط على خانة للانفجار',
      th_bomb: 'عدو جديد: القنابل تنفجر في الأشكال المجاورة',
      th_regen: 'عدو جديد: الأشكال الخضراء تعالج نفسها كل دور',
      th_ghost: 'عدو جديد: الأشباح تختفي دورًا وتظهر دورًا',
      th_split: 'عدو جديد: الأشكال المنقسمة تتحول إلى قطعتين',
      th_mover: 'عدو جديد: أشكال تتحرك يمينًا ويسارًا',
      th_boss: 'مرحلة زعيم! اكسر السداسي المتوج لتحصل على 10 ◆',
      th_chaos: 'وضع الفوضى: كل الأعداء موجودون',
    },
  };
  let LANG = 'en';
  function T(key, vars) {
    let str = (STR[LANG] && STR[LANG][key]) || STR.en[key] || key;
    if (vars) for (const k in vars) str = str.split('{' + k + '}').join(vars[k]);
    return str;
  }
  const modeName = (m) => T('m_' + m);

  // Small math helpers
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  const easeOutBack = (t) => { const c = 1.4; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  const fmt = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : String(n));
  const today = () => new Date().toISOString().slice(0, 10);

  // ---------------------------------------------------------------------
  // 2. Persistence
  // ---------------------------------------------------------------------
  const SAVE_KEY = 'cyberbreaker.save.v1';
  const defaults = () => ({
    diamonds: 60,
    cards: { h: 1, v: 1, x: 1 },
    mode: 'classic',
    progress: {
      classic: { unlocked: 1, stars: {} },
      polygon: { unlocked: 1, stars: {} },
      mixed:   { unlocked: 1, stars: {} },
      chaos:   { unlocked: 1, stars: {} },
    },
    best: {},
    settings: { sound: true, haptics: true, fxHigh: true, guide: false },
    lastGift: '',
    lang: 'auto',
    seenThreats: {},
  });
  function deepMerge(base, src) {
    for (const k of Object.keys(src || {})) {
      const v = src[k];
      if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object') deepMerge(base[k], v);
      else base[k] = v;
    }
    return base;
  }
  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) return deepMerge(defaults(), JSON.parse(raw));
    } catch (e) { /* storage blocked or corrupt: fall back to defaults */ }
    return defaults();
  }
  let save = loadSave();
  function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ignore */ } }

  // ---------------------------------------------------------------------
  // 3. Audio & haptics
  // ---------------------------------------------------------------------
  const Sfx = (() => {
    let ac = null, master = null;
    const last = {};
    function ensure() {
      if (!ac) {
        try {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return;
          ac = new AC();
          master = ac.createGain();
          master.gain.value = 0.16;
          master.connect(ac.destination);
        } catch (e) { ac = null; }
      }
      if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
    }
    function tone(freq, dur, type = 'sine', vol = 1, slide = 0, delay = 0) {
      if (!ac) return;
      const t = ac.currentTime + delay;
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + dur + 0.03);
    }
    const GAP = { hit: 38, fire: 60, ring: 50, break: 45, gem: 60 };
    function play(name) {
      if (!save.settings.sound || !ac) return;
      const now = performance.now();
      if (GAP[name] && last[name] && now - last[name] < GAP[name]) return;
      last[name] = now;
      switch (name) {
        case 'hit':   tone(480 + Math.random() * 260, 0.05, 'square', 0.18); break;
        case 'break': tone(320, 0.2, 'triangle', 0.55, 0.35); tone(900, 0.08, 'square', 0.15); break;
        case 'fire':  tone(700, 0.035, 'sine', 0.12); break;
        case 'ring':  tone(880, 0.12, 'sine', 0.45, 1.6); break;
        case 'gem':   tone(1320, 0.1, 'sine', 0.4, 1.3); tone(1760, 0.12, 'sine', 0.3, 1, 0.06); break;
        case 'laser': tone(1400, 0.45, 'sawtooth', 0.35, 0.15); tone(90, 0.5, 'square', 0.35, 0.5); break;
        case 'card':  tone(660, 0.1, 'triangle', 0.5); tone(990, 0.16, 'triangle', 0.5, 1, 0.09); break;
        case 'drop':  tone(160, 0.12, 'sine', 0.35, 0.6); break;
        case 'over':  tone(260, 0.7, 'sawtooth', 0.45, 0.25); break;
        case 'clear': [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', 0.5, 1, i * 0.11)); break;
        case 'click': tone(520, 0.04, 'sine', 0.25); break;
      }
    }
    return { ensure, play };
  })();
  function buzz(ms) {
    if (!save.settings.haptics || !navigator.vibrate) return;
    try { navigator.vibrate(ms); } catch (e) { /* ignore */ }
  }

  // ---------------------------------------------------------------------
  // 4. DOM helpers, screens, toasts
  // ---------------------------------------------------------------------
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const canvas = $('#board');
  const ctx = canvas.getContext('2d', { alpha: false });
  const ui = {
    hudStage: $('#hudStage'), hudScore: $('#hudScore'), hudBest: $('#hudBest'),
    hudFill: $('#hudFill'), hudLine: $('#hudLine'),
    slider: $('#aimSlider'), fireBtn: $('#fireBtn'),
    speedBtn: $('#speedBtn'), speedLabel: $('#speedLabel'), recallBtn: $('#recallBtn'),
    bonusBtn: $('#bonusBtn'), bonusLabel: $('#bonusLabel'),
    hint: $('#hint'), toast: $('#toast'),
  };

  let currentScreen = 'menuScreen';
  function showScreen(id) {
    $$('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
    currentScreen = id;
    if (id === 'gameScreen') requestAnimationFrame(layout);
  }
  function openModal(id) { $('#' + id).hidden = false; }
  function closeModal(id) { $('#' + id).hidden = true; }

  let toastTimer = 0;
  function toast(msg, color) {
    ui.toast.textContent = msg;
    ui.toast.style.borderColor = color || '';
    ui.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ui.toast.classList.remove('show'), 1700);
  }
  function refreshGems() { $$('.js-gems').forEach((el) => (el.textContent = fmt(save.diamonds))); }

  // ---------------------------------------------------------------------
  // 5. Canvas layout & responsive sizing
  // ---------------------------------------------------------------------
  // All game coordinates are in CSS pixels; the context is scaled by DPR.
  let dpr = 1, W = 0, H = 0, cell = 0, topPad = 0, dangerY = 0, floorY = 0, R = 0;
  let bgCanvas = null;

  function layout() {
    const wrap = $('#boardWrap');
    const aw = wrap.clientWidth, ah = wrap.clientHeight;
    if (!aw || !ah) return;
    const rowsTotal = CFG.topPadCells + CFG.rows + CFG.launchCells;
    const newCell = Math.max(12, Math.floor(Math.min(aw / CFG.cols, ah / rowsTotal)));
    const oldCell = cell;
    cell = newCell;
    W = cell * CFG.cols;
    H = Math.floor(cell * rowsTotal);
    topPad = cell * CFG.topPadCells;
    dangerY = topPad + CFG.rows * cell;
    floorY = H - cell * 0.18;
    R = cell * CFG.ballRadius;
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    spriteCache.clear();
    ballSprite = null;
    buildBackground();
    // Rescale anything positioned in pixels
    if (G && oldCell && oldCell !== cell) {
      const k = cell / oldCell;
      G.launcherX *= k;
      if (G.nextX != null) G.nextX *= k;
      for (const b of G.balls) { b.x *= k; b.y *= k; b.vx *= k; b.vy *= k; }
      for (const p of G.particles) { p.x *= k; p.y *= k; }
      for (const f of G.floats) { f.x *= k; f.y *= k; }
    }
    if (G) eachBrick(placeBrick);
  }

  function buildBackground() {
    bgCanvas = document.createElement('canvas');
    bgCanvas.width = canvas.width; bgCanvas.height = canvas.height;
    const c = bgCanvas.getContext('2d');
    c.scale(dpr, dpr);
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#07041a'); g.addColorStop(0.7, '#0c0726'); g.addColorStop(1, '#1a0a33');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // faint cyber grid
    c.strokeStyle = 'rgba(120,160,255,0.05)'; c.lineWidth = 1;
    c.beginPath();
    for (let i = 1; i < CFG.cols; i++) { c.moveTo(i * cell + 0.5, topPad); c.lineTo(i * cell + 0.5, dangerY); }
    for (let r = 0; r <= CFG.rows; r++) { const y = topPad + r * cell + 0.5; c.moveTo(0, y); c.lineTo(W, y); }
    c.stroke();
    // launch zone glow
    const lg = c.createLinearGradient(0, dangerY, 0, H);
    lg.addColorStop(0, 'rgba(166,77,255,0)'); lg.addColorStop(1, 'rgba(166,77,255,0.18)');
    c.fillStyle = lg; c.fillRect(0, dangerY, W, H - dangerY);
  }

  // ---------------------------------------------------------------------
  // 6. Shape geometry & collision
  // ---------------------------------------------------------------------
  /** Local polygon (relative to cell centre) for a shape. */
  function localPoly(shape, orient) {
    const h = cell / 2 - cell * CFG.pad;
    switch (shape) {
      case 'square': return [[-h, -h], [h, -h], [h, h], [-h, h]];
      case 'triangle': {
        // right triangle; orient picks which corner holds the right angle
        const T = [
          [[-h, h], [-h, -h], [h, h]],   // bottom-left
          [[h, h], [-h, h], [h, -h]],    // bottom-right
          [[-h, -h], [h, -h], [-h, h]],  // top-left
          [[h, -h], [h, h], [-h, -h]],   // top-right
        ];
        return T[orient];
      }
      case 'hexagon': {
        const pts = [];
        for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + (i * Math.PI) / 3; pts.push([Math.cos(a) * h * 1.06, Math.sin(a) * h * 1.06]); }
        return pts;
      }
      case 'diamond': { const k = h * 1.08; return [[0, -k], [k, 0], [0, k], [-k, 0]]; }
      default: return null; // circle
    }
  }

  /** Compute pixel-space geometry for a brick from its row/col. */
  function placeBrick(b) {
    b.cx = (b.col + 0.5) * cell;
    b.cy = topPad + (b.row + 0.5) * cell;
    const lp = localPoly(b.shape, b.orient);
    if (lp) {
      b.poly = lp.map(([x, y]) => [b.cx + x, b.cy + y]);
      let sx = 0, sy = 0;
      for (const [x, y] of lp) { sx += x; sy += y; }
      b.tx = b.cx + sx / lp.length; b.ty = b.cy + sy / lp.length;
    } else {
      b.poly = null; b.rad = cell / 2 - cell * CFG.pad; b.tx = b.cx; b.ty = b.cy;
    }
  }

  /**
   * Circle vs. shape. Returns {nx, ny, d} (push-out normal & depth) or null.
   * Works for any convex polygon, so triangles reflect off their true angle.
   */
  function collide(bx, by, r, br) {
    const dxc = bx - br.cx, dyc = by - br.cy, lim = cell * 0.5 + r;
    if (dxc > lim || dxc < -lim || dyc > lim || dyc < -lim) return null;
    if (!br.poly) {
      const d = Math.hypot(dxc, dyc), rr = br.rad + r;
      if (d >= rr) return null;
      return d > 1e-6 ? { nx: dxc / d, ny: dyc / d, d: rr - d } : { nx: 0, ny: 1, d: rr };
    }
    const p = br.poly, n = p.length;
    let best = Infinity, qx = 0, qy = 0, bestEdge = 0, inside = true, sign = 0;
    for (let i = 0; i < n; i++) {
      const a = p[i], b = p[(i + 1) % n];
      const ex = b[0] - a[0], ey = b[1] - a[1];
      const cr = ex * (by - a[1]) - ey * (bx - a[0]);
      if (cr !== 0) { const s = cr > 0 ? 1 : -1; if (!sign) sign = s; else if (s !== sign) inside = false; }
      let t = ((bx - a[0]) * ex + (by - a[1]) * ey) / (ex * ex + ey * ey);
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const px = a[0] + ex * t, py = a[1] + ey * t;
      const d2 = (bx - px) * (bx - px) + (by - py) * (by - py);
      if (d2 < best) { best = d2; qx = px; qy = py; bestEdge = i; }
    }
    const d = Math.sqrt(best);
    if (inside) {
      // Centre penetrated the shape: exit through the nearest edge
      const a = p[bestEdge], b = p[(bestEdge + 1) % n];
      let nx = b[1] - a[1], ny = -(b[0] - a[0]);
      const L = Math.hypot(nx, ny) || 1; nx /= L; ny /= L;
      const mx = (a[0] + b[0]) / 2 - br.tx, my = (a[1] + b[1]) / 2 - br.ty;
      if (nx * mx + ny * my < 0) { nx = -nx; ny = -ny; }
      return { nx, ny, d: d + r };
    }
    if (d >= r || d < 1e-6) return null;
    return { nx: (bx - qx) / d, ny: (by - qy) / d, d: r - d };
  }

  /** Trace a shape path on a context (local coords, centred on 0,0). */
  function tracePath(c, shape, orient) {
    c.beginPath();
    const lp = localPoly(shape, orient);
    if (!lp) { c.arc(0, 0, cell / 2 - cell * CFG.pad, 0, Math.PI * 2); return; }
    if (shape === 'square' && c.roundRect) { const h = cell / 2 - cell * CFG.pad; c.roundRect(-h, -h, h * 2, h * 2, cell * 0.12); return; }
    c.moveTo(lp[0][0], lp[0][1]);
    for (let i = 1; i < lp.length; i++) c.lineTo(lp[i][0], lp[i][1]);
    c.closePath();
  }

  // ---------------------------------------------------------------------
  // 7. Sprite cache — glow is expensive, so bake it once per (shape, hue)
  // ---------------------------------------------------------------------
  const spriteCache = new Map();
  let ballSprite = null;
  const HUE_STOPS = [[0, 150], [0.3, 185], [0.62, 275], [1, 335]]; // green → cyan → purple → hot pink
  function hueFor(ratio) {
    for (let i = 1; i < HUE_STOPS.length; i++) {
      if (ratio <= HUE_STOPS[i][0]) {
        const [r0, h0] = HUE_STOPS[i - 1], [r1, h1] = HUE_STOPS[i];
        return lerp(h0, h1, (ratio - r0) / (r1 - r0));
      }
    }
    return HUE_STOPS[HUE_STOPS.length - 1][1];
  }
  const BUCKETS = 20;
  function bucketOf(b) { return clamp(Math.ceil((b.hp / b.maxHp) * BUCKETS), 0, BUCKETS); }

  function brickSprite(b) {
    const bucket = bucketOf(b);
    const key = b.shape + b.orient + ':' + bucket;
    let s = spriteCache.get(key);
    if (s) return s;
    const hue = hueFor(bucket / BUCKETS);
    const glow = Math.ceil(cell * 0.32);
    const size = cell + glow * 2;
    const oc = document.createElement('canvas');
    oc.width = Math.ceil(size * dpr); oc.height = Math.ceil(size * dpr);
    const c = oc.getContext('2d');
    c.scale(dpr, dpr);
    c.translate(size / 2, size / 2);
    c.lineJoin = 'round';
    tracePath(c, b.shape, b.orient);
    const fg = c.createLinearGradient(0, -cell / 2, 0, cell / 2);
    fg.addColorStop(0, `hsla(${hue},95%,34%,0.85)`);
    fg.addColorStop(1, `hsla(${hue},90%,14%,0.9)`);
    c.fillStyle = fg;
    if (save.settings.fxHigh) { c.shadowColor = `hsl(${hue},100%,60%)`; c.shadowBlur = cell * 0.3; }
    c.fill();
    c.lineWidth = cell * 0.06;
    c.strokeStyle = `hsl(${hue},100%,62%)`;
    c.stroke();
    if (save.settings.fxHigh) { c.shadowBlur = cell * 0.12; c.stroke(); }
    c.shadowBlur = 0;
    c.lineWidth = cell * 0.02;
    c.strokeStyle = `hsla(${hue},100%,90%,0.9)`;
    c.stroke();
    s = { canvas: oc, size, hue };
    spriteCache.set(key, s);
    return s;
  }

  function getBallSprite() {
    if (ballSprite) return ballSprite;
    const size = Math.ceil(R * 5);
    const oc = document.createElement('canvas');
    oc.width = Math.ceil(size * dpr); oc.height = Math.ceil(size * dpr);
    const c = oc.getContext('2d');
    c.scale(dpr, dpr);
    const g = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.3, 'rgba(230,255,250,1)');
    g.addColorStop(0.42, 'rgba(60,240,255,0.55)');
    g.addColorStop(1, 'rgba(60,240,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, size, size);
    ballSprite = { canvas: oc, size };
    return ballSprite;
  }

  // ---------------------------------------------------------------------
  // 8. Game state, row generation, turn flow
  // ---------------------------------------------------------------------
  let G = null;
  const makeGrid = () => Array.from({ length: CFG.rows + 2 }, () => Array(CFG.cols).fill(null));

  function eachBrick(fn) {
    for (const row of G.grid) for (const b of row) if (b) fn(b);
  }
  function countBricks() { let n = 0; eachBrick(() => n++); return n; }

  function stageTarget(stage) { return 10 + Math.floor(stage * 0.8); }
  function bestKey() { return G.mode + ':' + (G.endless ? 'endless' : G.stage); }

  function newGame(mode, stage) {
    G = {
      mode, stage, endless: stage === 0,
      state: 'aiming', prevState: null,
      score: 0, line: 0,
      target: stage ? stageTarget(stage) : Infinity,
      grid: makeGrid(), items: makeGrid(),
      balls: [], ballCount: stage ? 2 + Math.floor(stage / 3) : 1,
      newBalls: 0, bonusBalls: 0, bonusUsed: false,
      launcherX: W / 2, nextX: null,
      aimAngle: Math.PI / 2, shotAngle: Math.PI / 2,
      aiming: false, sliderAim: false, aimValid: false,
      queue: 0, fireTimer: 0, fired: 0, turnTime: 0,
      userSpeed: 1, turnsAfterDone: 0, destroyedThisTurn: 0,
      revived: false, dropT: 1,
      targeting: null, targetCell: null, targetDown: false,
      particles: [], floats: [], beams: [], rings: [], shake: 0, flash: 0, time: 0,
      turnDamage: 1, powerNext: false,
    };
    // opening board: two rows
    spawnRow();
    shiftDown();
    spawnRow();
    G.dropT = 0; G.state = 'dropping';
    ui.slider.value = 0;
    closeAllModals();
    updateControls();
    updateHUD(true);
    announceThreat();
  }

  function announceThreat() {
    let key = null;
    if (MODES[G.mode].chaos) key = 'chaos';
    else if (!G.endless && G.stage % 10 === 0) key = 'boss';
    else if (!G.endless) { const b = BEHAVIORS.find((x) => x.from === G.stage); if (b) key = b.id; }
    if (!key) return;
    const seenKey = key === 'boss' || key === 'chaos' ? key + G.stage : key;
    if (key !== 'boss' && save.seenThreats[seenKey]) return;
    save.seenThreats[seenKey] = 1; persist();
    setTimeout(() => toast(T('th_' + key), 'var(--purple)'), 500);
  }

  function hpForLine(line) {
    // Boss stages (every 10th) hit 30% harder
    const mult = G.endless ? 1 : (1 + 0.06 * (G.stage - 1)) * (G.stage % 10 === 0 ? 1.3 : 1);
    return Math.max(1, Math.round(line * mult));
  }

  /** Difficulty tier: stage number, or a rising tier in endless mode. */
  function tierOf() {
    const t = G.endless ? Math.floor(G.line / 4) + 1 : G.stage;
    return MODES[G.mode].chaos ? Math.max(t, 20) : t;
  }
  function patternOf() {
    const idx = G.endless ? Math.floor(G.line / 12) : G.stage;
    return PATTERN_CYCLE[idx % PATTERN_CYCLE.length];
  }
  function pickBehavior(tier) {
    const k = MODES[G.mode].chaos ? 2 : 1;
    for (const b of shuffle(BEHAVIORS.slice())) {
      if (tier >= b.from && Math.random() < b.rate * k) return b.id;
    }
    return null;
  }
  function makeBrick(row, col, shape, hp, extra) {
    const b = Object.assign({ row, col, shape, orient: randInt(0, 3), hp, maxHp: hp, core: null, kind: null,
      phased: false, flash: 0, dmgAcc: 0, floatT: 0 }, extra || {});
    placeBrick(b);
    return b;
  }

  /** Create one new row at the top (row 0). */
  function spawnRow() {
    G.line++;
    const mode = MODES[G.mode];
    const tier = tierOf();
    const base = hpForLine(G.line);
    const pattern = PATTERNS[patternOf()];
    let brickCols, free;
    if (pattern) {
      brickCols = []; free = [];
      for (let c = 0; c < CFG.cols; c++) (pattern(G.line, c) && Math.random() < 0.88 ? brickCols : free).push(c);
      if (!free.length) free.push(brickCols.splice(randInt(0, brickCols.length - 1), 1)[0]);
      if (!brickCols.length) brickCols.push(free.splice(randInt(0, free.length - 1), 1)[0]);
      shuffle(free);
    } else {
      const maxB = Math.min(CFG.cols - 1, 3 + Math.floor(tier / 6) + Math.floor(G.line / 14));
      const count = randInt(2, Math.max(2, maxB));
      const cols = shuffle([...Array(CFG.cols).keys()]);
      brickCols = cols.slice(0, count); free = cols.slice(count);
    }
    const isBossStage = !G.endless && G.stage % 10 === 0;
    const bossCol = (isBossStage && G.line % 5 === 0) || (G.endless && G.line % 25 === 0) ? pick(brickCols) : -1;

    for (const c of brickCols) {
      const shape = pick(mode.shapes);
      const heavy = Math.random() < 0.14 ? 2 : 1;
      let hp = Math.max(1, Math.round(base * SHAPE_HP[shape] * heavy));
      const roll = Math.random();
      const core = roll < 0.045 ? pick(['h', 'v', 'x']) : roll < 0.11 ? 'ball' : null;
      let kind = core ? null : pickBehavior(tier);
      if (c === bossCol) { kind = 'boss'; hp = Math.round(base * 3); }
      G.grid[0][c] = makeBrick(0, c, c === bossCol ? 'hexagon' : shape, hp, { core: c === bossCol ? null : core, kind, dir: Math.random() < 0.5 ? -1 : 1 });
    }
    // Items in the free cells: always try a ring first, then power-ups
    if (free.length && Math.random() < 0.9) G.items[0][free.shift()] = { type: 'ring', t: Math.random() * 6 };
    if (free.length) {
      const r = Math.random();
      const type = r < 0.07 ? 'zapH' : r < 0.14 ? 'zapV' : r < 0.21 ? 'scatter' : r < 0.25 ? 'power' : r < 0.37 ? 'gem' : null;
      if (type && (type === 'gem' || tier >= 2)) G.items[0][free.shift()] = { type, t: Math.random() * 6 };
    }
    for (let c = 0; c < CFG.cols; c++) { const it = G.items[0][c]; if (it) { it.row = 0; it.col = c; it.used = false; } }

    if (G.line > 2 && G.line % CFG.milestoneEvery === 0) awardCard(pick(['h', 'v', 'x']), T('milestone', { n: G.line }));
  }

  /** Enemy phase: runs once per turn before rows drop. */
  function enemyPhase() {
    const bricks = [];
    eachBrick((b) => bricks.push(b));
    for (const b of bricks) {
      if (b.kind === 'regen' && b.hp < b.maxHp) {
        const heal = Math.min(b.maxHp - b.hp, Math.ceil(b.maxHp * 0.15));
        b.hp += heal;
        floatText(b.tx, b.ty - cell * 0.3, '+' + heal, '#5dff9d');
      } else if (b.kind === 'ghost') {
        b.phased = !b.phased;
      } else if (b.kind === 'mover') {
        let nc = b.col + b.dir;
        if (nc < 0 || nc >= CFG.cols || G.grid[b.row][nc] || G.items[b.row][nc]) { b.dir = -b.dir; nc = b.col + b.dir; }
        if (nc >= 0 && nc < CFG.cols && !G.grid[b.row][nc] && !G.items[b.row][nc]) {
          G.grid[b.row][b.col] = null; b.col = nc; G.grid[b.row][nc] = b; placeBrick(b);
        }
      }
    }
    // Used one-shot items (lasers, scatter) burn out at the end of the turn
    for (let r = 0; r < CFG.rows; r++) for (let c = 0; c < CFG.cols; c++) {
      const it = G.items[r][c];
      if (it && it.used) G.items[r][c] = null;
    }
  }

  /** Move everything down one row; auto-collect items that fall off. */
  function shiftDown() {
    G.grid.unshift(Array(CFG.cols).fill(null));
    G.grid.length = CFG.rows + 2;
    G.items.unshift(Array(CFG.cols).fill(null));
    G.items.length = CFG.rows + 2;
    for (let r = 0; r < G.grid.length; r++) {
      for (let c = 0; c < CFG.cols; c++) {
        const b = G.grid[r][c];
        if (b) { b.row = r; placeBrick(b); }
        const it = G.items[r][c];
        if (it) {
          it.row = r; it.col = c;
          if (r >= CFG.rows) { // reached the launch zone: collect for free
            G.items[r][c] = null;
            if (it.type === 'ring') G.ballCount++;
            else if (it.type === 'gem') addDiamonds(2);
          }
        }
      }
    }
  }

  function advance() {
    enemyPhase();
    shiftDown();
    if (G.endless || G.line < G.target) spawnRow();
    else G.turnsAfterDone++;
    G.dropT = 0;
    G.state = 'dropping';
    Sfx.play('drop');
  }

  function afterDrop() {
    for (let c = 0; c < CFG.cols; c++) {
      if (G.grid[CFG.rows][c]) { gameOver(); return; }
    }
    G.state = 'aiming';
    updateControls();
  }

  function shoot() {
    if (!G || G.state !== 'aiming') return;
    Sfx.ensure();
    G.state = 'turning';
    G.shotAngle = G.aimAngle;
    G.queue = G.ballCount + G.bonusBalls;
    G.fired = 0;
    G.fireTimer = 0;
    G.turnTime = 0;
    G.destroyedThisTurn = 0;
    G.nextX = null;
    G.turnDamage = G.powerNext ? 2 : 1;
    G.powerNext = false;
    G.aiming = false; G.sliderAim = false;
    updateControls();
  }

  function endTurn() {
    if (G.nextX != null) G.launcherX = G.nextX;
    G.nextX = null;
    if (G.newBalls) { floatText(G.launcherX, floorY - cell * 0.6, T('plusBalls', { n: G.newBalls }), '#b6ff5c'); }
    G.ballCount += G.newBalls;
    G.newBalls = 0;
    G.bonusBalls = 0;
    if (G.destroyedThisTurn >= CFG.comboForCard) awardCard(pick(['h', 'v', 'x']), T('combo', { n: G.destroyedThisTurn }));
    if (checkStageClear()) return;
    if (countBricks() === 0) boardWipe();
    advance();
  }

  function boardWipe() {
    const bonus = 50 + G.line * 5;
    G.score += bonus;
    G.flash = 1;
    toast(T('wiped', { n: bonus }), 'var(--cyan)');
  }

  function checkStageClear() {
    if (G.endless || G.line < G.target || countBricks() > 0) return false;
    stageClear();
    return true;
  }

  // ---------------------------------------------------------------------
  // 9. Damage, rewards, cards & bonus
  // ---------------------------------------------------------------------
  function addDiamonds(n) { save.diamonds += n; persist(); refreshGems(); }
  function grantBalls(n) { if (G.state === 'turning') G.newBalls += n; else G.ballCount += n; }

  function damageBrick(b, dmg, hx, hy, silent) {
    const real = Math.min(dmg, b.hp);
    b.hp -= real;
    G.score += real;
    b.flash = 1;
    b.dmgAcc += real;
    if (!silent) {
      sparks(hx, hy, brickSprite(b).hue, save.settings.fxHigh ? 3 : 1);
      Sfx.play('hit');
    }
    if (b.hp <= 0) destroyBrick(b);
  }

  function destroyBrick(b) {
    G.grid[b.row][b.col] = null;
    flushFloat(b, true);
    const hue = hueFor(0.15);
    burst(b.tx, b.ty, [hue, 300, 190], save.settings.fxHigh ? 22 : 10);
    G.score += 5;
    G.destroyedThisTurn++;
    G.shake = Math.min(6, G.shake + 1.2);
    Sfx.play('break');
    buzz(8);
    if (b.core === 'ball') { grantBalls(2); floatText(b.tx, b.ty - cell * 0.3, '+2 ●', '#b6ff5c'); }
    else if (b.core) awardCard(b.core, T('coreShard'));
    if (b.kind === 'boss') { addDiamonds(10); floatText(b.tx, b.ty, '+10 ◆', '#ffd23f'); G.shake = 10; }
    if (b.kind === 'bomb') explode(b);
    if (b.kind === 'split') splitBrick(b);
  }

  function explode(b) {
    G.rings.push({ x: b.tx, y: b.ty, r: cell * 0.3, max: cell * 1.6, life: 1 });
    G.shake = Math.min(10, G.shake + 4);
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const n = G.grid[b.row + dr] && G.grid[b.row + dr][b.col + dc];
      if (n && n !== b) damageBrick(n, Math.ceil(n.maxHp * 0.5), n.tx, n.ty, true);
    }
    Sfx.play('laser');
  }

  function splitBrick(b) {
    const hp = Math.max(1, Math.ceil(b.maxHp / 3));
    const spots = [[0, -1], [0, 1], [-1, 0], [1, 0]].map(([dr, dc]) => [b.row + dr, b.col + dc])
      .filter(([r, c]) => r >= 0 && r < CFG.rows && c >= 0 && c < CFG.cols && !G.grid[r][c] && !G.items[r][c]);
    for (const [r, c] of shuffle(spots).slice(0, 2)) {
      G.grid[r][c] = makeBrick(r, c, 'circle', hp);
      burst((c + 0.5) * cell, topPad + (r + 0.5) * cell, [50, 30], 6);
    }
  }

  function collectItem(it, ball) {
    const x = (it.col + 0.5) * cell, y = topPad + (it.row + 0.5) * cell;
    // Persistent items trigger once per ball pass and burn out at turn end
    if (it.type === 'zapH' || it.type === 'zapV') {
      if (!ball) { G.items[it.row][it.col] = null; return; }
      it.used = true;
      const horiz = it.type === 'zapH';
      G.beams.push({ dir: horiz ? 'h' : 'v', pos: horiz ? y : x, life: 0.45, hue: horiz ? 325 : 185 });
      const hits = [];
      eachBrick((b) => { if (horiz ? b.row === it.row : b.col === it.col) hits.push(b); });
      for (const b of hits) damageBrick(b, 1, b.tx, b.ty, true);
      Sfx.play('hit');
      return;
    }
    if (it.type === 'scatter') {
      if (!ball) { G.items[it.row][it.col] = null; return; }
      it.used = true;
      const speed = Math.hypot(ball.vx, ball.vy);
      const a = rand(0.35, Math.PI - 0.35);
      ball.vx = Math.cos(a) * speed; ball.vy = -Math.sin(a) * speed;
      sparks(x, y, 50, 4);
      return;
    }
    G.items[it.row][it.col] = null;
    if (it.type === 'power') {
      G.powerNext = true;
      floatText(x, y, T('power2x'), '#ff9a3c');
      burst(x, y, [25, 45], 14);
      Sfx.play('card');
      return;
    }
    if (it.type === 'ring') {
      grantBalls(1);
      floatText(x, y, '+1', '#b6ff5c');
      burst(x, y, [90, 130], 12);
      Sfx.play('ring');
    } else {
      addDiamonds(2);
      floatText(x, y, '+2 ◆', '#ff6ad5');
      burst(x, y, [320, 190], 12);
      Sfx.play('gem');
    }
  }

  function awardCard(type, reason) {
    save.cards[type] = (save.cards[type] || 0) + 1;
    persist();
    updateCards();
    toast(T('cardEarned', { reason, card: T('c_' + type) }), 'var(--gold)');
    Sfx.play('card');
  }

  function onCardTap(type) {
    if (!G) return;
    Sfx.ensure();
    if (G.state === 'targeting') {
      if (G.targeting === type) { cancelTargeting(); return; }
    } else if (G.state !== 'aiming') {
      toast(T('cardsBetween'));
      return;
    }
    if (!save.cards[type]) {
      const cost = CARDS[type].cost;
      if (save.diamonds < cost) { toast(T('needGems', { n: cost, card: T('c_' + type) }), 'var(--red)'); return; }
      save.diamonds -= cost; save.cards[type] = 1; persist(); refreshGems();
      toast(T('bought', { card: T('c_' + type) }), 'var(--gold)');
    }
    G.state = 'targeting';
    G.targeting = type;
    G.targetCell = null;
    ui.hint.textContent = T('t_' + type);
    ui.hint.hidden = false;
    Sfx.play('click');
    updateControls();
  }

  function cancelTargeting() {
    G.state = 'aiming'; G.targeting = null; G.targetCell = null;
    ui.hint.hidden = true;
    updateControls();
  }

  function fireCard(type, row, col) {
    save.cards[type]--;
    persist();
    const hitRow = type === 'h' || type === 'x';
    const hitCol = type === 'v' || type === 'x';
    if (hitRow) G.beams.push({ dir: 'h', pos: topPad + (row + 0.5) * cell, life: 1, hue: 325 });
    if (hitCol) G.beams.push({ dir: 'v', pos: (col + 0.5) * cell, life: 1, hue: 185 });
    const targets = [];
    eachBrick((b) => { if ((hitRow && b.row === row) || (hitCol && b.col === col)) targets.push(b); });
    G.destroyedThisTurn = 0;
    for (const b of targets) damageBrick(b, b.hp, b.tx, b.ty, true);
    // Lasers also sweep up items on their line
    for (let r = 0; r < CFG.rows; r++) for (let c = 0; c < CFG.cols; c++) {
      const it = G.items[r][c];
      if (it && ((hitRow && r === row) || (hitCol && c === col))) collectItem(it);
    }
    G.shake = 9; G.flash = 0.6;
    Sfx.play('laser'); buzz(40);
    G.state = 'aiming'; G.targeting = null; G.targetCell = null;
    ui.hint.hidden = true;
    updateControls();
    if (checkStageClear()) return;
    if (countBricks() === 0) boardWipe();
  }

  // Simulated reward break: a countdown, then extra balls for the next shot.
  let bonusTimer = 0;
  function bonusAmount() { return Math.max(10, Math.min(100, G.ballCount)); }
  function startBonus() {
    if (!G || G.state !== 'aiming' || G.bonusUsed) return;
    if (window.CBAds && window.CBAds.rewardedBonus()) return; // Android app: real rewarded ad
    Sfx.ensure();
    G.prevState = G.state; G.state = 'paused';
    const amount = bonusAmount();
    let n = 3;
    $('#bonusCount').textContent = n;
    $('#bonusText').textContent = T('bonusNext', { n: amount });
    openModal('bonusModal');
    clearInterval(bonusTimer);
    bonusTimer = setInterval(() => {
      n--;
      if (n > 0) { $('#bonusCount').textContent = n; Sfx.play('click'); return; }
      clearInterval(bonusTimer);
      closeModal('bonusModal');
      G.bonusBalls = amount; G.bonusUsed = true; G.state = 'aiming';
      toast(T('bonusLoaded', { n: amount }), 'var(--gold)');
      Sfx.play('card');
      updateControls();
    }, 800);
  }

  function recall() {
    if (!G || G.state !== 'turning') return;
    G.queue = 0;
    if (G.nextX == null) G.nextX = G.launcherX;
    for (const b of G.balls) { if (!b.done) { b.done = true; b.y = floorY - R; } }
  }

  // ---------------------------------------------------------------------
  // 10. Input
  // ---------------------------------------------------------------------
  function toLocal(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
  }

  function updateAim(p) {
    const dx = p.x - G.launcherX, dy = floorY - R - p.y;
    if (dy < cell * 0.3) { G.aimValid = false; return; }
    G.aimAngle = clamp(Math.atan2(dy, dx), CFG.minAngle, Math.PI - CFG.minAngle);
    G.aimValid = true;
    ui.slider.value = ((Math.PI / 2 - G.aimAngle) * 180) / Math.PI;
  }

  function setTarget(p) {
    G.targetCell = {
      row: clamp(Math.floor((p.y - topPad) / cell), 0, CFG.rows - 1),
      col: clamp(Math.floor(p.x / cell), 0, CFG.cols - 1),
    };
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (!G) return;
    Sfx.ensure();
    const p = toLocal(e);
    if (G.state === 'aiming') {
      G.aiming = true; G.sliderAim = false;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      updateAim(p);
    } else if (G.state === 'targeting') {
      G.targetDown = true;
      setTarget(p);
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!G) return;
    const p = toLocal(e);
    if (G.state === 'aiming' && G.aiming) updateAim(p);
    else if (G.state === 'targeting' && (G.targetDown || e.pointerType === 'mouse')) setTarget(p);
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!G) return;
    if (G.state === 'aiming' && G.aiming) {
      G.aiming = false;
      updateAim(toLocal(e));
      if (G.aimValid) shoot();
    } else if (G.state === 'targeting' && G.targetDown) {
      G.targetDown = false;
      setTarget(toLocal(e));
      fireCard(G.targeting, G.targetCell.row, G.targetCell.col);
    }
  });
  canvas.addEventListener('pointercancel', () => { if (G) { G.aiming = false; G.targetDown = false; } });

  ui.slider.addEventListener('input', () => {
    if (!G || G.state !== 'aiming') return;
    G.aimAngle = clamp(Math.PI / 2 - (parseFloat(ui.slider.value) * Math.PI) / 180, CFG.minAngle, Math.PI - CFG.minAngle);
    G.sliderAim = true; G.aimValid = true;
  });
  ui.fireBtn.addEventListener('click', () => { if (G && G.state === 'aiming') { G.aimValid = true; shoot(); } });
  ui.speedBtn.addEventListener('click', () => {
    if (!G) return;
    G.userSpeed = G.userSpeed >= 3 ? 1 : G.userSpeed + 1;
    Sfx.play('click');
    updateControls();
  });
  ui.recallBtn.addEventListener('click', recall);
  ui.bonusBtn.addEventListener('click', startBonus);
  $$('.card').forEach((btn) => btn.addEventListener('click', () => onCardTap(btn.dataset.card)));

  window.addEventListener('keydown', (e) => {
    if (!G || currentScreen !== 'gameScreen') return;
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { G.state === 'paused' ? resume() : pause(); return; }
    if (G.state === 'targeting' && e.key === 'Escape') { cancelTargeting(); return; }
    if (G.state !== 'aiming') return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const step = (e.shiftKey ? 0.5 : 2) * (e.key === 'ArrowLeft' ? 1 : -1) * (Math.PI / 180);
      G.aimAngle = clamp(G.aimAngle + step, CFG.minAngle, Math.PI - CFG.minAngle);
      ui.slider.value = ((Math.PI / 2 - G.aimAngle) * 180) / Math.PI;
      G.sliderAim = true; G.aimValid = true;
      e.preventDefault();
    } else if (e.key === ' ' || e.key === 'Enter') { shoot(); e.preventDefault(); }
    else if (e.key === '1') onCardTap('h');
    else if (e.key === '2') onCardTap('v');
    else if (e.key === '3') onCardTap('x');
  });

  // ---------------------------------------------------------------------
  // 11. Simulation
  // ---------------------------------------------------------------------
  function effectiveSpeed() {
    // Long turns speed themselves up so players never wait forever.
    const t = G.turnTime;
    const auto = t > 24 ? 4 : t > 14 ? 3 : t > 7 ? 2 : 1;
    return Math.max(G.userSpeed, auto);
  }

  function launchBall() {
    const speed = CFG.ballSpeed * cell;
    G.balls.push({
      x: G.launcherX, y: floorY - R,
      vx: Math.cos(G.shotAngle) * speed, vy: -Math.sin(G.shotAngle) * speed,
      done: false,
    });
    G.fired++;
    Sfx.play('fire');
  }

  function fixVelocity(b, speed) {
    const minVy = speed * 0.1;
    if (Math.abs(b.vy) < minVy) b.vy = (b.vy < 0 ? -1 : 1) * minVy;
    const s = Math.hypot(b.vx, b.vy) || 1;
    b.vx *= speed / s; b.vy *= speed / s;
  }

  function stepBall(b, h, speed) {
    b.x += b.vx * h;
    b.y += b.vy * h;
    // walls
    if (b.x < R) { b.x = R; b.vx = Math.abs(b.vx); }
    else if (b.x > W - R) { b.x = W - R; b.vx = -Math.abs(b.vx); }
    if (b.y < R) { b.y = R; b.vy = Math.abs(b.vy); }
    // floor: collect the ball
    if (b.vy > 0 && b.y >= floorY - R) {
      b.y = floorY - R; b.done = true;
      if (G.nextX == null) G.nextX = clamp(b.x, R * 2, W - R * 2);
      return;
    }
    // bricks (only the 3×3 neighbourhood)
    const c0 = Math.floor(b.x / cell), r0 = Math.floor((b.y - topPad) / cell);
    outer:
    for (let rr = r0 - 1; rr <= r0 + 1; rr++) {
      if (rr < 0 || rr > CFG.rows) continue;
      const row = G.grid[rr];
      for (let cc = c0 - 1; cc <= c0 + 1; cc++) {
        if (cc < 0 || cc >= CFG.cols) continue;
        const br = row[cc];
        if (!br || br.phased) continue;
        const hit = collide(b.x, b.y, R, br);
        if (!hit) continue;
        b.x += hit.nx * hit.d; b.y += hit.ny * hit.d;
        const dot = b.vx * hit.nx + b.vy * hit.ny;
        if (dot < 0) { b.vx -= 2 * dot * hit.nx; b.vy -= 2 * dot * hit.ny; }
        fixVelocity(b, speed);
        damageBrick(br, G.turnDamage || 1, b.x - hit.nx * R, b.y - hit.ny * R);
        break outer;
      }
    }
    // collectibles (b.lastItem stops one pass from triggering an item twice)
    const ir = cell * 0.22 + R;
    if (b.lastItem) {
      const li = b.lastItem, dx = b.x - (li.col + 0.5) * cell, dy = b.y - (topPad + (li.row + 0.5) * cell);
      if (dx * dx + dy * dy > ir * ir * 1.3) b.lastItem = null;
    }
    for (let rr = r0 - 1; rr <= r0 + 1; rr++) {
      if (rr < 0 || rr >= CFG.rows) continue;
      for (let cc = c0 - 1; cc <= c0 + 1; cc++) {
        if (cc < 0 || cc >= CFG.cols) continue;
        const it = G.items[rr][cc];
        if (!it) continue;
        const dx = b.x - (cc + 0.5) * cell, dy = b.y - (topPad + (rr + 0.5) * cell);
        if (dx * dx + dy * dy < ir * ir && b.lastItem !== it) { b.lastItem = it; collectItem(it, b); }
      }
    }
  }

  function simulate(dt) {
    G.turnTime += dt;
    const sdt = dt * effectiveSpeed();
    const speed = CFG.ballSpeed * cell;
    const interval = Math.max(0.035, CFG.fireInterval - G.ballCount * 0.0003);

    G.fireTimer -= sdt;
    while (G.queue > 0 && G.fireTimer <= 0) { launchBall(); G.queue--; G.fireTimer += interval; }

    const maxStep = R * 0.9;
    for (const b of G.balls) {
      if (b.done) continue;
      const steps = Math.max(1, Math.ceil((speed * sdt) / maxStep));
      const h = sdt / steps;
      for (let i = 0; i < steps && !b.done; i++) stepBall(b, h, speed);
    }
    // returned balls glide toward the next launch point
    const tx = G.nextX != null ? G.nextX : G.launcherX;
    for (const b of G.balls) {
      if (!b.done) continue;
      b.x += (tx - b.x) * Math.min(1, dt * 14);
      if (Math.abs(tx - b.x) < 1.5) b.gone = true;
    }
    if (G.balls.some((b) => b.gone)) G.balls = G.balls.filter((b) => !b.gone);
    if (G.queue === 0 && G.balls.length === 0) endTurn();
  }

  // --- effects ---
  function sparks(x, y, hue, n) {
    for (let i = 0; i < n && G.particles.length < CFG.maxParticles; i++) {
      const a = Math.random() * Math.PI * 2, s = rand(40, 140);
      G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.15, 0.3), max: 0.3, size: rand(1, 2.2), color: `hsl(${hue},100%,70%)` });
    }
  }
  function burst(x, y, hues, n) {
    for (let i = 0; i < n && G.particles.length < CFG.maxParticles; i++) {
      const a = Math.random() * Math.PI * 2, s = rand(60, 260) * (cell / 50);
      G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.35, 0.75), max: 0.75, size: rand(1.5, 3.6), color: `hsl(${pick(hues)},100%,65%)`, grav: true });
    }
  }
  function floatText(x, y, text, color) {
    G.floats.push({ x, y, text, color: color || '#fff', life: 0.9 });
    if (G.floats.length > 60) G.floats.shift();
  }
  function flushFloat(b, force) {
    if (b.dmgAcc > 0 && (force || G.time - b.floatT > 0.18)) {
      floatText(b.tx + rand(-6, 6), b.ty - cell * 0.25, '-' + b.dmgAcc);
      b.dmgAcc = 0; b.floatT = G.time;
    }
  }

  function updateEffects(dt) {
    for (const p of G.particles) {
      p.life -= dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 0.96; p.vy *= 0.96;
      if (p.grav) p.vy += 260 * dt;
    }
    if (G.particles.length) G.particles = G.particles.filter((p) => p.life > 0);
    for (const f of G.floats) { f.life -= dt; f.y -= 34 * dt; }
    if (G.floats.length) G.floats = G.floats.filter((f) => f.life > 0);
    for (const rg of G.rings) rg.life -= dt * 2.2;
    if (G.rings.length) G.rings = G.rings.filter((rg) => rg.life > 0);
    for (const bm of G.beams) bm.life -= dt * 1.8;
    if (G.beams.length) G.beams = G.beams.filter((bm) => bm.life > 0);
    G.shake = Math.max(0, G.shake - dt * 30);
    G.flash = Math.max(0, G.flash - dt * 2.5);
    eachBrick((b) => { if (b.flash > 0) b.flash = Math.max(0, b.flash - dt * 7); flushFloat(b); });
  }

  function update(dt) {
    G.time += dt;
    updateEffects(dt);
    if (G.state === 'dropping') {
      G.dropT += dt / 0.24;
      if (G.dropT >= 1) { G.dropT = 1; afterDrop(); }
    } else if (G.state === 'turning') {
      simulate(dt);
    }
  }

  // ---------------------------------------------------------------------
  // 12. Rendering
  // ---------------------------------------------------------------------
  function computeAimPath() {
    let x = G.launcherX, y = floorY - R;
    let vx = Math.cos(G.aimAngle), vy = -Math.sin(G.aimAngle);
    const pts = [];
    const step = R * 0.8, spacing = cell * 0.3;
    const maxLen = save.settings.guide ? H * 2.4 : H * 1.15;
    const maxBounce = save.settings.guide ? 2 : 1;
    let travelled = 0, nextDot = spacing, bounces = 0;
    const probe = { x: 0, y: 0 };
    while (travelled < maxLen) {
      x += vx * step; y += vy * step; travelled += step;
      if (x < R) { x = R; vx = -vx; bounces++; }
      else if (x > W - R) { x = W - R; vx = -vx; bounces++; }
      if (y < R) { y = R; vy = -vy; bounces++; }
      if (bounces > maxBounce || y > floorY) break;
      // stop at the first shape (reflect it when using the long guide)
      const c0 = Math.floor(x / cell), r0 = Math.floor((y - topPad) / cell);
      let hit = null;
      for (let rr = r0 - 1; rr <= r0 + 1 && !hit; rr++) {
        if (rr < 0 || rr >= CFG.rows) continue;
        for (let cc = c0 - 1; cc <= c0 + 1 && !hit; cc++) {
          if (cc < 0 || cc >= CFG.cols) continue;
          const br = G.grid[rr][cc];
          if (br && !br.phased) hit = collide(x, y, R, br);
        }
      }
      if (hit) {
        if (!save.settings.guide || bounces >= maxBounce) { probe.x = x; probe.y = y; return { pts, end: probe }; }
        const dot = vx * hit.nx + vy * hit.ny;
        if (dot < 0) { vx -= 2 * dot * hit.nx; vy -= 2 * dot * hit.ny; }
        x += hit.nx * hit.d; y += hit.ny * hit.d;
        bounces++;
      }
      if (travelled >= nextDot) { pts.push(x, y); nextDot += spacing; }
    }
    return { pts, end: null };
  }

  function drawBricks(dy) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let r = 0; r < G.grid.length; r++) {
      for (const b of G.grid[r]) {
        if (!b) continue;
        const s = brickSprite(b);
        const x = b.cx - s.size / 2, y = b.cy + dy - s.size / 2;
        if (b.phased) ctx.globalAlpha = 0.22 + Math.sin(G.time * 4) * 0.06;
        ctx.drawImage(s.canvas, x, y, s.size, s.size);
        ctx.globalAlpha = b.phased ? 0.5 : 1;
        if (b.kind === 'boss') drawCrown(b.cx, b.cy + dy - cell * 0.48);
        if (b.flash > 0) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = b.flash * 0.6;
          ctx.drawImage(s.canvas, x, y, s.size, s.size);
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'source-over';
        }
        const digits = String(b.hp).length;
        let fs = cell * (digits <= 2 ? 0.44 : digits === 3 ? 0.38 : 0.3);
        if (b.shape === 'triangle') fs *= 0.82;
        ctx.font = `700 ${fs | 0}px Rajdhani, system-ui, sans-serif`;
        ctx.fillStyle = '#fff';
        const ty = b.ty + dy - (b.core ? cell * 0.07 : 0);
        ctx.fillText(b.hp, b.tx, ty);
        if (b.core) drawCore(b.core, b.tx, ty + cell * 0.22);
        if (b.kind && b.kind !== 'boss') drawKind(b, dy);
        ctx.globalAlpha = 1;
      }
    }
  }

  /** Small badge in the brick's top-left corner showing its behaviour. */
  function drawKind(b, dy) {
    const x = b.cx - cell * 0.3, y = b.cy + dy - cell * 0.3, s = cell * 0.1;
    ctx.save();
    ctx.fillStyle = 'rgba(5,3,20,0.75)'; ctx.beginPath(); ctx.arc(x, y, s * 1.75, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = Math.max(1.4, cell * 0.028); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    switch (b.kind) {
      case 'bomb':
        ctx.fillStyle = '#ff8a3c'; ctx.arc(x, y + s * 0.3, s, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(x + s * 0.6, y - s * 0.5); ctx.lineTo(x + s * 1.2, y - s * 1.2); ctx.stroke();
        if (Math.sin(G.time * 12) > 0) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + s * 1.3, y - s * 1.3, s * 0.35, 0, Math.PI * 2); ctx.fill(); }
        break;
      case 'regen':
        ctx.strokeStyle = '#5dff9d'; ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.moveTo(x, y - s); ctx.lineTo(x, y + s); ctx.stroke();
        break;
      case 'ghost':
        ctx.fillStyle = '#c9d6ff';
        ctx.arc(x, y - s * 0.2, s * 0.9, Math.PI, 0); ctx.lineTo(x + s * 0.9, y + s); ctx.lineTo(x, y + s * 0.5); ctx.lineTo(x - s * 0.9, y + s); ctx.closePath(); ctx.fill();
        break;
      case 'split':
        ctx.strokeStyle = '#ffd23f'; ctx.arc(x, y, s, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
        ctx.beginPath(); ctx.arc(x + s * 0.5, y, s, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
        break;
      case 'mover':
        ctx.strokeStyle = '#22f3ff';
        ctx.moveTo(x - s * 1.2, y); ctx.lineTo(x + s * 1.2, y);
        ctx.moveTo(x - s * 0.5, y - s * 0.6); ctx.lineTo(x - s * 1.2, y); ctx.lineTo(x - s * 0.5, y + s * 0.6);
        ctx.moveTo(x + s * 0.5, y - s * 0.6); ctx.lineTo(x + s * 1.2, y); ctx.lineTo(x + s * 0.5, y + s * 0.6);
        ctx.stroke();
        break;
    }
    ctx.restore();
  }

  function drawCrown(x, y) {
    const s = cell * 0.14;
    ctx.save();
    ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = '#fff3b0'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - s, y + s * 0.6); ctx.lineTo(x - s, y - s * 0.4); ctx.lineTo(x - s * 0.5, y + s * 0.1);
    ctx.lineTo(x, y - s * 0.7); ctx.lineTo(x + s * 0.5, y + s * 0.1); ctx.lineTo(x + s, y - s * 0.4); ctx.lineTo(x + s, y + s * 0.6);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function drawCore(core, x, y) {
    const s = cell * 0.09;
    ctx.save();
    ctx.strokeStyle = '#ffd23f'; ctx.fillStyle = '#ffd23f';
    ctx.lineWidth = Math.max(1.5, cell * 0.03); ctx.lineCap = 'round';
    ctx.beginPath();
    if (core === 'ball') { ctx.arc(x, y, s * 0.7, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(x + s * 1.3, y - s * 0.5); ctx.lineTo(x + s * 1.3, y + s * 0.5); ctx.moveTo(x + s * 0.8, y); ctx.lineTo(x + s * 1.8, y); }
    if (core === 'h' || core === 'x') { ctx.moveTo(x - s * 1.6, y); ctx.lineTo(x + s * 1.6, y); }
    if (core === 'v' || core === 'x') { ctx.moveTo(x, y - s * 1.1); ctx.lineTo(x, y + s * 1.1); }
    ctx.stroke();
    ctx.restore();
  }

  function drawItems(dy) {
    for (let r = 0; r < CFG.rows + 1; r++) {
      for (const it of G.items[r]) {
        if (!it) continue;
        const x = (it.col + 0.5) * cell, y = topPad + (it.row + 0.5) * cell + dy;
        const t = G.time * 3 + it.t;
        if (it.type === 'ring') {
          const rr = cell * (0.2 + Math.sin(t) * 0.02);
          ctx.strokeStyle = 'rgba(182,255,92,0.25)'; ctx.lineWidth = cell * 0.09;
          ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.stroke();
          ctx.strokeStyle = '#d4ff8a'; ctx.lineWidth = cell * 0.03;
          ctx.setLineDash([cell * 0.1, cell * 0.07]); ctx.lineDashOffset = -t * 4;
          ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = '#f4ffe0';
          ctx.beginPath(); ctx.arc(x, y, cell * 0.08, 0, Math.PI * 2); ctx.fill();
        } else if (it.type === 'zapH' || it.type === 'zapV') {
          const col = it.type === 'zapH' ? '255,47,168' : '34,243,255';
          const a = it.used ? 0.35 : 1, s = cell * 0.15;
          ctx.save(); ctx.translate(x, y); if (it.type === 'zapV') ctx.rotate(Math.PI / 2);
          ctx.fillStyle = `rgba(${col},${0.2 * a})`; ctx.beginPath(); ctx.arc(0, 0, cell * 0.24, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = `rgba(${col},${a})`; ctx.lineWidth = cell * 0.035; ctx.lineJoin = 'round';
          ctx.beginPath(); ctx.moveTo(-s * 1.4, 0); ctx.lineTo(-s * 0.5, -s * 0.6); ctx.lineTo(s * 0.5, s * 0.6); ctx.lineTo(s * 1.4, 0); ctx.stroke();
          ctx.restore();
        } else if (it.type === 'scatter') {
          const a = it.used ? 0.35 : 1;
          ctx.save(); ctx.translate(x, y); ctx.rotate(t);
          ctx.strokeStyle = `rgba(255,210,63,${a})`; ctx.lineWidth = cell * 0.03;
          for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, cell * 0.17, i * 2.09, i * 2.09 + 1.3); ctx.stroke(); }
          ctx.fillStyle = `rgba(255,240,180,${a})`; ctx.beginPath(); ctx.arc(0, 0, cell * 0.05, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        } else if (it.type === 'power') {
          const rr = cell * (0.15 + Math.sin(t * 1.5) * 0.02);
          ctx.fillStyle = 'rgba(255,138,60,0.3)'; ctx.beginPath(); ctx.arc(x, y, rr * 1.6, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#ff9a3c'; ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.font = `700 ${Math.round(cell * 0.2)}px Rajdhani, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('2×', x, y + 1);
        } else {
          const s = cell * 0.16, wob = Math.sin(t) * cell * 0.03;
          ctx.save();
          ctx.translate(x, y + wob);
          ctx.fillStyle = 'rgba(255,47,168,0.25)';
          ctx.beginPath(); ctx.arc(0, 0, s * 1.6, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath();
          ctx.moveTo(-s, -s * 0.4); ctx.lineTo(-s * 0.5, -s); ctx.lineTo(s * 0.5, -s); ctx.lineTo(s, -s * 0.4); ctx.lineTo(0, s); ctx.closePath();
          ctx.fillStyle = '#ff6ad5'; ctx.fill();
          ctx.strokeStyle = '#ffe3f6'; ctx.lineWidth = 1.2; ctx.stroke();
          ctx.restore();
        }
      }
    }
  }

  function drawTargeting() {
    if (G.state !== 'targeting' || !G.targetCell) return;
    const { row, col } = G.targetCell;
    const t = G.targeting;
    const pulse = 0.18 + Math.sin(G.time * 10) * 0.06;
    ctx.save();
    ctx.lineWidth = 2;
    if (t === 'h' || t === 'x') {
      ctx.fillStyle = `rgba(255,47,168,${pulse})`; ctx.strokeStyle = '#ff2fa8';
      ctx.fillRect(0, topPad + row * cell, W, cell); ctx.strokeRect(1, topPad + row * cell, W - 2, cell);
    }
    if (t === 'v' || t === 'x') {
      ctx.fillStyle = `rgba(34,243,255,${pulse})`; ctx.strokeStyle = '#22f3ff';
      ctx.fillRect(col * cell, topPad, cell, CFG.rows * cell); ctx.strokeRect(col * cell, topPad, cell, CFG.rows * cell);
    }
    ctx.restore();
  }

  function drawBeams() {
    if (!G.beams.length) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const bm of G.beams) {
      const w = cell * 0.9 * bm.life;
      const a = Math.min(1, bm.life * 1.4);
      if (bm.dir === 'h') {
        const g = ctx.createLinearGradient(0, bm.pos - w, 0, bm.pos + w);
        g.addColorStop(0, `hsla(${bm.hue},100%,60%,0)`); g.addColorStop(0.5, `hsla(${bm.hue},100%,70%,${a})`); g.addColorStop(1, `hsla(${bm.hue},100%,60%,0)`);
        ctx.fillStyle = g; ctx.fillRect(0, bm.pos - w, W, w * 2);
        ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fillRect(0, bm.pos - 1.5, W, 3);
      } else {
        const g = ctx.createLinearGradient(bm.pos - w, 0, bm.pos + w, 0);
        g.addColorStop(0, `hsla(${bm.hue},100%,60%,0)`); g.addColorStop(0.5, `hsla(${bm.hue},100%,70%,${a})`); g.addColorStop(1, `hsla(${bm.hue},100%,60%,0)`);
        ctx.fillStyle = g; ctx.fillRect(bm.pos - w, 0, w * 2, H);
        ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fillRect(bm.pos - 1.5, 0, 3, H);
      }
    }
    ctx.restore();
  }

  function render() {
    if (!G || !bgCanvas) return;
    ctx.save();
    if (G.shake > 0) ctx.translate(rand(-1, 1) * G.shake, rand(-1, 1) * G.shake);
    ctx.drawImage(bgCanvas, 0, 0, W, H);

    // Danger line: pulses when the lowest row is occupied
    let danger = false;
    for (let c = 0; c < CFG.cols; c++) if (G.grid[CFG.rows - 1][c]) danger = true;
    ctx.save();
    ctx.strokeStyle = danger ? `rgba(255,59,92,${0.6 + Math.sin(G.time * 8) * 0.35})` : 'rgba(255,59,92,0.45)';
    ctx.lineWidth = danger ? 3 : 1.5;
    ctx.setLineDash([cell * 0.18, cell * 0.12]);
    ctx.beginPath(); ctx.moveTo(0, dangerY); ctx.lineTo(W, dangerY); ctx.stroke();
    ctx.restore();

    const dy = G.state === 'dropping' ? -(1 - easeOutBack(G.dropT)) * cell : 0;
    drawItems(dy);
    drawBricks(dy);
    drawTargeting();

    // Aim guide
    if (G.state === 'aiming' && (G.aiming || G.sliderAim) && G.aimValid) {
      const { pts, end } = computeAimPath();
      ctx.fillStyle = '#ffffff';
      const n = pts.length / 2;
      for (let i = 0; i < n; i++) {
        ctx.globalAlpha = 0.9 - (i / n) * 0.6;
        ctx.beginPath(); ctx.arc(pts[i * 2], pts[i * 2 + 1], R * 0.42, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (end) {
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(end.x, end.y, R, 0, Math.PI * 2); ctx.stroke();
      }
    }

    // Balls
    const bs = getBallSprite();
    ctx.globalCompositeOperation = 'lighter';
    for (const b of G.balls) ctx.drawImage(bs.canvas, b.x - bs.size / 2, b.y - bs.size / 2, bs.size, bs.size);
    if ((G.state === 'turning' && G.turnDamage > 1) || G.powerNext) {
      ctx.fillStyle = 'rgba(255,120,40,0.55)';
      const list = G.state === 'turning' ? G.balls : [];
      for (const b of list) { ctx.beginPath(); ctx.arc(b.x, b.y, R * 1.25, 0, Math.PI * 2); ctx.fill(); }
      if (G.powerNext && G.state !== 'turning') { ctx.beginPath(); ctx.arc(G.launcherX, floorY - R, R * 2.2, 0, Math.PI * 2); ctx.fill(); }
    }
    // Launcher
    const showLauncher = G.state !== 'turning' || G.queue > 0;
    if (showLauncher) {
      const pulse = 1 + Math.sin(G.time * 5) * 0.08;
      const s = bs.size * 1.25 * pulse;
      ctx.drawImage(bs.canvas, G.launcherX - s / 2, floorY - R - s / 2, s, s);
    }
    // Next launch point marker
    if (G.state === 'turning' && G.nextX != null) {
      ctx.drawImage(bs.canvas, G.nextX - bs.size / 2, floorY - R - bs.size / 2, bs.size, bs.size);
    }
    // Particles
    for (const p of G.particles) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    drawBeams();
    for (const rg of G.rings) {
      const rr = lerp(rg.max, rg.r, rg.life);
      ctx.strokeStyle = `rgba(255,150,60,${rg.life})`; ctx.lineWidth = cell * 0.12 * rg.life;
      ctx.beginPath(); ctx.arc(rg.x, rg.y, rr, 0, Math.PI * 2); ctx.stroke();
    }

    // Ball counter near launcher
    if (showLauncher) {
      const n = G.state === 'turning' ? G.queue : G.ballCount + G.bonusBalls;
      ctx.font = `700 ${Math.round(cell * 0.38)}px Rajdhani, sans-serif`;
      ctx.textBaseline = 'middle';
      const lx = G.launcherX > W - cell * 1.6 ? G.launcherX - cell * 0.35 : G.launcherX + cell * 0.35;
      ctx.textAlign = G.launcherX > W - cell * 1.6 ? 'right' : 'left';
      ctx.fillStyle = G.bonusBalls ? '#ffd23f' : '#ffffff';
      ctx.fillText('×' + n, lx, floorY - R - cell * 0.32);
    }

    // Floating numbers
    ctx.textAlign = 'center';
    ctx.font = `700 ${Math.round(cell * 0.3)}px Rajdhani, Cairo, sans-serif`;
    for (const f of G.floats) {
      ctx.globalAlpha = clamp(f.life / 0.5, 0, 1);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;

    if (G.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${G.flash * 0.25})`; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
    updateHUD(false);
  }

  // ---------------------------------------------------------------------
  // 13. UI: HUD, controls, menu, map, modals
  // ---------------------------------------------------------------------
  const hudCache = {};
  function setText(el, key, val) { if (hudCache[key] !== val) { hudCache[key] = val; el.textContent = val; } }

  function updateHUD(force) {
    if (!G) return;
    if (force) for (const k in hudCache) delete hudCache[k];
    const best = Math.max(save.best[bestKey()] || 0, G.score);
    setText(ui.hudStage, 'stage', (G.endless ? T('endlessTag') : T('stage') + ' ' + G.stage) + ' · ' + modeName(G.mode).toUpperCase());
    setText(ui.hudScore, 'score', fmt(G.score));
    setText(ui.hudBest, 'best', fmt(best));
    let fill, label;
    if (G.endless) {
      fill = (G.line % CFG.milestoneEvery) / CFG.milestoneEvery;
      label = T('lineCard', { a: G.line, b: Math.ceil((G.line + 1) / CFG.milestoneEvery) * CFG.milestoneEvery });
    } else {
      fill = Math.min(1, G.line / G.target);
      label = G.line >= G.target ? T('clearLeft', { n: countBricks() }) : T('lineOf', { a: G.line, b: G.target });
    }
    const fw = (fill * 100).toFixed(1) + '%';
    if (hudCache.fill !== fw) { hudCache.fill = fw; ui.hudFill.style.width = fw; }
    setText(ui.hudLine, 'line', label);
  }

  function updateCards() {
    for (const t of ['h', 'v', 'x']) {
      const el = $('#cnt-' + t);
      const n = save.cards[t] || 0;
      el.textContent = n > 0 ? n : CARDS[t].cost + '◆';
      el.classList.toggle('buy', n === 0);
    }
  }

  function updateControls() {
    if (!G) return;
    const aiming = G.state === 'aiming';
    const targeting = G.state === 'targeting';
    ui.fireBtn.disabled = !aiming;
    ui.slider.disabled = !aiming;
    ui.recallBtn.disabled = G.state !== 'turning';
    ui.speedLabel.textContent = G.userSpeed + '×';
    ui.bonusBtn.disabled = !aiming || G.bonusUsed;
    ui.bonusLabel.textContent = G.bonusUsed ? '✓' : '+' + bonusAmount();
    $$('.card').forEach((btn) => {
      btn.disabled = !(aiming || targeting);
      btn.classList.toggle('armed', targeting && G.targeting === btn.dataset.card);
    });
    updateCards();
  }

  function closeAllModals() { $$('.modal').forEach((m) => (m.hidden = true)); ui.hint.hidden = true; }

  function pause() {
    if (!G || !PLAY_STATES.includes(G.state)) return;
    G.prevState = G.state;
    G.state = 'paused';
    G.aiming = false;
    openModal('pauseModal');
  }
  function resume() {
    if (!G || G.state !== 'paused') return;
    closeModal('pauseModal');
    G.state = G.prevState || 'aiming';
    lastT = performance.now();
    updateControls();
  }

  function recordBest() {
    const k = bestKey();
    if (G.score > (save.best[k] || 0)) { save.best[k] = G.score; persist(); return true; }
    return false;
  }

  function gameOver() {
    G.state = 'game_over';
    Sfx.play('over'); buzz([60, 40, 120]);
    const isNew = recordBest();
    $('#overScore').textContent = fmt(G.score);
    $('#overBest').textContent = fmt(save.best[bestKey()] || 0);
    $('#overLines').textContent = G.line;
    $('#overSub').textContent = isNew && G.score > 0 ? T('newBest') : T('overSub');
    $('#reviveCost').textContent = CFG.reviveCost;
    $('#reviveBtn').disabled = G.revived || save.diamonds < CFG.reviveCost;
    openModal('overModal');
    updateControls();
    if (window.CBAds) window.CBAds.roundEnd('over');
  }

  function revive() {
    if (!G || G.revived || save.diamonds < CFG.reviveCost) return;
    save.diamonds -= CFG.reviveCost; persist(); refreshGems();
    G.revived = true;
    for (let r = CFG.rows - 3; r <= CFG.rows + 1; r++) {
      for (let c = 0; c < CFG.cols; c++) {
        const b = G.grid[r][c];
        if (b) { burst(b.tx, b.ty, [330, 190], 10); G.grid[r][c] = null; }
      }
    }
    G.beams.push({ dir: 'h', pos: topPad + (CFG.rows - 1.5) * cell, life: 1, hue: 50 });
    Sfx.play('laser');
    closeModal('overModal');
    G.state = 'aiming';
    updateControls();
    if (checkStageClear()) return;
  }

  function stageClear() {
    G.state = 'stage_clear';
    const extra = G.turnsAfterDone;
    const stars = extra <= 2 ? 3 : extra <= 5 ? 2 : 1;
    const prog = save.progress[G.mode];
    const prev = prog.stars[G.stage] || 0;
    const reward = (prev === 0 ? 10 : 2) + Math.max(0, stars - prev) * 5;
    prog.stars[G.stage] = Math.max(prev, stars);
    prog.unlocked = Math.max(prog.unlocked, Math.min(CFG.stagesPerMode, G.stage + 1));
    recordBest();
    addDiamonds(reward);
    $('#clearScore').textContent = fmt(G.score);
    $('#clearGems').textContent = '+' + reward;
    $$('#clearStars svg').forEach((s, i) => s.classList.toggle('on', i < stars));
    $('#nextBtn').hidden = G.stage >= CFG.stagesPerMode;
    Sfx.play('clear'); buzz([30, 30, 30]);
    openModal('clearModal');
    updateControls();
    if (window.CBAds) window.CBAds.roundEnd('clear');
  }

  function startStage(mode, stage) {
    save.mode = mode; persist();
    showScreen('gameScreen');
    // layout needs the screen visible; build the game after sizing
    requestAnimationFrame(() => { layout(); newGame(mode, stage); lastT = performance.now(); });
  }

  // --- Menu ---
  function syncModeUI() {
    $$('.mode-chip').forEach((c) => c.setAttribute('aria-checked', String(c.dataset.mode === save.mode)));
    $$('.tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.mode === save.mode)));
    const p = save.progress[save.mode];
    const bestEndless = save.best[save.mode + ':endless'] || 0;
    $('#menuBest').textContent = T('menuBest', { mode: modeName(save.mode), n: p.unlocked, b: fmt(bestEndless) });
    const gift = $('#giftBtn');
    const ready = save.lastGift !== today();
    gift.classList.toggle('ready', ready);
    $('#giftLabel').textContent = ready ? T('gift') : T('giftDone');
    gift.disabled = !ready;
  }

  // --- Stage map ---
  const TILE_COLORS = ['var(--cyan)', 'var(--green)', 'var(--gold)', 'var(--pink)', 'var(--purple)', 'var(--blue)'];
  function buildMap() {
    const grid = $('#stageGrid');
    const p = save.progress[save.mode];
    let totalStars = 0;
    const frag = document.createDocumentFragment();
    for (let s = 1; s <= CFG.stagesPerMode; s++) {
      const stars = p.stars[s] || 0;
      totalStars += stars;
      const btn = document.createElement('button');
      const locked = s > p.unlocked;
      btn.className = 'tile' + (locked ? ' locked' : '') + (s === p.unlocked && !stars ? ' current' : '');
      if (!locked) btn.style.setProperty('--c', TILE_COLORS[Math.floor((s - 1) / 4) % TILE_COLORS.length]);
      btn.setAttribute('aria-label', locked ? `Stage ${s}, locked` : `Stage ${s}, ${stars} stars`);
      if (locked) {
        btn.innerHTML = `<span>${s}</span><svg class="lock"><use href="#i-lock"/></svg>`;
        btn.disabled = false;
        btn.addEventListener('click', () => { Sfx.ensure(); Sfx.play('click'); toast(T('locked', { n: s - 1 })); });
      } else {
        btn.innerHTML = `<span>${s}</span><span class="stars">${[0, 1, 2].map((i) => `<svg class="${i < stars ? 'on' : ''}"><use href="#i-star"/></svg>`).join('')}</span>` + (s % 10 === 0 ? `<span class="boss">${T('boss')}</span>` : '');
        btn.addEventListener('click', () => { Sfx.ensure(); Sfx.play('click'); startStage(save.mode, s); });
      }
      frag.appendChild(btn);
    }
    grid.replaceChildren(frag);
    $('#mapStars').innerHTML = `<svg><use href="#i-star"/></svg> ${totalStars} / ${CFG.stagesPerMode * 3}`;
    $('#mapUnlocked').textContent = T('unlocked', { a: p.unlocked, b: CFG.stagesPerMode });
    requestAnimationFrame(() => {
      const cur = grid.children[p.unlocked - 1];
      const box = grid.parentElement;
      if (cur) box.scrollTop = Math.max(0, cur.offsetTop - box.clientHeight / 2 + cur.offsetHeight / 2);
    });
  }

  // --- Settings ---
  function syncSettingsUI() {
    $$('[data-setting]').forEach((inp) => (inp.checked = !!save.settings[inp.dataset.setting]));
  }
  $$('[data-setting]').forEach((inp) => inp.addEventListener('change', () => {
    save.settings[inp.dataset.setting] = inp.checked;
    persist();
    if (inp.dataset.setting === 'fxHigh') spriteCache.clear();
    Sfx.ensure(); Sfx.play('click');
  }));
  let resetArmed = false;
  $('#resetBtn').addEventListener('click', () => {
    if (!resetArmed) { resetArmed = true; $('#resetBtn').textContent = T('resetConfirm'); setTimeout(() => { resetArmed = false; $('#resetBtn').textContent = T('reset'); }, 2500); return; }
    const settings = save.settings, settingsLang = save.lang;
    save = defaults(); save.settings = settings; persist();
    save.lang = settingsLang; persist();
    resetArmed = false; $('#resetBtn').textContent = T('reset');
    refreshGems(); syncModeUI(); updateCards();
    toast(T('resetDone'));
  });

  // --- Language ---
  function applyLang() {
    const nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
    LANG = save.lang === 'auto' ? (/^ar\b/i.test(nav) ? 'ar' : 'en') : save.lang;
    document.documentElement.lang = LANG;
    document.documentElement.dir = LANG === 'ar' ? 'rtl' : 'ltr';
    $$('[data-i18n]').forEach((el) => { el.textContent = T(el.dataset.i18n); });
    const ul = $('#helpList');
    if (ul) ul.innerHTML = T('help').map((h) => `<li>${h}</li>`).join('');
    const sel = $('#langSelect');
    if (sel) { sel.value = save.lang; sel.options[0].textContent = T('langAuto'); }
    syncModeUI();
    updateCards();
    if (G) { updateHUD(true); updateControls(); }
    if (currentScreen === 'mapScreen') buildMap();
  }
  $('#langSelect').addEventListener('change', (e) => { save.lang = e.target.value; persist(); applyLang(); });

  // --- Global button actions ---
  const actions = {
    map() { closeAllModals(); G = null; showScreen('mapScreen'); buildMap(); syncModeUI(); },
    menu() { closeAllModals(); G = null; showScreen('menuScreen'); syncModeUI(); },
    endless() { startStage(save.mode, 0); },
    help() { openModal('helpModal'); },
    closeHelp() { closeModal('helpModal'); },
    settings() {
      if (G && PLAY_STATES.includes(G.state)) pause();
      closeModal('pauseModal');
      syncSettingsUI(); openModal('settingsModal');
    },
    closeSettings() {
      closeModal('settingsModal');
      if (G && G.state === 'paused') openModal('pauseModal');
    },
    pause() { pause(); },
    resume() { resume(); },
    restart() { if (!G) return; const { mode, stage } = G; closeAllModals(); newGame(mode, stage); },
    quit() { const endless = G && G.endless; if (G && G.score) recordBest(); closeAllModals(); G = null; if (endless) { showScreen('menuScreen'); syncModeUI(); } else { showScreen('mapScreen'); buildMap(); } },
    gift() {
      if (save.lastGift === today()) return;
      save.lastGift = today(); addDiamonds(25); persist(); syncModeUI();
      Sfx.ensure(); Sfx.play('card');
      toast(T('giftToast'), 'var(--gold)');
    },
  };
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    Sfx.ensure(); Sfx.play('click');
    const fn = actions[el.dataset.action];
    if (fn) fn();
  });
  $$('.mode-chip, .tab').forEach((el) => el.addEventListener('click', () => {
    save.mode = el.dataset.mode; persist(); syncModeUI();
    if (currentScreen === 'mapScreen') buildMap();
    Sfx.ensure(); Sfx.play('click');
  }));
  $('#nextBtn').addEventListener('click', () => {
    if (!G) return;
    const { mode, stage } = G;
    closeAllModals();
    newGame(mode, Math.min(CFG.stagesPerMode, stage + 1));
  });
  $('#reviveBtn').addEventListener('click', revive);

  // Auto-pause when the tab is hidden
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

  // Responsive: re-layout on any size change of the board area
  let resizeRaf = 0;
  const onResize = () => { cancelAnimationFrame(resizeRaf); resizeRaf = requestAnimationFrame(() => { if (currentScreen === 'gameScreen') layout(); }); };
  window.addEventListener('resize', onResize);
  if ('ResizeObserver' in window) new ResizeObserver(onResize).observe($('#boardWrap'));

  // ---------------------------------------------------------------------
  // 14. Main loop & boot
  // ---------------------------------------------------------------------
  let lastT = performance.now();
  function frame(t) {
    const dt = Math.min(0.05, Math.max(0, (t - lastT) / 1000));
    lastT = t;
    if (G && currentScreen === 'gameScreen' && cell) {
      if (PLAY_STATES.includes(G.state)) update(dt);
      else updateEffects(dt * 0.5);
      render();
    }
    requestAnimationFrame(frame);
  }

  refreshGems();
  applyLang();
  requestAnimationFrame(frame);

  // Expose a tiny debug/test hook (harmless in production)
  window.CyberBreaker = { get state() { return G; }, startStage, shoot: () => shoot(), save: () => save };

  // Ad hooks for the Android app (ads.js). The web build never defines window.CBAds,
  // so none of this changes browser behaviour. Keep these when refactoring.
  window.CBGame = {
    // Pause for a rewarded ad, then grant (or cancel) the bonus balls.
    bonusPending() { if (!G || G.state !== 'aiming' || G.bonusUsed) return 0; G.prevState = G.state; G.state = 'paused'; return bonusAmount(); },
    bonusDone(ok) {
      if (!G || G.state !== 'paused') return;
      G.state = 'aiming';
      if (ok) { G.bonusBalls = bonusAmount(); G.bonusUsed = true; toast(T('bonusLoaded', { n: G.bonusBalls }), 'var(--gold)'); Sfx.play('card'); }
      updateControls();
    },
    // Free revive after a rewarded ad (same effect as the diamond revive).
    canReviveFree() { return !!G && G.state === 'game_over' && !G.revived; },
    reviveFree() { if (!G || G.revived) return; save.diamonds += CFG.reviveCost; revive(); },
    addDiamonds(n) { addDiamonds(n); },
    pause() { pause(); },
    lang() { return LANG; },
  };
})();
