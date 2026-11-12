"""
Compress the team's Era illustrations for the game (ticket 29, docs/art/README.md).

Run from the repository root, one image per Era:
  python3 scripts/prepare-era-art.py 1 path/to/era1.png 2 path/to/era2.png 5 path/to/freeplay.png

Each image is cropped to 16:9 around its centre, resized to 1280 x 720 and saved as
public/eras/era-<N>.webp (WebP, quality 80). Needs Pillow. Prints each file's size; aim for under 150 KB.
"""
import sys
from pathlib import Path

from PIL import Image

ERAS = {'1', '2', '5'}
WIDTH, HEIGHT = 1280, 720


def prepare(era: str, source: Path, out_dir: Path) -> Path:
    image = Image.open(source).convert('RGB')
    w, h = image.size
    target = WIDTH / HEIGHT
    if w / h > target:
        crop_w = round(h * target)
        left = (w - crop_w) // 2
        image = image.crop((left, 0, left + crop_w, h))
    else:
        crop_h = round(w / target)
        top = (h - crop_h) // 2
        image = image.crop((0, top, w, top + crop_h))
    image = image.resize((WIDTH, HEIGHT), Image.LANCZOS)
    out = out_dir / f'era-{era}.webp'
    image.save(out, 'WEBP', quality=80, method=6)
    return out


def main(args: list[str]) -> None:
    if not args or len(args) % 2:
        sys.exit(__doc__)
    out_dir = Path('public/eras')
    out_dir.mkdir(parents=True, exist_ok=True)
    for era, source in zip(args[::2], args[1::2]):
        if era not in ERAS:
            sys.exit(f'Unknown Era {era}: use 1, 2 or 5 (Free Play).')
        out = prepare(era, Path(source), out_dir)
        print(f'{out}: {out.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main(sys.argv[1:])
