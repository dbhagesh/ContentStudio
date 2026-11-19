# studio3d: the generic helpers a project's blender/scene.py builds its plate with (run through boot.py).
# Everything that moves is a pure function of film time t (seconds): one frame handler evaluates the actors' clips
# (blended), their paths, the camera and any updaters, so every frame renders on its own and identically.
#
#   import studio3d as s3
#   T = s3.timing()                         narration timing: T.dur, T.line(i).start, T.word('cut').s
#   s3.reset(); s3.render_setup()
#   sun = s3.world_hdri(path, rot=-49)      HDRI sky (+ the direction of its sun) · s3.sun(sun, ...)
#   a = s3.Actor(s3.import_glb(path))       a rigged model: a.do(t, 'Run') · a.move(t, (x, y, z), yaw)
#   cam = s3.Camera(); cam.key(t, pos, look, lens=24)
#   s3.render_plate(shots=[...], cues=[...])    → <project>/plate/frames/000001.jpg… + plate.json
#   s3.Anchor('hero', height=1.5).key(t, (x, y, z))   a 2D actor's feet in the set: plate.json "actors" says where
#                                           they land on the film each frame (the template draws the actor there)
import json
import math
import os
import re

import bpy
import bmesh
from mathutils import Euler, Matrix, Quaternion, Vector

ARGS = {'project': '.', 'out': None, 'fps': 30, 'draft': False, 'frames': None, 'stills': None, 'paths': []}
UPDATERS = []  # f(t) called every frame, after actors and camera


def fps():
    return int(ARGS.get('fps') or 30)


def frame_of(t):
    return 1 + round(t * fps())


def t_of(frame):
    return (frame - 1) / fps()


# ───────────── easing / keyed tracks ─────────────
def smooth(u):
    u = min(1.0, max(0.0, u))
    return u * u * (3 - 2 * u)


EASE = {
    'smooth': smooth, 'linear': lambda u: min(1.0, max(0.0, u)),
    'in': lambda u: min(1.0, max(0.0, u)) ** 2, 'out': lambda u: 1 - (1 - min(1.0, max(0.0, u))) ** 2,
    'hold': lambda u: 0.0 if u < 1 else 1.0,
}


class Track:
    """values keyed in time; each key says how the segment that ends at it is eased"""

    def __init__(self):
        self.keys = []  # (t, tuple, ease)

    def key(self, t, value, ease='smooth'):
        self.keys.append((t, tuple(value), ease))
        self.keys.sort(key=lambda k: k[0])
        return self

    def __call__(self, t):
        k = self.keys
        if not k:
            return None
        if t <= k[0][0]:
            return k[0][1]
        for (t0, a, _), (t1, b, e) in zip(k, k[1:]):
            if t < t1:
                u = EASE[e]((t - t0) / (t1 - t0) if t1 > t0 else 1)
                return tuple(x + (y - x) * u for x, y in zip(a, b))
        return k[-1][1]


def noise(t, seed=0.0):
    return (math.sin(t * 2.1 + seed) + 0.6 * math.sin(t * 3.7 + seed * 2.3) + 0.3 * math.sin(t * 7.9 + seed * 5.1)) / 1.9


# ───────────── narration timing ─────────────
def _norm(w):
    return ''.join(c for c in w.lower() if c.isalnum() or c == "'")


class Line(dict):
    __getattr__ = dict.get


class Timing:
    def __init__(self, project):
        d = os.path.join(project, 'data')
        self.lines = [Line(x) for x in json.load(open(os.path.join(d, 'lines.json')))['lines']]
        self.words = [Line(x) for x in json.load(open(os.path.join(d, 'words.json')))]
        self.dur = json.load(open(os.path.join(d, 'lines.json')))['duration']

    def line(self, i):
        return self.lines[i]

    def word(self, text, line=None, nth=0):
        """the nth word matching text (optionally inside one line): has .s and .e in seconds"""
        hits = [w for w in self.words if _norm(w.w) == _norm(text) and (line is None or w.line == line)]
        if len(hits) <= nth:
            raise KeyError(f'word "{text}" (line {line}, #{nth}) is not in the narration')
        return hits[nth]


def timing():
    return Timing(ARGS['project'])


# ───────────── scene setup ─────────────
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    UPDATERS.clear()
    GROUP[0] = None
    Actor.ALL.clear()
    Anchor.ALL.clear()
    Camera.ACTIVE = None


def render_setup(width=1080, height=1920, samples=48, motion_blur=True, exposure=0.0, look='AgX - Punchy'):
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE'
    sc.render.resolution_x, sc.render.resolution_y = width, height
    sc.render.resolution_percentage = 50 if ARGS.get('draft') else 100
    sc.render.fps = fps()
    ee = sc.eevee
    ee.taa_render_samples = 16 if ARGS.get('draft') else samples
    ee.use_raytracing = True
    ee.use_shadows = True
    ee.use_fast_gi = True
    sc.render.use_motion_blur = motion_blur and not ARGS.get('draft')
    sc.render.motion_blur_shutter = 0.5
    sc.view_settings.view_transform = 'AgX'
    sc.view_settings.look = look
    sc.view_settings.exposure = exposure
    sc.render.image_settings.file_format = 'JPEG'
    sc.render.image_settings.quality = 92
    return sc


