/* Interactive 3D light bulb hanging on a cord (three.js).
   Tap it, or pull it down by the cord, to switch the theme: lamp on = dark theme.
   Drag it sideways to swing it. Scene units are CSS pixels at desktop scale. */
import * as THREE from '../vendor/three.module.min.js';
import { RoomEnvironment } from '../vendor/RoomEnvironment.js';

const box = document.getElementById('bulb');
const canvas = box.querySelector('canvas');
const btn = box.querySelector('.bulb-toggle');
const theme = window.theme;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- renderer ---------- */
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
} catch (e) {
  box.classList.add('is-fallback');
  throw e;
}
renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environment = envTex;
pmrem.dispose();

const camera = new THREE.PerspectiveCamera(26, 1, 1, 10000);
const key = new THREE.DirectionalLight(0xffffff, 1.4);
key.position.set(-300, 400, 600);
scene.add(key);

/* ---------- model ---------- */
const CORD = 250;          // cord length, px
const SOCKET_H = 37;       // socket height below the cord
const GLASS_TOP = -SOCKET_H - 1;

const pivot = new THREE.Group();   // hangs from the top edge, carries the swing
scene.add(pivot);

const cordMat = new THREE.MeshStandardMaterial({ color: 0x1c1b1a, roughness: 0.6 });
const cordGeo = new THREE.CylinderGeometry(1.6, 1.6, 1, 10, 1, true);
cordGeo.translate(0, -0.5, 0);
const cord = new THREE.Mesh(cordGeo, cordMat);
pivot.add(cord);

const hang = new THREE.Group();    // everything below the cord; twists around the cord axis
pivot.add(hang);

// profiles are written top → bottom; LatheGeometry wants bottom → top for outward normals
const lathe = (pts, segs = 48) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)).reverse(), segs);

// bakelite socket
const socketMat = new THREE.MeshPhysicalMaterial({ color: 0x181716, roughness: 0.34, clearcoat: 0.7, clearcoatRoughness: 0.2 });
hang.add(new THREE.Mesh(lathe([
  [0, 0], [3.2, 0], [4.6, -1.5], [4.6, -5], [8, -7.5], [12.4, -11], [13.6, -14], [13.6, -16.2],
  [12.9, -17], [13.6, -17.8], [13.6, -31], [14.6, -32], [14.6, -SOCKET_H], [11.5, -SOCKET_H], [0, -SOCKET_H]
]), socketMat));

// brass collar between socket and glass
const brassMat = new THREE.MeshStandardMaterial({ color: 0xc9a06a, metalness: 1, roughness: 0.28 });
hang.add(new THREE.Mesh(lathe([[11.6, -SOCKET_H + 0.5], [12.6, -SOCKET_H - 0.5], [12.6, -SOCKET_H - 3.5], [11.6, -SOCKET_H - 4.5]]), brassMat));

// glass envelope: clear glass = specular reflections added over the page
const glassProfile = new THREE.SplineCurve([
  [11.4, 0], [11.7, -6], [14, -16], [22, -28], [31, -42], [35, -56], [34.4, -67],
  [30, -79], [21.5, -89], [10.5, -94.6], [0, -96.4]
].map(([x, y]) => new THREE.Vector2(x, y + GLASS_TOP))).getPoints(64).reverse();
const glassGeo = new THREE.LatheGeometry(glassProfile, 72);
const glassOpts = {
  color: 0x000000, roughness: 0.03, metalness: 0,
  clearcoat: 1, clearcoatRoughness: 0.02,
  envMap: envTex, // own envMap, so envMapIntensity is not overridden by scene.environmentIntensity
  transparent: true, depthWrite: false,
  blending: THREE.CustomBlending,
  blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor
};
/* alpha follows a Fresnel curve: the middle of the glass stays clear, the silhouette gets a soft rim */
function fresnelGlass(opts, base, rim) {
  const mat = new THREE.MeshPhysicalMaterial(opts);
  mat.userData.base = { value: base };
  mat.userData.rim = { value: rim };
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uBase = mat.userData.base;
    sh.uniforms.uRim = mat.userData.rim;
    sh.fragmentShader = 'uniform float uBase;\nuniform float uRim;\n' + sh.fragmentShader.replace(
      '#include <opaque_fragment>',
      '#include <opaque_fragment>\n' +
      'float fres = pow(1.0 - clamp(abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0), 2.2);\n' +
      'gl_FragColor.a = mix(uBase, uRim, fres);'
    );
  };
  return mat;
}
const glassBack = new THREE.Mesh(glassGeo, fresnelGlass({ ...glassOpts, side: THREE.BackSide }, 0.02, 0.2));
const glassFront = new THREE.Mesh(glassGeo, fresnelGlass({ ...glassOpts, side: THREE.FrontSide }, 0.05, 0.45));
glassBack.renderOrder = 2;
glassFront.renderOrder = 3;
hang.add(glassBack, glassFront);

