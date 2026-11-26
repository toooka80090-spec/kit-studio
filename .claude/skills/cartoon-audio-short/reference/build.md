# مرجع البناء (المرحلة 4 فقط)
كل ما تحتاجه لكتابة `world.js` و`story.js` و`audio.py` دون فتح ملفات المحرّك.

## الملفات لكل فيديو
| الملف | ما فيه | ابدأ من |
|---|---|---|
| `web/world.js` | الديكور ثلاثي الأبعاد + حالته لكل إطار | نسخة الجندي (جسر، نهر، معبد، قرية، تلال، سحب، خوذة) |
| `web/story.js` | اللقطات، الإضاءة، الكاميرا، العدسة، worldAt، الشخصيات، المؤثرات | نسخة الجندي |
| `audio.py` | جدول إشارات الموسيقى والمؤثرات | نسخة الجندي |
`main.js` محرّك ثابت لا يُفتح ولا يُعدَّل: مواد، حبر، سماء، أضواء، بطاقات، مراحل الرندر.

## world.js
- يصدّر `build(ctx)` يُستدعى مرة واحدة ويعيد `{ update(W, f), light(L), faceCamera }`.
  - `update(W, f)`: يُستدعى كل إطار مع `W = worldAt(f)` من story.js؛ حرّك فيه أجزاء الديكور.
  - `light(L)`: يستقبل إعداد الإضاءة (مثلاً ألوان الماء). `faceCamera`: مجسّمات تُدار نحو الكاميرا (السحب).
- `ctx`: `THREE, T, P, scene, M, add, box, tbox, uvScale, toon, texM, rx, waterNd`، و`DECK` يُستورد من story.js.
  - `add(geo, mat, x, y, z, parent = scene, {cast})` يعيد mesh بظلال. `tbox(w, h, d, tileMetres)` صندوق بـ UV بمقياس العالم.
  - `toon({color})` و`texM(P.painter(seed), rx, ry)` لمواد جديدة. `rx(deg)` إلى راديان. `waterNd` مادة العمودي/العمق للماء.
  - المواد `M`: plank، beam، beamDark، rot، rotB، stone، stoneMoss، grass، dirt، plaster، plaster2، roof، marble، marbleTop، trunk، cypress، pine، bush، hill، hillFar، mount، snow، iron، bronze، wood، door، window، red، banner، helmIn، helmOut.
  - رسّامات `P` (paint.js): planks، beam، rotten، stone، mossy، grass، dirt، plaster، roof، marble، banner، helmetInside، radial، و`rng(seed)` و`tex(canvas, rx, ry)`. الرسّامات الجديدة: لون مسطح مع فواصل داكنة.
- احتفظ بالأجزاء العامة من المثال وغيّر الخاص بالقصة: النهر والضفاف والتلال والجبال والأشجار والسحب صالحة لأغلب المشاهد الخارجية.
- toon بخطوتين، والضباب = لون الأفق. الخلفية: تلال كروية نصف مدفونة، جبال مخروطية بثلج، سرو/صنوبر، بيوت بعيدة، لوحات سحب.
- الانهيارات والأبواب والسقوط: مجموعات بمحاور دوران يقودها تقدّم 0→1 من `W`، متدرجة ومتتابعة.
- النص المنحني بـ UV مستوية وغير معكوس. الغرض ثلاثي الأبعاد (مثل الخوذة) مجموعة مخفية يظهرها `update` حسب `W`.

