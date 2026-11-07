// Mechanism parts: modelled from real engineering geometry, so they move correctly.
//   gear({ teeth, module })        involute spur gear (20° pressure angle), axis = its local z
//   mesh(a, b, angleA, dir)        place gear b against gear a and turn it by the exact ratio (teeth interlock)
//   spring({ radius, wire, turns }) coil spring along +y; .setLength(L) recoils it (wire keeps its round section)
//   piston({ crank, rod, bore })   crank-slider: .set(θ) turns the crank; the piston follows the exact geometry
//   cam({ base, lift })            egg cam + flat follower: .set(θ) lifts the follower by the cam's true profile
//   flow(points, { kind })         chevrons streaming along a path: air, water, current, heat, oil
//   turnArrow(r, arc, colour)      a curved arrow showing which way something turns
import * as THREE from 'three';
import { MAT, PAL, shadowed } from './kit.js';
import { clamp } from './lib.js';

const TAU = Math.PI * 2;
const inv = (a) => Math.tan(a) - a;

// ── gears ────────────────────────────────────────────────────────────────
/** the outline of an involute spur gear in its plane: [[x, y], ...] */
export function gearOutline(z, m, pa = 20 * Math.PI / 180, steps = 6) {
  const r = m * z / 2, rb = r * Math.cos(pa), ra = r + m, rf = Math.max(r - 1.25 * m, 0.2 * r);
  const half = (rho) => Math.PI / (2 * z) + inv(pa) - inv(Math.acos(Math.min(1, rb / Math.max(rho, rb))));
  const r0 = Math.max(rb, rf), pts = [];
  for (let k = 0; k < z; k++) {
    const c = k * TAU / z;
    pts.push([rf * Math.cos(c - half(r0)), rf * Math.sin(c - half(r0))]);
    for (let i = 0; i <= steps; i++) { const rho = r0 + (ra - r0) * i / steps, a = c - half(rho); pts.push([rho * Math.cos(a), rho * Math.sin(a)]); }
    for (let i = steps; i >= 0; i--) { const rho = r0 + (ra - r0) * i / steps, a = c + half(rho); pts.push([rho * Math.cos(a), rho * Math.sin(a)]); }
    pts.push([rf * Math.cos(c + half(r0)), rf * Math.sin(c + half(r0))]);
    const n = c + TAU / z - half(r0), a0 = c + half(r0);                       // root arc to the next tooth
    for (let i = 1; i < 4; i++) { const a = a0 + (n - a0) * i / 4; pts.push([rf * Math.cos(a), rf * Math.sin(a)]); }
  }
  return { pts, r, ra, rf };
}
/**
 * a spur gear. teeth z, module m (pitch radius = m·z/2), width along z, bore radius, spokes (0 = solid web).
 * Returns a Group (spin it with .rotation.z) with .userData { z, m, r }.
 */
export function gear({ teeth = 20, module: m = 0.1, width = 0.3, bore = null, spokes = null, mat = MAT.steel(), hub = true } = {}) {
  const { pts, r, rf } = gearOutline(teeth, m);
  const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const b = bore ?? Math.max(0.06, r * 0.12);
  sh.holes.push(new THREE.Path().absarc(0, 0, b, 0, TAU, true));
  const nsp = spokes ?? (teeth >= 24 ? 5 : 0);
  if (nsp) {                                                                     // lightening windows between spokes
    const ri = b * 2.2 + 0.03, ro = rf - Math.max(m * 1.2, 0.05), gap = 0.5 / nsp * TAU * 0.28;
    if (ro - ri > 0.08) for (let i = 0; i < nsp; i++) {
      const a0 = i * TAU / nsp + gap, a1 = (i + 1) * TAU / nsp - gap, hp = new THREE.Path();
      hp.absarc(0, 0, ro, a0, a1, false); hp.absarc(0, 0, ri, a1, a0, true); hp.closePath(); sh.holes.push(hp);
    }
  }
  const geo = new THREE.ExtrudeGeometry(sh, { depth: width, bevelEnabled: true, bevelThickness: Math.min(0.02, width * 0.08), bevelSize: Math.min(0.012, m * 0.12), bevelSegments: 2, curveSegments: 24 });
  geo.translate(0, 0, -width / 2);
  const g = new THREE.Group(), body = shadowed(new THREE.Mesh(geo, mat)); g.add(body);
  if (hub) { const h = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(b * 2.1, b * 2.1, width * 1.35, 40, 1), mat)); h.rotation.x = Math.PI / 2; g.add(h);
    const hole = new THREE.Mesh(new THREE.CylinderGeometry(b, b, width * 1.4, 32, 1, true), MAT.darkSteel()); hole.material.side = THREE.BackSide; hole.rotation.x = Math.PI / 2; g.add(hole); }
  g.userData = { z: teeth, m, r };
  return g;
}
/**
 * mesh gear b with gear a: b sits on the line at angle `dir` (radians, in a's plane) from a's centre, at the exact
 * centre distance (r_a + r_b), and turns at -z_a/z_b of a's angle with its teeth in a's gaps. Same module required.
 * Call it every frame after setting a.rotation.z. Works in a's parent space (gears share a plane, axis z).
 */
