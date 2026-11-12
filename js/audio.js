/* BulanOS — аудиоменеджер мини-игр и оригинальная музыка.
   Вся музыка сочинена для сайта и синтезируется в браузере (WebAudio) — файлов нет, поэтому нет загрузки,
   задержек и щелчков на стыках, а слои подключаются в такт игре. Лицензия: собственная, своя для сайта.
   Одновременно играет только одна тема. Громкость музыки и эффектов — отдельно, хранится в настройках. */
(function () {
  var BOS = window.BOS = window.BOS || {};
  var A = BOS.audio = {};
  var ctx = null, musicBus = null, sfxBus = null, comp = null, noiseBuf = null, pulse = {}, cur = null, timer = 0;

  BOS.gameSound = BOS.gameSound || function () { var v = BOS.store('gamesound'); return v === null ? true : v; };
  function S() { return BOS.settings || {}; }
  function vMusic() { return BOS.gameSound() ? (S().music == null ? 0.7 : S().music) : 0; }
  function vFx() { return BOS.gameSound() ? (S().fx == null ? 0.8 : S().fx) : 0; }

  function ensure() {
    if (!ctx) {
      ctx = BOS.audioCtx ? BOS.audioCtx() : null; if (!ctx) return null;
      comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 8; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.18;
      musicBus = ctx.createGain(); musicBus.gain.value = vMusic() * 0.9; musicBus.connect(comp); comp.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.gain.value = vFx(); sfxBus.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      [0.125, 0.25].forEach(function (duty) {
        var n = 40, re = new Float32Array(n), im = new Float32Array(n);
        for (var k = 1; k < n; k++) { re[k] = 2 / (k * Math.PI) * Math.sin(2 * Math.PI * k * duty); im[k] = 2 / (k * Math.PI) * (1 - Math.cos(2 * Math.PI * k * duty)); }
        pulse[duty] = ctx.createPeriodicWave(re, im);
      });
    }
    if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
    return ctx;
  }
  A.ctx = function () { return ensure(); };
  A.apply = function () {
    if (!ctx) return; var t = ctx.currentTime;
    musicBus.gain.setTargetAtTime(vMusic() * 0.9, t, 0.05); sfxBus.gain.setTargetAtTime(vFx(), t, 0.05);
  };
  document.addEventListener('bos:settings', A.apply);
  /* Разблокировка звука на iOS/Android: только после действия пользователя */
  function unlock() {
    if (navigator.audioSession) { try { navigator.audioSession.type = 'playback'; } catch (e) {} }
    if (ctx && ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
  }
  ['pointerdown', 'touchend', 'click', 'keydown'].forEach(function (ev) { document.addEventListener(ev, unlock, true); });

  /* ---------------- инструменты ---------------- */
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function gainAt(dest, t, v) { var g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.connect(dest); return g; }
  function adsr(g, t, a, peak, dec, sus, rel, len) {
    var p = g.gain; p.setValueAtTime(0.0001, t); p.linearRampToValueAtTime(peak, t + a);
    if (sus != null) { p.setTargetAtTime(peak * sus, t + a, dec / 3); p.setValueAtTime(peak * sus, t + len); p.exponentialRampToValueAtTime(0.0001, t + len + rel); return t + len + rel; }
    p.exponentialRampToValueAtTime(0.0001, t + a + dec); return t + a + dec;
  }
  function noise(t, dur) { var s = ctx.createBufferSource(); s.buffer = noiseBuf; s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05); return s; }
  function osc(type, f, t, end) { var o = ctx.createOscillator(); if (pulse[type]) o.setPeriodicWave(pulse[type]); else o.type = type; o.frequency.setValueAtTime(f, t); o.start(t); o.stop(end + 0.05); return o; }
  function filt(type, f, q) { var b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q; return b; }

  var I = A.inst = {
    kick: function (d, t, v, o) {
      o = o || {}; var g = gainAt(d, t), o1 = osc('sine', o.f0 || 155, t, t + (o.dec || 0.34));
      o1.frequency.exponentialRampToValueAtTime(o.f1 || 46, t + (o.pd || 0.11)); o1.connect(g); adsr(g, t, 0.002, v, o.dec || 0.34);
      var c = noise(t, 0.012), hp = filt('highpass', 2500), gc = gainAt(d, t); c.connect(hp); hp.connect(gc); adsr(gc, t, 0.001, v * 0.35, 0.012);
    },
    snare: function (d, t, v, o) {
      o = o || {}; var n = noise(t, o.dec || 0.17), bp = filt('bandpass', o.bp || 1900, 0.7), hp = filt('highpass', 500), g = gainAt(d, t);
      n.connect(bp); bp.connect(hp); hp.connect(g); adsr(g, t, 0.001, v * 0.75, o.dec || 0.17);
      var tn = osc('triangle', o.tf || 190, t, t + 0.1), gt = gainAt(d, t); tn.frequency.exponentialRampToValueAtTime((o.tf || 190) * 0.65, t + 0.08); tn.connect(gt); adsr(gt, t, 0.001, v * 0.5, 0.09);
    },
    hat: function (d, t, v, open) {
      var n = noise(t, open ? 0.25 : 0.05), hp = filt('highpass', 7600), g = gainAt(d, t); n.connect(hp); hp.connect(g); adsr(g, t, 0.001, v * 0.32, open ? 0.22 : 0.035);
    },
    shaker: function (d, t, v) { var n = noise(t, 0.06), bp = filt('bandpass', 9000, 1.2), g = gainAt(d, t); n.connect(bp); bp.connect(g); adsr(g, t, 0.012, v * 0.3, 0.05); },
    clap: function (d, t, v) {
      var n = noise(t, 0.25), bp = filt('bandpass', 1250, 1.1), g = ctx.createGain(); n.connect(bp); bp.connect(g); g.connect(d);
      var p = g.gain; p.setValueAtTime(0.0001, t);
      [0, 0.011, 0.022].forEach(function (k) { p.setValueAtTime(v * 0.8, t + k); p.exponentialRampToValueAtTime(v * 0.15, t + k + 0.009); });
      p.setValueAtTime(v * 0.6, t + 0.033); p.exponentialRampToValueAtTime(0.0001, t + 0.2);
    },
    tom: function (d, t, v, f) { var g = gainAt(d, t), o1 = osc('sine', f * 1.6, t, t + 0.3); o1.frequency.exponentialRampToValueAtTime(f, t + 0.06); o1.connect(g); adsr(g, t, 0.002, v, 0.28); },
    crash: function (d, t, v) { var n = noise(t, 1.6), hp = filt('highpass', 4200), g = gainAt(d, t); n.connect(hp); hp.connect(g); adsr(g, t, 0.003, v * 0.35, 1.5); },
    riser: function (d, t, dur, v) { var n = noise(t, dur), bp = filt('bandpass', 400, 2.5), g = gainAt(d, t); bp.frequency.setValueAtTime(400, t); bp.frequency.exponentialRampToValueAtTime(7000, t + dur); n.connect(bp); bp.connect(g); g.gain.linearRampToValueAtTime(v, t + dur); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.04); },
    /* бас: wave, cut — частота фильтра, env — насколько фильтр открывается в атаке, reese — расстроенная пара пил, sub — синус октавой ниже */
    bass: function (d, t, m, len, v, o) {
      o = o || {}; var f = mtof(m), end = t + len + 0.08, lp = filt('lowpass', o.cut || 600, o.q || 6), g = gainAt(d, t);
      lp.frequency.setValueAtTime((o.cut || 600) * (o.env || 3), t); lp.frequency.exponentialRampToValueAtTime(o.cut || 600, t + (o.fd || 0.12));
      var o1 = osc(o.wave || 'sawtooth', f, t, end); o1.connect(lp);
      if (o.reese) { var o2 = osc('sawtooth', f, t, end); o2.detune.value = 18; o1.detune.value = -14; o2.connect(lp); }
      if (o.slide) { o1.frequency.setValueAtTime(f * Math.pow(2, o.slide / 12), t); o1.frequency.exponentialRampToValueAtTime(f, t + 0.06); }
      lp.connect(g); adsr(g, t, 0.004, v, 0.08, o.sus == null ? 0.8 : o.sus, 0.06, len);
      if (o.sub) { var s = osc('sine', f / 2, t, end), gs = gainAt(d, t); s.connect(gs); adsr(gs, t, 0.004, v * o.sub, 0.05, 0.9, 0.06, len); }
    },
    lead: function (d, t, m, len, v, o) {
      o = o || {}; var f = mtof(m), end = t + len + (o.rel || 0.12), g = gainAt(d, t), lp = filt('lowpass', o.cut || 3200, 1);
      var o1 = osc(o.wave || 'square', f, t, end);
      if (o.vib) { var l = osc('sine', 5.5, t, end), lg = ctx.createGain(); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * o.vib, t + Math.min(0.25, len)); l.connect(lg); lg.connect(o1.frequency); }
      if (o.glide) { o1.frequency.setValueAtTime(mtof(o.glide), t); o1.frequency.exponentialRampToValueAtTime(f, t + 0.05); }
      if (o.det) { var o2 = osc(o.wave || 'square', f, t, end); o2.detune.value = o.det; o2.connect(lp); }
      o1.connect(lp); lp.connect(g); adsr(g, t, o.att || 0.005, v, 0.1, o.sus == null ? 0.7 : o.sus, o.rel || 0.12, len);
      if (o.send) { var gs = gainAt(o.send, t); lp.connect(gs); adsr(gs, t, o.att || 0.005, v * 0.6, 0.1, 0.7, o.rel || 0.12, len); }
    },
    pad: function (d, t, ms, len, v, o) {
      o = o || {}; var g = gainAt(d, t), lp = filt('lowpass', o.cut || 1400, 0.5); lp.connect(g);
      ms.forEach(function (m) { [-9, 9].forEach(function (dt) { var x = osc(o.wave || 'sawtooth', mtof(m), t, t + len + 0.6); x.detune.value = dt; x.connect(lp); }); });
      adsr(g, t, o.att || 0.25, v / ms.length, 0.3, 0.85, 0.5, len);
    },
    stab: function (d, t, ms, len, v, o) {
      o = o || {}; var g = gainAt(d, t), bp = filt(o.ft || 'bandpass', o.cut || 1500, o.q || 1.2); bp.connect(g);
      ms.forEach(function (m) { var x = osc(o.wave || 'square', mtof(m), t, t + len + 0.1); x.connect(bp); });
      adsr(g, t, 0.003, v / Math.sqrt(ms.length), len, null);
      if (o.send) { var gs = gainAt(o.send, t); bp.connect(gs); adsr(gs, t, 0.003, v * 0.5 / Math.sqrt(ms.length), len, null); }
    },
    pluck: function (d, t, m, len, v, o) {
      o = o || {}; var g = gainAt(d, t), lp = filt('lowpass', 5000, 2), x = osc(o.wave || 'triangle', mtof(m), t, t + len + 0.2);
      lp.frequency.setValueAtTime(6000, t); lp.frequency.exponentialRampToValueAtTime(900, t + len); x.connect(lp); lp.connect(g); adsr(g, t, 0.002, v, len + 0.1, null);
      if (o.send) { var gs = gainAt(o.send, t); lp.connect(gs); adsr(gs, t, 0.002, v * 0.6, len + 0.1, null); }
    }
  };
  /* эхо, синхронное с темпом */
  function delaySend(dest, bpm, fb, mix) {
    var dl = ctx.createDelay(1.5), f = ctx.createGain(), lp = filt('lowpass', 2600), wet = ctx.createGain();
    dl.delayTime.value = 60 / bpm * 0.75; f.gain.value = fb; wet.gain.value = mix;
    dl.connect(lp); lp.connect(f); f.connect(dl); lp.connect(wet); wet.connect(dest);
    var inp = ctx.createGain(); inp.connect(dl); return inp;
  }
  /* шаблон ударных: x — сильно, o — средне, g — призрачная нота */
  function hits(pat, k) { var c = pat[k % pat.length]; return c === 'x' ? 1 : c === 'o' ? 0.65 : c === 'g' ? 0.3 : 0; }

  /* ---------------- плеер ---------------- */
  var SONGS = A.songs = {};
  function Player(id, owner) {
    var def = SONGS[id]; this.id = id; this.def = def; this.owner = owner; this.step = 0; this.bar = 0; this.params = {}; this.paused = false;
    this.out = ctx.createGain(); this.out.gain.value = 0.0001; this.out.connect(musicBus);
    this.bus = {}; var self = this;
    (def.buses || ['drums', 'bass', 'lead', 'pad', 'perc', 'fx']).forEach(function (b) { var g = ctx.createGain(); g.gain.value = (def.levels && def.levels[b] != null) ? def.levels[b] : 1; g.connect(self.out); self.bus[b] = g; });
    this.lvl = {}; this.send = delaySend(this.out, def.bpm, def.fb || 0.32, def.wet || 0.28);
    this.drumLP = filt('lowpass', 18000, 0.7); this.drumLP.connect(this.bus.drums); this.drumIn = this.drumLP;
    this.spb = 60 / def.bpm / 4; this.next = ctx.currentTime + 0.06;
    if (def.init) def.init(this);
  }
  Player.prototype.layer = function (name, v, tc) { var b = this.bus[name]; if (!b) return; if (this.lvl[name] === v) return; this.lvl[name] = v; b.gain.setTargetAtTime(v, ctx.currentTime, tc || 0.25); };
  Player.prototype.fade = function (to, tc) { var g = this.out.gain, t = ctx.currentTime; g.cancelScheduledValues(t); g.setValueAtTime(Math.max(0.0001, g.value), t); g.setTargetAtTime(Math.max(0.0001, to), t, tc); };
  function tick() {
    if (!cur || cur.paused || !ctx) return;
    var horizon = ctx.currentTime + 0.14;
    if (cur.next < ctx.currentTime - 0.25) cur.next = ctx.currentTime + 0.03;   /* вкладка была заморожена — не догоняем пропущенное */
    while (cur.next < horizon) {
      var k = cur.step % 16; if (k === 0 && cur.step > 0) cur.bar++;
      try { cur.def.step(cur, cur.next, k, cur.bar); } catch (e) { if (window.console) console.error(e); }
      cur.next += cur.spb * (cur.def.swing && k % 2 === 0 ? 1 + cur.def.swing : cur.def.swing && k % 2 ? 1 - cur.def.swing : 1); cur.step++;
    }
  }
  function startTimer() { if (!timer) timer = setInterval(tick, 25); }
  function stopTimer() { if (timer) { clearInterval(timer); timer = 0; } }

  A.play = function (id, owner, opt) {
    if (!SONGS[id] || !ensure()) return null;
    opt = opt || {};
    if (cur && cur.id === id && cur.owner === owner && !opt.restart) { if (cur.paused) A.resume(owner); return cur; }
    if (cur) A.stop(cur.owner, 'fade');
    cur = new Player(id, owner); cur.fade(1, 0.15); tick(); startTimer(); return cur;
  };
  A.current = function () { return cur; };
  A.pause = function (owner) { if (!cur || (owner && cur.owner !== owner) || cur.paused) return; cur.paused = true; cur.fade(0.0001, 0.04); };
  A.resume = function (owner) { if (!cur || (owner && cur.owner !== owner) || !cur.paused || !ensure()) return; cur.paused = false; cur.next = ctx.currentTime + 0.05; cur.fade(1, 0.08); tick(); startTimer(); };
  /* how: 'fade' — плавно, 'cut' — резкий стоп (хлопушка) */
  A.stop = function (owner, how) {
    if (!cur || (owner && cur.owner !== owner)) return;
    var p = cur; cur = null; stopTimer();
    var tc = how === 'cut' ? 0.012 : how === 'slow' ? 0.5 : 0.18; p.fade(0.0001, tc);
    setTimeout(function () { try { p.out.disconnect(); } catch (e) {} }, tc * 8000 + 200);
  };
  A.set = function (k, v, owner) { if (cur && (!owner || cur.owner === owner)) cur.params[k] = v; };
  A.get = function (k) { return cur ? cur.params[k] : undefined; };
  /* стингер — музыкальный акцент в долю: квантуется к ближайшей шестнадцатой */
  A.sting = function (name, owner) {
    if (!ensure() || !vMusic()) return;
    var p = cur && !cur.paused && (!owner || cur.owner === owner) ? cur : null;
    var t = p ? Math.max(ctx.currentTime + 0.01, p.next - (p.next - ctx.currentTime > p.spb ? p.spb : 0)) : ctx.currentTime + 0.01;
    var fn = STINGS[name]; if (!fn) return;
    var dest = p ? p.bus.fx : musicBus; fn(dest, t, p);
  };
  /* игровые звуковые эффекты: громкость «эффектов», общий выключатель игр */
  A.sfx = function (name) {
    if (!BOS.gameSound() || !ensure()) return;
    if (FX[name]) { FX[name](sfxBus, ctx.currentTime + 0.005); return; }
    BOS.sfxTo && BOS.sfxTo(name, sfxBus, 1);
  };
  /* остановить музыку, если вкладка ушла в фон (игры сами ставятся на паузу) */
  document.addEventListener('visibilitychange', function () { if (document.hidden && cur) A.pause(); });

  /* ---------------- стингеры и эффекты ---------------- */
  var STINGS = {
    catch: function (d, t, p) { var root = p && p.params.root || 64; [0, 7, 12].forEach(function (s, i) { I.pluck(d, t + i * 0.055, root + 12 + s, 0.16, 0.22, { wave: 'square' }); }); },
    pad: function (d, t, p) { var r = p && p.params.root || 65; [0, 3, 7, 12, 15].forEach(function (s, i) { I.pluck(d, t + i * 0.035, r + 12 + s, 0.12, 0.2, { wave: 'sawtooth' }); }); I.riser(d, t, 0.25, 0.25); },
    level: function (d, t, p) { var r = p && p.params.root || 64; [0, 4, 7, 12].forEach(function (s, i) { I.lead(d, t + i * 0.09, r + 12 + s, 0.16, 0.16, { wave: 0.25 }); }); I.crash(d, t + 0.36, 0.8); },
    fall: function (d, t) {
      /* комичный «ва-ва-ва-ваа» тромбоном */
      [[67, 0.32], [66, 0.32], [65, 0.32], [64, 1.0]].reduce(function (tt, n) { I.lead(d, tt, n[0] - 12, n[1] - 0.04, 0.3, { wave: 'sawtooth', cut: 900, vib: n[1] > 0.5 ? 0.025 : 0.008, att: 0.02, rel: 0.1 }); return tt + n[1]; }, t);
    },
    fanfare: function (d, t) {
      var ch = [[60, 64, 67], [60, 64, 67], [65, 69, 72], [67, 71, 74], [72, 76, 79]], dur = [0.18, 0.18, 0.36, 0.36, 1.6], tt = t;
      ch.forEach(function (c, i) { I.stab(d, tt, c, dur[i], 0.55, { wave: 'sawtooth', ft: 'lowpass', cut: 2600, q: 0.8 }); I.lead(d, tt, c[2] + 12, dur[i], 0.14, { wave: 'square', vib: 0.01 }); tt += dur[i] + 0.02; });
      I.kick(d, t, 0.9); I.crash(d, t + 0.78, 1); I.tom(d, t + 0.4, 0.6, 110); I.tom(d, t + 0.58, 0.6, 90);
    },
    egg: function (d, t) {
      var seq = [[64, 0.25], [67, 0.25], [71, 0.25], [76, 0.5], [74, 0.25], [76, 0.25], [79, 1.2], [83, 2.2]], tt = t;
      seq.forEach(function (n) { I.lead(d, tt, n[0], n[1], 0.2, { wave: 'sawtooth', cut: 3000, vib: 0.012, det: 7 }); tt += n[1]; });
      I.pad(d, t, [52, 59, 64, 67, 71], 5.5, 0.5, { att: 0.6, cut: 2200 }); I.crash(d, t + 1.5, 0.9); I.riser(d, t, 1.5, 0.3);
    }
  };
  var FX = {
    clapper: function (d, t) { var n = noise(t, 0.03), hp = filt('highpass', 1800), g = gainAt(d, t); n.connect(hp); hp.connect(g); adsr(g, t, 0.001, 0.9, 0.03); var o = osc('square', 1400, t, t + 0.04), g2 = gainAt(d, t); o.connect(g2); adsr(g2, t, 0.001, 0.15, 0.03); },
    camstop: function (d, t) { var o = osc('sine', 1760, t, t + 0.5), g = gainAt(d, t); o.connect(g); adsr(g, t, 0.003, 0.18, 0.08, 0.8, 0.05, 0.1); var o2 = osc('sine', 1320, t + 0.16, t + 0.5), g2 = gainAt(d, t + 0.16); o2.connect(g2); adsr(g2, t + 0.16, 0.003, 0.18, 0.08, 0.8, 0.05, 0.22); },
    applause: function (d, t) {
      var n = noise(t, 3.4), bp = filt('bandpass', 2400, 0.4), g = gainAt(d, t); n.connect(bp); bp.connect(g); g.gain.linearRampToValueAtTime(0.22, t + 0.4); g.gain.setValueAtTime(0.22, t + 2.6); g.gain.linearRampToValueAtTime(0.0001, t + 3.4);
      for (var i = 0; i < 26; i++) I.clap(d, t + Math.random() * 3, 0.18 + Math.random() * 0.15);
    },
    boost: function (d, t) { I.riser(d, t, 0.22, 0.35); var o = osc('square', 440, t, t + 0.2), g = gainAt(d, t); o.frequency.exponentialRampToValueAtTime(1320, t + 0.18); o.connect(g); adsr(g, t, 0.003, 0.12, 0.18); },
    stumble: function (d, t) { I.tom(d, t, 0.7, 70); var n = noise(t, 0.15), lp = filt('lowpass', 800), g = gainAt(d, t); n.connect(lp); lp.connect(g); adsr(g, t, 0.002, 0.5, 0.14); },
    whoosh: function (d, t) { var n = noise(t, 0.35), bp = filt('bandpass', 600, 1.5), g = gainAt(d, t); bp.frequency.exponentialRampToValueAtTime(3000, t + 0.3); n.connect(bp); bp.connect(g); g.gain.linearRampToValueAtTime(0.3, t + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34); },
    grow: function (d, t) { var o = osc('sawtooth', 55, t, t + 4.4), lp = filt('lowpass', 300, 4), g = gainAt(d, t); o.frequency.exponentialRampToValueAtTime(30, t + 4.2); lp.frequency.exponentialRampToValueAtTime(1600, t + 4); o.connect(lp); lp.connect(g); g.gain.linearRampToValueAtTime(0.3, t + 1); g.gain.linearRampToValueAtTime(0.0001, t + 4.3); I.riser(d, t, 4, 0.2); }
  };
  A.fx = FX;

  /* Офлайн-рендер темы (для проверки уровня, клиппинга и для демо-файлов): A.render('escape', 30, {stage: 2}) → Promise<AudioBuffer> */
  A.render = function (id, sec, params, at) {
    var OC = window.OfflineAudioContext || window.webkitOfflineAudioContext; if (!OC) return Promise.reject('no offline');
    var save = { ctx: ctx, musicBus: musicBus, sfxBus: sfxBus, comp: comp, noiseBuf: noiseBuf, pulse: pulse, cur: cur };
    var oc = new OC(2, 44100 * sec, 44100);
    ctx = oc; comp = oc.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 8; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.18;
    musicBus = oc.createGain(); musicBus.gain.value = 0.63; musicBus.connect(comp); comp.connect(oc.destination); sfxBus = musicBus;
    noiseBuf = oc.createBuffer(1, 88200, 44100); var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    pulse = {}; [0.125, 0.25].forEach(function (duty) { var n = 40, re = new Float32Array(n), im = new Float32Array(n); for (var k = 1; k < n; k++) { re[k] = 2 / (k * Math.PI) * Math.sin(2 * Math.PI * k * duty); im[k] = 2 / (k * Math.PI) * (1 - Math.cos(2 * Math.PI * k * duty)); } pulse[duty] = oc.createPeriodicWave(re, im); });
    var p = new Player(id, 'render'); p.out.gain.value = 1; Object.keys(params || {}).forEach(function (k) { p.params[k] = params[k]; });
    (at || []).forEach(function (a) { a.done = false; });
    while (p.next < sec - 0.2) {
      (at || []).forEach(function (a) { if (!a.done && p.next >= a.t) { a.done = true; if (a.sting) STINGS[a.sting](p.bus.fx, p.next, p); else p.params[a.k] = a.v; } });
      var k = p.step % 16; if (k === 0 && p.step > 0) p.bar++; p.def.step(p, p.next, k, p.bar); p.next += p.spb * (p.def.swing ? (k % 2 === 0 ? 1 + p.def.swing : 1 - p.def.swing) : 1); p.step++;
    }
    ctx = save.ctx; musicBus = save.musicBus; sfxBus = save.sfxBus; comp = save.comp; noiseBuf = save.noiseBuf; pulse = save.pulse; cur = save.cur;
    return oc.startRendering();
  };

  /* ================= МУЗЫКА ================= */

  /* 1. БУЛАНОЗАВР — «Pixel Breaks»: 8-bit chiptune + breakbeat, 140 BPM, ля минор.
        Интенсивность 0–3 растёт со счётом: брейк + бас → арпеджио → мелодия → двойные хэты и октава. */
  var DINO_CH = [[45, [57, 60, 64]], [41, [53, 57, 60]], [48, [55, 60, 64]], [43, [55, 59, 62]], [45, [57, 60, 64]], [41, [53, 57, 60]], [43, [55, 59, 62]], [40, [56, 59, 64]]];
  var DINO_MEL = [
    [[0, 76, 2], [2, 74, 2], [4, 72, 2], [6, 74, 2], [8, 76, 4], [12, 79, 2], [14, 76, 2]],
    [[0, 77, 3], [3, 76, 1], [4, 74, 2], [6, 72, 2], [8, 69, 6], [14, 72, 2]],
    [[0, 72, 2], [2, 74, 2], [4, 76, 2], [6, 79, 2], [8, 84, 4], [12, 79, 4]],
    [[0, 79, 2], [2, 77, 2], [4, 76, 2], [6, 74, 2], [8, 71, 6], [14, 74, 2]],
    [[0, 76, 2], [2, 76, 1], [3, 76, 1], [4, 81, 4], [8, 79, 2], [10, 77, 2], [12, 76, 4]],
    [[0, 77, 2], [2, 76, 2], [4, 74, 4], [8, 72, 2], [10, 74, 2], [12, 77, 4]],
    [[0, 79, 4], [4, 77, 2], [6, 76, 2], [8, 74, 2], [10, 76, 2], [12, 79, 4]],
    [[0, 80, 4], [4, 76, 4], [8, 71, 4], [12, 68, 4]]
  ];
  SONGS.dino = {
    bpm: 140, levels: { drums: 0.95, bass: 0.8, lead: 0.55, pad: 0.5, perc: 0.6, fx: 0.9 },
    step: function (p, t, k, bar) {
      var i = p.params.i || 0, intro = bar < 2, b8 = bar % 8, ch = DINO_CH[b8], fill = b8 === 7 && k >= 12;
      var K = (bar % 2) ? 'x.....x...x...o.' : 'x.....x.x.......', Sn = '....x..g.g..x..g', H = i >= 2 ? 'xoxoxoxoxoxoxoxo' : 'x.o.x.o.x.o.x.o.';
      var dk = p.drumIn;
      if (!intro || k % 4 === 0) { var kv = hits(K, k); if (kv) I.kick(dk, t, 0.95 * kv, { f0: 170, f1: 50 }); }
      if (!intro) { var sv = fill ? (k % 2 ? 0 : 0.5 + (k - 12) * 0.12) : hits(Sn, k); if (sv) I.snare(dk, t, 0.7 * sv, { bp: 2100 }); }
      var hv = hits(H, k); if (hv) I.hat(dk, t, hv * 0.8, k === 14 && bar % 2);
      if (bar >= 1) {
        var BL = [0, 12, 0, 0, 12, 0, 7, 0, 0, 12, 0, 0, 12, 0, 10, 12];
        if (k % 2 === 0 || i >= 1) { if ([0, 3, 4, 6, 8, 10, 11, 14].indexOf(k) >= 0) I.bass(p.bus.bass, t, ch[0] + BL[k], p.spb * 1.6, 0.42, { wave: 'triangle', cut: 2400, env: 1.5, sus: 0.9 }); }
        if ([0, 8].indexOf(k) >= 0) I.bass(p.bus.bass, t, ch[0] - 12 + 12, p.spb * 1.2, 0.12, { wave: 0.25, cut: 1200, env: 2 });
      }
      if (i >= 1 && !intro) { var arp = ch[1], n = arp[k % 3] + (k % 6 >= 3 ? 12 : 0); I.lead(p.bus.pad, t, n + 12, p.spb * 0.8, 0.09, { wave: 0.125, cut: 5000, rel: 0.03, send: p.send }); }
      if (i >= 2 && !intro) DINO_MEL[b8].forEach(function (nt) { if (nt[0] === k) I.lead(p.bus.lead, t, nt[1] + (i >= 3 && bar % 16 >= 8 ? 12 : 0), nt[2] * p.spb * 0.92, 0.2, { wave: 0.25, vib: 0.006, cut: 4500, send: p.send }); });
      if (i >= 3 && !intro && k % 4 === 2) I.snare(p.bus.perc, t, 0.18, { bp: 3500, dec: 0.06 });
      if (k === 0 && b8 === 0 && bar >= 8) I.crash(p.bus.perc, t, 0.6);
      if (bar === 1 && k === 0) I.riser(p.bus.fx, t, p.spb * 16, 0.18);
    }
  };

  /* 2. КИРИЛЛ НА ТУРНИКЕ — «Подъём»: funky electronic / arcade house, 122 BPM, ми дорийский.
        Аранжировка меняется с высотой: земля — фанк; город — электроника; горы — широкие пэды и томы;
        космос — атмосфера с битом; Солнце — кульминация. Переключение — на границе такта. */
  var TK_CH = [[40, [52, 55, 59, 62]], [40, [52, 55, 59, 62]], [45, [55, 57, 61, 64]], [45, [55, 57, 61, 64]], [36, [52, 55, 59, 60]], [38, [54, 57, 60, 62]], [40, [52, 55, 59, 62]], [47, [51, 54, 57, 59]]];
  var TK_BASS = [[0, 0, 2], [3, 12, 1], [4, 0, 1], [6, 10, 1], [7, 12, 1], [10, 0, 2], [12, 7, 1], [14, 10, 1], [15, 12, 1]];
  var TK_HOOK = [[[0, 76, 3], [3, 79, 1], [4, 76, 2], [8, 74, 2], [10, 71, 2], [12, 74, 4]], [[0, 76, 2], [4, 79, 2], [6, 81, 2], [8, 79, 6]], [[0, 73, 3], [3, 76, 1], [4, 79, 2], [8, 81, 2], [10, 79, 2], [12, 76, 4]], [[0, 76, 8], [8, 73, 4], [12, 71, 4]],
    [[0, 72, 3], [3, 76, 1], [4, 79, 2], [8, 83, 4], [12, 79, 4]], [[0, 74, 3], [3, 78, 1], [4, 81, 2], [8, 79, 4], [12, 78, 4]], [[0, 79, 2], [2, 76, 2], [4, 74, 2], [6, 76, 2], [8, 79, 4], [12, 83, 4]], [[0, 78, 4], [4, 75, 4], [8, 71, 8]]];
  SONGS.turnik = {
    bpm: 122, swing: 0.08, levels: { drums: 0.95, bass: 0.85, lead: 0.5, pad: 0.55, perc: 0.6, fx: 0.9 }, wet: 0.32,
    init: function (p) { p.params.stage = p.params.stage || 0; p.params.root = 64; },
    step: function (p, t, k, bar) {
      if (k === 0) p.sec = p.params.stage | 0;
      var st = p.sec || 0, b8 = bar % 8, ch = TK_CH[b8], dk = p.drumIn, intro = bar < 1;
      var space = st >= 5 && st <= 8, sun = st >= 9, city = st >= 1 && st <= 2, mount = st >= 3 && st <= 4;
      p.params.root = ch[1][0] + 12;
      /* ударные */
      var four = !space || st >= 7;
      if (four ? k % 4 === 0 : (k === 0 || k === 8)) I.kick(dk, t, (mount || sun) ? 1 : 0.85, { f0: 140, f1: 45, dec: mount || sun ? 0.42 : 0.3 });
      if (!intro && (k === 4 || k === 12) && (!space || st >= 7)) I.clap(dk, t, 0.55);
      if (space && st < 7 && k === 12) I.snare(dk, t, 0.25, { bp: 3000, dec: 0.25 });
      if (k % 4 === 2) I.hat(dk, t, space ? 0.4 : 0.85, !space && (st >= 2 || sun));
      if ((city || mount || sun) && k % 2 === 1) I.hat(dk, t, 0.32);
      if (st === 0 && k % 4 === 3 && bar % 2) I.shaker(p.bus.perc, t, 0.5);
      if ((mount || sun) && b8 === 7 && k >= 8 && k % 2 === 0) I.tom(p.bus.perc, t, 0.55, [140, 120, 100, 80][(k - 8) / 2]);
      if ((mount || sun) && k === 0 && b8 % (sun ? 4 : 8) === 0) I.crash(p.bus.perc, t, 0.6);
      /* бас */
      if (!intro) {
        if (space) { if (k === 0) I.bass(p.bus.bass, t, ch[0], p.spb * 15, 0.45, { wave: 'sine', cut: 900, env: 1, sus: 0.85 }); if (k === 10) I.bass(p.bus.bass, t, ch[0] + 7, p.spb * 5, 0.25, { wave: 'triangle', cut: 800, env: 1 }); }
        else TK_BASS.forEach(function (n) { if (n[0] === k) I.bass(p.bus.bass, t, ch[0] + n[1], n[2] * p.spb * 0.9, 0.48, { wave: city || sun ? 'sawtooth' : 'square', cut: st === 0 ? 420 : 560, env: 4, fd: 0.09, sub: 0.6, slide: n[1] === 12 && k % 4 === 3 ? -2 : 0 }); });
      }
      /* фанковые аккорды (клавинет) */
      if (!space && !intro && [2, 7, 10, 14].indexOf(k) >= 0 && (st <= 2 || sun)) I.stab(p.bus.pad, t, ch[1], p.spb * 0.7, 0.32, { wave: 0.25, cut: 1700, q: 1.6, send: st === 0 ? null : p.send });
      /* широкие пэды: горы, космос, Солнце */
      if ((mount || space || sun) && k === 0) I.pad(p.bus.pad, t, ch[1].map(function (m) { return m + (space ? 12 : 0); }), p.spb * 15.5, space ? 0.5 : 0.36, { att: space ? 0.6 : 0.2, cut: space ? 1800 : 1300 });
      /* арпеджио в космосе */
      if ((space || sun) && k % 2 === 0) { var arp = ch[1], n = arp[(k / 2) % 4] + 24; I.pluck(p.bus.lead, t, n, p.spb * 1.5, sun ? 0.1 : 0.13, { wave: 'triangle', send: p.send }); }
      /* хук: город, горы, Солнце */
      if ((city || mount || sun) && !intro && (bar % 16 >= 8 || st >= 2)) TK_HOOK[b8].forEach(function (nt) { if (nt[0] === k) I.lead(p.bus.lead, t, nt[1] + (sun ? 12 : 0), nt[2] * p.spb * 0.9, mount ? 0.15 : 0.17, { wave: mount ? 'sawtooth' : 0.25, cut: mount ? 2200 : 3800, vib: 0.008, det: mount || sun ? 8 : 0, send: p.send }); });
      if (sun && k === 0 && b8 === 6) I.riser(p.bus.fx, t, p.spb * 32, 0.2);
    }
  };

  /* 3. ПОБЕГ ОТ ОПЕРАТОРА — «Погоня»: drum & bass / breakbeat, 172 BPM, фа минор.
        Этапы добавляют слои (студия — стабы, город — риф, аэропорт — брейки, Голливуд — арпеджио, красная дорожка — всё);
        tension (0–1) при близком операторе — шестнадцатые, саб-пульс и сирена; boost — короткий ритмический слой после ускорения.
        Темп трека не меняется вместе со скоростью игры. */
  var ES_CH = [[41, [53, 56, 60]], [41, [53, 56, 60]], [37, [49, 53, 56]], [37, [49, 53, 56]], [44, [56, 60, 63]], [44, [56, 60, 63]], [39, [51, 55, 58]], [36, [52, 55, 60]]];
  var ES_RIFF = [[0, 77, 2], [3, 80, 1], [4, 77, 1], [6, 84, 2], [8, 82, 3], [11, 80, 1], [12, 77, 2], [14, 75, 2]];
  var ES_RIFF2 = [[0, 77, 2], [3, 80, 1], [4, 82, 2], [6, 84, 2], [8, 85, 4], [12, 84, 2], [14, 80, 2]];
  SONGS.escape = {
    bpm: 172, levels: { drums: 1, bass: 0.9, lead: 0.45, pad: 0.45, perc: 0.55, fx: 0.9, tension: 0.0001, boost: 0.0001 },
    buses: ['drums', 'bass', 'lead', 'pad', 'perc', 'fx', 'tension', 'boost'], wet: 0.22, fb: 0.3,
    init: function (p) { p.params.stage = 0; p.params.root = 65; p.drumLP.frequency.setValueAtTime(500, ctx.currentTime); p.drumLP.frequency.setTargetAtTime(18000, ctx.currentTime + p.spb * 28, 0.25); },
    step: function (p, t, k, bar) {
      if (k === 0) p.sec = p.params.stage | 0;
      var st = p.sec || 0, b8 = bar % 8, ch = ES_CH[b8], dk = p.drumIn, intro = bar < 2;
      p.params.root = ch[1][0] + 12;
      /* слои в реальном времени */
      var ten = Math.max(0, Math.min(1, p.params.tension || 0)); p.layer('tension', 0.0001 + ten * 0.9, 0.3);
      var bo = (p.params.boostUntil || 0) > t ? 1 : 0; p.layer('boost', 0.0001 + bo * 0.7, 0.08);
      /* брейк DnB: бочка 1 и «и» третьей доли, малый на 2 и 4, призрачные ноты */
      var K = b8 % 2 ? 'x.........x..o..' : 'x.........x.....', Sn = '....x..g.g..x..g';
      var kv = hits(K, k); if (kv) I.kick(dk, t, kv, { f0: 190, f1: 48, dec: 0.28 });
      if (!intro || k === 4 || k === 12) { var sv = hits(Sn, k); if (b8 === 7 && k >= 12) sv = 0.45 + (k - 12) * 0.15; if (sv) I.snare(dk, t, 0.8 * sv, { bp: 2300, dec: 0.15, tf: 210 }); }
      if (k % 2 === 0) I.hat(dk, t, k % 4 === 2 ? 0.75 : 0.45, k === 6 && b8 % 2);
      if (!intro && k === 0 && (b8 === 0 || (st >= 5 && b8 % 4 === 0))) I.crash(p.bus.perc, t, 0.55);
      /* брейкбит-слой (аэропорт и дальше) */
      if (st >= 3 && !intro) { var B = 'g..g..g...g.g..g'; var bv = hits(B, k); if (bv) I.snare(p.bus.perc, t, 0.5 * bv, { bp: 3200, dec: 0.08 }); if (k === 7 || k === 13) I.kick(p.bus.perc, t, 0.35, { f0: 120, f1: 60, dec: 0.15 }); }
      /* reese-бас */
      if (bar >= 1) {
        if (k === 0) I.bass(p.bus.bass, t, ch[0], p.spb * 5.5, 0.5, { reese: true, cut: 520 + st * 50, env: 2.2, fd: 0.2, sub: 0.75, sus: 0.85 });
        if (k === 6) I.bass(p.bus.bass, t, ch[0], p.spb * 3.5, 0.42, { reese: true, cut: 600 + st * 50, env: 2, sub: 0.7 });
        if (k === 10) I.bass(p.bus.bass, t, ch[0] + (b8 % 2 ? 12 : 7), p.spb * 1.8, 0.38, { reese: true, cut: 900, env: 2, sub: 0.5 });
        if (k === 13) I.bass(p.bus.bass, t, ch[0] + (b8 % 2 ? 10 : 12), p.spb * 2.5, 0.38, { reese: true, cut: 800, env: 2, sub: 0.6, slide: 2 });
      }
      /* студия: стабы */
      if (st >= 1 && !intro && (k === 3 || k === 11)) I.stab(p.bus.pad, t, ch[1].map(function (m) { return m + 12; }), p.spb * 1.2, 0.3, { wave: 'sawtooth', ft: 'lowpass', cut: 2400, q: 2, send: p.send });
      if (st === 0 && !intro && k === 0 && b8 % 2 === 0) I.pad(p.bus.pad, t, ch[1], p.spb * 30, 0.28, { cut: 900, att: 0.5 });
      /* город: риф */
      if (st >= 2 && !intro) (b8 >= 4 ? ES_RIFF2 : ES_RIFF).forEach(function (n) { if (n[0] === k) I.lead(p.bus.lead, t, n[1] - (b8 % 4 >= 2 ? 4 : 0) + (st >= 5 ? 12 : 0), n[2] * p.spb * 0.85, 0.15, { wave: 'sawtooth', cut: 2600, det: 10, send: p.send }); });
      /* Голливуд: арпеджио */
      if (st >= 4 && !intro) { var a = ch[1]; I.pluck(p.bus.pad, t, a[k % 3] + 24 + (k % 6 >= 3 ? 12 : 0), p.spb * 0.8, 0.08, { wave: 'square', send: p.send }); }
      /* напряжение: оператор рядом */
      if (ten > 0.05) { I.hat(p.bus.tension, t, 0.5, false); if (k % 2 === 0) I.bass(p.bus.tension, t, 29, p.spb * 0.8, 0.35, { wave: 'sine', cut: 300, env: 1 }); if (ten > 0.6 && k % 4 === 0) I.lead(p.bus.tension, t, (k % 8 ? 88 : 89), p.spb * 3.6, 0.07, { wave: 'square', cut: 2500 }); }
      /* ускорение: шейкер и райд */
      if (bo) { I.shaker(p.bus.boost, t, 0.9); if (k % 4 === 2) I.hat(p.bus.boost, t, 0.7, true); }
      if (bar === 1 && k === 0) I.riser(p.bus.fx, t, p.spb * 16, 0.22);
    }
  };
})();
