/* 3D voxel version of the corner cat (three.js).
   cat.js keeps the state machine, sounds and DOM effects; this file only draws.
   Every sprite state maps to a procedural pose; poses blend smoothly into each other.
   If WebGL is missing this module fails quietly and the pixel sprite stays. */
import * as THREE from '../vendor/three.module.min.js';

const api = window.__cat;
const theme = window.theme;
if (!api) throw new Error('cat.js is not loaded');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const canvas = document.createElement('canvas');
canvas.className = 'cat-canvas';
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
renderer.setClearColor(0x000000, 0);
api.hit.appendChild(canvas);

/* ---------- palette ---------- */
const C = {
  fur: 0xf08a3c, dark: 0xc4622a, cream: 0xfff1df, blush: 0xffb48f,
  pink: 0xffa3ae, nose: 0xff7d93, eye: 0x1d1511, mouth: 0x5b2618
};

/* ---------- voxel mesher: one quad per exposed face, vertex colours ---------- */
const FACES = [
  { n: [1, 0, 0], c: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
  { n: [-1, 0, 0], c: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]] },
  { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { n: [0, 0, 1], c: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]] },
  { n: [0, 0, -1], c: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] }
];
function voxels() {
  const m = new Map();
  const key = (x, y, z) => x + ',' + y + ',' + z;
  return {
    set(x, y, z, c) { m.set(key(x, y, z), c); },
    del(x, y, z) { m.delete(key(x, y, z)); },
    box(x0, y0, z0, x1, y1, z1, c) {
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++)
        this.set(x, y, z, typeof c === 'function' ? c(x, y, z) : c);
    },
    geometry([ox, oy, oz] = [0, 0, 0]) {
      const pos = [], nor = [], col = [];
      const color = new THREE.Color();
      for (const [k, hex] of m) {
        const [x, y, z] = k.split(',').map(Number);
        // tiny deterministic brightness jitter gives the voxels a hand-made feel
        const j = 1 + (((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) % 7) / 220;
        color.setHex(hex).multiplyScalar(j);
        for (const f of FACES) {
          if (m.has(key(x + f.n[0], y + f.n[1], z + f.n[2]))) continue;
          const q = f.c.map((c) => [x + c[0] + ox, y + c[1] + oy, z + c[2] + oz]);
          for (const i of [0, 1, 2, 0, 2, 3]) {
            pos.push(...q[i]); nor.push(...f.n); col.push(color.r, color.g, color.b);
          }
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      return g;
    }
  };
}
const voxelMat = new THREE.MeshLambertMaterial({ vertexColors: true });
const solid = (hex) => new THREE.MeshLambertMaterial({ color: hex });
const group = (x = 0, y = 0, z = 0, parent) => {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  if (parent) parent.add(g);
  return g;
};

/* ---------- model ---------- */
// body: 6 × 5 × 7 voxels, pivot at the back bottom (the haunches)
const bodyV = voxels();
bodyV.box(-3, 0, 0, 2, 4, 6, (x, y, z) => {
  const inner = x > -3 && x < 2;
  if (y === 0 && inner && z > 0) return C.cream;                  // belly
  if (z === 6 && y <= 3 && inner) return C.cream;                 // chest
  if ((z === 1 || z === 3 || z === 5) && (y === 4 || ((x === -3 || x === 2) && y >= 2))) return C.dark;
  return C.fur;
});
for (let z = 0; z <= 6; z++) { bodyV.del(-3, 4, z); bodyV.del(2, 4, z); }

// head: 10 × 8 × 7 voxels + muzzle; pivot at the neck
const headV = voxels();
headV.box(-5, 0, 0, 4, 7, 6, (x, y, z) => {
  const face = z === 6;
  if (face && x >= -2 && x <= 1 && y <= 2) return C.cream;
  if (face && (x === -4 || x === 3) && y === 2) return C.blush;
  if (face && y >= 6 && (x === -2 || x === 1)) return C.dark;
  if (face && y === 7 && (x === -1 || x === 0)) return C.dark;
  if (y === 7 && (z === 1 || z === 3) && x > -4 && x < 3) return C.dark;
  if ((x === -5 || x === 4) && y === 4 && z < 6) return C.dark;
  return C.fur;
});
for (let z = 0; z <= 6; z++) for (const x of [-5, 4]) { headV.del(x, 7, z); headV.del(x, 0, z); }
for (let y = 0; y <= 7; y++) { headV.del(-5, y, 0); headV.del(4, y, 0); }
headV.box(-2, 0, 7, 1, 1, 7, C.cream);   // muzzle
headV.box(-1, 2, 7, 0, 2, 7, C.nose);    // nose

// triangular ear: 4-3-2-1 voxels wide, pink inside, leaning slightly outwards
function earVoxels(mirror) {
  const v = voxels();
  const rows = [[0, 3], [0, 2], [0, 1], [0, 0]];
  rows.forEach(([x0, x1], y) => {
    for (let x = x0; x <= x1; x++) for (let z = 0; z <= 1; z++) {
      const inner = z === 1 && y < 3 && x > x0 && x < x1 + (y === 0 ? 0 : 1) && x > 0;
      v.set(mirror ? 3 - x : x, y, z, inner ? C.pink : C.fur);
    }
  });
  return v;
}
function legVoxels() {
  const v = voxels();
  v.box(0, 0, 0, 1, 3, 1, (x, y) => (y === 0 ? C.cream : C.fur));
  return v;
}

const scene = new THREE.Scene();
const swingG = group(0, 13, 0, scene);       // hanging pivot (scruff) for the "grabbed" state
const model = group(0, -13, 0, swingG);
const bodyG = group(0, 3, -3.5, model);
const bodyMesh = new THREE.Mesh(bodyV.geometry(), voxelMat);
bodyG.add(bodyMesh);

const headG = group(0, 4.2, 5.2, bodyG);
headG.rotation.order = 'YXZ';
headG.add(new THREE.Mesh(headV.geometry([0, -1, -2.5]), voxelMat));
const earL = group(-3, 6.6, 0.3, headG);
earL.add(new THREE.Mesh(earVoxels(false).geometry([-2, 0, -1]), voxelMat));
const earR = group(3, 6.6, 0.3, headG);
earR.add(new THREE.Mesh(earVoxels(true).geometry([-2, 0, -1]), voxelMat));

function eye(x) {
  const g = group(x, 3, 4.62, headG);
  g.add(new THREE.Mesh(new THREE.BoxGeometry(2, 2, 0.35), solid(C.eye)));
  const shine = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.1), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  shine.position.set(-0.45, 0.45, 0.2);
  g.add(shine);
  g.userData.shine = shine;
  return g;
}
const eyeL = eye(-3), eyeR = eye(3);
const mouth = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.45, 0.2), solid(C.mouth));
mouth.position.set(0, -0.35, 5.56);
headG.add(mouth);

