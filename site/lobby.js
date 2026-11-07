/* Lobby — renders the game cards, daily-wheel status and language toggle.
   To add a game: append an entry to GAMES (id must match the folder under /games/). */
'use strict';
(() => {
  const hub = window.TTHub;
  const $ = (s) => document.querySelector(s);

  const ART = {
    'bubble-shooter': '<svg viewBox="0 0 200 120"><g><circle cx="40" cy="22" r="16" fill="#ff6b8b"/><circle cx="74" cy="22" r="16" fill="#2ec4b6"/><circle cx="108" cy="22" r="16" fill="#f2b544"/><circle cx="142" cy="22" r="16" fill="#ff6b8b"/><circle cx="57" cy="50" r="16" fill="#5aa9ff"/><circle cx="91" cy="50" r="16" fill="#f2b544"/><circle cx="125" cy="50" r="16" fill="#a77bff"/><circle cx="159" cy="22" r="0"/></g><path d="M100 112 L100 84" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-dasharray="2 9"/><circle cx="100" cy="104" r="14" fill="#2ec4b6" stroke="#fff" stroke-width="3"/></svg>',
    'tourism-quiz': '<svg viewBox="0 0 200 120"><path d="M30 104 78 20l48 84z" fill="#f2b544"/><path d="M78 20l48 84H78z" fill="#b9831f"/><path d="M110 104l30-52 30 52z" fill="#ffd27a"/><circle cx="160" cy="28" r="22" fill="#2ec4b6"/><text x="160" y="38" font-size="30" font-weight="900" text-anchor="middle" fill="#01302b" font-family="Cairo, sans-serif">?</text></svg>',
    'nile-blocks': '<svg viewBox="0 0 200 120"><g stroke="#fff" stroke-opacity=".35" stroke-width="2"><rect x="50" y="14" width="22" height="22" fill="#00f0ff"/><rect x="72" y="14" width="22" height="22" fill="#00f0ff"/><rect x="72" y="36" width="22" height="22" fill="#00f0ff"/><rect x="106" y="36" width="22" height="22" fill="#ff2bd6"/><rect x="128" y="36" width="22" height="22" fill="#ff2bd6"/><rect x="50" y="58" width="22" height="22" fill="#ffd27a"/><rect x="72" y="58" width="22" height="22" fill="#ffd27a"/><rect x="94" y="58" width="22" height="22" fill="#ffd27a"/><rect x="116" y="58" width="22" height="22" fill="#7ad66b"/><rect x="138" y="58" width="22" height="22" fill="#7ad66b"/><rect x="50" y="80" width="110" height="22" fill="#a77bff" opacity=".55"/></g></svg>',
    'neon-stack': '<svg viewBox="0 0 200 120"><rect x="60" y="92" width="80" height="16" fill="#00f0ff"/><rect x="62" y="76" width="76" height="16" fill="#2ec4ff"/><rect x="66" y="60" width="70" height="16" fill="#7a8cff"/><rect x="70" y="44" width="64" height="16" fill="#c06bff"/><rect x="72" y="28" width="60" height="16" fill="#ff2bd6"/><rect x="108" y="8" width="60" height="16" fill="#ff6b8b" opacity=".85"/><path d="M100 4v20" stroke="#fff" stroke-dasharray="3 4"/></svg>',
    'desert-rush': '<svg viewBox="0 0 200 120"><rect x="0" y="0" width="200" height="120" fill="#6b3d16" opacity=".55"/><rect x="40" y="0" width="120" height="120" fill="#120b26"/><path d="M80 0v120M120 0v120" stroke="#00f0ff" stroke-width="3" stroke-dasharray="14 14"/><path d="M41 0v120M159 0v120" stroke="#ff2bd6" stroke-width="2"/><rect x="88" y="70" width="24" height="40" rx="7" fill="#00d0e6"/><rect x="92" y="78" width="16" height="9" rx="3" fill="#0a0030"/><path d="M52 30l8-12 12-4 10 10-2 12H54z" fill="#8a5a2b"/><path d="M140 40l4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1z" fill="#ffd27a"/></svg>',
    'pharaoh-memory': '<svg viewBox="0 0 200 120"><g><rect x="34" y="20" width="36" height="46" rx="7" fill="#2a1a6b" stroke="#00f0ff" stroke-width="2"/><text x="52" y="52" font-size="22" text-anchor="middle" fill="#ffd27a">☥</text><rect x="82" y="20" width="36" height="46" rx="7" fill="#fff3d6" stroke="#f2b544" stroke-width="2"/><text x="100" y="52" font-size="24" text-anchor="middle">🐫</text><rect x="130" y="20" width="36" height="46" rx="7" fill="#fff3d6" stroke="#7ad66b" stroke-width="2"/><text x="148" y="52" font-size="24" text-anchor="middle">🐫</text><rect x="58" y="72" width="36" height="40" rx="7" fill="#2a1a6b" stroke="#00f0ff" stroke-width="2"/><rect x="106" y="72" width="36" height="40" rx="7" fill="#2a1a6b" stroke="#00f0ff" stroke-width="2"/></g></svg>',
    'sand-sort': '<svg viewBox="0 0 200 120"><g stroke="#bff" stroke-width="3" fill="rgba(255,255,255,.06)"><rect x="40" y="16" width="30" height="94" rx="12"/><rect x="85" y="16" width="30" height="94" rx="12"/><rect x="130" y="16" width="30" height="94" rx="12"/></g><rect x="43" y="40" width="24" height="22" fill="#ff2bd6"/><rect x="43" y="62" width="24" height="22" fill="#00f0ff"/><rect x="43" y="84" width="24" height="22" rx="8" fill="#ffd23f"/><rect x="88" y="62" width="24" height="22" fill="#ffd23f"/><rect x="88" y="84" width="24" height="22" rx="8" fill="#ffd23f"/><rect x="133" y="84" width="24" height="22" rx="8" fill="#ff2bd6"/><g fill="#c98a4b"><rect x="44" y="10" width="22" height="8" rx="3"/><rect x="89" y="10" width="22" height="8" rx="3"/><rect x="134" y="10" width="22" height="8" rx="3"/></g></svg>',
    'arrow-escape': '<svg viewBox="0 0 200 120"><g stroke="#00f0ff" stroke-opacity=".2"><path d="M40 10h120v100H40zM70 10v100M100 10v100M130 10v100M40 35h120M40 60h120M40 85h120"/></g><g font-size="24" font-weight="900" text-anchor="middle" font-family="sans-serif"><text x="55" y="31" fill="#00f0ff">➜</text><text x="115" y="31" fill="#ff2bd6">⬆</text><text x="85" y="56" fill="#ffd23f">⬅</text><text x="145" y="81" fill="#7ad66b">⬇</text><text x="55" y="106" fill="#a77bff">⬆</text><text x="115" y="106" fill="#ff7a3d">➜</text></g></svg>',
    'parking-jam': '<svg viewBox="0 0 200 120"><rect x="30" y="8" width="140" height="104" fill="#1b1838" stroke="#00f0ff" stroke-width="3" stroke-dasharray="8 6"/><rect x="38" y="16" width="56" height="24" rx="7" fill="#7ad66b"/><rect x="100" y="16" width="24" height="56" rx="7" fill="#f2f2f2"/><rect x="100" y="38" width="24" height="6" fill="#2a6fdb"/><rect x="130" y="16" width="32" height="24" rx="7" fill="#ffd23f"/><rect x="38" y="48" width="56" height="24" rx="7" fill="#16161d" stroke="#ffd23f" stroke-width="2"/><rect x="130" y="48" width="24" height="56" rx="7" fill="#ff2bd6"/><rect x="38" y="80" width="86" height="24" rx="7" fill="#00c2d6"/></svg>',
    dominoes: '<svg viewBox="0 0 200 120"><g transform="rotate(-12 70 60)"><rect x="48" y="12" width="44" height="88" rx="9" fill="#120c2e" stroke="#00f0ff" stroke-width="4"/><line x1="54" y1="56" x2="86" y2="56" stroke="#3a2f7a" stroke-width="3"/><g fill="#00f0ff"><circle cx="70" cy="34" r="6"/><circle cx="60" cy="70" r="6"/><circle cx="80" cy="88" r="6"/><circle cx="70" cy="79" r="0"/></g></g><g transform="rotate(10 130 60)"><rect x="108" y="18" width="44" height="88" rx="9" fill="#19042b" stroke="#ff2bd6" stroke-width="4"/><line x1="114" y1="62" x2="146" y2="62" stroke="#5a1a72" stroke-width="3"/><g fill="#ff2bd6"><circle cx="120" cy="30" r="6"/><circle cx="140" cy="50" r="6"/><circle cx="120" cy="50" r="6"/><circle cx="140" cy="30" r="6"/><circle cx="130" cy="84" r="6"/></g></g></svg>',
    'spin-wheel': '<svg viewBox="0 0 200 120"><g transform="translate(100 62)"><circle r="50" fill="#1b2556" stroke="#ffd27a" stroke-width="6"/><path d="M0 0 0-46A46 46 0 0 1 40-23z" fill="#2ec4b6"/><path d="M0 0 40-23A46 46 0 0 1 40 23z" fill="#f2b544"/><path d="M0 0 40 23A46 46 0 0 1 0 46z" fill="#ff6b8b"/><path d="M0 0 0 46A46 46 0 0 1-40 23z" fill="#5aa9ff"/><path d="M0 0-40 23A46 46 0 0 1-40-23z" fill="#a77bff"/><path d="M0 0-40-23A46 46 0 0 1 0-46z" fill="#7ad66b"/><circle r="10" fill="#ffd27a"/></g><path d="M90 4h20l-10 16z" fill="#fff3d6"/></svg>',
    cyberbreaker: '<svg viewBox="0 0 200 120"><g fill="none" stroke-width="4"><rect x="22" y="14" width="30" height="22" rx="4" stroke="#00f0ff"/><rect x="62" y="14" width="30" height="22" rx="4" stroke="#ff2bd6"/><path d="M118 36l14-22 14 22z" stroke="#ffd23f"/><rect x="152" y="14" width="30" height="22" rx="4" stroke="#00f0ff"/><path d="M50 58l14-10 14 10v12l-14 10-14-10z" stroke="#ffd23f"/><rect x="120" y="50" width="30" height="22" rx="4" stroke="#ff2bd6"/></g><path d="M100 112 140 64" stroke="#00f0ff" stroke-width="3" stroke-dasharray="4 6"/><circle cx="100" cy="110" r="6" fill="#fff"/></svg>',
  };

  const GAMES = [
    { id: 'spin-wheel', bg: 'linear-gradient(135deg,#3a2a6b,#1b2556)', badge: { ar: 'يوميًا', en: 'Daily' }, badgeCls: 'nile',
      title: { ar: 'عجلة الحظ اليومية', en: 'Daily Lucky Wheel' },
      desc: { ar: 'لفة مجانية كل يوم: نقاط وخصومات ونصائح سفر.', en: 'A free spin every day: points, discounts and travel tips.' } },
    { id: 'dominoes', bg: 'radial-gradient(circle at 50% 30%,#2a1a6b,#07041a)', badge: { ar: '5 أوضاع', en: '5 modes' }, badgeCls: 'neon',
      title: { ar: 'دومينو', en: 'Dominoes' },
      desc: { ar: 'عربي (شراكة) وسحب وبلوك وخمسات ودومينو 31 في لعبة واحدة.', en: 'Arabic partners, Draw, Block, All Fives and Domino 31 in one game.' } },
    { id: 'nile-blocks', bg: 'linear-gradient(135deg,#123b5a,#0b0726)', badge: { ar: 'ألغاز · جديدة', en: 'Puzzle · New' }, badgeCls: 'neon',
      title: { ar: 'بلوكات النيل', en: 'Nile Blocks' },
      desc: { ar: 'رتّب القطع على شبكة 8×8 وامسح الصفوف والأعمدة.', en: 'Fit pieces on an 8×8 grid and clear rows and columns.' } },
    { id: 'sand-sort', bg: 'linear-gradient(135deg,#4a2a10,#120b26)', badge: { ar: 'ألغاز · جديدة', en: 'Puzzle · New' }, badgeCls: 'neon',
      title: { ar: 'رمال سيوة', en: 'Siwa Sand Sort' },
      desc: { ar: 'صب الرمل الملون بين الزجاجات لحد ما كل زجاجة تبقى بلون واحد.', en: 'Pour coloured sand until every bottle holds one colour.' } },
    { id: 'parking-jam', bg: 'linear-gradient(135deg,#123b5a,#120b26)', badge: { ar: 'ألغاز · جديدة', en: 'Puzzle · New' }, badgeCls: 'neon',
      title: { ar: 'زحمة الجراج', en: 'Cairo Parking Jam' },
      desc: { ar: 'طلّع التاكسيات والميكروباصات والتكاتك من الجراج بالترتيب الصح.', en: 'Get the taxis, microbuses and tuk-tuks out in the right order.' } },
    { id: 'arrow-escape', bg: 'linear-gradient(135deg,#2a1a6b,#07041a)', badge: { ar: 'ذكاء · جديدة', en: 'Brain · New' }, badgeCls: 'neon',
      title: { ar: 'هروب الأسهم', en: 'Arrow Escape' },
      desc: { ar: 'كل سهم بيخرج في اتجاهه لو طريقه فاضي. فضّي اللوحة!', en: 'Each arrow slides out if its path is clear. Empty the board!' } },
    { id: 'neon-stack', bg: 'linear-gradient(135deg,#3a1260,#07041a)', badge: { ar: 'آركيد · جديدة', en: 'Arcade · New' }, badgeCls: 'neon',
      title: { ar: 'برج النيون', en: 'Neon Stack' },
      desc: { ar: 'اضغط في اللحظة الصح وابنِ أعلى برج نيون.', en: 'Tap at the right moment to build the tallest neon tower.' } },
    { id: 'desert-rush', bg: 'linear-gradient(135deg,#5a3010,#120b26)', badge: { ar: 'سباق · جديدة', en: 'Racing · New' }, badgeCls: 'neon',
      title: { ar: 'سباق الصحراء', en: 'Desert Rush' },
      desc: { ar: 'سوق في الصحراء، اتفادى الصخور واجمع النجوم.', en: 'Race the desert, dodge rocks and grab stars.' } },
    { id: 'pharaoh-memory', bg: 'linear-gradient(135deg,#4a3410,#1b2556)', badge: { ar: 'ذكاء · جديدة', en: 'Brain · New' }, badgeCls: 'neon',
      title: { ar: 'ذاكرة الفراعنة', en: 'Pharaoh Memory' },
      desc: { ar: 'اقلب الكروت ووصّل الأزواج قبل ما الوقت يخلص.', en: 'Flip cards and match the pairs before time runs out.' } },
    { id: 'tourism-quiz', bg: 'linear-gradient(135deg,#5a3d12,#1b2556)', badge: { ar: 'سياحة', en: 'Travel' },
      title: { ar: 'مستكشف مصر', en: 'Egypt Explorer Quiz' },
      desc: { ar: 'اختبر معلوماتك عن مصر ومعالمها والمعلومات العامة.', en: 'Test what you know about Egypt, its landmarks and the world.' } },
    { id: 'bubble-shooter', bg: 'linear-gradient(135deg,#123b5a,#1b2556)', badge: { ar: 'الأكثر لعبًا', en: 'Popular' }, badgeCls: 'rose',
      title: { ar: 'فقاعات النيل', en: 'Nile Bubbles' },
      desc: { ar: 'صوّب وطابق 3 ألوان وأسقط الفقاعات المعلّقة.', en: 'Aim, match three colours and drop the hanging bubbles.' } },
    { id: 'cyberbreaker', bg: 'linear-gradient(135deg,#2a0f4a,#07041a)', badge: { ar: 'أصلية', en: 'Original' },
      title: { ar: 'سايبر بريكر', en: 'CyberBreaker' },
      desc: { ar: 'كسّار طوب نيون بمئات المراحل وبطاقات ليزر تكتيكية.', en: 'A neon brick breaker with hundreds of stages and laser cards.' } },
  ];

  const STR = {
    ar: { brand: 'ألعاب تريب تايمنجز', brandSub: 'Trip Timings Games', eyebrow: '{n} لعبة مجانية · بدون تحميل', h1: 'العب، اربح، واكتشف مصر',
      lead: 'ألعاب سريعة تعمل على الموبايل والكمبيوتر. لف عجلة الحظ كل يوم واجمع مكافآت لرحلتك القادمة.',
      heroWheel: '🎡 لف عجلة اليوم', heroAll: 'كل الألعاب', games: 'الألعاب', play: 'العب', best: 'أفضل نتيجة',
      w1: 'فورية', w1s: 'تفتح في ثانية بدون تسجيل', w2: 'لكل الأجهزة', w2s: 'موبايل وتابلت وكمبيوتر', w3: 'مكافآت يومية', w3s: 'خصومات ونقاط من عجلة الحظ', invT: 'ادعُ أصحابك واكسب ⭐', invS: 'كل مشاركة = {r} ⭐ (حتى {c} يوميًا)، وصديقك ياخد {w} ⭐ هدية. 3 مشاركات تفتح طقم دومينو «الصداقة».', invB: '🤝 ادعُ الآن', wallet: 'نقاطك تُستخدم في كل الألعاب',
      foot: 'مقدمة من', privacy: 'الخصوصية', dReady: 'لفّتك المجانية جاهزة!', dReadySub: 'اضغط لتلف العجلة الآن', dDone: 'لفيت العجلة اليوم ✓', dDoneSub: 'عُد غدًا · سلسلتك: {n} يوم' },
    en: { brand: 'Trip Timings Games', brandSub: 'ألعاب تريب تايمنجز', eyebrow: '{n} free games · no download', h1: 'Play, win and discover Egypt',
      lead: 'Quick games for phone and desktop. Spin the lucky wheel every day and collect rewards for your next trip.',
      heroWheel: '🎡 Spin today’s wheel', heroAll: 'All games', games: 'Games', play: 'Play', best: 'Best',
      w1: 'Instant', w1s: 'Opens in a second, no sign-up', w2: 'Any device', w2s: 'Phone, tablet and desktop', w3: 'Daily rewards', w3s: 'Discounts and points from the wheel', invT: 'Invite friends, earn ⭐', invS: 'Each share = {r} ⭐ (up to {c} a day) and your friend gets a {w} ⭐ gift. 3 shares unlock the “Friendship” domino set.', invB: '🤝 Invite now', wallet: 'Your points work in every game',
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
    if (id === 'spin-wheel') return window.TTEco ? TTEco.coins() : 0;
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
      if (best > 0) { s.textContent = (g.id === 'spin-wheel' ? '⭐ ' : T('best') + ': '); const b = document.createElement('b'); b.textContent = best.toLocaleString('en'); s.appendChild(b); }
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

  function renderInvite() {
    if (!window.TTEco) return;
    const c = TTEco.config;
    $('#invS').textContent = T('invS', { r: c.shareReward, c: c.shareDailyCap, w: c.welcomeBonus });
  }

  function renderText() {
    document.querySelectorAll('[data-t]').forEach((el) => (el.textContent = T(el.dataset.t, { n: GAMES.length })));
    $('#langBtn').textContent = hub.lang === 'ar' ? 'EN' : 'عربي';
    renderGrid(); renderDaily(); renderInvite();
    window.TTPromo && TTPromo.banner($('#lobbyPromo'), { surface: 'lobby' });
  }

  $('#langBtn').addEventListener('click', () => hub.setLang(hub.lang === 'ar' ? 'en' : 'ar'));
  document.addEventListener('tt:lang', renderText);
  $('#daily').addEventListener('click', () => (location.href = 'games/spin-wheel/'));
  $('#daily').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); location.href = 'games/spin-wheel/'; } });
  $('#daily').style.cursor = 'pointer';
  if (window.TTEco) {
    TTEco.chip($('#coins'));
    $('#coins').title = T('wallet');
    $('#inviteBtn').addEventListener('click', () => TTEco.openInvite());
    $('#inviteTop').addEventListener('click', () => TTEco.openInvite());
    document.addEventListener('tt:coins', renderGrid);
  }
  $('#year').textContent = new Date().getFullYear();
  if (window.TTPromo) $('#footLink').href = TTPromo.url('/', { content: 'footer' });
  // refresh scores when coming back with the browser's back button (bfcache)
  window.addEventListener('pageshow', (e) => { if (e.persisted) { renderGrid(); renderDaily(); } });
  renderText();
})();
