/* Hero buildings, one per stop. Drawn in unit space: origin at the building's base centre, y up is negative. */
(function () {
  'use strict';
  var C = window.City, U = C.u, rgba = U.rgba, mix = U.mix, rr = U.rr, glow = U.glow, dot = U.dot, lerp = U.lerp, TAU = U.TAU;
  var B = (C.B = {});
  var MONO = '"IBM Plex Mono", Consolas, monospace', DISP = 'Fraunces, Georgia, serif', BODY = 'Poppins, "Segoe UI", sans-serif';
  var STAGE = [[128, 128, 128], [44, 160, 216], [92, 182, 50], [236, 124, 36], [224, 44, 40]];

  /* Pull a colour toward the night sky as the district's lights come on. */
  function nt(S, col, amt) { return rgba(mix(col, S.P.skyTop, S.P.lights * 0.5 * (amt == null ? 1 : amt))); }

  function label(ctx, str, x, y, size, col, o) {
    o = o || {};
    ctx.font = (o.w || 600) + ' ' + size + 'px ' + (o.f || BODY);
    ctx.textAlign = o.a || 'center';
    ctx.textBaseline = 'middle';
    var ls = 'letterSpacing' in ctx;
    if (ls) ctx.letterSpacing = (o.ls || 0) + 'px';
    ctx.fillStyle = col;
    ctx.fillText(str, x, y);
    if (ls) ctx.letterSpacing = '0px';
  }

  function arch(ctx, x, y, w, h) {
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y + w / 2);
    ctx.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
  }

  var IMG = {};
  var SRC = { exec: 'img/exec-simulation.jpg', fluency: 'img/CREW.jpg', task: 'img/task-people.jpg', safety: 'img/safety-training.jpg' };
  Object.keys(SRC).forEach(function (key) { var im = new Image(); im.src = SRC[key]; IMG[key] = im; });

  /* A framed screen on a facade showing a real piece of the work. Click it to enlarge (card = the case card's id). */
  function screen(ctx, S, img, x, y, w, h, card) {
    var hov = C.addHit(ctx, x - 6, y - 6, w + 12, h + 12, { key: 'img-' + card, img: img, card: card });
    if (hov) { ctx.fillStyle = '#f7e26b'; rr(ctx, x - 10, y - 10, w + 20, h + 20, 8); ctx.fill(); }
    ctx.fillStyle = '#15151c';
    rr(ctx, x - 6, y - 6, w + 12, h + 12, 6); ctx.fill();
    if (img.complete && img.naturalWidth) {
      var ir = img.naturalWidth / img.naturalHeight, r = w / h, sw = img.naturalWidth, sh = img.naturalHeight, sx = 0, sy = 0;
      if (ir > r) { sw = sh * r; sx = (img.naturalWidth - sw) / 2; } else { sh = sw / r; sy = (img.naturalHeight - sh) / 2; }
      ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
    } else {
      ctx.fillStyle = '#2a2a36'; ctx.fillRect(x, y, w, h);
    }
    var g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, 'rgba(255,255,255,.16)');
    g.addColorStop(0.45, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    if (S.P.lights > 0.2) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      glow(ctx, x + w / 2, y + h / 2, Math.max(w, h) * 0.75, [200, 220, 255], 0.09 * S.P.lights);
      ctx.restore();
    }
    /* enlarge badge in the corner */
    var bx = x + w - 24, by = y + h - 24;
    ctx.fillStyle = hov ? '#f7e26b' : 'rgba(15,15,22,.7)';
    rr(ctx, bx, by, 18, 18, 4); ctx.fill();
    ctx.strokeStyle = hov ? '#171717' : '#ffffff'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bx + 5, by + 13); ctx.lineTo(bx + 13, by + 5);
    ctx.moveTo(bx + 9, by + 5); ctx.lineTo(bx + 13, by + 5); ctx.lineTo(bx + 13, by + 9);
    ctx.moveTo(bx + 5, by + 9); ctx.lineTo(bx + 5, by + 13); ctx.lineTo(bx + 9, by + 13);
    ctx.stroke();
  }

  /* Chasing marquee bulbs around a rectangle. */
  function bulbs(ctx, S, x, y, w, h, gap) {
    var pts = [], i;
    for (i = 0; i <= w; i += gap) { pts.push([x + i, y]); }
    for (i = gap; i <= h; i += gap) { pts.push([x + w, y + i]); }
    for (i = w - gap; i >= 0; i -= gap) { pts.push([x + i, y + h]); }
    for (i = h - gap; i > 0; i -= gap) { pts.push([x, y + i]); }
    var step = Math.floor(S.t * 8);
    for (i = 0; i < pts.length; i++) {
      var on = (i + step) % 3 === 0;
      if (on && S.P.lights > 0.1) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, pts[i][0], pts[i][1], 9, [255, 220, 140], 0.7 * S.P.lights); ctx.restore(); }
      ctx.fillStyle = on ? '#fff3c4' : 'rgba(255,230,170,.35)';
      dot(ctx, pts[i][0], pts[i][1], 2.6);
    }
  }

  function figure(ctx, x, y, s, arm) {
    dot(ctx, x, y - 30 * s, 7 * s);
    rr(ctx, x - 9 * s, y - 22 * s, 18 * s, 24 * s, 8 * s); ctx.fill();
    if (arm != null) {
      ctx.save(); ctx.translate(x + 6 * s, y - 18 * s); ctx.rotate(arm);
      ctx.fillRect(0, -2 * s, 16 * s, 4 * s);
      ctx.restore();
    }
  }

  function flag(ctx, S, x, y, w, h, col, ph) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (var s = 0; s <= w; s += 2) ctx.lineTo(x + s, y + Math.sin(S.t * 5 + s * 0.25 + ph) * 2.5 * (s / w));
    for (s = w; s >= 0; s -= 2) ctx.lineTo(x + s, y + h + Math.sin(S.t * 5 + s * 0.25 + ph) * 2.5 * (s / w));
    ctx.closePath(); ctx.fill();
  }

  /* ---------- Start: home, and the road sign for the drive ahead ---------- */
  B.start = function (ctx, S) {
    var t = S.t, L = S.P.lights, i;
    ctx.fillStyle = nt(S, '#6d6f78'); ctx.fillRect(-222, -150, 6, 150); ctx.fillRect(-84, -150, 6, 150);
    ctx.fillStyle = '#ffffff'; rr(ctx, -264, -304, 228, 172, 12); ctx.fill();
    ctx.fillStyle = '#0f6b45'; rr(ctx, -260, -300, 220, 164, 10); ctx.fill();
    label(ctx, 'THE ROAD AHEAD', -150, -281, 10.5, '#ffffff', { f: MONO, ls: 1.5 });
    var rows = [['AI Works', '1'], ['Strategy House', '2'], ['The Coach House', '3'], ['Immersive Park', '4'], ['Showcase Row', '5']];
    for (i = 0; i < rows.length; i++) {
      var ry = -256 + i * 23;
      if (C.addHit(ctx, -254, ry - 11, 210, 22, { key: 'go' + (i + 1), go: i + 1 })) {
        ctx.fillStyle = 'rgba(255,255,255,.2)'; rr(ctx, -254, ry - 11, 210, 22, 4); ctx.fill();
      }
      label(ctx, rows[i][0], -246, ry, 14, '#ffffff', { a: 'left', w: 600 });
      ctx.fillStyle = '#ffd23f'; rr(ctx, -76, ry - 9, 24, 18, 3); ctx.fill();
      label(ctx, rows[i][1], -64, ry + 1, 12, '#0f6b45', { w: 700 });
    }

    ctx.fillStyle = nt(S, '#555a66'); ctx.fillRect(-12, -40, 4, 40);
    ctx.fillStyle = nt(S, '#c8423b'); rr(ctx, -26, -60, 30, 21, 6); ctx.fill();
    label(ctx, 'LEE', -11, -49, 8, '#ffffff', { w: 700 });

    var wall = nt(S, '#efe3d0'), roof = nt(S, '#9a4f3d');
    ctx.fillStyle = roof; ctx.fillRect(150, -222, 18, 44);
    if (!S.reduce) {
      for (i = 0; i < 4; i++) {
        var p = (t * 0.35 + i / 4) % 1;
        ctx.fillStyle = rgba([235, 235, 240], 0.35 * (1 - p));
        dot(ctx, 159 + p * 30 + Math.sin(t + i) * 4, -230 - p * 80, 6 + p * 14);
      }
    }
    ctx.fillStyle = wall; ctx.fillRect(20, -150, 170, 150);
    ctx.fillStyle = roof;
    ctx.beginPath(); ctx.moveTo(6, -148); ctx.lineTo(105, -224); ctx.lineTo(204, -148); ctx.closePath(); ctx.fill();
    var lit = rgba(mix([176, 206, 232], [255, 212, 138], Math.min(1, L * 1.4)));
    [[40, -130], [130, -130]].forEach(function (wp) {
      ctx.fillStyle = nt(S, '#ffffff'); ctx.fillRect(wp[0] - 4, wp[1] - 4, 48, 44);
      ctx.fillStyle = lit; ctx.fillRect(wp[0], wp[1], 40, 36);
      ctx.fillStyle = nt(S, '#ffffff'); ctx.fillRect(wp[0] + 19, wp[1], 2, 36); ctx.fillRect(wp[0], wp[1] + 17, 40, 2);
    });
    ctx.fillStyle = nt(S, '#2f5d7c'); rr(ctx, 86, -68, 38, 68, 4); ctx.fill();
    ctx.fillStyle = '#e8c35a'; dot(ctx, 116, -33, 2.5);

    ctx.fillStyle = nt(S, '#e4d6c1'); ctx.fillRect(190, -104, 132, 104);
    ctx.fillStyle = nt(S, '#8a8f99'); ctx.fillRect(184, -112, 144, 10);
    ctx.fillStyle = '#23232b'; ctx.fillRect(206, -88, 100, 88);
    ctx.fillStyle = nt(S, '#cfd3da');
    for (i = 0; i < 3; i++) ctx.fillRect(206, -88 + i * 7, 100, 5);
    ctx.fillStyle = 'rgba(247,226,107,.18)'; ctx.fillRect(206, -6, 100, 6);
  };

  /* ---------- 1. AI Works ---------- */
  B.ai = function (ctx, S, w) {
    var t = S.t, i, r, c;
    ctx.fillStyle = nt(S, '#15314f', 0.4); ctx.fillRect(-330, -150, 150, 150);
    ctx.fillStyle = nt(S, '#0e2238', 0.4); ctx.fillRect(-336, -158, 162, 10);
    for (r = 0; r < 6; r++) for (c = 0; c < 8; c++) {
      var on = Math.sin(t * 3 + r * 1.7 + c * 2.3) > 0.2;
      ctx.fillStyle = on ? rgba(c % 3 ? [94, 242, 255] : [120, 255, 170], 0.9) : 'rgba(255,255,255,.08)';
      ctx.fillRect(-318 + c * 17, -138 + r * 20, 8, 4);
    }

    var tw = 200, th = 460;
    var g = ctx.createLinearGradient(-tw / 2, 0, tw / 2, 0);
    g.addColorStop(0, nt(S, '#143f69', 0.3));
    g.addColorStop(1, nt(S, '#0a1d36', 0.3));
    ctx.fillStyle = g;
    ctx.fillRect(-tw / 2, -th, tw, th);
    ctx.fillRect(-tw / 2 + 20, -th - 30, tw - 40, 30);
    ctx.fillRect(-tw / 2 + 50, -th - 54, tw - 100, 24);
    ctx.strokeStyle = 'rgba(94,242,255,.7)'; ctx.lineWidth = 2;
    ctx.strokeRect(-tw / 2, -th, tw, th);
    ctx.strokeRect(-tw / 2 + 20, -th - 30, tw - 40, 30);
    ctx.fillStyle = 'rgba(94,242,255,.08)';
    for (var y = -th + 24; y < -80; y += 24) ctx.fillRect(-tw / 2, y, tw, 1.2);

    var layers = [[-62, 4], [0, 5], [62, 3]], nodes = [];
    layers.forEach(function (l) {
      var arr = [];
      for (var n = 0; n < l[1]; n++) arr.push([l[0], -260 + (n - (l[1] - 1) / 2) * 52]);
      nodes.push(arr);
    });
    ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(94,242,255,.2)';
    ctx.beginPath();
    for (var l = 0; l < 2; l++) nodes[l].forEach(function (a) { nodes[l + 1].forEach(function (b) { ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }); });
    ctx.stroke();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (l = 0; l < 2; l++) {
      for (i = 0; i < nodes[l].length; i++) for (var j = 0; j < nodes[l + 1].length; j++) {
        if ((i + j + l) % 3) continue;
        var a = nodes[l][i], b = nodes[l + 1][j], p = (t * 0.6 + i * 0.23 + j * 0.37 + l * 0.5) % 1;
        glow(ctx, lerp(a[0], b[0], p), lerp(a[1], b[1], p), 8, [94, 242, 255], 0.9);
      }
    }
    var flat = nodes[0].concat(nodes[1], nodes[2]);
    flat.forEach(function (n, k) { glow(ctx, n[0], n[1], 16, [94, 242, 255], 0.2 + 0.35 * (0.5 + 0.5 * Math.sin(t * 2 + k)) * (0.4 + 0.6 * w)); });
    ctx.restore();
    ctx.fillStyle = '#dffcff';
    flat.forEach(function (n) { dot(ctx, n[0], n[1], 4.5); });

    ctx.fillStyle = nt(S, '#9fb6c8'); ctx.fillRect(-2, -th - 112, 4, 58);
    if (Math.sin(t * 4) > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, -th - 114, 14, [255, 80, 80], 0.9); ctx.restore(); }
    ctx.save();
    ctx.strokeStyle = 'rgba(94,242,255,.55)'; ctx.lineWidth = 2;
    ctx.setLineDash([10, 8]); ctx.lineDashOffset = -t * 40;
    ctx.beginPath(); ctx.ellipse(0, -th - 76, 118, 16, 0, 0, TAU); ctx.stroke();
    ctx.restore();

    ctx.fillStyle = 'rgba(94,242,255,' + (0.22 + 0.25 * w).toFixed(3) + ')'; ctx.fillRect(-26, -40, 52, 40);
    ctx.fillStyle = '#0a1426'; rr(ctx, -80, -76, 160, 28, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(94,242,255,.8)'; ctx.lineWidth = 1.5; ctx.stroke();
    label(ctx, 'AI WORKS', 0, -62, 14, '#bff9ff', { f: MONO, ls: 3 });

    ctx.fillStyle = nt(S, '#44556a'); ctx.fillRect(170, -140, 5, 140); ctx.fillRect(290, -140, 5, 140);
    ctx.fillStyle = '#0b1628'; rr(ctx, 146, -248, 172, 114, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(94,242,255,.5)'; ctx.lineWidth = 1.5; ctx.stroke();
    label(ctx, 'AI CAPABILITY JOURNEY', 232, -232, 8.5, '#bff9ff', { f: MONO, ls: 1 });
    for (i = 0; i < 5; i++) {
      var h = 16 + i * 14 + Math.sin(t * 2 + i) * 3 * (0.3 + 0.7 * w);
      ctx.fillStyle = rgba(STAGE[i]); ctx.fillRect(161 + i * 31, -150 - h, 22, h);
      label(ctx, String(i), 172 + i * 31, -142, 9, '#bff9ff', { f: MONO });
    }
  };

  /* ---------- 2. Strategy House ---------- */
  B.strategy = function (ctx, S) {
    var t = S.t, i, c;
    var bw = 300, fh = 66, x0 = -bw / 2, floors = ['DIAGNOSE', 'ARCHITECT', 'EMBED', 'MEASURE'];
    var active = Math.floor(t * 0.8) % 4;

    ctx.fillStyle = nt(S, '#7b8794'); ctx.fillRect(-262, -120, 5, 120); ctx.fillRect(-192, -120, 5, 120);
    ctx.fillStyle = '#ffffff'; rr(ctx, -302, -216, 156, 98, 8); ctx.fill();
    ctx.fillStyle = '#2f5f93'; rr(ctx, -298, -212, 148, 90, 6); ctx.fill();
    label(ctx, '200,000+', -224, -180, 26, '#ffffff', { f: DISP, w: 700 });
    label(ctx, 'LEADER POPULATION', -224, -148, 8.5, '#cfe6fa', { f: MONO, ls: 1.2 });

    ctx.fillStyle = nt(S, '#dfe6ee'); ctx.fillRect(x0 - 14, -26, bw + 28, 26);
    for (i = 0; i < 4; i++) {
      var y = -26 - (i + 1) * fh, lit = i === active;
      ctx.fillStyle = nt(S, i % 2 ? '#f5f8fb' : '#eaf0f6'); ctx.fillRect(x0, y, bw, fh);
      for (c = 0; c < 6; c++) {
        ctx.fillStyle = lit ? 'rgba(247,226,107,.95)' : nt(S, '#8fb6de');
        ctx.fillRect(x0 + 92 + c * 34, y + 14, 22, fh - 28);
      }
      ctx.fillStyle = lit ? '#171717' : nt(S, '#2f5f93');
      ctx.fillRect(x0 + 10, y + 17, 72, fh - 34);
      label(ctx, floors[i], x0 + 46, y + fh / 2, 9.5, lit ? '#f7e26b' : '#e8f3ff', { f: MONO, ls: 0.5 });
      ctx.fillStyle = nt(S, '#c9d5e2'); ctx.fillRect(x0, y + fh - 3, bw, 3);
    }
    var roofY = -26 - 4 * fh;
    ctx.fillStyle = nt(S, '#ffffff'); ctx.fillRect(x0 - 12, roofY - 16, bw + 24, 16);
    ctx.fillStyle = nt(S, '#2f5f93'); ctx.fillRect(x0 - 12, roofY - 22, bw + 24, 6);
    label(ctx, 'STRATEGY HOUSE', 0, roofY - 8, 10, '#2f5f93', { f: MONO, ls: 2.5 });

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]);
    ctx.strokeRect(x0 + bw, -26 - 3 * fh, 110, 3 * fh);
    ctx.beginPath();
    for (i = 1; i < 3; i++) { ctx.moveTo(x0 + bw, -26 - i * fh); ctx.lineTo(x0 + bw + 110, -26 - i * fh); }
    for (i = 0; i < 3; i++) for (c = 0; c < 2; c++) ctx.rect(x0 + bw + 18 + c * 44, -26 - (i + 1) * fh + 16, 28, fh - 32);
    ctx.stroke();
    ctx.restore();

    var cx = x0 + bw - 50, base = roofY - 22, mh = 150, jy = base - mh;
    ctx.strokeStyle = nt(S, '#f2b233'); ctx.lineWidth = 3;
    ctx.strokeRect(cx - 8, jy, 16, mh);
    ctx.lineWidth = 1.5; ctx.beginPath();
    for (var yy = 0; yy < mh; yy += 16) { ctx.moveTo(cx - 8, base - yy); ctx.lineTo(cx + 8, base - yy - 16); }
    ctx.stroke();
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - 62, jy); ctx.lineTo(cx + 190, jy); ctx.stroke();
    ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx, jy - 30); ctx.lineTo(cx + 190, jy); ctx.moveTo(cx, jy - 30); ctx.lineTo(cx - 62, jy); ctx.stroke();
    ctx.fillStyle = nt(S, '#6d7684'); ctx.fillRect(cx - 64, jy, 24, 16);
    var tp = 0.5 + 0.5 * Math.sin(t * 0.5), tx = cx + 40 + tp * 130, hl = 60 + 40 * (0.5 + 0.5 * Math.sin(t * 0.5 + 1.3));
    ctx.fillStyle = nt(S, '#f2b233'); ctx.fillRect(tx - 6, jy, 12, 6);
    ctx.strokeStyle = nt(S, '#333333'); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(tx, jy + 6); ctx.lineTo(tx, jy + hl); ctx.stroke();
    ctx.fillStyle = nt(S, '#2f5f93'); ctx.fillRect(tx - 18, jy + hl, 36, 20);
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(tx - 12, jy + hl + 5, 24, 2); ctx.fillRect(tx - 12, jy + hl + 11, 16, 2);

    var fcols = ['#e25b4a', '#2f5f93', '#f2b233'];
    for (i = 0; i < 3; i++) {
      var fx = x0 + bw + 140 + i * 34, fy = -150 + i * 8;
      ctx.fillStyle = nt(S, '#c0c8d2'); ctx.fillRect(fx, fy, 3, 150 - i * 8);
      flag(ctx, S, fx + 3, fy, 26, 18, nt(S, fcols[i]), i);
    }
  };

  /* ---------- 3. The Coach House: a Tudor coaching inn ---------- */
  B.team = function (ctx, S) {
    var t = S.t, L = S.P.lights, i, x;
    var timber = nt(S, '#2e2219'), render = nt(S, '#efe6d2'), plaster = nt(S, '#f6f0e2'), tile = nt(S, '#7a3e2c');
    var brick = nt(S, '#9c5a3f'), green = nt(S, '#1f3a2c'), frame = nt(S, '#f3efe6'), gold = '#e1bf62';
    var interior = rgba(mix([255, 226, 160], [255, 196, 110], L));
    var glass = rgba(mix([168, 194, 214], [255, 210, 130], Math.min(1, L * 1.4)));

    U.tree(ctx, S, -350, 0, 1.4, 1);
    U.tree(ctx, S, 320, 0, 1.3, 2.5);

    /* chimneys and smoke, behind the roof */
    [[-118, -302], [124, -298]].forEach(function (c) {
      ctx.fillStyle = brick; ctx.fillRect(c[0] - 13, c[1], 26, 80);
      ctx.fillStyle = nt(S, '#7d4630'); ctx.fillRect(c[0] - 16, c[1] - 6, 32, 7);
      ctx.fillStyle = nt(S, '#b4673f'); ctx.fillRect(c[0] - 9, c[1] - 16, 7, 10); ctx.fillRect(c[0] + 2, c[1] - 14, 7, 8);
    });
    if (!S.reduce) {
      for (i = 0; i < 4; i++) {
        var p = (t * 0.3 + i / 4) % 1;
        ctx.fillStyle = rgba([235, 235, 240], 0.3 * (1 - p));
        dot(ctx, -123 + p * 26 + Math.sin(t + i) * 4, -322 - p * 70, 5 + p * 13);
      }
    }

    /* steep tiled roof with two dormers */
    ctx.fillStyle = tile;
    ctx.beginPath(); ctx.moveTo(-188, -198); ctx.lineTo(-146, -270); ctx.lineTo(146, -270); ctx.lineTo(188, -198); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.14)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (var ry = -262; ry < -200; ry += 8) { var f = (ry + 270) / 72; ctx.moveTo(-146 - 42 * f, ry); ctx.lineTo(146 + 42 * f, ry); }
    ctx.stroke();
    [-52, 52].forEach(function (dx) {
      ctx.fillStyle = plaster; ctx.fillRect(dx - 20, -254, 40, 36);
      ctx.fillStyle = tile; ctx.beginPath(); ctx.moveTo(dx - 27, -252); ctx.lineTo(dx, -278); ctx.lineTo(dx + 27, -252); ctx.closePath(); ctx.fill();
      ctx.fillStyle = glass; ctx.fillRect(dx - 12, -246, 24, 22);
      ctx.strokeStyle = timber; ctx.lineWidth = 2; ctx.strokeRect(dx - 12, -246, 24, 22);
      ctx.beginPath(); ctx.moveTo(dx, -246); ctx.lineTo(dx, -224); ctx.stroke();
    });

    /* jettied, half-timbered upper floor */
    ctx.fillStyle = plaster; ctx.fillRect(-172, -200, 344, 88);
    ctx.fillStyle = timber;
    ctx.fillRect(-174, -204, 348, 6);
    for (x = -172; x <= 168; x += 43) ctx.fillRect(x, -200, 5, 86);
    ctx.fillRect(-172, -160, 344, 4);
    ctx.strokeStyle = timber; ctx.lineWidth = 4;
    ctx.beginPath();
    for (i = 0; i < 8; i++) {
      var px = -172 + i * 43;
      if (i % 2 === 0) { ctx.moveTo(px + 5, -158); ctx.lineTo(px + 43, -198); ctx.moveTo(px + 5, -116); ctx.lineTo(px + 43, -156); }
      else { ctx.moveTo(px + 5, -198); ctx.lineTo(px + 43, -158); ctx.moveTo(px + 5, -156); ctx.lineTo(px + 43, -116); }
    }
    ctx.stroke();
    function lattice(cx, y, w, h) {
      ctx.fillStyle = timber; ctx.fillRect(cx - w / 2 - 4, y - 4, w + 8, h + 8);
      ctx.fillStyle = glass; ctx.fillRect(cx - w / 2, y, w, h);
      ctx.save();
      ctx.beginPath(); ctx.rect(cx - w / 2, y, w, h); ctx.clip();
      ctx.strokeStyle = 'rgba(46,34,25,.5)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (var d = 0; d < w + h; d += 8) {
        ctx.moveTo(cx - w / 2 + d, y); ctx.lineTo(cx - w / 2 + d - h, y + h);
        ctx.moveTo(cx - w / 2 + d - h, y); ctx.lineTo(cx - w / 2 + d, y + h);
      }
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = timber; ctx.fillRect(cx - 1.5, y, 3, h);
    }
    lattice(-126, -186, 50, 56);
    lattice(2, -186, 50, 56);
    lattice(131, -186, 50, 56);
    ctx.fillStyle = timber; ctx.fillRect(-178, -118, 356, 8);

    /* rendered ground floor */
    ctx.fillStyle = render; ctx.fillRect(-160, -110, 320, 110);
    ctx.fillStyle = nt(S, '#b9ad97'); ctx.fillRect(-162, -12, 324, 12);

    ctx.fillStyle = green; ctx.fillRect(-152, -106, 184, 22);
    ctx.strokeStyle = gold; ctx.lineWidth = 1.2; ctx.strokeRect(-149, -103, 178, 16);
    label(ctx, 'THE COACH HOUSE', -60, -94.5, 12.5, gold, { f: DISP, w: 700, ls: 1.5 });

    function paned(cx, y, w, h) {
      ctx.fillStyle = frame; ctx.fillRect(cx - w / 2 - 4, y - 4, w + 8, h + 8);
      ctx.fillStyle = interior; ctx.fillRect(cx - w / 2, y, w, h);
    }
    function bars(cx, y, w, h) {
      ctx.fillStyle = frame;
      for (var c = 1; c < 3; c++) ctx.fillRect(cx - w / 2 + (c * w) / 3 - 1, y, 2, h);
      for (var r = 1; r < 3; r++) ctx.fillRect(cx - w / 2, y + (r * h) / 3 - 1, w, 2);
      ctx.fillStyle = nt(S, '#d8cfbd'); ctx.fillRect(cx - w / 2 - 7, y + h + 4, w + 14, 4);
    }
    paned(-122, -76, 44, 50);
    paned(0, -76, 50, 50);
    ctx.fillStyle = 'rgba(92,52,38,.62)';
    figure(ctx, -124, -28, 0.78, -0.7 + Math.sin(t * 2) * 0.45);
    figure(ctx, -15, -28, 0.66, null);
    figure(ctx, 1, -30, 0.7, Math.sin(t * 1.6 + 1) > 0.6 ? -1.2 : null);
    figure(ctx, 16, -28, 0.66, null);
    bars(-122, -76, 44, 50);
    bars(0, -76, 50, 50);
    paned(137, -76, 28, 38);
    bars(137, -76, 28, 38);

    ctx.fillStyle = frame; arch(ctx, -83, -82, 40, 82); ctx.fill();
    ctx.fillStyle = green; arch(ctx, -79, -78, 32, 78); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fillRect(-75, -50, 10, 22); ctx.fillRect(-61, -50, 10, 22);
    ctx.fillStyle = gold; dot(ctx, -53, -36, 2);

    function lantern(lx, ly) {
      ctx.fillStyle = timber; ctx.fillRect(lx - 1, ly - 14, 2, 8); ctx.fillRect(lx - 6, ly - 8, 12, 3);
      ctx.fillStyle = rgba(mix([240, 222, 175], [255, 214, 120], L)); ctx.fillRect(lx - 5, ly - 5, 10, 13);
      ctx.fillStyle = timber; ctx.fillRect(lx - 6, ly + 8, 12, 2); ctx.fillRect(lx - 0.75, ly - 5, 1.5, 13);
      if (L > 0.1) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, lx, ly + 2, 22, [255, 214, 140], 0.6 * L); ctx.restore(); }
    }
    lantern(-90, -66);
    lantern(-37, -66);

    /* carriage arch through to the yard */
    ctx.fillStyle = nt(S, '#cdbf9f'); arch(ctx, 36, -102, 80, 102); ctx.fill();
    ctx.fillStyle = '#2a2420'; arch(ctx, 42, -96, 68, 96); ctx.fill();
    ctx.fillStyle = rgba(mix([206, 196, 166], [255, 200, 120], L), 0.35); ctx.fillRect(58, -48, 36, 48);
    ctx.fillStyle = 'rgba(255,255,255,.09)';
    for (i = 0; i < 7; i++) { dot(ctx, 48 + i * 9, -4, 3); dot(ctx, 52 + i * 9, -10, 2.5); }
    ctx.fillStyle = nt(S, '#bfae8a'); ctx.fillRect(70, -106, 12, 13);
    lantern(76, -78);

    /* stone horse trough */
    ctx.fillStyle = nt(S, '#9a968c'); rr(ctx, 118, -18, 40, 18, 3); ctx.fill();
    ctx.fillStyle = rgba(mix([120, 170, 200], [60, 80, 120], L), 0.9); ctx.fillRect(122, -16, 32, 3);

    /* hanging baskets under the jetty */
    [-166, 166].forEach(function (bx) {
      ctx.strokeStyle = timber; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(bx, -110); ctx.lineTo(bx, -98); ctx.stroke();
      ctx.fillStyle = nt(S, '#4f7a3a'); dot(ctx, bx - 5, -94, 7); dot(ctx, bx + 5, -94, 7); dot(ctx, bx, -98, 7);
      ctx.fillStyle = nt(S, '#6b4a2e'); ctx.beginPath(); ctx.arc(bx, -92, 8, 0, Math.PI); ctx.fill();
      ctx.fillStyle = nt(S, '#e2557a'); dot(ctx, bx - 6, -99, 2); dot(ctx, bx + 4, -102, 2); dot(ctx, bx + 7, -95, 2);
      ctx.fillStyle = nt(S, '#f4f0ff'); dot(ctx, bx - 1, -103, 1.8); dot(ctx, bx - 8, -93, 1.8);
    });

    /* swinging inn sign on an iron bracket */
    ctx.fillStyle = timber;
    ctx.fillRect(172, -153, 54, 3);
    ctx.strokeStyle = timber; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(172, -128); ctx.quadraticCurveTo(186, -150, 210, -151); ctx.stroke();
    ctx.save();
    ctx.translate(204, -150);
    ctx.rotate(Math.sin(t * 1.2) * 0.05);
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-14, 8); ctx.moveTo(14, 0); ctx.lineTo(14, 8); ctx.stroke();
    ctx.fillStyle = gold; rr(ctx, -21, 8, 42, 46, 3); ctx.fill();
    ctx.fillStyle = green; rr(ctx, -18, 11, 36, 40, 2); ctx.fill();
    ctx.fillStyle = gold;
    ctx.fillRect(-11, 21, 22, 3);
    rr(ctx, -9, 24, 18, 12, 2); ctx.fill();
    ctx.fillStyle = green; ctx.fillRect(-5, 27, 10, 5);
    ctx.strokeStyle = gold; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(-6, 40, 4, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(7, 40, 4, 0, TAU); ctx.stroke();
    ctx.restore();

    /* Victorian gas lamp, with the bunting tied to it */
    var lx = -255, post = nt(S, '#1d2b24');
    ctx.fillStyle = post;
    ctx.fillRect(lx - 9, -14, 18, 14);
    ctx.fillRect(lx - 6, -24, 12, 10);
    ctx.fillRect(lx - 3, -152, 6, 130);
    ctx.fillRect(lx - 14, -142, 28, 3);
    dot(ctx, lx - 14, -140.5, 2.5); dot(ctx, lx + 14, -140.5, 2.5);
    ctx.fillRect(lx - 7, -156, 14, 4);
    ctx.fillStyle = rgba(mix([235, 225, 190], [255, 214, 120], L));
    ctx.beginPath(); ctx.moveTo(lx - 9, -180); ctx.lineTo(lx + 9, -180); ctx.lineTo(lx + 6, -156); ctx.lineTo(lx - 6, -156); ctx.closePath(); ctx.fill();
    ctx.fillStyle = post;
    ctx.fillRect(lx - 0.75, -180, 1.5, 24);
    ctx.beginPath(); ctx.moveTo(lx - 12, -180); ctx.lineTo(lx, -192); ctx.lineTo(lx + 12, -180); ctx.closePath(); ctx.fill();
    ctx.fillRect(lx - 1, -198, 2, 7);
    if (L > 0.1) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, lx, -168, 40, [255, 214, 140], 0.6 * L); ctx.restore(); }

    var x0 = -172, y0 = -196, x1 = lx + 3, y1 = -147, cx = (x0 + x1) / 2, cy = -128 + Math.sin(t * 1.4) * 3;
    var bcols = ['#e25b4a', '#f7e26b', '#5ec8ff', '#7be08a', '#b48cff'];
    ctx.strokeStyle = timber; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cx, cy, x1, y1); ctx.stroke();
    for (i = 1; i < 9; i++) {
      var q = i / 9;
      var bx = (1 - q) * (1 - q) * x0 + 2 * (1 - q) * q * cx + q * q * x1;
      var by = (1 - q) * (1 - q) * y0 + 2 * (1 - q) * q * cy + q * q * y1;
      ctx.fillStyle = nt(S, bcols[i % 5]);
      ctx.beginPath(); ctx.moveTo(bx - 5, by); ctx.lineTo(bx + 5, by); ctx.lineTo(bx, by + 11); ctx.closePath(); ctx.fill();
    }

    /* coaching board on the pavement */
    ctx.fillStyle = green;
    ctx.beginPath(); ctx.moveTo(228, 0); ctx.lineTo(238, -60); ctx.lineTo(286, -60); ctx.lineTo(296, 0); ctx.lineTo(290, 0); ctx.lineTo(282, -52); ctx.lineTo(242, -52); ctx.lineTo(234, 0); ctx.closePath(); ctx.fill();
    ctx.fillRect(240, -58, 44, 40);
    label(ctx, 'COACHING', 262, -46, 8.5, '#ffffff', { f: MONO, ls: 1 });
    label(ctx, 'TODAY', 262, -32, 8.5, gold, { f: MONO, ls: 1 });
  };

  /* ---------- 4. Immersive Park ---------- */
  B.immersive = function (ctx, S) {
    var t = S.t, L = S.P.lights, spin = t * 0.18, i;

    var trk = function (u) { var s = Math.sin(u * Math.PI * 2); return [-500 + u * 340, -170 - 110 * s * s * (1 - u * 0.35)]; };
    ctx.strokeStyle = nt(S, '#e7b6d6'); ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (i = 0; i <= 20; i++) { var sp = trk(i / 20); ctx.moveTo(sp[0], sp[1]); ctx.lineTo(sp[0], 0); }
    ctx.stroke();
    ctx.strokeStyle = nt(S, '#ff6fa8'); ctx.lineWidth = 5;
    ctx.beginPath();
    for (i = 0; i <= 60; i++) { var pp = trk(i / 60); if (i) ctx.lineTo(pp[0], pp[1]); else ctx.moveTo(pp[0], pp[1]); }
    ctx.stroke();
    var carCols = ['#f7e26b', '#5ec8ff', '#7be08a'];
    for (i = 0; i < 3; i++) {
      var u = (((t * 0.12 - i * 0.035) % 1) + 1) % 1, p = trk(u), q = trk(Math.min(1, u + 0.01));
      ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(Math.atan2(q[1] - p[1], q[0] - p[0]));
      ctx.fillStyle = nt(S, carCols[i]); rr(ctx, -11, -16, 22, 13, 4); ctx.fill();
      ctx.fillStyle = 'rgba(40,20,50,.7)'; dot(ctx, -4, -19, 3.5); dot(ctx, 5, -19, 3.5);
      ctx.restore();
    }

    var fx = 200, fy = -236, R = 140;
    ctx.strokeStyle = nt(S, '#cfd6e6'); ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx - 62, 0); ctx.moveTo(fx, fy); ctx.lineTo(fx + 62, 0); ctx.stroke();
    ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(fx, fy, R, 0, TAU); ctx.stroke();
    ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(fx, fy, R - 12, 0, TAU); ctx.stroke();
    ctx.beginPath();
    for (i = 0; i < 12; i++) { var a = spin + (i * TAU) / 12; ctx.moveTo(fx, fy); ctx.lineTo(fx + Math.cos(a) * R, fy + Math.sin(a) * R); }
    ctx.stroke();
    if (L > 0.1) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (i = 0; i < 24; i++) {
        var ba = spin + (i * TAU) / 24, on = (i + Math.floor(t * 6)) % 3 === 0;
        glow(ctx, fx + Math.cos(ba) * R, fy + Math.sin(ba) * R, on ? 11 : 6, [255, 214, 122], (on ? 0.9 : 0.4) * L);
      }
      ctx.restore();
    }
    var gc = ['#ff6fa8', '#5ec8ff', '#f7e26b', '#7be08a', '#b48cff', '#ff9a5c'];
    for (i = 0; i < 12; i++) {
      var ga = spin + (i * TAU) / 12, gx = fx + Math.cos(ga) * R, gy = fy + Math.sin(ga) * R;
      ctx.strokeStyle = nt(S, '#cfd6e6'); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy + 8); ctx.stroke();
      ctx.fillStyle = nt(S, gc[i % 6]); rr(ctx, gx - 10, gy + 8, 20, 16, 5); ctx.fill();
    }
    ctx.fillStyle = nt(S, '#cfd6e6'); dot(ctx, fx, fy, 8);

    var stone = nt(S, '#f1d7e8'), stone2 = nt(S, '#e0bcd4'), roof = nt(S, '#7b5cc8');
    var tower = function (tx, tw, th) {
      ctx.fillStyle = stone2; ctx.fillRect(tx - tw / 2, -th, tw, th);
      ctx.fillStyle = roof;
      ctx.beginPath(); ctx.moveTo(tx - tw / 2 - 6, -th); ctx.lineTo(tx, -th - tw * 1.5); ctx.lineTo(tx + tw / 2 + 6, -th); ctx.closePath(); ctx.fill();
      var top = -th - tw * 1.5;
      ctx.strokeStyle = nt(S, '#555555'); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(tx, top); ctx.lineTo(tx, top - 22); ctx.stroke();
      flag(ctx, S, tx, top - 22, 16, 9, nt(S, '#f7e26b'), tx);
      ctx.fillStyle = rgba(mix([120, 90, 170], [255, 214, 122], L));
      arch(ctx, tx - 6, -th + 30, 12, 22); ctx.fill();
    };
    tower(-155, 54, 300);
    ctx.fillStyle = stone; ctx.fillRect(-230, -190, 150, 190);
    for (i = -230; i < -80; i += 20) ctx.fillRect(i, -202, 12, 12);
    tower(-240, 40, 250);
    tower(-70, 40, 240);
    ctx.fillStyle = nt(S, '#5b3f7a'); arch(ctx, -175, -92, 40, 92); ctx.fill();
    ctx.fillStyle = rgba(mix([120, 90, 170], [255, 214, 122], L));
    arch(ctx, -214, -150, 18, 28); ctx.fill(); arch(ctx, -114, -150, 18, 28); ctx.fill();

    var ax = 40, ah = 100;
    ctx.fillStyle = nt(S, '#5b3f7a'); ctx.fillRect(ax - 70, -ah, 18, ah); ctx.fillRect(ax + 52, -ah, 18, ah);
    ctx.lineWidth = 20; ctx.strokeStyle = nt(S, '#ff6fa8');
    ctx.beginPath(); ctx.arc(ax, -ah, 61, Math.PI, 0); ctx.stroke();
    ctx.setLineDash([12, 12]); ctx.strokeStyle = nt(S, '#ffffff');
    ctx.beginPath(); ctx.arc(ax, -ah, 61, Math.PI, 0); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#2b1740'; rr(ctx, ax - 86, -ah - 74, 172, 30, 8); ctx.fill();
    label(ctx, 'ENTER YOUR STORY', ax, -ah - 59, 12, '#ffd27a', { f: MONO, ls: 2 });
    bulbs(ctx, S, ax - 86, -ah - 74, 172, 30, 12);

    var bcol = ['#ff6fa8', '#5ec8ff', '#f7e26b'];
    for (i = 0; i < 3; i++) {
      var bx = ax + 96 + i * 16, by = -ah - i * 14 + Math.sin(t * 1.5 + i) * 5;
      ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(bx, by + 14); ctx.lineTo(ax + 110, -30); ctx.stroke();
      ctx.fillStyle = nt(S, bcol[i]); ctx.beginPath(); ctx.ellipse(bx, by, 11, 14, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.4)'; dot(ctx, bx - 4, by - 5, 3);
    }
  };

  /* ---------- Showcase Row ---------- */
  B.ex1 = function (ctx, S) {
    ctx.fillStyle = nt(S, '#a9cdf2', 0.6); ctx.fillRect(-170, -334, 340, 334);
    ctx.fillStyle = nt(S, '#7fb0e0', 0.6); ctx.fillRect(-182, -346, 364, 16);
    for (var i = -150; i <= 150; i += 60) { ctx.fillStyle = nt(S, '#c4def7', 0.6); ctx.fillRect(i - 5, -170, 10, 170); }
    screen(ctx, S, IMG.exec, -140, -318, 280, 130, 'executive-simulation');
    ctx.fillStyle = '#171717'; ctx.fillRect(-192, -174, 384, 60);
    label(ctx, 'EXECUTIVE SIMULATION', 0, -152, 17, '#f7e26b', { f: MONO, ls: 2 });
    label(ctx, '3 DAYS · FULLY THEMED', 0, -130, 10, '#ffffff', { f: MONO, ls: 2 });
    bulbs(ctx, S, -192, -174, 384, 60, 16);
    for (i = 0; i < 3; i++) {
      ctx.fillStyle = nt(S, '#27405e'); rr(ctx, -100 + i * 70, -98, 50, 98, 4); ctx.fill();
      ctx.fillStyle = rgba([255, 220, 150], 0.22 + 0.5 * S.P.lights); ctx.fillRect(-95 + i * 70, -93, 40, 40);
    }
    ctx.fillStyle = nt(S, '#b8323a'); ctx.fillRect(-130, -4, 260, 4);
  };

  B.ex2 = function (ctx, S) {
    /* Four floors, one per CREW skill, lighting up from C at the bottom to W at the top */
    var crew = [['C', 'CONTEXT'], ['R', 'REQUEST'], ['E', 'EXPECTATIONS'], ['W', 'WHO CHECKS']];
    var fh = 65, bw = 280, x0 = -bw / 2, lvl = Math.floor((S.t * 0.9) % 5), i;
    ctx.fillStyle = nt(S, '#e8b48c', 0.6); ctx.fillRect(x0, -20 - 4 * fh - 24, bw, 4 * fh + 44);
    ctx.fillStyle = nt(S, '#cf936a', 0.6); ctx.fillRect(x0 - 10, -20 - 4 * fh - 30, bw + 20, 10);
    for (i = 0; i < 4; i++) {
      var y = -20 - (i + 1) * fh, on = i < lvl, ink = on ? '#ffffff' : 'rgba(255,238,220,.75)';
      ctx.fillStyle = on ? rgba(STAGE[i + 1], 0.95) : 'rgba(50,28,18,.4)';
      ctx.fillRect(x0 + 14, y + 9, bw - 28, fh - 18);
      label(ctx, crew[i][0], x0 + 42, y + fh / 2 + 1, 24, ink, { f: DISP, w: 900 });
      ctx.fillStyle = on ? 'rgba(255,255,255,.55)' : 'rgba(255,238,220,.3)'; ctx.fillRect(x0 + 62, y + 18, 1.5, fh - 36);
      label(ctx, crew[i][1], x0 + 76, y + fh / 2, 11, ink, { f: MONO, ls: 1.5, a: 'left' });
    }
    ctx.fillStyle = nt(S, '#5a3a28'); rr(ctx, -24, -20, 48, 20, 3); ctx.fill();
    var top = -20 - 4 * fh - 30;
    ctx.fillStyle = nt(S, '#4a4f5c'); ctx.fillRect(-90, top - 30, 5, 30); ctx.fillRect(85, top - 30, 5, 30);
    screen(ctx, S, IMG.fluency, -120, top - 167, 240, 135, 'ai-fluency');
    ctx.fillStyle = '#171717'; rr(ctx, -118, top - 20, 236, 18, 4); ctx.fill();
    label(ctx, 'AI FLUENCY PROGRAMME', 0, top - 11, 10, '#f7e26b', { f: MONO, ls: 2 });
  };

  B.ex3 = function (ctx, S) {
    var t = S.t, x0 = -200, bw = 400, h = 190, i, c;
    ctx.fillStyle = nt(S, '#b9c9a9', 0.6); ctx.fillRect(x0, -h, bw, h);
    ctx.fillStyle = nt(S, '#9db38c', 0.6);
    ctx.beginPath(); ctx.moveTo(x0, -h);
    for (i = 0; i < 5; i++) { ctx.lineTo(x0 + i * 80 + 62, -h - 40); ctx.lineTo(x0 + i * 80 + 80, -h); }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgba([200, 230, 255], 0.35 + 0.4 * S.P.lights);
    for (i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(x0 + i * 80 + 62, -h - 40); ctx.lineTo(x0 + i * 80 + 80, -h); ctx.lineTo(x0 + i * 80 + 70, -h); ctx.lineTo(x0 + i * 80 + 60, -h - 30); ctx.closePath(); ctx.fill(); }

    ctx.fillStyle = nt(S, '#4a4f5c'); ctx.fillRect(-70, -h - 60, 5, 30); ctx.fillRect(65, -h - 60, 5, 30);
    screen(ctx, S, IMG.task, -104, -h - 178, 208, 117, 'task-people');

    ctx.fillStyle = '#171717'; rr(ctx, -170, -h + 14, 340, 24, 4); ctx.fill();
    label(ctx, 'TASK & PEOPLE BALANCE', 0, -h + 26, 11, '#f7e26b', { f: MONO, ls: 2 });

    ctx.fillStyle = '#23282a'; ctx.fillRect(-180, -136, 170, 136);
    ctx.strokeStyle = '#f2c230'; ctx.lineWidth = 4;
    for (c = 0; c < 3; c++) ctx.strokeRect(-172 + c * 54, -128, 50, 128);
    for (i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-172, -128 + (i + 1) * 40); ctx.lineTo(-10, -128 + (i + 1) * 40); ctx.stroke(); }
    ctx.fillStyle = '#b8bec8';
    for (c = 0; c < 3; c++) for (i = 0; i < 3; i++) ctx.fillRect(-166 + c * 54, -118 + i * 40, 18 + ((c + i) % 2) * 12, 22);

    label(ctx, 'LINE HEALTH', 104, -136, 9, nt(S, '#2d3a2a'), { f: MONO, ls: 1 });
    var health = 4 + Math.round(2 * Math.sin(t * 0.8));
    for (i = 0; i < 7; i++) { ctx.fillStyle = i < health ? '#e2352e' : 'rgba(0,0,0,.18)'; ctx.fillRect(40 + i * 19, -124, 15, 14); }

    ctx.fillStyle = nt(S, '#6b7280'); ctx.fillRect(10, -46, 190, 9);
    for (i = 20; i < 200; i += 34) ctx.fillRect(i, -37, 4, 37);
    for (i = 0; i < 4; i++) {
      var tx = 10 + ((t * 40 + i * 52) % 190);
      ctx.fillStyle = '#f2c230'; rr(ctx, tx - 1, -66, 26, 20, 3); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.fillRect(tx + 2, -62, 20, 3);
    }
  };

  B.ex4 = function (ctx, S) {
    var t = S.t, x0 = -140, bw = 280, h = 360, i;
    var sway = Math.sin(t * 0.4) * 0.12, bxs = 60, bys = -h - 14;
    var ex = bxs + Math.cos(-1.95 + sway) * 230, ey = bys + Math.sin(-1.95 + sway) * 230;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    var g = ctx.createLinearGradient(bxs, bys, ex, ey);
    g.addColorStop(0, 'rgba(255,240,180,.45)'); g.addColorStop(1, 'rgba(255,240,180,.08)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(bxs - 6, bys); ctx.lineTo(ex - 52, ey + 10); ctx.lineTo(ex + 52, ey - 10); ctx.lineTo(bxs + 6, bys); ctx.closePath(); ctx.fill();
    glow(ctx, ex, ey, 80, [255, 240, 180], 0.35);
    ctx.restore();
    ctx.fillStyle = 'rgba(20,20,40,.55)';
    ctx.beginPath();
    ctx.moveTo(ex, ey - 30); ctx.lineTo(ex + 24, ey - 22); ctx.lineTo(ex + 22, ey + 4);
    ctx.quadraticCurveTo(ex + 18, ey + 22, ex, ey + 32);
    ctx.quadraticCurveTo(ex - 18, ey + 22, ex - 22, ey + 4);
    ctx.lineTo(ex - 24, ey - 22); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,240,180,.8)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ex - 10, ey + 1); ctx.lineTo(ex - 2, ey + 10); ctx.lineTo(ex + 12, ey - 10); ctx.stroke();

    ctx.fillStyle = nt(S, '#a3a4d6', 0.6); ctx.fillRect(x0, -h, bw, h);
    ctx.fillRect(x0 + 30, -h - 24, bw - 60, 24);
    ctx.fillRect(x0 + 70, -h - 44, bw - 140, 20);
    ctx.fillStyle = nt(S, '#8586c2', 0.6);
    for (i = 0; i < 5; i++) ctx.fillRect(x0 + 20 + i * 60, -h + 20, 8, h - 20);
    ctx.fillStyle = nt(S, '#3a3b5c'); ctx.fillRect(bxs - 10, bys, 20, 14);
    ctx.fillStyle = '#fff6d0'; dot(ctx, bxs, bys, 7);

    screen(ctx, S, IMG.safety, -112, -262, 224, 126, 'safety-training');
    ctx.fillStyle = '#171717'; rr(ctx, -130, -310, 260, 26, 4); ctx.fill();
    label(ctx, 'GAMIFIED SAFETY TRAINING', 0, -297, 10.5, '#f7e26b', { f: MONO, ls: 1.5 });

    ctx.fillStyle = '#12132a'; rr(ctx, -112, -118, 120, 62, 6); ctx.fill();
    label(ctx, 'SITE LEAGUE', -52, -104, 8.5, '#bfc0ff', { f: MONO, ls: 1 });
    for (i = 0; i < 2; i++) {
      var len = 40 + 30 * (0.5 + 0.5 * Math.sin(t * 0.9 + i * 2.1));
      label(ctx, i ? 'B' : 'A', -100, -88 + i * 16, 9, '#ffffff', { f: MONO });
      ctx.fillStyle = i ? '#5ec8ff' : '#f7e26b'; ctx.fillRect(-90, -93 + i * 16, len, 9);
    }
    ctx.fillStyle = nt(S, '#3a3b5c'); rr(ctx, 30, -96, 70, 96, 4); ctx.fill();
    ctx.fillStyle = rgba([255, 220, 150], 0.25 + 0.5 * S.P.lights); ctx.fillRect(36, -90, 58, 44);

    var tw = Math.sin(t * 3) > 0.3;
    C.drawStar(ctx, 118, -h + 60, tw ? 7 : 5, t, tw ? '#f7e26b' : 'rgba(247,226,107,.5)');
  };

  /* ---------- Destination: the lookout ---------- */
  B.end = function (ctx, S) {
    var t = S.t, i;
    ctx.fillStyle = nt(S, '#3b5446', 0.3);
    ctx.beginPath(); ctx.moveTo(-340, 0); ctx.quadraticCurveTo(-130, -200, 110, -210); ctx.quadraticCurveTo(310, -200, 400, 0); ctx.closePath(); ctx.fill();

    ctx.fillStyle = nt(S, '#f4efe4'); ctx.fillRect(56, -370, 8, 170);
    var boards = ['SHOWCASE ROW', 'IMMERSIVE PARK', 'THE COACH HOUSE', 'STRATEGY HOUSE', 'AI WORKS'];
    for (i = 0; i < boards.length; i++) {
      var by = -356 + i * 26, bw = 128;
      var hov = C.addHit(ctx, 56 - bw - 12, by, bw + 12, 20, { key: 'go' + (5 - i), go: 5 - i });
      ctx.fillStyle = hov ? '#f7e26b' : nt(S, '#f4efe4');
      ctx.beginPath(); ctx.moveTo(56, by); ctx.lineTo(56 - bw, by); ctx.lineTo(56 - bw - 12, by + 10); ctx.lineTo(56 - bw, by + 20); ctx.lineTo(56, by + 20); ctx.closePath(); ctx.fill();
      label(ctx, boards[i], 56 - bw / 2 - 4, by + 10.5, 9.5, '#171717', { f: MONO, ls: 1 });
    }
    ctx.fillStyle = nt(S, '#f4efe4');
    ctx.beginPath(); ctx.moveTo(64, -330); ctx.lineTo(184, -330); ctx.lineTo(196, -318); ctx.lineTo(184, -306); ctx.lineTo(64, -306); ctx.closePath(); ctx.fill();
    label(ctx, 'NEXT CHAPTER', 124, -317.5, 10, '#171717', { f: MONO, ls: 1.2 });

    ctx.fillStyle = nt(S, '#6b4a33'); ctx.fillRect(170, -214, 70, 7); ctx.fillRect(176, -207, 5, 14); ctx.fillRect(229, -207, 5, 14);
    ctx.fillRect(170, -232, 70, 5);
    ctx.fillStyle = nt(S, '#8b8f9a');
    ctx.save(); ctx.translate(-60, -196); ctx.rotate(-0.35 + Math.sin(t * 0.3) * 0.05);
    ctx.fillRect(-4, -6, 46, 12); ctx.fillRect(40, -8, 10, 16); ctx.restore();
    ctx.fillRect(-64, -196, 4, 40); ctx.fillRect(-74, -158, 24, 4);

    ctx.fillStyle = '#ffffff'; rr(ctx, -310, -110, 46, 46, 6); ctx.fill();
    ctx.fillStyle = '#1f5fbf'; rr(ctx, -307, -107, 40, 40, 4); ctx.fill();
    label(ctx, 'P', -287, -86, 28, '#ffffff', { w: 700 });
    ctx.fillStyle = nt(S, '#6d6f78'); ctx.fillRect(-289, -64, 4, 64);
  };
})();
