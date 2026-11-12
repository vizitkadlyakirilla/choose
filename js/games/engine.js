/* Мини-движок для пиксельных игр BulanOS: Canvas 2D, логическое разрешение, игровой цикл с паузой, ввод. */
(function () {
  var BOS = window.BOS = window.BOS || {};
  var G = BOS.games = BOS.games || {};

  /* Рисование пиксельного спрайта: rows — массив строк, pal — символ → цвет. flip — зеркально. */
  G.sprite = function (ctx, rows, pal, x, y, s, flip) {
    s = s || 1;
    for (var j = 0; j < rows.length; j++) { var r = rows[j];
      for (var i = 0; i < r.length; i++) { var c = pal[r[i]]; if (!c) continue;
        ctx.fillStyle = c; ctx.fillRect(x + (flip ? (r.length - 1 - i) : i) * s, y + j * s, s, s); } }
  };
  G.text = function (ctx, t, x, y, size, color, align) {
    ctx.font = size + "px 'Press Start 2P', 'VT323', monospace"; ctx.fillStyle = color || '#fff'; ctx.textAlign = align || 'left'; ctx.textBaseline = 'top'; ctx.fillText(t, x, y);
  };
  G.sfx = function (n) { if (BOS.audio) BOS.audio.sfx(n); else if (BOS.gameSound && BOS.gameSound() && BOS.sfx) BOS.sfx(n); };
  G.music = function () { return BOS.audio || null; };

  /* Базовая игра: fit по контейнеру, логическая высота H, цикл requestAnimationFrame, состояния ready/run/paused/over */
  G.Game = function (canvas, H, hooks) {
    var g = this; this.c = canvas; this.ctx = canvas.getContext('2d'); this.H = H; this.hooks = hooks || {};
    this.state = 'ready'; this.raf = 0; this.last = 0; this.dead = false;
    this.best = (BOS.store && BOS.store(hooks.recordKey)) || 0;
    this.fit = function () {
      var r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(2, Math.round(r.width * dpr)); canvas.height = Math.max(2, Math.round(r.height * dpr));
      g.s = Math.min(canvas.height / g.H, canvas.width / (g.minW || 1)); g.Wd = canvas.width / g.s; g.oy = (canvas.height / g.s - g.H) / 2; g.top = -g.oy; g.bot = g.H + g.oy; g.ctx.imageSmoothingEnabled = false;
      if (g.onResize) g.onResize(); g.draw();
    };
    this.ro = ('ResizeObserver' in window) ? new ResizeObserver(this.fit) : null;
    if (this.ro) this.ro.observe(canvas); else window.addEventListener('resize', this.fit);
    this.loop = function (t) {
      if (g.dead) return;
      var dt = Math.min(0.033, (t - (g.last || t)) / 1000); g.last = t;
      if (g.state === 'run') g.update(dt);
      g.draw(); g.raf = requestAnimationFrame(g.loop);
    };
  };
  G.Game.prototype.begin = function () { this.fit(); this.raf = requestAnimationFrame(this.loop); this.emit(); };
  G.Game.prototype.setState = function (s) {
    var prev = this.state; this.state = s; var a = BOS.audio;
    /* музыка: старт по первому действию игрока, пауза вместе с игрой */
    if (a && this.song) {
      if (s === 'run' && prev === 'paused') a.resume(this);
      else if (s === 'run') a.play(this.song, this, { restart: prev === 'over' || prev === 'win' });
      else if (s === 'paused') a.pause(this);
    }
    if (this.hooks.state) this.hooks.state(s);
  };
  G.Game.prototype.emit = function () { if (this.hooks.score) this.hooks.score(Math.floor(this.score || 0), this.best); };
  G.Game.prototype.record = function () { var sc = Math.floor(this.score || 0); if (sc > this.best) { this.best = sc; if (BOS.store) BOS.store(this.hooks.recordKey, sc); this.newRecord = true; } else this.newRecord = false; this.emit(); };
  G.Game.prototype.pause = function () { if (this.state === 'run') { this.setState('paused'); this.release && this.release(); } };
  G.Game.prototype.resume = function () { if (this.state === 'paused') { this.last = 0; this.setState('run'); } };
  G.Game.prototype.isPaused = function () { return this.state === 'paused'; };
  G.Game.prototype.destroy = function () { if (BOS.audio) BOS.audio.stop(this, 'fade'); this.dead = true; cancelAnimationFrame(this.raf); if (this.ro) this.ro.disconnect(); else window.removeEventListener('resize', this.fit); if (this.unbind) this.unbind(); };
  G.Game.prototype.begin2d = function () { var x = this.ctx; x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = this.bg || '#000'; x.fillRect(0, 0, this.c.width, this.c.height); x.setTransform(this.s, 0, 0, this.s, 0, Math.round(this.oy * this.s)); x.imageSmoothingEnabled = false; return x; };
  G.Game.prototype.overlay = function (lines) {
    var x = this.ctx, W = this.Wd, H = this.H;
    x.fillStyle = 'rgba(0,0,40,.72)'; x.fillRect(0, 0, W, H);
    var y = H / 2 - lines.length * 9;
    lines.forEach(function (l) { G.text(x, l[0], W / 2, y, l[1] || 8, l[2] || '#fff', 'center'); y += (l[1] || 8) + 8; });
  };

  /* Ввод «нажал/отпустил» для клавиатуры (на canvas), мыши и касаний */
  G.bindPress = function (canvas, down, up, keys) {
    keys = keys || [' ', 'Spacebar', 'ArrowUp'];
    function kd(e) { if (keys.indexOf(e.key) >= 0) { e.preventDefault(); if (!e.repeat) down(); } if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') { canvas.dispatchEvent(new CustomEvent('gamepausekey')); } }
    function ku(e) { if (keys.indexOf(e.key) >= 0) { e.preventDefault(); up(); } }
    function pd(e) { if (e.button && e.button !== 0) return; e.preventDefault(); canvas.focus(); try { canvas.setPointerCapture(e.pointerId); } catch (er) {} down(); }
    function pu(e) { e.preventDefault(); up(); }
    canvas.addEventListener('keydown', kd); canvas.addEventListener('keyup', ku);
    canvas.addEventListener('pointerdown', pd); canvas.addEventListener('pointerup', pu); canvas.addEventListener('pointercancel', pu);
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    return function () { canvas.removeEventListener('keydown', kd); canvas.removeEventListener('keyup', ku); canvas.removeEventListener('pointerdown', pd); canvas.removeEventListener('pointerup', pu); canvas.removeEventListener('pointercancel', pu); };
  };

  /* Спрайт с привязкой к ступням (cx — центр, footY — низ), без швов при дробном масштабе */
  G.spr = function (x, rows, pal, cx, footY, s, flip, rot) {
    var w = rows[0].length, h = rows.length, ox = -w * s / 2, oy = -h * s;
    if (rot) { x.save(); x.translate(cx, footY); x.rotate(rot); cx = 0; footY = 0; }
    for (var j = 0; j < h; j++) { var r = rows[j], y0 = Math.round(footY + oy + j * s), y1 = Math.round(footY + oy + (j + 1) * s);
      for (var i = 0; i < w; i++) { var c = pal[r[i]]; if (!c) continue; var ii = flip ? w - 1 - i : i, x0 = Math.round(cx + ox + ii * s), x1 = Math.round(cx + ox + (ii + 1) * s);
        x.fillStyle = c; x.fillRect(x0, y0, x1 - x0, y1 - y0); } }
    if (rot) x.restore();
  };

  /* Кирилл анфас (по фото: русые волосы с чёлкой, борода, тёмный свитер, джинсы, светлые кроссовки).
     Руки рисуются отдельно, под любым углом: o.la / o.ra — угол левой/правой руки (рад, 0 — вправо, π/2 — вниз),
     o.finger — вытянутый указательный палец на правой руке, o.smile — улыбка. Возвращает координаты кистей. */
  G.KF_PAL = { H: '#a3693f', h: '#7a4a2b', S: '#efc3a0', s: '#d6a07f', B: '#8e5a35', E: '#2a1a12', M: '#5a2a1a', W: '#f5efe6', D: '#3d3f46', d: '#2b2c31', J: '#2c3650', j: '#1e2538', K: '#d8dad6', G: '#7fd14a' };
  var KF = ['....hHHHh....', '...hHHHHHHh..', '..hHHHHHHHHh.', '..HHHhHHHhHH.', '..HSSSSSSSSH.', '..SSESSSSESS.', '..SSSSsSSSSS.', '..BSSSSSSSSB.', '..BBSMMMSBB..', '..BBBBBBBBB..', '...BBBBBBB...', '.....SSS.....',
    '...DDDDDDD...', '..DDDDDDDDD..', '..DDDDDDDDD..', '..DDDDdDDDD..', '..DDDDdDDDD..', '..DDDDDDDDD..', '..DDDDDDDDD..', '..JJJJJJJJJ..', '..JJJJJJJJJ..', '..JJJJ.JJJJ..', '..JJJ...JJJ..', '..JJJ...JJJ..', '..JJJ...JJJ..', '..jjj...jjj..', '..jjj...jjj..', '.KKKK...KKKK.', '.KGKK...KKGK.'];
  var KF_SMILE = KF.slice(); KF_SMILE[8] = '..BBMWWWMBB..'; KF_SMILE[7] = '..BSSSSSSSSB.';
  G.KF = KF;
  G.kirillFront = function (x, cx, footY, s, o) {
    o = o || {}; var rows = o.smile ? KF_SMILE : KF, w = rows[0].length, h = rows.length, left = cx - w * s / 2, top = footY - h * s, P = G.KF_PAL;
    function arm(sx, sy, a, len, finger) {
      var hx = sx, hy = sy;
      for (var i = 0; i <= len; i += 0.5) { hx = sx + Math.cos(a) * i; hy = sy + Math.sin(a) * i;
        x.fillStyle = i > len - 1.5 ? P.S : P.D; x.fillRect(Math.round(left + (hx - 1) * s), Math.round(top + (hy - 1) * s), Math.ceil(2 * s), Math.ceil(2 * s)); }
      if (finger) { for (var k = 0.5; k <= 2.6; k += 0.5) { var fx = hx + Math.cos(a) * k, fy = hy + Math.sin(a) * k; x.fillStyle = P.S; x.fillRect(Math.round(left + (fx - 0.5) * s), Math.round(top + (fy - 0.5) * s), Math.ceil(s), Math.ceil(s)); } hx += Math.cos(a) * 2.6; hy += Math.sin(a) * 2.6; }
      return { x: left + hx * s, y: top + hy * s };
    }
    G.spr(x, rows, P, cx, footY, s);
    var la = o.la == null ? Math.PI / 2 + 0.12 : o.la, ra = o.ra == null ? Math.PI / 2 - 0.12 : o.ra;
    var L = arm(1.6, 13.2, la, 8.5, false), R = arm(11.4, 13.2, ra, 8.5, !!o.finger);
    return { l: L, r: R, top: top, s: s };
  };

  /* Земля пиксельным шаром: rot — поворот (рад), материки процедурные */
  function land(lon, lat) {
    var v = Math.sin(lon * 2 + 0.6) * Math.cos(lat * 2.2) + 0.55 * Math.sin(lon * 3.7 + 1.3) * Math.cos(lat * 3.1 - 0.4) + 0.3 * Math.cos(lon * 6.1 + lat * 4.4);
    return v > 0.45;
  }
  G.drawEarth = function (x, cx, cy, r, rot, opt) {
    opt = opt || {}; var n = Math.max(8, Math.min(34, Math.round(r / 2.2))), ps = (2 * r) / n;
    for (var j = 0; j < n; j++) for (var i = 0; i < n; i++) {
      var nx = (i + 0.5) / n * 2 - 1, ny = (j + 0.5) / n * 2 - 1, d2 = nx * nx + ny * ny; if (d2 > 1) continue;
      var z = Math.sqrt(1 - d2), lat = Math.asin(-ny), lon = Math.atan2(nx, z) + rot, sh = 0.55 + 0.45 * (z * 0.8 + nx * -0.3 + ny * -0.2);
      var col;
      if (Math.abs(lat) > 1.22) col = [235, 245, 255];
      else if (land(lon, lat)) col = Math.abs(lat) > 0.9 ? [150, 160, 120] : (Math.sin(lon * 7 + lat * 5) > 0.6 ? [190, 160, 90] : [60, 150, 70]);
      else col = [30, 90, 200];
      if (Math.sin(lon * 3 + 1) * Math.sin(lat * 5 + lon) > 0.72) col = [240, 245, 250];
      x.fillStyle = 'rgb(' + Math.round(col[0] * sh) + ',' + Math.round(col[1] * sh) + ',' + Math.round(col[2] * sh) + ')';
      x.fillRect(Math.floor(cx - r + i * ps), Math.floor(cy - r + j * ps), Math.ceil(ps), Math.ceil(ps));
    }
    if (opt.glow !== false) { x.strokeStyle = 'rgba(120,190,255,.45)'; x.lineWidth = Math.max(1, r * 0.06); x.beginPath(); x.arc(cx, cy, r + x.lineWidth / 2, 0, Math.PI * 2); x.stroke(); }
  };

  /* Кнопка на canvas: регистрирует зону нажатия в btns */
  G.button = function (x, btns, label, bx, by, w, h, fn, primary) {
    bx = Math.round(bx); by = Math.round(by);
    x.fillStyle = '#000'; x.fillRect(bx + 2, by + 2, w, h); x.fillStyle = primary ? '#ffd400' : '#c0c0c0'; x.fillRect(bx, by, w, h);
    x.fillStyle = '#fff'; x.fillRect(bx, by, w, 2); x.fillRect(bx, by, 2, h); x.fillStyle = primary ? '#a07a00' : '#666'; x.fillRect(bx, by + h - 2, w, 2); x.fillRect(bx + w - 2, by, 2, h);
    G.text(x, label, bx + w / 2, by + (h - 8) / 2, 8, '#000', 'center');
    btns.push({ x: bx, y: by, w: w, h: h, fn: fn });
  };
  G.hitBtn = function (g, btns, e) {
    var r = g.c.getBoundingClientRect(), k = g.c.width / r.width / g.s, px = (e.clientX - r.left) * k, py = (e.clientY - r.top) * k - g.oy;
    return btns.filter(function (q) { return px >= q.x && px <= q.x + q.w && py >= q.y && py <= q.y + q.h; })[0];
  };

  /* Ночной город на фоне (общий для игр, связывает их с «компьютером» Кирилла) */
  G.city = function (seed, n) {
    var b = [], x = 0, r = seed || 7; function rnd() { r = (r * 9301 + 49297) % 233280; return r / 233280; }
    while (x < (n || 900)) { var w = 18 + Math.floor(rnd() * 26), h = 18 + Math.floor(rnd() * 46), win = []; for (var i = 0; i < 10; i++) if (rnd() > .55) win.push([2 + Math.floor(rnd() * (w - 6)), 3 + Math.floor(rnd() * (h - 8))]); b.push({ x: x, w: w, h: h, win: win }); x += w + 2; }
    return { b: b, len: x };
  };
  G.drawCity = function (ctx, city, offset, baseY, col, winCol, W) {
    var L = city.len; for (var k = -1; k < 2; k++) city.b.forEach(function (bd) {
      var x = Math.floor(bd.x - (offset % L) + k * L); if (x > W || x + bd.w < 0) return;
      ctx.fillStyle = col; ctx.fillRect(x, baseY - bd.h, bd.w, bd.h);
      ctx.fillStyle = winCol; bd.win.forEach(function (p) { ctx.fillRect(x + p[0], baseY - bd.h + p[1], 2, 2); });
    });
  };
})();
