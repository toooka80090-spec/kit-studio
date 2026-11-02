"""Audio for quiz.html: a hype game-show track (build-up, drop at the '?' slam, quiet pulse under
the commentary, drop again on the question) plus game-show SFX.  ->  motion/out/quiz-mix.wav

  python motion/quiz/quiz-audio.py
"""
import os, wave
import numpy as np
from scipy.signal import butter, sosfilt

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'out')
SR = 48000
# keep in sync with quiz.html
A0, LAND, LOCK, TXT = 3.6, .95, 1.75, (2.15, 2.45)
CUT_B, CUT_C, ASK = A0 + 8.5, A0 + 15.3, A0 + 17.2
DUR = ASK + 6
N = int(SR * DUR)
BPM = 140
BEAT = 60 / BPM
rng = np.random.default_rng(5)

def tt(d): return np.arange(int(SR * d)) / SR
def mtof(m): return 440 * 2 ** ((m - 69) / 12)
def lp(x, f): return sosfilt(butter(2, f, 'low', fs=SR, output='sos'), x)
def hp(x, f): return sosfilt(butter(2, f, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), x)
def place(buf, sig, t, g=1.0):
    i = int(t * SR)
    if i >= len(buf) or i < 0: return
    sig = sig[:len(buf) - i]; buf[i:i + len(sig)] += sig * g
def saw(f, t): return 2 * ((t * f) % 1) - 1

# ---------- drums / synths
def kick():
    t = tt(.4); f = 45 + 120 * np.exp(-t / .03)
    return np.tanh(2.2 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .2))
def clap():
    t = tt(.3); n = bp(rng.standard_normal(len(t)), 1000, 6000); e = np.exp(-t / .09)
    for k in (.01, .02): e += .7 * (t > k) * np.exp(-np.clip(t - k, 0, None) / .012)
    return n * e
def snare():
    t = tt(.18); return .6 * bp(rng.standard_normal(len(t)), 1500, 8000) * np.exp(-t / .05) + .4 * np.sin(2 * np.pi * 190 * t) * np.exp(-t / .04)
def hat(o=False):
    t = tt(.2 if o else .05); return hp(rng.standard_normal(len(t)), 8000) * np.exp(-t / (.06 if o else .012))
def crash():
    t = tt(2.0); return hp(rng.standard_normal(len(t)), 5000) * np.exp(-t / .6)
def impact():
    t = tt(1.4); f = 32 + 90 * np.exp(-t / .07)
    return np.tanh(1.6 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .45)) + .3 * lp(rng.standard_normal(len(t)), 1800) * np.exp(-t / .15)