const legGeo = legVoxels().geometry([-1, -4, -1]);
const leg = (x, y, z) => { const g = group(x, y, z, bodyG); g.add(new THREE.Mesh(legGeo, voxelMat)); return g; };
const legFL = leg(-1.9, 1, 5.6), legFR = leg(1.9, 1, 5.6), legBL = leg(-1.9, 1.2, 1.2), legBR = leg(1.9, 1.2, 1.2);

const tail = [];
{
  let parent = group(0, 3.6, 0.3, bodyG);
  const mats = [solid(C.fur), solid(C.dark), solid(C.fur), solid(C.dark), solid(C.fur), solid(C.cream)];
  for (let i = 0; i < 6; i++) {
    const g = group(0, 0, i ? -1.45 : 0, parent);
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.6), mats[i]);
    m.position.z = -0.7;
    g.add(m);
    tail.push(g);
    parent = g;
  }
}

// fish for the "eat" state, built from the same pixel map as the 2D fish icon in cat.js;
// fins and tail are one voxel thin, the eye shows on both sides
const fishG = group(0, -0.9, 6.3, headG);
{
  const { rows, pal } = api.fish;
  const v = voxels();
  const hex = (ch) => parseInt(pal[ch].slice(1), 16);
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (!pal[ch]) return;
    const thin = ch === 'd';
    for (let z = thin ? 0 : -1; z <= (thin ? 0 : 1); z++) v.set(x, rows.length - 1 - y, z, ch === 'k' && z === 0 ? hex('b') : hex(ch));
  }));
  fishG.add(new THREE.Mesh(v.geometry([-rows[0].length / 2, -rows.length / 2, -0.5]), voxelMat));
  fishG.visible = false;
}

