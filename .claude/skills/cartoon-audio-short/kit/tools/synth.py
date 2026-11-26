"""مكتبة مُركِّبات للفيديوهات الكرتونية: موسيقى بطابع المارش + مؤثرات كرتونية، كلها مولّدة بـ numpy.

يستخدمها audio.py في كل مشروع (وهو يحتوي جدول الإشارات فقط):

    from synth import *
    T = Track.for_voice()                 # الطول = طول الصوت (work/phrases.json أو voice.mp3)
    music, sfx = T.new(), T.new()
    march(T, music, end=14.15)            # تتوقف عند سطر المفاجأة
    drone(T, music, 14.15)                # طنين توتر منخفض حتى النهاية
    T.place(sfx, thunk(85, 0.35), T.F(120), 1.0)   # T.F(إطار) ← ثوانٍ
    T.save(music, "music.wav"); T.save(sfx, "sfx.wav")

المسارات تُكتب مطبّعة الذروة. مستواها النهائي يضبطه mix.py فقط (الموسيقى والمؤثرات عند 50% من الصوت).
"""
import json, os, subprocess, wave
import numpy as np

SR = 48000
FPS = 30
_rng = np.random.default_rng(7)


def seed(n):
    """إعادة بذر مولّد الضجيج (نفس البذرة ← نفس المسارات تماماً)."""
    global _rng
    _rng = np.random.default_rng(n)


def voice_duration(voice="voice.mp3", phrases="work/phrases.json"):
    if os.path.exists(phrases):
        return float(json.load(open(phrases))["duration"])
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", voice, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"],
                         capture_output=True).stdout
    if not raw:
        raise SystemExit(f"synth: cannot read {voice} (and no {phrases})")
    return len(raw) / 2 / SR   # الطول بعد فك الترميز (ffprobe يبالغ في طول MP3 بسبب حشو المُرمِّز)


class Track:
    def __init__(self, dur):
        self.dur = dur
        self.N = int(round(dur * SR))

    @classmethod
    def for_voice(cls, voice="voice.mp3", phrases="work/phrases.json"):
        return cls(voice_duration(voice, phrases))

    def new(self):
        return np.zeros(self.N, np.float32)

    @staticmethod
    def F(frame):
        return frame / FPS

    def place(self, buf, sig, t0, gain=1.0):
        i = int(round(t0 * SR)); j = min(self.N, i + len(sig))
        if i < 0:
            sig = sig[-i:]; j = min(self.N, len(sig)); i = 0
        if i < self.N and j > i:
            buf[i:j] += sig[: j - i] * gain

    def save(self, buf, path, tail_fade=0.06, crest_db=None):
        """كتابة مسار. crest_db (استخدم ~14 لمسار المؤثرات) يروّض الذُّرى الحادة داخل المسار حتى تجلس المؤثرات
        قرب 50% من الصوت دون ذُرى بارزة؛ هذا تصميم صوتي على المسار وليس ضغطاً للمزيج."""
        x = buf.astype(np.float32).copy()
        if crest_db:
            x = tame_peaks(x, crest_db)
        n = int(tail_fade * SR)
        if n and len(x) > n:
            x[-n:] *= np.linspace(1, 0, n, dtype=np.float32)  # بلا طقطقة حيث يُقص المسار عند نهاية الصوت
        pk = float(np.max(np.abs(x))) if len(x) else 0.0
        if pk > 0:
            x *= 0.9 / pk
        pcm = (np.clip(x, -1, 1) * 32767).astype(np.int16)
        with wave.open(path, "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
        print(f"wrote {path}  {len(x) / SR:.2f}s")


def tame_peaks(x, crest_db=14.0, block_ms=1.0, hold_ms=6.0, release_ms=60.0):
    """محدِّد ذروة استباقي للمسار: الذُّرى تُحصر عند `crest_db` فوق RMS النشط للمسار."""
    b = max(1, int(SR * block_ms / 1000)); k = len(x) // b
    if k < 4:
        return x
    blocks = np.abs(x[: k * b]).reshape(k, b)
    p = np.mean(blocks ** 2, axis=1); act = p[p > 1e-7]
    if len(act) == 0:
        return x
    thr = float(np.sqrt(np.mean(act))) * 10 ** (crest_db / 20)
    pk = blocks.max(axis=1)
    h = int(hold_ms / block_ms)
    pk = np.max(np.stack([np.roll(pk, s) for s in range(-h, h + 1)]), axis=0)   # استباق + تثبيت
    g = np.minimum(1.0, thr / np.maximum(pk, 1e-9))
    a = np.exp(-block_ms / release_ms)
    for i in range(1, len(g)):                                                  # هجوم فوري، تحرير ناعم
        g[i] = min(g[i], a * g[i - 1] + (1 - a))
    gs = np.interp(np.arange(k * b), np.arange(k) * b + b / 2, g)
    y = x.copy(); y[: k * b] *= gs.astype(np.float32)
    return y


# ---------------- اللبنات الأساسية ----------------
midi = lambda m: 440 * 2 ** ((m - 69) / 12)


def tt(d):
    return np.arange(int(d * SR)) / SR


def noise(d):
    return _rng.standard_normal(int(d * SR)).astype(np.float32)


def env(n, a=0.005, r=0.2):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / r)


