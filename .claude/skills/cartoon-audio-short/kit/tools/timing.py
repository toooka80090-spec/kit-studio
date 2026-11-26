#!/usr/bin/env python3
"""توقيتات الكلمات للتعليق الصوتي ← words.json + phrases.json.

الاستخدام:
  python3 tools/timing.py voice.mp3 [script.txt] [--out work/]

1. إذا أمكن استيراد faster-whisper أو openai-whisper، يُفرَّغ الصوت مع توقيتات الكلمات (الأفضل).
2. وإلا يحتاج نص السكربت: يكتشف مقاطع الكلام عبر الصمت (ffmpeg silencedetect)،
   ويقسّم النص إلى عبارات عند علامات الترقيم، ويطابق العبارات مع المقاطع ببرمجة ديناميكية
   تطابق طول العبارة (المقاطع اللفظية) مع مدة المقطع. الكلمات داخل العبارة تُوزَّع حسب المقاطع اللفظية.
راجع phrases.json دائماً مقابل الموجة الصوتية؛ أصلح يدوياً إن وقعت عبارة في الفجوة الخطأ.
"""
import json, re, subprocess, sys, os

def syll(w):
    w = re.sub(r"[^a-z]", "", w.lower())
    if not w: return 1
    if w.isdigit(): return 2
    v = re.findall(r"[aeiouy]+", w); n = len(v)
    if w.endswith("e") and n > 1 and not w.endswith("le"): n -= 1
    return max(1, n)

def duration(path):
    """الطول بعد فك الترميز بالثواني (مدة الحاوية في ffprobe تبالغ في طول MP3 بسبب حشو المُرمِّز)."""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", "16000", "-f", "s16le", "-"], capture_output=True).stdout
    if not raw: sys.exit(f"timing.py: cannot decode {path}")
    return len(raw) / 2 / 16000

def speech_segments(path, db=-35, mind=0.12):
    err = subprocess.run(["ffmpeg", "-i", path, "-af", f"silencedetect=n={db}dB:d={mind}", "-f", "null", "-"], capture_output=True, text=True).stderr
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", err)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", err)]
    D = duration(path); segs = []; cur = 0.0
    for s, e in zip(starts, ends + [D] * (len(starts) - len(ends))):
        if s - cur > 0.08: segs.append([cur, s])
        cur = e
    if D - cur > 0.08: segs.append([cur, D])
    # قص الصمت في بداية أول مقطع إذا بدأ الملف بصمت
    return segs, D

