// A pin-tumbler cylinder lock, modelled so it works like the real thing.
//   const L = pinTumbler();  scene.add(L.group);  L.pose({ keyX, cuts, turn, cut, slice, xray, explode });
// Geometry (units: plug radius = 1): the lock's axis is x, its face is at x = 0 and it runs back to x = -4.
// The plug (brass) turns inside the housing (satin nickel). Five chambers at L.X hold, bottom to top: a key pin
// (brass, five different lengths), a driver pin (steel), a spring. The shear line is the plug's surface, y = L.S.
// The key's top edge is a real profile: every pin's tip rides on it as the key slides (pinHeight), so the right key
// lifts every key pin's top exactly to the shear line, and a wrong cut leaves a pin across it.
import * as THREE from 'three';
import { MAT, CAP, PAL, shadowed, cutaway, sectionFace, xrayable, xray, plane } from './kit.js';
import { spring } from './parts.js';
import { clamp, lerp } from './lib.js';

export const RP = 1.0, RH = 1.45, TW = 0.6, TTOP = 3.3, CTOP = 3.15, CR = 0.21, PR = 0.18, LEN = 4.0;
export const KW = 0.16, KW_BOT = -0.75, KW_TOP = 0.55, KW_END = -3.9;
export const X = [-0.6, -1.3, -2.0, -2.7, -3.4];             // chamber centres (x), front to back
export const S = RP;                                          // the shear line (top of the plug)
export const KEY_PINS = [0.75, 0.95, 0.65, 1.05, 0.85];        // key pin lengths, front to back
export const DRIVER = 0.9, REST = -0.25;                      // driver pin length · key pin tip height with no key
export const FULL = -3.75;                                    // key tip x when the key is all the way in
export const CORRECT = KEY_PINS.map((k) => +(S - k).toFixed(3)); // the right key's cut heights under each pin
const BLADE_BOT = -0.7, PEAK = 0.5, SHOULDER = -FULL;          // blade bottom · tallest bump · u where the bow starts

/** the key's top edge as [u, y] points (u = distance from the tip), for cut heights cuts[i] under pin i */
export function keyEdge(cuts = CORRECT) {
  const us = X.map((x) => x - FULL), order = us.map((u, i) => [u, cuts[i]]).sort((a, b) => a[0] - b[0]);
  const pts = [[0, -0.32]];
  order.forEach(([u, c], j) => {
    pts.push([u - 0.05, c], [u + 0.05, c]);
    const nx = order[j + 1];
    if (nx) pts.push([(u + nx[0]) / 2, Math.min(PEAK, Math.max(c, nx[1]) + 0.2)]);
    else pts.push([u + 0.27, PEAK]);
  });
  pts.push([SHOULDER + 0.25, PEAK]);
  return pts;
}
/** the key's top edge height at u (linear between profile points); below the tip / past the blade → null */
export function edgeAt(pts, u) {
  if (u < 0 || u > pts[pts.length - 1][0]) return null;
  for (let i = 1; i < pts.length; i++) if (u <= pts[i][0]) { const [u0, y0] = pts[i - 1], [u1, y1] = pts[i]; return lerp(y0, y1, (u - u0) / ((u1 - u0) || 1)); }
  return null;
}
/** where pin i's key pin tip sits when the key tip is at keyX (pure geometry: the tip rides the key's edge) */
export function pinHeight(i, keyX, pts) { const y = keyX == null ? null : edgeAt(pts, X[i] - keyX); return y == null ? REST : Math.max(REST, y); }

