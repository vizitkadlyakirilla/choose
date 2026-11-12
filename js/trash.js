/* BulanOS — «Корзина» и пасхалка с документом 2013 года.
   Документ — вымышленный юмористический сценарий (не настоящая работа Кирилла Буланова).
   Повторные открытия не создают дубликатов: окна одиночные, диалоги по ключу, наблюдатели снимаются при закрытии. */
(function () {
  var BOS = window.BOS, $ = BOS.$, $$ = BOS.$$, D = window.BOS_TRASH_DOC;

  /* ---------- системные диалоги (модальные, по одному на ключ) ---------- */
  var dialogs = {};
  BOS.dialog = function (o) {
    if (dialogs[o.id]) { var ex = dialogs[o.id]; ex.box.classList.remove('shake'); void ex.box.offsetWidth; ex.box.classList.add('shake'); $('button', ex.box).focus(); return ex; }
    var ov = document.createElement('div'); ov.className = 'dlg-ov'; ov.setAttribute('role', 'presentation');
    ov.innerHTML = '<div class="win act dlg" role="alertdialog" aria-modal="true" aria-labelledby="dlg-t-' + o.id + '" aria-describedby="dlg-d-' + o.id + '">' +
      '<header class="tb">' + BOS.icon(o.icon || 'warn') + '<span class="t" id="dlg-t-' + o.id + '">' + BOS.esc(o.title) + '</span><div class="ctl"><button type="button" class="bcls" aria-label="Закрыть">×</button></div></header>' +
      '<div class="dlg-body"><div class="dlg-ic" aria-hidden="true">' + BOS.icon(o.icon || 'warn') + '</div><div id="dlg-d-' + o.id + '">' + (o.heading ? '<b class="dlg-h">' + BOS.esc(o.heading) + '</b>' : '') + '<p>' + o.html + '</p></div></div>' +
      '<div class="dlg-btns">' + o.buttons.map(function (b, i) { return '<button type="button" class="b3' + (i === 0 ? ' dflt' : '') + '" data-v="' + b.value + '">' + BOS.esc(b.label) + '</button>'; }).join('') + '</div></div>';
    (document.getElementById('m-dlg') || document.getElementById('desktop')).appendChild(ov);
    var box = $('.dlg', ov), last = document.activeElement, api = { box: box, ov: ov };
    function done(v) {
      if (!dialogs[o.id]) return; if (o.before) o.before(v, box); delete dialogs[o.id];
      document.removeEventListener('keydown', key, true); ov.remove();
      if (last && last.focus && document.contains(last)) last.focus();
      if (o.onClose) o.onClose(v);
    }
    function key(e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(o.cancel); }
      if (e.key === 'Tab') { var b = $$('button', box), i = b.indexOf(document.activeElement); e.preventDefault(); b[(i + (e.shiftKey ? -1 : 1) + b.length) % b.length].focus(); }
    }
    $$('.dlg-btns button', box).forEach(function (b) { b.addEventListener('click', function () { done(b.dataset.v); }); });
    $('.bcls', box).addEventListener('click', function () { done(o.cancel); });
    document.addEventListener('keydown', key, true);
    ov.addEventListener('pointerdown', function (e) { if (e.target === ov) { box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake'); BOS.sfx('click'); } });
    dialogs[o.id] = api; api.close = done;
    BOS.sfx(o.sound || 'warn');
    setTimeout(function () { var f = $('.dflt', box); if (f) f.focus(); }, 30);
    return api;
  };

  /* ---------- корзина ---------- */
  var DOC_TIP = 'Последняя попытка открыть: 2013 год. Больше никто не рисковал.';
  var ITEMS = [
    { id: 'doc', name: D.file, icon: 'doc', from: 'C:\\Мои документы\\Сценарии\\НЕ ОТКРЫВАТЬ', when: '17.08.2013', size: '666 КБ', tip: DOC_TIP },
    { id: 'img', name: 'IMG_2013_НЕ_ПОКАЗЫВАТЬ.jpg', icon: 'jpg', from: 'C:\\Мои рисунки\\2013', when: '2013', size: window.BOS_TRASH_PHOTO ? '77 КБ' : 'нет файла', tip: 'Фотография 2013 года. Открывать на свой страх и риск.' }
  ];
  BOS.apps.trash = {
    title: 'Корзина', icon: 'trash', w: 640, h: 330, status: true,
    x: function (vw, w) { return Math.max(110, vw - w - 60); }, y: function (vh, h) { return Math.max(10, vh - h - 40); },
    render: function (w) {
      w.body.classList.add('flush');
      w.body.innerHTML = '<div class="tr-tools"><button type="button" class="b3 tr-open" disabled>Открыть</button><button type="button" class="b3 tr-props" disabled>Свойства</button></div>' +
        '<div class="tr-list sunk" role="listbox" aria-label="Файлы в корзине" tabindex="0"><div class="tr-head" aria-hidden="true"><span>Имя</span><span>Исходное расположение</span><span>Удалён</span><span>Размер</span></div>' +
        ITEMS.map(function (it) { return '<div class="tr-row" role="option" aria-selected="false" data-id="' + it.id + '" title="' + BOS.esc(it.tip) + '"><span class="nm">' + BOS.icon(it.icon) + '<b>' + BOS.esc(it.name) + '</b></span><span>' + BOS.esc(it.from) + '</span><span>' + it.when + '</span><span>' + it.size + '</span></div>'; }).join('') + '</div>';
      var sel = null, lastTap = { id: null, t: 0 };
      function select(id) {
        sel = id; $$('.tr-row', w.body).forEach(function (r) { r.setAttribute('aria-selected', r.dataset.id === id ? 'true' : 'false'); });
        $('.tr-open', w.body).disabled = !id; $('.tr-props', w.body).disabled = !id;
        var it = ITEMS.filter(function (x) { return x.id === id; })[0];
        w.setStatus(it ? [it.name, it.size, 'Двойной щелчок — открыть'] : ['Объектов: ' + ITEMS.length, 'Корзина BulanOS']);
      }
      w.data.select = select;
      $$('.tr-row', w.body).forEach(function (r) {
        r.addEventListener('click', function () {
          var now = Date.now(), id = r.dataset.id;
          select(id);
          /* двойное касание на телефоне = двойной щелчок */
          if (BOS.mobile() && lastTap.id === id && now - lastTap.t < 450) { lastTap = { id: null, t: 0 }; openItem(id); return; }
          lastTap = { id: id, t: now };
        });
        r.addEventListener('dblclick', function () { if (!BOS.mobile()) openItem(r.dataset.id); });
      });
      $('.tr-list', w.body).addEventListener('keydown', function (e) {
        var ids = ITEMS.map(function (i) { return i.id; }), i = ids.indexOf(sel);
        if (e.key === 'ArrowDown') { e.preventDefault(); select(ids[Math.min(ids.length - 1, i + 1)]); }
        if (e.key === 'ArrowUp') { e.preventDefault(); select(ids[Math.max(0, i - 1)]); }
        if (e.key === 'Enter' && sel) { e.preventDefault(); openItem(sel); }
      });
      $('.tr-open', w.body).addEventListener('click', function () { if (sel) openItem(sel); });
      $('.tr-props', w.body).addEventListener('click', function () { if (sel) props(sel); });
      select(null);
    },
    update: function () {}
  };

  function openItem(id) {
    if (id === 'img') return BOS.open('trashphoto');
    if (BOS.wins().scriptdoc) { var ed = BOS.wins().scriptdoc; BOS.open('scriptdoc'); return ed; }   /* уже открыт — просто фокус */
    BOS.dialog({
      id: 'doc-warning', title: 'BulanOS — Предупреждение', icon: 'warn', heading: 'ВНИМАНИЕ!',
      html: 'Этот файл был удалён по эстетическим соображениям. Вы действительно хотите его открыть?',
      buttons: [{ label: 'Да, я готов', value: 'yes' }, { label: 'Нет, у меня есть вкус', value: 'no' }], cancel: 'no',
      onClose: function (v) { if (v === 'yes') BOS.open('scriptdoc'); else { var t = BOS.wins().trash; if (t) BOS.open('trash'); } }
    });
  }
  BOS.trashOpen = openItem;
  BOS.trashItems = function () { return ITEMS; };
  BOS.trashProps = function (id) { props(id); };

  function props(id) {
    var it = ITEMS.filter(function (x) { return x.id === id; })[0];
    var rows = id === 'doc'
      ? [['Тип', 'документ Word'], ['Создан', '17.08.2013'], ['Изменён', '17.08.2013, 03:46'], ['Размер', '666 КБ'], ['Статус', 'удалён'], ['Причина удаления', 'художественные разногласия с самим собой'], ['Расположение', it.from]]
      : [['Тип', 'изображение JPEG'], ['Создан', '2013'], ['Размер', window.BOS_TRASH_PHOTO ? '77 КБ' : 'файл ещё не добавлен'], ['Разрешение', '1206 × 808'], ['Статус', 'удалён'], ['Расположение', it.from]];
    BOS.dialog({ id: 'props-' + id, title: 'Свойства: ' + it.name, icon: it.icon, sound: 'click',
      html: '<table class="ptab">' + rows.map(function (r) { return '<tr><th scope="row">' + r[0] + ':</th><td>' + BOS.esc(r[1]) + '</td></tr>'; }).join('') + '</table>' + (id === 'doc' ? '<small class="pnote">Вымышленный документ — пасхалка BulanOS.</small>' : ''),
      buttons: [{ label: 'ОК', value: 'ok' }], cancel: 'ok' });
  }

  /* ---------- фото из корзины (ждёт файл от заказчика) ---------- */
  BOS.apps.trashphoto = {
    title: 'IMG_2013_НЕ_ПОКАЗЫВАТЬ.jpg — Просмотр изображений', icon: 'jpg', w: 700, h: 560, flush: true, status: true,
    render: function (w) {
      var src = window.BOS_TRASH_PHOTO;
      w.body.innerHTML = '<div class="viewer"><div class="stage">' + (src ? '<img src="' + src + '" alt="Кирилл Буланов с другом ночью, плёночное фото 2013 года">' : '<p class="nophoto">Файл IMG_2013_НЕ_ПОКАЗЫВАТЬ.jpg ещё не добавлен на сайт.</p>') + '</div>' +
        (src ? '<div class="ctlrow" style="padding:6px"><a class="b3" href="' + src + '" download="IMG_2013_НЕ_ПОКАЗЫВАТЬ.jpg">Сохранить</a><button type="button" class="b3 tp-back">Вернуть в корзину</button></div>' : '') + '</div>';
      var bk = $('.tp-back', w.body); if (bk) bk.addEventListener('click', function () { BOS.sfx('trash'); w.close(); BOS.open('trash'); });
      if (w.setStatus) w.setStatus(['IMG_2013_НЕ_ПОКАЗЫВАТЬ.jpg', '1206 × 808', 'Удалён в 2013']);
    }
  };

  /* ---------- текстовый редактор 2013 года ---------- */
  function paragraphs() {
    return D.text.replace(/\s+$/, '').split(/\n\s*\n/).map(function (p) {
      var raw = p.replace(/\n/g, ' '), t = BOS.esc(raw).replace(/\t/g, '<span class="tab">\t</span>');
      if (/^СЦЕНА \d/.test(raw)) return '<p class="sc">' + t + '</p>';
      if (/^(КОНЕЦ\.|ПРИМЕЧАНИЯ АВТОРА)$/.test(raw)) return '<p class="hd2">' + t + '</p>';
      var m = /^([А-ЯЁ]{3,}):\s/.exec(raw);
      if (m && raw.indexOf('Титр') !== 0) return '<p class="dl"><b>' + m[1] + ':</b>' + t.slice(m[1].length + 1) + '</p>';
      if (/^Последнее изменение/.test(raw)) return '<p class="last">' + t + '</p>';
      return '<p>' + t + '</p>';
    });
  }
  function titlePage() {
    return ['<div class="tpage"><p class="tt">' + BOS.esc(D.title) + '</p><p>Сценарий полнометражного фильма</p><p>Год: ' + D.year + '</p><p>Жанр: ' + BOS.esc(D.genre) + '</p><p class="tdraft">ЧЕРНОВИК · ФИНАЛ · ТОЧНО НОВЫЙ · 2</p></div>'];
  }
  function plain() { return D.title + '\nГод: ' + D.year + '\nЖанр: ' + D.genre + '\n\n' + D.text; }
  function wordDoc() {
    var body = titlePage().concat(paragraphs()).join('\n').replace(/<div class="tpage">/, '<div>').replace(/<span class="tab">\t<\/span>/g, '&emsp;&emsp;');
    return '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>' + BOS.esc(D.title) +
      '</title><style>body{font-family:"Times New Roman";font-size:12pt}p.sc{font-weight:bold;text-decoration:underline;margin-top:18pt}p.hd2{font-weight:bold;text-align:center}.tt{font-size:16pt;font-weight:bold;text-align:center}</style></head><body>' + body + '</body></html>';
  }
  function download(name, data, type) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + data], { type: type })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  }

  BOS.apps.scriptdoc = {
    title: D.file + ' — БуланВорд 2003', icon: 'doc', w: 820, h: 600, status: true, flush: true,
    x: function (vw, w) { return Math.max(100, (vw - w) / 2); }, y: 14,
    render: function (w) {
      w.data.zoom = 1;
      w.body.innerHTML = '<div class="ed">' +
        '<div class="ed-tools" role="toolbar" aria-label="Панель инструментов"><button type="button" class="b3 ed-save">💾 Сохранить как…</button><button type="button" class="b3 ed-copy">Копировать всё</button>' +
        '<span class="ed-sep"></span><button type="button" class="b3 ed-zo" aria-label="Уменьшить масштаб">−</button><span class="ed-z" aria-live="polite">100%</span><button type="button" class="b3 ed-zi" aria-label="Увеличить масштаб">+</button>' +
        '<span class="ed-sep"></span><button type="button" class="b3 ed-props">Свойства</button></div>' +
        '<div class="ed-ruler" aria-hidden="true"></div><div class="ed-scroll" tabindex="0" aria-label="Текст документа"><div class="ed-pages"></div></div></div>';
      var scroll = $('.ed-scroll', w.body), pages = $('.ed-pages', w.body), blocks = titlePage().concat(paragraphs());
      function paginate() {
        var ratio = scroll.scrollHeight > scroll.clientHeight ? scroll.scrollTop / (scroll.scrollHeight - scroll.clientHeight) : 0;
        pages.style.setProperty('--z', w.data.zoom);
        pages.innerHTML = '';
        var page, body, n = 0;
        function newPage() { n++; page = document.createElement('section'); page.className = 'pg'; page.innerHTML = '<div class="pg-body"></div><footer class="pg-num">— ' + n + ' —</footer>'; pages.appendChild(page); body = $('.pg-body', page); }
        newPage();
        blocks.forEach(function (h, i) {
          var tmp = document.createElement('div'); tmp.innerHTML = h; var el = tmp.firstChild;
          if (i === 1) newPage();                                   /* титульный лист — отдельная страница */
          body.appendChild(el);
          if (body.scrollHeight > body.clientHeight + 1 && body.children.length > 1) { body.removeChild(el); newPage(); body.appendChild(el); }
        });
        var end = document.createElement('div'); end.className = 'ed-end'; end.setAttribute('aria-hidden', 'true'); body.appendChild(end);
        w.data.total = n;
        $$('.pg-num', pages).forEach(function (f, k) { f.textContent = 'Страница ' + (k + 1) + ' из ' + n; });
        scroll.scrollTop = ratio * (scroll.scrollHeight - scroll.clientHeight);
        watchEnd(end); status();
      }
      function current() { var ps = $$('.pg', pages), top = scroll.scrollTop + scroll.clientHeight * 0.35, c = 1; ps.forEach(function (p, k) { if (p.offsetTop <= top) c = k + 1; }); return c; }
      function status() { w.setStatus(['Стр. ' + current() + ' из ' + (w.data.total || 1), 'Изменён: 17.08.2013, 03:46', 'Масштаб ' + Math.round(w.data.zoom * 100) + '%']); }
      /* «дочитал до конца» — одна пасхалка на одно открытие */
      function watchEnd(el) {
        if (w.data.io) w.data.io.disconnect();
        if (w.data.endShown) return;
        w.data.io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting && !w.data.endShown) { w.data.endShown = true; w.data.io.disconnect(); w.data.endT = setTimeout(function () { finale(w); }, 700); } }); }, { root: scroll, threshold: 0 });
        w.data.io.observe(el);
      }
      var st = 0; scroll.addEventListener('scroll', function () { if (!st) st = requestAnimationFrame(function () { st = 0; status();
        /* дочитал до самого низа (быстрая прокрутка могла «перепрыгнуть» метку конца) */
        if (!w.data.endShown && scroll.scrollTop + scroll.clientHeight >= scroll.scrollHeight - 4) { w.data.endShown = true; if (w.data.io) w.data.io.disconnect(); w.data.endT = setTimeout(function () { finale(w); }, 700); } }); }, { passive: true });
      var rt = 0; w.data.ro = new ResizeObserver(function () { clearTimeout(rt); rt = setTimeout(paginate, 120); }); w.data.ro.observe(scroll);
      function zoom(d) { w.data.zoom = Math.max(0.8, Math.min(1.5, Math.round((w.data.zoom + d) * 10) / 10)); $('.ed-z', w.body).textContent = Math.round(w.data.zoom * 100) + '%'; paginate(); BOS.sfx('click'); }
      $('.ed-zi', w.body).addEventListener('click', function () { zoom(0.1); });
      $('.ed-zo', w.body).addEventListener('click', function () { zoom(-0.1); });
      $('.ed-copy', w.body).addEventListener('click', function () { BOS.copy(plain()).then(function (ok) { BOS.notify('БуланВорд 2003', ok ? 'Весь текст скопирован в буфер обмена.' : 'Не удалось скопировать — выделите текст вручную.', { timeout: 3000 }); }); });
      $('.ed-props', w.body).addEventListener('click', function () { props('doc'); });
      $('.ed-save', w.body).addEventListener('click', function () { saveAs(); });
      paginate();
    },
    onClose: function (w) { if (w.data.io) w.data.io.disconnect(); if (w.data.ro) w.data.ro.disconnect(); clearTimeout(w.data.endT); if (dialogs['doc-finale']) dialogs['doc-finale'].close('silent'); if (dialogs['save-as']) dialogs['save-as'].close('silent'); }
  };

  function saveAs() {
    var dl = BOS.dialog({ id: 'save-as', title: 'Сохранить как', icon: 'doc', sound: 'click',
      html: '<label class="sv">Имя файла:<input type="text" class="sv-name" value="' + BOS.esc(D.file.replace(/\.doc$/, '')) + '"></label><label class="sv">Тип файла:<select class="sv-type"><option value="doc">Документ Word (*.doc)</option><option value="txt">Обычный текст (*.txt)</option></select></label>',
      buttons: [{ label: 'Сохранить', value: 'save' }, { label: 'Отмена', value: 'cancel' }], cancel: 'cancel',
      before: function (v, box) {
        if (v !== 'save') return;
        var name = ($('.sv-name', box).value || 'документ').trim().replace(/[\\/:*?"<>|]/g, '_'), type = $('.sv-type', box).value;
        if (type === 'doc') download(name + '.doc', wordDoc(), 'application/msword'); else download(name + '.txt', plain(), 'text/plain;charset=utf-8');
        setTimeout(function () { BOS.notify('Сохранение', 'Файл «' + name + '.' + type + '» скачан.', { timeout: 3500 }); }, 50);
      }
    });
    var box = dl.box;
    $('.sv-name', box).addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); dl.close('save'); } });
    setTimeout(function () { var i = $('.sv-name', box); i.focus(); i.select(); }, 40);
  }

  /* ---------- финальная пасхалка ---------- */
  function finale(w) {
    if (!BOS.wins().scriptdoc) return;
    BOS.dialog({ id: 'doc-finale', title: 'Восстановить сценарий?', icon: 'question', sound: 'notify',
      html: 'Обнаружен потенциальный шедевр мирового кинематографа. Возможно, файл был удалён по ошибке.',
      buttons: [{ label: 'Нет', value: 'no' }, { label: 'Удалить ещё раз', value: 'again' }], cancel: 'no',
      onClose: function (v) { if (v === 'again') redelete(w); }
    });
  }
  function redelete(w) {
    var icon = $('.ic[data-app="trash"]') || $('.ph-nav .nb-home'), r = w.el.getBoundingClientRect(), t = icon ? icon.getBoundingClientRect() : { left: 20, top: innerHeight - 80, width: 40, height: 40 };
    var dx = t.left + t.width / 2 - (r.left + r.width / 2), dy = t.top + t.height / 2 - (r.top + r.height / 2);
    BOS.sfx('trash');
    if (BOS.reduced()) { done(); return; }
    w.el.style.transition = 'transform .75s cubic-bezier(.6,-0.2,.7,.3), opacity .75s ease-in';
    w.el.style.transformOrigin = 'center'; w.el.classList.add('crumple');
    requestAnimationFrame(function () { w.el.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(.04) rotate(-28deg)'; w.el.style.opacity = '0.2'; });
    setTimeout(done, 780);
    function done() {
      w.close();
      var tw = BOS.open('trash');
      if (tw) { tw.data.select && tw.data.select('doc'); var row = $('.tr-row[data-id="doc"], .fm-row[data-id="doc"]', tw.body); if (row) { row.classList.remove('back'); void row.offsetWidth; row.classList.add('back'); } tw.setStatus([D.file, 'Снова удалён', 'Он всегда возвращается']); }
      if (icon) { icon.classList.remove('gulp'); void icon.offsetWidth; icon.classList.add('gulp'); }
    }
  }
})();
