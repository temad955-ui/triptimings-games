/* =========================================================================
   Trip Timings Games Hub — reusable ad slots (ads.js)

   Markup (anywhere in a page):
     <div class="ad-slot" data-slot="banner-top"></div>
     <div class="ad-slot" data-slot="banner-bottom" data-fixed="1"></div>
     <div class="ad-slot" data-slot="start"></div>
     <div class="ad-slot" data-slot="gameover"></div>

     data-slot   banner-top | banner-bottom | start | gameover  (network slot key)
     data-size   banner (320×50 → 728×90) | rect (320×100 → 300×250)
                 default: banner for banner-*, rect for the others
     data-fixed  "1" → pinned to the bottom of the screen, hidden during play
     data-when   CSS selector; a paid ad is requested only while it matches

   Load order (after hub.js + promo.js, before the game script):
     <link rel="stylesheet" href="/shared/ads.css" />
     <script src="/shared/ads-config.js"></script>
     <script src="/shared/ads.js" data-playing="…" data-menus="…"></script>

     data-playing  CSS selector that matches while a round is being played
     data-menus    CSS selector of menus/results; while it matches the page
                   is NOT "playing" even if data-playing matches
   While playing, every banner slot is hidden and no new ad is requested,
   so ads never cover the canvas or steal a touch. Games can also call
   TTAds.setPlaying(true|false) directly.

   What a slot shows:
     1. Immediately: a Trip Timings cross-promo (no layout shift, height is
        reserved by ads.css).
     2. If ads-config.js enables a network and the slot has an id there, the
        paid ad is requested once the slot is visible. Filled → it replaces
        the promo. Error / blocked / unfilled / timeout → promo stays.
   ========================================================================= */
