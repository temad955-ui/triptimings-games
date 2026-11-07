// Headless check of the Dominoes rules engine: node tests/dominoes-engine.test.js
// Plays many AI-vs-AI matches in every mode, checks that no tile is lost or duplicated,
// that every match ends, and that harder AI beats easier AI.
'use strict';
const assert = require('assert');
const E = require('../site/games/dominoes/engine.js');

function match(mode, levels) {
  const G = E.newMatch(mode);
  for (let r = 0; r < 200; r++) {
    E.deal(G);
    for (let n = 0; !G.roundOver; n++) {
      assert(n < 500, 'round never ended');
      const mv = E.choose(G, G.turn, levels[G.turn % levels.length]);
      if (mv) E.play(G, mv); else if (E.canDraw(G)) E.draw(G); else E.pass(G);
      const inPlay = G.players.reduce((s, p) => s + p.hand.length, 0) + G.boneyard.length +
        (G.chain ? 1 + G.chain.L.length + G.chain.R.length : 0);
      assert.strictEqual(inPlay, mode === 'block' ? 14 : 28, 'tile count');
    }
    if (G.roundOver.matchWinner != null) return G.roundOver.matchWinner;
  }
  throw new Error('match never ended');
}

for (const mode of Object.keys(E.MODES)) {
  for (const [a, b] of [['hard', 'easy'], ['hard', 'medium'], ['medium', 'easy']]) {
    let wins = 0; const N = 200;
    for (let i = 0; i < N; i++) if (match(mode, [a, b]) === 0) wins++;
    console.log(mode.padEnd(7), a, 'vs', b.padEnd(6), Math.round(wins / N * 100) + '%');
    assert(wins / N > 0.5, `${a} should beat ${b} in ${mode}`);
  }
}

// All Fives scoring: 5|5 opening = 10 points
const G = E.newMatch('fives'); E.deal(G);
G.players[G.turn].hand.push([5, 5]);
const before = G.scores[G.players[G.turn].team];
assert.strictEqual(E.play(G, { tile: [5, 5], side: 'R' }).fives, 10);
assert.strictEqual(G.scores[G.players[(G.turn + 1) % 2].team], before + 10);
console.log('all checks passed');
