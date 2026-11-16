"""Draw a waveform strip per sound (lime = envelope, red line = hit point) for one category.
  python tools/sfx_sheet.py whoosh out.png
"""
import json, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'sfx')
C = json.load(open(os.path.join(ROOT, 'catalog.json')))
items = [s for s in C['sounds'] if s['category'] == sys.argv[1]]
W, H, SR = 1400, 70, 8000
img = Image.new('RGB', (W, H * len(items)), (12, 12, 12)); d = ImageDraw.Draw(img)
f = ImageFont.truetype('/usr/share/fonts/opentype/inter/Inter-SemiBold.otf', 15)
for r, s in enumerate(items):
    x = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(ROOT, s['file']), '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'],
                                     capture_output=True).stdout, '<i2') / 32768.0
    span = min(s['dur'], 12.0); n = int(span * SR); x = x[:n]; X0 = 320; w = W - X0 - 10
    cols = np.array_split(np.abs(x), w); amp = np.array([c.max() if len(c) else 0 for c in cols])
    amp = amp / (amp.max() + 1e-9); y0 = r * H + H // 2
    for i, a in enumerate(amp): d.line((X0 + i, y0 - a * 30, X0 + i, y0 + a * 30), fill=(154, 208, 12))
    if s['hit'] <= span: hx = X0 + int(s['hit'] / span * w); d.line((hx, r * H + 4, hx, r * H + H - 4), fill=(255, 60, 60), width=2)
    d.text((8, r * H + 12), s['id'], font=f, fill='white'); d.text((8, r * H + 36), f"{s['dur']}s  hit {s['hit']}  {s['sync']}  {s['lufs']}", font=f, fill=(160, 160, 160))
    d.line((0, r * H + H - 1, W, r * H + H - 1), fill=(40, 40, 40))
img.save(sys.argv[2])
