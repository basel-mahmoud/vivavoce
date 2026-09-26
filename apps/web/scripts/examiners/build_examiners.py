"""
VivaVoce examiners, round 2: five studio instruments with black-glass faces.

    blender -b --factory-startup --python apps/web/scripts/examiners/build_examiners.py -- [--no-bake] [--out PATH]

Writes apps/web/public/models/examiners.glb, apps/web/scripts/examiners/build_report.json and the
generated block of apps/web/src/components/room/examiners/rig.ts. Everything is procedural and
deterministic (no random seeds, no external assets, no images inside the GLB).

Authoring conventions
---------------------
* Geometry is written in glTF space (x right, y UP, z toward the camera) and converted to Blender
  space (x, -z, y) at mesh creation, so every number here is what three.js sees.
* y = 0 is the bench top. Shells continue below it (hidden by the bench apron).
* L and R always mean SCREEN left and right (-x and +x in an examiner's own frame; examiners face +z).
* Every shell is split at a panel seam into a Body (static) and a Head (a pivot that nods and turns);
  the head carries a plug below the seam so small turns never open a hole.
* Materials: each examiner has one hero finish (ex_shell_<axis>) and shares the glossy accents
  (ex_metal, ex_lacquer, ex_rubber, ex_fabric). Accent albedo lives in COLOR_0.rgb (the material is
  white); shells keep their brand colour in the material and use COLOR_0.rgb as a multiplier.
  COLOR_0.a is baked ambient occlusion (applied to indirect light only by the site's shader patch).
* Static parts are merged per pivot per material, so one examiner is ~12 draw calls.
* Arms are CPU-bent conduits: the GLB holds them in the rest pose; rig.ts bendArms() rebuilds them
  for any wrist pose from the socket and wrist nodes (same maths as arm_tube() below).
"""
import bpy, bmesh, math, sys, os, json, time, gzip, struct, re
from mathutils import Vector, Matrix, Quaternion
import numpy as np

T0 = time.time()
HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
sys.dont_write_bytecode = True   # no __pycache__ next to the sources
import sdf as S  # noqa: E402  (numpy SDF kit next to this file)

ARGV = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
DO_BAKE = '--no-bake' not in ARGV
OUT = os.path.abspath(ARGV[ARGV.index('--out') + 1]) if '--out' in ARGV else os.path.join(WEB, 'public', 'models', 'examiners.glb')
REPORT = os.path.join(HERE, 'build_report.json')
RIG_TS = os.path.join(WEB, 'src', 'components', 'room', 'examiners', 'rig.ts')

bpy.ops.wm.read_factory_settings(use_empty=True)
SC = bpy.context.scene
COL = SC.collection

# ---------------------------------------------------------------------------------------
# glTF-space helpers
# ---------------------------------------------------------------------------------------
P = Matrix(((1, 0, 0), (0, 0, -1), (0, 1, 0)))       # glTF -> Blender basis change


def B(p):
    return (p[0], -p[2], p[1])


def Rx(a): return Matrix.Rotation(a, 3, 'X')
def Ry(a): return Matrix.Rotation(a, 3, 'Y')
def Rz(a): return Matrix.Rotation(a, 3, 'Z')


def xform(ob, loc=(0, 0, 0), rot=None, scale=None):
    ob.location = B(loc)
    if rot is not None:
        ob.rotation_mode = 'QUATERNION'
        ob.rotation_quaternion = (P @ rot @ P.transposed()).to_quaternion()
    if scale is not None:
        ob.scale = (scale[0], scale[2], scale[1])


