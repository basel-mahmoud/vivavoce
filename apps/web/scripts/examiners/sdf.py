"""
Tiny SDF sculpting kit for Blender (numpy only, no add-ons).

Why: premium stylised props read as ONE moulded piece (fillets where parts meet), which primitives stuck
together or summed metaballs never give. Shapes here are written as signed distance functions in glTF
space (x right, y up, z toward camera), polygonised with naive surface nets (all quads, even edge
lengths), projected back onto the exact zero set, decimated, and given analytic normals from the SDF
gradient (custom split normals, which the glTF exporter writes out).

Every function takes P: (N, 3) float64 and returns (N,) distances.
"""
import math
import numpy as np


def v3(a):
    return np.asarray(a, dtype=np.float64)


# ---------------------------------------------------------------------------------------
# Primitives (after Inigo Quilez, "distance functions")
# ---------------------------------------------------------------------------------------
def sd_round_cone(P, a, b, ra, rb):
    """Capsule whose radius goes from ra at a to rb at b (exact)."""
    a, b = v3(a), v3(b)
    ba = b - a
    l2 = ba @ ba
    rr = ra - rb
    a2 = l2 - rr * rr
    il2 = 1.0 / l2
    pa = P - a
    y = pa @ ba
    z = y - l2
    x = pa * l2 - y[:, None] * ba
    x2 = np.einsum('ij,ij->i', x, x)
    y2 = y * y * l2
    z2 = z * z * l2
    k = math.copysign(1.0, rr) * rr * rr * x2
    d3 = (np.sqrt(np.maximum(x2 * a2 * il2, 0)) + y * rr) * il2 - ra
    d1 = np.sqrt(x2 + z2) * il2 - rb
    d2 = np.sqrt(x2 + y2) * il2 - ra
    return np.where(np.sign(z) * a2 * z2 > k, d1, np.where(np.sign(y) * a2 * y2 < k, d2, d3))


def sd_capsule(P, a, b, r):
    return sd_round_cone(P, a, b, r, r)


def sd_ellipsoid(P, c, r):
    """Good bound, exact on the surface (iq)."""
    q = (P - v3(c)) / v3(r)
    k0 = np.linalg.norm(q, axis=1)
    k1 = np.linalg.norm(q / v3(r), axis=1)
    return k0 * (k0 - 1.0) / np.maximum(k1, 1e-9)


def sd_round_box(P, c, half, r, R=None):
    """Box with half extents `half`, edge radius r; R (3x3) maps local -> world (columns = axes)."""
    q = P - v3(c)
    if R is not None:
        q = q @ np.asarray(R)
    q = np.abs(q) - (v3(half) - r)
    return np.linalg.norm(np.maximum(q, 0), axis=1) + np.minimum(q.max(axis=1), 0) - r


def sd_round_cylinder(P, c, axis, radius, half_h, r):
    """Capped cylinder along unit `axis` with rounded rims (radius r)."""
    ax = v3(axis) / np.linalg.norm(axis)
    q = P - v3(c)
    h = q @ ax
    rad = np.linalg.norm(q - h[:, None] * ax, axis=1)
    dx = rad - (radius - r)
    dy = np.abs(h) - (half_h - r)
    return np.minimum(np.maximum(dx, dy), 0) + np.hypot(np.maximum(dx, 0), np.maximum(dy, 0)) - r


def sd_torus(P, c, axis, R, r):
    ax = v3(axis) / np.linalg.norm(axis)
    q = P - v3(c)
    h = q @ ax
    rad = np.linalg.norm(q - h[:, None] * ax, axis=1)
    return np.hypot(rad - R, h) - r


def sd_arc_band(P, c, R, a0, a1, half_r, half_z, r):
    """A flat band swept along a circular arc in the x-y plane (centre c, radius R, angles a0..a1),
    rounded-rectangle cross-section (half_r radial, half_z along z) with flat rounded ends."""
    q = P - v3(c)
    phi = np.arctan2(q[:, 1], q[:, 0])
    pc = np.clip(phi, a0, a1)
    u = np.stack([np.cos(pc), np.sin(pc), np.zeros_like(pc)], 1)
    t = np.stack([-np.sin(pc), np.cos(pc), np.zeros_like(pc)], 1)
    d = q - R * u
    loc = np.stack([np.einsum('ij,ij->i', d, u), np.einsum('ij,ij->i', d, t), d[:, 2]], 1)
    return sd_round_box(loc, (0, 0, 0), (half_r, r, half_z), r)


# ---------------------------------------------------------------------------------------
# Operators
# ---------------------------------------------------------------------------------------
def smin(a, b, k):
    """Polynomial smooth union: a fillet of size ~k where the parts meet."""
    if k <= 0:
        return np.minimum(a, b)
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1)
    return b * (1 - h) + a * h - k * h * (1 - h)


