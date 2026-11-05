/* Lobby — renders the game cards, daily-wheel status and language toggle.
   To add a game: append an entry to GAMES (id must match the folder under /games/). */
'use strict';
(() => {
  const hub = window.TTHub;
  const $ = (s) => document.querySelector(s);

  const ART = {
    'bubble-shooter': '<svg viewBox="0 0 200 120"><g><circle cx="40" cy="22" r="16" fill="#ff6b8b"/><circle cx="74" cy="22" r="16" fill="#2ec4b6"/><circle cx="108" cy="22" r="16" fill="#f2b544"/><circle cx="142" cy="22" r="16" fill="#ff6b8b"/><circle cx="57" cy="50" r="16" fill="#5aa9ff"/><circle cx="91" cy="50" r="16" fill="#f2b544"/><circle cx="125" cy="50" r="16" fill="#a77bff"/><circle cx="159" cy="22" r="0"/></g><path d="M100 112 L100 84" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-dasharray="2 9"/><circle cx="100" cy="104" r="14" fill="#2ec4b6" stroke="#fff" stroke-width="3"/></svg>',
    'tourism-quiz': '<svg viewBox="0 0 200 120"><path d="M30 104 78 20l48 84z" fill="#f2b544"/><path d="M78 20l48 84H78z" fill="#b9831f"/><path d="M110 104l30-52 30 52z" fill="#ffd27a"/><circle cx="160" cy="28" r="22" fill="#2ec4b6"/><text x="160" y="38" font-size="30" font-weight="900" text-anchor="middle" fill="#01302b" font-family="Cairo, sans-serif">?</text></svg>',
    snake: '<svg viewBox="0 0 200 120"><path d="M30 90h50V50h50v30h40" fill="none" stroke="#2ec4b6" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/><circle cx="170" cy="80" r="11" fill="#5ee6d8"/><circle cx="174" cy="76" r="3" fill="#0b1026"/><circle cx="150" cy="30" r="10" fill="#ff6b8b"/><path d="M150 20q4-8 10-6" stroke="#7ad66b" stroke-width="3" fill="none"/></svg>',
    'spin-wheel': '<svg viewBox="0 0 200 120"><g transform="translate(100 62)"><circle r="50" fill="#1b2556" stroke="#ffd27a" stroke-width="6"/><path d="M0 0 0-46A46 46 0 0 1 40-23z" fill="#2ec4b6"/><path d="M0 0 40-23A46 46 0 0 1 40 23z" fill="#f2b544"/><path d="M0 0 40 23A46 46 0 0 1 0 46z" fill="#ff6b8b"/><path d="M0 0 0 46A46 46 0 0 1-40 23z" fill="#5aa9ff"/><path d="M0 0-40 23A46 46 0 0 1-40-23z" fill="#a77bff"/><path d="M0 0-40-23A46 46 0 0 1 0-46z" fill="#7ad66b"/><circle r="10" fill="#ffd27a"/></g><path d="M90 4h20l-10 16z" fill="#fff3d6"/></svg>',
    cyberbreaker: '<svg viewBox="0 0 200 120"><g fill="none" stroke-width="4"><rect x="22" y="14" width="30" height="22" rx="4" stroke="#00f0ff"/><rect x="62" y="14" width="30" height="22" rx="4" stroke="#ff2bd6"/><path d="M118 36l14-22 14 22z" stroke="#ffd23f"/><rect x="152" y="14" width="30" height="22" rx="4" stroke="#00f0ff"/><path d="M50 58l14-10 14 10v12l-14 10-14-10z" stroke="#ffd23f"/><rect x="120" y="50" width="30" height="22" rx="4" stroke="#ff2bd6"/></g><path d="M100 112 140 64" stroke="#00f0ff" stroke-width="3" stroke-dasharray="4 6"/><circle cx="100" cy="110" r="6" fill="#fff"/></svg>',
  };

  const GAMES = [
    { id: 'spin-wheel', bg: 'linear-gradient(135deg,#3a2a6b,#1b2556)', badge: { ar: 'يوميًا', en: 'Daily' }, badgeCls: 'nile',
      title: { ar: 'عجلة الحظ اليومية', en: 'Daily Lucky Wheel' },
      desc: { ar: 'لفة مجانية كل يوم: نقاط وخصومات ونصائح سفر.', en: 'A free spin every day: points, discounts and travel tips.' } },
    { id: 'tourism-quiz', bg: 'linear-gradient(135deg,#5a3d12,#1b2556)', badge: { ar: 'سياحة', en: 'Travel' },
      title: { ar: 'مستكشف مصر', en: 'Egypt Explorer Quiz' },
      desc: { ar: 'اختبر معلوماتك عن مصر ومعالمها والمعلومات العامة.', en: 'Test what you know about Egypt, its landmarks and the world.' } },
    { id: 'bubble-shooter', bg: 'linear-gradient(135deg,#123b5a,#1b2556)', badge: { ar: 'الأكثر لعبًا', en: 'Popular' }, badgeCls: 'rose',
      title: { ar: 'فقاعات النيل', en: 'Nile Bubbles' },
      desc: { ar: 'صوّب وطابق 3 ألوان وأسقط الفقاعات المعلّقة.', en: 'Aim, match three colours and drop the hanging bubbles.' } },
    { id: 'snake', bg: 'linear-gradient(135deg,#0d3f3a,#1b2556)',
      title: { ar: 'الثعبان النيون', en: 'Neon Snake' },
      desc: { ar: 'الكلاسيكية المحبوبة بثلاثة أوضاع: كلاسيك وبوابات ومتاهة.', en: 'The classic, reborn with Classic, Portal and Maze modes.' } },
    { id: 'cyberbreaker', bg: 'linear-gradient(135deg,#2a0f4a,#07041a)', badge: { ar: 'أصلية', en: 'Original' },
      title: { ar: 'سايبر بريكر', en: 'CyberBreaker' },
      desc: { ar: 'كسّار طوب نيون بمئات المراحل وبطاقات ليزر تكتيكية.', en: 'A neon brick breaker with hundreds of stages and laser cards.' } },
  ];

  const STR = {
    ar: { brand: 'ألعاب تريب تايمنجز', brandSub: 'Trip Timings Games', eyebrow: '5 ألعاب مجانية · بدون تحميل', h1: 'العب، اربح، واكتشف مصر',
      lead: 'ألعاب سريعة تعمل على الموبايل والكمبيوتر. لف عجلة الحظ كل يوم واجمع مكافآت لرحلتك القادمة.',
      heroWheel: '🎡 لف عجلة اليوم', heroAll: 'كل الألعاب', games: 'الألعاب', play: 'العب', best: 'أفضل نتيجة',
      w1: 'فورية', w1s: 'تفتح في ثانية بدون تسجيل', w2: 'لكل الأجهزة', w2s: 'موبايل وتابلت وكمبيوتر', w3: 'مكافآت يومية', w3s: 'خصومات ونقاط من عجلة الحظ',
      foot: 'مقدمة من', privacy: 'الخصوصية', dReady: 'لفّتك المجانية جاهزة!', dReadySub: 'اضغط لتلف العجلة الآن', dDone: 'لفيت العجلة اليوم ✓', dDoneSub: 'عُد غدًا · سلسلتك: {n} يوم' },
    en: { brand: 'Trip Timings Games', brandSub: 'ألعاب تريب تايمنجز', eyebrow: '5 free games · no download', h1: 'Play, win and discover Egypt',
      lead: 'Quick games for phone and desktop. Spin the lucky wheel every day and collect rewards for your next trip.',
      heroWheel: '🎡 Spin today’s wheel', heroAll: 'All games', games: 'Games', play: 'Play', best: 'Best',
      w1: 'Instant', w1s: 'Opens in a second, no sign-up', w2: 'Any device', w2s: 'Phone, tablet and desktop', w3: 'Daily rewards', w3s: 'Discounts and points from the wheel',
      foot: 'Presented by', privacy: 'Privacy', dReady: 'Your free spin is ready!', dReadySub: 'Tap to spin the wheel now', dDone: 'Spun today ✓', dDoneSub: 'Come back tomorrow · streak: {n} days' },
  };
  const T = (k, v) => { let s = (STR[hub.lang] || STR.ar)[k] || k; for (const x in v || {}) s = s.replace('{' + x + '}', v[x]); return s; };
  const tt = (d) => hub.t(d);

  function bestOf(id) {
    if (id === 'cyberbreaker') {
      try {
        const save = JSON.parse(localStorage.getItem('cyberbreaker.save.v1') || '{}');
        return Math.max(0, ...Object.values(save.best || {}).map(Number).filter(Number.isFinite));
      } catch (e) { return 0; }
    }
    if (id === 'spin-wheel') return (hub.load('wheel', {}).coins) || 0;
    return hub.getBest(id);
  }

  function renderGrid() {
    const grid = $('#grid'); grid.innerHTML = '';
    GAMES.forEach((g) => {
      const a = document.createElement('a');
      a.className = 'card'; a.href = 'games/' + g.id + '/';
      a.addEventListener('click', () => hub.track('lobby_open', { game: g.id }));
      const best = bestOf(g.id);
      a.innerHTML =
        '<div class="thumb" style="background:' + g.bg + '">' + ART[g.id] +
          (g.badge ? '<span class="badge ' + (g.badgeCls || '') + '"></span>' : '') + '</div>' +
        '<div class="card-body"><h3></h3><p></p>' +
          '<div class="card-foot"><small></small><span class="play"></span></div></div>';
      if (g.badge) a.querySelector('.badge').textContent = tt(g.badge);
      a.querySelector('h3').textContent = tt(g.title);
      a.querySelector('p').textContent = tt(g.desc);
      const s = a.querySelector('small');
      if (best > 0) { s.textContent = (g.id === 'spin-wheel' ? '⭐ ' : T('best') + ': '); const b = document.createElement('b'); b.textContent = best.toLocaleString(); s.appendChild(b); }
      a.querySelector('.play').textContent = T('play') + (hub.lang === 'ar' ? ' ◂' : ' ▸');
      grid.appendChild(a);
    });
  }

  function renderDaily() {
    const w = hub.load('wheel', {});
    const ready = (w.extra || 0) > 0 || w.lastSpin !== hub.today();
    $('#daily').classList.toggle('ready', ready);
    $('#dailyTitle').textContent = ready ? T('dReady') : T('dDone');
    $('#dailySub').textContent = ready ? T('dReadySub') : T('dDoneSub', { n: w.streak || 0 });
  }

  function renderText() {
    document.querySelectorAll('[data-t]').forEach((el) => (el.textContent = T(el.dataset.t)));
    $('#langBtn').textContent = hub.lang === 'ar' ? 'EN' : 'عربي';
    renderGrid(); renderDaily();
    window.TTPromo && TTPromo.banner($('#lobbyPromo'), { surface: 'lobby' });
  }

  $('#langBtn').addEventListener('click', () => hub.setLang(hub.lang === 'ar' ? 'en' : 'ar'));
  document.addEventListener('tt:lang', renderText);
  $('#daily').addEventListener('click', () => (location.href = 'games/spin-wheel/'));
  $('#daily').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); location.href = 'games/spin-wheel/'; } });
  $('#daily').style.cursor = 'pointer';
  $('#year').textContent = new Date().getFullYear();
  if (window.TTPromo) $('#footLink').href = TTPromo.url('/', { content: 'footer' });
  // refresh scores when coming back with the browser's back button (bfcache)
  window.addEventListener('pageshow', (e) => { if (e.persisted) { renderGrid(); renderDaily(); } });
  renderText();
})();
