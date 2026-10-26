/* Sleeping pixel cat in the bottom-right corner.
   Sprite engine (6 frames × 21 states), mood/hunger with shrimp,
   reactions to hover, clicks, double-clicks, long press and drag.
   Feeding: every click on a contact link gives the cat a shrimp.
   Purely decorative — the page works the same without it. */
(function () {
  const SCRIPT = document.currentScript;
  const ASSET = (p) => new URL(p, SCRIPT.src).href;
  const SHEET_URL = ASSET('../img/cat/cat-sheet.png');
  const SHRIMP_URL = ASSET('../img/cat/shrimp.png');

  const LANG = (document.documentElement.lang || 'en').slice(0, 2) === 'ru' ? 'ru' : 'en';
  const sfx = () => window.sfx || {};
  const play = (name) => { const s = sfx(); if (s[name]) s[name](); };

  /* ---------- copy ---------- */
  const TEXT = {
    en: {
      bubbles: {
        awake: ['hi.', 'mrr?', 'oh hello', 'pet me', 'meow.', '...?'],
        purring: ['purr...', 'mmmm', 'happy cat', "don't stop"],
        annoyed: ['enough.', 'go away', 'hmph', 'rude.'],
        playful: ['play with me!', 'bouncy', 'yay!', 'weeee'],
        hungry: ['feed me 🦐', 'hungry...', 'shrimp?'],
        praise: ['hire Artem!', 'he ships outcomes', 'systems thinker 🧠', 'ARPU +5%, btw', 'design systems pro',
          '7+ yrs in product', 'won an AI hackathon', 'loves hard products', 'write to Artem! 🐾', 'great with details']
      },
      scream: ['AAAA', 'MROWW!', 'put me DOWN', 'EEEEK', 'nooo', 'HELP', 'wheeee', 'aaaH', 'unhand me', 'MEOWW'],
      invite: [
        'Artem is a strong product designer — systems thinking and an eye for detail. Reach out!',
        'Ships measurable outcomes (ARPU +5%, conversion +7%). Message Artem!',
        '7+ years in product: EdTech, retail AI, fintech, medtech. Loves hard problems.',
        'Design systems, gamification, sound UX — plus an AI-hackathon win. Hire him!',
        'Builds his own AI tools for designers (a Figma linter plugin). Reach out to Artem!',
        'Turns complex products into real results. Up for a chat?'
      ],
      contacts: 'Contacts',
      feedHint: 'Feed the cat: click any contact link',
      close: 'Close'
    },
    ru: {
      bubbles: {
        awake: ['привет.', 'мрр?', 'о, привет', 'погладь', 'мяу.', '...?'],
        purring: ['мрррр...', 'ммм', 'довольный кот', 'не останавливайся'],
        annoyed: ['хватит.', 'уйди', 'хмф', 'грубо.'],
        playful: ['поиграй со мной!', 'прыг', 'ура!', 'вииии'],
        hungry: ['покорми 🦐', 'голодный...', 'креветку?'],
        praise: ['наймите Артёма!', 'делает результат', 'системно мыслит 🧠', 'ARPU +5%, кстати', 'спец по дизайн-системам',
          '7+ лет в продукте', 'взял 1-е на AI-хакатоне', 'любит сложные продукты', 'напишите Артёму! 🐾', 'внимателен к деталям']
      },
      scream: ['АААА', 'МРЯУ!', 'отпусти', 'ИИИИ', 'неет', 'ПОМОГИТЕ', 'вииии', 'аааА', 'поставь меня', 'МЯЯЯУ'],
      invite: [
        'Артём — сильный продуктовый дизайнер: системное мышление и забота о деталях. Напишите ему!',
        'Делает продукты с измеримым результатом (ARPU +5%, конверсия +7%). Напишите Артёму!',
        '7+ лет в продукте: EdTech, ритейл-AI, финтех, медтех. Берёт сложные задачи.',
        'Дизайн-системы, геймификация, звуковой UX — и победа на AI-хакатоне. Зовите в команду!',
        'Любит сложные продукты и доводит до результата. Обсудим сотрудничество?',
        'Сам пилит ИИ-инструменты для дизайнеров (плагин-линтер для Figma). Напишите Артёму!'
      ],
      contacts: 'Контакты',
      feedHint: 'Покорми кота: нажми на любой контакт',
      close: 'Закрыть'
    }
  }[LANG];
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  /* ---------- DOM ---------- */
  const bed = document.createElement('div');
  bed.className = 'cat';
  bed.id = 'cat';
  bed.setAttribute('aria-hidden', 'true');
  bed.innerHTML = '<div class="cat-hit" id="catHit"><div class="cat-sprite"></div></div><div class="cat-shadow"></div>';
  document.body.appendChild(bed);
  const hit = bed.querySelector('.cat-hit');
  const surface = bed.querySelector('.cat-sprite');

  /* ---------- sprite engine ---------- */
  const COLS = 6, FRAMES = 6, CELL_W = 129, CELL_H = 150, ROWS = 21;
  const ROW = {
    sleep: 0, idle: 1, lie: 2, groom: 3, happy: 4, hungry: 5, eat: 6, sad: 7, startled: 8,
    annoyed: 9, jump: 10, grabbed: 11, play: 12, stretch: 13, yawn: 14, wave: 15, love: 16,
    full: 17, trick: 18, walk: 19, dizzy: 20
  };
  const CFG = {
    sleep: { fps: 4, loop: true }, idle: { fps: 6, loop: true }, lie: { fps: 4, loop: true }, groom: { fps: 7, loop: true },
    happy: { fps: 7, loop: true }, hungry: { fps: 6, loop: true }, eat: { fps: 8, loop: true }, sad: { fps: 4, loop: true },
    startled: { fps: 11, loop: false, then: 'idle' }, annoyed: { fps: 8, loop: false, then: 'idle' },
    jump: { fps: 11, loop: false, then: 'idle' }, grabbed: { fps: 8, loop: true }, play: { fps: 8, loop: true },
    stretch: { fps: 8, loop: false, then: 'idle' }, yawn: { fps: 7, loop: false, then: 'idle' },
    wave: { fps: 8, loop: false, then: 'idle' }, love: { fps: 8, loop: false, then: 'happy' },
    full: { fps: 6, loop: false, then: 'idle' }, trick: { fps: 9, loop: false, then: 'happy' },
    walk: { fps: 9, loop: true }, dizzy: { fps: 9, loop: false, then: 'idle' }
  };
  const SPR = { state: 'sleep', frame: 0, t0: 0, since: performance.now(), done: false, w: 0, h: 0 };

  function sizeSprite() {
    SPR.h = window.innerWidth < 700 ? 96 : 150;
    SPR.w = Math.round(CELL_W / CELL_H * SPR.h);
    surface.style.width = SPR.w + 'px';
    surface.style.height = SPR.h + 'px';
    surface.style.backgroundImage = 'url(' + SHEET_URL + ')';
    surface.style.backgroundSize = (COLS * SPR.w) + 'px ' + (ROWS * SPR.h) + 'px';
    drawFrame();
  }
  function drawFrame() {
    const row = ROW[SPR.state] || 0;
    surface.style.backgroundPosition = (-(SPR.frame * SPR.w)) + 'px ' + (-(row * SPR.h)) + 'px';
  }
  function setState(name, force) {
    if (!(name in ROW)) return;
    const cfg = CFG[name] || {};
    if (!force && name === SPR.state && cfg.loop) return;
    SPR.state = name; SPR.frame = 0; SPR.done = false; SPR.t0 = SPR.since = performance.now();
    drawFrame();
  }
  function tick(now) {
    requestAnimationFrame(tick);
    if (SPR.done || document.hidden) return;
    const cfg = CFG[SPR.state] || { fps: 6, loop: true };
    if (now - SPR.t0 < 1000 / cfg.fps) return;
    SPR.t0 = now;
    if (SPR.frame < FRAMES - 1) { SPR.frame++; drawFrame(); return; }
    if (cfg.loop) { SPR.frame = 0; drawFrame(); }
    else { SPR.done = true; setTimeout(() => setState(cfg.then || 'idle', true), 90); }
  }

  /* ---------- haptics (Android vibrate + iOS <input switch> trick) ---------- */
  let hapticEl = null;
  function haptic(type) {
    try {
      if (navigator.vibrate) navigator.vibrate(type === 'success' ? [8, 40, 12] : type === 'heavy' ? [16] : [7]);
    } catch (e) {}
    try {
      if (!hapticEl) {
        hapticEl = document.createElement('label');
        hapticEl.setAttribute('aria-hidden', 'true');
        hapticEl.style.cssText = 'position:absolute;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden;';
        const inp = document.createElement('input');
        inp.type = 'checkbox'; inp.setAttribute('switch', ''); inp.tabIndex = -1;
        hapticEl.appendChild(inp);
        document.body.appendChild(hapticEl);
      }
      hapticEl.click();
    } catch (e) {}
  }

  /* ---------- floating fx ---------- */
  const W = () => bed.offsetWidth || 120;
  function float(cls, html, x, y, life, css) {
    const el = document.createElement('div');
    el.className = cls;
    el.innerHTML = html;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    if (css) Object.assign(el.style, css);
    bed.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => el.remove(), life);
    return el;
  }
  const HEART = '<svg viewBox="0 0 7 6" shape-rendering="crispEdges"><path fill="#ff5070" d="M1 0h2v1H1zM4 0h2v1H4zM0 1h7v2H0zM1 3h5v1H1zM2 4h3v1H2zM3 5h1v1H3z"/></svg>';
  function spawnHeart() {
    const s = (12 + Math.random() * 8) + 'px';
    float('cat-fx cat-heart', HEART, W() * (0.45 + Math.random() * 0.3), 8 + Math.random() * 10, 1500, { width: s, height: s });
  }
  function spawnSparkle() {
    for (let i = 0; i < 3; i++) {
      float('cat-fx cat-heart', pick(['✦', '✧', '⋆']), W() * (0.35 + Math.random() * 0.4), 10 + Math.random() * 30, 1200,
        { fontSize: (10 + Math.random() * 10) + 'px', color: '#e8b54a' });
    }
  }
  function spawnZ(big) {
    const size = big ? 26 + Math.random() * 10 : 15 + Math.random() * 10;
    float('cat-fx cat-z', 'z', W() * (0.45 + Math.random() * 0.3), -2 - Math.random() * 8, 3700, { fontSize: size + 'px' });
  }
  function spawnMark() { float('cat-fx cat-mark', '!', W() * 0.55 + Math.random() * 14, -8, 1000); }
  function spawnShrimp() { float('cat-fx cat-shrimp-pop', '🦐', W() * (0.38 + Math.random() * 0.24), 46, 1200); }
  const DREAMS = [
    '<svg viewBox="0 0 11 7" shape-rendering="crispEdges"><path fill="#7ab0d8" d="M1 2h6v3H1zM2 1h4v1H2zM2 5h4v1H2zM7 1h1v5H7zM8 0h1v2H8zM8 5h1v2H8zM9 0h1v3H9zM9 4h1v3H9z"/><path fill="#1a1a18" d="M2 3h1v1H2z"/></svg>',
    '<svg viewBox="0 0 9 9" shape-rendering="crispEdges"><path fill="#d8504a" d="M2 0h5v1H2zM1 1h7v1H1zM0 2h9v5H0zM1 7h7v1H1zM2 8h5v1H2z"/><path fill="#a02818" d="M2 2h1v5H2zM5 2h1v5H5zM0 4h9v1H0z"/></svg>',
    '<svg viewBox="0 0 9 9" shape-rendering="crispEdges"><path fill="#7a3a14" d="M1 0h2v2H1zM6 0h2v2H6zM0 3h2v2H0zM7 3h2v2H7zM2 4h5v3H2zM3 3h3v1H3zM3 7h3v1H3z"/></svg>'
  ];
  function spawnDream() {
    if (!isSleepy()) return;
    float('cat-fx cat-dream', pick(DREAMS), W() * (0.42 + Math.random() * 0.28), 0, 4600);
  }
  function bubble(text, life) {
    const el = float('cat-fx cat-bubble', '', 0, -22, life || 2400);
    el.textContent = text;
    // grow to the left so long lines never leave the screen
    el.style.left = 'auto';
    el.style.right = Math.round(W() * 0.12) + 'px';
  }
  const say = (mood) => bubble(pick(TEXT.bubbles[mood] || TEXT.bubbles.awake));

  function wiggle(cls, ms) {
    hit.classList.remove('perk', 'tailflick', 'wiggle', 'blink', 'jump', 'awake', 'startled');
    void hit.offsetHeight;
    hit.classList.add(cls);
    setTimeout(() => hit.classList.remove(cls), ms || 800);
  }

  /* ---------- mood / hunger / shrimp ---------- */
  const MOOD_KEY = 'cat_mood_v1';
  const SHRIMP_FULL = 10;
  const mood = { shrimp: 0, ts: Date.now() };
  try {
    const o = JSON.parse(localStorage.getItem(MOOD_KEY) || 'null');
    if (o) { mood.shrimp = Math.max(0, +o.shrimp || 0); mood.ts = +o.ts || Date.now(); }
  } catch (e) {}
  mood.shrimp = Math.max(0, mood.shrimp - Math.floor((Date.now() - mood.ts) / 10000)); // −1 shrimp per 10 s away
  mood.ts = Date.now();
  const saveMood = () => { try { localStorage.setItem(MOOD_KEY, JSON.stringify(mood)); } catch (e) {} };
  const isHungry = () => mood.shrimp < 2;

  const ui = document.createElement('button');
  ui.type = 'button';
  ui.className = 'cat-mood';
  ui.title = TEXT.feedHint;
  ui.tabIndex = -1;
  ui.innerHTML = '<svg viewBox="0 0 44 44" class="cat-ring"><circle class="ring-bg" cx="22" cy="22" r="18"/><circle class="ring-fg" cx="22" cy="22" r="18" transform="rotate(-90 22 22)"/></svg>' +
    '<span class="cat-count"><img src="' + SHRIMP_URL + '" alt=""><b>0</b></span>';
  bed.appendChild(ui);
  function updateMoodUI() {
    ui.querySelector('b').textContent = mood.shrimp;
    const fg = ui.querySelector('.ring-fg');
    const C = 2 * Math.PI * 18, f = Math.min(1, mood.shrimp / SHRIMP_FULL);
    fg.style.strokeDasharray = C;
    fg.style.strokeDashoffset = C * (1 - f);
    fg.style.stroke = f >= 0.66 ? '#3a9d5d' : f >= 0.33 ? '#e0a93a' : '#e0705a';
    ui.classList.toggle('hungry', isHungry());
  }
  ui.addEventListener('click', (e) => { e.stopPropagation(); haptic('light'); goContacts(); });

  function goContacts() {
    const el = document.getElementById('contact');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  let feedTimer = null, starsSpin = null, starsEnd = null;
  function feed() {
    mood.shrimp += 1; mood.ts = Date.now(); saveMood(); updateMoodUI();
    haptic('success');
    spawnShrimp(); spawnHeart(); setTimeout(spawnHeart, 180);
    if (mood.shrimp > 100) { overfed(); return; }
    setState('eat', true);
    clearTimeout(feedTimer);
    feedTimer = setTimeout(() => { setState('full', true); setTimeout(() => setState('happy', true), 1100); }, 1250);
    say('praise');
  }
  function overfed() {
    let w = bed.querySelector('.cat-stars');
    if (!w) { w = document.createElement('div'); w.className = 'cat-stars'; w.innerHTML = '<span>✦</span><span>★</span><span>✦</span>'; bed.appendChild(w); }
    w.classList.add('show');
    setState('dizzy', true);
    clearInterval(starsSpin); clearTimeout(starsEnd);
    starsSpin = setInterval(() => setState('dizzy', true), 700);
    starsEnd = setTimeout(() => { clearInterval(starsSpin); w.classList.remove('show'); setState('idle'); }, 5000);
  }
  let lastHungryPrompt = 0;
  setInterval(() => {
    if (document.hidden) return;
    if (mood.shrimp > 0) { mood.shrimp -= 1; mood.ts = Date.now(); saveMood(); updateMoodUI(); }
    if (isHungry() && Date.now() - lastHungryPrompt > 90000 && Math.random() < 0.5) {
      lastHungryPrompt = Date.now();
      say('hungry');
    }
  }, 10000);

  // every contact click feeds the cat
  document.addEventListener('click', (e) => {
    if (e.target.closest('a[href^="mailto:"], a[href*="t.me/"], a[href*="linkedin.com"], a[href$=".pdf"]')) feed();
  }, true);

  function ambientState() {
    if (isHungry()) { setState(Math.random() < 0.6 ? 'hungry' : 'sad'); return; }
    if (mood.shrimp >= 7 && Math.random() < 0.25) { setState('groom'); return; }
    setState(pick(['idle', 'lie', 'idle', 'groom', 'sleep', 'yawn', 'stretch', 'wave']));
  }

  /* ---------- behaviour ---------- */
  const st = {
    mood: 'sleeping', chainPokes: 0, chainReset: null, pressTimer: null, pressed: false,
    dragging: false, dragStart: null, dragOffset: { x: 0, y: 0 }, lastClickAt: 0,
    lastScreamBubble: 0, lastStartle: 0, hoverAt: 0, lastPaw: 0,
    engaged: false // idle sounds only after the visitor has played with the cat
  };
  const isSleepy = () => st.mood === 'sleeping' || st.mood === 'purring';
  const setMood = (m) => { st.mood = m; };

  setInterval(() => {
    if (document.visibilityState === 'visible' && isSleepy()) spawnZ();
  }, 2400);

  function idleLoop() {
    setTimeout(idleLoop, 6000 + Math.random() * 8000);
    if (document.visibilityState !== 'visible' || st.dragging || st.pressed) return;
    ambientState();
    const r = Math.random();
    if (r < 0.3) spawnDream();
    else if (r < 0.5) {
      spawnZ(true); setTimeout(() => spawnZ(true), 180); setTimeout(() => spawnZ(false), 360);
      if (st.engaged) { const s = sfx(); s._tone && s._tone({ freq: 280, freq2: 380, dur: 0.42, vol: 0.06, attack: 0.12, decay: 0.3, lp: 1400 }); }
    } else if (r < 0.65) wiggle('wiggle');
    else if (r < 0.72) { hit.classList.add('snoozy'); setTimeout(() => hit.classList.remove('snoozy'), 6000); }
    else if (r < 0.9) { say('praise'); if (st.engaged) play('meow1'); }
    else if (st.mood === 'sleeping' && Math.random() < 0.5) say('purring');
  }

  function hoverFx() {
    if (st.dragging || st.pressed) return;
    const now = Date.now();
    if (now - st.hoverAt < 900) return;
    st.hoverAt = now;
    wiggle(pick(['perk', 'tailflick', 'wiggle', 'blink']));
    const r = Math.random();
    if (r < 0.45 && ['idle', 'lie', 'sleep', 'groom'].includes(SPR.state)) setState(pick(['groom', 'wave', 'stretch', 'happy']), true);
    if (r < 0.4) spawnSparkle(); else if (r < 0.7) spawnHeart();
    if (Math.random() < 0.5) play('chirp'); else if (Math.random() < 0.3) play('trill');
  }

  /* pet invite — little card above the cat with a nudge towards contacts */
  const invite = document.createElement('div');
  invite.className = 'cat-invite';
  invite.innerHTML = '<button class="cat-invite-close" type="button" aria-label="' + TEXT.close + '">×</button>' +
    '<p class="cat-invite-text"></p><button class="cat-invite-btn" type="button"></button>';
  document.body.appendChild(invite);
  let inviteTimer = null, inviteIdx = -1;
  const hideInvite = () => { invite.classList.remove('show'); clearTimeout(inviteTimer); };
  invite.querySelector('.cat-invite-close').addEventListener('click', (e) => { e.stopPropagation(); hideInvite(); });
  invite.querySelector('.cat-invite-btn').addEventListener('click', (e) => { e.stopPropagation(); hideInvite(); goContacts(); });
  function showInvite() {
    let idx = Math.floor(Math.random() * TEXT.invite.length);
    if (idx === inviteIdx) idx = (idx + 1) % TEXT.invite.length;
    inviteIdx = idx;
    invite.querySelector('.cat-invite-text').textContent = TEXT.invite[idx];
    invite.querySelector('.cat-invite-btn').innerHTML = TEXT.contacts + ' <span class="cat-badge"><img src="' + SHRIMP_URL + '" alt="">×1</span>';
    invite.classList.add('show');
    const r = bed.getBoundingClientRect();
    const ew = invite.offsetWidth, eh = invite.offsetHeight;
    const left = Math.max(12, Math.min(window.innerWidth - ew - 12, r.left + r.width / 2 - ew / 2));
    let top = r.top - eh - 40, below = false;
    if (top < 12) { top = r.bottom + 12; below = true; }
    invite.style.left = left + 'px';
    invite.style.top = top + 'px';
    invite.classList.toggle('below', below);
    clearTimeout(inviteTimer);
    inviteTimer = setTimeout(hideInvite, 7000);
  }

  function poke() {
    st.engaged = true;
    haptic('light');
    showInvite();
    st.chainPokes += 1;
    clearTimeout(st.chainReset);
    st.chainReset = setTimeout(() => {
      st.chainPokes = 0;
      hit.classList.remove('purring');
      if (st.mood === 'purring') { setMood('sleeping'); play('purrLoopStop'); }
    }, 1800);
    const now = Date.now();
    const isDouble = now - st.lastClickAt < 350;
    st.lastClickAt = now;
    if (isDouble) {
      wiggle('jump', 700);
      setState('jump', true); haptic('heavy');
      setMood('playful'); say('playful'); play('trill');
      spawnHeart(); setTimeout(spawnHeart, 200);
      return;
    }
    if (st.chainPokes >= 7) {
      setMood('annoyed'); say('annoyed'); setState('annoyed', true);
      wiggle('wiggle');
      hit.classList.remove('purring'); play('purrLoopStop'); play('hiss');
      return;
    }
    if (st.chainPokes >= 4) {
      if (!hit.classList.contains('purring')) {
        hit.classList.add('purring');
        setMood('purring'); say('purring'); setState('love', true);
        play('purrLoopStart');
      }
      spawnHeart();
      if (Math.random() < 0.6) setTimeout(spawnHeart, 200);
      return;
    }
    wiggle('awake', 1600);
    setMood('awake'); setState('happy', true);
    const r = Math.random();
    if (r < 0.15) play('purr'); else if (r < 0.25) play('trill'); else if (r < 0.35) play('chirp'); else play('randomMeow');
    spawnHeart();
    if (Math.random() < 0.5) setTimeout(spawnHeart, 220);
    if (Math.random() < 0.55) say('praise'); else if (Math.random() < 0.5) say('awake');
    setTimeout(() => { if (st.mood === 'awake') setMood('sleeping'); }, 2000);
  }

  const approach = { last: Infinity, at: 0 };
  function checkStartle(x, y) {
    if (st.dragging || st.pressed) return;
    const r = hit.getBoundingClientRect();
    const dist = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
    const now = Date.now(), dt = now - approach.at;
    approach.at = now;
    if (dt < 200 && approach.last > 200 && dist < 60 && st.mood === 'sleeping' && now - st.lastStartle > 8000) {
      st.lastStartle = now;
      wiggle('startled', 500);
      setState('startled', true); haptic('light');
      spawnMark(); setMood('awake');
      setTimeout(() => { if (st.mood === 'awake') setMood('sleeping'); }, 1500);
      play('meow4');
    }
    approach.last = dist;
  }

  /* ---------- drag ---------- */
  let home = null;
  function startDrag(x, y) {
    st.dragging = true; st.engaged = true;
    hideInvite();
    hit.classList.add('dragging');
    setState('grabbed', true); haptic('light');
    const r = bed.getBoundingClientRect();
    home = { left: r.left, top: r.top };
    bed.style.transition = 'none';
    bed.style.left = r.left + 'px'; bed.style.top = r.top + 'px';
    bed.style.right = 'auto'; bed.style.bottom = 'auto';
    st.dragOffset = { x: x - r.left, y: y - r.top };
    st.lastScreamBubble = 0;
    play('startCatScream');
    scream();
  }
  function scream() {
    const now = Date.now();
    if (now - st.lastScreamBubble > 850) { st.lastScreamBubble = now; bubble(pick(TEXT.scream), 1400); }
  }
  function paw(x, y) {
    if (Date.now() - st.lastPaw < 80) return;
    st.lastPaw = Date.now();
    const p = document.createElement('div');
    p.className = 'cat-paw';
    p.style.left = (x - 4) + 'px'; p.style.top = (y - 4) + 'px';
    document.body.appendChild(p);
    requestAnimationFrame(() => p.classList.add('show'));
    setTimeout(() => p.remove(), 1400);
  }
  function moveDrag(x, y) {
    if (!st.dragging) return;
    bed.style.left = Math.max(0, Math.min(window.innerWidth - bed.offsetWidth, x - st.dragOffset.x)) + 'px';
    bed.style.top = Math.max(0, Math.min(window.innerHeight - bed.offsetHeight, y - st.dragOffset.y)) + 'px';
    paw(x, y + 24);
    scream();
  }
  function endDrag() {
    if (!st.dragging) return;
    st.dragging = false;
    hit.classList.remove('dragging');
    setState('dizzy', true);
    play('stopCatScream');
    bed.style.transition = 'left .7s cubic-bezier(.34,1.4,.64,1), top .7s cubic-bezier(.34,1.4,.64,1)';
    requestAnimationFrame(() => { bed.style.left = home.left + 'px'; bed.style.top = home.top + 'px'; });
    setTimeout(() => {
      bed.style.transition = 'none';
      bed.style.left = bed.style.top = bed.style.right = bed.style.bottom = '';
      requestAnimationFrame(() => { bed.style.transition = ''; });
    }, 720);
    wiggle('wiggle');
    play('meow2');
    spawnHeart();
  }

  function press(x, y) {
    st.pressed = true;
    st.dragStart = { x, y };
    clearTimeout(st.pressTimer);
    st.pressTimer = setTimeout(() => {
      if (st.pressed && !st.dragging) {
        setMood('annoyed'); say('annoyed'); wiggle('wiggle'); play('hiss');
      }
    }, 700);
  }
  function move(x, y, threshold) {
    if (st.pressed && !st.dragging && st.dragStart && Math.hypot(x - st.dragStart.x, y - st.dragStart.y) > threshold) {
      clearTimeout(st.pressTimer);
      startDrag(st.dragStart.x, st.dragStart.y);
    }
    if (st.dragging) moveDrag(x, y);
  }
  function release() {
    clearTimeout(st.pressTimer);
    if (st.dragging) endDrag();
    else if (st.pressed) poke();
    st.pressed = false; st.dragStart = null;
  }

  hit.addEventListener('mouseenter', hoverFx);
  hit.addEventListener('mousedown', (e) => { e.preventDefault(); press(e.clientX, e.clientY); });
  document.addEventListener('mousemove', (e) => {
    move(e.clientX, e.clientY, 8);
    if (!st.dragging) checkStartle(e.clientX, e.clientY);
  });
  document.addEventListener('mouseup', release);
  hit.addEventListener('touchstart', (e) => { e.preventDefault(); const t = e.touches[0]; press(t.clientX, t.clientY); }, { passive: false });
  document.addEventListener('touchmove', (e) => {
    if (!st.pressed) return;
    const t = e.touches[0];
    move(t.clientX, t.clientY, 10);
    if (st.dragging) e.preventDefault();
  }, { passive: false });
  document.addEventListener('touchend', release);

  /* the 3D voxel view (cat3d.js) reads the state machine through this hook;
     the pixel sprite stays as the fallback when WebGL is not available */
  window.__cat = {
    bed, hit,
    state: () => SPR.state,
    since: () => SPR.since,
    duration: (name) => { const c = CFG[name]; return c && !c.loop ? FRAMES / c.fps : 0; },
    dragging: () => st.dragging,
    setState,
    use3D() { bed.classList.add('is-3d'); }
  };

  /* ---------- boot ---------- */
  sizeSprite();
  updateMoodUI();
  requestAnimationFrame(tick);
  setTimeout(idleLoop, 4000);
  let resizeT = null;
  window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(sizeSprite, 150); });
})();
