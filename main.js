/* ── reveal on scroll ─────────────────────────── */
(function () {
  var items = document.querySelectorAll('.reveal');

  items.forEach(function (el) {
    var d = el.getAttribute('data-delay');
    if (d) el.style.setProperty('--d', d);
  });

  if (!('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('in'); });
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in');
      io.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });

  items.forEach(function (el) { io.observe(el); });
})();

/* ── click-to-copy (email, phone, …) ──────────── */
(function () {
  var buttons = document.querySelectorAll('.copy');
  if (!buttons.length) return;

  buttons.forEach(function (btn) {
    var out = btn.parentElement.querySelector('.copy__done');
    var timer;

    btn.addEventListener('click', function () {
      var value = btn.getAttribute('data-copy');

      var done = function () {
        if (!out) return;
        out.textContent = 'Copied';
        clearTimeout(timer);
        timer = setTimeout(function () { out.textContent = ''; }, 2200);
      };

      var fallback = function () {
        var f = document.createElement('textarea');
        f.value = value;
        f.setAttribute('readonly', '');
        f.style.cssText = 'position:absolute;left:-9999px';
        document.body.appendChild(f);
        f.select();
        try { document.execCommand('copy'); done(); }
        catch (e) { window.location.href = btn.getAttribute('data-fallback-href') || '#'; }
        document.body.removeChild(f);
      };

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(value).then(done).catch(fallback);
      } else {
        fallback();
      }
    });
  });
})();

/* ── footer year ──────────────────────────────── */
(function () {
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();

/* ── ink: drops fuse via the goo filter, chase cursor ─
   Each drop eases toward the pointer at its own rate —
   that stagger, plus the goo filter's alpha-threshold
   fusing overlapping circles into one body, is what
   reads as viscous liquid instead of blobs sliding
   past each other. Idle wander when untouched, so the
   panel isn't dead before anyone moves the mouse.     */
(function () {
  var link = document.querySelector('.aside__link');
  var box = document.querySelector('.ink');
  var drops = [].slice.call(document.querySelectorAll('.drop'));
  if (!link || !box || !drops.length) return;

  // idle cluster sits right-of-centre, as a fraction of the box's
  // own width — 0.5 would be dead centre, 1.0 the right edge.
  var REST_X_FRAC = 0.70;

  // reduced motion: settle into a resting cluster, no animation loop at all
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var r0 = box.getBoundingClientRect();
    var restX = (REST_X_FRAC - 0.5) * r0.width;
    var rest = [[6, -4], [-10, 10], [14, 12], [-6, -12], [2, 4]];
    drops.forEach(function (el, i) {
      var p = rest[i % rest.length];
      el.style.setProperty('--dx', (restX + p[0]) + 'px');
      el.style.setProperty('--dy', p[1] + 'px');
    });
    return;
  }
  if (!window.matchMedia('(pointer: fine)').matches) return;

  // ease, pull toward pointer, idle-orbit radius/speed/phase.
  // Radii are deliberately larger than the drops themselves —
  // that's what lets them separate at rest and only fuse when
  // the pointer drags the lead drop through the others.
  var CFG = [
    { e: 0.11, pull: 0.90, ir: 34, is: 0.00028, ip: 0.0 },
    { e: 0.065,pull: 0.62, ir: 52, is: 0.00019, ip: 1.4 },
    { e: 0.05, pull: 0.46, ir: 64, is: 0.00023, ip: 3.0 },
    { e: 0.08, pull: 0.34, ir: 46, is: 0.00031, ip: 4.6 },
    { e: 0.06, pull: 0.24, ir: 38, is: 0.00042, ip: 5.7 }
  ];

  var pointer = { x: 0, y: 0, active: false };
  var state = CFG.map(function () { return { x: 0, y: 0 }; });

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  // coordinates are local to .ink, and clamp INTO it — so hovering the
  // text on the left just pins the drops to the box's own left edge
  // rather than letting them (or the maths) escape the container.
  link.addEventListener('pointermove', function (e) {
    var r = box.getBoundingClientRect();
    pointer.x = clamp01((e.clientX - r.left) / r.width) - 0.5;
    pointer.y = clamp01((e.clientY - r.top) / r.height) - 0.5;
    pointer.active = true;
  }, { passive: true });

  link.addEventListener('pointerleave', function () { pointer.active = false; });

  function paint(t) {
    var r = box.getBoundingClientRect();
    var restX = (REST_X_FRAC - 0.5) * r.width;

    for (var i = 0; i < drops.length; i++) {
      var c = CFG[i], s = state[i];

      var ix = Math.cos(t * c.is + c.ip) * c.ir;
      var iy = Math.sin(t * c.is * 1.2 + c.ip) * c.ir * 0.8;

      var tx, ty;
      if (pointer.active) {
        // full-range tracking, unbiased — the right-side rest
        // point only applies once the pointer leaves the panel
        tx = pointer.x * r.width * c.pull + ix;
        ty = pointer.y * r.height * c.pull + iy;
      } else {
        tx = restX + ix;
        ty = iy;
      }

      s.x += (tx - s.x) * c.e;
      s.y += (ty - s.y) * c.e;

      drops[i].style.setProperty('--dx', s.x.toFixed(2) + 'px');
      drops[i].style.setProperty('--dy', s.y.toFixed(2) + 'px');
    }
  }

  // only animate while the panel is actually near the viewport — paint()
  // reads getBoundingClientRect() every frame, and the panel sits at the
  // very bottom of the page, so unguarded this burns a forced layout per
  // frame the whole time someone is reading the hero
  var running = false, rafId = 0;

  function loop(t) { rafId = requestAnimationFrame(loop); paint(t); }
  function start() { if (!running) { running = true; rafId = requestAnimationFrame(loop); } }
  function stop()  { if (running) { running = false; cancelAnimationFrame(rafId); } }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) start(); else stop();
    }, { rootMargin: '250px' }).observe(link);
  } else {
    start();
  }
})();

