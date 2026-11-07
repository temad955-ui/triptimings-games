// Chess rules check: perft node counts against well-known reference positions,
// plus a quick AI-vs-AI game that must end without errors.
'use strict';
const assert = require('assert');
const C = require('../site/games/chess/engine.js');
const cases = [
  [C.START, 3, 8902],
  ['r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', 2, 2039], // "Kiwipete": castling, pins, en passant
  ['8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', 3, 2812],
  ['r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', 2, 264], // promotions
];
for (const [fen, d, n] of cases) {
  const got = C.perft(C.fromFEN(fen), d);
  assert.strictEqual(got, n, `perft(${d}) ${fen}: expected ${n}, got ${got}`);
}
let pos = C.fromFEN(C.START), plies = 0, st = 'play';
while (plies < 120 && (st === 'play' || st === 'check')) { pos = C.play(pos, C.bestMove(pos, plies % 2 ? 1 : 2)); plies++; st = C.status(pos); }
console.log('chess engine ok: perft matches, AI game ended with', st, 'after', plies, 'plies');
