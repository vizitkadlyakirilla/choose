/* Общие помощники для всех концепций. Без зависимостей. */
(function () {
  var KP = window.KP = window.KP || {};
  var root = document.documentElement;
  KP.base = root.getAttribute('data-base') || '../../';
  KP.reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  KP.works = window.KP_WORKS || [];
  KP.byId = function (id) { for (var i = 0; i < KP.works.length; i++) if (KP.works[i].id === id) return KP.works[i]; return null; };
  KP.poster = function (file) { return KP.base + 'assets/posters/' + file; };
  KP.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  KP.qs = function (s, el) { return (el || document).querySelector(s); };
  KP.qsa = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

  /* ---------- Видео ----------
     Источники берутся ТОЛЬКО из assets/videos/manifest.js (его пишет tools/prepare_videos.py),
     поэтому на странице никогда не бывает ссылок на несуществующие файлы. */
  KP.V = function (w) { var m = window.KP_VIDEOS || {}; return (w && m[w.id]) || null; };
  KP.small = function () { return window.matchMedia && window.matchMedia('(max-width: 700px)').matches; };
  KP.previewSrc = function (w) { var v = KP.V(w); if (!v || !v.preview) return null; return KP.base + ((KP.small() && v.previewMobile) || v.preview); };
  KP.posterOf = function (w, i) { var v = KP.V(w); return (i || 0) === 0 && v && v.poster ? KP.base + v.poster : KP.poster(w.posters[i || 0]); };
  KP.tryPlay = function (v) { try { var p = v.play(); return p && p.then ? p.then(function () { return true; }, function () { return false; }) : Promise.resolve(true); } catch (e) { return Promise.resolve(false); } };

  /* Фоновые превью: без звука, пауза вне экрана и при открытом плеере, без автозапуска при reduced motion */
  var bgs = [], held = false;
  var vio = ('IntersectionObserver' in window) ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { e.target._kpVisible = e.isIntersecting; if (!e.isIntersecting) e.target.pause(); else if (!held && !e.target._kpUserPaused && !KP.reduced) KP.tryPlay(e.target); });
  }, { threshold: 0.15 }) : null;
  KP.registerBg = function (v) {
    v.muted = true; v.defaultMuted = true; v.setAttribute('muted', ''); v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('preload', 'metadata');
    if (bgs.indexOf(v) < 0) { bgs.push(v); if (vio) vio.observe(v); }
    return v;
  };
  KP.holdBg = function () { held = true; bgs.forEach(function (v) { if (!v.paused) { v._kpWasPlaying = true; v.pause(); } }); };
  KP.releaseBg = function () { held = false; bgs.forEach(function (v) { if (v._kpWasPlaying && v._kpVisible !== false && !v._kpUserPaused) KP.tryPlay(v); v._kpWasPlaying = false; }); };

  /* Плеер полной работы (или превью, если полной версии на сайте нет), со звуком после действия пользователя */
  KP.mediaHTML = function (w, opts) {
    opts = opts || {};
    var i = opts.index || 0, v = KP.V(w);
    if (v && (v.full || v.preview) && i === 0) {
      var src = KP.base + (v.full || v.preview);
      return '<div class="kp-player"><video class="kp-video" controls playsinline preload="metadata" ' + (v.full ? '' : 'muted loop ') + 'poster="' + KP.posterOf(w, 0) + '" src="' + src + '"></video>' +
        '<button type="button" class="kp-fs" aria-label="Смотреть на весь экран">⤢ На весь экран</button></div>';
    }
    return '<img class="kp-still" src="' + KP.poster(w.posters[i]) + '" alt="' + KP.esc(w.alt[i] || w.title) + '" loading="lazy">';
  };
  KP.sourceNote = function (w) {
    var v = KP.V(w);
    if (v && v.full) return '';
    if (v && v.preview) return 'На сайте — фрагмент работы. Полная версия: по ссылке на оригинал (для финального сайта — видеохостинг).';
    return 'Видео ещё не загружено на сайт: показан кадр из работы и ссылка на оригинал.';
  };
  /* Автозапуск плеера после клика по проекту + полноэкранный режим */
  KP.startPlayer = function (scope) {
    var v = scope && scope.querySelector('.kp-player video'); if (!v) return;
    KP.tryPlay(v).then(function (ok) { if (!ok) { v.muted = true; KP.tryPlay(v); } });
  };
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.kp-fs'); if (!b) return;
    var v = b.parentNode.querySelector('video'); if (!v) return;
    if (v.requestFullscreen) v.requestFullscreen().catch(function () {}); else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();
  });

  /* Появление при прокрутке */
  KP.reveal = function (scope) {
    var els = KP.qsa('[data-reveal]', scope);
    if (!('IntersectionObserver' in window) || KP.reduced) { els.forEach(function (e) { e.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (e) { io.observe(e); });
  };

  /* Буфер обмена с запасным путём */
  KP.copy = function (text) {
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) {} document.body.removeChild(ta); return ok;
    }
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallback(); });
    }
    return Promise.resolve(fallback());
  };

  var cfg = function () { return window.KP_CONFIG || {}; };
  KP.pageURL = function () { return location.href.split('#')[0]; };

  /* Telegram: если указан получатель — копируем текст и открываем его чат; иначе — окно «Поделиться». */
  KP.telegram = function (text) {
    var u = (cfg().telegramUser || '').replace(/^@/, '');
    if (u) {
      return KP.copy(text).then(function (ok) {
        window.open('https://t.me/' + encodeURIComponent(u), '_blank', 'noopener');
        return ok ? 'Текст скопирован. В открывшемся чате вставьте его и отправьте.' : 'Открыл чат. Скопируйте текст вручную и отправьте.';
      });
    }
    window.open('https://t.me/share/url?url=' + encodeURIComponent(KP.pageURL()) + '&text=' + encodeURIComponent(text), '_blank', 'noopener');
    return Promise.resolve('Открыл Telegram: выберите чат и нажмите «Отправить». Пока вы не отправите сообщение, оно никуда не уходит.');
  };
  KP.mail = function (subject, body) {
    var to = cfg().email || '';
    location.href = 'mailto:' + encodeURIComponent(to) + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    return Promise.resolve(to ? 'Открыл почтовый клиент с готовым письмом.' : 'Открыл почтовый клиент. Адрес получателя пока не указан — впишите его сами.');
  };

  /* Контактная форма концепции: <form data-kp-contact> с полями name, contact, project, message
     и кнопками data-act="copy|tg|mail", статус — [data-kp-status]. */
  KP.wireContact = function (form, conceptName) {
    if (!form) return;
    var status = KP.qs('[data-kp-status]', form);
    function msg() {
      var f = form.elements, lines = ['Заявка с сайта Кирилла (прототип «' + conceptName + '»)'];
      if (f.name && f.name.value.trim()) lines.push('Имя: ' + f.name.value.trim());
      if (f.contact && f.contact.value.trim()) lines.push('Контакт: ' + f.contact.value.trim());
      if (f.project && f.project.value) lines.push('Тип проекта: ' + f.project.value);
      if (f.message && f.message.value.trim()) lines.push('', f.message.value.trim());
      return lines.join('\n');
    }
    function say(t) { if (status) { status.textContent = t; status.hidden = false; } }
    form.addEventListener('submit', function (e) { e.preventDefault(); });
    KP.qsa('[data-act]', form).forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault();
        if (form.elements.message && !form.elements.message.value.trim()) { say('Напишите пару слов о проекте — и выберите, как отправить.'); form.elements.message.focus(); return; }
        var a = b.getAttribute('data-act'), t = msg();
        if (a === 'copy') KP.copy(t).then(function (ok) { say(ok ? 'Сообщение скопировано в буфер обмена.' : 'Не получилось скопировать — выделите текст вручную.'); });
        if (a === 'tg') KP.telegram(t).then(say);
        if (a === 'mail') KP.mail('Проект для Кирилла', t).then(say);
      });
    });
  };

  /* Простая модалка: открыть/закрыть, Esc, возврат фокуса */
  KP.modal = function (el) {
    var last = null;
    function onKey(e) { if (e.key === 'Escape') api.close(); }
    var api = {
      open: function () { last = document.activeElement; KP.holdBg(); el.hidden = false; el.classList.add('is-open'); document.addEventListener('keydown', onKey);
        var f = el.querySelector('[data-autofocus], button, a, input, textarea'); if (f) setTimeout(function () { f.focus(); }, 30); KP.startPlayer(el); },
      close: function () { el.classList.remove('is-open'); el.hidden = true; document.removeEventListener('keydown', onKey);
        KP.qsa('video', el).forEach(function (v) { v.pause(); v.removeAttribute('src'); v.load(); });
        if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
        KP.releaseBg(); if (last && last.focus) last.focus(); }
    };
    KP.qsa('[data-close]', el).forEach(function (b) { b.addEventListener('click', api.close); });
    el.addEventListener('click', function (e) { if (e.target === el) api.close(); });
    return api;
  };
})();
