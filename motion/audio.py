"""Synthesize background music + UI sound effects for how-to-order.html.

  python motion/audio.py            -> motion/out/music.wav, sfx.wav, mix.wav
Timings below mirror the TAPS / SCREENS / STEPS timeline in how-to-order.html.
"""
import os, wave
import numpy as np
from scipy.signal import butter, sosfilt

SR = 48000
DUR = 30.0
# animation time -> video time (inverse of TIME_MAP in the HTML); SFX are written in animation time
A_KNOTS = [0, 1.6 - 1e-6, 1.6, 2.6, 7.4, 14.2, 19.4, 22.6, 25.8, 28.0, 29]
R_KNOTS = [0, 1.6 - 1e-6, 2.5, 3.5, 8.0, 14.2, 18.3, 20.9, 25.0, 27.6, 30]
def W(t): return float(np.interp(t, A_KNOTS, R_KNOTS))
N = int(SR * DUR)
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')
rng = np.random.default_rng(7)

# ---- timeline (keep in sync with the HTML) ----
TAPS = [3.4, 4.7, 5.9, 8.9, 10.5, 12.1, 13.7, 16.4, 17.6, 18.9, 21.9]
SCREEN_CHANGES = [7.4, 9.4, 11.0, 12.6, 14.2, 19.4]
TYPE_FIRST = (3.55, 4.1, 5)   # start, end, chars
TYPE_LAST = (4.85, 5.5, 7)
TYPE_EMAIL = (6.05, 6.9, 15)
BPM = 120


def tt(d): return np.arange(int(SR * d)) / SR
def env(n, a, d):  # attack/exp-decay envelope
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def mtof(m): return 440 * 2 ** ((m - 69) / 12)

def place(buf, sig, t, gain=1.0, pan=0.0):
    """Mix mono `sig` into stereo `buf` at time t with equal-power pan (-1 L .. 1 R)."""
    if buf is globals().get('sfx'): t = W(t)
    i = int(t * SR)
    if i >= len(buf): return
    sig = sig[:len(buf) - i]
    a = (pan + 1) * np.pi / 4
    buf[i:i + len(sig), 0] += sig * gain * np.cos(a)
    buf[i:i + len(sig), 1] += sig * gain * np.sin(a)

def place_st(buf, st, t, gain=1.0):
    if buf is globals().get('sfx'): t = W(t)
    i = int(t * SR)
    st = st[:len(buf) - i]
    buf[i:i + len(st)] += st * gain


# ================= MUSIC =================
music = np.zeros((N, 2))
beat = 60 / BPM
bar = beat * 4
DRUMS_IN, DRUMS_OUT = 3.65, 25.0

def kick():
    t = tt(.35)
    f = 48 + 90 * np.exp(-t / .035)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .16)
    return s + .25 * hp(rng.standard_normal(len(t)), 3000) * np.exp(-t / .004)

def clap():
    t = tt(.25)
    n = bp(rng.standard_normal(len(t)), 900, 5000)
    e = np.exp(-t / .07)
    for k in (.008, .016):  # three quick flams
        e += .6 * (t > k) * np.exp(-np.clip(t - k, 0, None) / .01)
    return n * e * .6

def hat(open_=False):
    t = tt(.25 if open_ else .06)
    return hp(rng.standard_normal(len(t)), 7500) * np.exp(-t / (.07 if open_ else .014))

K, C, H, HO = kick(), clap(), hat(), hat(True)

# sidechain pump envelope from kick positions
pump = np.ones(N)
t = DRUMS_IN
while t < DRUMS_OUT:
    i = int(t * SR); L = int(beat * SR)
    seg = 1 - .55 * np.exp(-np.arange(L) / SR / .11)
    pump[i:i + L] = seg[:N - i]
    t += beat

step = 0; t = DRUMS_IN
while t < DRUMS_OUT - 1e-6:
    if step % 2 == 0: place(music, K, t, .55)
    if step % 8 in (2, 6): place(music, C, t, .18, .05)
    if step % 2 == 1: place(music, HO if step % 8 == 7 else H, t, .07 if step % 8 == 7 else .09, -.25)
    else: place(music, H, t + beat / 4, .04, .25)
    step += 1; t += beat / 2

