/* BulanOS — оконный менеджер, меню «Пуск», панель задач, уведомления, загрузка/перезагрузка/выключение. */
(function () {
  var BOS = window.BOS, $ = BOS.$, $$ = BOS.$$;
  BOS.apps = BOS.apps || {};
  var wins = {}, z = 20, seq = 0;

  /* ---------- пиксельные иконки (SVG, рисуются прямоугольниками) ---------- */
  function px(rows, pal, size) {
    var h = rows.length, w = rows[0].length, r = '';
    rows.forEach(function (row, y) { for (var x = 0; x < w; x++) { var c = row[x]; if (pal[c]) r += '<rect x="' + x + '" y="' + y + '" width="1.02" height="1.02" fill="' + pal[c] + '"/>'; } });
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" shape-rendering="crispEdges" aria-hidden="true" focusable="false">' + r + '</svg>';
  }
  var P = { k: '#000', w: '#fff', g: '#c0c0c0', d: '#808080', b: '#1084d0', n: '#000080', y: '#ffd400', o: '#f7a21b', r: '#e0301e', l: '#3cff00', t: '#008080', s: '#efc19c', h: '#a0623a', p: '#ff7ac8', c: '#7fd6ff' };
  BOS.icons = {
    about: px(['....kkkkkk....', '...khhhhhhk...', '..khhhhhhhhk..', '..khssssssk...', '..kseksseksk..', '..ksssssssk...', '..khsshhsshk..', '...khhhhhhk...', '....kkkkkk....', '..kbbbbbbbbk..', '.kbbbbbbbbbbk.', '.kbbbbbbbbbbk.', '.kbbbbbbbbbbk.', '.kkkkkkkkkkkk.'], P),
    director: px(['..............', '.kkkkkkkkkkkk.', '.kddddddddddk.', '.kdkkkkkkkkdk.', '.kdkbbbbbbkdk.', '.kdkbbwbbbkdk.', '.kdkbbwwbbkdk.', '.kdkbbwwwbkdk.', '.kdkbbwwbbkdk.', '.kdkbbwbbbkdk.', '.kdkkkkkkkkdk.', '.kddddddddddk.', '.kkkkkkkkkkkk.', '....kddddk....'], P),
    scripts: px(['.kkkkkkkkk....', '.kwwwwwwwwk...', '.kwwwwwwwwwk..', '.kwnnnnnnwwwk.', '.kwwwwwwwwwwk.', '.kwnnnnnnnnwk.', '.kwwwwwwwwwwk.', '.kwnnnnnnnnwk.', '.kwwwwwwwwwwk.', '.kwnnnnnwwwwk.', '.kwwwwwwwwwwk.', '.kwnnnnnnnnwk.', '.kwwwwwwwwwwk.', '.kkkkkkkkkkkk.'], P),
    ai: px(['..............', '.kkkkk........', '.kyyyyk.......', '.kyyyyykkkkkk.', '.kyyyyyyyyyyk.', '.kooooooooook.', '.koyyyyyyyyok.', '.koyypyypyyok.', '.koyyyyyyyyok.', '.koyyppppyyok.', '.koyyyyyyyyok.', '.kooooooooook.', '.kkkkkkkkkkkk.', '..............'], P),
    photos: px(['..............', '.kkkkkkkkkkkk.', '.kwwwwwwwwwwk.', '.kwccccccccwk.', '.kwccyycccc wk'.replace(' ', 'c'), '.kwccyyccccwk.', '.kwcccccclcwk.', '.kwccccclllwk.', '.kwlcccllllwk.', '.kwlllllllllwk'.slice(0, 14), '.kwwwwwwwwwwk.', '.kwwwwwwwwwwk.', '.kkkkkkkkkkkk.', '..............'], P),
    contacts: px(['..............', '.kkkkkkkkkkkk.', '.krrrrrrrrrrk.', '.kwrrrrrrrrwk.', '.kwwrrrrrrwwk.', '.kwwwrrrrwwwk.', '.kwwkwrrwkwwk.', '.kwkwwwwwwkwk.', '.kkwwwwwwwwkk.', '.kwwwwwwwwwwk.', '.kwwwwwwwwwwk.', '.kkkkkkkkkkkk.', '..............', '..............'], P),
    browser: px(['....kkkkkk....', '..kkbbbbbbkk..', '.kbbllbbbbbbk.', '.kbllllbbbllk.', 'kbbllllbblllbk', 'kbbbllbbbbllbk', 'kbbbblbbbbbbbk', 'kbbbbbllbbbbbk', 'kbbbbbllllbbbk', '.kbbbbllllbbk.', '.kbbbbbllbbbk.', '..kkbbbbbbkk..', '....kkkkkk....', '..............'], P),
    games: px(['..............', '..............', '..kkkkkkkkkk..', '.kddddddddddk.', 'kdddddddddddk.'.slice(0, 13) + '.', 'kdkddddddrdk..', 'kkkkdddddrrdk.', 'kdkddddrddddk.', 'kddddddddrddk.', 'kddddddddddddk', '.kddkkkkkkddk.', '..kk......kk..', '..............', '..............'].map(function (r) { return (r + '..............').slice(0, 14); }), P),
    settings: px(['.....kkkk.....', '..kk.kddk.kk..', '.kddkkddkkddk.', '.kddddddddddk.', '..kddkkkkddk..', 'kkkdkk..kkdkkk', 'kddddk..kddddk', 'kddddk..kddddk', 'kkkdkk..kkdkkk', '..kddkkkkddk..', '.kddddddddddk.', '.kddkkddkkddk.', '..kk.kddk.kk..', '.....kkkk.....'], P),
    reboot: px(['..............', '.....kkkk.....', '...kkllllkk.k.', '..kll....llkk.', '.kl.......kk..', '.kl....kkkkk..', '.kl...........', '.kl.......lk..', '.kl.......lk..', '..kll....llk..', '...kkllllkk...', '.....kkkk.....', '..............', '..............'], P),
    power: px(['..............', '......kk......', '..kk..kl..kk..', '.krk..kl..krk.', 'krk...kl...krk', 'kr....kl....rk', 'kr....kk....rk', 'kr..........rk', 'kr..........rk', '.krk......krk.', '..krrkkkkrrk..', '....krrrrk....', '..............', '..............'], P),
    sound: px(['......k...', '.....kk...', 'kkkkkwk.k.', 'kwwwkwk..k', 'kwwwkwk.k.', 'kkkkkwk...', '.....kk...', '......k...'], P),
    mute: px(['......k...', '.....kk...', 'kkkkkwkr.r', 'kwwwkwk.r.', 'kwwwkwkr.r', 'kkkkkwk...', '.....kk...', '......k...'], P)
  };
  BOS.icon = function (n) { return BOS.icons[n] || BOS.icons.about; };

  /* ---------- Буланозавр-логотип (canvas → dataURL) ---------- */
  BOS.DINO_HEAD = ['......hhhh..', '....hhgggg..', '...ggggggggg', '..ggggkgggggg'.slice(0, 12), '..gggggggggg', '..gggggggwww', '..ggggggg...', '.bggggggggg.', 'bbbbggggggg.', 'bbbbbgggg...', '.bbbbggg....', '..bbbggg....'];
  BOS.logoURL = function (scale) {
    var rows = BOS.DINO_HEAD, c = document.createElement('canvas'), s = scale || 4; c.width = rows[0].length * s; c.height = rows.length * s;
    var x = c.getContext('2d'), pal = { g: '#7b5cff', h: '#c66b33', k: '#000', w: '#fff', b: '#b5652c' };
    rows.forEach(function (r, j) { for (var i = 0; i < r.length; i++) if (pal[r[i]]) { x.fillStyle = pal[r[i]]; x.fillRect(i * s, j * s, s, s); } });
    return c.toDataURL();
  };

  /* ---------- окна ---------- */
  function cascade() { var n = Object.keys(wins).length % 6; return { x: 140 + n * 28, y: 20 + n * 26 }; }
  BOS.open = function (appId, opts) {
    opts = opts || {};
    var app = BOS.apps[appId]; if (!app) return null;
    closeMenu();
    var key = app.multi ? appId + '-' + (++seq) : appId;
    var w = wins[key];
    if (w) { restore(w); focus(w); if (app.update) app.update(w, opts); return w; }
    var el = document.createElement('section');
    el.className = 'win opening'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', app.title);
    el.innerHTML = '<header class="tb">' + BOS.icon(app.icon || appId) + '<span class="t"></span><div class="ctl">' +
      '<button type="button" class="bmin" aria-label="Свернуть" title="Свернуть">_</button>' +
      '<button type="button" class="bmax" aria-label="Развернуть" title="Развернуть">□</button>' +
      '<button type="button" class="bcls" aria-label="Закрыть" title="Закрыть">×</button></div></header>' +
      '<div class="wbody' + (app.flush ? ' flush' : '') + '"></div>' + (app.status ? '<div class="status"></div>' : '') + '<div class="grip" aria-hidden="true"></div>';
    var vw = $('.wins').clientWidth, vh = $('.wins').clientHeight, pos = cascade();
    var W = Math.min(app.w || 560, vw - 20), H = Math.min(app.h || 400, vh - 20);
    var X = opts.x != null ? opts.x : (app.x != null ? (typeof app.x === 'function' ? app.x(vw, W) : app.x) : pos.x);
    var Y = opts.y != null ? opts.y : (app.y != null ? (typeof app.y === 'function' ? app.y(vh, H) : app.y) : pos.y);
    X = Math.max(0, Math.min(X, vw - W)); Y = Math.max(0, Math.min(Y, vh - H));
    el.style.cssText = 'left:' + X + 'px;top:' + Y + 'px;width:' + W + 'px;height:' + H + 'px';
    $('.wins').appendChild(el);
    w = wins[key] = { key: key, id: appId, app: app, el: el, body: $('.wbody', el), min: false, max: false, data: {} };
    w.setTitle = function (t) { $('.t', el).textContent = t; el.setAttribute('aria-label', t); renderTasks(); };
    w.setStatus = function (a) { var s = $('.status', el); if (s) s.innerHTML = a.map(function (x) { return '<span>' + BOS.esc(x) + '</span>'; }).join(''); };
    w.close = function () { close(w); };
    w.setTitle(opts.title || app.title);
    $('.bmin', el).addEventListener('click', function (e) { e.stopPropagation(); minimize(w); });
    $('.bmax', el).addEventListener('click', function (e) { e.stopPropagation(); toggleMax(w); });
    $('.bcls', el).addEventListener('click', function (e) { e.stopPropagation(); close(w); });
    el.addEventListener('pointerdown', function () { focus(w); }, true);
    var tb = $('.tb', el);
    tb.addEventListener('dblclick', function (e) { if (!e.target.closest('button') && !BOS.mobile()) toggleMax(w); });
    drag(w, tb); resize(w, $('.grip', el));
    app.render(w, opts);
    setTimeout(function () { el.classList.remove('opening'); }, 220);
    focus(w); BOS.sfx('open');
    return w;
  };
  function focus(w) {
    Object.keys(wins).forEach(function (k) { wins[k].el.classList.remove('act'); });
    w.el.classList.add('act'); w.el.style.zIndex = ++z; BOS.active = w; renderTasks();
    if (w.app.onFocus) w.app.onFocus(w);
  }
  function hideHook(w) { if (w.app.onHide) w.app.onHide(w); }
  function minimize(w) { w.min = true; w.el.hidden = true; hideHook(w); BOS.sfx('min'); var top = topWin(); if (top) focus(top); else { BOS.active = null; renderTasks(); } }
  function restore(w) { if (w.min) { w.min = false; w.el.hidden = false; if (w.app.onShow) w.app.onShow(w); BOS.sfx('max'); } }
  function toggleMax(w) { w.max = !w.max; w.el.classList.toggle('max', w.max); $('.bmax', w.el).textContent = w.max ? '❐' : '□'; $('.bmax', w.el).setAttribute('aria-label', w.max ? 'Восстановить' : 'Развернуть'); BOS.sfx('max'); if (w.app.onResize) w.app.onResize(w); }
  function close(w, silent) {
    hideHook(w); if (w.app.onClose) w.app.onClose(w);
    delete wins[w.key];
    if (silent || BOS.reduced()) w.el.remove(); else { w.el.classList.add('closing'); setTimeout(function () { w.el.remove(); }, 170); }
    if (!silent) BOS.sfx('close');
    var top = topWin(); if (top) focus(top); else { BOS.active = null; renderTasks(); }
  }
  function topWin() { var best = null; Object.keys(wins).forEach(function (k) { var w = wins[k]; if (!w.min && (!best || +w.el.style.zIndex > +best.el.style.zIndex)) best = w; }); return best; }
  BOS.closeAll = function () { Object.keys(wins).forEach(function (k) { close(wins[k], true); }); };
  BOS.wins = function () { return wins; };
  function drag(w, tb) {
    var sx, sy, ox, oy, on = false;
    tb.addEventListener('pointerdown', function (e) { if (BOS.mobile() || w.max || e.target.closest('button') || e.button !== 0) return; on = true; sx = e.clientX; sy = e.clientY; ox = w.el.offsetLeft; oy = w.el.offsetTop; tb.setPointerCapture(e.pointerId); });
    tb.addEventListener('pointermove', function (e) { if (!on) return; var p = $('.wins'); w.el.style.left = Math.max(-w.el.offsetWidth + 80, Math.min(p.clientWidth - 80, ox + e.clientX - sx)) + 'px'; w.el.style.top = Math.max(0, Math.min(p.clientHeight - 30, oy + e.clientY - sy)) + 'px'; });
    tb.addEventListener('pointerup', function () { on = false; });
    tb.addEventListener('pointercancel', function () { on = false; });
  }
  function resize(w, g) {
    var sx, sy, ow, oh, on = false;
    g.addEventListener('pointerdown', function (e) { if (BOS.mobile()) return; e.stopPropagation(); on = true; sx = e.clientX; sy = e.clientY; ow = w.el.offsetWidth; oh = w.el.offsetHeight; g.setPointerCapture(e.pointerId); });
    g.addEventListener('pointermove', function (e) { if (!on) return; w.el.style.width = Math.max(280, ow + e.clientX - sx) + 'px'; w.el.style.height = Math.max(160, oh + e.clientY - sy) + 'px'; if (w.app.onResize) w.app.onResize(w); });
    g.addEventListener('pointerup', function () { on = false; });
  }

  /* ---------- панель задач ---------- */
  function renderTasks() {
    var t = $('#tasks'); if (!t) return; t.innerHTML = '';
    Object.keys(wins).forEach(function (k) {
      var w = wins[k], b = document.createElement('button');
      b.type = 'button'; b.className = 'b3' + (BOS.active === w && !w.min ? ' act' : '');
      b.innerHTML = BOS.icon(w.app.icon || w.id).replace('<svg', '<svg width="16" height="16"') + '<span>' + BOS.esc($('.t', w.el).textContent) + '</span>';
      b.setAttribute('aria-pressed', BOS.active === w && !w.min ? 'true' : 'false');
      b.addEventListener('click', function () { if (w.min) { restore(w); focus(w); } else if (BOS.active === w) minimize(w); else focus(w); });
      t.appendChild(b);
    });
  }
  function clock() { var d = new Date(), c = $('#clock'); if (c) c.textContent = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  setInterval(clock, 10000);

  /* ---------- меню «Пуск» ---------- */
  var MENU = [
    ['about', 'Об авторе'], ['director', 'Режиссёрские работы'], ['scripts', 'Сценарии'], ['ai', 'AI-проекты'], ['photos', 'Фотографии'], ['contacts', 'Контакты'],
    'sep', ['browser', 'Браузер'], ['games', 'Игры'], ['settings', 'Настройки'], 'sep', ['reboot', 'Перезагрузка'], ['power', 'Выключение']
  ];
  function buildMenu() {
    var A = window.BOS_AUTHOR;
    $('#smenu').innerHTML = '<div class="band">Bulan<i>OS</i> 98</div><div class="inner"><div class="who"><img src="assets/photos/kirill-avatar.jpg" alt=""><div><b>' + BOS.esc(A.name) + '</b>' + A.roles.join(' · ') + '</div></div><ul role="menu">' +
      MENU.map(function (m) { return m === 'sep' ? '<li class="sep" role="separator"></li>' : '<li role="none"><button type="button" class="mi" role="menuitem" data-act="' + m[0] + '">' + BOS.icon(m[0]) + m[1] + '</button></li>'; }).join('') + '</ul></div>';
    $$('#smenu .mi').forEach(function (b) { b.addEventListener('click', function () { act(b.dataset.act); }); });
    $('#smenu').addEventListener('keydown', function (e) {
      var items = $$('#smenu .mi'), i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
    });
  }
  function act(a) {
    closeMenu(); BOS.sfx('click');
    if (a === 'reboot') return BOS.reboot();
    if (a === 'power') return BOS.shutdown();
    if (a === 'games') return BOS.open('browser', { url: 'bulanos://games' });
    BOS.open(a);
  }
  BOS.act = act;
  function openMenu() { var m = $('#smenu'); m.hidden = false; $('#start').setAttribute('aria-expanded', 'true'); BOS.sfx('click'); var f = $('.mi', m); if (f) f.focus(); }
  function closeMenu() { var m = $('#smenu'); if (m && !m.hidden) { m.hidden = true; $('#start').setAttribute('aria-expanded', 'false'); } }

  /* ---------- уведомления ---------- */
  BOS.notify = function (title, text, opt) {
    opt = opt || {};
    var t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status');
    t.innerHTML = '<b>' + BOS.esc(title) + '</b>' + BOS.esc(text) + '<button type="button" class="x" aria-label="Закрыть уведомление">×</button>' + (opt.action ? '<div class="act"><button type="button" class="b3">' + BOS.esc(opt.action.label) + '</button></div>' : '');
    $('#toasts').appendChild(t); BOS.sfx('notify');
    function rm() { if (t.parentNode) t.remove(); }
    $('.x', t).addEventListener('click', rm);
    if (opt.action) $('.act .b3', t).addEventListener('click', function () { rm(); opt.action.fn(); });
    setTimeout(rm, opt.timeout || 7000);
    return t;
  };

  /* ---------- загрузка / перезагрузка / выключение ---------- */
  var bootTimers = [];
  function later(fn, ms) { bootTimers.push(setTimeout(fn, ms)); }
  function clearBoot() { bootTimers.forEach(clearTimeout); bootTimers = []; }
  var BIOS = ['BulanBIOS v4.20  (c) 2003—2026 Кирилл Буланов', '', 'Процессор: Режиссёрский, 24 кадра/с ............ OK', 'Память: 10 работ, 3 направления .................. OK',
    'Видеоадаптер: монтаж, цвет, звук ................. OK', 'Сценарный модуль ................................. OK', 'AI-сопроцессор ................................... OK', '', 'Загрузка BulanOS...'];
  BOS.boot = function (mode) {
    clearBoot();
    var s = $('#boot'), bios = $('#bios'), logo = $('#bootlogo');
    $('#off').hidden = true; $('#sdscreen').hidden = true;
    s.hidden = false; bios.textContent = ''; logo.classList.remove('on'); s.classList.remove('crtoff');
    var fast = mode === 'fast' || BOS.reduced();
    var step = fast ? 25 : 140, t = 0;
    BIOS.forEach(function (line) { later(function () { bios.textContent += line + '\n'; }, t); t += step; });
    later(function () { bios.textContent = ''; logo.classList.add('on'); BOS.sfx('boot'); }, t + (fast ? 80 : 300));
    later(finish, t + (fast ? 700 : 2300));
  };
  function finish() {
    clearBoot(); $('#boot').hidden = true; startSession();
  }
  BOS.reboot = function () {
    BOS.closeAll(); closeMenu(); $('#toasts').innerHTML = '';
    var sd = $('#sdscreen'); sd.hidden = false; $('#sdtext').innerHTML = 'Перезагрузка BulanOS…<small>закрываю программы и прибираюсь на рабочем столе</small>';
    BOS.sfx('shutdown');
    setTimeout(function () { sd.hidden = true; BOS.store('session', null); BOS.boot(); }, BOS.reduced() ? 300 : 1300);
  };
  BOS.shutdown = function () {
    BOS.closeAll(); closeMenu(); $('#toasts').innerHTML = '';
    var sd = $('#sdscreen'); sd.hidden = false; sd.classList.remove('crtoff'); $('#sdtext').innerHTML = 'Завершение работы BulanOS…<small>Кирилл Буланов благодарит за просмотр</small>';
    BOS.sfx('shutdown');
    setTimeout(function () { if (!BOS.reduced()) sd.classList.add('crtoff'); }, BOS.reduced() ? 200 : 1400);
    setTimeout(function () { sd.hidden = true; sd.classList.remove('crtoff'); $('#off').hidden = false; $('#powerbtn').focus(); }, BOS.reduced() ? 400 : 2200);
  };
  BOS.powerOn = function () { BOS.sfx('click', true); BOS.boot(); };

  function startSession() {
    var m = BOS.mobile();
    BOS.open('about', m ? {} : { x: 104, y: 16 });
    if (!m) setTimeout(function () { BOS.open('director'); var a = wins.about; if (a) focus(a); }, 120);
    setTimeout(function () { BOS.notify('Добро пожаловать в BulanOS', 'Это компьютер Кирилла Буланова. Открывайте иконки, меню «Пуск» — внизу слева.'); }, 600);
    setTimeout(function () { if (!$('#off').hidden || !$('#boot').hidden) return; BOS.notify('Буланозавр скучает', 'В браузере есть две мини-игры.', { action: { label: 'Сыграть', fn: function () { BOS.open('browser', { url: 'bulanos://games' }); } }, timeout: 9000 }); }, 9000);
  }

  /* ---------- инициализация ---------- */
  function init() {
    buildMenu(); clock();
    $('#startlogo').src = BOS.logoURL(3);
    $('#start').addEventListener('click', function (e) { e.stopPropagation(); if ($('#smenu').hidden) openMenu(); else closeMenu(); });
    document.addEventListener('pointerdown', function (e) { if (!e.target.closest('#smenu, #start')) closeMenu(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
    $$('.ic').forEach(function (b) { b.addEventListener('click', function () { BOS.sfx('click'); act(b.dataset.app); }); });
    var snd = $('#sndbtn');
    function sndUI() { snd.innerHTML = BOS.icon(BOS.settings.sound ? 'sound' : 'mute'); snd.setAttribute('aria-label', BOS.settings.sound ? 'Звук включён. Выключить' : 'Звук выключен. Включить'); snd.title = snd.getAttribute('aria-label'); }
    snd.addEventListener('click', function () { BOS.setSetting('sound', !BOS.settings.sound); sndUI(); if (BOS.settings.sound) BOS.sfx('click'); });
    document.addEventListener('bos:settings', sndUI); sndUI();
    $('#powerbtn').addEventListener('click', BOS.powerOn);
    $('#bootskip').addEventListener('click', finish);
    $('#bootlogocanvas').getContext('2d');
    var img = new Image(); img.onload = function () { var c = $('#bootlogocanvas'), x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(img, 0, 0, c.width, c.height); }; img.src = BOS.logoURL(8);
    document.addEventListener('visibilitychange', function () { if (document.hidden) Object.keys(wins).forEach(function (k) { var w = wins[k]; if (w.app.onHide) w.app.onHide(w); }); });
    var seen = sessionStorage.getItem('bos-booted'); sessionStorage.setItem('bos-booted', '1');
    BOS.boot(seen ? 'fast' : 'full');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