(function () {
  'use strict';

  var CFG = Object.assign({
    provider: 'none', adsense: {}, custom: {}, consent: 'google-cmp',
    timeoutMs: 5000, promoCardWithNetworkAds: false,
  }, window.TT_ADS_CONFIG || {});
  CFG.adsense = CFG.adsense || {};
  CFG.custom = CFG.custom || {};

  var script = document.currentScript || document.querySelector('script[src*="/ads.js"]');
  var opts = (script && script.dataset) || {};
  var hub = window.TTHub || { lang: 'ar', t: function (d) { return d && (d.ar || d.en) || ''; }, track: function () {} };

  // Web networks never run inside the Android (Capacitor) app: AdMob handles ads there.
  var isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

  function networkName() {
    if (isNative) return 'none';
    if (CFG.provider === 'adsense') return /^ca-pub-\d{10,}$/.test(CFG.adsense.client || '') ? 'adsense' : 'none';
    if (CFG.provider === 'custom') return 'custom';
    return 'none';
  }
  var NET = networkName();
  var consentGranted = CFG.consent !== 'manual';

  var L = {
    sponsor: { ar: 'برعاية', en: 'Presented by' },
    book:    { ar: 'احجز', en: 'Book' },
    adLabel: { ar: 'إعلان', en: 'Advertisement' },
  };
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---------------------------------------------------------------------
  // Slot setup
  // ---------------------------------------------------------------------
  var slots = [];

  function setup(el) {
    if (el.__ttAd) return;
    var name = el.dataset.slot || 'banner-bottom';
    var size = el.dataset.size || (name.indexOf('banner') === 0 ? 'banner' : 'rect');
    el.__ttAd = { name: name, size: size, tried: false };
    el.classList.add('ad-slot--' + size);
    if (el.dataset.fixed === '1') el.classList.add('ad-slot--fixed');
    el.setAttribute('role', 'complementary');
    el.innerHTML = '<span class="ad-label">' + esc(hub.t(L.adLabel)) + '</span><div class="ad-promo"></div>';
    renderPromo(el);
    slots.push(el);
  }

  // Cross-promo (always rendered first, kept as the fallback)
  function renderPromo(el) {
    var box = el.querySelector('.ad-promo');
    if (!box) return;
    var P = window.TTPromo;
    if (!P) { box.innerHTML = ''; return; }
    var o = P.offer();
    var surface = 'slot-' + el.__ttAd.name;
    var href = P.url(o.path, { content: surface + '-' + o.id });
    var brand = P.config && P.config.brand ? hub.t(P.config.brand) : 'Trip Timings';
    box.innerHTML =
      '<a class="ad-promo-link" href="' + esc(href) + '" target="_blank" rel="noopener sponsored"' +
      ' data-offer="' + esc(o.id) + '" data-surface="' + esc(surface) + '">' +
        '<span class="ad-promo-icon" aria-hidden="true">' + esc(o.icon) + '</span>' +
        '<span class="ad-promo-text">' +
          '<small>' + esc(hub.t(L.sponsor)) + ' ' + esc(brand) + '</small>' +
          '<b>' + esc(hub.t(o.title)) + '</b>' +
          '<span class="ad-promo-sub">' + esc(hub.t(o.text)) + '</span>' +
        '</span>' +
        '<span class="ad-promo-cta">' + esc(hub.t(L.book)) + '</span>' +
      '</a>';
    hub.track('promo_view', { game: P.game || '', offer: o.id, surface: surface });
  }

  // data-when="selector" → only request a paid ad while that selector matches
  // (for games that hide screens with opacity instead of display:none).
  function isVisible(el) {
    if (el.dataset.when) { try { if (!document.querySelector(el.dataset.when)) return false; } catch (e) { return false; } }
    return el.offsetWidth > 0 && el.offsetHeight > 0 && el.getClientRects().length > 0;
  }

  // ---------------------------------------------------------------------
  // Paid networks
  // ---------------------------------------------------------------------
  function slotNetworkCode(name) {
    if (NET === 'adsense') return (CFG.adsense.slots || {})[name] || '';
    if (NET === 'custom') return (CFG.custom.slots || {})[name] || '';
    return '';
  }

  var adsenseLoad = null;
  function loadAdsense() {
    if (adsenseLoad) return adsenseLoad;
    adsenseLoad = new Promise(function (resolve, reject) {
      window.adsbygoogle = window.adsbygoogle || [];
      if (CFG.consent === 'npa') window.adsbygoogle.requestNonPersonalizedAds = 1;
      var s = document.createElement('script');
      s.async = true;
      s.crossOrigin = 'anonymous';
      s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(CFG.adsense.client);
      s.onload = resolve;
      s.onerror = reject;   // ad blocker / offline → promo stays
      document.head.appendChild(s);
    });
    return adsenseLoad;
  }

  // Inserts HTML and runs any <script> inside it (innerHTML alone would not).
  function injectHtml(target, html) {
    target.innerHTML = html;
    Array.prototype.forEach.call(target.querySelectorAll('script'), function (old) {
      var s = document.createElement('script');
      Array.prototype.forEach.call(old.attributes, function (a) { s.setAttribute(a.name, a.value); });
      s.text = old.text;
      old.parentNode.replaceChild(s, old);
    });
  }

  function tryNetwork(el) {
    var meta = el.__ttAd;
    if (meta.tried) return;
    var code = slotNetworkCode(meta.name);
    if (NET === 'none' || !code || !consentGranted) return;
    meta.tried = true;
    el.dataset.adState = 'loading';

    var net = document.createElement('div');
    net.className = 'ad-net';
    el.appendChild(net);

    var done = false, timer = null, poll = null;
    function finish(ok) {
      if (done) return;
      done = true;
      clearTimeout(timer); clearInterval(poll);
      if (ok) {
        el.classList.add('is-filled');
        el.dataset.adState = 'filled';
        hub.track('ad_filled', { slot: meta.name, network: NET });
      } else {
        net.remove();
        el.dataset.adState = 'fallback';
        hub.track('ad_fallback', { slot: meta.name, network: NET });
      }
    }
    timer = setTimeout(function () { finish(false); }, Math.max(1500, CFG.timeoutMs || 5000));

    if (NET === 'adsense') {
      loadAdsense().then(function () {
        if (done) return;
        var ins = document.createElement('ins');
        ins.className = 'adsbygoogle';
        ins.style.display = 'inline-block';
        ins.style.width = Math.min(el.clientWidth, meta.size === 'banner' ? 728 : 336) + 'px';
        ins.style.height = el.clientHeight + 'px';
        ins.setAttribute('data-ad-client', CFG.adsense.client);
        ins.setAttribute('data-ad-slot', String(code));
        if (CFG.adsense.testMode) ins.setAttribute('data-adtest', 'on');
        net.appendChild(ins);
        try { window.adsbygoogle.push({}); } catch (e) { finish(false); return; }
        poll = setInterval(function () {
          var st = ins.getAttribute('data-ad-status');
          if (st === 'filled') finish(true);
          else if (st === 'unfilled') finish(false);
        }, 300);
      }, function () { finish(false); });
    } else {
      // custom network: string snippet or function(container)
      try {
        if (typeof code === 'function') code(net, meta.name);
        else injectHtml(net, String(code));
      } catch (e) { finish(false); return; }
      poll = setInterval(function () {
        var media = net.querySelector('iframe, img, ins, video, canvas');
        if (media && media.offsetHeight >= 20) finish(true);
      }, 300);
    }
  }

  // ---------------------------------------------------------------------
  // Play state: banners off while a round is running
  // ---------------------------------------------------------------------
  var manualPlaying = null;
  function isPlaying() {
    if (manualPlaying !== null) return manualPlaying;
    if (!opts.playing) return false;
    try {
      if (!document.querySelector(opts.playing)) return false;
      if (opts.menus && document.querySelector(opts.menus)) return false;
    } catch (e) { return false; }
    return true;
  }

  var queued = false;
  function update() {
    queued = false;
    var playing = isPlaying();
    var root = document.documentElement;
    root.classList.toggle('tt-ads-playing', playing);
    var fixedShown = false;
    for (var i = 0; i < slots.length; i++) {
      var el = slots[i];
      if (!el.isConnected) continue;
      if (el.classList.contains('ad-slot--fixed') && !playing) fixedShown = true;
      if (!playing && !el.__ttAd.tried && isVisible(el)) tryNetwork(el);
    }
    root.classList.toggle('tt-ads-fixed-on', fixedShown);
  }
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  }

  function scan() {
    Array.prototype.forEach.call(document.querySelectorAll('.ad-slot'), setup);
    schedule();
  }

  // ---------------------------------------------------------------------
  // Integration with promo.js
  // ---------------------------------------------------------------------
  function hookPromo() {
    var P = window.TTPromo;
    if (!P || P.__ttAdsHooked) return;
    P.__ttAdsHooked = true;
    // Games call TTPromo.banner(el) after each round; when el is an ad slot,
    // rotate the promo instead of overwriting a paid ad.
    var orig = P.banner;
    P.banner = function (el) {
      if (el && el.classList && el.classList.contains('ad-slot')) { refresh(el); return; }
      return orig.apply(this, arguments);
    };
    if (NET !== 'none' && !CFG.promoCardWithNetworkAds && P.config) P.config.gameOverCard = false;
  }

  function refresh(el) {
    if (!el.__ttAd) setup(el);
    if (!el.classList.contains('is-filled')) renderPromo(el);
    schedule();
  }

  function boot() {
    hookPromo();
    scan();
    new MutationObserver(schedule).observe(document.body, {
      attributes: true, subtree: true, childList: true, attributeFilter: ['class', 'hidden', 'style'],
    });
    window.addEventListener('resize', schedule);
    document.addEventListener('tt:lang', function () {
      slots.forEach(function (el) {
        var lab = el.querySelector('.ad-label');
        if (lab) lab.textContent = hub.t(L.adLabel);
        if (!el.classList.contains('is-filled')) renderPromo(el);
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.TTAds = {
    config: CFG,
    network: NET,
    refresh: function (el) { if (el) refresh(el); else scan(); },
    setPlaying: function (v) { manualPlaying = v == null ? null : !!v; schedule(); },
    grantConsent: function () { consentGranted = true; schedule(); },
    revokeConsent: function () { consentGranted = false; },
  };
})();
