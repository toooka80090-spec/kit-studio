"""Sound for the VAMOS delivery ad. Every time comes from timeline.json.

    python3 sound.py            -> out/sfx.wav (mastered to -14 LUFS)
Uses the procedural engine in motion/sfx: no samples, no licences.
"""
import json, math, os, random, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "motion"))
from sfx.mix import Mix                      # noqa: E402
from sfx.synth import SR, blip, chime, click, envelope, impact, pad, pop, riser, scratch, whoosh  # noqa: E402

tl = json.load(open(os.path.join(HERE, "timeline.json")))
DUR, BEAT = tl["duration"], 60 / tl["bpm"]

# E minor -> G major lift on the CTA. Every tonal sound stays in this key.
E2, B2, E3, G3, B3, D4, E4, G4, A4, B4 = 82.41, 123.47, 164.81, 196.0, 246.94, 293.66, 329.63, 392.0, 440.0, 493.88
POPS = [659.25, 739.99, 783.99, 880.0, 987.77, 1174.66, 1318.51]   # E major-ish ladder for the flags


def kick(f0=150, f1=45, dur=0.32):
    n = int(SR * dur); out = []; ph = 0.0
    for k in range(n):
        x = k / n; f = f1 + (f0 - f1) * math.exp(-x * 18); ph += 2 * math.pi * f / SR
        out.append(math.sin(ph) * math.exp(-x * 6.5) * (1 if k > 40 else k / 40))
    return out


def bass(f, dur):
    n = int(SR * dur); out = []
    for k in range(n):
        x = k / SR; a = min(1, k / 300) * math.exp(-x * 2.2)
        out.append((math.sin(2 * math.pi * f * x) + 0.35 * math.sin(4 * math.pi * f * x)) * a)
    return out


def hat(dur=0.05, seed=0):
    r = random.Random(seed); n = int(SR * dur); prev = 0.0; out = []
    for k in range(n):
        w = r.uniform(-1, 1); hp = w - prev; prev = w
        out.append(hp * math.exp(-k / n * 7) * 0.5)
    return out


