/* Cat in the bottom-right corner: state machine, mood, sounds and DOM effects.
   cat3d.js draws it in 3D voxels; the pixel sprite sheet is the fallback.
   Reactions to hover, clicks, double-clicks, long press and drag; toys (a ball and a laser pointer)
   and short walks along the bottom of the screen.
   Feeding: only a click on a "write to me" link (email, Telegram, LinkedIn) throws the cat a fish.
   Purely decorative — the page works the same without it. */
(function () {
  const SCRIPT = document.currentScript;
  const ASSET = (p) => new URL(p, SCRIPT.src).href;
  const SHEET_URL = ASSET('../img/cat/cat-sheet.png');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

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
        hungry: ['feed me {fish}', 'hungry...', 'fish?', 'write to Artem {fish}'],
        praise: ['hire Artem!', 'he ships outcomes', 'systems thinker 🧠', 'ARPU +5%, btw', 'design systems pro',
          '7+ yrs in product', 'won an AI hackathon', 'loves hard products', 'write to Artem! 🐾', 'great with details'],
        ball: ['ball!', 'mine!', 'again!', 'boop', 'gotcha'],
        laser: ['red dot!!', 'I see it', "I'll get it", 'where did it go?', 'mrrrp!']
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
      feedHint: 'The cat eats fish: write to Artem by email, Telegram or LinkedIn',
      fishNote: 'Write to me and the cat gets a fish',
      ball: 'Throw the cat a ball',
      laser: 'Laser pointer',
      close: 'Close'
    },
    ru: {
      bubbles: {
        awake: ['привет.', 'мрр?', 'о, привет', 'погладь', 'мяу.', '...?'],
        purring: ['мрррр...', 'ммм', 'довольный кот', 'не останавливайся'],
        annoyed: ['хватит.', 'уйди', 'хмф', 'грубо.'],
        playful: ['поиграй со мной!', 'прыг', 'ура!', 'вииии'],
        hungry: ['покорми {fish}', 'голодный...', 'рыбку?', 'напиши Артёму {fish}'],
        praise: ['наймите Артёма!', 'делает результат', 'системно мыслит 🧠', 'ARPU +5%, кстати', 'спец по дизайн-системам',
          '7+ лет в продукте', 'взял 1-е на AI-хакатоне', 'любит сложные продукты', 'напишите Артёму! 🐾', 'внимателен к деталям'],
        ball: ['мячик!', 'моё!', 'ещё!', 'буп', 'поймал'],
        laser: ['красная точка!!', 'вижу', 'щас поймаю', 'куда делась?', 'мрррп!']
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
      feedHint: 'Кот ест рыбку: напиши Артёму на почту, в Telegram или LinkedIn',
      fishNote: 'Напишите мне — и кот получит рыбку',
      ball: 'Кинуть коту мячик',
      laser: 'Лазерная указка',
      close: 'Закрыть'
    }
  }[LANG];
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  /* ---------- pixel fish (cat3d.js builds the voxel fish from the same map) ---------- */
  const FISH_MAP = {
    rows: [
      '...ddd......',
      '..bbbbbb...d',
      '.bkbbbbbb.dd',
      'bbbbbbbbbddd',
      '.wwwwwwbb.dd',
      '..wwwwww...d',
      '...dd.......'
    ],
    pal: { b: '#4f9fe8', d: '#2f6fc4', w: '#d4ecff', k: '#1d1511' }
  };
  function pixelSVG({ rows, pal }) {
    const d = {};
    rows.forEach((row, y) => [...row].forEach((ch, x) => { if (pal[ch]) d[ch] = (d[ch] || '') + 'M' + x + ' ' + y + 'h1v1h-1z'; }));
    return '<svg viewBox="0 0 ' + rows[0].length + ' ' + rows.length + '" shape-rendering="crispEdges" aria-hidden="true">' +
      Object.keys(d).map((ch) => '<path fill="' + pal[ch] + '" d="' + d[ch] + '"/>').join('') + '</svg>';
  }
  const FISH = pixelSVG(FISH_MAP);

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
    if (text.includes('{fish}')) el.innerHTML = el.innerHTML.replace('{fish}', FISH);
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

  /* ---------- mood / hunger / fish ---------- */
  const MOOD_KEY = 'cat_mood_v1';
  const FISH_FULL = 3, FISH_LASTS = 60000, FISH_TOO_MANY = 6; // the ring is full at 3 fish; each one lasts a minute
  const mood = { fish: 0, ts: Date.now() };
  try {
    const o = JSON.parse(localStorage.getItem(MOOD_KEY) || 'null');
    if (o) { mood.fish = Math.max(0, Math.min(FISH_TOO_MANY, +o.fish || 0)); mood.ts = +o.ts || Date.now(); }
  } catch (e) {}
  mood.fish = Math.max(0, mood.fish - Math.floor((Date.now() - mood.ts) / FISH_LASTS));
  mood.ts = Date.now();
  const saveMood = () => { try { localStorage.setItem(MOOD_KEY, JSON.stringify(mood)); } catch (e) {} };
  const isHungry = () => mood.fish < 1;

  const ui = document.createElement('button');
  ui.type = 'button';
  ui.className = 'cat-mood';
  ui.title = TEXT.feedHint;
  ui.tabIndex = -1;
  ui.innerHTML = '<svg viewBox="0 0 44 44" class="cat-ring"><circle class="ring-bg" cx="22" cy="22" r="18"/><circle class="ring-fg" cx="22" cy="22" r="18" transform="rotate(-90 22 22)"/></svg>' +
    '<span class="cat-count">' + FISH + '<b>0</b></span>';
  bed.appendChild(ui);
  function updateMoodUI() {
    ui.querySelector('b').textContent = mood.fish;
    const fg = ui.querySelector('.ring-fg');
    const C = 2 * Math.PI * 18, f = Math.min(1, mood.fish / FISH_FULL);
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
    mood.fish = Math.min(FISH_TOO_MANY + 1, mood.fish + 1); mood.ts = Date.now(); saveMood(); updateMoodUI();
    haptic('success'); play('trill');
    spawnHeart(); setTimeout(spawnHeart, 180);
    if (mood.fish > FISH_TOO_MANY) { overfed(); return; }
    setState('eat', true);
    clearTimeout(feedTimer);
    feedTimer = setTimeout(() => { setState('full', true); setTimeout(() => setState('happy', true), 1100); }, 1500);
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
    if (mood.fish > 0 && Date.now() - mood.ts >= FISH_LASTS) { mood.fish -= 1; mood.ts = Date.now(); saveMood(); updateMoodUI(); }
    if (isHungry() && Date.now() - lastHungryPrompt > 90000 && Math.random() < 0.5) {
      lastHungryPrompt = Date.now();
      say('hungry');
    }
  }, 10000);

  /* only "write to me" links feed the cat: the fish flies from the link into its mouth.
     Telegram and LinkedIn open in a new tab, so the throw waits until the visitor comes back. */
  const FEED_LINKS = 'a[href^="mailto:"], a[href*="t.me/artemiskandirov"], a[href*="linkedin.com/in/"]';
  function throwFish(from) {
    const go = () => {
      const src = from.querySelector('.fish-tag') || from;
      const a = src.getBoundingClientRect();
      if (reduceMotion || !a.width || a.bottom < 0 || a.top > window.innerHeight) { feed(); return; }
      const b = (bed.classList.contains('is-3d') ? hit.querySelector('canvas') : surface).getBoundingClientRect();
      const x0 = a.left + a.width / 2, y0 = a.top + a.height / 2;
      const x1 = b.left + b.width * 0.5, y1 = b.top + b.height * 0.5;
      const peak = Math.min(y0, y1) - 140;
      const el = document.createElement('div');
      el.className = 'cat-fish-fly';
      el.innerHTML = FISH;
      document.body.appendChild(el);
      const frames = [];
      for (let i = 0; i <= 16; i++) {
        const t = i / 16, u = 1 - t;
        const x = x0 + (x1 - x0) * t, y = u * u * y0 + 2 * u * t * peak + t * t * y1;
        frames.push({ transform: 'translate(' + (x - 16) + 'px,' + (y - 9) + 'px) rotate(' + (-20 + 380 * t) + 'deg) scale(' + (1.2 - 0.5 * t) + ')' });
      }
      setState('hungry', true);
      el.animate(frames, { duration: 850, easing: 'cubic-bezier(.3,.1,.6,1)' }).onfinish = () => { el.remove(); feed(); };
    };
    setTimeout(() => {
      if (!document.hidden) { go(); return; }
      const back = () => {
        if (document.hidden) return;
        document.removeEventListener('visibilitychange', back);
        setTimeout(go, 450);
      };
      document.addEventListener('visibilitychange', back);
    }, 150);
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest(FEED_LINKS);
    if (a && !a.closest('.cat')) throwFish(a);
  }, true);

  // fish badges on those links and a short legend; decorative, so they live here and not in the HTML
  function addFishTags() {
    document.querySelectorAll(FEED_LINKS).forEach((a) => {
      if (a.querySelector('.fish-tag')) return;
      const tag = document.createElement('span');
      tag.className = 'fish-tag';
      tag.setAttribute('aria-hidden', 'true');
      tag.title = TEXT.feedHint;
      tag.innerHTML = FISH;
      const label = [...a.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
      a.insertBefore(tag, label ? label.nextSibling : a.firstChild);
    });
    for (const sel of ['.hero .actions', '#contact .links']) {
      const el = document.querySelector(sel);
      if (!el || (el.nextElementSibling && el.nextElementSibling.classList.contains('fish-note'))) continue;
      const note = document.createElement('p');
      note.className = 'fish-note';
      note.setAttribute('aria-hidden', 'true');
      note.innerHTML = FISH;
      note.appendChild(document.createTextNode(TEXT.fishNote));
      el.after(note);
    }
  }

  function ambientState() {
    if (isHungry()) { setState(Math.random() < 0.6 ? 'hungry' : 'sad'); return; }
    if (mood.fish >= FISH_FULL && Math.random() < 0.25) { setState('groom'); return; }
    setState(pick(['idle', 'lie', 'idle', 'groom', 'sleep', 'yawn', 'stretch', 'wave']));
  }

  /* ---------- behaviour ---------- */
  const st = {
    mood: 'sleeping', chainPokes: 0, chainReset: null, pressTimer: null, pressed: false,
    dragging: false, dragStart: null, dragOffset: { x: 0, y: 0 }, lastClickAt: 0,
    lastScreamBubble: 0, lastStartle: 0, hoverAt: 0, lastPaw: 0, settling: false,
    engaged: false // idle sounds only after the visitor has played with the cat
  };
  const isSleepy = () => st.mood === 'sleeping' || st.mood === 'purring';
  const setMood = (m) => { st.mood = m; };

  setInterval(() => {
    if (document.visibilityState === 'visible' && isSleepy()) spawnZ();
  }, 2400);

  function idleLoop() {
    setTimeout(idleLoop, 6000 + Math.random() * 8000);
    if (document.visibilityState !== 'visible' || st.dragging || st.pressed || act || ball || laser.on) return;
    if (!reduceMotion && Math.random() < 0.12) { stroll(); return; }
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
    invite.querySelector('.cat-invite-btn').innerHTML = TEXT.contacts + ' <span class="cat-badge">' + FISH + '+1</span>';
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
    // spring back to where it was picked up: its corner, or the spot on its walk
    st.settling = true;
    bed.style.transition = 'left .7s cubic-bezier(.34,1.4,.64,1), top .7s cubic-bezier(.34,1.4,.64,1)';
    requestAnimationFrame(() => { bed.style.left = home.left + 'px'; bed.style.top = home.top + 'px'; });
    setTimeout(() => {
      bed.style.transition = 'none';
      bed.style.top = bed.style.bottom = '';
      if (pos.x === null) bed.style.left = bed.style.right = '';
      else { bed.style.left = pos.x + 'px'; bed.style.right = 'auto'; }
      st.settling = false;
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

  /* ---------- walks along the bottom of the screen ---------- */
  const pos = { x: null, face: 0 };  // x: left edge while away from the corner (null at home); face: −1 left, 0 viewer, 1 right
  let act = null;                    // current activity, ticked every frame: stroll, ball chase, laser hunt or the way home
  const catW = () => bed.offsetWidth || 120;
  const catBusy = () => st.dragging || st.settling || SPR.state === 'eat' || SPR.state === 'full';
  const centerX = () => (pos.x === null ? bed.getBoundingClientRect().left : pos.x) + catW() / 2;
  // the floor the cat stands on, in viewport px (the 3D canvas has some air under the paws)
  const floorY = () => window.innerHeight - (bed.classList.contains('is-3d') ? catW() * 0.14 : 10);
  function homeLeft() {
    const l = bed.style.left, r = bed.style.right;
    bed.style.left = bed.style.right = '';
    const x = bed.getBoundingClientRect().left;
    bed.style.left = l; bed.style.right = r;
    return x;
  }
  function setFace(f) {
    pos.face = f;
    bed.classList.toggle('face-right', f > 0);
  }
  // steps the cat towards a point (its centre); returns true once it is there
  function walkTowards(cx, speed, dt, quiet) {
    if (pos.x === null) {
      pos.x = bed.getBoundingClientRect().left;
      bed.style.right = 'auto';
    }
    const w = catW();
    const goal = Math.max(-w * 0.15, Math.min(window.innerWidth - w * 0.85, cx - w / 2));
    const d = goal - pos.x;
    if (Math.abs(d) < 2) return true;
    pos.x += Math.sign(d) * Math.min(Math.abs(d), speed * dt);
    bed.style.left = pos.x + 'px';
    setFace(Math.sign(d));
    if (!quiet && SPR.state !== 'walk') setState('walk');
    return false;
  }
  function goHome() {
    act = {
      tick(dt) {
        if (!walkTowards(homeLeft() + catW() / 2, 150, dt)) return;
        bed.style.left = bed.style.right = '';
        pos.x = null; act = null;
        setFace(0); setState('idle', true);
      }
    };
    startWorld();
  }
  function stroll() {
    const w = catW(), home = homeLeft();
    if (home < w * 1.4) return;  // narrow screen: nowhere to go
    const to = 16 + w / 2 + Math.random() * (home - w - 32);
    let sit = 0;
    act = {
      tick(dt) {
        if (sit > 0) { sit -= dt; if (sit <= 0) goHome(); return; }
        if (!walkTowards(to, 90, dt)) return;
        setFace(0);
        sit = 3 + Math.random() * 4;
        setState(pick(['idle', 'groom', 'wave', 'lie']), true);
        if (Math.random() < 0.5) say('praise');
      }
    };
    startWorld();
  }

  let worldOn = false, worldT = 0;
  function startWorld() {
    if (worldOn) return;
    worldOn = true; worldT = performance.now();
    requestAnimationFrame(world);
  }
  function world(now) {
    const dt = Math.min(0.05, (now - worldT) / 1000);
    worldT = now;
    if (!document.hidden) {
      if (ball) ballTick(dt);
      if (laser.on) laserTick();
      if (act && !catBusy()) act.tick(dt);
    }
    if (act || ball || laser.on) requestAnimationFrame(world);
    else worldOn = false;
  }

  /* ---------- toys: ball and laser pointer ---------- */
  const toys = document.createElement('div');
  toys.className = 'cat-toys';
  toys.innerHTML = '<button class="cat-toy" type="button" data-toy="ball" aria-pressed="false" tabindex="-1" title="' + TEXT.ball + '"><span class="cat-ball-ico"></span></button>' +
    '<button class="cat-toy" type="button" data-toy="laser" aria-pressed="false" tabindex="-1" title="' + TEXT.laser + '"><span class="cat-laser-ico"></span></button>';
  bed.appendChild(toys);
  const ballBtn = toys.querySelector('[data-toy="ball"]'), laserBtn = toys.querySelector('[data-toy="laser"]');
  ballBtn.addEventListener('click', (e) => {
    e.stopPropagation(); haptic('light'); st.engaged = true;
    if (ball) { removeBall(); goHome(); return; }
    if (laser.on) setLaser(false);
    spawnBall();
  });
  laserBtn.addEventListener('click', (e) => { e.stopPropagation(); haptic('light'); st.engaged = true; setLaser(!laser.on); });

  // ball: real-ish physics, the visitor can grab and throw it, the cat chases it and bats it around
  let ball = null;
  function spawnBall() {
    const R = window.innerWidth < 700 ? 11 : 14;
    const el = document.createElement('div');
    el.className = 'cat-ball';
    el.setAttribute('aria-hidden', 'true');
    el.style.width = el.style.height = 2 * R + 'px';
    el.innerHTML = '<i></i>';
    const sh = document.createElement('div');
    sh.className = 'cat-ball-shadow';
    sh.style.width = 2 * R + 'px';
    document.body.append(sh, el);
    const r = ballBtn.getBoundingClientRect();
    ball = { el, sh, R, x: r.left + r.width / 2, y: r.top - R, vx: -(380 + Math.random() * 420), vy: -(620 + Math.random() * 260), spin: 0, squash: 0, held: null, kicks: 0, rest: 0, age: 0 };
    ballBtn.setAttribute('aria-pressed', 'true');
    const b = ball;
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      el.setPointerCapture(e.pointerId);
      b.held = { dx: e.clientX - b.x, dy: e.clientY - b.y, trail: [[e.timeStamp, e.clientX, e.clientY]] };
      b.vx = b.vy = 0; b.kicks = 0; b.age = 0;
      el.classList.add('held');
    });
    el.addEventListener('pointermove', (e) => {
      if (!b.held) return;
      b.x = e.clientX - b.held.dx; b.y = e.clientY - b.held.dy;
      b.held.trail.push([e.timeStamp, e.clientX, e.clientY]);
      while (b.held.trail.length > 2 && e.timeStamp - b.held.trail[0][0] > 90) b.held.trail.shift();
    });
    const drop = (e) => {
      if (!b.held) return;
      const t = b.held.trail, first = t[0], last = [e.timeStamp, e.clientX, e.clientY];
      const ms = Math.max(16, last[0] - first[0]);
      const clamp = (v) => Math.max(-2600, Math.min(2600, v));
      b.vx = clamp((last[1] - first[1]) / ms * 1000); b.vy = clamp((last[2] - first[2]) / ms * 1000);
      b.held = null;
      el.classList.remove('held');
    };
    el.addEventListener('pointerup', drop);
    el.addEventListener('pointercancel', drop);
    act = ballChase();
    startWorld();
    say('ball');
  }
  function removeBall() {
    if (!ball) return;
    const { el, sh } = ball;
    ball = null;
    ballBtn.setAttribute('aria-pressed', 'false');
    el.classList.add('out'); sh.classList.add('out');
    setTimeout(() => { el.remove(); sh.remove(); }, 450);
  }
  function ballTick(dt) {
    const b = ball, R = b.R, Wd = window.innerWidth, F = floorY();
    b.age += dt;
    if (!b.held) {
      b.vy += 2200 * dt;
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.y > F - R) {
        b.y = F - R;
        if (b.vy > 160) {
          b.squash = Math.min(0.3, b.vy / 3200);
          if (st.engaged) { const s = sfx(); s._tone && s._tone({ freq: 240 + Math.random() * 60, freq2: 150, dur: 0.06, vol: Math.min(0.08, b.vy / 18000), decay: 0.06, lp: 900 }); }
        }
        b.vy = -b.vy * 0.55;
        if (Math.abs(b.vy) < 90) b.vy = 0;
        b.vx *= Math.exp(-dt * 1.4);   // rolling friction
      }
      if (b.x < R) { b.x = R; b.vx = Math.abs(b.vx) * 0.7; }
      if (b.x > Wd - R) { b.x = Wd - R; b.vx = -Math.abs(b.vx) * 0.7; }
      if (b.y < R) { b.y = R; b.vy = Math.abs(b.vy) * 0.5; }
      b.spin += b.vx * dt / R;
    } else {
      b.x = Math.max(R, Math.min(Wd - R, b.x)); b.y = Math.max(R, Math.min(F - R, b.y));
    }
    const resting = !b.held && b.vy === 0 && Math.abs(b.vx) < 6;
    b.rest = resting ? b.rest + dt : 0;
    b.squash *= Math.exp(-dt * 14);
    b.el.style.transform = 'translate(' + (b.x - R) + 'px,' + (b.y - R) + 'px) scale(' + (1 + b.squash) + ',' + (1 - b.squash) + ')';
    b.el.firstChild.style.transform = 'rotate(' + b.spin + 'rad)';
    const s = Math.max(0.35, 1 - (F - R - b.y) / 260);
    b.sh.style.transform = 'translate(' + (b.x - R) + 'px,' + (F - 4) + 'px) scale(' + s + ',1)';
    b.sh.style.opacity = s;
    // the game ends after a few swats (or a long while), once the ball has stopped
    if ((b.kicks >= 6 || b.age > 45) && b.rest > 1) { removeBall(); goHome(); }
  }
  function ballChase() {
    let swat = 0;
    return {
      tick(dt) {
        if (!ball) return;
        const b = ball, w = catW(), cx = centerX();
        if (swat > 0) {
          swat -= dt;
          if (swat <= 0 && !b.held && Math.abs(b.x - cx) < w * 0.5 && b.y > floorY() - b.R - 50) {
            const away = Math.sign(b.x - cx) || -1;
            const dir = b.x < window.innerWidth * 0.2 ? 1 : b.x > window.innerWidth * 0.9 ? -1 : (Math.random() < 0.8 ? away : -away);
            b.vx = dir * (320 + Math.random() * 520); b.vy = -(420 + Math.random() * 520);
            b.kicks++;
            play('chirp');
            if (Math.random() < 0.3) say('ball');
          }
          return;
        }
        // watch it while it flies or while the visitor holds it
        if (b.held || b.y < floorY() - b.R - 50) {
          if (SPR.state === 'walk' || SPR.state === 'play') setState('idle', true);
          setFace(0);
          return;
        }
        const dx = b.x - cx;
        if (Math.abs(dx) < w * 0.3) {
          setFace(Math.sign(dx));
          setState('play', true);
          swat = 0.3;
        } else walkTowards(b.x - Math.sign(dx) * w * 0.2, 200, dt);
      }
    };
  }

  // laser pointer: a red dot follows the pointer, the cat stalks it along the floor and pounces
  const laser = { on: false, x: -50, y: -50, dot: null, moved: 0, pounced: 0, lunge: 0 };
  function setLaser(on) {
    laser.on = on;
    laserBtn.setAttribute('aria-pressed', String(on));
    document.documentElement.classList.toggle('cat-laser-on', on);
    if (on) {
      if (ball) removeBall();
      laser.dot = document.createElement('div');
      laser.dot.className = 'cat-laser';
      laser.dot.setAttribute('aria-hidden', 'true');
      document.body.appendChild(laser.dot);
      const r = laserBtn.getBoundingClientRect();
      moveLaser(r.left - 60, r.top + 10);
      act = laserHunt();
      startWorld();
      say('laser');
    } else {
      if (laser.dot) laser.dot.remove();
      laser.dot = null;
      goHome();
    }
  }
  function moveLaser(x, y) {
    laser.x = x; laser.y = y; laser.moved = performance.now();
  }
  function laserTick() {
    // a real laser pointer never holds perfectly still
    const j = () => (Math.random() - 0.5) * 1.6;
    laser.dot.style.transform = 'translate(' + (laser.x + j()) + 'px,' + (laser.y + j()) + 'px)';
    if (performance.now() - laser.moved > 30000) setLaser(false);
  }
  document.addEventListener('pointermove', (e) => { if (laser.on) moveLaser(e.clientX, e.clientY); }, { passive: true });
  document.addEventListener('pointerdown', (e) => { if (laser.on && !e.target.closest('.cat-toys')) moveLaser(e.clientX, e.clientY); }, { passive: true });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && laser.on) setLaser(false); });
  function laserHunt() {
    return {
      tick(dt) {
        if (!laser.on) return;
        const w = catW(), dx = laser.x - centerX(), now = performance.now();
        if (laser.lunge > 0) { laser.lunge -= dt; walkTowards(laser.x, 520, dt, true); return; }
        // dot up on the page: sit and stare at it (the head follows the pointer)
        if (laser.y < window.innerHeight - 230) {
          if (SPR.state === 'walk') setState('idle', true);
          setFace(0);
          return;
        }
        if (Math.abs(dx) > w * 0.3) { walkTowards(laser.x, 280, dt); return; }
        // close: crouch, chatter, and pounce once the dot holds still for a moment
        if (SPR.state === 'walk') { setState('hungry', true); setFace(0); }
        if (now - laser.moved > 350 && now - laser.pounced > 1400) {
          laser.pounced = now; laser.lunge = 0.32;
          setFace(Math.sign(dx)); setState('jump', true); play('chirp');
          if (Math.random() < 0.35) say('laser');
        }
      }
    };
  }

  /* the 3D voxel view (cat3d.js) reads the state machine through this hook;
     the pixel sprite stays as the fallback when WebGL is not available */
  window.__cat = {
    bed, hit,
    state: () => SPR.state,
    since: () => SPR.since,
    duration: (name) => { const c = CFG[name]; return c && !c.loop ? FRAMES / c.fps : 0; },
    dragging: () => st.dragging,
    facing: () => pos.face,
    fish: FISH_MAP,
    setState,
    use3D() { bed.classList.add('is-3d'); }
  };

  /* ---------- boot ---------- */
  sizeSprite();
  updateMoodUI();
  addFishTags();
  requestAnimationFrame(tick);
  setTimeout(idleLoop, 4000);
  let resizeT = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      sizeSprite();
      if (pos.x !== null) { pos.x = Math.min(pos.x, window.innerWidth - catW() * 0.85); bed.style.left = pos.x + 'px'; }
    }, 150);
  });
})();