# chords: Am9 - Fmaj7 - Cmaj7 - G6   (1 bar each)
CHORDS = [[57, 60, 64, 67, 71], [53, 57, 60, 64, 69], [48, 55, 59, 64, 67], [55, 59, 62, 64, 71]]
ROOTS = [45, 41, 48, 43]
pad = np.zeros((N, 2))
for bi in range(int(np.ceil(DUR / bar))):
    t0 = bi * bar
    ch = CHORDS[bi % 4]
    d = bar + .4
    tl = tt(d)
    e = np.minimum(1, tl / .25) * np.minimum(1, (d - tl) / .4)
    for side, det in ((0, -1), (1, 1)):
        s = np.zeros(len(tl))
        for m in ch:
            f = mtof(m) * (1 + det * .0025)
            s += 2 * ((tl * f) % 1) - 1  # saw
        s = lp(s, 1400, 2) * e / len(ch)
        i = int(t0 * SR); s = s[:N - i]
        pad[i:i + len(s), side] += s
    # sub bass: root on 8ths with short notes
    for k in range(8):
        tb = t0 + k * beat / 2
        if tb < DRUMS_IN or tb > DRUMS_OUT: continue
        tn = tt(beat / 2 * .8)
        bs = np.sin(2 * np.pi * mtof(ROOTS[bi % 4]) * tn) * np.minimum(1, tn / .005) * np.exp(-tn / .18)
        place(music, bs, tb, .22 if k % 2 else .3)
    # pluck arp (16ths, sparse) from bar 3 on
    if DRUMS_IN + bar <= t0 < DRUMS_OUT:
        pat = [0, 2, 4, 3, 1, 4, 2, 3]
        for k in range(8):
            if k in (3, 7): continue
            m = ch[pat[k]] + 12
            tn = tt(.3)
            pl = (np.sin(2 * np.pi * mtof(m) * tn) + .3 * np.sin(4 * np.pi * mtof(m) * tn)) * np.exp(-tn / .09)
            place(music, pl, t0 + k * beat / 2 + beat / 4, .05, .4 if k % 2 else -.4)

# intro filter sweep on the pad, pumping while drums play
cut = np.interp(np.arange(N) / SR, [0, 3.65, 25.0, 30], [300, 1400, 1400, 500])
pad_f = np.zeros_like(pad)
for c0 in range(0, N, 2400):  # block-wise moving low-pass
    sos = butter(2, cut[c0], 'low', fs=SR, output='sos')
    pad_f[c0:c0 + 2400] = sosfilt(sos, pad[c0:c0 + 2400], axis=0)
music += pad_f * .55 * pump[:, None]

# outro: final kick + reverse-ish swell, then fade
place(music, K, W(26.3), .5); place(music, C, W(26.3), .12)
fade = np.interp(np.arange(N) / SR, [0, .4, 28.4, 30], [0, 1, 1, 0])
music *= fade[:, None]


# ================= SFX =================
sfx = np.zeros((N, 2))

def tap_click():
    t = tt(.09)
    body = np.sin(2 * np.pi * 190 * t) * np.exp(-t / .018)
    tick = np.sin(2 * np.pi * 2600 * t) * np.exp(-t / .006)
    air = hp(rng.standard_normal(len(t)), 5000) * np.exp(-t / .003)
    return .7 * body + .45 * tick + .25 * air

def type_tick(f):
    t = tt(.03)
    return (np.sin(2 * np.pi * f * t) * np.exp(-t / .004) + .5 * hp(rng.standard_normal(len(t)), 4000) * np.exp(-t / .002))

def whoosh(d=.45, lo=400, hi=6000):
    t = tt(d)
    n = rng.standard_normal(len(t))
    out = np.zeros(len(t))
    fc = np.geomspace(lo, hi, len(t) // 1200 + 1)
    for k, c0 in enumerate(range(0, len(t), 1200)):
        out[c0:c0 + 1200] = bp(n[c0:c0 + 1200], fc[k] * .6, min(fc[k] * 1.6, 20000))
    e = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
    return out * e

def whoosh_st(d=.45, gain=1.0, l2r=True):
    w = whoosh(d)
    p = np.linspace(-.8, .8, len(w)) if l2r else np.linspace(.8, -.8, len(w))
    a = (p + 1) * np.pi / 4
    return np.stack([w * np.cos(a), w * np.sin(a)], 1) * gain

def chime(notes, gap=.07, dec=.35):
    total = tt(gap * len(notes) + dec * 3)
    s = np.zeros(len(total))
    for k, m in enumerate(notes):
        tn = tt(dec * 3); f = mtof(m)
        n = (np.sin(2 * np.pi * f * tn) + .25 * np.sin(2 * np.pi * f * 2.01 * tn) + .1 * np.sin(2 * np.pi * f * 3 * tn)) * np.exp(-tn / dec) * np.minimum(1, tn / .003)
        i = int(k * gap * SR); s[i:i + len(n)] += n[:len(s) - i]
    return s

def pop():
    t = tt(.12)
    f = 300 + 900 * (1 - np.exp(-t / .02))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .03)

