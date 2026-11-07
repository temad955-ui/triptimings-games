/* =========================================================================
   Trip Timings Games Hub — light 3D road renderer (road3d.js)
   Classic segment-projection ("pseudo 3D") road with curves, hills, roadside
   scenery and road objects. No WebGL and no libraries, so it runs smoothly on
   low-end phones. Used by the racing, tuk-tuk and runner games.

   const road = TTRoad.create({ W, H, lanes: 3, theme: {...}, scenery: fn });
   road.build(length, { curvy, hilly })     generate the track (segments)
   road.render(ctx, { z, x, objects, speed })   z = camera distance along track,
       x = camera offset (-1 … 1 = road edges), objects: [{ z, x, w, draw }]
       draw(ctx, sx, sy, px) — sx/sy = screen bottom-centre, px = pixels per world unit
   road.segAt(z)   road.length   road.curveAt(z)   road.SEG
   ========================================================================= */
(function () {
  'use strict';
  var SEG = 200, ROAD_W = 2000, DRAW = 160, CAM_H = 1000, FOV = 100;
  var DEPTH = 1 / Math.tan((FOV / 2) * Math.PI / 180);

  function create(o) {
    var W = o.W, H = o.H, lanes = o.lanes || 3, th = o.theme;
    var segs = [], length = 0;
    var api = { SEG: SEG, ROAD_W: ROAD_W, segs: segs };

    function ease(a, b, p) { return a + (b - a) * ((-Math.cos(p * Math.PI) / 2) + 0.5); }
    function add(n, curve, hill, i0) {
      var startY = segs.length ? segs[segs.length - 1].y2 : 0;
      for (var k = 0; k < n; k++) {
        var i = segs.length;
        segs.push({ i: i, curve: curve, y1: i ? segs[i - 1].y2 : startY, y2: ease(startY, startY + hill, (k + 1) / n), scenery: [], band: Math.floor(i / 3) % 2 });
      }
    }
    api.build = function (count, opt) {
      opt = opt || {};
      segs.length = 0;
      var curvy = opt.curvy == null ? 1 : opt.curvy, hilly = opt.hilly == null ? 1 : opt.hilly;
      add(40, 0, 0);
      while (segs.length < count) {
        var r = Math.random(), n = 30 + Math.floor(Math.random() * 60);
        var curve = r < 0.35 ? 0 : (Math.random() < 0.5 ? -1 : 1) * (1 + Math.random() * 3) * curvy;
        var hill = Math.random() < 0.5 ? 0 : (Math.random() * 2 - 1) * 1500 * hilly;
        add(n, curve, hill);
      }
      // ease back to 0 height so the loop joins smoothly
      add(60, 0, -segs[segs.length - 1].y2);
      segs.forEach(function (s, i) { if (o.scenery) o.scenery(s, i); });
      length = segs.length * SEG;
      api.length = length;
      return api;
    };
    api.segAt = function (z) { var n = segs.length; return segs[((Math.floor(z / SEG) % n) + n) % n]; };
    api.curveAt = function (z) { return api.segAt(z).curve; };
    api.heightAt = function (z) { var s = api.segAt(z), p = (z % SEG) / SEG; return s.y1 + (s.y2 - s.y1) * p; };

    function project(p, camX, camY, camZ) {
      var cz = p.z - camZ; if (cz < 1) cz = 1;
      var scale = DEPTH / cz;
      p.sx = Math.round(W / 2 + scale * (p.x - camX) * W / 2);
      p.sy = Math.round(H / 2 - scale * (p.y - camY) * H / 2);
      p.sw = Math.round(scale * ROAD_W * W / 2);
      p.scale = scale;
    }
    function quad(ctx, x1, y1, w1, x2, y2, w2, c) {
      ctx.fillStyle = c; ctx.beginPath();
      ctx.moveTo(x1 - w1, y1); ctx.lineTo(x2 - w2, y2); ctx.lineTo(x2 + w2, y2); ctx.lineTo(x1 + w1, y1); ctx.closePath(); ctx.fill();
    }

    api.render = function (ctx, v) {
      var n = segs.length; if (!n) return;
      var z = ((v.z % length) + length) % length;
      var base = api.segAt(z), basePct = (z % SEG) / SEG;
      var camY = CAM_H * (v.camH || 1) + api.heightAt(z + (v.lookAhead || 0));
      // sky + horizon glow
      var sky = ctx.createLinearGradient(0, 0, 0, H / 2 + 20);
      sky.addColorStop(0, th.sky[0]); sky.addColorStop(1, th.sky[1]);
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      if (th.sun) { var sx = W / 2 - (v.skyX || 0) * 0.3 % W; ctx.fillStyle = th.sun; ctx.shadowColor = th.sun; ctx.shadowBlur = 40; ctx.beginPath(); ctx.arc(sx, H * 0.36, 34, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; }
      if (th.skyline) th.skyline(ctx, W, H, v.skyX || 0);
      ctx.fillStyle = th.ground[0]; ctx.fillRect(0, H / 2, W, H / 2);

      var maxy = H, x = 0, dx = -(base.curve * basePct), list = [];
      for (var k = 0; k < DRAW; k++) {
        var s = segs[(base.i + k) % n], loop = base.i + k >= n ? length : 0;
        var p1 = { x: x, y: s.y1, z: s.i * SEG + loop }, p2 = { x: x + dx, y: s.y2, z: (s.i + 1) * SEG + loop };
        x += dx; dx += s.curve;
        var camX = v.x * ROAD_W;
        project(p1, camX, camY, z); project(p2, camX, camY, z);
        s.p1 = p1; s.p2 = p2; s.clip = maxy; s.fog = k / DRAW;
        list.push(s);
        if (p1.z - z <= DEPTH || p2.sy >= maxy) continue;
        // grass bands, rumble strips, road, lane markings
        ctx.fillStyle = th.ground[s.band]; ctx.fillRect(0, p2.sy, W, p1.sy - p2.sy);
        var r1 = p1.sw / 6, r2 = p2.sw / 6;
        quad(ctx, p1.sx, p1.sy, p1.sw + r1, p2.sx, p2.sy, p2.sw + r2, th.rumble[s.band]);
        quad(ctx, p1.sx, p1.sy, p1.sw, p2.sx, p2.sy, p2.sw, th.road[s.band]);
        if (!s.band) {
          var l1 = p1.sw / 40, l2 = p2.sw / 40, lw1 = (p1.sw * 2) / lanes, lw2 = (p2.sw * 2) / lanes;
          for (var ln = 1; ln < lanes; ln++) quad(ctx, p1.sx - p1.sw + lw1 * ln, p1.sy, l1, p2.sx - p2.sw + lw2 * ln, p2.sy, l2, th.lane);
        }
        if (th.edgeGlow) { ctx.strokeStyle = th.edgeGlow; ctx.lineWidth = Math.max(1, p1.sw / 60); ctx.beginPath(); ctx.moveTo(p1.sx - p1.sw, p1.sy); ctx.lineTo(p2.sx - p2.sw, p2.sy); ctx.moveTo(p1.sx + p1.sw, p1.sy); ctx.lineTo(p2.sx + p2.sw, p2.sy); ctx.stroke(); }
        maxy = p2.sy;
      }
      // sprites far → near: scenery and road objects
      var objs = (v.objects || []).slice();
      for (var j = list.length - 1; j > 0; j--) {
        var sg = list[j];
        if (!sg.p1 || sg.p1.z - z <= DEPTH) continue;
        sg.scenery.forEach(function (sc) {
          var px = sg.p1.scale * W / 2, sxp = sg.p1.sx + px * sc.x * ROAD_W, syp = sg.p1.sy;
          if (sxp < -W || sxp > 2 * W) return;
          ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, sg.clip); ctx.clip();
          sc.draw(ctx, sxp, syp, px, sg.fog);
          ctx.restore();
        });
        for (var q = 0; q < objs.length; q++) {
          var ob = objs[q], oz = ((ob.z % length) + length) % length;
          var segI = Math.floor(oz / SEG);
          if (segI !== sg.i) continue;
          var pct = (oz % SEG) / SEG;
          var sp = sg.p1, ep = sg.p2;
          var scale = sp.scale + (ep.scale - sp.scale) * pct;
          var sx2 = sp.sx + (ep.sx - sp.sx) * pct, sy2 = sp.sy + (ep.sy - sp.sy) * pct;
          var pxu = scale * W / 2;
          ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, sg.clip); ctx.clip();
          ob.draw(ctx, sx2 + pxu * ob.x * ROAD_W, sy2, pxu, sg.fog);
          ctx.restore();
        }
      }
      // fog toward the horizon
      if (th.fog) { var fg = ctx.createLinearGradient(0, H / 2 - 40, 0, H / 2 + 60); fg.addColorStop(0, 'rgba(0,0,0,0)'); fg.addColorStop(0.5, th.fog); fg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = fg; ctx.fillRect(0, H / 2 - 40, W, 100); }
    };
    return api;
  }

  // ---------- shared procedural sprites (world units; 1 unit ≈ 1 cm, road = 2000 wide) ----------
  function box3(ctx, sx, sy, px, w, h, body, top, glass) { // a vehicle seen from behind
    var bw = w * px, bh = h * px; if (bw < 1) return;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(sx - bw * 0.55, sy - bh * 0.08, bw * 1.1, bh * 0.12);
    ctx.fillStyle = body; ctx.fillRect(sx - bw / 2, sy - bh * 0.62, bw, bh * 0.55);
    ctx.fillStyle = top || body; ctx.fillRect(sx - bw * 0.4, sy - bh, bw * 0.8, bh * 0.4);
    ctx.fillStyle = glass || 'rgba(20,30,70,.9)'; ctx.fillRect(sx - bw * 0.34, sy - bh * 0.94, bw * 0.68, bh * 0.28);
    ctx.fillStyle = '#ff2b4d'; ctx.fillRect(sx - bw * 0.46, sy - bh * 0.5, bw * 0.16, bh * 0.08); ctx.fillRect(sx + bw * 0.3, sy - bh * 0.5, bw * 0.16, bh * 0.08);
    ctx.fillStyle = '#111'; ctx.fillRect(sx - bw * 0.46, sy - bh * 0.1, bw * 0.18, bh * 0.1); ctx.fillRect(sx + bw * 0.28, sy - bh * 0.1, bw * 0.18, bh * 0.1);
  }
  var SPR = {
    car: function (color) { return function (ctx, sx, sy, px) { box3(ctx, sx, sy, px, 360, 300, color, color); }; },
    taxi: function () { return function (ctx, sx, sy, px) { box3(ctx, sx, sy, px, 360, 300, '#16161d', '#f5f5f5'); ctx.fillStyle = '#ffd23f'; ctx.fillRect(sx - 40 * px, sy - 318 * px, 80 * px, 22 * px); }; },
    micro: function () { return function (ctx, sx, sy, px) { box3(ctx, sx, sy, px, 420, 520, '#f2f2f2', '#f2f2f2'); ctx.fillStyle = '#2a6fdb'; ctx.fillRect(sx - 210 * px, sy - 250 * px, 420 * px, 40 * px); }; },
    truck: function (color) { return function (ctx, sx, sy, px) { box3(ctx, sx, sy, px, 460, 620, color || '#c49a52', color || '#c49a52', 'rgba(60,40,20,.9)'); }; },
    palm: function (ctx, sx, sy, px, fog) {
      var h = 1400 * px; if (h < 2) return;
      ctx.globalAlpha = 1 - fog * 0.6;
      ctx.strokeStyle = '#7a4a1e'; ctx.lineWidth = Math.max(1, 60 * px); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + 100 * px, sy - h / 2, sx + 40 * px, sy - h); ctx.stroke();
      ctx.fillStyle = '#2e8a3a';
      for (var k = 0; k < 6; k++) { var a = k / 6 * Math.PI * 2; ctx.beginPath(); ctx.ellipse(sx + 40 * px + Math.cos(a) * 220 * px, sy - h + Math.sin(a) * 80 * px, 260 * px, 60 * px, a, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1;
    },
    building: function (color, floors) {
      return function (ctx, sx, sy, px, fog) {
        var w = 1600 * px, h = (floors || 6) * 320 * px; if (w < 2) return;
        ctx.globalAlpha = 1 - fog * 0.5;
        ctx.fillStyle = color; ctx.fillRect(sx - w / 2, sy - h, w, h);
        ctx.fillStyle = 'rgba(255,230,150,.75)';
        var cols = 5, rows = floors || 6;
        for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) if ((r * 7 + c * 3) % 4) ctx.fillRect(sx - w / 2 + (c + 0.25) * w / cols, sy - h + (r + 0.25) * h / rows, w / cols * 0.5, h / rows * 0.45);
        ctx.globalAlpha = 1;
      };
    },
    pyramid: function (ctx, sx, sy, px, fog) {
      var w = 6000 * px; if (w < 2) return;
      ctx.globalAlpha = 1 - fog * 0.4;
      ctx.fillStyle = '#d9a75a'; ctx.beginPath(); ctx.moveTo(sx - w / 2, sy); ctx.lineTo(sx, sy - w * 0.62); ctx.lineTo(sx + w / 2, sy); ctx.fill();
      ctx.fillStyle = '#b07f3a'; ctx.beginPath(); ctx.moveTo(sx, sy - w * 0.62); ctx.lineTo(sx + w / 2, sy); ctx.lineTo(sx + w * 0.1, sy); ctx.fill();
      ctx.globalAlpha = 1;
    },
    lamp: function (ctx, sx, sy, px) {
      var h = 1100 * px; if (h < 2) return;
      ctx.strokeStyle = '#8a8fa8'; ctx.lineWidth = Math.max(1, 24 * px); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy - h); ctx.stroke();
      ctx.fillStyle = '#fff6b0'; ctx.shadowColor = '#fff6b0'; ctx.shadowBlur = 12; ctx.fillRect(sx - 60 * px, sy - h, 120 * px, 40 * px); ctx.shadowBlur = 0;
    },
    sign: function (text, color) {
      return function (ctx, sx, sy, px) {
        var w = 900 * px, h = 380 * px; if (w < 3) return;
        ctx.fillStyle = '#555'; ctx.fillRect(sx - 20 * px, sy - h - 500 * px, 40 * px, h + 500 * px);
        ctx.fillStyle = color || '#1b7f3a'; ctx.fillRect(sx - w / 2, sy - h - 500 * px, w, h);
        if (w > 30) { ctx.fillStyle = '#fff'; ctx.font = '800 ' + Math.round(h * 0.42) + 'px Cairo, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(text, sx, sy - 500 * px - h * 0.35); }
      };
    },
  };

  window.TTRoad = { create: create, SPR: SPR, box3: box3 };
})();
