# مكتبة الساوند إفكت — VAMOS

77 صوت (من 79 ملف — اتشال تكرارين). الملفات في `sfx/library/<category>/`، (الـ WAV اتحولت FLAC من غير أي فقد في الجودة، والـ MP3 زي ما هي).

## إزاي بنستخدمها
- كل صوت ليه **Hit** = اللحظة اللي لازم تقع على الحدث (القطع / ظهور اللوجو / الـ Drop).
- **sync**: `onset` بداية الخبطة · `peak` أعلى نقطة · `end` بيعلى *لحد* الحدث (Risers) · `start` بيبدأ مع الحدث (Beds/أجواء).
- في الكود: `Mixer(duration).add('id', at=ثانية_الحدث)` في `tools/sfx.py` — بيحط الـ Hit على الثانية دي بالظبط، وكل الأصوات متظبطة على ‎-16 LUFS قبل الدمج.
- `python tools/sfx.py list [category]` يعرض الكتالوج.

## قواعد المكس لـ VAMOS
- **انتقال V / Cut:** `whoosh-fast-rise` أو `whoosh-fast-transition` (بيقفلوا على القطع) — ‎-6 dB تحت الموسيقى.
- **ظهور لوجو / Drop:** `riser-sharp` (end على اللحظة) + `impact-cool-trailer` أو `impact-hit-deep` (onset على اللحظة).
- **نص بيخبط / Stamp:** `punch-hard` · **Pop صغير:** `foley-water-drop` أو `punch-fast`.
- **Outro لوجو:** `logo-movie` أو `impact-orchestra`.
- **مسابقات:** `bed-gameshow-suspense` وقت التفكير · `ui-countdown-bleeps` للعدّ · `crowd-cheer-applause` للفائز · `game-over-retro` للإجابة الغلط.
- **عالي جداً — وطّيه:** `phone-ring-vintage` (‑5) · `riser-hole` (‑6.6) · `impact-rock` و`impact-laser-thunder` و`whoosh-cinematic` (حوالي ‑8).
- **ذيل طويل — استخدم trim:** `impact-hit-deep` · `impact-epic-long` · `impact-epic-transition` · `impact-orchestra`.

## Whoosh وانتقالات (`whoosh`)

| id | المدة | Hit | sync | LUFS | الاستخدام |
|---|---|---|---|---|---|
| `whoosh-cinematic` | 3.03 ث | 0.47 | peak | -8.2 | Whoosh سينمائي تقيل ونضيف — انتقال أساسي بين مشاهد |
| `whoosh-fast-rise` | 1.33 ث | 1.22 | end | -13.0 | Whoosh سريع بيعلى وبيقفل على القطع — مثالي قبل الـ cut بثانية |
| `whoosh-tunnel-reverb` | 6.75 ث | 0.62 | peak | -13.7 | Whoosh واطي فيه ريفيرب نفق — انتقال تقيل/دخول مشهد غامض |
| `whoosh-air-soft` | 2.32 ث | 0.71 | peak | -18.0 | هوا ناعم — حركة نص أو عنصر بيعدّي |
| `whoosh-air-zoom` | 1.27 ث | 0.45 | peak | -14.4 | Zoom/Vacuum قصير — Zoom-in أو عنصر بيتشفط |
| `whoosh-arrow` | 1.1 ث | 0.29 | peak | -22.3 | سهم قصير جداً وخفيف — نص أو أيقونة بتطير |
| `whoosh-rocket` | 4.75 ث | 1.09 | peak | -11.5 | صاروخ سريع — عنصر بيطير بسرعة (طيارة/شنطة) |
| `whoosh-small-sweep` | 0.78 ث | 0.33 | peak | -14.6 | Sweep صغير جداً — Swipe / تقليب بطاقات / UI |
| `whoosh-fast-transition` | 1.76 ث | 0.75 | end | -15.4 | Whoosh حاد بيعلى للقطع — Wipe سريع |
| `whoosh-vacuum` | 2.26 ث | 1.55 | peak | -15.4 | Swoosh شفط بيعلى — دخول عنصر للكادر |
| `whoosh-riser-short` | 0.99 ث | 0.43 | peak | -16.1 | Swoosh قصير جداً (1 ثانية) — انتقال سريع على البيت |
| `whoosh-riser-reverb` | 6.19 ث | 1.86 | peak | -19.4 | Swoosh بريفيرب طويل — انتقال حالم/ناعم |
| `whoosh-descent-long` | 5.54 ث | 2.55 | peak | -14.1 | Whoosh نازل طويل — نزول/هبوط/Drop من فوق |
| `whoosh-pitch-distort` | 5.54 ث | 1.6 | peak | -21.4 | Whoosh مشوّه بيتغير البيتش — Glitch / انتقال عصري |
| `transition-soft` | 7.0 ث | 0.54 | peak | -19.8 | انتقال ناعم جداً — بين مشاهد هادية |
| `transition-flashback` | 2.04 ث | 0.83 | peak | -17.8 | Flashback — رجوع بالزمن / ذكريات |
| `transition-epic-short` | 2.59 ث | 0.6 | peak | -12.7 | انتقال ملحمي قصير — Wipe قوي |
| `transition-heartbeat` | 8.11 ث | 3.46 | peak | -13.5 | Swoosh + نبض قلب (8 ث) — تريلر/توتر قبل كشف |
| `transition-intro` | 7.51 ث | 1.9 | peak | -11.4 | Intro transition — افتتاحية فيديو |

