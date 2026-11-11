/* BulanOS — приложение «Браузер»: вкладки, история, адресная строка, внутренние страницы и мини-игры. */
(function () {
  var BOS = window.BOS, $ = BOS.$, $$ = BOS.$$, A = window.BOS_AUTHOR, W = window.BOS_WORKS;
  var HOME = 'bulanos://home';
  var ALIAS = { home: HOME, games: 'bulanos://games', bulanozavr: 'bulanos://bulanozavr', turnik: 'bulanos://turnik', escape: 'bulanos://escape', pobeg: 'bulanos://escape', operator: 'bulanos://escape', works: 'bulanos://works', contacts: 'bulanos://contacts', about: 'bulanos://about' };
  BOS.gameSound = function () { var v = BOS.store('gamesound'); return v === null ? true : v; };

  function norm(u) {
    u = (u || '').trim(); if (!u) return HOME;
    if (/^bulanos:\/\//i.test(u)) return u.toLowerCase();
    if (/^https?:\/\//i.test(u)) return u;
    var k = u.toLowerCase().replace(/^\/+|\/+$/g, ''); if (ALIAS[k]) return ALIAS[k];
    if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(u)) return 'https://' + u;
    return 'bulanos://' + k;
  }

  function gamesHTML() {
    return '<h2>МИНИ-ИГРЫ БУЛАНОЗАВРА</h2><div class="gcards">' +
      '<button type="button" class="gcard" data-nav="bulanos://bulanozavr"><canvas width="320" height="180" data-preview="dino"></canvas><div><b>БУЛАНОЗАВР</b><small>Беги, прыгай через штативы и софиты. Пробел / ↑ / касание.</small></div></button>' +
      '<button type="button" class="gcard" data-nav="bulanos://turnik"><canvas width="320" height="180" data-preview="turnik"></canvas><div><b>КИРИЛЛ НА ТУРНИКЕ</b><small>Держи — раскачивайся, отпусти — лети к следующей перекладине.</small></div></button>' +
      '<button type="button" class="gcard" data-nav="bulanos://escape"><canvas width="320" height="180" data-preview="escape"></canvas><div><b>ПОБЕГ ОТ ОПЕРАТОРА</b><small>Три дорожки. Лови зелёные ускорения, иначе оператор догонит. Стрелки / свайпы.</small></div></button></div>';
  }
  var PAGES = {
    'bulanos://home': { title: 'Домашняя — Кирилл Буланов', html: function () {
      return '<div class="web"><h1>Домашняя страница Кирилла Буланова</h1><p>Режиссёр, сценарист и AI-креатор. Это внутренний браузер BulanOS: здесь живут мини-игры и быстрые ссылки по сайту.</p>' + gamesHTML() +
        '<h2>ПО САЙТУ</h2><div class="links"><a href="#" data-nav="bulanos://works">Все работы</a> · <a href="#" data-nav="bulanos://about">Об авторе</a> · <a href="#" data-nav="bulanos://contacts">Контакты</a></div>' +
        '<h2>В ИНТЕРНЕТЕ</h2><div class="links"><a href="https://t.me/' + A.telegram + '" target="_blank" rel="noopener">Telegram @' + A.telegram + ' ↗</a> · <a href="https://instagram.com/' + A.instagram + '" target="_blank" rel="noopener">Instagram @' + A.instagram + ' ↗</a></div>' +
        '<p style="margin-top:24px;font-size:12px;color:#555">Внешние сайты открываются в новой вкладке вашего браузера: большинство сайтов запрещают показ внутри чужих страниц.</p></div>'; } },
    'bulanos://games': { title: 'Мини-игры Буланозавра', html: function () { return '<div class="web"><h1>Мини-игры</h1><p>Рекорды сохраняются в этом браузере.</p>' + gamesHTML() + '</div>'; } },
    'bulanos://works': { title: 'Работы — Кирилл Буланов', html: function () {
      return '<div class="web"><h1>Работы</h1><p>Нажмите на работу, чтобы открыть её в отдельном окне с плеером.</p><ol>' + W.map(function (w) { return '<li><a href="#" data-project="' + w.id + '">' + BOS.esc(w.title) + '</a> — ' + BOS.esc(w.kind.toLowerCase()) + (w.dur ? ', ' + BOS.esc(w.dur) : '') + '</li>'; }).join('') + '</ol></div>'; } },
    'bulanos://about': { title: 'Об авторе', html: function () { return '<div class="web"><h1>' + A.name + '</h1><p><img src="assets/photos/kirill-avatar.jpg" alt="' + A.name + '" width="120" height="120" style="float:left;margin:0 14px 8px 0;border:3px ridge #ccc">' + A.roles.join(', ') + '. Снимает рекламу, пишет кино и делает AI-проекты.</p><p><a href="#" data-app="about">Открыть «Обо_мне.exe»</a> · <a href="#" data-app="director">Режиссура</a></p></div>'; } },
    'bulanos://contacts': { title: 'Контакты — ' + A.name, html: function () { return '<div class="web"><h1>Контакты</h1><ul><li>Email: <a href="mailto:' + A.email + '">' + A.email + '</a></li><li>Telegram: <a href="https://t.me/' + A.telegram + '" target="_blank" rel="noopener">@' + A.telegram + '</a></li><li>Телефон: <a href="tel:' + A.phoneHref + '">' + A.phone + '</a></li><li>Instagram: <a href="https://instagram.com/' + A.instagram + '" target="_blank" rel="noopener">@' + A.instagram + '</a></li></ul><p><a href="#" data-app="contacts">Открыть приложение «Контакты»</a></p></div>'; } }
  };
  var GAMES = { 'bulanos://bulanozavr': ['dino', 'БУЛАНОЗАВР', 'rec-dino'], 'bulanos://turnik': ['turnik', 'КИРИЛЛ НА ТУРНИКЕ', 'rec-turnik'], 'bulanos://escape': ['escape', 'ПОБЕГ ОТ ОПЕРАТОРА', 'rec-escape'] };

  var tabSeq = 0;
  function Browser(w) {
    var self = this; this.w = w; this.tabs = []; this.active = null;
    w.body.innerHTML = '<div class="br"><div class="br-tabs" role="tablist" aria-label="Вкладки"></div>' +
      '<div class="br-bar"><button type="button" class="b3 bk" aria-label="Назад">◀</button><button type="button" class="b3 fw" aria-label="Вперёд">▶</button><button type="button" class="b3 rl" aria-label="Обновить">⟳</button><button type="button" class="b3 hm hide-m" aria-label="Домашняя страница">⌂</button>' +
      '<form role="search"><input type="text" aria-label="Адрес" spellcheck="false" autocomplete="off"><button type="submit" class="b3">Перейти</button></form></div><div class="br-pages" style="flex:1;min-height:0;position:relative"></div></div>';
    this.el = { tabs: $('.br-tabs', w.body), pages: $('.br-pages', w.body), input: $('.br-bar input', w.body) };
    $('.bk', w.body).addEventListener('click', function () { self.go(-1); });
    $('.fw', w.body).addEventListener('click', function () { self.go(1); });
    $('.rl', w.body).addEventListener('click', function () { self.render(self.active); BOS.sfx('click'); });
    $('.hm', w.body).addEventListener('click', function () { self.nav(HOME); });
    $('form', w.body).addEventListener('submit', function (e) { e.preventDefault(); self.nav(norm(self.el.input.value)); self.el.input.blur(); });
  }
  Browser.prototype.addTab = function (url) {
    var t = { id: ++tabSeq, hist: [], idx: -1, title: '', page: document.createElement('div') };
    t.page.className = 'br-page'; t.page.style.cssText = 'position:absolute;inset:0'; this.el.pages.appendChild(t.page);
    this.tabs.push(t); this.select(t); this.nav(url || HOME); return t;
  };
  Browser.prototype.closeTab = function (t) {
    if (t.game) t.game.destroy(); t.page.remove();
    var i = this.tabs.indexOf(t); this.tabs.splice(i, 1);
    if (!this.tabs.length) { this.w.close(); return; }
    if (this.active === t) this.select(this.tabs[Math.max(0, i - 1)]); else this.drawTabs();
  };
  Browser.prototype.select = function (t) {
    var self = this;
    this.tabs.forEach(function (x) { x.page.hidden = x !== t; if (x !== t && x.game) x.game.pause(); });
    this.active = t; this.drawTabs(); this.chrome();
  };
  Browser.prototype.drawTabs = function () {
    var self = this;
    this.el.tabs.innerHTML = '';
    this.tabs.forEach(function (t) {
      var d = document.createElement('div'); d.className = 'br-tab'; d.setAttribute('role', 'tab'); d.setAttribute('aria-selected', t === self.active); d.tabIndex = 0;
      d.innerHTML = '<span>' + BOS.esc(t.title || 'Новая вкладка') + '</span><button type="button" aria-label="Закрыть вкладку">×</button>';
      d.addEventListener('click', function (e) { if (e.target.closest('button')) return; self.select(t); });
      d.addEventListener('keydown', function (e) { if (e.key === 'Enter') self.select(t); });
      $('button', d).addEventListener('click', function () { self.closeTab(t); });
      self.el.tabs.appendChild(d);
    });
    var n = document.createElement('button'); n.type = 'button'; n.className = 'b3 br-new'; n.textContent = '+'; n.setAttribute('aria-label', 'Новая вкладка');
    n.addEventListener('click', function () { self.addTab(HOME); }); this.el.tabs.appendChild(n);
  };
  Browser.prototype.chrome = function () {
    var t = this.active; if (!t) return;
    this.el.input.value = t.hist[t.idx] || '';
    $('.bk', this.w.body).disabled = t.idx <= 0; $('.fw', this.w.body).disabled = t.idx >= t.hist.length - 1;
    this.w.setTitle((t.title || 'Браузер') + ' — BulanNet Explorer');
  };
  Browser.prototype.nav = function (url) {
    var t = this.active; t.hist = t.hist.slice(0, t.idx + 1); t.hist.push(url); t.idx = t.hist.length - 1; this.render(t); BOS.sfx('click');
  };
  Browser.prototype.go = function (d) { var t = this.active, n = t.idx + d; if (n < 0 || n >= t.hist.length) return; t.idx = n; this.render(t); BOS.sfx('click'); };
  Browser.prototype.render = function (t) {
    var self = this, url = t.hist[t.idx];
    if (t.game) { t.game.destroy(); t.game = null; }
    t.page.className = 'br-page'; t.page.scrollTop = 0;
    if (GAMES[url]) { this.mountGame(t, url); }
    else if (PAGES[url]) { t.title = PAGES[url].title; t.page.innerHTML = PAGES[url].html(); }
    else if (/^https?:\/\//.test(url)) {
      t.title = url.replace(/^https?:\/\//, '').split('/')[0];
      t.page.innerHTML = '<div class="web"><h1>Внешний сайт</h1><p>Адрес: <b>' + BOS.esc(url) + '</b></p><p>Большинство сайтов запрещают показывать себя внутри других страниц, поэтому BulanNet Explorer открывает их в новой вкладке вашего браузера.</p><p><a class="b3" href="' + BOS.esc(url) + '" target="_blank" rel="noopener noreferrer">Открыть в новой вкладке ↗</a></p></div>';
    } else {
      t.title = '404 — не найдено';
      t.page.innerHTML = '<div class="web" style="text-align:center"><canvas width="200" height="120" data-preview="dino404" style="image-rendering:pixelated;width:240px"></canvas><h1>Страница не найдена</h1><p>Адрес <b>' + BOS.esc(url) + '</b> неизвестен даже Буланозавру.</p><p><a href="#" data-nav="' + HOME + '">На домашнюю</a> · <a href="#" data-nav="bulanos://games">К мини-играм</a></p></div>';
    }
    $$('[data-nav]', t.page).forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); self.nav(a.dataset.nav); }); });
    $$('[data-project]', t.page).forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); BOS.open('project', { id: a.dataset.project }); }); });
    $$('[data-app]', t.page).forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); BOS.open(a.dataset.app); }); });
    $$('canvas[data-preview]', t.page).forEach(function (c) { if (BOS.games && BOS.games.preview) BOS.games.preview(c, c.dataset.preview); });
    this.drawTabs(); this.chrome();
  };
  Browser.prototype.mountGame = function (t, url) {
    var self = this, g = GAMES[url];
    t.title = g[1]; t.page.className = 'br-page game';
    t.page.innerHTML = '<div class="gamebar"><b class="gtitle">' + g[1] + '</b><button type="button" class="b3 gp">❚❚ Пауза</button><button type="button" class="b3 gr">⟳ Заново</button><button type="button" class="b3 gs"></button><button type="button" class="b3 gx">Выход</button><span class="sp"></span></div><div class="gamewrap"><canvas tabindex="0" aria-label="Игровое поле ' + g[1] + '"></canvas></div>';
    var cv = $('canvas', t.page), sp = $('.sp', t.page), gp = $('.gp', t.page), gs = $('.gs', t.page);
    function sUI() { gs.textContent = BOS.gameSound() ? '♪ Звук: вкл' : '♪ Звук: выкл'; }
    sUI();
    var ctl = BOS.games[g[0]](cv, {
      score: function (s, best) { sp.textContent = 'СЧЁТ ' + s + ' · РЕКОРД ' + best; },
      state: function (st) { gp.textContent = st === 'paused' ? '▶ Продолжить' : '❚❚ Пауза'; gp.disabled = st === 'over' || st === 'ready'; },
      recordKey: g[2],
      exit: function () { if (t.idx > 0) self.go(-1); else self.nav('bulanos://games'); }
    });
    t.game = ctl;
    gp.addEventListener('click', function () { if (ctl.isPaused()) ctl.resume(); else ctl.pause(); cv.focus(); });
    $('.gr', t.page).addEventListener('click', function () { ctl.restart(); cv.focus(); });
    gs.addEventListener('click', function () { BOS.store('gamesound', !BOS.gameSound()); sUI(); cv.focus(); });
    $('.gx', t.page).addEventListener('click', function () { if (t.idx > 0) self.go(-1); else self.nav('bulanos://games'); });
    setTimeout(function () { cv.focus(); }, 50);
  };
  Browser.prototype.pauseAll = function () { this.tabs.forEach(function (t) { if (t.game) t.game.pause(); }); };
  Browser.prototype.destroy = function () { this.tabs.forEach(function (t) { if (t.game) t.game.destroy(); }); };

  BOS.apps.browser = {
    title: 'BulanNet Explorer', icon: 'browser', w: 900, h: 600, flush: true,
    x: function (vw, w) { return Math.max(110, (vw - w) / 2); }, y: 20,
    render: function (w, o) { w.data.br = new Browser(w); w.data.br.addTab(o && o.url ? norm(o.url) : HOME); },
    update: function (w, o) { if (o && o.url) { var b = w.data.br, u = norm(o.url), ex = b.tabs.filter(function (t) { return t.hist[t.idx] === u; })[0]; if (ex) b.select(ex); else b.addTab(u); } },
    onHide: function (w) { if (w.data.br) w.data.br.pauseAll(); },
    onClose: function (w) { if (w.data.br) w.data.br.destroy(); },
    onResize: function () { window.dispatchEvent(new Event('resize')); }
  };
})();
