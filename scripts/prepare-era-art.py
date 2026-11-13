"""
Compress the team's Era illustrations for the game (ticket 29, docs/art/README.md).

Run from the repository root, one image per Era:
  python3 scripts/prepare-era-art.py 1 path/to/era1.png 2 path/to/era2.png 5 path/to/freeplay.png

Each image is cropped to 16:9 around its centre, resized to 1280 x 720, given a visible "AI-generated"
watermark in its bottom-right corner (Space Apps rule, 13 Nov 2026: generated images need a visible watermark)
and saved as public/eras/era-<N>.webp (WebP, quality 80). Needs Pillow 10.1 or newer. Prints each file's size;
aim for under 150 KB. The Era card keeps the image's bottom edge in view, so the mark is never cropped.
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ERAS = {'1', '2', '5'}
WIDTH, HEIGHT = 1280, 720
WATERMARK = 'AI-generated'
MARK_SIZE = 26  # font size in pixels on the 1280 x 720 image
MARGIN = 18


def watermark(image: Image.Image) -> Image.Image:
    """Burn a small, readable label into the bottom-right corner: white text on a dark, half-clear box."""
    try:
        font = ImageFont.load_default(size=MARK_SIZE)
    except TypeError:  # Pillow older than 10.1: small bitmap font, still visible
        font = ImageFont.load_default()
    layer = Image.new('RGBA', image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    left, top, right, bottom = draw.textbbox((0, 0), WATERMARK, font=font)
    pad_x, pad_y = 12, 8
    box_w, box_h = right - left + 2 * pad_x, bottom - top + 2 * pad_y
    x0, y0 = image.width - MARGIN - box_w, image.height - MARGIN - box_h
    draw.rounded_rectangle((x0, y0, x0 + box_w, y0 + box_h), radius=8, fill=(14, 20, 31, 170))
    draw.text((x0 + pad_x - left, y0 + pad_y - top), WATERMARK, font=font, fill=(255, 255, 255, 235))
    return Image.alpha_composite(image.convert('RGBA'), layer).convert('RGB')


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
    image = watermark(image.resize((WIDTH, HEIGHT), Image.LANCZOS))
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