## story.js
- يصدّر: FPS، TOTAL (= N)، DECK، SHOTS `[{id, a, b, light}]`، shotAt، LIGHTS/lightFor(S, f)، camAt(f)، dofAt(f)، worldAt(f)، actorsAt(f, T)، fxAt(f, T). كلها دوال نقية للإطار.
- المساعدات من `motion.js` (مستوردة في المثال): `M` (smooth، easeOut، easeIn، back، anticip، spring)، clamp، lerp، lerp3، ramp، blinkAt، q، `R(T, outfit, opts, [x,y,z], extra)` لبطاقة شخصية، `FX(key, draw, pos, s, extra)` لمؤثر، dist، وأيضاً camFromKeys، spline، idle، walk.
- **LIGHTS**: day وgolden في المثال؛ المفاتيح az، el، sky، ground، hemi، sun، sunI، fog، fogNear، fogFar، skyTop، skyHor، sunDisc، sunSize، sat، gain، lift، waterDeep، waterShal، glint، vig، shadowExt. أضف night (أزرق ليلي) بنفس المفاتيح.
- **camAt** يعيد `{pos, look, fov, roll, flash, shadowAt}`. `flash` ومضة بيضاء (0–1)، و`shadowAt` مركز كاميرا الظل (الافتراضي look).
- **dofAt** يعيد `{focus, cinf, near}`.
- **actorsAt/fxAt** تعيد قوائم بطاقات: `key, draw, x, y, z, s, tint, order, alpha, flip, yaw, roll, blob, ground, shadow`.

## الكاميرا والحركة
- الكاميرا: مفاتيح `{f, pos, look, fov, roll}` لكل لقطة. `camFromKeys(keys, f, {kicks})`: انزلاقات smootherstep 18–45 إطاراً، `ease: 'easeOut'` للكشف، `path` (Catmull-Rom) للمنحنيات، زحف خفيف دائماً (لا ثبات ≥ 4 إطارات). ميلان 3–5° للدراما، اهتزاز 7 إطارات للاصطدام عبر `kicks: [{f, a}]`. القطع فقط عند تغيّر المكان/الزمن مع ومضة.
- الشخصيات لا تتجمد: `idle(f, seed)` لكل بطاقة، `blinkAt`، هزّ رأس على الكلمات المشدّدة. الأفعال: `M.anticip` ← `M.back` ← `M.spring`. الدّوس: انخفاض إطارين + غبار + اهتزاز. الضحك: ميلان متناوب + هزّ. `walk(f, f0, speed, stride)` للمشي بارتداد 3–7%.
- حركة ثانوية دائماً: قماش، أوراق، غبار، قطرات، Zzz، ماء.
- العدسة: cInf 8–14 px في القريبة والمتوسطة مع التركيز على العينين، الواسعة حادة، تبديل التركيز ~14 إطاراً.

## الشخصيات (`web/roman.js`)
- `T.romanFront(p, outfitKey, opts)`: canvas 600x1000، القدمان y=975، البطاقة 2.25 م (الوحدة = 0.00225 م).
- opts: expr، blink، look، facing (−1/0/1)، seed، L، R، tilt، headTilt، bob، nohelmet، web، step، lift، swirl.
- الأزياء OUTFITS: legion، old، toga، civA، civB، civC، workA، workB. مفاتيح زي جديد: tunic/cape/armor/helmet/hair/cap/beard/apron/dress/toga/skin/stout/spear.
- الذراعان (L/R): hang، spear، point، up، wave، hip، belly، temple(+swirl)، lift، reach(+lift)، cheek، shield، cross، thumb.
- الوجوه expr: neutral، stern، grin، laugh، whistle، nervous، shock، relief، relief_open، dazed، pained، smile، smile_closed، lick، snore، stubborn، squint. وجه جديد: `FACE.name = { eye: [..], brow: [..], mouth }` في roman.js.
- مؤثرات T: fxZ، fxLeaf، fxDust، fxDrip، fxWood، fxSplash، fxPuff، fxStars، fxCreak، fxRing، fxSign، fxCloud، fxNote، fxBurst، fxPlank، fxDrum، helmetCard، headCenter(seed).
- بعد تعديل roman.js: `cat web/toonbase.js web/roman.js > web/toon.js` ثم `./short.sh cast` وانظر إلى `stills/cast_sheet.png`.
- اللوحات تدور حول المحور الرأسي فقط، ظل باختبار ألفا، بلا حبر عالم. مفاتيح البطاقات من `q()` حتى لا يُعاد الرسم إلا عند تغيّر مرئي. الجزء المنفصل: `y = DECK + (partY − hc) × 0.00225` مع `headCenter(seed)`.
- للبطل سمة مميزة واحدة (لون، قبعة، غرض) تُعرف على الهاتف.

