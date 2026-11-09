/* BulanOS — приложения: Об авторе, Режиссура, Свойства проекта, Сценарии, AI, Фотографии, Контакты, Настройки. */
(function () {
  var BOS = window.BOS, $ = BOS.$, $$ = BOS.$$, A = window.BOS_AUTHOR, W = window.BOS_WORKS;
  var R = function (vw, w) { return Math.max(130, vw - w - 24); };

  /* ---------- Об авторе (первый экран) ---------- */
  BOS.apps.about = {
    title: 'Кирилл Буланов — Обо_мне.exe', icon: 'about', w: 590, h: 500, status: true,
    render: function (w) {
      w.body.innerHTML = '<div class="profile">' +
        '<figure class="photo"><img src="assets/photos/kirill-portrait.jpg" alt="Кирилл Буланов сидит на пне у реки, подперев подбородок рукой" width="440" height="550"><figcaption><span>kirill.jpg</span><span>440×550</span></figcaption></figure>' +
        '<div><p class="hello">ПРИВЕТ! ТЫ НА КОМПЬЮТЕРЕ</p><h1>Кирилл Буланов</h1><ul class="roles">' + A.roles.map(function (r) { return '<li>' + r + '</li>'; }).join('') + '</ul>' +
        '<p>Привет, меня зовут Кирилл Буланов! Я режиссёр, сценарист и AI-креатор. Снимаю рекламу, пишу кино и иногда делаю странные вещи с нейросетями.</p>' +
        '<p>Реклама: «Горная», AHMAD TEA, Twinby, AliExpress, Dodo GO, Bupas Gym. Кино: дипломный фильм «Петля», «История одной смерти». Эксперименты: пародия на сериалы нулевых, этюд «На всю жизнь».</p>' +
        '<div class="acts"><button type="button" class="b3" data-go="director">▶ Смотреть работы</button><button type="button" class="b3" data-go="contacts">✉ Связаться</button><button type="button" class="b3" data-go="photos">Фотографии</button></div></div></div>';
      $$('[data-go]', w.body).forEach(function (b) { b.addEventListener('click', function () { BOS.act(b.dataset.go); }); });
      w.setStatus(['Режиссёр · Сценарист · AI-креатор', A.email, 'Telegram: @' + A.telegram]);
    }
  };

  /* ---------- Режиссура: плеер + плейлист ---------- */
  var DIR = null;
  BOS.apps.director = {
    title: 'Режиссура — КирПлеер 3.0', icon: 'director', w: 720, h: 520, status: true,
    x: function (vw, w) { return R(vw, w); }, y: 40,
    render: function (w) {
      w.body.innerHTML = '<div class="tabs" role="tablist" aria-label="Категории"><button role="tab" aria-selected="true" data-f="all">Все работы</button><button role="tab" aria-selected="false" data-f="ads">Реклама</button><button role="tab" aria-selected="false" data-f="film">Кино</button><button role="tab" aria-selected="false" data-f="exp">Эксперименты</button></div>' +
        '<div class="dir"><div><div class="screen-v sunk" title="Открыть проект"><video muted playsinline loop preload="metadata" hidden></video><img alt=""><span class="osd"></span><span class="tag-demo" hidden>кадр · видео загружается в проект</span><button type="button" class="kp-play b3" hidden style="position:absolute">▶ Пуск</button></div>' +
        '<div class="pinfo"><b class="ttl"></b><span class="eq" aria-hidden="true"><i style="animation-delay:-.1s"></i><i style="animation-delay:-.5s"></i><i style="animation-delay:-.3s"></i><i style="animation-delay:-.7s"></i><i style="animation-delay:-.2s"></i></span><span class="dur" style="font:20px VT323,monospace"></span></div>' +
        '<div class="ctlrow"><button type="button" class="b3 prev" aria-label="Предыдущая работа">|◀◀</button><button type="button" class="b3 pp" aria-label="Пауза">❚❚</button><button type="button" class="b3 next" aria-label="Следующая работа">▶▶|</button><button type="button" class="b3 open">Открыть проект и смотреть целиком</button></div></div>' +
        '<ol class="pl sunk" aria-label="Плейлист работ"></ol></div>';
      var st = DIR = { list: W.slice(), i: 0, w: w, v: $('video', w.body), img: $('.screen-v img', w.body), paused: false };
      function cur() { return st.list[st.i]; }
      function list() {
        $('.pl', w.body).innerHTML = st.list.map(function (x, k) { return '<li><button type="button" data-k="' + k + '"' + (k === st.i ? ' aria-current="true"' : '') + '><span>' + (k + 1) + '. ' + BOS.esc(x.title) + '</span>' + BOS.esc((x.dur || '—').split(' · ')[0].replace(' роликов', '').replace(' ролика', '')) + '</button></li>'; }).join('');
        $$('.pl button', w.body).forEach(function (b) { b.addEventListener('click', function () { st.i = +b.dataset.k; show(); BOS.sfx('click'); }); });
      }
      function show() {
        var x = cur(), src = BOS.previewSrc(x), el = src ? st.v : st.img;
        $('.kp-play', w.body).hidden = true;
        if (src) { st.v.poster = BOS.poster(x); st.v.src = src; st.v.hidden = false; st.img.hidden = true; if (!st.paused) BOS.play(st.v).then(function (ok) { $('.kp-play', w.body).hidden = ok; }); }
        else { st.v.pause(); st.v.removeAttribute('src'); st.v.load(); st.v.hidden = true; st.img.hidden = false; st.img.src = BOS.poster(x); st.img.alt = x.alt[0]; }
        $('.tag-demo', w.body).hidden = !!src;
        el.classList.toggle('fit', x.aspect.indexOf('16:9') < 0); el.classList.remove('crt'); void el.offsetWidth; el.classList.add('crt');
        $('.osd', w.body).textContent = (st.i < 9 ? '0' : '') + (st.i + 1) + (st.paused ? ' ❚❚' : ' ▶');
        $('.ttl', w.body).textContent = x.title + ' — ' + x.kind.toLowerCase();
        $('.dur', w.body).textContent = (x.dur || '—').split(' · ')[0];
        $('.eq', w.body).classList.toggle('off', st.paused || !src);
        w.setStatus(['Работа ' + (st.i + 1) + ' из ' + st.list.length, x.client, src ? 'Превью: видео' : 'Превью: кадр (видео не загружено)']);
        list();
      }
      function setPause(p) { st.paused = p; $('.pp', w.body).textContent = p ? '▶' : '❚❚'; $('.pp', w.body).setAttribute('aria-label', p ? 'Воспроизвести' : 'Пауза'); if (!st.v.hidden) { if (p) st.v.pause(); else BOS.play(st.v); } $('.osd', w.body).textContent = (st.i < 9 ? '0' : '') + (st.i + 1) + (p ? ' ❚❚' : ' ▶'); $('.eq', w.body).classList.toggle('off', p || st.v.hidden); }
      st.show = show; st.setPause = setPause;
      $('.prev', w.body).addEventListener('click', function () { st.i = (st.i - 1 + st.list.length) % st.list.length; show(); BOS.sfx('click'); });
      $('.next', w.body).addEventListener('click', function () { st.i = (st.i + 1) % st.list.length; show(); BOS.sfx('click'); });
      $('.pp', w.body).addEventListener('click', function () { setPause(!st.paused); BOS.sfx('click'); });
      $('.kp-play', w.body).addEventListener('click', function (e) { e.stopPropagation(); setPause(false); $('.kp-play', w.body).hidden = true; });
      function openP() { BOS.open('project', { id: cur().id }); }
      $('.open', w.body).addEventListener('click', openP);
      $('.screen-v', w.body).addEventListener('click', openP);
      $$('.tabs button', w.body).forEach(function (b) { b.addEventListener('click', function () {
        $$('.tabs button', w.body).forEach(function (x) { x.setAttribute('aria-selected', x === b); });
        st.list = b.dataset.f === 'all' ? W.slice() : W.filter(function (x) { return x.cat === b.dataset.f; }); st.i = 0; show(); BOS.sfx('click'); }); });
      show();
    },
    onHide: function () { if (DIR && DIR.v) DIR.v.pause(); },
    onShow: function () { if (DIR && !DIR.paused && !DIR.v.hidden) BOS.play(DIR.v); },
    onClose: function () { DIR = null; }
  };

  /* ---------- Свойства проекта: полный просмотр ---------- */
  BOS.apps.project = {
    title: 'Проект', icon: 'director', w: 820, h: 520, status: true,
    render: function (w, o) { this.update(w, o); },
    update: function (w, o) {
      var x = BOS.byId(o.id || 'gornaya'), v = BOS.V(x), src = v && (v.full || v.preview);
      if (DIR && DIR.v) DIR.v.pause();
      w.setTitle('Свойства: ' + x.title.replace(/[«»]/g, '') + ' — ' + A.name);
      var media = src ? '<div class="media" style="position:relative"><video controls playsinline preload="metadata" poster="' + BOS.poster(x) + '" src="' + src + '"' + (v.full ? '' : ' muted loop') + '></video><button type="button" class="b3 fsbtn">⤢ На весь экран</button></div>'
        : '<div class="media"><img src="' + BOS.poster(x) + '" alt="' + BOS.esc(x.alt[0]) + '"></div>';
      w.body.innerHTML = '<div class="props">' + media + '<dl>' +
        [['Название', x.title], ['Режиссёр', A.name + ' (роль уточняется)'], ['Тип', x.kind], ['Заказчик', x.client], ['Длительность', x.dur || 'уточняется'], ['Кадр', x.aspect], ['Загружено', x.upload]].map(function (r) { return '<dt>' + r[0] + ':</dt><dd>' + BOS.esc(r[1]) + '</dd>'; }).join('') + '</dl></div>' +
        '<p class="note">' + BOS.esc([x.note, src ? (v.full ? '' : 'На сайте — фрагмент; полная версия по ссылке на оригинал.') : 'Видео этой работы ещё не загружено на сайт — смотрите оригинал по ссылке.'].filter(Boolean).join(' ')) + '</p>' +
        '<div class="ctlrow"><a class="b3" href="' + x.source + '" target="_blank" rel="noopener">Смотреть оригинал (Яндекс Диск) ↗</a><button type="button" class="b3 nx">Следующая работа ▶</button></div>';
      var vid = $('video', w.body);
      if (vid) { BOS.play(vid).then(function (ok) { if (!ok) { vid.muted = true; BOS.play(vid); } }); $('.fsbtn', w.body).addEventListener('click', function () { if (vid.requestFullscreen) vid.requestFullscreen().catch(function () {}); else if (vid.webkitEnterFullscreen) vid.webkitEnterFullscreen(); }); }
      $('.nx', w.body).addEventListener('click', function () { var k = W.indexOf(x); BOS.apps.project.update(w, { id: W[(k + 1) % W.length].id }); });
      w.setStatus([x.kind, x.dur || '—', src ? (v.full ? 'Полная версия' : 'Фрагмент') : 'Нет видео на сайте']);
    },
    onHide: function (w) { $$('video', w.body).forEach(function (v) { v.pause(); }); },
    onClose: function () { if (DIR && !DIR.paused && !DIR.v.hidden) BOS.play(DIR.v); }
  };

  /* ---------- Сценарии ---------- */
  BOS.apps.scripts = {
    title: 'Сценарии.txt — Блокнот', icon: 'scripts', w: 560, h: 380, flush: true,
    render: function (w) {
      w.body.innerHTML = '<pre class="txt sunk" tabindex="0">СЦЕНАРИИ — ' + BOS.esc(A.name.toUpperCase()) + '\n=====================================\n\nЗдесь будут сценарии, синопсисы и концепции.\n\nСтруктура каждого проекта:\n  • логлайн\n  • синопсис\n  • страницы сценария\n  • статус (в разработке / снят / ищу продюсера)\n\n[Материалы ещё не загружены. Хотите почитать —\n напишите: ' + A.email + ']\n\nP.S. Не закрывайте блокнот, он стесняется.</pre>';
    }
  };

  /* ---------- AI-проекты ---------- */
  BOS.apps.ai = {
    title: 'C:\\Кирилл Буланов\\AI-проекты', icon: 'ai', w: 520, h: 330, status: true,
    render: function (w) {
      var g = '<svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true"><rect x="4" y="4" width="32" height="32" fill="#eee" stroke="#999" stroke-dasharray="3 3"/></svg>';
      w.body.innerHTML = '<div class="sunk" style="min-height:100%"><div class="folder"><div class="ghost">' + g + 'скоро_01.mp4</div><div class="ghost">' + g + 'скоро_02.mp4</div><div class="ghost">' + g + 'скоро_03.mp4</div></div><p class="note" style="padding:0 12px">AI-работы Кирилла появятся здесь: видео, промпт и инструменты. Сейчас папка пуста — материалы готовятся.</p></div>';
      w.setStatus(['Объектов: 0', 'Папка готова к загрузке']);
    }
  };

  /* ---------- Фотографии ---------- */
  var PH = [{ src: 'assets/photos/kirill-river.jpg', alt: 'Кирилл Буланов у реки, сидит на пне', name: 'у_реки.jpg' }, { src: 'assets/photos/kirill-turnik.jpg', alt: 'Кирилл Буланов на турнике, чёрно-белое фото', name: 'турник.jpg' }];
  BOS.apps.photos = {
    title: 'Фотографии — Просмотр изображений', icon: 'photos', w: 620, h: 520, flush: true, status: true,
    render: function (w) {
      var i = 0;
      w.body.innerHTML = '<div class="viewer"><div class="stage"><img alt=""></div><div class="ctlrow" style="padding:6px"><button type="button" class="b3 pv" aria-label="Предыдущее фото">◀</button><button type="button" class="b3 nx" aria-label="Следующее фото">▶</button><a class="b3 dl" download>Сохранить</a></div><div class="thumbs">' +
        PH.map(function (p, k) { return '<button type="button" data-k="' + k + '" aria-label="' + BOS.esc(p.name) + '"><img src="' + p.src + '" alt=""></button>'; }).join('') + '</div></div>';
      function show() { var p = PH[i]; $('.stage img', w.body).src = p.src; $('.stage img', w.body).alt = p.alt; $('.dl', w.body).href = p.src; $('.dl', w.body).setAttribute('download', p.name); $$('.thumbs button', w.body).forEach(function (b, k) { b.toggleAttribute('aria-current', k === i); }); w.setStatus([p.name, (i + 1) + ' из ' + PH.length, A.name]); }
      $('.pv', w.body).addEventListener('click', function () { i = (i - 1 + PH.length) % PH.length; show(); });
      $('.nx', w.body).addEventListener('click', function () { i = (i + 1) % PH.length; show(); });
      $$('.thumbs button', w.body).forEach(function (b) { b.addEventListener('click', function () { i = +b.dataset.k; show(); }); });
      show();
    }
  };

  /* ---------- Контакты ---------- */
  var IC = {
    mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="5" width="20" height="14" fill="#fff" stroke="#000" stroke-width="2"/><path d="M2 6l10 7 10-7" fill="none" stroke="#c00" stroke-width="2"/></svg>',
    tg: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#2aa3df"/><path d="M5 12l13-5-2 11-4-3-2 2v-3l6-5-8 4z" fill="#fff"/></svg>',
    tel: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="2" fill="#333"/><rect x="8" y="4" width="8" height="12" fill="#3cff00"/><circle cx="12" cy="19" r="1.3" fill="#fff"/></svg>',
    ig: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="6" fill="#d6249f"/><circle cx="12" cy="12" r="4.5" fill="none" stroke="#fff" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.3" fill="#fff"/></svg>'
  };
  BOS.apps.contacts = {
    title: 'Контакты — Кирилл Буланов', icon: 'contacts', w: 620, h: 560,
    render: function (w) {
      w.body.innerHTML = '<div class="contacts">' +
        '<a class="ct" href="mailto:' + A.email + '">' + IC.mail + '<div><b>Email</b><span>' + A.email + '</span></div></a>' +
        '<a class="ct" href="https://t.me/' + A.telegram + '" target="_blank" rel="noopener">' + IC.tg + '<div><b>Telegram</b><span>@' + A.telegram + '</span></div></a>' +
        '<a class="ct" href="tel:' + A.phoneHref + '">' + IC.tel + '<div><b>Телефон</b><span>' + A.phone + '</span></div></a>' +
        '<a class="ct" href="https://instagram.com/' + A.instagram + '" target="_blank" rel="noopener">' + IC.ig + '<div><b>Instagram</b><span>@' + A.instagram + '</span></div></a></div>' +
        '<div class="ctlrow" style="margin-top:8px"><button type="button" class="b3 cpm">Скопировать email</button><button type="button" class="b3 cpp">Скопировать телефон</button><button type="button" class="b3 vcf">Сохранить контакт (.vcf)</button></div>' +
        '<form class="form" novalidate><fieldset style="margin-top:12px;border:2px groove #dcdcdc"><legend><b>Обсудить проект</b></legend>' +
        '<label>Ваше имя<input name="name" autocomplete="name"></label><label>Как с вами связаться<input name="contact" placeholder="Telegram / телефон / e-mail"></label>' +
        '<label>Что снимаем<select name="type"><option>Реклама</option><option>Кино / короткий метр</option><option>Клип</option><option>AI-проект</option><option>Сценарий</option><option>Другое</option></select></label>' +
        '<label>Сообщение<textarea name="message" rows="4"></textarea></label>' +
        '<div class="ctlrow" style="margin-top:8px"><button type="button" class="b3" data-s="mail">Отправить письмом</button><button type="button" class="b3" data-s="tg">Отправить в Telegram</button></div>' +
        '<p class="msg" role="status" aria-live="polite" hidden></p></fieldset></form>';
      var msg = $('.msg', w.body);
      function say(t) { msg.textContent = t; msg.hidden = false; }
      $('.cpm', w.body).addEventListener('click', function () { BOS.copy(A.email).then(function (ok) { say(ok ? 'Email скопирован: ' + A.email : 'Скопируйте вручную: ' + A.email); }); });
      $('.cpp', w.body).addEventListener('click', function () { BOS.copy(A.phone).then(function (ok) { say(ok ? 'Телефон скопирован: ' + A.phone : 'Скопируйте вручную: ' + A.phone); }); });
      $('.vcf', w.body).addEventListener('click', function () {
        var v = ['BEGIN:VCARD', 'VERSION:3.0', 'N:Буланов;Кирилл;;;', 'FN:Кирилл Буланов', 'TITLE:Режиссёр, сценарист, AI-креатор', 'TEL;TYPE=CELL:' + A.phoneHref, 'EMAIL:' + A.email, 'URL:https://t.me/' + A.telegram, 'X-SOCIALPROFILE;TYPE=instagram:https://instagram.com/' + A.instagram, 'END:VCARD'].join('\r\n');
        var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([v], { type: 'text/vcard' })); a.download = 'Кирилл_Буланов.vcf'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
        say('Файл контакта сохранён: Кирилл_Буланов.vcf');
      });
      var f = $('form', w.body);
      function text() { var e = f.elements, L = ['Здравствуйте, Кирилл!']; if (e.message.value.trim()) L.push('', e.message.value.trim()); L.push('', 'Тип проекта: ' + e.type.value); if (e.name.value.trim()) L.push('Имя: ' + e.name.value.trim()); if (e.contact.value.trim()) L.push('Контакт: ' + e.contact.value.trim()); return L.join('\n'); }
      $$('[data-s]', f).forEach(function (b) { b.addEventListener('click', function () {
        if (!f.elements.message.value.trim()) { say('Напишите пару слов о проекте.'); f.elements.message.focus(); BOS.sfx('error'); return; }
        if (b.dataset.s === 'mail') { location.href = 'mailto:' + A.email + '?subject=' + encodeURIComponent('Проект: ' + f.elements.type.value) + '&body=' + encodeURIComponent(text()); say('Открываю почтовое приложение с готовым письмом на ' + A.email + '.'); }
        else { BOS.copy(text()).then(function (ok) { window.open('https://t.me/' + A.telegram, '_blank', 'noopener'); say(ok ? 'Текст скопирован. В открывшемся чате с @' + A.telegram + ' вставьте его и отправьте.' : 'Открыл чат с @' + A.telegram + '. Скопируйте текст вручную.'); }); }
      }); });
    }
  };

  /* ---------- Настройки ---------- */
  var WP = [['stars', 'Звёзды', 'radial-gradient(#fff 1px,transparent 1.5px) 0 0/10px 10px,#06063a'], ['teal', 'Бирюза', '#0b7d7d'], ['sunset', 'Закат', 'linear-gradient(#1b0b3a,#5a1f6e 40%,#ff5e7e 65%,#ffb347 80%,#1b0b3a 80%)'], ['petlya', '«Петля»', 'url(assets/posters/petlya.jpg) center/cover']];
  var t0 = Date.now();
  BOS.apps.settings = {
    title: 'Настройки BulanOS', icon: 'settings', w: 540, h: 560,
    render: function (w) {
      var s = BOS.settings;
      w.body.innerHTML = '<div class="set"><fieldset><legend>Звук</legend><label><input type="checkbox" name="sound"' + (s.sound ? ' checked' : '') + '> Звуки интерфейса и игр</label>' +
        '<label>Громкость эффектов <input type="range" name="volume" min="0" max="1" step="0.05" value="' + s.volume + '" style="flex:1"> <output>' + Math.round(s.volume * 100) + '%</output></label><button type="button" class="b3 test">Проверить звук</button></fieldset>' +
        '<fieldset><legend>Анимации</legend><label><input type="checkbox" name="reduced"' + (s.reduced ? ' checked' : '') + '> Отключить сложные анимации (бегущая строка, звёзды, переходы)</label></fieldset>' +
        '<fieldset><legend>Обои рабочего стола</legend><div class="wps">' + WP.map(function (p) { return '<button type="button" data-wp="' + p[0] + '" aria-pressed="' + (s.wallpaper === p[0]) + '"><i style="background:' + p[2] + '"></i>' + p[1] + '</button>'; }).join('') + '</div></fieldset>' +
        '<fieldset><legend>О системе</legend><pre class="sysinfo"></pre></fieldset>' +
        '<div class="ctlrow"><button type="button" class="b3 reset">Сбросить настройки</button></div></div>';
      var b = w.body;
      $('[name=sound]', b).addEventListener('change', function () { BOS.setSetting('sound', this.checked); if (this.checked) BOS.sfx('notify'); });
      $('[name=volume]', b).addEventListener('input', function () { BOS.setSetting('volume', +this.value); $('output', b).textContent = Math.round(this.value * 100) + '%'; });
      $('[name=volume]', b).addEventListener('change', function () { BOS.sfx('click'); });
      $('.test', b).addEventListener('click', function () { BOS.sfx('notify', true); });
      $('[name=reduced]', b).addEventListener('change', function () { BOS.setSetting('reduced', this.checked); });
      $$('[data-wp]', b).forEach(function (x) { x.addEventListener('click', function () { BOS.setSetting('wallpaper', x.dataset.wp); $$('[data-wp]', b).forEach(function (y) { y.setAttribute('aria-pressed', y === x); }); BOS.sfx('click'); }); });
      $('.reset', b).addEventListener('click', function () { localStorage.removeItem('bos-settings'); BOS.settings = { sound: true, volume: 0.5, reduced: false, wallpaper: 'stars' }; BOS.store('settings', BOS.settings); BOS.applySettings(); document.dispatchEvent(new CustomEvent('bos:settings')); BOS.apps.settings.render(w); BOS.notify('Настройки', 'Настройки сброшены к стандартным.'); });
      function info() { var up = Math.round((Date.now() - t0) / 1000); var rec1 = BOS.store('rec-dino') || 0, rec2 = BOS.store('rec-turnik') || 0;
        $('.sysinfo', b).textContent = 'BulanOS 98 · сборка 2026.11\nВладелец: ' + A.name + '\nЭкран: ' + screen.width + '×' + screen.height + ' · окно ' + innerWidth + '×' + innerHeight + '\nВремя работы: ' + Math.floor(up / 60) + ' мин ' + (up % 60) + ' с\nВидео на сайте: ' + Object.keys(window.KP_VIDEOS || {}).length + ' из ' + W.length + '\nРекорды: Буланозавр — ' + rec1 + ', Турник — ' + rec2 + '\nНастройки хранятся в этом браузере (localStorage).'; }
      info(); clearInterval(w.data.t); w.data.t = setInterval(info, 1000);
    },
    onClose: function (w) { clearInterval(w.data.t); }
  };
  document.addEventListener('bos:settings', function (e) { if (e.detail && e.detail.key !== 'volume') { var t = document.querySelector('.toast b'); if (!t || t.textContent !== 'Настройки') BOS.notify('Настройки', 'Сохранено. Изменения запомнятся до следующего визита.', { timeout: 2500 }); } });
})();
