/* ПОБЕГ ОТ ОПЕРАТОРА — раннер на три дорожки. Кирилл убегает от оператора с камерой.
   Главная механика: зелёные зоны ускорения увеличивают отрыв; без них оператор неизбежно догоняет.
   Файл состоит из двух частей: «ядро» (чистая логика, проверяется симуляциями в node) и отрисовка. */
(function (root) {
  /* =====================  ЯДРО  ===================== */
  /* Честная модель погони: оператор приближается только из-за ошибок игрока (пропуск ускорения, столкновение)
     плюс небольшой постоянный «шаг» 0,3 м/с, который с запасом перекрывают регулярные ускорения.
     Скрытого роста скорости оператора со временем нет. Забег конечен: 2500 м до «Оскара». */
  var C = {
    V0: 6.5, V1: 12.5, FINISH: 2500, PLANE: 2000,
    STAGES: [0, 500, 1000, 1500, 2000, 2250],
    ZFAR: 32, GAP0: 7, GAPMAX: 15,
    GAIN: 2.5, STREAK: 0.15, STREAK_MAX: 4,       // прибавка отрыва за ускорение и за серию
    DRAIN: 0.3,                                    // постоянное сближение, м/с (не растёт со временем)
    MISS0: 1.5, MISS1: 2.5,                        // пропуск ускорения: штраф в начале и в конце пути
    HIT0: 3, HIT1: 4.5,                            // столкновение: потеря отрыва
    LANE_T: 0.12, JUMP_V: 5.2, GRAV: 17, CLEAR_Y: 0.35, SLIDE_T: 0.62,
    BOOST_T: 1.3, BOOST_K: 1.12, STUMBLE_T: 0.7, STUMBLE_K: 0.55, INV_T: 1.1,
    PADLEN: 3, PAD_EVERY: 3
  };
  var E = { C: C };
  E.prog = function (d) { return Math.max(0, Math.min(1, d / C.FINISH)); };
  E.diff = function (d) { return Math.min(1, d / 2000); };
  E.baseV = function (d) { return C.V0 + (C.V1 - C.V0) * Math.pow(E.prog(d), 0.9); };
  E.drain = function () { return C.DRAIN; };
  E.miss = function (d) { return C.MISS0 + (C.MISS1 - C.MISS0) * E.prog(d); };
  E.hitLoss = function (d) { return C.HIT0 + (C.HIT1 - C.HIT0) * E.prog(d); };
  E.rowT = function (d) { return 1.1 - 0.32 * E.diff(d); };
  E.stageOf = function (d) { var k = 0; for (var i = 0; i < C.STAGES.length; i++) if (d >= C.STAGES[i]) k = i; return k; };
  E.STAGE_NAMES = ['СЪЁМОЧНАЯ ПЛОЩАДКА', 'КИНОСТУДИЯ', 'ГОРОД', 'АЭРОПОРТ', 'ГОЛЛИВУД', 'КРАСНАЯ ДОРОЖКА'];

  function rnd(s) { s.seed = (s.seed * 16807) % 2147483647; return s.seed / 2147483647; }

  E.create = function (seed) {
    var s = { seed: (seed % 2147483646) + 1, t: 0, dist: 0, v: C.V0, gap: C.GAP0, up: 0, dnSlow: 0, dnFast: 0,
      lane: 0, lx: 0, y: 0, vy: 0, slideT: 0, wantSlide: false, jumpBuf: 0,
      boostT: 0, stumbleT: 0, invT: 0, pads: 0, missed: 0, hits: 0, streak: 0, bestStreak: 0,
      objs: [], rowN: 0, nextD: 14, lastPad: null, over: false, won: false, stage: 0, planeDone: false };
    spawn(s); return s;
  };

  function genRow(s) {
    var d = s.nextD, df = E.diff(d), v = E.baseV(d), n = ++s.rowN, i;
    if (d >= C.FINISH - 60) { s.nextD = 1e9; return; }                         /* финишная прямая — пусто */
    if (d > C.PLANE - 14 && d < C.PLANE + 16) { s.nextD = C.PLANE + 16; return; } /* стык перелёта — пусто */
    var obstacles = d < C.FINISH - 90;
    function R() { return rnd(s); }
    function add(lane, kind, dd) { if (obstacles) s.objs.push({ d: dd, lane: lane, kind: kind, vr: Math.floor(R() * 5), row: n }); }
    if (n % C.PAD_EVERY === 1) {
      var p;
      if (s.lastPad === null) p = R() < 0.5 ? -1 : 1;
      else if (R() < 0.8) { var others = [-1, 0, 1].filter(function (l) { return l !== s.lastPad; }); p = others[Math.floor(R() * 2)]; }
      else p = s.lastPad;
      s.lastPad = p;
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
      var lanes = [-1, 0, 1]; for (i = 2; i > 0; i--) { var j = Math.floor(R() * (i + 1)), t = lanes[i]; lanes[i] = lanes[j]; lanes[j] = t; }
      var cnt = R() < 0.15 + 0.4 * df ? 2 : 1;
      for (i = 0; i < cnt; i++) { var k = R(); add(lanes[i], k < 0.5 ? 'block' : k < 0.75 ? 'low' : 'high', d); }
    }
    s.nextD = d + v * E.rowT(d);
  }
  function spawn(s) { while (s.nextD < s.dist + C.ZFAR) genRow(s); }
  E.genRow = genRow;

  E.input = function (s, a) {
    if (s.over || s.won) return false;
    if (a === 'left') { if (s.lane > -1) { s.lane--; return true; } return false; }
    if (a === 'right') { if (s.lane < 1) { s.lane++; return true; } return false; }
    if (a === 'jump') { s.slideT = 0; s.wantSlide = false; if (s.y === 0) { s.vy = C.JUMP_V; s.y = 0.0001; return true; } s.jumpBuf = 0.12; return false; }
    if (a === 'slide') { if (s.y > 0) { s.vy = Math.min(s.vy, -9); s.wantSlide = true; } else s.slideT = C.SLIDE_T; return true; }
    return false;
  };

  E.step = function (s, dt) {
    var ev = [], i, o, rel; if (s.over || s.won) return ev;
    s.t += dt;
    s.v = E.baseV(s.dist) * (s.stumbleT > 0 ? C.STUMBLE_K : 1) * (s.boostT > 0 ? C.BOOST_K : 1);
    s.dist += s.v * dt;
    s.boostT = Math.max(0, s.boostT - dt); s.stumbleT = Math.max(0, s.stumbleT - dt); s.invT = Math.max(0, s.invT - dt);
    if (s.y === 0) s.slideT = Math.max(0, s.slideT - dt);
    var dl = s.lane - s.lx, st = dt / C.LANE_T; s.lx += Math.abs(dl) <= st ? dl : (dl > 0 ? st : -st);
    if (s.y > 0) { s.vy -= C.GRAV * dt; s.y += s.vy * dt; if (s.y <= 0) { s.y = 0; s.vy = 0; ev.push({ t: 'land' }); if (s.wantSlide) { s.slideT = C.SLIDE_T; s.wantSlide = false; } } }
    if (s.jumpBuf > 0) { s.jumpBuf -= dt; if (s.y === 0) { s.jumpBuf = 0; s.slideT = 0; s.vy = C.JUMP_V; s.y = 0.0001; ev.push({ t: 'jump' }); } }
    /* отрыв: постоянный небольшой шаг оператора + плавное применение бонусов и штрафов */
    s.gap -= E.drain() * dt;
    var a1 = Math.min(s.up, 6 * dt); s.gap += a1; s.up -= a1;
    var a2 = Math.min(s.dnSlow, 2.5 * dt); s.gap -= a2; s.dnSlow -= a2;
    var a3 = Math.min(s.dnFast, 12 * dt); s.gap -= a3; s.dnFast -= a3;
    if (s.gap > C.GAPMAX) { s.gap = C.GAPMAX; s.up = 0; }
    for (i = 0; i < s.objs.length; i++) {
      o = s.objs[i]; if (o.done) continue; rel = o.d - s.dist;
      if (o.kind === 'pad') {
        if (rel <= 0.3 && rel + o.len >= -0.3) {
          if (Math.abs(s.lx - o.lane) < 0.5) {
            o.done = true; o.got = true; s.pads++; s.streak++; s.bestStreak = Math.max(s.bestStreak, s.streak);
            var gain = C.GAIN + Math.min(s.streak - 1, C.STREAK_MAX) * C.STREAK;
            s.up += gain; s.dnSlow = Math.max(0, s.dnSlow - gain * 0.5); s.boostT = C.BOOST_T;
            ev.push({ t: 'pad', gain: gain, streak: s.streak });
          }
        } else if (rel + o.len < -0.3) { o.done = true; s.missed++; s.streak = 0; s.dnSlow += E.miss(o.d); ev.push({ t: 'miss', lane: o.lane }); }
      } else if (rel < -0.45) { o.done = true; }
      else if (rel <= 0.45 && Math.abs(s.lx - o.lane) < 0.5) {
        var hit = o.kind === 'block' || (o.kind === 'low' && s.y < C.CLEAR_Y) || (o.kind === 'high' && !(s.slideT > 0 && s.y === 0));
        if (hit) {
          o.done = true; o.hit = true;
          if (s.invT <= 0) { s.hits++; s.streak = 0; s.stumbleT = C.STUMBLE_T; s.invT = C.INV_T; s.boostT = 0; s.up = 0; s.dnFast += E.hitLoss(s.dist); ev.push({ t: 'hit', kind: o.kind }); }
        }
      }
    }
    var stg = E.stageOf(s.dist); if (stg !== s.stage) { s.stage = stg; ev.push({ t: 'stage', n: stg }); }
    if (!s.planeDone && s.dist >= C.PLANE) { s.planeDone = true; ev.push({ t: 'plane' }); }
    if (s.gap <= 0) { s.gap = 0; s.over = true; ev.push({ t: 'caught' }); }
    else if (s.dist >= C.FINISH) { s.dist = C.FINISH; s.won = true; ev.push({ t: 'finish' }); }
    spawn(s);
    if (s.objs.length > 60) s.objs = s.objs.filter(function (q) { return q.d + (q.len || 0) > s.dist - 6; });
    return ev;
  };

  root.ESCAPE_CORE = E;
  if (typeof module !== 'undefined') { module.exports = E; return; }

  /* =====================  ОТРИСОВКА  ===================== */
  var BOS = window.BOS, G = BOS.games;
  var H = 330, HY = 96, GY = 258, F0 = 5, LW = 62, PPM = 39, RES_T = 1.9, KS = 3;
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
  /* оператор анфас (для финала) */
  var O_FRONT = norm(['....CCCC', '...CCCCCC', '..CCCCCCCC', '...SSSSSS', '...SESSES', '...SSSSSS', '....SSSS', '..TVVVVVVT', '.TTVVVVVVTT', '.TTVvVVvVTT', '.TTVVVVVVTT', '.SSVVVVVVSS', '...VVVVVV', '...PPPPPP', '...PP..PP', '...PP..PP', '...PP..PP', '...pp..pp', '...BB..BB', '..BBB..BBB'], 12);
  var spr = G.spr;
  function hash(n) { return ((Math.imul(n | 0, 2654435761) >>> 0) % 1000) / 1000; }
  function hexc(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
  function mixc(a, b, t) { var A = hexc(a), B = hexc(b); return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * t) + ',' + Math.round(A[1] + (B[1] - A[1]) * t) + ',' + Math.round(A[2] + (B[2] - A[2]) * t) + ')'; }

  /* темы этапов: небо (верх/низ), земля, полотно, шпалы/разметка, рельсы/линии */
  var TH = [
    { sky: ['#07071f', '#16163f'], ground: '#0e0e24', bed: '#1b1b30', sl: '#2b2a38', rail: '#8a8aa2', city: ['#14143f', '#ffd400'] },
    { sky: ['#120e18', '#241c2c'], ground: '#17141c', bed: '#262230', sl: '#3a3442', rail: '#9a96a8', city: ['#1c1824', '#ff9a3c'], indoor: true },
    { sky: ['#0a0828', '#3a1248'], ground: '#121220', bed: '#24242e', sl: '#e6e6f0', rail: '#3a3a48', city: ['#1a1036', '#ff4fd8'], road: true },
    { sky: ['#24346a', '#e8925c'], ground: '#3a3a44', bed: '#55555f', sl: '#ffd400', rail: '#44444c', city: ['#2a2f52', '#ffe08a'], road: true },
    { sky: ['#ff6a4a', '#ffd48a'], ground: '#a8794a', bed: '#4a4a54', sl: '#f0f0f0', rail: '#3e3e46', city: ['#7a3a5a', '#ffe9b0'], road: true, hills: true },
    { sky: ['#04020c', '#1c0a26'], ground: '#0c0612', bed: '#a3101e', sl: '#8a0a18', rail: '#ffd400', city: ['#150a22', '#ffd400'], carpet: true }
  ];
  /* плавная смена окружения у границы этапа */
  function theme(d) {
    var k = E.stageOf(d), a = TH[k], nb = C.STAGES[k + 1];
    if (nb && d > nb - 45) { var t = (d - (nb - 45)) / 45, b = TH[k + 1]; return { k: k, t: t, sky: [mixc(a.sky[0], b.sky[0], t), mixc(a.sky[1], b.sky[1], t)], ground: mixc(a.ground, b.ground, t), bed: mixc(a.bed, b.bed, t), sl: mixc(a.sl, b.sl, t), rail: mixc(a.rail, b.rail, t), city: t < 0.5 ? a.city : b.city, a: a, b: b }; }
    return { k: k, t: 0, sky: a.sky, ground: a.ground, bed: a.bed, sl: a.sl, rail: a.rail, city: a.city, a: a, b: a };
  }

  G.escape = function (canvas, hooks) {
    var g = new G.Game(canvas, H, hooks); g.minW = 300; g.bg = '#07071f'; g.song = 'escape';
    var s, fx = [], floats = [], btns = [], hints = {}, city = G.city(11, 900), stars = [];
    var Fc = F0, shx = 0, shy = 0, cx = 150, T0 = 0, HB = H, opSide = -0.8, opx = 0, gapV = C.GAP0, runPh = 0, lastT = 0, coast = 0, flash = 0, barFx = 0, barCol = '', crit = false, sayT = 0, lastScore = -1, finalDist = 0;
    var banner = null, cut = null, win = null;
    var touch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    for (var i = 0; i < 50; i++) stars.push([Math.random(), Math.random(), Math.random() > .85]);
    function reduced() { return BOS.reduced && BOS.reduced(); }
    g.bestTime = BOS.store('rec-escape-time') || 0;

    function reset() {
      s = E.create(Math.floor(Math.random() * 1e9) + 1); g.sim = s; g.score = 0; fx = []; floats = []; hints = {};
      opx = 0; opSide = -0.8; gapV = s.gap; coast = 0; flash = 0; barFx = 0; crit = false; sayT = 0; g.overT = 0; lastScore = -1; g.newRecord = false; g.newTime = false;
      banner = { t: 2.4, n: 0 }; cut = null; win = null; g.emit();
    }
    function start() { reset(); g.setState('run'); if (BOS.audio) { BOS.audio.set('stage', 0, g); BOS.audio.set('tension', 0, g); } }
    g.restart = start;
    g.release = function () {};

    /* ---------- ввод (обработчики ставятся один раз и снимаются в destroy) ---------- */
    function act(a) {
      if (g.state === 'ready') { if (a === 'ok' || a === 'jump') start(); return; }
      if (g.state === 'paused') { if (a === 'ok') g.resume(); return; }
      if (g.state === 'over') { if (a === 'ok' || a === 'jump') { if (g.overT < RES_T) g.overT = RES_T; else if (g.overT > RES_T + 0.3) start(); } return; }
      if (g.state === 'win') { if ((a === 'ok' || a === 'jump') && win) { if (win.t < 9) win.t = 9; else if (win.t > 9.3) start(); } return; }
      if (cut) return;
      if (E.input(s, a) && a === 'jump') G.sfx('jump');
    }
    g.act = act;
    var KEYS = { ArrowLeft: 'left', a: 'left', A: 'left', 'ф': 'left', 'Ф': 'left', ArrowRight: 'right', d: 'right', D: 'right', 'в': 'right', 'В': 'right', ArrowUp: 'jump', w: 'jump', W: 'jump', 'ц': 'jump', 'Ц': 'jump', ' ': 'jump', Spacebar: 'jump', ArrowDown: 'slide', s: 'slide', S: 'slide', 'ы': 'slide', 'Ы': 'slide', Enter: 'ok' };
    function kd(e) {
      var a = KEYS[e.key];
      if (a) { e.preventDefault(); if (!e.repeat) act(a); return; }
      if (e.key === 'p' || e.key === 'P' || e.key === 'з' || e.key === 'З' || e.key === 'Escape') {
        e.preventDefault(); if (e.repeat) return;
        if (g.state === 'run') g.pause(); else if (g.state === 'paused') g.resume(); else if ((g.state === 'over' || g.state === 'win') && e.key === 'Escape' && hooks.exit) hooks.exit();
      }
    }
    var ptr = null;
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
      var b = G.hitBtn(g, btns, e);
      if (b) { G.sfx('click'); b.fn(); return; }
      if (g.state === 'paused') { g.resume(); return; }
      if (g.state === 'over' && g.overT < RES_T && g.overT > 0.5) g.overT = RES_T;
      if (g.state === 'win' && win && win.t > 2 && win.t < 9) win.t = 9;
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
    function float(text, c) { floats.push({ text: text, c: c, t: 1.1 }); if (floats.length > 4) floats.shift(); }
    function music(k, v) { if (BOS.audio) BOS.audio.set(k, v, g); }
    g.update = function (dt) {
      if (cut) { cut.t += dt; if (cut.t >= cut.dur) { cut = null; banner = { t: 2.4, n: 4 }; } return; }
      var ev = E.step(s, dt), A = BOS.audio;
      for (var i = 0; i < ev.length; i++) { var e = ev[i];
        if (e.t === 'pad') { G.sfx('boost'); if (A) { A.sting('pad', g); var c = A.ctx(); if (c) music('boostUntil', c.currentTime + 60 / 172 * 8); }
          flash = 0.18; barFx = 0.6; barCol = '#3cff00'; float('+' + e.gain.toFixed(1).replace('.', ',') + ' М' + (e.streak > 1 ? '  СЕРИЯ ×' + e.streak : ''), '#3cff00');
          for (var k = 0; k < 12; k++) fx.push({ x: (Math.random() - .5) * 26, y: -Math.random() * 30, vx: (Math.random() - .5) * 60, vy: -30 - Math.random() * 90, t: 0.5, c: k % 2 ? '#3cff00' : '#eaffd0' }); }
        else if (e.t === 'miss') { barFx = 0.6; barCol = '#ff5a48'; float('УСКОРЕНИЕ ПРОПУЩЕНО', '#ff5a48'); }
        else if (e.t === 'hit') { G.sfx('stumble'); G.sfx('hit'); barFx = 0.8; barCol = '#ff5a48'; float('СТОЛКНОВЕНИЕ  −' + E.hitLoss(s.dist).toFixed(1).replace('.', ',') + ' М', '#ff5a48');
          for (var q = 0; q < 10; q++) fx.push({ x: (Math.random() - .5) * 20, y: -20 - Math.random() * 20, vx: (Math.random() - .5) * 160, vy: -60 - Math.random() * 80, t: 0.5, c: '#ffd400' }); }
        else if (e.t === 'land') G.sfx('land');
        else if (e.t === 'jump') G.sfx('jump');
        else if (e.t === 'stage') { if (e.n !== 4) banner = { t: 2.4, n: e.n }; music('stage', e.n); if (A) A.sting('level', g); }
        else if (e.t === 'plane') { cut = { t: 0, dur: reduced() ? 1.2 : 2.8 }; G.sfx('whoosh'); }
        else if (e.t === 'caught') { finalDist = Math.floor(s.dist); g.score = finalDist; coast = s.v; g.overT = 0; g.setState('over'); g.record(); if (A) { A.stop(g, 'cut'); A.sfx('clapper'); setTimeout(function () { A.sfx('camstop'); }, 450); } }
        else if (e.t === 'finish') { finalDist = C.FINISH; g.score = finalDist; win = { t: 0 }; g.setState('win'); g.record();
          var tm = Math.round(s.t); if (!g.bestTime || tm < g.bestTime) { g.bestTime = tm; g.newTime = true; BOS.store('rec-escape-time', tm); }
          BOS.store('escape-oscar', (BOS.store('escape-oscar') || 0) + 1);
          if (A) { A.stop(g, 'fade'); setTimeout(function () { A.sting('fanfare'); }, 1900); setTimeout(function () { A.sfx('applause'); }, 2600); } }
      }
      if (!s.over && !s.won) { g.score = s.dist; var sc = Math.floor(s.dist); if (sc !== lastScore) { lastScore = sc; g.emit(); } }
      var c2 = s.gap < 2.5; if (c2 && !crit) { G.sfx('warn'); sayT = 1.6; } crit = c2;
      music('tension', Math.max(0, Math.min(1, (4.5 - s.gap) / 3)));
      opx += (s.lx - opx) * Math.min(1, dt * 5);
      runPh += dt * s.v * (s.boostT > 0 ? 1.15 : 0.75);
    };

    /* ---------- проекция ---------- */
    function P(z) { return Fc / (Fc + Math.max(z, 1.2 - Fc)); }
    function sx(l, z) { return cx + shx + l * LW * P(z); }
    function sy(z, h) { return HY + shy + (GY - HY - (h || 0) * PPM) * P(z); }
    function quad(x, c, l1, l2, z1, z2) { x.fillStyle = c; x.beginPath(); x.moveTo(sx(l1, z1), sy(z1)); x.lineTo(sx(l2, z1), sy(z1)); x.lineTo(sx(l2, z2), sy(z2)); x.lineTo(sx(l1, z2), sy(z2)); x.closePath(); x.fill(); }
    function painter(x, l, rel, sc) {           /* рисование в «единицах объекта» (1 = 2 px вблизи) */
      var k = P(rel), bx = sx(l, rel), by = sy(rel), u = 2 * k * (sc || 1);
      return function (c, px, py, w, h) { var x0 = Math.round(bx + px * u), y0 = Math.round(by - (py + h) * u); x.fillStyle = c; x.fillRect(x0, y0, Math.max(1, Math.round(bx + (px + w) * u) - x0), Math.max(1, Math.round(by - py * u) - y0)); };
    }

    /* ---------- препятствия: свои на каждом этапе ---------- */
    function drawOb(x, o, rel) {
      var r = painter(x, o.lane, rel), st = E.stageOf(o.d), v = o.vr, a = Math.min(1, (C.ZFAR - rel) / 3); if (o.hit) a *= 0.45; x.globalAlpha = Math.max(0, a);
      r('rgba(0,0,0,.35)', -12, -1, 24, 2);
      if (o.kind === 'block') OB_BLOCK[st](r, v); else if (o.kind === 'low') OB_LOW[st](r, v); else { r('#777', -15, 0, 2, 34); r('#777', 13, 0, 2, 34); r('#555', -17, 0, 6, 1); r('#555', 11, 0, 6, 1); OB_HIGH[st](r, v); }
      x.globalAlpha = 1;
    }
    var OB_BLOCK = [
      function (r, v) { if (v % 3 === 0) { r('#3a3a46', -12, 0, 24, 13); r('#c9c9d2', -12, 12, 24, 1); r('#ffd400', -3, 4, 6, 4); r('#4b4b58', -10, 13, 20, 11); r('#c9c9d2', -10, 23, 20, 1); r('#ff5a48', -8, 16, 5, 3); }
        else if (v % 3 === 1) { r('#888', -1, 0, 2, 20); r('#888', -9, 0, 2, 3); r('#888', -7, 3, 2, 4); r('#888', -5, 7, 2, 4); r('#888', 7, 0, 2, 3); r('#888', 5, 3, 2, 4); r('#888', 3, 7, 2, 4); r('#222', -8, 20, 16, 9); r('#111', -11, 22, 3, 5); r('#ff2a2a', 4, 25, 2, 2); }
        else { r('#b88a4a', -9, 0, 2, 26); r('#b88a4a', 7, 0, 2, 26); r('#b88a4a', -4, 5, 2, 3); r('#b88a4a', 2, 5, 2, 3); r('#a01818', -9, 11, 18, 3); r('#a01818', -9, 19, 18, 7); r('#fff', -5, 21, 10, 1); } },
      function (r, v) { if (v % 2) { r('#8a5a2b', -12, 0, 24, 10); r('#a8743c', -12, 10, 24, 10); r('#6a4420', -12, 9, 24, 1); r('#222', -6, 3, 12, 2); r('#222', -5, 13, 10, 2); r('#8a5a2b', -9, 20, 18, 9); }
        else { r('#111', -11, 0, 5, 5); r('#111', 6, 0, 5, 5); r('#55555f', -13, 4, 26, 4); r('#ffd400', -13, 7, 26, 1); r('#2f6f6a', -11, 8, 22, 20); r('#3f8f88', -11, 26, 22, 2); r('#f3e2a0', -6, 14, 12, 8); } },
      function (r, v) { var col = ['#d7263d', '#ffd400', '#2a7fd8', '#e8e8f0', '#3cc46a'][v]; r('#111', -12, 0, 5, 4); r('#111', 7, 0, 5, 4); r(col, -13, 3, 26, 12); r(col, -10, 15, 20, 7); r('#9fd8ff', -8, 16, 16, 5); r('#ff2a2a', -12, 8, 4, 3); r('#ff2a2a', 8, 8, 4, 3); r('#222', -5, 5, 10, 3); if (v === 1) { r('#111', -3, 22, 6, 2); r('#fff', -2, 22, 4, 1); } },
      function (r, v) { if (v % 2) { r('#9aa0aa', -12, 0, 2, 22); r('#9aa0aa', 10, 0, 2, 22); r('#9aa0aa', -12, 2, 24, 2); r('#2a5fa8', -10, 4, 9, 8); r('#d7263d', 1, 4, 9, 10); r('#3a3a3a', -8, 12, 14, 7); r('#ffd400', -6, 19, 10, 3); }
        else { r('#222', -2, 0, 4, 18); r('#111', -12, 18, 24, 12); r('#ffd400', -10, 26, 20, 2); r('#ffd400', -10, 22, 14, 2); r('#ffd400', -10, 19, 17, 1); } },
      function (r, v) { if (v % 2) { r('#7a5a3a', -9, 0, 18, 8); r('#6a4a2a', -9, 7, 18, 1); r('#8a6a3a', -1, 8, 2, 26); r('#3a8a3a', -12, 32, 24, 3); r('#3a8a3a', -8, 35, 16, 2); r('#2f7a2f', -14, 29, 6, 3); r('#2f7a2f', 8, 29, 6, 3); }
        else { r('#111', -12, 0, 5, 4); r('#111', 7, 0, 5, 4); r('#e8e8f0', -13, 4, 26, 20); r('#c8c8d0', -13, 22, 26, 2); r('#ff6a4a', -13, 12, 26, 3); r('#333', -9, 14, 7, 6); } },
      function (r, v) { r('#111', -5, 0, 4, 14); r('#111', 1, 0, 4, 14); r('#1a1a1a', -6, 14, 12, 12); r('#e2b08c', -3, 26, 6, 5); r('#1a1a1a', -4, 30, 8, 2); r('#222', 4, 18, 8, 6); r('#ccc', 9, 20, 3, 2); if (Math.floor(performance.now() / 180 + v) % 4 === 0) { r('#fff', 7, 17, 8, 8); } }
    ];
    var OB_LOW = [
      function (r, v) { if (v % 2) { r('#3a3a46', -13, 0, 26, 7); r('#c9c9d2', -13, 6, 26, 1); r('#ffd400', -13, 2, 26, 2); } else { r('#ff7a1a', -14, 0, 28, 3); r('#111', -10, 0, 2, 3); r('#111', -2, 0, 2, 3); r('#111', 6, 0, 2, 3); r('#ff7a1a', -6, 3, 12, 4); } },
      function (r, v) { r('#6a6040', -14, 0, 9, 5); r('#6a6040', -4, 0, 9, 5); r('#6a6040', 6, 0, 9, 5); r('#7a7050', -9, 5, 9, 4); r('#7a7050', 1, 5, 9, 4); },
      function (r, v) { for (var i = -14; i < 14; i += 4) r((i / 4) % 2 ? '#fff' : '#e0301e', i, 3, 4, 4); r('#888', -14, 0, 2, 3); r('#888', 12, 0, 2, 3); },
      function (r, v) { var c = ['#d7263d', '#2a5fa8', '#3a3a3a', '#ffd400', '#3cc46a']; r(c[v], -13, 0, 12, 8); r(c[(v + 2) % 5], 1, 0, 12, 6); r('#111', -9, 8, 4, 1); r('#111', 5, 6, 4, 1); r('#222', -7, 9, 1, 2); },
      function (r, v) { r('#111', -14, 0, 9, 9); r('#888', -11, 3, 3, 3); r('#111', -4, 0, 9, 9); r('#888', -1, 3, 3, 3); r('#111', 6, 0, 9, 9); r('#888', 9, 3, 3, 3); },
      function (r, v) { r('#ffd400', -14, 0, 2, 9); r('#ffd400', 12, 0, 2, 9); r('#ffd400', -15, 9, 4, 1); r('#ffd400', 11, 9, 4, 1); r('#8a0a18', -12, 5, 24, 2); r('#a3101e', -12, 4, 24, 1); }
    ];
    var OB_HIGH = [
      function (r, v) { if (v % 2) { r('#ffd400', -15, 21, 30, 5); r('#111', -11, 21, 4, 5); r('#111', -3, 21, 4, 5); r('#111', 5, 21, 4, 5); } else { r('#888', -15, 31, 30, 2); r('#222', -11, 21, 22, 10); r('#fffbe0', -10, 22, 20, 8); } },
      function (r, v) { r('#555', -15, 26, 30, 3); r('#222', -12, 20, 6, 6); r('#222', -3, 20, 6, 6); r('#222', 6, 20, 6, 6); r('#fff3b0', -11, 21, 4, 2); r('#fff3b0', -2, 21, 4, 2); r('#fff3b0', 7, 21, 4, 2); },
      function (r, v) { r('#2a7a3a', -15, 21, 30, 9); r('#fff', -13, 22, 26, 1); r('#fff', -9, 25, 4, 3); r('#fff', -3, 25, 2, 3); r('#fff', 1, 25, 6, 3); },
      function (r, v) { r('#111', -15, 21, 30, 9); r('#ffd400', -12, 23, 10, 2); r('#ffd400', 2, 23, 9, 2); r('#ffd400', -12, 26, 6, 2); r('#3cff00', 4, 26, 6, 2); },
      function (r, v) { r('#333', -15, 22, 30, 3); r('#ffd400', -15, 25, 30, 1); r('#222', -6, 15, 12, 7); r('#111', 4, 17, 6, 3); },
      function (r, v) { r('#333', -15, 28, 30, 3); for (var i = -13; i < 13; i += 7) { r('#222', i, 22, 5, 6); r('#fffbe0', i + 1, 22, 3, 2); } }
    ];
    /* арка на границе этапа */
    function drawGate(x, n, rel) {
      var k = P(rel), lx = sx(-1.62, rel), rx = sx(1.62, rel), by = sy(rel), hgt = 3.1 * PPM * k, a = Math.min(1, (C.ZFAR + 10 - rel) / 6); if (a <= 0) return;
      var col = ['#3a3a4a', '#555566', '#2a2a3a', '#2a3a5a', '#8a5a2a', '#ffd400'][n], txt = ['', 'ВЫХОД ИЗ ПАВИЛЬОНА', 'ПРОХОДНАЯ КИНОСТУДИИ', 'АЭРОПОРТ', 'ЛОС-АНДЖЕЛЕС', 'ЦЕРЕМОНИЯ'][n];
      x.globalAlpha = a; x.fillStyle = col; x.fillRect(Math.round(lx - 6 * k), Math.round(by - hgt), Math.max(2, Math.round(10 * k)), Math.round(hgt)); x.fillRect(Math.round(rx - 4 * k), Math.round(by - hgt), Math.max(2, Math.round(10 * k)), Math.round(hgt));
      var bh = Math.max(4, Math.round(26 * k)); x.fillRect(Math.round(lx - 6 * k), Math.round(by - hgt - bh), Math.round(rx - lx + 12 * k), bh);
      x.fillStyle = n === 5 ? '#a3101e' : '#ffd400'; x.fillRect(Math.round(lx), Math.round(by - hgt - bh + 2 * k), Math.round(rx - lx), Math.max(1, Math.round(2 * k)));
      if (k > 0.22) { var fs = Math.max(5, Math.min(12, Math.round(14 * k))); x.font = fs + "px 'Press Start 2P', monospace"; x.fillStyle = n === 5 ? '#a3101e' : '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, (lx + rx) / 2, by - hgt - bh / 2 + 1); }
      x.globalAlpha = 1;
    }
    function drawPad(x, o, rel, t) {
      var z1 = Math.max(rel, -3), z2 = rel + o.len; if (z2 <= z1) return;
      var a = Math.min(1, (C.ZFAR - rel) / 3), got = o.got, lost = o.done && !got;
      x.globalAlpha = a * (got ? 0.35 : lost ? 0.25 : 0.28); quad(x, lost ? '#666' : '#3cff00', o.lane - 0.5, o.lane + 0.5, z1, z2);
      x.globalAlpha = a * (got ? 0.4 : lost ? 0.4 : 0.92); quad(x, lost ? '#555' : '#22c40a', o.lane - 0.4, o.lane + 0.4, z1, z2);
      if (!lost) { x.globalAlpha = a; for (var j = 0; j < 3; j++) { var zz = rel + ((j + (reduced() ? 0 : t * 3)) % 3) * (o.len / 3); if (zz > z1 && zz + 0.3 < z2) quad(x, '#eaffd0', o.lane - 0.28, o.lane + 0.28, zz, zz + 0.3); } }
      if (!o.done && rel > 1.5) {
        var bx = sx(o.lane, rel + o.len / 2), by = sy(rel + o.len / 2), top = sy(rel + o.len / 2, 2.3), w = Math.max(2, LW * 0.5 * P(rel));
        x.globalAlpha = a * 0.16; x.fillStyle = '#3cff00'; x.fillRect(Math.round(bx - w / 2), Math.round(top), Math.round(w), Math.round(by - top));
        var ar = Math.max(3, Math.round(7 * P(rel) + 2)), ay = Math.round(top - ar - 2 + (reduced() ? 0 : Math.sin(t * 6) * 2));
        x.globalAlpha = a; x.fillStyle = '#3cff00';
        for (var q = 0; q < ar; q++) x.fillRect(Math.round(bx - (ar - q)), ay + q, (ar - q) * 2, 1);
      }
      x.globalAlpha = 1;
    }
    /* окружение по сторонам: своё на каждом этапе */
    function drawSide(x, d, rel, side, idx, t) {
      var hv = hash(idx * 2 + (side > 0 ? 1 : 0)); if (hv < 0.2) return;
      var st = E.stageOf(d), l = side * 2.45, r = painter(x, l, rel), a = Math.min(1, (56 - rel) / 8); if (a <= 0) return;
      var k = P(rel), bx = sx(l, rel), by = sy(rel), u = 2 * k;
      x.globalAlpha = a;
      if (st === 0) {
        if (hv < 0.45) { r('#3a3a4a', -1, 0, 2, 52); r('#222', -7, 52, 14, 6); r('#fff6c0', -6, 53, 12, 4);
          x.globalAlpha = a * 0.1; x.fillStyle = '#fff6c0'; x.beginPath(); x.moveTo(bx - 6 * u, by - 53 * u); x.lineTo(bx + 6 * u, by - 53 * u); x.lineTo(bx + (-side * 40 + 16) * u, by); x.lineTo(bx + (-side * 40 - 16) * u, by); x.closePath(); x.fill(); }
        else trailer(x, l, rel, side, ['#7a2b2b', '#56201f'], hv);
      } else if (st === 1) {
        if (hv < 0.55) { r('#3a3442', -20, 0, 40, 60); r('#2a2432', -20, 58, 40, 2); r('#5a4a6a', -12, 0, 24, 34); r('#ff9a3c', -10, 38, 20, 6); r('#111', -8, 40, 16, 2); if (k > 0.25) { r('#fff', -7, 40, 3, 1); } }
        else { r('#4a4252', -18, 0, 2, 44); r('#4a4252', 16, 0, 2, 44); for (var sh = 6; sh < 44; sh += 12) { r('#4a4252', -18, sh, 36, 2); r(['#8a5a2b', '#3a6a8a', '#7a7a2a'][(idx + sh) % 3], -14, sh + 2, 10, 8); r('#8a5a2b', 0, sh + 2, 12, 6); } }
      } else if (st === 2) {
        if (hv < 0.6) { var hh = 60 + Math.floor(hv * 80); r('#1a1036', -22, 0, 44, hh); for (var wy = 6; wy < hh - 4; wy += 8) for (var wx = -18; wx < 18; wx += 8) if (hash(idx * 31 + wy * 7 + wx) > 0.45) r('#ffe08a', wx, wy, 4, 4);
          var nc = ['#ff4fd8', '#3cf0ff', '#ffd400'][idx % 3]; r(nc, -16, hh * 0.45, 32, 7); r('#fff', -14, hh * 0.45 + 2, 28, 2); }
        else { r('#555', -1, 0, 2, 46); r('#555', -1 - side * 10, 44, 12, 2); r('#fff6c0', -2 - side * 10, 41, 6, 3); }
      } else if (st === 3) {
        if (hv < 0.55) { r('#2a3a5a', -22, 0, 44, 56); for (var gx = -20; gx < 20; gx += 6) r('#7fb8e8', gx, 6, 4, 44); r('#1a2a44', -22, 50, 44, 6); }
        else { r('#222', -1, 0, 2, 30); r('#111', -14, 30, 28, 14); r('#ffd400', -12, 39, 12, 2); r('#ffd400', -12, 35, 18, 2); r('#3cff00', 6, 39, 6, 2); r('#ffd400', -12, 32, 9, 1); }
      } else if (st === 4) {
        if (hv < 0.6) { r('#7a5a3a', -2, 0, 4, 70); r('#6a4a2a', -2, 30, 4, 2); r('#2f8a3a', -16, 68, 32, 4); r('#2f8a3a', -20, 64, 10, 4); r('#2f8a3a', 10, 64, 10, 4); r('#2f8a3a', -10, 72, 20, 3); r('#3aa04a', -24, 60, 8, 4); r('#3aa04a', 16, 60, 8, 4); }
        else { r('#333', -1, 0, 2, 30); r('#222', -20, 30, 40, 24); var bc = ['#ff6a4a', '#3cf0ff', '#ffd400'][idx % 3]; r(bc, -18, 32, 36, 20); r('#fff', -12, 40, 24, 3); r('#222', -14, 46, 28, 2); }
      } else {
        if (hv < 0.6) { r('#ffd400', -1, 0, 2, 8); r('#a3101e', -1, 6, 26 * -side, 2); for (var p = 0; p < 3; p++) { var px = -14 + p * 11; r('#1a1a1a', px, 0, 8, 16); r('#e2b08c', px + 2, 16, 4, 4); r('#333', px + 1, 10, 6, 4); if (Math.floor(t * 5 + p * 3 + idx) % 5 === 0) { r('#fff', px - 2, 8, 10, 8); } } }
        else { r('#555', -2, 0, 4, 40); r('#111', -6, 40, 12, 6); x.globalAlpha = a * 0.14; x.fillStyle = '#fff6c0'; x.beginPath(); x.moveTo(bx - 4 * u, by - 46 * u); x.lineTo(bx + 4 * u, by - 46 * u); x.lineTo(bx + (-side * 30 + 26) * u, by - 200 * u); x.lineTo(bx + (-side * 30 - 6) * u, by - 200 * u); x.closePath(); x.fill(); }
      }
      x.globalAlpha = 1;
    }
    function trailer(x, l, rel, side, cols, hv) {
      var k = P(rel), bx = sx(l, rel), by = sy(rel), u = 2 * k, r = painter(x, l, rel);
      var inn = -side * 20, k2 = P(rel + 7), bx2 = sx(l, rel + 7), by2 = sy(rel + 7), u2 = 2 * k2;
      x.fillStyle = cols[1]; x.beginPath(); x.moveTo(bx + inn * u, by - 38 * u); x.lineTo(bx2 + inn * u2, by2 - 38 * u2); x.lineTo(bx2 + inn * u2, by2 - 4 * u2); x.lineTo(bx + inn * u, by - 4 * u); x.closePath(); x.fill();
      r('#111', -17, 0, 7, 5); r('#111', 10, 0, 7, 5); r(cols[0], -20, 4, 40, 34); r(cols[1], -20, 36, 40, 2); r('#c9c9d2', -20, 4, 40, 1); r(cols[1], -1, 5, 2, 30); r('#ffd400', -15, 26, 10, 5);
    }
    /* небо и дальний план этапа */
    function drawSky(x, W, th, t) {
      var gr = x.createLinearGradient(0, T0, 0, HY); gr.addColorStop(0, th.sky[0]); gr.addColorStop(1, th.sky[1]); x.fillStyle = gr; x.fillRect(0, T0, W, HY - T0 + 2);
      var k = th.k, A = th.a, B = th.b, mixT = th.t;
      if (!A.indoor || mixT > 0.5) stars.forEach(function (st) { if (k >= 3 && k <= 4) return; x.fillStyle = st[2] ? '#ffd400' : '#9ab'; x.fillRect(Math.floor(st[0] * W), Math.floor(T0 + st[1] * (HY - 20 - T0)), 1, 1); });
      var cur = mixT > 0.5 ? B : A;
      if (cur.hills) { x.fillStyle = '#b8605a'; x.beginPath(); x.moveTo(0, HY + shy); for (var X = 0; X <= W; X += 10) x.lineTo(X, HY + shy - 18 - 14 * Math.abs(Math.sin(X * 0.012 + 1)) - 6 * Math.sin(X * 0.05)); x.lineTo(W, HY + shy); x.fill();
        x.fillStyle = '#ffe2c0'; x.beginPath(); x.arc(W * 0.78, HY - 26, 14, 0, 7); x.fill(); }
      else G.drawCity(x, city, 300 + s.lx * 3, HY + Math.round(shy), th.city[0], th.city[1], W);
      if (cur.indoor) { x.fillStyle = 'rgba(10,8,14,.92)'; x.fillRect(0, T0, W, HY - T0 - 34); for (var li = 0; li < 6; li++) { var lz = ((li * 6 - s.dist) % 36 + 36) % 36, kk = P(lz); x.fillStyle = '#fff3b0'; x.fillRect(Math.round(cx - 40 * kk), Math.round(HY - 34 - 30 * kk), Math.round(80 * kk), Math.max(1, Math.round(3 * kk))); } }
      if (cur.carpet && !reduced()) { x.globalAlpha = 0.12; x.fillStyle = '#fff6c0'; for (var b = 0; b < 3; b++) { var an = Math.sin(t * 0.7 + b * 2) * 0.5; x.beginPath(); x.moveTo(W * (0.2 + b * 0.3), HY); x.lineTo(W * (0.2 + b * 0.3) + Math.sin(an) * 160 - 14, T0); x.lineTo(W * (0.2 + b * 0.3) + Math.sin(an) * 160 + 14, T0); x.closePath(); x.fill(); } x.globalAlpha = 1; }
    }

    function drawKirill(x, t) {
      var kx = sx(s.lx, 0), ky = sy(0, s.y), pose, flip = false, rot = 0, over = g.state === 'over';
      x.fillStyle = 'rgba(0,0,0,.4)'; var shw = Math.round(11 * KS - Math.min(14, s.y * 14)); x.fillRect(Math.round(kx - shw / 2), Math.round(sy(0) - 1), shw, 3);
      if (over) { if (g.overT > 0.8 && G.KIRILL) { spr(x, G.KIRILL.FALL, KP, Math.round(kx), Math.round(ky), KS); return; } pose = g.overT > 0.35 ? K_STAND : K_RUN; flip = Math.floor(runPh) % 2 === 1; }
      else if (g.state === 'ready') pose = K_STAND;
      else if (s.y > 0) pose = K_JUMP;
      else if (s.slideT > 0) pose = K_SLIDE;
      else { pose = K_RUN; flip = Math.floor(runPh) % 2 === 1; }
      if (!over && g.state !== 'ready') {
        rot = Math.max(-0.3, Math.min(0.3, (s.lane - s.lx) * 0.42));
        if (s.stumbleT > 0) rot += Math.sin(t * 38) * 0.22;
        if (s.invT > 0 && s.stumbleT <= 0 && Math.floor(t * 14) % 2) return;
        if (s.boostT > 0 && !reduced()) {
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
      var oz = -0.45 - (vis / 8) * 2.66, off = opSide, sd = opSide < 0 ? 1 : -1;
      if (over) { var q = Math.min(1, g.overT / 0.35); oz = oz + (-0.38 - oz) * q; }
      var k = P(oz), ox = sx(opx + off, oz), oy = sy(oz), pose;
      if (over) pose = g.overT > 0.8 ? O_SHOOT : g.overT > 0.35 ? O_STAND : (Math.floor(t * 9) % 2 ? O_RUN_A : O_RUN_B);
      else if (g.state === 'ready') pose = O_STAND;
      else { pose = Math.floor(t * (7 + s.v * 0.3)) % 2 ? O_RUN_A : O_RUN_B; oy -= (Math.floor(t * (14 + s.v * 0.6)) % 2) * k * KS / 2; }
      x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(Math.round(ox - 6 * KS * k), Math.round(sy(oz) - 1), Math.round(12 * KS * k), 3);
      spr(x, pose, OP, Math.round(ox), Math.round(oy), KS * k);
      if (over && g.overT > 0.35 && g.overT <= 0.8) {
        var kx = sx(s.lx, 0), ky = sy(0);
        x.strokeStyle = OP.T; x.lineWidth = 4; x.beginPath(); x.moveTo(ox + sd * 4 * KS * k, oy - 16 * KS * k); x.lineTo(kx - sd * 4 * KS, ky - 14.5 * KS); x.stroke();
        x.fillStyle = OP.S; x.fillRect(Math.round(kx - sd * 4.5 * KS - 3), Math.round(ky - 16 * KS), 6, 6);
      }
      if (!over && g.state === 'run' && sayT > 0) bubble(x, 'СТОЙ! ОДИН ДУБЛЬ!', ox, oy - 25 * KS * k);
    }
    function bubble(x, text, bx, by) {
      x.font = "7px 'Press Start 2P', 'VT323', monospace"; var w = Math.ceil(x.measureText(text).width) + 10, W = g.Wd;
      var lx = Math.round(Math.max(4, Math.min(W - w - 4, bx - w / 2))), ly = Math.round(Math.max(T0 + 72, by - 16));
      x.fillStyle = '#000'; x.fillRect(lx - 1, ly - 1, w + 2, 16); x.fillStyle = '#fff'; x.fillRect(lx, ly, w, 14); x.fillRect(Math.round(bx) - 2, ly + 14, 4, 3);
      G.text(x, text, lx + 5, ly + 4, 7, '#000');
    }

    function hud(x, W, t) {
      var dist = g.state === 'over' ? finalDist : Math.floor(s.dist), pr = E.prog(dist);
      /* путь к «Оскару» */
      var px0 = 6, pw = W - 12, py = T0 + 4;
      x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(px0 - 2, py - 2, pw + 4, 10); x.fillStyle = '#3a2a10'; x.fillRect(px0, py, pw, 6); x.fillStyle = '#ffd400'; x.fillRect(px0, py, Math.round(pw * pr), 6);
      C.STAGES.forEach(function (b, i) { if (i) { x.fillStyle = '#000'; x.fillRect(Math.round(px0 + pw * b / C.FINISH), py - 1, 1, 8); } });
      x.fillStyle = '#ffd400'; x.fillRect(px0 + pw - 3, py - 3, 4, 10); x.fillStyle = '#fff'; x.fillRect(Math.round(px0 + pw * pr) - 1, py - 2, 3, 10);
      G.text(x, 'ПУТЬ К ОСКАРУ ' + Math.floor(pr * 100) + '%', 6, py + 10, 7, '#ffd400'); G.text(x, E.STAGE_NAMES[E.stageOf(dist)], W - 6, py + 10, 7, '#cfe', 'right');
      var y2 = py + 22;
      G.text(x, 'ДИСТ ' + dist + ' М', 6, y2, 7, '#fff'); G.text(x, 'РЕКОРД ' + g.best + ' М', W - 6, y2, 7, '#8aa', 'right');
      G.text(x, (g.state === 'over' ? 0 : Math.round(s.v * 3.6)) + ' КМ/Ч', 6, y2 + 11, 7, s.boostT > 0 ? '#3cff00' : s.stumbleT > 0 ? '#ff5a48' : '#ffd400'); G.text(x, 'УСКОРЕНИЙ ' + s.pads, W - 6, y2 + 11, 7, '#3cff00', 'right');
      /* шкала отрыва: Кирилл справа, оператор приближается слева */
      var bw = Math.min(W - 44, 250), bx = Math.round((W - bw) / 2), by = y2 + 25, fr = Math.max(0, Math.min(1, gapV / C.GAPMAX)), col = gapV > 5 ? '#3cff00' : gapV > 2.5 ? '#ffd400' : '#ff5a48';
      var blink = gapV <= 2.5 && Math.floor(t * 6) % 2 && !reduced();
      x.fillStyle = '#000'; x.fillRect(bx - 2, by - 2, bw + 4, 12); x.fillStyle = barFx > 0 ? barCol : '#556'; x.fillRect(bx - 1, by - 1, bw + 2, 10); x.fillStyle = '#12122a'; x.fillRect(bx, by, bw, 8);
      var opX = Math.round(bx + bw - fr * bw);
      x.fillStyle = blink ? '#fff' : col; x.fillRect(opX, by + 2, bx + bw - opX, 4);
      x.fillStyle = 'rgba(255,90,72,.35)'; x.fillRect(Math.round(bx + bw - bw * 2.5 / C.GAPMAX), by, 1, 8);
      var cxo = Math.max(bx - 12, opX - 12); x.fillStyle = '#000'; x.fillRect(cxo - 1, by - 3, 14, 14); x.fillStyle = blink ? '#ff2a2a' : '#c9c9d2'; x.fillRect(cxo, by - 1, 9, 8); x.fillRect(cxo + 9, by + 1, 3, 4); x.fillStyle = '#222'; x.fillRect(cxo + 2, by + 1, 5, 4); x.fillStyle = '#ff2a2a'; x.fillRect(cxo + 1, by - 2, 2, 2);
      var kx = bx + bw + 1; x.fillStyle = '#000'; x.fillRect(kx - 1, by - 3, 10, 14); x.fillStyle = KP.H; x.fillRect(kx, by - 2, 8, 5); x.fillStyle = KP.S; x.fillRect(kx + 1, by + 3, 6, 3); x.fillStyle = KP.D; x.fillRect(kx, by + 6, 8, 4);
      G.text(x, 'ОТРЫВ ' + gapV.toFixed(1).replace('.', ',') + ' М', W / 2, by + 13, 7, blink ? '#fff' : col, 'center');
      for (var i = 0; i < floats.length; i++) { var f = floats[i]; x.globalAlpha = Math.min(1, f.t * 2); G.text(x, f.text, W / 2, by + 26 + i * 10 - (1.1 - f.t) * 6, 7, f.c, 'center'); } x.globalAlpha = 1;
      if (banner && g.state === 'run') { var a = Math.min(1, banner.t * 2, (2.4 - banner.t) * 4); x.globalAlpha = Math.max(0, a); x.fillStyle = 'rgba(0,0,30,.72)'; x.fillRect(0, HY + 10, W, 34);
        G.text(x, 'ЭТАП ' + (banner.n + 1) + ' ИЗ 6', W / 2, HY + 15, 7, '#ffd400', 'center'); G.text(x, E.STAGE_NAMES[banner.n], W / 2, HY + 27, 10, '#fff', 'center'); x.globalAlpha = 1; }
    }

    /* ---------- перелёт в Лос-Анджелес (монтажная вставка, физика стоит) ---------- */
    function drawCut(x, W, t) {
      var T = cut.t / cut.dur, gr = x.createLinearGradient(0, T0, 0, HB); gr.addColorStop(0, '#2a2a6a'); gr.addColorStop(0.6, '#ff8a5a'); gr.addColorStop(1, '#ffd48a'); x.fillStyle = gr; x.fillRect(0, T0, W, HB - T0);
      x.fillStyle = 'rgba(255,255,255,.85)'; for (var c = 0; c < 6; c++) { var cxx = ((c * 97 - T * 400) % (W + 120) + W + 120) % (W + 120) - 60, cyy = T0 + 70 + (c % 3) * 60; x.beginPath(); x.ellipse(cxx, cyy, 34, 9, 0, 0, 7); x.fill(); }
      var px = -80 + T * (W + 160), py = T0 + (HB - T0) * 0.48 - Math.sin(T * 3) * 10;
      x.fillStyle = '#f0f0f6'; x.fillRect(px - 50, py - 7, 100, 14); x.beginPath(); x.moveTo(px + 50, py - 7); x.lineTo(px + 66, py); x.lineTo(px + 50, py + 7); x.fill();
      x.fillStyle = '#d7263d'; x.fillRect(px - 50, py + 1, 100, 3); x.fillStyle = '#c9c9d2'; x.beginPath(); x.moveTo(px - 10, py); x.lineTo(px - 30, py + 22); x.lineTo(px + 6, py + 22); x.lineTo(px + 12, py); x.fill();
      x.beginPath(); x.moveTo(px - 50, py - 7); x.lineTo(px - 58, py - 22); x.lineTo(px - 42, py - 22); x.lineTo(px - 34, py - 7); x.fill();
      for (var wn = -40; wn < 44; wn += 9) { x.fillStyle = '#2a3a5a'; x.fillRect(px + wn, py - 4, 5, 4); }
      x.fillStyle = KP.H; x.fillRect(px + 23, py - 4, 4, 3); x.fillStyle = OP.C; x.fillRect(px - 31, py - 4, 4, 3);
      x.fillStyle = 'rgba(0,0,30,.7)'; x.fillRect(0, T0 + 26, W, 40);
      G.text(x, 'ПЕРЕЛЁТ', W / 2, T0 + 32, 8, '#ffd400', 'center'); G.text(x, 'ЛОС-АНДЖЕЛЕС', W / 2, T0 + 46, 11, '#fff', 'center');
      G.text(x, 'ОПЕРАТОР ВЗЯЛ БИЛЕТ НА ТОТ ЖЕ РЕЙС', W / 2, HB - 30, 7, '#1a0a20', 'center');
    }

    /* ---------- финал: сцена церемонии ---------- */
    function statuette(x, cxx, by, s2) {           /* обобщённая золотая статуэтка */
      function r(c, px, py, w, h) { x.fillStyle = c; x.fillRect(Math.round(cxx + px * s2), Math.round(by - (py + h) * s2), Math.ceil(w * s2), Math.ceil(h * s2)); }
      r('#2a2a2a', -3, 0, 6, 2); r('#c8a020', -2, 2, 4, 1); r('#ffd400', -1, 3, 2, 6); r('#ffd400', -2, 6, 4, 4); r('#ffe680', -1, 7, 1, 3); r('#ffd400', -1, 10, 2, 2); r('#ffd400', -1, 12, 2, 2); r('#c8a020', 1, 6, 1, 4);
    }
    function drawWin(x, W, t) {
      var T = win.t;
      if (T < 2.2) {   /* последний рывок к сцене в перспективе */
        drawRunScene(x, W, t, true);
        var k = Math.min(1, T / 2.2), z = 12 - k * 11.6, sb = sx(0, z), syy = sy(z), pk = P(z);
        x.fillStyle = '#3a1020'; x.fillRect(Math.round(sx(-1.7, z)), Math.round(syy - 26 * pk), Math.round(sx(1.7, z) - sx(-1.7, z)), Math.round(26 * pk));
        x.fillStyle = '#a3101e'; x.fillRect(Math.round(sx(-1.7, z)), Math.round(syy - 30 * pk), Math.round(sx(1.7, z) - sx(-1.7, z)), Math.max(2, Math.round(4 * pk)));
        statuette(x, sb, syy - 30 * pk, Math.max(1, 3 * pk));
        if (T > 1.2) { x.fillStyle = 'rgba(255,255,255,' + Math.min(1, (T - 1.2)).toFixed(2) + ')'; x.fillRect(0, T0, W, HB - T0); }
        return;
      }
      /* вид на сцену спереди */
      var cxs = W / 2, floor = HB - 46;
      x.fillStyle = '#12060c'; x.fillRect(0, T0, W, HB - T0);
      for (var cc = 0; cc < W; cc += 18) { x.fillStyle = cc % 36 ? '#7a0a18' : '#8a0c1c'; x.fillRect(cc, T0, 18, floor - T0); }
      x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(0, T0, W, 20);
      if (!reduced()) { x.globalAlpha = 0.18; x.fillStyle = '#fff6c0'; [0.2, 0.5, 0.8].forEach(function (p, i) { var sw2 = Math.sin(t * 0.8 + i) * 30; x.beginPath(); x.moveTo(W * p, T0); x.lineTo(cxs + sw2 - 40, floor); x.lineTo(cxs + sw2 + 40, floor); x.closePath(); x.fill(); }); x.globalAlpha = 1; }
      x.fillStyle = '#2a1a10'; x.fillRect(0, floor, W, HB - floor); x.fillStyle = '#ffd400'; x.fillRect(0, floor, W, 2); x.fillStyle = '#a3101e'; x.fillRect(cxs - 70, floor, 140, HB - floor);
      var s3 = Math.min(5, (floor - T0 - 40) / 32), kp = { la: Math.PI / 2 + 0.12, ra: Math.PI / 2 - 0.12, smile: T > 3.4 };
      var lift = Math.min(1, Math.max(0, (T - 2.6) / 0.8)); kp.ra = (Math.PI / 2 - 0.12) + (-Math.PI / 2 + 0.25 - (Math.PI / 2 - 0.12)) * lift;
      var kx2 = cxs + 10, hand = G.kirillFront(x, kx2, floor, s3, kp).r;
      if (lift < 0.05) { x.fillStyle = '#222'; x.fillRect(Math.round(kx2 + 40), Math.round(floor - 14 * s3 * 0.5), Math.round(10), Math.round(14 * s3 * 0.5)); statuette(x, kx2 + 45, floor - 14 * s3 * 0.5, s3 * 0.7); }
      else statuette(x, hand.x, hand.y + 3 * s3 * 0.7, s3 * 0.7);
      /* оператор выходит, останавливается, поднимает камеру */
      var ok = Math.min(1, Math.max(0, (T - 3.4) / 1.2)), oxp = -30 + ok * (cxs - 90), opose = T > 6 ? O_SHOOT : O_FRONT;
      if (T > 3.4) spr(x, opose, OP, Math.round(oxp), Math.round(floor), s3 * 0.95, false);
      if (T > 6.2) { x.fillStyle = '#fff'; var m = 12; [[m, T0 + 64, 1, 1], [W - m, T0 + 64, -1, 1], [m, HB - 14, 1, -1], [W - m, HB - 14, -1, -1]].forEach(function (c) { x.fillRect(c[2] > 0 ? c[0] : c[0] - 20, c[3] > 0 ? c[1] : c[1] - 2, 20, 2); x.fillRect(c[2] > 0 ? c[0] : c[0] - 2, c[3] > 0 ? c[1] : c[1] - 20, 2, 20); });
        if (Math.floor(t * 2.5) % 2 || reduced()) { x.fillStyle = '#ff2a2a'; x.fillRect(m + 6, T0 + 70, 7, 7); G.text(x, 'REC', m + 17, T0 + 70, 7, '#ff2a2a'); } }
      /* зал аплодирует */
      for (var h = 0; h < W; h += 13) { var bob = reduced() ? 0 : Math.abs(Math.sin(t * 9 + h)) * 3 * (T > 2.6 && T < 6 ? 1 : 0.3); x.fillStyle = '#0a0a0a'; x.beginPath(); x.arc(h + 6, HB - 6 - bob, 7, 0, 7); x.fill(); if (T > 2.6 && Math.floor(t * 7 + h) % 9 === 0) { x.fillStyle = '#fff'; x.fillRect(h + 2, HB - 22 - bob, 3, 3); } }
      if (T > 6.6) { x.fillStyle = 'rgba(0,0,20,.72)'; x.fillRect(0, T0 + 6, W, 46); G.text(x, 'КИРИЛЛ ДОБЕЖАЛ ДО ОСКАРА!', W / 2, T0 + 12, W < 330 ? 8 : 10, '#ffd400', 'center'); if (T > 7.6) G.text(x, 'А ОПЕРАТОР ВСЁ РАВНО СНЯЛ ЭТО НА КАМЕРУ', W / 2, T0 + 32, W < 330 ? 6 : 7, '#fff', 'center'); }
      if (T >= 9) {
        x.fillStyle = 'rgba(0,0,40,.86)'; x.fillRect(0, T0, W, HB - T0); var yy = T0 + Math.max(20, (HB - T0) / 2 - 110);
        G.text(x, 'ОСКАР ПОЛУЧЕН!', W / 2, yy, 13, '#ffd400', 'center'); G.text(x, 'ИГРОВОЙ ФИНАЛ · НАГРАДА ВЫМЫШЛЕННАЯ', W / 2, yy + 22, 6, '#8aa', 'center');
        var mm = Math.floor(s.t / 60), ss = ('0' + Math.round(s.t % 60)).slice(-2), bm = Math.floor(g.bestTime / 60), bs = ('0' + (g.bestTime % 60)).slice(-2);
        G.text(x, 'ВРЕМЯ: ' + mm + ':' + ss + (g.newTime ? '  НОВЫЙ РЕКОРД!' : ''), W / 2, yy + 46, 8, g.newTime ? '#3cff00' : '#fff', 'center');
        G.text(x, 'УСКОРЕНИЙ: ' + s.pads + '  · СЕРИЯ ×' + s.bestStreak, W / 2, yy + 62, 8, '#3cff00', 'center');
        G.text(x, 'СТОЛКНОВЕНИЙ: ' + s.hits, W / 2, yy + 78, 8, '#ffd400', 'center');
        G.text(x, 'ЛУЧШЕЕ ВРЕМЯ: ' + bm + ':' + bs, W / 2, yy + 94, 8, '#cfe', 'center');
        G.button(x, btns, 'ЕЩЁ ОДИН ДУБЛЬ', W / 2 - 134, yy + 116, 130, 26, start, true);
        G.button(x, btns, 'В BULANET', W / 2 + 4, yy + 116, 130, 26, function () { if (hooks.exit) hooks.exit(); }, false);
      }
    }

    function drawRunScene(x, W, t, noPlayer) {
      var th = theme(s.dist), run = g.state === 'run', red = reduced();
      drawSky(x, W, th, t);
      x.fillStyle = th.ground; x.fillRect(0, HY + shy, W, HB - HY + 4);
      quad(x, th.bed, -1.62, 1.62, -3, 70);
      var off = s.dist % 1, cur = th.t > 0.5 ? th.b : th.a;
      if (cur.road) { for (var z = 46; z >= -3; z -= 2) { quad(x, th.sl, -0.53, -0.47, z - off * 2 % 2, z - off * 2 % 2 + 0.9); quad(x, th.sl, 0.47, 0.53, z - off * 2 % 2, z - off * 2 % 2 + 0.9); } quad(x, th.sl, -1.58, -1.52, -3, 70); quad(x, th.sl, 1.52, 1.58, -3, 70); }
      else if (cur.carpet) { for (var z2 = 46; z2 >= -3; z2--) quad(x, th.sl, -1.5, 1.5, z2 - off, z2 - off + 0.15); quad(x, th.rail, -1.62, -1.56, -3, 70); quad(x, th.rail, 1.56, 1.62, -3, 70); }
      else { for (var z3 = 46; z3 >= -3; z3--) quad(x, th.sl, -1.5, 1.5, z3 - off, z3 - off + 0.3); [-0.5, 0.5].forEach(function (l) { quad(x, '#101022', l - 0.045, l + 0.045, -3, 70); }); [-1, 0, 1].forEach(function (l) { quad(x, th.rail, l - 0.31, l - 0.27, -3, 70); quad(x, th.rail, l + 0.27, l + 0.31, -3, 70); }); }
      var i0 = Math.floor((s.dist + 56) / 8), i1 = Math.floor((s.dist - 4) / 8);
      for (var ii = i0; ii >= i1; ii--) { var dd = ii * 8 + 4, rel = dd - s.dist; if (rel < -3.2) continue; drawSide(x, dd, rel, -1, ii, t); drawSide(x, dd, rel, 1, ii, t); }
      C.STAGES.forEach(function (b, n) { if (n && n !== 4) { var rg = b - s.dist; if (rg < C.ZFAR + 8 && rg > -2.5) drawGate(x, n, rg); } });
      var objs = s.objs.slice().sort(function (a, b) { return b.d - a.d; }), n = objs.length, o, r2;
      for (var a1 = 0; a1 < n; a1++) { o = objs[a1]; if (o.kind === 'pad') { r2 = o.d - s.dist; if (r2 < C.ZFAR + 1 && r2 + o.len > -3) drawPad(x, o, r2, t); } }
      for (var a2 = 0; a2 < n; a2++) { o = objs[a2]; if (o.kind !== 'pad') { r2 = o.d - s.dist; if (r2 < C.ZFAR + 1 && r2 >= -0.2) drawOb(x, o, r2);
        if (run && s.dist < 500 && (o.kind === 'low' || o.kind === 'high') && !hints[o.kind] && r2 < 14 && r2 > 2 && Math.abs(o.lane - s.lane) < 0.5) { hints[o.kind] = 1; float(o.kind === 'low' ? (touch ? 'СВАЙП ВВЕРХ — ПРЫЖОК' : '↑ ИЛИ ПРОБЕЛ — ПРЫЖОК') : (touch ? 'СВАЙП ВНИЗ — ПОДКАТ' : '↓ — ПОДКАТ'), '#ffd400'); } } }
      if (noPlayer) { var kxw = sx(s.lx, 0), kyw = sy(0); spr(x, K_RUN, KP, Math.round(kxw), Math.round(kyw - (Math.floor(t * 12) % 2)), KS, Math.floor(t * 10) % 2 === 1); return; }
      drawKirill(x, t);
      var kx = sx(s.lx, 0), ky = sy(0, s.y);
      fx.forEach(function (p) { x.fillStyle = p.c; x.fillRect(Math.round(kx + p.x), Math.round(ky + p.y), 2, 2); });
      for (var a3 = 0; a3 < n; a3++) { o = objs[a3]; if (o.kind !== 'pad') { r2 = o.d - s.dist; if (r2 < -0.2 && r2 > -3) drawOb(x, o, r2); } }
      drawOperator(x, t);
    }

    g.draw = function () {
      if (!g.s || !s) return;
      var now = performance.now() / 1000, adt = Math.min(0.05, now - (lastT || now)); lastT = now;
      var x = g.begin2d(), W = g.Wd, t = now, run = g.state === 'run', over = g.state === 'over', red = reduced();
      cx = W / 2; btns = []; T0 = -Math.max(0, g.oy); HB = H - T0;
      if (run || over) { gapV += (s.gap - gapV) * Math.min(1, adt * 8); flash = Math.max(0, flash - adt); barFx = Math.max(0, barFx - adt); sayT = Math.max(0, sayT - adt); if (banner) { banner.t -= adt; if (banner.t <= 0) banner = null; }
        floats.forEach(function (f) { f.t -= adt; }); floats = floats.filter(function (f) { return f.t > 0; });
        fx.forEach(function (p) { p.x += p.vx * adt; p.y += p.vy * adt; p.vy += 300 * adt; p.t -= adt; }); fx = fx.filter(function (p) { return p.t > 0; }); }
      if (over) { g.overT += adt; coast = Math.max(0, coast - adt * 22); s.dist += coast * adt; runPh += coast * adt * 0.7; opx += (s.lx - opx) * Math.min(1, adt * 8); }
      if (g.state === 'win') { win.t += adt; shx = shy = 0; Fc = F0; drawWin(x, W, t); return; }
      if (cut && (run || g.state === 'paused')) { drawCut(x, W, t); if (g.state === 'paused') g.overlay([['ПАУЗА', 12, '#ffd400']]); return; }
      var sideT = over ? (opSide < 0 ? -0.62 : 0.62) : s.lane < 0 ? 0.8 : s.lane > 0 ? -0.8 : (opSide < 0 ? -0.8 : 0.8); opSide += (sideT - opSide) * Math.min(1, adt * 6);
      var bk = run && s.boostT > 0 ? Math.min(1, s.boostT / 0.3, (C.BOOST_T - s.boostT) / 0.12 + 0.2) : 0;
      Fc = F0 * (1 - 0.13 * bk * (red ? 0 : 1));
      shx = 0; shy = 0; if (run && !red) { if (s.stumbleT > 0) { shx = Math.sin(t * 60) * 2; shy = Math.cos(t * 47) * 2; } else if (bk > 0) shy = Math.sin(t * 50) * 0.7 * bk; }
      drawRunScene(x, W, t, false);
      if (bk > 0 && !red) { x.fillStyle = '#eaffd0'; for (var q = 0; q < 10; q++) { var hh = hash(q * 31 + Math.floor(t * 24)), sd = q % 2 ? 1 : -1, px = cx + sd * (W * 0.28 + hh * W * 0.22), py = HY + 20 + hash(q * 17 + Math.floor(t * 24) * 3) * (HB - HY - 30); x.globalAlpha = 0.5 * bk; x.fillRect(Math.round(px), Math.round(py), Math.round(sd * (10 + hh * 22)), 1); } x.globalAlpha = 1; }
      if (flash > 0) { x.fillStyle = 'rgba(60,255,0,' + (flash * 0.9).toFixed(2) + ')'; x.fillRect(0, T0, W, HB - T0); }
      if (run && gapV < 2.5 && !red) { x.fillStyle = 'rgba(255,42,42,' + (0.10 + 0.08 * Math.sin(t * 10)).toFixed(2) + ')'; x.fillRect(0, T0, W, HB - T0); }
      if (g.state !== 'ready') hud(x, W, t);
      if (g.state === 'ready') {
        x.fillStyle = 'rgba(0,0,40,.76)'; x.fillRect(0, T0, W, HB - T0);
        G.text(x, 'ПОБЕГ ОТ ОПЕРАТОРА', W / 2, 52, W < 330 ? 11 : 13, '#ffd400', 'center');
        G.text(x, 'ОН ПРОСТО ХОТЕЛ СНЯТЬ ОДИН ДУБЛЬ', W / 2, 76, 7, '#fff', 'center');
        G.text(x, 'ЦЕЛЬ: ДОБЕЖАТЬ ДО «ОСКАРА» · 6 ЭТАПОВ', W / 2, 94, W < 330 ? 6 : 7, '#ffd400', 'center');
        G.text(x, 'ЗЕЛЁНЫЕ ЗОНЫ УСКОРЕНИЯ ДАЮТ ОТРЫВ,', W / 2, 118, 7, '#3cff00', 'center'); G.text(x, 'ОШИБКИ ПОДПУСКАЮТ ОПЕРАТОРА', W / 2, 130, 7, '#3cff00', 'center');
        if (touch) { G.text(x, 'СВАЙП ВЛЕВО / ВПРАВО — ДОРОЖКА', W / 2, 154, 7, '#cfe', 'center'); G.text(x, 'ВВЕРХ — ПРЫЖОК, ВНИЗ — ПОДКАТ', W / 2, 166, 7, '#cfe', 'center'); }
        else { G.text(x, '← → ДОРОЖКА   ↑ / ПРОБЕЛ ПРЫЖОК', W / 2, 154, 7, '#cfe', 'center'); G.text(x, '↓ ПОДКАТ   P — ПАУЗА', W / 2, 166, 7, '#cfe', 'center'); }
        G.button(x, btns, 'БЕЖАТЬ', W / 2 - 60, 194, 120, 26, start, true);
        var oscars = BOS.store('escape-oscar') || 0;
        G.text(x, 'РЕКОРД ' + g.best + ' М' + (g.bestTime ? ' · ЛУЧШЕЕ ВРЕМЯ ' + Math.floor(g.bestTime / 60) + ':' + ('0' + g.bestTime % 60).slice(-2) : '') + (oscars ? ' · ОСКАРОВ: ' + oscars : ''), W / 2, 234, 6, '#8aa', 'center');
      }
      if (g.state === 'paused') { x.fillStyle = 'rgba(0,0,40,.5)'; x.fillRect(0, T0, W, HB - T0); g.overlay([['ПАУЗА', 12, '#ffd400'], [touch ? 'НАЖМИ «ПРОДОЛЖИТЬ»' : '«ПРОДОЛЖИТЬ», P ИЛИ ENTER', 7]]); }
      if (over) {
        var T = g.overT;
        if (T > 0.8 && T < RES_T) {
          x.fillStyle = '#fff'; var m = 14, L = 22;
          [[m, T0 + 64, 1, 1], [W - m, T0 + 64, -1, 1], [m, HB - 14, 1, -1], [W - m, HB - 14, -1, -1]].forEach(function (c) { x.fillRect(c[2] > 0 ? c[0] : c[0] - L, c[3] > 0 ? c[1] : c[1] - 2, L, 2); x.fillRect(c[2] > 0 ? c[0] : c[0] - 2, c[3] > 0 ? c[1] : c[1] - L, 2, L); });
          if (Math.floor(t * 2.5) % 2 || red) { x.fillStyle = '#ff2a2a'; x.fillRect(m + 8, T0 + 72, 7, 7); G.text(x, 'REC', m + 19, T0 + 72, 7, '#ff2a2a'); }
          var pop = red ? 1 : Math.min(1, (T - 0.8) / 0.18), size = Math.round(10 + 6 * pop);
          x.fillStyle = 'rgba(0,0,0,.72)'; x.fillRect(0, 98, W, size + 26); G.text(x, 'СНЯТО! НО НЕ ОСКАР', W / 2, 104, Math.min(size, W < 330 ? 11 : 16), '#ff2a2a', 'center');
          if (T > 1.1) bubble(x, 'КИРИЛЛ, ЕЩЁ ОДИН ДУБЛЬ!', sx(opx + opSide, -0.38), sy(-0.38) - 27 * KS);
        }
        if (T >= RES_T) {
          x.fillStyle = 'rgba(0,0,40,.84)'; x.fillRect(0, T0, W, HB - T0);
          G.text(x, 'СНЯТО! НО НЕ ОСКАР', W / 2, 46, W < 330 ? 11 : 15, '#ff2a2a', 'center');
          G.text(x, 'ОПЕРАТОР ВСЁ-ТАКИ ДОБИЛСЯ СВОЕГО', W / 2, 74, 7, '#fff', 'center');
          G.text(x, 'ДИСТАНЦИЯ: ' + finalDist + ' М · ' + Math.floor(E.prog(finalDist) * 100) + '% ПУТИ', W / 2, 104, 8, '#ffd400', 'center');
          G.text(x, 'ЭТАП: ' + E.STAGE_NAMES[E.stageOf(finalDist)], W / 2, 120, 7, '#cfe', 'center');
          G.text(x, 'УСКОРЕНИЙ СОБРАНО: ' + s.pads, W / 2, 138, 8, '#3cff00', 'center');
          G.text(x, 'ЛУЧШИЙ РЕЗУЛЬТАТ: ' + g.best + ' М', W / 2, 154, 8, '#cfe', 'center');
          if (g.newRecord) G.text(x, 'НОВЫЙ РЕКОРД!', W / 2, 172, 8, Math.floor(t * 3) % 2 || red ? '#3cff00' : '#fff', 'center');
          G.button(x, btns, 'ПОПРОБОВАТЬ ЕЩЁ РАЗ', W / 2 - 92, 194, 184, 26, start, true);
          G.button(x, btns, 'ВЫЙТИ', W / 2 - 50, 226, 100, 22, function () { if (hooks.exit) hooks.exit(); }, false);
        }
      }
    };
    g.begin(); reset(); g.setState('ready');
    return g;
  };

  G.previewEscape = function (c) {
    var x = c.getContext('2d'); x.imageSmoothingEnabled = false; var sc = c.height / 100; x.setTransform(sc, 0, 0, sc, 0, 0); var W = c.width / sc, cx = W / 2, hy = 30, gy = 82;
    var gr = x.createLinearGradient(0, 0, 0, hy); gr.addColorStop(0, '#04020c'); gr.addColorStop(1, '#3a1248'); x.fillStyle = gr; x.fillRect(0, 0, W, 100); G.drawCity(x, G.city(11, 500), 0, hy, '#1a1036', '#ff4fd8', W); x.fillStyle = '#0e0e24'; x.fillRect(0, hy, W, 70);
    function q(col, l1, l2, p1, p2) { x.fillStyle = col; x.beginPath(); x.moveTo(cx + l1 * 30 * p1, hy + (gy - hy) * p1); x.lineTo(cx + l2 * 30 * p1, hy + (gy - hy) * p1); x.lineTo(cx + l2 * 30 * p2, hy + (gy - hy) * p2); x.lineTo(cx + l1 * 30 * p2, hy + (gy - hy) * p2); x.fill(); }
    q('#a3101e', -1.6, 1.6, 1.5, 0.05); for (var i = 0; i < 12; i++) { var p = 1.5 / (1 + i * 0.45); q('#8a0a18', -1.5, 1.5, p, p * 0.97); }
    q('#ffd400', -1.62, -1.55, 1.5, 0.05); q('#ffd400', 1.55, 1.62, 1.5, 0.05);
    q('#22c40a', 0.6, 1.4, 0.62, 0.42); q('#eaffd0', 0.75, 1.25, 0.55, 0.52);
    x.fillStyle = '#ffd400'; x.fillRect(Math.round(cx) - 1, hy + 2, 2, 6); x.fillRect(Math.round(cx) - 2, hy + 4, 4, 3);
    spr(x, K_RUN, KP, cx, gy, 1); spr(x, O_RUN_A, OP, cx - 22, 118, 2);
  };
})(typeof window !== 'undefined' ? window : globalThis);
