"""Audio for quiz.html: the commentary clip at A0, a soft bed under the hook and the question,
and light transition SFX.  ->  motion/out/quiz-mix.wav

  python motion/quiz/quiz-audio.py
"""
import os, wave
import numpy as np
from scipy.signal import butter, sosfilt

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'out')
SR = 48000
A0 = 2.8
CUT_B, CUT_C, ASK = A0 + 8.5, A0 + 15.3, A0 + 17.2
DUR = ASK + 6
N = int(SR * DUR)
rng = np.random.default_rng(3)

def tt(d): return np.arange(int(SR * d)) / SR
def mtof(m): return 440 * 2 ** ((m - 69) / 12)
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), x)
def place(buf, sig, t, g=1.0):
    i = int(t * SR); sig = sig[:len(buf) - i]; buf[i:i + len(sig)] += sig * g

def whoosh(d):
    t = tt(d); n = rng.standard_normal(len(t)); out = np.zeros(len(t))
    fc = np.geomspace(400, 6000, len(t) // 1200 + 1)
    for k, c0 in enumerate(range(0, len(t), 1200)):
        out[c0:c0 + 1200] = bp(n[c0:c0 + 1200], fc[k] * .6, min(fc[k] * 1.6, 20000))
    return out * np.sin(np.pi * t / d) ** 2

def impact():
    t = tt(1.0); f = 40 + 60 * np.exp(-t / .08)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .3)

def chime(notes, gap=.08, dec=.4):
    s = np.zeros(int(SR * (gap * len(notes) + dec * 3)))
    for k, m in enumerate(notes):
        tn = tt(dec * 3); f = mtof(m)
        n = (np.sin(2 * np.pi * f * tn) + .25 * np.sin(4.02 * np.pi * f * tn)) * np.exp(-tn / dec)
        i = int(k * gap * SR); s[i:i + len(n)] += n[:len(s) - i]
    return s

def tick():
    t = tt(.05); return np.sin(2 * np.pi * 1800 * t) * np.exp(-t / .006)

# soft pad bed (Am9 - Fmaj7), ducked out while the commentary plays
bed = np.zeros(N); t = tt(DUR)
for i, ch in enumerate([[57, 60, 64, 67, 71], [53, 57, 60, 64, 69]] * 6):
    a, d = i * 2.0, 2.4
    seg = (t >= a) & (t < a + d)
    e = np.clip((t - a) / .3, 0, 1) * np.clip((a + d - t) / .4, 0, 1)
    bed += sum(np.sin(2 * np.pi * mtof(m) * t) for m in ch) * e * seg / 5
duck = np.interp(t, [0, A0 - .3, A0 + .2, ASK - .2, ASK + .3, DUR - 1.2, DUR], [1, 1, .12, .12, 1, 1, 0])
bed *= duck * np.interp(t, [0, .4], [0, 1])

sfx = np.zeros(N)
place(sfx, impact(), .4, .5); place(sfx, whoosh(.5), .35, .3)
for k in range(3): place(sfx, tick(), 1.0 + k * .3, .25)
place(sfx, whoosh(.6), A0 - .45, .35)
for c in (CUT_B, CUT_C): place(sfx, whoosh(.45), c - .22, .3)
place(sfx, whoosh(.5), ASK - .2, .35); place(sfx, impact(), ASK + .1, .45)
place(sfx, chime([72, 76, 79, 84]), ASK + .7, .18)

with wave.open(os.path.join(HERE, 'commentary-raw.wav')) as w:
    com = np.frombuffer(w.readframes(w.getnframes()), '<i2') / 32768.0
voice = np.zeros(N); place(voice, com, A0)

def norm(x, pk): m = np.max(np.abs(x)); return x * pk / m if m else x
mix = np.tanh(norm(voice, .9) + norm(bed, .22) + norm(sfx, .6))
os.makedirs(OUT, exist_ok=True)
pcm = (np.clip(np.stack([mix, mix], 1), -1, 1) * 32767).astype('<i2')
with wave.open(os.path.join(OUT, 'quiz-mix.wav'), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print(os.path.join(OUT, 'quiz-mix.wav'), DUR)
