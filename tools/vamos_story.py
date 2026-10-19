#!/usr/bin/env python3
"""VAMOS kit story helper — local, no browser needed (pip install pillow).

  python tools/vamos_story.py status <shirt-folder>
  python tools/vamos_story.py close-from-front "<... - model front.png>" [--top 0.0] [--bottom 0.5]
  python tools/vamos_story.py story <shirt-folder> "<base name>" [--gutter 9] [--force]

Naming (all files live in the shirt folder):
  original:   "<base>.jpg"                     (or "<base> front.jpg" + "<base> back.jpg" for one player)
  model:      "<base> - model front.png", "<base> - model 3-4.png", "<base> - model close.png" | "... - model back.png"
  crops:      "<base> - crops.json"            (optional, see below)
  output:     "<base> - story.png"             1080x1920, 3x3 grid, white gutters

crops.json — the 6 cells of rows 2-3, each cut from a source image and cover-fit into a 354x634 cell:
  [{"src": "original" | "original back" | "model front" | "model 3-4" | "model close" | "model back",
    "cx": 0.62, "cy": 0.30,   # crop center, fraction of the source width / height
    "h": 0.25,                # crop height as a fraction of the source height (width follows the cell ratio)
    "rot": 0}, ...]           # optional rotation in degrees
Without crops.json, safe defaults are cut from the model shots (never from the original photo,
which may show grass, tags or hands).
"""
import argparse
import json
import os
import re
import sys

from PIL import Image

# Windows consoles default to cp1252; keep ✓ / Arabic folder names printable
for stream in (sys.stdout, sys.stderr):
    try:
        stream.reconfigure(encoding='utf-8')
    except (AttributeError, ValueError):
        pass

W, H = 1080, 1920
EXTS = ('.png', '.jpg', '.jpeg', '.webp')

DEFAULT_CROPS = [
    {"src": "model front", "cx": 0.50, "cy": 0.22, "h": 0.30},   # collar
    {"src": "model front", "cx": 0.62, "cy": 0.33, "h": 0.22},   # wearer's left chest (crest)
    {"src": "model front", "cx": 0.38, "cy": 0.33, "h": 0.22},   # wearer's right chest (brand)
    {"src": "model front", "cx": 0.50, "cy": 0.46, "h": 0.30},   # sponsor
    {"src": "model 3-4", "cx": 0.22, "cy": 0.32, "h": 0.30},     # sleeve
    {"src": "model front", "cx": 0.50, "cy": 0.62, "h": 0.18},   # fabric
]


def find(folder, stem):
    """Case-insensitive lookup of '<stem>.<ext>' in folder."""
    want = stem.lower()
    for f in os.listdir(folder):
        root, ext = os.path.splitext(f)
        if ext.lower() in EXTS and root.lower() == want:
            return os.path.join(folder, f)
    return None


def sources(folder, base):
    paired = find(folder, base + ' front')
    src = {
        'original': paired or find(folder, base),
        'original back': find(folder, base + ' back'),
    }
    for kind in ('front', '3-4', 'close', 'back'):
        src['model ' + kind] = find(folder, base + ' - model ' + kind)
    return src


def cover(img, w, h, cx=0.5, cy=0.5, frac_h=1.0, rot=0):
    """Cut a w:h window centered at (cx, cy) whose height is frac_h of the source, and resize to w x h."""
    img = img.convert('RGB')
    if rot:
        img = img.rotate(rot, resample=Image.BICUBIC, expand=False, fillcolor=(255, 255, 255))
    iw, ih = img.size
    ch = min(ih, max(8, frac_h * ih))
    cw = ch * w / h
    if cw > iw:
        cw = iw
        ch = cw * h / w
    x0 = min(max(cx * iw - cw / 2, 0), iw - cw)
    y0 = min(max(cy * ih - ch / 2, 0), ih - ch)
    return img.crop((round(x0), round(y0), round(x0 + cw), round(y0 + ch))).resize((w, h), Image.LANCZOS)


