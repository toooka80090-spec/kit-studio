"""Synthesize background music + UI sound effects for how-to-order.html.

  python motion/audio.py            -> motion/out/music.wav, sfx.wav, mix.wav
Timings below mirror the TAPS / SCREENS / STEPS timeline in how-to-order.html.
"""
import os, wave
import numpy as np
from scipy.signal import butter, sosfilt

SR = 48000
# ---- timeline: shared with the HTML via timeline.js ----
import json
with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'timeline.js'), encoding='utf-8') as f:
    _js = f.read()
TL = json.loads(_js[_js.index('{'):_js.rindex('}') + 1])
M = TL['moments']
DUR = float(TL['duration'])
N = int(SR * DUR)
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')
rng = np.random.default_rng(7)

TAPS = [t for t, _ in TL['taps']]
SCREEN_CHANGES = [a for _, a, _ in TL['screens'] if a > 0]
TYPING = [(a, b, len(txt)) for _, a, b, txt in TL['typing']]
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
    i = int(t * SR)
    if i >= len(buf): return
    sig = sig[:len(buf) - i]
    a = (pan + 1) * np.pi / 4
    buf[i:i + len(sig), 0] += sig * gain * np.cos(a)
    buf[i:i + len(sig), 1] += sig * gain * np.sin(a)

def place_st(buf, st, t, gain=1.0):
    i = int(t * SR)
    st = st[:len(buf) - i]
    buf[i:i + len(st)] += st * gain


# ================= MUSIC =================
music = np.zeros((N, 2))
beat = 60 / BPM
bar = beat * 4
DRUMS_IN, DRUMS_OUT = TL['drums']

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
cut = np.interp(np.arange(N) / SR, [0, DRUMS_IN, DRUMS_OUT, DUR], [300, 1400, 1400, 500])
pad_f = np.zeros_like(pad)
for c0 in range(0, N, 2400):  # block-wise moving low-pass
    sos = butter(2, cut[c0], 'low', fs=SR, output='sos')
    pad_f[c0:c0 + 2400] = sosfilt(sos, pad[c0:c0 + 2400], axis=0)
music += pad_f * .55 * pump[:, None]

# outro: final kick + reverse-ish swell, then fade
place(music, K, M['outro'] + .45, .5); place(music, C, M['outro'] + .45, .12)
fade = np.interp(np.arange(N) / SR, [0, .4, DUR - 1.6, DUR], [0, 1, 1, 0])
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

# intro: symbol drop + wordmark wipe + tagline, riser through the hold, phone landing
place(sfx, impact() * .6, .42, .30); place(sfx, pop(), .42, .25)
place_st(sfx, whoosh_st(.5, .30), .42)
place(sfx, chime([76, 83], .09, .3), .85, .10)
place(sfx, riser(1.6), 1.15, .18)
place_st(sfx, whoosh_st(.55, .35, l2r=False), 2.6)
place(sfx, impact(), 3.4, .35)

# taps
for k, t in enumerate(TAPS):
    place(sfx, tap_click(), t, .55, (-.15 if k % 2 else .15))

# typing
for a, b, n in TYPING:
    for k in range(n):
        tk = a + (b - a) * k / n + rng.uniform(-.008, .008)
        place(sfx, type_tick(1850 + rng.uniform(-250, 250)), tk, .15, rng.uniform(-.2, .2))

# page transitions (site is LTR: new page pushes in from the right)
for t in SCREEN_CHANGES: place_st(sfx, whoosh_st(.42, .30, l2r=False), t - .05)

# moments
for _, a, b, _ in TL['scrolls']:                                  # page scrolls
    place(sfx, whoosh(b - a, 300, 2500) * .25, a, .5)
for a, b, _ in TL['billingScrolls']:
    place(sfx, whoosh(b - a, 300, 2500) * .22, a, .5)
place(sfx, pop(), M['size'] + .03, .30)                           # size selected
place(sfx, chime([84, 88], .06, .2), M['toastIn'], .11)           # added to cart
place(sfx, pop(), M['badge'] + .1, .38, .3)                       # cart badge 0 -> 1
place_st(sfx, whoosh_st(.55, .32), M['drawerIn'])                 # mini cart slides in from the left
for _, at, _ in TL['selects']: place(sfx, pop() * .7, at, .22)    # dropdown value picked
place(sfx, pop(), M['formOpen'], .25)                             # address form opens
place(sfx, chime([72, 76, 79, 84, 88], .075, .45), M['success'], .20)  # order complete
for k in range(12):
    tn = tt(.08); f = rng.uniform(5000, 9000)
    place(sfx, np.sin(2 * np.pi * f * tn) * np.exp(-tn / .02), M['success'] + .15 + k * .06 + rng.uniform(0, .04), .05, rng.uniform(-.8, .8))
place_st(sfx, whoosh_st(.7, .35, l2r=False), M['phoneOut'] - .1)  # outro move
place(sfx, impact() * .7, M['outro'] + .45, .32); place(sfx, pop(), M['outro'] + .45, .22)  # symbol lands
place_st(sfx, whoosh_st(.5, .25), M['outro'] + .3)                 # wordmark wipe
place(sfx, chime([84, 91], .08, .4), M['url'] + .1, .14)           # url pill
place(sfx, chime([91, 96], .1, .5), M['tagline'], .07)             # tagline

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
