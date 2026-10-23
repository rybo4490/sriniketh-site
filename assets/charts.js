/* Interactive figures for the paper pages. Each figure is an SVG drawn from window.SITE_DATA.
   Style: points with thin 95 percent intervals, light gridlines on the value axis only, no value labels inside the plot. */
(function () {
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function pct(b) { return (Math.exp(b) - 1) * 100; }
  function fmt1(x) { return (Math.round(x * 10) / 10).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }
  function fmt0(x) { return Math.round(x).toLocaleString('en-US'); }
  function niceTicks(lo, hi, n) { var span = hi - lo, step = Math.pow(10, Math.floor(Math.log10(span / n))); var err = span / n / step; step *= err >= 7.5 ? 10 : err >= 3 ? 5 : err >= 1.5 ? 2 : 1; var t = [], v = Math.ceil(lo / step) * step; for (; v <= hi + 1e-9; v += step) t.push(Math.round(v * 1e6) / 1e6); return t; }

  // generic point-and-interval chart. series: [{x, y, lo, hi}], opts: {xLabel, yLabel, ref (y of reference line), vline (x), shade:[x0,x1], xTicks}
  function pointChart(host, series, opts) {
    host.innerHTML = '';
    var W = 640, H = 340, m = { t: 16, r: 18, b: 46, l: 54 };
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart', role: 'img', 'aria-label': opts.aria || '' }, host);
    var xs = series.map(function (d) { return d.x; }), xmin = Math.min.apply(null, xs), xmax = Math.max.apply(null, xs);
    var ylo = Math.min.apply(null, series.map(function (d) { return d.lo; })), yhi = Math.max.apply(null, series.map(function (d) { return d.hi; }));
    if (opts.ref !== undefined) { ylo = Math.min(ylo, opts.ref); yhi = Math.max(yhi, opts.ref); }
    var pad = (yhi - ylo) * 0.08; ylo -= pad; yhi += pad;
    var X = function (x) { return m.l + (x - xmin) / (xmax - xmin || 1) * (W - m.l - m.r); };
    var Y = function (y) { return H - m.b - (y - ylo) / (yhi - ylo) * (H - m.t - m.b); };
    if (opts.shade) el('rect', { x: X(opts.shade[0]) - (X(1) - X(0)) / 2, y: m.t, width: X(opts.shade[1]) - X(opts.shade[0]) + (X(1) - X(0)), height: H - m.t - m.b, class: 'shade' }, svg);
    niceTicks(ylo, yhi, 5).forEach(function (t) { el('line', { x1: m.l, x2: W - m.r, y1: Y(t), y2: Y(t), class: 'grid' }, svg); var tx = el('text', { x: m.l - 8, y: Y(t) + 4, class: 'tick', 'text-anchor': 'end' }, svg); tx.textContent = (opts.yFmt || fmt1)(t); });
    if (opts.ref !== undefined) el('line', { x1: m.l, x2: W - m.r, y1: Y(opts.ref), y2: Y(opts.ref), class: 'ref' }, svg);
    if (opts.vline !== undefined) el('line', { x1: X(opts.vline), x2: X(opts.vline), y1: m.t, y2: H - m.b, class: 'vline' }, svg);
    (opts.xTicks || xs).forEach(function (t) { var tx = el('text', { x: X(t), y: H - m.b + 18, class: 'tick', 'text-anchor': 'middle' }, svg); tx.textContent = opts.xFmt ? opts.xFmt(t) : t; });
    el('line', { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b, class: 'axis' }, svg);
    var xl = el('text', { x: (m.l + W - m.r) / 2, y: H - 8, class: 'label', 'text-anchor': 'middle' }, svg); xl.textContent = opts.xLabel || '';
    var yl = el('text', { x: 14, y: (m.t + H - m.b) / 2, class: 'label', 'text-anchor': 'middle', transform: 'rotate(-90 14 ' + (m.t + H - m.b) / 2 + ')' }, svg); yl.textContent = opts.yLabel || '';
    var marks = series.map(function (d) {
      var g = el('g', { class: 'mark' + (opts.isPre && opts.isPre(d) ? ' pre' : '') }, svg);
      el('line', { x1: X(d.x), x2: X(d.x), y1: Y(d.lo), y2: Y(d.hi), class: 'ci' }, g);
      el('circle', { cx: X(d.x), cy: Y(d.y), r: 4.2, class: 'pt' }, g);
      el('rect', { x: X(d.x) - 10, y: m.t, width: 20, height: H - m.t - m.b, class: 'hit' }, g);
      return g;
    });
    return { svg: svg, marks: marks, X: X, Y: Y };
  }

  // a readout sentence beneath a chart, driven by a slider over the series
  function slider(host, series, onPick, initial, label) {
    var wrap = document.createElement('div'); wrap.className = 'slider-row';
    if (label) { var lb = document.createElement('span'); lb.className = 'slider-label'; lb.textContent = label; wrap.appendChild(lb); }
    var input = document.createElement('input'); input.type = 'range'; input.min = 0; input.max = series.length - 1; input.value = initial; input.setAttribute('aria-label', 'Choose a point');
    var read = document.createElement('p'); read.className = 'readout-line';
    wrap.appendChild(input); host.appendChild(wrap); host.appendChild(read);
    function pick(i) { read.innerHTML = onPick(series[i], i); }
    input.addEventListener('input', function () { pick(+input.value); });
    pick(initial);
    return { pick: function (i) { input.value = i; pick(i); } };
  }
  function highlight(chart, i) { chart.marks.forEach(function (g, j) { g.classList.toggle('active', i === j); }); }
  function hookHover(chart, sl) { chart.marks.forEach(function (g, i) { g.addEventListener('mouseenter', function () { sl.pick(i); }); }); }

  function buttons(host, items, onChange) {
    var row = document.createElement('div'); row.className = 'seg';
    items.forEach(function (it, i) { var b = document.createElement('button'); b.type = 'button'; b.textContent = it.label; b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false'); b.addEventListener('click', function () { row.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); onChange(it.key); }); row.appendChild(b); });
    host.appendChild(row); return row;
  }

  // ------------------------------------------------------------------ porn
  function figPorn(root) {
    var D = window.SITE_DATA.porn, state = { outcome: 'rape' };
    var ctrl = document.createElement('div'); ctrl.className = 'fig-controls'; root.appendChild(ctrl);
    buttons(ctrl, [{ key: 'rape', label: 'Rape' }, { key: 'assault', label: 'Aggravated assault' }, { key: 'mvt', label: 'Motor vehicle theft' }], function (k) { state.outcome = k; draw(); });
    var plot = document.createElement('div'); plot.className = 'plot'; root.appendChild(plot);
    var below = document.createElement('div'); root.appendChild(below);
    function draw() {
      var o = D.outcomes[state.outcome];
      var series = o.series.map(function (d) { return { x: d.e, y: pct(d.est), lo: pct(d.lo), hi: pct(d.hi), raw: d }; });
      var chart = pointChart(plot, series, { xLabel: 'Months since the age-verification law took effect', yLabel: o.label + ', change (percent)', ref: 0, vline: -0.5, xTicks: [-12, -9, -6, -3, 0, 3, 6, 9, 11], isPre: function (d) { return d.x < 0; }, aria: 'Event study of ' + o.label.toLowerCase() + ' around the law' });
      below.innerHTML = '';
      var sl = slider(below, series, function (d, i) {
        highlight(chart, i);
        var when = d.x < 0 ? Math.abs(d.x) + (d.x === -1 ? ' month before' : ' months before') : d.x === 0 ? 'In the month' : (d.x + (d.x === 1 ? ' month after' : ' months after'));
        var dir = d.y >= 0 ? 'higher' : 'lower';
        return '<strong>' + when + '</strong> the law took effect, ' + o.label.toLowerCase() + ' in the 21 states were <strong>' + fmt1(Math.abs(d.y)) + ' percent ' + dir + '</strong> than in their synthetic comparison counties (95 percent interval ' + fmt1(d.lo) + ' to ' + fmt1(d.hi) + ').';
      }, series.length - 1);
      hookHover(chart, sl);
      var ov = o.overall, avg = document.createElement('p'); avg.className = 'overall-line';
      avg.innerHTML = 'Averaged over the first 12 months: <strong>' + fmt1(Math.abs(pct(ov.est))) + ' percent ' + (ov.est >= 0 ? 'higher' : 'lower') + '</strong> (95 percent interval ' + fmt1(pct(ov.lo)) + ' to ' + fmt1(pct(ov.hi)) + ', <em>p</em> ' + (ov.p < 0.001 ? '< .001' : '= ' + String(ov.p.toFixed(3)).replace(/^0/, '')) + ').';
      below.appendChild(avg);
    }
    draw();
  }

  // ------------------------------------------------------------------ dating
  function figDating(root) {
    var D = window.SITE_DATA.dating, state = { dv: 'ihs_minutes' };
    var ctrl = document.createElement('div'); ctrl.className = 'fig-controls'; root.appendChild(ctrl);
    buttons(ctrl, [{ key: 'ihs_minutes', label: 'Minutes on dating apps' }, { key: 'ihs_opens', label: 'Dating app opens' }], function (k) { state.dv = k; draw(); });
    var plot = document.createElement('div'); plot.className = 'plot'; root.appendChild(plot);
    var below = document.createElement('div'); root.appendChild(below);
    function draw() {
      var s = D.series[state.dv].slice().sort(function (a, b) { return a.e - b.e; });
      var series = s.map(function (d) { return { x: d.e, y: pct(d.est), lo: pct(d.lo), hi: pct(d.hi) }; });
      var lab = state.dv === 'ihs_minutes' ? 'Minutes on dating apps' : 'Dating app opens';
      var chart = pointChart(plot, series, { xLabel: 'Months since the person started using an AI app', yLabel: lab + ', change (percent)', ref: 0, vline: -0.5, xTicks: [-6, -4, -2, 0, 2, 4, 6, 8], isPre: function (d) { return d.x < 0; }, aria: 'Event study of ' + lab.toLowerCase() + ' around AI adoption' });
      below.innerHTML = '';
      var sl = slider(below, series, function (d, i) {
        highlight(chart, i);
        var when = d.x < 0 ? Math.abs(d.x) + (d.x === -1 ? ' month before' : ' months before') + ' they started' : d.x === 0 ? 'In the month they started' : d.x + (d.x === 1 ? ' month after' : ' months after') + ' they started';
        return '<strong>' + when + '</strong> using an AI app, dating app users had <strong>' + fmt1(Math.abs(d.y)) + ' percent ' + (d.y >= 0 ? 'more' : 'fewer') + '</strong> ' + (state.dv === 'ihs_minutes' ? 'minutes on dating apps' : 'dating app opens') + ' than users who had not yet started (95 percent interval ' + fmt1(d.lo) + ' to ' + fmt1(d.hi) + ').';
      }, series.length - 1);
      hookHover(chart, sl);
      var ov = D.overall[state.dv], avg = document.createElement('p'); avg.className = 'overall-line';
      avg.innerHTML = 'Averaged over the months after adoption: <strong>' + fmt1(Math.abs(ov.pct)) + ' percent fewer</strong> (95 percent interval ' + fmt1(pct(ov.lo)) + ' to ' + fmt1(pct(ov.hi)) + '), among ' + fmt0(ov.n) + ' dating app users who went on to adopt an AI app.';
      below.appendChild(avg);
    }
    draw();
  }

  // ------------------------------------------------------------------ cigarettes
  function figCigCohorts(root) {
    var D = window.SITE_DATA.cig, state = { src: 'tus' };
    var ctrl = document.createElement('div'); ctrl.className = 'fig-controls'; root.appendChild(ctrl);
    buttons(ctrl, [{ key: 'tus', label: 'Tobacco Use Supplement' }, { key: 'nhis', label: 'National Health Interview Survey' }], function (k) { state.src = k; draw(); });
    var plot = document.createElement('div'); plot.className = 'plot'; root.appendChild(plot);
    var below = document.createElement('div'); root.appendChild(below);
    function draw() {
      var s = D[state.src];
      var series = s.map(function (d) { return { x: d.cohort, y: d.y * 100, lo: (d.y - 1.96 * d.se) * 100, hi: (d.y + 1.96 * d.se) * 100, mono: d.mono }; });
      var chart = pointChart(plot, series, { xLabel: 'Year of birth', yLabel: 'Became smokers (percent)', shade: [1954, 1968], xTicks: [1940, 1945, 1950, 1955, 1960, 1965], xFmt: function (t) { return String(t); }, aria: 'Share of Americans who became smokers, by year of birth' });
      below.innerHTML = '';
      var sl = slider(below, series, function (d, i) {
        highlight(chart, i);
        return 'Born in <strong>' + d.x + '</strong>: <strong>' + fmt1(d.y) + ' percent</strong> became smokers (95 percent interval ' + fmt1(d.lo) + ' to ' + fmt1(d.hi) + ').';
      }, 21);
      hookHover(chart, sl);
    }
    draw();
  }
  function figCigIntl(root) {
    var D = window.SITE_DATA.cig;
    var names = { A: 'Health warnings ended with the ads (USA, Iceland, Canada)', B: 'Ads removed, no warnings either side (UK, New Zealand, Finland, Singapore, West Germany)', C: 'Warnings kept or added (Norway, France, Ireland)' };
    var rows = D.intl.filter(function (r) { return r.id in names; }).map(function (r) { return { x: r.id, label: names[r.id], y: r.est, lo: r.lo, hi: r.hi }; });
    var plot = document.createElement('div'); plot.className = 'plot'; root.appendChild(plot);
    dotRows(plot, rows, { xLabel: 'Smoking deaths among fully exposed cohorts, change (percent)', ref: 0 });
    var p = document.createElement('p'); p.className = 'overall-line';
    var gap = D.intl.filter(function (r) { return r.id === 'Gap'; })[0];
    p.innerHTML = 'Each bar compares a country’s fully exposed cohorts with the same eight continental countries that never removed broadcast cigarette advertising. Where the warnings went with the advertising, smoking deaths rose. Where advertising ended on its own, or warnings stayed, deaths fell. The gap between the two groups is <strong>' + fmt1(gap.est) + ' percent</strong> (95 percent interval ' + fmt1(gap.lo) + ' to ' + fmt1(gap.hi) + ').';
    root.appendChild(p);
  }
  function figCigDeaths(root) {
    var D = window.SITE_DATA.cig;
    var names = { 'SEER': 'SEER cancer registry', 'WHO': 'WHO mortality database', 'CDC WONDER': 'CDC WONDER' };
    var rows = D.excess.map(function (r) { return { x: r.source, label: names[r.source] || r.source, y: r.excess, lo: r.lo, hi: r.hi }; });
    var plot = document.createElement('div'); plot.className = 'plot'; root.appendChild(plot);
    dotRows(plot, rows, { xLabel: 'Additional deaths from lung cancer, laryngeal cancer and COPD', ref: 0, fmt: fmt0 });
    var p = document.createElement('p'); p.className = 'overall-line';
    p.innerHTML = 'Three death registries, three estimates of the same toll among Americans who were teenagers after the 1971 ban. The paper reports the range from the WHO and SEER registries, <strong>' + fmt0(D.excess[1].excess) + ' to ' + fmt0(D.excess[0].excess) + '</strong> additional deaths. CDC WONDER covers fewer years and gives a lower count.';
    root.appendChild(p);
  }

  // horizontal dot-and-interval rows: rows [{label, y, lo, hi}]
  function dotRows(host, rows, opts) {
    host.innerHTML = '';
    var W = 640, rowH = 44, m = { t: 10, r: 18, b: 44, l: 250 }, H = m.t + m.b + rows.length * rowH;
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart' }, host);
    var lo = Math.min.apply(null, rows.map(function (r) { return r.lo; })), hi = Math.max.apply(null, rows.map(function (r) { return r.hi; }));
    if (opts.ref !== undefined) { lo = Math.min(lo, opts.ref); hi = Math.max(hi, opts.ref); }
    var pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
    var X = function (v) { return m.l + (v - lo) / (hi - lo) * (W - m.l - m.r); };
    niceTicks(lo, hi, 5).forEach(function (t) { el('line', { x1: X(t), x2: X(t), y1: m.t, y2: H - m.b, class: 'grid' }, svg); var tx = el('text', { x: X(t), y: H - m.b + 18, class: 'tick', 'text-anchor': 'middle' }, svg); tx.textContent = (opts.fmt || fmt1)(t); });
    if (opts.ref !== undefined) el('line', { x1: X(opts.ref), x2: X(opts.ref), y1: m.t, y2: H - m.b, class: 'ref' }, svg);
    rows.forEach(function (r, i) {
      var y = m.t + rowH * (i + 0.5), g = el('g', { class: 'mark' }, svg);
      var t = el('text', { x: m.l - 12, y: y + 4, class: 'rowlabel', 'text-anchor': 'end' }, g);
      wrapText(t, r.label, 36, y);
      el('line', { x1: X(r.lo), x2: X(r.hi), y1: y, y2: y, class: 'ci' }, g);
      el('circle', { cx: X(r.y), cy: y, r: 4.5, class: 'pt' }, g);
      var tt = el('title', {}, g); tt.textContent = r.label + ': ' + (opts.fmt || fmt1)(r.y) + ' (' + (opts.fmt || fmt1)(r.lo) + ' to ' + (opts.fmt || fmt1)(r.hi) + ')';
    });
    var xl = el('text', { x: (m.l + W - m.r) / 2, y: H - 8, class: 'label', 'text-anchor': 'middle' }, svg); xl.textContent = opts.xLabel || '';
  }
  function wrapText(t, s, max, y) {
    var words = s.split(' '), lines = [], cur = '';
    words.forEach(function (w) { if ((cur + ' ' + w).trim().length > max) { lines.push(cur.trim()); cur = w; } else cur += ' ' + w; }); lines.push(cur.trim());
    t.textContent = ''; lines.forEach(function (ln, i) { var ts = el('tspan', { x: t.getAttribute('x'), y: y + 4 + (i - (lines.length - 1) / 2) * 15 }, t); ts.textContent = ln; });
  }

  // ------------------------------------------------------------------ dobbs
  function figDobbs(root) {
    var D = window.SITE_DATA.dobbs, state = { k: 'sessions' };
    var ctrl = document.createElement('div'); ctrl.className = 'fig-controls'; root.appendChild(ctrl);
    buttons(ctrl, [{ key: 'sessions', label: 'Weekly sessions' }, { key: 'time', label: 'Weekly time' }], function (k) { state.k = k; draw(); });
    var plot = document.createElement('div'); plot.className = 'plot'; root.appendChild(plot);
    var p = document.createElement('p'); p.className = 'overall-line'; root.appendChild(p);
    function draw() {
      var rows = D[state.k].map(function (r) { return { label: r.label, y: pct(r.b), lo: pct(r.b - 1.96 * r.se), hi: pct(r.b + 1.96 * r.se) }; });
      dotRows(plot, rows, { xLabel: 'Change in health app use after the leak (percent)', ref: 0 });
      var all = rows[0], fem = rows[3];
      p.innerHTML = 'In the six weeks after the Dobbs opinion leaked, ' + (state.k === 'sessions' ? 'weekly sessions on' : 'weekly time spent in') + ' health apps fell by <strong>' + fmt1(Math.abs(all.y)) + ' percent</strong> relative to a control app used by the same people (95 percent interval ' + fmt1(all.lo) + ' to ' + fmt1(all.hi) + '). For period and fertility apps the fall was <strong>' + fmt1(Math.abs(fem.y)) + ' percent</strong>. Women cut back more than men.';
    }
    draw();
  }
  function figDobbsBrowsers(root) {
    var D = window.SITE_DATA.dobbs;
    var rows = D.browsers.map(function (r) { return { label: r.label, y: r.b * 100, lo: (r.b - 1.96 * r.se) * 100, hi: (r.b + 1.96 * r.se) * 100 }; });
    var plot = document.createElement('div'); plot.className = 'plot'; root.appendChild(plot);
    dotRows(plot, rows, { xLabel: 'Chance of using a privacy browser in a week (percent of 100)', ref: 0 });
    var p = document.createElement('p'); p.className = 'overall-line';
    p.innerHTML = 'The same people turned to privacy-preserving browsers such as DuckDuckGo and Brave. The chance that a user opened one in a given week rose by <strong>' + fmt1(rows[0].y) + ' percent of 100</strong>, almost entirely among people who had never used one before the leak.';
    root.appendChild(p);
  }

  // ------------------------------------------------------------------ gambling
  function figGamblingAtts(root) {
    var D = window.SITE_DATA.gambling;
    var rows = D.atts.map(function (r) { return { label: r.label, y: r.b * 100, lo: (r.b - 1.96 * r.se) * 100, hi: (r.b + 1.96 * r.se) * 100 }; });
    var plot = document.createElement('div'); plot.className = 'plot'; root.appendChild(plot);
    dotRows(plot, rows, { xLabel: 'Change in lottery sales after online sports betting launched (percent)', ref: 0 });
    var p = document.createElement('p'); p.className = 'overall-line';
    p.innerHTML = 'Four ways of measuring the same thing. County lottery sales from public records requests, stores on the Oregon side of the Washington border, and the till data of independent convenience stores all show lottery sales falling by about <strong>5 to 7 percent</strong> in the 16 months after a state’s online sportsbooks opened. The fall was larger after COVID.';
    root.appendChild(p);
  }
  function figGamblingCalc(root) {
    var D = window.SITE_DATA.gambling;
    var form = document.createElement('div'); form.className = 'calc'; root.appendChild(form);
    var fields = [
      { key: 'decline', label: 'Fall in lottery sales after launch', unit: '%', min: 0, max: 12, step: 0.1, val: D.decline_pct },
      { key: 'transfer', label: 'Share of lottery sales the state keeps', unit: '%', min: 10, max: 40, step: 1, val: D.transfer * 100 },
      { key: 'hold', label: 'Share of wagers the sportsbooks keep', unit: '%', min: 3, max: 12, step: 0.1, val: D.hold * 100 },
      { key: 'tax', label: 'State tax on sportsbook revenue', unit: '%', min: 5, max: 51, step: 1, val: D.tax * 100 }
    ];
    var inputs = {};
    fields.forEach(function (f) {
      var row = document.createElement('label'); row.className = 'calc-row';
      row.innerHTML = '<span class="calc-label">' + f.label + '</span><output class="calc-val"></output>';
      var inp = document.createElement('input'); inp.type = 'range'; inp.min = f.min; inp.max = f.max; inp.step = f.step; inp.value = f.val; row.appendChild(inp);
      inputs[f.key] = { inp: inp, out: row.querySelector('output'), unit: f.unit }; form.appendChild(row);
      inp.addEventListener('input', calc);
    });
    var reset = document.createElement('button'); reset.type = 'button'; reset.className = 'replay'; reset.textContent = 'Back to the paper’s values'; form.appendChild(reset);
    reset.addEventListener('click', function () { fields.forEach(function (f) { inputs[f.key].inp.value = f.val; }); calc(); });
    var plot = document.createElement('div'); plot.className = 'plot'; root.appendChild(plot);
    var p = document.createElement('p'); p.className = 'overall-line'; root.appendChild(p);
    function calc() {
      var v = {}; fields.forEach(function (f) { v[f.key] = +inputs[f.key].inp.value; inputs[f.key].out.textContent = (f.step < 1 ? fmt1(v[f.key]) : fmt0(v[f.key])) + f.unit; });
      var lostSales = D.pre_sales_bn * 1000 * v.decline / 100, lostRev = lostSales * v.transfer / 100;
      var bookRev = D.handle_bn * 1000 * v.hold / 100, taxes = bookRev * v.tax / 100, net = taxes - lostRev, share = taxes > 0 ? net / taxes * 100 : 0;
      var perDollar = v.hold / 100 * v.tax / 100, needed = perDollar > 0 ? (v.transfer / 100) / perDollar : 0;
      bars(plot, [{ label: 'Sportsbook taxes collected', y: taxes }, { label: 'Lottery revenue lost', y: lostRev }, { label: 'New money for the state', y: net }], { xLabel: 'Millions of dollars over 16 months, 12 states' });
      p.innerHTML = 'With these settings the states collect <strong>$' + fmt0(taxes) + ' million</strong> in sportsbook taxes and lose <strong>$' + fmt0(lostRev) + ' million</strong> in lottery revenue, so <strong>' + fmt0(Math.max(0, share)) + ' percent</strong> of the sportsbook taxes is new money' + (net < 0 ? ', and the states end up behind' : '') + '. A bettor would have to wager <strong>$' + fmt1(needed * 2) + '</strong> on sports to give the state what it gets from one $2 lottery ticket.';
    }
    calc();
  }
  function bars(host, rows, opts) {
    host.innerHTML = '';
    var W = 640, H = 220, m = { t: 12, r: 18, b: 56, l: 60 }, n = rows.length;
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart' }, host);
    var hi = Math.max.apply(null, rows.map(function (r) { return r.y; }).concat([0])), lo = Math.min.apply(null, rows.map(function (r) { return r.y; }).concat([0]));
    var Y = function (v) { return m.t + (hi - v) / (hi - lo || 1) * (H - m.t - m.b); };
    niceTicks(lo, hi, 4).forEach(function (t) { el('line', { x1: m.l, x2: W - m.r, y1: Y(t), y2: Y(t), class: 'grid' }, svg); var tx = el('text', { x: m.l - 8, y: Y(t) + 4, class: 'tick', 'text-anchor': 'end' }, svg); tx.textContent = fmt0(t); });
    el('line', { x1: m.l, x2: W - m.r, y1: Y(0), y2: Y(0), class: 'axis' }, svg);
    var bw = (W - m.l - m.r) / n;
    rows.forEach(function (r, i) {
      var x = m.l + bw * i + bw * 0.22;
      el('rect', { x: x, y: Math.min(Y(0), Y(r.y)), width: bw * 0.56, height: Math.abs(Y(0) - Y(r.y)), class: 'bar' + (i === 2 ? ' bar-net' : '') }, svg);
      var t = el('text', { x: x + bw * 0.28, y: H - m.b + 18, class: 'tick', 'text-anchor': 'middle' }, svg); t.textContent = r.label;
    });
    var xl = el('text', { x: (m.l + W - m.r) / 2, y: H - 8, class: 'label', 'text-anchor': 'middle' }, svg); xl.textContent = opts.xLabel || '';
  }


  // multi-line chart. lines: [{label, pts:[{x,y}], cls}], opts: {xLabel, yLabel, xTicks, xFmt, vline, vlineLabel, shade}
  function lineChart(host, lines, opts) {
    host.innerHTML = '';
    var W = 640, H = 320, m = { t: 18, r: 18, b: 46, l: 54 };
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart', role: 'img', 'aria-label': opts.aria || '' }, host);
    var all = [].concat.apply([], lines.map(function (l) { return l.pts; })).filter(function (p) { return p.y !== null && !isNaN(p.y); });
    var xmin = Math.min.apply(null, all.map(function (p) { return p.x; })), xmax = Math.max.apply(null, all.map(function (p) { return p.x; }));
    var ylo = opts.ymin !== undefined ? opts.ymin : Math.min.apply(null, all.map(function (p) { return p.y; })), yhi = Math.max.apply(null, all.map(function (p) { return p.y; }));
    var pad = (yhi - ylo) * 0.08; if (opts.ymin === undefined) ylo -= pad; yhi += pad;
    var X = function (x) { return m.l + (x - xmin) / (xmax - xmin || 1) * (W - m.l - m.r); };
    var Y = function (y) { return H - m.b - (y - ylo) / (yhi - ylo || 1) * (H - m.t - m.b); };
    if (opts.shade) el('rect', { x: X(opts.shade[0]), y: m.t, width: X(opts.shade[1]) - X(opts.shade[0]), height: H - m.t - m.b, class: 'shade' }, svg);
    niceTicks(ylo, yhi, 5).forEach(function (t) { el('line', { x1: m.l, x2: W - m.r, y1: Y(t), y2: Y(t), class: 'grid' }, svg); var tx = el('text', { x: m.l - 8, y: Y(t) + 4, class: 'tick', 'text-anchor': 'end' }, svg); tx.textContent = (opts.yFmt || fmt0)(t); });
    (opts.xTicks || []).forEach(function (t) { var tx = el('text', { x: X(t), y: H - m.b + 18, class: 'tick', 'text-anchor': 'middle' }, svg); tx.textContent = opts.xFmt ? opts.xFmt(t) : t; });
    el('line', { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b, class: 'axis' }, svg);
    if (opts.vline !== undefined && opts.vline !== null) { el('line', { x1: X(opts.vline), x2: X(opts.vline), y1: m.t, y2: H - m.b, class: 'vline' }, svg); if (opts.vlineLabel) { var vl = el('text', { x: X(opts.vline) + 5, y: m.t + 12, class: 'tick' }, svg); vl.textContent = opts.vlineLabel; } }
    lines.forEach(function (l) {
      var d = '', pen = false;
      l.pts.forEach(function (p) { if (p.y === null || isNaN(p.y)) { pen = false; return; } d += (pen ? 'L' : 'M') + X(p.x).toFixed(1) + ' ' + Y(p.y).toFixed(1); pen = true; });
      el('path', { d: d, class: 'line ' + (l.cls || ''), fill: 'none' }, svg);
    });
    var xl = el('text', { x: (m.l + W - m.r) / 2, y: H - 8, class: 'label', 'text-anchor': 'middle' }, svg); xl.textContent = opts.xLabel || '';
    var yl = el('text', { x: 14, y: (m.t + H - m.b) / 2, class: 'label', 'text-anchor': 'middle', transform: 'rotate(-90 14 ' + (m.t + H - m.b) / 2 + ')' }, svg); yl.textContent = opts.yLabel || '';
    var lg = document.createElement('div'); lg.className = 'legend-row';
    lines.forEach(function (l) { var s = document.createElement('span'); s.className = 'lg ' + (l.cls || ''); s.textContent = l.label; lg.appendChild(s); });
    host.appendChild(lg);
    return { X: X, Y: Y, svg: svg };
  }
  var STATE_NAMES = { AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming' };
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function monthLabel(ym) { return MON[+ym.slice(5, 7) - 1] + ' ' + ym.slice(0, 4); }


  // ------------------------------------------------------------------ dobbs: weekly use around the leak
  function figDobbsWeekly(root) {
    var D = window.SITE_DATA.dobbs.weekly; if (!D) { root.textContent = ''; return; }
    var state = { grp: 'mhealth', gender: 'All', measure: 'sessions' };
    var ctrl = document.createElement('div'); ctrl.className = 'fig-controls fig-controls-row'; root.appendChild(ctrl);
    buttons(ctrl, [{ key: 'mhealth', label: 'Health apps' }, { key: 'femtech', label: 'Period and fertility apps' }], function (k) { state.grp = k; draw(); });
    buttons(ctrl, [{ key: 'All', label: 'Everyone' }, { key: 'Female', label: 'Women' }, { key: 'Male', label: 'Men' }], function (k) { state.gender = k; draw(); });
    var plot = document.createElement('div'); plot.className = 'plot'; root.appendChild(plot);
    var p = document.createElement('p'); p.className = 'overall-line'; root.appendChild(p);
    function norm(rows) { var pre = rows.filter(function (r) { return r.w < 0; }); var base = pre.reduce(function (a, r) { return a + r.sessions / Math.max(1, D.present[r.w]); }, 0) / pre.length; return rows.map(function (r) { return { x: r.w, y: (r.sessions / Math.max(1, D.present[r.w])) / base * 100 }; }); }
    function draw() {
      var a = D.series[state.grp + '_' + state.gender], b = D.series['pinterest_' + state.gender];
      var la = norm(a), lb = norm(b);
      var name = state.grp === 'mhealth' ? 'Health apps' : 'Period and fertility apps';
      lineChart(plot, [{ label: name, pts: la, cls: 'l-main' }, { label: 'Pinterest, the comparison app', pts: lb, cls: 'l-ref' }], { xLabel: 'Weeks since the leak', yLabel: 'Sessions per panelist, weeks before the leak = 100', xTicks: [-4, -2, 0, 2, 4, 6], vline: -0.5, vlineLabel: 'Leak', aria: 'Weekly sessions around the Dobbs leak' });
      var post = la.filter(function (r) { return r.x >= 0 && r.x <= 5; }), pb = lb.filter(function (r) { return r.x >= 0 && r.x <= 5; });
      var ma = post.reduce(function (s, r) { return s + r.y; }, 0) / post.length, mb = pb.reduce(function (s, r) { return s + r.y; }, 0) / pb.length;
      p.innerHTML = 'Both lines are set to 100 in the four weeks before the leak. In the six weeks after it, sessions on ' + name.toLowerCase() + ' ran at <strong>' + fmt0(ma) + '</strong> and Pinterest sessions at <strong>' + fmt0(mb) + '</strong>' + (state.gender === 'All' ? '' : ' among ' + (state.gender === 'Female' ? 'women' : 'men')) + '. The gap between the two lines is what the paper measures.';
    }
    draw();
  }

  function hbars(host, rows, opts) {
    host.innerHTML = '';
    var W = 640, rowH = 40, m = { t: 8, r: 18, b: 44, l: 170 }, H = m.t + m.b + rows.length * rowH;
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart' }, host);
    var hi = Math.max.apply(null, rows.map(function (r) { return r.y; })) * 1.08;
    var X = function (v) { return m.l + v / hi * (W - m.l - m.r); };
    niceTicks(0, hi, 5).forEach(function (t) { el('line', { x1: X(t), x2: X(t), y1: m.t, y2: H - m.b, class: 'grid' }, svg); var tx = el('text', { x: X(t), y: H - m.b + 18, class: 'tick', 'text-anchor': 'middle' }, svg); tx.textContent = fmt0(t); });
    rows.forEach(function (r, i) {
      var y = m.t + rowH * i + 8, g = el('g', { class: 'mark' }, svg);
      var t = el('text', { x: m.l - 12, y: y + rowH / 2, class: 'rowlabel', 'text-anchor': 'end' }, g); t.textContent = r.label;
      el('rect', { x: m.l, y: y + 4, width: Math.max(1, X(r.y) - m.l), height: rowH - 16, class: 'hbar ' + r.cls, rx: 3 }, g);
      var tt = el('title', {}, g); tt.textContent = r.label + ': ' + opts.fmt(r.y);
    });
    var xl = el('text', { x: (m.l + W - m.r) / 2, y: H - 8, class: 'label', 'text-anchor': 'middle' }, svg); xl.textContent = opts.xLabel || '';
  }

  // ------------------------------------------------------------------ gambling: money wagered on sports by state, descriptive
  function figGamblingHandles(root) {
    var H = window.SITE_DATA.gambling.handles.filter(function (r) { return r.online !== null; }), state = { m: 'online' };
    var ctrl = document.createElement('div'); ctrl.className = 'fig-controls'; root.appendChild(ctrl);
    buttons(ctrl, [{ key: 'online', label: 'Wagered online' }, { key: 'retail', label: 'Wagered in person' }, { key: 'share', label: 'Share wagered online' }], function (k) { state.m = k; draw(); });
    var plot = document.createElement('div'); plot.className = 'plot'; root.appendChild(plot);
    var p = document.createElement('p'); p.className = 'overall-line'; root.appendChild(p);
    function bn(x) { return '$' + (x >= 1e9 ? fmt1(x / 1e9) + ' billion' : fmt0(x / 1e6) + ' million'); }
    function line(r) { return r.state + ': ' + bn(r.online) + ' wagered online' + (r.retail === null ? '.' : ' and ' + bn(r.retail) + ' in person.'); }
    function draw() {
      var rows = H.map(function (r) {
        var v = state.m === 'online' ? r.online / 1e9 : state.m === 'retail' ? (r.retail === null ? null : r.retail / 1e9) : (r.retail === null || r.online + r.retail === 0 ? null : r.online / (r.online + r.retail) * 100);
        return { r: r, y: v };
      }).filter(function (d) { return d.y !== null && d.y > 0; }).sort(function (a, b) { return b.y - a.y; });
      plot.innerHTML = '';
      var W = 640, rowH = 19, m = { t: 6, r: 18, b: 40, l: 150 }, Ht = m.t + m.b + rows.length * rowH;
      var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + Ht, class: 'chart' }, plot);
      var hi = Math.max.apply(null, rows.map(function (d) { return d.y; })) * 1.04;
      var X = function (v) { return m.l + v / hi * (W - m.l - m.r); };
      niceTicks(0, hi, 5).forEach(function (t) { el('line', { x1: X(t), x2: X(t), y1: m.t, y2: Ht - m.b, class: 'grid' }, svg); var tx = el('text', { x: X(t), y: Ht - m.b + 16, class: 'tick', 'text-anchor': 'middle' }, svg); tx.textContent = fmt0(t); });
      rows.forEach(function (d, i) {
        var y = m.t + rowH * i, g = el('g', { class: 'mark hrow' }, svg);
        var t = el('text', { x: m.l - 10, y: y + rowH / 2 + 4, class: 'rowlabel small', 'text-anchor': 'end' }, g); t.textContent = d.r.state;
        el('rect', { x: m.l, y: y + 3, width: Math.max(1, X(d.y) - m.l), height: rowH - 6, class: 'hbar k2', rx: 2 }, g);
        el('rect', { x: 0, y: y, width: W, height: rowH, class: 'hit' }, g);
        g.addEventListener('mouseenter', function () { svg.querySelectorAll('.hrow').forEach(function (x) { x.classList.remove('active'); }); g.classList.add('active'); p.textContent = line(d.r); });
      });
      var xl = el('text', { x: (m.l + W - m.r) / 2, y: Ht - 6, class: 'label', 'text-anchor': 'middle' }, svg);
      xl.textContent = state.m === 'share' ? 'Share of all sports wagers placed online (percent)' : 'Billions of dollars wagered, to June 2025';
      p.textContent = line(rows[0].r);
    }
    draw();
  }


  // ------------------------------------------------------------------ cigarettes: where the advertising money went, 1963 to 1974
  function figCigAds(root) {
    var A = window.SITE_DATA.cig.ads, years = A.map(function (r) { return r.year; });
    var MED = [{ k: 'broadcast', label: 'Television and radio' }, { k: 'print', label: 'Newspapers and magazines' }, { k: 'outdoor', label: 'Billboards and transit' }, { k: 'direct', label: 'Direct mail' }, { k: 'other', label: 'Other' }];
    var head = document.createElement('div'); head.className = 'ads-head'; root.appendChild(head);
    var yearEl = document.createElement('span'); yearEl.className = 'ads-year'; head.appendChild(yearEl);
    var tag = document.createElement('span'); tag.className = 'ads-tag'; head.appendChild(tag);
    var plot = document.createElement('div'); plot.className = 'plot'; root.appendChild(plot);
    var W = 640, H = 300, m = { t: 14, r: 12, b: 50, l: 50 }, YMAX = 250;
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart', role: 'img', 'aria-label': 'Cigarette advertising spending by medium' }, plot);
    var Y = function (v) { return H - m.b - v / YMAX * (H - m.t - m.b); };
    [0, 50, 100, 150, 200, 250].forEach(function (t) { el('line', { x1: m.l, x2: W - m.r, y1: Y(t), y2: Y(t), class: 'grid' }, svg); var tx = el('text', { x: m.l - 8, y: Y(t) + 4, class: 'tick', 'text-anchor': 'end' }, svg); tx.textContent = t; });
    var yl = el('text', { x: 14, y: (m.t + H - m.b) / 2, class: 'label', 'text-anchor': 'middle', transform: 'rotate(-90 14 ' + (m.t + H - m.b) / 2 + ')' }, svg); yl.textContent = 'Millions of dollars';
    var bw = (W - m.l - m.r) / MED.length, rects = MED.map(function (md, i) {
      var x = m.l + bw * i + bw * 0.18;
      var r = el('rect', { x: x, y: Y(0), width: bw * 0.64, height: 0, rx: 3, class: 'adbar ' + md.k }, svg);
      var words = md.label.split(' and ');
      var t = el('text', { x: x + bw * 0.32, y: H - m.b + 18, class: 'tick', 'text-anchor': 'middle' }, svg);
      if (words.length === 2) { var a = el('tspan', { x: x + bw * 0.32, dy: 0 }, t); a.textContent = words[0] + ' and'; var b = el('tspan', { x: x + bw * 0.32, dy: 14 }, t); b.textContent = words[1]; } else t.textContent = md.label;
      return r;
    });
    var ctrl = document.createElement('div'); ctrl.className = 'scrub-row'; root.appendChild(ctrl);
    var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'replay'; btn.textContent = 'Play'; ctrl.appendChild(btn);
    var range = document.createElement('input'); range.type = 'range'; range.min = 0; range.max = years.length - 1; range.value = 0; range.setAttribute('aria-label', 'Year'); ctrl.appendChild(range);
    var p = document.createElement('p'); p.className = 'overall-line'; root.appendChild(p);
    var cur = MED.map(function () { return 0; }), anim = null, timer = null;
    function setBars(vals) { rects.forEach(function (r, i) { r.setAttribute('y', Y(vals[i])); r.setAttribute('height', Math.max(0, Y(0) - Y(vals[i]))); }); }
    function show(i) {
      var r = A[i], target = MED.map(function (md) { return r[md.k]; }), from = cur.slice(), t0 = null;
      cancelAnimationFrame(anim);
      (function step(ts) { if (t0 === null) t0 = ts; var k = Math.min(1, (ts - t0) / 450), e = 1 - Math.pow(1 - k, 3); cur = from.map(function (f, j) { return f + (target[j] - f) * e; }); setBars(cur); if (k < 1) anim = requestAnimationFrame(step); })(performance.now());
      range.value = i; yearEl.textContent = r.year;
      tag.textContent = r.year >= 1967 && r.year <= 1970 ? 'Broadcasters must air anti-smoking ads' : r.year >= 1971 ? 'Cigarette ads banned from television and radio' : '';
      tag.className = 'ads-tag' + (r.year >= 1971 ? ' ban' : r.year >= 1967 ? ' fd' : '');
      var share = r.broadcast / r.total * 100;
      p.textContent = 'In ' + r.year + ', cigarette makers spent $' + fmt0(r.total) + ' million on advertising, ' + (r.broadcast > 0 ? fmt0(share) + ' percent of it on television and radio.' : 'none of it on television or radio.');
    }
    function play() {
      clearInterval(timer); var i = +range.value >= years.length - 1 ? 0 : +range.value; show(i); btn.textContent = 'Pause';
      timer = setInterval(function () { i++; if (i >= years.length) { clearInterval(timer); timer = null; btn.textContent = 'Play'; return; } show(i); }, 900);
    }
    btn.addEventListener('click', function () { if (timer) { clearInterval(timer); timer = null; btn.textContent = 'Play'; } else play(); });
    range.addEventListener('input', function () { clearInterval(timer); timer = null; btn.textContent = 'Play'; show(+range.value); });
    show(0);
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); setTimeout(play, 400); } }, { threshold: 0.4 }); io.observe(root);
    }
  }

  // ------------------------------------------------------------------ draw-your-guess chart
  // cfg: {known:[{x,y,lo,hi}], hidden:[{x,y,lo,hi}], xLabel, yLabel, ymin, ymax, xFmt, yFmt, vline, vlineLabel, extra:[{label, pts, cls}] (revealed with the data), readout(guess, hidden) -> html}
  function drawIt(root, cfg) {
    var W = 640, H = 340, m = { t: 22, r: 18, b: 46, l: 54 };
    var plot = document.createElement('div'); plot.className = 'plot drawit'; root.appendChild(plot);
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart', role: 'img', 'aria-label': cfg.aria || '' }, plot);
    var all = cfg.known.concat(cfg.hidden), xmin = all[0].x, xmax = all[all.length - 1].x;
    var X = function (x) { return m.l + (x - xmin) / (xmax - xmin) * (W - m.l - m.r); };
    var Y = function (y) { return H - m.b - (y - cfg.ymin) / (cfg.ymax - cfg.ymin) * (H - m.t - m.b); };
    var Yinv = function (py) { return cfg.ymin + (H - m.b - py) / (H - m.t - m.b) * (cfg.ymax - cfg.ymin); };
    var x0 = cfg.hidden[0].x, gx0 = X(cfg.known[cfg.known.length - 1].x);
    el('rect', { x: gx0, y: m.t, width: X(xmax) - gx0, height: H - m.t - m.b, class: 'guess-zone' }, svg);
    niceTicks(cfg.ymin, cfg.ymax, 5).forEach(function (t) { el('line', { x1: m.l, x2: W - m.r, y1: Y(t), y2: Y(t), class: 'grid' }, svg); var tx = el('text', { x: m.l - 8, y: Y(t) + 4, class: 'tick', 'text-anchor': 'end' }, svg); tx.textContent = (cfg.yFmt || fmt0)(t); });
    (cfg.xTicks || []).forEach(function (t) { var tx = el('text', { x: X(t), y: H - m.b + 18, class: 'tick', 'text-anchor': 'middle' }, svg); tx.textContent = cfg.xFmt ? cfg.xFmt(t) : t; });
    el('line', { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b, class: 'axis' }, svg);
    (cfg.vlines || (cfg.vline !== undefined ? [{ x: cfg.vline, label: cfg.vlineLabel }] : [])).forEach(function (v) { el('line', { x1: X(v.x), x2: X(v.x), y1: m.t, y2: H - m.b, class: 'vline' }, svg); var vl = el('text', { x: X(v.x) + 5, y: m.t + 11, class: 'tick' }, svg); vl.textContent = v.label || ''; });
    var xl = el('text', { x: (m.l + W - m.r) / 2, y: H - 8, class: 'label', 'text-anchor': 'middle' }, svg); xl.textContent = cfg.xLabel || '';
    var yl = el('text', { x: 14, y: (m.t + H - m.b) / 2, class: 'label', 'text-anchor': 'middle', transform: 'rotate(-90 14 ' + (m.t + H - m.b) / 2 + ')' }, svg); yl.textContent = cfg.yLabel || '';
    function path(pts) { return pts.map(function (p, i) { return (i ? 'L' : 'M') + X(p.x).toFixed(1) + ' ' + Y(p.y).toFixed(1); }).join(''); }
    el('path', { d: path(cfg.known), class: 'line l-known', fill: 'none' }, svg);
    cfg.known.forEach(function (p) { if (p.lo !== undefined) el('line', { x1: X(p.x), x2: X(p.x), y1: Y(p.lo), y2: Y(p.hi), class: 'ci known-ci' }, svg); });
    var hint = el('text', { x: (gx0 + X(xmax)) / 2, y: (m.t + H - m.b) / 2, class: 'hint', 'text-anchor': 'middle' }, svg); hint.textContent = cfg.hint || 'Draw your guess here';
    var guessPath = el('path', { d: '', class: 'line l-guess', fill: 'none' }, svg);
    var realG = el('g', { class: 'reveal', opacity: 0 }, svg);
    var guess = {}, drawing = false, revealed = false;
    function pos(ev) { var r = svg.getBoundingClientRect(); return { x: (ev.clientX - r.left) / r.width * W, y: (ev.clientY - r.top) / r.height * H }; }
    function nearestX(px) { var best = null; cfg.hidden.forEach(function (p) { if (best === null || Math.abs(X(p.x) - px) < Math.abs(X(best) - px)) best = p.x; }); return best; }
    function redrawGuess() {
      var pts = cfg.hidden.filter(function (p) { return guess[p.x] !== undefined; }).map(function (p) { return { x: p.x, y: guess[p.x] }; });
      var last = cfg.known[cfg.known.length - 1];
      guessPath.setAttribute('d', pts.length ? path([last].concat(pts)) : '');
      hint.style.opacity = pts.length ? 0 : 1;
    }
    function complete() { return cfg.hidden.every(function (p) { return guess[p.x] !== undefined; }); }
    var lastX = null;
    function onMove(ev) {
      if (!drawing || revealed) return; ev.preventDefault();
      var p = pos(ev); if (p.x < gx0 - 6) return;
      var xk = nearestX(Math.min(p.x, X(xmax))), yv = Math.max(cfg.ymin, Math.min(cfg.ymax, Yinv(p.y)));
      if (lastX !== null && Math.abs(xk - lastX) > 1) { var step = xk > lastX ? 1 : -1; for (var xi = lastX + step; xi !== xk; xi += step) if (cfg.hidden.some(function (q) { return q.x === xi; })) guess[xi] = guess[lastX] + (yv - guess[lastX]) * (xi - lastX) / (xk - lastX); }
      guess[xk] = yv; lastX = xk; redrawGuess();
      if (complete()) reveal();
    }
    svg.addEventListener('pointerdown', function (ev) { if (revealed) return; drawing = true; lastX = null; svg.setPointerCapture(ev.pointerId); onMove(ev); });
    svg.addEventListener('pointermove', onMove);
    svg.addEventListener('pointerup', function () { drawing = false; lastX = null; });
    svg.addEventListener('pointercancel', function () { drawing = false; lastX = null; });
    var row = document.createElement('div'); row.className = 'drawit-row'; root.appendChild(row);
    var show = document.createElement('button'); show.type = 'button'; show.className = 'replay'; show.textContent = 'Show the data'; row.appendChild(show);
    var again = document.createElement('button'); again.type = 'button'; again.className = 'replay'; again.textContent = 'Draw again'; again.hidden = true; row.appendChild(again);
    var read = document.createElement('p'); read.className = 'overall-line'; root.appendChild(read);
    function reveal() {
      if (revealed) return; revealed = true; drawing = false; hint.style.opacity = 0;
      while (realG.firstChild) realG.removeChild(realG.firstChild);
      var last = cfg.known[cfg.known.length - 1], real = [last].concat(cfg.hidden);
      cfg.hidden.forEach(function (p) { if (p.lo !== undefined) el('line', { x1: X(p.x), x2: X(p.x), y1: Y(p.lo), y2: Y(p.hi), class: 'ci' }, realG); });
      var rp = el('path', { d: path(real), class: 'line l-real', fill: 'none' }, realG);
      (cfg.extra || []).forEach(function (ex) { el('path', { d: path(ex.pts), class: 'line ' + ex.cls, fill: 'none' }, realG); });
      realG.setAttribute('opacity', 1);
      var len = rp.getTotalLength(); rp.style.strokeDasharray = len; rp.style.strokeDashoffset = len; rp.getBoundingClientRect(); rp.style.transition = 'stroke-dashoffset 1.2s ease'; rp.style.strokeDashoffset = 0;
      show.hidden = true; again.hidden = false;
      read.innerHTML = cfg.readout(guess, cfg.hidden);
      if (cfg.extra && cfg.extra.length) { var lg = document.createElement('div'); lg.className = 'legend-row'; [{ label: cfg.realLabel || 'The data', cls: 'l-real' }].concat(cfg.extra.map(function (ex) { return { label: ex.label, cls: ex.cls }; })).concat([{ label: 'Your guess', cls: 'l-guess' }]).forEach(function (l) { var s = document.createElement('span'); s.className = 'lg ' + l.cls; s.textContent = l.label; lg.appendChild(s); }); plot.appendChild(lg); }
    }
    show.addEventListener('click', function () { reveal(); });
    again.addEventListener('click', function () { guess = {}; revealed = false; realG.setAttribute('opacity', 0); while (realG.firstChild) realG.removeChild(realG.firstChild); redrawGuess(); show.hidden = false; again.hidden = true; read.innerHTML = ''; var lg = plot.querySelector('.legend-row'); if (lg) lg.remove(); });
    redrawGuess();
  }

  function figCigDraw(root) {
    var s = window.SITE_DATA.cig.tus.map(function (d) { return { x: d.cohort, y: d.y * 100, lo: (d.y - 1.96 * d.se) * 100, hi: (d.y + 1.96 * d.se) * 100 }; });
    var known = s.filter(function (d) { return d.x <= 1953; }), hidden = s.filter(function (d) { return d.x > 1953; });
    var base = known[known.length - 1];
    drawIt(root, { known: known, hidden: hidden, xLabel: 'Year of birth', yLabel: 'Became smokers (percent)', ymin: 20, ymax: 36, xTicks: [1940, 1945, 1950, 1955, 1960, 1965], xFmt: String, yFmt: fmt0,
      hint: 'Draw your guess', aria: 'Share of each birth year who became smokers',
      readout: function (g, h) {
        var peak = h.reduce(function (a, b) { return b.y > a.y ? b : a; }), gpeak = g[peak.x], g59 = g[1959], end = h[h.length - 1];
        var dir = gpeak > base.y ? 'rise' : 'fall';
        return 'You drew smoking ' + (dir === 'rise' ? 'rising' : 'falling') + ' after the ban, to ' + fmt1(g59) + ' percent for people born in 1959. In the survey, <strong>' + fmt1(peak.y) + ' percent</strong> of people born in ' + peak.x + ' became smokers, compared with ' + fmt1(base.y) + ' percent of people born in 1953, the last year with no teenage year after the ban. Smoking rose for the first cohorts after the ban before it fell again. By the ' + end.x + ' cohort it was ' + fmt1(end.y) + ' percent.';
      } });
  }
  function figAdsDraw(root) {
    var A = window.SITE_DATA.cig.ads;
    var tot = A.map(function (r) { return { x: r.year, y: r.total }; }), known = tot.filter(function (d) { return d.x <= 1970; }), hidden = tot.filter(function (d) { return d.x > 1970; });
    var bc = A.map(function (r) { return { x: r.year, y: r.broadcast }; });
    drawIt(root, { known: known, hidden: hidden, xLabel: '', yLabel: 'Millions of dollars a year', ymin: 0, ymax: 350, xTicks: [1963, 1966, 1969, 1972, 1974], xFmt: String, yFmt: fmt0, vline: 1970.5, vlineLabel: 'Ban',
      hint: 'Draw your guess', aria: 'Cigarette advertising spending by year', realLabel: 'All advertising', extra: [{ label: 'Television and radio', pts: bc, cls: 'l-bc' }],
      readout: function (g, h) {
        var r71 = h[0], last = h[h.length - 1], g71 = g[1971];
        var drop = (1 - r71.y / 314.7) * 100;
        return 'You drew $' + fmt0(g71) + ' million for 1971. Cigarette makers spent <strong>$' + fmt0(r71.y) + ' million</strong> in 1971, ' + fmt0(drop) + ' percent less than the $315 million of 1970. The $217 million they had spent on television and radio did not all move to print and billboards. Spending did not return to its 1970 level until ' + last.x + '.';
      } });
  }

  // ------------------------------------------------------------------ porn: Google searches by state, drawn after Pornhub leaves
  function figPornTrends(root) {
    var T = window.SITE_DATA.porn.trends, state = { st: 'TX', kw: 'vpn' };
    var ctrl = document.createElement('div'); ctrl.className = 'fig-controls fig-controls-row'; root.appendChild(ctrl);
    var sel = document.createElement('select'); sel.className = 'select'; sel.setAttribute('aria-label', 'Choose a state');
    Object.keys(STATE_NAMES).sort(function (a, b) { return STATE_NAMES[a] < STATE_NAMES[b] ? -1 : 1; }).forEach(function (k) {
      if (!T.keywords.vpn[k]) return;
      var o = document.createElement('option'); o.value = k;
      o.textContent = STATE_NAMES[k] + (T.block_month[k] ? ' · Pornhub left ' + monthLabel(T.block_month[k]) : T.complied[k] ? ' · law ' + monthLabel(T.complied[k]) + ', Pornhub stayed' : '');
      if (k === state.st) o.selected = true; sel.appendChild(o);
    });
    sel.addEventListener('change', function () { state.st = sel.value; draw(); }); ctrl.appendChild(sel);
    buttons(ctrl, [{ key: 'vpn', label: 'Searches for VPN' }, { key: 'pornhub', label: 'Searches for Pornhub' }, { key: 'porn', label: 'Searches for porn' }], function (k) { state.kw = k; draw(); });
    var host = document.createElement('div'); root.appendChild(host);
    function mean(a) { a = a.filter(function (x) { return x !== null && !isNaN(x); }); return a.length ? a.reduce(function (s, x) { return s + x; }, 0) / a.length : null; }
    function pct(a, b) { return (a - b) / b * 100; }
    function dir(ch) { return fmt0(Math.abs(ch)) + ' percent ' + (ch >= 0 ? 'higher' : 'lower'); }
    function draw() {
      host.innerHTML = '';
      var series = T.keywords[state.kw], raw = series[state.st] || [], n = raw.length;
      while (n > 0 && raw[n - 1] === null) n--;
      var months = T.months.slice(0, n), mine = raw.slice(0, n);
      for (var i = 0; i < n; i++) if (mine[i] === null) mine[i] = i ? mine[i - 1] : 0;
      var never = Object.keys(series).filter(function (k) { return !T.block_month[k] && !T.complied[k]; });
      var avg = months.map(function (m, i) { return mean(never.map(function (k) { return series[k][i]; })); });
      var what = { vpn: 'searches for VPNs', pornhub: 'searches for Pornhub', porn: 'searches for porn' }[state.kw], name = STATE_NAMES[state.st];
      var ticks = []; months.forEach(function (m, i) { if (m.slice(5) === '01' || m.slice(5) === '07') ticks.push(i); });
      var block = T.block_month[state.st], bi = block ? months.indexOf(block) : -1;
      var pts = months.map(function (m, i) { return { x: i, y: mine[i] }; }), ref = months.map(function (m, i) { return { x: i, y: avg[i] }; });
      if (bi >= 12 && bi < n - 1) {
        var top = Math.max.apply(null, mine.concat(avg.filter(function (x) { return x !== null; }))), ymax = Math.ceil(top * 1.4 / 10) * 10;
        drawIt(host, { known: pts.slice(0, bi), hidden: pts.slice(bi), xLabel: '', yLabel: 'Google search interest (index)', ymin: 0, ymax: ymax, xTicks: ticks, xFmt: function (i) { return monthLabel(months[i]); },
          vline: bi - 0.5, vlineLabel: 'Pornhub leaves', hint: 'Draw your guess', realLabel: name, extra: [{ label: 'Average of states with no law', pts: ref, cls: 'l-ref' }],
          aria: 'Monthly Google search interest in ' + name + ', with the months after Pornhub left for you to draw',
          readout: function (g, h) {
            var k = Math.min(12, h.length), pre = mean(mine.slice(bi - 12, bi)), post = mean(mine.slice(bi, bi + k)), gpost = mean(h.slice(0, k).map(function (p) { return g[p.x]; }));
            var rpre = mean(avg.slice(bi - 12, bi)), rpost = mean(avg.slice(bi, bi + k));
            var span = k === 12 ? '12 months' : k + ' months';
            return 'You drew ' + what + ' in ' + name + ' ' + dir(pct(gpost, pre)) + ' after Pornhub left than in the 12 months before. In the data, ' + what + ' in the ' + span + ' after Pornhub left in ' + monthLabel(block) + ' were <strong>' + dir(pct(post, pre)) + '</strong> than in the 12 months before. In the states with no law, ' + what + ' over the same months were ' + dir(pct(rpost, rpre)) + '.';
          } });
      } else {
        var plot = document.createElement('div'); plot.className = 'plot'; host.appendChild(plot);
        lineChart(plot, [{ label: name, pts: pts, cls: 'l-main' }, { label: 'Average of states with no law', pts: ref, cls: 'l-ref' }], { xLabel: '', yLabel: 'Google search interest (index)', xTicks: ticks, xFmt: function (i) { return monthLabel(months[i]); }, ymin: 0, aria: 'Monthly Google search interest in ' + name });
        var p = document.createElement('p'); p.className = 'overall-line'; host.appendChild(p);
        p.textContent = T.complied[state.st] ? name + ' required age checks from ' + monthLabel(T.complied[state.st]) + '. Pornhub checked ages there through the state’s own app instead of leaving, so there is nothing to draw.' : block ? 'Pornhub left ' + name + ' in ' + monthLabel(block) + ', too late in these data to draw what came next.' : name + ' has had no age-verification law for pornography sites.';
      }
    }
    draw();
  }

  // ------------------------------------------------------------------ dobbs: daily Google searches, drawn after the leak
  function figDobbsTrends(root) {
    var T = window.SITE_DATA.dobbs.trends, state = { k: 'period tracker' };
    var ctrl = document.createElement('div'); ctrl.className = 'fig-controls'; root.appendChild(ctrl);
    buttons(ctrl, [{ key: 'period tracker', label: '“period tracker”' }, { key: 'period app', label: '“period app”' }], function (k) { state.k = k; draw(); });
    var host = document.createElement('div'); root.appendChild(host);
    var d = T.dates, leak = d.indexOf('2022-05-02'), ruling = d.indexOf('2022-06-24');
    function lab(i) { var m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'][+d[i].slice(5, 7) - 1]; return m + ' ' + (+d[i].slice(8)); }
    function draw() {
      host.innerHTML = '';
      var s = T.series[state.k], pts = s.map(function (v, i) { return { x: i, y: v }; });
      var ticks = []; d.forEach(function (x, i) { if (x.slice(8) === '01') ticks.push(i); });
      var ymax = Math.ceil(Math.max.apply(null, s) * 1.1 / 10) * 10, april = pts.slice(0, leak).reduce(function (a, p) { return a + p.y; }, 0) / leak;
      drawIt(host, { known: pts.slice(0, leak), hidden: pts.slice(leak), xLabel: '2022', yLabel: 'Google search interest (index)', ymin: 0, ymax: ymax, xTicks: ticks, xFmt: lab,
        vlines: [{ x: leak - 0.5, label: 'Draft opinion leaks' }, { x: ruling, label: 'Court rules' }], hint: 'Draw your guess', aria: 'Daily Google searches for ' + state.k + ' in the United States, April to July 2022',
        readout: function (g, h) {
          var mine = h.map(function (p) { return g[p.x]; }).filter(function (v) { return v !== undefined; }), gmax = mine.length ? Math.max.apply(null, mine) : null;
          var peak = function (i) { return Math.max.apply(null, s.slice(i, i + 7)) / april; };
          return (gmax === null ? '' : 'You drew searches for “' + state.k + '” peaking at ' + fmt1(gmax / april) + ' times their April level. ') + 'In the data, searches for “' + state.k + '” peaked at <strong>' + fmt1(peak(leak)) + ' times</strong> their April level in the week after the leak, and at <strong>' + fmt1(peak(ruling)) + ' times</strong> their April level in the week after the Court ruled. A week after the ruling they were ' + fmt1(s[ruling + 7] / april) + ' times their April level.';
        } });
    }
    draw();
  }

  // ------------------------------------------------------------------ dating: minutes a day on each kind of app, guessed bar by bar
  function figDatingDesc(root) {
    var D = window.SITE_DATA.dating_desc, vals = D.usage['Minutes on a day of use, median'];
    var rows = D.kinds.map(function (k, i) { return { label: k, y: vals[i], cls: 'k' + i }; });
    guessBars(root, { rows: rows, xmax: 20, xLabel: 'Minutes on a day the app was used (median)', hint: 'Draw your guess', aria: 'Median minutes on a day of use, for dating apps and three kinds of AI app',
      readout: function (g) {
        var order = rows.slice().sort(function (a, b) { return b.y - a.y; }), gtop = rows.reduce(function (a, b) { return g[b.label] > g[a.label] ? b : a; });
        var lower = function (s) { return s.replace(/^(Dating|General)/, function (w) { return w.toLowerCase(); }); };
        var real = order.map(function (r, i) { return fmt1(r.y) + ' minutes on ' + lower(r.label); });
        var mine = rows.map(function (r) { return fmt1(g[r.label]) + ' minutes on ' + lower(r.label); });
        return 'You put ' + lower(gtop.label) + ' first' + (gtop === order[0] ? ', and so do the data. ' : '. In the data, ' + lower(order[0].label) + ' come first. ') + 'On a day they used the app, people spent a median of <strong>' + real[0] + '</strong>, ' + real[1] + ', ' + real[2] + ' and ' + real[3] + '. You guessed ' + mine.join(', ').replace(/, ([^,]*)$/, ' and $1') + '.';
      } });
  }

  // horizontal bars the reader sets before the data are shown. cfg: {rows:[{label,y,cls}], xmax, xLabel, hint, readout(guess)}
  function guessBars(root, cfg) {
    var W = 640, rowH = 46, m = { t: 10, r: 24, b: 46, l: 170 }, n = cfg.rows.length, H = m.t + m.b + n * rowH;
    var plot = document.createElement('div'); plot.className = 'plot drawit'; root.appendChild(plot);
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart gbars', role: 'img', 'aria-label': cfg.aria || '' }, plot);
    var X = function (v) { return m.l + v / cfg.xmax * (W - m.l - m.r); }, Xinv = function (px) { return Math.max(0, Math.min(cfg.xmax, (px - m.l) / (W - m.l - m.r) * cfg.xmax)); };
    el('rect', { x: m.l, y: m.t, width: W - m.l - m.r, height: n * rowH, class: 'guess-zone' }, svg);
    niceTicks(0, cfg.xmax, 5).forEach(function (t) { el('line', { x1: X(t), x2: X(t), y1: m.t, y2: m.t + n * rowH, class: 'grid' }, svg); var tx = el('text', { x: X(t), y: m.t + n * rowH + 18, class: 'tick', 'text-anchor': 'middle' }, svg); tx.textContent = fmt0(t); });
    var xl = el('text', { x: (m.l + W - m.r) / 2, y: H - 8, class: 'label', 'text-anchor': 'middle' }, svg); xl.textContent = cfg.xLabel || '';
    var guess = {}, bars = [], revealed = false, active = null;
    cfg.rows.forEach(function (r, i) {
      var y = m.t + rowH * i;
      var t = el('text', { x: m.l - 12, y: y + rowH / 2 + 4, class: 'rowlabel', 'text-anchor': 'end' }, svg); t.textContent = r.label;
      var gb = el('rect', { x: m.l, y: y + 11, width: 0, height: rowH - 22, class: 'gbar-guess', rx: 3 }, svg);
      var rb = el('rect', { x: m.l, y: y + 11, width: 0, height: rowH - 22, class: 'hbar ' + r.cls + ' gbar-real', rx: 3, opacity: 0 }, svg);
      bars.push({ row: r, y: y, gb: gb, rb: rb });
    });
    var hint = el('text', { x: (m.l + W - m.r) / 2, y: m.t + n * rowH / 2 + 4, class: 'hint', 'text-anchor': 'middle' }, svg); hint.textContent = cfg.hint || 'Draw your guess';
    function pos(ev) { var r = svg.getBoundingClientRect(); return { x: (ev.clientX - r.left) / r.width * W, y: (ev.clientY - r.top) / r.height * H }; }
    function complete() { return cfg.rows.every(function (r) { return guess[r.label] !== undefined; }); }
    function setGuess(ev) {
      var p = pos(ev);
      if (active === null) { var i = Math.floor((p.y - m.t) / rowH); if (i < 0 || i >= n) return; active = i; }
      var b = bars[active], v = Xinv(p.x); guess[b.row.label] = v; b.gb.setAttribute('width', Math.max(2, X(v) - m.l)); hint.style.opacity = 0;
    }
    svg.addEventListener('pointerdown', function (ev) { if (revealed) return; ev.preventDefault(); active = null; svg.setPointerCapture(ev.pointerId); setGuess(ev); });
    svg.addEventListener('pointermove', function (ev) { if (revealed || active === null) return; ev.preventDefault(); setGuess(ev); });
    function up() { if (active === null) return; active = null; if (complete() && !revealed) setTimeout(reveal, 250); }
    svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
    var row = document.createElement('div'); row.className = 'drawit-row'; root.appendChild(row);
    var show = document.createElement('button'); show.type = 'button'; show.className = 'replay'; show.textContent = 'Show the data'; row.appendChild(show);
    var again = document.createElement('button'); again.type = 'button'; again.className = 'replay'; again.textContent = 'Draw again'; again.hidden = true; row.appendChild(again);
    var read = document.createElement('p'); read.className = 'overall-line'; root.appendChild(read);
    function reveal() {
      if (revealed) return; revealed = true; hint.style.opacity = 0; svg.classList.add('revealed');
      cfg.rows.forEach(function (r) { if (guess[r.label] === undefined) guess[r.label] = 0; });
      var t0 = null;
      function step(ts) { if (t0 === null) t0 = ts; var k = Math.min(1, (ts - t0) / 900), e = 1 - Math.pow(1 - k, 3); bars.forEach(function (b) { b.rb.setAttribute('opacity', 1); b.rb.setAttribute('width', Math.max(1, (X(b.row.y) - m.l) * e)); }); if (k < 1) requestAnimationFrame(step); }
      requestAnimationFrame(step);
      show.hidden = true; again.hidden = false; read.innerHTML = cfg.readout(guess);
      var lg = document.createElement('div'); lg.className = 'legend-row'; [{ label: 'The data', cls: 'b-real' }, { label: 'Your guess', cls: 'b-guess' }].forEach(function (l) { var s = document.createElement('span'); s.className = 'lg ' + l.cls; s.textContent = l.label; lg.appendChild(s); }); plot.appendChild(lg);
    }
    show.addEventListener('click', reveal);
    again.addEventListener('click', function () { guess = {}; revealed = false; svg.classList.remove('revealed'); bars.forEach(function (b) { b.gb.setAttribute('width', 0); b.rb.setAttribute('width', 0); b.rb.setAttribute('opacity', 0); }); hint.style.opacity = 1; show.hidden = false; again.hidden = true; read.innerHTML = ''; var lg = plot.querySelector('.legend-row'); if (lg) lg.remove(); });
  }

  var FIGS = { cigDraw: figCigDraw, adsDraw: figAdsDraw, cigAds: figCigAds, dobbsTrends: figDobbsTrends, gamblingHandles: figGamblingHandles, datingDesc: figDatingDesc, pornTrends: figPornTrends, dobbsWeekly: figDobbsWeekly, porn: figPorn, dating: figDating, cigCohorts: figCigCohorts, cigIntl: figCigIntl, cigDeaths: figCigDeaths, dobbs: figDobbs, dobbsBrowsers: figDobbsBrowsers, gamblingAtts: figGamblingAtts, gamblingCalc: figGamblingCalc };
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-fig]').forEach(function (n) { var f = FIGS[n.dataset.fig]; if (f && window.SITE_DATA) f(n); });
  });
})();
