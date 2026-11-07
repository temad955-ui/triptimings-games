/* =========================================================================
   Trip Timings Games Hub — shared economy (economy.js)
   Loaded after hub.js on the lobby and on every game that rewards the player.

   window.TTEco
     Wallet (one currency, "⭐ points", shared by every game and the wheel)
       .coins()                  current balance
       .add(n, reason)           credit n points, fires 'tt:coins'
       .spend(n, reason)         debit if affordable → true / false
     Inventory (boosters, unlocked sets)
       .count(id) / .give(id, n) / .use(id) → bool
       .owns(id) / .unlock(id)
     Monetisation (simulated on the web, real in the Android app)
       .rewarded({ title })      → Promise<boolean>  rewarded-video ad
       .purchase({ sku, title, price }) → Promise<boolean>  in-app purchase
     Viral loop
       .refCode()                this player's invite code
       .inviteLink(game)         share URL carrying ?ref=CODE
       .share({ game, text })    native share sheet / copy link, rewards the sharer
       .openInvite(game)         invite panel (code, progress, rewards)
     UI
       .toast(text)
       .chip(el)                 keeps a live "⭐ 120" balance inside el

   Native hooks (Capacitor app): if the app defines
     window.TTNative.showRewarded()          → Promise<boolean>
     window.TTNative.purchase(sku)           → Promise<boolean>
   they are used instead of the web simulation. Nothing else changes.

   ⚠️ COMMERCIAL NOTE: everything here lives in the visitor's browser
   (localStorage). Real purchases must be verified by Google Play Billing on
   a server, and invite rewards for the INVITER need a backend that counts
   installs/visits per code. The web version credits the sharer per share
   (daily-capped) and credits the invited friend on their first visit.
   ========================================================================= */