// soft contact shadow
const shadowTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(0,0,0,0.55)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();
const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false });
const shadow = new THREE.Mesh(new THREE.PlaneGeometry(15, 11), shadowMat);
shadow.rotation.x = -Math.PI / 2;
shadow.position.y = 0.02;
scene.add(shadow);

/* ---------- light & camera ---------- */
const hemi = new THREE.HemisphereLight(0xffffff, 0xcfc8c0, 2.2);
const key = new THREE.DirectionalLight(0xffffff, 2.2);
scene.add(hemi, key, key.target);
function applyTheme(t) {
  const dark = t === 'dark';
  // at night the cat is lit warmly from above, by the lamp
  hemi.color.set(dark ? 0xc4cbe0 : 0xffffff);
  hemi.groundColor.set(dark ? 0x3a3a40 : 0xcfc8c0);
  hemi.intensity = dark ? 1.7 : 2.2;
  key.color.set(dark ? 0xffe2c2 : 0xffffff);
  key.intensity = dark ? 2.6 : 2.2;
  key.position.set(dark ? 3 : -6, dark ? 18 : 14, dark ? 6 : 10);
  shadowMat.opacity = dark ? 0.9 : 0.6;
}
applyTheme(theme ? theme.get() : 'light');
if (theme) theme.onChange(applyTheme);

const VIEW = 25;
const camera = new THREE.OrthographicCamera(-VIEW / 2, VIEW / 2, VIEW / 2, -VIEW / 2, 1, 200);
const target = new THREE.Vector3(0, 9.2, 0);
camera.position.copy(target).add(new THREE.Vector3(0.55, 0.38, 1).normalize().multiplyScalar(80));
camera.lookAt(target);
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(w, h, false);
  const a = w / h;
  camera.left = -VIEW * a / 2; camera.right = VIEW * a / 2;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(canvas);