def world_hdri(path, rot=0.0, strength=1.0, tint=(1, 1, 1)):
    """an equirectangular HDRI sky rotated by rot degrees; returns the world direction towards its brightest point"""
    sc = bpy.context.scene
    img = bpy.data.images.load(path, check_existing=True)
    wd = bpy.data.worlds.new('Sky')
    sc.world = wd
    wd.use_nodes = True
    nt = wd.node_tree
    nt.nodes.clear()
    tc, mp, env = nt.nodes.new('ShaderNodeTexCoord'), nt.nodes.new('ShaderNodeMapping'), nt.nodes.new('ShaderNodeTexEnvironment')
    mix, bg, out = nt.nodes.new('ShaderNodeMix'), nt.nodes.new('ShaderNodeBackground'), nt.nodes.new('ShaderNodeOutputWorld')
    env.image = img
    mp.inputs['Rotation'].default_value = (0, 0, math.radians(rot))
    mix.data_type, mix.blend_type = 'RGBA', 'MULTIPLY'
    mix.inputs['Factor'].default_value = 1.0
    mix.inputs[7].default_value = (*tint, 1)
    bg.inputs[1].default_value = strength
    nt.links.new(tc.outputs['Generated'], mp.inputs[0])
    nt.links.new(mp.outputs[0], env.inputs[0])
    nt.links.new(env.outputs[0], mix.inputs[6])
    nt.links.new(mix.outputs[2], bg.inputs[0])
    nt.links.new(bg.outputs[0], out.inputs[0])
    return _sun_dir(img, rot)


def _sun_dir(img, rot):
    """the world direction towards an equirectangular image's brightest pixel, the image rotated by rot degrees"""
    import numpy as np
    w, h = img.size
    px = np.empty(w * h * 4, np.float32)
    img.pixels.foreach_get(px)
    lum = px.reshape(h, w, 4)[..., :3].sum(-1)
    j, i = np.unravel_index(int(np.argmax(lum)), lum.shape)
    az = ((i + 0.5) / w - 0.5) * 2 * math.pi - math.radians(rot)
    el = ((j + 0.5) / h - 0.5) * math.pi
    return Vector((-math.cos(el) * math.cos(az), math.cos(el) * math.sin(az), math.sin(el)))


# ───────────── groups (sets / locations) ─────────────
GROUP = [None]   # the collection new objects go into (None: the scene's)


def _link(o):
    (GROUP[0] or bpy.context.scene.collection).objects.link(o)


class group:
    """with s3.group('port'): everything made inside lands in collection 'port' (shown or hidden as one: stages())"""

    def __init__(self, name):
        sc = bpy.context.scene
        self.coll = bpy.data.collections.get(name) or bpy.data.collections.new(name)
        if self.coll.name not in sc.collection.children:
            sc.collection.children.link(self.coll)

    def __enter__(self):
        self.prev = GROUP[0]
        GROUP[0] = self.coll
        vl = bpy.context.view_layer
        self.prev_layer = vl.active_layer_collection
        vl.active_layer_collection = vl.layer_collection.children[self.coll.name]
        return self.coll

    def __exit__(self, *exc):
        GROUP[0] = self.prev
        bpy.context.view_layer.active_layer_collection = self.prev_layer


def stages(keys, on_change=None):
    """keys [(t, group name), ...]: from each t only that group renders (other groups hidden; ungrouped objects
    always render). on_change(name) runs when the stage changes, e.g. to switch the sky."""
    keys = sorted(keys)
    names = {n for _, n in keys}
    state = [None]

    def at(t):
        cur = keys[0][1]
        for t0, n in keys:
            if t >= t0:
                cur = n
        return cur

    def upd(t):
        cur = at(t)
        if cur == state[0]:
            return
        state[0] = cur
        for n in names:
            c = bpy.data.collections[n]
            if c.hide_render != (n != cur):
                c.hide_render = n != cur
        if on_change:
            on_change(cur)
    UPDATERS.append(upd)
    return at


def world_hdris(skies):
    """several HDRI skies in one world, one shown at a time: skies [{path, rot, strength, tint}]; returns (the sun
    direction of each, use(i))"""
    sc = bpy.context.scene
    wd = bpy.data.worlds.new('Skies')
    sc.world = wd
    wd.use_nodes = True
    nt = wd.node_tree
    nt.nodes.clear()
    tc, out = nt.nodes.new('ShaderNodeTexCoord'), nt.nodes.new('ShaderNodeOutputWorld')
    dirs, shaders = [], []
    for k in skies:
        img = bpy.data.images.load(k['path'], check_existing=True)
        rot = k.get('rot', 0.0)
        dirs.append(_sun_dir(img, rot))
        mp, env, mix, bg = (nt.nodes.new(x) for x in ('ShaderNodeMapping', 'ShaderNodeTexEnvironment', 'ShaderNodeMix', 'ShaderNodeBackground'))
        env.image = img
        mp.inputs['Rotation'].default_value = (0, 0, math.radians(rot))
        mix.data_type, mix.blend_type = 'RGBA', 'MULTIPLY'
        mix.inputs['Factor'].default_value = 1.0
        mix.inputs[7].default_value = (*k.get('tint', (1, 1, 1)), 1)
        bg.inputs[1].default_value = k.get('strength', 1.0)
        nt.links.new(tc.outputs['Generated'], mp.inputs[0])
        nt.links.new(mp.outputs[0], env.inputs[0])
        nt.links.new(env.outputs[0], mix.inputs[6])
        nt.links.new(mix.outputs[2], bg.inputs[0])
        shaders.append(bg)
    mixes = []
    cur = shaders[0].outputs[0]
    for sh in shaders[1:]:
        m = nt.nodes.new('ShaderNodeMixShader')
        nt.links.new(cur, m.inputs[1])
        nt.links.new(sh.outputs[0], m.inputs[2])
        mixes.append(m)
        cur = m.outputs[0]
    nt.links.new(cur, out.inputs[0])

    def use(i):
        for k, m in enumerate(mixes):     # mix k takes sky k+1 in place of everything before it
            m.inputs[0].default_value = 1.0 if i == k + 1 else 0.0
    use(0)
    return dirs, use