def smoothstep(e0, e1, x):
    t = min(1.0, max(0.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


def spow(c, e):
    return math.copysign(abs(c) ** e, c)


def v3(a):
    return Vector((a[0], a[1], a[2]))


def basis(y_dir, z_hint):
    """Rotation whose +y is y_dir and whose +z is as close to z_hint as possible."""
    y = v3(y_dir).normalized()
    z = v3(z_hint)
    z = (z - y * z.dot(y)).normalized()
    x = y.cross(z).normalized()
    return Matrix((x, y, z)).transposed()


def srgb_lin(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


# ---------------------------------------------------------------------------------------
# Palette (palette v2, "the exam script"). Paint values are LINEAR (COLOR_0 is linear).
# ---------------------------------------------------------------------------------------
HEX = dict(
    graphite='#2a303c',      # Correctness powder coat
    butter='#ffc838',        # Clarity glaze (brand)
    bisque='#efe2bf',        # Clarity's unglazed band
    porcelain='#eceef1',     # Structure soft-touch ceramic
    stone='#c8c2b7',         # Conciseness turned stone
    cobalt_deep='#1f31c9',   # Confidence lacquer and the bench (3D cobalt)
    coal='#14171e',          # print: bezels, clip, mortarboard, cushions
    rubber='#1b1e26',        # conduit arms
    paper='#f6f6f3',         # mittens, badge card, headset
    velvet='#2536c4',        # cobalt velvet sleeve bars and lanyard
    champagne='#d3c6ae',     # shared visor lips, ferrules, collars
    brass='#c9a256',         # Correctness glasses, dials, badge clip, the loupe
    verm='#ff4d26',
)
LIN = {k: srgb_lin(v) for k, v in HEX.items()}
WHITE = (1.0, 1.0, 1.0)

# ---------------------------------------------------------------------------------------
# Materials: Principled stand-ins (so the GLB reads in any glTF viewer). The site swaps them by
# NAME for tuned MeshPhysicalMaterials (rig.ts SHELL_FINISH / createExaminerMaterials).
# ---------------------------------------------------------------------------------------
MATS = {}


def mat(name, hexc, rough=0.5, metal=0.0, coat=0.0, alpha=None):
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = list(srgb_lin(hexc)) + [1]
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    bsdf.inputs['Coat Weight'].default_value = coat
    if alpha is not None:
        bsdf.inputs['Alpha'].default_value = alpha
        m.blend_method = 'BLEND'
    MATS[name] = m
    return m


M_SHELL = {
    'Correctness': lambda: mat('ex_shell_correctness', HEX['graphite'], 0.55, coat=0.3),
    'Clarity': lambda: mat('ex_shell_clarity', HEX['butter'], 0.25, coat=1.0),
    'Structure': lambda: mat('ex_shell_structure', HEX['porcelain'], 0.5, coat=0.2),
    'Conciseness': lambda: mat('ex_shell_conciseness', HEX['stone'], 0.62, coat=0.1),
    'Confidence': lambda: mat('ex_shell_confidence', HEX['cobalt_deep'], 0.42, coat=0.5),
}
M_BISQUE = lambda: mat('ex_bisque', HEX['bisque'], 0.72)                       # noqa: E731
M_METAL = lambda: mat('ex_metal', '#ffffff', 0.3, metal=1.0)                    # noqa: E731
M_LACQUER = lambda: mat('ex_lacquer', '#ffffff', 0.22, coat=1.0)               # noqa: E731
M_RUBBER = lambda: mat('ex_rubber', '#ffffff', 0.6)                             # noqa: E731
M_FABRIC = lambda: mat('ex_fabric', '#ffffff', 0.78)                            # noqa: E731
M_LENS = lambda: mat('ex_lens', '#dfe6f0', 0.03, coat=1.0, alpha=0.18)          # noqa: E731
M_COIN = lambda: mat('ex_coin', HEX['coal'], 0.24, coat=1.0)                    # noqa: E731
M_BENCH = lambda: mat('ex_bench', HEX['cobalt_deep'], 0.46, coat=0.25)          # noqa: E731
M_BENCH_PAPER = lambda: mat('ex_bench_paper', HEX['paper'], 0.7)                # noqa: E731
M_GLASS = lambda key: mat(f'ex_face_{key.lower()}', '#050507', 0.08, coat=1.0)  # noqa: E731

# ---------------------------------------------------------------------------------------
# Mesh construction + part registry
# ---------------------------------------------------------------------------------------
PARTS = {}          # object name -> dict(key, merge, bake, tris_group)
UVSCALE = 10.0      # UV units per world unit for tiling detail (1 UV = 10 cm)


def mk(name, verts, faces, material=None, parent=None, loc=(0, 0, 0), rot=None, uvs=None, uv_period=None,
       paint=WHITE, smooth=True, key=None, merge=True, bake=None, sharp=None, group=None):
    """Create a mesh object. uvs: per-vertex (u, v); uv_period wraps u across a lathe seam.
    paint: RGB (linear) for the whole part, or a per-vertex list. key: the examiner (triangle budget).
    merge: join with siblings of the same material under the same parent. bake: AO bake group."""
    me = bpy.data.meshes.new(name)
    me.from_pydata([B(v) for v in verts], [], [tuple(f) for f in faces])
    me.validate(clean_customdata=False)
    if uvs is not None:
        uvl = me.uv_layers.new(name='UVMap')
        data = np.zeros((len(me.loops), 2))
        loop_v = np.empty(len(me.loops), dtype=np.int64)
        me.loops.foreach_get('vertex_index', loop_v)
        U = np.asarray(uvs, dtype=np.float64)
        data[:] = U[loop_v]
        if uv_period:
            for poly in me.polygons:
                idx = list(poly.loop_indices)
                us = data[idx, 0]
                if us.max() - us.min() > uv_period * 0.5:
                    for li in idx:
                        if data[li, 0] < uv_period * 0.5:
                            data[li, 0] += uv_period
        data[:, 1] = 1.0 - data[:, 1]          # the glTF exporter flips v back: the GLB gets exactly `uvs`
        uvl.data.foreach_set('uv', data.ravel())
    paint_mesh(me, paint)
    if smooth:
        me.shade_smooth()
    if sharp:
        mark_sharp(me, sharp)
    ob = bpy.data.objects.new(name, me)
    COL.objects.link(ob)
    if material:
        me.materials.append(material)
    if parent:
        ob.parent = parent
    xform(ob, loc, rot)
    PARTS[ob.name] = dict(key=key, merge=merge, bake=bake if bake is not None else key, group=group or key)
    return ob


def paint_mesh(me, paint):
    n = len(me.vertices)
    if n == 0:
        return
    if 'Col' not in me.color_attributes:
        me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
    me.color_attributes.active_color_name = 'Col'
    col = np.ones((n, 4))
    if isinstance(paint, (list, np.ndarray)) and len(paint) == n and not isinstance(paint[0], float):
        col[:, :3] = np.asarray(paint, dtype=np.float64)[:, :3]
    else:
        col[:, :3] = np.asarray(paint, dtype=np.float64)[None, :3]
    me.color_attributes['Col'].data.foreach_set('color', col.ravel())


def mark_sharp(me, angle_deg):
    bm = bmesh.new()
    bm.from_mesh(me)
    lim = math.radians(angle_deg)
    for e in bm.edges:
        if len(e.link_faces) == 2 and e.link_faces[0].normal.angle(e.link_faces[1].normal, 0) > lim:
            e.smooth = False
    bm.to_mesh(me)
    bm.free()


def empty(name, parent=None, loc=(0, 0, 0), rot=None):
    ob = bpy.data.objects.new(name, None)
    ob.empty_display_size = 0.08
    COL.objects.link(ob)
    if parent:
        ob.parent = parent
    xform(ob, loc, rot)
    return ob


def grid_faces(rows, closed=True, flip=False):
    """Quads between consecutive rows of vertex indices (a row of length 1 is a pole)."""
    faces = []
    for i in range(len(rows) - 1):
        a, b = rows[i], rows[i + 1]
        n = max(len(a), len(b))
        m = n if closed else n - 1
        for k in range(m):
            k1 = (k + 1) % n
            if len(a) == 1:
                f = (a[0], b[k], b[k1])
            elif len(b) == 1:
                f = (a[k], b[0], a[k1])
            else:
                f = (a[k], b[k], b[k1], a[k1])
            faces.append(f[::-1] if flip else f)
    return faces


def revolve(prof, N, mod=None, a0=-math.pi / 2, with_uv=False):
    """Revolve a (y, r) profile about +y (profiles run bottom -> top along the OUTER surface).
    Returns verts, faces[, uvs] (u = arc length around / 10 cm, v = profile length / 10 cm)."""
    verts, rows, uvs = [], [], []
    rmax = max(r for _, r in prof)
    L = [0.0]
    for i in range(1, len(prof)):
        L.append(L[-1] + math.dist(prof[i], prof[i - 1]))
    for i, (y, r) in enumerate(prof):
        if r <= 1e-6:
            rows.append([len(verts)])
            verts.append((0.0, y, 0.0))
            uvs.append((0.0, L[i] * UVSCALE))
            continue
        row = []
        for k in range(N):
            t = a0 + 2 * math.pi * k / N
            rr = mod(i, y, r, t) if mod else r
            row.append(len(verts))
            verts.append((rr * math.cos(t), y, rr * math.sin(t)))
            uvs.append((2 * math.pi * rmax * k / N * UVSCALE, L[i] * UVSCALE))
        rows.append(row)
    faces = grid_faces(rows)
    if with_uv:
        return verts, faces, uvs, 2 * math.pi * rmax * UVSCALE
    return verts, faces


def transform_verts(verts, M, off=(0, 0, 0)):
    out = []
    for v in verts:
        p = M @ Vector(v)
        out.append((p.x + off[0], p.y + off[1], p.z + off[2]))
    return out


def catmull(points, per=6):
    pts = [points[0]] + list(points) + [points[-1]]
    out = []
    for i in range(1, len(pts) - 2):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[i + 1], pts[i + 2]
        for s in range(per):
            t = s / per
            out.append(tuple(0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t * t
                                    + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t ** 3) for j in range(2)))
    out.append(points[-1])
    return [(y, max(0.0, r)) for y, r in out]


def superellipsoid(a, b, c, e=6.0, nu=24, nv=12):
    verts, rows = [], []
    for i in range(nv + 1):
        th = -math.pi / 2 + math.pi * i / nv
        if i in (0, nv):
            rows.append([len(verts)])
            verts.append((0.0, b * math.copysign(1, th), 0.0))
            continue
        row = []
        for k in range(nu):
            ph = -math.pi / 2 + 2 * math.pi * k / nu
            cx = spow(math.cos(th), 2 / e)
            row.append(len(verts))
            verts.append((a * cx * spow(math.cos(ph), 2 / e), b * spow(math.sin(th), 2 / e), c * cx * spow(math.sin(ph), 2 / e)))
        rows.append(row)
    return verts, grid_faces(rows)


def box_uv(verts, faces):
    """Per-vertex UVs from the dominant axis of the vertex's averaged face normal (SDF props)."""
    V = np.asarray(verts)
    N = np.zeros_like(V)
    for f in faces:
        a, b, c = V[f[0]], V[f[1]], V[f[2]]
        n = np.cross(b - a, c - a)
        for i in f:
            N[i] += n
    uvs = []
    for p, n in zip(V, N):
        ax = int(np.argmax(np.abs(n)))
        if ax == 0:
            uvs.append((p[2] * UVSCALE, p[1] * UVSCALE))
        elif ax == 1:
            uvs.append((p[0] * UVSCALE, p[2] * UVSCALE))
        else:
            uvs.append((p[0] * UVSCALE, p[1] * UVSCALE))
    return uvs


# ---------------------------------------------------------------------------------------
# Superellipse-lathe shells (with a head/body split at a panel seam)
# ---------------------------------------------------------------------------------------
class Body:
    """Cross-section |x/(A s)|^n + |z/(Bz s)|^n = 1, profile s(y) sampled bottom -> top."""

    def __init__(self, A, Bz, n, prof, N=56, cz=0.0, cx=0.0):
        self.A, self.Bz, self.n, self.prof, self.N, self.cz, self.cx = A, Bz, n, prof, N, cz, cx
        self.ys = [p[0] for p in prof]
        self.ss = [p[1] for p in prof]

    def s(self, y):
        ys, ss = self.ys, self.ss
        if y <= ys[0]:
            return ss[0]
        for i in range(1, len(ys)):
            if y <= ys[i]:
                f = (y - ys[i - 1]) / max(1e-9, ys[i] - ys[i - 1])
                return ss[i - 1] + (ss[i] - ss[i - 1]) * f
        return ss[-1]

    def z(self, x, y):
        s = self.s(y)
        a, b = self.A * s, self.Bz * s
        u = min(0.9999, abs(x - self.cx) / max(a, 1e-6))
        return self.cz + b * (1 - u ** self.n) ** (1 / self.n)

    def point(self, x, y, d):
        h = 0.002
        z = self.z(x, y)
        dzdx = (self.z(x + h, y) - self.z(x - h, y)) / (2 * h)
        dzdy = (self.z(x, y + h) - self.z(x, y - h)) / (2 * h)
        nrm = Vector((-dzdx, -dzdy, 1)).normalized()
        return (x + nrm.x * d, y + nrm.y * d, z + nrm.z * d), nrm

    def side_point(self, y, sgn, d=0.0, lean=0.0):
        """Point on the shell's +x (sgn 1) or -x side at height y, pushed d along the normal."""
        s = self.s(y)
        x = self.cx + sgn * self.A * s
        h = 0.002
        dsdy = (self.s(y + h) - self.s(y - h)) / (2 * h)
        nrm = Vector((sgn, -self.A * dsdy, lean)).normalized()
        return (x + nrm.x * d, y + nrm.y * d, self.cz + nrm.z * d), nrm

    def ring(self):
        M = 4000
        pts = []
        for i in range(M + 1):
            t = -math.pi / 2 + 2 * math.pi * i / M
            pts.append((self.A * spow(math.cos(t), 2 / self.n), self.Bz * spow(math.sin(t), 2 / self.n)))
        L = [0.0]
        for i in range(1, len(pts)):
            L.append(L[-1] + math.dist(pts[i], pts[i - 1]))
        out, j = [], 0
        for k in range(self.N):
            tgt = L[-1] * k / self.N
            while L[j + 1] < tgt:
                j += 1
            f = (tgt - L[j]) / max(1e-12, L[j + 1] - L[j])
            out.append(((pts[j][0] + (pts[j + 1][0] - pts[j][0]) * f) / self.A,
                        (pts[j][1] + (pts[j + 1][1] - pts[j][1]) * f) / self.Bz, k / self.N))
        return out, L[-1]

    def mesh(self, prof=None):
        """Mesh of the profile (or a slice of it). UVs: u = perimeter fraction x max perimeter, v = height."""
        prof = prof or self.prof
        ring, per = self.ring()
        per *= max(p[1] for p in self.prof)
        verts, rows, uvs = [], [], []
        L = [0.0]
        for i in range(1, len(prof)):
            L.append(L[-1] + abs(prof[i][0] - prof[i - 1][0]) + abs(prof[i][1] - prof[i - 1][1]) * 0.5 * (self.A + self.Bz))
        v0 = prof[0][0]
        for i, (y, s) in enumerate(prof):
            if s <= 1e-6:
                rows.append([len(verts)])
                verts.append((self.cx, y, self.cz))
                uvs.append((0.0, (v0 + L[i]) * UVSCALE))
                continue
            row = []
            for ux, uz, f in ring:
                row.append(len(verts))
                verts.append((self.cx + self.A * s * ux, y, self.cz + self.Bz * s * uz))
                uvs.append((f * per * UVSCALE, (v0 + L[i]) * UVSCALE))
            rows.append(row)
        return verts, grid_faces(rows), uvs, per * UVSCALE

    def split(self, ys, plug=0.05):
        """Profiles below / above a seam at ys: the lower part is capped just under the seam, the upper
        part starts with a plug that reaches `plug` below it (so a turned head never shows a hole)."""
        ss = self.s(ys)
        lower = [p for p in self.prof if p[0] < ys - 1e-6] + [(ys, ss), (ys - 0.003, ss * 0.9), (ys - 0.012, 0.0)]
        upper = [(ys - plug, 0.0), (ys - plug, ss * 0.84), (ys - 0.006, ss * 0.87), (ys, ss)] + \
                [p for p in self.prof if p[0] > ys + 1e-6]
        return lower, upper


def profile(yb, yt, hb, pb, ht, pt, side, grooves=(), nb=7, nt=11, nside=10, scale=1.0, extra=(), gs=4):
    """Superellipse fillet caps (p: 2 round, >2 flatter top and tighter corner), a side function side(y)
    and Gaussian grooves (y, width, depth in world units). extra: additional sample heights."""
    def seam(y):
        return sum(d * math.exp(-((y - g) / w) ** 2) for g, w, d in grooves) / scale

    pts = []
    sb = side(yb + hb) - seam(yb + hb)
    for i in range(nb + 1):
        th = math.pi / 2 * (1 - i / nb)
        pts.append((yb + hb * (1 - math.sin(th) ** (2 / pb)), sb * math.cos(th) ** (2 / pb)))
    y0, y1 = yb + hb, yt - ht
    ys = [y0 + (y1 - y0) * i / nside for i in range(1, nside)] + list(extra)
    for g, w, d in grooves:
        ys += [g + w * k * (4 / gs) / 1.6 for k in range(-gs, gs + 1)]
    for y in sorted(set(round(v, 5) for v in ys if y0 + 1e-4 < v < y1 - 1e-4)):
        pts.append((y, side(y) - seam(y)))
    st = side(y1) - seam(y1)
    for i in range(nt + 1):
        th = math.pi / 2 * i / nt
        pts.append((y1 + ht * math.sin(th) ** (2 / pt), st * math.cos(th) ** (2 / pt)))
    pts[0] = (pts[0][0], 0.0)
    pts[-1] = (pts[-1][0], 0.0)
    return pts


# ---------------------------------------------------------------------------------------
# Visor: black glass (+ the tally pill in the same primitive) + champagne lip + coal bezel
# ---------------------------------------------------------------------------------------
def rrect(hw, hh, r, k=6, ex=6, ey=3):
    r = max(1e-4, min(r, hw - 1e-4, hh - 1e-4))

    def seg(p0, p1, n):
        return [(p0[0] + (p1[0] - p0[0]) * i / n, p0[1] + (p1[1] - p0[1]) * i / n) for i in range(n)]

    def arc(cx, cy, a0, n):
        return [(cx + r * math.cos(a0 + math.pi / 2 * i / n), cy + r * math.sin(a0 + math.pi / 2 * i / n)) for i in range(n)]

    pts = seg((hw, -hh + r), (hw, hh - r), ey)
    pts += arc(hw - r, hh - r, 0, k)
    pts += seg((hw - r, hh), (-hw + r, hh), ex)
    pts += arc(-hw + r, hh - r, math.pi / 2, k)
    pts += seg((-hw, hh - r), (-hw, -hh + r), ey)
    pts += arc(-hw + r, -hh + r, math.pi, k)
    pts += seg((-hw + r, -hh), (hw - r, -hh), ex)
    pts += arc(hw - r, -hh + r, 1.5 * math.pi, k)
    return pts


VISORS = {}


def visor(body, key, parent, cx, cy, hw, hh, r, bw=0.046, dg=0.014, bulge=0.012, pivot=(0, 0, 0), tally=True):
    px, py, pz = pivot

    def place(x, y, d):
        p, _ = body.point(cx + x, cy + y, d)
        return (p[0] - px, p[1] - py, p[2] - pz)

    def dome(x, y):
        return bulge * max(0.0, 1 - (x / hw) ** 2) * max(0.0, 1 - (y / hh) ** 2)

    verts, uvs, rows = [], [], []
    edge = [(0.0, -0.011), (-0.0035, -0.0035), (-0.009, -0.0008), (-0.018, 0.0)]
    for o, dd in edge:
        row = []
        for (x, y) in rrect(hw + o, hh + o, r + o):
            row.append(len(verts))
            verts.append(place(x, y, dg + dd + dome(x, y)))
            uvs.append(((x / hw + 1) / 2, (y / hh + 1) / 2))
        rows.append(row)
    base = rrect(hw - 0.018, hh - 0.018, r - 0.018)
    for sc in (0.84, 0.62, 0.38, 0.14):
        row = []
        for (x, y) in base:
            x, y = x * sc, y * sc
            row.append(len(verts))
            verts.append(place(x, y, dg + dome(x, y)))
            uvs.append(((x / hw + 1) / 2, (y / hh + 1) / 2))
        rows.append(row)
    rows.append([len(verts)])
    verts.append(place(0, 0, dg + dome(0, 0)))
    uvs.append((0.5, 0.5))
    faces = []
    for i in range(len(rows) - 1):
        a, b = rows[i], rows[i + 1]
        n = len(a)
        for k in range(n):
            k1 = (k + 1) % n
            faces.append((a[k], a[k1], b[0]) if len(b) == 1 else (a[k], a[k1], b[k1], b[k]))
    if tally:
        # the on-air pill above the bezel, in the SAME primitive (UV v 2..3: the face shader lights it)
        tv, tf = superellipsoid(0.04, 0.013, 0.012, e=2.0, nu=16, nv=6)
        p, nrm = body.point(cx, cy + hh + bw + 0.034, 0.003)
        tilt = Vector((0, 0, 1)).rotation_difference(nrm).to_matrix()
        base_i = len(verts)
        for v in tv:
            q = tilt @ Vector(v)
            verts.append((p[0] + q.x - px, p[1] + q.y - py, p[2] + q.z - pz))
            uvs.append(((v[0] / 0.04 + 1) / 2, 2 + (v[1] / 0.013 + 1) / 2))
        faces += [tuple(i + base_i for i in f) for f in tf]
    glass = mk(f'Glass_{key}', verts, faces, M_GLASS(key), parent, uvs=uvs, key=key, merge=False, bake=False)

    def frame(name, prof, material, paint):
        v, rws = [], []
        for o, d in prof:
            row = []
            for (x, y) in rrect(hw + o, hh + o, r + o):
                row.append(len(v))
                v.append(place(x, y, d))
            rws.append(row)
        f = []
        for i in range(len(rws) - 1):
            a, b = rws[i], rws[i + 1]
            n = len(a)
            for k in range(n):
                k1 = (k + 1) % n
                f.append((a[k], b[k], b[k1], a[k1]))
        return mk(name, v, f, material, parent, paint=paint, key=key)

    frame(f'Lip_{key}', [(-0.001, dg - 0.02), (0.001, dg + 0.001), (0.0035, dg + 0.004), (0.006, dg + 0.0045)], M_METAL(), LIN['champagne'])
    frame(f'Bezel_{key}', [(0.006, dg + 0.0045), (0.012, dg + 0.012), (bw * 0.5, dg + 0.019), (bw - 0.012, dg + 0.015),
                           (bw - 0.003, dg + 0.002), (bw + 0.004, -0.008), (bw + 0.008, -0.02)], M_LACQUER(), LIN['coal'])
    # the Visor_ node: origin at the glass centre, +z out of the glass, +y up (the lens and look-at frame)
    c = place(0, 0, dg + bulge)
    _, n = body.point(cx, cy, 0)
    vnode = empty(f'Visor_{key}', parent, c, basis((0, 1, 0), n) if False else visor_rot(n))
    VISORS[key] = dict(halfWidth=hw, halfHeight=hh, radius=r, centre=[round(c[0] + px, 4), round(c[1] + py, 4), round(c[2] + pz, 4)])
    return glass, vnode


def visor_rot(n):
    z = v3(n).normalized()
    y = (Vector((0, 1, 0)) - z * z.y).normalized()
    x = y.cross(z).normalized()
    return Matrix((x, y, z)).transposed()


# ---------------------------------------------------------------------------------------
# Sockets: a champagne ferrule on the shell and the arm's anchor node (+y = the arm's exit direction)
# ---------------------------------------------------------------------------------------
SOCKETS = {}


def socket(key, side, parent, pos, direction, pivot=(0, 0, 0), z_hint=(0, 0, 1)):
    name = f'Socket{side}_{key}'
    R = basis(direction, z_hint)
    loc = (pos[0] - pivot[0], pos[1] - pivot[1], pos[2] - pivot[2])
    node = empty(name, parent, loc, R)
    prof = [(-0.035, 0.0), (-0.035, 0.064), (-0.004, 0.07), (0.008, 0.073), (0.02, 0.07), (0.028, 0.06),
            (0.03, 0.05), (0.022, 0.046), (0.0, 0.045), (-0.02, 0.0)]
    v, f = revolve(prof, 14)
    mk(f'Ferrule{side}_{key}', transform_verts(v, R, loc), f, M_METAL(), parent, paint=LIN['champagne'], key=key)
    SOCKETS.setdefault(key, {})[side] = dict(pos=[round(x, 4) for x in pos], dir=[round(x, 4) for x in v3(direction).normalized()])
    return node


# ---------------------------------------------------------------------------------------
# Arms: a conduit along a cubic Bezier from the socket to the cuff, rotation-minimising frames.
# rig.ts bendArms() implements the SAME construction (constants in ARM below).
# ---------------------------------------------------------------------------------------
ARM = dict(radius=0.04, rings=18, sides=12, ribs=16, cuffDepth=0.06, flare=0.16, slack=1.15)


def bezier(P0, P1, P2, P3, t):
    u = 1 - t
    return P0 * (u * u * u) + P1 * (3 * u * u * t) + P2 * (3 * u * t * t) + P3 * (t * t * t)


def bezier_d(P0, P1, P2, P3, t):
    u = 1 - t
    return (P1 - P0) * (3 * u * u) + (P2 - P1) * (6 * u * t) + (P3 - P2) * (3 * t * t)


def arm_curve(S0, a, E, b, L):
    """Handles h such that the curve S0 -> E (tangent a out of the socket, b into the cuff) has length L."""
    def length(h):
        P1, P2 = S0 + a * h, E - b * h
        s, prev = 0.0, S0
        for i in range(1, 25):
            p = bezier(S0, P1, P2, E, i / 24)
            s += (p - prev).length
            prev = p
        return s
    dist = (E - S0).length
    L = min(L, dist * ARM['slack'] + 0.05)     # a springy cord: a gentle bow, never a loop
    lo, hi = 0.18 * dist, 1.6 * L + dist
    if length(lo) >= L:
        h = lo
    else:
        for _ in range(26):
            mid = (lo + hi) / 2
            if length(mid) < L:
                lo = mid
            else:
                hi = mid
        h = (lo + hi) / 2
    return S0, S0 + a * h, E - b * h, E


def arm_radius(t):
    return ARM['radius'] * (1 + ARM['flare'] * math.exp(-(t / 0.07) ** 2))


def arm_tube(S0, a, E, b, L, uoff):
    """Vertices, normals and uvs of one arm tube (ring-major, sides+1 verts per ring)."""
    C = arm_curve(S0, a, E, b, L)
    nr, ns = ARM['rings'], ARM['sides']
    ts = [i / (nr - 1) for i in range(nr)]
    X = [bezier(*C, t) for t in ts]
    T = [bezier_d(*C, t).normalized() for t in ts]
    ref = Vector((0, 0, 1)) if abs(T[0].z) < 0.9 else Vector((0, 1, 0))
    r = T[0].cross(ref).normalized()
    Rs = [r]
    for i in range(nr - 1):
        v1 = X[i + 1] - X[i]
        c1 = v1.dot(v1)
        rL = Rs[i] - v1 * (2 / c1 * v1.dot(Rs[i]))
        tL = T[i] - v1 * (2 / c1 * v1.dot(T[i]))
        v2 = T[i + 1] - tL
        c2 = v2.dot(v2)
        Rs.append((rL - v2 * (2 / c2 * v2.dot(rL))).normalized() if c2 > 1e-12 else rL.normalized())
    verts, norms, uvs = [], [], []
    for i, t in enumerate(ts):
        s = T[i].cross(Rs[i])
        rad = arm_radius(t)
        for j in range(ns + 1):
            th = 2 * math.pi * j / ns
            nrm = Rs[i] * math.cos(th) + s * math.sin(th)
            p = X[i] + nrm * rad
            verts.append((p.x, p.y, p.z))
            norms.append((nrm.x, nrm.y, nrm.z))
            uvs.append((uoff + j / ns, t * ARM['ribs']))
    faces = []
    for i in range(nr - 1):
        for j in range(ns):
            a0 = i * (ns + 1) + j
            b0 = (i + 1) * (ns + 1) + j
            faces.append((a0, a0 + 1, b0 + 1, b0))
    return verts, norms, uvs, faces


# ---------------------------------------------------------------------------------------
# SDF parts
# ---------------------------------------------------------------------------------------
def sdf_mesh(name, F, lo, hi, h=0.004, target=None, custom_normals=True, relax_iters=2):
    V, Q = S.surface_nets(F, lo, hi, h)
    V = S.project(F, V, 4)
    V = S.relax(V, Q, F, relax_iters)
    me = bpy.data.meshes.new(name)
    me.from_pydata([B(v) for v in V.tolist()], [], Q.tolist())
    me.validate(clean_customdata=False)
    ob = bpy.data.objects.new(name + 'Proto', me)
    COL.objects.link(ob)
    ntri = 2 * len(Q)
    if target and ntri > target:
        dec = ob.modifiers.new('dec', 'DECIMATE')
        dec.ratio = target / ntri
        with bpy.context.temp_override(object=ob, active_object=ob, selected_objects=[ob]):
            bpy.ops.object.modifier_apply(modifier='dec')
    me = ob.data
    co = np.empty(len(me.vertices) * 3)
    me.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3)
    G = S.project(F, np.stack([co[:, 0], co[:, 2], -co[:, 1]], 1), 3)
    me.vertices.foreach_set('co', np.stack([G[:, 0], -G[:, 2], G[:, 1]], 1).ravel())
    me.update()
    me.shade_smooth()
    if custom_normals:
        N = S.normals(F, G)
        me.normals_split_custom_set_from_vertices([tuple(n) for n in np.stack([N[:, 0], -N[:, 2], N[:, 1]], 1)])
    return ob


def sdf_part(name, key, F, lo, hi, material, parent, h=0.004, target=1200, loc=(0, 0, 0), rot=None, paint=WHITE,
             uv=False, merge=True, bake=None):
    ob = sdf_mesh(name, F, lo, hi, h=h, target=target)
    ob.name = name
    ob.data.name = name
    ob.data.materials.append(material)
    me = ob.data
    if uv:
        co = np.empty(len(me.vertices) * 3)
        me.vertices.foreach_get('co', co)
        co = co.reshape(-1, 3)
        G = np.stack([co[:, 0], co[:, 2], -co[:, 1]], 1)
        faces = [list(p.vertices) for p in me.polygons]
        U = box_uv(G.tolist(), faces)
        uvl = me.uv_layers.new(name='UVMap')
        loop_v = np.empty(len(me.loops), dtype=np.int64)
        me.loops.foreach_get('vertex_index', loop_v)
        UV = np.asarray(U)[loop_v]
        UV[:, 1] = 1.0 - UV[:, 1]
        uvl.data.foreach_set('uv', UV.ravel())
    paint_mesh(me, paint)
    ob.parent = parent
    xform(ob, loc, rot)
    PARTS[ob.name] = dict(key=key, merge=merge, bake=bake if bake is not None else key, group=key)
    return ob


def tube_curve(name, key, parent, pts, radius, material, loc=(0, 0, 0), paint=WHITE, res=6, bevel_res=2, cyclic=False, merge=True):
    cu = bpy.data.curves.new(name + '_c', 'CURVE')
    cu.dimensions = '3D'
    cu.bevel_depth = radius
    cu.bevel_resolution = bevel_res
    cu.resolution_u = res
    cu.use_fill_caps = not cyclic
    sp = cu.splines.new('BEZIER')
    sp.bezier_points.add(len(pts) - 1)
    sp.use_cyclic_u = cyclic
    for bp, p in zip(sp.bezier_points, pts):
        bp.co = B(p)
        bp.handle_left_type = bp.handle_right_type = 'AUTO'
    ob = bpy.data.objects.new(name + '_tmp', cu)
    COL.objects.link(ob)
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    bpy.data.objects.remove(ob)
    me.name = name
    me.shade_smooth()
    paint_mesh(me, paint)
    o = bpy.data.objects.new(name, me)
    COL.objects.link(o)
    me.materials.append(material)
    o.parent = parent
    xform(o, loc)
    PARTS[o.name] = dict(key=key, merge=merge, bake=key, group=key)
    return o


def knurled_dial(name, key, parent, loc, side, R=0.12, L=0.074, ridges=14):
    prof = [(-0.03, 0.0), (-0.03, 0.098), (0.0, 0.104), (0.006, R - 0.012), (0.014, R), (0.03, R), (0.046, R),
            (L - 0.014, R), (L - 0.004, R - 0.01), (L, R - 0.024), (L - 0.006, R - 0.036), (L - 0.008, 0.05),
            (L - 0.003, 0.034), (L + 0.001, 0.02), (L + 0.003, 0.0)]
    band = set(range(4, 8))

    def mod(i, y, r, t):
        return r * (1 - 0.045 * (0.5 + 0.5 * math.cos(ridges * t))) if i in band else r
    v, f = revolve(prof, ridges * 2, mod=mod)
    M = Rz(-math.pi / 2) if side > 0 else Rz(math.pi / 2)
    return mk(name, transform_verts(v, M, loc), f, M_METAL(), parent, paint=LIN['brass'], key=key)


# ---------------------------------------------------------------------------------------
# The shared mitten (+ gown cuff with cobalt velvet bars) with a "Curl" morph to a grip
# ---------------------------------------------------------------------------------------
HS = 1.3
YK = 0.13 * HS                  # knuckle line (the bend starts here)
BEND_R = 0.064                  # neutral-axis radius of the curled fingers (the handle sinks into the roll)
WRAP = 1.3                      # cartoon fingers stretch a little along the wrap (about 186 degrees at the tip)
GRIP = (0.0, YK, -BEND_R)       # the bend centre = the grip axis (runs along x): paddle / loupe pivot


def mitten_mesh():
    """One sculpt for all ten hands. Wrist at the origin, fingers +y, palm -z, thumb +x (the screen-right
    hand; the left hand is a mirrored instance). Morph 'Curl': 0 flat, 1 a fist: the fingers wrap around
    the grip axis (a clean analytic bend about GRIP) and the thumb folds across the front."""
    s = HS

    def open_F(P):
        Q = P / s
        mitt = S.scaled(lambda X: S.sd_round_cone(X, (0, 0.075, 0), (0, 0.186, -0.02), 0.074, 0.067), (1, 1, 0.56))(Q)
        wrist = S.scaled(lambda X: S.sd_round_cone(X, (0, -0.03, 0), (0, 0.06, 0), 0.05, 0.058), (1, 1, 0.76))(Q)
        thumb = S.sd_round_cone(Q, (0.046, 0.05, -0.012), (0.11, 0.124, -0.03), 0.034, 0.027)
        return S.smin(S.smin(mitt, wrist, 0.03), thumb, 0.016) * s

    ob = sdf_mesh('MittenMesh', open_F, (-0.13 * s, -0.08 * s, -0.08 * s), (0.17 * s, 0.26 * s, 0.07 * s), h=0.0036 * s,
                  target=900, custom_normals=False)
    me = ob.data
    ob.shape_key_add(name='Basis')
    sk = ob.shape_key_add(name='Curl')
    co = np.empty(len(me.vertices) * 3)
    me.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3)
    G = np.stack([co[:, 0], co[:, 2], -co[:, 1]], 1)            # glTF space
    out = G.copy()
    cy_, cz_ = GRIP[1], GRIP[2]
    # thumb weight by proximity: closer to the thumb capsule than to the finger plate -> it folds, else it rolls
    Qn = G / s
    d_thumb = S.sd_round_cone(Qn, (0.046, 0.05, -0.012), (0.11, 0.124, -0.03), 0.034, 0.027)
    d_mitt = S.scaled(lambda X: S.sd_round_cone(X, (0, 0.075, 0), (0, 0.186, -0.02), 0.074, 0.067), (1, 1, 0.56))(Qn)
    WT = np.clip((d_mitt - d_thumb) / 0.012 + 0.5, 0, 1)
    WT = WT * WT * (3 - 2 * WT)
    for i, (x, y, z) in enumerate(G):
        wt = float(WT[i]) * (1 - smoothstep(0.17 * s, 0.2 * s, y))
        nx, ny, nz = x, y, z
        if y > YK:
            # bend about the grip axis: arc length along the fingers -> angle, offset from the neutral axis kept
            d = z - (cz_ + BEND_R)
            phi = (y - YK) / BEND_R * WRAP
            ny = cy_ + (BEND_R + d) * math.sin(phi)
            nz = cz_ + (BEND_R + d) * math.cos(phi)
            ny, nz = y + (ny - y) * (1 - wt), z + (nz - z) * (1 - wt)
        if wt > 0:
            # the thumb swings across the front of the handle
            a = 1.25 * wt
            dx, dz = nx - 0.045 * s, nz
            nx = 0.045 * s + dx * math.cos(a) + dz * math.sin(a)
            nz = -dx * math.sin(a) + dz * math.cos(a) - 0.012 * wt
            ny = ny + 0.018 * s * wt
        out[i] = (nx, ny, nz)
    sk.data.foreach_set('co', np.stack([out[:, 0], -out[:, 2], out[:, 1]], 1).ravel())
    faces = [list(p.vertices) for p in me.polygons]
    U = box_uv(G.tolist(), faces)
    uvl = me.uv_layers.new(name='UVMap')
    loop_v = np.empty(len(me.loops), dtype=np.int64)
    me.loops.foreach_get('vertex_index', loop_v)
    UV = np.asarray(U)[loop_v]
    UV[:, 1] = 1.0 - UV[:, 1]
    uvl.data.foreach_set('uv', UV.ravel())
    paint_mesh(me, LIN['paper'])
    me.materials.append(M_FABRIC())
    return ob


