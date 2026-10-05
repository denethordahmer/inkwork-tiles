/* =========================================================================
   INKWORK TILES: inkwork-styles.js
   The four drawing recipes: Motif Grid, Lattice, Hex Weave, Truchet.
   inkwork-app.js calls InkworkStyles.draw(context, width, height, settings).
   This file only draws the pattern. The app paints the background first.
   Every recipe fills the whole picture, at any size and rotation.
   ========================================================================= */
(function () {
  "use strict";

  var TAU = Math.PI * 2;
  var HALF = Math.PI / 2;

  /* ---------- small helpers ---------- */
  function num(v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function mod(a, n) { return ((a % n) + n) % n; }

  function hash(str) {
    var h = 2166136261 >>> 0;
    str = String(str || "inkwork");
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  /* A repeatable random number for one tile. The same seed and the same
     tile position always give the same answer, so changing Rotation or
     Tile size never reshuffles the dice in a confusing way. */
  function cr(seed, i, j, s) {
    var h = (seed ^ Math.imul(i + 1013, 374761393) ^ Math.imul(j + 7919, 668265263) ^ Math.imul(s + 1, 2147483647)) >>> 0;
    h = Math.imul(h ^ (h >>> 15), 2246822519);
    h = Math.imul(h ^ (h >>> 13), 3266489917);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  function hexToRgb(h) {
    h = String(h || "#000000").replace("#", "");
    if (h.length === 3) h = h.split("").map(function (c) { return c + c; }).join("");
    var n = parseInt(h, 16);
    if (isNaN(n)) n = 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function toHex(r, g, b) {
    return "#" + [r, g, b].map(function (v) {
      return ("0" + Math.round(clamp(v, 0, 255)).toString(16)).slice(-2);
    }).join("");
  }
  function rgba(hex, a) {
    var c = hexToRgb(hex);
    return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + clamp(a, 0, 1) + ")";
  }
  function darken(hex, f) {
    var c = hexToRgb(hex);
    return toHex(c[0] * (1 - f), c[1] * (1 - f), c[2] * (1 - f));
  }

  /* paints the shape already in the path: outline, filled, or both */
  function paintShape(c, mode, col, lw) {
    if (mode === "filled") {
      c.fillStyle = rgba(col, 0.95); c.fill();
    } else if (mode === "both") {
      c.fillStyle = rgba(col, 0.4); c.fill();
      c.strokeStyle = rgba(col, 1); c.lineWidth = lw; c.stroke();
    } else {
      c.strokeStyle = rgba(col, 1); c.lineWidth = lw; c.stroke();
    }
  }

  function starPath(c, x, y, pts, outer, inner) {
    c.beginPath();
    for (var i = 0; i < pts * 2; i++) {
      var a = -HALF + i * Math.PI / pts;
      var r = i % 2 === 0 ? outer : inner;
      var px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.closePath();
  }

  /* =======================================================================
     MOTIF GRID
     One small shape repeated on a grid, turned and coloured tile by tile.
     ======================================================================= */
  function motif(S) {
    var c = S.c, p = S.p, cols = S.cols, T = S.T, lw = S.lw;
    var n = Math.ceil(S.D / T) + 2;
    var s = T * 0.5 * clamp(num(p.motifSize), 30, 100) / 100;
    var type = p.motifType, fill = p.motifFill;
    c.lineJoin = "round"; c.lineCap = "round";

    for (var j = -n; j <= n; j++) {
      for (var i = -n; i <= n; i++) {
        var cx = i * T + T / 2, cy = j * T + T / 2;
        if (p.tileOffset === "brick") cx += mod(j, 2) * T / 2;
        else if (p.tileOffset === "drop") cy += mod(i, 2) * T / 2;

        var turn = 0;
        if (p.tileTurn === "quarter") turn = mod(i + j, 4) * HALF;
        else if (p.tileTurn === "half") turn = mod(i + j, 2) * Math.PI;
        else if (p.tileTurn === "random") turn = Math.floor(cr(S.seed, i, j, 1) * 4) * HALF;

        var idx;
        if (p.motifColour === "row") idx = mod(j, 4);
        else if (p.motifColour === "column") idx = mod(i, 4);
        else if (p.motifColour === "random") idx = Math.floor(cr(S.seed, i, j, 2) * 4) % 4;
        else idx = mod(i, 2) + 2 * mod(j, 2);
        var col = cols[idx];

        c.save();
        c.translate(cx, cy);
        c.rotate(turn);

        if (type === "dot") {
          c.beginPath(); c.arc(0, 0, s, 0, TAU);
          paintShape(c, fill, col, lw);
        } else if (type === "diamond") {
          c.beginPath();
          c.moveTo(0, -s); c.lineTo(s * 0.8, 0); c.lineTo(0, s); c.lineTo(-s * 0.8, 0);
          c.closePath();
          paintShape(c, fill, col, lw);
        } else if (type === "petal") {
          c.beginPath();
          c.moveTo(-s, 0);
          c.quadraticCurveTo(0, -s * 1.1, s, 0);
          c.quadraticCurveTo(0, s * 1.1, -s, 0);
          c.closePath();
          paintShape(c, fill, col, lw);
        } else if (type === "arrow") {
          c.beginPath();
          c.moveTo(0, -s); c.lineTo(s * 0.75, s * 0.7); c.lineTo(0, s * 0.3); c.lineTo(-s * 0.75, s * 0.7);
          c.closePath();
          paintShape(c, fill, col, lw);
        } else if (type === "eye") {
          c.beginPath();
          c.moveTo(-s, 0);
          c.quadraticCurveTo(0, -s * 1.05, s, 0);
          c.quadraticCurveTo(0, s * 1.05, -s, 0);
          c.closePath();
          paintShape(c, fill, col, lw);
          c.beginPath(); c.arc(0, 0, s * 0.3, 0, TAU);
          c.fillStyle = rgba(col, 1); c.fill();
        } else {
          starPath(c, 0, 0, 8, s, s * 0.5);
          paintShape(c, fill, col, lw);
        }
        c.restore();
      }
    }
  }

  /* =======================================================================
     LATTICE
     Straight ribbons in two or three directions, woven over and under.
     Over-under: every crossing alternates which ribbon is on top.
     Gapped: the ribbon underneath is broken at each crossing.
     Flat: all ribbons simply lie on top of each other.
     ======================================================================= */
  function lattice(S) {
    var c = S.c, p = S.p, cols = S.cols, T = S.T, D = S.D;
    var shape = p.latticeShape, weave = p.latticeWeave;
    var angles, offs;
    if (shape === "square") { angles = [0, HALF]; offs = [0, 0]; }
    else if (shape === "triangle") { angles = [0, Math.PI / 3, 2 * Math.PI / 3]; offs = [0, 0, 0.33]; }
    else { angles = [Math.PI / 4, 3 * Math.PI / 4]; offs = [0, 0]; }

    var P = T * 0.75;
    var tri = angles.length === 3;
    var w = Math.min(num(p.strandWidth) * S.k, P * (tri ? 0.5 : 0.8));
    w = Math.max(w, 2);
    var o = weave === "flat" ? 0 : Math.max(1, S.lw);
    var K = Math.ceil(D / P) + 1;
    c.lineCap = "butt"; c.lineJoin = "round";

    var fam = angles.map(function (a, f) {
      return { u: [Math.cos(a), Math.sin(a)], nv: [-Math.sin(a), Math.cos(a)], off: offs[f] * P };
    });

    function strandCol(f, k) {
      return p.latticeColour === "strand" ? cols[mod(k + f, 4)] : cols[f % 4];
    }

    /* draw part of a strand from distance t0 to t1 along it */
    function seg(f, k, t0, t1) {
      var F = fam[f], base = k * P + F.off;
      var bx = F.nv[0] * base, by = F.nv[1] * base;
      var col = strandCol(f, k);
      c.beginPath();
      c.moveTo(bx + F.u[0] * t0, by + F.u[1] * t0);
      c.lineTo(bx + F.u[0] * t1, by + F.u[1] * t1);
      if (o > 0) {
        c.lineWidth = w + 2 * o;
        c.strokeStyle = darken(col, 0.55);
        c.stroke();
      }
      c.lineWidth = w;
      c.strokeStyle = rgba(col, 1);
      c.stroke();
    }

    /* where strand (fa,ka) crosses strand (fb,kb): distance along strand a */
    function cross(fa, ka, fb, kb) {
      var A = fam[fa], B = fam[fb];
      var ca = ka * P + A.off, cb = kb * P + B.off;
      var det = A.nv[0] * B.nv[1] - A.nv[1] * B.nv[0];
      if (Math.abs(det) < 0.05) return null;
      var X = (ca * B.nv[1] - cb * A.nv[1]) / det;
      var Y = (A.nv[0] * cb - B.nv[0] * ca) / det;
      return { t: X * A.u[0] + Y * A.u[1], sin: Math.abs(det), r2: X * X + Y * Y };
    }

    var f, k, g, kb;

    if (weave === "gap") {
      for (f = 0; f < fam.length; f++) {
        for (k = -K; k <= K; k++) {
          var unders = [];
          for (g = 0; g < fam.length; g++) {
            if (g === f) continue;
            for (kb = -K; kb <= K; kb++) {
              var X = cross(f, k, g, kb);
              if (!X || Math.abs(X.t) > D) continue;
              var odd = mod(k + kb, 2) === 1;
              var under = f < g ? odd : !odd;
              if (under) unders.push({ t: X.t, h: (w / 2 + o) / X.sin + w * 0.3 });
            }
          }
          unders.sort(function (a, b) { return a.t - b.t; });
          var start = -D;
          for (var u = 0; u < unders.length; u++) {
            var end = unders[u].t - unders[u].h;
            if (end > start) seg(f, k, start, end);
            start = Math.max(start, unders[u].t + unders[u].h);
          }
          if (D > start) seg(f, k, start, D);
        }
      }
      return;
    }

    /* flat and over-under: draw every strand, later directions on top */
    for (f = 0; f < fam.length; f++) {
      for (k = -K; k <= K; k++) seg(f, k, -D, D);
    }
    if (weave !== "over") return;

    /* then lift the earlier strand back on top at every second crossing */
    for (f = 0; f < fam.length; f++) {
      for (g = f + 1; g < fam.length; g++) {
        for (k = -K; k <= K; k++) {
          for (kb = -K; kb <= K; kb++) {
            if (mod(k + kb, 2) !== 0) continue;
            var X2 = cross(f, k, g, kb);
            if (!X2 || X2.r2 > (D + T) * (D + T)) continue;
            var h = (w / 2 + o) / X2.sin + o + 1;
            seg(f, k, X2.t - h, X2.t + h);
          }
        }
      }
    }
  }

  /* =======================================================================
     HEX WEAVE
     Honeycomb. Outline and Filled draw one hexagon per cell. Woven bands
     draw every honeycomb edge as a ribbon and alternate which ribbon is
     on top where three of them meet.
     ======================================================================= */
  function hexPath(c, x, y, r) {
    c.beginPath();
    for (var m = 0; m < 6; m++) {
      var a = -HALF + m * Math.PI / 3;
      var px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (m === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.closePath();
  }

  function hex(S) {
    var c = S.c, p = S.p, cols = S.cols, T = S.T, D = S.D, lw = S.lw;
    var R = T / Math.sqrt(3);
    var rowH = R * 1.5;
    var J = Math.ceil(D / rowH) + 2;
    var I = Math.ceil(D / T) + 2;
    var style = p.hexStyle;
    var gap = clamp(num(p.hexGap), 0, 30) / 100;
    c.lineJoin = "round"; c.lineCap = "round";

    function cell(i, j) {
      var q = i - (j - mod(j, 2)) / 2, r = j;
      return {
        x: (i + mod(j, 2) * 0.5) * T,
        y: j * rowH,
        q: q, r: r
      };
    }
    function colourOf(i, j, q, r) {
      var idx;
      if (p.hexColour === "rings") idx = Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) % 4;
      else if (p.hexColour === "random") idx = Math.floor(cr(S.seed, i, j, 3) * 4) % 4;
      else idx = mod(q, 4);
      return cols[idx];
    }

    var i, j, m, ce, col;

    if (style !== "woven") {
      var rr = R * (1 - gap);
      for (j = -J; j <= J; j++) {
        for (i = -I; i <= I; i++) {
          ce = cell(i, j);
          col = colourOf(i, j, ce.q, ce.r);
          hexPath(c, ce.x, ce.y, rr);
          if (style === "filled") {
            c.fillStyle = rgba(col, 0.95); c.fill();
            c.strokeStyle = rgba(col, 1); c.lineWidth = 1; c.stroke();
          } else {
            c.strokeStyle = rgba(col, 1); c.lineWidth = lw; c.stroke();
          }
        }
      }
      return;
    }

    /* woven bands: edges 0, 1 and 2 of every cell cover each edge once */
    var bw = Math.max(R * 0.34, lw * 1.5);
    var o = Math.max(1, lw * 0.5);
    for (var pass = 0; pass < 2; pass++) {
      for (j = -J; j <= J; j++) {
        for (i = -I; i <= I; i++) {
          ce = cell(i, j);
          col = colourOf(i, j, ce.q, ce.r);
          for (m = 0; m < 3; m++) {
            if (mod(i + j + m, 2) !== pass) continue;
            var a0 = -HALF + m * Math.PI / 3, a1 = a0 + Math.PI / 3;
            var x0 = ce.x + Math.cos(a0) * R, y0 = ce.y + Math.sin(a0) * R;
            var x1 = ce.x + Math.cos(a1) * R, y1 = ce.y + Math.sin(a1) * R;
            c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1);
            c.lineWidth = bw + 2 * o; c.strokeStyle = darken(col, 0.55); c.stroke();
            c.lineWidth = bw; c.strokeStyle = rgba(col, 1); c.stroke();
          }
        }
      }
    }
  }

  /* =======================================================================
     TRUCHET
     Square tiles, each flipped one of two ways. Where lines meet at tile
     edges they always join up, so the tiles form flowing paths.
     ======================================================================= */
  function arcs(c, x0, y0, T, flip, r) {
    c.beginPath();
    if (!flip) {
      c.moveTo(x0 + r, y0); c.arc(x0, y0, r, 0, HALF);
      c.moveTo(x0 + T - r, y0 + T); c.arc(x0 + T, y0 + T, r, Math.PI, Math.PI * 1.5);
    } else {
      c.moveTo(x0 + T, y0 + r); c.arc(x0 + T, y0, r, HALF, Math.PI);
      c.moveTo(x0, y0 + T - r); c.arc(x0, y0 + T, r, Math.PI * 1.5, TAU);
    }
  }

  function truchet(S) {
    var c = S.c, p = S.p, cols = S.cols, T = S.T, lw = S.lw;
    var n = Math.ceil(S.D / T) + 2;
    var mix = clamp(num(p.truchetMix), 0, 100) / 100;
    var style = p.truchetStyle;
    var d = T * 0.14;
    c.lineCap = "butt"; c.lineJoin = "round";

    for (var j = -n; j <= n; j++) {
      for (var i = -n; i <= n; i++) {
        var x0 = i * T, y0 = j * T;
        var flip = mod(i + j, 2) === 1;
        if (cr(S.seed, i, j, 4) < mix) flip = cr(S.seed, i, j, 5) < 0.5;

        var col;
        if (p.truchetColour === "row") col = cols[mod(j, 4)];
        else if (p.truchetColour === "diagonal") col = cols[mod(i + j, 4)];
        else if (p.truchetColour === "single") col = cols[0];
        else col = cols[Math.floor(cr(S.seed, i, j, 6) * 4) % 4];

        if (style === "diagonal") {
          c.beginPath();
          if (!flip) { c.moveTo(x0, y0); c.lineTo(x0 + T, y0 + T); }
          else { c.moveTo(x0 + T, y0); c.lineTo(x0, y0 + T); }
          c.lineCap = "round";
          c.lineWidth = lw; c.strokeStyle = rgba(col, 1); c.stroke();
          c.lineCap = "butt";
        } else if (style === "double") {
          var wd = Math.min(lw, d * 1.6);
          [T / 2 - d, T / 2 + d].forEach(function (r) {
            arcs(c, x0, y0, T, flip, r);
            c.lineWidth = wd; c.strokeStyle = rgba(col, 1); c.stroke();
          });
        } else if (style === "band") {
          var bw = Math.max(lw, T * 0.22);
          var o = Math.max(1, lw * 0.5);
          arcs(c, x0, y0, T, flip, T / 2);
          c.lineWidth = bw + 2 * o; c.strokeStyle = darken(col, 0.55); c.stroke();
          c.lineWidth = bw; c.strokeStyle = rgba(col, 1); c.stroke();
        } else {
          arcs(c, x0, y0, T, flip, T / 2);
          c.lineWidth = lw; c.strokeStyle = rgba(col, 1); c.stroke();
        }
      }
    }
  }

  /* =======================================================================
     MAIN ENTRY
     Draws the pattern on a spare canvas (turned by Rotation and big enough
     to reach every corner), then lays it on the real one at the chosen
     opacity. This keeps overlaps clean at any opacity.
     ======================================================================= */
  function draw(target, W, H, p) {
    var off = document.createElement("canvas");
    off.width = W; off.height = H;
    var c = off.getContext("2d");
    var k = Math.min(W, H) / 1500;
    var T = Math.max(8, num(p.tileSize) * k);

    var S = {
      c: c, p: p, k: k, T: T,
      lw: Math.max(1, num(p.lineWeight) * k),
      D: Math.sqrt(W * W + H * H) / 2 + T * 2,
      cols: (p.colors || ["#e63b2e", "#1d3557", "#f2a900", "#2a9d8f"]).slice(0, 4),
      seed: hash(p.seed)
    };

    c.save();
    c.translate(W / 2, H / 2);
    c.rotate(num(p.rotation) * Math.PI / 180);

    var style = p.style;
    if (style === "lattice") lattice(S);
    else if (style === "hex") hex(S);
    else if (style === "truchet") truchet(S);
    else motif(S);

    c.restore();

    target.save();
    target.globalAlpha = clamp(num(p.opacity) || 1, 0, 1);
    target.drawImage(off, 0, 0);
    target.restore();
  }

  window.InkworkStyles = { draw: draw };
})();