def _aim(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()


def sun(direction, energy=6.0, color=(1, 0.65, 0.4), min_elev=0.0, angle=1.5):
    """a sun lamp shining from direction (towards the sun); min_elev (degrees) lifts a low sun so decks get light"""
    d = Vector(direction).normalized()
    el = math.asin(max(-1, min(1, d.z)))
    if el < math.radians(min_elev):
        flat = Vector((d.x, d.y, 0)).normalized()
        e = math.radians(min_elev)
        d = Vector((flat.x * math.cos(e), flat.y * math.cos(e), math.sin(e)))
    lt = bpy.data.lights.new('Sun', 'SUN')
    lt.energy, lt.color, lt.angle = energy, color, math.radians(angle)
    o = bpy.data.objects.new('Sun', lt)
    _link(o)
    o.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    return o


def area_light(location, target, energy=150, size=3.0, color=(1, 1, 1)):
    lt = bpy.data.lights.new('Area', 'AREA')
    lt.energy, lt.size, lt.color = energy, size, color
    o = bpy.data.objects.new('Area', lt)
    _link(o)
    o.location = location
    _aim(o, target)
    return o


def ocean(color=(0.01, 0.08, 0.11), roughness=0.05, size=40, waves=0.9, choppiness=1.1, resolution=11, z=-0.3, speed=1.0):
    """an endless animated ocean (Ocean modifier, repeated tiles); its time follows film time"""
    bpy.ops.mesh.primitive_plane_add(size=2)
    o = bpy.context.object
    o.name = 'Ocean'
    m = o.modifiers.new('Ocean', 'OCEAN')
    m.geometry_mode = 'GENERATE'
    m.repeat_x = m.repeat_y = 10
    m.size, m.spatial_size, m.resolution = 1, size, resolution
    m.wave_scale, m.choppiness, m.wind_velocity = waves, choppiness, 9
    o.location = (-size * 5, -size * 5, z)
    mat = bpy.data.materials.new('Ocean')
    mat.use_nodes = True
    b = mat.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = roughness
    o.data.materials.append(mat)
    UPDATERS.append(lambda t: setattr(m, 'time', 3 + t * speed))
    return o


def empty(name='Empty', location=(0, 0, 0)):
    o = bpy.data.objects.new(name, None)
    _link(o)
    o.location = location
    return o


class Asset:
    def __init__(self, objects, actions):
        self.objects, self.actions = objects, actions
        roots = [o for o in objects if o.parent is None]
        self.root = roots[0] if len(roots) == 1 else empty('Group')
        if len(roots) != 1:
            for r in roots:
                r.parent = self.root
        self.armature = next((o for o in objects if o.type == 'ARMATURE'), None)

    def meshes(self):
        return [o for o in self.objects if o.type == 'MESH']

    def hide(self, *prefixes):
        for o in self.objects:
            if any(o.name.startswith(p) for p in prefixes):
                o.hide_render = o.hide_viewport = True
        return self


def import_glb(path, hide=('Icosphere',)):
    bpy.context.scene.frame_set(1)   # the importer poses the rig at the current frame of its first action
    before_o, before_a = set(bpy.data.objects), set(bpy.data.actions)
    bpy.ops.import_scene.gltf(filepath=path)
    a = Asset([o for o in bpy.data.objects if o not in before_o], [x for x in bpy.data.actions if x not in before_a])
    return a.hide(*hide)


def cut_box(obj, boxes):
    """delete the mesh vertices inside world-space boxes ((x0, y0, z0), (x1, y1, z1)), e.g. props baked into a set"""
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    M = obj.matrix_world
    kill = [v for v in bm.verts if any(all(b[0][i] <= (M @ v.co)[i] <= b[1][i] for i in range(3)) for b in boxes)]
    bmesh.ops.delete(bm, geom=kill, context='VERTS')
    bm.to_mesh(obj.data)
    bm.free()


def split_mesh(obj, test, name='Part', pivot=None):
    """move the faces that pass test(corners) (their corners in world space) into a new object, e.g. a chest's lid
    (test=lambda c: max(p.z for p in c) > seam); the part is parented to obj with its origin at pivot (world), so it
    can hinge there"""
    bpy.context.view_layer.update()
    M = obj.matrix_world
    part = obj.copy()
    part.data = obj.data.copy()
    part.name = name
    for o, keep in ((obj, False), (part, True)):
        bm = bmesh.new()
        bm.from_mesh(o.data)
        kill = [f for f in bm.faces if bool(test([M @ v.co for v in f.verts])) != keep]
        bmesh.ops.delete(bm, geom=kill, context='FACES')
        bm.to_mesh(o.data)
        bm.free()
    _link(part)
    part.parent = obj
    part.matrix_parent_inverse.identity()
    part.matrix_basis.identity()
    part.rotation_mode = 'XYZ'          # imported meshes may use quaternions; hinge with rotation_euler
    if pivot is not None:
        lp = M.inverted() @ Vector(pivot)
        part.data.transform(Matrix.Translation(-lp))
        part.location = lp
    return part


class Spray:
    """bits thrown out and falling (sand, water, sparks) in bursts; every bit is a pure function of t"""

    def __init__(self, n=60, size=0.035, color=(0.8, 0.65, 0.4), floor=0.0, life=1.4, gravity=9.8, seed=1, parent=None):
        self.n, self.floor, self.life, self.g, self.seed = n, floor, life, gravity, seed
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=size)
        proto = bpy.context.object
        mat = bpy.data.materials.new('Spray')
        mat.use_nodes = True
        mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*color, 1)
        mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.9
        proto.data.materials.append(mat)
        self.bits = [proto] + [proto.copy() for _ in range(n - 1)]
        for b in self.bits[1:]:
            _link(b)
        for b in self.bits:
            b.parent = parent
            b.scale = (0, 0, 0)
        self.bursts = []   # (t, at, count, speed, direction, cone, first index)
        self.next = 0
        UPDATERS.append(self.evaluate)

    def burst(self, t, at, count=12, speed=(1.5, 3.0), direction=(0, 0, 1), cone=35.0):
        self.bursts.append((t, Vector(at), count, speed, Vector(direction).normalized(), math.radians(cone), self.next))
        self.next = (self.next + count) % self.n
        return self

    def evaluate(self, t):
        import random
        owner = {}
        for k, b in enumerate(self.bursts):
            if b[0] <= t < b[0] + self.life:
                for j in range(b[2]):
                    owner[(b[6] + j) % self.n] = (k, j)
        for i, bit in enumerate(self.bits):
            if i not in owner:
                if bit.scale.x:
                    bit.scale = (0, 0, 0)
                continue
            k, j = owner[i]
            t0, at, _, (s0, s1), d, cone, _ = self.bursts[k]
            r = random.Random(self.seed * 7919 + k * 131 + j)
            q = d.to_track_quat('Z', 'Y')
            a, sp = r.uniform(0, 2 * math.pi), math.acos(1 - r.random() * (1 - math.cos(cone)))
            v = q @ Vector((math.sin(sp) * math.cos(a), math.sin(sp) * math.sin(a), math.cos(sp))) * r.uniform(s0, s1)
            dt = t - t0
            p = at + v * dt + Vector((0, 0, -0.5 * self.g * dt * dt))
            p.z = max(p.z, self.floor)
            bit.location = p
            k_life = 1 - dt / self.life
            s = r.uniform(0.6, 1.3) * min(1.0, k_life * 3)
            bit.scale = (s, s, s)


