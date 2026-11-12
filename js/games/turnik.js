/* КИРИЛЛ НА ТУРНИКЕ — вертикальное путешествие от двора до Солнца.
   Держи — раскачивайся, отпусти — лети. Сверху несколько перекладин; рядом с перекладиной срабатывает «магнитный» захват,
   при промахе можно зацепиться за нижнюю перекладину. Очки = максимальная достигнутая высота (м). 1000 м — секретная концовка.
   Файл состоит из ядра (PH — чистая логика, проверяется симуляциями в node) и отрисовки. */
(function (root) {
  /* ===================== ЯДРО ===================== */
  var PH = {
    L: 26, GP: 900, GF: 1100, PUMP: 16, DAMP: 0.2, WMAX: 12.5, K: 2.5,
    PXM: 7,              // пикселей мира на 1 м (= 1 очко)
    WW: 300,             // ширина игрового поля мира
    HW: 22,              // половина длины перекладины
    GROUND: 70,          // земля ниже стартовой перекладины, px
    FINAL: 1000
  };
  PH.ECAP = -(PH.GP / PH.L) * Math.cos(125 / 180 * Math.PI);
  PH.swing = function (s, hold, dt) {
    var a = -(PH.GP / PH.L) * Math.sin(s.th) - PH.DAMP * s.w;
    /* раскачка до предельной амплитуды (~118°): держать дольше безопасно — Кирилл не уходит в «солнышко» */
    if (hold && 0.5 * s.w * s.w - (PH.GP / PH.L) * Math.cos(s.th) < PH.ECAP) a += PH.PUMP * (Math.abs(s.w) < 0.25 ? 1 : Math.sign(s.w));
    s.w = Math.max(-PH.WMAX, Math.min(PH.WMAX, s.w + a * dt)); s.th += s.w * dt;
  };
  PH.launch = function (pv, s) {
    var cx = pv.x + PH.L * Math.sin(s.th), cy = pv.y + PH.L * Math.cos(s.th), v = PH.L * s.w * PH.K;
    return { x: cx, y: cy, vx: v * Math.cos(s.th), vy: -v * Math.sin(s.th), rot: s.th, spin: s.w * 0.55 };
  };
  PH.h = function (y) { return -y / PH.PXM; };
  /* сложность по высоте h (м) */
  PH.diff = function (h) {
    var u = Math.max(0, Math.min(1, h / PH.FINAL));
    return {
      dy: 58 + 18 * u, jy: 5 + 3 * u, rx: 115 - 10 * u,
      r: 30 - 6 * u, mag: (30 - 6 * u) * (1.95 - 0.3 * u), magA: 1400 - 550 * u,
      keep: h < 200 ? 3 : h < 600 ? 2 : 1, hint: h < 300 ? 1 : h < 600 ? 0.4 : 0, safe: h < 40
    };
  };
  PH.count = function (h, r) { return h < 120 ? 4 : h < 400 ? (r < 0.5 ? 4 : 3) : h < 700 ? 3 : (r < 0.45 ? 3 : 2); };
  /* ближайшая точка перекладины */
  PH.seg = function (f, b) { var hw = b.hw || PH.HW, cx = Math.max(b.x - hw, Math.min(b.x + hw, f.x)), dx = f.x - cx, dy = f.y - b.y; return { x: cx, y: b.y, d: Math.sqrt(dx * dx + dy * dy) }; };

  /* Мир: слои перекладин. Генератор гарантирует, что с каждой перекладины слоя достижима хотя бы одна перекладина следующего. */
  PH.World = function (seed) {
    this.seed = (seed % 2147483646) + 1; this.layers = []; this.bars = []; this.id = 0; this.done = false;
    this.add([{ x: PH.WW / 2, y: 0, start: true }]);
  };
  PH.World.prototype.rnd = function () { this.seed = (this.seed * 16807) % 2147483647; return this.seed / 2147483647; };
  PH.World.prototype.add = function (arr) {
    var L = this.layers.length, self = this, lay = arr.map(function (b) { b.id = self.id++; b.layer = L; self.bars.push(b); return b; });
    this.layers.push(lay); return lay;
  };
  PH.World.prototype.genLayer = function () {
    if (this.done) return false;
    var prev = this.layers[this.layers.length - 1], py = prev.reduce(function (a, b) { return a + b.y; }, 0) / prev.length;
    var h = PH.h(py), d = PH.diff(h), y = py - d.dy, R = this.rnd.bind(this), i;
    if (this.pre) { this.done = true; return this.add([{ x: PH.WW / 2, y: -PH.FINAL * PH.PXM, final: true, hw: 30 }]); }
    var hn = PH.h(y);
    /* предпоследний ярус ставится на удобном расстоянии под финальной перекладиной */
    var tgt = -PH.FINAL * PH.PXM + 66;
    if (y <= tgt + 30) { if (py - tgt <= 100) { y = tgt; this.pre = true; } else y = (py + tgt) / 2; hn = PH.h(y); }
    var nearFinal = this.pre || hn + 2 * PH.diff(hn).dy / PH.PXM >= PH.FINAL - 1;
    var n = PH.count(hn, R()), lo = nearFinal ? PH.WW / 2 - 85 : 36, hi = nearFinal ? PH.WW / 2 + 85 : PH.WW - 36, xs = null;
    for (var at = 0; at < 40 && !xs; at++) {
      var c = [];
      for (i = 0; i < n * 6 && c.length < n; i++) { var x = lo + R() * (hi - lo); if (c.every(function (q) { return Math.abs(q - x) >= 58; })) c.push(x); }
      if (c.length < Math.min(n, 2)) continue;
      /* у каждой перекладины снизу должна быть удобная цель: не строго над головой (кроме низких уровней) */
      if (prev.every(function (b) { return c.some(function (x) { var dx = Math.abs(x - b.x); return dx <= d.rx && (dx >= 22 || hn < 250); }); })) xs = c;
    }
    if (!xs) xs = prev.map(function (b) { return Math.max(lo, Math.min(hi, b.x + (R() - 0.5) * d.rx)); }).slice(0, Math.max(2, n));
    var pre = this.pre; return this.add(xs.map(function (x) { return { x: x, y: y + (pre ? 0 : (R() - 0.5) * 2 * d.jy) }; }));
  };
  PH.World.prototype.ensure = function (yTop) { while (!this.done && this.layers[this.layers.length - 1][0].y > yTop) this.genLayer(); };

  /* Полёт: гравитация + мягкий магнит к ближайшей перекладине. Возвращает захват или null. */
  PH.fly = function (f, dt, bars, h, ex) {
    var d = PH.diff(h), best = null, bd = 1e9, i, b, s, down = f.vy > 0, R = down ? d.r * 1.15 : d.r, M = down ? d.mag * 1.25 : d.mag;
    /* на подъёме ловятся только перекладины заметно выше точки отрыва (соседи по ярусу не перехватывают прыжок), на спуске — любые */
    for (i = 0; i < bars.length; i++) { b = bars[i]; if (b.gone || (ex && b.id === ex.id && ex.t > 0) || (ex && f.vy < 0 && b.y > ex.y - 30)) continue; s = PH.seg(f, b); if (s.d < bd) { bd = s.d; best = s; best.b = b; } }
    f.vy += PH.GF * dt;
    if (best && bd < M && bd > 0.5) { var k = d.magA * (1 - bd / M), ux = (best.x - f.x) / bd, uy = (best.y - f.y) / bd; f.vx += ux * k * dt; f.vy += uy * k * dt; }
    f.x += f.vx * dt; f.y += f.vy * dt; f.rot += f.spin * dt;
    if (ex) ex.t -= dt;
    if (best) { s = PH.seg(f, best.b); if (s.d < R) return { b: best.b, x: s.x, y: s.y }; }
    return null;
  };
  /* Захват: точка хвата на перекладине становится опорой, скорость переходит во вращение */
  PH.grab = function (f, c) {
    var dx = f.x - c.x, dy = f.y - c.y, th = Math.atan2(dx, dy), tang = (f.vx * Math.cos(th) - f.vy * Math.sin(th)) / PH.L;
    return { pv: { x: c.x, y: c.y, b: c.b }, st: { th: th, w: Math.max(-7, Math.min(7, tang * 0.45)) }, off: { x: dx - PH.L * Math.sin(th), y: dy - PH.L * Math.cos(th) } };
  };
  PH.lowY = function (bars) { var m = -1e9; bars.forEach(function (b) { if (!b.gone && b.y > m) m = b.y; }); return m; };
  /* Прогноз траектории при отпускании сейчас — подсказка игроку и «мозг» бота в симуляциях */
  PH.predict = function (pv, st, bars, h, path) {
    var f = PH.launch(pv, st), ex = { id: pv.b ? pv.b.id : -1, t: 0.22, y: pv.y }, low = PH.lowY(bars) + 150, dt = 1 / 60;
    for (var i = 0; i < 150; i++) {
      var c = PH.fly(f, dt, bars, h, ex); if (path && i % 2 === 0) path.push(f.x, f.y);
      if (c) return { b: c.b, t: i * dt };
      if (f.y > low) return null;
    }
    return null;
  };
  /* Удалить слишком низкие перекладины (сколько слоёв ниже текущего остаются для спасения — зависит от высоты) */
  PH.prune = function (w, layer, h) {
    var keep = PH.diff(h).keep, n = 0;
    w.bars.forEach(function (b) { if (!b.gone && b.layer < layer - keep && !(PH.diff(h).safe && b.start)) { b.gone = true; n++; } });
    return n;
  };
  PH.STAGES = [[0, 'ЗЕМЛЯ · ДВОР'], [100, 'ВЫСОКОЕ ЗДАНИЕ'], [200, 'НЕБОСКРЁБЫ'], [300, 'ГОРЫ'], [400, 'ВЫСОКОГОРЬЕ'], [500, 'ВЕРХНИЕ СЛОИ АТМОСФЕРЫ'], [600, 'ПРЕДКОСМОС'], [700, 'КОСМОС'], [800, 'ДАЛЬНИЙ КОСМОС'], [900, 'ПОДЛЁТ К СОЛНЦУ']];
  PH.stage = function (h) { var k = 0; for (var i = 0; i < PH.STAGES.length; i++) if (h >= PH.STAGES[i][0]) k = i; return k; };

  root.TURNIK_PHYS = PH;
  if (typeof module !== 'undefined') { module.exports = PH; return; }

  /* ===================== ОТРИСОВКА ===================== */
  var BOS = window.BOS, G = BOS.games;
  /* спрайты Кирилла (12×25, начало координат — кисти на перекладине) */
  var PAL = { H: '#a3693f', h: '#7a4a2b', S: '#efc3a0', s: '#d6a07f', B: '#8e5a35', E: '#2a1a12', D: '#3d3f46', d: '#2b2c31', W: '#0d0d0d', J: '#2c3650', j: '#1e2538', K: '#d8dad6', G: '#7fd14a' };
  var HANG = [
    '..S......S..', '..S......S..', '..D..hHH.W..', '..DhHHHHHD..', '..DHHHHHHD..', '..DHSSSSHD..', '..DSESSESD..', '..DSSSSSSD..', '..DBSssSBD..', '..DBBBBBBD..', '..DDBBBBDD..', '.DDDDDDDDDD.',
    '.DDDDDDDDDD.', '.DDDDddDDDD.', '..DDDDDDDD..', '..DDDDDDDD..', '..JJJJJJJJ..', '..JJJJJJJJ..', '..JJJ..JJJ..', '..JJJ..JJJ..', '..JJJ..JJJ..', '..jjj..jjj..', '..jjj..jjj..', '..KKK..KKK..', '..KGK..KGK..'];
  var RELEASE = ['S..........S', '.D........W.', '..D..hHH.D..', '...hHHHHH...', '..DHHHHHHD..'].concat(HANG.slice(5));
  var FALL = ['............', '............', '.....hHH....', '...hHHHHH...', '...HHHHHH...', '...HSSSSH...', '...SESSES...', '...SSSSSS...', '...BSssSB...', '...BBBBBB...', 'S..DBBBBD..S', 'DDDDDDDDDDDD',
    '.DDDDDDDDDD.', '..DDDddDDD..', '..DDDDDDDD..', '..DDDDDDDD..', '..JJJJJJJJ..', '.JJJJ..JJJJ.', '.JJJ....JJJ.', 'JJJ......JJJ', 'jjj......jjj', 'KKK......KKK', 'KGK......KGK', '............', '............'];
  function tuck(base) { var r = base.slice(0, 16); r.push('..JJJJJJJJ..', '..JJJJJJJJJ.', '...JJJJJJJJJ', '.........jjj', '.........jjj', '........KKKK', '........KGKK'); while (r.length < 25) r.push('............'); return r; }
  function shear(base, amt) { return base.map(function (r, i) { if (i < 16) return r; var o = Math.round(amt * (i - 15) / 3.2); if (!o) return r; var pad = '............'; return o > 0 ? (pad + r).slice(12 - Math.min(o, 4), 24 - Math.min(o, 4)) : (r + pad).slice(Math.min(-o, 4), 12 + Math.min(-o, 4)); }); }
  var TUCK = tuck(HANG), TUCKR = tuck(RELEASE), SHEARS = {};
  for (var sh = -4; sh <= 4; sh++) SHEARS[sh] = shear(HANG, sh);
  function drawKirill(x, pose, px, py, rot, s) { x.save(); x.translate(px, py); x.rotate(-rot); G.sprite(x, pose, PAL, -6 * s, 0, s); x.restore(); }
  G.drawKirill = drawKirill; G.KIRILL = { HANG: HANG, FALL: FALL, TUCK: TUCK, RELEASE: RELEASE };

  /* небо по высоте: [высота, верх, низ] */
  var SKY = [[0, '#6ec3ff', '#d6efff'], [100, '#5ab4f5', '#cdeaff'], [200, '#4aa0ea', '#e2f2ff'], [300, '#3d8de0', '#eef6ff'], [420, '#2f78d4', '#f4f9ff'], [520, '#173f9a', '#5d9be6'], [620, '#081a55', '#1d4a9a'],
    [720, '#02041a', '#06103a'], [850, '#03020f', '#0d0a20'], [930, '#1a0805', '#4a1606'], [1000, '#4a1400', '#ff9a30']];
  function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
  function mix(a, b, t) { var A = hex(a), B = hex(b); return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * t) + ',' + Math.round(A[1] + (B[1] - A[1]) * t) + ',' + Math.round(A[2] + (B[2] - A[2]) * t) + ')'; }
  function sky(h) { for (var i = 1; i < SKY.length; i++) if (h < SKY[i][0]) { var a = SKY[i - 1], b = SKY[i], t = (h - a[0]) / (b[0] - a[0]); return [mix(a[1], b[1], t), mix(a[2], b[2], t)]; } return [SKY[SKY.length - 1][1], SKY[SKY.length - 1][2]]; }
  function hash(n) { return ((Math.imul(n | 0, 2654435761) >>> 0) % 10000) / 10000; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  var H = 330, SC = 2, PX = PH.PXM;
  G.turnik = function (canvas, hooks) {
    var g = new G.Game(canvas, H, hooks); g.minW = 300; g.bg = '#5ab4f5'; g.song = 'turnik';
    var W0, ox = 0, cam = 0, top = 0, bot = H, vh = H, btns = [], stars = [], clouds = [], fx = [], floats = [], banner = null, lastT = 0, egg = null, path = [];
    var touch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    for (var i = 0; i < 90; i++) stars.push([Math.random(), Math.random(), Math.random() > 0.85 ? 2 : 1]);
    for (i = 0; i < 46; i++) clouds.push({ a: 170 + i * 8.5 + hash(i) * 10, x: hash(i * 7) * 1.4 - 0.2, p: 0.7 + hash(i * 3) * 0.5, s: 0.6 + hash(i * 11) * 0.9, v: 3 + hash(i * 5) * 6 });
    function reduced() { return BOS.reduced && BOS.reduced(); }
    g.secret = !!BOS.store('turnik-secret');

    function reset() {
      g.w = new PH.World(Math.floor(Math.random() * 1e9) + 1); g.w.ensure(-600);
      var b0 = g.w.layers[0][0]; g.pv = { x: b0.x, y: b0.y, b: b0 }; g.st = { th: 0, w: 0 }; g.mode = 'swing'; g.hold = false; g.f = null; g.ex = null;
      g.score = 0; g.curH = 0; g.layer = 0; g.stage = 0; g.slow = 0; g.grabOff = null; g.grabT = 0; g.relT = 0; g.groundT = 0; g.fallT = 0; g.overT = 0; g.rescues = 0; g.catches = 0; g.newRecord = false;
      fx = []; floats = []; banner = null; egg = null; cam = g.pv.y - (top + vh * 0.7); g.emit();
      if (BOS.audio) BOS.audio.set('stage', 0, g);
    }
    g.restart = function () { reset(); g.setState('run'); };
    g.release = function () { g.hold = false; };

    /* ---------- ввод ---------- */
    function down() {
      if (g.state === 'ready') { g.restart(); return; }
      if (g.state === 'over') { if (g.overT > 0.6) g.restart(); return; }
      if (g.state === 'egg') { if (egg && egg.t > 2 && egg.t < 11.5) egg.t = 11.5; return; }
      if (g.state === 'run' && g.mode === 'swing') g.hold = true;
    }
    function up() {
      if (g.state === 'run' && g.mode === 'swing' && g.hold) {
        g.hold = false;
        if (Math.abs(g.st.w) < 1.2) return;
        g.f = PH.launch(g.pv, g.st); g.ex = { id: g.pv.b.id, t: 0.22, y: g.pv.y }; g.mode = 'fly'; g.relT = 0.25; g.slow = reduced() ? 0 : 0.22; G.sfx('whoosh');
      }
      g.hold = false;
    }
    var HOLD = { ' ': 1, Spacebar: 1, ArrowUp: 1, Enter: 1, w: 1, W: 1, 'ц': 1, 'Ц': 1 };
    function kd(e) {
      if (HOLD[e.key]) { e.preventDefault(); if (!e.repeat) { if ((g.state === 'over' || g.state === 'egg') && e.key === 'Enter' && btns[0]) { btns[0].fn(); return; } down(); } return; }
      if (e.key === 'p' || e.key === 'P' || e.key === 'з' || e.key === 'З' || e.key === 'Escape') { e.preventDefault(); if (e.repeat) return; if (g.state === 'run') g.pause(); else if (g.state === 'paused') g.resume(); else if ((g.state === 'over' || g.state === 'egg') && e.key === 'Escape' && hooks.exit) hooks.exit(); }
    }
    function ku(e) { if (HOLD[e.key]) { e.preventDefault(); up(); } }
    function pd(e) {
      if (e.button && e.button !== 0) return; e.preventDefault(); canvas.focus(); try { canvas.setPointerCapture(e.pointerId); } catch (er) {}
      var b = (g.state === 'over' || g.state === 'egg' || g.state === 'ready') ? G.hitBtn(g, btns, e) : null;
      if (b) { G.sfx('click'); b.fn(); return; }
      if (g.state === 'paused') { g.resume(); return; }
      down();
    }
    function pu(e) { e.preventDefault(); up(); }
    function cm(e) { e.preventDefault(); }
    canvas.addEventListener('keydown', kd); canvas.addEventListener('keyup', ku); canvas.addEventListener('pointerdown', pd); canvas.addEventListener('pointerup', pu); canvas.addEventListener('pointercancel', pu); canvas.addEventListener('contextmenu', cm);
    g.unbind = function () { canvas.removeEventListener('keydown', kd); canvas.removeEventListener('keyup', ku); canvas.removeEventListener('pointerdown', pd); canvas.removeEventListener('pointerup', pu); canvas.removeEventListener('pointercancel', pu); canvas.removeEventListener('contextmenu', cm); };

    function float(text, c, x, y) { floats.push({ text: text, c: c, x: x, y: y, t: 1.1 }); if (floats.length > 4) floats.shift(); }
    function burst(x, y, n, cols) { for (var k = 0; k < n; k++) fx.push({ x: x, y: y, vx: (Math.random() - 0.5) * 220, vy: (Math.random() - 0.8) * 200, t: 0.6, c: cols[k % cols.length] }); }

    /* ---------- логика ---------- */
    function caught(c) {
      c.down = g.f.vy > 0; var gr = PH.grab(g.f, c), b = c.b, h = PH.h(b.y), prevH = g.curH;
      g.pv = gr.pv; g.st = gr.st; g.grabOff = gr.off; g.grabT = 0.14; g.mode = 'swing'; g.hold = false; g.f = null; g.catches++;
      g.curH = h; g.layer = b.layer;
      if (h > g.score + 0.5) {
        var gain = Math.floor(h) - Math.floor(g.score); g.score = Math.max(g.score, Math.floor(h)); g.emit();
        float('+' + gain, '#3cff00', b.x, b.y - 30); G.sfx('catch'); if (BOS.audio) BOS.audio.sting('catch', g);
        burst(c.x, c.y, 12, ['#ffd400', '#3cff00', '#fff']);
        var st = PH.stage(g.score);
        if (st !== g.stage) { g.stage = st; banner = { t: 2.6, n: st }; if (BOS.audio) { BOS.audio.set('stage', st, g); BOS.audio.sting('level', g); } }
      } else if (h < prevH - 2 || (gr.st && c.down)) { g.rescues++; float(h < prevH - 2 ? 'СПАСЕНИЕ!' : 'ЗАЦЕПИЛСЯ!', '#ffd400', b.x, b.y - 30); G.sfx('catch'); burst(c.x, c.y, 8, ['#ffd400']); }
      else G.sfx('catch');
      if (b.final) { startEgg(); return; }
      PH.prune(g.w, g.layer, g.score);
    }
    function lose() {
      g.setState('over'); g.overT = 0; g.record();
      if (BOS.audio) { BOS.audio.sting('fall', g); var a = BOS.audio; setTimeout(function () { a.stop(g, 'slow'); }, 1400); }
    }
    g.update = function (dt) {
      if (g.slow > 0) { g.slow -= dt; dt *= 0.55 + 0.45 * (1 - Math.max(0, g.slow) / 0.22); }
      var h = g.score;
      if (g.mode === 'swing') {
        var prev = g.st.th; PH.swing(g.st, g.hold, dt);
        if (g.hold && Math.cos(prev) < 0.95 && Math.cos(g.st.th) >= 0.95) G.sfx('swing');
        g.grabT = Math.max(0, g.grabT - dt);
      } else if (g.mode === 'fly') {
        g.relT = Math.max(0, g.relT - dt);
        var c = PH.fly(g.f, dt, g.w.bars, h, g.ex);
        if (c) caught(c);
        else {
          var low = PH.lowY(g.w.bars), safe = PH.diff(g.score).safe;
          if (safe && g.f.y >= PH.GROUND - PH.L + 4) { g.mode = 'ground'; g.groundT = 0.9; g.f.y = PH.GROUND - PH.L + 4; G.sfx('land'); float('НИЧЕГО, ЕЩЁ РАЗ!', '#fff', g.f.x, g.f.y - 60); }
          else if (!safe && g.f.y > low + 150) { g.mode = 'fall'; lose(); }
        }
      } else if (g.mode === 'ground') {
        g.groundT -= dt;
        if (g.groundT <= 0) { var b0 = g.w.layers[0][0]; b0.gone = false; g.pv = { x: b0.x, y: b0.y, b: b0 }; g.st = { th: 0, w: 0 }; g.mode = 'swing'; g.curH = 0; g.layer = 0; g.f = null; }
      }
      g.w.ensure(cam + top - 500);
      fx.forEach(function (p) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; p.t -= dt; }); fx = fx.filter(function (p) { return p.t > 0; });
    };
    function updCam(dt) {
      var anchor = top + vh * 0.7, t;
      if (g.mode === 'fly' || g.mode === 'fall' || g.mode === 'ground') {
        t = g.pv.y - anchor;
        var fy = g.f ? g.f.y : g.pv.y;
        if (fy - cam < top + vh * 0.38) t = Math.min(t, fy - (top + vh * 0.38));
        if (fy - cam > top + vh * 0.82) t = Math.max(t, Math.min(fy - (top + vh * 0.82), PH.lowY(g.w.bars) + 90 - anchor));
      } else t = g.pv.y - anchor;
      if (g.state === 'ready') t = g.pv.y - anchor;
      cam += (t - cam) * (1 - Math.exp(-dt * 4));
    }

    /* ---------- секретная концовка ---------- */
    function startEgg() {
      egg = { t: 0 }; g.setState('egg'); g.score = PH.FINAL; g.record(); g.emit();
      try { BOS.store('turnik-secret', true); } catch (e) {} g.secret = true;
      var a = BOS.audio; if (a) { a.stop(g, 'slow'); setTimeout(function () { a.sting('egg'); }, 150); setTimeout(function () { a.sfx('grow'); }, 1600); }
    }

    /* ---------- мир ---------- */
    function SY(a, p) { var cy = (top + bot) / 2; return cy + ((-a * PX) - (cam + cy)) * p; }       /* экранная y для высоты a (м) с параллаксом p */
    function rect(x, c, X, Y, w, h) { x.fillStyle = c; x.fillRect(Math.round(X), Math.round(Y), Math.round(w), Math.round(h)); }
    function drawWorld(x, W, t, alt) {
      var sk = sky(alt), gr = x.createLinearGradient(0, top, 0, bot); gr.addColorStop(0, sk[0]); gr.addColorStop(1, sk[1]); x.fillStyle = gr; x.fillRect(0, top, W, vh);
      /* звёзды */
      var sa = clamp((alt - 540) / 160, 0, 1);
      if (sa > 0) stars.forEach(function (s, i) { var tw = reduced() ? 1 : 0.6 + 0.4 * Math.sin(t * 2 + i); x.globalAlpha = sa * tw; x.fillStyle = s[2] > 1 ? '#ffe9a8' : '#cfe0ff'; x.fillRect(Math.floor(s[0] * W), Math.floor(top + ((s[1] * vh * 1.5 - alt * 0.6) % vh + vh) % vh), s[2], s[2]); });
      x.globalAlpha = 1;
      /* Солнце */
      if (alt > 860) { var su = clamp((alt - 860) / 140, 0, 1.15), sr = 10 + su * su * 250, scx = W * 0.6, scy = top + 18 + sr * 0.15;
        var sg = x.createRadialGradient(scx, scy, sr * 0.6, scx, scy, sr * 2.2); sg.addColorStop(0, 'rgba(255,200,80,.55)'); sg.addColorStop(1, 'rgba(255,120,20,0)'); x.fillStyle = sg; x.fillRect(0, top, W, vh);
        x.fillStyle = '#fff3c0'; x.beginPath(); x.arc(scx, scy, sr, 0, Math.PI * 2); x.fill(); x.fillStyle = '#ffd25a'; x.beginPath(); x.arc(scx, scy, sr * 0.92, 0, Math.PI * 2); x.fill();
        if (!reduced()) { x.strokeStyle = 'rgba(255,240,180,.5)'; x.lineWidth = 2; for (var k = 0; k < 12; k++) { var an = k / 12 * Math.PI * 2 + t * 0.2; x.beginPath(); x.moveTo(scx + Math.cos(an) * sr * 1.05, scy + Math.sin(an) * sr * 1.05); x.lineTo(scx + Math.cos(an) * sr * 1.25, scy + Math.sin(an) * sr * 1.25); x.stroke(); } } }
      /* далёкие планеты */
      if (alt > 760 && alt < 990) { var pa = clamp((alt - 760) / 60, 0, 1) * clamp((990 - alt) / 40, 0, 1); x.globalAlpha = pa;
        var my = SY(850, 0.18); x.fillStyle = '#c4532c'; x.beginPath(); x.arc(W * 0.18, my, 13, 0, 7); x.fill(); x.fillStyle = '#e07a4a'; x.beginPath(); x.arc(W * 0.18 - 3, my - 3, 8, 0, 7); x.fill();
        var ry = SY(880, 0.12); x.fillStyle = '#e8cf8a'; x.beginPath(); x.arc(W * 0.82, ry, 10, 0, 7); x.fill(); x.strokeStyle = '#bfa66a'; x.lineWidth = 2; x.beginPath(); x.ellipse(W * 0.82, ry, 20, 5, -0.3, 0, 7); x.stroke();
        x.globalAlpha = 1; }
      /* Земля снизу: изгиб горизонта → шар */
      if (alt > 470) {
        var u = clamp((alt - 480) / 520, 0, 1), R = 9000 * Math.exp(-u * 4.7), hy = bot - 26 - u * vh * 0.42, ecx = W / 2 - u * W * 0.12, ecy = hy + R;
        if (R > 150) {
          x.save(); x.beginPath(); x.arc(ecx, ecy, R, 0, Math.PI * 2); x.clip();
          var eg = x.createLinearGradient(0, hy, 0, hy + 120); eg.addColorStop(0, '#5aa0ff'); eg.addColorStop(0.15, '#2a6fd0'); eg.addColorStop(1, '#174a98'); x.fillStyle = eg; x.fillRect(0, hy - 2, W, bot - hy + 4);
          for (var q = 0; q < 7; q++) { x.fillStyle = q % 3 ? 'rgba(70,150,80,.85)' : 'rgba(240,245,255,.7)'; x.beginPath(); x.ellipse(((q * 97 + alt * 0.4) % (W + 160)) - 80, hy + 14 + (q % 3) * 22, 40 + q * 7, 6 + (q % 2) * 4, 0, 0, 7); x.fill(); }
          x.restore();
          x.strokeStyle = 'rgba(150,210,255,.8)'; x.lineWidth = 3; x.beginPath(); x.arc(ecx, ecy, R + 1, Math.PI * 1.02, Math.PI * 1.98); x.stroke();
          x.strokeStyle = 'rgba(150,210,255,.25)'; x.lineWidth = 9; x.beginPath(); x.arc(ecx, ecy, R + 6, Math.PI * 1.02, Math.PI * 1.98); x.stroke();
        } else G.drawEarth(x, ecx, hy + R, R, t * 0.15 + alt * 0.01);
      }
      /* спутники */
      if (alt > 660 && alt < 860) [700, 745, 805].forEach(function (a, k) { var yy = SY(a, 0.9); if (yy < top - 20 || yy > bot + 20) return; var xx = ((t * (14 + k * 6) + k * 130) % (W + 80)) - 40;
        rect(x, '#9aa6b8', xx - 3, yy - 3, 6, 6); rect(x, '#2a4fa8', xx - 15, yy - 2, 10, 4); rect(x, '#2a4fa8', xx + 5, yy - 2, 10, 4); rect(x, '#ffd400', xx - 1, yy - 6, 2, 3); });
      /* горы: дальний хребет, ближний, снежные пики */
      /* горы далеко: медленно опускаются от верха кадра (300 м) к низу (600 м) */
      if (alt > 270 && alt < 700) { x.globalAlpha = clamp((alt - 270) / 50, 0, 1); ridge(x, W, 420, 0.12, '#9fb0cc', 60, 0.011, 3, '#f2f6ff'); ridge(x, W, 380, 0.18, '#6f84a6', 80, 0.016, 7, '#e9f1ff'); x.globalAlpha = 1; }
      if (alt > 380 && alt < 720) { x.globalAlpha = clamp((alt - 380) / 40, 0, 1); ridge(x, W, 480, 0.3, '#53668a', 110, 0.021, 13, '#f7faff'); x.globalAlpha = 1; }
      /* город вдали */
      if (alt > 40 && alt < 420) G.drawCity(x, cityFar, 40, SY(0, 0.12), '#8aa0c0', '#dce8f6', W);
      /* небоскрёбы */
      if (alt > 130 && alt < 430) for (var s2 = 0; s2 < 7; s2++) { var tx = (s2 + 0.3) / 7 * W + Math.sin(s2 * 4.1) * 12, tw2 = 26 + (s2 % 3) * 9, ta = 230 + (s2 * 37) % 100, ty = SY(ta, 0.55);
        if (ty > bot) continue; rect(x, s2 % 2 ? '#5d7fa8' : '#4e6f98', tx - tw2 / 2, ty, tw2, bot - ty + 2); rect(x, '#9fbde0', tx - tw2 / 2 + 2, ty + 2, 2, bot - ty);
        for (var wy = ty + 6; wy < bot; wy += 7) rect(x, 'rgba(220,235,255,.35)', tx - tw2 / 2 + 5, wy, tw2 - 9, 2);
        rect(x, '#c9d6e6', tx - 1, ty - 8, 2, 8); if (Math.floor(t * 2 + s2) % 2) rect(x, '#ff3b30', tx - 1, ty - 10, 2, 2); }
      /* облака */
      if (alt > 140 && alt < 620) clouds.forEach(function (c) { var yy = SY(c.a, c.p); if (yy < top - 30 || yy > bot + 30) return; var xx = ((c.x * W + t * c.v) % (W + 120)) - 60; cloud(x, xx, yy, c.s); });
      /* море облаков на 440 м */
      if (alt > 380 && alt < 700) { var cy2 = SY(440, 0.9); if (cy2 < bot) { x.fillStyle = '#eef5ff'; x.beginPath(); x.moveTo(0, bot); for (var cx3 = 0; cx3 <= W; cx3 += 8) x.lineTo(cx3, cy2 + Math.sin(cx3 * 0.05 + t * 0.3) * 4 + Math.sin(cx3 * 0.13) * 3); x.lineTo(W, bot); x.closePath(); x.fill(); rect(x, 'rgba(180,205,240,.6)', 0, cy2 + 14, W, bot - cy2); } }
      /* высокое здание сбоку (до 200 м) и соседнее (до 130 м) */
      if (alt < 300) { building(x, W, 0, Math.max(46, ox + 6), 200, '#d9c7a6', '#bfa984', true); building(x, W, W - Math.max(40, ox + 2), Math.max(40, ox + 2), 130, '#b9c4cf', '#98a5b3', false); }
      /* двор: пятиэтажка, деревья, земля */
      if (alt < 120) {
        var gy = (PH.GROUND - cam), by = SY(-PH.GROUND / PX, 0.85);
        rect(x, '#e6d3b3', W * 0.18, by - 70, W * 0.64, 70); rect(x, '#c9b28f', W * 0.18, by - 72, W * 0.64, 3);
        for (var fl = 0; fl < 5; fl++) for (var wx = W * 0.2; wx < W * 0.8 - 8; wx += 14) rect(x, (Math.floor(wx + fl * 3) % 5 === 0) ? '#ffe9a0' : '#7d9bb8', wx + 2, by - 64 + fl * 13, 7, 8);
        rect(x, '#6dbb4a', 0, gy, W, bot - gy + 2); rect(x, '#4f9a36', 0, gy, W, 3); rect(x, '#c8b48c', W / 2 - 60, gy + 6, 120, bot - gy);
        [0.05, 0.14, 0.86, 0.95].forEach(function (p, k) { var tx2 = p * W, th = 46 + k * 6; rect(x, '#6b4a2a', tx2 - 3, gy - th * 0.45, 6, th * 0.45); x.fillStyle = k % 2 ? '#3f8f3a' : '#4fa443'; x.beginPath(); x.arc(tx2, gy - th * 0.6, th * 0.32, 0, 7); x.fill(); x.beginPath(); x.arc(tx2 - 9, gy - th * 0.45, th * 0.22, 0, 7); x.fill(); x.beginPath(); x.arc(tx2 + 9, gy - th * 0.48, th * 0.22, 0, 7); x.fill(); });
      }
    }
    var cityFar = G.city(17, 900);
    function cloud(x, cx, cy, s) { x.fillStyle = 'rgba(255,255,255,.88)'; [[0, 0, 14], [-14, 4, 10], [14, 4, 11], [-6, -6, 10], [8, -5, 9]].forEach(function (c) { x.beginPath(); x.arc(cx + c[0] * s, cy + c[1] * s, c[2] * s, 0, 7); x.fill(); }); }
    function ridge(x, W, a, p, col, amp, fr, seed, snow) {
      var base = SY(a, p); if (base - amp > bot) return;
      x.fillStyle = col; x.beginPath(); x.moveTo(0, bot);
      var pts = []; for (var X = 0; X <= W + 8; X += 8) { var y = base - amp * (0.55 + 0.45 * Math.abs(Math.sin(X * fr + seed)) * Math.abs(Math.sin(X * fr * 2.3 + seed * 1.7))); pts.push([X, y]); x.lineTo(X, y); }
      x.lineTo(W, bot); x.closePath(); x.fill();
      var hz = x.createLinearGradient(0, base - amp, 0, bot); hz.addColorStop(0, 'rgba(255,255,255,0)'); hz.addColorStop(1, 'rgba(225,238,255,.55)'); x.fillStyle = hz; x.fill();
      if (snow) { x.fillStyle = snow; pts.forEach(function (q, i) { if (i && q[1] < base - amp * 0.78) { x.beginPath(); x.moveTo(q[0] - 6, q[1] + 7); x.lineTo(q[0], q[1]); x.lineTo(q[0] + 6, q[1] + 7); x.fill(); } }); }
    }
    function building(x, W, X, w, a, c1, c2, antenna) {
      var ty = SY(a, 0.95), by = SY(-PH.GROUND / PX, 0.95); if (ty > bot || by < top) return;
      rect(x, c1, X, ty, w, by - ty); rect(x, c2, X, ty, w, 3);
      var yy0 = Math.max(ty + 6, top - ((top - ty) % 12)); for (var yy = yy0; yy < Math.min(by, bot); yy += 12) for (var xx = X + 4; xx < X + w - 7; xx += 11) rect(x, (Math.floor(yy / 12) + Math.floor(xx / 11)) % 7 === 0 ? '#ffe9a0' : '#6f8aa6', xx, yy, 6, 7);
      if (antenna) { rect(x, '#777', X + w * 0.5, ty - 22, 2, 22); rect(x, '#ff3b30', X + w * 0.5 - 1, ty - 24, 4, 3); }
    }
    function drawBar(x, b, hi, t) {
      var X = b.x + ox, Y = b.y - cam, h = PH.h(b.y), hw = b.hw || PH.HW;
      if (Y < top - 20 || Y > bot + 90) return;
      x.globalAlpha = b.gone ? 0.18 : 1;
      if (b.start) { rect(x, '#5c5c66', X - hw - 3, Y, 3, PH.GROUND); rect(x, '#5c5c66', X + hw, Y, 3, PH.GROUND); }
      var col = b.final ? '#ffd400' : h < 200 ? '#d8d8d8' : h < 300 ? '#ffc400' : h < 500 ? '#9a6a3a' : h < 700 ? '#a8e4ff' : h < 900 ? '#c0c8d8' : '#ffcf40';
      if (h >= 200 && h < 300) { rect(x, '#222', X - hw, Y - 3, hw * 2, 1); for (var k = -hw; k < hw; k += 6) rect(x, '#222', X + k, Y - 2, 2, 4); }
      if (h >= 300 && h < 500) { rect(x, '#777', X - hw - 2, Y - 3, 4, 7); rect(x, '#777', X + hw - 2, Y - 3, 4, 7); }
      if (h >= 700 && h < 900) { rect(x, '#2a4fa8', X - hw - 12, Y - 4, 10, 8); rect(x, '#2a4fa8', X + hw + 2, Y - 4, 10, 8); }
      if (hi) { x.fillStyle = 'rgba(60,255,0,.35)'; x.fillRect(X - hw - 4, Y - 6, hw * 2 + 8, 12); }
      rect(x, '#000', X - hw, Y - 2, hw * 2, 5); rect(x, col, X - hw, Y - 2, hw * 2, 4); rect(x, 'rgba(255,255,255,.6)', X - hw, Y - 2, hw * 2, 1);
      if (b.final && !reduced()) { x.fillStyle = 'rgba(255,230,120,' + (0.3 + 0.2 * Math.sin(t * 5)) + ')'; x.fillRect(X - hw - 6, Y - 8, hw * 2 + 12, 16); }
      x.globalAlpha = 1;
    }
    function drawPlayer(x, t) {
      var pose, px, py, rot;
      if (g.mode === 'swing') {
        var amt = clamp(Math.round(-g.st.w * 0.45), -4, 4);
        pose = g.hold && Math.abs(g.st.w) > 3 && Math.sin(g.st.th) * g.st.w > 0 ? TUCK : SHEARS[amt];
        px = g.pv.x + ox; py = g.pv.y - cam; rot = g.st.th;
        if (g.state === 'ready') rot = reduced() ? 0 : Math.sin(t * 2) * 0.05;
        if (g.grabT > 0 && g.grabOff) { var k = g.grabT / 0.14; px += g.grabOff.x * k; py += g.grabOff.y * k; }
      } else if (g.mode === 'ground') {
        pose = HANG; px = g.f.x + ox; py = PH.GROUND - cam - 50; rot = 0;
      } else {
        var f = g.f; rot = f.rot; var hx = f.x - Math.sin(rot) * PH.L, hy = f.y - Math.cos(rot) * PH.L;
        pose = g.mode === 'fall' ? FALL : g.relT > 0 ? RELEASE : TUCKR; px = hx + ox; py = hy - cam;
      }
      drawKirill(x, pose, Math.round(px), Math.round(py), rot, SC);
    }
    function drawHint(x) {
      var d = PH.diff(g.score); if (!d.hint || g.mode !== 'swing' || !g.hold || Math.abs(g.st.w) < 1.2 || g.state !== 'run') return null;
      path.length = 0; var p = PH.predict(g.pv, g.st, g.w.bars, g.score, path), n = path.length / 2, lim = Math.floor(n * d.hint);
      x.fillStyle = p ? 'rgba(255,255,255,.75)' : 'rgba(255,90,72,.75)';
      for (var i = 0; i < lim; i += 1) x.fillRect(Math.round(path[i * 2] + ox) - 1, Math.round(path[i * 2 + 1] - cam) - 1, 2, 2);
      return d.hint === 1 ? p : null;
    }
    function hud(x, W, t) {
      var u = g.score / PH.FINAL, sname = PH.STAGES[g.stage][1], dark = g.score > 500;
      x.fillStyle = 'rgba(0,0,30,.45)'; x.fillRect(0, top, W, 30);
      G.text(x, 'ВЫСОТА ' + Math.floor(g.score) + ' М', 6, top + 5, 8, '#fff'); G.text(x, 'РЕКОРД ' + g.best, W - 22, top + 5, 7, '#cfe', 'right');
      G.text(x, (g.stage + 1) + '/10 ' + sname, 6, top + 17, 7, '#ffd400');
      /* путь к Солнцу: вертикальная шкала справа */
      var bx = W - 12, y0 = bot - 26, y1 = top + 46, len = y0 - y1;
      x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(bx - 3, y1 - 2, 8, len + 4); x.fillStyle = '#3cff00'; x.fillRect(bx - 1, y0 - len * u, 4, len * u);
      for (var k = 1; k < 10; k++) x.fillRect(bx - 3, Math.round(y0 - len * k / 10), 2, 1);
      if (g.best > 0) { x.fillStyle = '#fff'; x.fillRect(bx - 4, Math.round(y0 - len * Math.min(1, g.best / PH.FINAL)), 10, 1); }
      x.fillStyle = '#ffd25a'; x.beginPath(); x.arc(bx + 1, y1 - 8, 5, 0, 7); x.fill(); x.fillStyle = '#2a6fd0'; x.beginPath(); x.arc(bx + 1, y0 + 9, 5, 0, 7); x.fill(); x.fillStyle = '#4fa443'; x.fillRect(bx - 1, y0 + 6, 3, 3);
      x.fillStyle = PAL.H; x.fillRect(bx - 3, Math.round(y0 - len * u) - 3, 8, 6);
      if (g.score < 8 && g.state === 'run') { var msg = g.hold ? 'ОТПУСТИ, КОГДА ЛЕТИШЬ К ПЕРЕКЛАДИНЕ' : (touch ? 'ДЕРЖИ ПАЛЕЦ — РАСКАЧИВАЙСЯ' : 'ДЕРЖИ ПРОБЕЛ — РАСКАЧИВАЙСЯ'); x.fillStyle = 'rgba(0,0,30,.55)'; x.fillRect(0, bot - 24, W, 18); G.text(x, msg, W / 2, bot - 19, 7, '#fff', 'center'); }
      if (g.mode === 'swing' && g.state === 'run') { var pw = Math.min(1, Math.abs(g.st.w) / PH.WMAX); x.fillStyle = '#000'; x.fillRect(6, top + 34, 70, 5); x.fillStyle = pw > .75 ? '#ff5a48' : pw > .4 ? '#ffd400' : '#3cff00'; x.fillRect(7, top + 35, Math.round(68 * pw), 3); }
      floats.forEach(function (f) { x.globalAlpha = Math.min(1, f.t * 2); G.text(x, f.text, f.x + ox, f.y - cam - (1.1 - f.t) * 24, 8, f.c, 'center'); }); x.globalAlpha = 1;
      if (banner) { var a = Math.min(1, banner.t * 2, (2.6 - banner.t) * 4); x.globalAlpha = Math.max(0, a); x.fillStyle = 'rgba(0,0,30,.7)'; x.fillRect(0, top + vh * 0.3, W, 34);
        G.text(x, 'ЛОКАЦИЯ ' + (banner.n + 1) + '/10', W / 2, top + vh * 0.3 + 5, 7, '#ffd400', 'center'); G.text(x, PH.STAGES[banner.n][1], W / 2, top + vh * 0.3 + 17, 10, '#fff', 'center'); x.globalAlpha = 1; }
    }

    /* ---------- пасхалка: Кирилл вырастает и крутит Землю на пальце ---------- */
    function drawEgg(x, W, T) {
      var t = performance.now() / 1000, cx = W / 2, feet = bot - 18;
      if (T < 1.6) {                                       /* кадр 1: финальная перекладина на фоне Солнца */
        updCam(1 / 60); drawWorld(x, W, t, 1000 + T * 6); drawBar(x, g.pv.b, false, t); drawPlayer(x, t);
        if (T > 1.2) { x.fillStyle = 'rgba(255,250,230,' + ((T - 1.2) / 0.4).toFixed(2) + ')'; x.fillRect(0, top, W, vh); }
        return;
      }
      /* космос и огромное Солнце позади */
      x.fillStyle = '#05030f'; x.fillRect(0, top, W, vh);
      stars.forEach(function (s) { x.fillStyle = '#cfe0ff'; x.fillRect(Math.floor(s[0] * W), Math.floor(top + s[1] * vh), s[2], s[2]); });
      var zoom = T < 11.5 ? 1 : 1 - 0.22 * Math.min(1, (T - 11.5) / 1.5), sr = vh * 0.55 * zoom, scx = W * 0.72, scy = top + vh * 0.18;
      var sg = x.createRadialGradient(scx, scy, sr * 0.5, scx, scy, sr * 1.8); sg.addColorStop(0, 'rgba(255,190,70,.5)'); sg.addColorStop(1, 'rgba(255,120,20,0)'); x.fillStyle = sg; x.fillRect(0, top, W, vh);
      x.fillStyle = '#ffd25a'; x.beginPath(); x.arc(scx, scy, sr, 0, 7); x.fill(); x.fillStyle = '#ffe58a'; x.beginPath(); x.arc(scx - sr * 0.1, scy - sr * 0.1, sr * 0.75, 0, 7); x.fill();
      var Hk = Math.min(vh * 0.62, 240) * zoom, k = Math.min(1, (T - 1.6) / 4.6), hk = 34 + (Hk - 34) * (k * (2 - k));
      var m = 1.8 * Math.exp(3.88 * Math.max(0, Math.min(T, 6.2) - 1.6)), ppm = hk / m, s = hk / 29;
      if (T > 11.5) feet = bot - 18 - (bot - 18 - (top + vh * 0.5 + Hk * 0.5)) * Math.min(1, (T - 11.5) / 1.5) * 0.3;
      /* Земля: сначала под ногами как земля, потом — шар */
      var Re = 6.371e6 * ppm, rot = t * (T > 8.4 ? 4 : 0.4), ex2, ey2;
      var pose = { la: Math.PI / 2 + 0.12, ra: Math.PI / 2 - 0.12, smile: T > 8.6, finger: false };
      if (T < 6.2) {
        if (Re > 400) { x.fillStyle = '#3f8f3a'; x.fillRect(0, feet, W, bot - feet); x.fillStyle = '#5aa0ff'; x.fillRect(0, feet + 6, W, bot - feet); }
        else G.drawEarth(x, cx, feet + Re, Re, rot);
        /* небоскрёб и гора для масштаба */
        var sk = 400 * ppm, mt = 8800 * ppm;
        if (sk > 3 && sk < vh * 1.5) { var sw = Math.max(2, sk * 0.18); rect(x, '#5d7fa8', cx + hk * 0.5, feet - sk, sw, sk); for (var wy = 0; wy < sk; wy += Math.max(2, sk / 25)) rect(x, '#9fbde0', cx + hk * 0.5 + sw * 0.2, feet - sk + wy, sw * 0.6, 1); }
        if (mt > 3 && mt < vh * 2) { x.fillStyle = '#6a7b99'; x.beginPath(); x.moveTo(cx - hk * 0.4 - mt * 1.4, feet); x.lineTo(cx - hk * 0.4 - mt * 0.5, feet - mt); x.lineTo(cx - hk * 0.4 + mt * 0.3, feet); x.fill(); x.fillStyle = '#f4f8ff'; x.beginPath(); x.moveTo(cx - hk * 0.4 - mt * 0.68, feet - mt * 0.8); x.lineTo(cx - hk * 0.4 - mt * 0.5, feet - mt); x.lineTo(cx - hk * 0.4 - mt * 0.36, feet - mt * 0.84); x.fill(); }
        var lab = m > 150 && m < 1500 ? 'РАЗМЕРОМ С НЕБОСКРЁБ' : m > 3000 && m < 40000 ? 'РАЗМЕРОМ С ГОРУ' : m > 4e6 && m < 6e7 ? 'РАЗМЕРОМ С ПЛАНЕТУ' : '';
        if (lab) G.text(x, lab, W / 2, top + 14, 9, '#fff', 'center');
        G.kirillFront(x, cx, feet, s, pose);
        return endText(x, W, T);
      }
      /* кадры 3–5: Земля в ладони и на пальце */
      Re = Math.max(6, hk * 0.075);
      var a1 = T < 7.2 ? 0 : Math.min(1, (T - 7.2) / 0.9), a2 = T < 8.4 ? 0 : Math.min(1, (T - 8.4) / 0.9);
      pose.ra = (Math.PI / 2 - 0.12) + (-0.25 - (Math.PI / 2 - 0.12)) * a1 + (-Math.PI / 2 - (-0.25)) * a2;
      pose.finger = a2 > 0.6;
      var hand = G.kirillFront(x, cx, feet, s, pose).r;
      var startX = cx + hk * 0.55, startY = feet - Re - 2;
      if (T < 8.4) { var e = Math.min(1, (T - 6.2) / 1.9), ee = e * e * (3 - 2 * e); ex2 = startX + (hand.x + Re * 0.3 - startX) * ee; ey2 = startY + (hand.y - Re * 0.9 - startY) * ee - Math.sin(ee * Math.PI) * hk * 0.25; }
      else { ex2 = hand.x; ey2 = hand.y - Re - 1 + (reduced() ? 0 : Math.sin(t * 6) * 1.2); }
      G.drawEarth(x, ex2, ey2, Re, rot);
      if (T > 8.8 && !reduced()) { x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = 1.5; for (var q = 0; q < 3; q++) { var an = t * 8 + q * 2.1; x.beginPath(); x.arc(ex2, ey2, Re + 4, an, an + 0.9); x.stroke(); } }
      endText(x, W, T);
    }
    function endText(x, W, T) {
      if (T < 11.9) return;
      var y = top + 18; x.fillStyle = 'rgba(0,0,20,.6)'; x.fillRect(0, y - 6, W, 44);
      G.text(x, '1000 ОЧКОВ.', W / 2, y, 11, '#ffd400', 'center');
      G.text(x, 'ТЕПЕРЬ МИР КРУТИТСЯ ВОКРУГ КИРИЛЛА', W / 2, y + 20, W < 330 ? 6 : 7, '#fff', 'center');
      if (T > 13.2) { x.fillStyle = 'rgba(0,0,20,.6)'; x.fillRect(0, y + 42, W, 16); G.text(x, '★ СЕКРЕТНАЯ КОНЦОВКА ОТКРЫТА ★', W / 2, y + 46, 7, '#3cff00', 'center'); }
      if (T > 13.8) { G.button(x, btns, 'ИГРАТЬ СНОВА', W / 2 - 128, bot - 40, 124, 26, function () { g.restart(); }, true); G.button(x, btns, 'В BULANET', W / 2 + 4, bot - 40, 124, 26, function () { if (hooks.exit) hooks.exit(); }, false); }
    }

    g.draw = function () {
      if (!g.s || !g.w) return;
      var now = performance.now() / 1000, dt = Math.min(0.05, now - (lastT || now)); lastT = now;
      var x = g.begin2d(), W = g.Wd, t = now; btns = [];
      top = g.top; bot = g.bot; vh = bot - top; ox = (W - PH.WW) / 2;
      if (g.state === 'egg') { egg.t += dt; drawEgg(x, W, egg.t); return; }
      if (g.state !== 'paused') updCam(dt);
      if (banner) { banner.t -= dt; if (banner.t <= 0) banner = null; }
      floats.forEach(function (f) { f.t -= dt; }); floats = floats.filter(function (f) { return f.t > 0; });
      var alt = PH.h(cam + (top + bot) / 2);
      drawWorld(x, W, t, Math.max(0, alt));
      var pred = drawHint(x);
      g.w.bars.forEach(function (b) { drawBar(x, b, pred && pred.b === b, t); });
      if (g.state !== 'over' || g.overT < 1.2) drawPlayer(x, t);
      fx.forEach(function (p) { x.fillStyle = p.c; x.fillRect(Math.round(p.x + ox), Math.round(p.y - cam), 2, 2); });
      if (g.state !== 'ready') hud(x, W, t);
      if (g.state === 'ready') {
        x.fillStyle = 'rgba(0,0,40,.72)'; x.fillRect(0, top, W, vh);
        var y = top + vh / 2 - 92;
        G.text(x, 'КИРИЛЛ НА ТУРНИКЕ', W / 2, y, 11, '#ffd400', 'center'); G.text(x, 'ДОБЕРИСЬ ДО СОЛНЦА', W / 2, y + 22, 8, '#fff', 'center');
        G.text(x, touch ? 'ДЕРЖИ ПАЛЕЦ — РАСКАЧИВАЙСЯ' : 'ДЕРЖИ ПРОБЕЛ / МЫШЬ — РАСКАЧИВАЙСЯ', W / 2, y + 48, 7, '#cfe', 'center');
        G.text(x, 'ОТПУСТИ — ЛЕТИ К ПЕРЕКЛАДИНЕ', W / 2, y + 60, 7, '#cfe', 'center');
        G.text(x, 'ПРОМАХНУЛСЯ — ЛОВИ НИЖНЮЮ', W / 2, y + 72, 7, '#8aa', 'center');
        G.button(x, btns, 'НАЧАТЬ', W / 2 - 60, y + 92, 120, 26, function () { g.restart(); }, true);
        G.text(x, 'РЕКОРД ' + g.best + ' М' + (g.secret ? '  ★ СЕКРЕТ ОТКРЫТ' : ''), W / 2, y + 128, 7, g.secret ? '#3cff00' : '#8aa', 'center');
      }
      if (g.state === 'paused') g.overlay([['ПАУЗА', 12, '#ffd400'], [touch ? 'НАЖМИ, ЧТОБЫ ПРОДОЛЖИТЬ' : '«ПРОДОЛЖИТЬ» ИЛИ P', 7]]);
      if (g.state === 'over') {
        g.overT += dt; if (g.f) { g.f.vy += PH.GF * dt; g.f.x += g.f.vx * dt; g.f.y += g.f.vy * dt; g.f.rot += g.f.spin * dt; }
        if (g.overT > 0.9) {
          x.fillStyle = 'rgba(0,0,40,.78)'; x.fillRect(0, top, W, vh); var y2 = top + vh / 2 - 70;
          G.text(x, 'СОРВАЛСЯ!', W / 2, y2, 13, '#ff5a48', 'center');
          G.text(x, 'ВЫСОТА: ' + g.score + ' М', W / 2, y2 + 28, 8, '#ffd400', 'center');
          G.text(x, PH.STAGES[g.stage][1], W / 2, y2 + 42, 7, '#cfe', 'center');
          G.text(x, (g.newRecord ? 'НОВЫЙ РЕКОРД!' : 'РЕКОРД: ' + g.best + ' М'), W / 2, y2 + 58, 8, g.newRecord ? '#3cff00' : '#fff', 'center');
          G.text(x, 'ДО СОЛНЦА: ' + Math.max(0, PH.FINAL - g.score) + ' М', W / 2, y2 + 72, 7, '#8aa', 'center');
          G.button(x, btns, 'ЕЩЁ ПОДХОД', W / 2 - 128, y2 + 92, 124, 26, function () { g.restart(); }, true);
          G.button(x, btns, 'ВЫЙТИ', W / 2 + 4, y2 + 92, 124, 26, function () { if (hooks.exit) hooks.exit(); }, false);
        }
      }
    };
    g.begin(); reset(); g.setState('ready');
    return g;
  };

  G.previewTurnik = function (c) {
    var x = c.getContext('2d'); x.imageSmoothingEnabled = false; var s = c.height / 100; x.setTransform(s, 0, 0, s, 0, 0); var W = c.width / s;
    var gr = x.createLinearGradient(0, 0, 0, 100); gr.addColorStop(0, '#081a55'); gr.addColorStop(0.55, '#3d8de0'); gr.addColorStop(1, '#cdeaff'); x.fillStyle = gr; x.fillRect(0, 0, W, 100);
    x.fillStyle = '#ffd25a'; x.beginPath(); x.arc(W * 0.78, 10, 9, 0, 7); x.fill();
    x.fillStyle = '#6a7b99'; x.beginPath(); x.moveTo(0, 100); x.lineTo(W * 0.2, 70); x.lineTo(W * 0.35, 86); x.lineTo(W * 0.55, 64); x.lineTo(W * 0.8, 90); x.lineTo(W, 76); x.lineTo(W, 100); x.fill();
    [[W * .3, 78, '#d8d8d8'], [W * .55, 48, '#d8d8d8'], [W * .78, 44, '#d8d8d8'], [W * .42, 22, '#ffd400']].forEach(function (b) { x.fillStyle = '#000'; x.fillRect(b[0] - 11, b[1] - 1, 22, 3); x.fillStyle = b[2]; x.fillRect(b[0] - 11, b[1] - 1, 22, 2); });
    drawKirill(x, TUCKR, Math.round(W * .44), 50, -0.6, 1);
  };
  G.preview = function (c, kind) { if (kind === 'dino') G.previewDino(c); else if (kind === 'dino404') G.previewDino(c, true); else if (kind === 'escape' && G.previewEscape) G.previewEscape(c); else G.previewTurnik(c); };
})(typeof window !== 'undefined' ? window : globalThis);
