"""Sort the raw SFX into sfx/library/<category>/<id>.<ext>, drop duplicates, convert WAV to FLAC,
and write sfx/catalog.json (one entry per sound, with the hit point used for syncing).
  python tools/sfx_build_library.py
"""
import json, os, shutil, subprocess
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'sfx')
RAW = os.path.join(ROOT, '_raw'); LIB = os.path.join(ROOT, 'library')
A = {d['file']: d for d in json.load(open(os.path.join(ROOT, 'analysis.json')))}

# id, raw file (relative to _raw), category, sync ('peak' = line the loudest moment up with the event,
# 'end' = the sound builds INTO the event, 'start' = starts on the event), Arabic note
S = [
 # ---- whooshes / transitions
 ('whoosh-cinematic',        'sound effect/lordsonny-whoosh-cinematic-161021.mp3', 'whoosh', 'peak', 'Whoosh سينمائي تقيل ونضيف — انتقال أساسي بين مشاهد'),
 ('whoosh-fast-rise',        'sound effect/mixkit-cinematic-whoosh-fast-transition-1492.wav', 'whoosh', 'end', 'Whoosh سريع بيعلى وبيقفل على القطع — مثالي قبل الـ cut بثانية'),
 ('whoosh-tunnel-reverb',    'sound effect/mixkit-cinematic-tunnel-reverb-woosh-1486.wav', 'whoosh', 'peak', 'Whoosh واطي فيه ريفيرب نفق — انتقال تقيل/دخول مشهد غامض'),
 ('whoosh-air-soft',         'Sound effect 1/mixkit-air-woosh-1489.wav', 'whoosh', 'peak', 'هوا ناعم — حركة نص أو عنصر بيعدّي'),
 ('whoosh-air-zoom',         'Sound effect 1/mixkit-air-zoom-vacuum-2608.wav', 'whoosh', 'peak', 'Zoom/Vacuum قصير — Zoom-in أو عنصر بيتشفط'),
 ('whoosh-arrow',            'Sound effect 1/mixkit-arrow-whoosh-1491.wav', 'whoosh', 'peak', 'سهم قصير جداً وخفيف — نص أو أيقونة بتطير'),
 ('whoosh-rocket',           'Sound effect 2/mixkit-fast-rocket-whoosh-1714.wav', 'whoosh', 'peak', 'صاروخ سريع — عنصر بيطير بسرعة (طيارة/شنطة)'),
 ('whoosh-small-sweep',      'Sound effect 2/mixkit-fast-small-sweep-transition-166.wav', 'whoosh', 'peak', 'Sweep صغير جداً — Swipe / تقليب بطاقات / UI'),
 ('whoosh-fast-transition',  'Sound effect 2/mixkit-fast-whoosh-transition-1490.wav', 'whoosh', 'end', 'Whoosh حاد بيعلى للقطع — Wipe سريع'),
 ('whoosh-vacuum',           'Sound effect 2/mixkit-vacuum-swoosh-transition-1465.wav', 'whoosh', 'peak', 'Swoosh شفط بيعلى — دخول عنصر للكادر'),
 ('whoosh-riser-short',      'Sound effect 2/dragon-studio-riser-swoosh-transition-390289.mp3', 'whoosh', 'peak', 'Swoosh قصير جداً (1 ثانية) — انتقال سريع على البيت'),
 ('whoosh-riser-reverb',     'Sound effect 2/dragon-studio-swoosh-riser-reverb-390309.mp3', 'whoosh', 'peak', 'Swoosh بريفيرب طويل — انتقال حالم/ناعم'),
 ('whoosh-descent-long',     'Sound effect 2/viralaudio-descent-whoosh-long-cinematic-sound-effect-405921.mp3', 'whoosh', 'peak', 'Whoosh نازل طويل — نزول/هبوط/Drop من فوق'),
 ('whoosh-pitch-distort',    'Sound effect 1/olivermp3-whoosh-pitch-shifter-distortion-624901.mp3', 'whoosh', 'peak', 'Whoosh مشوّه بيتغير البيتش — Glitch / انتقال عصري'),
 ('transition-soft',         'Sound effect 1/aviana_phoenix-soft-transition-338894.mp3', 'whoosh', 'peak', 'انتقال ناعم جداً — بين مشاهد هادية'),
 ('transition-flashback',    'Sound effect 2/dragon-studio-cinematic-flashback-transition-463199.mp3', 'whoosh', 'peak', 'Flashback — رجوع بالزمن / ذكريات'),
 ('transition-epic-short',   'Sound effect 2/dragon-studio-epic-transition-478367 (1).mp3', 'whoosh', 'peak', 'انتقال ملحمي قصير — Wipe قوي'),
 ('transition-heartbeat',    'sound effect/mixkit-cinematic-transition-swoosh-heartbeat-trailer-488.wav', 'whoosh', 'peak', 'Swoosh + نبض قلب (8 ث) — تريلر/توتر قبل كشف'),
 ('transition-intro',        'Sound effect 1/mixkit-intro-transition-1146.wav', 'whoosh', 'peak', 'Intro transition — افتتاحية فيديو'),
 # ---- risers (build INTO the moment)
 ('riser-sharp',             'Sound effect 2/creatorshome-sharp-riser-327342.mp3', 'riser', 'end', 'Riser حاد قصير (1.9 ث) — قبل Drop أو ظهور لوجو'),
 ('riser-cinematic-03',      'Sound effect 2/dragon-studio-cinematic-riser-03-414575.mp3', 'riser', 'end', 'Riser سينمائي 4 ث بيقطع فجأة على 3.7 — حط القطع عليه'),
 ('riser-dramatic',          'Sound effect 2/dragon-studio-dramatic-riser-631472.mp3', 'riser', 'peak', 'Riser درامي طويل (7 ث للقمة) — Build-up كبير'),
 ('riser-dreamy',            'Sound effect 1/black_kumizhi-dreamy-cinematic-riser-523158.mp3', 'riser', 'peak', 'Riser حالم (7.5 ث للقمة) — افتتاحية هادية بتكبر'),
 ('riser-tense-trailer',     'Sound effect 2/kontraa-tense-cinematic-trailer-sfx-181158.mp3', 'riser', 'end', 'Riser متوتر بيقفل على 3.8 ث — قبل كشف/سؤال'),
 ('riser-hole',              'Sound effect 2/soundreality-riser-hole-391174.mp3', 'riser', 'end', 'Riser عالي جداً (‑6.6 LUFS) بيقطع على 4.2 ث — وطّيه'),
 ('riser-somewhere',         'Sound effect 2/soundreality-riser-somewhere-391176.mp3', 'riser', 'peak', 'Riser طويل قمته 7.5 ث — Build-up قبل Drop'),
 ('riser-wildfire',          'Sound effect 2/soundreality-riser-wildfire-285209.mp3', 'riser', 'peak', 'Riser "نار" قمته 7 ث — حماسي'),
 ('riser-7',                 'Sound effect 2/u_1pruylktlg-riser-7-130957.mp3', 'riser', 'peak', 'Riser خفيف وهادي (‑24 LUFS) — تحت الموسيقى'),
 # ---- impacts / hits / booms
 ('impact-cinematic',        'Sound effect 1/lucadialessandro-cinematic-impact-464937.mp3', 'impact', 'peak', 'Impact فيه تمهيد (القمة 2.7 ث) — ظهور منتج/لوجو'),
 ('impact-cool-trailer',     'Sound effect 2/mixkit-cool-impact-movie-trailer-2909.wav', 'impact', 'peak', 'Impact تريلر نضيف وفوري — خبطة على الـ beat'),
 ('impact-epic-trailer',     'Sound effect 2/mixkit-movie-trailer-epic-impact-2908.wav', 'impact', 'peak', 'Impact ملحمي (القمة 0.95 ث) — مشهد كبير'),
 ('impact-hit-deep',         'Sound effect 2/lordsonny-cinematic-hit-159487.mp3', 'impact', 'peak', 'Hit واطي تقيل جداً وطويل الذيل — Drop/لوجو'),
 ('impact-boom',             'Sound effect 2/lordsonny-cinematic-boom-171285.mp3', 'impact', 'peak', 'Boom واطي — تحت أي ظهور كبير'),
 ('impact-rock',             'sound effect/lordsonny-rock-cinematic-161648.mp3', 'impact', 'peak', 'Rock/حجر سينمائي عالي (‑8.9) — تكسير/خبطة تقيلة'),
 ('impact-epic-long',        'Sound effect 2/hitslab-epic-cinematic-626424.mp3', 'impact', 'onset', 'Hit ملحمي وبعده موسيقى 16 ث عالية — قصّه بعد ثانيتين أو استخدمه Bed'),
 ('impact-laser-thunder',    'sound effect/mixkit-cinematic-laser-gun-thunder-1287.wav', 'impact', 'peak', 'ليزر + رعد — Flash / برق / لحظة طاقة'),
 ('impact-epic-transition',  'Sound effect 2/u_adx0915qo1-epic-transition-418147.mp3', 'impact', 'peak', 'Hit ملحمي فوري بذيل 4 ث — بداية مشهد'),
 ('impact-orchestra',        'Sound effect 2/mixkit-epic-orchestra-transition-2290.wav', 'impact', 'peak', 'ضربة أوركسترا — افتتاحية/كشف'),
 ('impact-piano',            'Sound effect 2/universfield-cinematic-piano-hit-567216.mp3', 'impact', 'peak', 'ضربة بيانو واطية — لحظة درامية هادية'),
 ('impact-bangs-echo',       'Sound effect 1/bangs-echo-3x(chosic.com).mp3', 'impact', 'onset', '3 خبطات بصدى على 0.06 / 3.54 / 7.0 ث (كل 3.5 ث) — 3 عناصر ورا بعض'),
 ('punch-hard',              'Sound effect 2/dragon-studio-hard-punch-sfx-515251.mp3', 'impact', 'peak', 'Punch تقيل — نص بيخبط / Stamp'),
 ('punch-fast',              'Sound effect 2/mixkit-martial-arts-fast-punch-2047.wav', 'impact', 'peak', 'Punch سريع خفيف — Pop نص / رقم'),
 # ---- logo stingers & beds
 ('logo-movie',              'Sound effect 2/breakzstudios-cinematic-movie-logo-185801.mp3', 'logo', 'peak', 'Logo reveal سينمائي (القمة 4.3 ث) — Outro لوجو'),
 ('logo-epic-advertising',   'Sound effect 1/bombinsound-cinematic-epic-advertising-logo-version-epic-motivational-631117.mp3', 'bed', 'start', 'موسيقى إعلان ملحمي تحفيزي 29 ث — Bed كامل لإعلان'),
 ('bed-epic-21s',            'Sound effect 1/bombinsound-epic-cinematic-epic-21-second-490538.mp3', 'bed', 'start', 'موسيقى ملحمية 21 ث — Bed لريل قصير'),
 ('bed-tension-80s',         'Sound effect 1/soundreality-cinematic-tension-2-504666.mp3', 'bed', 'start', 'توتر سينمائي 80 ث — Bed تحت مسابقة/تريلر'),
 ('bed-bass-pulse',          'sound effect/mixkit-mystwrious-bass-pulse-2298.wav', 'bed', 'start', 'نبض Bass غامض 16 ث — Bed تحت سؤال/عدّ'),
 ('bed-gameshow-suspense',   'Sound effect 1/mixkit-game-show-suspense-waiting-667.wav', 'bed', 'start', 'انتظار برنامج مسابقات 42 ث — وقت التفكير في المسابقة'),
 ('bed-tech-hum',            'Sound effect 2/mixkit-technological-futuristic-hum-2133.wav', 'bed', 'start', 'Hum تكنولوجي 6 ث — شاشة/واجهة/HUD'),
 ('sonar-2',                 'Sound effect 1/Sonar-2-(chosic.com).mp3', 'bed', 'start', 'Sonar 21 ث (بيكبر) — رادار/بحث/خريطة'),
 ('sonar-3',                 'Sound effect 1/Sonar-3(chosic.com).mp3', 'bed', 'start', 'Sonar 21 ث (بيبدأ قوي) — رادار/خريطة الدول'),
 # ---- UI / game / alerts
 ('ui-notification-retro',   'sound effect/mixkit-retro-game-notification-212.wav', 'ui', 'peak', 'Notification ريترو قصيرة — ظهور إشعار/رسالة'),
 ('ui-flute-notification',   'Sound effect 2/mixkit-melodical-flute-music-notification-2310.wav', 'ui', 'peak', 'إشعار فلوت لحني — نجاح/مفاجأة لطيفة'),
 ('ui-keyboard-typing',      'Sound effect 1/mixkit-keyboard-typing-1386.wav', 'ui', 'start', 'كتابة كيبورد 26 ث — قص منه على الكتابة'),
 ('ui-countdown-bleeps',     'Sound effect 2/mixkit-clock-countdown-bleeps-916.wav', 'ui', 'start', 'بيبات عدّ تنازلي 5 ث — 5..4..3..2..1'),
 ('ui-toy-whistle',          'sound effect/mixkit-cartoon-toy-whistle-616.wav', 'ui', 'peak', 'صفارة لعبة كرتونية — كوميدي'),
 ('game-over-retro',         'Sound effect 1/mixkit-arcade-retro-game-over-213.wav', 'ui', 'peak', 'Game over أركيد — إجابة غلط'),
 ('game-over-trombone',      'sound effect/mixkit-sad-game-over-trombone-471.wav', 'ui', 'start', 'ترومبون حزين — فشل كوميدي'),
 ('alarm-classic',           'sound effect/mixkit-classic-alarm-995.wav', 'ui', 'start', 'منبه كلاسيك — صحيان/وقت'),
 ('alarm-retro-emergency',   'sound effect/mixkit-retro-game-emergency-alarm-1000.wav', 'ui', 'start', 'إنذار طوارئ ريترو 25 ث — قص منه — عرض لفترة محدودة'),
 ('phone-ring-vintage',      'Sound effect 2/mixkit-vintage-telephone-ringtone-1356.wav', 'ui', 'start', 'رنة تليفون قديم — عالية جداً (‑5 LUFS) وطّيها'),
 # ---- people / crowd / reactions
 ('crowd-cheer-applause',    'sound effect/mixkit-small-group-cheer-and-applause-518.wav', 'crowd', 'start', 'هتاف وتصفيق مجموعة — فوز/إعلان الفائز'),
 ('crowd-stadium-applause',  'Sound effect 2/mixkit-stadium-crowd-light-applause-362.wav', 'crowd', 'start', 'تصفيق استاد خفيف — أجواء ماتش'),
 ('crowd-laugh-applause',    'sound effect/mixkit-small-crowd-laugh-and-applause-422.wav', 'crowd', 'start', 'ضحك وتصفيق — موقف كوميدي'),
 ('crowd-laugh',             'Sound effect 2/mixkit-crowd-laugh-424.wav', 'crowd', 'start', 'ضحك جمهور — كوميدي'),
 ('voice-gasp-female',       'Sound effect 2/mixkit-female-astonished-gasp-964.wav', 'crowd', 'peak', 'شهقة اندهاش — مفاجأة/سعر'),
 ('voice-sneeze',            'sound effect/mixkit-sick-man-sneeze-2213.wav', 'crowd', 'peak', 'عطسة — كوميدي'),
 ('beast-roar',              'Sound effect 1/mixkit-aggressive-beast-roar-13.wav', 'crowd', 'peak', 'زئير وحش — قوة/هجوم'),
 ('dog-bark',                'Sound effect 2/mixkit-dog-barking-twice-1.wav', 'crowd', 'peak', 'نباح مرتين — كوميدي'),
 # ---- ambience / nature / foley
 ('amb-rain-thunder',        'sound effect/mixkit-rain-and-thunder-storm-2390.wav', 'ambience', 'start', 'مطر ورعد 29 ث — جو درامي'),
 ('amb-rain-light-loop',     'Sound effect 1/mixkit-light-rain-loop-2393.wav', 'ambience', 'start', 'مطر خفيف Loop 15 ث'),
 ('amb-crickets',            'Sound effect 2/mixkit-crickets-and-insects-in-the-wild-ambience-39.wav', 'ambience', 'start', 'صراصير الليل — سكوت محرج/ليل'),
 ('amb-birds',               'Sound effect 2/mixkit-little-birds-singing-in-the-trees-17.wav', 'ambience', 'start', 'عصافير — صباح/طبيعة'),
 ('amb-geese',               'Sound effect 1/mixkit-flock-of-wild-geese-20.wav', 'ambience', 'start', 'سرب وز — طبيعة/كوميدي'),
 ('foley-footsteps-grass',   'Sound effect 1/mixkit-footsteps-on-tall-grass-532.wav', 'ambience', 'start', 'خطوات على عشب 23 ث — هادي جداً (‑37) علّيه'),
 ('foley-water-drop',        'Sound effect 1/mrstokes302-water-droplet-sfx-mrstokes302-530199.mp3', 'ambience', 'peak', 'نقطة مية — Pop ناعم / ظهور عنصر صغير'),
 ('foley-water-drop-big',    'Sound effect 1/mrstokes302-big-water-droplet-sfx-mrstokes302-589948.mp3', 'ambience', 'peak', 'نقطة مية كبيرة — Pop أتقل'),
]
CAT_AR = {'whoosh': 'Whoosh وانتقالات', 'riser': 'Risers (تمهيد)', 'impact': 'Impacts وخبطات', 'logo': 'Logo stingers',
          'bed': 'Beds / موسيقى خلفية', 'ui': 'UI ومسابقات وتنبيهات', 'crowd': 'جمهور وأصوات بشر', 'ambience': 'أجواء وطبيعة'}