# ───────────── actors: clips blended in time, paths ─────────────
def _undup(name):
    """'Jump_Land.009' → 'Jump_Land': Blender numbers datablocks that share a name (the same clip on many imports)"""
    return re.sub(r'\.\d{3}$', '', name)


def _fcurves(act):
    if getattr(act, 'layers', None):
        return [fc for L in act.layers for s in L.strips for cb in s.channelbags for fc in cb.fcurves]
    return list(act.fcurves)


class Clip:
    """one action read into per-bone fcurves, evaluated without Blender's animation system"""

    def __init__(self, action):
        self.name = action.name
        self.start, self.end = action.frame_range
        self.bones = {}
        for fc in _fcurves(action):
            p = fc.data_path
            if not p.startswith('pose.bones["'):
                continue
            bone, prop = p[len('pose.bones["'):].split('"].')
            self.bones.setdefault(bone, {}).setdefault(prop, {})[fc.array_index] = fc

    @property
    def length(self):
        return (self.end - self.start) / fps()

    def pose(self, local_t, loop):
        span = self.end - self.start
        f = local_t * fps()
        f = self.start + (f % span if loop and span > 0 else min(f, span))
        out = {}
        for bone, props in self.bones.items():
            p = {}
            for prop, chans in props.items():
                n = 4 if prop == 'rotation_quaternion' else 3
                default = (1, 0, 0, 0) if prop == 'rotation_quaternion' else (1, 1, 1) if prop == 'scale' else (0, 0, 0)
                p[prop] = [chans[i].evaluate(f) if i in chans else default[i] for i in range(n)]
            out[bone] = p
        return out


def _blend(a, b, w):
    if w <= 0:
        return a
    if w >= 1:
        return b
    out = {}
    for bone in set(a) | set(b):
        pa, pb = a.get(bone, {}), b.get(bone, {})
        p = {}
        for prop in set(pa) | set(pb):
            va, vb = pa.get(prop, pb.get(prop)), pb.get(prop, pa.get(prop))
            if prop == 'rotation_quaternion':
                p[prop] = list(Quaternion(va).slerp(Quaternion(vb), w))
            else:
                p[prop] = [x + (y - x) * w for x, y in zip(va, vb)]
        out[bone] = p
    return out


