"""
Build src/world/referencePaths.ts: NASA's GMAT-computed Reference Trajectories from NASA Mission Viz, thinned.

Source: https://github.com/nasa/mission-viz, folder X3Dom/, commit c6f2270 (16 May 2022), copied unchanged into
docs/research/sources/mission-viz/. Each file is a list of points with Date, Time (UTC) and X, Y, Z in km,
Earth-centred, equatorial frame (Z towards the north pole). The .js files hold JSON inside a JavaScript string:
they are read here as text and never run.

Run from the repository root:  python3 scripts/build_reference_paths.py > src/world/referencePaths.ts
Needs only Python 3. Thinning keeps the first and last points, every burn, the closest and farthest points, and
any point whose position at its time is off by more than THIN of its distance from Earth when drawn without it
(time-synchronised Douglas-Peucker, so a marker moved along the thinned path stays on time too).
"""
import json
import math
import re
from datetime import datetime
from pathlib import Path

SOURCE_DIR = Path('docs/research/sources/mission-viz')
REPO = 'https://github.com/nasa/mission-viz'
FOLDER = 'X3Dom/'
COMMIT = 'c6f2270'
COMMIT_DATE = '2022-05-16'
THIN = 0.003  # most a dropped point may be off, as a share of its distance from Earth's centre
GM = 398_600.4415  # km³/s², only to spot burns
BURN_JUMP = 0.05  # a burn changes the orbit's size by more than this share between two steps

FILES = {
    'geoTransfer': 'missionfile.js',
    'longEllipse': 'MolniyaOrbit.json',
    'lunarTransfer': 'LunarTransferTrajectory.js',
    'moon': 'LunarOrbit.js',
}
FIND_BURNS = {'geoTransfer'}


def read(name):
    text = (SOURCE_DIR / name).read_text(encoding='utf-8-sig')
    if name.endswith('.js'):
        # var x = '...' + '...'; : join the quoted pieces, then it is plain JSON.
        text = ''.join(re.findall(r"'((?:[^'\\]|\\.)*)'", text))
    points = []
    for p in json.loads(text)['coordinates']:
        when = datetime.strptime(f"{p['Date'].strip()} {p['Time']}", '%d %b %Y %H:%M:%S.%f')
        points.append((when, float(p['X']), float(p['Y']), float(p['Z'])))
    return points


def radius(p):
    return math.sqrt(p[1] ** 2 + p[2] ** 2 + p[3] ** 2)


def size_of_step(a, b):
    """Semi-major axis from the speed and mean distance between two points (vis-viva), km."""
    seconds = (b[0] - a[0]).total_seconds()
    speed = math.dist(a[1:], b[1:]) / seconds
    r = (radius(a) + radius(b)) / 2
    return -GM / (2 * (speed * speed / 2 - GM / r))


def burns(points):
    sizes = [size_of_step(points[i - 1], points[i]) for i in range(1, len(points))]
    # Step i ends at point i + 1; a burn sits at the point where the size jumps.
    return [i + 1 for i in range(1, len(sizes)) if abs(sizes[i] - sizes[i - 1]) > BURN_JUMP * sizes[i - 1]]


def thin(points, keep):
    minutes = [(p[0] - points[0][0]).total_seconds() / 60 for p in points]
    chosen = set(keep) | {0, len(points) - 1}

    def split(lo, hi):
        worst, at = 0.0, None
        for i in range(lo + 1, hi):
            share = (minutes[i] - minutes[lo]) / (minutes[hi] - minutes[lo])
            guess = [points[lo][k] + (points[hi][k] - points[lo][k]) * share for k in (1, 2, 3)]
            off = math.dist(guess, points[i][1:]) / radius(points[i])
            if off > worst:
                worst, at = off, i
        if at is not None and worst > THIN:
            chosen.add(at)
            split(lo, at)
            split(at, hi)

    ordered = sorted(chosen)
    for lo, hi in zip(ordered, ordered[1:]):
        split(lo, hi)
    return sorted(chosen), minutes


def number(x):
    text = f'{x:.2f}'.rstrip('0').rstrip('.')
    return '0' if text == '-0' else text


out = [
    '/**',
    " * NASA's Reference Trajectories, computed with NASA's General Mission Analysis Tool (GMAT) and published in",
    f' * NASA Mission Viz ({REPO}, folder {FOLDER}, commit {COMMIT} of {COMMIT_DATE}). Made by',
    ' * scripts/build_reference_paths.py from docs/research/sources/mission-viz/. Do not edit by hand.',
    ' * `points` is flat: minutes from `start`, then X, Y, Z in km (Earth-centred, equatorial: Z towards the',
    ' * north pole), for each kept point. `burns` are indexes of points (not of numbers) where an engine fires.',
    ' */',
    'export interface ReferencePathData {',
    '  /** The source file in docs/research/sources/mission-viz/. */',
    '  readonly file: string;',
    '  /** How many points the source file has (before thinning). */',
    '  readonly sourcePoints: number;',
    '  /** UTC time of the first point. */',
    '  readonly start: string;',
    '  readonly burns: readonly number[];',
    '  readonly points: readonly number[];',
    '}',
    '',
    f"export const REFERENCE_PATH_SOURCE = {{ repo: '{REPO}', folder: '{FOLDER}', commit: '{COMMIT}', date: '{COMMIT_DATE}' }} as const;",
    '',
    f"export type ReferencePathKey = {' | '.join(repr(k) for k in FILES)};",
    '',
    'export const REFERENCE_PATH_DATA: Readonly<Record<ReferencePathKey, ReferencePathData>> = {',
]
for key, name in FILES.items():
    points = read(name)
    fired = burns(points) if key in FIND_BURNS else []
    rs = [radius(p) for p in points]
    keep = fired + [rs.index(min(rs)), rs.index(max(rs))]
    # Keep the point just before each burn too, so the coast up to it stays exact.
    keep += [i - 1 for i in fired]
    kept, minutes = thin(points, keep)
    flat = []
    for i in kept:
        flat += [number(minutes[i]), *(number(round(v)) for v in points[i][1:])]
    lines = []
    for k in range(0, len(flat), 24):
        lines.append('      ' + ', '.join(flat[k:k + 24]) + ',')
    out += [
        f'  {key}: {{',
        f"    file: '{name}',",
        f'    sourcePoints: {len(points)},',
        f"    start: '{points[0][0].isoformat(timespec='milliseconds')}Z',",
        f'    burns: [{", ".join(str(kept.index(i)) for i in fired)}],',
        '    points: [',
        *lines,
        '    ],',
        '  },',
    ]
out += ['};', '']
print('\n'.join(out))