// ── profiles (in the lock's cross-section: s = z, y), extruded along -x ──
const arc = (r, a0, a1, n = 28) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [-Math.sin(a) * r, Math.cos(a) * r]; });
function plugProfile(chamber, keyway) {
  const a0 = chamber ? Math.asin(CR / RP) : 0, pts = arc(RP, a0, Math.PI);
  if (keyway) pts.push([0, KW_BOT], [-KW, KW_BOT], [-KW, KW_TOP], chamber ? [-CR, KW_TOP] : [0, KW_TOP]);
  if (!keyway && chamber) pts.push([-CR, KW_TOP]);
  return pts;
}
function housingProfile(chamber) {
  const yAt = Math.sqrt(RH * RH - TW * TW), aT = Math.asin(TW / RH), pts = [[0, TTOP], [-TW, TTOP], [-TW, yAt], ...arc(RH, aT, Math.PI).slice(1), [0, -RP]];
  const inner = arc(RP, Math.PI, chamber ? Math.asin(CR / RP) : 0).slice(1);
  pts.push(...inner);
  if (chamber) pts.push([-CR, CTOP], [0, CTOP]);
  return pts;
}
function extrudeSeg(pts, x0, x1, mat) {
  const sh = new THREE.Shape(pts.map(([s, y]) => new THREE.Vector2(s, y)));
  const geo = new THREE.ExtrudeGeometry(sh, { depth: x0 - x1, bevelEnabled: false, curveSegments: 4 });
  geo.rotateY(-Math.PI / 2); geo.translate(x0, 0, 0);
  return shadowed(new THREE.Mesh(geo, mat));
}
/** both halves of a body made of segments along x: [[x0, x1, profile], ...] → Group (back half z ≤ 0, mirrored front) */
function body(segs, mat) {
  const g = new THREE.Group(), back = new THREE.Group(), front = new THREE.Group();
  for (const [x0, x1, pts] of segs) { back.add(extrudeSeg(pts, x0, x1, mat)); front.add(extrudeSeg(pts, x0, x1, mat)); }
  front.scale.z = -1; g.add(back, front); g.userData.halves = { back, front };
  return g;
}
/** the section of a body in the plane z = 0: one hatched rectangle per run of a segment's profile lying on s = 0 */
function sideFaces(segs, cap) {
  const g = new THREE.Group();
  for (const [x0, x1, pts] of segs) {
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      if (Math.abs(a[0]) > 1e-6 || Math.abs(b[0]) > 1e-6 || Math.abs(a[1] - b[1]) < 1e-6) continue;
      const y0 = Math.min(a[1], b[1]), y1 = Math.max(a[1], b[1]), f = sectionFace(new THREE.PlaneGeometry(x0 - x1, y1 - y0), cap);
      f.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0.001); g.add(f);
    }
  }
  g.visible = false; return g;
}
/** the full end-on section of a body (both halves of a profile) at x, facing +x */
function sliceFace(pts, x, cap) {
  const g = new THREE.Group();
  for (const sgn of [1, -1]) {
    const geo = new THREE.ShapeGeometry(new THREE.Shape(pts.map(([s, y]) => new THREE.Vector2(s * sgn, y))), 4);
    geo.rotateY(Math.PI / 2); const f = sectionFace(geo, cap); f.position.x = x + 0.001; g.add(f);
  }
  return g;
}
function segments(make) {
  const edges = [0]; X.forEach((x) => edges.push(x + CR, x - CR)); edges.push(KW_END, -LEN);
  const out = [];
  for (let i = 0; i < edges.length - 1; i++) { const x0 = edges[i], x1 = edges[i + 1], mid = (x0 + x1) / 2, ch = X.some((x) => Math.abs(x - mid) < CR); out.push([x0, x1, make(ch, mid > KW_END)]); }
  return out;
}
const lathe = (pts, mat) => shadowed(new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 40), mat));
const keyPinGeo = (k) => [[0, 0], [0.05, 0.015], [0.13, 0.08], [PR, 0.13], [PR, k - 0.025], [PR - 0.02, k], [0, k]];
const driverGeo = (d) => [[0, 0], [PR - 0.02, 0], [PR, 0.025], [PR, d - 0.025], [PR - 0.02, d], [0, d]];