import numpy as np
def onset(p):
    x = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-ac', '1', '-ar', '48000', '-f', 's16le', '-'], capture_output=True).stdout, '<i2') / 32768.0
    h = 240; e = np.array([np.abs(x[i:i + h]).max() for i in range(0, len(x) - h, h)]) + 1e-9
    return round(float(np.argmax(e > e.max() * .5) * h / 48000), 3)   # first 5 ms block at half the peak amplitude

if os.path.isdir(LIB): shutil.rmtree(LIB)
cat = []
for sid, raw, c, sync, note in S:
    a = A[raw]; src = os.path.join(RAW, raw)
    ext = 'flac' if raw.endswith('.wav') else 'mp3'
    dst = os.path.join(LIB, c, f'{sid}.{ext}'); os.makedirs(os.path.dirname(dst), exist_ok=True)
    if ext == 'flac': subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-c:a', 'flac', dst], check=True)
    else: shutil.copy(src, dst)
    if c in ('impact',) and sync == 'peak' and a['attack'] < .2: sync = 'onset'
    hit = {'peak': a['peak_t'], 'end': a['end'], 'start': a['start'], 'onset': onset(src)}[sync]
    cat.append(dict(id=sid, category=c, file=os.path.relpath(dst, ROOT), source=raw, dur=a['dur'], sync=sync, hit=hit,
                    sound_start=a['start'], peak=a['peak_t'], tail_end=a['end'], lufs=a['lufs'], shape=a['shape'], note=note))
used = {s[1] for s in S}
skipped = [f for f in A if f not in used]
json.dump(dict(categories=CAT_AR, sounds=cat, skipped_duplicates=skipped), open(os.path.join(ROOT, 'catalog.json'), 'w'), ensure_ascii=False, indent=1)
print(len(cat), 'sounds;', 'skipped:', skipped)