def cmd_story(folder, base, gutter, force=False):
    src = sources(folder, base)
    third = src['model back'] or src['model close']
    row1 = [src['model front'], src['model 3-4'], third]
    missing = [n for n, p in zip(('model front', 'model 3-4', 'model close/back'), row1) if not p]
    if missing:
        sys.exit('✗ missing: ' + ', '.join('"%s - %s"' % (base, m) for m in missing))

    crops_file = find_json(folder, base + ' - crops')
    crops = json.load(open(crops_file, encoding='utf-8')) if crops_file else DEFAULT_CROPS
    if len(crops) != 6:
        sys.exit('✗ crops.json needs exactly 6 cells, found %d' % len(crops))

    jersey_green = green_ratio(load_once(src['model front']))  # white-background shot = the jersey's own green
    cw, ch = (W - 2 * gutter) / 3, (H - 2 * gutter) / 3
    canvas = Image.new('RGB', (W, H), (255, 255, 255))
    cache = {}
    grassy = []

    def load(p):
        if p not in cache:
            cache[p] = Image.open(p)
        return cache[p]

    for i in range(9):
        x0 = round((i % 3) * (cw + gutter))
        y0 = round((i // 3) * (ch + gutter))
        x1 = round((i % 3) * (cw + gutter) + cw)
        y1 = round((i // 3) * (ch + gutter) + ch)
        w, h = x1 - x0, y1 - y0
        if i < 3:
            tile = cover(load(row1[i]), w, h, cy=0.5)
        else:
            c = crops[i - 3]
            p = src.get(c['src'])
            if not p:
                sys.exit('✗ crop %d uses "%s" but that file is missing' % (i - 2, c['src']))
            tile = cover(load(p), w, h, c.get('cx', 0.5), c.get('cy', 0.5), c.get('h', 0.3), c.get('rot', 0))
        canvas.paste(tile, (x0, y0))
        g = green_ratio(tile)
        # grass guard: flag green-heavy cells unless the jersey itself is green
        if i >= 3 and g > 0.03 and g > jersey_green * 2:
            grassy.append(i + 1)
            print('! cell %d looks like it contains grass (%.0f%% green) — re-crop it' % (i + 1, g * 100))

    if grassy and not force:
        sys.exit('✗ not saved: fix cell(s) %s in "%s - crops.json" (or pass --force)' % (', '.join(map(str, grassy)), base))
    out = os.path.join(folder, base + ' - story.png')
    canvas.save(out, optimize=True)
    print('✓ %s  (%dx%d, %s, %.1f MB)' % (out, *canvas.size, 'crops.json' if crops_file else 'default crops',
                                          os.path.getsize(out) / 1e6))


def load_once(p):
    return Image.open(p)


def green_ratio(img):
    """Share of grass-like pixels (green clearly above red and blue)."""
    b = img.convert('RGB').resize((120, 120)).tobytes()
    n = len(b) // 3
    return sum(1 for i in range(0, len(b), 3) if b[i + 1] > 25 and b[i + 1] > b[i] * 1.15 + 4 and b[i + 1] > b[i + 2] * 1.3 + 4) / n


def find_json(folder, stem):
    p = os.path.join(folder, stem + '.json')
    return p if os.path.exists(p) else None


def cmd_close_from_front(front, top, bottom):
    """Saves credits: cut the chin-to-chest band of the front shot into a 3:4 close-up."""
    m = re.match(r'(.*) - model front(\.[a-z]+)$', front, re.I)
    if not m:
        sys.exit('✗ expected a "<base> - model front.png" file')
    img = Image.open(front).convert('RGB')
    iw, ih = img.size
    ch = (bottom - top) * ih
    cw = ch * 3 / 4
    x0 = (iw - cw) / 2
    crop = img.crop((round(x0), round(top * ih), round(x0 + cw), round(top * ih + ch)))
    crop = crop.resize((round(ih * 3 / 4), ih), Image.LANCZOS)
    out = m.group(1) + ' - model close.png'
    crop.save(out, optimize=True)
    print('✓ %s  (%dx%d, cut from front %.0f%%–%.0f%%)' % (out, *crop.size, top * 100, bottom * 100))


def cmd_status(folder):
    files = [f for f in os.listdir(folder) if os.path.splitext(f)[1].lower() in EXTS]
    bases = sorted({re.sub(r' (front|back)$', '', os.path.splitext(f)[0], flags=re.I)
                    for f in files if ' - ' not in f})
    total = 0
    for b in bases:
        s = sources(folder, b)
        story = find(folder, b + ' - story')
        have = [k.replace('model ', '') for k in ('model front', 'model 3-4', 'model close', 'model back') if s[k]]
        state = 'DONE' if story else ('READY' if s['model front'] and s['model 3-4'] and (s['model close'] or s['model back']) else 'TODO')
        total += state != 'DONE'
        print('%-5s  %s%s  [model: %s]' % (state, b, '  (+back photo)' if s['original back'] else '', ', '.join(have) or '—'))
    print('\n%d shirts, %d left' % (len(bases), total))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)
    s = sub.add_parser('story')
    s.add_argument('folder')
    s.add_argument('base')
    s.add_argument('--gutter', type=int, default=9)
    s.add_argument('--force', action='store_true', help='save even if a cell looks like grass')
    c = sub.add_parser('close-from-front')
    c.add_argument('front')
    c.add_argument('--top', type=float, default=0.0)
    c.add_argument('--bottom', type=float, default=0.5)
    st = sub.add_parser('status')
    st.add_argument('folder')
    a = ap.parse_args()
    if a.cmd == 'story':
        cmd_story(a.folder, a.base, a.gutter, a.force)
    elif a.cmd == 'close-from-front':
        cmd_close_from_front(a.front, a.top, a.bottom)
    else:
        cmd_status(a.folder)


if __name__ == '__main__':
    main()