def cuff_part():
    """Gown cuff: a short coal bell over the wrist with three thin cobalt velvet bars (the doctoral sleeve)."""
    s = HS
    bars = [(-0.104, -0.093), (-0.079, -0.068), (-0.054, -0.043)]

    def rad(y):
        t = (y + 0.118) / 0.121
        return 0.069 - 0.01 * t
    rows = [(-0.118, 'c'), (-0.115, 'c'), (-0.109, 'c')]
    for a, b in bars:
        rows += [(a - 0.0016, 'c'), (a, 'v'), ((a + b) / 2, 'v'), (b, 'v'), (b + 0.0016, 'c')]
    rows += [(-0.03, 'c'), (-0.012, 'c'), (-0.002, 'c'), (0.003, 'c')]
    prof = [(-0.118, 0.0, 'c')]
    for y, kind in rows:
        r = rad(y) + (0.003 if kind == 'v' else 0.0)
        if y >= 0.0:
            r = 0.052
        prof.append((y, r, kind))
    prof.append((-0.004, 0.0, 'c'))
    kinds = [k for _, _, k in prof]
    prof2 = [(y * s, r * s) for y, r, _ in prof]
    v, f, uvs, per = revolve(prof2, 14, with_uv=True)
    paint = []
    # revolve() emits one vertex for a pole row and 14 per ring row, in profile order
    for i, (y, r) in enumerate(prof2):
        n = 1 if r <= 1e-6 else 14
        paint += [LIN['velvet'] if kinds[i] == 'v' else LIN['coal']] * n
    return v, f, uvs, per, paint


