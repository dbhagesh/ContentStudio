# Entry point for the optional Blender plate step (studio build runs it only for projects with blender/scene.py):
#   blender -b --factory-startup --python blender/boot.py -- '<json args>'
# args: { project, out, fps, draft, frames: [first, last] | null, paths: [dirs added to sys.path] }
# It puts studio3d (this folder), the template's blender/ and the project's blender/ on sys.path, then runs the
# project's scene.py, which builds the scene and calls studio3d.render_plate(...).
import json
import os
import runpy
import sys

args = json.loads(sys.argv[sys.argv.index('--') + 1])
for d in [os.path.dirname(os.path.abspath(__file__)), *args.get('paths', [])]:
    if d not in sys.path:
        sys.path.insert(0, d)

import studio3d  # noqa: E402

studio3d.ARGS.update(args)
try:
    runpy.run_path(os.path.join(args['project'], 'blender', 'scene.py'), run_name='__main__')
except SystemExit:
    raise
except BaseException:
    import traceback
    traceback.print_exc()
    sys.exit(1)