def lp(x, cutoff):
    """مرشّح تمرير منخفض ناعم بـ FFT (انحدار من الدرجة الرابعة تقريباً)."""
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / (1 + (f / cutoff) ** 4)
    return np.fft.irfft(X, len(x)).astype(np.float32)


def hp(x, cutoff):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 - 1 / (1 + (f / cutoff) ** 4)
    return np.fft.irfft(X, len(x)).astype(np.float32)


# ---------------- الموسيقى ----------------
def pluck(f, dur=0.35, bright=0.5):
    n = int(dur * SR); t = np.arange(n) / SR
    s = sum((bright ** k) * np.sin(2 * np.pi * f * (k + 1) * t) / (k + 1) for k in range(6))
    return (s * env(n, 0.003, dur * 0.35)).astype(np.float32)


def brass(fs, dur):
    n = int(dur * SR); t = np.arange(n) / SR; s = np.zeros(n)
    for f in fs:
        ph = 2 * np.pi * f * t + 0.003 * np.sin(2 * np.pi * 5 * t)
        s += sum(np.sin((k + 1) * ph) / (k + 1) ** 1.3 for k in range(8))
    a = np.minimum(1, t / 0.08) * np.minimum(1, (dur - t) / 0.15).clip(0)
    return lp((s * a).astype(np.float32), 1800) / len(fs)


def drum(kind):
    if kind == "kick":
        n = int(0.35 * SR); t = np.arange(n) / SR; f = 50 + 90 * np.exp(-t * 30)
        return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)).astype(np.float32)
    n = int(0.18 * SR); t = np.arange(n) / SR
    s = _rng.standard_normal(n) * np.exp(-t * 28) * 0.6 + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 20) * 0.5
    return hp(s.astype(np.float32), 300)


PROG_MINOR = [(57, [57, 60, 64]), (53, [53, 57, 60]), (55, [55, 59, 62]), (52, [52, 56, 59])]  # Am F G E (شقاوة)
PROG_MAJOR = [(60, [60, 64, 67]), (57, [57, 60, 64]), (53, [53, 57, 60]), (55, [55, 59, 62])]  # C Am F G (مرح)