(function () {
  'use strict';
  var hub = window.TTHub;
  if (!hub) return;

  var CFG = {
    shareReward: 30,        // points per share…
    shareDailyCap: 3,       // …at most this many rewarded shares per day
    welcomeBonus: 100,      // for a friend who opens an invite link
    friendSetShares: 3,     // total shares that unlock the "Friendship" domino set
    adSeconds: 5,           // length of the simulated rewarded video
  };

  // ---------------------------------------------------------------- state
  var W = hub.load('wallet', null);
  if (!W) {
    // first run: carry over points already won on the Daily Wheel
    var wheel = hub.load('wheel', {});
    W = { coins: Number(wheel.coins) || 0, inv: {}, own: {}, shares: 0, shareDay: '', shareToday: 0, ref: '', invitedBy: '' };
  }
  W.inv = W.inv || {}; W.own = W.own || {};
  function save() { hub.store('wallet', W); }
  // another tab changed the wallet → reload it
  window.addEventListener('storage', function (e) {
    if (e.key === 'tt.wallet' && e.newValue) {
      try { W = JSON.parse(e.newValue); W.inv = W.inv || {}; W.own = W.own || {}; fire(); } catch (err) { /* ignore */ }
    }
  });

  function fire() { document.dispatchEvent(new CustomEvent('tt:coins', { detail: W.coins })); }

  var L = {
    ad:        { ar: 'إعلان مكافأة', en: 'Rewarded ad' },
    adSim:     { ar: 'محاكاة فيديو إعلاني · في تطبيق أندرويد يظهر إعلان AdMob حقيقي', en: 'Simulated video ad · the Android app shows a real AdMob ad' },
    adWait:    { ar: 'المكافأة بعد {n} ث', en: 'Reward in {n}s' },
    adClaim:   { ar: 'احصل على المكافأة', en: 'Claim reward' },
    adSkip:    { ar: 'تخطي (بدون مكافأة)', en: 'Skip (no reward)' },
    buyTitle:  { ar: 'تأكيد الشراء', en: 'Confirm purchase' },
    buySim:    { ar: 'محاكاة شراء داخل التطبيق · لن يتم خصم أي مبلغ. في تطبيق أندرويد تتم العملية عبر Google Play.', en: 'Simulated in-app purchase · nothing is charged. In the Android app this goes through Google Play.' },
    buy:       { ar: 'شراء', en: 'Buy' },
    cancel:    { ar: 'إلغاء', en: 'Cancel' },
    bought:    { ar: 'تم الشراء ✓', en: 'Purchased ✓' },
    invite:    { ar: 'ادعُ أصدقاءك', en: 'Invite friends' },
    inviteTxt: { ar: 'شارك الرابط واربح {r} ⭐ عن كل مشاركة (حتى {c} يوميًا). صديقك يحصل على {w} ⭐ هدية ترحيب أول ما يفتح الرابط.', en: 'Share your link and earn {r} ⭐ per share (up to {c} a day). Your friend gets a {w} ⭐ welcome gift when they open it.' },
    yourCode:  { ar: 'كود الدعوة الخاص بك', en: 'Your invite code' },
    shareNow:  { ar: 'شارك الآن', en: 'Share now' },
    progress:  { ar: 'مشاركاتك: {n} · اليوم: {t}/{c}', en: 'Your shares: {n} · today: {t}/{c}' },
    friendSet: { ar: 'شارك {n} مرات لتفتح طقم دومينو «الصداقة» مجانًا', en: 'Share {n} times to unlock the free “Friendship” domino set' },
    friendOk:  { ar: 'طقم «الصداقة» مفتوح لك ✓', en: '“Friendship” set unlocked ✓' },
    close:     { ar: 'إغلاق', en: 'Close' },
    shared:    { ar: '+{n} ⭐ شكرًا على المشاركة!', en: '+{n} ⭐ thanks for sharing!' },
    sharedCap: { ar: 'شكرًا! وصلت لحد مكافآت المشاركة اليوم', en: 'Thanks! You reached today’s share-reward limit' },
    copied:    { ar: 'تم نسخ رابط الدعوة', en: 'Invite link copied' },
    welcome:   { ar: '🎁 هدية ترحيب من صديقك: +{n} ⭐', en: '🎁 Welcome gift from your friend: +{n} ⭐' },
    shareMsg:  { ar: 'العب معايا ألعاب تريب تايمنجز المجانية واحصل على {w} ⭐ هدية:', en: 'Play Trip Timings Games with me for free and get a {w} ⭐ gift:' },
    unlockFS:  { ar: '🤝 فتحت طقم «الصداقة»!', en: '🤝 You unlocked the “Friendship” set!' },
  };
  var tx = function (k, v) { var s = hub.t(L[k]); for (var x in v || {}) s = s.split('{' + x + '}').join(v[x]); return s; };

  // ------------------------------------------------------------- wallet
  var eco = {
    config: CFG,
    coins: function () { return W.coins; },
    add: function (n, reason) {
      n = Math.max(0, Math.floor(n || 0)); if (!n) return W.coins;
      W.coins += n; save(); fire();
      hub.track('coins_earn', { amount: n, reason: reason || '' });
      return W.coins;
    },
    spend: function (n, reason) {
      n = Math.max(0, Math.floor(n || 0));
      if (W.coins < n) return false;
      W.coins -= n; save(); fire();
      hub.track('coins_spend', { amount: n, reason: reason || '' });
      return true;
    },
    count: function (id) { return W.inv[id] || 0; },
    give: function (id, n) { W.inv[id] = (W.inv[id] || 0) + (n == null ? 1 : n); save(); fire(); },
    use: function (id) { if (!W.inv[id]) return false; W.inv[id]--; save(); fire(); return true; },
    owns: function (id) { return !!W.own[id]; },
    unlock: function (id) { if (!W.own[id]) { W.own[id] = hub.today(); save(); fire(); } },
  };

  // ------------------------------------------------------------- UI bits
  var css = document.querySelector('link[href*="economy.css"]');
  if (!css) {
    css = document.createElement('link'); css.rel = 'stylesheet';
    var me = document.currentScript || document.querySelector('script[src*="economy.js"]');
    css.href = me && me.src ? new URL('economy.css', me.src).href : hub.root + 'shared/economy.css';
    document.head.appendChild(css);
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  var toastEl, toastTimer;
  eco.toast = function (text) {
    if (!toastEl) { toastEl = el('div', 'tt-eco-toast'); toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.textContent = text; toastEl.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2600);
  };

  eco.chip = function (target) {
    if (!target) return;
    target.classList.add('tt-coin-chip');
    function draw() { target.textContent = '⭐ ' + W.coins.toLocaleString('en'); }
    draw();
    document.addEventListener('tt:coins', draw);
  };

  function modal(build) {
    var wrap = el('div', 'tt-eco-modal'); wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-modal', 'true');
    var box = el('div', 'tt-eco-box'); wrap.appendChild(box);
    document.body.appendChild(wrap);
    build(box, function close() { wrap.remove(); });
    var first = box.querySelector('button'); if (first) first.focus();
    return wrap;
  }

  // ------------------------------------------------------- rewarded ads
  eco.rewarded = function (o) {
    o = o || {};
    hub.track('rewarded_request', { reward: o.id || '' });
    if (window.TTNative && typeof window.TTNative.showRewarded === 'function') {
      return Promise.resolve(window.TTNative.showRewarded(o.id)).then(function (ok) {
        hub.track(ok ? 'rewarded_complete' : 'rewarded_skip', { reward: o.id || '' }); return !!ok;
      }).catch(function () { return false; });
    }
    return new Promise(function (resolve) {
      modal(function (box, close) {
        var left = CFG.adSeconds, done = false;
        box.classList.add('ad');
        box.appendChild(el('small', 'tt-eco-tag', tx('ad')));
        box.appendChild(el('h3', null, o.title || ''));
        var screen = el('div', 'tt-eco-adscreen');
        screen.innerHTML = '<div class="tt-eco-adlogo">▲</div><b>Trip Timings</b><span></span>';
        screen.querySelector('span').textContent = hub.t({ ar: 'رحلات النيل · الأهرامات · البحر الأحمر', en: 'Nile cruises · Pyramids · Red Sea' });
        box.appendChild(screen);
        var bar = el('div', 'tt-eco-bar'); var fill = el('i'); bar.appendChild(fill); box.appendChild(bar);
        box.appendChild(el('p', 'tt-eco-note', tx('adSim')));
        var claim = el('button', 'tt-eco-btn', tx('adWait', { n: left })); claim.disabled = true;
        var skip = el('button', 'tt-eco-btn ghost', tx('adSkip'));
        box.appendChild(claim); box.appendChild(skip);
        var t0 = performance.now();
        (function tick() {
          if (done) return;
          var p = Math.min(1, (performance.now() - t0) / (CFG.adSeconds * 1000));
          fill.style.transform = 'scaleX(' + p + ')';
          var n = Math.ceil(CFG.adSeconds * (1 - p));
          if (p < 1) { claim.textContent = tx('adWait', { n: n }); requestAnimationFrame(tick); }
          else { claim.disabled = false; claim.textContent = tx('adClaim'); claim.focus(); }
        })();
        claim.onclick = function () { done = true; close(); hub.track('rewarded_complete', { reward: o.id || '' }); resolve(true); };
        skip.onclick = function () { done = true; close(); hub.track('rewarded_skip', { reward: o.id || '' }); resolve(false); };
      });
    });
  };

  // ------------------------------------------------------ in-app purchase
  eco.purchase = function (o) {
    o = o || {};
    hub.track('iap_request', { sku: o.sku });
    var finish = function (ok) {
      if (ok) { eco.unlock(o.sku); hub.track('iap_complete', { sku: o.sku }); eco.toast(tx('bought')); }
      return !!ok;
    };
    if (window.TTNative && typeof window.TTNative.purchase === 'function') {
      return Promise.resolve(window.TTNative.purchase(o.sku)).then(finish).catch(function () { return false; });
    }
    return new Promise(function (resolve) {
      modal(function (box, close) {
        box.appendChild(el('small', 'tt-eco-tag', 'Google Play'));
        box.appendChild(el('h3', null, tx('buyTitle')));
        var row = el('div', 'tt-eco-buyrow');
        row.appendChild(el('b', null, o.title || o.sku));
        row.appendChild(el('span', 'price', o.price || ''));
        box.appendChild(row);
        box.appendChild(el('p', 'tt-eco-note', tx('buySim')));
        var ok = el('button', 'tt-eco-btn', tx('buy') + ' · ' + (o.price || ''));
        var no = el('button', 'tt-eco-btn ghost', tx('cancel'));
        box.appendChild(ok); box.appendChild(no);
        ok.onclick = function () { close(); resolve(finish(true)); };
        no.onclick = function () { close(); hub.track('iap_cancel', { sku: o.sku }); resolve(false); };
      });
    });
  };

  // ---------------------------------------------------------- referrals
  function makeCode() {
    var abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = 'TT';
    for (var i = 0; i < 6; i++) s += abc[Math.floor(Math.random() * abc.length)];
    return s;
  }
  if (!W.ref) { W.ref = makeCode(); save(); }
  eco.refCode = function () { return W.ref; };
  eco.inviteLink = function (game) {
    var u = new URL(game ? 'games/' + game + '/' : './', hub.root);
    u.searchParams.set('ref', W.ref);
    u.searchParams.set('utm_source', 'invite');
    u.searchParams.set('utm_medium', 'referral');
    if (game) u.searchParams.set('utm_campaign', game);
    return u.toString();
  };

  function rewardShare(game) {
    var day = hub.today();
    if (W.shareDay !== day) { W.shareDay = day; W.shareToday = 0; }
    W.shares = (W.shares || 0) + 1;
    var paid = W.shareToday < CFG.shareDailyCap;
    if (paid) { W.shareToday++; W.coins += CFG.shareReward; }
    var unlocked = false;
    if (W.shares >= CFG.friendSetShares && !W.own['set-friend']) { W.own['set-friend'] = day; unlocked = true; }
    save(); fire();
    hub.track('share', { game: game || 'hub', rewarded: paid ? 1 : 0 });
    eco.toast(unlocked ? tx('unlockFS') : paid ? tx('shared', { n: CFG.shareReward }) : tx('sharedCap'));
  }

  eco.share = function (o) {
    o = o || {};
    var link = eco.inviteLink(o.game);
    var text = (o.text ? o.text + ' ' : '') + tx('shareMsg', { w: CFG.welcomeBonus });
    if (navigator.share) {
      return navigator.share({ title: 'Trip Timings Games', text: text, url: link })
        .then(function () { rewardShare(o.game); return true; })
        .catch(function () { return false; }); // cancelled
    }
    var copy = navigator.clipboard && navigator.clipboard.writeText
      ? navigator.clipboard.writeText(text + ' ' + link)
      : Promise.reject(new Error('no clipboard'));
    return copy.then(function () { eco.toast(tx('copied')); rewardShare(o.game); return true; })
      .catch(function () { window.prompt(tx('copied'), link); rewardShare(o.game); return true; });
  };

  eco.openInvite = function (game) {
    modal(function (box, close) {
      box.appendChild(el('small', 'tt-eco-tag', '🤝'));
      box.appendChild(el('h3', null, tx('invite')));
      box.appendChild(el('p', null, tx('inviteTxt', { r: CFG.shareReward, c: CFG.shareDailyCap, w: CFG.welcomeBonus })));
      box.appendChild(el('small', 'tt-eco-lbl', tx('yourCode')));
      box.appendChild(el('div', 'tt-eco-code', W.ref));
      var today = W.shareDay === hub.today() ? W.shareToday : 0;
      box.appendChild(el('p', 'tt-eco-note', tx('progress', { n: W.shares || 0, t: today, c: CFG.shareDailyCap })));
      box.appendChild(el('p', 'tt-eco-goal', W.own['set-friend'] ? tx('friendOk') : tx('friendSet', { n: CFG.friendSetShares })));
      var go = el('button', 'tt-eco-btn', tx('shareNow'));
      var no = el('button', 'tt-eco-btn ghost', tx('close'));
      box.appendChild(go); box.appendChild(no);
      go.onclick = function () { close(); eco.share({ game: game }); };
      no.onclick = close;
    });
  };

  // a friend arrived through an invite link → one-time welcome gift
  (function redeem() {
    var code;
    try { code = new URL(location.href).searchParams.get('ref'); } catch (e) { return; }
    if (!code || !/^TT[A-Z0-9]{6}$/.test(code) || code === W.ref || W.invitedBy) return;
    W.invitedBy = code; W.coins += CFG.welcomeBonus; save();
    hub.track('invite_open', { ref: code });
    var show = function () { fire(); eco.toast(tx('welcome', { n: CFG.welcomeBonus })); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show); else setTimeout(show, 0);
  })();

  window.TTEco = eco;
})();