def riser(d):
    t = tt(d); n = rng.standard_normal(len(t)); out = np.zeros(len(t))
    fc = np.geomspace(250, 10000, len(t) // 1200 + 1)
    for k, c0 in enumerate(range(0, len(t), 1200)):
        out[c0:c0 + 1200] = bp(n[c0:c0 + 1200], fc[k] * .7, min(fc[k] * 1.4, 20000))
    tone = np.sin(2 * np.pi * np.cumsum(np.geomspace(200, 1600, len(t))) / SR) * .25
    return (out + tone) * (t / d) ** 2
def stab(notes, d=.28):
    t = tt(d); s = sum(saw(mtof(m) * (1 + det), t) for m in notes for det in (-.004, .004))
    return lp(s / (2 * len(notes)), 3200) * np.minimum(1, t / .004) * np.exp(-t / .16)
def pluck(m, d=.22):
    t = tt(d); return (np.sin(2 * np.pi * mtof(m) * t) + .4 * np.sign(np.sin(2 * np.pi * mtof(m) * t))) * np.exp(-t / .07)
def bass(m, d):
    t = tt(d); return np.tanh(1.5 * (np.sin(2 * np.pi * mtof(m) * t) + .3 * saw(mtof(m), t))) * np.minimum(1, t / .005) * np.exp(-t / (d * .8))

PROG = [(45, [57, 60, 64, 69]), (41, [57, 60, 65, 69]), (43, [55, 59, 62, 67]), (40, [56, 59, 64, 68])]   # Am F G E

def section(buf, a, b, level, full=True):
    """drop groove from a to b at a given level"""
    t, step = a, 0
    while t < b - 1e-6:
        bar = int(step // 16); root, ch = PROG[bar % 4]; s = step % 16
        if s % 4 == 0: place(buf, kick(), t, .9 * level)
        if s in (4, 12): place(buf, clap(), t, .35 * level)
        if s % 2 == 1: place(buf, hat(s == 7 or s == 15), t, .12 * level)
        if full and s in (0, 3, 6, 10, 12): place(buf, stab(ch), t, .30 * level)
        if s % 2 == 0: place(buf, bass(root, BEAT / 2 * .9), t, (.5 if s % 4 else .35) * level)
        if full: place(buf, pluck(ch[[0, 2, 1, 3, 2, 0, 3, 1][s % 8]] + 12), t, .10 * level)
        t += BEAT / 4; step += 1

music = np.zeros(N)
# build-up: accelerating snare roll + riser into the slam
place(music, riser(LAND + .05), 0, .35)
t = .05
while t < LAND - .02:
    gap = .2 - .16 * (t / LAND)
    place(music, snare(), t, .25 + .4 * t / LAND); t += gap
place(music, impact(), LAND, .9); place(music, crash(), LAND, .3)
section(music, LAND, A0 - .1, 1.0)
place(music, riser(.6), A0 - .7, .25)
# under the commentary: just a soft pulse
section(music, A0, ASK - .1, .16, full=False)
place(music, impact(), ASK, .8); place(music, crash(), ASK, .3)
section(music, ASK, DUR, 1.0)
fade = np.interp(np.arange(N) / SR, [0, DUR - 1.4, DUR], [1, 1, 0])
music *= fade

# ---------- game-show SFX
def bloop(f0, f1, d=.16):
    t = tt(d); f = np.geomspace(f0, f1, len(t)); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (d * .5))
def shing():
    t = tt(1.0); return sum(np.sin(2 * np.pi * f * t) * np.exp(-t / dd) for f, dd in ((2093, .35), (3136, .25), (4186, .18), (5274, .12))) / 3
def bell(m):
    t = tt(1.0); f = mtof(m); return (np.sin(2 * np.pi * f * t) + .5 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / .1)) * np.exp(-t / .35)
def zap():
    t = tt(.22); f = np.geomspace(2400, 120, len(t)); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .08)
def whoosh(d):
    t = tt(d); n = rng.standard_normal(len(t)); out = np.zeros(len(t))
    fc = np.geomspace(300, 7000, len(t) // 1200 + 1)
    for k, c0 in enumerate(range(0, len(t), 1200)):
        out[c0:c0 + 1200] = bp(n[c0:c0 + 1200], fc[k] * .6, min(fc[k] * 1.6, 20000))
    return out * np.sin(np.pi * t / d) ** 2

sfx = np.zeros(N)
for k in range(5): place(sfx, whoosh(.18), .25 + k * .14, .12)          # the spinning '?'
place(sfx, shing(), LOCK, .35)                                         # logo lockup
for d, (f0, f1) in zip(TXT, ((300, 900), (450, 1300))): place(sfx, bloop(f0, f1), d, .45)
place(sfx, bell(88), A0 - .05, .25); place(sfx, bell(91), A0 + .12, .25)  # 'listen'
for c in (CUT_B, CUT_C): place(sfx, zap(), c - .05, .25); place(sfx, whoosh(.4), c - .2, .2)
for k, ch in enumerate(([57, 60, 64], [58, 62, 65], [59, 63, 66], [60, 64, 67, 72])):   # dun-dun-dun-DUN
    place(sfx, stab(ch, .5 if k == 3 else .2), ASK - .55 + k * .18 if k < 3 else ASK, .5)
place(sfx, bloop(500, 1500, .2), ASK + .65, .45)
place(sfx, bell(84), ASK + 1.0, .2); place(sfx, bell(88), ASK + 1.1, .2); place(sfx, bell(91), ASK + 1.2, .25)

with wave.open(os.path.join(HERE, 'commentary-raw.wav')) as w:
    com = np.frombuffer(w.readframes(w.getnframes()), '<i2') / 32768.0
voice = np.zeros(N); place(voice, com, A0)

def norm(x, pk): m = np.max(np.abs(x)); return x * pk / m if m else x
mix = np.tanh(norm(voice, .9) + norm(music, .55) + norm(sfx, .55))
os.makedirs(OUT, exist_ok=True)
pcm = (np.clip(np.stack([mix, mix], 1), -1, 1) * 32767).astype('<i2')
with wave.open(os.path.join(OUT, 'quiz-mix.wav'), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print(os.path.join(OUT, 'quiz-mix.wav'), DUR)
