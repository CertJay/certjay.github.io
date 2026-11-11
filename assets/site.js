/* Interactive layer for the portfolio: theme toggle, scroll progress, role lens,
   data-cleaning demo with live analytics, tech explorer. No dependencies. Everything degrades to static content. */
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

  /* ---------- hero: role lens ----------
     Static evidence per data role. No animation. ?for=engineer|analytics-engineer|analyst|business-analyst
     opens a role directly, so a link sent with an application lands on the right proof. */
  (function lens() {
    var box = $('#lens');
    if (!box) return;
    var tabs = $$('[role="tab"]', box);
    function pick(tab, focus) {
      tabs.forEach(function (t) {
        var sel = t === tab;
        t.setAttribute('aria-selected', sel ? 'true' : 'false');
        t.tabIndex = sel ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !sel;
      });
      if (focus) tab.focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { pick(t); });
      t.addEventListener('keydown', function (e) {
        var k = e.key, n = tabs.length, j = -1;
        if (k === 'ArrowRight' || k === 'ArrowDown') j = (i + 1) % n;
        else if (k === 'ArrowLeft' || k === 'ArrowUp') j = (i - 1 + n) % n;
        else if (k === 'Home') j = 0; else if (k === 'End') j = n - 1;
        if (j > -1) { e.preventDefault(); pick(tabs[j], true); }
      });
    });
    var want = '';
    try { want = new URLSearchParams(location.search).get('for') || ''; } catch (e) {}
    var aliases = { 'data-engineer': 'engineer', de: 'engineer', ae: 'analytics-engineer', 'data-analyst': 'analyst', da: 'analyst', ba: 'business-analyst', bi: 'analyst' };
    want = aliases[want.toLowerCase()] || want.toLowerCase();
    tabs.forEach(function (t) { if (t.getAttribute('data-role') === want) pick(t); });
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
      var sum = L.reduce(function (a, o) { return a + (isNum(o.qty) ? Number(o.qty) : 0); }, 0);
      total.textContent = sum + ' units';
      if (text) {
        total.className = 'total err';
        why.textContent = 'Understated: SUM skips text cells without an error, so ' + text + ' loaded ' + (text === 1 ? 'row adds' : 'rows add') + ' nothing to the total.';
      } else {
        total.className = 'total';
        why.textContent = 'Total quantity of loaded rows. ' + (!on('dedupe') ? 'Row 6 repeats row 1, so switch on rule 5 to drop it.'
          : !on('names') ? 'Rule 5 matches on school and serial, so it can’t see that row 6 repeats row 1 until names are standardized.'
          : 'Every row is accounted for, and each item is counted once.');
      }
      report(L, Q, text);
    }

    /* ---------- the report built from the loaded rows ----------
       Grouped exactly as a pivot table would: by the literal cell value, and text quantities count as 0. */
    var CANON = ['Serviceable', 'For repair', 'Unserviceable'];
    var TONE = { 'Serviceable': 'c-ok', 'For repair': 'c-warn', 'Unserviceable': 'c-bad' };
    function group(rows, f) {
      var m = {}, order = [];
      rows.forEach(function (o) {
        var k = String(o[f]);
        if (!(k in m)) { m[k] = 0; order.push(k); }
        m[k] += isNum(o.qty) ? Number(o.qty) : 0;
      });
      return order.map(function (k) { return { k: k, v: m[k] }; }).sort(function (a, b) { return b.v - a.v; });
    }
    function bars(el, data, tone, canon) {
      var max = Math.max.apply(null, data.map(function (d) { return d.v; }).concat([1]));
      el.innerHTML = data.map(function (d) {
        var raw = canon && canon.indexOf(d.k) < 0;
        return '<div class="r' + (raw ? ' raw' : '') + '"><span title="' + esc(d.k) + '">' + esc(d.k.trim() || '(blank)') + '</span>'
          + '<div class="bar"><i class="' + (raw ? 'c-raw' : tone(d.k)) + '" style="width:' + Math.round(d.v / max * 100) + '%"></i></div><small>' + d.v + '</small></div>';
      }).join('');
    }
    function report(L, Q, text) {
      var units = L.reduce(function (a, o) { return a + (isNum(o.qty) ? Number(o.qty) : 0); }, 0);
      var bySchool = group(L, 'school'), byCond = group(L, 'cond');
      var canonSchools = {}; L.forEach(function (o) { canonSchools[SCHOOL[key(o.school)] || key(o.school)] = 1; });
      var realSchools = Object.keys(canonSchools).length;
      var svc = 0, act = 0;
      byCond.forEach(function (d) { if (d.k === 'Serviceable') svc += d.v; if (d.k === 'For repair' || d.k === 'Unserviceable') act += d.v; });
      var rawConds = byCond.filter(function (d) { return CANON.indexOf(d.k) < 0; }).map(function (d) { return d.k; });

      /* a duplicate the report can't see: same item and serial at the same real school */
      var seen = {}, dup = null;
      L.forEach(function (o) { var k = (SCHOOL[key(o.school)] || key(o.school)) + '|' + o.serial; if (seen[k] && !dup) dup = [seen[k], o.n]; else seen[k] = o.n; });

      var issues = [];
      if (bySchool.length > realSchools) issues.push('<b>' + realSchools + ' schools show up as ' + bySchool.length + ' bars</b>, because the names are typed differently.');
      if (text) issues.push('<b>' + text + (text === 1 ? ' row counts' : ' rows count') + ' as zero</b>, because the quantity is text. Nothing warns you.');
      if (rawConds.length) issues.push('<b>Condition is typed ' + rawConds.length + ' unrecognized ' + (rawConds.length === 1 ? 'way' : 'ways') + '</b> (' + rawConds.map(esc).join(', ') + '), so the serviceable rate misses ' + (rawConds.length === 1 ? 'it' : 'them') + '.');
      if (dup) issues.push('<b>Row ' + dup[1] + ' repeats row ' + dup[0] + '</b>, so that laptop is counted twice.');

      var set = function (id, v, bad, sub) { var el = $(id); el.innerHTML = v + (sub ? '<small>' + sub + '</small>' : ''); el.parentNode.classList.toggle('err', !!bad); };
      set('#k-units', units, text || dup);
      set('#k-schools', bySchool.length, bySchool.length > realSchools, bySchool.length > realSchools ? 'really ' + realSchools : '');
      set('#k-svc', units ? Math.round(svc / units * 100) + '%' : '–', rawConds.length || text);
      set('#k-act', act, rawConds.length || text);
      bars($('#ch-school'), bySchool, function () { return ''; }, null);
      bars($('#ch-cond'), byCond, function (k) { return TONE[k]; }, CANON);

      var state = $('#r-state'), f = $('#finding');
      if (issues.length) {
        state.className = 'pill pill-wip'; state.textContent = 'Not decision-ready';
        f.className = 'finding';
        f.innerHTML = 'These numbers would look fine in a meeting, but they’re wrong:<ul><li>' + issues.join('</li><li>') + '</li></ul>';
      } else {
        state.className = 'pill pill-ok'; state.textContent = 'Decision-ready';
        var top = bySchool[0], worst = null;
        L.forEach(function (o) { if (o.cond === 'Unserviceable' && (!worst || Number(o.qty) > Number(worst.qty))) worst = o; });
        f.className = 'finding ok';
        f.innerHTML = '<b>Finding:</b> ' + esc(top.k) + ' holds ' + top.v + ' of ' + units + ' units (' + Math.round(top.v / units * 100) + '%). '
          + (worst ? 'The biggest need is ' + worst.qty + ' unserviceable ' + esc(worst.item.toLowerCase()) + (Number(worst.qty) === 1 ? '' : 's') + ' at ' + esc(worst.school) + ', the first candidates for replacement. ' : '')
          + (Q ? Q + ' quarantined ' + (Q === 1 ? 'row goes' : 'rows go') + ' back to the school to fix, so ' + (Q === 1 ? 'it isn’t' : 'they aren’t') + ' lost.' : '');
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
