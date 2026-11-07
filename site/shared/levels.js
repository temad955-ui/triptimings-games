/* =========================================================================
   Trip Timings Games Hub — level kit (levels.js)
   The screens every level-based puzzle shares: start panel ("play level N"),
   level-complete panel with ⭐ reward, next level, share-for-stars, the saved
   level number and a toast. Load after hub.js + economy.js (+ arcade.css).

   const L = TTLevels.create({
     id: 'sand-sort',
     str: { ar: {...}, en: {...} },   // game strings; merged over the defaults below
     onLevel(n) {},                    // build and show level n (1-based)
     reward(n) → stars,                // ⭐ paid when level n is cleared (default 5 + n/2)
   });
   L.T(key, vars)  L.level  L.win()  L.restart()  L.toast(text)  L.fitCanvas(cv, w, h)
   L.easy          true on the first levels, where boosters are free with a rewarded ad
   L.fail(text, revive)  out of moves/hearts: retry, or revive (rewarded ad on easy levels, ⭐ later)
   L.booster(name, cost, fn)  run fn after a rewarded ad (easy levels) or for cost ⭐

   Markup: #startPanel #startBtn, #winPanel #winTitle #winStars #nextBtn #winShare,
   #failPanel #failText #reviveBtn #retryBtn,
   #level #best, [data-t] labels, optional #toast.
   ========================================================================= */