def march(T, buf, end, start=0.0, bpm=104, prog=PROG_MINOR, fanfare=True):
    """مارش بطبل كبير وسنير، باص منقور، وخلفية نحاسية. يعمل من start إلى end (ث) ويتلاشى خلال ~80 ms عند النهاية."""
    beat = 60 / bpm; bar = 0; t0 = start
    while t0 < end:
        root, ch = prog[bar % len(prog)]
        T.place(buf, brass([midi(m) for m in ch], beat * 4 * 0.98), t0, 0.10)
        for b in range(4):
            tb = t0 + b * beat
            if tb >= end: break
            T.place(buf, drum("kick" if b % 2 == 0 else "snare"), tb, 0.55 if b % 2 == 0 else 0.32)
            T.place(buf, pluck(midi(root - 12), 0.4, 0.4), tb, 0.35)
            T.place(buf, pluck(midi(ch[(b + bar) % 3] + 12), 0.22, 0.6), tb + beat / 2, 0.13)
        if fanfare and bar % 2 == 1:
            for k, m in enumerate([ch[0] + 12, ch[1] + 12, ch[2] + 12]):
                T.place(buf, brass([midi(m)], beat * 0.45), t0 + 2 * beat + k * beat * 0.5, 0.07)
        bar += 1; t0 += beat * 4
    i0 = max(0, int((end - 0.08) * SR))
    if i0 < T.N:
        buf[i0:] *= (np.linspace(1, 0, T.N - i0) ** 8).astype(np.float32)


def drone(T, buf, start, end=None, gain=0.09, base=55.0):
    """طنين توتر منخفض (بعد ضربة المفاجأة)."""
    end = T.dur if end is None else end
    d = max(0.0, end - start); t = tt(d)
    s = (np.sin(2 * np.pi * base * t) + 0.5 * np.sin(2 * np.pi * base * 1.498 * t) + 0.3 * np.sin(2 * np.pi * base * 2.005 * t)) * np.minimum(1, t / 1.2)
    T.place(buf, lp(s.astype(np.float32), 600), start, gain)


# ---------------- المؤثرات ----------------
def thunk(f0=90, d=0.3):
    t = tt(d)
    return (np.sin(2 * np.pi * f0 * t * (1 + 0.6 * np.exp(-t * 40))) * np.exp(-t * 14) + lp(noise(d), 1200) * np.exp(-t * 30) * 0.5).astype(np.float32)


def rumble(d):
    t = tt(d)
    return (lp(noise(d), 160) * 3 * np.minimum(1, t / 0.15) * np.exp(-t / (d * 0.45))).astype(np.float32)


def crash(d=1.2):
    n = int(d * SR); t = np.arange(n) / SR; s = np.zeros(n, np.float32)
    for _ in range(14):
        i = int(_rng.uniform(0, d * 0.6) * SR); g = thunk(_rng.uniform(60, 160), 0.35) * _rng.uniform(0.3, 0.9)
        s[i:i + len(g)] += g[: n - i]
    return s + lp(noise(d), 2500) * np.exp(-t * 3) * 0.25


def cuckoo():
    out = []
    for f, d in [(740, 0.16), (587, 0.24)]:
        t = tt(d); out.append(np.sin(2 * np.pi * f * t) * np.minimum(1, t / 0.01) * np.exp(-t * 6)); out.append(np.zeros(int(0.06 * SR)))
    return np.concatenate(out).astype(np.float32)


def scrape(d=0.8):
    t = tt(d)
    s = noise(d) * (0.5 + 0.5 * np.sin(2 * np.pi * 13 * t)) * np.sin(np.pi * t / d)
    s = hp(lp(s, 5000), 1500)
    return (s * 0.6 + np.sin(2 * np.pi * 1870 * t) * np.exp(-t * 3) * 0.2).astype(np.float32)


def ting():
    t = tt(1.2)
    return (sum(np.sin(2 * np.pi * f * t) * np.exp(-t * k) for f, k in [(2093, 4), (3136, 6), (4186, 8)]) * 0.3).astype(np.float32)


def sting():
    t = tt(2.0)
    s = np.sin(2 * np.pi * 41 * t) * np.exp(-t * 1.5) * 1.2 + lp(noise(2.0), 900) * np.exp(-t * 6) * 0.8
    stab = brass([midi(45), midi(48), midi(51)], 1.4)
    s[: len(stab)] += stab * 2.2 * np.exp(-np.arange(len(stab)) / SR * 2)
    return s.astype(np.float32)