# ---------------------------------------------------------------------------------------
# The coin (paddle): a bevelled, rimmed disc with recessed faces and a turned handle.
# Paddle space: the grip point at the origin, the handle along +y, the disc centre at +YD,
# the printed (numeral) face toward +z. Numerals are troika text at runtime (PaddleFront/Back).
# ---------------------------------------------------------------------------------------
YD = 0.4
COIN_R, COIN_T = 0.21, 0.046


def coin_parts():
    R, T, Rf = COIN_R, COIN_T, 0.17
    h = T / 2
    prof = [(-h + 0.005, 0.0), (-h + 0.005, Rf), (-h, Rf + 0.008), (-h, R - 0.026), (-h + 0.004, R - 0.012), (-h + 0.011, R - 0.003),
            (-0.008, R), (0.008, R), (h - 0.011, R - 0.003), (h - 0.004, R - 0.012), (h, R - 0.026), (h, Rf + 0.008),
            (h - 0.005, Rf), (h - 0.005, 0.0)]
    dv, df = revolve(prof, 36)
    dv = transform_verts(dv, Rx(math.pi / 2), (0, YD, 0))       # axis +y -> +z, centred at YD
    j = YD - R
    hp = [(-0.16, 0.0), (-0.157, 0.012), (-0.148, 0.019), (-0.132, 0.021), (j - 0.03, 0.021),
          (j - 0.028, 0.029), (j - 0.02, 0.033), (j + 0.006, 0.033), (j + 0.014, 0.024), (j + 0.03, 0.0)]
    hv, hf = revolve(hp, 16)
    verts = dv + hv
    faces = df + [tuple(i + len(dv) for i in f) for f in hf]
    paint = [WHITE] * len(dv) + [(0.07, 0.07, 0.07)] * len(hv)
    return verts, faces, paint, h


# ---------------------------------------------------------------------------------------
# Seats, bench
# ---------------------------------------------------------------------------------------
AXES = ['Correctness', 'Clarity', 'Structure', 'Conciseness', 'Confidence']
SEAT_R, SEAT_Z0 = 4.6, -0.95
ARC_C = SEAT_R + SEAT_Z0
ANGLES = [-0.385, -0.2, 0.0, 0.178, 0.37]
BENCH = dict(r_back=SEAT_R - 0.5, depth=0.62, top=0.05, nose=0.05, floor=-0.5, span=0.56, recess=0.025)
PADDLE_SIDE = {'Correctness': 'L', 'Clarity': 'L', 'Structure': 'R', 'Conciseness': 'R', 'Confidence': 'R'}
ARM_LEN = {'Correctness': 0.9, 'Clarity': 0.98, 'Structure': 0.92, 'Conciseness': 0.94, 'Confidence': 0.98}


def seat(i):
    a = ANGLES[i]
    return (SEAT_R * math.sin(a), 0.0, ARC_C - SEAT_R * math.cos(a)), -a * 0.55


RIG = {}


# ---------------------------------------------------------------------------------------
# The five examiners
# ---------------------------------------------------------------------------------------
def lathe_part(name, body, prof, material, parent, key, paint=WHITE, pivot=(0, 0, 0), sharp=None):
    v, f, uvs, per = body.mesh(prof)
    if pivot != (0, 0, 0):
        v = [(x - pivot[0], y - pivot[1], z - pivot[2]) for x, y, z in v]
    return mk(name, v, f, material, parent, uvs=uvs, uv_period=per, paint=paint, key=key, sharp=sharp)


