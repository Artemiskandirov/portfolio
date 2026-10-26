/* Procedural Web Audio sounds for the cat and the light bulb.
   No audio files: every sound is synthesised on the fly.
   Exposes window.sfx; the AudioContext is created on the first user gesture. */
(function () {
  const STORE_KEY = 'sound';

  class Sound {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.muted = false;
      try { this.muted = localStorage.getItem(STORE_KEY) === 'off'; } catch (e) {}
    }

    init() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
    }
    resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
    get ready() { return !!this.ctx && !this.muted; }

    setMuted(m) {
      this.muted = m;
      try { localStorage.setItem(STORE_KEY, m ? 'off' : 'on'); } catch (e) {}
      if (m) { this.purrLoopStop(); this.stopCatScream(); }
    }

    _noise(dur) {
      const bs = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, bs, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bs; i++) d[i] = Math.random() * 2 - 1;
      const n = this.ctx.createBufferSource();
      n.buffer = buf;
      return n;
    }

    _tone(o) {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass'; filter.frequency.value = o.lp || 2400;
      osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(o.freq || 440, t);
      if (o.freq2) osc.frequency.exponentialRampToValueAtTime(o.freq2, t + (o.dur || 0.08));
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(o.vol || 0.07, t + (o.attack || 0.004));
      gain.gain.exponentialRampToValueAtTime(0.0001, t + (o.attack || 0.004) + (o.decay || 0.06));
      osc.connect(filter); filter.connect(gain); gain.connect(this.master);
      osc.start(t); osc.stop(t + (o.dur || 0.08) + 0.02);
    }

    /* ---------- cat vocals ---------- */
    _meow(o) {
      if (!this.ready) return;
      const t = this.ctx.currentTime, dur = o.dur;
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(o.f0, t);
      osc.frequency.exponentialRampToValueAtTime(o.fPeak, t + o.peakAt);
      osc.frequency.exponentialRampToValueAtTime(o.fEnd, t + dur);
      const vib = this.ctx.createOscillator(); vib.frequency.value = 6;
      const vibGain = this.ctx.createGain(); vibGain.gain.value = 14;
      vib.connect(vibGain); vibGain.connect(osc.frequency);
      const f1 = this.ctx.createBiquadFilter();
      f1.type = 'bandpass';
      f1.frequency.setValueAtTime(o.formantStart, t);
      f1.frequency.exponentialRampToValueAtTime(o.formantPeak, t + o.peakAt);
      f1.frequency.exponentialRampToValueAtTime(o.formantEnd, t + dur);
      f1.Q.value = o.q || 6;
      const f2 = this.ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 3500;
      const env = this.ctx.createGain();
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(o.vol || 0.08, t + 0.06);
      env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(f1); f1.connect(f2); f2.connect(env); env.connect(this.master);
      osc.start(t); vib.start(t);
      osc.stop(t + dur + 0.02); vib.stop(t + dur + 0.02);
    }
    meow1() { this._meow({ dur: 0.42, f0: 420, fPeak: 720, fEnd: 380, peakAt: 0.12, formantStart: 700, formantPeak: 1400, formantEnd: 600, vol: 0.11 }); }
    meow2() { this._meow({ dur: 0.22, f0: 600, fPeak: 880, fEnd: 700, peakAt: 0.08, formantStart: 900, formantPeak: 1600, formantEnd: 1000, vol: 0.09, q: 7 }); }
    meow3() { this._meow({ dur: 0.7, f0: 360, fPeak: 620, fEnd: 280, peakAt: 0.18, formantStart: 600, formantPeak: 1200, formantEnd: 480, vol: 0.11, q: 5 }); }
    meow4() { this._meow({ dur: 0.3, f0: 720, fPeak: 1100, fEnd: 760, peakAt: 0.1, formantStart: 1100, formantPeak: 1900, formantEnd: 1200, vol: 0.085, q: 8 }); }
    randomMeow() { [this.meow1, this.meow2, this.meow3, this.meow4][Math.floor(Math.random() * 4)].call(this); }

    /* sustained panicked meow while the cat is dragged around */
    startCatScream() {
      if (!this.ready || this._scream) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(700, t);
      const wander = this.ctx.createOscillator(); wander.frequency.value = 1.4;
      const wanderGain = this.ctx.createGain(); wanderGain.gain.value = 110;
      wander.connect(wanderGain); wanderGain.connect(osc.frequency);
      const vib = this.ctx.createOscillator(); vib.frequency.value = 12;
      const vibGain = this.ctx.createGain(); vibGain.gain.value = 32;
      vib.connect(vibGain); vibGain.connect(osc.frequency);
      const f1 = this.ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 1300; f1.Q.value = 5;
      const f2 = this.ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 3200;
      const env = this.ctx.createGain();
      env.gain.setValueAtTime(0.0001, t);
      env.gain.linearRampToValueAtTime(0.085, t + 0.08);
      const trem = this.ctx.createOscillator(); trem.frequency.value = 7.5;
      const tremGain = this.ctx.createGain(); tremGain.gain.value = 0.03;
      trem.connect(tremGain); tremGain.connect(env.gain);
      osc.connect(f1); f1.connect(f2); f2.connect(env); env.connect(this.master);
      osc.start(t); vib.start(t); wander.start(t); trem.start(t);
      this._scream = { osc, vib, wander, trem, env };
    }
    stopCatScream() {
      if (!this._scream || !this.ctx) return;
      const s = this._scream; this._scream = null;
      const t = this.ctx.currentTime;
      try {
        s.env.gain.cancelScheduledValues(t);
        s.env.gain.setValueAtTime(Math.max(0.0001, s.env.gain.value), t);
        s.env.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
        [s.osc, s.vib, s.wander, s.trem].forEach(n => { try { n.stop(t + 0.16); } catch (e) {} });
      } catch (e) {}
    }

    chirp() {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      for (let i = 0; i < 3; i++) {
        const tt = t + i * 0.07;
        const osc = this.ctx.createOscillator();
        osc.frequency.setValueAtTime(900 + i * 80, tt);
        osc.frequency.exponentialRampToValueAtTime(1500 + i * 80, tt + 0.06);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, tt);
        gain.gain.linearRampToValueAtTime(0.07, tt + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, tt + 0.08);
        osc.connect(gain); gain.connect(this.master);
        osc.start(tt); osc.stop(tt + 0.1);
      }
    }
    trill() {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      [880, 1100, 980, 1320, 1100, 1480].forEach((freq, i) => {
        const tt = t + i * 0.06;
        const o = this.ctx.createOscillator();
        o.frequency.setValueAtTime(freq, tt);
        o.frequency.exponentialRampToValueAtTime(freq * 1.3, tt + 0.04);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0, tt);
        g.gain.linearRampToValueAtTime(0.09, tt + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.06);
        o.connect(g); g.connect(this.master);
        o.start(tt); o.stop(tt + 0.08);
      });
    }
    hiss() {
      if (!this.ready) return;
      const t = this.ctx.currentTime, dur = 0.55;
      const n = this._noise(dur);
      const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3500; hp.Q.value = 2;
      const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass';
      bp.frequency.setValueAtTime(5500, t);
      bp.frequency.linearRampToValueAtTime(4500, t + dur);
      bp.Q.value = 3;
      const env = this.ctx.createGain();
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(0.14, t + 0.04);
      env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      n.connect(hp); hp.connect(bp); bp.connect(env); env.connect(this.master);
      n.start(t); n.stop(t + dur);
    }
    purr() {
      if (!this.ready) return;
      const t = this.ctx.currentTime, dur = 1.4;
      const n = this._noise(dur);
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220; lp.Q.value = 0.7;
      const lfo = this.ctx.createOscillator(); lfo.frequency.value = 26;
      const lfoG = this.ctx.createGain(); lfoG.gain.value = 0.5; lfo.connect(lfoG);
      const am = this.ctx.createGain(); am.gain.value = 0.5; lfoG.connect(am.gain);
      const env = this.ctx.createGain();
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(0.1, t + 0.18);
      env.gain.linearRampToValueAtTime(0.1, t + dur - 0.25);
      env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      n.connect(lp); lp.connect(am); am.connect(env); env.connect(this.master);
      n.start(t); lfo.start(t); n.stop(t + dur); lfo.stop(t + dur);
    }
    purrLoopStart() {
      if (!this.ready || this._purrLoop) return;
      const t = this.ctx.currentTime;
      const n = this._noise(4); n.loop = true;
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 240; lp.Q.value = 0.6;
      const lfoFast = this.ctx.createOscillator(); lfoFast.frequency.value = 25;
      const lfoFastG = this.ctx.createGain(); lfoFastG.gain.value = 0.55; lfoFast.connect(lfoFastG);
      const lfoSlow = this.ctx.createOscillator(); lfoSlow.frequency.value = 0.6;
      const lfoSlowG = this.ctx.createGain(); lfoSlowG.gain.value = 0.18; lfoSlow.connect(lfoSlowG);
      const am = this.ctx.createGain(); am.gain.value = 0.45;
      lfoFastG.connect(am.gain); lfoSlowG.connect(am.gain);
      const env = this.ctx.createGain();
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(0.13, t + 0.5);
      n.connect(lp); lp.connect(am); am.connect(env); env.connect(this.master);
      n.start(t); lfoFast.start(t); lfoSlow.start(t);
      this._purrLoop = { n, lfoFast, lfoSlow, env };
    }
    purrLoopStop() {
      if (!this._purrLoop || !this.ctx) return;
      const { n, lfoFast, lfoSlow, env } = this._purrLoop;
      const t = this.ctx.currentTime;
      env.gain.cancelScheduledValues(t);
      env.gain.setValueAtTime(env.gain.value, t);
      env.gain.linearRampToValueAtTime(0, t + 0.6);
      setTimeout(() => { try { n.stop(); lfoFast.stop(); lfoSlow.stop(); } catch (e) {} }, 700);
      this._purrLoop = null;
    }

    /* ---------- light bulb ---------- */
    /* mechanical pull-switch: short noise tick + low body thump */
    switchClick(on) {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      const n = this._noise(0.03);
      const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = on ? 3200 : 2400; bp.Q.value = 3;
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(0.32, t);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
      n.connect(bp); bp.connect(ng); ng.connect(this.master);
      n.start(t); n.stop(t + 0.035);
      this._tone({ freq: on ? 190 : 150, freq2: on ? 120 : 90, dur: 0.07, vol: 0.12, type: 'sine', decay: 0.07, lp: 900 });
    }
    /* faint tungsten "ping" when the filament lights up */
    filamentPing() {
      this._tone({ freq: 2200, freq2: 1800, dur: 0.25, vol: 0.018, type: 'sine', attack: 0.01, decay: 0.24, lp: 5000 });
    }
  }

  const sfx = new Sound();
  window.sfx = sfx;

  const unlock = () => { sfx.init(); sfx.resume(); };
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => window.addEventListener(ev, unlock, { capture: true, passive: true }));

  /* header mute toggle */
  function bindToggle() {
    const btn = document.getElementById('soundToggle');
    if (!btn) return;
    const sync = () => {
      btn.setAttribute('aria-pressed', String(!sfx.muted));
      btn.classList.toggle('is-muted', sfx.muted);
    };
    sync();
    btn.addEventListener('click', () => {
      sfx.setMuted(!sfx.muted);
      sync();
      if (!sfx.muted) { unlock(); sfx.chirp(); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindToggle);
  else bindToggle();
})();
