// Mechanism kit (How It Ticks): the studio, the materials, and the tools every episode uses:
//   studio(E)                       graphite cyclorama, soft-box key with a soft shadow, cool fill, white rim
//   MAT.steel() / brass() / …       machined-part materials (new material per call, so parts can ghost on their own)
//   cutaway(root, plane)            section any closed part: clips it and fills the cut with a hatched cap
//   xray(root, k)                   ghost a part to blueprint glass (0 solid … 1 glass), so the insides show
//   explode(items, k)               fly parts apart along their own directions and back (k 0 together … 1 apart)
//   orbit(cam, target, dist, az, el), shoot(E, scene, cam, look), screen(v, cam), slowmo(lt, a, b, rate)
// Units: 1 = one "part unit" (a lock plug is 1 in radius). Everything is a pure function of the values you pass.
import * as THREE from 'three';
import { SHADOW } from './engine.js';
import { W, H, clamp } from './lib.js';

export const PAL = {
  backdrop: '#1D2128', floor: '#2A2F37', ink: '#0E1013', white: '#F4F5F7',
  steel: '#B9C0C8', darkSteel: '#5A616B', chrome: '#E9EDF1', brass: '#D9AE5F', copper: '#C8794A',
  accent: '#FF7A1A', xray: '#7FD8FF', red: '#E8453C', green: '#3FCF7E',
  air: '#DDF3FF', water: '#2E9BFF', current: '#FFC93C', heat: '#FF5A36',
  plastic: '#3B7DD8', rubber: '#202328', wood: '#A8733F', stone: '#C9B79A',
};
export const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
export const lerpV = (a, b, k) => a.clone().lerp(b, k);

// ── materials ────────────────────────────────────────────────────────────
const phys = (o) => new THREE.MeshPhysicalMaterial(o);
export const MAT = {
  steel: () => phys({ color: PAL.steel, metalness: 1, roughness: 0.32, envMapIntensity: 1.0 }),
  satin: () => phys({ color: '#C7CDD4', metalness: 1, roughness: 0.45 }),
  darkSteel: () => phys({ color: PAL.darkSteel, metalness: 1, roughness: 0.4 }),
  chrome: () => phys({ color: PAL.chrome, metalness: 1, roughness: 0.12 }),
  brass: () => phys({ color: PAL.brass, metalness: 1, roughness: 0.28 }),
  copper: () => phys({ color: PAL.copper, metalness: 1, roughness: 0.3 }),
  plastic: (c = PAL.plastic) => phys({ color: c, roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.25 }),
  rubber: () => phys({ color: PAL.rubber, roughness: 0.85 }),
  accent: () => phys({ color: PAL.accent, roughness: 0.35, emissive: PAL.accent, emissiveIntensity: 0.25 }),
  glass: () => phys({ color: '#DDEFFF', roughness: 0.05, transmission: 0, transparent: true, opacity: 0.18, depthWrite: false }),
  wood: () => phys({ color: PAL.wood, roughness: 0.75 }),
  glow: (c = PAL.accent, i = 2) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(i), toneMapped: false }),
};
export const shadowed = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };

// ── the studio ───────────────────────────────────────────────────────────
/** a seamless cyclorama (floor curving up into a back wall) with product lighting. floorY = where parts rest. */
export function studio(E, { floorY = -2, wallZ = -9, radius = 5, width = 60, target = [0, 0, 0], keyPos = [5, 9, 7], keyI = 260, backdrop = PAL.backdrop, floor = PAL.floor } = {}) {
  E.renderer.localClippingEnabled = true;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(backdrop); scene.fog = new THREE.Fog(backdrop, 22, 60);
  scene.environment = E.envMap; scene.environmentIntensity = 0.9;
  // profile: floor (z from +30 to wallZ + radius), quarter circle, wall up to 30
  const prof = [];
  for (let i = 0; i <= 20; i++) prof.push([30 - (30 - (wallZ + radius)) * i / 20, 0]);
  for (let i = 1; i <= 16; i++) { const a = i / 16 * Math.PI / 2; prof.push([wallZ + radius - Math.sin(a) * radius, radius - Math.cos(a) * radius]); }
  for (let i = 1; i <= 10; i++) prof.push([wallZ, radius + 25 * i / 10]);
  const geo = new THREE.PlaneGeometry(width, 1, 1, prof.length - 1), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const row = Math.round((0.5 - p.getY(i)) * (prof.length - 1)); p.setXYZ(i, p.getX(i), prof[row][1], prof[row][0]); }
  geo.computeVertexNormals();
  const cyc = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: floor, roughness: 0.92, side: THREE.DoubleSide }));
  cyc.position.y = floorY; cyc.receiveShadow = true; scene.add(cyc);
  // soft-box key (spot with a wide soft edge: makes the light pool on the floor), cool fill, white rim, sky bounce
  const key = new THREE.SpotLight('#FFF4E8', keyI, 0, 0.55, 0.85, 1.4);
  key.position.set(...keyPos); key.target.position.set(...target); key.castShadow = true;
  key.shadow.mapSize.set(SHADOW, SHADOW); key.shadow.bias = -0.0002; key.shadow.normalBias = 0.02; key.shadow.radius = 8;
  key.shadow.camera.near = 2; key.shadow.camera.far = 40;
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight('#BFD3FF', 0.55); fill.position.set(-6, 3, 4); scene.add(fill);
  const rim = new THREE.DirectionalLight('#FFFFFF', 1.6); rim.position.set(-3, 5, -7); scene.add(rim);
  scene.add(new THREE.HemisphereLight('#E8EEF8', '#20242B', 0.35));
  return { scene, key, fill, rim, cyc, floorY };
}