// stem, support wires and the coiled filament
const stemMat = new THREE.MeshPhysicalMaterial({ ...glassOpts, opacity: 0.18 });
const stemGeo = new THREE.CylinderGeometry(2.6, 5.5, 34, 20, 1, true);
stemGeo.translate(0, GLASS_TOP - 8 - 17, 0);
const stem = new THREE.Mesh(stemGeo, stemMat);
stem.renderOrder = 1;
hang.add(stem);

const wireMat = new THREE.MeshStandardMaterial({ color: 0x8a7a68, metalness: 0.7, roughness: 0.35 });
const FIL_Y = GLASS_TOP - 62;
const FIL_X = 13;
const wire = (x0, y0, x1, y1) => {
  const c = new THREE.LineCurve3(new THREE.Vector3(x0, y0, 0), new THREE.Vector3(x1, y1, 0));
  return new THREE.Mesh(new THREE.TubeGeometry(c, 1, 0.55, 6), wireMat);
};
const STEM_BOTTOM = GLASS_TOP - 42;
hang.add(wire(-2, STEM_BOTTOM + 4, -FIL_X, FIL_Y), wire(2, STEM_BOTTOM + 4, FIL_X, FIL_Y));
hang.add(wire(0, STEM_BOTTOM + 2, 0, FIL_Y - 2));

class Coil extends THREE.Curve {
  getPoint(t, out = new THREE.Vector3()) {
    const x = -FIL_X + 2 * FIL_X * t;
    const y = FIL_Y - 4.5 * Math.sin(Math.PI * t);
    const a = t * Math.PI * 2 * 16;
    const r = 1.35 * Math.min(1, Math.sin(Math.PI * t) * 6);
    return out.set(x, y + Math.cos(a) * r, Math.sin(a) * r);
  }
}
const filamentMat = new THREE.MeshBasicMaterial({ color: 0x2b2622, toneMapped: false });
hang.add(new THREE.Mesh(new THREE.TubeGeometry(new Coil(), 360, 0.42, 6), filamentMat));

// glow: two additive sprites + a warm point light inside the glass
const glowTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.25, 'rgba(255,255,255,0.45)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();
const sprite = (size, color) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color, transparent: true, depthWrite: false, depthTest: false,
    blending: THREE.AdditiveBlending, toneMapped: false, opacity: 0
  }));
  s.scale.set(size, size, 1);
  s.position.set(0, FIL_Y, 0);
  s.renderOrder = 4;
  hang.add(s);
  return s;
};
const core = sprite(60, 0xffd9a8);
const halo = sprite(130, 0xffb766);
const lamp = new THREE.PointLight(0xffb36b, 0, 0, 2);
lamp.position.set(0, FIL_Y, 0);
hang.add(lamp);

