(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';
  function track(n, p) { if (window.siteTrack) window.siteTrack(n, p); }
  function el(tag, cls, parent) { var e = document.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  var touch = window.matchMedia('(hover: none)').matches;
  function hint(text, parent, cls) { var h = el('span', 'cue ' + (cls || ''), parent); h.setAttribute('aria-hidden', 'true'); h.textContent = text; return h; }
  function drop(h) { if (h) { h.classList.add('gone'); setTimeout(function () { h.remove(); }, 500); } }

  // ---------------------------------------------------------------- cigarettes: a cigarette that burns down as the page scrolls
  function cig() {
    var bar = el('div', 'cig', document.body); bar.setAttribute('aria-hidden', 'true');
    bar.innerHTML = '<span class="cig-filter"></span><span class="cig-paper"></span><span class="cig-ember"></span><span class="cig-ash"></span>';
    var ember = bar.querySelector('.cig-ember'), ticking = false, A = window.SITE_DATA && window.SITE_DATA.cig, NOTES = [];
    function row(y) { return A.ads.filter(function (r) { return r.year === y; })[0]; }
    function share(y) { var r = A.tus.filter(function (d) { return d.cohort === y; })[0]; return (Math.round(r.y * 1000) / 10).toFixed(1); }
    NOTES.push(['Since 1967', 'Broadcasters were required to air anti-smoking advertisements.']);
    if (A) NOTES.push(['1970', 'Cigarette makers spent $' + Math.round(row(1970).total) + ' million on advertising, $' + Math.round(row(1970).broadcast) + ' million of it on television and radio.']);
    NOTES.push(['January 2, 1971', 'Cigarette commercials were removed from American radio and television.']);
    NOTES.push(['After the ban', 'Broadcasters aired far fewer anti-smoking advertisements.']);
    if (A) {
      NOTES.push(['1971', 'Cigarette makers spent $' + Math.round(row(1971).total) + ' million on advertising, ' + Math.round((1 - row(1971).total / row(1970).total) * 100) + ' percent less than in 1970.']);
      NOTES.push(['Born in 1953', share(1953) + ' percent of people born in 1953 became smokers. They were the last to finish their teens before the ban.']);
      NOTES.push(['Born in 1959', share(1959) + ' percent of people born in 1959 became smokers.']);
    }
    var note = el('div', 'cig-note', document.body), noteAt = -1, noteTimer = null; note.setAttribute('aria-hidden', 'true'); note.innerHTML = '<b></b><span></span>';
    function say(n) {
      if (n === noteAt) return; noteAt = n; note.firstChild.textContent = NOTES[n][0]; note.lastChild.textContent = NOTES[n][1];
      note.classList.remove('on'); void note.offsetWidth; note.classList.add('on'); clearTimeout(noteTimer); noteTimer = setTimeout(function () { note.classList.remove('on'); }, 9000);
      if (n) track('cig_note', { note: n });
    }
    var gust = 0, wind = { x: 0, y: 0 }, lastY = window.scrollY, parts = [];
    function burn() {
      ticking = false; var h = document.documentElement, max = h.scrollHeight - window.innerHeight, p = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0; bar.style.setProperty('--p', (p * .93).toFixed(4)); bar.style.setProperty('--ash', ((p * 6) % 1).toFixed(3));
      var n = Math.min(NOTES.length - 1, Math.floor(p * NOTES.length * .999)); if (noteAt >= 0 || n) say(n);
    }
    window.addEventListener('scroll', function () {
      var dy = window.scrollY - lastY; lastY = window.scrollY;
      if (dy) { var m = clamp(dy, -80, 80); wind.y -= m * 1.6; wind.x += (Math.random() - .35) * Math.abs(m) * .9; gust = Math.min(2.5, gust + Math.abs(m) * .03); for (var i = 0; i < parts.length; i++) parts[i].y -= m * .5 * parts[i].h; }
      if (!ticking) { ticking = true; requestAnimationFrame(burn); }
    }, { passive: true }); burn();
    setTimeout(function () { bar.classList.add('lit'); if (noteAt < 0) say(0); }, reduce ? 0 : 900);
    if (reduce) return;

    var cv = el('canvas', 'smoke', document.body); cv.setAttribute('aria-hidden', 'true');
    var ctx = cv.getContext('2d'), W = 0, H = 0, last = 0, acc = 0, clock = 0, seq = 0, mouse = { x: -999, y: -999, vx: 0, vy: 0 };
    var sprite = document.createElement('canvas'); sprite.width = sprite.height = 64;
    var sg = sprite.getContext('2d'), g = sg.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(152,156,164,1)'); g.addColorStop(.35, 'rgba(152,156,164,.55)'); g.addColorStop(.7, 'rgba(152,156,164,.14)'); g.addColorStop(1, 'rgba(152,156,164,0)'); sg.fillStyle = g; sg.fillRect(0, 0, 64, 64);
    var MODES = [[330, .8, .6, 26, .33], [190, -.6, .8, 21, -.5], [112, .3, -.95, 15, .85], [64, .9, .43, 9, -1.3]].map(function (m) { var k = 6.2832 / m[0]; return { kx: m[1] * k, ky: m[2] * k, ux: m[2] * m[3], uy: -m[1] * m[3], w: m[4], ph: Math.random() * 6.28 }; });
    function size() { W = cv.width = window.innerWidth; H = cv.height = window.innerHeight; }
    window.addEventListener('resize', size); size();
    window.addEventListener('pointermove', function (e) { var dx = e.clientX - mouse.x, dy = e.clientY - mouse.y; if (Math.abs(dx) < 200) { mouse.vx += dx; mouse.vy += dy; wind.x += dx * .06; gust = Math.min(2.5, gust + Math.abs(dx) * .004); } mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
    function step(dt) {
      clock += dt; acc += dt;
      var b = ember.getBoundingClientRect(), ex = b.left + b.width * .55, ey = b.top + b.height * .2, rate = clock < 5 ? .0055 : .007;
      while (acc > rate) { acc -= rate; var st = (seq++) % 3, hz = Math.random() < .26, j = hz ? 11 : 2.6; parts.push({ x: ex + (st - 1) * 2.6 + Math.sin(clock * 2.6 + st * 2.1) * 1.4, y: ey, age: Math.random() * rate, life: (hz ? 6 : 7.5) + Math.random() * 4, jx: (Math.random() - .5) * j, jy: (Math.random() - .5) * j * .6, s: .8 + Math.random() * .5, hz: hz, h: 0 }); }
      var breeze = Math.sin(clock * .23) * 5 + Math.sin(clock * .071 + 1) * 4 + 3;
      wind.x += (breeze - wind.x) * Math.min(1, dt * 1.3); wind.y *= Math.exp(-dt * 2.2); gust *= Math.exp(-dt * 1.1);
      ctx.clearRect(0, 0, W, H);
      for (var i = parts.length - 1; i >= 0; i--) {
        var p = parts[i]; p.age += dt; if (p.age > p.life || p.y < -90 || p.x > W + 90 || p.x < -90) { parts.splice(i, 1); continue; }
        var h = p.h = clamp((ey - p.y) / 130, 0, 1), u = 0, v = 0;
        for (var m = 0; m < 4; m++) { var M = MODES[m], c = Math.cos(M.kx * p.x + M.ky * p.y + M.w * clock + M.ph); u += c * M.ux; v += c * M.uy; }
        var turb = h * h * (1 + gust), rise = 80 - 44 * clamp(p.age / 5, 0, 1);
        var vx = u * turb + wind.x * (.25 + h) + 7 * h + p.jx * h, vy = -rise + v * turb * .8 + wind.y * (.3 + h) + p.jy * h;
        var dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy; if (d2 < 22500) { var f = (1 - d2 / 22500); vx += mouse.vx * f * 9; vy += mouse.vy * f * 6; }
        p.x += vx * dt; p.y += vy * dt;
        var k = p.age / p.life, r = p.hz ? (4 + Math.pow(p.age, 1.3) * 9.5) * p.s : (2 + Math.pow(p.age, 1.2) * 4.4) * p.s, a = Math.min(1, p.age * 9) * Math.pow(1 - k, 1.25) * (p.hz ? .085 / (1 + p.age * .45) : .36 / (1 + p.age * .7) + .024);
        ctx.globalAlpha = a; ctx.drawImage(sprite, p.x - r, p.y - r, r * 2, r * 2);
      }
      mouse.vx *= .6; mouse.vy *= .6;
    }
    function frame(ts) { requestAnimationFrame(frame); if (document.hidden) { last = ts; return; } var dt = Math.min(.05, (ts - last) / 1000 || 0); last = ts; step(dt); }
    requestAnimationFrame(frame);
    window.__smoke = function (n) { for (var i = 0; i < (n || 1); i++) step(1 / 30); return parts.length; };
  }

  // ---------------------------------------------------------------- gambling: the title printed on a lottery scratch ticket
  function ticket(scene) {
    var head = scene.querySelector('.paper-head');
    head.addEventListener('pointermove', function (e) { if (e.pointerType === 'touch') return; var b = head.getBoundingClientRect(), x = (e.clientX - b.left) / b.width, y = (e.clientY - b.top) / b.height; head.style.setProperty('--mx', x); head.style.setProperty('--my', y); head.style.setProperty('--ry', ((x - .5) * 4).toFixed(2) + 'deg'); head.style.setProperty('--rx', ((.5 - y) * 3).toFixed(2) + 'deg'); head.style.setProperty('--sheen', 1); });
    head.addEventListener('pointerleave', function () { head.style.setProperty('--ry', '0deg'); head.style.setProperty('--rx', '0deg'); head.style.setProperty('--sheen', 0); });
    var PRIZES = [
      ['27 states', 'opened online sportsbooks between 2018 and 2023'],
      ['5.4 to 6.2%', 'lower state lottery sales in the 16 months after online sports betting opened'],
      ['$148 million', 'in state revenue lost across 17 states and Washington, DC']
    ];
    var row = el('div', 'prizes', head), dpr = Math.min(2, window.devicePixelRatio || 1), revealed = 0;
    PRIZES.forEach(function (P, n) {
      var box = el('div', 'prize', row), b = el('b', '', box), c = el('span', '', box); b.textContent = P[0]; c.textContent = P[1];
      if (reduce) return;
      var cv = el('canvas', 'scratch', box), ctx = cv.getContext('2d'), w = 0, h = 0, touched = false, done = false, lastPt = null, lastCheck = 0, down = false;
      function paint() {
        if (done) return; w = box.offsetWidth; h = box.offsetHeight; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        var g = ctx.createLinearGradient(0, 0, w, h); [[0, '#AEB4BC'], [.22, '#E4E7EB'], [.45, '#A2A8B1'], [.7, '#D9DCE1'], [1, '#A9AFB8']].forEach(function (s) { g.addColorStop(s[0], s[1]); });
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        ctx.font = '600 12px "IBM Plex Mono", Menlo, monospace'; ctx.fillStyle = 'rgba(52,58,70,.2)';
        for (var y = 14, r = 0; y < h + 12; y += 19, r++) for (var x = (r % 2 ? 4 : 17); x < w; x += 26) ctx.fillText('$', x, y);
        ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1; for (var d = -h; d < w; d += 7) { ctx.beginPath(); ctx.moveTo(d, h); ctx.lineTo(d + h, 0); ctx.stroke(); }
        ctx.font = '700 13px "IBM Plex Mono", Menlo, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; var lab = 'S C R A T C H', tw = ctx.measureText(lab).width; ctx.fillStyle = 'rgba(214,218,224,.92)'; ctx.fillRect(w / 2 - tw / 2 - 10, h / 2 - 12, tw + 20, 24); ctx.fillStyle = 'rgba(40,46,58,.78)'; ctx.fillText(lab, w / 2, h / 2 + 1); ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
      }
      function reveal() { if (done) return; done = true; cv.classList.add('gone'); box.classList.add('won'); setTimeout(function () { cv.remove(); }, 700); track('scratch_reveal', { box: n + 1, count: ++revealed }); }
      var start = null;
      function rub(x, y) { ctx.globalCompositeOperation = 'destination-out'; ctx.lineWidth = 30; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); if (lastPt) { ctx.moveTo(lastPt.x, lastPt.y); ctx.lineTo(x, y); } else { ctx.moveTo(x, y); ctx.lineTo(x + .1, y); } ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; lastPt = { x: x, y: y }; }
      function shave(cx, cy) { var s = el('i', 'shaving', document.body); s.style.left = cx + 'px'; s.style.top = cy + 'px'; s.style.setProperty('--dx', (Math.random() * 40 - 20) + 'px'); s.style.setProperty('--rot', (Math.random() * 360) + 'deg'); setTimeout(function () { s.remove(); }, 700); }
      function check(now) {
        if (done || now - lastCheck < 300) return; lastCheck = now;
        var d = ctx.getImageData(0, 0, cv.width, cv.height).data, clear = 0, tot = 0; for (var i = 3; i < d.length; i += 4 * 53) { tot++; if (d[i] < 40) clear++; }
        if (clear / tot > .42) reveal();
      }
      function at(e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
      cv.addEventListener('pointerdown', function (e) { down = true; lastPt = null; touched = true; start = { x: e.clientX, y: e.clientY, far: false }; try { cv.setPointerCapture(e.pointerId); } catch (x) {} var p = at(e); rub(p.x, p.y); });
      cv.addEventListener('pointermove', function (e) { if (e.pointerType !== 'mouse' && !down) return; touched = true; if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) start.far = true; var p = at(e); rub(p.x, p.y); if (Math.random() < .35) shave(e.clientX, e.clientY); check(performance.now()); });
      cv.addEventListener('pointerup', function () { down = false; lastPt = null; lastCheck = 0; check(performance.now()); if (start && !start.far) reveal(); start = null; }); cv.addEventListener('pointercancel', function () { down = false; lastPt = null; });
      cv.addEventListener('pointerleave', function () { if (!down) lastPt = null; });
      function demo() { if (touched || done) return; var t0 = null; (function step(ts) { if (touched || done) { lastPt = null; return; } if (t0 === null) t0 = ts; var k = Math.min(1, (ts - t0) / 900), x = 14 + k * w * .5, y = h * .42 + Math.sin(k * 13) * h * .2; rub(x, y); if (k < 1) requestAnimationFrame(step); else lastPt = null; })(performance.now()); }
      paint(); (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () { if (!touched) paint(); if (!n) setTimeout(demo, 700); });
      window.addEventListener('resize', function () { if (done) return; if (touched) { done = true; cv.remove(); } else paint(); });
    });
  }

  // ---------------------------------------------------------------- age verification: a map of the states going dark
  function redact(scene) {
    var head = scene.querySelector('.paper-head'), FACTS = [
      ['23 states', 'that required pornography sites to verify every visitor\u2019s age, from 2023'],
      ['22 states', 'that Pornhub left rather than check ages'],
      ['Utah, May 2023', 'the first state Pornhub left'],
      ['2,052 counties', 'with FBI crime counts that we follow from 2022 to 2025']
    ], box = el('div', 'redacts', head), opened = 0, chip = hint((touch ? 'Tap' : 'Click') + ' a black bar', head, 'cue-redact');
    FACTS.forEach(function (F, n) {
      var b = el('button', 'redact', box); b.type = 'button'; b.setAttribute('aria-label', 'Show a fact from the paper'); el('b', '', b).textContent = F[0]; el('span', '', b).textContent = F[1]; el('i', '', b);
      function open(auto) { if (b.classList.contains('open')) return; b.classList.add('open'); b.removeAttribute('aria-label'); if (!auto && !opened++) { track('redact_open', {}); drop(chip); } }
      b.addEventListener('click', function () { open(false); });
      if (reduce) open(true); else if (!n) setTimeout(function () { open(true); }, 3200);
    });
    var side = scene.querySelector('.scene-side'), M = window.SITE_MAP; if (!side || !M) return;
    var step = 34, sz = 30, svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 ' + (12 * step - 4) + ' ' + (8 * step - 4)); svg.setAttribute('class', 'darkmap'); side.appendChild(svg);
    var read = el('div', 'darkmap-read', side), cap = el('span', 'darkmap-cap', read), when = el('span', 'darkmap-when', read); cap.textContent = 'States Pornhub left: 0';
    var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    function fmt(ym) { return MON[+ym.slice(5) - 1] + ' ' + ym.slice(0, 4); }
    function idx(ym) { return (+ym.slice(0, 4)) * 12 + (+ym.slice(5)) - 1; }
    function ym(i) { return Math.floor(i / 12) + '-' + ('0' + (i % 12 + 1)).slice(-2); }
    var tiles = {}, cur = 0, timer = null, hovering = false;
    Object.keys(M.TILES).forEach(function (st) {
      var g = document.createElementNS(NS, 'g'), r = document.createElementNS(NS, 'rect'), t = document.createElementNS(NS, 'text');
      r.setAttribute('x', M.TILES[st][1] * step); r.setAttribute('y', M.TILES[st][0] * step); r.setAttribute('width', sz); r.setAttribute('height', sz); r.setAttribute('rx', 4);
      t.setAttribute('x', M.TILES[st][1] * step + sz / 2); t.setAttribute('y', M.TILES[st][0] * step + sz / 2 + 3.5); t.setAttribute('text-anchor', 'middle'); t.textContent = st;
      g.appendChild(r); g.appendChild(t); svg.appendChild(g); tiles[st] = g;
      g.addEventListener('pointerenter', function () { hovering = true; when.textContent = M.NAMES[st] + (M.DATES[st] ? ', ' + fmt(M.DATES[st]) : ''); });
      g.addEventListener('pointerleave', function () { hovering = false; when.textContent = fmt(ym(cur)); });
    });
    var ds = Object.keys(M.DATES).map(function (k) { return idx(M.DATES[k]); }), start = Math.min.apply(null, ds) - 2, end = Math.max.apply(null, ds);
    function show(i) { cur = i; var n = 0; Object.keys(tiles).forEach(function (st) { var off = !!M.DATES[st] && idx(M.DATES[st]) <= i; if (off) n++; tiles[st].classList.toggle('off', off); }); cap.textContent = 'States Pornhub left: ' + n; if (!hovering) when.textContent = fmt(ym(i)); }
    function play() { clearInterval(timer); if (reduce) { show(end); return; } var i = start; show(i); timer = setInterval(function () { i++; show(i); if (i >= end) clearInterval(timer); }, 120); }
    svg.addEventListener('click', function () { track('darkmap_replay', {}); play(); });
    setTimeout(play, reduce ? 0 : 1500);
  }

  // ---------------------------------------------------------------- dating: the title on a card that swipes
  function swipeable(card, opts) {
    var sx = 0, sy = 0, dx = 0, active = false, moved = false, lastTrail = 0;
    card.addEventListener('pointerdown', function (e) { if (e.button || e.target.closest('a, button, [contenteditable="true"]')) return; active = true; moved = false; sx = e.clientX; sy = e.clientY; dx = 0; card.classList.remove('settle'); });
    window.addEventListener('pointermove', function (e) {
      if (!active) return; dx = e.clientX - sx;
      if (!moved) { if (Math.abs(dx) < 7) return; if (Math.abs(e.clientY - sy) > Math.abs(dx)) { active = false; return; } moved = true; card.classList.add('dragging'); try { card.setPointerCapture(e.pointerId); } catch (x) {} }
      card.style.transform = 'translateX(' + dx + 'px) rotate(' + (dx / 24).toFixed(2) + 'deg)'; if (opts.move) opts.move(clamp(dx / 150, -1, 1));
      if (opts.trail && !reduce && e.timeStamp - lastTrail > 70) { lastTrail = e.timeStamp; var s = el('i', 'trail ' + (dx < 0 ? 'heart' : 'spark'), document.body); s.textContent = dx < 0 ? '♥' : '✦'; s.style.left = e.clientX + 'px'; s.style.top = e.clientY + 'px'; s.style.setProperty('--dx', (Math.random() * 30 - 15) + 'px'); setTimeout(function () { s.remove(); }, 900); }
    });
    function up() {
      if (!active) return; active = false; card.classList.remove('dragging'); if (!moved) return;
      var far = Math.abs(dx) > (opts.threshold || 120), dir = dx < 0 ? -1 : 1;
      card.classList.add('settle'); card.style.transform = ''; if (!far && opts.move) opts.move(0);
      if (far && opts.done) opts.done(dir); else if (opts.move) opts.move(0);
    }
    window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    card.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
  }
  function swipe(scene) {
    var head = scene.querySelector('.paper-head'), deck = el('div', 'deck'), flung = 0;
    head.parentNode.insertBefore(deck, head); deck.appendChild(head);
    var links = head.querySelector('.links'); if (links) { links.classList.add('deck-links'); deck.appendChild(links); deck.classList.add('has-links'); }
    var FACTS = [
      ['296,311', 'Android phones in the United States, observed from May 2021 to June 2024'],
      ['30,886', 'people who used dating apps'],
      ['8,196', 'people who used AI companion apps such as Replika and Character.AI'],
      ['8,343', 'people who used general AI assistants, and 1,132 who used AI girlfriend apps']
    ];
    var order = [head].concat(FACTS.map(function (F) { var c = el('div', 'fact-card', deck); c.setAttribute('aria-hidden', 'true'); el('b', '', c).textContent = F[0]; el('span', '', c).textContent = F[1]; return c; }));
    function stack() { order.forEach(function (c, n) { c.style.zIndex = order.length - n; c.classList.toggle('top', !n); }); }
    function tint(k) { scene.style.setProperty('--kl', Math.max(0, -k).toFixed(3)); scene.style.setProperty('--kr', Math.max(0, k).toFixed(3)); }
    order.forEach(function (card) {
      swipeable(card, { trail: true, threshold: 110, move: tint, done: function (dir) {
        if (!flung++) { track('card_swipe', { dir: dir < 0 ? 'left' : 'right' }); drop(chip); }
        card.classList.add('settle'); card.style.transform = 'translateX(' + dir * (window.innerWidth + 200) + 'px) rotate(' + dir * 22 + 'deg)';
        setTimeout(function () { order.push(order.shift()); stack(); card.classList.remove('settle'); card.style.transform = ''; tint(0); }, reduce ? 0 : 330);
      } });
    });
    stack();
    var chip = hint(touch ? '\u2190 Swipe \u2192' : '\u2190 Drag \u2192', deck, 'cue-swipe');
    function wiggle() { if (flung) return; var c = order[0]; c.classList.add('nudge'); setTimeout(function () { c.classList.remove('nudge'); }, 1300); }
    if (!reduce) { setTimeout(wiggle, 1300); var wig = setInterval(function () { if (flung) clearInterval(wig); else wiggle(); }, 4200); }
    var q = document.querySelector('.duel-q'); if (!q) return;
    var duel = q.closest('.duel'); duel.classList.add('swipe-duel');
    swipeable(q, { threshold: 70, trail: true, done: function (dir) {
      var picks = duel.querySelectorAll('.duel-pick'), b = picks[dir < 0 ? 0 : 1];
      if (b && !b.disabled) b.click(); else { var n = duel.querySelector('.replay'); if (n && !n.hidden) n.click(); }
    } });
  }

  // ---------------------------------------------------------------- Dobbs: health apps on a phone, in delete mode
  function apps(scene) {
    var side = scene.querySelector('.scene-side'); if (!side) return;
    var ICONS = [
      ['#FF8FA3', '#E0447A', '<rect x="4" y="5.5" width="16" height="14.5" rx="3"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/><path class="f" d="M12 12.2c1.5 1.8 2.2 2.9 2.2 3.8a2.2 2.2 0 0 1-4.4 0c0-.9.7-2 2.2-3.8z"/>'],
      ['#FF6B6B', '#C9304A', '<path d="M3 12.5h4l2.2-4.5 3.6 9 2.2-4.5h6"/>'],
      ['#B08CFF', '#6E49D8', '<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/>'],
      ['#5FD4B0', '#1F9D7A', '<circle cx="12" cy="12" r="7.5" stroke-dasharray="33 14" transform="rotate(-90 12 12)"/><circle cx="12" cy="12" r="3.4" stroke-dasharray="15 7" transform="rotate(-90 12 12)"/>'],
      ['#6FB8FF', '#2E6FD6', '<path d="M12 4c3.3 4 5.5 6.8 5.5 9.6a5.5 5.5 0 0 1-11 0C6.5 10.8 8.7 8 12 4z"/>'],
      ['#FFC56B', '#E8892B', '<path d="M5.6 13.9l8.3-8.3a3.2 3.2 0 0 1 4.5 4.5l-8.3 8.3a3.2 3.2 0 0 1-4.5-4.5z"/><path d="M9.75 9.75l4.5 4.5"/>'],
      ['#F59AC0', '#C4498A', '<path d="M12 19.5s-7-4.3-7-9.4A3.9 3.9 0 0 1 12 7.8a3.9 3.9 0 0 1 7 2.3c0 5.1-7 9.4-7 9.4z"/>'],
      ['#8FD3E8', '#3C8FB0', '<path d="M10 14.2V6a2 2 0 0 1 4 0v8.2a4 4 0 1 1-4 0z"/><circle class="f" cx="12" cy="17.5" r="1.5"/>']
    ];
    var FACTS = [
      'On May 2, 2022, a draft of the Supreme Court’s Dobbs opinion was leaked.',
      'Within days, people were warning each other to delete period-tracking apps.'
    ];
    var T = window.SITE_DATA && window.SITE_DATA.dobbs && window.SITE_DATA.dobbs.trends;
    if (T) {
      var sr = T.series['period tracker'], leak = T.dates.indexOf('2022-05-02'), ruling = T.dates.indexOf('2022-06-24'), april = sr.slice(0, leak).reduce(function (x, y) { return x + y; }, 0) / leak;
      var peak = function (n) { return (Math.round(Math.max.apply(null, sr.slice(n, n + 7)) / april * 10) / 10).toFixed(1); };
      FACTS.push('In the week after the leak, Google searches for “period tracker” reached ' + peak(leak) + ' times their April level.');
      FACTS.push('In the week after the Court ruled on June 24, searches for “period tracker” reached ' + peak(ruling) + ' times their April level.');
    }
    FACTS.push('We follow 1,322 Android phone users from four weeks before the leak to six weeks after the leak.');
    FACTS.push('Each time one of these users opened an app, we observe which app and when.');
    FACTS.push('Health apps are the apps in the Google Play health and fitness category, without insurance and pharmacy apps.');
    FACTS.push('FemTech apps are the health apps that track periods, ovulation, fertility or pregnancy.');
    var grid = el('div', 'apps', side), deleted = 0, note = el('div', 'app-note', side); note.innerHTML = '<i></i><span></span>'; note.lastChild.textContent = (touch ? 'Tap' : 'Click') + ' an app to delete it.'; note.classList.add('on', 'ask');
    function say(n) { note.classList.remove('ask'); note.firstChild.textContent = (n % FACTS.length + 1) + ' of ' + FACTS.length; note.lastChild.textContent = FACTS[n % FACTS.length]; note.classList.remove('on'); void note.offsetWidth; note.classList.add('on'); }
    function add(ic, i, pop) {
      var a = el('button', 'app' + (pop ? ' pop' : ''), grid); a.type = 'button'; a.tabIndex = -1; a.style.setProperty('--i', i);
      a.innerHTML = '<span class="app-i" style="background:linear-gradient(160deg,' + ic[0] + ',' + ic[1] + ')"><svg viewBox="0 0 24 24">' + ic[2] + '</svg><b></b></span>';
      a.addEventListener('click', function () {
        if (a.classList.contains('poof')) return; a.classList.add('poof'); say(deleted); if (!deleted++) track('app_delete', {});
        setTimeout(function () {
          var rest = Array.prototype.slice.call(grid.children).filter(function (x) { return x !== a; }), first = rest.map(function (x) { return x.getBoundingClientRect(); });
          a.remove();
          rest.forEach(function (x, n) { var b = x.getBoundingClientRect(), dx = first[n].left - b.left, dy = first[n].top - b.top; if (!dx && !dy) return; x.style.transition = 'none'; x.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; void x.offsetWidth; x.style.transition = 'transform .35s cubic-bezier(.3,1.3,.5,1)'; x.style.transform = ''; });
          if (!grid.children.length) setTimeout(function () { ICONS.forEach(function (c, n) { add(c, n, true); }); }, 1100);
        }, 230);
      });
    }
    ICONS.forEach(function (c, n) { add(c, n, false); });
  }

  var SCENES = { cig: cig, ticket: ticket, redact: redact, swipe: swipe, apps: apps };
  document.addEventListener('DOMContentLoaded', function () { var k = document.body.getAttribute('data-scene'); if (SCENES[k]) SCENES[k](document.querySelector('.scene')); });
})();
