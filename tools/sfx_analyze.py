"""Analyse every audio file under a folder: duration, peak/LUFS, where the energy is
(attack, peak time, tail), spectral centroid and a rough shape class.
  python tools/sfx_analyze.py sfx/_raw > sfx/analysis.json
"""
import json, os, subprocess, sys
import numpy as np
SR = 22050
def load(p):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True).stdout
    return np.frombuffer(raw, '<i2') / 32768.0
def lufs(p):
    o = subprocess.run(['ffmpeg', '-hide_banner', '-i', p, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    for l in o.splitlines()[::-1]:
        if l.strip().startswith('I:'): return float(l.split()[1])
out = []
for root, _, fs in os.walk(sys.argv[1]):
    for f in sorted(fs):
        p = os.path.join(root, f); x = load(p)
        if not len(x): continue
        hop = SR // 100
        env = np.array([np.sqrt(np.mean(x[i:i + hop] ** 2)) for i in range(0, len(x) - hop, hop)]) + 1e-9
        db = 20 * np.log10(env); pk = db.max(); t_pk = db.argmax() / 100
        on = np.where(db > pk - 30)[0]; t_on = on[0] / 100; t_off = on[-1] / 100
        a10 = np.where(db > pk - 10)[0]; attack = (a10[0] - on[0]) / 100
        # spectrum centroid over the loud part
        seg = x[int(t_on * SR):int(t_off * SR) + 1] if t_off > t_on else x
        sp = np.abs(np.fft.rfft(seg[:SR * 4] * np.hanning(min(len(seg), SR * 4))))
        fr = np.fft.rfftfreq(min(len(seg), SR * 4), 1 / SR); cen = float((sp * fr).sum() / sp.sum())
        # shape: rising (peak late), hit (fast attack, early peak), sustained, loop
        dur = len(x) / SR; rel = (t_pk - t_on) / max(t_off - t_on, .01)
        flat = (db[int(t_on*100):int(t_off*100)+1] > pk - 12).mean() if t_off > t_on else 0
        shape = 'rise' if rel > .6 and attack > .3 else 'hit' if attack < .06 and rel < .25 else 'sustain' if flat > .6 else 'swell'
        out.append(dict(file=os.path.relpath(p, sys.argv[1]), dur=round(dur, 2), start=round(t_on, 2), peak_t=round(t_pk, 2),
                        end=round(t_off, 2), attack=round(attack, 2), centroid=int(cen), lufs=lufs(p), shape=shape, flat=round(float(flat), 2)))
json.dump(out, sys.stdout, ensure_ascii=False, indent=1)