(function () {
  'use strict';
  var hub = window.TTHub, eco = window.TTEco;
  var $ = function (s) { return document.querySelector(s); };
  var EASY = 10; // levels where boosters cost an ad instead of ⭐

  var BASE = {
    ar: { level: 'المستوى', best: 'أعلى مستوى', playN: 'العب المستوى {n}', next: 'المستوى التالي ▶', clear: 'المستوى {n} ✓ ممتاز!',
      stars: '+{n} ⭐ في محفظتك', share: '📤 تحدَّ أصحابك +⭐', shareText: 'وصلت للمستوى {n} في {g}! تقدر توصل أبعد؟',
      restart: 'إعادة', retry: 'حاول تاني', revive: 'كمّل', fail: 'خلصت المحاولات', noCoins: 'نقاطك ⭐ مش كفاية', adFor: 'شاهد الإعلان لتحصل على: {x}' },
    en: { level: 'Level', best: 'Top level', playN: 'Play level {n}', next: 'Next level ▶', clear: 'Level {n} ✓ Great!',
      stars: '+{n} ⭐ added to your wallet', share: '📤 Challenge friends +⭐', shareText: 'I reached level {n} in {g}! Can you go further?',
      restart: 'Restart', retry: 'Try again', revive: 'Continue', fail: 'Out of moves', noCoins: 'Not enough ⭐', adFor: 'Watch the ad to get: {x}' },
  };

  function create(o) {
    var STR = { ar: Object.assign({}, BASE.ar, o.str.ar), en: Object.assign({}, BASE.en, o.str.en) };
    var T = function (k, v) { var s = (STR[hub.lang] || STR.en)[k]; if (s == null) s = k; for (var x in v || {}) s = s.split('{' + x + '}').join(v[x]); return s; };
    var key = 'level.' + o.id;
    var level = Math.max(1, Number(hub.load(key, 1)) || 1);
    var toastTimer = 0, done = false;

    function labels() {
      document.querySelectorAll('[data-t]').forEach(function (el) { el.textContent = T(el.dataset.t); });
      document.title = T('title') + ' · Trip Timings Games';
      $('#startBtn').textContent = T('playN', { n: level });
      $('#level').textContent = level;
      $('#best').textContent = hub.getBest(o.id);
      $('#nextBtn').textContent = T('next');
    }
    labels();
    document.addEventListener('tt:lang', labels);

    function play() {
      done = false;
      $('#startPanel').hidden = true; $('#winPanel').hidden = true;
      document.body.classList.add('playing');
      $('#level').textContent = level;
      hub.track('level_start', { game: o.id, level: level });
      o.onLevel(level);
    }
    $('#startBtn').addEventListener('click', play);
    $('#nextBtn').addEventListener('click', play);
    $('#winShare').addEventListener('click', function () {
      if (eco) eco.share({ game: o.id, text: T('shareText', { n: level - 1, g: T('title') }) });
    });

    function win() {
      if (done) return; done = true;
      var cleared = level;
      hub.setBest(o.id, cleared);
      level = cleared + 1; hub.store(key, level);
      var n = Math.max(0, Math.floor(o.reward ? o.reward(cleared) : 5 + cleared / 2));
      if (n && eco) eco.add(n, o.id);
      document.body.classList.remove('playing');
      $('#winTitle').textContent = T('clear', { n: cleared });
      $('#winStars').textContent = n ? T('stars', { n: n }) : '';
      $('#best').textContent = hub.getBest(o.id);
      if (navigator.vibrate) try { navigator.vibrate([20, 40, 20]); } catch (e) { /* ignore */ }
      hub.track('level_clear', { game: o.id, level: cleared });
      setTimeout(function () {
        $('#winPanel').hidden = false;
        if (window.TTAds && TTAds.refresh) TTAds.refresh($('#winPanel .ad-slot'));
      }, 550);
    }

    var reviveFn = null, REVIVE_COST = 40;
    function fail(text, revive) {
      if (done) return;
      reviveFn = revive || null;
      document.body.classList.remove('playing');
      $('#failText').textContent = text || T('fail');
      $('#reviveBtn').hidden = !reviveFn;
      $('#reviveBtn').textContent = boosterLabel('revive', REVIVE_COST);
      hub.track('level_fail', { game: o.id, level: level });
      setTimeout(function () { $('#failPanel').hidden = false; }, 400);
    }
    $('#retryBtn').addEventListener('click', function () { $('#failPanel').hidden = true; play(); });
    $('#reviveBtn').addEventListener('click', function () {
      var f = reviveFn; if (!f) return;
      booster('revive', REVIVE_COST, function () { reviveFn = null; $('#failPanel').hidden = true; document.body.classList.add('playing'); f(); });
    });

    function toast(text) {
      var el = $('#toast');
      if (!el) { if (eco) eco.toast(text); return; }
      el.textContent = text; el.classList.add('show');
      clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.classList.remove('show'); }, 1600);
    }

    // Booster: free with a rewarded ad on the easy levels, ⭐ after that.
    function booster(name, cost, fn) {
      if (!eco) return fn();
      if (level <= EASY) {
        return eco.rewarded({ id: o.id + '-' + name, title: T('adFor', { x: T(name) }) }).then(function (ok) {
          if (ok) { hub.track('booster', { game: o.id, id: name }); fn(); }
        });
      }
      if (eco.spend(cost, o.id + '-' + name)) { hub.track('booster', { game: o.id, id: name }); fn(); }
      else eco.toast(T('noCoins'));
    }
    function boosterLabel(name, cost) { return (level <= EASY ? '🎬 ' + T(name) : T(name) + ' (' + cost + '⭐)'); }

    function fitCanvas(cv, w, h) {
      var box = cv.parentElement.getBoundingClientRect();
      var s = Math.min(box.width / w, box.height / h);
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.style.width = Math.floor(w * s) + 'px'; cv.style.height = Math.floor(h * s) + 'px';
      cv.width = Math.round(w * s * dpr); cv.height = Math.round(h * s * dpr);
      cv.getContext('2d').setTransform(s * dpr, 0, 0, s * dpr, 0, 0);
      return s;
    }

    return {
      T: T, win: win, fail: fail, toast: toast, fitCanvas: fitCanvas, booster: booster, boosterLabel: boosterLabel,
      restart: function () { if (!done) o.onLevel(level); },
      get level() { return level; },
      get easy() { return level <= EASY; },
      get done() { return done; },
    };
  }

  window.TTLevels = { create: create };
})();