// ── cutaways: clip + hatched cap ────────────────────────────────────────
const CAP_VS = `#include <clipping_planes_pars_vertex>
void main(){ vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;
#include <clipping_planes_vertex>
}`;
const CAP_FS = `uniform vec3 uCol; uniform vec3 uLine; uniform float uScale;
#include <clipping_planes_pars_fragment>
void main(){
#include <clipping_planes_fragment>
  float s = mod((gl_FragCoord.x + gl_FragCoord.y) / uScale, 16.0); float l = 1.0 - smoothstep(2.2, 3.4, s);
  gl_FragColor = vec4(mix(uCol, uLine, l * 0.55), 1.0); }`;
/** the cut-face material: flat colour with 45° engineering hatching (screen space, so it stays crisp) */
export function capMaterial(col = '#E9DFC8', line = '#8A7A5C', side = THREE.BackSide) {
  return new THREE.ShaderMaterial({
    uniforms: { uCol: { value: new THREE.Color(col) }, uLine: { value: new THREE.Color(line) }, uScale: { value: 1 } },
    vertexShader: CAP_VS, fragmentShader: CAP_FS, side, clipping: true,
  });
}
/** an explicit section face (for bodies built from several pieces, where back-face caps would show the seams) */
export function sectionFace(geo, [col, line] = CAP.steel) { const m = new THREE.Mesh(geo, capMaterial(col, line, THREE.DoubleSide)); m.userData.noCut = true; m.userData.ghost = true; return m; }
export const CAP = { brass: ['#F0D9A8', '#A8823F'], steel: ['#DCE2E8', '#7D8894'], pin: ['#8D97A3', '#454D57'], key: ['#B4BDC7', '#5E6873'], dark: ['#6E7782', '#3A4048'], plastic: ['#9CC3F2', '#2F64B0'], red: ['#F6B0A8', '#B8332B'], wood: ['#E2C49A', '#8A6038'] };
/**
 * make every mesh under root cuttable: each gets a hatched back-face twin that fills the cut. Parts must be closed,
 * single-piece solids (a body glued from several pieces shows its seams: give it sectionFace()s and caps: false).
 * capCol = [fill, line] or a function(mesh) → [fill, line]. Returns { set(planes | null) }.
 */
export function cutaway(root, capCol = CAP.steel, { caps = true } = {}) {
  const pairs = [];
  root.traverse((m) => {
    if (!m.isMesh || m.userData.cap || m.userData.noCut) return;
    const [c, l] = typeof capCol === 'function' ? capCol(m) : capCol;
    const cap = new THREE.Mesh(m.geometry, capMaterial(c, l)); cap.userData.cap = true; cap.visible = false;
    if (caps) m.add(cap);
    pairs.push([m, cap]);
  });
  return {
    pairs,
    set(planes) {
      for (const [m, cap] of pairs) {
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        for (const mt of mats) { mt.clippingPlanes = planes; mt.clipShadows = true; mt.side = planes ? THREE.FrontSide : mt.side; }
        cap.material.clippingPlanes = planes; cap.visible = caps && !!planes && m.visible;
      }
    },
  };
}
/** a clipping plane keeping the side its normal points to, `at` units along the normal: plane([0,0,-1], 0.01) keeps z ≤ -0.01 */
export const plane = (n, at = 0) => new THREE.Plane(new THREE.Vector3(...n).normalize(), -at);