export function mesh(a, b, dir = 0) {
  const A = a.userData, B = b.userData, d = A.r + B.r;
  b.position.set(a.position.x + d * Math.cos(dir), a.position.y + d * Math.sin(dir), a.position.z);
  b.rotation.z = -(A.z / B.z) * (a.rotation.z - dir) + dir + Math.PI + Math.PI / B.z;
  return b;
}
/** the angle of the last gear in a train for an input angle: ratio = product of (driver teeth / driven teeth), sign alternates */
export const trainRatio = (teeth) => teeth.slice(1).reduce((acc, z, i) => acc * -(teeth[i] / z), 1);

// ── springs ──────────────────────────────────────────────────────────────
/**
 * a compression spring along +y from y = 0 to y = length. Closed (flat) end coils, round wire at every length.
 * .setLength(L) rebuilds the vertex positions (pure: same L → same mesh).
 */
export function spring({ radius = 0.15, wire = 0.03, turns = 8, length = 1, mat = MAT.darkSteel(), seg = 28, rad = 8 } = {}) {
  const N = Math.round(turns * seg), pos = new Float32Array((N + 1) * (rad + 1) * 3), nor = new Float32Array(pos.length), idx = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < rad; j++) { const a = i * (rad + 1) + j, b = a + rad + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const geo = new THREE.BufferGeometry(); geo.setIndex(idx);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  const m = shadowed(new THREE.Mesh(geo, mat)); m.frustumCulled = false;
  const c = new THREE.Vector3(), tg = new THREE.Vector3(), n1 = new THREE.Vector3(), n2 = new THREE.Vector3();
  m.setLength = (L) => {
    const closed = 1.0;                                                        // one closed turn at each end
    const yOf = (u) => {                                                       // u in turns 0..turns → height
      const active = Math.max(0.01, turns - 2 * closed), lo = wire, hi = Math.max(lo + 0.001, L - wire), pitchA = (hi - lo - 2 * closed * wire * 1.05) / active;
      if (u < closed) return lo + u * wire * 1.05;
      if (u > turns - closed) return hi - (turns - u) * wire * 1.05;
      return lo + closed * wire * 1.05 + (u - closed) * pitchA;
    };
    for (let i = 0; i <= N; i++) {
      const u = i / seg, a = u * TAU, y = yOf(u), y2 = yOf(Math.min(turns, u + 0.01)), y1 = yOf(Math.max(0, u - 0.01));
      c.set(radius * Math.cos(a), y, radius * Math.sin(a));
      tg.set(-Math.sin(a) * radius * TAU * 0.02, y2 - y1, Math.cos(a) * radius * TAU * 0.02).normalize();
      n1.set(Math.cos(a), 0, Math.sin(a)); n2.crossVectors(tg, n1).normalize(); n1.crossVectors(n2, tg).normalize();
      for (let j = 0; j <= rad; j++) {
        const b = j / rad * TAU, cx = Math.cos(b), sx = Math.sin(b), k = (i * (rad + 1) + j) * 3;
        const nx = n1.x * cx + n2.x * sx, ny = n1.y * cx + n2.y * sx, nz = n1.z * cx + n2.z * sx;
        pos[k] = c.x + nx * wire; pos[k + 1] = c.y + ny * wire; pos[k + 2] = c.z + nz * wire; nor[k] = nx; nor[k + 1] = ny; nor[k + 2] = nz;
      }
    }
    geo.attributes.position.needsUpdate = true; geo.attributes.normal.needsUpdate = true; geo.computeBoundingSphere();
    return m;
  };
  return m.setLength(length);
}