/* ---------- poses ---------- */
// legs: angles are relative to the body; positive swings the paw backwards
const SIT = { bodyY: 0.5, pitch: -0.5, fl: 0.5, fr: 0.5, bl: -0.5, br: -0.5 };
const LIE = { bodyY: 0, pitch: 0, fl: -1.5, fr: -1.5, bl: -1.5, br: -1.5 };
const STAND = { bodyY: 3, pitch: 0, fl: 0, fr: 0, bl: 0, br: 0 };
const GRAB = { bodyY: 1.5, pitch: -1.3, fl: 1.3, fr: 1.3, bl: 1.3, br: 1.3 };
const DEFAULTS = {
  lift: 0, spin: 0, roll: 0, sx: 1, sy: 1, hy: 0, hp: 0, hr: 0, look: 0, ears: 0, eye: 1, mouth: 0,
  tailUp: 0.4, wag: 0.25, wagSpeed: 1.6, curl: 0, frZ: 0, breathe: 1, belly: 1, shiftX: 0
};
const ease = (k) => k * k * (3 - 2 * k);
const POSES = {
  idle: () => ({ ...SIT, look: 1 }),
  lie: () => ({ ...LIE, look: 0.7, hp: 0.1, tailUp: 0.1, wag: 0.15 }),
  sleep: () => ({ ...LIE, hp: 0.4, hy: 0.35, hr: 0.18, eye: 0, ears: 0.25, curl: 1, wag: 0.04, breathe: 1.8, tailUp: -0.2 }),
  groom: (t) => ({ ...SIT, hp: 0.35, hy: -0.35, hr: -0.2, eye: 0, fr: -2.2 + 0.22 * Math.sin(t * 9), wag: 0.15 }),
  happy: (t) => ({ ...SIT, look: 0.5, eye: 0.12, hr: 0.12 * Math.sin(t * 4), lift: 0.4 * Math.abs(Math.sin(t * 5)), tailUp: 1, wag: 0.5, wagSpeed: 6 }),
  hungry: (t) => ({ ...SIT, look: 1, eye: 1.15, ears: 0.25, hr: 0.22, mouth: Math.sin(t * 3) > 0.55 ? 0.8 : 0, tailUp: 0.25 }),
  eat: (t) => ({ ...SIT, hp: 0.65 + 0.12 * Math.sin(t * 10), eye: 0, mouth: Math.sin(t * 10) > 0 ? 0.5 : 0 }),
  sad: () => ({ ...SIT, look: 0.3, hp: 0.35, ears: 0.9, eye: 0.55, tailUp: -0.6, wag: 0.05 }),
  startled: (t, k) => ({ ...STAND, lift: 2.4 * Math.sin(Math.PI * k), eye: 1.3, ears: -0.5, sx: 1.08, sy: 1.08, tailUp: 1.3, wag: 0, mouth: 0.6 }),
  annoyed: () => ({ ...SIT, eye: 0.4, ears: 1, wag: 0.9, wagSpeed: 12, tailUp: 0, hp: -0.1 }),
  jump: (t, k) => ({ ...STAND, lift: 4.6 * Math.sin(Math.PI * k), sy: k < 0.15 ? 0.82 : k > 0.88 ? 0.9 : 1.08, sx: k < 0.15 ? 1.12 : 0.96, tailUp: 1, eye: 1.1 }),
  grabbed: (t) => ({ ...GRAB, eye: 1.3, mouth: 0.9 + 0.1 * Math.sin(t * 20), ears: 0.6, tailUp: -1.6, wag: 0.3, wagSpeed: 9, lift: 1 }),
  play: (t) => ({ ...STAND, bodyY: 2.3, pitch: 0.25, fl: -0.25, fr: -0.25 - 1.5 * Math.max(0, Math.sin(t * 5)), bl: -0.25, br: -0.25, look: 1, eye: 1.2, shiftX: 0.3 * Math.sin(t * 14), tailUp: 0.8, wag: 0.6, wagSpeed: 8 }),
  stretch: (t, k) => ({ ...STAND, bodyY: 2.1, pitch: 0.35, fl: -1.55, fr: -1.55, bl: -0.35, br: -0.35, mouth: Math.sin(Math.PI * k), eye: 0, hp: -0.2, tailUp: 1.1 }),
  yawn: (t, k) => ({ ...SIT, hp: -0.35 * Math.sin(Math.PI * k), mouth: Math.sin(Math.PI * k), eye: 0 }),
  wave: (t) => ({ ...SIT, look: 1, eye: 0.3, fr: -2.6, frZ: 0.5 * Math.sin(t * 14) }),
  // eyes shut, purring and kneading: front paws push in turns
  love: (t) => ({ ...SIT, eye: 0, hr: 0.25 * Math.sin(t * 6), tailUp: 1, wag: 0.4, wagSpeed: 5,
    fl: 0.5 - 0.6 * Math.max(0, Math.sin(t * 7)), fr: 0.5 - 0.6 * Math.max(0, -Math.sin(t * 7)) }),
  full: () => ({ ...LIE, eye: 0.2, belly: 1.12, breathe: 1.3 }),
  trick: (t, k) => ({ ...STAND, lift: 3.6 * Math.sin(Math.PI * k), spin: Math.PI * 2 * ease(k), tailUp: 1, eye: 0.3 }),
  walk: (t) => { const s = Math.sin(t * 9) * 0.45; return { ...STAND, fl: s, br: s, fr: -s, bl: -s, lift: 0.15 * Math.abs(Math.sin(t * 9)), look: 0 }; },
  dizzy: (t) => ({ ...SIT, hr: 0.3 * Math.sin(t * 9), hy: 0.3 * Math.cos(t * 9), eye: 0.5, ears: 0.4 }),
  // gallop for zoomies: front and back pairs swing in turns, ears flat
  run: (t) => { const s = Math.sin(t * 17) * 0.75; return { ...STAND, bodyY: 2.6, pitch: 0.12 * s, fl: s, fr: s * 0.8, bl: -s, br: -s * 0.8, lift: 0.5 * Math.abs(s), ears: 0.45, eye: 1.2, tailUp: 0.9, wag: 0.2, wagSpeed: 10 }; },
  // hunting crouch: chest low, hind legs loaded, the rear wiggles before the pounce
  crouch: (t) => ({ ...STAND, bodyY: 1.1, pitch: 0.4, fl: -0.55, fr: -0.55, bl: 0.75, br: 0.75, roll: 0.07 * Math.sin(t * 20), eye: 1.3, ears: -0.35, tailUp: 0.05, wag: 0.55, wagSpeed: 10 }),
  // chasing its own tail: two fast turns, head craned back
  chase: (t, k) => { const s = Math.sin(t * 16) * 0.4; return { ...STAND, bodyY: 2.4, pitch: 0.15, spin: Math.PI * 4 * ease(k), lift: 0.4 * Math.abs(Math.sin(t * 12)), hy: 0.55, eye: 1.25, tailUp: 0.5, wag: 0.8, wagSpeed: 14, fl: s, fr: -s, bl: -s, br: s }; },
  // flopped on its side with the belly to the viewer, paws pedalling in the air, head tilted up
  belly: (t) => ({ ...LIE, roll: 1.5, bodyY: 3.1, shiftX: 2.5, hr: -1.2, hp: -0.2, eye: 0.15, mouth: 0.15, fl: -0.5 + 0.4 * Math.sin(t * 5), fr: -0.5 - 0.4 * Math.sin(t * 5), bl: 0.2 + 0.35 * Math.sin(t * 4 + 1), br: 0.2 - 0.35 * Math.sin(t * 4 + 1), tailUp: 0, wag: 0.5, wagSpeed: 3 })
};
const cur = { ...DEFAULTS, ...SIT };

