"""Music + transition SFX for the cotton-to-door ad  ->  ad/out/mix.wav

  python ad/audio.py
Street Trial (120 BPM, drop at 9.0) carries the edit; whooshes sit under each V wipe,
a soft impact under the logo stamp. Cut times match overlay.html.
"""
import os, subprocess, wave
import numpy as np
from scipy.signal import butter, sosfilt

HERE = os.path.dirname(os.path.abspath(__file__))
SR, DUR = 48000, 28.0
CUTS = [3.0, 6.01, 13.03, 17.03, 21.03, 24.23]
STAMP = 11.03
rng = np.random.default_rng(9)

def tt(d): return np.arange(int(SR * d)) / SR
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), x)
def place(buf, sig, t, g):
    i = int(t * SR); sig = sig[:len(buf) - i]; buf[i:i + len(sig)] += sig[:, None] * g

def whoosh(d):
    t = tt(d); n = rng.standard_normal(len(t)); out = np.zeros(len(t))
    fc = np.geomspace(300, 7000, len(t) // 1200 + 1)
    for k, c0 in enumerate(range(0, len(t), 1200)):
        out[c0:c0 + 1200] = bp(n[c0:c0 + 1200], fc[k] * .6, min(fc[k] * 1.6, 20000))
    return out * np.sin(np.pi * t / d) ** 2

def impact():
    t = tt(.9); f = 40 + 70 * np.exp(-t / .06)
    return np.tanh(1.5 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .25))

raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(HERE, 'music', 'street-trial.mp3'), '-t', str(DUR),
                      '-ac', '2', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True, check=True).stdout
music = np.frombuffer(raw, '<i2').reshape(-1, 2) / 32768.0
mix = np.zeros((int(SR * DUR), 2)); mix[:len(music)] = music

sfx = np.zeros_like(mix)
for c in CUTS: place(sfx, whoosh(.5), c - .3, .22)
place(sfx, impact(), STAMP, .30)
mix = np.tanh((mix + sfx) * 1.0)
mix *= np.interp(np.arange(len(mix)) / SR, [0, DUR - .35, DUR], [1, 1, 0])[:, None]

os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
with wave.open(os.path.join(HERE, 'out', 'mix.wav'), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(mix, -1, 1) * 32767).astype('<i2').tobytes())
print(os.path.join(HERE, 'out', 'mix.wav'))