class Actor:
    ALL = []

    def __init__(self, asset, name=None):
        self.asset, self.arm, self.root = asset, asset.armature, asset.root
        self.name = name or self.root.name
        self.clips = {}
        arm_name = self.arm.name.split('.')[0] if self.arm else ''
        for act in asset.actions:
            parts = [_undup(p) for p in act.name.split('|') if p]
            short = next((p for p in parts if p != arm_name and not arm_name.startswith(p)), parts[-1] if parts else act.name)
            self.clips.setdefault(short, Clip(act))
        if self.arm and self.arm.animation_data:
            self.arm.animation_data.action = None
        # the pose as imported: bones no clip touches keep it (some rigs rest off the ground until posed)
        self.home = {pb.name: pb.matrix_basis.copy() for pb in self.arm.pose.bones} if self.arm else {}
        if self.arm:
            for pb in self.arm.pose.bones:
                pb.rotation_mode = 'QUATERNION'
        self.timeline = []  # (t, clip, speed, loop, blend, offset)
        self.path = Track()
        self.yaw = Track()
        Actor.ALL.append(self)

    def do(self, t, clip, speed=1.0, loop=None, blend=0.15, offset=0.0):
        """from time t, play clip (loop: default True for clips named *Idle*/Run/Walk); blends from the previous one"""
        if clip not in self.clips:
            raise KeyError(f'{self.name} has no clip "{clip}" (has {", ".join(sorted(self.clips))})')
        if loop is None:
            loop = any(k in clip for k in ('Idle', 'Run', 'Walk', 'Loop'))
        self.timeline.append((t, clip, speed, loop, blend, offset))
        self.timeline.sort(key=lambda x: x[0])
        return self

    def move(self, t, pos, yaw=None, ease='smooth'):
        """be at pos (and facing yaw degrees, 0 = -Y) at time t; the segment before t is eased"""
        self.path.key(t, pos, ease)
        if yaw is not None:
            self.yaw.key(t, (yaw,), ease)
        return self

    def _pose_at(self, t):
        tl = [x for x in self.timeline if x[0] <= t] or self.timeline[:1]
        if not tl:
            return None
        cur = tl[-1]
        p = self.clips[cur[1]].pose((t - cur[0]) * cur[2] + cur[5], cur[3])
        if len(tl) > 1 and t - cur[0] < cur[4]:
            prev = tl[-2]
            pp = self.clips[prev[1]].pose((t - prev[0]) * prev[2] + prev[5], prev[3])
            p = _blend(pp, p, smooth((t - cur[0]) / cur[4]))
        return p

    def evaluate(self, t):
        pos, yaw = self.path(t), self.yaw(t)
        if pos is not None:
            self.root.location = pos
        if yaw is not None:
            self.root.rotation_euler = (self.root.rotation_euler.x, self.root.rotation_euler.y, math.radians(yaw[0]))
        p = self._pose_at(t)
        if p and self.arm:
            for pb in self.arm.pose.bones:
                v = p.get(pb.name)
                if not v:
                    continue
                if 'location' in v:
                    pb.location = v['location']
                if 'rotation_quaternion' in v:
                    pb.rotation_quaternion = v['rotation_quaternion']
                if 'scale' in v:
                    pb.scale = v['scale']


# ───────────── retargeting: clips from an animation library on another rig ─────────────
class BakedClip:
    """a clip baked to per-frame bone poses (same interface as Clip)"""

    def __init__(self, name, frames):
        self.name, self.frames = name, frames
        self.start, self.end = 0, len(frames) - 1

    @property
    def length(self):
        return self.end / fps()

    def pose(self, local_t, loop):
        span = self.end
        f = local_t * fps()
        f = f % span if loop and span > 0 else min(max(f, 0), span)
        i = int(f)
        a, b = self.frames[i], self.frames[min(i + 1, span)]
        return _blend(a, b, f - i) if b is not a else a


def library(path):
    """import an animation library (a rig + its actions) once, hidden; feed it to retarget()"""
    if not hasattr(library, 'cache'):
        library.cache = {}
    if path not in library.cache:
        a = import_glb(path)
        for o in a.objects:   # the rig stays in the viewport layer: hidden objects are not evaluated
            o.hide_render = True
            o.hide_viewport = o.type != 'ARMATURE'
        library.cache[path] = a
    return library.cache[path]


def _rot(m):
    return m.to_3x3().normalized().to_quaternion()


def retarget(actor, lib, names, bones, ik=None, root=None, legs=None, base=None, rename=None):
    """bake clips of an animation library rig onto actor's rig. Both rigs must share a rest pose (e.g. T-pose, same
    facing). bones: {source bone: target bone or [target bones]}: each target copies its source's rotation relative to
    rest (in world space), so bone lengths and rolls may differ. root: (source, target): that target also follows the
    source's movement, scaled by legs ((source hip, source ankle), (target hip, target ankle)) length. ik: {target:
    (follow, source)}: an IK-style bone (e.g. a foot parented to the root) is put at bone `follow` (e.g. the shin's
    end) with the rotation of source. base: one of the actor's own clips whose first frame holds every unmapped bone
    (and the mapped bones' positions). rename: {clip: short name}."""
    S, Tg = lib.armature, actor.arm
    sc = bpy.context.scene
    ik = ik or {}
    targets = {}
    for s, t in bones.items():
        for x in ([t] if isinstance(t, str) else t):
            targets[x] = s
    for x, (_, s) in ik.items():
        targets[x] = s
    SW, TW = S.matrix_world, Tg.matrix_world
    s_rest = {b.name: _rot(SW @ b.matrix_local) for b in S.data.bones}
    t_rest = {b.name: _rot(TW @ b.matrix_local) for b in Tg.data.bones}
    t_world_q = _rot(TW)
    order = []

    def walk(b):
        order.append(b)
        for c in b.children:
            walk(c)
    for b in Tg.data.bones:
        if b.parent is None:
            walk(b)
    late = {b.name for b in order if any(n in ik for n in [b.name] + [p.name for p in b.parent_recursive])}
    order = [b for b in order if b.name not in late] + [b for b in order if b.name in late]   # IK bones after legs
    k_scale = 1.0
    if root and legs:   # the root's movement scales by leg length
        def leg(W, arm, a, b):
            return ((W @ arm.data.bones[a].head_local) - (W @ arm.data.bones[b].head_local)).length
        k_scale = leg(TW, Tg, *legs[1]) / max(1e-6, leg(SW, S, *legs[0]))
    ref = dict(actor.home)   # unmapped bones hold the actor's imported pose, or its base clip's first frame
    if base:
        for bone, p in actor.clips[base].pose(0, False).items():
            ref[bone] = Matrix.LocRotScale(Vector(p.get('location', (0, 0, 0))), Quaternion(p.get('rotation_quaternion', (1, 0, 0, 0))), Vector(p.get('scale', (1, 1, 1))))
    S.animation_data_create()
    acts = {}
    for act in lib.actions:
        parts = [_undup(p) for p in act.name.split('|') if p]
        acts[parts[-1] if parts else act.name] = act
    for name in names:
        act = acts.get(name)
        if act is None:
            raise KeyError(f'the library has no clip "{name}" (has {", ".join(sorted(acts))})')
        S.animation_data.action = act
        if getattr(act, 'slots', None):
            S.animation_data.action_slot = act.slots[0]
        f0, f1 = (int(round(x)) for x in act.frame_range)
        frames = []
        for f in range(f0, f1 + 1):
            sc.frame_set(f)
            M = {}
            pose = {}
            for b in order:
                parent_m = M[b.parent.name] if b.parent else Matrix.Identity(4)
                rest_rel = (b.parent.matrix_local.inverted() @ b.matrix_local) if b.parent else b.matrix_local
                base = parent_m @ rest_rel
                src = targets.get(b.name)
                if src is None:
                    M[b.name] = base @ ref.get(b.name, Matrix.Identity(4))
                else:
                    spb = S.pose.bones[src]
                    wq = _rot(SW @ spb.matrix) @ s_rest[src].inverted() @ t_rest[b.name]
                    loc = (base @ ref.get(b.name, Matrix.Identity(4))).translation
                    if b.name in ik:
                        loc = M[ik[b.name][0]].translation.copy()
                    if root and b.name == root[1]:
                        d = (SW @ spb.matrix).translation - SW @ S.data.bones[src].head_local
                        loc += TW.inverted().to_3x3() @ (d * k_scale)
                    M[b.name] = Matrix.Translation(loc) @ (t_world_q.inverted() @ wq).to_matrix().to_4x4()
                basis = base.inverted() @ M[b.name]
                pose[b.name] = {'location': list(basis.translation), 'rotation_quaternion': list(basis.to_quaternion()), 'scale': [1, 1, 1]}
            frames.append(pose)
        short = (rename or {}).get(name, name)
        actor.clips[short] = BakedClip(short, frames)
    S.animation_data.action = None
    sc.frame_set(1)
    return actor


