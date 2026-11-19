# Pure math (no bpy): where a world point lands on the film, for drawing a 2D actor into a Blender plate.
# studio3d.render_plate uses it to write plate.json "actors"; python/tests/test_projection.py checks it.
#   m        the camera's 4x4 world matrix (rows), Blender convention: it looks down its local -Z, +Y is up
#   lens     focal length (mm) · sensor: sensor height (mm, sensor_fit VERTICAL) · width/height: film size (px)

def _sub(a, b):
    return [x - y for x, y in zip(a, b)]


def to_camera(m, p):
    """world point → camera-space (x right, y up, z towards the viewer: in front of the camera z < 0)"""
    d = _sub(p, [m[0][3], m[1][3], m[2][3]])
    # the inverse of a rotation is its transpose: camera axes are the matrix columns
    return [sum(m[r][c] * d[r] for r in range(3)) for c in range(3)]


def project(m, lens, sensor, width, height, p, shift=(0.0, 0.0)):
    """(x px, y px, px per metre at that depth, depth m) of world point p, or None when it is behind the camera"""
    x, y, z = to_camera(m, p)
    depth = -z
    if depth <= 1e-6:
        return None
    k = lens / sensor * height          # px per unit of (camera-space x or y) / depth
    big = max(width, height)
    return (width / 2 + x / depth * k + shift[0] * big, height / 2 - y / depth * k - shift[1] * big, k / depth, depth)


def coc_px(depth, focus, lens, fstop, sensor, height):
    """thin-lens circle of confusion (diameter, film px) of a point at depth when the lens focuses at focus (metres)"""
    f = lens / 1000.0
    if focus <= f or depth <= 0 or fstop <= 0:
        return 0.0
    c = (f * f / (fstop * (focus - f))) * abs(depth - focus) / depth     # metres on the sensor
    return c / (sensor / 1000.0) * height


def round_sample(v, blur):
    x, y, ppm, depth = v
    return [round(x, 1), round(y, 1), round(ppm, 2), round(depth, 3), round(blur, 1)]
