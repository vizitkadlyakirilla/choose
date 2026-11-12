/* БУЛАНОЗАВР — раннер BulanOS. Оригинальный пиксельный персонаж: фиолетовый ящер с рыжей чёлкой и бородой, в сером худи и кедах. */
(function () {
  var BOS = window.BOS, G = BOS.games;
  var PAL = { g: '#8a6cff', G: '#6a4fd8', h: '#d0773a', b: '#b5652c', k: '#0b0b1a', w: '#ffffff', x: '#ff3b30', d: '#7a7a86', D: '#5a5a66', s: '#eeeeee', l: '#3cff00' };
  var TOP = [
    '...........hhhh.....', '.........hhhhhhh....', '........gggggggggg..', '........ggkggggggg..', '........gggggggggggg', '........gggggggwwwww', '........ggggggggg...', '........bbbbbbbb....',
    '...g....dbbbbbd.....', '..gg...dddddddd.....', '.ggg..ddddddddddd...', 'gggg.dddddddddddgg..', 'ggggddddddddddd.....', '.gggdddddddddddd....', '..ggDDDDDDDDDDD.....', '....ggggggggggg.....'];
  var LEGS = {
    run1: ['....gg.....gg.......', '....gg......gg......', '...sss......sss.....', '...lss.......ls.....'],
    run2: ['.....gg...gg........', '....gg....gg........', '...sss....sss.......', '...ls.....lss.......'],
    jump: ['....gggggggg........', '....ss....ss........', '....ls....ls........', '....................'],
    land: ['...gg.......gg......', '..sss.......sss.....', '..lss.......lss.....', '....................']
  };
  function frame(name, crash) { var t = TOP.slice(); if (crash) { t[3] = '........ggxgggggggg.'.slice(0, 20); t[2] = '........ggxgxggggg..'.slice(0, 20); t[5] = '........ggggggg.ww..'; } return t.concat(LEGS[name]); }
  var F = { run1: frame('run1'), run2: frame('run2'), jump: frame('jump'), land: frame('land'), crash: frame('jump', true) };
  /* препятствия: штатив, софит, стопка кассет, низкий дрон */
  var OB = {
    tripod: { pal: { k: '#c0c0c0', d: '#808080', r: '#e0301e' }, rows: ['..rrrr..', '..kkkk..', '...kk...', '...kk...', '...kk...', '..k..k..', '..k..k..', '.k....k.', '.k....k.', 'k......k', 'k......k', 'k......k'] },
    light: { pal: { y: '#ffd400', k: '#c0c0c0', d: '#808080', w: '#fffbe0' }, rows: ['kkkkkkkk', 'kwwwwwwk', 'kwyyyywk', 'kkkkkkkk', '...kk...', '...kk...', '...kk...', '...kk...', '...kk...', '...kk...', '..k..k..', '.k....k.', 'k......k', 'k......k'] },
    tapes: { pal: { k: '#1a1a1a', w: '#e8e8e8', r: '#e0301e', b: '#1084d0' }, rows: ['kkkkkkkkkk', 'kwwrrrrwwk', 'kkkkkkkkkk', 'kkkkkkkkkk', 'kwwbbbbwwk', 'kkkkkkkkkk', 'kkkkkkkkkk', 'kwwrrrrwwk', 'kkkkkkkkkk'] },
    drone: { pal: { k: '#c0c0c0', d: '#606060', r: '#ff3b30', g: '#3cff00' }, fly: true, rows: ['kkkk......kkkk', '..dd......dd..', '..dkkkkkkkkd..', '...kkrkkgkk...', '....kkkkkk....'] }
  };
  var GROUND = 140, H = 160;

  G.dino = function (canvas, hooks) {
    var g = new G.Game(canvas, H, hooks); g.song = 'dino'; g.minW = 260; g.bg = '#06063a';
    var city = G.city(11, 900), stars = [];
    for (var i = 0; i < 60; i++) stars.push([Math.random() * 1200, Math.random() * 90, Math.random() > .8 ? 2 : 1]);
    function reset() {
      g.score = 0; g.speed = 150; g.t = 0; g.dist = 0; g.next = 0.9;
      g.d = { x: 34, y: GROUND - 20, vy: 0, on: true, holding: false, landT: 0, hitT: 0 };
      g.obs = []; g.parts = []; g.flash = 0; g.emit();
    }
    reset();
    function jump() {
      if (g.state === 'ready') { g.setState('run'); }
      if (g.state === 'over') { if (g.overT > 0.4) { reset(); g.setState('run'); } return; }
      if (g.state !== 'run') return;
      g.d.holding = true;
      if (g.d.on) { g.d.vy = -335; g.d.on = false; G.sfx('jump'); }
    }
    function release() { if (g.d.holding && g.d.vy < -140) g.d.vy = -140; g.d.holding = false; }
    g.release = release;
    g.unbind = G.bindPress(canvas, jump, release);
    canvas.addEventListener('gamepausekey', function () { if (g.state === 'run') g.pause(); else g.resume(); });
    function spawn() {
      var pool = g.score > 150 ? ['tripod', 'light', 'tapes', 'drone', 'tripod', 'tapes'] : ['tripod', 'tapes', 'light'];
      var k = pool[Math.floor(Math.random() * pool.length)], o = OB[k], h = o.rows.length, w = o.rows[0].length;
      var y = o.fly ? GROUND - 22 - Math.floor(Math.random() * 4) : GROUND - h;
      g.obs.push({ k: k, x: g.Wd + 10, y: y, w: w, h: h });
      if (!o.fly && g.score > 300 && Math.random() < 0.25) { var k2 = 'tapes', o2 = OB[k2]; g.obs.push({ k: k2, x: g.Wd + 10 + w + 2, y: GROUND - o2.rows.length, w: o2.rows[0].length, h: o2.rows.length }); }
      var gap = (0.8 + Math.random() * 0.9) * (1 - Math.min(0.35, g.score / 3000));
      g.next = Math.max(0.55, gap + 18 / g.speed);
    }
    g.update = function (dt) {
      var d = g.d;
      g.t += dt; g.speed = Math.min(430, 150 + g.t * 6.5);
      var dx = g.speed * dt; g.dist += dx; var prev = Math.floor(g.score); g.score += dx * 0.12;
      if (Math.floor(g.score / 100) > Math.floor(prev / 100)) { G.sfx('score'); g.flash = 0.6; }
      if (BOS.audio) BOS.audio.set('i', g.score < 120 ? 0 : g.score < 350 ? 1 : g.score < 800 ? 2 : 3, g);
      if (Math.floor(g.score) !== prev) g.emit();
      d.vy += (d.holding && d.vy < 0 ? 900 : 1400) * dt; d.y += d.vy * dt;
      if (d.y >= GROUND - 20) { if (!d.on) { d.landT = 0.12; G.sfx('land'); for (var i = 0; i < 5; i++) g.parts.push({ x: d.x + 6 + Math.random() * 8, y: GROUND - 1, vx: -30 - Math.random() * 40, vy: -20 - Math.random() * 30, t: 0.4 }); } d.y = GROUND - 20; d.vy = 0; d.on = true; }
      d.landT = Math.max(0, d.landT - dt);
      g.next -= dt; if (g.next <= 0) spawn();
      g.obs.forEach(function (o) { o.x -= dx; }); g.obs = g.obs.filter(function (o) { return o.x + o.w > -5; });
      g.parts.forEach(function (p) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.t -= dt; }); g.parts = g.parts.filter(function (p) { return p.t > 0; });
      g.flash = Math.max(0, g.flash - dt);
      /* столкновения: прямоугольник тела с запасом */
      var bx = d.x + 3, by = d.y + 2, bw = 14, bh = 17;
      for (var j = 0; j < g.obs.length; j++) { var o = g.obs[j];
        if (bx < o.x + o.w - 1 && bx + bw > o.x + 1 && by < o.y + o.h - 1 && by + bh > o.y + 1) { g.setState('over'); g.overT = 0; G.sfx('hit'); if (BOS.audio) { BOS.audio.stop(g, 'cut'); BOS.audio.sfx('clapper'); } g.record(); break; } }
    };
    var tAnim = 0;
    g.draw = function () {
      if (!g.s) return;
      var x = g.begin2d(), W = g.Wd, d = g.d; tAnim += 1 / 60; if (g.state === 'over') g.overT = (g.overT || 0) + 1 / 60;
      x.fillStyle = '#06063a'; x.fillRect(0, 0, W, H);
      stars.forEach(function (s) { var sx = (s[0] - g.dist * 0.05) % 1200; if (sx < 0) sx += 1200; if (sx < W) { x.fillStyle = s[2] > 1 ? '#ffd400' : '#9ab'; x.fillRect(Math.floor(sx), Math.floor(s[1]), 1, 1); } });
      G.sprite(x, ['..www.', '.ww...', 'ww....', 'ww....', 'ww....', '.ww...', '..www.'], { w: '#f5f0d0' }, Math.floor(W * 0.62), 24, 1);
      G.drawCity(x, city, g.dist * 0.25, GROUND, '#14144f', '#ffd400', W);
      x.fillStyle = '#c0c0c0'; x.fillRect(0, GROUND, W, 1); x.fillStyle = '#5a5a66';
      for (var i = 0; i < W; i += 7) { var gx = Math.floor((i - g.dist) % 7 + i); x.fillRect(((i * 13 - Math.floor(g.dist)) % W + W) % W, GROUND + 3 + (i % 3) * 3, 2, 1); }
      g.obs.forEach(function (o) { var ob = OB[o.k], rows = ob.rows;
        if (ob.fly) { rows = rows.slice(); if (Math.floor(tAnim * 12) % 2) rows[0] = '.kk........kk.'; }
        G.sprite(x, rows, ob.pal, Math.floor(o.x), Math.floor(o.y), 1); });
      var fr = g.state === 'over' ? F.crash : !d.on ? F.jump : d.landT > 0 ? F.land : (g.state === 'run' && Math.floor(tAnim * 10) % 2 ? F.run2 : F.run1);
      G.sprite(x, fr, PAL, Math.floor(d.x), Math.floor(d.y + (d.landT > 0 ? 1 : 0)), 1);
      g.parts.forEach(function (p) { x.fillStyle = '#c0c0c0'; x.fillRect(Math.floor(p.x), Math.floor(p.y), 1, 1); });
      var sc = ('00000' + Math.floor(g.score)).slice(-5), hi = ('00000' + g.best).slice(-5);
      if (!(g.flash > 0 && Math.floor(g.flash * 10) % 2)) G.text(x, sc, W - 8, 8, 8, '#3cff00', 'right');
      G.text(x, 'РЕК ' + hi, W - 56, 8, 8, '#8aa', 'right');
      if (g.state === 'ready') g.overlay([['БУЛАНОЗАВР', 12, '#ffd400'], ['ПРОБЕЛ / ↑ / ТАП — ПРЫЖОК', 7], ['ДЕРЖИ ДОЛЬШЕ — ВЫШЕ', 7, '#8aa']]);
      if (g.state === 'paused') g.overlay([['ПАУЗА', 12, '#ffd400'], ['«ПРОДОЛЖИТЬ» ИЛИ P', 7]]);
      if (g.state === 'over') g.overlay([['СТОП! СНЯТО.', 12, '#ff5a48'], ['СЧЁТ ' + Math.floor(g.score) + (g.newRecord ? ' — НОВЫЙ РЕКОРД!' : ''), 8, g.newRecord ? '#3cff00' : '#fff'], ['ПРЫЖОК — ЕЩЁ ДУБЛЬ', 7, '#8aa']]);
    };
    g.restart = function () { reset(); g.setState('run'); };
    g.begin(); g.setState('ready');
    return g;
  };

  /* превью для карточек и 404 */
  G.previewDino = function (c, sad) {
    var x = c.getContext('2d'); x.imageSmoothingEnabled = false; var s = c.height / 60;
    x.setTransform(s, 0, 0, s, 0, 0); var W = c.width / s;
    x.fillStyle = '#06063a'; x.fillRect(0, 0, W, 60);
    G.drawCity(x, G.city(11, 400), 0, 50, '#14144f', '#ffd400', W);
    x.fillStyle = '#c0c0c0'; x.fillRect(0, 50, W, 1);
    G.sprite(x, sad ? F.crash : F.run1, PAL, 18, 30, 1);
    G.sprite(x, OB.tripod.rows, OB.tripod.pal, W - 40, 38, 1);
    if (!sad) G.sprite(x, OB.drone.rows, OB.drone.pal, W - 80, 20, 1); else G.text(x, '404', W - 40, 10, 10, '#ff5a48', 'center');
  };
})();
