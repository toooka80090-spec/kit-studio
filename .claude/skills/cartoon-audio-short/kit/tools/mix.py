#!/usr/bin/env python3
"""مزج بمستويات مقفلة:  python3 mix.py voice.mp3 music.wav sfx.wav [--out mix_raw.wav]

القواعد (لا تُغيَّر يدوياً أبداً):
  * الصوت يُستخدم كما رُفع تماماً: بلا تعديل، بلا إعادة توقيت، بلا تغيير كسب هنا
  * الموسيقى = 50% من gated RMS للصوت  (−6.0 dB)
  * المؤثرات = 50% من gated RMS للصوت  (−6.0 dB) أو أقل، وذُراها لا تتجاوز 0.7× ذروة الصوت
  * بلا ducking، بلا ضغط، بلا تشبّع. المسارات تُحشى / تُقص إلى طول الصوت.
يكتب WAV بفاصلة عائمة 32-bit (بلا تقطيع؛ finish.sh يطبّق الكسب الخطي الواحد + محدِّد الذروة)
وmix_levels.json للفحص.
"""
import json, struct, subprocess, sys
import numpy as np

SR = 48000
TARGET = 0.5          # 50% من مستوى الصوت
SFX_PEAK_CAP = 0.7    # ذروة المؤثرات ≤ 0.7 × ذروة الصوت


def load(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True).stdout
    if not raw:
        sys.exit(f"mix.py: could not read {path}")
    return np.frombuffer(raw, np.float32).astype(np.float64)


def gated_rms(x, block=0.1, abs_gate_db=-50.0, rel_gate_db=-15.0):
    """RMS على المقاطع النشطة فقط (بوابة مطلقة، ثم بوابة نسبية تحت المتوسط)، حتى لا تُحسب الوقفات والصمت.
    نفس المقياس يُستخدم للصوت والموسيقى والمؤثرات."""
    n = int(block * SR); k = len(x) // n
    if k == 0:
        return float(np.sqrt(np.mean(x ** 2) + 1e-20))
    p = np.mean(x[: k * n].reshape(k, n) ** 2, axis=1)
    p = p[p > 10 ** (abs_gate_db / 10)]
    if len(p) == 0:
        return 0.0
    p = p[p > np.mean(p) * 10 ** (rel_gate_db / 10)]
    return float(np.sqrt(np.mean(p)))


def fit(x, n):
    return x[:n] if len(x) >= n else np.concatenate([x, np.zeros(n - len(x))])


def db(r):
    return 20 * np.log10(max(r, 1e-12))


def write_float_wav(path, x):
    data = x.astype("<f4").tobytes()
    with open(path, "wb") as f:
        f.write(b"RIFF" + struct.pack("<I", 36 + len(data)) + b"WAVE")
        f.write(b"fmt " + struct.pack("<IHHIIHH", 16, 3, 1, SR, SR * 4, 4, 32))
        f.write(b"data" + struct.pack("<I", len(data)) + data)


def main():
    a = [x for x in sys.argv[1:] if not x.startswith("--")]
    out = sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else "mix_raw.wav"
    if "--out" in sys.argv:
        a.remove(out)
    if len(a) < 2:
        sys.exit(__doc__)
    voice = load(a[0]); N = len(voice)
    music = fit(load(a[1]), N)
    sfx = fit(load(a[2]), N) if len(a) > 2 else np.zeros(N)

    v_rms, v_pk = gated_rms(voice), float(np.max(np.abs(voice)))
    if v_rms <= 0:
        sys.exit("mix.py: voice is silent")
    m_rms, s_rms, s_pk = gated_rms(music), gated_rms(sfx), float(np.max(np.abs(sfx)))

    gm = TARGET * v_rms / m_rms if m_rms > 0 else 0.0
    gs = 0.0
    if s_rms > 0:
        gs = TARGET * v_rms / s_rms
        if s_pk * gs > SFX_PEAK_CAP * v_pk:
            gs = SFX_PEAK_CAP * v_pk / s_pk  # سقف الذروة يغلب: المؤثرات تنتهي تحت 50% بقليل

    mix = voice + music * gm + sfx * gs
    write_float_wav(out, mix)

    lv = {
        "voice_gated_rms_dbfs": round(db(v_rms), 2), "voice_peak_dbfs": round(db(v_pk), 2),
        "music_vs_voice_db": round(db(gm * m_rms / v_rms), 2) if gm else None,
        "sfx_vs_voice_db": round(db(gs * s_rms / v_rms), 2) if gs else None,
        "sfx_peak_vs_voice_peak": round(gs * s_pk / v_pk, 3) if gs else None,
        "mix_peak_dbfs": round(db(float(np.max(np.abs(mix)))), 2), "duration_s": round(N / SR, 3),
    }
    json.dump(lv, open("mix_levels.json", "w"), indent=1)
    ok_m = lv["music_vs_voice_db"] is None or abs(lv["music_vs_voice_db"] + 6.02) < 0.2
    ok_s = lv["sfx_vs_voice_db"] is None or lv["sfx_vs_voice_db"] <= -5.8
    print(f"voice  gated RMS {lv['voice_gated_rms_dbfs']:7.2f} dBFS   peak {lv['voice_peak_dbfs']:6.2f} dBFS")
    print(f"music  {lv['music_vs_voice_db']} dB vs voice   {'OK' if ok_m else 'CHECK'}")
    print(f"sfx    {lv['sfx_vs_voice_db']} dB vs voice   peak {lv['sfx_peak_vs_voice_peak']}x voice peak   {'OK' if ok_s else 'CHECK'}")
    print(f"wrote {out}  ({lv['duration_s']} s, float32, mix peak {lv['mix_peak_dbfs']} dBFS)")


if __name__ == "__main__":
    main()
