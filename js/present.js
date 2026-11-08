/* Панель презентационного режима + окно выбора/отзыва с оценками.
   Работает на всех страницах концепций (html[data-concept]) и на главной презентации. */
(function () {
  var KP = window.KP = window.KP || {};
  var C = window.KP_CONCEPTS || [];
  var CRIT = ['Внешний вид', 'Удобство', 'Анимации', 'Подача портфолио', 'Общее впечатление'];
  var html = document.documentElement;
  var current = parseInt(html.getAttribute('data-concept') || '0', 10);
  var isConcept = current > 0;
  var base = html.getAttribute('data-base') || (isConcept ? '../../' : '');

  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function concept(n) { for (var i = 0; i < C.length; i++) if (C[i].n === n) return C[i]; return null; }
  function href(n) { return base + 'concepts/' + concept(n).slug + '/index.html'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  KP.fbData = function (n) { return store('kp-fb-' + n) || { ratings: {}, liked: '', change: '', comments: '' }; };
  KP.chosen = function () { return store('kp-chosen'); };

  /* ---------- окно отзыва ---------- */
  var modal, form, st, mode = 'choose', fbN = current || 1;
  function buildModal() {
    modal = document.createElement('div');
    modal.className = 'kpp-modal'; modal.hidden = true;
    modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-labelledby', 'kpp-title');
    var opts = C.map(function (c) { return '<option value="' + c.n + '">Вариант ' + c.n + ' — ' + esc(c.name) + '</option>'; }).join('');
    var rows = CRIT.map(function (c, i) {
      var r = '<div class="kpp-rate" role="radiogroup" aria-label="' + c + '"><span>' + c + '</span><div class="kpp-dots">';
      for (var v = 1; v <= 5; v++) r += '<label><input type="radio" name="r' + i + '" value="' + v + '"><b>' + v + '</b></label>';
      return r + '</div></div>';
    }).join('');
    modal.innerHTML =
      '<form class="kpp-card" novalidate>' +
      '<button type="button" class="kpp-x" data-kpp-close aria-label="Закрыть">×</button>' +
      '<p class="kpp-eyebrow">Презентация концепций</p>' +
      '<h2 id="kpp-title" class="kpp-h">Этот вариант тебе нравится?</h2>' +
      '<label class="kpp-f"><span>Выбранная концепция</span><select name="concept">' + opts + '</select></label>' +
      '<fieldset class="kpp-rates"><legend>Оценка от 1 до 5 (по желанию)</legend>' + rows + '</fieldset>' +
      '<label class="kpp-f"><span>Что понравилось?</span><textarea name="liked" rows="2"></textarea></label>' +
      '<label class="kpp-f"><span>Что хотелось бы изменить?</span><textarea name="change" rows="2"></textarea></label>' +
      '<label class="kpp-f"><span>Дополнительные комментарии</span><textarea name="comments" rows="2"></textarea></label>' +
      '<div class="kpp-send"><p class="kpp-sendh">Отправить отзыв</p>' +
      '<div class="kpp-btns"><button type="button" class="kpp-b kpp-b--main" data-send="tg">Отправить в Telegram</button>' +
      '<button type="button" class="kpp-b" data-send="copy">Скопировать текст</button>' +
      '<button type="button" class="kpp-b" data-send="mail">Письмом</button></div>' +
      '<p class="kpp-hint">Сайт статический, своего сервера у него нет: отзыв уходит только когда вы сами отправите его в Telegram или письмом. Черновик сохраняется в этом браузере.</p>' +
      '<p class="kpp-status" role="status" aria-live="polite" hidden></p></div>' +
      '<details class="kpp-prev"><summary>Посмотреть текст отзыва</summary><pre></pre></details>' +
      '</form>';
    document.body.appendChild(modal);
    form = modal.querySelector('form'); st = modal.querySelector('.kpp-status');
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    modal.querySelector('[data-kpp-close]').addEventListener('click', close);
    form.concept.addEventListener('change', function () { save(); fbN = parseInt(form.concept.value, 10); load(); });
    form.addEventListener('input', function () { save(); preview(); });
    form.addEventListener('submit', function (e) { e.preventDefault(); });
    modal.querySelectorAll('[data-send]').forEach(function (b) {
      b.addEventListener('click', function () {
        save(); var t = text(), a = b.getAttribute('data-send');
        if (mode === 'choose') store('kp-chosen', fbN);
        if (a === 'copy') KP.copy(t).then(function (ok) { say(ok ? 'Текст отзыва скопирован. Вставьте его в любой мессенджер.' : 'Не получилось скопировать — откройте «Посмотреть текст отзыва» и скопируйте вручную.'); });
        if (a === 'tg') KP.telegram(t).then(say);
        if (a === 'mail') KP.mail('Отзыв о концепции ' + fbN + ' — сайт Кирилла', t).then(say);
        document.dispatchEvent(new CustomEvent('kp:feedback'));
      });
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) close(); });
  }
  function say(t) { st.textContent = t; st.hidden = false; }
  function gather() {
    var d = { ratings: {}, liked: form.liked.value, change: form.change.value, comments: form.comments.value };
    CRIT.forEach(function (c, i) { var r = form.querySelector('input[name="r' + i + '"]:checked'); if (r) d.ratings[c] = +r.value; });
    return d;
  }
  function save() { if (form) store('kp-fb-' + fbN, gather()); }
  function load() {
    var d = KP.fbData(fbN); form.concept.value = fbN;
    form.liked.value = d.liked || ''; form.change.value = d.change || ''; form.comments.value = d.comments || '';
    CRIT.forEach(function (c, i) { form.querySelectorAll('input[name="r' + i + '"]').forEach(function (r) { r.checked = d.ratings && +r.value === d.ratings[c]; }); });
    preview();
  }
  KP.feedbackText = function (n, chooseMode) {
    var c = concept(n), d = KP.fbData(n), L = [];
    L.push('Отзыв о концепции ' + n + ' «' + c.name + '» (' + c.tag + ')');
    if (chooseMode) L.push('Выбор: этот вариант нравится ✔');
    var r = CRIT.filter(function (k) { return d.ratings && d.ratings[k]; }).map(function (k) { return '• ' + k + ': ' + d.ratings[k] + '/5'; });
    if (r.length) { L.push('Оценки:'); L = L.concat(r); }
    if (d.liked) L.push('Что понравилось: ' + d.liked.trim());
    if (d.change) L.push('Что изменить: ' + d.change.trim());
    if (d.comments) L.push('Комментарии: ' + d.comments.trim());
    var url = location.href.split('#')[0];
    if (!isConcept) url = url.replace(/index\.html$/, '').replace(/\/?$/, '/') + 'concepts/' + c.slug + '/';
    L.push('Ссылка: ' + url);
    return L.join('\n');
  };
  function text() { return KP.feedbackText(fbN, mode === 'choose'); }
  function preview() { var p = modal.querySelector('.kpp-prev pre'); if (p) p.textContent = text(); }
  var lastFocus;
  KP.openFeedback = function (n, m) {
    if (!modal) buildModal();
    mode = m || 'choose'; fbN = n || current || 1;
    modal.querySelector('#kpp-title').textContent = mode === 'choose' ? 'Этот вариант тебе нравится?' : 'Замечания по варианту';
    st.hidden = true; load(); lastFocus = document.activeElement;
    modal.hidden = false; document.documentElement.classList.add('kpp-lock');
    setTimeout(function () { (mode === 'choose' ? form.liked : form.comments).focus(); }, 40);
  };
  function close() { save(); modal.hidden = true; document.documentElement.classList.remove('kpp-lock'); if (lastFocus && lastFocus.focus) lastFocus.focus(); document.dispatchEvent(new CustomEvent('kp:closed')); }

  /* ---------- панель презентации на страницах концепций ---------- */
  function buildPanel() {
    var c = concept(current), n = C.length;
    var prev = current > 1 ? current - 1 : n, next = current < n ? current + 1 : 1;
    var p = document.createElement('aside');
    p.className = 'kpp'; p.setAttribute('aria-label', 'Панель презентации концепций');
    p.innerHTML =
      '<button type="button" class="kpp-tab" aria-expanded="false" aria-controls="kpp-body"><span class="kpp-tabn">' + current + '/' + n + '</span><span class="kpp-tabl">Варианты</span></button>' +
      '<div class="kpp-body" id="kpp-body">' +
      '<div class="kpp-top"><span class="kpp-eyebrow">Презентация · вариант ' + current + ' из ' + n + '</span><button type="button" class="kpp-min" aria-label="Свернуть панель">–</button></div>' +
      '<p class="kpp-name">' + esc(c.name) + '<small>' + esc(c.tag) + '</small></p>' +
      '<nav class="kpp-nums" aria-label="Все варианты">' + C.map(function (x) { return '<a href="' + href(x.n) + '"' + (x.n === current ? ' aria-current="page"' : '') + ' title="' + esc(x.name) + '">' + x.n + '</a>'; }).join('') + '</nav>' +
      '<div class="kpp-row"><a class="kpp-b" href="' + href(prev) + '">‹ Пред.</a><a class="kpp-b" href="' + href(next) + '">След. ›</a></div>' +
      '<button type="button" class="kpp-b kpp-b--main" data-kpp="choose">Выбрать этот вариант</button>' +
      '<button type="button" class="kpp-b" data-kpp="note">Оставить замечание</button>' +
      '<div class="kpp-row"><a class="kpp-b" href="' + base + 'index.html">← Ко всем</a><button type="button" class="kpp-b" data-kpp="hide">Скрыть</button></div>' +
      '</div>' +
      '<button type="button" class="kpp-dot" aria-label="Показать панель презентации" title="Показать панель презентации"></button>';
    document.body.appendChild(p);
    var tab = p.querySelector('.kpp-tab');
    function setState(s) { p.setAttribute('data-state', s); tab.setAttribute('aria-expanded', s === 'open' ? 'true' : 'false'); store('kp-panel', s === 'hidden' ? 'hidden' : 'collapsed'); }
    setState(store('kp-panel') === 'hidden' ? 'hidden' : 'collapsed');
    tab.addEventListener('click', function () { setState('open'); var f = p.querySelector('.kpp-min'); if (f) f.focus(); });
    p.querySelector('.kpp-min').addEventListener('click', function () { setState('collapsed'); tab.focus(); });
    p.querySelector('[data-kpp="hide"]').addEventListener('click', function () { setState('hidden'); });
    p.querySelector('.kpp-dot').addEventListener('click', function () { setState('open'); });
    p.querySelector('[data-kpp="choose"]').addEventListener('click', function () { KP.openFeedback(current, 'choose'); });
    p.querySelector('[data-kpp="note"]').addEventListener('click', function () { KP.openFeedback(current, 'note'); });
  }

  var embedded = false; try { embedded = window.self !== window.top; } catch (e) { embedded = true; }
  function init() { if (isConcept && !embedded) buildPanel(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