## Risers (تمهيد) (`riser`)

| id | المدة | Hit | sync | LUFS | الاستخدام |
|---|---|---|---|---|---|
| `riser-sharp` | 1.88 ث | 1.87 | end | -26.8 | Riser حاد قصير (1.9 ث) — قبل Drop أو ظهور لوجو |
| `riser-cinematic-03` | 4.03 ث | 3.71 | end | -10.5 | Riser سينمائي 4 ث بيقطع فجأة على 3.7 — حط القطع عليه |
| `riser-dramatic` | 12.04 ث | 7.1 | peak | -14.0 | Riser درامي طويل (7 ث للقمة) — Build-up كبير |
| `riser-dreamy` | 13.45 ث | 7.5 | peak | -13.8 | Riser حالم (7.5 ث للقمة) — افتتاحية هادية بتكبر |
| `riser-tense-trailer` | 3.79 ث | 3.79 | end | -14.0 | Riser متوتر بيقفل على 3.8 ث — قبل كشف/سؤال |
| `riser-hole` | 10.03 ث | 4.17 | end | -6.6 | Riser عالي جداً (‑6.6 LUFS) بيقطع على 4.2 ث — وطّيه |
| `riser-somewhere` | 14.04 ث | 7.47 | peak | -8.3 | Riser طويل قمته 7.5 ث — Build-up قبل Drop |
| `riser-wildfire` | 12.02 ث | 6.96 | peak | -13.7 | Riser "نار" قمته 7 ث — حماسي |
| `riser-7` | 5.07 ث | 1.89 | peak | -24.1 | Riser خفيف وهادي (‑24 LUFS) — تحت الموسيقى |

## Impacts وخبطات (`impact`)