/* ── custom cursor: small dot, long fading trail ─
   Fine pointers only (no touch), and only when the
   visitor hasn't asked for reduced motion.        */
(function () {
  var fine = window.matchMedia('(pointer: fine)').matches;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!fine || reduce) return;

  var canvas = document.createElement('canvas');
  canvas.className = 'trail-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  var ctx = canvas.getContext('2d');

  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  function resize() {
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    canvas.style.width = innerWidth + 'px';
    canvas.style.height = innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  var accentHex = getComputedStyle(document.documentElement)
    .getPropertyValue('--accent').trim() || '#A8401A';
  var rgb = (function (hex) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  })(accentHex);
  var rgbStr = rgb.join(',');

  var DOT_R = 3;        // the dot itself, in CSS px
  var TRAIL_MS = 420;   // how long the tail takes to fade

  var points = [];      // {x, y, t} — trail history, ages out
  var head = null;      // last known position — kept independently of the
                        // trail, or the dot vanishes when the mouse holds
                        // still and `cursor:none` leaves nothing on screen
  var visible = false;

  document.documentElement.classList.add('custom-cursor');

  window.addEventListener('pointermove', function (e) {
    visible = true;
    head = { x: e.clientX, y: e.clientY };
    points.push({ x: e.clientX, y: e.clientY, t: performance.now() });
  }, { passive: true });

  window.addEventListener('pointerleave', function () {
    visible = false;
    points.length = 0;   // don't let the tail jump on re-entry
  });
  window.addEventListener('blur', function () { points.length = 0; });

  function frame() {
    requestAnimationFrame(frame);
    var now = performance.now();
    while (points.length && now - points[0].t > TRAIL_MS) points.shift();

    ctx.clearRect(0, 0, innerWidth, innerHeight);

    for (var i = 1; i < points.length; i++) {
      var a = points[i - 1], b = points[i];
      var life = 1 - (now - b.t) / TRAIL_MS;   // 1 = newest, 0 = fully faded
      if (life <= 0) continue;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = 'rgba(' + rgbStr + ',' + (life * 0.5).toFixed(3) + ')';
      ctx.lineWidth = Math.max(0.6, DOT_R * 1.3 * life);
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    if (visible && head) {
      ctx.beginPath();
      ctx.fillStyle = 'rgb(' + rgbStr + ')';
      ctx.arc(head.x, head.y, DOT_R, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  requestAnimationFrame(frame);
})();

/* ── cursor ring: labeled hover state for links ─
   A bordered circle (never filled) that grows and
   picks up a label over two specific targets — the
   project link and the UI-work link — and stays a
   plain "little big" circle over every other link or
   button. Fades the dot+trail out while active, so
   there's only ever one cursor indicator on screen. */
(function () {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var ring = document.createElement('div');
  ring.className = 'cursor-ring';
  ring.setAttribute('aria-hidden', 'true');

  var inner = document.createElement('div');
  inner.className = 'cursor-ring__inner';

  var label = document.createElement('span');
  label.className = 'cursor-ring__label';

  inner.appendChild(label);
  ring.appendChild(inner);
  document.body.appendChild(ring);

  var canvas = document.querySelector('.trail-canvas');   // dot+trail, fades under the ring

  var pos = { x: innerWidth / 2, y: innerHeight / 2 };
  var cur = { x: pos.x, y: pos.y };
  var current = null;   // 'case' | 'ui' | 'link' | null

  function setState(next) {
    if (next === current) return;
    current = next;

    var active = !!next;
    ring.classList.toggle('is-active', active);
    ring.classList.toggle('is-big', next === 'case' || next === 'ui');
    ring.classList.toggle('variant-case', next === 'case');
    label.textContent =
      next === 'case' ? 'Case study' :
      next === 'ui'   ? 'See UI websites' : '';

    if (canvas) canvas.style.opacity = active ? '0' : '1';
  }

  window.addEventListener('pointermove', function (e) {
    pos.x = e.clientX;
    pos.y = e.clientY;

    var t = e.target;
    var work = t.closest && t.closest('.work__link');
    var vis = !work && t.closest && t.closest('.aside__link');
    var link = !work && !vis && t.closest && t.closest('a, button');

    setState(work ? 'case' : vis ? 'ui' : link ? 'link' : null);
    kick();
  }, { passive: true });

  window.addEventListener('pointerleave', function () { setState(null); });

  // idles out once it catches up with the cursor, rather than holding a
  // rAF open for the whole session; pointermove kicks it back awake
  var running = false;

  function paint() {
    // eased, not 1:1 — a little lag is what makes it read as a
    // separate object trailing the cursor rather than glued to it
    cur.x += (pos.x - cur.x) * 0.22;
    cur.y += (pos.y - cur.y) * 0.22;
    ring.style.transform = 'translate3d(' + cur.x.toFixed(1) + 'px,' + cur.y.toFixed(1) + 'px,0)';

    if (Math.abs(pos.x - cur.x) < 0.1 && Math.abs(pos.y - cur.y) < 0.1) {
      running = false;
      return;
    }
    requestAnimationFrame(paint);
  }
  function kick() { if (!running) { running = true; requestAnimationFrame(paint); } }

  kick();
})();