/* ---------- layout ---------- */
let W = 0, H = 0, S = 1;
function resize() {
  W = box.clientWidth; H = box.clientHeight;
  if (!W || !H) return;
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(W, H, false);
  camera.aspect = W / H;
  const dist = (H / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  camera.position.set(0, 0, dist);
  camera.near = dist / 20;
  camera.far = dist * 4;
  camera.updateProjectionMatrix();
  S = H / 500;
  pivot.scale.setScalar(S);
  pivot.position.set(0, H / 2 + 1, 0);
  wake();
}
new ResizeObserver(resize).observe(box);

/* ---------- state ---------- */
const sw = { x: reduceMotion ? 0 : 0.3, z: reduceMotion ? 0 : -0.12, vx: 0, vz: 0 }; // swing angles
const tw = { a: 0, v: reduceMotion ? 0 : 1.2 };                                       // twist around the cord
const pull = { e: 0, v: 0 };                                                           // cord stretch, px
let power = theme.get() === 'dark' ? 1 : 0;
let drag = null;

function applyThemeLook(t) {
  const dark = t === 'dark';
  cordMat.color.set(dark ? 0x3a3a3a : 0x1c1b1a);
  socketMat.color.set(dark ? 0x262626 : 0x181716);
  scene.environmentIntensity = dark ? 0.5 : 1;
  key.intensity = dark ? 0.6 : 1.4;
  // on a light page every reflected bit of light washes the glass out to white, so keep them faint
  glassFront.material.envMapIntensity = dark ? 0.55 : 0.1;
  glassBack.material.envMapIntensity = dark ? 0.5 : 0.06;
  stemMat.envMapIntensity = dark ? 0.45 : 0.1;
  glassFront.material.userData.rim.value = dark ? 0.35 : 0.5;
}
applyThemeLook(theme.get());
theme.onChange((t) => {
  applyThemeLook(t);
  if (t === 'dark' && window.sfx) setTimeout(() => window.sfx.filamentPing(), 60);
  wake();
});

const C_OFF = new THREE.Color(0x2b2622);
const C_EMBER = new THREE.Color(0.85, 0.22, 0.04);
const C_HOT = new THREE.Color(1, 0.86, 0.62);
const tmpC = new THREE.Color();
function applyPower(p) {
  const e = THREE.MathUtils.smoothstep(p, 0, 0.35);
  const h = THREE.MathUtils.smoothstep(p, 0.3, 1);
  tmpC.copy(C_OFF).lerp(C_EMBER, e).lerp(C_HOT, h);
  filamentMat.color.copy(tmpC);
  core.material.opacity = Math.pow(p, 1.4) * 0.95;
  halo.material.opacity = Math.pow(p, 2) * 0.3;
  lamp.intensity = p * p * 2600;
}

/* ---------- projection helpers ---------- */
const v3 = new THREE.Vector3();
function toCanvas(localY) {
  v3.set(0, localY, 0);
  hang.localToWorld(v3);
  v3.project(camera);
  return { x: (v3.x + 1) / 2 * W, y: (1 - v3.y) / 2 * H };
}
function anchor() {
  const r = canvas.getBoundingClientRect();
  return { x: r.left + W / 2, y: r.top };
}

/* ---------- interaction ---------- */
const MAX_SWING = 0.72; // keeps the bulb inside the canvas
function nudge(strength = 0.35) {
  sw.vx += (Math.random() < 0.5 ? -1 : 1) * strength;
  sw.vz += (Math.random() - 0.5) * strength * 0.6;
  tw.v += (Math.random() - 0.5) * 4;
  wake();
}
window.addEventListener('bulb:nudge', () => nudge(0.5));

btn.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  e.preventDefault();
  btn.setPointerCapture(e.pointerId);
  btn.classList.add('is-dragging');
  const a = anchor();
  const dx = e.clientX - a.x, dy = e.clientY - a.y;
  drag = {
    id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: performance.now(), moved: false,
    angOff: sw.x - Math.atan2(dx, dy), e0: pull.e,
    tx: sw.x, te: pull.e, lastX: e.clientX
  };
  wake();
});
btn.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 6) drag.moved = true;
  if (!drag.moved) return;
  const a = anchor();
  const dx = e.clientX - a.x, dy = Math.max(1, e.clientY - a.y);
  drag.tx = THREE.MathUtils.clamp(Math.atan2(dx, dy) + drag.angOff, -MAX_SWING, MAX_SWING);
  // only a mostly vertical pull stretches the cord; sideways moves just swing the bulb
  const down = (e.clientY - drag.y0) - 1.2 * Math.abs(e.clientX - drag.x0);
  drag.te = THREE.MathUtils.clamp(drag.e0 + down / S, -8, 38);
  tw.v += (e.clientX - drag.lastX) * 0.04;
  drag.lastX = e.clientX;
  wake();
});
function release(e, cancelled) {
  if (!drag || e.pointerId !== drag.id) return;
  const tap = !drag.moved && performance.now() - drag.t0 < 500;
  const pulled = drag.moved && pull.e > 20;
  drag = null;
  btn.classList.remove('is-dragging');
  if (cancelled) return;
  if (tap) { nudge(0.28); theme.toggle(); }
  else if (pulled) theme.toggle();
  wake();
}
btn.addEventListener('pointerup', (e) => release(e, false));
btn.addEventListener('pointercancel', (e) => release(e, true));
btn.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && !drag) nudge(0.12); });

