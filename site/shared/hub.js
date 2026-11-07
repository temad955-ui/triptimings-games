/* =========================================================================
   Trip Timings Games Hub — shared runtime (hub.js)
   Loaded by the lobby and by every game BEFORE promo.js.

   window.TTHub
     .lang            'ar' | 'en'   system language by default; toggle saved in 'tt.lang'
     .setLang(l)
     .t(dict)         pick dict[lang] (falls back to dict.en / dict.ar)
     .getBest(id)     best score of a game
     .setBest(id, n)  stores n if higher, returns true when it is a new record
     .store(key, val) / .load(key, fallback)  fault-tolerant localStorage JSON
     .today()         'YYYY-MM-DD' in the visitor's local time
     .track(event, data)  sends to window.dataLayer / gtag if present
     .homeButton()    injects the floating "back to games" button
   ========================================================================= */
(function () {
  'use strict';
  var NS = 'tt.';
  // Site root, derived from this script's URL (works at / and under a sub-path like GitHub Pages).
  var me = document.currentScript || document.querySelector('script[src*="hub.js"]');
  var ROOT = me && me.src ? new URL('../', me.src).href : '/';

  function load(key, fallback) {
    try {
      var raw = localStorage.getItem(NS + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  }
  function store(key, val) {
    try { localStorage.setItem(NS + key, JSON.stringify(val)); } catch (e) { /* private mode */ }
  }

  // Language follows the phone/browser system language: Arabic for any Arabic
  // locale, English for everyone else (global audience). ?lang=ar|en forces one
  // (used by store links), and the in-app toggle is remembered.
  function systemLang() {
    var list = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en']);
    for (var i = 0; i < list.length; i++) {
      var l = String(list[i] || '').slice(0, 2).toLowerCase();
      if (l === 'ar') return 'ar';
      if (l === 'en') return 'en';
    }
    return 'en';
  }
  var forced = null;
  try { forced = new URL(location.href).searchParams.get('lang'); } catch (e) { /* old browser */ }
  if (forced !== 'ar' && forced !== 'en') forced = null;
  var saved = load('lang', null);
  var lang = forced || saved || systemLang();

  function applyLang() {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }
  applyLang();

  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function track(event, data) {
    var payload = Object.assign({ event: 'tt_' + event }, data || {});
    try {
      if (window.dataLayer && window.dataLayer.push) window.dataLayer.push(payload);
      if (typeof window.gtag === 'function') window.gtag('event', 'tt_' + event, data || {});
    } catch (e) { /* analytics must never break a game */ }
  }

  var hub = {
    get lang() { return lang; },
    setLang: function (l) {
      lang = l === 'en' ? 'en' : 'ar';
      store('lang', lang);
      applyLang();
      document.dispatchEvent(new CustomEvent('tt:lang', { detail: lang }));
    },
    t: function (dict) {
      if (!dict) return '';
      return dict[lang] != null ? dict[lang] : (dict.en != null ? dict.en : dict.ar);
    },
    getBest: function (id) { return Number(load('best.' + id, 0)) || 0; },
    setBest: function (id, n) {
      n = Math.floor(Number(n) || 0);
      if (n > hub.getBest(id)) { store('best.' + id, n); return true; }
      return false;
    },
    root: ROOT,
    load: load,
    store: store,
    today: today,
    track: track,
    homeButton: function () {
      if (document.querySelector('.tt-home')) return;
      var a = document.createElement('a');
      a.className = 'tt-home';
      a.href = ROOT;
      a.setAttribute('aria-label', lang === 'ar' ? 'كل الألعاب' : 'All games');
      a.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5M5.5 9.8V20h4.8v-5.5h3.4V20h4.8V9.8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      document.body.appendChild(a);
    },
  };

  window.TTHub = hub;
})();
