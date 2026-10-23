(function () {
  var root = document.documentElement;
  function stored() { try { return localStorage.getItem('theme'); } catch (e) { return null; } }
  function effective() {
    var t = root.getAttribute('data-theme'); if (t) return t;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  var saved = stored();
  if (saved === 'dark' || saved === 'light') root.setAttribute('data-theme', saved);

  // ---- tile map of the US: row, col on a square grid ----
  var TILES = {
    AK: [0, 0], ME: [0, 11],
    WI: [1, 6], VT: [1, 10], NH: [1, 11],
    WA: [2, 1], ID: [2, 2], MT: [2, 3], ND: [2, 4], MN: [2, 5], IL: [2, 6], MI: [2, 7], NY: [2, 9], MA: [2, 10], RI: [2, 11],
    OR: [3, 1], NV: [3, 2], WY: [3, 3], SD: [3, 4], IA: [3, 5], IN: [3, 6], OH: [3, 7], PA: [3, 8], NJ: [3, 9], CT: [3, 10],
    CA: [4, 1], UT: [4, 2], CO: [4, 3], NE: [4, 4], MO: [4, 5], KY: [4, 6], WV: [4, 7], VA: [4, 8], MD: [4, 9], DE: [4, 10],
    AZ: [5, 2], NM: [5, 3], KS: [5, 4], AR: [5, 5], TN: [5, 6], NC: [5, 7], SC: [5, 8], DC: [5, 9],
    OK: [6, 4], LA: [6, 5], MS: [6, 6], AL: [6, 7], GA: [6, 8],
    HI: [7, 1], TX: [7, 4], FL: [7, 9]
  };
  var NAMES = { AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming' };

  // ---- the rollouts, from the papers' own treatment tables ----
  var LAYERS = {
    osg: {
      label: 'Online sports betting', note: 'Month online sports betting went live in each state, 2018 to 2023, as used in Gambling Spillovers.',
      ramp: ['--osg-0', '--osg-1', '--osg-2'],
      dates: { NJ: '2018-08', WV: '2018-12', PA: '2019-05', IA: '2019-08', RI: '2019-09', IN: '2019-10', OR: '2019-10', NH: '2019-12', CO: '2020-05', DC: '2020-05', IL: '2020-06', TN: '2020-11', MI: '2021-01', VA: '2021-01', AZ: '2021-09', WY: '2021-09', CT: '2021-10', LA: '2022-01', NY: '2022-01', AR: '2022-03', KS: '2022-09', MD: '2022-11', OH: '2023-01', MA: '2023-03', KY: '2023-09', FL: '2023-11', ME: '2023-11' }
    },
    av: {
      label: 'Pornography age verification', note: 'Month Pornhub blocked each state after its age-verification law for pornography sites took effect, 2023 to 2025, as used in Unexpected Outcomes of Vice Regulation. Louisiana’s law took effect in January 2023 and Pornhub complied there instead.',
      ramp: ['--av-0', '--av-1', '--av-2'],
      dates: { UT: '2023-05', VA: '2023-07', MS: '2023-07', AR: '2023-08', MT: '2024-01', NC: '2024-01', TX: '2024-03', ID: '2024-07', KS: '2024-07', KY: '2024-07', NE: '2024-07', IN: '2024-07', AL: '2024-10', OK: '2024-11', TN: '2025-01', FL: '2025-01', SC: '2025-01', SD: '2025-07', WY: '2025-07', ND: '2025-08', AZ: '2025-09', MO: '2025-11' }
    }
  };
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function fmt(ym) { return ym.length === 4 ? ym : MONTHS[+ym.slice(5, 7) - 1] + ' ' + ym.slice(0, 4); }
  function mix(a, b, t) { return a.map(function (v, i) { return Math.round(v + (b[i] - v) * t); }); }
  function hex(h) { h = h.trim(); var n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function cssVar(name) { return getComputedStyle(root).getPropertyValue(name); }

  function buildMap() {
    var host = document.querySelector('.rollout'); if (!host) return;
    var svgNS = 'http://www.w3.org/2000/svg', size = 44, gap = 4, step = size + gap;
    var svg = host.querySelector('svg.map');
    svg.setAttribute('viewBox', '0 0 ' + (12 * step - gap) + ' ' + (8 * step - gap));
    var tiles = {}, tilesFor = null;
    function buildTiles(layer) {
      var grid = layer.tiles || TILES; if (tilesFor === grid) return; tilesFor = grid;
      while (svg.firstChild) svg.removeChild(svg.firstChild); tiles = {};
      svg.setAttribute('viewBox', '0 0 ' + (12 * step - gap) + ' ' + (8 * step - gap));
    Object.keys(grid).forEach(function (st) {
      var r = grid[st][0], c = grid[st][1];
      var g = document.createElementNS(svgNS, 'g'); g.setAttribute('data-st', st);
      var rect = document.createElementNS(svgNS, 'rect');
      rect.setAttribute('x', c * step); rect.setAttribute('y', r * step); rect.setAttribute('width', size); rect.setAttribute('height', size); rect.setAttribute('rx', 7); rect.setAttribute('class', 'tile');
      var txt = document.createElementNS(svgNS, 'text');
      txt.setAttribute('x', c * step + size / 2); txt.setAttribute('y', r * step + size / 2 + 4); txt.setAttribute('text-anchor', 'middle'); txt.setAttribute('class', 'code'); txt.textContent = st;
      var title = document.createElementNS(svgNS, 'title'); g.appendChild(title);
      g.appendChild(rect); g.appendChild(txt); svg.appendChild(g); tiles[st] = { g: g, rect: rect, title: title };
      g.addEventListener('mouseenter', function () { hoverEl.textContent = title.textContent; });
      g.addEventListener('mouseleave', function () { hoverEl.textContent = ''; });
    });
    }

    var yearEl = host.querySelector('.readout .year'), countEl = host.querySelector('.readout .count'), hoverEl = host.querySelector('.hovername'), noteEl = host.querySelector('.rollout-caption'), legend = host.querySelector('.legend');
    var current = 'osg', timer = null, reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    try { var q = new URLSearchParams(location.search).get('layer'); if (q && LAYERS[q]) current = q; } catch (e) {}
    host.querySelectorAll('.layer').forEach(function (x) { x.setAttribute('aria-pressed', x.dataset.layer === current ? 'true' : 'false'); });

    function colorFor(layer, ym) {
      var ds = Object.keys(layer.dates).map(function (k) { return layer.dates[k]; }).sort();
      var lo = ds[0], hi = ds[ds.length - 1];
      var t = (idx(ym) - idx(lo)) / Math.max(1, idx(hi) - idx(lo));
      var c0 = hex(cssVar(layer.ramp[0])), c1 = hex(cssVar(layer.ramp[1])), c2 = hex(cssVar(layer.ramp[2]));
      var c = t < 0.5 ? mix(c0, c1, t * 2) : mix(c1, c2, (t - 0.5) * 2);
      return 'rgb(' + c.join(',') + ')';
    }
    function idx(ym) { return ym.length === 4 ? +ym : +ym.slice(0, 4) * 12 + (+ym.slice(5, 7)); }

    function render(layerKey, upTo) {
      var layer = LAYERS[layerKey], n = 0, names = layer.names || NAMES;
      buildTiles(layer);
      Object.keys(tiles).forEach(function (st) {
        var d = layer.dates[st], on = d && (!upTo || idx(d) <= upTo);
        tiles[st].g.classList.toggle('on', !!on);
        tiles[st].rect.style.fill = on ? colorFor(layer, d) : '';
        var extra = layer.extra && layer.extra[st] ? ' · ' + layer.extra[st] : '';
        tiles[st].title.textContent = names[st] + (d ? ' · ' + fmt(d) + extra : (layer.tiles ? ' · control, never removed broadcast advertising' : ' · not adopted in this window'));
        if (on) n++;
      });
      countEl.textContent = n + (layer.tiles ? (n === 1 ? ' country' : ' countries') : (n === 1 ? ' state' : ' states'));
      // legend: first, middle, last year of the ramp
      var ds = Object.keys(layer.dates).map(function (k) { return layer.dates[k]; }).sort();
      legend.innerHTML = '<span>' + ds[0].slice(0, 4) + '</span><i style="background:' + colorFor(layer, ds[0]) + '"></i><i style="background:' + colorFor(layer, ds[Math.floor(ds.length / 2)]) + '"></i><i style="background:' + colorFor(layer, ds[ds.length - 1]) + '"></i><span>' + ds[ds.length - 1].slice(0, 4) + '</span>';
      noteEl.textContent = layer.note;
    }
    var scrub = host.querySelector('.scrub');
    function show(layerKey, m) { render(layerKey, m); yearEl.textContent = String(Math.floor((m - 1) / 12)); if (scrub) scrub.value = m; }
    function play(layerKey) {
      clearInterval(timer);
      var layer = LAYERS[layerKey];
      var ds = Object.keys(layer.dates).map(function (k) { return layer.dates[k]; }).sort();
      var start = idx(ds[0]) - 1, end = idx(ds[ds.length - 1]), m = start;
      if (scrub) { scrub.min = start; scrub.max = end; }
      if (reduce) { show(layerKey, end); return; }
      show(layerKey, start);
      timer = setInterval(function () {
        m++; show(layerKey, m);
        if (m >= end) { clearInterval(timer); timer = null; }
      }, 140);
    }
    if (scrub) scrub.addEventListener('input', function () { clearInterval(timer); timer = null; show(current, +scrub.value); });
    host.querySelectorAll('.layer').forEach(function (b) {
      b.addEventListener('click', function () {
        current = b.dataset.layer;
        host.querySelectorAll('.layer').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        play(current);
      });
    });
    host.querySelector('.replay').addEventListener('click', function () { play(current); });
    play(current);
    // repaint colors when the theme changes
    var mo = new MutationObserver(function () { var ds = Object.keys(LAYERS[current].dates).map(function (k) { return LAYERS[current].dates[k]; }).sort(); if (!timer) render(current, idx(ds[ds.length - 1])); });
    mo.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var b = document.querySelector('.theme-toggle');
    if (b) b.addEventListener('click', function () {
      var next = effective() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
    buildMap();
    var chips = document.querySelectorAll('.chip'); if (!chips.length) return;
    var papers = document.querySelectorAll('.paper'), groups = document.querySelectorAll('.paper-group');
    function apply(theme) {
      chips.forEach(function (c) { c.setAttribute('aria-pressed', c.dataset.theme === theme ? 'true' : 'false'); });
      papers.forEach(function (p) { p.hidden = theme !== 'all' && (' ' + p.dataset.themes + ' ').indexOf(' ' + theme + ' ') < 0; });
      groups.forEach(function (gp) { gp.hidden = !gp.querySelector('.paper:not([hidden])'); });
    }
    chips.forEach(function (c) { c.addEventListener('click', function () { apply(c.dataset.theme); history.replaceState(null, '', c.dataset.theme === 'all' ? location.pathname : '#' + c.dataset.theme); }); });
    var h = location.hash.replace('#', '');
    apply(document.querySelector('.chip[data-theme="' + h + '"]') ? h : 'all');
  });
})();
