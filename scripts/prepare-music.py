#!/usr/bin/env python3
"""Prepare the team's original MP3s: python scripts/prepare-music.py SOURCE_DIR.

Use originals from before ticket 25, not the already prepared output files.
Requires ffmpeg/ffprobe; no Python packages. Approved cuts: docs/audio/README.md.
"""
import json
import hashlib
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CUTS = {
    'menu-theme': (0, None), 'site-calm-a': (0, 165), 'site-calm-b': (5, 153),
    'designer-focus': (0, 115), 'launch': (0, None), 'flight-orbit': (2, 155),
    'anomaly': (10, 55), 'stinger-success': (0, None),
    'stinger-failure': (0, None), 'era-history': (0, None),
}


def run(args):
    return subprocess.run(args, check=True, capture_output=True, text=True)


def loudness(args):
    out = run(['ffmpeg', '-hide_banner', '-nostats', *args, '-f', 'null', '-']).stderr
    return json.loads(out[out.rfind('{'):out.rfind('}') + 1])


def main():
    source = Path(sys.argv[1]).resolve()
    target = ROOT / 'public/audio/music'
    if source == target.resolve():
        raise SystemExit('Supply the original input directory, not the prepared output directory.')
    levels = {}
    for name, (start, end) in CUTS.items():
        path = source / (name + '.mp3')
        trim = 'atrim=start=' + str(start) + (':end=' + str(end) if end else '') + ',asetpts=PTS-STARTPTS'
        measure = loudness(['-i', str(path), '-af', trim + ',loudnorm=I=-16:TP=-1.5:LRA=20:print_format=json'])
        # Preserve the team's dynamics: apply the measured integrated gain, rather than
        # compressing quiet intros to a smaller loudness range. Limit only if needed.
        gain = -16 - float(measure['input_i'])
        output = target / (name + '.music')  # MP3 data; neutral extension so download managers leave it alone
        # Measure the encoded MP3 too: lossy encoding and loudness gating can shift the result.
        for attempt in range(3):
            norm = 'volume=' + str(gain) + 'dB'
            if float(measure['input_tp']) + gain > -1.5:
                norm += ',aresample=192000,alimiter=limit=0.84:level=false,aresample=44100'
            run(['ffmpeg', '-y', '-hide_banner', '-nostats', '-i', str(path), '-af', trim + ',' + norm,
                 '-ar', '44100', '-ac', '2', '-c:a', 'libmp3lame', '-b:a', '128k', '-map_metadata', '-1', '-f', 'mp3', str(output)])
            measured = loudness(['-i', str(output), '-af', 'loudnorm=I=-16:TP=-1:LRA=20:print_format=json'])
            correction = -16 - float(measured['input_i'])
            if abs(correction) <= .1:
                break
            gain += correction
        duration = float(run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', str(output)]).stdout)
        levels[name] = {'seconds': round(duration, 3), 'bytes': output.stat().st_size,
                        'lufs': float(measured['input_i']), 'truePeakDb': float(measured['input_tp']),
                        'sourceStart': start, 'sourceEnd': end,
                        'sha256': hashlib.sha256(output.read_bytes()).hexdigest()}
        print(name, levels[name], flush=True)
        if abs(levels[name]['lufs'] + 16) > .2 or levels[name]['truePeakDb'] > -1:
            raise SystemExit('Prepared file is outside the loudness/peak target: ' + name)
    (ROOT / 'docs/audio/levels.json').write_text(json.dumps(levels, indent=2) + '\n')


if __name__ == '__main__':
    main()