| id | المدة | Hit | sync | LUFS | الاستخدام |
|---|---|---|---|---|---|
| `impact-cinematic` | 4.83 ث | 2.71 | peak | -9.5 | Impact فيه تمهيد (القمة 2.7 ث) — ظهور منتج/لوجو |
| `impact-cool-trailer` | 6.0 ث | 0.075 | onset | -12.4 | Impact تريلر نضيف وفوري — خبطة على الـ beat |
| `impact-epic-trailer` | 4.87 ث | 0.95 | peak | -13.9 | Impact ملحمي (القمة 0.95 ث) — مشهد كبير |
| `impact-hit-deep` | 10.92 ث | 0.2 | onset | -8.3 | Hit واطي تقيل جداً وطويل الذيل — Drop/لوجو |
| `impact-boom` | 5.54 ث | 0.505 | onset | -13.1 | Boom واطي — تحت أي ظهور كبير |
| `impact-rock` | 6.43 ث | 2.35 | peak | -8.9 | Rock/حجر سينمائي عالي (‑8.9) — تكسير/خبطة تقيلة |
| `impact-epic-long` | 18.23 ث | 0.275 | onset | -11.5 | Hit ملحمي وبعده موسيقى 16 ث عالية — قصّه بعد ثانيتين أو استخدمه Bed |
| `impact-laser-thunder` | 4.81 ث | 1.17 | peak | -8.4 | ليزر + رعد — Flash / برق / لحظة طاقة |
| `impact-epic-transition` | 7.16 ث | 0.075 | onset | -13.5 | Hit ملحمي فوري بذيل 4 ث — بداية مشهد |
| `impact-orchestra` | 7.12 ث | 0.05 | onset | -13.6 | ضربة أوركسترا — افتتاحية/كشف |
| `impact-piano` | 4.1 ث | 0.47 | peak | -14.2 | ضربة بيانو واطية — لحظة درامية هادية |
| `impact-bangs-echo` | 8.36 ث | 0.06 | onset | -16.3 | 3 خبطات بصدى على 0.06 / 3.54 / 7.0 ث (كل 3.5 ث) — 3 عناصر ورا بعض |
| `punch-hard` | 1.32 ث | 0.02 | onset | -10.3 | Punch تقيل — نص بيخبط / Stamp |
| `punch-fast` | 1.34 ث | 0.215 | onset | -16.2 | Punch سريع خفيف — Pop نص / رقم |

## Logo stingers (`logo`)

| id | المدة | Hit | sync | LUFS | الاستخدام |
|---|---|---|---|---|---|
| `logo-movie` | 11.73 ث | 4.3 | peak | -12.7 | Logo reveal سينمائي (القمة 4.3 ث) — Outro لوجو |

## Beds / موسيقى خلفية (`bed`)

| id | المدة | Hit | sync | LUFS | الاستخدام |
|---|---|---|---|---|---|
| `logo-epic-advertising` | 29.18 ث | 0.16 | start | -10.0 | موسيقى إعلان ملحمي تحفيزي 29 ث — Bed كامل لإعلان |
| `bed-epic-21s` | 21.37 ث | 0.02 | start | -12.7 | موسيقى ملحمية 21 ث — Bed لريل قصير |
| `bed-tension-80s` | 80.04 ث | 0.02 | start | -13.7 | توتر سينمائي 80 ث — Bed تحت مسابقة/تريلر |
| `bed-bass-pulse` | 16.56 ث | 0.0 | start | -12.6 | نبض Bass غامض 16 ث — Bed تحت سؤال/عدّ |
| `bed-gameshow-suspense` | 41.81 ث | 0.35 | start | -12.3 | انتظار برنامج مسابقات 42 ث — وقت التفكير في المسابقة |
| `bed-tech-hum` | 6.0 ث | 0.2 | start | -19.3 | Hum تكنولوجي 6 ث — شاشة/واجهة/HUD |
| `sonar-2` | 21.0 ث | 0.0 | start | -15.1 | Sonar 21 ث (بيكبر) — رادار/بحث/خريطة |
| `sonar-3` | 21.0 ث | 0.0 | start | -14.0 | Sonar 21 ث (بيبدأ قوي) — رادار/خريطة الدول |

## UI ومسابقات وتنبيهات (`ui`)