def build_examiner(i, key):
    loc, yaw = seat(i)
    root = empty(f'Examiner_{key}', None, loc, Ry(yaw))
    bodyp = empty(f'Body_{key}', root, (0, 0, 0))
    shell = M_SHELL[key]()
    info = {'seat': [round(x, 4) for x in loc], 'yaw': round(yaw, 4)}

    if key == 'Correctness':
        # A squat bench instrument: calibration-dial ears, a carry handle, brass half-moon glasses on the
        # visor and a lanyard ID badge. Graphite powder coat with speckle.
        A, Bz, n = 0.53, 0.44, 4.0
        yb, yt, ys = -0.42, 1.22, 0.56
        prof = profile(yb, yt, 0.14, 2.4, 0.26, 2.8, lambda y: 1.0 - 0.035 * (y - yb) / (yt - yb),
                       grooves=[(ys, 0.0065, 0.011)], scale=(A + Bz) / 2)
        body = Body(A, Bz, n, prof, N=44)
        lo, up = body.split(ys)
        pv = (0, ys, 0)
        head = empty(f'Head_{key}', bodyp, pv)
        lathe_part(f'BodyShell_{key}', body, lo, shell, bodyp, key)
        lathe_part(f'HeadShell_{key}', body, up, shell, head, key, pivot=pv)
        vc = (0.0, 0.855, 0.33, 0.152, 0.082)
        visor(body, key, head, *vc, pivot=pv)
        sx = A * body.s(vc[1])
        knurled_dial(f'DialR_{key}', key, head, (sx - 0.004, vc[1] - ys, -0.04), +1)
        knurled_dial(f'DialL_{key}', key, head, (-sx + 0.004, vc[1] - ys, -0.04), -1)
        # carry handle: two brass posts and a coal grip across the top
        for sgn in (-1, 1):
            pv2 = [(sgn * 0.3, yt - 0.06 - ys, -0.06), (sgn * 0.3, yt + 0.05 - ys, -0.06), (sgn * 0.28, yt + 0.1 - ys, -0.06)]
            tube_curve(f'HandlePost{"L" if sgn < 0 else "R"}_{key}', key, head, pv2, 0.018, M_METAL(), paint=LIN['brass'])
        sdf_part(f'HandleGrip_{key}', key, lambda Pp: S.sd_capsule(Pp, (-0.27, yt + 0.11 - ys, -0.06), (0.27, yt + 0.11 - ys, -0.06), 0.03),
                 (-0.33, yt + 0.05 - ys, -0.12), (0.33, yt + 0.17 - ys, 0.0), M_LACQUER(), head, h=0.004, target=500,
                 paint=LIN['coal'])
        # brass half-moon reading glasses perched on the lower half of the visor
        cxv, cyv, hw, hh = vc[0], vc[1], vc[2], vc[3]
        U = 2 * hh
        for sgn in (-1, 1):
            ecx = cxv + sgn * 0.5 * U
            top = cyv - 0.02 * U
            lw, lh = 0.3 * U, 0.3 * U
            pts = []
            for k in range(13):
                a = math.pi + math.pi * k / 12
                pts.append((ecx + lw * math.cos(a), top + lh * math.sin(a) * 1.0))
            loop = [(x, y) for x, y in pts]
            path = []
            for x, y in loop:
                p, _ = body.point(x, y, 0.014 + 0.045)
                path.append((p[0], p[1] - ys, p[2]))
            tube_curve(f'Rim{"L" if sgn < 0 else "R"}_{key}', key, head, path + [path[0]], 0.0085, M_METAL(), paint=LIN['brass'],
                       res=3, bevel_res=1)
            # temple: from the rim's outer top corner, round the head to the dial
            p0, _ = body.point(ecx + sgn * lw, top, 0.059)
            p1, _ = body.point(sgn * (hw + 0.03), top + 0.01, 0.045)
            dial = (sgn * (sx + 0.01), cyv - 0.005, 0.02)
            tube_curve(f'Temple{"L" if sgn < 0 else "R"}_{key}', key, head,
                       [(p0[0], p0[1] - ys, p0[2]), (p1[0], p1[1] - ys, p1[2]), (dial[0], dial[1] - ys, dial[2])], 0.0075,
                       M_METAL(), paint=LIN['brass'], res=5, bevel_res=1)
        # bridge between the lenses
        b0, _ = body.point(cxv - 0.5 * U + 0.3 * U, cyv - 0.02 * U, 0.059)
        b1, _ = body.point(cxv, cyv + 0.03 * U, 0.066)
        b2, _ = body.point(cxv + 0.5 * U - 0.3 * U, cyv - 0.02 * U, 0.059)
        tube_curve(f'Bridge_{key}', key, head, [(b0[0], b0[1] - ys, b0[2]), (b1[0], b1[1] - ys, b1[2]), (b2[0], b2[1] - ys, b2[2])],
                   0.0085, M_METAL(), paint=LIN['brass'], res=5, bevel_res=1)
        # lanyard: cobalt velvet ribbon from under the seam into a V, then the paper ID card
        lany = []
        for sgn in (-1, 1):
            path = [(sgn * 0.5, ys - 0.03), (sgn * 0.34, ys - 0.06), (sgn * 0.16, 0.42), (sgn * 0.035, 0.365)]
            lany.append(path)
        rv, rf, rp = [], [], []
        for path in lany:
            dense = catmull(path, per=6)
            base = len(rv)
            for j, (x, y) in enumerate(dense):
                # tangent in the surface
                x2, y2 = dense[min(j + 1, len(dense) - 1)]
                x1, y1 = dense[max(j - 1, 0)]
                tx, ty = x2 - x1, y2 - y1
                tl = math.hypot(tx, ty) or 1
                nx_, ny_ = -ty / tl, tx / tl
                for o in (-0.022, 0.022):
                    p, _ = body.point(x + nx_ * o, y + ny_ * o, 0.006)
                    rv.append(p)
                    rp.append(srgb_lin('#3a50ff'))
            m = len(dense)
            for j in range(m - 1):
                a0, b0_ = base + 2 * j, base + 2 * (j + 1)
                rf.append((a0, a0 + 1, b0_ + 1, b0_))
        mk(f'Lanyard_{key}', rv, rf, M_FABRIC(), bodyp, paint=rp, key=key, uvs=[(p[0] * UVSCALE, p[1] * UVSCALE) for p in rv])
        # the card: a thin plate conforming to the shell, cobalt header band and three grey text lines
        cw, ch, ccx, ccy = 0.085, 0.105, 0.012, 0.245
        tilt = 0.07
        cv_, cf_, cp_ = [], [], []
        rows = []
        for yi in range(8):
            fy = -1 + 2 * yi / 7
            row = []
            for xi in range(6):
                fx = -1 + 2 * xi / 5
                lx, ly = fx * cw, fy * ch
                rx, ry = lx * math.cos(tilt) - ly * math.sin(tilt), lx * math.sin(tilt) + ly * math.cos(tilt)
                p, _ = body.point(ccx + rx, ccy + ry, 0.011)
                row.append(len(cv_))
                cv_.append(p)
                cp_.append(LIN['velvet'] if fy > 0.5 else LIN['paper'])
            rows.append(row)
        for yi in range(7):
            for xi in range(5):
                a0, b0_ = rows[yi][xi], rows[yi + 1][xi]
                cf_.append((a0, a0 + 1, b0_ + 1, b0_))
        # card thickness: a back layer offset into the shell + a rim
        nb = len(cv_)
        for k in range(nb):
            x, y, z = cv_[k]
            cv_.append((x, y, z - 0.008))
            cp_.append(LIN['paper'])
        for yi in range(7):
            for xi in range(5):
                a0, b0_ = rows[yi][xi] + nb, rows[yi + 1][xi] + nb
                cf_.append((a0, b0_, b0_ + 1, a0 + 1))
        ring = [rows[0][x] for x in range(6)] + [rows[y][5] for y in range(1, 8)] + [rows[7][x] for x in range(4, -1, -1)] + \
               [rows[y][0] for y in range(6, 0, -1)]
        for k in range(len(ring)):
            a0, b0_ = ring[k], ring[(k + 1) % len(ring)]
            cf_.append((a0, a0 + nb, b0_ + nb, b0_))
        mk(f'Badge_{key}', cv_, cf_, M_FABRIC(), bodyp, paint=cp_, key=key, uvs=[(p[0] * UVSCALE, p[1] * UVSCALE) for p in cv_],
           sharp=50)
        for li, (lx0, lx1, ly) in enumerate([(-0.06, 0.05, 0.02), (-0.06, 0.03, -0.02), (-0.06, 0.055, -0.06)]):
            lv, lf = [], []
            for (x, y) in [(lx0, ly - 0.007), (lx1, ly - 0.007), (lx1, ly + 0.007), (lx0, ly + 0.007)]:
                rx, ry = x * math.cos(tilt) - y * math.sin(tilt), x * math.sin(tilt) + y * math.cos(tilt)
                p, _ = body.point(ccx + rx, ccy + ry, 0.0118)
                lv.append(p)
            mk(f'BadgeLine{li}_{key}', lv, [(0, 1, 2, 3)], M_FABRIC(), bodyp, paint=(0.32, 0.34, 0.38), key=key,
               uvs=[(p[0] * UVSCALE, p[1] * UVSCALE) for p in lv], smooth=False)
        # badge clip (brass) at the top of the card
        cp, cn = body.point(ccx - 0.008, ccy + ch + 0.012, 0.014)
        sdf_part(f'BadgeClip_{key}', key, lambda Pp: S.sd_round_box(Pp, cp, (0.028, 0.02, 0.008), 0.006),
                 (cp[0] - 0.05, cp[1] - 0.04, cp[2] - 0.03), (cp[0] + 0.05, cp[1] + 0.04, cp[2] + 0.03), M_METAL(), bodyp,
                 h=0.0025, target=220, paint=LIN['brass'])
        socky = 0.29
        for side, sgn in (('L', -1), ('R', 1)):
            p, nrm = body.side_point(socky, sgn, 0.0)
            socket(key, side, bodyp, p, (sgn * 1.0, -0.22, 0.28))
        info.update(top=yt + 0.14, width=A * 2 + 0.2, head_pivot=list(pv))

    elif key == 'Clarity':
        # A lightbulb: a butter dip-glaze globe (the head, nodding on its collar) over a bisque band,
        # a champagne threaded collar and a coal insulator. It holds a brass loupe.
        gp = catmull([(0.56, 0.0), (0.6, 0.2), (0.66, 0.232), (0.74, 0.246), (0.84, 0.284), (0.96, 0.36), (1.08, 0.425),
                      (1.2, 0.46), (1.31, 0.47), (1.42, 0.456), (1.54, 0.4), (1.645, 0.29), (1.715, 0.15), (1.745, 0.05),
                      (1.75, 0.0)], per=3)
        pv = (0.0, 0.68, 0.0)
        head = empty(f'Head_{key}', bodyp, pv)
        body = Body(1.0, 1.0, 2.0, gp, N=64)
        # the glaze coat: the globe above a drippy edge, 4 mm proud, with a rounded lip at the edge
        runs = [(-2.35, 0.16, 0.2), (-1.3, 0.1, 0.16), (-0.55, 0.2, 0.17), (0.35, 0.13, 0.15), (1.2, 0.22, 0.19),
                (1.95, 0.09, 0.13), (2.7, 0.15, 0.16)]

        def glaze_edge(t):
            e = 0.985 + 0.012 * math.sin(3 * t + 0.7) + 0.007 * math.sin(7 * t + 1.3)
            for c, depth, width in runs:
                u = math.atan2(math.sin(t - c), math.cos(t - c)) / width
                if abs(u) < 1:
                    w = math.sqrt(1 - u * u)
                    e -= depth * w ** 1.6
            return e
        NG = 72
        ytop = 1.75
        grow = []
        gverts, guvs = [], []
        nrows = 23
        per = 2 * math.pi * 0.47 * UVSCALE
        for r_i in range(nrows + 1):
            row = []
            for k in range(NG):
                t = -math.pi / 2 + 2 * math.pi * k / NG
                e = glaze_edge(t)
                f = r_i / nrows
                # rows bunch toward the edge so the drips have a crisp outline
                y = ytop - (ytop - e) * (1 - (1 - f) ** 1.7)
                rr = body.s(y) + 0.004
                if r_i == nrows:
                    rr -= 0.0035
                    y += 0.001
                row.append(len(gverts))
                gverts.append((rr * math.cos(t), y, rr * math.sin(t)))
                guvs.append((k / NG * per, (ytop - y) * UVSCALE))
            grow.append(row)
        # lip: tuck under at the edge
        lip = []
        for k in range(NG):
            t = -math.pi / 2 + 2 * math.pi * k / NG
            y = glaze_edge(t) + 0.004
            rr = body.s(y) - 0.001
            lip.append(len(gverts))
            gverts.append((rr * math.cos(t), y, rr * math.sin(t)))
            guvs.append((k / NG * per, (ytop - y) * UVSCALE))
        grow.append(lip)
        gfaces = []
        top_pole = len(gverts)
        gverts.append((0.0, ytop + 0.004, 0.0))
        guvs.append((0.0, 0.0))
        for k in range(NG):
            gfaces.append((top_pole, grow[0][(k + 1) % NG], grow[0][k]))
        for rr_ in range(len(grow) - 1):
            a, b = grow[rr_], grow[rr_ + 1]
            for k in range(NG):
                k1 = (k + 1) % NG
                gfaces.append((a[k], a[k1], b[k1], b[k]))
        gverts = [(x - pv[0], y - pv[1], z - pv[2]) for x, y, z in gverts]
        mk(f'Glaze_{key}', gverts, gfaces, shell, head, uvs=guvs, uv_period=per, key=key)
        # the bisque band under the glaze (only where it can show)
        bprof = [p for p in gp if p[0] <= 1.02]
        bprof = [(0.6, 0.0)] + [(y, r) for y, r in bprof if y >= 0.6] + [(1.02, body.s(1.02)), (1.02, 0.0)]
        bb = Body(1.0, 1.0, 2.0, gp, N=36)
        v, f, uvs, per2 = bb.mesh(bprof)
        v = [(x - pv[0], y - pv[1], z - pv[2]) for x, y, z in v]
        mk(f'Bisque_{key}', v, f, M_BISQUE(), head, uvs=uvs, uv_period=per2, key=key)
        # threaded collar (body), insulator (body), glaze tip (head)
        bp = [(0.34, 0.0), (0.345, 0.2), (0.37, 0.228)]
        for j in range(15):
            y = 0.4 + 0.24 * j / 14
            bp.append((y, 0.243 + 0.013 * math.sin(2 * math.pi * (y - 0.4) / 0.08 - math.pi / 2)))
        bp += [(0.648, 0.25), (0.662, 0.256), (0.676, 0.25), (0.684, 0.22), (0.69, 0.0)]
        v, f, uvs, per3 = revolve(bp, 30, with_uv=True)
        mk(f'Collar_{key}', v, f, M_METAL(), bodyp, uvs=uvs, uv_period=per3, paint=LIN['champagne'], key=key)
        iv, ifc = revolve([(-0.42, 0.0), (-0.41, 0.14), (0.2, 0.15), (0.28, 0.2), (0.32, 0.215), (0.35, 0.215), (0.36, 0.0)], 28)
        mk(f'Insulator_{key}', iv, ifc, M_LACQUER(), bodyp, paint=LIN['coal'], key=key)
        tv, tf = revolve([(1.735, 0.0), (1.74, 0.034), (1.765, 0.026), (1.79, 0.013), (1.8, 0.0)], 20)
        mk(f'Tip_{key}', [(x, y - pv[1], z) for x, y, z in tv], tf, shell, head, key=key)
        vc = (0.0, 1.3, 0.335, 0.183, 0.14)
        gbody = Body(1.0, 1.0, 2.0, [(y, r + 0.004) for y, r in gp], N=64)
        visor(gbody, key, head, *vc, pivot=pv)
        for side, sgn in (('L', -1), ('R', 1)):
            p = (sgn * 0.244, 0.545, 0.04)
            socket(key, side, bodyp, p, (sgn * 1.0, -0.05, 0.35))
        info.update(top=1.8, width=0.94, head_pivot=list(pv))

    elif key == 'Structure':
        # Three tapered, offset slabs: a base, a "document" of five sheets with index tabs and a binder
        # clip, and a head in a flat mortarboard with a butter tassel. Soft-touch porcelain.
        tiers = [
            dict(A=0.54, Bz=0.44, yb=-0.42, yt=0.3, hb=0.07, ht=0.08, taper=0.06, cx=0.0, yaw=0.0),
            dict(A=0.47, Bz=0.385, yb=0.33, yt=0.86, hb=0.06, ht=0.07, taper=0.05, cx=0.05, yaw=0.07),
            dict(A=0.5, Bz=0.405, yb=0.89, yt=1.58, hb=0.1, ht=0.12, taper=0.07, cx=-0.035, yaw=-0.045),
        ]
        pv = (-0.035, 0.875, 0.0)
        head = empty(f'Head_{key}', bodyp, pv)
        bodies = []
        for t, T_ in enumerate(tiers):
            yb, yt = T_['yb'], T_['yt']
            side = (lambda yb_, yt_, k_: (lambda y: 1.0 - k_ * (y - yb_) / (yt_ - yb_)))(yb, yt, T_['taper'])
            grooves = []
            if t == 1:
                grooves = [(yb + (yt - yb) * f, 0.004, 0.006) for f in (0.24, 0.42, 0.6, 0.78)]
            prof = profile(yb, yt, T_['hb'], 3.2, T_['ht'], 3.4 if t == 2 else 3.2, side, grooves=grooves,
                           nb=5, nt=7 if t < 2 else 9, nside=4 if t < 2 else 6, scale=(T_['A'] + T_['Bz']) / 2, gs=2)
            bd = Body(T_['A'], T_['Bz'], 3.8, prof, N=40, cx=T_['cx'])
            v, f, uvs, per = bd.mesh()
            R = Ry(T_['yaw'])
            v = transform_verts([(x - T_['cx'], y, z) for x, y, z in v], R, (T_['cx'], 0, 0))
            if t == 2:
                v = [(x - pv[0], y - pv[1], z - pv[2]) for x, y, z in v]
                mk(f'HeadShell_{key}', v, f, shell, head, uvs=uvs, uv_period=per, key=key)
            else:
                mk(f'Tier{t + 1}_{key}', v, f, shell, bodyp, uvs=uvs, uv_period=per, key=key)
            bodies.append((bd, R, T_))
        cv, cf = revolve([(-0.3, 0.0), (-0.29, 0.2), (1.12, 0.2), (1.14, 0.0)], 32)
        mk(f'Spine_{key}', cv, cf, M_LACQUER(), bodyp, paint=LIN['coal'], key=key)
        # index tabs out of the document's right side (glossy plastic tabs: butter, paper, cobalt)
        bd2, R2, T2 = bodies[1]
        for ti, (ty, tz, colr) in enumerate([(0.47, 0.12, LIN['butter']), (0.58, -0.02, LIN['paper']), (0.69, 0.1, LIN['velvet'])]):
            tv, tf = superellipsoid(0.05, 0.028, 0.055, e=5, nu=16, nv=6)
            sx = T2['cx'] + T2['A'] * bd2.s(ty) - 0.01
            tv = transform_verts(tv, R2 @ Rz(-0.05 * (ti - 1)), (0, 0, 0))
            tv = [(x + sx + 0.03, y + ty, z + tz) for x, y, z in tv]
            mk(f'Tab{ti}_{key}', tv, tf, M_LACQUER(), bodyp, paint=colr, key=key)
        # binder clip on the document's front-left top edge (coal) with champagne wire handles
        cxp, cyp = T2['cx'] - 0.24, T2['yt'] - 0.035
        czp = bd2.z(cxp, cyp)
        cv2, cf2 = superellipsoid(0.085, 0.052, 0.03, e=6, nu=24, nv=8)
        mk(f'Clip_{key}', transform_verts(cv2, R2 @ Rx(-0.12)), cf2, M_LACQUER(), bodyp,
           loc=(cxp, cyp, czp + 0.01), paint=LIN['coal'], key=key)
        for sgn in (-1, 1):
            x0 = cxp + sgn * 0.055
            tube_curve(f'ClipWire{"L" if sgn < 0 else "R"}_{key}', key, bodyp,
                       [(x0, cyp + 0.03, czp + 0.03), (x0 + sgn * 0.008, cyp + 0.1, czp + 0.035),
                        (x0 + sgn * 0.004, cyp + 0.16, czp - 0.005), (cxp + sgn * 0.03, cyp + 0.175, czp - 0.06)], 0.0075,
                       M_METAL(), paint=LIN['champagne'], res=4, bevel_res=1)
        # head: visor, then the mortarboard (a flat square board on a skull band) with a butter tassel
        bd3, R3, T3 = bodies[2]
        vc = (T3['cx'], 1.23, 0.335, 0.148, 0.072)
        vb = Body(T3['A'], T3['Bz'], 3.8, bd3.prof, N=40, cx=T3['cx'])
        visor(vb, key, head, *vc, pivot=pv)
        top = T3['yt']
        board_y = top + 0.03
        bv, bf = superellipsoid(0.36, 0.017, 0.36, e=12, nu=32, nv=6)
        Rb = Ry(0.22) @ Rx(0.035) @ Rz(-0.025)
        bv = transform_verts(bv, Rb, (T3['cx'] - pv[0] + 0.01, board_y - pv[1], -0.02))
        mk(f'Board_{key}', bv, bf, M_LACQUER(), head, paint=LIN['coal'], key=key)
        sv, sf = revolve([(top - 0.07, 0.0), (top - 0.07, 0.3), (top + 0.018, 0.31), (top + 0.02, 0.0)], 32)
        sv = [(x * 1.0 + T3['cx'] - pv[0], y - pv[1], z * 0.8 - 0.02) for x, y, z in sv]
        mk(f'Skull_{key}', sv, sf, M_LACQUER(), head, paint=LIN['coal'], key=key)
        btn = (T3['cx'] - pv[0] + 0.01, board_y + 0.022 - pv[1], -0.02)
        corner = Rb @ Vector((0.34, 0.0, 0.34))
        cornerp = (T3['cx'] - pv[0] + 0.01 + corner.x, board_y - pv[1] + corner.y + 0.02, -0.02 + corner.z)
        sdf_part(f'Button_{key}', key, lambda Pp: S.sd_ellipsoid(Pp, btn, (0.04, 0.016, 0.04)),
                 (btn[0] - 0.06, btn[1] - 0.03, btn[2] - 0.06), (btn[0] + 0.06, btn[1] + 0.03, btn[2] + 0.06), M_LACQUER(), head,
                 h=0.004, target=200, paint=LIN['butter'])
        tube_curve(f'Cord_{key}', key, head, [btn, ((btn[0] + cornerp[0]) / 2, btn[1] + 0.005, (btn[2] + cornerp[2]) / 2),
                                              cornerp, (cornerp[0] + 0.01, cornerp[1] - 0.09, cornerp[2] + 0.01)], 0.007,
                   M_LACQUER(), paint=LIN['butter'], res=5, bevel_res=1)
        tp = (cornerp[0] + 0.01, cornerp[1] - 0.12, cornerp[2] + 0.01)
        sdf_part(f'Tassel_{key}', key, lambda Pp: S.smin(S.sd_round_cone(Pp, (tp[0], tp[1] + 0.035, tp[2]), (tp[0], tp[1] - 0.05, tp[2]), 0.014, 0.03),
                                                        S.sd_ellipsoid(Pp, (tp[0], tp[1] + 0.04, tp[2]), (0.02, 0.018, 0.02)), 0.01),
                 (tp[0] - 0.06, tp[1] - 0.1, tp[2] - 0.06), (tp[0] + 0.06, tp[1] + 0.08, tp[2] + 0.06), M_LACQUER(), head,
                 h=0.003, target=300, paint=LIN['butter'])
        for side, sgn in (('L', -1), ('R', 1)):
            yy = 0.56
            xs = T2['cx'] + sgn * T2['A'] * bd2.s(yy)
            p = (R2 @ Vector((xs - T2['cx'], 0, 0.0))).to_tuple()
            socket(key, side, bodyp, (p[0] + T2['cx'], yy, p[2]), (sgn * 1.0, -0.2, 0.3))
        info.update(top=board_y + 0.03, width=1.08, head_pivot=list(pv))

    elif key == 'Conciseness':
        # A metronome: a tall tapered obelisk in turned stone (fine lathe grooves and speckle), a narrow
        # visor, and a champagne needle with a sliding weight that ticks on top.
        A, Bz, n = 0.34, 0.29, 3.4
        yb, yt, ys = -0.42, 1.78, 1.04
        taper = lambda y: 1.0 - 0.4 * (y - yb) / (yt - yb)          # noqa: E731
        prof = profile(yb, yt, 0.1, 2.4, 0.16, 2.6, taper, grooves=[(ys, 0.0065, 0.01)], scale=(A + Bz) / 2, nside=14)
        body = Body(A, Bz, n, prof, N=48)
        lo, up = body.split(ys)
        pv = (0.0, ys, 0.0)
        head = empty(f'Head_{key}', bodyp, pv)
        lathe_part(f'BodyShell_{key}', body, lo, shell, bodyp, key)
        lathe_part(f'HeadShell_{key}', body, up, shell, head, key, pivot=pv)
        vc = (0.0, 1.37, 0.19, 0.145, 0.078)
        visor(body, key, head, *vc, bw=0.038, pivot=pv)
        hub_y = yt - 0.01
        hv, hf, huv, hper = revolve([(hub_y - 0.03, 0.0), (hub_y - 0.03, 0.05), (hub_y + 0.015, 0.05), (hub_y + 0.03, 0.036),
                                     (hub_y + 0.036, 0.0)], 28, with_uv=True)
        mk(f'Hub_{key}', [(x, y - ys, z) for x, y, z in hv], hf, M_METAL(), head, uvs=huv, uv_period=hper, paint=LIN['champagne'],
           key=key)
        pend = empty(f'Needle_{key}', head, (0, hub_y + 0.02 - ys, 0.0))
        sdf_part(f'NeedleMesh_{key}', key,
                 lambda Pp: S.smin(S.smin(S.sd_round_cone(Pp, (0, 0.0, 0), (0, 0.57, 0), 0.02, 0.012),
                                          S.sd_round_box(Pp, (0, 0.36, 0), (0.058, 0.064, 0.036), 0.026), 0.012),
                                   S.sd_ellipsoid(Pp, (0, 0.585, 0), (0.024, 0.03, 0.024)), 0.01),
                 (-0.09, -0.05, -0.06), (0.09, 0.64, 0.06), M_METAL(), pend, h=0.0035, target=700, paint=LIN['champagne'],
                 merge=False)
        for side, sgn in (('L', -1), ('R', 1)):
            p, nrm = body.side_point(0.56, sgn, 0.0)
            socket(key, side, bodyp, p, (sgn * 1.0, -0.2, 0.3))
        info.update(top=yt + 0.62, width=A * 2, head_pivot=list(pv))

    elif key == 'Confidence':
        # A wide cobalt pebble in a broadcast headset with a boom mic: it listens to HOW you say it.
        A, Bz, n = 0.7, 0.55, 2.1
        yb, yt, ys = -0.42, 0.98, 0.235
        belly = lambda y: 1.0 + 0.055 * math.exp(-((y - 0.18) / 0.4) ** 2) - 0.1 * max(0.0, (y - 0.3) / 0.6) ** 2  # noqa: E731
        prof = profile(yb, yt, 0.2, 2.2, 0.44, 2.0, belly, grooves=[(ys, 0.006, 0.01)], scale=(A + Bz) / 2, nside=16)
        body = Body(A, Bz, n, prof, N=48)
        lo, up = body.split(ys)
        pv = (0.0, ys, 0.0)
        head = empty(f'Head_{key}', bodyp, pv)
        lathe_part(f'BodyShell_{key}', body, lo, shell, bodyp, key)
        lathe_part(f'HeadShell_{key}', body, up, shell, head, key, pivot=pv)
        vc = (0.0, 0.52, 0.42, 0.166, 0.126)
        visor(body, key, head, *vc, pivot=pv)
        cy = 0.52
        sx = A * body.s(cy)
        cxh = sx + 0.055
        ex, ey = cxh, cy + 0.12
        top = yt + 0.058
        arc_c = (top ** 2 - ex ** 2 - ey ** 2) / (2 * (top - ey))
        arc_r = top - arc_c
        a0 = math.atan2(ey - arc_c, ex)
        off = lambda P_: P_ + np.array([0.0, ys, 0.0])  # head space -> the SDF's examiner space  # noqa: E731

        def shell_F(Pp):
            Pp = off(Pp)
            cups = np.minimum(S.sd_round_cylinder(Pp, (-cxh, cy, -0.02), (1, 0, 0), 0.158, 0.05, 0.04),
                              S.sd_round_cylinder(Pp, (cxh, cy, -0.02), (1, 0, 0), 0.158, 0.05, 0.04))
            band = S.sd_arc_band(Pp, (0, arc_c, -0.02), arc_r, a0 - 0.06, math.pi - a0 + 0.06, 0.02, 0.046, 0.017)
            return S.smin(cups, band, 0.03)
        sdf_part(f'Headset_{key}', key, shell_F, (-cxh - 0.12, cy - 0.22 - ys, -0.2), (cxh + 0.12, top + 0.06 - ys, 0.16),
                 M_LACQUER(), head, h=0.0045, target=1500, paint=LIN['paper'])

        def cushions_F(Pp):
            Pp = off(Pp)
            rings = np.minimum(S.sd_torus(Pp, (-(sx - 0.004), cy, -0.02), (1, 0, 0), 0.112, 0.036),
                               S.sd_torus(Pp, (sx - 0.004, cy, -0.02), (1, 0, 0), 0.112, 0.036))
            pad = S.sd_ellipsoid(Pp, (0, yt + 0.02, -0.02), (0.17, 0.032, 0.05))
            return np.minimum(rings, pad)
        sdf_part(f'Cushions_{key}', key, cushions_F, (-sx - 0.1, cy - 0.17 - ys, -0.2), (sx + 0.1, yt + 0.07 - ys, 0.16),
                 M_RUBBER(), head, h=0.0045, target=900, paint=LIN['coal'], uv=True)

        def trims_F(Pp):
            Pp = off(Pp)
            return np.minimum(S.sd_torus(Pp, (-(cxh + 0.05), cy, -0.02), (1, 0, 0), 0.118, 0.011),
                              S.sd_torus(Pp, (cxh + 0.05, cy, -0.02), (1, 0, 0), 0.118, 0.011))
        sdf_part(f'CupTrim_{key}', key, trims_F, (-cxh - 0.08, cy - 0.15 - ys, -0.16), (cxh + 0.08, cy + 0.15 - ys, 0.12),
                 M_METAL(), head, h=0.0035, target=420, paint=LIN['champagne'])
        bx = -(cxh - 0.01)
        tube_curve(f'Boom_{key}', key, head,
                   [(bx, cy - 0.07 - ys, 0.08), (bx + 0.03, cy - 0.17 - ys, 0.3), (-0.5, cy - 0.23 - ys, 0.5),
                    (-0.33, cy - 0.245 - ys, 0.575)], 0.0125, M_METAL(), paint=LIN['champagne'])
        sdf_part(f'Mic_{key}', key, lambda Pp: S.sd_round_cone(off(Pp), (-0.345, cy - 0.245, 0.572), (-0.265, cy - 0.25, 0.59), 0.042, 0.04),
                 (-0.42, cy - 0.32 - ys, 0.5), (-0.2, cy - 0.18 - ys, 0.66), M_RUBBER(), head, h=0.0035, target=300,
                 paint=LIN['coal'], uv=True)
        for side, sgn in (('L', -1), ('R', 1)):
            p, nrm = body.side_point(0.12, sgn, 0.0)
            socket(key, side, bodyp, p, (sgn * 1.0, -0.05, 0.3))
        info.update(top=top + 0.03, width=(cxh + 0.1) * 2, head_pivot=list(pv))

    RIG[key] = info
    return root, bodyp