export function pinTumbler({ cuts = CORRECT } = {}) {
  const group = new THREE.Group();
  const hSegs = segments((ch) => housingProfile(ch)), pSegs = segments((ch, kw) => plugProfile(ch, kw));
  const housing = body(hSegs, MAT.satin());
  const rotor = new THREE.Group(), plug = body(pSegs, MAT.brass());
  rotor.add(plug); group.add(housing, rotor);
  // exact section faces: side (z = 0) and end-on slices through each chamber (x = X[i])
  const hSide = sideFaces(hSegs, CAP.steel), pSide = sideFaces(pSegs, CAP.brass); group.add(hSide); rotor.add(pSide);
  const hSlice = X.map((x) => { const f = sliceFace(housingProfile(true), x, CAP.steel); group.add(f); return f; });
  const pSlice = X.map((x) => { const f = sliceFace(plugProfile(true, true), x, CAP.brass); rotor.add(f); return f; });
  // pins + springs: key pins turn with the plug; drivers and springs stay in the housing
  const keyPins = KEY_PINS.map((k, i) => { const m = lathe(keyPinGeo(k), MAT.brass()); m.position.x = X[i]; rotor.add(m); return m; });
  const drivers = X.map((x) => { const m = lathe(driverGeo(DRIVER), MAT.steel()); m.position.x = x; group.add(m); return m; });
  const springs = X.map((x) => { const m = spring({ radius: 0.135, wire: 0.03, turns: 8, length: 1.4 }); m.position.x = x; group.add(m); return m; });
  // the key: blade (profile extruded) + bow with a hole
  const keyG = new THREE.Group(), keyMat = MAT.chrome(); keyMat.color.set('#D5DADF'); keyMat.roughness = 0.22;
  const blade = shadowed(new THREE.Mesh(new THREE.BufferGeometry(), keyMat)); keyG.add(blade);
  let bladeKey = '';
  const setCuts = (cs) => {
    const id = cs.join(','); if (id === bladeKey) return; bladeKey = id;
    const pts = keyEdge(cs), sh = new THREE.Shape();
    sh.moveTo(0, -0.32); for (const [u, y] of pts.slice(1)) sh.lineTo(u, y);
    sh.lineTo(SHOULDER + 0.5, PEAK); sh.lineTo(SHOULDER + 0.5, BLADE_BOT); sh.lineTo(0.12, BLADE_BOT); sh.lineTo(0, -0.58); sh.closePath();
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 1 }); geo.translate(0, 0, -0.11);
    blade.geometry.dispose(); blade.geometry = geo; for (const c of blade.children) c.geometry = geo;   // the cut cap shares it
    keyG.userData.edge = pts;
  };
  { const bow = new THREE.Shape(), cx = SHOULDER + 1.25; bow.absellipse(cx, -0.05, 1.05, 1.2, 0, Math.PI * 2, false);
    bow.holes.push(new THREE.Path().absarc(cx + 0.45, -0.05, 0.24, 0, Math.PI * 2, true));
    const geo = new THREE.ExtrudeGeometry(bow, { depth: 0.26, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3, curveSegments: 48 }); geo.translate(0, 0, -0.13);
    keyG.add(shadowed(new THREE.Mesh(geo, keyMat))); }
  rotor.add(keyG);
  // the shear line: a thin glowing orange strip on the side cut, and a ring for end-on slices
  const shear = new THREE.Mesh(new THREE.BoxGeometry(LEN, 0.03, 0.01), MAT.glow(PAL.accent, 2.2)); shear.position.set(-LEN / 2, S, 0.004); shear.material.transparent = true; group.add(shear);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(S, 0.022, 8, 96), MAT.glow(PAL.accent, 2.2)); ring.rotation.y = Math.PI / 2; ring.material.transparent = true; group.add(ring);

  // sections: the bodies are cut in every section view; pins, springs and key only in end-on slices (side views keep them whole)
  const bodyCuts = [cutaway(housing, CAP.steel, { caps: false }), cutaway(plug, CAP.brass, { caps: false })];
  const pinCuts = [...keyPins.map((m) => cutaway(m, CAP.brass)), ...drivers.map((m) => cutaway(m, CAP.steel)), ...springs.map((m) => cutaway(m, CAP.dark)), cutaway(keyG, CAP.steel)];
  setCuts(cuts);
  xrayable(housing); xrayable(plug);
  const parts = { housing, plug, rotor, key: keyG, keyPins, drivers, springs, shear, ring };
  const smooth = (x) => x * x * (3 - 2 * x), stag = (k, a) => smooth(clamp((k - a * 0.35) / (1 - a * 0.35)));
  const L = {
    group, parts, X, S, CORRECT,
    /** the stack heights for a key at keyX with these cuts → [{ tip, keyTop, driverTop }] per pin */
    stacks(keyX, cs = CORRECT) { const pts = keyEdge(cs); return X.map((_, i) => { const tip = pinHeight(i, keyX, pts), top = tip + KEY_PINS[i]; return { tip, keyTop: top, driverTop: top + DRIVER, set: Math.abs(top - S) < 0.01 }; }); },
    /**
     * pose everything. keyX: key tip x (FULL = all the way in, ≥ 1.5 = out of the lock; null = no key) · cuts · turn (rad, plug)
     * · cut: 'none' │ 'side' (section through the pins, seen from +z) │ 'slice' (end-on section through chamber `slice`)
     * · xray 0..1 (housing + plug to glass) · explode 0..1 · shearGlow 0..1
     */
    pose({ keyX = null, cuts: cs = CORRECT, turn = 0, cut = 'none', slice = 2, xray: xk = 0, explode: ek = 0, shearGlow = 0, keyVisible = keyX != null } = {}) {
      setCuts(cs); keyG.visible = keyVisible; keyG.position.x = keyX ?? 4;
      // exploded view: the plug (with its key pins) slides out the back; drivers and springs lift out of the housing
      rotor.position.set(-5.2 * stag(ek, 0), 0, 0); rotor.rotation.x = turn;
      L.stacks(keyVisible ? keyX : null, cs).forEach((s, i) => {
        keyPins[i].position.set(X[i], s.tip - 2.4 * stag(ek, 0.3 + i * 0.05), 0);
        drivers[i].position.set(X[i], s.driverTop - DRIVER + 3.0 * stag(ek, 0.2 + i * 0.05), 0);
        springs[i].position.set(X[i], s.driverTop + 4.6 * stag(ek, 0.1 + i * 0.05), 0);
        springs[i].setLength(lerp(CTOP - s.driverTop, 1.45, stag(ek, 0.1 + i * 0.05)));
      });
      const planes = cut === 'side' ? [plane([0, 0, -1], 0.002)] : cut === 'slice' ? [plane([-1, 0, 0], -X[slice])] : null;
      bodyCuts.forEach((c) => c.set(planes)); pinCuts.forEach((c) => c.set(cut === 'slice' ? planes : null));
      hSide.visible = pSide.visible = cut === 'side';
      hSlice.forEach((f, i) => { f.visible = cut === 'slice' && i === slice; }); pSlice.forEach((f, i) => { f.visible = cut === 'slice' && i === slice; });
      xray(housing, xk); xray(plug, xk * 0.85);
      shear.visible = cut === 'side' && shearGlow > 0; shear.material.opacity = clamp(shearGlow);
      ring.visible = cut === 'slice' && shearGlow > 0; ring.material.opacity = clamp(shearGlow); ring.position.x = X[slice] + 0.004;
      return L;
    },
  };
  return L.pose();
}