| id | المدة | Hit | sync | LUFS | الاستخدام |
|---|---|---|---|---|---|
| `ui-notification-retro` | 1.47 ث | 0.23 | peak | -15.9 | Notification ريترو قصيرة — ظهور إشعار/رسالة |
| `ui-flute-notification` | 7.54 ث | 1.39 | peak | -16.0 | إشعار فلوت لحني — نجاح/مفاجأة لطيفة |
| `ui-keyboard-typing` | 26.31 ث | 0.1 | start | -31.3 | كتابة كيبورد 26 ث — قص منه على الكتابة |
| `ui-countdown-bleeps` | 5.0 ث | 0.0 | start | -8.0 | بيبات عدّ تنازلي 5 ث — 5..4..3..2..1 |
| `ui-toy-whistle` | 1.21 ث | 0.26 | peak | -12.9 | صفارة لعبة كرتونية — كوميدي |
| `game-over-retro` | 1.67 ث | 0.14 | peak | -19.2 | Game over أركيد — إجابة غلط |
| `game-over-trombone` | 5.61 ث | 0.0 | start | -10.0 | ترومبون حزين — فشل كوميدي |
| `alarm-classic` | 5.03 ث | 0.01 | start | -17.4 | منبه كلاسيك — صحيان/وقت |
| `alarm-retro-emergency` | 25.43 ث | 0.0 | start | -10.6 | إنذار طوارئ ريترو 25 ث — قص منه — عرض لفترة محدودة |
| `phone-ring-vintage` | 7.39 ث | 0.05 | start | -5.0 | رنة تليفون قديم — عالية جداً (‑5 LUFS) وطّيها |

## جمهور وأصوات بشر (`crowd`)

| id | المدة | Hit | sync | LUFS | الاستخدام |
|---|---|---|---|---|---|
| `crowd-cheer-applause` | 10.6 ث | 0.11 | start | -11.3 | هتاف وتصفيق مجموعة — فوز/إعلان الفائز |
| `crowd-stadium-applause` | 11.09 ث | 0.55 | start | -18.6 | تصفيق استاد خفيف — أجواء ماتش |
| `crowd-laugh-applause` | 5.76 ث | 0.14 | start | -23.0 | ضحك وتصفيق — موقف كوميدي |
| `crowd-laugh` | 4.12 ث | 0.1 | start | -22.8 | ضحك جمهور — كوميدي |
| `voice-gasp-female` | 1.09 ث | 0.39 | peak | -12.5 | شهقة اندهاش — مفاجأة/سعر |
| `voice-sneeze` | 0.86 ث | 0.52 | peak | -10.9 | عطسة — كوميدي |
| `beast-roar` | 1.46 ث | 0.3 | peak | -11.6 | زئير وحش — قوة/هجوم |
| `dog-bark` | 1.62 ث | 0.08 | peak | -14.2 | نباح مرتين — كوميدي |

## أجواء وطبيعة (`ambience`)

| id | المدة | Hit | sync | LUFS | الاستخدام |
|---|---|---|---|---|---|
| `amb-rain-thunder` | 29.0 ث | 0.9 | start | -20.3 | مطر ورعد 29 ث — جو درامي |
| `amb-rain-light-loop` | 15.0 ث | 0.0 | start | -25.6 | مطر خفيف Loop 15 ث |
| `amb-crickets` | 26.01 ث | 0.0 | start | -24.2 | صراصير الليل — سكوت محرج/ليل |
| `amb-birds` | 8.33 ث | 0.06 | start | -23.0 | عصافير — صباح/طبيعة |
| `amb-geese` | 5.22 ث | 0.09 | start | -15.1 | سرب وز — طبيعة/كوميدي |
| `foley-footsteps-grass` | 23.1 ث | 0.0 | start | -37.4 | خطوات على عشب 23 ث — هادي جداً (‑37) علّيه |
| `foley-water-drop` | 3.27 ث | 0.41 | peak | -14.7 | نقطة مية — Pop ناعم / ظهور عنصر صغير |
| `foley-water-drop-big` | 3.79 ث | 0.37 | peak | -13.4 | نقطة مية كبيرة — Pop أتقل |
