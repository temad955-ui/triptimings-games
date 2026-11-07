/* =========================================================================
   Trip Timings Games Hub — arcade kit (arcade.js)
   The screens every hyper-casual game shares: start panel, game-over panel,
   best score, stars for the shared wallet, one rewarded "continue" per run,
   share-for-stars, toast and canvas sizing. Load after hub.js + economy.js.

   const A = TTArcade.create({
     id: 'neon-stack',
     str: { ar: {...}, en: {...} },    // game strings; merged over the defaults below
     onStart() {},                      // start a new run
     starsFor(score) → n,               // ⭐ paid into the wallet at game over
     canContinue(score) → bool,         // rewarded continue offered (once per run)
     onContinue() {},                   // resume after the ad
   });
   A.T(key, vars)   A.setScore(n)   A.gameOver(score)   A.toast(text)
   A.fitCanvas(canvas, w, h) → scale  (keeps a w×h logical canvas sharp and centred)

   Markup expected (see any game's index.html): #startPanel #startBtn,
   #overPanel #overTitle #overScore #overBest #continueBtn #againBtn #shareBtn,
   #score #best, [data-t] labels.
   ========================================================================= */
(function () {
  'use strict';
  var hub = window.TTHub, eco = window.TTEco;
  var $ = function (s) { return document.querySelector(s); };

  var BASE = {
    ar: { score: 'النقاط', best: 'الأفضل', level: 'المستوى', play: 'ابدأ اللعب', again: 'العب مرة أخرى', over: 'انتهت اللعبة',
      newBest: 'رقم قياسي جديد! 🎉', bestIs: 'أفضل نتيجة: {n}', cont: '🎬 كمّل من مكانك', contAd: 'شاهد الإعلان لتكمل من نفس النقطة',
      share: '📤 تحدَّ أصحابك +⭐', shareText: 'جبت {s} نقطة في {g}! تقدر تغلبني؟', stars: '+{n} ⭐ في محفظتك' },
    en: { score: 'Score', best: 'Best', level: 'Level', play: 'Play', again: 'Play again', over: 'Game over',
      newBest: 'New record! 🎉', bestIs: 'Best: {n}', cont: '🎬 Continue', contAd: 'Watch the ad to continue where you left off',
      share: '📤 Challenge friends +⭐', shareText: 'I scored {s} in {g}! Can you beat me?', stars: '+{n} ⭐ added to your wallet' },
  };

  function create(o) {
    var STR = { ar: Object.assign({}, BASE.ar, o.str.ar), en: Object.assign({}, BASE.en, o.str.en) };
    var T = function (k, v) { var s = (STR[hub.lang] || STR.en)[k]; if (s == null) s = k; for (var x in v || {}) s = s.split('{' + x + '}').join(v[x]); return s; };
    var continued = false, last = 0, toastTimer = 0;

    function labels() {
      document.querySelectorAll('[data-t]').forEach(function (el) { el.textContent = T(el.dataset.t); });
      document.title = T('title') + ' · Trip Timings Games';
      $('#best').textContent = hub.getBest(o.id);
    }
    labels();
    document.addEventListener('tt:lang', labels);

    function start() {
      continued = false;
      $('#startPanel').hidden = true; $('#overPanel').hidden = true;
      document.body.classList.add('playing');
      hub.track('game_start', { game: o.id });
      o.onStart();
    }
    $('#startBtn').addEventListener('click', start);
    $('#againBtn').addEventListener('click', start);

    $('#continueBtn').addEventListener('click', function () {
      if (continued || !eco) return;
      eco.rewarded({ id: o.id + '-continue', title: T('contAd') }).then(function (ok) {
        if (!ok) return;
        continued = true;
        $('#overPanel').hidden = true;
        document.body.classList.add('playing');
        hub.track('continue', { game: o.id });
        o.onContinue();
      });
    });
    $('#shareBtn').addEventListener('click', function () {
      if (eco) eco.share({ game: o.id, text: T('shareText', { s: last, g: T('title') }) });
    });

    function gameOver(score) {
      last = Math.floor(score);
      document.body.classList.remove('playing');
      var record = hub.setBest(o.id, last);
      $('#best').textContent = hub.getBest(o.id);
      $('#overScore').textContent = last.toLocaleString('en');
      $('#overBest').textContent = record && last > 0 ? T('newBest') : T('bestIs', { n: hub.getBest(o.id).toLocaleString('en') });
      $('#overBest').className = record && last > 0 ? 'new-best' : '';
      var canCont = !continued && !!eco && !!o.canContinue && o.canContinue(last);
      $('#continueBtn').hidden = !canCont;
      $('#continueBtn').textContent = T('cont');
      $('#overPanel').hidden = false;
      hub.track('game_over', { game: o.id, score: last });
      // stars are paid when the run really ends: now if no continue is offered,
      // otherwise when the player starts again or leaves
      pay = function () {
        var n = Math.max(0, Math.floor(o.starsFor ? o.starsFor(last) : 0));
        pay = null;
        if (n && eco) { eco.add(n, o.id); toast(T('stars', { n: n })); }
      };
      if (!canCont) pay();
      if (window.TTPromo) TTPromo.gameOver({ score: last });
      if (window.TTAds && TTAds.refresh) TTAds.refresh($('#overPanel .ad-slot'));
    }
    var pay = null;
    var flush = function () { if (pay) pay(); };
    $('#againBtn').addEventListener('click', flush, true);
    window.addEventListener('pagehide', flush);

    function toast(text) {
      var el = $('#toast');
      if (!el) { if (eco) eco.toast(text); return; }
      el.textContent = text; el.classList.add('show');
      clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.classList.remove('show'); }, 1600);
    }

    function setScore(n) { $('#score').textContent = Math.floor(n).toLocaleString('en'); }

    // Canvas with a fixed logical size (w×h), scaled to fit its wrapper and kept sharp.
    function fitCanvas(cv, w, h) {
      var box = cv.parentElement.getBoundingClientRect();
      var s = Math.min(box.width / w, box.height / h);
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.style.width = Math.floor(w * s) + 'px'; cv.style.height = Math.floor(h * s) + 'px';
      cv.width = Math.round(w * s * dpr); cv.height = Math.round(h * s * dpr);
      var ctx = cv.getContext('2d');
      ctx.setTransform(s * dpr, 0, 0, s * dpr, 0, 0);
      return s;
    }

    return { T: T, setScore: setScore, gameOver: gameOver, toast: toast, fitCanvas: fitCanvas, start: start, get continued() { return continued; } };
  }

  window.TTArcade = { create: create };
})();