def score(mix):
    s1, s2, s3, s4, s5, s6, s7, s8 = (tl[k] for k in ("s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"))
    put = mix.put

    # bed: pad under everything, ducked under the iris hit
    vol = envelope([(0, 0.6), (1.0, 1), (s8["iris"] - 0.1, 1), (s8["iris"] + 0.2, 0.4), (s8["iris"] + 0.9, 1.1), (DUR - 1, 1.1), (DUR, 0)])
    L, R = pad(DUR, [(0, [E3, G3, B3, D4]), (s4["start"], [E3, G3, B3, E4]), (s6["start"], [D4, G3, B3, E4]), (s8["iris"], [G3, B3, D4, G4, A4])], volume=vol)
    mix.put_stereo(0, L, R, 0.16)

    # pulse: kick on the beat from the first chapter to the CTA, hats on the off-beat
    t, i = s2["start"], 0
    while t < s8["iris"] - 0.05:
        put(t, kick(), 0.22 if i % 2 == 0 else 0.17)
        root = E2 if t < s6["start"] else 98.0
        put(t + 0.02, bass(root * (1.5 if i % 8 == 6 else 1), BEAT * 0.95), 0.2)
        put(t + BEAT / 2, hat(seed=i), 0.07, pan=0.25 if i % 2 else -0.25)
        t += BEAT; i += 1

    # S1 hook
    put(0.0, whoosh(0.5, 300, 2400, peak=0.3), 0.22)
    put(s1["words"], blip(E4, 0.3), 0.12); put(s1["words"] + 0.12, blip(G4, 0.3), 0.12)
    put(s1["hl"], pop(900, 1500), 0.16)
    # chapter chips + transitions
    for s in (s2, s3, s4, s5, s6):
        put(s["start"] - 0.12, whoosh(0.35, 600, 3000, peak=0.6), 0.2)
        put(s["start"] + 0.08, click(2200), 0.12)
    # S2 cotton: soft pops as the bolls arrive, count-up ticks
    for k in range(8):
        put(s2["circle"] + 0.15 + k * 0.05, pop(700 + k * 60, 1100 + k * 60, 0.12), 0.06, pan=-0.6 + k * 0.17)
    tt = s2["count"]
    while tt < s2["countEnd"]:
        put(tt, click(3200, 0.025), 0.05); tt += 0.06
    put(s2["countEnd"], chime([E4, G4, B4], 0.9, 0.35), 0.1)
    # S3 stitching: outline sketched, then needle ticks
    put(s3["draw"], scratch(s3["drawEnd"] - s3["draw"]), 0.12)
    tt = s3["stitch"]
    while tt < s3["stitchEnd"]:
        put(tt, click(1500, 0.03), 0.09, pan=0.2 * math.sin(tt * 9)); tt += 0.07
    # S4 print: scan riser into a pop, whips on every colour swap
    put(s4["scan"] - 0.2, riser(s4["scanEnd"] - s4["scan"] + 0.2, 300, 3000), 0.14)
    put(s4["scanEnd"], pop(1200, 1800), 0.2)
    for k, ts in enumerate(s4["swaps"]):
        put(ts - 0.05, whoosh(0.25, 2500, 700, peak=0.4), 0.22, pan=-0.5)
        put(ts + 0.12, blip([B4, D4 * 2, E4 * 2][k], 0.25), 0.1)
    # S5 pack: drop, flaps, tape, label
    put(s5["dropEnd"] - 0.05, kick(110, 50, 0.25), 0.25)
    put(s5["lid"], whoosh(0.3, 900, 2000, peak=0.7), 0.15)
    put(s5["lidEnd"], kick(160, 60, 0.18), 0.3)
    put(s5["tape"], whoosh(0.3, 3000, 5200, peak=0.2), 0.12)
    put(s5["label"], pop(1000, 1600), 0.18)
    # S6 delivery: truck in, cargo, truck out, globe routes
    put(s6["truckIn"], whoosh(0.6, 2200, 400, peak=0.7), 0.3, pan=0.6)
    put(s6["load"] + 0.2, kick(130, 55, 0.2), 0.22)
    put(s6["drive"], whoosh(0.6, 400, 2600, peak=0.6), 0.32, pan=-0.6)
    for k in range(7):
        put(s6["routes"] + 0.4 + k * 0.08, pop(POPS[k] * 0.8, POPS[k], 0.12), 0.07, pan=-0.6 + k * 0.2)
    put(s6["abroad"] + 0.35, pop(800, 1400), 0.15)
    # S7 flags: one rising pop per tile, chime when the count lands
    for k in range(29):
        put(s7["tiles"] + k * s7["step"], pop(POPS[k % 7] * (1 + (k // 7) * 0.12), POPS[k % 7] * 1.4, 0.1), 0.06, pan=0.6 - (k % 5) * 0.3)
    put(s7["tiles"] + 28 * s7["step"] + 0.1, chime([E4, G4, B4, E4 * 2], 1.4, 0.5), 0.14)
    # S8 CTA: the one riser and the one impact of the video
    put(s8["iris"] - 1.0, riser(1.0, 260, 5200), 0.16)
    put(s8["iris"], impact(1.4), 0.38)
    put(s8["logo"], chime([G4, B4, D4 * 2, G4 * 2], 2.2, 0.8), 0.16)
    put(s8["cta"], pop(900, 1500), 0.2)
    put(s8["url"], click(2400), 0.12)


if __name__ == "__main__":
    mix = Mix(DUR)
    score(mix)
    mix.master(-14.0)
    os.makedirs(os.path.join(HERE, "out"), exist_ok=True)
    mix.write(os.path.join(HERE, "out", "sfx.wav"))
    print("-> out/sfx.wav")