/* ---------- simulation ---------- */
const K_SWING = 15.5, DAMP = reduceMotion ? 3 : 0.5;
function step(dt) {
  if (drag) {
    const k = 1 - Math.exp(-dt * 22);
    const px = sw.x, pe = pull.e;
    sw.x += (drag.tx - sw.x) * k;
    pull.e += (drag.te - pull.e) * k;
    sw.vx = (sw.x - px) / dt;
    pull.v = (pull.e - pe) / dt;
    sw.vz += (-K_SWING * Math.sin(sw.z) - 2 * sw.vz) * dt;
    sw.z += sw.vz * dt;
  } else {
    sw.vx += (-K_SWING * Math.sin(sw.x) - DAMP * sw.vx) * dt;
    sw.vz += (-K_SWING * Math.sin(sw.z) - DAMP * 1.6 * sw.vz) * dt;
    sw.x += sw.vx * dt;
    sw.z += sw.vz * dt;
    pull.v += (-240 * pull.e - 13 * pull.v) * dt;
    pull.e += pull.v * dt;
  }
  tw.v += (-7 * tw.a - 1.1 * tw.v) * dt;
  tw.a += tw.v * dt;

  const target = theme.get() === 'dark' ? 1 : 0;
  // the filament warms up quickly and cools down slowly, like tungsten
  power += (target - power) * (1 - Math.exp(-dt * (target === 1 ? 9 : 3.2)));
}

function place() {
  pivot.rotation.set(sw.z, 0, sw.x);
  const len = CORD + pull.e;
  cord.scale.set(1, len, 1);
  hang.position.y = -len;
  hang.rotation.y = tw.a;
  applyPower(power);

  // keep the invisible button on top of the bulb
  pivot.updateMatrixWorld(true);
  const c = toCanvas(GLASS_TOP - 46);
  btn.style.transform = 'translate(' + (c.x - btn.offsetWidth / 2) + 'px,' + (c.y - btn.offsetHeight / 2) + 'px) rotate(' + (-sw.x) + 'rad)';
}

/* ---------- loop (sleeps when everything is at rest) ---------- */
let raf = 0, last = 0;
function settled() {
  const target = theme.get() === 'dark' ? 1 : 0;
  return !drag &&
    Math.abs(sw.x) + Math.abs(sw.vx) + Math.abs(sw.z) + Math.abs(sw.vz) < 2e-4 &&
    Math.abs(pull.e) + Math.abs(pull.v) < 0.02 &&
    Math.abs(tw.a) + Math.abs(tw.v) < 2e-4 &&
    Math.abs(power - target) < 0.002;
}
function frame(now) {
  raf = 0;
  const dt = Math.min(0.033, (now - last) / 1000 || 0.016);
  last = now;
  // sub-steps keep the spring stable on slow frames
  for (let i = 0; i < 3; i++) step(dt / 3);
  place();
  renderer.render(scene, camera);
  if (!settled() && !document.hidden) raf = requestAnimationFrame(frame);
}
function wake() {
  if (raf || !W) return;
  last = performance.now();
  raf = requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });

canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  box.classList.remove('is-ready');
  box.classList.add('is-fallback');
});

resize();
place();
renderer.render(scene, camera);
box.classList.add('is-ready');
box.classList.remove('is-fallback');
wake();