// ── crank-slider (piston) ────────────────────────────────────────────────
/** piston height above the crank centre for crank angle θ (0 = top dead centre): r·cosθ + √(l² − r²·sin²θ) */
export const pistonY = (r, l, th) => r * Math.cos(th) + Math.sqrt(l * l - (r * Math.sin(th)) ** 2);
/**
 * a single-cylinder crank, rod and piston in the xy-plane (cylinder axis +y, crank axis z). crank = throw radius r,
 * rod = rod length l (centre to centre), bore = piston diameter. .set(θ) poses it; .parts = { crank, rod, piston, cylinder }.
 */
export function piston({ crank: r = 0.5, rod: l = 1.6, bore = 1.0, mat = MAT.steel(), pistonMat = MAT.satin(), cylinderMat = MAT.glass() } = {}) {
  const g = new THREE.Group();
  const web = new THREE.Shape(); web.absarc(0, 0, r * 0.75, 0, Math.PI, true); web.absarc(0, r, r * 0.38, Math.PI, 0, true);   // counterweight below, pin boss above
  const crankArm = new THREE.Group();
  const cw = shadowed(new THREE.Mesh(new THREE.ExtrudeGeometry(web, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 }), MAT.darkSteel())); cw.position.z = -0.08; cw.rotation.z = 0; crankArm.add(cw);
  const pin = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.22, r * 0.22, 0.42, 24), mat)); pin.rotation.x = Math.PI / 2; pin.position.set(0, r, 0.12); crankArm.add(pin);
  const shaft = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.26, r * 0.26, 0.7, 24), mat)); shaft.rotation.x = Math.PI / 2; shaft.position.z = -0.2; crankArm.add(shaft);
  g.add(crankArm);
  const rodG = new THREE.Group(), rodBar = shadowed(new THREE.Mesh(new THREE.BoxGeometry(r * 0.32, l, 0.12), mat)); rodBar.position.y = l / 2; rodG.add(rodBar);
  for (const y of [0, l]) { const e = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.36, r * 0.36, 0.14, 28), mat)); e.rotation.x = Math.PI / 2; e.position.y = y; rodG.add(e); }
  rodG.position.z = 0.24; g.add(rodG);
  const pst = new THREE.Group(), ph = bore * 0.8;
  const body = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(bore / 2, bore / 2, ph, 48), pistonMat)); body.position.y = ph * 0.25; pst.add(body);
  for (let i = 0; i < 3; i++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(bore / 2, 0.012, 6, 48), MAT.darkSteel()); ring.rotation.x = Math.PI / 2; ring.position.y = ph * 0.25 + ph * 0.42 - i * 0.07; pst.add(ring); }
  pst.position.z = 0.24; g.add(pst);
  // the cylinder: from just below the piston's lowest skirt (bottom dead centre) to above its crown at top dead centre
  const yLo = l - r + ph * 0.25 - ph / 2, yHi = l + r + ph * 0.25 + ph / 2 + 0.25, cylH = yHi - yLo;
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(bore / 2 + 0.03, bore / 2 + 0.03, cylH, 48, 1, true), cylinderMat);
  cyl.position.set(0, (yLo + yHi) / 2, 0.24); g.add(cyl);
  g.set = (th) => {
    crankArm.rotation.z = -th;                                                  // crank pin at (r·sinθ, r·cosθ)
    const px = r * Math.sin(th), py = r * Math.cos(th), Y = pistonY(r, l, th);
    rodG.position.x = px; rodG.position.y = py; rodG.rotation.z = Math.atan2(px, Y - py);
    pst.position.y = Y; return g;
  };
  g.parts = { crank: crankArm, rod: rodG, piston: pst, cylinder: cyl };
  g.dims = { r, l, bore, cylTop: cyl.position.y + cylH / 2 };
  return g.set(0);
}