# ───────────── camera ─────────────
class Camera:
    ACTIVE = None

    def __init__(self, lens=24, fstop=2.2, sensor=24):
        cam = bpy.data.cameras.new('Camera')
        cam.sensor_fit, cam.sensor_height, cam.lens = 'VERTICAL', sensor, lens
        cam.dof.use_dof, cam.dof.aperture_fstop = True, fstop
        cam.clip_start, cam.clip_end = 0.05, 2000
        self.cam = cam
        self.obj = bpy.data.objects.new('Camera', cam)
        bpy.context.scene.collection.objects.link(self.obj)
        bpy.context.scene.camera = self.obj
        self.pos, self.look, self.lens_t, self.roll = Track(), Track(), Track(), Track()
        self.focus_t = Track()   # optional: a point to focus on (rack focus); none keyed = focus on the look point
        self.shakes = []  # (t0, t1, amp, freq)
        self.cuts = []
        Camera.ACTIVE = self

    def key(self, t, pos, look, lens=None, ease='smooth', roll=0.0):
        self.pos.key(t, pos, ease)
        self.look.key(t, look, ease)
        self.roll.key(t, (roll,), ease)
        if lens:
            self.lens_t.key(t, (lens,), ease)
        return self

    def cut(self, t, pos, look, lens=None, roll=0.0):
        """a hard cut at t: holds the previous framing until t, then jumps"""
        eps = 1.0 / fps() / 4
        if self.pos.keys:
            last = self.pos(t - eps), self.look(t - eps), self.lens_t(t - eps), self.roll(t - eps)
            self.pos.key(t - eps, last[0], 'smooth'); self.look.key(t - eps, last[1], 'smooth')
            if last[2]:
                self.lens_t.key(t - eps, last[2], 'smooth')
            self.roll.key(t - eps, last[3], 'smooth')
        self.pos.key(t, pos, 'hold'); self.look.key(t, look, 'hold'); self.roll.key(t, (roll,), 'hold')
        if lens:
            self.lens_t.key(t, (lens,), 'hold')
        self.cuts.append(t)
        return self

    def focus(self, t, point, ease='smooth'):
        """focus on a world point from t (keys blend: a rack focus); without focus keys the camera focuses where it looks"""
        self.focus_t.key(t, point, ease)
        return self

    def shake(self, t0, t1, amp=0.03, freq=1.0):
        self.shakes.append((t0, t1, amp, freq))
        return self

    def evaluate(self, t):
        p, l = Vector(self.pos(t)), Vector(self.look(t))
        amp = 0.0
        for t0, t1, a, f in self.shakes:
            if t0 <= t <= t1:
                fade = min(1.0, (t - t0) / 0.15, (t1 - t) / 0.15) if t1 > t0 else 1
                amp = max(amp, a * max(0.0, fade))
        if amp:
            p += Vector((noise(t * 6, 1), noise(t * 6, 2), noise(t * 6, 3))) * amp
        self.obj.location = p
        q = (l - p).to_track_quat('-Z', 'Y')
        r = self.roll(t)
        if r and r[0]:
            q = q @ Quaternion((0, 0, 1), math.radians(r[0]))
        self.obj.rotation_euler = q.to_euler()
        if self.lens_t.keys:
            self.cam.lens = self.lens_t(t)[0]
        if self.focus_t.keys:   # distance along the view axis to the focus point
            fwd = (l - p).normalized()
            self.cam.dof.focus_distance = max(0.05, (Vector(self.focus_t(t)) - p).dot(fwd))
        else:
            self.cam.dof.focus_distance = (l - p).length


