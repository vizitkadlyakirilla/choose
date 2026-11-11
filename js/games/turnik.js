/* КИРИЛЛ НА ТУРНИКЕ — держи, чтобы раскачаться; отпусти, чтобы полететь к следующей перекладине.
   Пиксельный Кирилл нарисован по фото: русые волосы с чёлкой, борода, тёмный свитер, тёмные джинсы, часы, светлые кроссовки. */
(function (root) {
  /* ---------- физика (чистые функции: проверяются отдельно в node) ---------- */
  var PH = {
    L: 26,            // от перекладины до центра масс
    GP: 900,          // гравитация маятника
    GF: 1100,         // гравитация в полёте
    PUMP: 15,         // раскачка при удержании, рад/с²
    DAMP: 0.22,
    WMAX: 12.5,
    K: 2.5,           // множитель скорости отрыва (гимнаст «выстреливает» корпусом)
    CATCH: 34         // радиус захвата
  };
  PH.swing = function (s, hold, dt) {
    var a = -(PH.GP / PH.L) * Math.sin(s.th) - PH.DAMP * s.w;
    if (hold) a += PH.PUMP * (Math.abs(s.w) < 0.25 ? 1 : Math.sign(s.w));
    s.w = Math.max(-PH.WMAX, Math.min(PH.WMAX, s.w + a * dt)); s.th += s.w * dt;
  };
  PH.launch = function (bar, s) {
    var cx = bar.x + PH.L * Math.sin(s.th), cy = bar.y + PH.L * Math.cos(s.th);
    var v = PH.L * s.w * PH.K;
    return { x: cx, y: cy, vx: v * Math.cos(s.th), vy: -v * Math.sin(s.th), rot: s.th, spin: s.w * 0.55 };
  };
  PH.fly = function (f, dt) { f.vy += PH.GF * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.rot += f.spin * dt; };
  PH.near = function (f, bar, r) { var dx = f.x - bar.x, dy = f.y - bar.y; return dx * dx + dy * dy < r * r; };
  /* уровень: следующая перекладина выше и в сторону; сложность растёт */
  PH.nextBar = function (bar, n, rnd, W) {
    var dy = Math.min(165, 100 + n * 5) + rnd() * 15;
    var span = Math.min(130, 40 + n * 8), dx = (rnd() < .5 ? -1 : 1) * (20 + rnd() * span);
    var x = bar.x + dx, m = 50; if (x < m || x > W - m) x = bar.x - dx;
    return { x: Math.max(m, Math.min(W - m, x)), y: bar.y - dy };
  };
  PH.catchR = function (n) { return Math.max(24, PH.CATCH - n * 0.5); };
  root.TURNIK_PHYS = PH;
  if (typeof module !== 'undefined') { module.exports = PH; return; }

  var BOS = window.BOS, G = BOS.games;
  /* ---------- спрайты Кирилла (12×25, начало координат — кисти на перекладине) ---------- */
  var PAL = { H: '#a3693f', h: '#7a4a2b', S: '#efc3a0', s: '#d6a07f', B: '#8e5a35', E: '#2a1a12', D: '#3d3f46', d: '#2b2c31', W: '#0d0d0d', J: '#2c3650', j: '#1e2538', K: '#d8dad6', G: '#7fd14a' };
  var HANG = [
    '..S......S..', '..S......S..', '..D..hHH.W..', '..DhHHHHHD..', '..DHHHHHHD..', '..DHSSSSHD..', '..DSESSESD..', '..DSSSSSSD..', '..DBSssSBD..', '..DBBBBBBD..', '..DDBBBBDD..', '.DDDDDDDDDD.',
    '.DDDDDDDDDD.', '.DDDDddDDDD.', '..DDDDDDDD..', '..DDDDDDDD..', '..JJJJJJJJ..', '..JJJJJJJJ..', '..JJJ..JJJ..', '..JJJ..JJJ..', '..JJJ..JJJ..', '..jjj..jjj..', '..jjj..jjj..', '..KKK..KKK..', '..KGK..KGK..'];
  var RELEASE = HANG.slice(0, 3).map(function () { return '............'; });
  RELEASE = ['S..........S', '.D........W.', '..D.hHHH.D..'].concat(HANG.slice(3).map(function (r, i) { return i === 0 ? '...DHHHHHD..'.slice(0, 12) : r; }));
  RELEASE[2] = '..D..hHH.D..'; RELEASE[3] = '...hHHHHH...'; RELEASE[4] = '..DHHHHHHD..';
  var FALL = ['............', '............', '.....hHH....', '...hHHHHH...', '...HHHHHH...', '...HSSSSH...', '...SESSES...', '...SSSSSS...', '...BSssSB...', '...BBBBBB...', 'S..DBBBBD..S', 'DDDDDDDDDDDD',
    '.DDDDDDDDDD.', '..DDDddDDD..', '..DDDDDDDD..', '..DDDDDDDD..', '..JJJJJJJJ..', '.JJJJ..JJJJ.', '.JJJ....JJJ.', 'JJJ......JJJ', 'jjj......jjj', 'KKK......KKK', 'KGK......KGK', '............', '............'];
  /* поджатые ноги в полёте/при раскачке */
  function tuck(base) { var r = base.slice(0, 16); r.push('..JJJJJJJJ..', '..JJJJJJJJJ.', '...JJJJJJJJJ', '.........jjj', '.........jjj', '........KKKK', '........KGKK'); while (r.length < 25) r.push('............'); return r; }
  /* сдвиг ног: + вперёд (пике), − назад (прогиб) */
  function shear(base, amt) { return base.map(function (r, i) { if (i < 16) return r; var o = Math.round(amt * (i - 15) / 3.2); if (!o) return r; var pad = '............'; return o > 0 ? (pad + r).slice(12 - Math.min(o, 4), 24 - Math.min(o, 4)) : (r + pad).slice(Math.min(-o, 4), 12 + Math.min(-o, 4)); }); }
  var TUCK = tuck(HANG), TUCKR = tuck(RELEASE);
  function drawKirill(x, pose, px, py, rot, s) {
    x.save(); x.translate(px, py); x.rotate(-rot); G.sprite(x, pose, PAL, -6 * s, 0, s); x.restore();
  }
  G.drawKirill = drawKirill; G.KIRILL = { HANG: HANG, FALL: FALL, TUCK: TUCK, RELEASE: RELEASE };

  var H = 330, SC = 2;
  G.turnik = function (canvas, hooks) {
    var g = new G.Game(canvas, H, hooks), seed = 1; g.minW = 300; g.bg = '#0b0b3a';
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    var city = G.city(5, 1200), stars = []; for (var i = 0; i < 70; i++) stars.push([Math.random(), Math.random(), Math.random() > .85]);
    function reset() {
      seed = Math.floor(Math.random() * 1e6) + 1;
      var W = g.Wd || 480; g.score = 0; g.hold = false; g.mode = 'swing'; g.relT = 0; g.fx = []; g.msg = null;
      g.bars = [{ x: W / 2, y: H - 90 }]; g.bars.push(PH.nextBar(g.bars[0], 0, rnd, W));
      g.cur = 0; g.s = g.s; g.st = { th: 0, w: 0 }; g.f = null; g.cam = 0; g.camT = 0; g.flash = 0; g.emit();
    }
    g.onResize = function () { if (!g.bars) return; };
    reset();
    function bar() { return g.bars[g.cur]; }
    function nxt() { return g.bars[g.cur + 1]; }
    function down() {
      if (g.state === 'ready') g.setState('run');
      if (g.state === 'over') { if (g.overT > 0.5) { reset(); g.setState('run'); } return; }
      if (g.state === 'run' && g.mode === 'swing') { g.hold = true; }
    }
    function up() {
      if (g.state === 'run' && g.mode === 'swing' && g.hold) {
        g.hold = false;
        if (Math.abs(g.st.w) < 1.2) return;           /* слишком слабо — просто продолжает висеть */
        g.f = PH.launch(bar(), g.st); g.mode = 'fly'; g.relT = 0.25; G.sfx('whoosh');
      }
      g.hold = false;
    }
    g.release = function () { g.hold = false; };
    g.unbind = G.bindPress(canvas, down, up, [' ', 'Spacebar', 'ArrowUp', 'Enter']);
    canvas.addEventListener('gamepausekey', function () { if (g.state === 'run') g.pause(); else g.resume(); });
    var swingSnd = 0;
    g.update = function (dt) {
      var W = g.Wd;
      if (g.mode === 'swing') {
        var prevTh = g.st.th; PH.swing(g.st, g.hold, dt);
        if (g.hold && Math.cos(prevTh) < 0.95 && Math.cos(g.st.th) >= 0.95 && swingSnd <= 0) { G.sfx('swing'); swingSnd = 0.2; }
      } else if (g.mode === 'fly' || g.mode === 'fall') {
        PH.fly(g.f, dt); g.relT = Math.max(0, g.relT - dt);
        var nb = nxt();
        if (g.mode === 'fly' && PH.near(g.f, nb, PH.catchR(g.score))) {
          /* захват: перекладина становится опорой, скорость переходит во вращение */
          var dx = g.f.x - nb.x, dy = g.f.y - nb.y, th = Math.atan2(dx, dy);
          var tang = (g.f.vx * Math.cos(th) - g.f.vy * Math.sin(th)) / PH.L;
          g.cur++; g.st = { th: th, w: Math.max(-6, Math.min(6, tang * 0.35)) }; g.mode = 'swing'; g.hold = false;
          g.score++; g.emit(); G.sfx('catch'); g.flash = 0.25;
          for (var i = 0; i < 14; i++) g.fx.push({ x: nb.x, y: nb.y, vx: (Math.random() - .5) * 220, vy: (Math.random() - .8) * 200, t: 0.6, c: Math.random() > .5 ? '#ffd400' : '#3cff00' });
          g.msg = { t: 1, text: g.score % 5 === 0 ? 'УРОВЕНЬ ' + (g.score / 5 + 1) + '!' : '+1' };
          g.bars.push(PH.nextBar(nb, g.score, rnd, W));
          return;
        }
        if (g.mode === 'fly' && g.f.vy > 0 && g.f.y > nb.y + 40 && g.f.y > bar().y + 10) { g.mode = 'fall'; G.sfx('fall'); }
        if (g.f.y > bar().y + 320 || g.f.y - g.cam > H + 80) { g.setState('over'); g.overT = 0; g.record(); }
      }
      swingSnd -= dt;
      /* камера: текущая перекладина на 2/3 высоты */
      g.camT = bar().y - H * 0.76; g.cam += (g.camT - g.cam) * Math.min(1, dt * 3);
      g.fx.forEach(function (p) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; p.t -= dt; }); g.fx = g.fx.filter(function (p) { return p.t > 0; });
      if (g.msg) { g.msg.t -= dt; if (g.msg.t <= 0) g.msg = null; }
      g.flash = Math.max(0, g.flash - dt);
    };
    function drawBar(x, b, hi) {
      var y = Math.round(b.y - g.cam), X = Math.round(b.x);
      x.fillStyle = '#5c5c66'; x.fillRect(X - 34, y, 3, 70); x.fillRect(X + 31, y, 3, 70);
      x.fillStyle = hi ? '#ffd400' : '#d8d8d8'; x.fillRect(X - 34, y - 2, 68, 4); x.fillStyle = '#8a8a8a'; x.fillRect(X - 34, y + 1, 68, 1);
    }
    g.draw = function () {
      if (!g.s) return;
      var x = g.begin2d(), W = g.Wd, t = performance.now() / 1000;
      var lvl = Math.floor(g.score / 5), sky = ['#0b0b3a', '#1a0b3a', '#0b2a3a', '#2a0b2a'][lvl % 4];
      x.fillStyle = sky; x.fillRect(0, 0, W, H);
      stars.forEach(function (s) { var sy = ((s[1] * H * 2 - g.cam * 0.08) % H + H) % H; x.fillStyle = s[2] ? '#ffd400' : '#9ab'; x.fillRect(Math.floor(s[0] * W), Math.floor(sy), 1, 1); });
      G.drawCity(x, city, 0, Math.round(H + 40 - g.cam * 0.25), '#16164a', '#ffd400', W);
      if (g.bars[0].y + 70 - g.cam < H + 10) { x.fillStyle = '#2b2b3b'; x.fillRect(0, Math.round(g.bars[0].y + 70 - g.cam), W, H); }
      for (var i = Math.max(0, g.cur - 1); i < g.bars.length; i++) drawBar(x, g.bars[i], i === g.cur + 1);
      /* подсказка-траектория на первых перекладинах */
      if (g.mode === 'swing' && g.hold && g.score < 2 && Math.abs(g.st.w) > 1.2) {
        var f = PH.launch(bar(), g.st); x.fillStyle = 'rgba(255,255,255,.35)';
        for (var k = 0; k < 26; k++) { PH.fly(f, 1 / 30); if (k % 2) x.fillRect(Math.round(f.x), Math.round(f.y - g.cam), 2, 2); }
      }
      /* Кирилл */
      var pose, px, py, rot, b = bar();
      if (g.mode === 'swing') {
        var amt = Math.max(-4, Math.min(4, -g.st.w * 0.45));
        pose = g.hold && Math.abs(g.st.w) > 3 && Math.sin(g.st.th) * g.st.w > 0 ? TUCK : shear(HANG, amt);
        px = b.x; py = b.y - g.cam; rot = g.st.th;
        if (g.state === 'ready') rot = Math.sin(t * 2) * 0.05;
      } else {
        var f2 = g.f; rot = f2.rot;
        var hx = f2.x - Math.sin(rot) * PH.L, hy = f2.y - Math.cos(rot) * PH.L;
        var near = PH.near(f2, nxt(), 70);
        pose = g.mode === 'fall' ? FALL : g.relT > 0 ? RELEASE : near ? HANG : TUCKR;
        px = hx; py = hy - g.cam;
      }
      drawKirill(x, pose, Math.round(px), Math.round(py), rot, SC);
      g.fx.forEach(function (p) { x.fillStyle = p.c; x.fillRect(Math.round(p.x), Math.round(p.y - g.cam), 2, 2); });
      if (g.msg) G.text(x, g.msg.text, bar().x, bar().y - g.cam - 40 - (1 - g.msg.t) * 20, 10, '#3cff00', 'center');
      if (g.flash > 0) { x.fillStyle = 'rgba(255,255,255,' + g.flash + ')'; x.fillRect(0, 0, W, H); }
      /* HUD */
      G.text(x, 'ПЕРЕКЛАДИН ' + g.score, 8, 8, 8, '#3cff00'); G.text(x, 'РЕКОРД ' + g.best, W - 8, 8, 8, '#8aa', 'right');
      if (g.mode === 'swing' && g.state === 'run') {
        var pw = Math.min(1, Math.abs(g.st.w) / PH.WMAX); x.fillStyle = '#000'; x.fillRect(8, 22, 80, 6); x.fillStyle = pw > .75 ? '#ff5a48' : pw > .4 ? '#ffd400' : '#3cff00'; x.fillRect(9, 23, Math.round(78 * pw), 4);
        if (g.score < 1) G.text(x, g.hold ? 'ОТПУСТИ, КОГДА ЛЕТИШЬ К ЖЁЛТОЙ' : 'ДЕРЖИ — РАСКАЧИВАЙСЯ', W / 2, H - 22, 7, '#fff', 'center');
      }
      if (g.state === 'ready') g.overlay([['КИРИЛЛ НА ТУРНИКЕ', 11, '#ffd400'], ['ДЕРЖИ (ПРОБЕЛ / МЫШЬ / ПАЛЕЦ)', 7], ['— РАСКАЧКА. ОТПУСТИ — ПОЛЁТ.', 7], ['ЛОВИ ЖЁЛТУЮ ПЕРЕКЛАДИНУ', 7, '#8aa']]);
      if (g.state === 'paused') g.overlay([['ПАУЗА', 12, '#ffd400'], ['«ПРОДОЛЖИТЬ» ИЛИ P', 7]]);
      if (g.state === 'over') { g.overT = (g.overT || 0) + 1 / 60; g.overlay([['МИМО!', 12, '#ff5a48'], ['ПЕРЕКЛАДИН: ' + g.score + (g.newRecord ? ' — РЕКОРД!' : ''), 8, g.newRecord ? '#3cff00' : '#fff'], ['НАЖМИ — ЕЩЁ ПОДХОД', 7, '#8aa']]); }
    };
    g.restart = function () { reset(); g.setState('run'); };
    g.begin(); reset(); g.setState('ready');
    return g;
  };
  G.previewTurnik = function (c) {
    var x = c.getContext('2d'); x.imageSmoothingEnabled = false; var s = c.height / 100; x.setTransform(s, 0, 0, s, 0, 0); var W = c.width / s;
    x.fillStyle = '#0b0b3a'; x.fillRect(0, 0, W, 100);
    G.drawCity(x, G.city(5, 500), 0, 100, '#16164a', '#ffd400', W);
    [[W * .35, 70, '#d8d8d8'], [W * .62, 22, '#ffd400']].forEach(function (b) { x.fillStyle = '#5c5c66'; x.fillRect(b[0] - 20, b[1], 2, 40); x.fillRect(b[0] + 18, b[1], 2, 40); x.fillStyle = b[2]; x.fillRect(b[0] - 20, b[1] - 1, 40, 2); });
    drawKirill(x, TUCKR, Math.round(W * .48), 34, -0.6, 1);
  };
  G.preview = function (c, kind) { if (kind === 'dino') G.previewDino(c); else if (kind === 'dino404') G.previewDino(c, true); else if (kind === 'escape' && G.previewEscape) G.previewEscape(c); else G.previewTurnik(c); };
})(typeof window !== 'undefined' ? window : globalThis);