# ---------------------------------------------------------------------------------------
# Hands, arms, paddles
# ---------------------------------------------------------------------------------------
MITTEN = mitten_mesh()
MITTEN_ME = MITTEN.data
CV, CF, CUV, CPER, CPAINT = cuff_part()
cuff_ob = mk('CuffTmp', CV, CF, M_FABRIC(), None, uvs=CUV, uv_period=CPER, paint=CPAINT, merge=False, bake=False)
# join the cuff into the mitten mesh (one draw per hand); its Curl deltas are zero
with bpy.context.temp_override(active_object=MITTEN, selected_editable_objects=[MITTEN, cuff_ob], selected_objects=[MITTEN, cuff_ob]):
    bpy.ops.object.join()
MITTEN_ME = MITTEN.data
MITTEN_ME.name = 'MittenMesh'
PARTS.pop('CuffTmp', None)
COIN_V, COIN_F, COIN_P, COIN_H = coin_parts()
coin_proto = mk('CoinProto', COIN_V, COIN_F, M_COIN(), None, paint=COIN_P, merge=False, bake=False, sharp=40)
COIN_ME = coin_proto.data
COIN_ME.name = 'CoinMesh'


def loupe_meshes():
    """The loupe (Clarity): grip at the origin, handle along +y, lens centre at (0, LOUPE_Y, 0), lens normal +z.
    A brass rim big enough to frame one screen eye, a coal handle with a brass ferrule."""
    ly = 0.3
    RR = 0.13

    def rim_F(Pp):
        ring = S.sd_torus(Pp, (0, ly, 0), (0, 0, 1), RR, 0.016)
        neck = S.sd_round_cone(Pp, (0, ly - RR - 0.014, 0), (0, ly - RR + 0.01, 0), 0.022, 0.017)
        ferrule = S.sd_round_cylinder(Pp, (0, 0.1, 0), (0, 1, 0), 0.026, 0.022, 0.006)
        stem = S.sd_capsule(Pp, (0, 0.1, 0), (0, ly - RR - 0.01, 0), 0.014)
        return S.smin(np.minimum(np.minimum(ring, ferrule), stem), neck, 0.012)
    parts = [('LoupeRim', rim_F, (-0.17, 0.05, -0.05), (0.17, ly + 0.17, 0.05), M_METAL(), LIN['brass'], 700)]

    def handle_F(Pp):
        return S.sd_round_cone(Pp, (0, -0.1, 0), (0, 0.085, 0), 0.021, 0.019)
    parts.append(('LoupeHandle', handle_F, (-0.04, -0.14, -0.04), (0.04, 0.11, 0.04), M_LACQUER(), LIN['coal'], 260))
    lv, lf = revolve([(-0.007, 0.0), (-0.007, 0.06), (-0.004, 0.105), (0.0, RR - 0.004), (0.004, 0.105), (0.007, 0.06), (0.007, 0.0)], 40)
    lv = transform_verts(lv, Rx(math.pi / 2), (0, ly, 0))
    return parts, (lv, lf), ly


LOUPE_PARTS, LOUPE_LENS, LOUPE_Y = loupe_meshes()


def paddle_pivot_rot(side):
    # paddle +y (handle -> disc) = wrist +x on the right hand (thumb side), -x on the mirrored left hand
    return Rz(-math.pi / 2) if side == 'R' else Rz(math.pi / 2)


def attach_hand(key, side, root):
    wrist = empty(f'Wrist{side}_{key}', root, (0, 0, 0))
    m = bpy.data.objects.new(f'Mitten{side}_{key}', MITTEN_ME)
    COL.objects.link(m)
    m.parent = wrist
    if side == 'L':
        xform(m, (0, 0, 0), scale=(-1, 1, 1))
    PARTS[m.name] = dict(key=key, merge=False, bake=False, group=key + '_hands')
    return wrist


def attach_paddle(key, wrist, side):
    p = empty(f'Paddle_{key}', wrist, GRIP, paddle_pivot_rot(side))
    c = bpy.data.objects.new(f'Coin_{key}', COIN_ME)
    COL.objects.link(c)
    c.parent = p
    PARTS[c.name] = dict(key=key, merge=False, bake=False, group=key + '_paddle')
    h = COIN_H - 0.005 + 0.0012
    empty(f'PaddleFront_{key}', p, (0, YD, h))
    empty(f'PaddleBack_{key}', p, (0, YD, -h), Rx(math.pi))
    return p


def attach_loupe(key, wrist, side):
    node = empty(f'Loupe_{key}', wrist, GRIP, paddle_pivot_rot(side))
    for name, F, lo, hi, material, paint, target in LOUPE_PARTS:
        sdf_part(f'{name}_{key}', key, F, lo, hi, material, node, h=0.003, target=target, paint=paint, merge=True, bake='loupe')
    lv, lf = LOUPE_LENS
    mk(f'LoupeLens_{key}', lv, lf, M_LENS(), node, key=key, merge=False, bake=False)
    return node


# ---------------------------------------------------------------------------------------
# Bench: a slim satin cobalt top with a paper edge (the pad of the exam script), a recessed apron
# ---------------------------------------------------------------------------------------
LABELS = {}


def build_bench():
    root = empty('Bench', None, (0, 0, 0))
    rb, dp, t, span = BENCH['r_back'], BENCH['depth'], BENCH['top'], BENCH['span']
    rf = rb - dp
    NA = 44

    def sweep(name, prof, material, paint=WHITE, uv_scale=UVSCALE, closed=True):
        verts, uvs, rows = [], [], []
        for j in range(NA + 1):
            a = -span + 2 * span * j / NA
            row = []
            acc = 0.0
            for k, (rr, y) in enumerate(prof):
                if k:
                    acc += math.dist(prof[k], prof[k - 1])
                row.append(len(verts))
                verts.append((rr * math.sin(a), y, ARC_C - rr * math.cos(a)))
                uvs.append((a * rf * uv_scale, acc * uv_scale))
            rows.append(row)
        faces = []
        m = len(prof)
        for j in range(NA):
            a, b = rows[j], rows[j + 1]
            for k in range(m if closed else m - 1):
                k1 = (k + 1) % m
                faces.append((a[k], a[k1], b[k1], b[k]))
        for j, flip in ((0, True), (NA, False)):
            aa = -span + 2 * span * j / NA
            cr = sum(p[0] for p in prof) / m
            cy = sum(p[1] for p in prof) / m
            c = len(verts)
            verts.append((cr * math.sin(aa), cy, ARC_C - cr * math.cos(aa)))
            uvs.append((0, 0))
            for k in range(m):
                k1 = (k + 1) % m
                f = (rows[j][k], rows[j][k1], c)
                faces.append(f[::-1] if flip else f)
        return mk(name, verts, faces, material, root, uvs=uvs, paint=paint, key='Bench', bake='bench', sharp=35)

    # top slab (radius, y) as a rounded rectangle; the paper nosing wraps its front edge
    top = [(rf + 0.03 + (dp - 0.03) / 2 + x, -t / 2 + y) for (x, y) in rrect((dp - 0.03) / 2, t / 2, 0.012, k=2, ex=1, ey=1)]
    sweep('BenchTop', top, M_BENCH())
    nose = [(rf + 0.018 + x, -t / 2 + y) for (x, y) in rrect(0.018, t / 2 + 0.004, 0.01, k=2, ex=1, ey=2)]
    sweep('BenchPaper', nose, M_BENCH_PAPER())
    apron_h = -t - BENCH['floor']
    apron = [(rf + BENCH['recess'] + 0.05 + x, (BENCH['floor'] - t) / 2 + y) for (x, y) in rrect(0.05, apron_h / 2, 0.008, k=2, ex=1, ey=2)]
    sweep('BenchApron', apron, M_BENCH())
    # label anchors: on the apron face below each seat, +z out of the apron (text curves with radius r)
    r_face = rf + BENCH['recess'] - 0.0005
    for i, key in enumerate(AXES):
        a = ANGLES[i]
        # two staggered rows: adjacent seats are only ~0.6 apart on the apron, too tight for a 14 px cap
        y = -t - (0.1 if i % 2 == 0 else 0.27)
        pos = (r_face * math.sin(a), y, ARC_C - r_face * math.cos(a))
        empty(f'BenchLabel_{key}', root, pos, Ry(-a))
        LABELS[key] = dict(pos=[round(x, 4) for x in pos], yaw=round(-a, 4), curveRadius=round(r_face, 4))
    return root


