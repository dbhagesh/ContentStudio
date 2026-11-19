# The plate's 2D-actor projection (blender/projection.py, pure math: runs without Blender).
import math
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'blender'))
import projection as P  # noqa: E402


def look_matrix(pos, yaw_deg=0.0):
    """a level camera at pos looking along +Y rotated by yaw (Blender: local -Z forward, +Y up, +X right)"""
    a = math.radians(yaw_deg)
    right = (math.cos(a), math.sin(a), 0.0)
    fwd = (-math.sin(a), math.cos(a), 0.0)
    up = (0.0, 0.0, 1.0)
    back = tuple(-c for c in fwd)
    return [[right[r], up[r], back[r], pos[r]] for r in range(3)] + [[0, 0, 0, 1]]


class ProjectionTest(unittest.TestCase):
    def test_point_on_axis_is_centred(self):
        m = look_matrix((0, 0, 1.2))
        x, y, ppm, depth = P.project(m, 50, 36, 1080, 1920, (0, 5, 1.2))
        self.assertAlmostEqual(x, 540)
        self.assertAlmostEqual(y, 960)
        self.assertAlmostEqual(depth, 5)
        self.assertAlmostEqual(ppm, 50 / 36 * 1920 / 5)

    def test_feet_below_and_right(self):
        m = look_matrix((0, 0, 1.2))
        x, y, ppm, _ = P.project(m, 50, 36, 1080, 1920, (0.5, 4, 0))
        self.assertAlmostEqual(x, 540 + 0.5 * ppm)    # half a metre right at that depth
        self.assertAlmostEqual(y, 960 + 1.2 * ppm)    # the floor is 1.2 m below the lens
        # a 1.5 m actor standing there spans 1.5 * ppm pixels
        _, y_head, _, _ = P.project(m, 50, 36, 1080, 1920, (0.5, 4, 1.5))
        self.assertAlmostEqual(y - y_head, 1.5 * ppm)

    def test_rotated_camera_and_behind(self):
        m = look_matrix((2, 0, 1), yaw_deg=90)        # now looking along -X
        x, y, _, depth = P.project(m, 35, 24, 1080, 1920, (-3, 0, 1))
        for a, b in zip((x, y, depth), (540, 960, 5)):
            self.assertAlmostEqual(a, b)
        self.assertIsNone(P.project(m, 35, 24, 1080, 1920, (6, 0, 1)))

    def test_circle_of_confusion(self):
        self.assertEqual(P.coc_px(4, 4, 50, 2.0, 36, 1920), 0)
        near, far = P.coc_px(2, 4, 50, 2.0, 36, 1920), P.coc_px(40, 4, 50, 2.0, 36, 1920)
        self.assertGreater(near, 5)
        self.assertGreater(far, 5)
        self.assertLess(P.coc_px(40, 4, 50, 8.0, 36, 1920), far)     # stopping down sharpens

    def test_round_sample(self):
        self.assertEqual(P.round_sample((1.234, 2.345, 3.4567, 4.56789), 0.04), [1.2, 2.3, 3.46, 4.568, 0.0])


if __name__ == '__main__':
    unittest.main()