/* ---------- inputs: cursor, blinks, drag swing ---------- */
const mouse = { x: null, y: null };
document.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
let blinkIn = 2 + Math.random() * 3, blinkLeft = 0;
let twitchIn = 3 + Math.random() * 4, twitchLeft = 0, twitchEar = earL;
const swing = { a: 0, v: 0, lastX: null };
// body yaw: three-quarter view at home, turned left or right while walking (the face stays partly visible)
const YAW = { '-1': -0.85, 0: 0.12, 1: 1.4 };
let yaw = YAW[0];

/* ---------- loop ---------- */
const clock = new THREE.Clock();
let time = 0;
function frame() {
  requestAnimationFrame(frame);
  if (document.hidden) { clock.getDelta(); return; }
  const dt = Math.min(0.05, clock.getDelta());
  time += dt;

  const name = api.state();
  const since = (performance.now() - api.since()) / 1000;
  const dur = api.duration(name);
  const k = dur ? Math.min(1, since / dur) : 0;
  const tgt = { ...DEFAULTS, ...(POSES[name] || POSES.idle)(since, k) };

  // head follows the cursor when the pose allows it
  const r = canvas.getBoundingClientRect();
  if (mouse.x !== null && tgt.look) {
    const dx = mouse.x - (r.left + r.width / 2), dy = mouse.y - (r.top + r.height * 0.35);
    tgt.hy += THREE.MathUtils.clamp(dx / 500, -0.55, 0.55) * tgt.look;
    tgt.hp += THREE.MathUtils.clamp(dy / 500, -0.35, 0.4) * tgt.look;
  }

  // one-shot states animate directly; everything else blends with a soft spring.
  // Full turns left over from a spin are dropped so the cat never unwinds backwards.
  if (!dur) cur.spin = Math.atan2(Math.sin(cur.spin), Math.cos(cur.spin));
  const rate = dur ? 18 : 7;
  const a = 1 - Math.exp(-dt * rate);
  for (const p in tgt) cur[p] += (tgt[p] - cur[p]) * (p === 'spin' || p === 'lift' ? (dur ? 1 : a) : a);

  // blinks and ear twitches
  blinkIn -= dt;
  if (blinkIn <= 0) { blinkLeft = 0.13; blinkIn = 2.5 + Math.random() * 4; }
  blinkLeft = Math.max(0, blinkLeft - dt);
  twitchIn -= dt;
  if (twitchIn <= 0) { twitchLeft = 0.14; twitchEar = Math.random() < 0.5 ? earL : earR; twitchIn = 3 + Math.random() * 5; }
  twitchLeft = Math.max(0, twitchLeft - dt);

  // pendulum swing while the cat is carried around
  const bx = api.bed.getBoundingClientRect().left;
  const vx = swing.lastX === null ? 0 : (bx - swing.lastX) / Math.max(dt, 0.001);
  swing.lastX = bx;
  const swingTarget = api.dragging() ? THREE.MathUtils.clamp(-vx * 0.0022, -0.9, 0.9) : 0;
  swing.v += ((swingTarget - swing.a) * 38 - swing.v * 4.5) * dt;
  swing.a += swing.v * dt;

  /* apply */
  yaw += (YAW[api.facing()] - yaw) * (1 - Math.exp(-dt * 9));
  swingG.rotation.z = swing.a;
  model.position.set(cur.shiftX, -13 + cur.lift, 0);
  model.rotation.y = yaw + cur.spin;
  model.scale.set(cur.sx, cur.sy, cur.sx);
  bodyG.position.y = cur.bodyY;
  bodyG.rotation.x = cur.pitch;
  bodyG.rotation.z = cur.roll;
  const breath = 1 + (reduceMotion ? 0.01 : 0.025) * cur.breathe * Math.sin(time * (cur.breathe > 1.5 ? 1.6 : 2.4));
  bodyMesh.scale.set(cur.belly, breath, 1);

  headG.rotation.set(cur.hp - cur.pitch * 0.85, cur.hy, cur.hr);
  const twitch = twitchLeft > 0 ? 0.35 : 0;
  earL.rotation.set(-cur.ears * 0.45, 0, cur.ears * 0.6 + (twitchEar === earL ? twitch : 0));
  earR.rotation.set(-cur.ears * 0.45, 0, -cur.ears * 0.6 - (twitchEar === earR ? twitch : 0));

  const open = blinkLeft > 0 && cur.eye > 0.3 ? 0.12 : Math.max(0.12, cur.eye);
  for (const e of [eyeL, eyeR]) {
    e.scale.set(Math.max(1, open), open, 1);
    e.userData.shine.visible = open > 0.5;
    e.rotation.z = name === 'dizzy' ? time * 8 : 0;
  }
  // the fish shrinks bite by bite
  fishG.visible = name === 'eat';
  if (fishG.visible) {
    fishG.scale.setScalar(0.42 * Math.max(0.3, 1 - since / 1.8));
    fishG.rotation.z = 0.18 * Math.sin(time * 16);
  }
  mouth.scale.set(1, 1 + cur.mouth * 2.6, 1);
  mouth.position.y = -0.35 - cur.mouth * 0.45;

  legFL.rotation.x = cur.fl; legFR.rotation.x = cur.fr; legBL.rotation.x = cur.bl; legBR.rotation.x = cur.br;
  for (const l of [legFL, legBL, legBR]) l.rotation.z = swing.a * 0.4;
  legFR.rotation.z = cur.frZ + swing.a * 0.4;

  tail.forEach((s, i) => {
    s.rotation.x = -cur.tailUp * (i === 0 ? 0.7 : 0.22);
    s.rotation.y = cur.curl * 0.42 + cur.wag * Math.sin(time * cur.wagSpeed - i * 0.7) * (0.5 + i * 0.12);
  });

  shadow.position.set(cur.shiftX + 0.6, 0.02, -0.4);
  const s = Math.max(0.45, 1 - cur.lift / 9);
  shadow.scale.set(s, s, 1);
  shadow.visible = name !== 'grabbed';

  renderer.render(scene, camera);
}

resize();
api.use3D();
requestAnimationFrame(frame);
