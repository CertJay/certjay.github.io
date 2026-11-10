/* Interactive layer for the portfolio: theme toggle, scroll progress, live pipeline,
   data-cleaning demo, tech explorer. No dependencies. Everything degrades to static content. */
(function () {
  'use strict';
  var root = document.documentElement;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var mq = function (q) { return window.matchMedia && window.matchMedia(q).matches; };
  var reduce = mq('(prefers-reduced-motion: reduce)');
  var hasIO = 'IntersectionObserver' in window;
  root.classList.add('js');

  /* ---------- theme toggle ---------- */
  var themeBtn = $('#theme');
  function theme() { return root.getAttribute('data-theme') || (mq('(prefers-color-scheme: dark)') ? 'dark' : 'light'); }
  function paintThemeBtn() {
    if (!themeBtn) return;
    var t = theme();
    themeBtn.setAttribute('data-mode', t);
    themeBtn.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  }
  if (themeBtn) {
    paintThemeBtn();
    themeBtn.addEventListener('click', function () {
      var t = theme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', t);
      try { localStorage.setItem('theme', t); } catch (e) {}
      paintThemeBtn();
      document.dispatchEvent(new Event('themechange'));
    });
  }

  /* ---------- scroll progress + active nav link ---------- */
  var bar = $('#progress');
  if (bar) {
    var onScroll = function () {
      var h = root.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, window.scrollY / h) : 0) + ')';
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
  }
  var navLinks = $$('.links a[href^="#"]');
  if (hasIO && navLinks.length) {
    var byId = {};
    navLinks.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        navLinks.forEach(function (l) { l.classList.remove('on'); });
        if (byId[e.target.id]) byId[e.target.id].classList.add('on');
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    Object.keys(byId).forEach(function (id) { var el = document.getElementById(id); if (el) spy.observe(el); });
  }

  /* ---------- reveal on scroll, spotlight hover, count-up ---------- */
  var revealEls = $$('main section:not(.hero) .section-head, .case, .mini, .job, .cert, .contact, .demo-card, .tech, .edu');
  revealEls.forEach(function (el) { el.classList.add('reveal'); });
  if (reduce || !hasIO) revealEls.forEach(function (el) { el.classList.add('in'); });
  else {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); ro.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(function (el) { ro.observe(el); });
  }

  if (mq('(hover: hover)')) {
    $$('.case, .mini, .stat, .cert').forEach(function (el) {
      el.classList.add('glow');
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  var counters = $$('[data-count]');
  if (counters.length && hasIO && !reduce) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        co.unobserve(e.target);
        var el = e.target, end = +el.getAttribute('data-count'), suf = el.getAttribute('data-suffix') || '', t0 = 0;
        (function tick(now) {
          if (!t0) t0 = now;
          var p = Math.min(1, (now - t0) / 900), eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(end * eased) + (p === 1 ? suf : '');
          if (p < 1) requestAnimationFrame(tick);
        })(performance.now());
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { co.observe(el); });
  }

  /* ---------- hero: live pipeline ----------
     Records flow Sources -> Validate -> Model -> Serve. At the gate each row is loaded,
     quarantined or dropped as a duplicate, and the counts always reconcile. */
  (function pipeline() {
    var cv = $('#pipe');
    if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d');
    var out = { in: $('#c-in'), ok: $('#c-ok'), bad: $('#c-bad'), dup: $('#c-dup') };
    var mess = $('#mess'), messOut = $('#mess-out'), note = $('#pipe-note'), toggle = $('#pipe-toggle');
    var stageBtns = $$('.pipe-stages button');
    var NOTES = [
      '<b>Collect.</b> 46 school workbooks, gathered and encoded in the field.',
      '<b>Validate.</b> Rules catch duplicates, blanks and text in number columns before anything loads. In one file they exposed 22 duplicate IDs.',
      '<b>Model.</b> Clean rows land in tables with agreed definitions, like e-QUAART’s performance levels and the DCP equipment rule.',
      '<b>Serve.</b> Dashboards where HR, Supply and ICT each see only their own data, and every number traces back to a source row.'
    ];
    var LABELS = ['Sources', 'Validate', 'Model', 'Serve'];
    var W = 0, H = 0, col = {}, parts = [], active = 1;
    var counts = { in: 0, ok: 0, bad: 0, dup: 0 };
    var cells = [], cellAt = 0, bars = [3, 5, 2, 6, 4], shown = [0, 0, 0, 0, 0];
    var gateFlash = 0, gateTone = 'ok', binFlash = 0;
    var running = true, onScreen = true, raf = 0, last = 0, acc = 0, frame = 0;
    for (var i = 0; i < 20; i++) cells.push(0);

    function colors() {
      var cs = getComputedStyle(root), g = function (n) { return cs.getPropertyValue(n).trim(); };
      col = { accent: g('--accent'), ok: g('--ok'), bad: g('--bad'), muted: g('--muted'), line: g('--line'),
              ink: g('--ink'), surface: g('--surface'), soft: g('--accent-soft'), badSoft: g('--bad-soft') };
      col.glow = theme() === 'dark';
    }
    function size() {
      var r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      W = Math.max(260, r.width); H = Math.max(160, r.height);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function geo() {
      var top = 40, laneH = H - top - 58;
      return { xs: W * 0.07, xg: W * 0.35, xm: W * 0.63, xv: W * 0.905, top: top, bottom: top + laneH,
               cy: top + laneH * 0.5, binY: H - 20,
               lanes: [top + laneH * 0.1, top + laneH * 0.5, top + laneH * 0.9] };
    }
    var ease = function (t) { return t * t * (3 - 2 * t); };
    var lerp = function (a, b, t) { return a + (b - a) * t; };
    function rr(x, y, w, h, r) {
      ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }

    function spawn() {
      var m = +mess.value / 100, r = Math.random();
      parts.push({ lane: (Math.random() * 3) | 0, fate: r < m * 0.7 ? 'bad' : r < m ? 'dup' : 'ok',
                   phase: 0, t: 0, sp: 0.8 + Math.random() * 0.4, jy: (Math.random() - 0.5) * 14,
                   bar: (Math.random() * 5) | 0, x: 0, y: 0, y1: 0, px: null, py: 0 });
    }
    var DUR = [1.5, 1.2, 1.1, 0.9, 0.45]; /* to gate, to model, to serve, to quarantine, duplicate fade */

    function step(dt) {
      var g = geo();
      acc += dt * 9;
      while (acc >= 1) { acc -= 1; if (parts.length < 110) spawn(); }
      gateFlash = Math.max(0, gateFlash - dt * 3); binFlash = Math.max(0, binFlash - dt * 2.5);
      for (var c = 0; c < cells.length; c++) cells[c] = Math.max(0, cells[c] - dt * 0.22);
      var max = Math.max.apply(null, bars);
      for (var b = 0; b < 5; b++) { bars[b] *= 1 - dt * 0.05; shown[b] += ((bars[b] / max) - shown[b]) * Math.min(1, dt * 5); }

      for (var i = parts.length - 1; i >= 0; i--) {
        var p = parts[i];
        p.t += dt * p.sp / DUR[p.phase];
        var t = Math.min(1, p.t), e = ease(t);
        if (p.px !== null) { p.px += (p.x - p.px) * 0.3; p.py += (p.y - p.py) * 0.3; }
        if (p.phase === 0) {
          var ly = g.lanes[p.lane];
          p.x = lerp(g.xs + 12, g.xg, t); p.y = lerp(ly, g.cy + (ly - g.cy) * 0.4 + p.jy, e);
          if (t === 1) {
            counts.in++; counts[p.fate]++; gateFlash = 1; gateTone = p.fate; p.y1 = p.y; p.t = 0;
            p.phase = p.fate === 'ok' ? 1 : p.fate === 'bad' ? 3 : 4;
          }
        } else if (p.phase === 1) {
          p.x = lerp(g.xg, g.xm - 28, t); p.y = lerp(p.y1, g.cy + p.jy * 0.5, e);
          if (t === 1) { cells[cellAt] = 1; cellAt = (cellAt + 1) % cells.length; p.y1 = p.y; p.t = 0; p.phase = 2; }
        } else if (p.phase === 2) {
          var mh = (g.bottom - g.top) * 0.62;
          p.x = lerp(g.xm + 28, g.xv - 32.5 + p.bar * 14 + 4.5, t); p.y = lerp(p.y1, g.cy + mh / 2 - shown[p.bar] * mh, e);
          if (t === 1) { bars[p.bar] += 1; parts.splice(i, 1); }
        } else if (p.phase === 3) {
          p.x = g.xg + Math.sin(t * Math.PI) * 16; p.y = lerp(p.y1, g.binY - 7, t * t);
          if (t === 1) { binFlash = 1; parts.splice(i, 1); }
        } else if (t === 1) parts.splice(i, 1);
        if (p.px === null) { p.px = p.x; p.py = p.y; }
      }
    }

    function draw() {
      var g = geo(), laneH = g.bottom - g.top;
      ctx.fillStyle = col.surface; ctx.fillRect(0, 0, W, H);

      /* active stage halo + labels */
      var xs = [g.xs, g.xg, g.xm, g.xv];
      ctx.fillStyle = col.soft; ctx.globalAlpha = 0.75;
      rr(Math.max(2, Math.min(W - 78, xs[active] - 38)), 6, 76, g.bottom + 6, 12); ctx.fill(); ctx.globalAlpha = 1;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (var s = 0; s < 4; s++) {
        ctx.font = (s === active ? '600 ' : '500 ') + '12.5px "IBM Plex Sans", system-ui, sans-serif';
        ctx.fillStyle = s === active ? col.accent : col.muted;
        ctx.fillText(LABELS[s], Math.max(32, Math.min(W - 26, xs[s])), 20);
      }

      /* guide lines */
      ctx.strokeStyle = col.line; ctx.lineWidth = 1; ctx.setLineDash([3, 5]);
      g.lanes.forEach(function (ly) {
        ctx.beginPath(); ctx.moveTo(g.xs + 12, ly);
        ctx.bezierCurveTo(lerp(g.xs, g.xg, 0.5), ly, lerp(g.xs, g.xg, 0.6), g.cy + (ly - g.cy) * 0.4, g.xg, g.cy + (ly - g.cy) * 0.4); ctx.stroke();
      });
      ctx.beginPath(); ctx.moveTo(g.xg, g.cy); ctx.lineTo(g.xv - 34, g.cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(g.xg, g.bottom + 8); ctx.lineTo(g.xg, g.binY - 12); ctx.stroke();
      ctx.setLineDash([]);

      /* sources: three file glyphs */
      g.lanes.forEach(function (ly) {
        ctx.fillStyle = col.surface; ctx.strokeStyle = col.muted; ctx.lineWidth = 1.3;
        rr(g.xs - 9, ly - 11, 18, 22, 3); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = col.line; ctx.beginPath();
        ctx.moveTo(g.xs - 5, ly - 4); ctx.lineTo(g.xs + 5, ly - 4); ctx.moveTo(g.xs - 5, ly + 1); ctx.lineTo(g.xs + 5, ly + 1);
        ctx.moveTo(g.xs - 5, ly + 6); ctx.lineTo(g.xs + 2, ly + 6); ctx.stroke();
      });

      /* validation gate */
      var tone = gateTone === 'ok' ? col.ok : gateTone === 'bad' ? col.bad : col.muted;
      ctx.fillStyle = col.surface; rr(g.xg - 6, g.top - 6, 12, laneH + 12, 6); ctx.fill();
      ctx.strokeStyle = col.accent; ctx.lineWidth = 1.6; ctx.stroke();
      if (gateFlash > 0) { ctx.globalAlpha = gateFlash * 0.55; ctx.fillStyle = tone; rr(g.xg - 6, g.top - 6, 12, laneH + 12, 6); ctx.fill(); ctx.globalAlpha = 1; }

      /* quarantine bin */
      ctx.fillStyle = col.badSoft; rr(g.xg - 42, g.binY - 11, 84, 22, 6); ctx.fill();
      if (binFlash > 0) { ctx.globalAlpha = binFlash * 0.35; ctx.fillStyle = col.bad; rr(g.xg - 42, g.binY - 11, 84, 22, 6); ctx.fill(); ctx.globalAlpha = 1; }
      ctx.font = '600 11.5px "IBM Plex Sans", system-ui, sans-serif'; ctx.fillStyle = col.bad; ctx.fillText('Quarantine', g.xg, g.binY + 0.5);

      /* model: a table filling with rows */
      var cs = 9, gap = 3, cols = 4, rows = 5, gw = cols * cs + (cols - 1) * gap, gh = rows * cs + (rows - 1) * gap;
      for (var k = 0; k < cells.length; k++) {
        var cx = g.xm - gw / 2 + (k % cols) * (cs + gap), cyy = g.cy - gh / 2 + ((k / cols) | 0) * (cs + gap);
        ctx.fillStyle = col.line; rr(cx, cyy, cs, cs, 2); ctx.fill();
        if (cells[k] > 0.02) { ctx.globalAlpha = Math.min(1, 0.25 + cells[k]); ctx.fillStyle = col.ok; rr(cx, cyy, cs, cs, 2); ctx.fill(); ctx.globalAlpha = 1; }
      }

      /* serve: a bar chart */
      var bw = 9, bg = 5, tw = 5 * bw + 4 * bg, maxH = laneH * 0.62, base = g.cy + maxH / 2;
      for (var b = 0; b < 5; b++) {
        var h = Math.max(3, shown[b] * maxH), bx = g.xv - tw / 2 + b * (bw + bg);
        ctx.fillStyle = col.accent; ctx.globalAlpha = 0.35 + 0.65 * shown[b]; rr(bx, base - h, bw, h, 2); ctx.fill(); ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = col.muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(g.xv - tw / 2 - 4, base + 0.5); ctx.lineTo(g.xv + tw / 2 + 4, base + 0.5); ctx.stroke();

      /* records */
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i], t = Math.min(1, p.t);
        if (p.phase === 4) {
          ctx.globalAlpha = 1 - t; ctx.strokeStyle = col.muted; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.arc(p.x, p.y, 3 + t * 9, 0, 6.2832); ctx.stroke(); ctx.globalAlpha = 1; continue;
        }
        var pc = p.phase === 0 ? col.muted : p.phase === 3 ? col.bad : col.ok;
        if (p.px !== null) { ctx.strokeStyle = pc; ctx.globalAlpha = 0.3; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.globalAlpha = 1; }
        ctx.fillStyle = pc;
        if (col.glow) { ctx.shadowColor = pc; ctx.shadowBlur = 9; }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.phase === 0 ? 2.4 : 2.9, 0, 6.2832); ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    function paintCounts() {
      out.in.textContent = counts.in.toLocaleString('en-US'); out.ok.textContent = counts.ok.toLocaleString('en-US');
      out.bad.textContent = counts.bad.toLocaleString('en-US'); out.dup.textContent = counts.dup.toLocaleString('en-US');
    }
    function loop(now) {
      raf = 0;
      if (!running || !onScreen || document.hidden) return;
      var dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
      step(dt); draw();
      if (++frame % 5 === 0) paintCounts();
      raf = requestAnimationFrame(loop);
    }
    function start() { if (!raf && running && onScreen && !reduce) { last = performance.now(); raf = requestAnimationFrame(loop); } }
    function still() { /* reduced motion: one settled frame, no animation */
      parts = []; counts = { in: 0, ok: 0, bad: 0, dup: 0 };
      for (var i = 0; i < 260; i++) step(1 / 30);
      draw(); paintCounts();
    }
    function setActive(i) {
      if (i === active && note.innerHTML) return;
      active = i; note.innerHTML = NOTES[i];
      stageBtns.forEach(function (b, k) { b.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
      if (reduce || !running) draw();
    }

    colors(); size(); note.innerHTML = NOTES[active];
    stageBtns.forEach(function (b, k) { b.addEventListener('click', function () { setActive(k); }); });
    cv.addEventListener('pointermove', function (e) {
      var r = cv.getBoundingClientRect(), x = e.clientX - r.left, g = geo(), xs = [g.xs, g.xg, g.xm, g.xv], best = 0;
      for (var k = 1; k < 4; k++) if (Math.abs(xs[k] - x) < Math.abs(xs[best] - x)) best = k;
      setActive(best);
    });
    mess.addEventListener('input', function () { messOut.textContent = mess.value + '%'; if (reduce) still(); });
    messOut.textContent = mess.value + '%';
    if (toggle) {
      if (reduce) toggle.hidden = true;
      toggle.addEventListener('click', function () {
        running = !running; toggle.textContent = running ? 'Pause' : 'Play';
        toggle.setAttribute('aria-pressed', running ? 'false' : 'true');
        if (running) start(); else paintCounts();
      });
    }
    var redo = function () { colors(); size(); if (reduce) still(); else draw(); };
    window.addEventListener('resize', redo);
    document.addEventListener('themechange', redo);
    if (window.matchMedia) { var dm = window.matchMedia('(prefers-color-scheme: dark)'); if (dm.addEventListener) dm.addEventListener('change', redo); }
    document.addEventListener('visibilitychange', start);
    if (hasIO) new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; start(); }).observe(cv);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (reduce) still(); });
    if (reduce) still(); else { draw(); start(); }
  })();

  /* ---------- try it: clean a messy sheet ----------
     Five rules, applied in order. Each row ends loaded, quarantined or dropped,
     and the counts always reconcile back to the rows that came in. */
  (function demo() {
    var wrap = $('#demo-card'), tbody = $('#rows');
    if (!wrap || !tbody) return;
    var RAW = [
      { school: 'Luntian ES',                item: 'Laptop',    qty: '5 pcs',   serial: 'LT-0412', cond: 'svc' },
      { school: 'LUNTIAN ELEM. SCHOOL',      item: 'Projector', qty: '2',       serial: 'PJ-1180', cond: 'Serviceable' },
      { school: 'Maligaya ES',               item: 'Desktop',   qty: '3 units', serial: '',        cond: 'unsvc' },
      { school: 'maligaya es ',              item: 'Laptop',    qty: '1',       serial: 'LT-0533', cond: 'Serviceable' },
      { school: 'Sampaguita NHS',            item: 'Printer',   qty: '1 pc',    serial: 'PR-2207', cond: 'For repair' },
      { school: 'Luntian Elementary School', item: 'Laptop',    qty: '5',       serial: 'LT-0412', cond: 'Serviceable' },
      { school: 'Sampaguita NHS',            item: 'Tablet',    qty: '12 pcs',  serial: 'TB-3301', cond: 'SVC.' },
      { school: 'Maligaya ES',               item: 'Router',    qty: '—',  serial: 'RT-0090', cond: 'Serviceable' },
      { school: 'Luntian ES',                item: 'Smart TV',  qty: '1 unit',  serial: 'TV-0751', cond: 'for repair' },
      { school: 'Sampaguita N.H.S.',         item: 'Desktop',   qty: '6',       serial: 'DT-1402', cond: 'Unserviceable' }
    ];
    var key = function (s) { return String(s).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); };
    var SCHOOL = { 'luntian es': 'Luntian ES', 'luntian elem school': 'Luntian ES', 'luntian elementary school': 'Luntian ES',
                   'maligaya es': 'Maligaya ES', 'sampaguita nhs': 'Sampaguita NHS', 'sampaguita n h s': 'Sampaguita NHS' };
    var COND = { 'svc': 'Serviceable', 'serviceable': 'Serviceable', 'unsvc': 'Unserviceable', 'unserviceable': 'Unserviceable', 'for repair': 'For repair' };
    var isNum = function (v) { return typeof v === 'number' || /^\d+$/.test(String(v).trim()); };
    var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var boxes = $$('[data-rule]', wrap);
    var on = function (r) { return $('[data-rule="' + r + '"]', wrap).checked; };

    function run() {
      boxes.forEach(function (b) { b.parentNode.classList.toggle('on', b.checked); });
      var rows = RAW.map(function (r, i) {
        var o = { n: i + 1, school: r.school, item: r.item, qty: r.qty, serial: r.serial, cond: r.cond, fix: {}, notes: [], status: 'loaded' };
        if (on('names')) { var c = SCHOOL[key(o.school)]; if (c && c !== o.school) { o.school = c; o.fix.school = 1; o.notes.push('school renamed'); } }
        if (on('qty') && !isNum(o.qty)) { var m = String(o.qty).match(/^\s*(\d+)/); if (m) { o.notes.push('"' + o.qty + '" to ' + m[1]); o.qty = +m[1]; o.fix.qty = 1; } }
        if (on('cond')) { var k = COND[key(o.cond)]; if (k && k !== o.cond) { o.cond = k; o.fix.cond = 1; o.notes.push('condition fixed'); } }
        if (on('reject')) {
          if (!o.serial) { o.status = 'quarantined'; o.notes = ['no serial number']; }
          else if (!isNum(o.qty)) { o.status = 'quarantined'; o.notes = [String(o.qty).trim() === '—' ? 'quantity missing' : 'quantity is text']; }
        }
        return o;
      });
      if (on('dedupe')) {
        var seen = {};
        rows.forEach(function (o) {
          if (o.status !== 'loaded') return;
          var k = key(o.school) + '|' + o.serial;
          if (seen[k]) { o.status = 'dropped'; o.notes = ['duplicate of row ' + seen[k]]; } else seen[k] = o.n;
        });
      }
      render(rows);
    }
    function cell(o, f, cls) {
      var v = o[f], inner = f === 'serial' && !v ? '<em class="blank">blank</em>'
        : o.fix[f] ? '<span class="fix">' + esc(v) + '</span>' : esc(v);
      return '<td' + (cls ? ' class="' + cls + '"' : '') + '>' + inner + '</td>';
    }
    function render(rows) {
      tbody.innerHTML = rows.map(function (o) {
        var mark = o.status === 'quarantined' ? '✕' : o.status === 'dropped' ? '–' : '✓';
        return '<tr class="' + o.status + '"><td class="n">' + o.n + '</td><td class="mk"><i title="' + o.status + '">' + mark + '</i><span class="sr">' + o.status + '</span></td>'
          + cell(o, 'school') + cell(o, 'item', 'c-item') + cell(o, 'qty', 'q') + cell(o, 'serial', 's c-serial') + cell(o, 'cond', 'c-cond')
          + '<td class="note">' + esc(o.notes.join(', ')) + '</td></tr>';
      }).join('');
      var L = rows.filter(function (o) { return o.status === 'loaded'; }),
          Q = rows.filter(function (o) { return o.status === 'quarantined'; }).length,
          D = rows.filter(function (o) { return o.status === 'dropped'; }).length;
      $('#eq').innerHTML = rows.length + ' rows in = <span class="g">' + L.length + ' loaded</span> + <span class="r">' + Q + ' quarantined</span> + <span class="d">' + D + ' dropped</span>';
      var text = L.filter(function (o) { return !isNum(o.qty); }).length, total = $('#total'), why = $('#why');
      if (text) {
        total.textContent = '#VALUE!'; total.className = 'total err';
        why.textContent = 'The quantity total can’t be computed: ' + text + ' loaded ' + (text === 1 ? 'row has' : 'rows have') + ' text in a number column.';
      } else {
        total.textContent = L.reduce(function (a, o) { return a + Number(o.qty); }, 0) + ' units'; total.className = 'total';
        why.textContent = 'Total quantity of loaded rows. ' + (!on('dedupe') ? 'Row 6 repeats row 1, so switch on rule 5 to drop it.'
          : !on('names') ? 'Rule 5 matches on school and serial, so it can’t see that row 6 repeats row 1 until names are standardized.'
          : 'Every row is accounted for, and each item is counted once.');
      }
    }

    var timer = 0;
    var stop = function () { if (timer) { clearTimeout(timer); timer = 0; } };
    boxes.forEach(function (b) { b.addEventListener('change', function () { stop(); run(); }); });
    $('#run-all').addEventListener('click', function () { stop(); boxes.forEach(function (b) { b.checked = true; }); run(); });
    $('#reset').addEventListener('click', function () { stop(); boxes.forEach(function (b) { b.checked = false; }); run(); });
    run();
    /* one orchestrated moment: the first time the sheet scrolls into view, the rules switch on in order */
    if (reduce || !hasIO) { boxes.forEach(function (b) { b.checked = true; }); run(); }
    else {
      var once = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return;
        once.disconnect();
        var i = 0;
        (function next() {
          timer = setTimeout(function () {
            if (i >= boxes.length) { timer = 0; return; }
            boxes[i++].checked = true; run(); next();
          }, i === 0 ? 700 : 750);
        })();
      }, { threshold: 0.35 });
      once.observe(wrap);
    }
  })();

  /* ---------- tech explorer ---------- */
  (function tech() {
    var box = $('#tech');
    if (!box) return;
    var chips = $$('.chip', box), filters = $$('.tech-filter button', box);
    var name = $('#t-name'), cat = $('#t-cat'), desc = $('#t-desc');
    function select(chip) {
      chips.forEach(function (c) { c.classList.toggle('sel', c === chip); });
      name.textContent = chip.textContent; cat.textContent = chip.getAttribute('data-label'); desc.textContent = chip.getAttribute('data-d');
    }
    chips.forEach(function (c) {
      c.addEventListener('click', function () { select(c); });
      c.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') select(c); });
      c.addEventListener('focus', function () { select(c); });
    });
    filters.forEach(function (f) {
      f.addEventListener('click', function () {
        var want = f.getAttribute('data-f');
        filters.forEach(function (x) { x.setAttribute('aria-pressed', x === f ? 'true' : 'false'); });
        var first = null;
        chips.forEach(function (c) {
          var hit = want === 'all' || c.getAttribute('data-cat') === want;
          c.classList.toggle('off', !hit);
          if (hit && !first) first = c;
        });
        if (want !== 'all' && first) select(first);
      });
    });
  })();
})();