def whisper_words(path):
    try:
        from faster_whisper import WhisperModel
        m = WhisperModel("base.en", compute_type="int8")
        segs, _ = m.transcribe(path, word_timestamps=True)
        return [{"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3)} for s in segs for w in s.words]
    except Exception:
        pass
    try:
        import whisper
        r = whisper.load_model("base.en").transcribe(path, word_timestamps=True)
        return [{"w": w["word"].strip(), "s": round(w["start"], 3), "e": round(w["end"], 3)} for s in r["segments"] for w in s["words"]]
    except Exception:
        return None

def align(script, segs):
    # العبارات: تقسيم بعد , . ; : ! ? وعلامات الاقتباس الختامية
    raw = re.findall(r"[^,.;:!?]+[,.;:!?\"”']*", script.replace("\n", " "))
    phrases = [p.strip() for p in raw if p.strip()]
    P, S = len(phrases), len(segs)
    syl = [sum(syll(w) for w in p.split()) for p in phrases]
    tot_syl = sum(syl); tot_dur = sum(e - s for s, e in segs); rate = tot_syl / tot_dur
    import functools
    INF = 1e9
    # برمجة ديناميكية على (العبارة i، المقطع j): المقطع j يحمل العبارات [i..k)؛ وقد تمتد العبارة عبر عدة مقاطع (دمج)
    @functools.lru_cache(None)
    def best(i, j):
        if i == P and j == S: return (0.0, ())
        if i == P or j == S: return (INF, ())
        out = (INF, ())
        for k in range(i + 1, min(P, i + 4) + 1):          # 1–3 عبارات في مقطع واحد
            for l in range(j + 1, min(S, j + 3) + 1):      # أو مجموعة واحدة عبر 1–2 مقطع
                if k - i > 1 and l - j > 1: continue
                d = segs[l - 1][1] - segs[j][0]; s_ = sum(syl[i:k]) / rate
                cost = (d - s_) ** 2 / max(d, 0.3)
                # نهاية جملة داخل مقطع غير محتملة (المتحدث يتوقف هناك)؛ وكذلك فجوة طويلة داخل عبارة واحدة
                cost += sum(0.35 for m in range(i, k - 1) if re.search(r"[.!?][\"”']?$", phrases[m]))
                cost += sum(1.5 * (segs[m + 1][0] - segs[m][1]) for m in range(j, l - 1))
                sub = best(k, l)
                if sub[0] + cost < out[0]: out = (sub[0] + cost, ((i, k, j, l),) + sub[1])
        return out
    cost, plan = best(0, 0)
    words, phr = [], []
    for i, k, j, l in plan:
        a, b = segs[j][0], segs[l - 1][1]
        text = " ".join(phrases[i:k]); ws = text.split(); sy = [syll(w) for w in ws]; T = sum(sy); t = a
        phr.append({"text": text, "s": round(a, 3), "e": round(b, 3)})
        for w, s_ in zip(ws, sy):
            d = (b - a) * s_ / T; words.append({"w": w, "s": round(t, 3), "e": round(t + d, 3)}); t += d
    return words, phr, cost

if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    out = sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else "."
    os.makedirs(out, exist_ok=True)
    audio = args[0]; script = open(args[1]).read() if len(args) > 1 and os.path.exists(args[1]) else (args[1] if len(args) > 1 else None)
    words = whisper_words(audio)
    segs, D = speech_segments(audio)
    if words:
        phr = []; cur = []
        for w in words:
            cur.append(w)
            if re.search(r"[,.;:!?]$", w["w"]): phr.append({"text": " ".join(x["w"] for x in cur), "s": cur[0]["s"], "e": cur[-1]["e"]}); cur = []
        if cur: phr.append({"text": " ".join(x["w"] for x in cur), "s": cur[0]["s"], "e": cur[-1]["e"]})
        src = "whisper"
    elif script:
        words, phr, cost = align(script, segs); src = f"silence-align (cost {cost:.2f})"
    else:
        print("NO_ASR: no whisper available and no script given. Ask the user for the script text (or install faster-whisper)."); sys.exit(2)
    # ---- فحوص السلامة (أصلح phrases.json يدوياً، أو أعد التسجيل، إذا ظهرت)
    warn = []
    for p in phr:
        if p["e"] - p["s"] < 0.25: warn.append(f"very short phrase ({p['e']-p['s']:.2f}s): {p['text']!r} - merge it into the next shot")
    for a, b in zip(phr, phr[1:]):
        if b["s"] < a["e"] - 0.01: warn.append(f"overlap: {a['text']!r} / {b['text']!r}")
    if phr and D - phr[-1]["e"] > 0.6: warn.append(f"{D - phr[-1]['e']:.2f}s of tail after the last word (fine for a held final shot)")
    if phr and phr[0]["s"] > 0.4: warn.append(f"voice starts at {phr[0]['s']:.2f}s - frame 0 still has to be the hook image")
    if script and src == "whisper":
        nw = len(script.split()); 
        if abs(nw - len(words)) > max(3, 0.1 * nw): warn.append(f"whisper heard {len(words)} words, script has {nw} - was the recording changed? ask for the final text")
    json.dump(words, open(os.path.join(out, "words.json"), "w"), indent=1)
    json.dump({"duration": D, "frames30": int(round(D * 30)), "source": src, "segments": segs, "phrases": phr}, open(os.path.join(out, "phrases.json"), "w"), indent=1)
    print(f"source={src} duration={D:.2f}s frames={int(round(D*30))}")
    for p in phr: print(f"{p['s']:6.2f}-{p['e']:6.2f}  f{int(p['s']*30):4d}-{int(p['e']*30):4d}  {p['text']}")
    for w_ in warn: print("WARN", w_)
    if not warn: print("checks OK")
