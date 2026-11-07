/* =========================================================================
   Dominoes — rules engine (no DOM). Shared by every game mode.
   Works in the browser (window.DominoEngine) and in Node (module.exports)
   so the rules can be tested headless.

   Modes
     arabic  4 players, 2 teams (partners sit opposite), 7 tiles each, no
             boneyard, pass when stuck. Winning team scores the opponents'
             remaining pips. Match to 101.
     draw    2 players, 7 tiles, draw from the boneyard until you can play.
             Winner scores the opponent's pips. Match to 100.
     block   2 players, 7 tiles, no drawing: pass when stuck. Match to 100.
     fives   All Fives (Muggins): Draw rules, plus whenever the open ends add
             up to a multiple of 5 the player scores that sum. Hand points
             are rounded to the nearest 5. Match to 100.
   Blocked game (nobody can move): the side with the fewest pips wins and
   scores the other side's pips; a tie scores nothing.
   ========================================================================= */
(function (root) {
  'use strict';

  var MODES = {
    arabic: { players: 4, teams: true, draw: false, fives: false, target: 101, hand: 7 },
    draw:   { players: 2, teams: false, draw: true, fives: false, target: 100, hand: 7 },
    block:  { players: 2, teams: false, draw: false, fives: false, target: 100, hand: 7 },
    fives:  { players: 2, teams: false, draw: true, fives: true, target: 100, hand: 7 },
  };

  function allTiles() {
    var out = [];
    for (var a = 0; a <= 6; a++) for (var b = a; b <= 6; b++) out.push([a, b]);
    return out;
  }
  function shuffle(a, rnd) {
    rnd = rnd || Math.random;
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  var pips = function (t) { return t[0] + t[1]; };
  var isDouble = function (t) { return t[0] === t[1]; };
  var handPips = function (h) { return h.reduce(function (s, t) { return s + pips(t); }, 0); };
  var other = function (t, v) { return t[0] === v ? t[1] : t[0]; };
  var same = function (x, y) { return x[0] === y[0] && x[1] === y[1]; };

  /* Game state
     players[i] = { hand: [[a,b]...], team, voids: {v:true} }
     chain = null | { root: [a,b], L: [{i, o, d}], R: [...] }   i = inner pip, o = open pip
     turn: index of the player to move                                           */
  function newMatch(modeId, opts) {
    opts = opts || {};
    var M = MODES[modeId];
    if (!M) throw new Error('unknown mode ' + modeId);
    var players = [];
    for (var i = 0; i < M.players; i++) players.push({ hand: [], team: M.teams ? i % 2 : i, voids: {} });
    return {
      mode: modeId, M: M, players: players, scores: M.teams ? [0, 0] : players.map(function () { return 0; }),
      round: 0, starter: null, rnd: opts.rnd || Math.random,
    };
  }

  function deal(G) {
    var tiles = shuffle(allTiles(), G.rnd);
    G.players.forEach(function (p) { p.hand = tiles.splice(0, G.M.hand); p.voids = {}; });
    G.boneyard = G.M.draw ? tiles : [];
    G.chain = null; G.ends = null; G.passes = 0; G.round++; G.log = [];
    G.roundOver = null;
    if (G.starter == null) {
      // first round: the highest double leads (if nobody has one, the heaviest tile)
      var best = -1, who = 0;
      G.players.forEach(function (p, i) {
        p.hand.forEach(function (t) {
          var v = isDouble(t) ? 100 + t[0] : pips(t);
          if (v > best) { best = v; who = i; }
        });
      });
      G.turn = who;
    } else G.turn = G.starter;
    return G;
  }

  function legal(G, hand) {
    var out = [];
    if (!G.chain) { hand.forEach(function (t) { out.push({ tile: t, side: 'R' }); }); return out; }
    var L = G.ends[0], R = G.ends[1];
    hand.forEach(function (t) {
      var l = t[0] === L || t[1] === L, r = t[0] === R || t[1] === R;
      if (r) out.push({ tile: t, side: 'R' });
      if (l && (L !== R || !r)) out.push({ tile: t, side: 'L' });
    });
    return out;
  }

  // ends after a hypothetical move: [L, R, dblL, dblR, onlyRoot]
  function endsAfter(G, mv) {
    var t = mv.tile;
    if (!G.chain) return [t[0], t[1], isDouble(t), isDouble(t), true];
    var c = G.chain;
    var lastL = c.L.length ? c.L[c.L.length - 1].d : isDouble(c.root);
    var lastR = c.R.length ? c.R[c.R.length - 1].d : isDouble(c.root);
    var L = G.ends[0], R = G.ends[1];
    if (mv.side === 'L') return [other(t, L), R, isDouble(t), lastR, false];
    return [L, other(t, R), lastL, isDouble(t), false];
  }
  function sumEnds(e) {
    if (e[4]) return e[0] + e[1];             // a lone first tile counts all its pips
    return (e[2] ? 2 * e[0] : e[0]) + (e[3] ? 2 * e[1] : e[1]);
  }
  function currentSum(G) {
    if (!G.chain) return 0;
    var c = G.chain;
    var onlyRoot = !c.L.length && !c.R.length;
    var dl = c.L.length ? c.L[c.L.length - 1].d : isDouble(c.root);
    var dr = c.R.length ? c.R[c.R.length - 1].d : isDouble(c.root);
    return sumEnds([G.ends[0], G.ends[1], dl, dr, onlyRoot]);
  }

  /* Apply a move for the current player. Returns { fives: points scored this move,
     domino: true if the player emptied their hand }                              */
  function play(G, mv) {
    var p = G.players[G.turn];
    var idx = -1;
    p.hand.forEach(function (t, i) { if (idx < 0 && same(t, mv.tile)) idx = i; });
    if (idx < 0) throw new Error('tile not in hand');
    var ok = legal(G, p.hand).some(function (m) { return same(m.tile, mv.tile) && m.side === mv.side; });
    if (!ok) throw new Error('illegal move');
    var t = p.hand.splice(idx, 1)[0];
    if (!G.chain) { G.chain = { root: t, L: [], R: [] }; G.ends = [t[0], t[1]]; }
    else {
      var e = mv.side === 'L' ? 0 : 1, v = G.ends[e];
      G.chain[mv.side].push({ i: v, o: other(t, v), d: isDouble(t) });
      G.ends[e] = other(t, v);
    }
    // once a player plays a pip they clearly hold it; voids only come from passes
    G.passes = 0;
    var res = { fives: 0, domino: p.hand.length === 0, player: G.turn, tile: t, side: mv.side };
    if (G.M.fives) {
      var s = currentSum(G);
      if (s > 0 && s % 5 === 0) { res.fives = s; G.scores[p.team] += s; }
    }
    G.log.push({ p: G.turn, t: t, side: mv.side, fives: res.fives });
    if (res.domino) finishRound(G, G.turn);
    else G.turn = (G.turn + 1) % G.players.length;
    return res;
  }

  function canDraw(G) { return G.M.draw && G.boneyard.length > 0; }
  function draw(G) {
    if (!canDraw(G)) return null;
    var t = G.boneyard.pop();
    G.players[G.turn].hand.push(t);
    return t;
  }

  // current player has no move and cannot draw
  function pass(G) {
    var p = G.players[G.turn];
    if (G.ends) { p.voids[G.ends[0]] = true; p.voids[G.ends[1]] = true; }
    G.passes++;
    G.log.push({ p: G.turn, pass: true });
    if (G.passes >= G.players.length) { finishRound(G, null); return { blocked: true }; }
    G.turn = (G.turn + 1) % G.players.length;
    return { blocked: false };
  }

  function teamPips(G) {
    var tp = G.scores.map(function () { return 0; });
    G.players.forEach(function (p) { tp[p.team] += handPips(p.hand); });
    return tp;
  }
  var round5 = function (n) { return Math.round(n / 5) * 5; };

  function finishRound(G, winner) {
    var tp = teamPips(G), team = null, points = 0, blocked = winner == null;
    if (!blocked) {
      team = G.players[winner].team;
      tp.forEach(function (v, i) { if (i !== team) points += v; });
    } else {
      var min = Math.min.apply(null, tp);
      var low = tp.map(function (v, i) { return v === min ? i : -1; }).filter(function (i) { return i >= 0; });
      if (low.length === 1) {
        team = low[0];
        tp.forEach(function (v, i) { if (i !== team) points += v; });
        // the lightest hand on the winning side leads next round
        var bestP = -1, bestV = 1e9;
        G.players.forEach(function (p, i) { var v = handPips(p.hand); if (p.team === team && v < bestV) { bestV = v; bestP = i; } });
        winner = bestP;
      }
    }
    if (G.M.fives) points = round5(points);
    if (team != null) G.scores[team] += points;
    G.starter = winner != null ? winner : G.turn;
    var champ = null;
    G.scores.forEach(function (s, i) { if (s >= G.M.target && (champ == null || s > G.scores[champ])) champ = i; });
    G.roundOver = { winner: winner, team: team, points: points, blocked: blocked, teamPips: tp, matchWinner: champ };
    return G.roundOver;
  }

  // ---------------------------------------------------------------- AI
  // easy: random legal move · medium: dump the heaviest tile · hard: tactics
  function teammates(G, i) { return G.players.map(function (p, j) { return j; }).filter(function (j) { return j !== i && G.players[j].team === G.players[i].team; }); }
  function opponents(G, i) { return G.players.map(function (p, j) { return j; }).filter(function (j) { return G.players[j].team !== G.players[i].team; }); }

  function score(G, i, mv, level) {
    var t = mv.tile;
    if (level === 'easy') return G.rnd();
    var s = pips(t) + (isDouble(t) ? 3 : 0);
    if (level === 'medium') return s + G.rnd() * 3;
    var e = endsAfter(G, mv);
    var p = G.players[i];
    var rest = p.hand.filter(function (x) { return !same(x, t); });
    if (G.M.fives) {
      var sum = sumEnds(e);
      if (sum > 0 && sum % 5 === 0) s += sum * 2.5;
    }
    // keep my own options open
    var follow = rest.filter(function (x) { return x[0] === e[0] || x[1] === e[0] || x[0] === e[1] || x[1] === e[1]; }).length;
    s += follow * 2;
    if (!rest.length) s += 1000;              // domino!
    // suit control: ends I hold many of
    [e[0], e[1]].forEach(function (v) {
      s += 1.2 * rest.filter(function (x) { return x[0] === v || x[1] === v; }).length;
    });
    // squeeze the next opponent on what they've shown they lack
    var next = (i + 1) % G.players.length;
    opponents(G, i).forEach(function (o) {
      var w = o === next ? 7 : 3;
      if (G.players[o].voids[e[0]]) s += w;
      if (G.players[o].voids[e[1]]) s += w;
    });
    // don't block my partner
    teammates(G, i).forEach(function (m) {
      if (G.players[m].voids[e[0]] && G.players[m].voids[e[1]]) s -= 8;
    });
    return s + G.rnd() * 0.5;
  }

  function choose(G, i, level) {
    var moves = legal(G, G.players[i].hand);
    if (!moves.length) return null;
    var best = null, bs = -Infinity;
    moves.forEach(function (m) { var v = score(G, i, m, level); if (v > bs) { bs = v; best = m; } });
    return best;
  }

  var api = {
    MODES: MODES, allTiles: allTiles, shuffle: shuffle, pips: pips, isDouble: isDouble, handPips: handPips,
    newMatch: newMatch, deal: deal, legal: legal, play: play, draw: draw, canDraw: canDraw, pass: pass,
    currentSum: currentSum, endsAfter: endsAfter, sumEnds: sumEnds, choose: choose, same: same,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DominoEngine = api;
})(this);