## الصوت (`audio.py` + `synth.py`)
- `T = Track.for_voice()`، `music, sfx = T.new(), T.new()`، `F = T.F` (إطار → ثانية)، `T.place(buf, sig, t0, gain)`، `T.save(buf, path, crest_db=None)`، `T.dur`.
- الموسيقى: `march(T, buf, end, bpm, prog)`، `drone(T, buf, start)`، PROG_MINOR/PROG_MAJOR، pluck، brass، drum.
- المؤثرات: whoosh، thunk، rumble، crash، scrape، ting، sting، creak، snap، splash، snore، leaves، water، cuckoo، pop، boing، footstep/steps، wind، crowd. للتوقيع: `grep -n "^def name" synth.py`.

## قائمة فحص ورقة اللقطات
- التأطير: نصف العرض = d·tan(hfov/2)، hfov = 2·atan(tan(vfov/2)·0.5625). على 4 م وfov 40 فقط ±0.8 م، فوزّع الشخصيات في العمق.
- لا قضبان أو أعمدة تقطع الوجوه، والكاميرا ليست داخل جدار/سقف/درابزين/شجيرة، ولا غرض أمامي أقرب من ~2 م، والبطل لا يختفي.
- النص غير معكوس؛ الأجزاء المنفصلة في مكانها؛ مجموعات Extrude: 0 أغطية، 1 جوانب + أعلى.
- الحبر في كل مكان (عند الغياب: `HASH=#e` للحواف و`HASH=#nd` للعمودي/العمق)؛ نصف قطره ~2.5 px؛ السماء عمق بعيد لا بطاقة.
- الوجوه مقروءة عند عرض الورقة بحجم 25%.

## حل المشكلات
| العَرَض | الحل |
|---|---|
| "page failed to load" | `./short.sh doctor`؛ ثم `grep ERR work/*.log`: غالباً خطأ JS في story.js أو world.js |
| > 8 ث/إطار/عامل | قلّل WORKERS؛ cinf 0 في الواسعة؛ عيّنات RT من 4 إلى 2 (`samples: 4` في main.js) |
| شخصيات مقطوعة | حسابات التأطير أعلاه؛ وزّع في العمق |
| لا حبر على البطاقات | متوقع؛ حدودها مرسومة عليها |
| نص معكوس | اقلب u في UV أو أدر المجسّم 180° حول Y |
| عبارات في فجوات خاطئة | أصلح `work/phrases.json` يدوياً ثم أعد الصوت |
| المؤثرات أقل بكثير من −6 dB | خفّض كسب الإشارات الحادة أو `crest_db=12` |
| finish FAIL: إطارات مفقودة | `RESUME=1 ./short.sh render` ثم finish |

## ملاحظات المحرّك (فقط إن اضطررت لتعديل main.js)
`#include <fog_vertex>`/`<fog_fragment>` كل في سطر · المرحلة النهائية `linearToOutputTexel(...)` (أهداف HalfFloat خطية) · مرحلة العمودي+العمق: العالم ← normal/depth، البطاقات ← قناع ألفا (rgb 0، a = العمق)، كل mesh فيه `userData.ndSkip` أو السماء مخفي، والماء يستخدم `userData.nd`؛ الضباب والظلال معطّلة · الحبر على الجانب القريب من قفزات العمق، الثنيات من حاصل ضرب العموديات، جيران البطاقات يُتخطّون، ويتلاشى 140→520 م · DOF: 48 عيّنة مع اختبار CoC · الشمس من az/el، وكاميرا الظل على `C.shadowAt` أو نقطة النظر.

## خريطة الحزمة
`kit/engine/` main.js، motion.js، paint.js، roman.js، index.html · `kit/example/soldier/` story.js، world.js، audio.py، stills.jpg · `kit/tools/` setup.sh، short.sh، timing.py، render.mjs، castsheet.mjs، sheet.py، synth.py، mix.py، finish.sh · `kit/vendor/` three.js r160 وtoon.ts (رخصة MIT، github.com/mromidev/claude-animated-shorts).