# ───────────── 2D actor anchors (a drawn character standing in the 3D set) ─────────────
class Anchor:
    """where a 2D actor (drawn by the template on top of the plate) stands: its feet's world point over time and its
    height in metres. render_plate projects it through the camera every frame into plate.json
    "actors": {name: [[x px, y px, px per metre, depth m, blur px] | null per frame]} (film pixels, frame n at index
    n - 1), so the template draws the actor at that spot and size. Optional: a soft contact shadow on the floor
    (shadow = its radius in m) and an invisible stand-in that casts the actor's shadow into the set (proxy=True)."""
    ALL = []

    def __init__(self, name, height=1.6, shadow=0.0, shadow_strength=0.55, proxy=False, proxy_radius=0.17):
        self.name, self.height = name, height
        self.pos = Track()
        self.hidden = []   # (t0, t1): not in the set (null in plate.json, shadow and stand-in hidden)
        self.objects = []
        if shadow:
            self.objects.append(self._shadow(shadow, shadow_strength))
        if proxy:
            self.objects.append(self._proxy(proxy_radius))
        Anchor.ALL.append(self)

    def key(self, t, pos, ease='smooth'):
        self.pos.key(t, pos, ease)
        return self

    def cut(self, t, pos):
        """jump to pos at t (holds the previous spot until then)"""
        eps = 1.0 / fps() / 4
        if self.pos.keys:
            self.pos.key(t - eps, self.pos(t - eps), 'smooth')
        self.pos.key(t, pos, 'hold')
        return self

    def hide(self, t0, t1):
        self.hidden.append((t0, t1))
        return self

    def visible(self, t):
        return bool(self.pos.keys) and not any(t0 <= t < t1 for t0, t1 in self.hidden)

    def at(self, t):
        return Vector(self.pos(t) or (0, 0, 0))

    def _shadow(self, r, strength):
        bpy.ops.mesh.primitive_circle_add(vertices=48, radius=r, fill_type='NGON')
        o = bpy.context.object
        o.name = f'{self.name}_shadow'
        o.scale = (1.0, 0.75, 1.0)
        m = bpy.data.materials.new(f'{self.name}_shadow')
        m.use_nodes = True
        m.surface_render_method = 'BLENDED'
        nt = m.node_tree
        nt.nodes.clear()
        out, mix = nt.nodes.new('ShaderNodeOutputMaterial'), nt.nodes.new('ShaderNodeMixShader')
        tr, dif = nt.nodes.new('ShaderNodeBsdfTransparent'), nt.nodes.new('ShaderNodeBsdfDiffuse')
        tc, grad, ramp = nt.nodes.new('ShaderNodeTexCoord'), nt.nodes.new('ShaderNodeTexGradient'), nt.nodes.new('ShaderNodeValToRGB')
        mp = nt.nodes.new('ShaderNodeMapping')
        grad.gradient_type = 'SPHERICAL'
        mp.inputs['Scale'].default_value = (1 / r, 1 / r, 1 / r)
        dif.inputs['Color'].default_value = (0.02, 0.01, 0.03, 1)
        ramp.color_ramp.elements[0].color = (0, 0, 0, 1)
        ramp.color_ramp.elements[1].position = 1.0
        ramp.color_ramp.elements[1].color = (strength,) * 3 + (1,)
        ramp.color_ramp.elements[1].position = 0.75   # dark core, long soft falloff
        ramp.color_ramp.interpolation = 'B_SPLINE'
        nt.links.new(tc.outputs['Object'], mp.inputs[0])
        nt.links.new(mp.outputs[0], grad.inputs[0])
        nt.links.new(grad.outputs['Fac'], ramp.inputs['Fac'])
        nt.links.new(ramp.outputs['Color'], mix.inputs['Fac'])
        nt.links.new(tr.outputs[0], mix.inputs[1])
        nt.links.new(dif.outputs[0], mix.inputs[2])
        nt.links.new(mix.outputs[0], out.inputs['Surface'])
        o.data.materials.append(m)
        o.visible_shadow = False
        o['anchor_lift'] = 0.004
        return o

    def _proxy(self, r):
        bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=r, depth=self.height * 0.92)
        o = bpy.context.object
        o.name = f'{self.name}_standin'
        o.visible_camera = False
        o.visible_glossy = False
        o.visible_diffuse = False
        o['anchor_lift'] = self.height * 0.46
        return o

    def evaluate(self, t):
        on, p = self.visible(t), self.at(t)
        for o in self.objects:
            o.location = p + Vector((0, 0, o['anchor_lift']))
            o.hide_render = not on

    def sample(self, t, cam):
        """[x, y, px per metre, depth, blur] on the film at t (camera already evaluated), or None"""
        import projection as P
        if not self.visible(t):
            return None
        sc = bpy.context.scene
        w, h, c = sc.render.resolution_x, sc.render.resolution_y, cam.cam
        m = [list(r) for r in cam.obj.matrix_world]
        v = P.project(m, c.lens, c.sensor_height, w, h, list(self.at(t)), (c.shift_x, c.shift_y))
        if v is None:
            return None
        blur = P.coc_px(v[3], c.dof.focus_distance, c.lens, c.dof.aperture_fstop, c.sensor_height, h) if c.dof.use_dof else 0.0
        return P.round_sample(v, blur)


