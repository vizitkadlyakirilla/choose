/* BulanOS — ядро: настройки (localStorage), звуки (WebAudio, без файлов), утилиты. */
(function () {
  var BOS = window.BOS = window.BOS || {};
  BOS.apps = BOS.apps || {};
  BOS.$ = function (s, el) { return (el || document).querySelector(s); };
  BOS.$$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  BOS.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  BOS.store = function (k, v) {
    try { if (v === undefined) return JSON.parse(localStorage.getItem('bos-' + k) || 'null'); localStorage.setItem('bos-' + k, JSON.stringify(v)); } catch (e) { return null; }
  };
  BOS.mobile = function () { return window.matchMedia('(max-width: 760px)').matches; };

  /* ---------- Настройки ---------- */
  var sysReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var defaults = { sound: true, volume: 0.5, reduced: sysReduced, wallpaper: 'stars' };
  BOS.settings = Object.assign({}, defaults, BOS.store('settings') || {});
  BOS.setSetting = function (k, v) {
    BOS.settings[k] = v; BOS.store('settings', BOS.settings); BOS.applySettings();
    document.dispatchEvent(new CustomEvent('bos:settings', { detail: { key: k, value: v } }));
  };
  BOS.applySettings = function () {
    var r = document.documentElement;
    r.classList.toggle('bos-reduced', !!BOS.settings.reduced);
    r.setAttribute('data-wallpaper', BOS.settings.wallpaper);
  };
  BOS.reduced = function () { return !!BOS.settings.reduced; };

  /* ---------- Звуки ---------- */
  var ctx = null;
  function ac() { if (!ctx) { var C = window.AudioContext || window.webkitAudioContext; if (C) ctx = new C(); } if (ctx && ctx.state === 'suspended') ctx.resume(); return ctx; }
  function tone(o) {
    var c = ac(); if (!c) return;
    var t = c.currentTime + (o.delay || 0), osc = c.createOscillator(), g = c.createGain(), vol = (o.vol || 0.25) * BOS.settings.volume;
    osc.type = o.type || 'square'; osc.frequency.setValueAtTime(o.f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + o.d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(vol, 0.0002), t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + o.d);
    osc.connect(g); g.connect(c.destination); osc.start(t); osc.stop(t + o.d + 0.02);
  }
  var SFX = {
    click: [{ f: 900, d: 0.04, vol: 0.12 }],
    open: [{ f: 520, to: 1040, d: 0.12, vol: 0.18 }],
    close: [{ f: 760, to: 300, d: 0.12, vol: 0.16 }],
    min: [{ f: 600, to: 250, d: 0.09, vol: 0.12 }],
    max: [{ f: 400, to: 900, d: 0.09, vol: 0.12 }],
    error: [{ f: 180, d: 0.18, type: 'sawtooth', vol: 0.2 }, { f: 140, d: 0.22, delay: 0.12, type: 'sawtooth', vol: 0.2 }],
    notify: [{ f: 880, d: 0.09, type: 'triangle', vol: 0.25 }, { f: 1320, d: 0.14, delay: 0.09, type: 'triangle', vol: 0.25 }],
    boot: [{ f: 392, d: 0.25, type: 'triangle', vol: 0.3 }, { f: 523, d: 0.25, delay: 0.18, type: 'triangle', vol: 0.3 }, { f: 659, d: 0.25, delay: 0.36, type: 'triangle', vol: 0.3 }, { f: 784, d: 0.6, delay: 0.54, type: 'triangle', vol: 0.3 }],
    shutdown: [{ f: 784, d: 0.25, type: 'triangle', vol: 0.3 }, { f: 659, d: 0.25, delay: 0.18, type: 'triangle', vol: 0.3 }, { f: 523, d: 0.25, delay: 0.36, type: 'triangle', vol: 0.3 }, { f: 392, d: 0.7, delay: 0.54, type: 'triangle', vol: 0.3 }],
    jump: [{ f: 420, to: 880, d: 0.12, vol: 0.18 }],
    land: [{ f: 160, d: 0.05, vol: 0.12 }],
    score: [{ f: 988, d: 0.07, vol: 0.18 }, { f: 1319, d: 0.12, delay: 0.07, vol: 0.18 }],
    hit: [{ f: 220, to: 60, d: 0.35, type: 'sawtooth', vol: 0.25 }],
    swing: [{ f: 200, to: 320, d: 0.08, type: 'triangle', vol: 0.08 }],
    whoosh: [{ f: 300, to: 1200, d: 0.25, type: 'triangle', vol: 0.15 }],
    catch: [{ f: 660, d: 0.06, vol: 0.2 }, { f: 990, d: 0.1, delay: 0.06, vol: 0.2 }],
    fall: [{ f: 600, to: 90, d: 0.7, type: 'triangle', vol: 0.22 }],
    warn: [{ f: 523, d: 0.12, type: 'triangle', vol: 0.18 }, { f: 392, d: 0.2, delay: 0.11, type: 'triangle', vol: 0.18 }],
    trash: [{ f: 140, to: 70, d: 0.08, type: 'sawtooth', vol: 0.12 }, { f: 220, to: 90, d: 0.08, delay: 0.09, type: 'sawtooth', vol: 0.12 }, { f: 180, to: 60, d: 0.12, delay: 0.18, type: 'sawtooth', vol: 0.12 }, { f: 300, to: 900, d: 0.25, delay: 0.42, type: 'triangle', vol: 0.12 }]
  };
  /* gameMuted: отдельный выключатель звука для игр */
  BOS.sfx = function (name, force) {
    if (!BOS.settings.sound && !force) return;
    var s = SFX[name]; if (!s) return;
    try { s.forEach(tone); } catch (e) {}
  };
  BOS.unlockAudio = function () { ac(); };
  document.addEventListener('pointerdown', function once() { ac(); document.removeEventListener('pointerdown', once); });

  /* ---------- Видео: источники только из assets/videos/manifest.js ---------- */
  BOS.V = function (w) { var m = window.KP_VIDEOS || {}; return (w && m[w.id]) || null; };
  BOS.poster = function (w, i) { var v = BOS.V(w); return (!i && v && v.poster) ? v.poster : 'assets/posters/' + w.posters[i || 0]; };
  BOS.previewSrc = function (w) { var v = BOS.V(w); if (!v || !v.preview) return null; return (BOS.mobile() && v.previewMobile) || v.preview; };
  BOS.play = function (v) { try { var p = v.play(); return p && p.then ? p.then(function () { return true; }, function () { return false; }) : Promise.resolve(true); } catch (e) { return Promise.resolve(false); } };
  BOS.byId = function (id) { return (window.BOS_WORKS || []).filter(function (w) { return w.id === id; })[0]; };

  BOS.copy = function (text) {
    function fb() { var t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); var ok = false; try { ok = document.execCommand('copy'); } catch (e) {} document.body.removeChild(t); return ok; }
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).then(function () { return true; }, fb);
    return Promise.resolve(fb());
  };
  BOS.applySettings();
})();