def ssub(d_base, d_cut, k):
    """Smooth subtraction: carve d_cut out of d_base with a soft edge k."""
    if k <= 0:
        return np.maximum(d_base, -d_cut)
    h = np.clip(0.5 - 0.5 * (d_base + d_cut) / k, 0, 1)
    return d_base * (1 - h) + (-d_cut) * h + k * h * (1 - h)


def sinter(a, b, k):
    return -smin(-a, -b, k)


def scaled(fn, s):
    """Evaluate fn in a space scaled by s (3-vector) about the origin; the result stays a usable
    implicit (distances are only approximate when s is non-uniform)."""
    s = v3(s)
    m = float(s.min())
    return lambda P: fn(P / s) * m


# ---------------------------------------------------------------------------------------
# Surface nets
# ---------------------------------------------------------------------------------------
def surface_nets(F, lo, hi, h):
    """Polygonise the zero set of F over the box lo..hi with cell size h.
    Returns verts (M, 3) and quads (K, 4), outward-facing (CCW seen from outside)."""
    lo, hi = v3(lo), v3(hi)
    n = np.maximum(np.ceil((hi - lo) / h).astype(int) + 1, 2)
    axes = [lo[i] + h * np.arange(n[i]) for i in range(3)]
    G = np.stack(np.meshgrid(*axes, indexing='ij'), -1).reshape(-1, 3)
    D = F(G).reshape(n)
    cells = tuple(n - 1)
    S = np.zeros(cells + (3,))
    C = np.zeros(cells)
    edges = []
    for axis in range(3):
        s0 = [slice(None)] * 3
        s1 = [slice(None)] * 3
        s0[axis] = slice(0, -1)
        s1[axis] = slice(1, None)
        d0, d1 = D[tuple(s0)], D[tuple(s1)]
        cross = (d0 < 0) != (d1 < 0)
        idx = np.argwhere(cross)
        a0 = d0[cross]
        t = a0 / (a0 - d1[cross])
        pos = idx.astype(np.float64)
        pos[:, axis] += t
        o0, o1 = (axis + 1) % 3, (axis + 2) % 3
        for da in (0, -1):
            for db in (0, -1):
                ci = idx.copy()
                ci[:, o0] += da
                ci[:, o1] += db
                ok = (ci[:, o0] >= 0) & (ci[:, o0] < cells[o0]) & (ci[:, o1] >= 0) & (ci[:, o1] < cells[o1])
                np.add.at(S, tuple(ci[ok].T), pos[ok])
                np.add.at(C, tuple(ci[ok].T), 1)
        edges.append((axis, idx, a0 < 0))
    active = C > 0
    vid = -np.ones(cells, dtype=np.int64)
    vid[active] = np.arange(int(active.sum()))
    verts = lo + h * (S[active] / C[active][:, None])
    quads = []
    for axis, idx, inside_first in edges:
        o0, o1 = (axis + 1) % 3, (axis + 2) % 3
        ok = (idx[:, o0] >= 1) & (idx[:, o1] >= 1) & (idx[:, o0] < cells[o0]) & (idx[:, o1] < cells[o1])
        idx, inside_first = idx[ok], inside_first[ok]
        corner = []
        for da, db in ((0, 0), (-1, 0), (-1, -1), (0, -1)):
            ci = idx.copy()
            ci[:, o0] += da
            ci[:, o1] += db
            corner.append(vid[tuple(ci.T)])
        q = np.stack(corner, 1)
        q[~inside_first] = q[~inside_first][:, ::-1]
        quads.append(q)
    quads = np.concatenate(quads, 0)
    return verts, quads


def grad(F, V, e=1e-4):
    g = np.zeros_like(V)
    for i in range(3):
        d = np.zeros(3)
        d[i] = e
        g[:, i] = (F(V + d) - F(V - d)) / (2 * e)
    return g


def project(F, V, iters=4):
    """Newton steps onto the zero set: removes the grid's faceting."""
    for _ in range(iters):
        d = F(V)
        g = grad(F, V)
        V = V - (d / np.maximum(np.einsum('ij,ij->i', g, g), 1e-12))[:, None] * g
    return V


def relax(V, Q, F, iters=2, lam=0.5):
    """Laplacian relax along the surface, then re-project (evens out the net)."""
    nV = len(V)
    I = np.concatenate([Q[:, [0, 1]], Q[:, [1, 2]], Q[:, [2, 3]], Q[:, [3, 0]]])
    I = np.concatenate([I, I[:, ::-1]])
    for _ in range(iters):
        acc = np.zeros_like(V)
        cnt = np.zeros(nV)
        np.add.at(acc, I[:, 0], V[I[:, 1]])
        np.add.at(cnt, I[:, 0], 1)
        V = V + lam * (acc / np.maximum(cnt, 1)[:, None] - V)
        V = project(F, V, 2)
    return V


def normals(F, V):
    g = grad(F, V)
    return g / np.maximum(np.linalg.norm(g, axis=1), 1e-12)[:, None]
