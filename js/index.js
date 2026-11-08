/* Главная страница презентации: галерея концепций с живыми превью, выбор, сводка оценок. */
(function () {
  var $ = KP.qs, C = window.KP_CONCEPTS;
  var info = {
    1: { idea: 'Шоурил на весь экран с жёсткими склейками. Вместе с кадром меняется конец фразы: «Кирилл снимает борьбу… чай на катке… сериалы нулевых».',
         feats: ['Монтаж как предложение', 'Список работ с превью за курсором', 'Спокойная премиальность для брендов'], tone: '#ff5b2e' },
    2: { idea: 'Личная страничка 2003 года, где главный герой — плеер с работами, а навигация — плейлист и окна рабочего стола.',
         feats: ['Окна можно двигать, сворачивать, закрывать', 'Меню «Пуск», бегущая строка, звуки по кнопке', 'Ирония в оформлении, работы — всерьёз'], tone: '#3cff00' },
    3: { idea: 'Сайт как телеканал: каждая работа — канал. Переключение через помехи, телепрограмма, телетекст и «звонок в студию».',
         feats: ['P± и свайп переключают каналы', 'Кино с каше, ТВ-работы в 4:3', 'Растёт из его пародии на нулевые и ТВ-эстетики'], tone: '#ffd400' },
    4: { idea: 'Интерактивное кино: прокрутка управляет камерой. Кадр отъезжает, открывается каше, появляются субтитры, между частями — титры немого кино.',
         feats: ['Скролл-режиссура каждой сцены', 'Плёнка-навигация справа', 'Кинозал с титрами вместо карточки'], tone: '#f5d90a' },
    5: { idea: 'Работы как плакаты: ультрамарин, гигантская типографика, асимметричная сетка. Разделы переключаются красной шторкой.',
         feats: ['Фильтр с перестройкой сетки (FLIP)', 'Два вида: плакаты и список', 'Боковая панель проекта'], tone: '#ff3b1f' },
    6: { idea: 'Монтажный лайтбокс: негативы на светящемся столе, лупа показывает позитив, по клику кадр «проявляется» в красной комнате.',
         feats: ['Лупа и проявка вместо обычного превью', 'Контактные листы с пометками воском', 'Бланк «заказа проявки» вместо формы'], tone: '#c4231b' }
  };
  function href(c) { return 'concepts/' + c.slug + '/index.html'; }

  $('#switch').innerHTML = C.map(function (c) { return '<a href="#v' + c.n + '">Вариант ' + c.n + '</a>'; }).join('<span aria-hidden="true">|</span>');
  $('#gallery').innerHTML = C.map(function (c) {
    var i = info[c.n];
    return '<article class="card" id="v' + c.n + '" style="--tone:' + i.tone + '">' +
      '<a class="prev" href="' + href(c) + '" aria-label="Открыть вариант ' + c.n + '"><span class="frame" data-src="' + href(c) + '"></span><span class="open">Открыть сайт ↗</span></a>' +
      '<div class="txt"><p class="num">' + (c.n < 10 ? '0' : '') + c.n + '<span class="chosen" hidden>Твой выбор</span></p>' +
      '<h2>' + KP.esc(c.name) + '</h2><p class="tag">' + KP.esc(c.tag) + '</p><p class="idea">' + i.idea + '</p>' +
      '<ul>' + i.feats.map(function (f) { return '<li>' + f + '</li>'; }).join('') + '</ul>' +
      '<p class="score" hidden></p>' +
      '<div class="btns"><a class="b main" href="' + href(c) + '">Открыть сайт</a><button class="b" type="button" data-choose="' + c.n + '">Выбрать этот вариант</button><button class="b ghost" type="button" data-note="' + c.n + '">Оценить / замечание</button></div></div></article>';
  }).join('');

  /* живые превью: настоящая страница в уменьшенном iframe, грузится когда карточка видна */
  function fit(fr) { var w = fr.clientWidth; var ifr = fr.querySelector('iframe'); if (ifr) ifr.style.transform = 'scale(' + (w / 1440) + ')'; }
  function load(fr) {
    if (fr.querySelector('iframe')) return;
    var ifr = document.createElement('iframe');
    ifr.src = fr.getAttribute('data-src'); ifr.title = 'Превью'; ifr.setAttribute('tabindex', '-1'); ifr.setAttribute('aria-hidden', 'true'); ifr.loading = 'lazy';
    fr.appendChild(ifr); fit(fr);
  }
  var frames = KP.qsa('.frame');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { load(e.target); io.unobserve(e.target); } }); }, { rootMargin: '200px' });
    frames.forEach(function (f) { io.observe(f); });
  } else frames.forEach(load);
  addEventListener('resize', function () { frames.forEach(fit); });

  KP.qsa('[data-choose]').forEach(function (b) { b.addEventListener('click', function () { KP.openFeedback(+b.dataset.choose, 'choose'); }); });
  KP.qsa('[data-note]').forEach(function (b) { b.addEventListener('click', function () { KP.openFeedback(+b.dataset.note, 'note'); }); });

  var CRIT = ['Внешний вид', 'Удобство', 'Анимации', 'Подача портфолио', 'Общее впечатление'];
  function hasData(d) { return d && (Object.keys(d.ratings || {}).length || d.liked || d.change || d.comments); }
  function refresh() {
    var ch = KP.chosen();
    C.forEach(function (c) {
      var card = $('#v' + c.n), d = KP.fbData(c.n);
      card.querySelector('.chosen').hidden = ch !== c.n; card.classList.toggle('is-chosen', ch === c.n);
      var vals = CRIT.map(function (k) { return d.ratings && d.ratings[k]; }).filter(Boolean);
      var sc = card.querySelector('.score');
      if (vals.length) { sc.hidden = false; sc.textContent = 'Твоя средняя оценка: ' + (vals.reduce(function (a, b) { return a + b; }, 0) / vals.length).toFixed(1) + ' / 5'; } else sc.hidden = true;
    });
    $('#sumt tbody').innerHTML = C.map(function (c) {
      var d = KP.fbData(c.n);
      return '<tr' + (ch === c.n ? ' class="is-chosen"' : '') + '><th scope="row">' + c.n + '. ' + KP.esc(c.name) + (ch === c.n ? ' ✔' : '') + '</th>' +
        CRIT.map(function (k) { return '<td>' + ((d.ratings && d.ratings[k]) || '—') + '</td>'; }).join('') +
        '<td>' + (hasData(d) ? 'есть' : '—') + '</td></tr>';
    }).join('');
  }
  function allText() {
    var ch = KP.chosen(), parts = [];
    if (ch) parts.push('ВЫБРАННЫЙ ВАРИАНТ: ' + ch);
    C.forEach(function (c) { if (hasData(KP.fbData(c.n)) || ch === c.n) parts.push(KP.feedbackText(c.n, ch === c.n)); });
    return parts.length ? 'Отзывы о концепциях сайта Кирилла\n\n' + parts.join('\n\n') : '';
  }
  function say(t) { var s = $('#sumStatus'); s.textContent = t; s.hidden = false; }
  function guard(fn) { return function () { var t = allText(); if (!t) { say('Пока нет оценок и отзывов. Открой любой вариант и нажми «Выбрать этот вариант» или «Оценить».'); return; } fn(t); }; }
  $('#copyAll').addEventListener('click', guard(function (t) { KP.copy(t).then(function (ok) { say(ok ? 'Все отзывы скопированы в буфер обмена.' : 'Не получилось скопировать автоматически.'); }); }));
  $('#sendAll').addEventListener('click', guard(function (t) { KP.telegram(t).then(say); }));
  $('#mailAll').addEventListener('click', guard(function (t) { KP.mail('Отзывы о концепциях сайта Кирилла', t).then(say); }));
  document.addEventListener('kp:feedback', refresh);
  addEventListener('focus', refresh);
  document.addEventListener('visibilitychange', refresh);
  document.addEventListener('kp:closed', refresh);
  refresh();
})();