// ── cam + flat follower ─────────────────────────────────────────────────
/** egg-shaped cam outline: base circle radius `base`, nose lifting `lift` over `dwell` of the turn */
export function camOutline(base = 0.5, lift = 0.3, open = 0.42, n = 180) {
  const pts = [];
  for (let i = 0; i < n; i++) { const a = i / n * TAU, d = Math.min(Math.abs(a - Math.PI / 2), TAU - Math.abs(a - Math.PI / 2)), k = clamp(1 - d / (open * Math.PI)), rr = base + lift * (0.5 - 0.5 * Math.cos(Math.PI * k)); pts.push([rr * Math.cos(a), rr * Math.sin(a)]); }
  return pts;
}
/** a cam on a shaft (axis z) with a flat follower above it (axis y). .set(θ) turns the cam; follower lift is exact. */
export function cam({ base = 0.5, lift = 0.3, open = 0.42, width = 0.3, mat = MAT.steel(), followerMat = MAT.brass() } = {}) {
  const g = new THREE.Group(), pts = camOutline(base, lift, open);
  const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ExtrudeGeometry(sh, { depth: width, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 }); geo.translate(0, 0, -width / 2);
  const lobe = shadowed(new THREE.Mesh(geo, mat)), sh2 = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(base * 0.28, base * 0.28, width * 3, 24), mat)); sh2.rotation.x = Math.PI / 2;
  const rot = new THREE.Group(); rot.add(lobe, sh2); g.add(rot);
  const fol = new THREE.Group(), foot = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(base * 0.55, base * 0.55, 0.08, 40), followerMat)); foot.position.y = 0.04;
  const stem = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.4, 20), followerMat)); stem.position.y = 0.74; fol.add(foot, stem); g.add(fol);
  g.set = (th) => {
    rot.rotation.z = th; let top = -Infinity; const c = Math.cos(th), s = Math.sin(th);
    for (const [x, y] of pts) top = Math.max(top, x * s + y * c);                // highest point of the turned outline
    fol.position.y = top; g.lift = top - base; return g;
  };
  g.parts = { cam: rot, follower: fol };
  return g.set(0);
}

// ── flow arrows ─────────────────────────────────────────────────────────
export const FLOW = { air: PAL.air, water: PAL.water, current: PAL.current, heat: PAL.heat, oil: '#E0A030', fuel: '#9BE36A' };
/**
 * chevrons streaming along a path. points = [[x,y,z], ...] (smooth curve through them), kind = air│water│current│heat│oil│fuel.
 * .update(t, amount 0..1) moves them (speed in units per second); they shrink in at the start and out at the end.
 */
export function flow(points, { kind = 'air', count = 14, size = 0.12, speed = 1.2, glow = 1.6 } = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), len = curve.getLength();
  const sh = new THREE.Shape(); sh.moveTo(0, 0.5); sh.lineTo(0.55, 0); sh.lineTo(0, -0.5); sh.lineTo(-0.2, -0.5); sh.lineTo(0.3, 0); sh.lineTo(-0.2, 0.5); sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.18, bevelEnabled: false }); geo.translate(0, 0, -0.09); geo.rotateY(-Math.PI / 2); // points along +z
  const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(FLOW[kind] || kind).multiplyScalar(glow), toneMapped: false, transparent: true });
  const inst = new THREE.InstancedMesh(geo, mat, count); inst.frustumCulled = false; inst.userData.noCut = true;
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), tg = new THREE.Vector3(), sc = new THREE.Vector3(), Z = new THREE.Vector3(0, 0, 1);
  inst.update = (t, amount = 1) => {
    for (let i = 0; i < count; i++) {
      const u = ((i / count + t * speed / len) % 1 + 1) % 1, fade = Math.min(1, u / 0.12, (1 - u) / 0.12) * amount;
      curve.getPointAt(u, p); curve.getTangentAt(u, tg); q.setFromUnitVectors(Z, tg);
      sc.setScalar(size * Math.max(0.0001, fade)); M.compose(p, q, sc); inst.setMatrixAt(i, M);
    }
    inst.instanceMatrix.needsUpdate = true; inst.visible = amount > 0.001; return inst;
  };
  inst.curve = curve;
  return inst.update(0, 1);
}

/** a curved arrow (in the xy-plane, around z) showing a turning direction. arc in radians, ccw positive. */
export function turnArrow(radius = 1, arc = 1.6, color = PAL.accent, tube = 0.035) {
  const g = new THREE.Group(), mat = MAT.glow(color, 1.4); mat.transparent = true;
  const body = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 10, 64, Math.abs(arc)), mat); g.add(body);
  const head = new THREE.Mesh(new THREE.ConeGeometry(tube * 3, tube * 7, 20), mat), a = Math.abs(arc);
  head.position.set(radius * Math.cos(a), radius * Math.sin(a), 0); head.rotation.z = a; g.add(head);
  if (arc < 0) g.scale.y = -1;
  g.userData.noCut = true; g.traverse((m) => { m.userData.noCut = true; });
  g.setAmount = (k) => { mat.opacity = k; g.visible = k > 0.001; return g; };
  return g;
}
