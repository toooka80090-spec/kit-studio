"""جدول إشارات "The Soldier Who Never Left" ← music.wav + sfx.wav (مسارات منفصلة فقط).

التشغيل:  python3 audio.py      ثم:  python3 mix.py voice.mp3 music.wav sfx.wav
لقصة جديدة احتفظ بالبنية وأعد كتابة قائمة الإشارات فقط. الأوقات بالإطارات (T.F) أو بالثواني.
لا تمزج ولا تخفّض ولا تضغط هنا: mix.py يضبط المستويات النهائية (الموسيقى والمؤثرات عند 50% من الصوت).
"""
from synth import *

T = Track.for_voice()          # 19.72 ث لهذا الفيديو
music, sfx = T.new(), T.new()
F = T.F

# ---------------- الموسيقى ----------------
TWIST = 14.15                  # تتوقف الموسيقى عند "The bridge is not safe."
march(T, music, end=TWIST, bpm=104, prog=PROG_MINOR)
drone(T, music, TWIST)

# ---------------- جدول إشارات المؤثرات ----------------
T.place(sfx, whoosh(0.6), F(18), 0.5)            # الكاميرا تبتعد في الخطّاف
T.place(sfx, leaves(2.2), F(62), 0.35)           # السنوات تمضي
T.place(sfx, thunk(85, 0.35), F(120), 1.0)       # دقّة الرمح عند "post"
T.place(sfx, rumble(2.2), F(176), 0.9)           # الإمبراطورية تنهار
T.place(sfx, crash(1.4), F(186), 0.7)
T.place(sfx, whoosh(0.5), F(196), 0.35)          # تبديل التركيز إلى الجندي
T.place(sfx, cuckoo(), F(255), 0.35)             # "crazy"
T.place(sfx, whoosh(0.4), F(276), 0.6)           # ومضة القفزة الزمنية
for k in range(2):
    T.place(sfx, snore(1.15), F(286) + k * 1.45, 0.45)
T.place(sfx, scrape(0.9), F(316), 0.6)           # رفع الخوذة
T.place(sfx, ting(), F(392), 0.55)               # النقش يلمع
T.place(sfx, sting(), 14.18, 0.85)               # "The bridge is not safe."
T.place(sfx, creak(0.55, 120), F(464), 0.9); T.place(sfx, creak(0.5, 160), F(473), 0.7)
T.place(sfx, whoosh(0.7), F(484), 0.5)           # الكاميرا تنزل تحت الجسر
T.place(sfx, water(T.dur - F(484)), F(484), 0.35)
T.place(sfx, creak(0.8, 90), F(536), 1.0)
T.place(sfx, snap(), F(548), 0.9)                # الدعامة تنكسر عند "rotting"
T.place(sfx, splash(1.0), F(580), 0.9)

T.save(music, "music.wav")
T.save(sfx, "sfx.wav", crest_db=14)   # ترويض الذُّرى حتى تجلس المؤثرات قرب 50% تحت سقف الذروة
