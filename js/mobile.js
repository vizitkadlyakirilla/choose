/* BULAN OS MOBILE — «старый смартфон Кирилла». Самостоятельный интерфейс для телефонов и планшетов:
   экран блокировки, домашний экран, полноэкранные приложения, кнопки ◁ ○ □, «Недавние», жест «назад» браузера/Android.
   Данные (работы, контакты, фото, игры, корзина) общие с компьютерной версией. Включается только в режиме html.m-mode. */
(function () {
  var BOS = window.BOS; if (!BOS || BOS.MODE !== 'mobile') return;
  var $ = BOS.$, $$ = BOS.$$, esc = BOS.esc, A = window.BOS_AUTHOR, WORKS = window.BOS_WORKS, CATS = window.BOS_CATS;
  var ph, home, appsEl, rec, toasts, lock, wins = {}, order = [], cur = null, armed = false, skipPop = 0;
  function reduced() { return BOS.reduced(); }
  function click() { BOS.sfx('click'); }

  /* ---------- значки и цвета приложений ---------- */
  var APPC = {
    about: ['#ffb36a', '#e0702a', 'about'], portfolio: ['#ff6a56', '#b3122a', 'director'], scripts: ['#fff6d8', '#d9c98e', 'scripts'], ai: ['#ffe14a', '#f08a10', 'ai'],
    gallery: ['#8fdcff', '#2a7ec8', 'photos'], contacts: ['#6ee88a', '#1b8f40', 'contacts'], browser: ['#7ab2ff', '#1c47b8', 'browser'], games: ['#b49cff', '#5236c8', 'games'],
    trash: ['#e4e7ec', '#8a94a3', 'trash'], settings: ['#9a9fa8', '#3c4048', 'settings'], scriptdoc: ['#5a8ae8', '#1d3f9a', 'doc'], trashphoto: ['#8fdcff', '#2a7ec8', 'jpg']
  };
  function tile(id) { var c = APPC[id] || APPC.settings; return '<span class="tile" style="background:linear-gradient(' + c[0] + ',' + c[1] + ')">' + BOS.icon(c[2]) + '</span>'; }
  var SVG = {
    back: '<svg viewBox="0 0 24 24"><path d="M15 4l-8 8 8 8"/></svg>',
    navBack: '<svg viewBox="0 0 26 22"><path d="M19 3L6 11l13 8z"/></svg>',
    navHome: '<svg viewBox="0 0 26 22"><circle cx="13" cy="11" r="7.5"/></svg>',
    navRec: '<svg viewBox="0 0 26 22"><rect x="6" y="4" width="14" height="14" rx="2"/></svg>',
    sig: '<svg viewBox="0 0 16 12"><rect x="0" y="9" width="3" height="3"/><rect x="4" y="6" width="3" height="6"/><rect x="8" y="3" width="3" height="9"/><rect x="12" y="0" width="3" height="12"/></svg>',
    wifi: '<svg viewBox="0 0 16 12"><path d="M8 12l-2.2-2.6a3.4 3.4 0 0 1 4.4 0zM3.4 6.6a7 7 0 0 1 9.2 0l-1.3 1.6a5 5 0 0 0-6.6 0zM.8 3.6a11 11 0 0 1 14.4 0l-1.3 1.6a9 9 0 0 0-11.8 0z"/></svg>',
    bat: '<svg viewBox="0 0 24 12"><rect x="0.5" y="0.5" width="20" height="11" rx="2" fill="none" stroke="#fff"/><rect x="2" y="2" width="14" height="8" rx="1"/><rect x="21" y="3.5" width="2.5" height="5" rx="1"/></svg>',
    play: '<svg viewBox="0 0 16 16"><path d="M3 1l12 7-12 7z"/></svg>'
  };

  /* ---------- обои (рисуются один раз) ---------- */
  var WALLS = [['night', 'Ночь'], ['sunset', 'Закат'], ['dino', 'Буланозавр'], ['photo', 'Кирилл']], wallCache = {};
  function wallURL(k) {
    if (k === 'photo') return 'assets/photos/kirill-portrait.jpg';
    if (wallCache[k]) return wallCache[k];
    var c = document.createElement('canvas'), W = 270, Hh = 585; c.width = W; c.height = Hh; var x = c.getContext('2d'), i;
    function rnd(n) { return ((Math.imul(n + 7, 2654435761) >>> 0) % 1000) / 1000; }
    var gr = x.createLinearGradient(0, 0, 0, Hh);
    if (k === 'sunset') { gr.addColorStop(0, '#1b0b3a'); gr.addColorStop(0.45, '#5a1f6e'); gr.addColorStop(0.7, '#ff5e7e'); gr.addColorStop(0.85, '#ffb347'); }
    else if (k === 'dino') { gr.addColorStop(0, '#2a1a6a'); gr.addColorStop(1, '#0b0820'); }
    else { gr.addColorStop(0, '#04041a'); gr.addColorStop(0.6, '#10104a'); gr.addColorStop(1, '#2a1650'); }
    x.fillStyle = gr; x.fillRect(0, 0, W, Hh);
    for (i = 0; i < 140; i++) { x.fillStyle = rnd(i) > 0.85 ? '#ffd400' : 'rgba(220,230,255,.8)'; x.fillRect(Math.floor(rnd(i * 3) * W), Math.floor(rnd(i * 5) * Hh * (k === 'sunset' ? 0.45 : 0.7)), rnd(i * 7) > 0.9 ? 2 : 1, rnd(i * 7) > 0.9 ? 2 : 1); }
    if (k === 'dino') { var img = new Image(); img.src = BOS.logoURL(1); x.globalAlpha = 0.16; for (i = 0; i < 40; i++) { x.save(); x.translate((i % 5) * 60 + (Math.floor(i / 5) % 2) * 30, Math.floor(i / 5) * 76 + 20); x.fillStyle = '#7b5cff'; x.fillRect(0, 0, 24, 24); x.restore(); } x.globalAlpha = 1; }
    if (k === 'sunset') { x.fillStyle = k === 'sunset' ? '#fff2c0' : '#f5f0d0'; x.beginPath(); x.arc(W * 0.8, Hh * (k === 'sunset' ? 0.62 : 0.4), k === 'sunset' ? 34 : 14, 0, 7); x.fill(); }
    var bx = 0; while (bx < W) { var bw = 18 + Math.floor(rnd(bx) * 30), bh = 50 + Math.floor(rnd(bx * 3) * 150); x.fillStyle = k === 'sunset' ? '#1b0b2a' : '#0a0a2a'; x.fillRect(bx, Hh - bh, bw, bh);
      for (var wy = Hh - bh + 6; wy < Hh - 6; wy += 9) for (var wx = bx + 3; wx < bx + bw - 4; wx += 6) if (rnd(wx * 13 + wy) > 0.68) { x.fillStyle = '#ffd400'; x.fillRect(wx, wy, 2, 3); } bx += bw + 2; }
    try { wallCache[k] = c.toDataURL('image/png'); } catch (e) { wallCache[k] = ''; }
    return wallCache[k];
  }
  function applyWall() { var u = wallURL(BOS.settings.mwall || 'night'); $('.ph-wall', ph).style.backgroundImage = 'url("' + u + '")'; if (lock) lock.style.backgroundImage = 'url("' + u + '")'; }

  /* ---------- оболочка ---------- */
  function build() {
    ph = document.createElement('div'); ph.className = 'ph'; ph.id = 'phone';
    ph.innerHTML = '<div class="ph-wall" aria-hidden="true"></div>' +
      '<header class="ph-sb" aria-hidden="true"><span class="car">BULAN</span><span class="ntf"></span><span class="sp"></span>' + SVG.sig + SVG.wifi + SVG.bat + '<span class="tm">00:00</span></header>' +
      '<main class="ph-home" aria-label="Главный экран BULAN OS"></main><div class="ph-apps"></div>' +
      '<section class="ph-rec" hidden aria-label="Недавние приложения"></section><div class="ph-toasts" aria-live="polite"></div>' +
      '<nav class="ph-nav" aria-label="Системная навигация"><button type="button" class="nb-back" aria-label="Назад">' + SVG.navBack + '</button><button type="button" class="nb-home" aria-label="Домой">' + SVG.navHome + '</button><button type="button" class="nb-rec" aria-label="Недавние приложения">' + SVG.navRec + '</button></nav>' +
      '<div id="m-dlg"></div>';
    document.body.appendChild(ph);
    home = $('.ph-home', ph); appsEl = $('.ph-apps', ph); rec = $('.ph-rec', ph); toasts = $('.ph-toasts', ph);
    $('.nb-back', ph).addEventListener('click', function () { click(); navBack(); });
    $('.nb-home', ph).addEventListener('click', function () { click(); goHome(); });
    $('.nb-rec', ph).addEventListener('click', function () { click(); if (rec.hidden) showRecents(); else rec.hidden = true; });
    buildHome(); applyWall(); clock(); setInterval(clock, 15000);
  }
  function clock() { var d = new Date(), t = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); $('.ph-sb .tm', ph).textContent = t; if (lock) { $('.clk', lock).textContent = t; $('.dt', lock).textContent = d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }); } }

  function buildHome() {
    var rec1 = BOS.store('rec-dino') || 0, rec2 = BOS.store('rec-turnik') || 0, rec3 = BOS.store('rec-escape') || 0;
    home.innerHTML = '<section class="wg wg-me"><button type="button" class="me-ph" data-open="about" aria-label="Обо мне"><img src="assets/photos/kirill-avatar.jpg" alt="Кирилл Буланов" width="74" height="74"></button><div><button type="button" class="me-nm" data-open="about"><h1>' + esc(A.name) + ' <span aria-hidden="true">›</span></h1><span class="roles">' + A.roles.join(' · ') + '</span></button>' +
      '<div class="row"><button type="button" class="pill pri" data-open="portfolio">▶ Работы</button><button type="button" class="pill" data-open="contacts">✉ Связаться</button></div></div></section>' +
      '<section class="wg wg-g"><h2>Мини-игры <span>рекорды</span></h2><div class="gl">' +
      [['bulanozavr', 'dino', 'Буланозавр', rec1], ['turnik', 'turnik', 'Турник', rec2 + ' м'], ['escape', 'escape', 'Побег', rec3 + ' м']].map(function (g) { return '<button type="button" data-game="' + g[0] + '"><canvas width="160" height="100" data-preview="' + g[1] + '"></canvas><span>' + g[2] + '<small>' + g[3] + '</small></span></button>'; }).join('') + '</div></section>' +
      '<nav class="grid" aria-label="Приложения">' + [['scripts', 'Сценарии'], ['ai', 'AI'], ['games', 'Игры'], ['settings', 'Настройки'], ['trash', 'Корзина']].map(icon).join('') + '</nav>' +
      '<div class="grow"></div><p class="hint">BULAN OS · телефон Кирилла Буланова</p>' +
      '<nav class="dock" aria-label="Избранное">' + [['portfolio', 'Портфолио'], ['gallery', 'Галерея'], ['browser', 'BulanNet'], ['contacts', 'Контакты']].map(icon).join('') + '</nav>';
    function icon(a) { return '<button type="button" class="mh-ic" data-open="' + a[0] + '" aria-label="' + a[1] + '"><span class="tw">' + tile(a[0]) + (a[0] === 'trash' ? '<span class="badge" aria-hidden="true">' + (BOS.trashItems ? BOS.trashItems().length : 2) + '</span>' : '') + '</span><span class="lb">' + a[1] + '</span></button>'; }
    $$('[data-open]', home).forEach(function (b) { b.addEventListener('click', function () { click(); open(b.dataset.open, { from: b }); }); });
    $$('[data-game]', home).forEach(function (b) { b.addEventListener('click', function () { click(); open('browser', { url: 'bulanos://' + b.dataset.game, from: b }); }); });
    $$('canvas[data-preview]', home).forEach(function (c) { if (BOS.games && BOS.games.preview) BOS.games.preview(c, c.dataset.preview); });
    home.addEventListener('scroll', function () { home.scrollTop = 0; });
    $$('img', home).forEach(function (im) { if (!im.complete) im.addEventListener('load', refit); });
    refit();
  }
  /* Главный экран как окно телефона: никакой прокрутки. Если не помещается — по шагам ужимаем второстепенное. */
  var FIT = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6'], fitT = 0;
  function fitHome() {
    if (!home) return;
    FIT.forEach(function (c) { home.classList.remove(c); });
    for (var i = 0; i < FIT.length && home.scrollHeight > home.clientHeight + 1; i++) home.classList.add(FIT[i]);
    home.scrollTop = 0;
  }
  function refit() { clearTimeout(fitT); fitT = setTimeout(fitHome, 60); }
  window.addEventListener('resize', refit); window.addEventListener('orientationchange', refit);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', refit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refit);
  function refreshRecords() { var s = $$('.wg-g small', home); if (s.length === 3) { s[0].textContent = BOS.store('rec-dino') || 0; s[1].textContent = (BOS.store('rec-turnik') || 0) + ' м'; s[2].textContent = (BOS.store('rec-escape') || 0) + ' м'; } }

  /* ---------- экран блокировки ---------- */
  function showLock(first) {
    if (lock) return;
    lock = document.createElement('section'); lock.className = 'ph-lock'; lock.setAttribute('aria-label', 'Экран блокировки');
    lock.innerHTML = '<div class="os">BULAN <i>OS</i></div><div class="clk" aria-hidden="true"></div><div class="dt"></div>' +
      '<div class="nt" role="note"><img src="assets/photos/kirill-avatar.jpg" alt=""><div><b>' + esc(A.name) + ' <small>сейчас</small></b><p>' + (first ? 'Привет! Это мой старый телефон. Внутри — мои работы, игры и один файл, который лучше не открывать.' : 'Снова привет! Работы, игры и контакты — внутри.') + '</p></div></div>' +
      '<div class="sp"></div><div class="slide"><span class="lbl">Проведите пальцем, чтобы посмотреть, что здесь происходит</span><button type="button" class="kn" aria-label="Разблокировать"><img alt="" src="' + BOS.logoURL(3) + '"></button></div>' +
      '<button type="button" class="alt">Открыть без жеста</button>';
    ph.appendChild(lock); applyWall(); clock();
    var kn = $('.kn', lock), track = $('.slide', lock), sx = 0, on = false, max = 0, lx = 0;
    kn.addEventListener('pointerdown', function (e) { on = true; sx = e.clientX; max = track.clientWidth - kn.offsetWidth - 8; try { kn.setPointerCapture(e.pointerId); } catch (er) {} e.preventDefault(); });
    kn.addEventListener('pointermove', function (e) { if (!on) return; lx = Math.max(0, Math.min(max, e.clientX - sx)); kn.style.transform = 'translateX(' + lx + 'px)'; $('.lbl', lock).style.opacity = String(1 - lx / max); });
    function end() { if (!on) return; on = false; if (lx > max * 0.7) unlock(); else { kn.style.transition = 'transform .2s'; kn.style.transform = ''; $('.lbl', lock).style.opacity = ''; setTimeout(function () { if (kn) kn.style.transition = ''; }, 220); } lx = 0; }
    kn.addEventListener('pointerup', end); kn.addEventListener('pointercancel', end);
    kn.addEventListener('click', function (e) { if (e.detail === 0) unlock(); });     /* клавиатура: Enter/Пробел */
    $('.alt', lock).addEventListener('click', unlock);
    /* свайп вверх в любом месте экрана */
    var sy0 = null; lock.addEventListener('pointerdown', function (e) { if (e.target.closest('.slide, .alt')) return; sy0 = e.clientY; });
    lock.addEventListener('pointerup', function (e) { if (sy0 != null && sy0 - e.clientY > 70) unlock(); sy0 = null; });
    setTimeout(function () { if (kn) kn.focus({ preventScroll: true }); }, 60);
  }
  function unlock() {
    if (!lock) return; var l = lock; lock = null; BOS.store('m-seen', true); BOS.sfx('open');
    l.classList.add('gone'); setTimeout(function () { l.remove(); }, reduced() ? 0 : 400);
  }
  BOS.lockPhone = function () { goHome(); showLock(false); };

  /* ---------- менеджер приложений ---------- */
  var ALIAS = { director: 'portfolio', project: 'portfolio', photos: 'gallery' };
  function open(id, o) {
    o = o || {};
    if (id === 'games') { id = 'browser'; o.url = o.url || 'bulanos://games'; }
    if (id === 'project') o.work = o.id;
    id = ALIAS[id] || id;
    var app = MAPPS[id] || BOS.apps[id]; if (!app) return null;
    rec.hidden = true;
    var w = wins[id];
    if (cur && cur !== w) hideApp(cur);
    if (w) { show(w, o); if (app.update) app.update(w, o); return w; }
    var el = document.createElement('section'); el.className = 'ma'; el.setAttribute('role', 'region');
    var c = APPC[id] || APPC.settings, title = o.title || app.mtitle || app.title;
    el.style.setProperty('--ac', c[1]);
    el.innerHTML = '<header class="ma-bar"><button type="button" class="bk" aria-label="Назад">' + SVG.back + '</button><span class="ai" style="background:linear-gradient(' + c[0] + ',' + c[1] + ')">' + BOS.icon(c[2]) + '</span><h2></h2><span class="acts"></span></header>' +
      '<div class="ma-body' + (app.flush ? ' flush' : '') + '"></div>' + (app.status ? '<div class="ma-status"></div>' : '');
    appsEl.appendChild(el);
    w = wins[id] = { key: id, id: id, app: app, el: el, body: $('.ma-body', el), data: {}, mobile: true };
    w.setTitle = function (t, sub) { $('h2', el).innerHTML = esc(t) + (sub ? '<small>' + esc(sub) + '</small>' : ''); el.setAttribute('aria-label', t); w.title = t; w.sub = sub || ''; };
    w.setStatus = function (a) { var s = $('.ma-status', el); if (s) s.innerHTML = a.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join(''); };
    w.close = function () { closeApp(w); };
    w.actions = function (list) { var box = $('.acts', el); box.innerHTML = ''; (list || []).forEach(function (a) { var b = document.createElement('button'); b.type = 'button'; b.className = 'act'; b.textContent = a[0]; b.setAttribute('aria-label', a[2] || a[0]); b.addEventListener('click', a[1]); box.appendChild(b); }); };
    w.setTitle(app.mtitle || (title || '').split(' — ')[0]);
    $('.bk', el).addEventListener('click', function () { click(); navBack(); });
    order.push(id);
    app.render(w, o);
    show(w, o, true);
    BOS.sfx('open');
    return w;
  }
  function show(w, o, fresh) {
    cur = w; w.el.hidden = false; ph.classList.add('app-open');
    order = order.filter(function (k) { return k !== w.id; }); order.push(w.id);
    if (!reduced()) {
      var f = o && o.from && o.from.getBoundingClientRect ? o.from.getBoundingClientRect() : null, r = appsEl.getBoundingClientRect();
      w.el.style.transformOrigin = f ? (f.left + f.width / 2 - r.left) + 'px ' + (f.top + f.height / 2 - r.top) + 'px' : '50% 50%';
      w.el.classList.remove('opening'); void w.el.offsetWidth; w.el.classList.add('opening'); setTimeout(function () { w.el.classList.remove('opening'); }, 260);
    }
    if (!fresh && w.app.onShow) w.app.onShow(w);
    if (!armed) { try { history.pushState({ bos: 1 }, ''); armed = true; } catch (e) {} }
  }
  function hideApp(w) { if (!w || w.el.hidden) return; if (w.app.onHide) w.app.onHide(w); w.el.hidden = true; ph.classList.remove('immersive'); }
  function goHome() {
    rec.hidden = true; closeDialogs();
    if (cur) { var w = cur; cur = null; if (!reduced()) { w.el.classList.add('closing'); setTimeout(function () { w.el.classList.remove('closing'); hideApp(w); }, 170); } else hideApp(w); }
    ph.classList.remove('app-open'); refreshRecords(); refit();
    if (armed) { armed = false; skipPop++; try { history.back(); } catch (e) {} }
  }
  function closeApp(w) {
    if (!wins[w.id]) return;
    if (w.app.onHide && !w.el.hidden) w.app.onHide(w);
    if (w.app.onClose) w.app.onClose(w);
    delete wins[w.id]; order = order.filter(function (k) { return k !== w.id; }); w.el.remove();
    if (cur === w) { cur = null; ph.classList.remove('app-open', 'immersive'); var prev = order[order.length - 1]; if (prev && wins[prev] && w.id === 'scriptdoc') show(wins[prev]); }
  }
  function closeDialogs() { $$('#m-dlg .dlg-ov', ph).forEach(function (ov) { var c = $('.bcls', ov); if (c) c.click(); }); }
  /* «Назад»: диалог → «Недавние» → приложение (свой шаг назад) → домой */
  function back() {
    var dl = $$('#m-dlg .dlg-ov', ph); if (dl.length) { var c = $('.bcls', dl[dl.length - 1]); if (c) c.click(); return true; }
    if (!rec.hidden) { rec.hidden = true; return true; }
    if (lock) return true;
    if (cur) { if (cur.app.onBack && cur.app.onBack(cur)) return true; goHome(); return true; }
    return false;
  }
  function navBack() { back(); }
  window.addEventListener('popstate', function () {
    if (skipPop) { skipPop--; return; }
    armed = false;
    var handled = back();
    if (cur) { try { history.pushState({ bos: 1 }, ''); armed = true; } catch (e) {} }
    else if (!handled) { /* на домашнем экране «назад» уходит со страницы — как в настоящем браузере */ }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !e.defaultPrevented && !(document.activeElement && document.activeElement.tagName === 'CANVAS')) { if (!$$('#m-dlg .dlg-ov', ph).length) back(); } });

  function showRecents() {
    var list = order.slice().reverse();
    rec.innerHTML = '<h2>Недавние <button type="button" class="ca">Закрыть все</button></h2>' + (list.length ? list.map(function (id) { var w = wins[id], c = APPC[id] || APPC.settings;
      return '<div class="rc" data-id="' + id + '" style="--ac:linear-gradient(' + c[0] + ',' + c[1] + ')"><button type="button" class="go"><span class="sh">' + BOS.icon(c[2]) + '</span><span class="tx"><b>' + esc(w.title || id) + '</b><small>' + esc(w.sub || (w.app.recSub ? w.app.recSub(w) : 'открыто')) + '</small></span></button><button type="button" class="x" aria-label="Закрыть ' + esc(w.title || id) + '">×</button></div>'; }).join('') : '<p class="empty">Нет открытых приложений</p>');
    rec.hidden = false;
    $('.ca', rec).addEventListener('click', function () { Object.keys(wins).forEach(function (k) { closeApp(wins[k]); }); showRecents(); refreshRecords(); });
    $$('.rc', rec).forEach(function (r) {
      var id = r.dataset.id;
      $('.go', r).addEventListener('click', function () { rec.hidden = true; open(id); });
      $('.x', r).addEventListener('click', function () { closeApp(wins[id]); r.remove(); if (!$$('.rc', rec).length) showRecents(); });
      var x0 = null; r.addEventListener('pointerdown', function (e) { x0 = e.clientX; });
      r.addEventListener('pointermove', function (e) { if (x0 == null) return; var dx = e.clientX - x0; if (Math.abs(dx) > 8) { r.style.transform = 'translateX(' + dx + 'px)'; r.style.opacity = String(1 - Math.min(0.8, Math.abs(dx) / 260)); } });
      function up(e) { if (x0 == null) return; var dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 110) { closeApp(wins[id]); r.remove(); if (!$$('.rc', rec).length) showRecents(); } else { r.style.transform = ''; r.style.opacity = ''; } }
      r.addEventListener('pointerup', up); r.addEventListener('pointercancel', function () { x0 = null; r.style.transform = ''; r.style.opacity = ''; });
    });
  }

  /* ---------- уведомления ---------- */
  BOS.notify = function (title, text, opt) {
    opt = opt || {}; if (lock && !opt.force) return null;
    var t = document.createElement('div'); t.className = 'mt'; t.setAttribute('role', 'status');
    t.innerHTML = '<img alt="" src="' + BOS.logoURL(3) + '"><div><b>' + esc(title) + '</b><span>' + esc(text) + '</span></div>' + (opt.action ? '<button type="button">' + esc(opt.action.label) + '</button>' : '');
    toasts.appendChild(t); BOS.sfx('notify');
    function rm() { if (!t.parentNode) return; t.classList.add('out'); setTimeout(function () { t.remove(); }, 220); }
    if (opt.action) $('button', t).addEventListener('click', function () { rm(); opt.action.fn(); });
    var y0 = null; t.addEventListener('pointerdown', function (e) { y0 = e.clientY; }); t.addEventListener('pointerup', function (e) { if (y0 != null && y0 - e.clientY > 20) rm(); y0 = null; });
    setTimeout(rm, opt.timeout || 4500);
    while (toasts.children.length > 2) toasts.firstChild.remove();
    return t;
  };
  BOS.open = open; BOS.act = function (a) { if (a === 'reboot' || a === 'power') return BOS.lockPhone(); open(a); };
  BOS.wins = function () { return wins; }; BOS.closeAll = function () { Object.keys(wins).forEach(function (k) { closeApp(wins[k]); }); };
  BOS.phoneBack = back; BOS.phoneHome = goHome;
  BOS.dialogRoot = function () { return $('#m-dlg'); };
  document.addEventListener('visibilitychange', function () { if (document.hidden && cur && cur.app.onHide) cur.app.onHide(cur); });

  /* ================= ПРИЛОЖЕНИЯ ================= */
  var MAPPS = {};

  /* ----- Обо мне ----- */
  MAPPS.about = { mtitle: 'Обо мне',
    render: function (w) {
      var tmp = document.createElement('div'), fake = { body: tmp, setStatus: function () {}, data: {} }; BOS.apps.about.render(fake);
      var ps = $$('.profile > div > p:not(.hello)', tmp).map(function (p) { return '<p>' + p.innerHTML + '</p>'; }).join('');
      w.body.innerHTML = '<div class="ct-head" style="background:linear-gradient(#3a2a18,#121318)"><img src="assets/photos/kirill-portrait.jpg" alt="Кирилл Буланов сидит на пне у реки" width="112" height="112"><h1>' + esc(A.name) + '</h1><p>' + A.roles.join(' · ') + '</p></div>' +
        '<div class="sec" style="font-size:15.5px;line-height:1.55">' + ps + '<div class="btnrow"><button type="button" class="pill pri" data-o="portfolio">▶ Смотреть работы</button><button type="button" class="pill" data-o="contacts">✉ Связаться</button><button type="button" class="pill" data-o="gallery">Галерея</button></div></div>';
      $$('[data-o]', w.body).forEach(function (b) { b.addEventListener('click', function () { open(b.dataset.o); }); });
    } };

  /* ----- Портфолио ----- */
  function cleanNote(n) { return n && !/уточн|решение заказчика|исходники|лучшие исходники/i.test(n) ? n : ''; }
  MAPPS.portfolio = { mtitle: 'Портфолио', flush: false,
    recSub: function (w) { return w.data.detail ? w.data.detail.title : WORKS.length + ' работ'; },
    render: function (w, o) {
      var anyVideo = WORKS.some(function (x) { return !!BOS.V(x); });
      w.body.innerHTML = '<div class="chips" role="toolbar" aria-label="Категории"><button type="button" class="chip" data-f="all" aria-pressed="true">Все</button>' + Object.keys(CATS).map(function (k) { return '<button type="button" class="chip" data-f="' + k + '" aria-pressed="false">' + CATS[k] + '</button>'; }).join('') + '</div>' +
        (anyVideo ? '' : '<p class="pf-note">Видео загружаются на сайт. Пока здесь кадры из работ, а полные версии открываются по ссылке на оригинал.</p>') +
        '<div class="pf-list"></div><div class="pf-detail" hidden></div>';
      w.data.f = 'all';
      $$('.chip', w.body).forEach(function (b) { b.addEventListener('click', function () { $$('.chip', w.body).forEach(function (c) { c.setAttribute('aria-pressed', c === b); }); w.data.f = b.dataset.f; list(w); click(); }); });
      list(w);
      w.setTitle('Портфолио', A.name + ' · ' + WORKS.length + ' работ');
      if (o && o.work) detail(w, o.work);
    },
    update: function (w, o) { if (o && o.work) detail(w, o.work); },
    onBack: function (w) { if (w.data.detail) { closeDetail(w); return true; } return false; },
    onHide: function (w) { $$('video', w.body).forEach(function (v) { v.pause(); }); },
    onShow: function (w) { if (!w.data.detail) watch(w); },
    onClose: function (w) { if (w.data.io) w.data.io.disconnect(); }
  };
  function list(w) {
    var box = $('.pf-list', w.body), items = WORKS.filter(function (x) { return w.data.f === 'all' || x.cat === w.data.f; });
    box.innerHTML = items.map(function (x) {
      var src = BOS.previewSrc(x), note = cleanNote(x.note), meta = [x.client !== x.title.replace(/[«»]/g, '') ? x.client : '', x.dur, x.upload].filter(Boolean).join(' · ');
      return '<button type="button" class="pf-card" data-id="' + x.id + '"><div class="pf-media"><img src="' + BOS.poster(x) + '" alt="' + esc(x.alt[0]) + '" loading="lazy" decoding="async">' +
        (src ? '<video muted playsinline loop preload="none" data-src="' + src + '" poster="' + BOS.poster(x) + '" aria-hidden="true"></video>' : '') +
        '<span class="tg">' + esc(x.kind) + '</span>' + (src ? '' : '<span class="nv">кадр</span>') + '<span class="pl" aria-hidden="true">' + SVG.play + '</span></div>' +
        '<div class="pf-info"><h3>' + esc(x.title) + '</h3><div class="meta">' + esc(meta) + '</div>' + (note ? '<p>' + esc(note) + '</p>' : '') + '</div></button>';
    }).join('');
    $$('.pf-card', box).forEach(function (c) { c.addEventListener('click', function () { click(); detail(w, c.dataset.id); }); });
    watch(w);
  }
  /* превью-видео: играет только одна карточка, которая сейчас в центре экрана; на экономии трафика и при отключённых анимациях — только кадры */
  function watch(w) {
    if (w.data.io) w.data.io.disconnect();
    var vids = $$('.pf-card video', w.body); if (!vids.length || !('IntersectionObserver' in window)) return;
    var save = navigator.connection && navigator.connection.saveData; if (save || reduced()) return;
    var vis = new Map();
    w.data.io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { vis.set(e.target, e.intersectionRatio); });
      var best = null, br = 0.6; vis.forEach(function (r, v) { if (r > br) { br = r; best = v; } });
      vids.forEach(function (v) { if (v === best) { if (!v.src) v.src = v.dataset.src; BOS.play(v); } else if (!v.paused) v.pause(); });
    }, { root: w.body, threshold: [0, 0.6, 0.9] });
    vids.forEach(function (v) { w.data.io.observe(v); });
  }
  function detail(w, id) {
    var x = BOS.byId(id); if (!x) return; w.data.detail = x;
    $$('.pf-list video', w.body).forEach(function (v) { v.pause(); });
    var v = BOS.V(x), src = v && (v.full || v.preview), d = $('.pf-detail', w.body), k = WORKS.indexOf(x), note = cleanNote(x.note);
    d.innerHTML = '<div class="pv-player">' + (src ? '<video controls playsinline preload="metadata" poster="' + BOS.poster(x) + '" src="' + src + '"></video>' : '<img src="' + BOS.poster(x) + '" alt="' + esc(x.alt[0]) + '"><div class="nov">Видео этой работы ещё не загружено на сайт — смотрите оригинал по ссылке ниже.</div>') + '</div>' +
      (x.posters.length > 1 ? '<div class="pv-thumbs">' + x.posters.map(function (p, i) { return '<img src="assets/posters/' + p + '" alt="' + esc(x.alt[i] || '') + '" data-i="' + i + '"' + (i === 0 ? ' aria-current="true"' : '') + '>'; }).join('') + '</div>' : '') +
      '<div class="sec"><h3 style="margin:0 0 4px;font-size:21px">' + esc(x.title) + '</h3><p class="muted" style="margin:0 0 12px">' + esc(x.kind) + (x.dur ? ' · ' + esc(x.dur) : '') + '</p>' +
      '<dl class="kv"><dt>Режиссёр</dt><dd>' + esc(A.name) + '</dd><dt>Заказчик</dt><dd>' + esc(x.client) + '</dd><dt>Формат</dt><dd>' + esc(x.aspect) + '</dd><dt>Год</dt><dd>' + esc(x.upload) + '</dd></dl>' +
      (note ? '<p style="margin:12px 0 0">' + esc(note) + '</p>' : '') +
      '<div class="btnrow">' + (src ? '' : '') + '<a class="pill pri" href="' + x.source + '" target="_blank" rel="noopener">Смотреть оригинал ↗</a><button type="button" class="pill ct">✉ Обсудить проект</button></div>' +
      '<div class="btnrow"><button type="button" class="pill pv">◀ ' + esc(WORKS[(k - 1 + WORKS.length) % WORKS.length].title) + '</button><button type="button" class="pill nx">' + esc(WORKS[(k + 1) % WORKS.length].title) + ' ▶</button></div></div>';
    $('.pf-list', w.body).hidden = true; $('.chips', w.body).hidden = true; var pn = $('.pf-note', w.body); if (pn) pn.hidden = true; d.hidden = false;
    w.data.scroll = w.data.scroll || w.body.scrollTop; w.body.scrollTop = 0;
    w.setTitle(x.title, x.kind + ' · ' + A.name);
    $$('.pv-thumbs img', d).forEach(function (im) { im.addEventListener('click', function () { var p = $('.pv-player img', d) || $('.pv-player video', d); if (p.tagName === 'IMG') p.src = im.src; else p.poster = im.src; $$('.pv-thumbs img', d).forEach(function (q) { q.setAttribute('aria-current', q === im); }); }); });
    $('.ct', d).addEventListener('click', function () { open('contacts', { topic: x.title }); });
    $('.pv', d).addEventListener('click', function () { detail(w, WORKS[(k - 1 + WORKS.length) % WORKS.length].id); });
    $('.nx', d).addEventListener('click', function () { detail(w, WORKS[(k + 1) % WORKS.length].id); });
    var vid = $('video', d); if (vid) BOS.play(vid).then(function (ok) { if (!ok) { vid.muted = true; BOS.play(vid); } });
  }
  function closeDetail(w) {
    var d = $('.pf-detail', w.body); $$('video', d).forEach(function (v) { v.pause(); v.removeAttribute('src'); v.load(); }); d.innerHTML = ''; d.hidden = true;
    $('.pf-list', w.body).hidden = false; $('.chips', w.body).hidden = false; var pn = $('.pf-note', w.body); if (pn) pn.hidden = false;
    w.data.detail = null; w.body.scrollTop = w.data.scroll || 0; w.data.scroll = 0; w.setTitle('Портфолио', A.name + ' · ' + WORKS.length + ' работ'); watch(w);
  }

  /* ----- Сценарии ----- */
  MAPPS.scripts = { mtitle: 'Сценарии', render: function (w) {
    w.body.innerHTML = '<div class="note-card"><h3>Сценарии</h3><p>Здесь появятся сценарии, синопсисы и концепции Кирилла: логлайн, синопсис, страницы сценария и статус проекта.</p><p>Материалы ещё не загружены. Хотите почитать — <a href="mailto:' + A.email + '">напишите Кириллу</a>.</p><p style="margin-top:12px">P.S. В <a href="#" class="tt">Корзине</a> лежит сценарий 2013 года. Его лучше не открывать.</p></div>';
    $('.tt', w.body).addEventListener('click', function (e) { e.preventDefault(); open('trash'); });
    w.setTitle('Сценарии', 'Заметки');
  } };
  /* ----- AI ----- */
  MAPPS.ai = { mtitle: 'AI-проекты', render: function (w) {
    w.body.innerHTML = '<div class="ai-grid"><div>скоро_01.mp4</div><div>скоро_02.mp4</div><div>скоро_03.mp4</div></div><div class="sec"><p style="margin-top:0">Папка с AI-проектами готовится к публикации: нейросетевые ролики и эксперименты появятся здесь.</p><button type="button" class="pill pri">✉ Обсудить AI-проект</button></div>';
    $('.pill', w.body).addEventListener('click', function () { open('contacts', { topic: 'AI-проект' }); });
    w.setTitle('AI-проекты', 'Объектов: 0');
  } };

  /* ----- Галерея ----- */
  MAPPS.gallery = { mtitle: 'Галерея',
    render: function (w) {
      var P = window.BOS_PHOTOS || [];
      w.body.innerHTML = '<div class="gal">' + P.map(function (p, i) { return '<button type="button" data-i="' + i + '" aria-label="Открыть ' + esc(p.name) + '"><img src="' + p.src + '" alt="' + esc(p.alt) + '" loading="lazy"><span class="ft">' + esc(p.name) + '</span></button>'; }).join('') + '</div><p class="sec muted">Фотографии Кирилла Буланова · ' + P.length + '</p>';
      $$('.gal button', w.body).forEach(function (b) { b.addEventListener('click', function () { viewer(w, +b.dataset.i); }); });
      w.setTitle('Галерея', P.length + ' фото');
    },
    onBack: function (w) { if (w.data.v) { w.data.v.remove(); w.data.v = null; w.setTitle('Галерея', (window.BOS_PHOTOS || []).length + ' фото'); return true; } return false; }
  };
  function viewer(w, i) {
    var P = window.BOS_PHOTOS || [], v = document.createElement('div'); v.className = 'gv';
    v.innerHTML = '<div class="gv-stage"><img alt=""></div><button type="button" class="gv-nav p" aria-label="Предыдущее фото">‹</button><button type="button" class="gv-nav n" aria-label="Следующее фото">›</button><div class="gv-bar"><span class="sp"></span><a class="pill" download>Сохранить</a><button type="button" class="pill cl">Готово</button></div>';
    w.body.appendChild(v); w.data.v = v;
    var img = $('img', v), st = $('.gv-stage', v), S = 1, tx = 0, ty = 0, pts = new Map(), pinch = null, pan = null, lastTap = 0, swipeX = null;
    function apply() { img.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + S + ') translate(-50%,-50%)'; }
    function load() { var p = P[i]; img.src = p.src; img.alt = p.alt; S = 1; tx = 0; ty = 0; apply(); $('.sp', v).textContent = (i + 1) + ' / ' + P.length + ' · ' + p.name; var a = $('a', v); a.href = p.src; a.setAttribute('download', p.name); w.setTitle(p.name, (i + 1) + ' из ' + P.length); }
    function go(d) { i = (i + d + P.length) % P.length; load(); }
    $('.p', v).addEventListener('click', function () { go(-1); }); $('.n', v).addEventListener('click', function () { go(1); });
    $('.cl', v).addEventListener('click', function () { MAPPS.gallery.onBack(w); });
    st.addEventListener('pointerdown', function (e) { try { st.setPointerCapture(e.pointerId); } catch (er) {} pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) { var a = Array.from(pts.values()); pinch = { d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), S: S }; pan = null; swipeX = null; }
      else { pan = { x: e.clientX, y: e.clientY, tx: tx, ty: ty }; swipeX = S === 1 ? e.clientX : null;
        var now = Date.now(); if (now - lastTap < 300) { S = S > 1 ? 1 : 2.5; if (S === 1) { tx = 0; ty = 0; } apply(); lastTap = 0; swipeX = null; } else lastTap = now; } });
    st.addEventListener('pointermove', function (e) { if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pts.size === 2) { var a = Array.from(pts.values()); S = Math.max(1, Math.min(4, pinch.S * Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) / pinch.d)); if (S === 1) { tx = 0; ty = 0; } apply(); }
      else if (pan && S > 1) { tx = pan.tx + e.clientX - pan.x; ty = pan.ty + e.clientY - pan.y; apply(); } });
    function up(e) { if (swipeX != null && pts.size === 1 && S === 1) { var dx = e.clientX - swipeX; if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1); } pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!pts.size) { pan = null; swipeX = null; } }
    st.addEventListener('pointerup', up); st.addEventListener('pointercancel', up);
    load();
  }

  /* ----- Контакты ----- */
  var CI = {
    tel: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M3 5h18v14H3zm2 2v.3l7 4.7 7-4.7V7l-7 4.6z"/></svg>',
    tg: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M3 11.5l17-6.5-3 15-5-3.8-2.6 2.5.3-4.3 7.6-6.8-9.6 5.8z"/></svg>',
    ig: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="#fff"/></svg>'
  };
  MAPPS.contacts = { mtitle: 'Контакты',
    render: function (w, o) {
      var tg = 'https://t.me/' + A.telegram, ig = 'https://instagram.com/' + A.instagram;
      w.body.innerHTML = '<div class="ct-head"><img src="assets/photos/kirill-avatar.jpg" alt="Кирилл Буланов" width="112" height="112"><h1>' + esc(A.name) + '</h1><p>' + A.roles.join(' · ') + '</p></div>' +
        '<div class="ct-acts"><a href="tel:' + A.phoneHref + '"><i style="background:#1e9a45">' + CI.tel + '</i>Позвонить</a><a href="mailto:' + A.email + '"><i style="background:#d7263d">' + CI.mail + '</i>Письмо</a><a href="' + tg + '" target="_blank" rel="noopener"><i style="background:#2aa3df">' + CI.tg + '</i>Telegram</a><a href="' + ig + '" target="_blank" rel="noopener"><i style="background:linear-gradient(45deg,#f9a03f,#d6249f,#5851db)">' + CI.ig + '</i>Instagram</a></div>' +
        '<ul class="ct-rows">' +
        row('Мобильный', A.phone, 'tel:' + A.phoneHref, A.phone) + row('Email', A.email, 'mailto:' + A.email, A.email) + row('Telegram', '@' + A.telegram, tg, '@' + A.telegram, true) + row('Instagram', '@' + A.instagram, ig, '@' + A.instagram, true) + '</ul>' +
        '<div class="sec"><button type="button" class="pill vcf">Сохранить контакт (.vcf)</button>' +
        '<h3 style="margin:22px 0 10px;font-size:16px">Обсудить проект</h3><form class="mform" novalidate><label>Ваше имя<input name="name" autocomplete="name"></label><label>Как с вами связаться<input name="contact" placeholder="Telegram / телефон / e-mail"></label>' +
        '<label>Что снимаем<select name="type"><option>Реклама</option><option>Кино / короткий метр</option><option>Клип</option><option>AI-проект</option><option>Сценарий</option><option>Другое</option></select></label><label>Сообщение<textarea name="message"></textarea></label>' +
        '<div class="btnrow" style="margin-top:2px"><button type="button" class="pill pri" data-s="mail">Отправить письмом</button><button type="button" class="pill" data-s="tg">Отправить в Telegram</button></div><p class="mmsg" role="status" hidden></p></form></div>';
      function row(lab, val, href, copy, ext) { return '<li><a class="v" href="' + href + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '><small>' + lab + '</small><b>' + esc(val) + '</b></a><button type="button" class="cp" data-c="' + esc(copy) + '">Копировать</button></li>'; }
      var msg = $('.mmsg', w.body); function say(t) { msg.textContent = t; msg.hidden = false; }
      $$('.cp', w.body).forEach(function (b) { b.addEventListener('click', function () { BOS.copy(b.dataset.c).then(function (ok) { BOS.notify('Контакты', ok ? 'Скопировано: ' + b.dataset.c : 'Скопируйте вручную: ' + b.dataset.c); }); }); });
      $('.vcf', w.body).addEventListener('click', function () {
        var v = ['BEGIN:VCARD', 'VERSION:3.0', 'N:Буланов;Кирилл;;;', 'FN:Кирилл Буланов', 'TITLE:Режиссёр, сценарист, AI-креатор', 'TEL;TYPE=CELL:' + A.phoneHref, 'EMAIL:' + A.email, 'URL:https://t.me/' + A.telegram, 'END:VCARD'].join('\r\n');
        var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([v], { type: 'text/vcard' })); a.download = 'Кирилл_Буланов.vcf'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
        BOS.notify('Контакты', 'Файл контакта сохранён: Кирилл_Буланов.vcf');
      });
      var f = $('form', w.body);
      function text() { var e = f.elements, L = ['Здравствуйте, Кирилл!']; if (e.message.value.trim()) L.push('', e.message.value.trim()); L.push('', 'Тип проекта: ' + e.type.value); if (e.name.value.trim()) L.push('Имя: ' + e.name.value.trim()); if (e.contact.value.trim()) L.push('Связь: ' + e.contact.value.trim()); return L.join('\n'); }
      $$('[data-s]', f).forEach(function (b) { b.addEventListener('click', function () {
        if (!f.elements.message.value.trim()) { say('Напишите пару слов о проекте.'); f.elements.message.focus(); return; }
        if (b.dataset.s === 'mail') { location.href = 'mailto:' + A.email + '?subject=' + encodeURIComponent('Проект: ' + f.elements.type.value) + '&body=' + encodeURIComponent(text()); say('Открываю почтовое приложение с готовым письмом.'); }
        else BOS.copy(text()).then(function (ok) { window.open(tg, '_blank', 'noopener'); say(ok ? 'Текст скопирован. Вставьте его в чат с @' + A.telegram + '.' : 'Откройте чат с @' + A.telegram + ' и опишите проект.'); });
      }); });
      this.update(w, o); w.setTitle('Контакты', A.name);
    },
    update: function (w, o) { if (o && o.topic) { var m = $('textarea', w.body); if (m && !m.value) m.value = 'Хочу обсудить проект: ' + o.topic; } }
  };

  /* ----- BulanNet (мобильный браузер) ----- */
  var HOME = 'bulanos://home';
  var BAL = { home: HOME, games: 'bulanos://games', bulanozavr: 'bulanos://bulanozavr', turnik: 'bulanos://turnik', escape: 'bulanos://escape', pobeg: 'bulanos://escape', operator: 'bulanos://escape' };
  var APPURL = { 'bulanos://works': 'portfolio', 'bulanos://contacts': 'contacts', 'bulanos://about': 'about', works: 'portfolio', contacts: 'contacts', about: 'about' };
  function bnorm(u) {
    u = (u || '').trim(); if (!u) return HOME;
    if (/^bulanos:\/\//i.test(u)) return u.toLowerCase();
    if (/^https?:\/\//i.test(u)) return u;
    var k = u.toLowerCase().replace(/^\/+|\/+$/g, ''); if (BAL[k]) return BAL[k]; if (APPURL[k]) return 'bulanos://' + k;
    if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(u)) return 'https://' + u;
    return 'bulanos://' + k;
  }
  function gamesList() {
    var G = [['bulanozavr', 'dino', 'Буланозавр', 'Беги и прыгай через штативы и софиты. Касание — прыжок.', 'Рекорд: ' + (BOS.store('rec-dino') || 0)],
      ['turnik', 'turnik', 'Кирилл на турнике', 'Путь от двора до Солнца. Держи палец — раскачка, отпусти — полёт.', 'Рекорд: ' + (BOS.store('rec-turnik') || 0) + ' м' + (BOS.store('turnik-secret') ? ' · ★ секрет' : '')],
      ['escape', 'escape', 'Побег от оператора', 'Бег к «Оскару» по трём дорожкам. Свайпы, зелёные ускорения.', 'Рекорд: ' + (BOS.store('rec-escape') || 0) + ' м' + (BOS.store('escape-oscar') ? ' · «Оскар» получен' : '')]];
    return '<div class="mg">' + G.map(function (g) { return '<button type="button" data-nav="bulanos://' + g[0] + '"><canvas width="232" height="164" data-preview="' + g[1] + '"></canvas><div><b>' + g[2] + '</b><small>' + g[3] + '</small><em>' + g[4] + '</em></div></button>'; }).join('') + '</div>';
  }
  var BPAGES = {
    'bulanos://home': { title: 'BulanNet', html: function () { return '<div class="mweb"><div class="logo">BulanNet<small>браузер телефона Кирилла</small></div><h2>Мини-игры</h2>' + gamesList() +
      '<h2>Быстрые ссылки</h2><div class="lk"><button type="button" data-app="portfolio">▶ Портфолио</button><button type="button" data-app="contacts">✉ Контакты</button><a href="https://t.me/' + A.telegram + '" target="_blank" rel="noopener">Telegram ↗</a><a href="https://instagram.com/' + A.instagram + '" target="_blank" rel="noopener">Instagram ↗</a></div>' +
      '<p style="font-size:12px;color:#777;margin-top:20px">Внешние сайты открываются в обычном браузере телефона.</p></div>'; } },
    'bulanos://games': { title: 'Мини-игры', html: function () { return '<div class="mweb"><h1>Мини-игры</h1><p style="margin-top:0;color:#555">Рекорды сохраняются в этом браузере.</p>' + gamesList() + '</div>'; } }
  };
  function MB(w) {
    var self = this; this.w = w; this.tabs = []; this.active = null;
    w.body.innerHTML = '<div class="mb"><div class="mb-top"><button type="button" class="bk" aria-label="Назад по истории">◀</button><button type="button" class="fw" aria-label="Вперёд">▶</button><form role="search"><input type="url" inputmode="url" aria-label="Адрес" spellcheck="false" autocomplete="off" autocapitalize="off" enterkeyhint="go"></form><button type="button" class="hm" aria-label="Домашняя страница">⌂</button><button type="button" class="tabs-btn" aria-label="Вкладки">1</button></div><div class="mb-prog"></div><div class="mb-pages"></div></div>';
    this.el = { pages: $('.mb-pages', w.body), input: $('input', w.body), tabsBtn: $('.tabs-btn', w.body), prog: $('.mb-prog', w.body) };
    $('.mb-top .bk', w.body).addEventListener('click', function () { self.go(-1); });
    $('.mb-top .fw', w.body).addEventListener('click', function () { self.go(1); });
    $('.mb-top .hm', w.body).addEventListener('click', function () { self.nav(HOME); });
    this.el.tabsBtn.addEventListener('click', function () { self.showTabs(); });
    $('form', w.body).addEventListener('submit', function (e) { e.preventDefault(); var u = self.el.input.value; self.el.input.blur(); self.nav(bnorm(u)); });
    this.onRot = function () { self.autoImmersive(); }; window.addEventListener('resize', this.onRot);
  }
  MB.prototype.addTab = function (url) { var t = { hist: [], idx: -1, title: '', page: document.createElement('div') }; t.page.className = 'br-page'; this.el.pages.appendChild(t.page); this.tabs.push(t); this.select(t); this.nav(url || HOME); return t; };
  MB.prototype.select = function (t) { this.tabs.forEach(function (x) { x.page.hidden = x !== t; if (x !== t && x.game) x.game.pause(); }); this.active = t; this.chrome(); };
  MB.prototype.closeTab = function (t) { if (t.game) t.game.destroy(); t.page.remove(); var i = this.tabs.indexOf(t); this.tabs.splice(i, 1); if (!this.tabs.length) { this.addTab(HOME); return; } if (this.active === t) this.select(this.tabs[Math.max(0, i - 1)]); this.chrome(); };
  MB.prototype.chrome = function () {
    var t = this.active; if (!t) return; var u = t.hist[t.idx] || '';
    this.el.input.value = u; $('.mb-top .bk', this.w.body).disabled = t.idx <= 0; $('.mb-top .fw', this.w.body).disabled = t.idx >= t.hist.length - 1;
    this.el.tabsBtn.textContent = this.tabs.length; this.w.setTitle('BulanNet', t.title || u); this.autoImmersive();
  };
  MB.prototype.nav = function (url) {
    var ap = APPURL[url]; if (ap) { open(ap); return; }
    var t = this.active; t.hist = t.hist.slice(0, t.idx + 1); t.hist.push(url); t.idx = t.hist.length - 1; this.render(t);
  };
  MB.prototype.go = function (d) { var t = this.active, n = t.idx + d; if (n < 0 || n >= t.hist.length) return false; t.idx = n; this.render(t); return true; };
  MB.prototype.render = function (t) {
    var self = this, url = t.hist[t.idx], p = this.el.prog;
    if (t.game) { t.game.destroy(); t.game = null; }
    t.page.className = 'br-page'; t.page.scrollTop = 0;
    if (!reduced()) { p.style.transition = 'none'; p.style.width = '0'; void p.offsetWidth; p.style.transition = ''; p.style.width = '100%'; setTimeout(function () { p.style.width = '0'; }, 360); }
    if (BOS.GAMES && BOS.GAMES[url]) {
      t.game = BOS.mountGame(t, url, { mobile: true, exit: function () { if (!self.go(-1)) self.nav('bulanos://games'); }, fullscreen: function () { ph.classList.toggle('immersive'); self.manual = ph.classList.contains('immersive'); setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 30); } });
    } else if (BPAGES[url]) { t.title = BPAGES[url].title; t.page.innerHTML = BPAGES[url].html(); }
    else if (/^https?:\/\//.test(url)) { t.title = url.replace(/^https?:\/\//, '').split('/')[0]; t.page.innerHTML = '<div class="mweb"><h1>Внешний сайт</h1><p>Адрес: <b style="word-break:break-all">' + esc(url) + '</b></p><p>Большинство сайтов запрещают показ внутри других страниц, поэтому BulanNet открывает их в браузере телефона.</p><p><a class="pill pri" style="color:#062200" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">Открыть ↗</a></p></div>'; }
    else { t.title = 'Не найдено'; t.page.innerHTML = '<div class="mweb" style="text-align:center"><canvas width="200" height="120" data-preview="dino404" style="image-rendering:pixelated;width:200px"></canvas><h1>Страница не найдена</h1><p>Адрес <b>' + esc(url) + '</b> неизвестен даже Буланозавру.</p><div class="lk"><button type="button" data-nav="' + HOME + '">На домашнюю</button><button type="button" data-nav="bulanos://games">К мини-играм</button></div></div>'; }
    $$('[data-nav]', t.page).forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); click(); self.nav(a.dataset.nav); }); });
    $$('[data-app]', t.page).forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); open(a.dataset.app); }); });
    $$('canvas[data-preview]', t.page).forEach(function (c) { if (BOS.games && BOS.games.preview) BOS.games.preview(c, c.dataset.preview); });
    this.chrome();
  };
  /* в горизонтальной ориентации игра сама разворачивается на весь экран */
  MB.prototype.autoImmersive = function () {
    var t = this.active, game = !!(t && t.game) && cur === this.w && !this.w.el.hidden, land = innerWidth > innerHeight && innerHeight < 560;
    if (!game) { ph.classList.remove('immersive'); this.manual = false; return; }
    if (land) ph.classList.add('immersive'); else if (!this.manual) ph.classList.remove('immersive');
  };
  MB.prototype.showTabs = function () {
    var self = this, ov = document.createElement('div'); ov.className = 'mb-tabs';
    ov.innerHTML = this.tabs.map(function (t, i) { var g = t.game; return '<div class="tc' + (t === self.active ? ' cur' : '') + '"><button type="button" class="o" data-i="' + i + '"><div class="th">' + (g ? '🎮' : '🌐') + '</div><div class="tt">' + esc(t.title || t.hist[t.idx]) + '</div></button><button type="button" class="x" data-i="' + i + '" aria-label="Закрыть вкладку">×</button></div>'; }).join('') + '<button type="button" class="nt">+ Новая вкладка</button>';
    this.w.body.querySelector('.mb').appendChild(ov); this.tabsOv = ov;
    $$('.o', ov).forEach(function (b) { b.addEventListener('click', function () { self.select(self.tabs[+b.dataset.i]); self.hideTabs(); }); });
    $$('.x', ov).forEach(function (b) { b.addEventListener('click', function () { self.closeTab(self.tabs[+b.dataset.i]); self.hideTabs(); self.showTabs(); }); });
    $('.nt', ov).addEventListener('click', function () { self.hideTabs(); self.addTab(HOME); });
  };
  MB.prototype.hideTabs = function () { if (this.tabsOv) { this.tabsOv.remove(); this.tabsOv = null; } };
  MB.prototype.pauseAll = function () { this.tabs.forEach(function (t) { if (t.game) t.game.pause(); }); };
  MB.prototype.destroy = function () { this.tabs.forEach(function (t) { if (t.game) t.game.destroy(); }); window.removeEventListener('resize', this.onRot); };
  MAPPS.browser = { mtitle: 'BulanNet', flush: true,
    recSub: function (w) { var t = w.data.br.active; return t ? (t.title || '') : ''; },
    render: function (w, o) { w.data.br = new MB(w); w.data.br.addTab(o && o.url ? bnorm(o.url) : HOME); },
    update: function (w, o) { if (o && o.url) { var b = w.data.br, u = bnorm(o.url), ex = b.tabs.filter(function (t) { return t.hist[t.idx] === u; })[0]; if (ex) b.select(ex); else if (b.active && b.active.hist[b.active.idx] === HOME) b.nav(u); else b.addTab(u); } },
    onBack: function (w) { var b = w.data.br; if (b.tabsOv) { b.hideTabs(); return true; } if (ph.classList.contains('immersive')) { ph.classList.remove('immersive'); b.manual = false; return true; } return b.go(-1); },
    onHide: function (w) { if (w.data.br) { w.data.br.pauseAll(); } ph.classList.remove('immersive'); },
    onShow: function (w) { if (w.data.br) w.data.br.autoImmersive(); },
    onClose: function (w) { if (w.data.br) w.data.br.destroy(); }
  };

  /* ----- Корзина: файловый менеджер ----- */
  MAPPS.trash = { mtitle: 'Корзина',
    render: function (w) {
      var items = BOS.trashItems ? BOS.trashItems() : [];
      w.body.innerHTML = '<div class="fm-path">📁 /sdcard/Корзина · ' + items.length + ' объекта</div>' + items.map(function (it) {
        return '<div class="fm-row" data-id="' + it.id + '" role="button" tabindex="0"><span class="ic">' + BOS.icon(it.icon) + '</span><span class="tx"><b>' + esc(it.name) + '</b><small>' + esc(it.size) + ' · удалён ' + esc(it.when) + '</small>' + (it.id === 'doc' ? '<em>' + esc(it.tip) + '</em>' : '') + '</span><button type="button" class="more" aria-label="Свойства: ' + esc(it.name) + '">⋮</button></div>';
      }).join('') + '<p class="fm-empty">Удалённые файлы хранятся здесь с 2013 года</p>';
      $$('.fm-row', w.body).forEach(function (r) {
        var t0 = 0, lp = null;
        r.addEventListener('click', function (e) { if (e.target.closest('.more')) return; if (Date.now() - t0 < 50) return; click(); BOS.trashOpen(r.dataset.id); });
        r.addEventListener('keydown', function (e) { if (e.key === 'Enter') BOS.trashOpen(r.dataset.id); });
        r.addEventListener('pointerdown', function () { lp = setTimeout(function () { t0 = Date.now(); lp = null; BOS.trashProps(r.dataset.id); }, 600); });
        ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { r.addEventListener(ev, function () { if (lp) { clearTimeout(lp); lp = null; } else if (ev === 'pointerup' && Date.now() - t0 < 700) t0 = Date.now(); }); });
        $('.more', r).addEventListener('click', function () { BOS.trashProps(r.dataset.id); });
      });
      w.data.select = function (id) { var r = $('.fm-row[data-id="' + id + '"]', w.body); if (r) r.scrollIntoView({ block: 'nearest' }); };
      w.setTitle('Корзина', items.length + ' объекта');
      w.setStatus = function (a) { w.setTitle('Корзина', a.slice(1).join(' · ')); };
    }
  };
  /* окна компьютерной версии (редактор сценария, просмотр фото) открываются на весь экран с мобильными стилями */
  if (BOS.apps.scriptdoc) BOS.apps.scriptdoc.mtitle = 'БуланВорд 2003';
  if (BOS.apps.trashphoto) BOS.apps.trashphoto.mtitle = 'IMG_2013_НЕ_ПОКАЗЫВАТЬ.jpg';

  /* ----- Настройки ----- */
  var t0 = Date.now();
  MAPPS.settings = { mtitle: 'Настройки',
    render: function (w) {
      var s = BOS.settings;
      function sw(name, on, title, sub) { return '<div class="st-row"><span class="tx"><b>' + title + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</span><button type="button" class="sw" role="switch" aria-checked="' + (!!on) + '" data-k="' + name + '" aria-label="' + title + '"></button></div>'; }
      function rng(name, v, title) { return '<div class="st-row"><span class="tx"><b>' + title + '</b><small class="v-' + name + '">' + Math.round(v * 100) + '%</small></span><input type="range" min="0" max="1" step="0.05" value="' + v + '" data-r="' + name + '" aria-label="' + title + '"></div>'; }
      w.body.innerHTML = '<div class="st-h">Звук</div>' + sw('sound', s.sound, 'Звуки интерфейса', 'щелчки, уведомления') + rng('volume', s.volume, 'Громкость интерфейса') +
        '<div class="st-h">Музыка в играх</div>' + sw('gamesound', BOS.gameSound(), 'Музыка и эффекты в играх', 'включается после нажатия «Играть»') + rng('music', s.music == null ? 0.7 : s.music, 'Музыка') + rng('fx', s.fx == null ? 0.8 : s.fx, 'Эффекты') + sw('gameButtons', s.gameButtons, 'Экранные кнопки в «Побеге»', 'вместо свайпов, если они неудобны') +
        '<div class="st-h">Экран</div>' + sw('reduced', s.reduced, 'Меньше анимаций', 'без переходов и мерцания') + sw('lockEvery', s.lockEvery, 'Экран блокировки при каждом входе', 'по умолчанию — только при первом визите') +
        '<div class="wps-m" role="group" aria-label="Обои">' + WALLS.map(function (p) { return '<button type="button" data-w="' + p[0] + '" aria-pressed="' + ((s.mwall || 'night') === p[0]) + '"><i style="background-image:url(\'' + wallURL(p[0]) + '\')"></i><span>' + p[1] + '</span></button>'; }).join('') + '</div>' +
        '<button type="button" class="st-btn lockb">Заблокировать телефон</button>' +
        '<div class="st-h">Об устройстве</div><dl class="dev"><dt>Название</dt><dd>BULAN OS</dd><dt>Владелец</dt><dd>' + esc(A.name) + '</dd><dt>Тип</dt><dd>Режиссёрский смартфон</dd><dt>Версия</dt><dd>1.0</dd></dl><p class="sec muted" style="padding-top:4px">Это вымышленное устройство внутри сайта. Ваш экран сейчас: <span class="scr"></span>.</p>' +
        '<button type="button" class="st-btn desk">Открыть компьютерную версию сайта</button><button type="button" class="st-btn rst">Сбросить настройки</button>';
      $$('.sw', w.body).forEach(function (b) { b.addEventListener('click', function () {
        var on = b.getAttribute('aria-checked') !== 'true'; b.setAttribute('aria-checked', on);
        if (b.dataset.k === 'gamesound') { BOS.store('gamesound', on); if (BOS.audio) BOS.audio.apply(); } else BOS.setSetting(b.dataset.k, on);
        if (on && b.dataset.k === 'sound') BOS.sfx('click');
      }); });
      $$('[data-r]', w.body).forEach(function (r) { r.addEventListener('input', function () { BOS.setSetting(r.dataset.r, +r.value); $('.v-' + r.dataset.r, w.body).textContent = Math.round(r.value * 100) + '%'; }); r.addEventListener('change', function () { if (r.dataset.r === 'fx' && BOS.audio) BOS.audio.sfx('score'); else BOS.sfx('click'); }); });
      $$('[data-w]', w.body).forEach(function (b) { b.addEventListener('click', function () { BOS.setSetting('mwall', b.dataset.w); applyWall(); $$('[data-w]', w.body).forEach(function (q) { q.setAttribute('aria-pressed', q === b); }); click(); }); });
      $('.lockb', w.body).addEventListener('click', function () { BOS.lockPhone(); });
      $('.desk', w.body).addEventListener('click', function () { BOS.switchMode('desktop'); });
      $('.rst', w.body).addEventListener('click', function () { localStorage.removeItem('bos-settings'); location.reload(); });
      $('.scr', w.body).textContent = innerWidth + '×' + innerHeight + ' px';
      w.setTitle('Настройки', 'BULAN OS 1.0');
    }
  };

  /* ---------- запуск ---------- */
  function init() {
    build();
    var first = !BOS.store('m-seen');
    if (first || BOS.settings.lockEvery) showLock(first);
    document.title = 'Кирилл Буланов — телефон (BULAN OS)';
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