# ───────────── the per-frame handler + rendering ─────────────
def evaluate(t):
    for a in Actor.ALL:
        a.evaluate(t)
    for a in Anchor.ALL:
        a.evaluate(t)
    if Camera.ACTIVE:
        Camera.ACTIVE.evaluate(t)
    for f in UPDATERS:
        f(t)
    view = ARGS.get('view')   # look-dev stills: [[x, y, z], [look x, y, z], lens] replaces the film camera
    if view and Camera.ACTIVE:
        o, c = Camera.ACTIVE.obj, Camera.ACTIVE.cam
        o.location = view[0]
        o.rotation_euler = (Vector(view[1]) - Vector(view[0])).to_track_quat('-Z', 'Y').to_euler()
        c.lens, c.dof.use_dof = view[2], False


def _on_frame(scene, *_):
    evaluate(t_of(scene.frame_current_final))   # sub-frames too, so motion blur sees the motion


def install_handler():
    hs = bpy.app.handlers.frame_change_pre
    for h in [h for h in hs if getattr(h, '__name__', '') == '_on_frame']:
        hs.remove(h)
    hs.append(_on_frame)


def simulate(last, first=1):
    """step frames first..last in order so physics (cloth etc.) is computed and cached before rendering"""
    sc = bpy.context.scene
    for f in range(first, last + 1):
        sc.frame_set(f)


def bake_mesh(obj, first, last, sim='Cloth'):
    """record a simulated mesh (e.g. cloth) frame by frame, then play it back as plain vertex animation and drop the
    simulation: renders read exact shapes for any frame, in any order. Modifiers after the sim stay live."""
    import numpy as np
    sc = bpy.context.scene
    i = obj.modifiers.find(sim)
    later = [m for m in obj.modifiers[i + 1:]]
    for m in later:
        m.show_viewport = False
    n = len(obj.data.vertices)
    rest = np.empty(n * 3, np.float32)
    obj.data.vertices.foreach_get('co', rest)
    frames = {}
    for f in range(first, last + 1):
        sc.frame_set(f)
        e = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
        co = np.empty(n * 3, np.float32)
        e.data.vertices.foreach_get('co', co)
        frames[f] = co
    obj.modifiers.remove(obj.modifiers[sim])
    for m in later:
        m.show_viewport = True

    def play(t):
        x = 1 + t * fps()
        f0 = int(math.floor(x))
        a, b = frames.get(min(max(f0, first), last), rest), frames.get(min(max(f0 + 1, first), last), rest)
        if x < first:
            a = b = rest
        k = x - f0
        obj.data.vertices.foreach_set('co', a + (b - a) * k)
        obj.data.update()
    UPDATERS.append(play)
    return frames


def _plate_json(meta):
    """plate.json: readable, with each actor's samples one frame per line"""
    actors = meta.pop('actors', None)
    text = json.dumps(meta, indent=1)
    if actors is not None:
        body = ',\n'.join(f' "{k}": [\n' + ',\n'.join('  ' + json.dumps(v, separators=(',', ':')) for v in vs) + '\n ]'
                           for k, vs in actors.items())
        text = text[:-2] + ',\n "actors": {\n' + body + '\n }\n}'
        meta['actors'] = actors
    return text


def render_plate(duration, shots=(), cues=(), frames=None, force=False, physics=False):
    """render film frames 1..N (or ARGS frames [first, last]) to <out>/frames/NNNNNN.jpg and write <out>/plate.json"""
    sc = bpy.context.scene
    out = ARGS.get('out') or os.path.join(ARGS['project'], 'plate')
    os.makedirs(os.path.join(out, 'frames'), exist_ok=True)
    n = max(1, math.ceil(duration * fps()))
    first, last = frames or ARGS.get('frames') or (1, n)
    meta = {'fps': fps(), 'frames': n, 'duration': duration, 'draft': bool(ARGS.get('draft')),
            'shots': [dict(s) for s in shots], 'cues': [dict(c) for c in cues]}
    if Anchor.ALL and Camera.ACTIVE:   # 2D actors: where each stands on the film, every frame (cheap: no rendering)
        meta['size'] = [sc.render.resolution_x, sc.render.resolution_y]
        meta['actors'] = {a.name: [] for a in Anchor.ALL}
        meta['actorHeights'] = {a.name: a.height for a in Anchor.ALL}
        for f in range(1, n + 1):
            evaluate(t_of(f))
            bpy.context.view_layer.update()
            for a in Anchor.ALL:
                meta['actors'][a.name].append(a.sample(t_of(f), Camera.ACTIVE))
    with open(os.path.join(out, 'plate.json'), 'w') as f:
        f.write(_plate_json(meta))
    install_handler()
    if physics:   # physics needs every earlier frame: simulate up to the last frame this run shows
        simulate(max(frame_of(t) for t in ARGS['stills']) if ARGS.get('stills') else min(n, last))
    if ARGS.get('stills'):   # look-dev: only these film times, to <out>/stills/<t>.jpg
        os.makedirs(os.path.join(out, 'stills'), exist_ok=True)
        for t in ARGS['stills']:
            sc.frame_set(frame_of(t))
            sc.render.filepath = os.path.join(out, 'stills', f'{t:06.2f}.jpg')
            bpy.ops.render.render(write_still=True)
        print(f'PLATE stills {len(ARGS["stills"])} of {n} → {out}/stills')
        return
    sc.frame_start, sc.frame_end = max(1, first), min(n, last)
    sc.render.filepath = os.path.join(out, 'frames', '######')
    sc.render.use_overwrite = bool(force or ARGS.get('force'))   # re-render a range that already exists
    sc.render.use_placeholder = False
    sc.frame_set(sc.frame_start)
    bpy.ops.render.render(animation=True)
    print(f'PLATE {sc.frame_start}-{sc.frame_end} of {n} → {out}')
