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
  G.sfx = function (n) { if (BOS.gameSound && BOS.gameSound() && BOS.sfx) BOS.sfx(n); };

  /* Базовая игра: fit по контейнеру, логическая высота H, цикл requestAnimationFrame, состояния ready/run/paused/over */
  G.Game = function (canvas, H, hooks) {
    var g = this; this.c = canvas; this.ctx = canvas.getContext('2d'); this.H = H; this.hooks = hooks || {};
    this.state = 'ready'; this.raf = 0; this.last = 0; this.dead = false;
    this.best = (BOS.store && BOS.store(hooks.recordKey)) || 0;
    this.fit = function () {
      var r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(2, Math.round(r.width * dpr)); canvas.height = Math.max(2, Math.round(r.height * dpr));
      g.s = Math.min(canvas.height / g.H, canvas.width / (g.minW || 1)); g.Wd = canvas.width / g.s; g.oy = (canvas.height / g.s - g.H) / 2; g.ctx.imageSmoothingEnabled = false;
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
  G.Game.prototype.setState = function (s) { this.state = s; if (this.hooks.state) this.hooks.state(s); };
  G.Game.prototype.emit = function () { if (this.hooks.score) this.hooks.score(Math.floor(this.score || 0), this.best); };
  G.Game.prototype.record = function () { var sc = Math.floor(this.score || 0); if (sc > this.best) { this.best = sc; if (BOS.store) BOS.store(this.hooks.recordKey, sc); this.newRecord = true; } else this.newRecord = false; this.emit(); };
  G.Game.prototype.pause = function () { if (this.state === 'run') { this.setState('paused'); this.release && this.release(); } };
  G.Game.prototype.resume = function () { if (this.state === 'paused') { this.last = 0; this.setState('run'); } };
  G.Game.prototype.isPaused = function () { return this.state === 'paused'; };
  G.Game.prototype.destroy = function () { this.dead = true; cancelAnimationFrame(this.raf); if (this.ro) this.ro.disconnect(); else window.removeEventListener('resize', this.fit); if (this.unbind) this.unbind(); };
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