// ── x-ray ghosting ──────────────────────────────────────────────────────
/** fresnel glass: bright cyan edges, clear middle (additive) */
export function xrayMaterial(color = PAL.xray, strength = 1) {
  return new THREE.ShaderMaterial({
    uniforms: { uCol: { value: new THREE.Color(color) }, uS: { value: strength } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 uCol; uniform float uS; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0); gl_FragColor = vec4(uCol * (0.05 + f * 1.3) * uS, 1.0); }',
  });
}
/** prepare a part for x-ray (adds a ghost twin per mesh); then xray(root, k) blends it from solid (0) to glass (1) */
export function xrayable(root, color = PAL.xray) {
  const list = [];
  root.traverse((m) => {
    if (!m.isMesh || m.userData.cap || m.userData.ghost) return;
    const g = new THREE.Mesh(m.geometry, xrayMaterial(color, 0)); g.userData.ghost = true; g.userData.noCut = true; g.visible = false; g.renderOrder = 10; m.add(g);
    list.push([m, g]);
  });
  root.userData.xray = list; return root;
}
export function xray(root, k) {
  for (const [m, g] of root.userData.xray || []) {
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    for (const mt of mats) { mt.transparent = k > 0; mt.opacity = 1 - k; mt.depthWrite = k < 0.5; }
    m.castShadow = k < 0.5;
    g.visible = k > 0; g.material.uniforms.uS.value = k;
  }
}

/** light a part up (emissive) in a colour, k 0..1; call with 0 to switch it off. Skips caps and ghosts. */
export function glowPart(obj, k, color = PAL.accent) {
  obj.traverse((m) => {
    if (!m.isMesh || m.userData.cap || m.userData.ghost || !m.material.emissive) return;
    const mt = m.material; mt.userData.base ??= mt.color.clone();
    mt.color.copy(mt.userData.base).lerp(new THREE.Color(color), k * 0.75);   // tint (metal reflects its own colour)
    mt.emissive.set(color); mt.emissiveIntensity = k * 0.45;
  });
}

// ── exploded views ──────────────────────────────────────────────────────
/**
 * items: [{ obj, dir: [x,y,z] (offset when fully apart), spin?: [x,y,z] radians, at?: 0..1 stagger }]
 * Remembers each object's home position the first time. k 0 = assembled … 1 = fully apart.
 */
export function explode(items, k, ease = (x) => x) {
  for (const it of items) {
    const o = it.obj; o.userData.home ??= o.position.clone(); o.userData.homeRot ??= o.rotation.clone();
    const a = it.at ?? 0, e = ease(clamp((k - a * 0.35) / (1 - a * 0.35)));   // at > 0 starts later (staggered)
    o.position.copy(o.userData.home).add(new THREE.Vector3(...it.dir).multiplyScalar(e));
    if (it.spin) o.rotation.set(o.userData.homeRot.x + it.spin[0] * e, o.userData.homeRot.y + it.spin[1] * e, o.userData.homeRot.z + it.spin[2] * e);
  }
}

// ── camera + render ─────────────────────────────────────────────────────
export const LOOK = { aperture: 0.0012, maxblur: 0.006, bloom: 0.22, bloomThreshold: 0.92 };
/** put the camera on a sphere around target: az (rad, 0 = +z), el (rad, up), roll (rad) */
export function orbit(cam, target, dist, az, el, roll = 0) {
  const t = Array.isArray(target) ? V3(...target) : target;
  cam.position.set(t.x + dist * Math.cos(el) * Math.sin(az), t.y + dist * Math.sin(el), t.z + dist * Math.cos(el) * Math.cos(az));
  cam.up.set(Math.sin(roll), Math.cos(roll), 0); cam.lookAt(t); cam.up.set(0, 1, 0);
  return t;
}
/** render with the product look, focused on `target` */
export function shoot(E, scene, cam, target, look = {}) {
  const t = Array.isArray(target) ? V3(...target) : target;
  E.render(scene, cam, { ...LOOK, focus: cam.position.distanceTo(t), ...look });
}
/** the 2D screen point (1080x1920) of a 3D point */
export function screen(p, cam) { const v = (Array.isArray(p) ? V3(...p) : p.clone()).project(cam); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; }
/** a point on a part, in world space (for labels that follow moving parts) */
export const worldOf = (obj, local = [0, 0, 0]) => { obj.updateWorldMatrix(true, false); return V3(...local).applyMatrix4(obj.matrixWorld); };
/**
 * slow motion: shot time lt → mechanism time. Between a and b (shot seconds) the clock runs at `rate` (0.2 = 5x slower).
 * Continuous, so motion never jumps.
 */
export function slowmo(lt, a, b, rate) {
  if (lt <= a) return lt;
  if (lt <= b) return a + (lt - a) * rate;
  return a + (b - a) * rate + (lt - b);
}
