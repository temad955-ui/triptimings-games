/* Chess rules + AI for the Trip Timings Games Hub.
   Pure JS, works in the browser (window.TTChess) and in Node (module.exports).
   Board: 64 squares, a8 = 0 … h1 = 63. White pieces upper-case (PNBRQK),
   black lower-case, empty '.'. A position is immutable: play() returns a new one. */
(function (root) {
  'use strict';
  const N = -8, S = 8, E = 1, Wd = -1;
  const KN = [-17, -15, -10, -6, 6, 10, 15, 17];
  const KG = [-9, -8, -7, -1, 1, 7, 8, 9];
  const file = (i) => i & 7, rank = (i) => 7 - (i >> 3); // rank 0 = '1'
  const white = (p) => p !== '.' && p === p.toUpperCase();
  const colorOf = (p) => (p === '.' ? null : white(p) ? 'w' : 'b');
  const sqName = (i) => 'abcdefgh'[file(i)] + (rank(i) + 1);
  const sqIndex = (s) => (8 - Number(s[1])) * 8 + 'abcdefgh'.indexOf(s[0]);

  function fromFEN(fen) {
    const [pl, side, cast, ep] = fen.split(' ');
    const board = [];
    pl.split('/').forEach((row) => { for (const ch of row) { if (/\d/.test(ch)) for (let k = 0; k < +ch; k++) board.push('.'); else board.push(ch); } });
    return { board, side, castle: cast === '-' ? '' : cast, ep: ep && ep !== '-' ? sqIndex(ep) : -1, half: 0, history: [] };
  }
  const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  // squares attacked by side `by`
  function attacked(pos, sq, by) {
    const b = pos.board;
    const pawnDir = by === 'w' ? 1 : -1; // attacker pawns sit "below" for white
    for (const df of [-1, 1]) {
      const f = file(sq) + df, r = rank(sq) - pawnDir;
      if (f < 0 || f > 7 || r < 0 || r > 7) continue;
      const p = b[(7 - r) * 8 + f];
      if (p === (by === 'w' ? 'P' : 'p')) return true;
    }
    for (const d of KN) { const t = sq + d; if (t < 0 || t > 63 || Math.abs(file(t) - file(sq)) > 2) continue; if (b[t] === (by === 'w' ? 'N' : 'n')) return true; }
    for (const d of KG) { const t = sq + d; if (t < 0 || t > 63 || Math.abs(file(t) - file(sq)) > 1) continue; if (b[t] === (by === 'w' ? 'K' : 'k')) return true; }
    const slide = (dirs, pieces) => {
      for (const [df, dr] of dirs) {
        let f = file(sq) + df, r = rank(sq) + dr;
        while (f >= 0 && f < 8 && r >= 0 && r < 8) {
          const p = b[(7 - r) * 8 + f];
          if (p !== '.') { if (colorOf(p) === by && pieces.includes(p.toLowerCase())) return true; break; }
          f += df; r += dr;
        }
      }
      return false;
    };
    return slide([[1, 0], [-1, 0], [0, 1], [0, -1]], 'rq') || slide([[1, 1], [1, -1], [-1, 1], [-1, -1]], 'bq');
  }
  const kingSq = (pos, side) => pos.board.indexOf(side === 'w' ? 'K' : 'k');
  const inCheck = (pos, side) => attacked(pos, kingSq(pos, side || pos.side), (side || pos.side) === 'w' ? 'b' : 'w');

  function pseudo(pos) {
    const b = pos.board, me = pos.side, moves = [];
    const add = (from, to, extra) => moves.push(Object.assign({ from, to }, extra || {}));
    for (let i = 0; i < 64; i++) {
      const p = b[i]; if (colorOf(p) !== me) continue;
      const t = p.toLowerCase(), f = file(i), r = rank(i);
      if (t === 'p') {
        const dir = me === 'w' ? 1 : -1, startR = me === 'w' ? 1 : 6, lastR = me === 'w' ? 7 : 0;
        const one = (7 - (r + dir)) * 8 + f;
        const pushPromo = (from, to, extra) => { if (rank(to) === lastR) for (const q of 'qrbn') add(from, to, Object.assign({ promo: q }, extra)); else add(from, to, extra); };
        if (b[one] === '.') {
          pushPromo(i, one);
          const two = (7 - (r + 2 * dir)) * 8 + f;
          if (r === startR && b[two] === '.') add(i, two, { double: true });
        }
        for (const df of [-1, 1]) {
          const ff = f + df; if (ff < 0 || ff > 7) continue;
          const to = (7 - (r + dir)) * 8 + ff;
          if (b[to] !== '.' && colorOf(b[to]) !== me) pushPromo(i, to);
          else if (to === pos.ep) add(i, to, { ep: true });
        }
      } else if (t === 'n' || t === 'k') {
        for (const d of t === 'n' ? KN : KG) {
          const to = i + d; if (to < 0 || to > 63 || Math.abs(file(to) - f) > (t === 'n' ? 2 : 1)) continue;
          if (colorOf(b[to]) !== me) add(i, to);
        }
        if (t === 'k') {
          const opp = me === 'w' ? 'b' : 'w', home = me === 'w' ? 60 : 4;
          if (i === home && !attacked(pos, i, opp)) {
            const K = me === 'w' ? 'K' : 'k', Q = me === 'w' ? 'Q' : 'q';
            if (pos.castle.includes(K) && b[i + 1] === '.' && b[i + 2] === '.' && b[i + 3] === (me === 'w' ? 'R' : 'r') && !attacked(pos, i + 1, opp) && !attacked(pos, i + 2, opp)) add(i, i + 2, { castle: 'k' });
            if (pos.castle.includes(Q) && b[i - 1] === '.' && b[i - 2] === '.' && b[i - 3] === '.' && b[i - 4] === (me === 'w' ? 'R' : 'r') && !attacked(pos, i - 1, opp) && !attacked(pos, i - 2, opp)) add(i, i - 2, { castle: 'q' });
          }
        }
      } else {
        const dirs = [];
        if (t === 'r' || t === 'q') dirs.push([1, 0], [-1, 0], [0, 1], [0, -1]);
        if (t === 'b' || t === 'q') dirs.push([1, 1], [1, -1], [-1, 1], [-1, -1]);
        for (const [df, dr] of dirs) {
          let ff = f + df, rr = r + dr;
          while (ff >= 0 && ff < 8 && rr >= 0 && rr < 8) {
            const to = (7 - rr) * 8 + ff;
            if (b[to] === '.') add(i, to);
            else { if (colorOf(b[to]) !== me) add(i, to); break; }
            ff += df; rr += dr;
          }
        }
      }
    }
    return moves;
  }

  function play(pos, m) {
    const b = pos.board.slice(), p = b[m.from], me = pos.side;
    const captured = m.ep ? b[m.to + (me === 'w' ? 8 : -8)] : b[m.to];
    b[m.to] = m.promo ? (me === 'w' ? m.promo.toUpperCase() : m.promo) : p; b[m.from] = '.';
    if (m.ep) b[m.to + (me === 'w' ? 8 : -8)] = '.';
    if (m.castle === 'k') { b[m.from + 1] = b[m.from + 3]; b[m.from + 3] = '.'; }
    if (m.castle === 'q') { b[m.from - 1] = b[m.from - 4]; b[m.from - 4] = '.'; }
    let castle = pos.castle;
    const strip = (sq) => { if (sq === 60) castle = castle.replace(/[KQ]/g, ''); if (sq === 4) castle = castle.replace(/[kq]/g, ''); if (sq === 63) castle = castle.replace('K', ''); if (sq === 56) castle = castle.replace('Q', ''); if (sq === 7) castle = castle.replace('k', ''); if (sq === 0) castle = castle.replace('q', ''); };
    strip(m.from); strip(m.to);
    return { board: b, side: me === 'w' ? 'b' : 'w', castle, ep: m.double ? (m.from + m.to) / 2 : -1,
      half: p.toLowerCase() === 'p' || captured !== '.' ? 0 : pos.half + 1, history: pos.history, last: m, captured };
  }

  function legal(pos) { return pseudo(pos).filter((m) => !inCheck(play(pos, m), pos.side)); }

  function status(pos) {
    const moves = legal(pos);
    if (!moves.length) return inCheck(pos) ? 'mate' : 'stalemate';
    if (pos.half >= 100) return 'draw50';
    const left = pos.board.filter((p) => p !== '.' && p.toLowerCase() !== 'k');
    if (!left.length || (left.length === 1 && 'nb'.includes(left[0].toLowerCase()))) return 'material';
    return inCheck(pos) ? 'check' : 'play';
  }

  function perft(pos, d) { if (!d) return 1; let n = 0; for (const m of legal(pos)) n += perft(play(pos, m), d - 1); return n; }

  // ---------- AI: material + piece-square tables, alpha-beta with captures first ----------
  const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
  const PST = {
    p: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
    n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
    b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
    r: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
    q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
    k: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
  };
  function evaluate(pos) { // from white's point of view
    let s = 0;
    for (let i = 0; i < 64; i++) {
      const p = pos.board[i]; if (p === '.') continue;
      const t = p.toLowerCase();
      if (white(p)) s += VAL[t] + PST[t][i]; else s -= VAL[t] + PST[t][(7 - (i >> 3)) * 8 + (i & 7)];
    }
    return s;
  }
  function order(pos, moves) {
    return moves.map((m) => ({ m, k: (pos.board[m.to] !== '.' ? 10 * VAL[pos.board[m.to].toLowerCase()] - VAL[pos.board[m.from].toLowerCase()] : 0) + (m.promo ? 800 : 0) }))
      .sort((a, b) => b.k - a.k).map((x) => x.m);
  }
  function search(pos, depth, alpha, beta, ctx) {
    ctx.nodes++;
    const moves = legal(pos);
    const sign = pos.side === 'w' ? 1 : -1;
    if (!moves.length) return inCheck(pos) ? -100000 - depth : 0;
    if (depth === 0) return quiesce(pos, alpha, beta, ctx, 4);
    for (const m of order(pos, moves)) {
      const v = -search(play(pos, m), depth - 1, -beta, -alpha, ctx);
      if (v >= beta) return v;
      if (v > alpha) alpha = v;
      if (ctx.nodes > ctx.limit) break;
    }
    return alpha;
  }
  function quiesce(pos, alpha, beta, ctx, d) {
    ctx.nodes++;
    const stand = (pos.side === 'w' ? 1 : -1) * evaluate(pos);
    if (stand >= beta || d === 0) return stand;
    if (stand > alpha) alpha = stand;
    const caps = order(pos, legal(pos).filter((m) => pos.board[m.to] !== '.' || m.promo));
    for (const m of caps) {
      const v = -quiesce(play(pos, m), -beta, -alpha, ctx, d - 1);
      if (v >= beta) return v;
      if (v > alpha) alpha = v;
    }
    return alpha;
  }
  // level 1 easy … 3 hard
  function bestMove(pos, level) {
    const moves = legal(pos); if (!moves.length) return null;
    const depth = level >= 3 ? 3 : level === 2 ? 2 : 1;
    const noise = level >= 3 ? 0 : level === 2 ? 25 : 140;
    const ctx = { nodes: 0, limit: level >= 3 ? 60000 : 20000 };
    let best = null, bestV = -Infinity;
    for (const m of order(pos, moves)) {
      const v = -search(play(pos, m), depth - 1, -Infinity, Infinity, ctx) + Math.random() * noise;
      if (v > bestV) { bestV = v; best = m; }
    }
    return best;
  }

  const api = { START, fromFEN, legal, play, status, inCheck, perft, bestMove, evaluate, sqName, sqIndex, colorOf };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.TTChess = api;
})(typeof window !== 'undefined' ? window : globalThis);