def impact():
    t = tt(1.2)
    f = 40 + 60 * np.exp(-t / .08)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .35)
    return boom + .3 * lp(rng.standard_normal(len(t)), 2500) * np.exp(-t / .12)

def riser(d):
    t = tt(d)
    n = rng.standard_normal(len(t)); out = np.zeros(len(t))
    fc = np.geomspace(300, 9000, len(t) // 1200 + 1)
    for k, c0 in enumerate(range(0, len(t), 1200)):
        out[c0:c0 + 1200] = bp(n[c0:c0 + 1200], fc[k] * .7, min(fc[k] * 1.4, 20000))
    return out * (t / d) ** 2

# intro: symbol drop + wordmark wipe + tagline, riser, phone landing
place(sfx, impact() * .6, .42, .30); place(sfx, pop(), .42, .25)
place_st(sfx, whoosh_st(.5, .30), .42)
place(sfx, chime([76, 83], .09, .3), .85, .10)
place(sfx, riser(1.8), 1.15, .18)  # spans the intro hold
place_st(sfx, whoosh_st(.55, .35, l2r=False), 1.95)
place(sfx, impact(), 2.75, .35)

# taps
for k, t in enumerate(TAPS):
    place(sfx, tap_click(), t, .55, (-.15 if k % 2 else .15))

# typing
for (a, b, n), f0 in ((TYPE_FIRST, 1900), (TYPE_LAST, 1800), (TYPE_EMAIL, 1950)):
    for k in range(n):
        tk = a + (b - a) * k / n + rng.uniform(-.012, .012)
        place(sfx, type_tick(f0 + rng.uniform(-200, 200)), tk, .16, rng.uniform(-.2, .2))

# page transitions (site is LTR: new page pushes in from the right)
for t in SCREEN_CHANGES: place_st(sfx, whoosh_st(.42, .30, l2r=False), t - .05)

# moments
place(sfx, chime([79, 84], .08, .25), 7.15, .11)                 # form filled
for t, d in ((7.9, .6), (14.9, 1.0), (20.1, 1.0)):              # page scrolls
    place(sfx, whoosh(d, 300, 2500) * .25, t, .5)
place(sfx, pop(), 16.45, .30)                                     # size L selected
place(sfx, chime([84, 88], .06, .2), 17.7, .11)                   # add to cart
place(sfx, pop(), 17.95, .38, .3)                                 # cart badge 0 -> 1
place_st(sfx, whoosh_st(.5, .30, l2r=False), 22.5)                # step-5 sheet slides up
for i in range(3):
    place(sfx, pop() * .6, 23.2 + i * .45, .22, -.2)              # checklist rows
    place(sfx, chime([84 + i * 3], .05, .12), 23.9 + i * .45, .08)
place(sfx, chime([72, 76, 79, 84, 88], .075, .45), 24.65, .20)   # done
for k in range(12):
    tn = tt(.08); f = rng.uniform(5000, 9000)
    place(sfx, np.sin(2 * np.pi * f * tn) * np.exp(-tn / .02), 24.8 + k * .06 + rng.uniform(0, .04), .05, rng.uniform(-.8, .8))
place_st(sfx, whoosh_st(.7, .35, l2r=False), 25.5)               # outro move
place(sfx, impact() * .7, 26.3, .32); place(sfx, pop(), 26.3, .22)  # symbol lands
place_st(sfx, whoosh_st(.5, .25), 26.2)                           # wordmark wipe
place(sfx, chime([84, 91], .08, .4), 26.95, .14)                 # url pill
place(sfx, chime([91, 96], .1, .5), 27.35, .07)                  # tagline

# light room reverb on sfx (short multi-tap, cheap)
rev = np.zeros_like(sfx)
for d, g in ((.021, .30), (.037, .22), (.053, .17), (.081, .11), (.113, .07)):
    i = int(d * SR)
    rev[i:, 0] += sfx[:-i, 1] * g; rev[i:, 1] += sfx[:-i, 0] * g
sfx += sosfilt(butter(2, 6000, 'low', fs=SR, output='sos'), rev, axis=0)


# ================= MIX =================
def norm(x, peak): m = np.max(np.abs(x)); return x * (peak / m) if m else x
music = norm(music, .30)          # background bed, well under the SFX
sfx = norm(sfx, .80)
mix = np.tanh((music + sfx) * 1.05) * .95  # gentle soft-clip glue

def save(name, x):
    os.makedirs(OUT, exist_ok=True)
    pcm = (np.clip(x, -1, 1) * 32767).astype('<i2')
    with wave.open(os.path.join(OUT, name), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    print(os.path.join(OUT, name))

save('music.wav', music); save('sfx.wav', sfx); save('mix.wav', mix)
