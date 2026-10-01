/* Scene renderer: palettes per district, sky, skylines, road, street props and the car. */
(function () {
  'use strict';
  var C = (window.City = window.City || {});
  var TAU = Math.PI * 2;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  var cache = {};
  function hex(h) {
    if (typeof h !== 'string') return h;
    if (cache[h]) return cache[h];
    var n = parseInt(h.slice(1), 16);
    return (cache[h] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]);
  }
  function mix(a, b, t) { a = hex(a); b = hex(b); return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
  function rgba(c, a) { c = hex(c); return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + (a == null ? 1 : +a.toFixed(3)) + ')'; }
  function rng(seed) {
    var s = seed | 0;
    return function () {
      s = (s + 0x6d2b79f5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function glow(ctx, x, y, r, col, a) {
    if (r <= 0 || a <= 0) return;
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(col, a));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function dot(ctx, x, y, r) { if (!(r > 0)) return; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }

  C.u = { clamp: clamp, lerp: lerp, smooth: smooth, hex: hex, mix: mix, rgba: rgba, rng: rng, rr: rr, glow: glow, dot: dot, TAU: TAU };

  /* Clickable areas, rebuilt every frame in CSS pixels. Returns true when the pointer was over this area last frame. */
  C.hits = [];
  C.hover = null;
  C.addHit = function (ctx, x, y, w, h, action) {
    var m = ctx.getTransform(), d = C.dpr || 1;
    var x1 = (m.a * x + m.c * y + m.e) / d, y1 = (m.b * x + m.d * y + m.f) / d;
    var x2 = (m.a * (x + w) + m.c * (y + h) + m.e) / d, y2 = (m.b * (x + w) + m.d * (y + h) + m.f) / d;
    C.hits.push({ x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1), action: action });
    return !!(C.hover && C.hover.action.key === action.key);
  };

  /* ---------- Worlds ---------- */
  var PAL = {
    start:     { skyTop: '#34437a', skyMid: '#c4879f', skyBot: '#f7cda2', sun: '#ffe6b8', sunY: 0.8,  sunR: 44, stars: 0.3,  far: '#8a7fa3', mid: '#5f5886', win: '#ffd89a', lights: 0.45, road: '#3b3a4a', line: '#f3e7c9', pave: '#9a90ad', kerb: '#c6bdd4', verge: '#3f5b50', haze: '#f5b9a2', leaf: '#4d7a5c' },
    ai:        { skyTop: '#040817', skyMid: '#0b1d44', skyBot: '#11506a', sun: '#c8f7ff', sunY: 0.2,  sunR: 30, stars: 1,    far: '#0f2d49', mid: '#0a1c33', win: '#5ef2ff', lights: 1,    road: '#0f131e', line: '#5ef2ff', pave: '#1a2a40', kerb: '#2d4b68', verge: '#0a1520', haze: '#1b7390', leaf: '#1d4d57' },
    strategy:  { skyTop: '#2d6cc0', skyMid: '#6aa7e4', skyBot: '#d4e9fb', sun: '#fff7da', sunY: 0.26, sunR: 38, stars: 0,    far: '#9ab9dc', mid: '#7597c0', win: '#e8f3ff', lights: 0,    road: '#4a5264', line: '#ffffff', pave: '#c9d3df', kerb: '#eaeff4', verge: '#6d9a58', haze: '#e5f1fc', leaf: '#5b8f4a' },
    team:      { skyTop: '#4b98d6', skyMid: '#a3cde8', skyBot: '#ffe0a3', sun: '#fff0bf', sunY: 0.36, sunR: 42, stars: 0,    far: '#bda98b', mid: '#a48169', win: '#fff3d0', lights: 0.05, road: '#5a4f4b', line: '#fff4d6', pave: '#dcc6a4', kerb: '#f1e3c9', verge: '#7ca458', leaf: '#6a9b45', haze: '#ffe8bf' },
    immersive: { skyTop: '#361c5c', skyMid: '#bd4a7c', skyBot: '#ffac5a', sun: '#ffd27c', sunY: 0.74, sunR: 52, stars: 0.35, far: '#7e4270', mid: '#57305f', win: '#ffd27a', lights: 0.75, road: '#3c2944', line: '#ffd27a', pave: '#8c6088', kerb: '#cb97b8', verge: '#3c4a58', haze: '#ff9c6d', leaf: '#3f5e4f' },
    show:      { skyTop: '#090b1c', skyMid: '#181d3c', skyBot: '#3b3562', sun: '#f4f1ff', sunY: 0.18, sunR: 28, stars: 0.9,  far: '#232849', mid: '#171b35', win: '#ffe29a', lights: 1,    road: '#1b1c27', line: '#e8e0c0', pave: '#33344c', kerb: '#4a4b67', verge: '#141925', haze: '#4b3f7c', leaf: '#23372f' },
    end:       { skyTop: '#121838', skyMid: '#3c3e74', skyBot: '#e59b8c', sun: '#ffd8ae', sunY: 0.9,  sunR: 48, stars: 0.7,  far: '#2e305c', mid: '#23264b', win: '#ffd89a', lights: 0.8,  road: '#26283a', line: '#f3e7c9', pave: '#4a4a6b', kerb: '#6b6b8f', verge: '#1f2d33', haze: '#e59b8c', leaf: '#2c4a3c' }
  };
  Object.keys(PAL).forEach(function (w) {
    var p = PAL[w];
    Object.keys(p).forEach(function (key) { if (typeof p[key] === 'string') p[key] = hex(p[key]); });
  });
  C.PAL = PAL;

  C.STOPS = [
    { id: 'start', world: 'start', X: 0 },
    { id: 'ai', world: 'ai', X: 1500 },
    { id: 'strategy', world: 'strategy', X: 3000 },
    { id: 'team', world: 'team', X: 4500, ownLamp: 430 },
    { id: 'immersive', world: 'immersive', X: 6000 },
    { id: 'ex1', world: 'show', X: 7600 },
    { id: 'ex2', world: 'show', X: 8700 },
    { id: 'ex3', world: 'show', X: 9800 },
    { id: 'ex4', world: 'show', X: 10900 },
    { id: 'end', world: 'end', X: 12400 }
  ];

  C.palAt = function (camX) {
    var S = C.STOPS, j = 0;
    while (j < S.length - 2 && camX > S[j + 1].X) j++;
    var a = S[j], b = S[j + 1];
    var u = clamp((camX - a.X) / (b.X - a.X), 0, 1);
    var t = smooth(0.18, 0.82, u);
    var A = PAL[a.world], B = PAL[b.world], P = {};
    Object.keys(A).forEach(function (key) { P[key] = Array.isArray(A[key]) ? mix(A[key], B[key], t) : lerp(A[key], B[key], t); });
    var ww = {};
    ww[a.world] = (ww[a.world] || 0) + (1 - t);
    ww[b.world] = (ww[b.world] || 0) + t;
    return { P: P, ww: ww };
  };

  /* ---------- Sky ---------- */
  var STARS = [], CLOUDS = [], DOTS = [];
  (function () {
    var r = rng(42), i;
    for (i = 0; i < 170; i++) STARS.push({ x: r(), y: r() * r(), s: r() < 0.9 ? 1 : 2, tw: 1 + r() * 3, ph: r() * TAU, b: 0.4 + r() * 0.6 });
    r = rng(7);
    for (i = 0; i < 14; i++) CLOUDS.push({ x: i * 520 + r() * 300, y: 0.1 + r() * 0.34, s: 0.6 + r() * 0.8, n: 3 + ((r() * 3) | 0) });
    r = rng(99);
    for (i = 0; i < 70; i++) DOTS.push({ x: r(), v: 10 + r() * 30, s: 1 + r() * 2.5, o: r() });
  })();

  function drawSky(ctx, S) {
    var P = S.P, W = S.W, hz = S.gy, i;
    var g = ctx.createLinearGradient(0, 0, 0, hz);
    g.addColorStop(0, rgba(P.skyTop));
    g.addColorStop(0.55, rgba(P.skyMid));
    g.addColorStop(1, rgba(P.skyBot));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, hz + 1);

    if (P.stars > 0.02) {
      var span = W + 200, shift = S.camX * S.k * 0.015;
      for (i = 0; i < STARS.length; i++) {
        var s = STARS[i];
        var a = P.stars * s.b * (0.55 + 0.45 * Math.sin(S.t * s.tw + s.ph));
        if (a < 0.03) continue;
        var x = (((s.x * span - shift) % span) + span) % span - 100;
        ctx.fillStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')';
        ctx.fillRect(x, s.y * hz * 0.85, s.s, s.s);
      }
    }

    var sx = W * (S.narrow ? 0.8 : 0.82), sy = hz * P.sunY, r = P.sunR * S.k;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, sx, sy, r * 5, P.sun, 0.26);
    ctx.restore();
    ctx.fillStyle = rgba(P.sun);
    dot(ctx, sx, sy, r);
    if (P.stars > 0.55) {
      ctx.fillStyle = rgba([0, 0, 0], 0.07 * P.stars);
      dot(ctx, sx - 0.3 * r, sy - 0.2 * r, 0.22 * r);
      dot(ctx, sx + 0.25 * r, sy + 0.1 * r, 0.16 * r);
      dot(ctx, sx - 0.05 * r, sy + 0.38 * r, 0.12 * r);
    }

    var ca = (1 - P.stars) * 0.85;
    if (ca > 0.03) {
      ctx.fillStyle = rgba(mix([255, 255, 255], P.skyBot, 0.25), ca);
      var period = 14 * 520;
      for (i = 0; i < CLOUDS.length; i++) {
        var c = CLOUDS[i];
        var wx = c.x - S.camX * 0.08 - S.t * 4;
        wx = ((wx % period) + period) % period - 400;
        var cx = wx * S.k, cy = c.y * hz, cs = c.s * S.k;
        ctx.beginPath();
        for (var n = 0; n < c.n; n++) {
          var ox = (n - (c.n - 1) / 2) * 34 * cs, oy = (n % 2 ? -10 : 4) * cs, cr = (n % 2 ? 30 : 24) * cs;
          ctx.moveTo(cx + ox + cr, cy + oy);
          ctx.arc(cx + ox, cy + oy, cr, 0, TAU);
        }
        ctx.fill();
      }
    }
  }

  /* ---------- District atmosphere ---------- */
  var FX = (C.fx = { puffs: [], sparks: [], nextBurst: 0, shoot: null, nextShoot: 0, pt: 0 });
  var SPARK_COLS = [[255, 210, 122], [255, 120, 170], [140, 220, 255], [190, 150, 255], [255, 255, 255]];

  function burst(S) {
    var x = S.W * (0.42 + Math.random() * 0.5), y = S.gy * (0.12 + Math.random() * 0.25);
    var col = SPARK_COLS[(Math.random() * SPARK_COLS.length) | 0];
    for (var i = 0; i < 46; i++) {
      var a = (i / 46) * TAU, sp = (60 + Math.random() * 80) * S.k, life = 1.1 + Math.random() * 0.7;
      FX.sparks.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: life, max: life, c: col });
    }
  }

  function drawEffects(ctx, S) {
    var w = S.ww, W = S.W, hz = S.gy, t = S.t, k = S.k, i, x, y, g;

    var wa = w.ai || 0;
    if (wa > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (var b = 0; b < 2; b++) {
        var col = b ? [120, 90, 255] : [60, 240, 255];
        g = ctx.createLinearGradient(0, hz * 0.1, 0, hz * 0.62);
        g.addColorStop(0, rgba(col, 0));
        g.addColorStop(0.5, rgba(col, 0.17 * wa));
        g.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = g;
        var base = hz * (0.26 + b * 0.1), amp = hz * 0.06;
        ctx.beginPath();
        ctx.moveTo(0, base + hz * 0.2);
        for (x = 0; x <= W + 24; x += 24) ctx.lineTo(x, base + Math.sin(x * 0.004 + t * 0.4 + b * 2 - S.camX * 0.0008) * amp + Math.sin(x * 0.011 + t * 0.7) * amp * 0.3);
        for (x = W + 24; x >= 0; x -= 24) ctx.lineTo(x, base + hz * 0.18 + Math.sin(x * 0.005 + t * 0.3 + b) * amp * 0.6);
        ctx.closePath();
        ctx.fill();
      }
      for (i = 0; i < DOTS.length; i++) {
        var d = DOTS[i], span = W * 1.2;
        y = hz - ((t * d.v + d.o * hz) % hz);
        x = (((d.x * span - S.camX * k * 0.3) % span) + span) % span - W * 0.1;
        ctx.fillStyle = rgba([94, 242, 255], wa * 0.7 * (y / hz));
        ctx.fillRect(x, y, d.s, d.s);
      }
      ctx.restore();
    }

    var ws = w.strategy || 0;
    if (ws > 0.01) {
      ctx.save();
      ctx.strokeStyle = rgba([255, 255, 255], 0.13 * ws);
      ctx.lineWidth = 1;
      var step = 44 * k, ox = -((S.camX * k * 0.12) % step);
      ctx.beginPath();
      for (x = ox; x < W; x += step) { ctx.moveTo((x | 0) + 0.5, 0); ctx.lineTo((x | 0) + 0.5, hz); }
      for (y = step * 0.5; y < hz; y += step) { ctx.moveTo(0, (y | 0) + 0.5); ctx.lineTo(W, (y | 0) + 0.5); }
      ctx.stroke();
      var ccx = W * 0.58 - (S.camX - 3000) * k * 0.12, ccy = hz * 0.34, cr = 150 * k;
      ctx.strokeStyle = rgba([255, 255, 255], 0.3 * ws);
      ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.arc(ccx, ccy, cr, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(ccx, ccy, cr * 0.55, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(ccx - cr, ccy + cr + 16 * k); ctx.lineTo(ccx + cr, ccy + cr + 16 * k);
      ctx.moveTo(ccx - cr, ccy + cr + 10 * k); ctx.lineTo(ccx - cr, ccy + cr + 22 * k);
      ctx.moveTo(ccx + cr, ccy + cr + 10 * k); ctx.lineTo(ccx + cr, ccy + cr + 22 * k);
      ctx.moveTo(ccx - 6 * k, ccy); ctx.lineTo(ccx + 6 * k, ccy); ctx.moveTo(ccx, ccy - 6 * k); ctx.lineTo(ccx, ccy + 6 * k);
      ctx.stroke();
      ctx.restore();
    }

    var wb = (w.team || 0) + (w.start || 0) * 0.6;
    if (wb > 0.02) {
      ctx.strokeStyle = rgba([40, 40, 60], 0.5 * Math.min(1, wb));
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      for (i = 0; i < 6; i++) {
        var loop = W + 300;
        var bx = (((i * 170 + t * 38 - S.camX * k * 0.05) % loop) + loop) % loop - 150;
        var by = hz * 0.22 + (i % 3) * 22 * k + Math.sin(t * 1.3 + i) * 8;
        var f = Math.sin(t * 9 + i * 1.7) * 5, s = k * (0.8 + (i % 2) * 0.3);
        ctx.beginPath();
        ctx.moveTo(bx - 9 * s, by - f * s * 0.6);
        ctx.quadraticCurveTo(bx - 4 * s, by - 4 * s, bx, by);
        ctx.quadraticCurveTo(bx + 4 * s, by - 4 * s, bx + 9 * s, by - f * s * 0.6);
        ctx.stroke();
      }
    }

    var wi = w.immersive || 0;
    if (wi > 0.3 && !S.reduce && t > FX.nextBurst) { burst(S); FX.nextBurst = t + 0.7 + Math.random() * 1.1; }
    if (FX.sparks.length) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (i = FX.sparks.length - 1; i >= 0; i--) {
        var p = FX.sparks[i];
        p.life -= S.dt;
        if (p.life <= 0) { FX.sparks.splice(i, 1); continue; }
        p.vy += 55 * k * S.dt; p.vx *= 0.985; p.vy *= 0.985;
        p.x += p.vx * S.dt; p.y += p.vy * S.dt;
        ctx.fillStyle = rgba(p.c, Math.min(1, (p.life / p.max) * 1.4) * wi);
        ctx.fillRect(p.x - 1.3, p.y - 1.3, 2.6, 2.6);
      }
      ctx.restore();
    }

    var wsh = w.show || 0;
    if (wsh > 0.02) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (i = 0; i < 2; i++) {
        var lx = W * (0.3 + i * 0.45), ang = -Math.PI / 2 + Math.sin(t * 0.35 + i * 2.2) * 0.5, len = hz * 1.2, wd = 0.07;
        g = ctx.createLinearGradient(lx, hz, lx + Math.cos(ang) * len, hz + Math.sin(ang) * len);
        g.addColorStop(0, rgba([200, 210, 255], 0.2 * wsh));
        g.addColorStop(1, rgba([200, 210, 255], 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(lx, hz);
        ctx.lineTo(lx + Math.cos(ang - wd) * len, hz + Math.sin(ang - wd) * len);
        ctx.lineTo(lx + Math.cos(ang + wd) * len, hz + Math.sin(ang + wd) * len);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    var we = w.end || 0;
    if (we > 0.3 && !S.reduce && !FX.shoot && t > FX.nextShoot) FX.shoot = { x: W * (0.35 + Math.random() * 0.6), y: hz * (0.05 + Math.random() * 0.2), life: 0 };
    if (FX.shoot) {
      var sh = FX.shoot;
      sh.life += S.dt;
      var q = sh.life / 0.9;
      if (q >= 1) { FX.shoot = null; FX.nextShoot = t + 2.5 + Math.random() * 3; }
      else {
        x = sh.x - q * 260 * k; y = sh.y + q * 120 * k;
        g = ctx.createLinearGradient(x, y, x + 90 * k, y - 42 * k);
        g.addColorStop(0, 'rgba(255,255,255,' + (1 - q).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = g;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 90 * k, y - 42 * k); ctx.stroke();
      }
    }
  }

  /* ---------- Skylines ---------- */
  function skyline(ctx, S, o) {
    var k = S.k * o.scale, W = S.W, P = S.P, lit = P.lights;
    var left = S.camX * o.f - S.carSX / k;
    var i0 = Math.floor(left / o.bw) - 2, i1 = Math.ceil((left + W / k) / o.bw) + 1;
    var base = S.gy;
    for (var i = i0; i <= i1; i++) {
      var r = rng(i * 7919 + o.seed);
      var h = lerp(o.minH, o.maxH, Math.pow(r(), 1.3)), w = o.bw * (0.62 + r() * 0.5);
      var x = S.carSX + (i * o.bw - S.camX * o.f) * k, bw = w * k, bh = h * k, top = base - bh;
      ctx.fillStyle = rgba(o.col);
      ctx.fillRect(x, top, bw, bh + 1);
      var rf = r();
      if (rf < 0.22) ctx.fillRect(x + bw * 0.48, top - 22 * k, 2.2 * k, 22 * k);
      else if (rf < 0.36) { ctx.beginPath(); ctx.moveTo(x, top + 0.5); ctx.lineTo(x + bw * 0.5, top - bw * 0.32); ctx.lineTo(x + bw, top + 0.5); ctx.fill(); }
      else if (rf < 0.52) ctx.fillRect(x + bw * 0.18, top - 12 * k, bw * 0.64, 12 * k);
      if (!o.win) continue;
      var cols = Math.max(2, Math.floor(w / 16)), rows = Math.floor((h - 14) / 22), cw = bw / cols;
      for (var ri = 0; ri < rows; ri++) {
        for (var c = 0; c < cols; c++) {
          var v = r();
          var wx = x + c * cw + cw * 0.3, wy = top + 10 * k + ri * 22 * k;
          if (v < 0.22 + 0.4 * lit) {
            if (lit > 0.05) { ctx.fillStyle = rgba(P.win, lit * o.win * (0.5 + 0.5 * ((v * 7) % 1))); ctx.fillRect(wx, wy, cw * 0.4, 9 * k); }
          } else if (lit < 0.9 && v > 0.8) {
            ctx.fillStyle = rgba([255, 255, 255], 0.09 * (1 - lit));
            ctx.fillRect(wx, wy, cw * 0.4, 9 * k);
          }
        }
      }
    }
  }

  function haze(ctx, S, a) {
    var h = 200 * S.k, g = ctx.createLinearGradient(0, S.gy - h, 0, S.gy);
    g.addColorStop(0, rgba(S.P.haze, 0));
    g.addColorStop(1, rgba(S.P.haze, a));
    ctx.fillStyle = g;
    ctx.fillRect(0, S.gy - h, S.W, h);
  }

  /* ---------- Hero buildings (drawn by buildings.js) ---------- */
  function buildings(ctx, S) {
    var B = C.B || {};
    for (var i = 0; i < C.STOPS.length; i++) {
      var s = C.STOPS[i], fn = B[s.id];
      var x = S.carSX + (s.X + S.bOff - S.camX) * S.k;
      if (!fn || x < -900 * S.k || x > S.W + 900 * S.k) continue;
      ctx.save();
      ctx.translate(x, S.gy);
      ctx.scale(S.k, S.k);
      fn(ctx, S, S.sw[i] || 0);
      ctx.restore();
    }
  }

  /* ---------- Street ---------- */
  function chequer(ctx, S, X) {
    var x = S.carSX + (X - S.camX) * S.k, sz = S.roadH / 6;
    if (x < -60 || x > S.W + 60) return;
    for (var r = 0; r < 6; r++) for (var c = 0; c < 2; c++) {
      ctx.fillStyle = (r + c) % 2 ? 'rgba(255,255,255,.85)' : 'rgba(20,20,24,.85)';
      ctx.fillRect(x + c * sz, S.roadTop + r * sz, sz, sz);
    }
  }

  function street(ctx, S) {
    var W = S.W, k = S.k, P = S.P, gy = S.gy, rt = S.roadTop, rh = S.roadH, n, n0, n1, x;
    ctx.fillStyle = rgba(P.pave);
    ctx.fillRect(0, gy, W, rt - gy);
    ctx.fillStyle = 'rgba(0,0,0,.09)';
    var sp = 60;
    n0 = Math.floor((S.camX - S.carSX / k) / sp) - 1; n1 = n0 + Math.ceil(W / (sp * k)) + 2;
    for (n = n0; n <= n1; n++) { x = S.carSX + (n * sp - S.camX) * k; ctx.fillRect(x, gy, 1, rt - gy); }
    ctx.fillStyle = rgba(P.kerb);
    ctx.fillRect(0, rt - 4 * k, W, 4 * k);
    var g = ctx.createLinearGradient(0, rt, 0, rt + rh);
    g.addColorStop(0, rgba(mix(P.road, [0, 0, 0], 0.2)));
    g.addColorStop(1, rgba(P.road));
    ctx.fillStyle = g;
    ctx.fillRect(0, rt, W, rh);
    ctx.fillStyle = rgba(P.line, 0.4);
    ctx.fillRect(0, rt + 5 * k, W, 2 * k);
    ctx.fillRect(0, rt + rh - 7 * k, W, 2 * k);
    var dl = 48, per = 86, y = rt + rh * 0.5 - 2 * k;
    n0 = Math.floor((S.camX - S.carSX / k) / per) - 1; n1 = n0 + Math.ceil(W / (per * k)) + 2;
    ctx.fillStyle = rgba(P.line, 0.9);
    for (n = n0; n <= n1; n++) { x = S.carSX + (n * per - S.camX) * k; ctx.fillRect(x, y, dl * k, 4 * k); }
    ctx.fillStyle = rgba(P.kerb, 0.8);
    ctx.fillRect(0, rt + rh, W, 3 * k);
    ctx.fillStyle = rgba(P.verge);
    ctx.fillRect(0, rt + rh + 3 * k, W, S.H);
    chequer(ctx, S, 110);
    chequer(ctx, S, C.STOPS[C.STOPS.length - 1].X - 160);
  }

  function tree(ctx, S, x, y, s, ph) {
    var P = S.P, sway = Math.sin(S.t * 1.2 + ph) * 2 * s;
    ctx.fillStyle = rgba(mix(P.leaf, [40, 30, 20], 0.55));
    ctx.fillRect(x - 3 * s, y - 50 * s, 6 * s, 50 * s);
    ctx.fillStyle = rgba(P.leaf);
    ctx.beginPath();
    var blobs = [[0, -80, 26], [-19, -63, 20], [19, -61, 21], [0, -54, 18]];
    for (var i = 0; i < blobs.length; i++) {
      var b = blobs[i], bx = x + b[0] * s + sway, by = y + b[1] * s;
      ctx.moveTo(bx + b[2] * s, by);
      ctx.arc(bx, by, b[2] * s, 0, TAU);
    }
    ctx.fill();
    ctx.fillStyle = rgba(mix(P.leaf, [255, 255, 255], 0.18));
    dot(ctx, x - 8 * s + sway, y - 88 * s, 10 * s);
  }
  C.u.tree = tree;

  function lamp(ctx, S, x, y) {
    var k = S.k, P = S.P, h = 150 * k;
    ctx.fillStyle = rgba(mix(P.mid, [0, 0, 0], 0.35));
    ctx.fillRect(x - 2 * k, y - h, 4 * k, h);
    ctx.fillRect(x - 2 * k, y - h, 26 * k, 3 * k);
    ctx.beginPath();
    ctx.moveTo(x + 14 * k, y - h + 2 * k); ctx.lineTo(x + 32 * k, y - h + 2 * k);
    ctx.lineTo(x + 28 * k, y - h + 10 * k); ctx.lineTo(x + 18 * k, y - h + 10 * k);
    ctx.fill();
    if (P.lights > 0.15) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, x + 23 * k, y - h + 10 * k, 40 * k, [255, 220, 150], 0.5 * P.lights);
      var bottom = S.roadTop + S.roadH;
      var g = ctx.createLinearGradient(0, y - h + 10 * k, 0, bottom);
      g.addColorStop(0, rgba([255, 220, 150], 0.15 * P.lights));
      g.addColorStop(1, rgba([255, 220, 150], 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x + 18 * k, y - h + 10 * k); ctx.lineTo(x + 28 * k, y - h + 10 * k);
      ctx.lineTo(x + 84 * k, bottom); ctx.lineTo(x - 38 * k, bottom);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function nearBuilding(S, X, d) {
    for (var i = 0; i < C.STOPS.length; i++) if (Math.abs(X - (C.STOPS[i].X + S.bOff)) < d) return true;
    return false;
  }

  function ownLamp(S, X) {
    for (var i = 0; i < C.STOPS.length; i++) { var s = C.STOPS[i]; if (s.ownLamp && Math.abs(X - (s.X + S.bOff)) < s.ownLamp) return true; }
    return false;
  }

  function props(ctx, S) {
    var k = S.k, base = S.gy + (S.roadTop - S.gy) * 0.35, n, X;
    var left = S.camX - S.carSX / k - 200, right = S.camX + (S.W - S.carSX) / k + 200;
    for (n = Math.floor(left / 300); n <= Math.ceil(right / 300); n++) {
      var r = rng(n * 131 + 5);
      X = n * 300 + r() * 120;
      if (r() < 0.35 || nearBuilding(S, X, 440)) continue;
      tree(ctx, S, S.carSX + (X - S.camX) * k, base, k * (0.8 + r() * 0.5), r() * 6);
    }
    for (n = Math.floor(left / 480); n <= Math.ceil(right / 480); n++) {
      X = n * 480 + 200;
      if (ownLamp(S, X)) continue;
      lamp(ctx, S, S.carSX + (X - S.camX) * k, base);
    }
  }

  function foreground(ctx, S) {
    var k = S.k, P = S.P, y = S.roadTop + S.roadH + 3 * k, f = 1.25, sp = 220;
    if (S.H - y < 8) return;
    var left = S.camX * f - S.carSX / k - 100, right = left + S.W / k + 200;
    ctx.fillStyle = rgba(mix(P.verge, [0, 0, 0], 0.25));
    for (var n = Math.floor(left / sp); n <= Math.ceil(right / sp); n++) {
      var r = rng(n * 37 + 11);
      if (r() < 0.4) continue;
      var x = S.carSX + (n * sp + r() * 80 - S.camX * f) * k, s = k * (0.7 + r() * 0.6);
      ctx.beginPath();
      ctx.arc(x, y + 12 * s, 16 * s, Math.PI, 0);
      ctx.arc(x + 18 * s, y + 14 * s, 12 * s, Math.PI, 0);
      ctx.arc(x - 16 * s, y + 15 * s, 10 * s, Math.PI, 0);
      ctx.fill();
    }
  }

  /* ---------- The car ---------- */
  C.carY = function (S) { return S.roadTop + S.roadH * 0.7; };

  function puffs(ctx, S) {
    var k = S.k * 1.08, P = S.P, i;
    if (!S.reduce) {
      FX.pt += S.dt * (3 + Math.min(10, Math.abs(S.speed) / 60));
      while (FX.pt > 1) {
        FX.pt -= 1;
        FX.puffs.push({ x: S.carSX - 100 * k, y: C.carY(S) - 19 * k - S.bob * k, vx: -(20 + Math.abs(S.speed) * S.k * 0.35) - Math.random() * 12, vy: -8 - Math.random() * 10, life: 0, max: 1 + Math.random() * 0.6, r: 4 * k });
      }
    }
    var col = mix([235, 235, 240], P.skyBot, 0.3);
    for (i = FX.puffs.length - 1; i >= 0; i--) {
      var p = FX.puffs[i];
      p.life += S.dt;
      if (p.life > p.max) { FX.puffs.splice(i, 1); continue; }
      p.x += p.vx * S.dt; p.y += p.vy * S.dt; p.r += 10 * k * S.dt;
      ctx.fillStyle = rgba(col, 0.32 * (1 - p.life / p.max));
      dot(ctx, p.x, p.y, p.r);
    }
  }

  function wheel(ctx, x, y, a) {
    ctx.fillStyle = '#111115'; dot(ctx, x, y, 17);
    ctx.fillStyle = '#2b2c33'; dot(ctx, x, y, 11.5);
    ctx.fillStyle = '#d8312b';
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.6);
    rr(ctx, 5, -4, 5, 8, 2); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#c9ccd6'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath();
    for (var i = 0; i < 5; i++) {
      var an = a + i * 1.2566;
      ctx.moveTo(x + Math.cos(an) * 2.5, y + Math.sin(an) * 2.5);
      ctx.lineTo(x + Math.cos(an + 0.12) * 10.5, y + Math.sin(an + 0.12) * 10.5);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, 11.5, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#e9ebf0'; dot(ctx, x, y, 2.4);
  }

  function car(ctx, S) {
    var k = S.k * 1.08, x = S.carSX, y = C.carY(S), P = S.P;
    ctx.fillStyle = 'rgba(0,0,0,.32)';
    ctx.beginPath(); ctx.ellipse(x, y + k, 100 * k, 6 * k, 0, 0, TAU); ctx.fill();

    if (P.lights > 0.12) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var g = ctx.createLinearGradient(x + 92 * k, 0, x + 360 * k, 0);
      g.addColorStop(0, rgba([235, 245, 255], 0.5 * P.lights));
      g.addColorStop(1, rgba([235, 245, 255], 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x + 92 * k, y - 38 * k - S.bob * k); ctx.lineTo(x + 360 * k, y - 66 * k);
      ctx.lineTo(x + 360 * k, y + 6 * k); ctx.lineTo(x + 92 * k, y - 32 * k - S.bob * k);
      ctx.closePath(); ctx.fill();
      glow(ctx, x - 94 * k, y - 42 * k - S.bob * k, 26 * k, [255, 50, 50], 0.55 * P.lights);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(k, k);
    ctx.save();
    ctx.translate(0, -S.bob);
    ctx.rotate(S.tilt);

    // rear wing
    ctx.fillStyle = '#16161b';
    ctx.fillRect(-86, -60, 4, 12); ctx.fillRect(-74, -58, 4, 10);
    ctx.beginPath(); ctx.moveTo(-102, -63); ctx.lineTo(-66, -62); ctx.lineTo(-68, -57); ctx.lineTo(-100, -58); ctx.closePath(); ctx.fill();

    // body: low wedge
    var body = ctx.createLinearGradient(0, -76, 0, -16);
    body.addColorStop(0, '#ffe36a');
    body.addColorStop(0.55, '#f5c81f');
    body.addColorStop(1, '#c99a0c');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-92, -22);
    ctx.lineTo(-95, -40);
    ctx.lineTo(-88, -49);
    ctx.quadraticCurveTo(-62, -53, -42, -55);
    ctx.bezierCurveTo(-22, -75, 18, -77, 34, -61);
    ctx.lineTo(60, -49);
    ctx.quadraticCurveTo(90, -45, 98, -34);
    ctx.lineTo(98, -25);
    ctx.quadraticCurveTo(96, -16, 86, -16);
    ctx.lineTo(-84, -16);
    ctx.quadraticCurveTo(-92, -16, -92, -22);
    ctx.closePath();
    ctx.fill();

    // glass
    ctx.fillStyle = rgba(mix([150, 190, 225], [22, 30, 52], P.lights * 0.85), 0.96);
    ctx.beginPath();
    ctx.moveTo(-34, -56);
    ctx.bezierCurveTo(-17, -70, 13, -71, 28, -60);
    ctx.lineTo(31, -56);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#16161b';
    ctx.beginPath(); ctx.moveTo(-6, -68); ctx.lineTo(-2, -68); ctx.lineTo(-1, -56); ctx.lineTo(-6, -56); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(15,15,22,.85)';
    dot(ctx, 8, -61, 5.5);
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath(); ctx.moveTo(14, -67); ctx.lineTo(19, -66); ctx.lineTo(13, -57); ctx.lineTo(8, -57); ctx.closePath(); ctx.fill();

    // shoulder highlight and twin stripes
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-86, -47); ctx.quadraticCurveTo(-40, -50, 34, -47); ctx.lineTo(70, -44); ctx.stroke();
    ctx.fillStyle = '#171717';
    ctx.beginPath(); ctx.moveTo(-90, -36); ctx.lineTo(94, -32); ctx.lineTo(94, -29); ctx.lineTo(-90, -33); ctx.closePath(); ctx.fill();

    // side intake, door line, mirror
    ctx.beginPath(); ctx.moveTo(-40, -42); ctx.lineTo(-18, -40); ctx.lineTo(-24, -26); ctx.lineTo(-44, -27); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-14, -55); ctx.lineTo(-10, -20); ctx.stroke();
    ctx.fillStyle = '#16161b'; rr(ctx, 26, -60, 9, 5, 2); ctx.fill();

    // lights
    ctx.fillStyle = '#eef6ff';
    ctx.beginPath(); ctx.moveTo(80, -43); ctx.lineTo(96, -37); ctx.lineTo(95, -34); ctx.lineTo(78, -39); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff3b3b'; rr(ctx, -96, -45, 5, 7, 2); ctx.fill();

    // splitter, side skirt, diffuser
    ctx.fillStyle = '#16161b';
    rr(ctx, 76, -20, 26, 4, 2); ctx.fill();
    rr(ctx, -76, -21, 150, 5, 2); ctx.fill();
    rr(ctx, -98, -22, 18, 6, 2); ctx.fill();
    ctx.fillStyle = '#9aa0ab'; dot(ctx, -94, -19, 2.2); dot(ctx, -88, -19, 2.2);

    // arches
    ctx.fillStyle = '#121216';
    ctx.beginPath(); ctx.arc(-56, -17, 22, Math.PI, 0); ctx.fill();
    ctx.beginPath(); ctx.arc(58, -17, 22, Math.PI, 0); ctx.fill();
    ctx.restore();

    wheel(ctx, -56, -17, S.wheelA);
    wheel(ctx, 58, -17, S.wheelA);
    ctx.restore();
  }

  /* ---------- Collectible star ---------- */
  C.drawStar = function (ctx, x, y, r, rot, fill, stroke) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = rot - Math.PI / 2 + (i * Math.PI) / 5, rad = i % 2 ? r * 0.45 : r;
      ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
  };

  /* ---------- Frame ---------- */
  C.render = function (ctx, S) {
    drawSky(ctx, S);
    drawEffects(ctx, S);
    skyline(ctx, S, { f: 0.14, bw: 70, minH: 70, maxH: 250, col: S.P.far, seed: 11, scale: 0.8, win: 0.45 });
    haze(ctx, S, 0.35);
    skyline(ctx, S, { f: 0.38, bw: 118, minH: 90, maxH: 320, col: S.P.mid, seed: 23, scale: 0.9, win: 0.95 });
    haze(ctx, S, 0.16);
    buildings(ctx, S);
    street(ctx, S);
    props(ctx, S);
    if (S.beforeCar) S.beforeCar(ctx, S);
    puffs(ctx, S);
    car(ctx, S);
    foreground(ctx, S);
  };
})();
