/* Daily Lucky Wheel — Trip Timings Games Hub
   One free spin per local calendar day, a 7-day streak bonus and a prize wallet.

   ⚠️ COMMERCIAL NOTE: coupon codes below are placeholders. Create the same codes
   (with usage limits + expiry) in the Trip Timings booking/pricing engine before
   launch, or set their weight to 0. Prizes are decided in the browser, so a
   determined visitor can spin again by clearing site data — validate and cap
   every coupon on the booking side. */
'use strict';
(() => {
  const hub = window.TTHub;

  // id, weight (relative odds), colour, icon, label, and what the prize gives
  const PRIZES = (window.TT_WHEEL_CONFIG && window.TT_WHEEL_CONFIG.prizes) || [
    { id: 'p10',   w: 24, color: '#2ec4b6', icon: '⭐', points: 10,  label: { ar: '10 نقاط', en: '10 pts' } },
    { id: 'c5',    w: 10, color: '#f2b544', icon: '🎟️', coupon: 'TTGAME5', label: { ar: 'خصم 5%', en: '5% off' } },
    { id: 'p25',   w: 18, color: '#5aa9ff', icon: '⭐', points: 25,  label: { ar: '25 نقطة', en: '25 pts' } },
    { id: 'tip',   w: 14, color: '#a77bff', icon: '💡', tip: true,   label: { ar: 'نصيحة سفر', en: 'Travel tip' } },
    { id: 'p50',   w: 12, color: '#ff6b8b', icon: '🌟', points: 50,  label: { ar: '50 نقطة', en: '50 pts' } },
    { id: 'c10',   w: 3,  color: '#ffd27a', icon: '🎫', coupon: 'TTGAME10', label: { ar: 'خصم 10%', en: '10% off' } },
    { id: 'again', w: 12, color: '#7ad66b', icon: '🔄', again: true, label: { ar: 'لفة أخرى', en: 'Spin again' } },
    { id: 'p100',  w: 7,  color: '#ff8f5a', icon: '💎', points: 100, label: { ar: '100 نقطة', en: '100 pts' } },
  ];
  const COUPON_TERMS = { ar: 'صالح 30 يومًا على الحجوزات من موقع تريب تايمنجز. استخدام واحد لكل عميل.', en: 'Valid 30 days on bookings at Trip Timings. One use per customer.' };
  const TIPS = [
    { ar: 'زُر أهرامات الجيزة مع أول ساعة فتح لتتجنب الحر والزحام.', en: 'Reach the Giza Pyramids at opening time to beat the heat and the crowds.' },
    { ar: 'أفضل وقت لكروز النيل بين أكتوبر وأبريل حين يكون الجو معتدلًا.', en: 'October to April is the most pleasant season for a Nile cruise.' },
    { ar: 'في معابد الأقصر احجز رحلة المنطاد عند الفجر لمنظر لا يُنسى.', en: 'In Luxor, book the dawn balloon ride for an unforgettable view.' },
    { ar: 'احمل نقودًا صغيرة بالجنيه المصري للبقشيش والأسواق.', en: 'Carry small Egyptian-pound notes for tips and markets.' },
    { ar: 'في الغردقة اختر رحلة سنوركلينج إلى جزيرة الجفتون لشعاب مذهلة.', en: 'From Hurghada, snorkel at Giftun Island for stunning reefs.' },
    { ar: 'ارتدِ ملابس تغطي الكتفين والركبتين عند زيارة المساجد والكنائس.', en: 'Cover shoulders and knees when visiting mosques and churches.' },
  ];
  const STR = {
    ar: { title: 'عجلة الحظ اليومية', coins: 'النقاط', streak: 'أيام متتالية', spin: 'لِف', wallet: 'جوائزك',
      use: 'استخدمها على تريب تايمنجز', ok: 'رائع!', ready: 'لفّتك المجانية لليوم جاهزة!', spinning: 'حظًا سعيدًا…',
      next: 'اللفة القادمة بعد {t}', won: 'مبروك! ربحت {p}', points: '+{n} نقطة أُضيفت لرصيدك', tip: 'نصيحة اليوم',
      again: 'لديك لفة إضافية الآن!', bonus: 'مكافأة 7 أيام متتالية: +100 نقطة! 🔥', day: 'يوم',
      copy: 'اضغط على الكود لنسخه', copied: 'تم النسخ ✓' },
    en: { title: 'Daily Lucky Wheel', coins: 'Points', streak: 'Day streak', spin: 'SPIN', wallet: 'Your rewards',
      use: 'Use it on Trip Timings', ok: 'Great!', ready: 'Your free spin for today is ready!', spinning: 'Good luck…',
      next: 'Next spin in {t}', won: 'You won {p}!', points: '+{n} points added', tip: 'Today’s tip',
      again: 'You’ve got an extra spin!', bonus: '7-day streak bonus: +100 points! 🔥', day: 'Day',
      copy: 'Tap the code to copy it', copied: 'Copied ✓' },
  };
  const T = (k, v) => { let s = (STR[hub.lang] || STR.ar)[k] || k; for (const x in v || {}) s = s.replace('{' + x + '}', v[x]); return s; };
  const tt = (d) => hub.t(d);
  const $ = (s) => document.querySelector(s);
  document.querySelectorAll('[data-t]').forEach((el) => (el.textContent = T(el.dataset.t)));
  document.title = T('title') + ' · Trip Timings Games';

  // ---------- state ----------
  const S = Object.assign({ coins: 0, streak: 0, lastSpin: '', extra: 0, wallet: [] }, hub.load('wheel', {}));
  const save = () => hub.store('wheel', S);

  function dayDiff(a, b) { return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000); }
  function canSpin() { return S.extra > 0 || S.lastSpin !== hub.today(); }

  // ---------- wheel drawing ----------
  const cv = $('#wheel'), ctx = cv.getContext('2d');
  const N = PRIZES.length, SEG = (Math.PI * 2) / N;
  let rot = 0, spinning = false;

  function drawWheel() {
    const c = cv.width / 2, r = c - 14;
    ctx.clearRect(0, 0, cv.width, cv.height);
    // rim
    ctx.beginPath(); ctx.arc(c, c, r + 10, 0, Math.PI * 2); ctx.fillStyle = '#1b2556'; ctx.fill();
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      ctx.beginPath(); ctx.arc(c + Math.cos(a) * (r + 5), c + Math.sin(a) * (r + 5), 4, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 ? '#ffd27a' : '#fff3d6'; ctx.fill();
    }
    ctx.save(); ctx.translate(c, c); ctx.rotate(rot);
    PRIZES.forEach((p, i) => {
      const a0 = -Math.PI / 2 + i * SEG - SEG / 2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, a0, a0 + SEG); ctx.closePath();
      const g = ctx.createRadialGradient(0, 0, r * .2, 0, 0, r);
      g.addColorStop(0, shade(p.color, 30)); g.addColorStop(1, p.color);
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.save(); ctx.rotate(a0 + SEG / 2);
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#1a1030';
      ctx.font = '900 26px Cairo, sans-serif';
      ctx.fillText(tt(p.label), r - 22, 2);
      ctx.font = '30px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
      ctx.fillText(p.icon, r * .42, 2);
      ctx.restore();
    });
    ctx.restore();
  }
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const f = (v) => Math.max(0, Math.min(255, v + amt));
    return 'rgb(' + f(n >> 16) + ',' + f((n >> 8) & 255) + ',' + f(n & 255) + ')';
  }

  function pickPrize() {
    const total = PRIZES.reduce((s, p) => s + p.w, 0);
    let x = Math.random() * total;
    for (let i = 0; i < N; i++) { x -= PRIZES[i].w; if (x < 0) return i; }
    return 0;
  }

  // ---------- spin ----------
  function spin() {
    if (spinning || !canSpin()) return;
    spinning = true; $('#spinBtn').disabled = true; $('#status').textContent = T('spinning');
    const today = hub.today();
    if (S.extra > 0) S.extra--;
    else {
      S.streak = S.lastSpin && dayDiff(S.lastSpin, today) === 1 ? S.streak + 1 : 1;
      S.lastSpin = today;
    }
    save();
    const idx = pickPrize();
    // segment i is centred at angle i*SEG (from the top) before rotation
    const jitter = (Math.random() - .5) * SEG * .7;
    const target = -idx * SEG + jitter;
    const from = rot;
    const base = from - (from % (Math.PI * 2));
    const to = base + Math.PI * 2 * 6 + ((target % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const dur = 4800, t0 = performance.now();
    let lastTick = Math.floor(from / SEG);
    hub.track('wheel_spin', { game: 'spin-wheel' });
    (function frame(now) {
      const t = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - t, 4);
      rot = from + (to - from) * e;
      const tick = Math.floor(rot / SEG);
      if (tick !== lastTick) { lastTick = tick; buzz(4); }
      drawWheel();
      if (t < 1) requestAnimationFrame(frame);
      else { spinning = false; award(PRIZES[idx]); }
    })(t0);
  }

  function award(p) {
    let text = '';
    $('#prizeCode').hidden = true; $('#prizeUse').hidden = true;
    if (p.points) { S.coins += p.points; text = T('points', { n: p.points }); }
    if (p.tip) { text = T('tip') + ': ' + tt(TIPS[Math.floor(Math.random() * TIPS.length)]); }
    if (p.again) { S.extra++; text = T('again'); }
    if (p.coupon) {
      text = tt(COUPON_TERMS) + ' ' + T('copy');
      $('#prizeCode').textContent = p.coupon; $('#prizeCode').hidden = false;
      if (window.TTPromo) {
        $('#prizeUse').href = TTPromo.url('/', { content: 'wheel-' + p.id, coupon: p.coupon });
        $('#prizeUse').dataset.surface = 'wheel-prize'; $('#prizeUse').dataset.offer = p.id;
        $('#prizeUse').hidden = false;
      }
      S.wallet.unshift({ code: p.coupon, label: p.label, date: hub.today() });
      S.wallet = S.wallet.slice(0, 10);
    }
    if (!p.again && S.extra === 0 && S.streak > 0 && S.streak % 7 === 0 && S.bonusDay !== hub.today()) {
      S.coins += 100; S.bonusDay = hub.today(); text += '\n' + T('bonus');
    }
    save();
    hub.track('wheel_prize', { game: 'spin-wheel', prize: p.id });
    $('#prizeIcon').textContent = p.icon;
    $('#prizeTitle').textContent = T('won', { p: tt(p.label) });
    $('#prizeText').textContent = text;
    $('#prizePanel').hidden = false;
    buzz([30, 40, 80]);
    render();
  }

  // ---------- UI ----------
  function fmtLeft() {
    const now = new Date(), mid = new Date(now); mid.setHours(24, 0, 0, 0);
    const s = Math.max(0, Math.floor((mid - now) / 1000));
    return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map((v) => String(v).padStart(2, '0')).join(':');
  }
  function render() {
    $('#coins').textContent = S.coins;
    const live = S.lastSpin && dayDiff(S.lastSpin, hub.today()) <= 1 ? S.streak : 0;
    $('#streak').textContent = live;
    if (!spinning) {
      $('#spinBtn').disabled = !canSpin();
      $('#status').textContent = canSpin() ? (S.extra > 0 ? T('again') : T('ready')) : T('next', { t: fmtLeft() });
    }
    // week strip: position inside the current 7-day cycle
    const doneToday = S.lastSpin === hub.today();
    const inCycle = live === 0 ? 0 : ((live - 1) % 7) + 1;
    const week = $('#week'); week.innerHTML = '';
    for (let d = 1; d <= 7; d++) {
      const el = document.createElement('div');
      const done = d <= inCycle;
      const isToday = doneToday ? d === inCycle : d === inCycle + 1;
      el.className = 'day' + (done ? ' done' : '') + (isToday ? ' today' : '');
      el.innerHTML = '<b>' + (d === 7 ? '🎁' : done ? '✓' : d) + '</b>' + T('day') + ' ' + d;
      week.appendChild(el);
    }
    const ul = $('#wallet'); ul.innerHTML = '';
    S.wallet.forEach((w) => {
      const li = document.createElement('li');
      li.innerHTML = '<span></span><code></code><small></small>';
      li.children[0].textContent = '🎟️ ' + tt(w.label);
      li.children[1].textContent = w.code;
      li.children[2].textContent = w.date;
      ul.appendChild(li);
    });
    $('#walletBox').hidden = !S.wallet.length;
  }

  function buzz(p) { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { /* ignore */ } }

  $('#spinBtn').addEventListener('click', spin);
  $('#prizeClose').addEventListener('click', () => ($('#prizePanel').hidden = true));
  $('#prizeCode').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('#prizeCode').textContent); $('#prizeText').textContent = T('copied'); } catch (e) { /* ignore */ }
  });
  setInterval(() => { if (!spinning && !canSpin()) render(); }, 1000);
  document.fonts && document.fonts.ready.then(drawWheel);

  drawWheel();
  render();
  window.TTPromo && TTPromo.banner($('#wheelPromo'), { surface: 'wheel' });
})();
