/* =========================================================================
   Trip Timings Games Hub — ad network settings (ads-config.js)
   ► This is the ONLY file you edit to switch on paid ads. No game changes.

   Every ad slot (div.ad-slot) shows a Trip Timings cross-promo by default.
   When a network below is enabled, the slot tries the paid ad first and
   falls back to the cross-promo if the ad fails, is blocked or comes back
   empty. Ads never run during active gameplay.

   ── Google AdSense (web only) ────────────────────────────────────────────
   1) adsense.google.com → Ads → By ad unit → Display ads → create one unit
      per slot (or reuse one unit for all) and copy:
        data-ad-client = "ca-pub-1234567890123456"   → client
        data-ad-slot   = "1234567890"                → slots.<name>
   2) Set provider: 'adsense'.
   3) Put your publisher line in /ads.txt (see that file).
   4) EEA/UK users: enable a consent message in AdSense →
      Privacy & messaging → European regulations (keep consent: 'google-cmp').

   ── Any other network (Ezoic, Media.net, Adsterra, PropellerAds, …) ─────
   Set provider: 'custom' and paste the network's snippet per slot in
   custom.slots (HTML string; <script> tags inside are executed).

   ── Android app ──────────────────────────────────────────────────────────
   Inside the Capacitor app, web networks are switched off automatically
   (AdSense is not allowed in apps). The app keeps using AdMob through
   cyberbreaker-android/web-extra/ads-config.js (window.CB_ADS_CONFIG),
   which is a separate file and is not affected by this one.
   ========================================================================= */
window.TT_ADS_CONFIG = {
  // 'none'    → cross-promo only (current default)
  // 'adsense' → Google AdSense, cross-promo as fallback
  // 'custom'  → your own network snippets, cross-promo as fallback
  provider: 'none',

  adsense: {
    client: 'ca-pub-XXXXXXXXXXXXXXXX',   // ← your AdSense publisher id
    slots: {                              // ← your ad unit ids per slot
      'banner-top':    '',
      'banner-bottom': '',
      'start':         '',
      'gameover':      '',
    },
    testMode: false,                      // true → data-adtest="on" while you test
  },

  custom: {
    // Example:
    // slots: { 'banner-bottom': '<script async src="https://example-network.com/tag.js" data-zone="123"></script>' },
    slots: {},
  },

  // 'google-cmp' → consent is handled by AdSense "Privacy & messaging" (recommended)
  // 'npa'        → always request non-personalised ads (no consent banner needed for personalisation)
  // 'manual'     → wait until your own consent banner calls TTAds.grantConsent()
  consent: 'google-cmp',

  // Wait this long for a paid ad before keeping the cross-promo.
  timeoutMs: 5000,

  // When a paid network is on, skip the full-screen promo card after game over
  // so it never covers a paid ad. The in-slot cross-promo still rotates.
  promoCardWithNetworkAds: false,
};