/** the ancient Egyptian pin lock (for the history beat): a wooden bolt held by pins that drop from a staple above */
export function egyptianLock() {
  const g = new THREE.Group(), wood = MAT.wood(), dark = MAT.wood(); dark.color.set('#7A5230');
  const bolt = shadowed(new THREE.Mesh(new THREE.BoxGeometry(5, 0.7, 0.8), wood)); g.add(bolt);
  const staple = shadowed(new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.6, 1.3), dark)); staple.position.set(0.4, 0.75, 0); g.add(staple);
  const pins = [-0.2, 0.4, 1.0].map((x) => { const p = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.0, 20), MAT.wood())); p.position.set(x, 0.4, 0); g.add(p); return p; });
  const key = new THREE.Group(), kb = shadowed(new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.22, 0.36), wood)); key.add(kb);
  [-0.2, 0.4, 1.0].forEach((x) => { const peg = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.3, 14), dark)); peg.position.set(x - 0.4 + 1.6 - 1.6, 0.22, 0); key.add(peg); });
  g.add(key);
  g.parts = { bolt, staple, pins, key };
  /** lift 0..1 raises the key (and the pins) · slide moves the bolt open */
  g.set = (lift = 0, slide = 0) => { key.position.set(0.4, -0.15 + lift * 0.5, 0); pins.forEach((p) => { p.position.y = 0.4 + lift * 0.5; }); bolt.position.x = -slide * 1.4; return g; };
  return g.set();
}
