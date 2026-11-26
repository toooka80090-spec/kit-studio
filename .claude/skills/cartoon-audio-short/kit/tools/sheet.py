#!/usr/bin/env python3
"""ورقة لقطات ثابتة بأرقام الإطارات:  python3 sheet.py stills/a stills/sheet_a.jpg [cols]

كل مربع موسوم برقم إطاره ووقته. انظر إلى النتيجة بالحجم الكامل وبحجم 25% (حجم الهاتف): يجب أن تبقى الوجوه مقروءة.
"""
import glob, os, re, sys
from PIL import Image, ImageDraw, ImageFont

if len(sys.argv) < 3:
    sys.exit(__doc__)
d, out = sys.argv[1], sys.argv[2]
fs = sorted(glob.glob(os.path.join(d, "f*.jpg")), key=lambda p: int(re.findall(r"\d+", os.path.basename(p))[0]))
if not fs:
    sys.exit(f"sheet.py: no f*.jpg in {d}")
W = int(sys.argv[3]) if len(sys.argv) > 3 else min(7, len(fs))
TW, TH, LBL = 270, 480, 26
try:
    font = ImageFont.truetype("DejaVuSans-Bold.ttf", 18)
except Exception:
    font = ImageFont.load_default()
rows = (len(fs) + W - 1) // W
sh = Image.new("RGB", (TW * W, (TH + LBL) * rows), (24, 22, 28))
dr = ImageDraw.Draw(sh)
for i, f in enumerate(fs):
    x, y = (i % W) * TW, (i // W) * (TH + LBL)
    sh.paste(Image.open(f).convert("RGB").resize((TW, TH)), (x, y + LBL))
    n = int(re.findall(r"\d+", os.path.basename(f))[0])
    dr.text((x + 6, y + 3), f"f{n}  {n / 30:.2f}s", fill=(240, 236, 228), font=font)
sh.save(out, quality=88)
print(out, len(fs), "stills")
