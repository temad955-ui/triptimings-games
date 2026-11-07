/* =========================================================================
   Trip Timings Games Hub — cross-promotion component (promo.js)

   One file drives every promo surface on the platform:
     • a slim ribbon at the bottom of each game (dismissible per session)
     • a "game over" offer card (frequency-capped, never blocks play)
     • inline banners (lobby, quiz results, wheel prizes)
   Every outbound link carries UTM tags so bookings can be traced per game.

   ── Usage ────────────────────────────────────────────────────────────────
   <script src="/shared/hub.js"></script>
   <script src="/shared/promo.js" data-game="dominoes" data-home="1"></script>

   data-game   game id, used as utm_campaign            (required)
   data-home   "1" → inject the floating back-to-lobby button
   data-ribbon "0" → hide the bottom ribbon in this game
   data-watch  CSS selector of a game-over modal; when it becomes visible the
               offer card is triggered automatically (no game code changes)

   From game code:
     TTPromo.gameOver({ score: 120 })        // after a round ends
     TTPromo.banner(el, { offer: 'nile' })   // render a banner inside el
     TTPromo.url('/tours', { content: 'x' }) // UTM-tagged link

   ── Change the target site / offers ──────────────────────────────────────
   Edit TT_PROMO_DEFAULTS below, or define window.TT_PROMO_CONFIG before
   this script loads (same shape, merged on top).
   ========================================================================= */
