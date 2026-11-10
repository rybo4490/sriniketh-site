(function () {
  var S = window.SKY; if (!S) return;
  document.addEventListener('DOMContentLoaded', function () {
    var cv = document.getElementById('sky'); if (!cv) return;
    var ctx = cv.getContext('2d'), RAD = Math.PI / 180, W = 0, H = 0, dpr = 1;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var header = document.querySelector('.site-header');
    function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
    var r = rng(1971), stars = [], clouds = [], i;
    for (i = 0; i < 260; i++) stars.push({ x: r(), y: Math.pow(r(), 1.3), s: r() < .08 ? 1.9 : r() < .3 ? 1.3 : .9, p: r() * 6.28, w: .6 + r() * 1.8, c: r() < .12 ? [255, 214, 170] : r() < .25 ? [190, 210, 255] : [255, 255, 255] });
    for (i = 0; i < 6; i++) { var puffs = [], n = 3 + Math.floor(r() * 3), j, x0 = 0; for (j = 0; j < n; j++) { var pr = 15 + Math.sin((j + .5) / n * Math.PI) * 15 + r() * 7; x0 += pr * (j ? .95 : 0); puffs.push({ dx: x0, r: pr }); x0 += pr * .35; } clouds.push({ x: i / 6 + r() * .12, y: .08 + r() * .55, v: .003 + r() * .005, k: .55 + r() * .75, w: x0, puffs: puffs }); }
    var HILLS = [0, 1, 2].map(function (L) { var a = []; for (var k = 0; k < 4; k++) a.push({ f: (.3 + r() * .7) * (1 + k * .9), p: r() * 6.28, m: r() }); return a; });
    var mx = 0, mxT = 0, drag = null, shoot = null, nextShoot = 4, last = 0, onScreen = true, dragged = false;

    function size() { if (header) document.documentElement.style.setProperty('--hdr', header.offsetHeight + 'px'); dpr = Math.min(2, window.devicePixelRatio || 1); W = cv.clientWidth; H = cv.clientHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    function geo() { var top = (header ? header.offsetHeight : 58) + 34, hor = H * .79; return { top: top, hor: hor, arc: hor - top, span: Math.min(.8, .9 - 90 / Math.max(W, 320)) }; }
    function wrap(h) { return ((h + 36) % 24) - 12; }
    function sunAt(t) { var g = geo(), a = S.alt(t), amax = S.alt(S.noon); return { x: (.5 + wrap(t - S.noon) / S.dayLen * g.span) * W, y: g.hor - Math.sin(a * RAD) / Math.sin(amax * RAD) * g.arc, a: a }; }
    function moonAt(t) { var g = geo(), tm = (t + 12) % 24, a = S.alt(tm, true), amax = S.alt(S.noon, true); return { x: (.5 + wrap(tm - S.noon) / (24 - S.dayLen) * g.span) * W, y: g.hor - Math.sin(a * RAD) / Math.sin(amax * RAD) * g.arc * .86, a: a }; }
    function rgb(c, al) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (al === undefined ? 1 : al) + ')'; }
    function mix(a, b, k) { return a.map(function (v, n) { return Math.round(v + (b[n] - v) * k); }); }
    function clamp(v) { return Math.max(0, Math.min(1, v)); }
    function hillY(L, x, base, amp) { var y = 0, hs = HILLS[L]; for (var k = 0; k < hs.length; k++) y += Math.sin(x / 1100 * 6.28 * hs[k].f + hs[k].p) * (.4 + hs[k].m) / (k * 1.6 + 1); return base + y * amp; }
    function hillPath(L, base, amp, shift) { ctx.beginPath(); ctx.moveTo(0, H); for (var x = 0; x <= W + 8; x += 8) ctx.lineTo(x, hillY(L, x + shift, base, amp)); ctx.lineTo(W, H); ctx.closePath(); }

    function moonPhase() { var syn = 29.530588853, age = ((Date.now() / 864e5 + 2440587.5 - 2451550.1) % syn + syn) % syn; return age / syn; }
    function drawMoon(m, night) {
      var R = Math.max(15, Math.min(22, W / 46)), p = moonPhase(), wan = p > .5, q = Math.max(.085, wan ? 1 - p : p), rx = R * Math.abs(Math.cos(2 * Math.PI * q));
      var g = ctx.createRadialGradient(m.x, m.y, R * .6, m.x, m.y, R * 7); g.addColorStop(0, 'rgba(200,215,255,' + .22 * night + ')'); g.addColorStop(1, 'rgba(200,215,255,0)');
      ctx.fillStyle = g; ctx.fillRect(m.x - R * 7, m.y - R * 7, R * 14, R * 14);
      ctx.save(); ctx.translate(m.x, m.y); if (wan) ctx.scale(-1, 1); ctx.rotate(-.35);
      ctx.fillStyle = 'rgba(150,165,205,' + (.1 + .12 * night) + ')'; ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.2832); ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, R, -Math.PI / 2, Math.PI / 2, false); ctx.ellipse(0, 0, Math.max(.01, rx), R, 0, Math.PI / 2, -Math.PI / 2, q < .25); ctx.closePath();
      ctx.fillStyle = rgb(mix([226, 232, 240], [250, 246, 232], night), .55 + .45 * night); ctx.fill();
      ctx.save(); ctx.clip(); ctx.fillStyle = 'rgba(120,128,150,.22)';
      [[.3, -.35, .2], [.55, .25, .14], [.1, .4, .17], [.62, -.1, .09], [-.2, -.1, .12]].forEach(function (c) { ctx.beginPath(); ctx.arc(c[0] * R, c[1] * R, c[2] * R, 0, 6.2832); ctx.fill(); });
      ctx.restore(); ctx.restore(); return R;
    }
    function drawSun(s) {
      var low = clamp(1 - s.a / 14), R = Math.max(17, Math.min(26, W / 40)) * (1 + .18 * low), col = mix([255, 248, 222], [255, 122, 58], low * low);
      var gr = R * (7 + 6 * low), g = ctx.createRadialGradient(s.x, s.y, R * .5, s.x, s.y, gr);
      g.addColorStop(0, rgb(mix([255, 244, 200], [255, 150, 70], low), .55)); g.addColorStop(.25, rgb(mix([255, 240, 190], [255, 140, 80], low), .2)); g.addColorStop(1, rgb(col, 0));
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(s.x - gr, s.y - gr, gr * 2, gr * 2); ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = rgb(col); ctx.beginPath(); ctx.arc(s.x, s.y, R, 0, 6.2832); ctx.fill(); return R;
    }

    function frame(ts) {
      requestAnimationFrame(frame);
      if (!onScreen || document.hidden) return;
      if (ts - last < (reduce ? 1000 : 30) && !drag) return;
      draw(ts);
    }
    function draw(ts) {
      var dt = Math.min(.1, (ts - last) / 1000); last = ts; mx += (mxT - mx) * .08;
      var time = ts / 1000, t = S.hours(), sun = sunAt(t), moon = moonAt(t), c = S.colors(sun.a), g = geo();
      var night = clamp((-sun.a - 1) / 9), dusk = clamp(1 - Math.abs(sun.a - 1) / 9);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var bg = ctx.createLinearGradient(0, 0, 0, g.hor + 10); bg.addColorStop(0, rgb(c[0])); bg.addColorStop(.58, rgb(c[1])); bg.addColorStop(1, rgb(c[2]));
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      if (night > .02) {
        for (i = 0; i < stars.length; i++) { var st = stars[i], tw = reduce ? .8 : .62 + .38 * Math.sin(time * st.w + st.p), fade = clamp(1.25 - st.y * .9); ctx.fillStyle = rgb(st.c, night * tw * fade); ctx.beginPath(); ctx.arc(st.x * W - mx * 4, st.y * (g.hor - 8), st.s * .75, 0, 6.2832); ctx.fill(); }
        if (!reduce) {
          nextShoot -= dt; if (nextShoot < 0 && !shoot && night > .8) { shoot = { x: (.15 + Math.random() * .6) * W, y: 20 + Math.random() * g.hor * .35, k: 0, d: Math.random() < .5 ? 1 : -1 }; nextShoot = 7 + Math.random() * 9; }
          if (shoot) { shoot.k += dt / .8; var hx = shoot.x + shoot.d * shoot.k * 200, hy = shoot.y + shoot.k * 80, len = 90 * Math.sin(Math.PI * clamp(shoot.k)); var sg = ctx.createLinearGradient(hx, hy, hx - shoot.d * len, hy - len * .4); sg.addColorStop(0, 'rgba(255,255,255,' + .9 * night + ')'); sg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.strokeStyle = sg; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx - shoot.d * len, hy - len * .4); ctx.stroke(); if (shoot.k >= 1) shoot = null; }
        }
      }
      var sunR = 0, moonR = 0;
      if (moon.a > -6) moonR = drawMoon(moon, Math.max(night, .25));
      if (sun.a > -6) sunR = drawSun(sun);

      var ccol = mix(mix([255, 255, 255], mix(c[2], [255, 220, 200], .4), dusk * .85), [70, 82, 120], night), cal = .88 - .74 * night - .12 * dusk;
      for (i = 0; i < clouds.length; i++) {
        var cl = clouds[i]; if (!reduce) cl.x += cl.v * dt * (900 / Math.max(W, 500)); if (cl.x > 1.15) cl.x = -.25;
        var cx = cl.x * W - mx * 10 * cl.k, cy = g.top - 20 + cl.y * (g.arc * .8);
        var ks = cl.k * Math.max(.75, Math.min(1.2, W / 1000)), base = cy;
        ctx.save(); ctx.beginPath(); ctx.rect(cx - 60, base - 200, cl.w * ks + 160, 200); ctx.clip(); ctx.beginPath();
        for (var pi = 0; pi < cl.puffs.length; pi++) { var pf = cl.puffs[pi], px = cx + pf.dx * ks, pr2 = pf.r * ks; ctx.moveTo(px + pr2, base - pr2 * .45); ctx.arc(px, base - pr2 * .45, pr2, 0, 6.2832); }
        ctx.fillStyle = rgb(ccol, cal); ctx.fill(); ctx.restore();
      }

      var deep = mix([44, 62, 84], [5, 8, 18], night), amp = Math.max(8, Math.min(16, W / 70));
      ctx.fillStyle = rgb(mix(c[2], deep, .3)); hillPath(0, g.hor + amp * .9, amp, mx * 5); ctx.fill();
      ctx.fillStyle = rgb(mix(c[2], deep, .62)); hillPath(1, g.hor + (H - g.hor) * .42, amp * 1.15, 300 + mx * 11); ctx.fill();
      world(g, night, time, dt, amp);
      ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = '#000'; hillPath(2, g.hor + (H - g.hor) * .8, amp * .8, 700 + mx * 20); ctx.fill(); ctx.globalCompositeOperation = 'source-over';

      cv._sun = sun.a > -3 ? { x: sun.x, y: sun.y, r: sunR } : null; cv._moon = moon.a > -3 ? { x: moon.x, y: moon.y, r: moonR } : null; placeChip();
    }

    // ---- the things on the hills: one for each line of research ----
    var THINGS = [
      { k: 'cig', fx: .09, w: 78, h: 74, t: 'Cigarette Advertising Bans', d: 'The 1971 broadcast ban on cigarette ads and deaths from smoking.', href: 'cigarettes.html' },
      { k: 'lotto', fx: .235, w: 68, h: 60, t: 'Gambling Spillovers', d: 'Online sports betting and state lottery sales.', href: 'gambling.html' },
      { k: 'age', fx: .37, w: 50, h: 66, t: 'Unexpected Outcomes of Vice Regulation', d: 'Age-verification laws for pornography sites and rape offenses.', href: 'vice-regulation.html' },
      { k: 'date', fx: .6, w: 36, h: 62, t: 'When AI Becomes a Dating Alternative', d: 'Generative AI and dating app use.', href: 'dating.html' },
      { k: 'store', fx: .735, w: 72, h: 60, t: 'Out of Stock, Out of Mind: Category Purchasing Across Retailers' },
      { k: 'health', fx: .875, w: 36, h: 62, t: 'The Chilling Effect of Dobbs', d: 'Health app use after the Dobbs opinion was leaked.', href: 'dobbs.html' },
      { k: 'duck', fx: .48, w: 36, h: 52, t: 'Ducky' }
    ];
    var duck = THINGS[6], N = 0, T = 0, hot = null, hotK = 0, ptr = null, tipTimer = null;
    duck.px = null; duck.dir = 1; duck.ph = 0; duck.wait = 1; duck.goal = null; duck.moving = false;
    var tip = document.createElement('a'); tip.className = 'sky-tip'; tip.hidden = true; cv.parentNode.appendChild(tip);
    function dim(c, lit) { return rgb(mix(c, [14, 18, 36], N * (lit ? .16 : .78))); }
    function box(x, y, w, h, r, c, lit) { ctx.fillStyle = dim(c, lit); ctx.beginPath(); if (r && ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); ctx.fill(); }
    function dot(x, y, r, c, lit) { ctx.fillStyle = dim(c, lit); ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill(); }
    function lamp(x, y, r, c, a) { if (N < .05) return; var gl = ctx.createRadialGradient(x, y, 0, x, y, r); gl.addColorStop(0, rgb(c, a * N)); gl.addColorStop(1, rgb(c, 0)); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gl; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.globalCompositeOperation = 'source-over'; }
    function word(str, x, y, px, c) { ctx.font = '700 ' + px + 'px "Bricolage Grotesque", "Helvetica Neue", Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = dim(c, true); ctx.fillText(str, x, y); }
    function win(x, y, w, h) { ctx.fillStyle = rgb(mix([178, 210, 230], [255, 218, 134], N)); ctx.fillRect(x, y, w, h); }
    function phone(a, b) { box(-16, -60, 32, 60, 6, [30, 32, 40]); var sg = ctx.createLinearGradient(0, -56, 0, -6); sg.addColorStop(0, rgb(a)); sg.addColorStop(1, rgb(b)); ctx.fillStyle = sg; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(-13, -56, 26, 50, 3); else ctx.rect(-13, -56, 26, 50); ctx.fill(); box(-4, -58.6, 8, 1.6, .8, [70, 74, 86]); }
    var DRAW = {
      cig: function () {
        box(-23, -34, 4, 36, 0, [84, 74, 66]); box(19, -34, 4, 36, 0, [84, 74, 66]); box(-38, -68, 76, 38, 3, [72, 64, 58]); box(-35, -65, 70, 32, 2, [246, 238, 222], true);
        box(-24, -51, 11, 6, 0, [207, 149, 80], true); box(-13, -51, 27, 6, 0, [255, 255, 255], true); box(-13, -51, 27, 6, 0, [226, 222, 214], true); box(-13, -51, 27, 4, 0, [255, 255, 255], true); box(14, -51, 3, 6, 0, [255, 106, 31], true);
        ctx.strokeStyle = dim([140, 140, 144], true); ctx.lineWidth = 1.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(17, -52); ctx.bezierCurveTo(17 + 3 * Math.sin(T * 1.3), -56, 23 - 3 * Math.sin(T * 1.1), -58, 21 + 2 * Math.sin(T * .9), -63); ctx.stroke();
        box(-3, -72, 6, 4, 1, [72, 64, 58]); lamp(0, -56, 48, [255, 226, 170], .5);
      },
      lotto: function () {
        box(-31, -38, 62, 40, 2, [228, 216, 198]); box(-33, -41, 66, 4, 0, [78, 66, 58]);
        for (var a = 0; a < 8; a++) box(-31 + a * 7.75, -27, 7.75, 7, 0, a % 2 ? [250, 250, 246] : [15, 115, 85]);
        win(-25, -17, 22, 13); box(7, -17, 13, 19, 0, [96, 74, 58]); win(9, -15, 9, 8);
        box(-24, -59, 48, 17, 3, [26, 30, 44]); word('LOTTO', 0, -50, 10.5, mix([245, 196, 86], [255, 120, 176], N)); lamp(0, -50, 36, [255, 90, 150], .5); lamp(-14, -10, 22, [255, 200, 110], .35);
      },
      age: function () {
        box(-1.5, -46, 3, 48, 0, [96, 102, 114]); dot(0, -52, 14, [200, 44, 52], true); dot(0, -52, 10.5, [255, 255, 255], true); word('18+', 0, -51.4, 10, [24, 24, 28]);
        box(15, -19, 5, 21, 1, [96, 102, 114]); for (var a = 0; a < 6; a++) box(-24 + a * 7.4, -18, 7.4, 4.6, 0, a % 2 ? [250, 250, 250] : [205, 52, 52], true);
      },
      date: function () {
        phone([255, 122, 107], [139, 92, 240]); ctx.fillStyle = 'rgba(255,255,255,.96)'; ctx.beginPath(); var cx = 0, cy = -43, z = 6.2;
        ctx.moveTo(cx, cy + z * .95); ctx.bezierCurveTo(cx - z * 1.5, cy - z * .1, cx - z * .75, cy - z * 1.15, cx, cy - z * .35); ctx.bezierCurveTo(cx + z * .75, cy - z * 1.15, cx + z * 1.5, cy - z * .1, cx, cy + z * .95); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(-10, -29, 14, 8, 3.5); else ctx.rect(-10, -29, 14, 8); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(-3, -18, 13, 7.5, 3.5); else ctx.rect(-3, -18, 13, 7.5); ctx.fill();
        ctx.fillStyle = '#8B5CF0'; for (var a = 0; a < 3; a++) { ctx.beginPath(); ctx.arc(-6.4 + a * 3.4, -25 - (reduce ? 0 : Math.max(0, Math.sin(T * 5 - a * .9)) * 1.4), 1, 0, 6.2832); ctx.fill(); }
        lamp(0, -32, 40, [220, 110, 200], .5);
      },
      health: function () {
        phone([192, 88, 122], [52, 32, 84]); var cols = [[255, 143, 163], [255, 107, 107], [176, 140, 255], [95, 212, 176], [111, 184, 255]];
        for (var a = 0; a < 6; a++) { var x = a % 2 ? 1.5 : -9.5, y = -52 + Math.floor(a / 2) * 12; if (a === 3) { ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = .9; ctx.setLineDash([2, 1.6]); ctx.strokeRect(x + .5, y + .5, 7, 7); ctx.setLineDash([]); } else { ctx.fillStyle = rgb(cols[a > 3 ? a - 1 : a]); ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, 8, 8, 2.2); else ctx.rect(x, y, 8, 8); ctx.fill(); } }
        lamp(0, -32, 40, [230, 110, 150], .45);
      },
      store: function () {
        box(-33, -40, 66, 42, 2, [232, 228, 218]); box(-35, -43, 70, 4, 0, [64, 74, 90]); win(-27, -33, 38, 25);
        box(-27, -21, 38, 1.2, 0, [120, 108, 96], true); box(-27, -9.4, 38, 1.2, 0, [120, 108, 96], true);
        [-23, -17, 7].forEach(function (x) { box(x - 2, -26.2, 4.4, 5.2, 1, [40, 150, 162], true); box(x - 2, -26.2, 4.4, 1.6, .8, [240, 244, 246], true); });
        ctx.strokeStyle = dim([205, 52, 52], true); ctx.lineWidth = .9; ctx.setLineDash([1.6, 1.4]); ctx.strokeRect(-12.4, -26.2, 16, 5); ctx.setLineDash([]); box(-8, -20.6, 8, 2.8, 0, [205, 52, 52], true);
        for (var a = 0; a < 6; a++) box(-25 + a * 6, -14.6, 4.4, 5.2, 1, a % 2 ? [226, 120, 60] : [70, 110, 190], true);
        box(15, -25, 13, 27, 0, [84, 96, 112]); win(17, -23, 9, 11);
        box(-28, -58, 56, 13, 2, [196, 52, 52], true); word('OUT OF STOCK', 0, -51.2, 6.7, [255, 255, 255]); lamp(-8, -20, 28, [255, 220, 150], .35);
      },
      duck: function () {
        var mv = duck.moving && !reduce, bob = mv ? Math.abs(Math.sin(duck.ph)) * 1.4 : Math.sin(T * 2) * .35;
        for (var a = 0; a < 2; a++) { var ph = duck.ph + a * Math.PI, fx = mv ? Math.sin(ph) * 5 : (a ? 2 : -2), lift = mv ? Math.max(0, Math.cos(ph)) * 3.4 : 0, hx = a ? 2.5 : -2.5;
          ctx.strokeStyle = dim([78, 84, 98]); ctx.lineWidth = 2.3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(hx, -14 - bob); ctx.lineTo(hx - 3.4 + fx * .5, -7 - lift * .5); ctx.lineTo(hx + fx, -2 - lift); ctx.stroke(); box(hx + fx - 2, -2.8 - lift, 8.4, 2.8, 1.3, [245, 150, 40], true); }
        ctx.translate(0, -bob);
        ctx.fillStyle = dim([238, 240, 242]); ctx.beginPath(); ctx.moveTo(-10, -25); ctx.lineTo(-16, -29); ctx.lineTo(-10, -18); ctx.fill();
        box(-11, -27, 22, 15, 6.5, [238, 240, 242]); box(-11, -20, 22, 1, 0, [192, 198, 206]); box(3, -34, 5, 9, 2, [204, 210, 218]); box(-1, -46, 17, 13, 5, [238, 240, 242]);
        dot(10.5, -40, 3.3, [44, 50, 62]); dot(10.5, -40, 2.1, mix([20, 24, 32], [110, 235, 255], N), true); lamp(10.5, -40, 11, [110, 235, 255], .8);
        box(15, -38.6, 7.4, 3.8, 1.7, [245, 150, 40], true);
        ctx.strokeStyle = dim([78, 84, 98]); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(4, -46); ctx.lineTo(2, -52); ctx.stroke(); dot(2, -52.6, 1.5, [226, 70, 70], true); if (Math.sin(T * 3) > .6) lamp(2, -52.6, 7, [255, 80, 80], .9);
      }
    };
    function unit() { return Math.max(.56, Math.min(1.3, W / 860)); }
    function ridge(x, g, amp) { return hillY(1, x + 300 + mx * 11, g.hor + (H - g.hor) * .42, amp * 1.15) + 2; }
    function world(g, night, time, dt, amp) {
      N = night; T = reduce ? 0 : time; var u = unit(), pad = 24 * u;
      if (duck.px === null) duck.px = duck.fx * W;
      if (!reduce) {
        var want = ptr && ptr.y < H ? clamp2(ptr.x, pad, W - pad) : duck.goal;
        if (want === null || want === undefined) { duck.wait -= dt; if (duck.wait < 0) duck.goal = (.42 + Math.random() * .14) * W; duck.moving = false; }
        else if (Math.abs(want - duck.px) < 3) { duck.moving = false; if (!ptr || ptr.y >= H) { duck.goal = null; duck.wait = 1.2 + Math.random() * 2.6; } }
        else { duck.dir = want > duck.px ? 1 : -1; duck.px += duck.dir * Math.min(Math.abs(want - duck.px), 30 * u * dt); duck.ph += dt * 10; duck.moving = true; }
      }
      hotK += ((hot ? 1 : 0) - hotK) * .25;
      for (var n = 0; n < THINGS.length; n++) {
        var o = THINGS[n], x = o === duck ? duck.px : o.fx * W - mx * 11, gy = ridge(x, g, amp), k = u * (o === hot ? 1 + .07 * hotK : 1);
        o.bx = x; o.by = gy; o.u = u;
        ctx.save(); ctx.translate(x, gy - (o === hot ? 2 * hotK : 0)); ctx.scale(k * (o === duck ? duck.dir : 1), k); DRAW[o.k](); ctx.restore();
      }
    }
    function clamp2(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function thingAt(p) { for (var n = THINGS.length - 1; n >= 0; n--) { var o = THINGS[n]; if (o.bx === undefined) continue; if (Math.abs(p.x - o.bx) < o.w * o.u / 2 + 4 && p.y < o.by + 4 && p.y > o.by - o.h * o.u - 4) return o; } return null; }
    function showTip(o) {
      clearTimeout(tipTimer); if (!o) { tipTimer = setTimeout(function () { if (!tip.matches(':hover')) { tip.hidden = true; hot = null; } }, 260); return; }
      if (hot !== o) { hot = o; tip.innerHTML = '<b></b>' + (o.d ? '<span></span>' : ''); tip.firstChild.textContent = o.t; if (o.d) tip.children[1].textContent = o.d; if (o.href) tip.setAttribute('href', o.href); else tip.removeAttribute('href'); if (window.siteTrack) window.siteTrack('sky_thing', { thing: o.k }); }
      tip.hidden = false; tip.style.left = clamp2(o.bx, 128, Math.max(128, W - 128)) + 'px'; tip.style.top = (o.by - o.h * o.u - 8) + 'px';
    }
    tip.addEventListener('pointerleave', function () { showTip(null); });
    var chip = document.createElement('span'); chip.className = 'hint hint-sky'; chip.setAttribute('aria-hidden', 'true'); cv.parentNode.appendChild(chip);
    function placeChip() { if (!chip) return; var o = cv._sun || cv._moon; if (!o) { chip.style.opacity = 0; return; } chip.style.opacity = ''; chip.textContent = cv._sun ? 'Drag the sun' : 'Drag the moon'; chip.style.left = clamp2(o.x, 70, Math.max(70, W - 70)) + 'px'; chip.style.top = (o.y + o.r + 14) + 'px'; }

    function pos(e) { var b = cv.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; }
    function hit(e) { var p = pos(e), best = null; [['sun', cv._sun], ['moon', cv._moon]].forEach(function (o) { if (o[1] && Math.hypot(p.x - o[1].x, p.y - o[1].y) < Math.max(40, o[1].r * 2)) best = o[0]; }); return best; }
    cv.addEventListener('pointermove', function (e) {
      ptr = e.pointerType === 'mouse' ? pos(e) : null;
      if (!drag) { var h0 = hit(e), o = h0 ? null : thingAt(pos(e)); cv.style.cursor = h0 ? 'grab' : o ? 'pointer' : ''; if (e.pointerType === 'mouse') showTip(o); return; }
      var g = geo(), fx = (pos(e).x / W - .5) / g.span, t = drag === 'sun' ? S.noon + fx * S.dayLen : S.noon + fx * (24 - S.dayLen) - 12;
      S.setOffset(t - S.real()); e.preventDefault();
    });
    cv.addEventListener('pointerleave', function () { ptr = null; showTip(null); });
    cv.addEventListener('click', function (e) { if (hit(e)) return; var o = thingAt(pos(e)); if (!o) { showTip(null); return; } if (e.pointerType === 'mouse' || !e.pointerType) { if (o.href) location.href = o.href; else showTip(o); } else showTip(o); });
    cv.addEventListener('pointerdown', function (e) { var h = hit(e); if (!h) return; drag = h; cv.setPointerCapture(e.pointerId); cv.style.cursor = 'grabbing'; e.preventDefault(); if (chip) { chip.remove(); chip = null; } });
    function end() { if (!drag) return; if (!dragged && window.siteTrack) { dragged = true; window.siteTrack('sky_drag', { body: drag }); } drag = null; cv.style.cursor = ''; }
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    cv.addEventListener('touchstart', function (e) { if (drag) e.preventDefault(); }, { passive: false });
    cv.addEventListener('touchmove', function (e) { if (drag) e.preventDefault(); }, { passive: false });
    window.addEventListener('pointermove', function (e) { mxT = (e.clientX / window.innerWidth - .5) * 2; }, { passive: true });
    window.addEventListener('resize', function () { size(); draw(performance.now()); });
    function over() { if (header) header.classList.toggle('over-sky', window.scrollY < cv.clientHeight - header.offsetHeight - 30); }
    window.addEventListener('scroll', over, { passive: true }); over();
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { onScreen = en[0].isIntersecting; }).observe(cv);
    size(); draw(performance.now()); requestAnimationFrame(frame); window.__skyDraw = function () { draw(performance.now()); };
  });
})();
