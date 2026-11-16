"""Place sounds from the VAMOS SFX library on a timeline, lined up on their hit point.

    from tools.sfx import Mixer
    m = Mixer(duration=28)
    m.add('whoosh-fast-rise', at=6.0)          # the whoosh lands ON the cut at 6.0
    m.add('impact-cool-trailer', at=9.0, gain_db=-3)
    m.add('riser-sharp', at=9.0)               # builds INTO 9.0
    m.save('out/sfx.wav')                      # 48 kHz stereo

CLI:  python tools/sfx.py list [category]
      python tools/sfx.py info <id>
`at` is when the sound's hit should happen (see 'sync' in sfx/catalog.json: peak / onset /
end = builds into it / start = begins on it). Every sound is levelled to -16 LUFS first,
so gain_db is relative to the other sounds, not to the raw file.
"""
import json, os, subprocess, sys
import numpy as np

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'sfx')
CAT = json.load(open(os.path.join(ROOT, 'catalog.json'), encoding='utf-8'))
BY_ID = {s['id']: s for s in CAT['sounds']}
SR = 48000

def load(sid, lufs=-16.0):
    s = BY_ID[sid]; p = os.path.join(ROOT, s['file'])
    gain = lufs - s['lufs'] if s['lufs'] is not None else 0
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-af', f'volume={gain}dB', '-ac', '2', '-ar', str(SR), '-f', 's16le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, '<i2').reshape(-1, 2) / 32768.0

class Mixer:
    def __init__(self, duration):
        self.buf = np.zeros((int(SR * duration), 2))
    def add(self, sid, at, gain_db=0.0, trim=None, fade_out=0.05, pan=0.0):
        """trim: keep only this many seconds after the hit (handy for long tails)."""
        x = load(sid) * 10 ** (gain_db / 20)
        hit = BY_ID[sid]['hit']
        if trim is not None:
            x = x[:int((hit + trim) * SR)]
            n = int(fade_out * SR); x[-n:] *= np.linspace(1, 0, n)[:, None]
        if pan: x = x * np.array([np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)]) * np.sqrt(2)
        i = int(round((at - hit) * SR))
        if i < 0: x, i = x[-i:], 0
        x = x[:len(self.buf) - i]; self.buf[i:i + len(x)] += x
        return self
    def save(self, path, peak=0.89):
        m = np.max(np.abs(self.buf)); y = self.buf * (peak / m) if m > peak else self.buf
        import wave
        with wave.open(path, 'wb') as w:
            w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((y * 32767).astype('<i2').tobytes())
        return path

if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'list'
    if cmd == 'list':
        for s in CAT['sounds']:
            if len(sys.argv) < 3 or s['category'] == sys.argv[2]:
                print(f"{s['category']:8} {s['id']:24} {s['dur']:6.2f}s  hit {s['hit']:5.2f} ({s['sync']:5})  {s['note']}")
    elif cmd == 'info':
        print(json.dumps(BY_ID[sys.argv[2]], ensure_ascii=False, indent=1))
