/* ПОБЕГ ОТ ОПЕРАТОРА — раннер на три дорожки. Кирилл убегает от оператора с камерой.
   Главная механика: зелёные зоны ускорения увеличивают отрыв; без них оператор неизбежно догоняет.
   Файл состоит из двух частей: «ядро» (чистая логика, проверяется симуляциями в node) и отрисовка. */
(function (root) {
  /* =====================  ЯДРО  ===================== */
  var C = {
    V0: 6.5, V1: 12, VK: 1500,        // скорость мира, м/с: от V0 плавно к V1
    ZFAR: 32,                         // на каком расстоянии появляются объекты, м
    GAP0: 7, GAPMAX: 15,              // отрыв от оператора, м
    GAIN: 2.5, STREAK: 0.15, STREAK_MAX: 4, // прибавка отрыва за ускорение и за серию
    HITLOSS: 3,                       // потеря отрыва при столкновении
    LANE_T: 0.12,                     // время перехода на соседнюю дорожку, с
    JUMP_V: 5.2, GRAV: 17, CLEAR_Y: 0.35, SLIDE_T: 0.62,
    BOOST_T: 1.3, BOOST_K: 1.12, STUMBLE_T: 0.7, STUMBLE_K: 0.55, INV_T: 1.1,
    PADLEN: 3, PAD_EVERY: 3
  };
  var E = { C: C };
  E.diff = function (d) { return Math.min(1, d / 2000); };
  E.baseV = function (d) { return C.V0 + (C.V1 - C.V0) * (1 - Math.exp(-d / C.VK)); };
  /* с какой скоростью оператор сокращает отрыв, м/с: растёт с дистанцией */
  E.drain = function (d) { return 0.55 + 0.5 * E.diff(d) + 0.15 * Math.max(0, (d - 2000) / 2000); };
  /* время между рядами препятствий, с */
  E.rowT = function (d) { return 1.1 - 0.32 * E.diff(d); };

  function rnd(s) { s.seed = (s.seed * 16807) % 2147483647; return s.seed / 2147483647; }

  E.create = function (seed) {
    var s = { seed: (seed % 2147483646) + 1, t: 0, dist: 0, v: C.V0, gap: C.GAP0, pend: 0,
      lane: 0, lx: 0, y: 0, vy: 0, slideT: 0, wantSlide: false, jumpBuf: 0,
      boostT: 0, stumbleT: 0, invT: 0, pads: 0, missed: 0, hits: 0, streak: 0,
      objs: [], rowN: 0, nextD: 14, lastPad: null, over: false };
    spawn(s); return s;
  };

  function genRow(s) {
    var d = s.nextD, df = E.diff(d), v = E.baseV(d), n = ++s.rowN, i;
    function R() { return rnd(s); }
    function add(lane, kind, dd) { s.objs.push({ d: dd, lane: lane, kind: kind, vr: Math.floor(R() * 5), row: n }); }
    if (n % C.PAD_EVERY === 1) {
      /* ряд с ускорением */
      var p;
      if (s.lastPad === null) p = R() < 0.5 ? -1 : 1;
      else if (R() < 0.8) { var others = [-1, 0, 1].filter(function (l) { return l !== s.lastPad; }); p = others[Math.floor(R() * 2)]; }
      else p = s.lastPad;
      s.lastPad = p;
      /* «страж»: прыжок или подкат прямо перед ускорением; ряд отодвигается, чтобы после предыдущего хватило времени приземлиться */
      var guard = n > 4 && R() < 0.12 + 0.3 * df;
      if (guard) d += v * 0.5;
      s.objs.push({ d: d, lane: p, kind: 'pad', len: C.PADLEN, row: n });
      if (n > 1) {
        var side = [-1, 0, 1].filter(function (l) { return l !== p; });
        if (R() < 0.5) side.reverse();
        if (R() < 0.25 + 0.5 * df) { add(side[0], 'block', d); if (df > 0.5 && R() < 0.25 * df) add(side[1], 'block', d); }
        if (guard) add(p, R() < 0.5 ? 'low' : 'high', d - Math.max(2.2, v * 0.4));
      }
    } else if (d > 30 && R() < 0.4 + 0.45 * df) {
      /* обычный ряд: занято не больше двух дорожек из трёх */
      var lanes = [-1, 0, 1]; for (i = 2; i > 0; i--) { var j = Math.floor(R() * (i + 1)), t = lanes[i]; lanes[i] = lanes[j]; lanes[j] = t; }
      var cnt = R() < 0.15 + 0.4 * df ? 2 : 1;
      for (i = 0; i < cnt; i++) { var k = R(); add(lanes[i], k < 0.5 ? 'block' : k < 0.75 ? 'low' : 'high', d); }
    }
    s.nextD = d + v * E.rowT(d);
  }
  function spawn(s) { while (s.nextD < s.dist + C.ZFAR) genRow(s); }
  E.genRow = genRow;

  E.input = function (s, a) {
    if (s.over) return false;
    if (a === 'left') { if (s.lane > -1) { s.lane--; return true; } return false; }
    if (a === 'right') { if (s.lane < 1) { s.lane++; return true; } return false; }
    if (a === 'jump') { s.slideT = 0; s.wantSlide = false; if (s.y === 0) { s.vy = C.JUMP_V; s.y = 0.0001; return true; } s.jumpBuf = 0.12; return false; }
    if (a === 'slide') { if (s.y > 0) { s.vy = Math.min(s.vy, -9); s.wantSlide = true; } else s.slideT = C.SLIDE_T; return true; }
    return false;
  };

  E.step = function (s, dt) {
    var ev = [], i, o, rel; if (s.over) return ev;
    s.t += dt;
    s.v = E.baseV(s.dist) * (s.stumbleT > 0 ? C.STUMBLE_K : 1) * (s.boostT > 0 ? C.BOOST_K : 1);
    s.dist += s.v * dt;
    s.boostT = Math.max(0, s.boostT - dt); s.stumbleT = Math.max(0, s.stumbleT - dt); s.invT = Math.max(0, s.invT - dt);
    if (s.y === 0) s.slideT = Math.max(0, s.slideT - dt);
    /* дорожка */
    var dl = s.lane - s.lx, st = dt / C.LANE_T; s.lx += Math.abs(dl) <= st ? dl : (dl > 0 ? st : -st);
    /* прыжок */
    if (s.y > 0) { s.vy -= C.GRAV * dt; s.y += s.vy * dt; if (s.y <= 0) { s.y = 0; s.vy = 0; ev.push({ t: 'land' }); if (s.wantSlide) { s.slideT = C.SLIDE_T; s.wantSlide = false; } } }
    if (s.jumpBuf > 0) { s.jumpBuf -= dt; if (s.y === 0) { s.jumpBuf = 0; s.slideT = 0; s.vy = C.JUMP_V; s.y = 0.0001; ev.push({ t: 'jump' }); } }
    /* отрыв: оператор постоянно сокращает дистанцию; ускорения и столкновения меняют её плавно через pend */
    s.gap -= E.drain(s.dist) * dt;
    if (s.pend > 0) { var up = Math.min(s.pend, 6 * dt); s.gap += up; s.pend -= up; }
    else if (s.pend < 0) { var dn = Math.min(-s.pend, 12 * dt); s.gap -= dn; s.pend += dn; }
    if (s.gap > C.GAPMAX) { s.gap = C.GAPMAX; if (s.pend > 0) s.pend = 0; }
    /* объекты */
    for (i = 0; i < s.objs.length; i++) {
      o = s.objs[i]; if (o.done) continue; rel = o.d - s.dist;
      if (o.kind === 'pad') {
        if (rel <= 0.3 && rel + o.len >= -0.3) {
          if (Math.abs(s.lx - o.lane) < 0.5) {
            o.done = true; o.got = true; s.pads++; s.streak++;
            var gain = C.GAIN + Math.min(s.streak - 1, C.STREAK_MAX) * C.STREAK;
            s.pend = Math.max(s.pend, 0) + gain; s.boostT = C.BOOST_T;
            ev.push({ t: 'pad', gain: gain, streak: s.streak });
          }
        } else if (rel + o.len < -0.3) { o.done = true; s.missed++; s.streak = 0; ev.push({ t: 'miss', lane: o.lane }); }
      } else if (rel < -0.45) { o.done = true; }
      else if (rel <= 0.45 && Math.abs(s.lx - o.lane) < 0.5) {
        var hit = o.kind === 'block' || (o.kind === 'low' && s.y < C.CLEAR_Y) || (o.kind === 'high' && !(s.slideT > 0 && s.y === 0));
        if (hit) {
          o.done = true; o.hit = true;
          if (s.invT <= 0) { s.hits++; s.streak = 0; s.stumbleT = C.STUMBLE_T; s.invT = C.INV_T; s.boostT = 0; s.pend = Math.min(s.pend, 0) - C.HITLOSS; ev.push({ t: 'hit', kind: o.kind }); }
        }
      }
    }
    if (s.gap <= 0) { s.gap = 0; s.over = true; ev.push({ t: 'caught' }); }
    spawn(s);
    if (s.objs.length > 60) s.objs = s.objs.filter(function (q) { return q.d + (q.len || 0) > s.dist - 6; });
    return ev;
  };

  root.ESCAPE_CORE = E;
  if (typeof module !== 'undefined') { module.exports = E; return; }

  /* =====================  ОТРИСОВКА  ===================== */
  var BOS = window.BOS, G = BOS.games;
  var H = 330, HY = 96, GY = 258, F0 = 5, LW = 62, PPM = 39, RES_T = 2.7, KS = 3;
  function norm(rows, w) { return rows.map(function (r) { return (r + '..............').slice(0, w); }); }

  /* Кирилл со спины: русые волосы, тёмный свитер, джинсы, светлые кроссовки (тот же персонаж, что на турнике) */
  var KP = { H: '#a3693f', h: '#7a4a2b', S: '#efc3a0', s: '#d6a07f', B: '#8e5a35', E: '#2a1a12', D: '#3d3f46', d: '#2b2c31', W: '#0d0d0d', J: '#2c3650', j: '#1e2538', K: '#d8dad6', G: '#7fd14a' };
  var HEAD = ['', '', '....hHHh', '...HHHHHH', '...HHHHHH', '...HHHHHH', '...hHHHHh', '...ShHHhS', '....hhhh', '....SSSS'];
  var K_STAND = norm(HEAD.concat(['..DDDDDDDD', '.DDDDDDDDDD', '.DDDDDDDDDD', '.DDDddddDDD', '.DDDDDDDDDD', '.SDDDDDDDDS', '..JJJJJJJJ', '..JJJJJJJJ', '..JJJ..JJJ', '..JJJ..JJJ', '..JJJ..JJJ', '..jjj..jjj', '..jjj..jjj', '..KKK..KKK', '..KGK..KGK']), 12);
  var K_RUN = norm(HEAD.concat(['..DDDDDDDD', '.DDDDDDDDDD', 'SDDDDDDDDDD', '.DDDddddDDD', '..DDDDDDDDD', '..DDDDDDDDS', '..JJJJJJJJ', '..JJJJJJJJ', '..JJJ..JJJ', '..jjj..JJJ', '..KKK..JJJ', '..GGG..jjj', '.......jjj', '.......KKK', '.......KGK']), 12);
  var K_JUMP = norm(HEAD.concat(['S.DDDDDDDD.S', '.DDDDDDDDDD', '..DDDDDDDD', '..DDddddDD', '..DDDDDDDD', '..DDDDDDDD', '..JJJJJJJJ', '.JJJJ..JJJJ', '.JJJ....JJJ', '.KKK....KKK', '.GGG....GGG']), 12);
  var K_SLIDE = norm(['....hHHh', '...HHHHHH', '...HHHHHH', '...hHHHHh', '..DDDDDDDD', '.DDDDDDDDDD', 'SDDDddddDDDS', '.DJJJJJJJJD', '.JJJJ..JJJJ', 'JJJ......JJJ', 'KKK......KKK', 'KGK......KGK'], 12);

  /* оператор со спины: кепка, жилет, камера на правом плече */
  var OP = { C: '#1a1a1a', c: '#333', S: '#e2b08c', V: '#7a7440', v: '#55512c', T: '#3a5f85', P: '#34342a', p: '#24241c', B: '#0c0c0c', M: '#6a6a74', m: '#2b2b30', R: '#ff2a2a' };
  var O_TOP = ['', '....CCCC', '...CCCCCC.mmm', '...CCCCCCmMMMm', '...cCCCCcmMRMm', '...SccccSmMMMm', '....SSSS.mMMMm', '..TVVVVVVVTSm', '.TTVVVVVVVTT', '.TTVvVVVvVT', '.TTVVVVVVV', '.ST.VVVVVV', '....VvVVvV', '....VVVVVV', '....PPPPPP', '....PPPPPP'];
  var O_TOP_UP = ['...mmmmmmm', '...mMMMMMm', '..SmMMRMMmS', '..TmMMMMMmT', '..TcCCCCCcT', '..TSccccST', '..TTSSSSTT', '..TVVVVVVVT', '...VVVVVVV', '...VvVVVvV', '...VVVVVVV', '....VVVVVV', '....VvVVvV', '....VVVVVV', '....PPPPPP', '....PPPPPP'];
  var O_LA = ['....PP..PP', '....PP..PP', '....pp..PP', '....BB..PP', '....mm..pp', '........pp', '........BB', '........BB'];
  var O_LB = ['....PP..PP', '....PP..PP', '....PP..pp', '....PP..BB', '....pp..mm', '....pp', '....BB', '....BB'];
  var O_LS = ['....PP..PP', '....PP..PP', '....PP..PP', '....PP..PP', '....pp..pp', '....pp..pp', '....BB..BB', '....BB..BB'];
  var O_RUN_A = norm(O_TOP.concat(O_LA), 14), O_RUN_B = norm(O_TOP.concat(O_LB), 14), O_STAND = norm(O_TOP.concat(O_LS), 14), O_SHOOT = norm(O_TOP_UP.concat(O_LS), 14);

  /* спрайт с привязкой к ступням, без швов при дробном масштабе */
  function spr(x, rows, pal, cx, footY, s, flip, rot) {
    var w = rows[0].length, h = rows.length, ox = -w * s / 2, oy = -h * s;
    if (rot) { x.save(); x.translate(cx, footY); x.rotate(rot); cx = 0; footY = 0; }
    for (var j = 0; j < h; j++) { var r = rows[j], y0 = Math.round(footY + oy + j * s), y1 = Math.round(footY + oy + (j + 1) * s);
      for (var i = 0; i < w; i++) { var c = pal[r[i]]; if (!c) continue; var ii = flip ? w - 1 - i : i, x0 = Math.round(cx + ox + ii * s), x1 = Math.round(cx + ox + (ii + 1) * s);
        x.fillStyle = c; x.fillRect(x0, y0, x1 - x0, y1 - y0); } }
    if (rot) x.restore();
  }
  function hash(n) { return ((Math.imul(n | 0, 2654435761) >>> 0) % 1000) / 1000; }

  G.escape = function (canvas, hooks) {
    var g = new G.Game(canvas, H, hooks); g.minW = 300; g.bg = '#07071f';
    var s, fx = [], floats = [], btns = [], hints = {}, city = G.city(11, 900), stars = [];
    var Fc = F0, shx = 0, shy = 0, cx = 150, T0 = 0, HB = H, opSide = -0.8, opx = 0, gapV = C.GAP0, runPh = 0, lastT = 0, coast = 0, flash = 0, barFx = 0, barCol = '', crit = false, sayT = 0, lastScore = -1, finalDist = 0;
    var touch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    for (var i = 0; i < 50; i++) stars.push([Math.random(), Math.random(), Math.random() > .85]);
    function reduced() { return BOS.reduced && BOS.reduced(); }

    function reset() {
      s = E.create(Math.floor(Math.random() * 1e9) + 1); g.sim = s; g.score = 0; fx = []; floats = []; hints = {};
      opx = 0; opSide = -0.8; gapV = s.gap; coast = 0; flash = 0; barFx = 0; crit = false; sayT = 0; g.overT = 0; lastScore = -1; g.newRecord = false; g.emit();
    }
    function start() { reset(); g.setState('run'); }
    g.restart = start;
    g.release = function () {};

    /* ---------- ввод: один набор обработчиков на canvas, снимается в destroy ---------- */
    function act(a) {
      if (g.state === 'ready') { if (a === 'ok' || a === 'jump') start(); return; }
      if (g.state === 'paused') { if (a === 'ok') g.resume(); return; }
      if (g.state === 'over') { if (a === 'ok' || a === 'jump') { if (g.overT < RES_T) g.overT = RES_T; else if (g.overT > RES_T + 0.35) start(); } return; }
      if (E.input(s, a) && a === 'jump') G.sfx('jump');
    }
    var KEYS = { ArrowLeft: 'left', a: 'left', A: 'left', 'ф': 'left', 'Ф': 'left', ArrowRight: 'right', d: 'right', D: 'right', 'в': 'right', 'В': 'right', ArrowUp: 'jump', w: 'jump', W: 'jump', 'ц': 'jump', 'Ц': 'jump', ' ': 'jump', Spacebar: 'jump', ArrowDown: 'slide', s: 'slide', S: 'slide', 'ы': 'slide', 'Ы': 'slide', Enter: 'ok' };
    function kd(e) {
      var a = KEYS[e.key];
      if (a) { e.preventDefault(); if (!e.repeat) act(a); return; }
      if (e.key === 'p' || e.key === 'P' || e.key === 'з' || e.key === 'З' || e.key === 'Escape') {
        e.preventDefault(); if (e.repeat) return;
        if (g.state === 'run') g.pause(); else if (g.state === 'paused') g.resume(); else if (g.state === 'over' && e.key === 'Escape' && hooks.exit) hooks.exit();
      }
    }
    var ptr = null;
    function logical(e) { var r = canvas.getBoundingClientRect(), k = canvas.width / r.width / g.s; return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k - g.oy }; }
    function pd(e) { if (e.button && e.button !== 0) return; e.preventDefault(); canvas.focus(); try { canvas.setPointerCapture(e.pointerId); } catch (er) {} ptr = { id: e.pointerId, x: e.clientX, y: e.clientY, sw: false }; }
    function pm(e) {
      if (!ptr || ptr.id !== e.pointerId || ptr.sw) return; e.preventDefault();
      var dx = e.clientX - ptr.x, dy = e.clientY - ptr.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
      ptr.sw = true;                                   /* свайп срабатывает сразу, не дожидаясь отпускания */
      if (g.state === 'run') act(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'slide' : 'jump'));
    }
    function pu(e) {
      if (!ptr || ptr.id !== e.pointerId) return; e.preventDefault(); var sw = ptr.sw; ptr = null; if (sw) return;
      var p = logical(e), b = btns.filter(function (q) { return p.x >= q.x && p.x <= q.x + q.w && p.y >= q.y && p.y <= q.y + q.h; })[0];
      if (b) { G.sfx('click'); b.fn(); return; }
      if (g.state === 'over' && g.overT < RES_T && g.overT > 0.6) g.overT = RES_T;
    }
    function pc() { ptr = null; }
    function cm(e) { e.preventDefault(); }
    canvas.addEventListener('keydown', kd); canvas.addEventListener('pointerdown', pd); canvas.addEventListener('pointermove', pm);
    canvas.addEventListener('pointerup', pu); canvas.addEventListener('pointercancel', pc); canvas.addEventListener('contextmenu', cm);
    g.unbind = function () {
      canvas.removeEventListener('keydown', kd); canvas.removeEventListener('pointerdown', pd); canvas.removeEventListener('pointermove', pm);
      canvas.removeEventListener('pointerup', pu); canvas.removeEventListener('pointercancel', pc); canvas.removeEventListener('contextmenu', cm);
    };

    /* ---------- логика кадра ---------- */
    function float(text, c, dy) { floats.push({ text: text, c: c, t: 1.1, y: dy || 0 }); if (floats.length > 4) floats.shift(); }
    g.update = function (dt) {
      var ev = E.step(s, dt);
      for (var i = 0; i < ev.length; i++) { var e = ev[i];
        if (e.t === 'pad') { G.sfx('score'); flash = 0.18; barFx = 0.6; barCol = '#3cff00'; float('+' + e.gain.toFixed(1).replace('.', ',') + ' М' + (e.streak > 1 ? '  СЕРИЯ ×' + e.streak : ''), '#3cff00');
          for (var k = 0; k < 12; k++) fx.push({ x: (Math.random() - .5) * 26, y: -Math.random() * 30, vx: (Math.random() - .5) * 60, vy: -30 - Math.random() * 90, t: 0.5, c: k % 2 ? '#3cff00' : '#eaffd0' }); }
        else if (e.t === 'miss') { barFx = 0.6; barCol = '#ff5a48'; float('УСКОРЕНИЕ ПРОПУЩЕНО', '#ff5a48'); }
        else if (e.t === 'hit') { G.sfx('hit'); barFx = 0.8; barCol = '#ff5a48'; float('СТОЛКНОВЕНИЕ  −' + C.HITLOSS + ' М', '#ff5a48');
          for (var q = 0; q < 10; q++) fx.push({ x: (Math.random() - .5) * 20, y: -20 - Math.random() * 20, vx: (Math.random() - .5) * 160, vy: -60 - Math.random() * 80, t: 0.5, c: '#ffd400' }); }
        else if (e.t === 'land') G.sfx('land');
        else if (e.t === 'jump') G.sfx('jump');
        else if (e.t === 'caught') { finalDist = Math.floor(s.dist); g.score = finalDist; coast = s.v; g.overT = 0; g.setState('over'); g.record(); G.sfx('fall'); }
      }
      if (!s.over) { g.score = s.dist; var sc = Math.floor(s.dist); if (sc !== lastScore) { lastScore = sc; g.emit(); } }
      var c2 = s.gap < 2.5; if (c2 && !crit) { G.sfx('warn'); sayT = 1.6; } crit = c2;
      opx += (s.lx - opx) * Math.min(1, dt * 5);
      runPh += dt * s.v * (s.boostT > 0 ? 1.15 : 0.75);
    };

    /* ---------- проекция ---------- */
    function P(z) { return Fc / (Fc + Math.max(z, 1.2 - Fc)); }
    function sx(l, z) { return cx + shx + l * LW * P(z); }
    function sy(z, h) { return HY + shy + (GY - HY - (h || 0) * PPM) * P(z); }
    function quad(x, c, l1, l2, z1, z2) { x.fillStyle = c; x.beginPath(); x.moveTo(sx(l1, z1), sy(z1)); x.lineTo(sx(l2, z1), sy(z1)); x.lineTo(sx(l2, z2), sy(z2)); x.lineTo(sx(l1, z2), sy(z2)); x.closePath(); x.fill(); }

    /* ---------- препятствия съёмочной площадки (единицы: 1 = 2 px при масштабе 1, дорожка = 31) ---------- */
    function drawOb(x, o, rel) {
      var k = P(rel), bx = sx(o.lane, rel), by = sy(rel), u = 2 * k;
      function r(c, px, py, w, h) { var x0 = Math.round(bx + px * u), y0 = Math.round(by - (py + h) * u); x.fillStyle = c; x.fillRect(x0, y0, Math.max(1, Math.round(bx + (px + w) * u) - x0), Math.max(1, Math.round(by - py * u) - y0)); }
      var a = Math.min(1, (C.ZFAR - rel) / 3); if (o.hit) a *= 0.45; x.globalAlpha = Math.max(0, a);
      r('rgba(0,0,0,.35)', -12, -1, 24, 2);
      if (o.kind === 'block') {
        var v = o.vr % 5;
        if (v === 0) {            /* кофры с оборудованием */
          r('#3a3a46', -12, 0, 24, 13); r('#c9c9d2', -12, 12, 24, 1); r('#c9c9d2', -12, 0, 1, 13); r('#c9c9d2', 11, 0, 1, 13); r('#ffd400', -3, 4, 6, 4);
          r('#4b4b58', -10, 13, 20, 11); r('#c9c9d2', -10, 23, 20, 1); r('#ff5a48', -8, 16, 5, 3); r('#111', 2, 16, 6, 2);
        } else if (v === 1) {     /* камера на штативе */
          r('#888', -1, 0, 2, 20); r('#888', -9, 0, 2, 3); r('#888', -7, 3, 2, 4); r('#888', -5, 7, 2, 4); r('#888', -3, 11, 2, 5);
          r('#888', 7, 0, 2, 3); r('#888', 5, 3, 2, 4); r('#888', 3, 7, 2, 4); r('#888', 1, 11, 2, 5);
          r('#222', -8, 20, 16, 9); r('#444', -8, 28, 16, 1); r('#111', -11, 22, 3, 5); r('#ff2a2a', 4, 25, 2, 2); r('#555', -3, 29, 6, 2);
        } else if (v === 2) {     /* режиссёрское кресло */
          r('#b88a4a', -9, 0, 2, 26); r('#b88a4a', 7, 0, 2, 26); r('#b88a4a', -7, 2, 2, 3); r('#b88a4a', -4, 5, 2, 3); r('#b88a4a', -1, 8, 2, 3); r('#b88a4a', 2, 5, 2, 3); r('#b88a4a', 5, 2, 2, 3);
          r('#a01818', -9, 11, 18, 3); r('#a01818', -9, 19, 18, 7); r('#fff', -5, 21, 10, 1); r('#fff', -3, 23, 6, 1);
        } else if (v === 3) {     /* декорация: фанерная стена с окном */
          r('#2f6f6a', -13, 0, 26, 30); r('#3f8f88', -13, 28, 26, 2); r('#1d4744', -13, 0, 26, 2); r('#f3e2a0', -7, 12, 14, 12); r('#2f6f6a', -1, 12, 2, 12); r('#2f6f6a', -7, 17, 14, 2); r('#8a5a2b', -13, 0, 2, 30); r('#8a5a2b', 11, 0, 2, 30);
        } else {                  /* операторская тележка */
          r('#111', -11, 0, 5, 5); r('#111', 6, 0, 5, 5); r('#666', -10, 1, 3, 3); r('#666', 7, 1, 3, 3); r('#55555f', -13, 4, 26, 4); r('#ffd400', -13, 7, 26, 1);
          r('#777', -2, 8, 4, 12); r('#222', -7, 20, 14, 8); r('#111', -10, 22, 3, 4); r('#333', 3, 8, 7, 7);
        }
      } else if (o.kind === 'low') {
        if (o.vr % 2) {           /* низкий кофр: перепрыгнуть */
          r('#3a3a46', -13, 0, 26, 7); r('#c9c9d2', -13, 6, 26, 1); r('#ffd400', -13, 2, 26, 2); r('#111', -9, 2, 4, 2); r('#111', -1, 2, 4, 2); r('#111', 7, 2, 4, 2);
        } else {                  /* катушка кабеля */
          r('#ff7a1a', -14, 0, 28, 3); r('#111', -10, 0, 2, 3); r('#111', -2, 0, 2, 3); r('#111', 6, 0, 2, 3); r('#ff7a1a', -6, 3, 12, 4); r('#c95a08', -3, 4, 6, 2); r('#ffd400', -14, 3, 3, 1); r('#ffd400', 11, 3, 3, 1);
        }
      } else {                    /* высокое: проскользнуть подкатом */
        r('#777', -15, 0, 2, 34); r('#777', 13, 0, 2, 34); r('#555', -17, 0, 6, 1); r('#555', 11, 0, 6, 1);
        if (o.vr % 2) {           /* стрела крана */
          r('#ffd400', -15, 21, 30, 5); r('#111', -11, 21, 4, 5); r('#111', -3, 21, 4, 5); r('#111', 5, 21, 4, 5); r('#888', -15, 26, 30, 1);
        } else {                  /* софтбокс на перекладине */
          r('#888', -15, 31, 30, 2); r('#222', -11, 21, 22, 10); r('#fffbe0', -10, 22, 20, 8); r('#fff', -8, 24, 16, 4);
        }
      }
      x.globalAlpha = 1;
    }
    function drawPad(x, o, rel, t) {
      var z1 = Math.max(rel, -3), z2 = rel + o.len; if (z2 <= z1) return;
      var a = Math.min(1, (C.ZFAR - rel) / 3), got = o.got, lost = o.done && !got;
      x.globalAlpha = a * (got ? 0.35 : lost ? 0.25 : 0.28); quad(x, lost ? '#666' : '#3cff00', o.lane - 0.5, o.lane + 0.5, z1, z2);
      x.globalAlpha = a * (got ? 0.4 : lost ? 0.4 : 0.92); quad(x, lost ? '#555' : '#22c40a', o.lane - 0.4, o.lane + 0.4, z1, z2);
      if (!lost) { x.globalAlpha = a; for (var j = 0; j < 3; j++) { var zz = rel + ((j + (reduced() ? 0 : t * 3)) % 3) * (o.len / 3); if (zz > z1 && zz + 0.3 < z2) quad(x, '#eaffd0', o.lane - 0.28, o.lane + 0.28, zz, zz + 0.3); } }
      /* маяк: столб света и стрелка, чтобы зону было видно издалека */
      if (!o.done && rel > 1.5) {
        var bx = sx(o.lane, rel + o.len / 2), by = sy(rel + o.len / 2), top = sy(rel + o.len / 2, 2.3), w = Math.max(2, LW * 0.5 * P(rel));
        x.globalAlpha = a * 0.16; x.fillStyle = '#3cff00'; x.fillRect(Math.round(bx - w / 2), Math.round(top), Math.round(w), Math.round(by - top));
        var ar = Math.max(3, Math.round(7 * P(rel) + 2)), ay = Math.round(top - ar - 2 + (reduced() ? 0 : Math.sin(t * 6) * 2));
        x.globalAlpha = a; x.fillStyle = '#3cff00';
        for (var q = 0; q < ar; q++) x.fillRect(Math.round(bx - (ar - q)), ay + q, (ar - q) * 2, 1);
      }
      x.globalAlpha = 1;
    }
    /* вагоны и осветительные вышки вдоль путей */
    function drawSide(x, d, rel, side, idx) {
      var hv = hash(idx * 2 + (side > 0 ? 1 : 0)); if (hv < 0.25) return;
      var l = side * 2.45, k = P(rel), bx = sx(l, rel), by = sy(rel), u = 2 * k, a = Math.min(1, (56 - rel) / 8); if (a <= 0) return;
      function r(c, px, py, w, h) { var x0 = Math.round(bx + px * u), y0 = Math.round(by - (py + h) * u); x.fillStyle = c; x.fillRect(x0, y0, Math.max(1, Math.round(bx + (px + w) * u) - x0), Math.max(1, Math.round(by - py * u) - y0)); }
      x.globalAlpha = a;
      if (hv < 0.45) {            /* осветительная вышка */
        r('#3a3a4a', -1, 0, 2, 52); r('#3a3a4a', -5, 0, 10, 1); r('#222', -7, 52, 14, 6); r('#fff6c0', -6, 53, 12, 4);
        x.globalAlpha = a * 0.10; x.fillStyle = '#fff6c0'; x.beginPath(); x.moveTo(bx - 6 * u, by - 53 * u); x.lineTo(bx + 6 * u, by - 53 * u); x.lineTo(bx + (-side * 40 + 16) * u, by); x.lineTo(bx + (-side * 40 - 16) * u, by); x.closePath(); x.fill();
      } else {                    /* вагон / фургон съёмочной группы */
        var cols = [['#7a2b2b', '#56201f'], ['#2b5a7a', '#1f4057'], ['#3d6b3a', '#2b4c29'], ['#6b5a2b', '#4b3f1e']][Math.floor(hv * 97) % 4];
        var inn = -side * 20, k2 = P(rel + 7), bx2 = sx(l, rel + 7), by2 = sy(rel + 7), u2 = 2 * k2;
        x.fillStyle = cols[1]; x.beginPath(); x.moveTo(bx + inn * u, by - 38 * u); x.lineTo(bx2 + inn * u2, by2 - 38 * u2); x.lineTo(bx2 + inn * u2, by2 - 4 * u2); x.lineTo(bx + inn * u, by - 4 * u); x.closePath(); x.fill();
        r('#111', -17, 0, 7, 5); r('#111', 10, 0, 7, 5); r(cols[0], -20, 4, 40, 34); r(cols[1], -20, 36, 40, 2); r('#c9c9d2', -20, 4, 40, 1); r(cols[1], -1, 5, 2, 30); r('#ffd400', -15, 26, 10, 5); r('#111', -13, 28, 6, 1);
      }
      x.globalAlpha = 1;
    }

    function button(x, label, bx, by, w, h, fn, primary) {
      bx = Math.round(bx); by = Math.round(by);
      x.fillStyle = '#000'; x.fillRect(bx + 2, by + 2, w, h); x.fillStyle = primary ? '#ffd400' : '#c0c0c0'; x.fillRect(bx, by, w, h);
      x.fillStyle = '#fff'; x.fillRect(bx, by, w, 2); x.fillRect(bx, by, 2, h); x.fillStyle = primary ? '#a07a00' : '#666'; x.fillRect(bx, by + h - 2, w, 2); x.fillRect(bx + w - 2, by, 2, h);
      G.text(x, label, bx + w / 2, by + (h - 8) / 2, 8, '#000', 'center');
      btns.push({ x: bx, y: by, w: w, h: h, fn: fn });
    }

    function drawKirill(x, t) {
      var kx = sx(s.lx, 0), ky = sy(0, s.y), pose, flip = false, rot = 0, over = g.state === 'over';
      /* тень */
      x.fillStyle = 'rgba(0,0,0,.4)'; var shw = Math.round(11 * KS - Math.min(14, s.y * 14)); x.fillRect(Math.round(kx - shw / 2), Math.round(sy(0) - 1), shw, 3);
      if (over) { if (g.overT > 1.0 && G.KIRILL) { spr(x, G.KIRILL.FALL, KP, Math.round(kx), Math.round(ky), KS); return; } pose = g.overT > 0.45 ? K_STAND : K_RUN; flip = Math.floor(runPh) % 2 === 1; }
      else if (g.state === 'ready') pose = K_STAND;
      else if (s.y > 0) pose = K_JUMP;
      else if (s.slideT > 0) pose = K_SLIDE;
      else { pose = K_RUN; flip = Math.floor(runPh) % 2 === 1; }
      if (!over && g.state !== 'ready') {
        rot = Math.max(-0.3, Math.min(0.3, (s.lane - s.lx) * 0.42));              /* наклон при смене дорожки */
        if (s.stumbleT > 0) rot += Math.sin(t * 38) * 0.22;
        if (s.invT > 0 && s.stumbleT <= 0 && Math.floor(t * 14) % 2) return;       /* мигание после столкновения */
        if (s.boostT > 0 && !reduced()) {                                         /* световой след */
          x.globalAlpha = 0.5; x.fillStyle = '#3cff00';
          for (var i = 0; i < 4; i++) { var lx = Math.round(kx - 4.5 * KS + i * 3 * KS), ln = 12 + ((i * 7 + Math.floor(t * 20)) % 4) * 6; x.fillRect(lx, Math.round(ky + 2), 2, ln); }
          x.globalAlpha = 1;
        }
      }
      var bob = (pose === K_RUN && g.state === 'run') ? (Math.floor(runPh * 2) % 2) : 0;
      spr(x, pose, KP, Math.round(kx), Math.round(ky - bob), KS, flip, rot);
    }
    function drawOperator(x, t) {
      var over = g.state === 'over', vis = Math.min(gapV, 8);
      if (!over && gapV >= 8.4) return;
      var oz = -0.45 - (vis / 8) * 2.66, off = opSide, sd = opSide < 0 ? 1 : -1;   /* оператор бежит сбоку и не закрывает Кирилла */
      if (over) { var q = Math.min(1, g.overT / 0.45); oz = oz + (-0.38 - oz) * q; }
      var k = P(oz), ox = sx(opx + off, oz), oy = sy(oz), pose;
      if (over) pose = g.overT > 1.0 ? O_SHOOT : g.overT > 0.45 ? O_STAND : (Math.floor(t * 9) % 2 ? O_RUN_A : O_RUN_B);
      else if (g.state === 'ready') pose = O_STAND;
      else { pose = Math.floor(t * (7 + s.v * 0.3)) % 2 ? O_RUN_A : O_RUN_B; oy -= (Math.floor(t * (14 + s.v * 0.6)) % 2) * k * KS / 2; }
      x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(Math.round(ox - 6 * KS * k), Math.round(sy(oz) - 1), Math.round(12 * KS * k), 3);
      spr(x, pose, OP, Math.round(ox), Math.round(oy), KS * k);
      if (over && g.overT > 0.45 && g.overT <= 1.0) {      /* рука на плече Кирилла */
        var kx = sx(s.lx, 0), ky = sy(0);
        x.strokeStyle = OP.T; x.lineWidth = 4; x.beginPath(); x.moveTo(ox + sd * 4 * KS * k, oy - 16 * KS * k); x.lineTo(kx - sd * 4 * KS, ky - 14.5 * KS); x.stroke();
        x.fillStyle = OP.S; x.fillRect(Math.round(kx - sd * 4.5 * KS - 3), Math.round(ky - 16 * KS), 6, 6);
      }
      if (!over && g.state === 'run' && sayT > 0) bubble(x, 'СТОЙ! ОДИН ДУБЛЬ!', ox, oy - 25 * KS * k);
    }
    function bubble(x, text, bx, by) {
      x.font = "7px 'Press Start 2P', 'VT323', monospace"; var w = Math.ceil(x.measureText(text).width) + 10, W = g.Wd;
      var lx = Math.round(Math.max(4, Math.min(W - w - 4, bx - w / 2))), ly = Math.round(Math.max(T0 + 60, by - 16));
      x.fillStyle = '#000'; x.fillRect(lx - 1, ly - 1, w + 2, 16); x.fillStyle = '#fff'; x.fillRect(lx, ly, w, 14); x.fillRect(Math.round(bx) - 2, ly + 14, 4, 3);
      G.text(x, text, lx + 5, ly + 4, 7, '#000');
    }

    function hud(x, W, t) {
      var dist = g.state === 'over' ? finalDist : Math.floor(s.dist);
      G.text(x, 'ДИСТ ' + dist + ' М', 6, T0 + 6, 7, '#fff'); G.text(x, 'РЕКОРД ' + g.best, W - 6, T0 + 6, 7, '#8aa', 'right');
      G.text(x, (g.state === 'over' ? 0 : Math.round(s.v * 3.6)) + ' КМ/Ч', 6, T0 + 17, 7, s.boostT > 0 ? '#3cff00' : s.stumbleT > 0 ? '#ff5a48' : '#ffd400'); G.text(x, 'УСКОРЕНИЙ ' + s.pads, W - 6, T0 + 17, 7, '#3cff00', 'right');
      /* шкала отрыва: Кирилл справа, оператор приближается к нему слева */
      var bw = Math.min(W - 44, 250), bx = Math.round((W - bw) / 2), by = T0 + 31, fr = Math.max(0, Math.min(1, gapV / C.GAPMAX)), col = gapV > 5 ? '#3cff00' : gapV > 2.5 ? '#ffd400' : '#ff5a48';
      var blink = gapV <= 2.5 && Math.floor(t * 6) % 2 && !reduced();
      x.fillStyle = '#000'; x.fillRect(bx - 2, by - 2, bw + 4, 12); x.fillStyle = barFx > 0 ? barCol : '#556'; x.fillRect(bx - 1, by - 1, bw + 2, 10); x.fillStyle = '#12122a'; x.fillRect(bx, by, bw, 8);
      var opX = Math.round(bx + bw - fr * bw);
      x.fillStyle = blink ? '#fff' : col; x.fillRect(opX, by + 2, bx + bw - opX, 4);
      x.fillStyle = 'rgba(255,90,72,.35)'; x.fillRect(Math.round(bx + bw - bw * 2.5 / C.GAPMAX), by, 1, 8);
      /* значок оператора (камера) */
      var cxo = Math.max(bx - 12, opX - 12); x.fillStyle = '#000'; x.fillRect(cxo - 1, by - 3, 14, 14); x.fillStyle = blink ? '#ff2a2a' : '#c9c9d2'; x.fillRect(cxo, by - 1, 9, 8); x.fillRect(cxo + 9, by + 1, 3, 4); x.fillStyle = '#222'; x.fillRect(cxo + 2, by + 1, 5, 4); x.fillStyle = '#ff2a2a'; x.fillRect(cxo + 1, by - 2, 2, 2);
      /* значок Кирилла */
      var kx = bx + bw + 1; x.fillStyle = '#000'; x.fillRect(kx - 1, by - 3, 10, 14); x.fillStyle = KP.H; x.fillRect(kx, by - 2, 8, 5); x.fillStyle = KP.S; x.fillRect(kx + 1, by + 3, 6, 3); x.fillStyle = KP.D; x.fillRect(kx, by + 6, 8, 4);
      G.text(x, 'ОТРЫВ ' + gapV.toFixed(1).replace('.', ',') + ' М', W / 2, by + 13, 7, blink ? '#fff' : col, 'center');
      for (var i = 0; i < floats.length; i++) { var f = floats[i]; x.globalAlpha = Math.min(1, f.t * 2); G.text(x, f.text, W / 2, by + 26 + i * 10 - (1.1 - f.t) * 6, 7, f.c, 'center'); } x.globalAlpha = 1;
    }

    g.draw = function () {
      if (!g.s || !s) return;
      var now = performance.now() / 1000, adt = Math.min(0.05, now - (lastT || now)); lastT = now;
      var x = g.begin2d(), W = g.Wd, t = now, run = g.state === 'run', over = g.state === 'over', red = reduced();
      cx = W / 2; btns = []; T0 = -Math.max(0, g.oy); HB = H - T0;
      /* анимации, не зависящие от шага логики */
      if (run || over) { gapV += (s.gap - gapV) * Math.min(1, adt * 8); flash = Math.max(0, flash - adt); barFx = Math.max(0, barFx - adt); sayT = Math.max(0, sayT - adt);
        floats.forEach(function (f) { f.t -= adt; }); floats = floats.filter(function (f) { return f.t > 0; });
        fx.forEach(function (p) { p.x += p.vx * adt; p.y += p.vy * adt; p.vy += 300 * adt; p.t -= adt; }); fx = fx.filter(function (p) { return p.t > 0; }); }
      if (over) { g.overT += adt; coast = Math.max(0, coast - adt * 22); s.dist += coast * adt; runPh += coast * adt * 0.7; opx += (s.lx - opx) * Math.min(1, adt * 8); }
      var sideT = over ? (opSide < 0 ? -0.62 : 0.62) : s.lane < 0 ? 0.8 : s.lane > 0 ? -0.8 : (opSide < 0 ? -0.8 : 0.8); opSide += (sideT - opSide) * Math.min(1, adt * 6);
      var bk = run && s.boostT > 0 ? Math.min(1, s.boostT / 0.3, (C.BOOST_T - s.boostT) / 0.12 + 0.2) : 0;
      Fc = F0 * (1 - 0.13 * bk * (red ? 0 : 1));
      shx = 0; shy = 0; if (run && !red) { if (s.stumbleT > 0) { shx = Math.sin(t * 60) * 2; shy = Math.cos(t * 47) * 2; } else if (bk > 0) shy = Math.sin(t * 50) * 0.7 * bk; }

      /* небо, город */
      x.fillStyle = '#07071f'; x.fillRect(0, T0, W, HY - T0); x.fillStyle = '#0d0d33'; x.fillRect(0, HY - 30, W, 30);
      stars.forEach(function (st) { x.fillStyle = st[2] ? '#ffd400' : '#9ab'; x.fillRect(Math.floor(st[0] * W), Math.floor(T0 + st[1] * (HY - 20 - T0)), 1, 1); });
      G.drawCity(x, city, 300 + s.lx * 3, HY + Math.round(shy), '#14143f', '#ffd400', W);
      /* земля и пути */
      x.fillStyle = '#0e0e24'; x.fillRect(0, HY + shy, W, HB - HY + 4);
      quad(x, '#1b1b30', -1.62, 1.62, -3, 70);
      var off = s.dist % 1;
      for (var z = 46; z >= -3; z--) quad(x, '#2b2a38', -1.5, 1.5, z - off, z - off + 0.3);
      [-0.5, 0.5].forEach(function (l) { quad(x, '#101022', l - 0.045, l + 0.045, -3, 70); });
      [-1, 0, 1].forEach(function (l) { quad(x, '#8a8aa2', l - 0.31, l - 0.27, -3, 70); quad(x, '#8a8aa2', l + 0.27, l + 0.31, -3, 70); });
      /* вагоны и вышки */
      var i0 = Math.floor((s.dist + 56) / 8), i1 = Math.floor((s.dist - 4) / 8);
      for (var ii = i0; ii >= i1; ii--) { var dd = ii * 8 + 4, rel = dd - s.dist; if (rel < -3.2) continue; drawSide(x, dd, rel, -1, ii); drawSide(x, dd, rel, 1, ii); }
      /* объекты: сначала зоны ускорения, затем препятствия от дальних к ближним */
      var objs = s.objs.slice().sort(function (a, b) { return b.d - a.d; }), n = objs.length, o, r2;
      for (var a1 = 0; a1 < n; a1++) { o = objs[a1]; if (o.kind === 'pad') { r2 = o.d - s.dist; if (r2 < C.ZFAR + 1 && r2 + o.len > -3) drawPad(x, o, r2, t); } }
      for (var a2 = 0; a2 < n; a2++) { o = objs[a2]; if (o.kind !== 'pad') { r2 = o.d - s.dist; if (r2 < C.ZFAR + 1 && r2 >= -0.2) drawOb(x, o, r2);
        /* подсказки при первой встрече */
        if (run && s.dist < 500 && (o.kind === 'low' || o.kind === 'high') && !hints[o.kind] && r2 < 14 && r2 > 2 && Math.abs(o.lane - s.lane) < 0.5) { hints[o.kind] = 1; float(o.kind === 'low' ? (touch ? 'СВАЙП ВВЕРХ — ПРЫЖОК' : '↑ ИЛИ ПРОБЕЛ — ПРЫЖОК') : (touch ? 'СВАЙП ВНИЗ — ПОДКАТ' : '↓ — ПОДКАТ'), '#ffd400'); } } }
      drawKirill(x, t);
      var kx = sx(s.lx, 0), ky = sy(0, s.y);
      fx.forEach(function (p) { x.fillStyle = p.c; x.fillRect(Math.round(kx + p.x), Math.round(ky + p.y), 2, 2); });
      for (var a3 = 0; a3 < n; a3++) { o = objs[a3]; if (o.kind !== 'pad') { r2 = o.d - s.dist; if (r2 < -0.2 && r2 > -3) drawOb(x, o, r2); } }
      drawOperator(x, t);
      /* эффект скорости */
      if (bk > 0 && !red) { x.fillStyle = '#eaffd0'; for (var q = 0; q < 10; q++) { var hh = hash(q * 31 + Math.floor(t * 24)), sd = q % 2 ? 1 : -1, px = cx + sd * (W * 0.28 + hh * W * 0.22), py = HY + 20 + hash(q * 17 + Math.floor(t * 24) * 3) * (HB - HY - 30); x.globalAlpha = 0.5 * bk; x.fillRect(Math.round(px), Math.round(py), Math.round(sd * (10 + hh * 22)), 1); } x.globalAlpha = 1; }
      if (flash > 0) { x.fillStyle = 'rgba(60,255,0,' + (flash * 0.9).toFixed(2) + ')'; x.fillRect(0, T0, W, HB - T0); }
      if (run && gapV < 2.5 && !red) { x.fillStyle = 'rgba(255,42,42,' + (0.10 + 0.08 * Math.sin(t * 10)).toFixed(2) + ')'; x.fillRect(0, T0, W, HB - T0); }

      if (g.state !== 'ready') hud(x, W, t);

      if (g.state === 'ready') {
        x.fillStyle = 'rgba(0,0,40,.74)'; x.fillRect(0, T0, W, HB - T0);
        G.text(x, 'ПОБЕГ ОТ ОПЕРАТОРА', W / 2, 62, W < 330 ? 11 : 13, '#ffd400', 'center');
        G.text(x, 'ОН ПРОСТО ХОТЕЛ СНЯТЬ ОДИН ДУБЛЬ', W / 2, 88, 7, '#fff', 'center');
        G.text(x, 'ЛОВИ ЗЕЛЁНЫЕ ЗОНЫ УСКОРЕНИЯ —', W / 2, 122, 7, '#3cff00', 'center'); G.text(x, 'БЕЗ НИХ ОПЕРАТОР ДОГОНИТ', W / 2, 134, 7, '#3cff00', 'center');
        if (touch) { G.text(x, 'СВАЙП ВЛЕВО / ВПРАВО — ДОРОЖКА', W / 2, 160, 7, '#cfe', 'center'); G.text(x, 'ВВЕРХ — ПРЫЖОК, ВНИЗ — ПОДКАТ', W / 2, 172, 7, '#cfe', 'center'); }
        else { G.text(x, '← → ДОРОЖКА   ↑ / ПРОБЕЛ ПРЫЖОК', W / 2, 160, 7, '#cfe', 'center'); G.text(x, '↓ ПОДКАТ   P — ПАУЗА', W / 2, 172, 7, '#cfe', 'center'); }
        button(x, 'БЕЖАТЬ', W / 2 - 60, 200, 120, 26, start, true);
        G.text(x, 'РЕКОРД ' + g.best + ' М', W / 2, 240, 7, '#8aa', 'center');
      }
      if (g.state === 'paused') { x.fillStyle = 'rgba(0,0,40,.5)'; x.fillRect(0, T0, W, HB - T0); }
      if (g.state === 'paused') g.overlay([['ПАУЗА', 12, '#ffd400'], [touch ? 'НАЖМИ «ПРОДОЛЖИТЬ»' : '«ПРОДОЛЖИТЬ», P ИЛИ ENTER', 7]]);
      if (over) {
        var T = g.overT;
        if (T > 1.0 && T < RES_T) {
          /* видоискатель оператора */
          x.fillStyle = '#fff'; var m = 14, L = 22;
          [[m, T0 + 56, 1, 1], [W - m, T0 + 56, -1, 1], [m, HB - 14, 1, -1], [W - m, HB - 14, -1, -1]].forEach(function (c) { x.fillRect(c[2] > 0 ? c[0] : c[0] - L, c[3] > 0 ? c[1] : c[1] - 2, L, 2); x.fillRect(c[2] > 0 ? c[0] : c[0] - 2, c[3] > 0 ? c[1] : c[1] - L, 2, L); });
          if (Math.floor(t * 2.5) % 2 || red) { x.fillStyle = '#ff2a2a'; x.fillRect(m + 8, T0 + 64, 7, 7); G.text(x, 'REC', m + 19, T0 + 64, 7, '#ff2a2a'); }
          var pop = red ? 1 : Math.min(1, (T - 1.0) / 0.18), size = Math.round(12 + 8 * pop);
          x.fillStyle = 'rgba(0,0,0,.72)'; x.fillRect(Math.round(W / 2 - size * 3.6), 98, Math.round(size * 7.2), size + 12); G.text(x, 'СНЯТО!', W / 2, 104, size, '#ff2a2a', 'center');
          if (T > 1.5) bubble(x, 'КИРИЛЛ, ЕЩЁ ОДИН ДУБЛЬ!', sx(opx + opSide, -0.38), sy(-0.38) - 27 * KS);
        }
        if (T >= RES_T) {
          x.fillStyle = 'rgba(0,0,40,.82)'; x.fillRect(0, T0, W, HB - T0);
          G.text(x, 'СНЯТО!', W / 2, 52, 20, '#ff2a2a', 'center');
          G.text(x, 'ОПЕРАТОР ВСЁ-ТАКИ ДОБИЛСЯ СВОЕГО', W / 2, 84, 7, '#fff', 'center');
          G.text(x, 'ДИСТАНЦИЯ: ' + finalDist + ' М', W / 2, 118, 8, '#ffd400', 'center');
          G.text(x, 'УСКОРЕНИЙ СОБРАНО: ' + s.pads, W / 2, 138, 8, '#3cff00', 'center');
          G.text(x, 'ЛУЧШИЙ РЕЗУЛЬТАТ: ' + g.best + ' М', W / 2, 158, 8, '#cfe', 'center');
          if (g.newRecord) G.text(x, 'НОВЫЙ РЕКОРД!', W / 2, 178, 8, Math.floor(t * 3) % 2 || red ? '#3cff00' : '#fff', 'center');
          button(x, 'ЕЩЁ ДУБЛЬ', W / 2 - 124, 206, 120, 26, start, true);
          button(x, 'ВЫЙТИ', W / 2 + 4, 206, 120, 26, function () { if (hooks.exit) hooks.exit(); }, false);
          if (!touch) G.text(x, 'ENTER — ЕЩЁ ДУБЛЬ · ESC — ВЫЙТИ', W / 2, 246, 7, '#8aa', 'center');
        }
      }
    };
    g.begin(); reset(); g.setState('ready');
    return g;
  };

  G.previewEscape = function (c) {
    var x = c.getContext('2d'); x.imageSmoothingEnabled = false; var sc = c.height / 100; x.setTransform(sc, 0, 0, sc, 0, 0); var W = c.width / sc, cx = W / 2, hy = 30, gy = 82;
    x.fillStyle = '#07071f'; x.fillRect(0, 0, W, 100); G.drawCity(x, G.city(11, 500), 0, hy, '#14143f', '#ffd400', W); x.fillStyle = '#0e0e24'; x.fillRect(0, hy, W, 70);
    function q(col, l1, l2, p1, p2) { x.fillStyle = col; x.beginPath(); x.moveTo(cx + l1 * 30 * p1, hy + (gy - hy) * p1); x.lineTo(cx + l2 * 30 * p1, hy + (gy - hy) * p1); x.lineTo(cx + l2 * 30 * p2, hy + (gy - hy) * p2); x.lineTo(cx + l1 * 30 * p2, hy + (gy - hy) * p2); x.fill(); }
    q('#1b1b30', -1.6, 1.6, 1.5, 0.05); for (var i = 0; i < 12; i++) { var p = 1.5 / (1 + i * 0.45); q('#2b2a38', -1.5, 1.5, p, p * 0.94); }
    [-1, 0, 1].forEach(function (l) { q('#8a8aa2', l - 0.31, l - 0.26, 1.5, 0.05); q('#8a8aa2', l + 0.26, l + 0.31, 1.5, 0.05); });
    q('#22c40a', 0.6, 1.4, 0.62, 0.42); q('#eaffd0', 0.75, 1.25, 0.55, 0.52); q('#3a3a46', -1.35, -0.65, 0.5, 0.5);
    x.fillStyle = '#3a3a46'; x.fillRect(Math.round(cx - 40 * 0.5), Math.round(hy + 52 * 0.5 - 12), 11, 12); x.fillStyle = '#ffd400'; x.fillRect(Math.round(cx - 40 * 0.5) + 3, Math.round(hy + 52 * 0.5 - 8), 5, 3);
    spr(x, K_RUN, KP, cx, gy, 1); spr(x, O_RUN_A, OP, cx - 22, 118, 2);
  };
})(typeof window !== 'undefined' ? window : globalThis);