# ---------------------------------------------------------------------------------------
# Rest pose (hands on the bench, the paddle face-down with its axis name up) + arms in that pose
# ---------------------------------------------------------------------------------------
def world_of(ob):
    return ob.matrix_world


def gl_mat(ob):
    """An object's world matrix in glTF space (4x4)."""
    Mw = ob.matrix_world
    C = Matrix(((1, 0, 0, 0), (0, 0, 1, 0), (0, -1, 0, 0), (0, 0, 0, 1)))    # Blender -> glTF
    return C @ Mw @ C.inverted()


def set_local_gl(ob, pos, R):
    xform(ob, pos, R)


REST = {}


def mitten_points(curl, side, step=2):
    """Mitten (+cuff) vertices at a curl, in wrist space (glTF), mirrored for the left hand."""
    kb = MITTEN_ME.shape_keys.key_blocks
    base, tgt = kb['Basis'].data, kb['Curl'].data
    mx = -1 if side == 'L' else 1
    out = []
    for i in range(0, len(base), step):
        b, t = base[i].co, tgt[i].co
        p = b + (t - b) * curl
        out.append(Vector((p.x * mx, p.z, -p.y)))
    return out


def coin_points():
    pts = []
    for a in np.linspace(0, 2 * math.pi, 36, endpoint=False):
        for zz in (-COIN_H, COIN_H):
            pts.append(Vector((COIN_R * math.cos(a), YD + COIN_R * math.sin(a), zz)))
    return pts


def rest_pose(key, root, wrists, paddle_side):
    """Hands resting on the bench in front of the body. The free hand rests on its fingertips with the
    wrist lifted (so the conduit arrives from above the bench, never through it). The paddle hand holds
    its paddle face-down: a two-contact solve tips the fist until the coin's far rim and the fist both
    touch the bench (the toys contact solver, done here in closed form)."""
    out = {}
    for side in ('L', 'R'):
        sgn = -1 if side == 'L' else 1
        hold = side == paddle_side
        if not hold:
            fingers = Vector((-sgn * 0.16, -0.3, 1.0)).normalized()
            back = Vector((0, 1, 0.25))
            z = (back - fingers * back.dot(fingers)).normalized()
            x = fingers.cross(z).normalized()
            R = Matrix((x, fingers, z)).transposed()
            curl = 0.22
            pts = mitten_points(curl, side)
            low = min((R @ p).y for p in pts)
            pos = Vector((sgn * 0.36, -low + 0.003, 0.6))
            out[side] = dict(pos=pos, R=R, curl=curl)
            continue
        # knuckles across the body, back of the hand up: the thumb axis (the handle) points forward-inward
        fingers = Vector((sgn * 0.9, 0.0, 0.42)).normalized()
        z0 = Vector((0, 1, 0))
        x0 = fingers.cross(z0).normalized()
        R0 = Matrix((x0, fingers, z0)).transposed()
        flip = math.pi                      # the mark faces down, the axis name up
        Rp = paddle_pivot_rot(side) @ Ry(flip)
        grip_l = Vector(GRIP)
        handle = (R0 @ (Rp @ Vector((0, 1, 0)))).normalized()
        axis = handle.cross(Vector((0, 1, 0))).normalized()
        fist = mitten_points(1.0, side)
        coin = coin_points()
        base_pos = Vector((sgn * 0.3, 0.0, 0.48))

        def lows(alpha):
            Rt = Matrix.Rotation(alpha, 3, axis) @ R0
            grip_w = base_pos + R0 @ grip_l                 # keep the grip point fixed while tipping
            pos = grip_w - Rt @ grip_l
            c = min((pos + Rt @ (grip_l + Rp @ q)).y for q in coin)
            f = min((pos + Rt @ p).y for p in fist)
            return c, f, pos, Rt
        lo_, hi_ = -0.6, 0.6
        for _ in range(40):
            mid = (lo_ + hi_) / 2
            c, f, _, _ = lows(mid)
            # tipping positively lowers the coin relative to the fist (sign checked below)
            if c > f:
                lo_ = mid
            else:
                hi_ = mid
        c, f, pos, Rt = lows((lo_ + hi_) / 2)
        if abs(c - f) > 0.01:                               # the other sign convention
            lo_, hi_ = -0.6, 0.6
            for _ in range(40):
                mid = (lo_ + hi_) / 2
                c, f, _, _ = lows(mid)
                if c < f:
                    lo_ = mid
                else:
                    hi_ = mid
            c, f, pos, Rt = lows((lo_ + hi_) / 2)
        pos = pos - Vector((0, min(c, f) - 0.0015, 0))
        out[side] = dict(pos=pos, R=Rt, curl=1.0, flip=flip, contact=[round(c - min(c, f), 4), round(f - min(c, f), 4)])
    REST[key] = out
    return out


def apply_rest(key, wrists, pose):
    for side, wrist in wrists.items():
        p = pose[side]
        xform(wrist, tuple(p['pos']), p['R'])


# ---------------------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------------------
EX = {}
for i, key in enumerate(AXES):
    root, bodyp = build_examiner(i, key)
    wrists = {s: attach_hand(key, s, root) for s in ('L', 'R')}
    ps = PADDLE_SIDE[key]
    paddle = attach_paddle(key, wrists[ps], ps)
    loupe = attach_loupe(key, wrists['R' if ps == 'L' else 'L'], 'R' if ps == 'L' else 'L') if key == 'Clarity' else None
    EX[key] = dict(root=root, body=bodyp, wrists=wrists, paddle=paddle, loupe=loupe)
    apply_rest(key, wrists, rest_pose(key, root, wrists, ps))
build_bench()
bpy.context.view_layer.update()


def solve_paddle_rest(key):
    e = EX[key]
    side = PADDLE_SIDE[key]
    xform(e['paddle'], GRIP, paddle_pivot_rot(side) @ Ry(REST[key][side]['flip']))


for key in AXES:
    solve_paddle_rest(key)
bpy.context.view_layer.update()

# Arms in the rest pose (mesh under Body_<Axis>, both arms in one primitive: one draw call)
for key in AXES:
    e = EX[key]
    bodyp = e['body']
    inv = gl_mat(bodyp).inverted()
    verts, norms, uvs, faces = [], [], [], []
    for side, uoff in (('L', 0.0), ('R', 2.0)):
        sock = bpy.data.objects[f'Socket{side}_{key}']
        Ms = inv @ gl_mat(sock)
        S0 = Ms.to_translation()
        a = (Ms.to_3x3() @ Vector((0, 1, 0))).normalized()
        Mw = inv @ gl_mat(e['wrists'][side])
        E = Mw @ Vector((0, -ARM['cuffDepth'], 0))
        b = (Mw.to_3x3() @ Vector((0, 1, 0))).normalized()
        v, n, u, f = arm_tube(S0, a, E, b, ARM_LEN[key], uoff)
        base = len(verts)
        verts += v
        norms += n
        uvs += u
        faces += [tuple(i + base for i in q) for q in f]
    ob = mk(f'Arms_{key}', verts, faces, M_RUBBER(), bodyp, uvs=uvs, paint=LIN['rubber'], key=key, merge=False, bake=False)
    ob.data.normals_split_custom_set_from_vertices([B(nv) for nv in norms])
    # darken the ends a touch where the conduit enters the ferrule and the cuff (baked-AO stand-in)
    me = ob.data
    col = np.ones((len(me.vertices), 4))
    for vi, (uu, vv) in enumerate(uvs):
        t = vv / ARM['ribs']
        col[vi, :3] = LIN['rubber']
        col[vi, 3] = 1.0 - 0.45 * (1 - smoothstep(0.0, 0.1, t)) - 0.35 * smoothstep(0.9, 1.0, t)
    me.color_attributes['Col'].data.foreach_set('color', col.ravel())

# Curl values for the rest pose (shape keys are per mesh, so the GLB default is the flat hand;
# rig.ts REST_POSE carries the per-hand curls)
MITTEN_ME.shape_keys.key_blocks['Curl'].value = 0.0
for ob in [o for o in bpy.data.objects if o.name.endswith('Proto') and o.name != 'CoinProto']:
    bpy.data.objects.remove(ob)
if 'CoinProto' in bpy.data.objects:
    bpy.data.objects.remove(bpy.data.objects['CoinProto'])
bpy.context.view_layer.update()


# ---------------------------------------------------------------------------------------
# Triangle budget (per examiner, counting shared meshes per instance)
# ---------------------------------------------------------------------------------------
def tris_of(me):
    return sum(len(p.vertices) - 2 for p in me.polygons)


BUDGET = {}
PART_TRIS = {}
for o in bpy.data.objects:
    if o.type == 'MESH':
        PART_TRIS[o.name] = tris_of(o.data)
for o in bpy.data.objects:
    if o.type != 'MESH':
        continue
    info = PARTS.get(o.name, {})
    g = info.get('group') or 'misc'
    k = g.split('_')[0]
    BUDGET.setdefault(k, {}).setdefault(g, 0)
    BUDGET[k][g] += tris_of(o.data)


# ---------------------------------------------------------------------------------------
# Merge static parts per pivot per material
# ---------------------------------------------------------------------------------------
def merge_all():
    groups = {}
    for o in list(bpy.data.objects):
        if o.type != 'MESH':
            continue
        info = PARTS.get(o.name)
        if not info or not info.get('merge') or o.data.shape_keys:
            continue
        mname = o.data.materials[0].name if o.data.materials else ''
        groups.setdefault((o.parent.name if o.parent else '', mname), []).append(o)
    merged = []
    for (pname, mname), obs in groups.items():
        target = obs[0]
        if len(obs) > 1:
            bpy.ops.object.select_all(action='DESELECT')
            for o in obs:
                o.select_set(True)
            with bpy.context.temp_override(active_object=target, selected_editable_objects=obs, selected_objects=obs):
                bpy.ops.object.join()
        short = mname.replace('ex_', '').replace('shell_', 'shell_')
        target.name = f'{pname}__{short}' if pname else f'{mname}'
        target.data.name = target.name
        PARTS[target.name] = dict(PARTS.get(obs[0].name, {}), merge=False)
        merged.append(target)
    return merged


merge_all()
bpy.context.view_layer.update()


# ---------------------------------------------------------------------------------------
# AO bake into COLOR_0.a (Cycles, per bake group; neighbours and moving parts excluded)
# ---------------------------------------------------------------------------------------
def bake_group(objs, distance):
    meshes = [o for o in objs if o.type == 'MESH']
    if not meshes:
        return
    for o in bpy.data.objects:
        o.hide_render = o not in meshes
        o.select_set(False)
    done, sel = set(), []
    for o in meshes:
        me = o.data
        if me.name in done:
            continue
        done.add(me.name)
        if 'AO' in me.color_attributes:
            me.color_attributes.remove(me.color_attributes['AO'])
        me.color_attributes.new('AO', 'FLOAT_COLOR', 'POINT')
        me.color_attributes.active_color_name = 'AO'
        o.select_set(True)
        sel.append(o)
    SC.world.light_settings.distance = distance
    bpy.context.view_layer.objects.active = sel[0]
    with bpy.context.temp_override(selected_objects=sel, active_object=sel[0], object=sel[0]):
        bpy.ops.object.bake(type='AO', target='VERTEX_COLORS', margin=0)
    for o in sel:
        me = o.data
        n = len(me.vertices)
        ao = np.empty(n * 4)
        me.color_attributes['AO'].data.foreach_get('color', ao)
        col = np.empty(n * 4)
        me.color_attributes['Col'].data.foreach_get('color', col)
        col = col.reshape(-1, 4)
        col[:, 3] = np.clip(ao.reshape(-1, 4)[:, 0], 0, 1)
        me.color_attributes['Col'].data.foreach_set('color', col.ravel())
        me.color_attributes.remove(me.color_attributes['AO'])
        me.color_attributes.active_color_name = 'Col'


if DO_BAKE:
    SC.render.engine = 'CYCLES'
    SC.cycles.device = 'CPU'
    SC.cycles.samples = 48
    SC.render.threads_mode = 'FIXED'
    SC.render.threads = 2
    SC.world = bpy.data.worlds.new('W')
    by = {}
    for o in bpy.data.objects:
        if o.type != 'MESH':
            continue
        b = PARTS.get(o.name, {}).get('bake')
        if b:
            by.setdefault(b, []).append(o)
    for g, objs in by.items():
        bake_group(objs, 0.3 if g in AXES else 0.12 if g == 'loupe' else 0.3)
    # shared meshes: the mitten (flat pose) and the coin, each alone
    m = bpy.data.objects[f'MittenR_{AXES[0]}']
    bake_group([m], 0.06)
    c = bpy.data.objects[f'Coin_{AXES[0]}']
    bake_group([c], 0.05)
    for o in bpy.data.objects:
        o.hide_render = False
    print(f'[bake] done at {time.time() - T0:.1f}s')

