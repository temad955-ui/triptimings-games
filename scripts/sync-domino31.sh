#!/usr/bin/env sh
# Copies the latest DOMINO 31 web client into the platform and adds the hub
# integration (back-to-lobby button, hub.js/economy.js/promo.js).
# app.js is the prebuilt bundle and is not modified; the source repo is never touched.
#
# Usage: ./scripts/sync-domino31.sh [path/to/domino31]
# Source of truth: the temad955-ui/domino31 repo (engine, server, web client).
# Default: a sibling checkout of that repo. Rebuild it first if you changed
# packages/web/src:  npm install && npm --workspace @domino31/web run build
#
# On GitHub Pages only "play vs computer" (offline mode) works. Online rooms need
# the domino31 Node server (see docs/DOMINO_31_DEPLOYMENT.md in that repo).
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${1:-$ROOT/../domino31}/packages/web/public"
DST="$ROOT/site/games/domino31"
mkdir -p "$DST"
cp "$SRC/app.js" "$SRC/styles.css" "$SRC/icon.svg" "$DST/"
python3 - "$SRC" "$DST" <<'PY'
import json, sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src + '/index.html', encoding='utf-8').read()

def rep(a, b):
    global s
    assert a in s, 'integration marker not found in domino31 index.html: ' + a[:60]
    s = s.replace(a, b, 1)

rep('<title>دومينو 31</title>',
    '<title>دومينو 31 · Trip Timings Games</title>\n'
    '  <meta name="description" content="Domino 31: the Egyptian domino game. Play free against the computer on Trip Timings Games." />\n'
    '  <link rel="stylesheet" href="../../shared/promo.css" />\n'
    '  <link rel="stylesheet" href="../../shared/economy.css" />\n'
    '  <style>.tt-home{inset-inline-start:auto;left:8px;right:auto;top:max(6px,env(safe-area-inset-top));width:34px;height:34px;border-radius:10px}.tt-home svg{width:18px;height:18px}</style>')
rep('  <script type="module" src="app.js"></script>',
    '  <!-- Trip Timings Games Hub: shared runtime, wallet and back-to-lobby button.\n'
    '       The game keeps its own ad slots (filled from the domino31 server promo.json). -->\n'
    '  <script src="../../shared/hub.js"></script>\n'
    '  <script src="../../shared/economy.js"></script>\n'
    '  <script src="../../shared/promo.js" data-game="domino31" data-home="1" data-ribbon="0"></script>\n'
    '  <script type="module" src="app.js"></script>\n'
    '  <script>addEventListener("load",function(){var a=document.querySelector(".tt-home");if(a){a.href="../dominoes/";a.setAttribute("aria-label","Dominoes")}});</script>')
open(dst + '/index.html', 'w', encoding='utf-8').write(s)

m = json.load(open(src + '/manifest.webmanifest', encoding='utf-8'))
m['start_url'] = './'
m['scope'] = './'
json.dump(m, open(dst + '/manifest.webmanifest', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
PY
echo "DOMINO 31 synced from $SRC into site/games/domino31"