def creak(d=0.6, f0=140):
    n = int(d * SR); t = np.arange(n) / SR
    rate = f0 * (1 + 0.35 * np.sin(2 * np.pi * 1.3 * t / d))
    pulses = (np.mod(np.cumsum(rate) / SR, 1) < 0.08).astype(np.float32)
    s = lp(pulses * (0.6 + 0.4 * _rng.random(n).astype(np.float32)), 2200) * np.sin(np.pi * t / d)
    return hp(s.astype(np.float32), 200) * 2.5


def snap():
    d = 0.5; n = int(d * SR); t = np.arange(n) / SR
    return (hp(noise(d), 800) * np.exp(-t * 18) * 1.4 + np.pad(thunk(120, 0.4), (0, n - int(0.4 * SR))) * 0.6).astype(np.float32)


def splash(d=1.0):
    t = tt(d)
    return (lp(noise(d), 4000) * (np.exp(-t * 4) * np.minimum(1, t / 0.01)) + lp(noise(d), 400) * np.exp(-t * 7) * 1.5).astype(np.float32)


def whoosh(d=0.5):
    t = tt(d)
    return (lp(noise(d), 1500) * np.sin(np.pi * t / d) ** 2 * 0.6).astype(np.float32)


def snore(d=1.1):
    t = tt(d)
    buzz = (np.mod(np.cumsum(60 + 25 * np.sin(np.pi * t / d)) / SR, 1) < 0.3).astype(np.float32)
    return (lp(buzz * 0.5 + noise(d) * 0.15, 700) * np.sin(np.pi * t / d) ** 2).astype(np.float32)


def leaves(d):
    t = tt(d)
    return (hp(lp(noise(d), 6000), 2500) * (0.3 + 0.3 * np.sin(2 * np.pi * 0.7 * t) ** 2) * np.minimum(1, t / 0.4) * np.minimum(1, (d - t) / 0.4)).astype(np.float32)


def water(d):
    t = tt(d)
    return (lp(noise(d), 900) * 0.5 + hp(lp(noise(d), 3000), 1200) * 0.15 * (0.6 + 0.4 * np.sin(2 * np.pi * 0.4 * t))).astype(np.float32)


def pop(f0=520):
    t = tt(0.12)
    return (np.sin(2 * np.pi * f0 * t * (1 + 2.5 * np.exp(-t * 60))) * np.exp(-t * 35)).astype(np.float32)


def boing(f0=180, d=0.6):
    t = tt(d)
    f = f0 * (1 + 0.6 * np.exp(-t * 6) * np.sin(2 * np.pi * 9 * t))
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 4)).astype(np.float32)


def footstep():
    t = tt(0.12)
    return (lp(noise(0.12), 900) * np.exp(-t * 45) + np.sin(2 * np.pi * 70 * t) * np.exp(-t * 40) * 0.6).astype(np.float32)


def steps(n, every=0.42):
    """n خطوات، واحدة كل `every` ثانية، كإشارة واحدة."""
    out = np.zeros(int((n * every + 0.2) * SR), np.float32)
    for k in range(n):
        s = footstep() * (0.8 + 0.2 * (k % 2)); i = int(k * every * SR); out[i:i + len(s)] += s
    return out


def wind(d):
    t = tt(d)
    return (lp(noise(d), 500) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.25 * t)) * np.minimum(1, t / 0.6) * np.minimum(1, (d - t) / 0.6)).astype(np.float32)


def crowd(d):
    """همهمة حشد (قرويون ساخرون، سوق)."""
    t = tt(d); s = np.zeros(len(t), np.float32)
    for _ in range(10):
        f = _rng.uniform(140, 320); am = 0.5 + 0.5 * np.sin(2 * np.pi * _rng.uniform(2, 5) * t + _rng.uniform(0, 6))
        s += (np.sin(2 * np.pi * f * t) * am).astype(np.float32)
    s = lp(s * 0.2 + noise(d) * 0.3, 1200)
    return (s * np.minimum(1, t / 0.3) * np.minimum(1, (d - t) / 0.3)).astype(np.float32)


__all__ = [n for n in dir() if not n.startswith("_") and n not in ("json", "os", "subprocess", "wave", "np")] + ["np"]