(function () {
  'use strict';

  var TT_PROMO_DEFAULTS = {
    // ⚠️ Replace with the live Trip Timings website address before launch.
    siteUrl: 'https://triptimings.com',
    brand: { ar: 'تريب تايمنجز', en: 'Trip Timings' },
    utmSource: 'games-hub',
    utmMedium: 'game',
    gameOverEvery: 2,          // show the offer card on every Nth game over…
    gameOverCooldownSec: 90,   // …and never more often than this
    ribbonDelaySec: 20,        // ribbon slides in after this many seconds of play
    offers: [
      { id: 'pyramids', icon: '🏜️', path: '/',
        title: { ar: 'رحلة الأهرامات وأبو الهول', en: 'Giza Pyramids & Sphinx' },
        text:  { ar: 'جولة يوم كامل مع مرشد مصري محترف.', en: 'A full-day tour with a licensed Egyptologist.' } },
      { id: 'nile', icon: '🛳️', path: '/',
        title: { ar: 'كروز النيل الأقصر ↔ أسوان', en: 'Nile Cruise Luxor ↔ Aswan' },
        text:  { ar: 'معابد الكرنك وفيلة وأبو سمبل في رحلة واحدة.', en: 'Karnak, Philae and Abu Simbel in one trip.' } },
      { id: 'redsea', icon: '🐠', path: '/',
        title: { ar: 'الغردقة وشرم الشيخ', en: 'Hurghada & Sharm El Sheikh' },
        text:  { ar: 'غطس وسنوركلينج في أجمل شعاب البحر الأحمر.', en: 'Snorkel and dive the Red Sea reefs.' } },
      { id: 'desert', icon: '🐪', path: '/',
        title: { ar: 'سفاري الصحراء البيضاء وسيوة', en: 'White Desert & Siwa Safari' },
        text:  { ar: 'تخييم تحت النجوم ومغامرة بالدفع الرباعي.', en: 'Camp under the stars on a 4×4 adventure.' } },
      { id: 'alex', icon: '🏛️', path: '/',
        title: { ar: 'يوم في الإسكندرية', en: 'A Day in Alexandria' },
        text:  { ar: 'المكتبة والقلعة وكورنيش البحر المتوسط.', en: 'The Library, the Citadel and the Corniche.' } },
    ],
  };

  var CFG = merge(TT_PROMO_DEFAULTS, window.TT_PROMO_CONFIG || {});
  var hub = window.TTHub || {
    lang: 'ar', t: function (d) { return d && (d.ar || d.en) || ''; },
    load: function (k, f) { return f; }, store: function () {}, track: function () {}, homeButton: function () {},
  };
  var script = document.currentScript || document.querySelector('script[src*="promo.js"]');
  var opts = (script && script.dataset) || {};
  var GAME = opts.game || 'hub';

  var L = {
    book:    { ar: 'احجز رحلتك', en: 'Book now' },
    explore: { ar: 'اكتشف العروض', en: 'See offers' },
    later:   { ar: 'أكمل اللعب', en: 'Keep playing' },
    close:   { ar: 'إغلاق', en: 'Close' },
    sponsor: { ar: 'برعاية', en: 'Presented by' },
    breakT:  { ar: 'استراحة قصيرة؟ خطط لرحلتك القادمة', en: 'Taking a break? Plan your next trip' },
    ribbon:  { ar: 'اكتشف مصر مع', en: 'Discover Egypt with' },
  };
  var t = function (d) { return hub.t(d); };

  function merge(base, extra) {
    var out = {};
    Object.keys(base).forEach(function (k) { out[k] = base[k]; });
    Object.keys(extra).forEach(function (k) { out[k] = extra[k]; });
    return out;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function url(path, extra) {
    extra = extra || {};
    var u;
    try { u = new URL(path || '/', CFG.siteUrl); } catch (e) { return CFG.siteUrl; }
    u.searchParams.set('utm_source', CFG.utmSource);
    u.searchParams.set('utm_medium', CFG.utmMedium);
    u.searchParams.set('utm_campaign', extra.campaign || GAME);
    if (extra.content) u.searchParams.set('utm_content', extra.content);
    if (extra.coupon) u.searchParams.set('coupon', extra.coupon);
    return u.toString();
  }

  // Rotate offers so a visitor sees a different one each time.
  function nextOffer(id) {
    if (id) {
      for (var i = 0; i < CFG.offers.length; i++) if (CFG.offers[i].id === id) return CFG.offers[i];
    }
    var n = (hub.load('promo.rot', 0) + 1) % CFG.offers.length;
    hub.store('promo.rot', n);
    return CFG.offers[n];
  }

  function link(offer, surface, label, cls) {
    var href = url(offer.path, { content: surface + '-' + offer.id });
    return '<a class="' + (cls || 'tt-promo-cta') + '" href="' + esc(href) + '" target="_blank" rel="noopener"' +
      ' data-offer="' + esc(offer.id) + '" data-surface="' + esc(surface) + '">' + esc(label) + '</a>';
  }

  function onClick(e) {
    var a = e.target.closest && e.target.closest('a[data-surface]');
    if (a) hub.track('promo_click', { game: GAME, offer: a.dataset.offer, surface: a.dataset.surface });
  }
  document.addEventListener('click', onClick, true);

  // ---------------------------------------------------------------------
  // Inline banner
  // ---------------------------------------------------------------------
  function banner(el, o) {
    if (!el) return;
    o = o || {};
    var offer = nextOffer(o.offer);
    el.classList.add('tt-promo-banner');
    el.innerHTML =
      '<span class="tt-promo-icon" aria-hidden="true">' + offer.icon + '</span>' +
      '<div class="tt-promo-body"><small>' + esc(t(L.sponsor)) + ' ' + esc(t(CFG.brand)) + '</small>' +
      '<b>' + esc(t(offer.title)) + '</b><span>' + esc(t(offer.text)) + '</span></div>' +
      link(offer, o.surface || 'banner', t(L.book));
    hub.track('promo_view', { game: GAME, offer: offer.id, surface: o.surface || 'banner' });
  }

  // ---------------------------------------------------------------------
  // Bottom ribbon
  // ---------------------------------------------------------------------
  function ribbon() {
    if (opts.ribbon === '0') return;
    try { if (sessionStorage.getItem('tt.ribbon.off')) return; } catch (e) { /* ignore */ }
    setTimeout(function () {
      var offer = nextOffer();
      var bar = document.createElement('div');
      bar.className = 'tt-ribbon';
      bar.setAttribute('role', 'complementary');
      bar.innerHTML =
        '<span aria-hidden="true">' + offer.icon + '</span>' +
        '<p>' + esc(t(L.ribbon)) + ' <b>' + esc(t(CFG.brand)) + '</b> · ' + esc(t(offer.title)) + '</p>' +
        link(offer, 'ribbon', t(L.explore), 'tt-ribbon-cta') +
        '<button type="button" class="tt-ribbon-x" aria-label="' + esc(t(L.close)) + '">×</button>';
      bar.querySelector('.tt-ribbon-x').addEventListener('click', function () {
        bar.remove();
        try { sessionStorage.setItem('tt.ribbon.off', '1'); } catch (e) { /* ignore */ }
      });
      document.body.appendChild(bar);
      requestAnimationFrame(function () { bar.classList.add('show'); });
      hub.track('promo_view', { game: GAME, offer: offer.id, surface: 'ribbon' });
    }, (CFG.ribbonDelaySec || 0) * 1000);
  }

  // ---------------------------------------------------------------------
  // Game-over offer card (frequency-capped)
  // ---------------------------------------------------------------------
  var overs = 0;
  function gameOver(info) {
    info = info || {};
    overs++;
    hub.track('game_over', { game: GAME, score: info.score || 0 });
    // ads.js sets gameOverCard=false while a paid network is on, so the card never covers a paid ad.
    if (CFG.gameOverCard === false) return false;
    if (overs % Math.max(1, CFG.gameOverEvery) !== 0) return false;
    var last = hub.load('promo.lastCard', 0);
    if (Date.now() - last < CFG.gameOverCooldownSec * 1000) return false;
    hub.store('promo.lastCard', Date.now());

    var offer = nextOffer();
    var wrap = document.createElement('div');
    wrap.className = 'tt-promo-modal';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.innerHTML =
      '<div class="tt-promo-card">' +
        '<button type="button" class="tt-promo-x" aria-label="' + esc(t(L.close)) + '">×</button>' +
        '<small>' + esc(t(L.breakT)) + '</small>' +
        '<div class="tt-promo-hero" aria-hidden="true">' + offer.icon + '</div>' +
        '<h3>' + esc(t(offer.title)) + '</h3>' +
        '<p>' + esc(t(offer.text)) + '</p>' +
        link(offer, 'gameover', t(L.book)) +
        '<button type="button" class="tt-promo-later">' + esc(t(L.later)) + '</button>' +
        '<em>' + esc(t(L.sponsor)) + ' ' + esc(t(CFG.brand)) + '</em>' +
      '</div>';
    function close() { wrap.remove(); }
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap || e.target.closest('.tt-promo-x, .tt-promo-later')) close();
    });
    document.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); }
    });
    document.body.appendChild(wrap);
    hub.track('promo_view', { game: GAME, offer: offer.id, surface: 'gameover' });
    return true;
  }

  // Watch a game's own game-over modal (used for CyberBreaker, unchanged code).
  function watch(selector) {
    var el = document.querySelector(selector);
    if (!el) return;
    var visible = !el.hidden;
    new MutationObserver(function () {
      var now = !el.hidden;
      if (now && !visible) setTimeout(gameOver, 900);
      visible = now;
    }).observe(el, { attributes: true, attributeFilter: ['hidden', 'class', 'style'] });
  }

  // Load promo.css once, next to this script, unless the page already links it.
  (function ensureCss() {
    if (document.querySelector('link[href*="promo.css"]')) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = script && script.src ? script.src.replace(/promo\.js(\?.*)?$/, 'promo.css') : '/shared/promo.css';
    document.head.appendChild(l);
  })();

  function boot() {
    if (opts.home === '1') hub.homeButton();
    if (opts.watch) watch(opts.watch);
    if (GAME !== 'hub') ribbon();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.TTPromo = { config: CFG, game: GAME, url: url, banner: banner, gameOver: gameOver, offer: nextOffer };
})();
