/* Drive engine: maps vertical scroll to the car's position, runs the frame loop, cards, route nav and stars. */
(function () {
  'use strict';
  var C = window.City;
  var stage = document.getElementById('stage'), track = document.getElementById('track'), canvas = document.getElementById('world');
  if (!C || !C.render || !canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var U = C.u, root = document.documentElement;
  root.classList.add('js');

  var cards = Array.prototype.slice.call(document.querySelectorAll('.stop'));
  var navBtns = Array.prototype.slice.call(document.querySelectorAll('[data-go]'));
  var tallyEl = document.getElementById('tally'), tallyBox = document.querySelector('.tally');
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  var STOPS = C.STOPS, N = STOPS.length, DWELL = 0.85, TRAVEL = 1.05;
  var S = { t: 0, dt: 0.016, camX: 0, speed: 0, wheelA: 0, tilt: 0, bob: 0, reduce: !!mq.matches, sw: [], ww: {} };
  var vh = 1, trackTop = 0, prevCam = 0, prevSpeed = 0, active = 0, nearest = 0, got = 0;

  var STARS = [];
  for (var i = 0; i < N - 1; i++) {
    var a = STOPS[i].X, b = STOPS[i + 1].X;
    STARS.push({ X: a + (b - a) * 0.42, got: false, fly: null });
    if (i % 3 === 0) STARS.push({ X: a + (b - a) * 0.72, got: false, fly: null });
  }

  function layout() {
    var W = Math.max(1, stage.clientWidth || window.innerWidth || 0), H = Math.max(1, stage.clientHeight || window.innerHeight || 0);
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    C.dpr = dpr;
    var narrow = W < 720 || H > W * 1.25;
    root.classList.toggle('is-narrow', narrow);
    S.W = W; S.H = H; S.narrow = narrow;
    if (narrow) {
      S.roadTop = Math.round(H * 0.42);
      S.k = U.clamp(Math.min(W / 560, (S.roadTop - 60) / 520), 0.42, 0.95);
    } else {
      S.roadTop = Math.round(H * 0.83);
      S.k = U.clamp(Math.min(H / 860, W / 1100), 0.6, 1.3);
    }
    S.paveH = Math.round(16 * S.k);
    S.gy = S.roadTop - S.paveH;
    S.roadH = Math.round(Math.max(44, 80 * S.k));
    S.carSX = W * (narrow ? 0.24 : 0.3);
    S.bOff = ((narrow ? 0.64 : 0.7) * W - S.carSX) / S.k;
    var carTop = C.carY(S) - 118 * S.k * 0.92;
    root.style.setProperty('--car-top', Math.round(carTop) + 'px');
    root.style.setProperty('--sheet-top', Math.round(S.roadTop + S.roadH + 12) + 'px');
    vh = H;
    track.style.height = Math.round(((N - 1) * (DWELL + TRAVEL) + DWELL) * vh + H) + 'px';
    trackTop = track.getBoundingClientRect().top + window.pageYOffset;
  }

  function ease(u) { return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; }
  function camFromScroll(y) {
    var seg = (DWELL + TRAVEL) * vh, i = Math.floor(y / seg);
    if (!(i >= 0)) return STOPS[0].X;
    if (i >= N - 1) return STOPS[N - 1].X;
    var r = y - i * seg;
    if (r <= DWELL * vh) return STOPS[i].X;
    return U.lerp(STOPS[i].X, STOPS[i + 1].X, ease((r - DWELL * vh) / (TRAVEL * vh)));
  }
  function scrollForStop(i) { return trackTop + i * (DWELL + TRAVEL) * vh + DWELL * vh * 0.35; }
  function scrollStop() { return U.clamp(Math.round((window.pageYOffset - trackTop - DWELL * vh * 0.35) / ((DWELL + TRAVEL) * vh)), 0, N - 1); }
  function go(i) { window.scrollTo({ top: scrollForStop(U.clamp(i, 0, N - 1)), behavior: S.reduce ? 'auto' : 'smooth' }); }

  function setActive(i) {
    if (i === active) return;
    active = i;
    for (var j = 0; j < cards.length; j++) cards[j].classList.toggle('is-active', j === i);
  }
  function setNearest(i) {
    if (i === nearest) return;
    nearest = i;
    navBtns.forEach(function (btn, j) { if (j === i) btn.setAttribute('aria-current', 'step'); else btn.removeAttribute('aria-current'); });
  }

  function starY() { return C.carY(S) - 56 * S.k; }

  S.beforeCar = function (ctx) {
    var y0 = starY();
    for (var i = 0; i < STARS.length; i++) {
      var s = STARS[i];
      if (s.got) continue;
      var x = S.carSX + (s.X - S.camX) * S.k;
      if (x < -40 || x > S.W + 40) continue;
      var y = y0 + Math.sin(S.t * 3 + s.X) * 5 * S.k;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      U.glow(ctx, x, y, 28 * S.k, [255, 226, 107], 0.5);
      ctx.restore();
      C.drawStar(ctx, x, y, 12 * S.k, Math.sin(S.t * 2 + s.X) * 0.3, '#f7e26b', '#171717');
    }
  };

  function collect() {
    for (var i = 0; i < STARS.length; i++) {
      var s = STARS[i];
      if (s.got || S.camX < s.X - 40) continue;
      s.got = true;
      var r = tallyBox.getBoundingClientRect(), sr = stage.getBoundingClientRect();
      s.fly = { p: 0, x0: S.carSX + (s.X - S.camX) * S.k, y0: starY(), x1: r.left - sr.left + 16, y1: r.top - sr.top + r.height / 2 };
    }
  }

  function flyStars() {
    for (var i = 0; i < STARS.length; i++) {
      var s = STARS[i], f = s.fly;
      if (!f) continue;
      f.p = Math.min(1, f.p + S.dt / (S.reduce ? 0.05 : 0.8));
      var e = 1 - Math.pow(1 - f.p, 3);
      var x = U.lerp(f.x0, f.x1, e), y = U.lerp(f.y0, f.y1, e) - Math.sin(f.p * Math.PI) * 90;
      C.drawStar(ctx, x, y, U.lerp(12 * S.k, 7, f.p), f.p * 6, '#f7e26b', '#171717');
      if (f.p >= 1) {
        s.fly = null;
        got++;
        tallyEl.textContent = got;
        tallyBox.classList.remove('pop');
        void tallyBox.offsetWidth;
        tallyBox.classList.add('pop');
        if (got === STARS.length) tallyBox.classList.add('all');
      }
    }
  }

  var last = 0;
  function tick(now) {
    var dt = last ? U.clamp((now - last) / 1000, 0, 0.05) : 0.016;
    last = now;
    S.dt = dt;
    if (!S.reduce) S.t += dt;

    var target = camFromScroll(window.pageYOffset - trackTop);
    var f = S.reduce ? 1 : 1 - Math.pow(0.0009, dt);
    S.camX += (target - S.camX) * f;
    if (Math.abs(target - S.camX) < 0.05) S.camX = target;

    var sp = (S.camX - prevCam) / Math.max(dt, 1e-4);
    prevCam = S.camX;
    S.speed += (sp - S.speed) * Math.min(1, dt * 10);
    var acc = (S.speed - prevSpeed) / Math.max(dt, 1e-4);
    prevSpeed = S.speed;
    S.tilt += (U.clamp(-acc / 9000, -0.06, 0.06) - S.tilt) * Math.min(1, dt * 6);
    S.wheelA += (S.speed * dt) / 15;
    S.bob = S.reduce ? 0 : Math.sin(S.t * 22) * 0.6 + Math.sin(S.t * 7.3) * Math.min(1.8, Math.abs(S.speed) / 300);

    var pal = C.palAt(S.camX);
    S.P = pal.P; S.ww = pal.ww;

    var best = 0, bd = Infinity;
    for (var i = 0; i < N; i++) {
      var d = Math.abs(S.camX - STOPS[i].X);
      if (d < bd) { bd = d; best = i; }
      var gap = i < N - 1 ? STOPS[i + 1].X - STOPS[i].X : 1500;
      S.sw[i] = 1 - U.smooth(0, 1, d / (gap * 0.6));
    }
    setNearest(best);
    setActive(bd < 230 ? best : -1);

    collect();
    C.hits.length = 0;
    C.render(ctx, S);
    flyStars();
    if (pointer) updateHover();
  }
  function frame(now) { tick(now); requestAnimationFrame(frame); }
  C.tick = tick;

  navBtns.forEach(function (btn) { btn.addEventListener('click', function () { go(+btn.getAttribute('data-go')); }); });
  var brand = document.querySelector('.brand');
  if (brand) brand.addEventListener('click', function (e) { e.preventDefault(); go(0); });

  /* ---------- Clickable things in the world: signposts drive, screens enlarge ---------- */
  var pointer = null;
  function hitAt(p) {
    var r = canvas.getBoundingClientRect(), x = p.clientX - r.left, y = p.clientY - r.top;
    for (var i = C.hits.length - 1; i >= 0; i--) {
      var h = C.hits[i];
      if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return h;
    }
    return null;
  }
  function updateHover() {
    var h = hitAt(pointer);
    C.hover = h;
    canvas.style.cursor = h ? (h.action.go != null ? 'pointer' : 'zoom-in') : '';
  }
  canvas.addEventListener('pointermove', function (e) { pointer = { clientX: e.clientX, clientY: e.clientY }; updateHover(); });
  canvas.addEventListener('pointerleave', function () { pointer = null; C.hover = null; canvas.style.cursor = ''; });
  canvas.addEventListener('click', function (e) {
    var h = hitAt(e);
    if (!h) return;
    if (h.action.go != null) { go(h.action.go); return; }
    if (h.action.img) {
      var sr = stage.getBoundingClientRect();
      openZoom(h.action.img.src, h.action.card, { x: sr.left + h.x, y: sr.top + h.y, w: h.w, h: h.h }, null);
    }
  });

  var zoom = document.getElementById('zoom'), zoomImg = document.getElementById('zoom-img'), zoomCap = document.getElementById('zoom-cap');
  var zoomFrom = null, zoomTrigger = null, zoomOpen = false;
  zoom.setAttribute('role', 'dialog');
  zoom.setAttribute('aria-modal', 'true');
  zoom.setAttribute('tabindex', '-1');

  /* Transform that puts the enlarged image back over the small one it came from. */
  function shrunk(rect) {
    /* offset* ignore the transform, so this stays right even mid-animation */
    var z = zoom.getBoundingClientRect(), w = zoomImg.offsetWidth, h = zoomImg.offsetHeight;
    if (!rect || !w || !h) return 'none';
    var left = z.left + zoomImg.offsetLeft, top = z.top + zoomImg.offsetTop;
    return 'translate(' + (rect.x - left) + 'px,' + (rect.y - top) + 'px) scale(' + rect.w / w + ',' + rect.h / h + ')';
  }

  function openZoom(src, cardId, rect, trigger) {
    var card = document.getElementById(cardId), shot = card && card.querySelector('.shot'), title = card && card.querySelector('h2');
    zoomImg.src = src;
    zoomImg.alt = shot ? shot.alt : '';
    zoomCap.textContent = (title ? title.textContent + ' · ' : '') + 'Click again to close';
    zoom.setAttribute('aria-label', title ? title.textContent : 'Enlarged image');
    zoomFrom = rect; zoomTrigger = trigger; zoomOpen = true;
    zoomImg.style.opacity = '0';
    zoom.hidden = false;
    var start = function () {
      if (!zoomOpen) return;
      zoomImg.style.transition = 'none';
      zoomImg.style.transform = S.reduce ? 'none' : shrunk(rect);
      void zoomImg.offsetWidth;
      zoomImg.style.transition = '';
      zoomImg.style.opacity = '';
      zoom.classList.add('is-open');
      zoomImg.style.transform = 'none';
      try { zoom.focus({ preventScroll: true }); } catch (err) { zoom.focus(); }
    };
    var started = false, begin = function () { if (!started) { started = true; start(); } };
    if (zoomImg.decode) zoomImg.decode().then(begin, begin); else begin();
    setTimeout(begin, 250);
  }

  function closeZoom(backToScreen) {
    if (!zoomOpen) return;
    zoomOpen = false;
    zoom.classList.remove('is-open');
    if (S.reduce || !backToScreen) zoomImg.style.opacity = '0';
    else zoomImg.style.transform = shrunk(zoomFrom);
    setTimeout(function () {
      if (zoomOpen) return;
      zoom.hidden = true;
      zoomImg.style.transform = '';
      zoomImg.style.opacity = '';
    }, S.reduce ? 0 : 460);
    if (zoomTrigger) { try { zoomTrigger.focus({ preventScroll: true }); } catch (err) { zoomTrigger.focus(); } }
  }

  zoom.addEventListener('click', function () { closeZoom(true); });
  window.addEventListener('scroll', function () { if (zoomOpen) closeZoom(false); }, { passive: true });
  Array.prototype.forEach.call(document.querySelectorAll('.shot-btn'), function (btn) {
    btn.addEventListener('click', function () {
      var img = btn.querySelector('.shot'), r = img.getBoundingClientRect(), card = btn.closest('.stop');
      openZoom(img.currentSrc || img.src, card ? card.id : '', { x: r.left, y: r.top, w: r.width, h: r.height }, btn);
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    if (zoomOpen) {
      if (/^(Escape|Enter| |ArrowLeft|ArrowRight)$/.test(e.key)) { e.preventDefault(); closeZoom(true); }
      return;
    }
    if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName || '')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); go(scrollStop() + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(scrollStop() - 1); }
  });

  window.addEventListener('wheel', function (e) {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.2 && !(e.target.closest && e.target.closest('.stop'))) {
      window.scrollBy(0, e.deltaX);
      e.preventDefault();
    }
  }, { passive: false });

  Array.prototype.forEach.call(document.querySelectorAll('[data-copy]'), function (btn) {
    btn.addEventListener('click', function () {
      var reset = function (msg) { btn.textContent = msg; setTimeout(function () { btn.textContent = 'Copy'; }, 1600); };
      var select = function () {
        var el = document.getElementById(btn.getAttribute('data-target'));
        if (el && window.getSelection) { var r = document.createRange(); r.selectNodeContents(el); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); }
        reset('Selected');
      };
      try { navigator.clipboard.writeText(btn.getAttribute('data-copy')).then(function () { reset('Copied'); }, select); }
      catch (err) { select(); }
    });
  });

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var rel = (window.pageYOffset - trackTop) / vh;
      layout();
      window.scrollTo(0, trackTop + rel * vh);
    }, 120);
  });
  if (mq.addEventListener) mq.addEventListener('change', function () { S.reduce = mq.matches; });

  if (document.fonts && document.fonts.load) {
    ['600 12px "IBM Plex Mono"', '600 12px Poppins', '700 24px Fraunces'].forEach(function (f) { document.fonts.load(f).catch(function () {}); });
  }

  layout();
  var hashIndex = -1;
  if (location.hash) cards.forEach(function (c, j) { if ('#' + c.id === location.hash) hashIndex = j; });
  if (hashIndex > 0) window.scrollTo(0, scrollForStop(hashIndex));
  S.camX = prevCam = camFromScroll(window.pageYOffset - trackTop);
  STARS.forEach(function (s) { if (S.camX >= s.X - 40) { s.got = true; got++; } });
  tallyEl.textContent = got;
  active = -2; nearest = -2;
  requestAnimationFrame(frame);
})();