# ---------------------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------------------
for o in bpy.data.objects:
    o.select_set(False)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_apply=True, export_morph=True, export_morph_normal=True,
                          export_yup=True, export_vertex_color='ACTIVE', export_all_vertex_colors=False,
                          export_active_vertex_color_when_no_material=True, export_materials='EXPORT', export_cameras=False,
                          export_lights=False, export_extras=False, export_texcoords=True, export_normals=True,
                          export_tangents=False, export_image_format='NONE')
RAW_BYTES = os.path.getsize(OUT)


# ---------------------------------------------------------------------------------------
# Pack: KHR_mesh_quantization only (no decoder, no WASM: three's GLTFLoader reads these natively).
# COLOR_0 -> UNSIGNED_BYTE normalized, NORMAL -> BYTE normalized, static POSITION -> SHORT normalized
# with the dequantisation folded into the (leaf) mesh node's TRS; morph deltas in the same space.
# ---------------------------------------------------------------------------------------
def pack_glb(path):
    raw = open(path, 'rb').read()
    jl = struct.unpack('<I', raw[12:16])[0]
    J = json.loads(raw[20:20 + jl])
    off = 20 + jl
    bl = struct.unpack('<I', raw[off:off + 4])[0]
    BIN = raw[off + 8:off + 8 + bl]
    views = [bytearray(BIN[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']]) for v in J['bufferViews']]
    acc = J['accessors']
    DT = {5126: np.float32, 5123: np.uint16, 5121: np.uint8, 5122: np.int16, 5120: np.int8, 5125: np.uint32}
    NORM = {np.uint16: 65535, np.uint8: 255, np.int16: 32767, np.int8: 127}
    NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}

    def view_array(vi, dt, comps, count, byte_offset=0):
        stride = J['bufferViews'][vi].get('byteStride')
        data = np.frombuffer(bytes(views[vi]), dtype=np.uint8)[byte_offset:]
        isz = np.dtype(dt).itemsize
        if stride and stride != comps * isz:
            rows = np.lib.stride_tricks.as_strided(data, shape=(count, comps * isz), strides=(stride, 1))
            return np.frombuffer(rows.copy().tobytes(), dtype=dt).reshape(count, comps)
        return np.frombuffer(data[: count * comps * isz].tobytes(), dtype=dt).reshape(count, comps)

    def read(ai):
        A = acc[ai]
        comps = NC[A['type']]
        dt = DT[A['componentType']]
        if 'bufferView' in A:
            arr = view_array(A['bufferView'], dt, comps, A['count'], A.get('byteOffset', 0)).astype(np.float64)
        else:
            arr = np.zeros((A['count'], comps))
        if A.get('normalized'):
            arr = arr / NORM[dt]
        sp = A.get('sparse')
        if sp:
            ii = view_array(sp['indices']['bufferView'], DT[sp['indices']['componentType']], 1, sp['count'],
                            sp['indices'].get('byteOffset', 0)).ravel().astype(np.int64)
            vals = view_array(sp['values']['bufferView'], dt, comps, sp['count'], sp['values'].get('byteOffset', 0)).astype(np.float64)
            if A.get('normalized'):
                vals = vals / NORM[dt]
            arr[ii] = vals
        return arr

    def write(ai, arr, ctype, normalized):
        A = acc[ai]
        comps = arr.shape[1]
        dt = DT[ctype]
        size = np.dtype(dt).itemsize
        stride = comps * size
        if stride % 4:
            stride += 4 - stride % 4
        buf = np.zeros((A['count'], stride // size), dtype=dt)
        if normalized:
            lo = -1 if np.issubdtype(dt, np.signedinteger) else 0
            buf[:, :comps] = np.round(np.clip(arr, lo, 1) * NORM[dt]).astype(dt)
        else:
            buf[:, :comps] = arr.astype(dt)
        views.append(bytearray(buf.tobytes()))
        J['bufferViews'].append({'buffer': 0, 'byteLength': len(views[-1]), 'byteStride': stride, 'target': 34962})
        A['bufferView'] = len(J['bufferViews']) - 1
        A['byteOffset'] = 0
        A['componentType'] = ctype
        A.pop('sparse', None)
        if normalized:
            A['normalized'] = True
        else:
            A.pop('normalized', None)
        if normalized:
            q = buf[:, :comps].astype(np.float64) / NORM[dt]
        else:
            q = buf[:, :comps].astype(np.float64)
        return A, q

    node_of_mesh = {}
    for ni, nd in enumerate(J['nodes']):
        if 'mesh' in nd:
            node_of_mesh.setdefault(nd['mesh'], []).append(ni)
    done = set()
    QUANT = {}
    for mi, m in enumerate(J['meshes']):
        nodes = node_of_mesh.get(mi, [])
        quant = bool(nodes) and all('children' not in J['nodes'][n] for n in nodes) and not m.get('name', '').startswith('Arms_')
        prims = m['primitives']
        ctr = np.zeros(3)
        half = np.ones(3)
        if quant:
            lo = np.min([acc[pr['attributes']['POSITION']]['min'] for pr in prims], 0)
            hi = np.max([acc[pr['attributes']['POSITION']]['max'] for pr in prims], 0)
            ctr = (lo + hi) / 2
            half = np.maximum((hi - lo) / 2, 1e-6)
            QUANT[mi] = (ctr, half)
        for pr in prims:
            at = pr['attributes']
            if 'COLOR_0' in at and at['COLOR_0'] not in done:
                A, _ = write(at['COLOR_0'], read(at['COLOR_0']), 5121, True)
                A.pop('min', None)
                A.pop('max', None)
                done.add(at['COLOR_0'])
            n0 = read(at['NORMAL']) if 'NORMAL' in at else None
            if quant and at['POSITION'] not in done:
                p = read(at['POSITION'])
                A, q = write(at['POSITION'], (p - ctr) / half, 5122, True)
                # bounds of a normalized accessor are its raw integers (three scales them by 1/32767 for
                # the bounding sphere that frustum culling and raycasts use)
                qi = np.round(q * 32767).astype(np.int64)
                A['min'], A['max'] = qi.min(0).tolist(), qi.max(0).tolist()
                done.add(at['POSITION'])
            nq = None
            if n0 is not None and at['NORMAL'] not in done:
                nq = n0 * half[None, :]
                nq = nq / np.maximum(np.linalg.norm(nq, axis=1, keepdims=True), 1e-9)
                A, _ = write(at['NORMAL'], nq, 5120, True)
                A.pop('min', None)
                A.pop('max', None)
                done.add(at['NORMAL'])
            for tg in pr.get('targets', []):
                if 'POSITION' in tg and tg['POSITION'] not in done:
                    d = read(tg['POSITION']) / half
                    A, q = write(tg['POSITION'], d, 5126, False)
                    A['min'], A['max'] = q.min(0).tolist(), q.max(0).tolist()
                    done.add(tg['POSITION'])
                if 'NORMAL' in tg and tg['NORMAL'] not in done and n0 is not None:
                    dn = read(tg['NORMAL'])
                    tn = (n0 + dn) * half[None, :]
                    tn = tn / np.maximum(np.linalg.norm(tn, axis=1, keepdims=True), 1e-9)
                    base = nq if nq is not None else n0
                    A, _ = write(tg['NORMAL'], tn - base, 5126, False)
                    A.pop('min', None)
                    A.pop('max', None)
                    done.add(tg['NORMAL'])
        if quant:
            for n in nodes:
                nd = J['nodes'][n]
                t = np.array(nd.get('translation', [0, 0, 0]), dtype=np.float64)
                qx, qy, qz, qw = nd.get('rotation', [0, 0, 0, 1])
                s_ = np.array(nd.get('scale', [1, 1, 1]), dtype=np.float64)
                Rm = np.array([[1 - 2 * (qy * qy + qz * qz), 2 * (qx * qy - qz * qw), 2 * (qx * qz + qy * qw)],
                               [2 * (qx * qy + qz * qw), 1 - 2 * (qx * qx + qz * qz), 2 * (qy * qz - qx * qw)],
                               [2 * (qx * qz - qy * qw), 2 * (qy * qz + qx * qw), 1 - 2 * (qx * qx + qy * qy)]])
                nd['translation'] = (t + Rm @ (s_ * ctr)).tolist()
                nd['scale'] = (s_ * half).tolist()
    # everything still float and not quantised: normals -> int8 (arms keep float positions)
    for m in J['meshes']:
        for pr in m['primitives']:
            at = pr['attributes']
            if 'NORMAL' in at and at['NORMAL'] not in done:
                A, _ = write(at['NORMAL'], read(at['NORMAL']), 5120, True)
                A.pop('min', None)
                A.pop('max', None)
                done.add(at['NORMAL'])
    used = set(a['bufferView'] for a in acc if 'bufferView' in a)
    for a in acc:
        sp = a.get('sparse')
        if sp:
            used.add(sp['indices']['bufferView'])
            used.add(sp['values']['bufferView'])
    remap, newviews, newdata = {}, [], []
    for vi, (v, data) in enumerate(zip(J['bufferViews'], views)):
        if vi in used:
            remap[vi] = len(newviews)
            newviews.append(v)
            newdata.append(data)
    for a in acc:
        if 'bufferView' in a:
            a['bufferView'] = remap[a['bufferView']]
        sp = a.get('sparse')
        if sp:
            sp['indices']['bufferView'] = remap[sp['indices']['bufferView']]
            sp['values']['bufferView'] = remap[sp['values']['bufferView']]
    blob = bytearray()
    for v, data in zip(newviews, newdata):
        while len(blob) % 4:
            blob.append(0)
        v['byteOffset'] = len(blob)
        v['byteLength'] = len(data)
        blob += data
    while len(blob) % 4:
        blob.append(0)
    J['bufferViews'] = newviews
    J['buffers'][0]['byteLength'] = len(blob)
    # the site replaces every material by name, so the stand-ins keep only core glTF fields
    for m in J.get('materials', []):
        m.pop('extensions', None)
    J['extensionsUsed'] = ['KHR_mesh_quantization']
    J['extensionsRequired'] = ['KHR_mesh_quantization']
    J['asset']['generator'] = 'VivaVoce build_examiners.py (Blender 4.5, procedural)'
    js = json.dumps(J, separators=(',', ':')).encode()
    js += b' ' * ((4 - len(js) % 4) % 4)
    total = 12 + 8 + len(js) + 8 + len(blob)
    with open(path, 'wb') as fh:
        fh.write(struct.pack('<III', 0x46546C67, 2, total))
        fh.write(struct.pack('<II', len(js), 0x4E4F534A) + js)
        fh.write(struct.pack('<II', len(blob), 0x004E4942) + blob)
    return J


GJ = pack_glb(OUT)
GLB_BYTES = os.path.getsize(OUT)
GZ_BYTES = len(gzip.compress(open(OUT, 'rb').read(), 9))
print(f'[pack] {RAW_BYTES} -> {GLB_BYTES} bytes ({GZ_BYTES} gzipped)')

# ---------------------------------------------------------------------------------------
# Report + rig.ts generated block
# ---------------------------------------------------------------------------------------
per_examiner = {}
for k in AXES:
    g = BUDGET.get(k, {})
    per_examiner[k] = dict(shell=g.get(k, 0), hands=g.get(k + '_hands', 0), paddle=g.get(k + '_paddle', 0),
                           total=g.get(k, 0) + g.get(k + '_hands', 0) + g.get(k + '_paddle', 0))


def rnd(v, n=4):
    return [round(float(x), n) for x in v]


rest_out = {}
for k in AXES:
    rest_out[k] = {}
    for side, p in REST[k].items():
        q = p['R'].to_quaternion()
        rest_out[k][side] = dict(pos=rnd(p['pos']), quat=rnd([q.x, q.y, q.z, q.w], 5), curl=p['curl'],
                                 **({'flip': p['flip']} if 'flip' in p else {}))

report = dict(glb=os.path.relpath(OUT, WEB), bytes=GLB_BYTES, gzip=GZ_BYTES, bytes_unpacked=RAW_BYTES,
              examiners=per_examiner, bench=BUDGET.get('Bench', {}).get('Bench', 0), rig=RIG, visors=VISORS,
              sockets=SOCKETS, labels=LABELS, rest=rest_out, arm=dict(ARM, length=ARM_LEN), grip=list(GRIP), yd=YD,
              coin=dict(radius=COIN_R, thickness=COIN_T), loupe=dict(lensY=LOUPE_Y, lensRadius=0.126),
              paddleSide=PADDLE_SIDE, bench_dims=dict(BENCH, arc_c=ARC_C, seat_r=SEAT_R, angles=ANGLES),
              parts=dict(sorted(PART_TRIS.items(), key=lambda kv: -kv[1])),
              rest_contact={k: {sd: p.get('contact') for sd, p in v.items()} for k, v in REST.items()},
              meshes=len(GJ['meshes']), nodes=len(GJ['nodes']), materials=[m['name'] for m in GJ['materials']],
              build_s=round(time.time() - T0, 1))
with open(REPORT, 'w') as fh:
    json.dump(report, fh, indent=1)

if os.path.exists(RIG_TS):
    src = open(RIG_TS).read()
    gen = {
        'VISORS': {k.lower(): dict(halfWidth=v['halfWidth'], halfHeight=v['halfHeight'], radius=v['radius'], centre=v['centre'])
                   for k, v in VISORS.items()},
        'SOCKETS': {k.lower(): v for k, v in SOCKETS.items()},
        'SEATS': {k.lower(): dict(position=RIG[k]['seat'], yaw=RIG[k]['yaw'], headPivot=rnd(RIG[k]['head_pivot']),
                                  top=round(RIG[k]['top'], 3)) for k in AXES},
        'BENCH_LABELS': {k.lower(): v for k, v in LABELS.items()},
        'REST_POSE': {k.lower(): v for k, v in rest_out.items()},
        'ARM_LENGTH': {k.lower(): v for k, v in ARM_LEN.items()},
    }
    body = '\n'.join(f'export const {name} = {json.dumps(val, indent=2)} as const;\n' for name, val in gen.items())
    block = ('// @generated:begin (build_examiners.py writes this block; do not edit by hand)\n' + body +
             '// @generated:end')
    src = re.sub(r'// @generated:begin.*?// @generated:end', lambda _m: block, src, flags=re.S)
    open(RIG_TS, 'w').write(src)
    print('[rig.ts] generated block updated')

print(json.dumps({k: v for k, v in report.items() if k in ('bytes', 'gzip', 'bytes_unpacked', 'examiners', 'bench', 'meshes', 'nodes', 'build_s')}, indent=1))
