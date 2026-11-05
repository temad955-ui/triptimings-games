#!/usr/bin/env sh
# Copies the latest CyberBreaker web game into the platform and re-applies the
# hub integration (back-to-lobby link, hub.js/promo.js, ad slots).
# game.js is not modified, and the source folder is never touched.
set -eu
# Usage: ./scripts/sync-cyberbreaker.sh [path/to/CyberBreaker-Studio/cyberbreaker]
# The game's source of truth is the cyberbreaker/ folder in the CyberBreaker-Studio
# repo (it also feeds the Android app). Default: a sibling checkout of that repo.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${1:-$ROOT/../CyberBreaker-Studio/cyberbreaker}"
DST="$ROOT/site/games/cyberbreaker"
cp "$SRC/game.js" "$SRC/style.css" "$DST/"
python3 - "$SRC/index.html" "$DST/index.html" <<'PY'
import sys
s = open(sys.argv[1], encoding='utf-8').read()

def rep(a, b):
    global s
    assert a in s, 'integration marker not found in cyberbreaker/index.html: ' + a[:60]
    s = s.replace(a, b, 1)

rep('<title>CyberBreaker</title>', '<title>CyberBreaker · Trip Timings Games</title>')

# Ad slot styles (before the game's own stylesheet) + CyberBreaker-specific sizing:
# the app column is max 520px wide, so the menu banner always uses 320x50.
rep('<link rel="stylesheet" href="style.css"',
    '<link rel="stylesheet" href="../../shared/ads.css" />\n'
    '  <style>#app .ad-slot--banner{max-width:320px;height:50px;flex:none;margin-top:10px}</style>\n'
    '  <link rel="stylesheet" href="style.css"')

rep('      <div class="menu-top">\n',
    '      <div class="menu-top">\n'
    '        <!-- Trip Timings Games Hub: back to lobby -->\n'
    '        <a class="icon-btn" href="../../" aria-label="All games" title="All games"><svg><use href="#i-back"/></svg></a>\n')

# Start-screen banner (bottom of the main menu)
rep('<p class="menu-foot" id="menuBest"></p>',
    '<p class="menu-foot" id="menuBest"></p>\n'
    '      <div class="ad-slot" data-slot="start" data-size="banner" data-when="#menuScreen.active"></div>')

# Game-over slot, below the buttons (kept apart from Retry to avoid accidental taps)
rep('<button class="neon-btn ghost" data-action="quit" data-i18n="exit">Exit</button>\n      </div>\n    </div>\n\n    <div class="modal" id="clearModal"',
    '<button class="neon-btn ghost" data-action="quit" data-i18n="exit">Exit</button>\n'
    '        <div class="ad-slot" data-slot="gameover"></div>\n'
    '      </div>\n    </div>\n\n    <div class="modal" id="clearModal"')

rep('  <script src="game.js"></script>',
    '  <!-- Trip Timings Games Hub: shared runtime + cross-promotion.\n'
    '       The offer card is triggered by watching #overModal, so game.js stays untouched.\n'
    "       The ribbon is off here because CyberBreaker's controls sit at the bottom.\n"
    '       Ad slots: settings in /shared/ads-config.js; no ads while #gameScreen is active. -->\n'
    '  <script src="../../shared/hub.js"></script>\n'
    '  <script src="../../shared/promo.js" data-game="cyberbreaker" data-watch="#overModal" data-ribbon="0"></script>\n'
    '  <script src="../../shared/ads-config.js"></script>\n'
    '  <script src="../../shared/ads.js" data-playing="#gameScreen.active" data-menus="#overModal:not([hidden]), #clearModal:not([hidden])"></script>\n'
    '  <script src="game.js"></script>')
open(sys.argv[2], 'w', encoding='utf-8').write(s)
PY
echo "CyberBreaker synced from $SRC into site/games/cyberbreaker"
