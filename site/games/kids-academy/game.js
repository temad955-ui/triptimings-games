/* Kids Academy — Trip Timings Games Hub
   Ad-free learning games for young children, in one app:
   ✍️ trace Arabic letters · ✍️ trace English letters (with the letter spoken)
   🔢 counting · ➕ addition · ➖ subtraction · ✖️ times tables.
   Every correct answer earns ⭐ into the shared wallet. No timers, no ads. */
'use strict';
(() => {
  const hub = window.TTHub, eco = window.TTEco;
  const $ = (s) => document.querySelector(s);
  const STR = {
    ar: { title: 'أكاديمية الصغار', arT: 'حروف عربي', arS: 'اكتب الحروف واسمعها', enT: 'ABC إنجليزي', enS: 'اكتب الحروف واسمعها', countT: 'عدّ معايا', countS: 'من 1 لـ 10', addT: 'الجمع', addS: 'أرقام صغيرة', subT: 'الطرح', subS: 'خطوة بخطوة', mulT: 'جدول الضرب', mulS: 'من 1 لـ 10',
      howMany: 'كام واحد؟', great: ['برافو! 🎉', 'شاطر! 🌟', 'ممتاز! 👏', 'رائع! 🚀'], streak: 'سلسلة صح: {n} 🔥', again: 'حاول تاني 😊' },
    en: { title: 'Kids Academy', arT: 'Arabic letters', arS: 'Trace and hear them', enT: 'ABC English', enS: 'Trace and hear them', countT: 'Count with me', countS: '1 to 10', addT: 'Addition', addS: 'Small numbers', subT: 'Subtraction', subS: 'Step by step', mulT: 'Times tables', mulS: '1 to 10',
      howMany: 'How many?', great: ['Bravo! 🎉', 'Well done! 🌟', 'Excellent! 👏', 'Super! 🚀'], streak: 'Streak: {n} 🔥', again: 'Try again 😊' },
  };
  const T = (k, v) => { let s = (STR[hub.lang] || STR.en)[k]; if (s == null) s = k; for (const x in v || {}) s = s.split('{' + x + '}').join(v[x]); return s; };

  const AR = [['ا', 'ألف', 'أرنب', '🐰'], ['ب', 'باء', 'بطة', '🦆'], ['ت', 'تاء', 'تفاحة', '🍎'], ['ث', 'ثاء', 'ثعلب', '🦊'], ['ج', 'جيم', 'جمل', '🐫'], ['ح', 'حاء', 'حصان', '🐴'], ['خ', 'خاء', 'خروف', '🐑'],
    ['د', 'دال', 'دب', '🐻'], ['ذ', 'ذال', 'ذرة', '🌽'], ['ر', 'راء', 'ريشة', '🪶'], ['ز', 'زاي', 'زرافة', '🦒'], ['س', 'سين', 'سمكة', '🐟'], ['ش', 'شين', 'شمس', '☀️'], ['ص', 'صاد', 'صقر', '🦅'],
    ['ض', 'ضاد', 'ضفدع', '🐸'], ['ط', 'طاء', 'طيارة', '✈️'], ['ظ', 'ظاء', 'ظرف', '✉️'], ['ع', 'عين', 'عنب', '🍇'], ['غ', 'غين', 'غزال', '🦌'], ['ف', 'فاء', 'فيل', '🐘'], ['ق', 'قاف', 'قطة', '🐱'],
    ['ك', 'كاف', 'كلب', '🐶'], ['ل', 'لام', 'ليمون', '🍋'], ['م', 'ميم', 'موز', '🍌'], ['ن', 'نون', 'نحلة', '🐝'], ['ه', 'هاء', 'هدية', '🎁'], ['و', 'واو', 'وردة', '🌹'], ['ي', 'ياء', 'يد', '✋']];
  const EN = [['A', 'Apple', '🍎'], ['B', 'Ball', '⚽'], ['C', 'Cat', '🐱'], ['D', 'Dog', '🐶'], ['E', 'Egg', '🥚'], ['F', 'Fish', '🐟'], ['G', 'Grapes', '🍇'], ['H', 'Hat', '🎩'], ['I', 'Ice cream', '🍦'],
    ['J', 'Juice', '🧃'], ['K', 'Kite', '🪁'], ['L', 'Lion', '🦁'], ['M', 'Moon', '🌙'], ['N', 'Nest', '🪺'], ['O', 'Orange', '🍊'], ['P', 'Pyramid', '🔺'], ['Q', 'Queen', '👸'], ['R', 'Rabbit', '🐰'],
    ['S', 'Sun', '☀️'], ['T', 'Tree', '🌳'], ['U', 'Umbrella', '☂️'], ['V', 'Van', '🚐'], ['W', 'Whale', '🐳'], ['X', 'Xylophone', '🎼'], ['Y', 'Yo-yo', '🪀'], ['Z', 'Zebra', '🦓']];
  const TILES = [
    { id: 'ar', icon: 'أ', bg: 'linear-gradient(150deg,#ff7a3d,#ff2b77)' },
    { id: 'en', icon: 'A', bg: 'linear-gradient(150deg,#2b5cff,#7a2bff)' },
    { id: 'count', icon: '🍎', bg: 'linear-gradient(150deg,#2ec4b6,#1b7f76)' },
    { id: 'add', icon: '➕', bg: 'linear-gradient(150deg,#7ad66b,#2e8a3a)' },
    { id: 'sub', icon: '➖', bg: 'linear-gradient(150deg,#ffd23f,#e08a00)' },
    { id: 'mul', icon: '✖️', bg: 'linear-gradient(150deg,#ff7ad9,#a12bff)' },
  ];
  const P = Object.assign({ ar: [], en: [], best: {} }, hub.load('kids.progress', {}));
  const saveP = () => hub.store('kids.progress', P);
  let view = 'menu';

  // ---------- shell ----------
  function stars() { $('#kStars').textContent = eco ? eco.coins().toLocaleString('en') : 0; }
  function reward(n) { if (eco) eco.add(n, 'kids-academy'); stars(); }
  function cheer(text) {
    const el = $('#cheer'); el.textContent = text; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(cheer.t); cheer.t = setTimeout(() => el.classList.remove('show'), 900);
  }
  function say(text, lang) {
    try {
      if (!window.speechSynthesis) return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text); u.lang = lang; u.rate = 0.85;
      speechSynthesis.speak(u);
    } catch (e) { /* no speech on this device */ }
  }
  function show(v) {
    view = v;
    $('#menu').hidden = v !== 'menu'; $('#trace').hidden = !(v === 'ar' || v === 'en'); $('#math').hidden = !['count', 'add', 'sub', 'mul'].includes(v);
    $('#backBtn').hidden = v === 'menu';
    $('#kTitle').textContent = v === 'menu' ? T('title') : T(v + 'T');
    if (v === 'ar' || v === 'en') startTrace(v);
    if (['count', 'add', 'sub', 'mul'].includes(v)) startMath(v);
    hub.track('kids_mode', { mode: v });
  }
  function menu() {
    const m = $('#menu'); m.innerHTML = '';
    TILES.forEach((t) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'k-tile'; b.style.background = t.bg;
      const done = t.id === 'ar' ? P.ar.length + '/28' : t.id === 'en' ? P.en.length + '/26' : P.best[t.id] ? '⭐ ' + P.best[t.id] : '';
      b.innerHTML = '<span></span><b></b><small></small>';
      b.querySelector('span').textContent = t.icon; b.querySelector('b').textContent = T(t.id + 'T');
      b.querySelector('small').textContent = T(t.id + 'S') + (done ? ' · ' + done : '');
      b.onclick = () => show(t.id);
      m.appendChild(b);
    });
  }
  $('#backBtn').addEventListener('click', () => { show('menu'); menu(); });
  document.addEventListener('tt:lang', () => { menu(); show(view); });

  // ---------- tracing ----------
  const cv = $('#tCanvas'), ctx = cv.getContext('2d');
  const TW = 340, TH = 380;
  const mask = document.createElement('canvas'), mctx = mask.getContext('2d', { willReadFrequently: true });
  const paint = document.createElement('canvas'), pctx = paint.getContext('2d', { willReadFrequently: true });
  mask.width = paint.width = TW; mask.height = paint.height = TH;
  let TR = null;
  const list = () => (TR.mode === 'ar' ? AR : EN);
  function startTrace(mode) {
    TR = { mode, i: 0 };
    const first = list().findIndex((_, i) => !P[mode].includes(i));
    TR.i = first < 0 ? 0 : first;
    fitTrace(); letter();
  }
  function letter() {
    // the tracing mask needs the real font, so wait for Cairo on the first letter
    if (document.fonts && document.fonts.load && !letter.ready) {
      letter.ready = true;
      document.fonts.load('900 250px Cairo', 'اA').then(letter, letter);
      return;
    }
    const L = list()[TR.i];
    TR.solved = false; TR.strokes = [];
    pctx.clearRect(0, 0, TW, TH);
    // mask = the glyph, used to measure how much of it was traced
    mctx.clearRect(0, 0, TW, TH);
    mctx.fillStyle = '#000'; mctx.textAlign = 'center'; mctx.textBaseline = 'middle';
    mctx.font = '900 ' + (TR.mode === 'ar' ? 250 : 270) + 'px Cairo, sans-serif';
    mctx.fillText(L[0], TW / 2, TH / 2 + (TR.mode === 'ar' ? 10 : 6));
    const md = mctx.getImageData(0, 0, TW, TH).data;
    TR.pts = [];
    for (let y = 0; y < TH; y += 5) for (let x = 0; x < TW; x += 5) if (md[(y * TW + x) * 4 + 3] > 128) TR.pts.push(x + y * TW);
    $('#tEmoji').textContent = TR.mode === 'ar' ? L[3] : L[2];
    $('#tWord').textContent = TR.mode === 'ar' ? L[0] + ' — ' + L[2] : L[0] + ' — ' + L[1];
    strip(); drawTrace();
    setTimeout(speakLetter, 250);
  }
  function speakLetter() { const L = list()[TR.i]; if (TR.mode === 'ar') say(L[1] + '، ' + L[2], 'ar-SA'); else say(L[0] + ', ' + L[1], 'en-US'); }
  function strip() {
    const s = $('#tStrip'); s.innerHTML = '';
    list().forEach((L, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = L[0];
      b.className = (P[TR.mode].includes(i) ? 'done' : '') + (i === TR.i ? ' cur' : '');
      b.onclick = () => { TR.i = i; letter(); };
      s.appendChild(b);
    });
    const cur = s.querySelector('.cur'); if (cur && cur.scrollIntoView) cur.scrollIntoView({ inline: 'center', block: 'nearest' });
  }
  function drawTrace() {
    ctx.clearRect(0, 0, TW, TH);
    ctx.fillStyle = '#fffaf0'; ctx.fillRect(0, 0, TW, TH);
    // dotted guide letter
    ctx.globalAlpha = 0.18; ctx.drawImage(mask, 0, 0); ctx.globalAlpha = 1;
    ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(paint, 0, 0); ctx.restore();
    if (TR.solved) { ctx.font = '900 40px Cairo, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('⭐', TW - 34, 44); }
  }
  let drawing = null;
  const hue = () => (Date.now() / 12) % 360;
  function pt(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * TW / r.width, (e.clientY - r.top) * TH / r.height]; }
  cv.addEventListener('pointerdown', (e) => { e.preventDefault(); drawing = pt(e); cv.setPointerCapture && cv.setPointerCapture(e.pointerId); dot(drawing, drawing); });
  cv.addEventListener('pointermove', (e) => { if (!drawing) return; const p = pt(e); dot(drawing, p); drawing = p; });
  cv.addEventListener('pointerup', () => { drawing = null; check(); });
  cv.addEventListener('pointercancel', () => { drawing = null; });
  function dot(a, b) {
    pctx.strokeStyle = 'hsl(' + hue() + ',90%,55%)'; pctx.lineWidth = 30; pctx.lineCap = 'round'; pctx.lineJoin = 'round';
    pctx.beginPath(); pctx.moveTo(a[0], a[1]); pctx.lineTo(b[0], b[1]); pctx.stroke();
    drawTrace();
  }
  function check() {
    if (TR.solved || !TR.pts.length) return;
    const pd = pctx.getImageData(0, 0, TW, TH).data, md = mctx.getImageData(0, 0, TW, TH).data;
    let hit = 0; TR.pts.forEach((i) => { if (pd[i * 4 + 3] > 0) hit++; });
    let paintIn = 0, paintOut = 0;
    for (let y = 0; y < TH; y += 6) for (let x = 0; x < TW; x += 6) { const i = (y * TW + x) * 4; if (pd[i + 3] > 0) { if (md[i + 3] > 0) paintIn++; else paintOut++; } }
    const cover = hit / TR.pts.length, outside = paintOut / Math.max(1, paintIn + paintOut);
    if (cover > 0.72 && outside < 0.62) {
      TR.solved = true;
      if (!P[TR.mode].includes(TR.i)) { P[TR.mode].push(TR.i); saveP(); reward(3); }
      cheer(T('great')[Math.floor(Math.random() * 4)]); speakLetter(); drawTrace(); strip();
      if (navigator.vibrate) try { navigator.vibrate([20, 40, 20]); } catch (e) { /* ignore */ }
      setTimeout(() => { if (view === TR.mode && TR.solved && TR.i < list().length - 1) { TR.i++; letter(); } }, 1600);
    }
  }
  $('#tPrev').addEventListener('click', () => { TR.i = (TR.i - 1 + list().length) % list().length; letter(); });
  $('#tNext').addEventListener('click', () => { TR.i = (TR.i + 1) % list().length; letter(); });
  $('#tClear').addEventListener('click', () => { pctx.clearRect(0, 0, TW, TH); TR.solved = false; drawTrace(); });
  $('#tSay').addEventListener('click', speakLetter);
  function fitTrace() {
    const box = cv.parentElement.getBoundingClientRect();
    const s = Math.min(box.width / TW, box.height / TH) || 1, dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.style.width = Math.floor(TW * s) + 'px'; cv.style.height = Math.floor(TH * s) + 'px';
    cv.width = Math.round(TW * s * dpr); cv.height = Math.round(TH * s * dpr);
    ctx.setTransform(s * dpr, 0, 0, s * dpr, 0, 0);
    if (TR) drawTrace();
  }
  window.addEventListener('resize', () => { if (!$('#trace').hidden) fitTrace(); });

  // ---------- math ----------
  const OBJS = ['🍎', '⭐', '🐟', '🎈', '🐥', '🌸', '🚗', '🍪', '🐞', '⚽'];
  const OPT_BG = ['#2b5cff', '#ff2b77', '#2ec4b6'];
  let M = null;
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  function startMath(mode) { M = { mode, n: 0, right: 0, streak: 0, tries: 0 }; question(); }
  function question() {
    const lv = Math.floor(M.right / 5); // gets a bit harder every 5 correct answers
    let q = '', ans = 0, objs = '';
    if (M.mode === 'count') { ans = rnd(1, Math.min(10, 4 + lv * 2)); const o = OBJS[rnd(0, OBJS.length - 1)]; objs = o.repeat(ans); q = T('howMany'); say(T('howMany'), hub.lang === 'ar' ? 'ar-SA' : 'en-US'); }
    if (M.mode === 'add') { const max = Math.min(20, 5 + lv * 3); const a = rnd(0, max), b = rnd(0, max - a); ans = a + b; q = a + ' + ' + b + ' = ?'; }
    if (M.mode === 'sub') { const max = Math.min(20, 5 + lv * 3); const a = rnd(1, max), b = rnd(0, a); ans = a - b; q = a + ' − ' + b + ' = ?'; }
    if (M.mode === 'mul') { const t = Math.min(10, 2 + lv); const a = rnd(1, t), b = rnd(1, 10); ans = a * b; q = a + ' × ' + b + ' = ?'; }
    const opts = new Set([ans]);
    while (opts.size < 3) { const d = rnd(1, Math.max(3, Math.ceil(ans * 0.3))); const v = Math.random() < 0.5 ? ans + d : ans - d; if (v >= 0) opts.add(v); }
    M.ans = ans; M.tries = 0;
    $('#mQ').textContent = q; $('#mQ').style.fontSize = M.mode === 'count' ? '28px' : '';
    $('#mObjs').textContent = objs;
    const box = $('#mOpts'); box.innerHTML = '';
    [...opts].sort(() => Math.random() - 0.5).forEach((v, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = v; b.style.background = OPT_BG[i];
      b.onclick = () => answer(b, v);
      box.appendChild(b);
    });
    $('#mBar').style.width = (M.n % 10) * 10 + '%';
    $('#mStreak').textContent = M.streak > 1 ? T('streak', { n: M.streak }) : '';
  }
  function answer(btn, v) {
    if (M.lock) return;
    if (v === M.ans) {
      M.lock = true; btn.classList.add('yes');
      M.n++; M.right++; M.streak = M.tries ? 0 : M.streak + 1;
      if (M.right % 5 === 0) reward(5); else reward(1);
      P.best[M.mode] = Math.max(P.best[M.mode] || 0, M.right); saveP();
      cheer(T('great')[Math.floor(Math.random() * 4)]);
      say(String(M.ans), hub.lang === 'ar' ? 'ar-SA' : 'en-US');
      setTimeout(() => { M.lock = false; question(); }, 900);
    } else {
      M.tries++; btn.classList.remove('no'); void btn.offsetWidth; btn.classList.add('no');
      $('#mStreak').textContent = T('again');
      if (navigator.vibrate) try { navigator.vibrate(30); } catch (e) { /* ignore */ }
    }
  }

  // ---------- go ----------
  menu(); show('menu'); stars();
  document.addEventListener('tt:wallet', stars);
  window.TTGame = { get trace() { return TR; }, get math() { return M; } }; // read-only handle for automated QA
})();
