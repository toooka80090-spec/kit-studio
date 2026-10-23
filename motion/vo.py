"""Cut the ElevenLabs voiceover into lines and lay them on the video timeline.

  python motion/vo.py   -> motion/out/vo.wav (48 kHz stereo, 30 s)
Each line: (source start, source end, tempo, placement in the video). Line
boundaries come from the pauses in vo/vo-raw.mp3; placements follow TIME_MAP
in how-to-order.html.
"""
import os, subprocess, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'vo', 'vo-raw.mp3')
OUT = os.path.join(HERE, 'out')
SR, DUR = 48000, 30.0

LINES = [
    (0.00, 3.80, 1.10, 0.10),    # شلون تطلب قميصك من ڤاموس؟ بخمس خطوات بس!
    (4.35, 9.00, 1.05, 3.60),    # أول شي، سوّ لك حساب بالموقع… لأن ما تقدر تطلب إلا بحساب
    (9.58, 15.86, 1.03, 8.05),   # بعدين اختار الموسم اليديد، والدوري… وفريجك… واختار القميص
    (16.38, 19.33, 1.00, 14.40),  # حدد مقاسك زين، واضغط Add to Cart
    (19.75, 22.35, 1.00, 18.35),  # روح للسلة، واضغط Proceed to Checkout
    (22.74, 27.03, 1.06, 20.95),  # عبّ عنوانك، واختار طريقة الدفع، وأكّد طلبك… بس جذي!
    (27.40, 31.03, 1.10, 25.10),  # اطلب قميصك الحين من vamos-kw.com
    (32.57, 33.96, 1.00, 28.50),  # The Power Within.
]
# voice polish: rumble cut, a little body and presence, gentle compression
CHAIN = ('highpass=f=80,equalizer=f=180:t=q:w=1:g=1.5,equalizer=f=3500:t=q:w=1.2:g=2.5,'
         'acompressor=threshold=-20dB:ratio=3:attack=8:release=120:makeup=3')


def render_line(a, b, tempo):
    cmd = ['ffmpeg', '-v', 'error', '-ss', str(a), '-to', str(b), '-i', SRC,
           '-af', f'atempo={tempo},{CHAIN},afade=t=in:d=0.02,afade=t=out:st={(b - a) / tempo - 0.04:.3f}:d=0.04',
           '-ar', str(SR), '-ac', '1', '-f', 's16le', '-']
    return np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, '<i2') / 32768.0


track = np.zeros(int(SR * DUR))
for a, b, tempo, at in LINES:
    x = render_line(a, b, tempo)
    i = int(at * SR)
    end = i + len(x)
    assert end <= len(track), f'line at {at}s overruns the video'
    track[i:end] += x
    print(f'{at:5.2f}s -> {end / SR:5.2f}s  ({a}-{b} @ {tempo}x)')

os.makedirs(OUT, exist_ok=True)
pcm = (np.clip(np.stack([track, track], 1), -1, 1) * 32767).astype('<i2')
with wave.open(os.path.join(OUT, 'vo.wav'), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print(os.path.join(OUT, 'vo.wav'))
