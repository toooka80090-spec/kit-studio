# KIT / STUDIO — أداة قصص أطقم 2026/27

أداة محلية بسيطة لتجهيز سلسلة Instagram Stories عن أطقم الأندية لموسم 2026/27.
**لا تحتاج سيرفر ولا تثبيت** — افتح `index.html` في المتصفح (Chrome أو Edge يُفضَّل).

> تحتاج اتصال إنترنت لتحميل الخطوط (Google Fonts) ومكتبة التصدير html2canvas.

---

## 1) مولّد البرومبتات — `prompts.html`

1. اختر **النادي** ثم نوع الطقم: **Home / Away / Third**.
2. اكتب وصف الطقم في خانة **Kit description** (يُحفظ تلقائيًا في المتصفح).
   لو تركته `EDIT: describe kit` سيعتمد البرومبت على الصورة المرجعية فقط.
3. عدّل وصف **الموديل** و**البنطلون/الستايل** — نفس الوصف يدخل في البرومبتات الثلاثة لضمان ثبات الشخصية.
4. ستحصل على 3 برومبتات إنجليزية جاهزة لـ **Nano Banana داخل Adobe Firefly**:
   - `01` Front view — استوديو، الجزء العلوي كامل.
   - `02` Back view — نفس الموديل، نفس الإضاءة، نفس الكادر.
   - `03` Lifestyle — نفق الملعب.
5. زر **Copy** لكل برومبت، أو **Copy all 3** لنسخها كلها.

**نصيحة للاستمرارية:** ارفع صورة الطقم المرجعية مع كل برومبت، وولّد الـ Front أولًا ثم استخدم ناتجه كمرجع إضافي للـ Back والـ Lifestyle.

### بيانات الأندية — `data/clubs.json`
- لكل نادٍ: الاسم، الدوري، `primaryColor`، `secondaryColor`، ووصف لكل طقم (`home` / `away` / `third`).
- أزرار قسم **Data**:
  - **Import** — استيراد ملف `clubs.json` بعد تعديله يدويًا.
  - **Export** — تنزيل نسخة `clubs.json` فيها كل تعديلاتك (استبدل بها الملف في المجلد للاحتفاظ بها).
  - **Reset** — مسح التعديلات المحفوظة في المتصفح والرجوع للملف.
- عند فتح الصفحة كملف محلي (دبل كليك)، المتصفح يمنع قراءة `clubs.json` مباشرة، فتستخدم الأداة النسخة الاحتياطية `data/clubs.js`.
  لو عدّلت `clubs.json` بيدك ← اضغط **Import** واختره مرة واحدة.

---

## 2) قالب الستوري — `story.html`

1. اختر **النادي** — يتم ملء الاسم والدوري والألوان تلقائيًا من `clubs.json`.
2. اختر **Layout**:
   - **3 Stacked** — 3 بانلات متدرجة مع اسم كل طقم وسهم يشير إليه.
   - **Hero + 2** — صورة كبيرة + صورتين صغيرتين (اختر الطقم الكبير من **Hero kit**).
   - **Swipe** — طقم واحد في الشريحة مع نقاط سحب (اختر الطقم من **Kit on this slide** وصدّر 3 شرائح).
3. ارفع الصور: زر **Upload** لكل طقم، أو **Upload 3 at once** (بالترتيب: home ← away ← third)،
   أو اضغط/اسحب الصورة مباشرة على البانل في المعاينة.
4. من **Crop** اضبط الـ Zoom و Pan X / Pan Y لكل صورة.
5. **Text**: عدّل اسم النادي، أسماء الأطقم، شارة الموسم `26/27`، النص العلوي والسفلي، والـ handle.
   - **Show arrows** لإظهار/إخفاء الأسهم.
   - **Hide all text** لنسخة نظيفة بدون أي نصوص.
6. **Colors**: غيّر اللون الأساسي/الثانوي، **Swap** لعكسهما، **Club colors** للرجوع لألوان النادي.
7. **Export PNG** — ينزل ملف PNG بمقاس **1080×1920** بالضبط.

---

## الملفات

| الملف | الوظيفة |
|---|---|
| `index.html` | الصفحة الرئيسية |
| `prompts.html` | مولّد البرومبتات |
| `story.html` | قالب الستوري والتصدير |
| `data/clubs.json` | بيانات الأندية (المصدر الأساسي) |
| `data/clubs.js` | نسخة احتياطية للفتح بدون سيرفر |
| `assets/` | التصميم والسكربتات |

---

## 3) التشغيل من Claude Code (بدون متصفح)

نفس الصفحتين بتشتغلوا أوتوماتيك في Chromium مخفي — النتيجة مطابقة 100% للي بتطلع من المتصفح.

### البرومبتات
```bash
node tools/kit.mjs prompts zamalek away     # طقم واحد
node tools/kit.mjs prompts al-ahly all      # الثلاث أطقم
```
بيتحفظوا في `out/<club-id>/prompts-<kit>.txt`.

### الستوريز
1. حط الصور في `inbox/<club-id>/` بالأسماء دي بالظبط: `home.jpg` / `away.jpg` / `third.jpg` (أو png / webp).
2. شغّل:
```bash
node tools/kit.mjs build zamalek --handle @yourhandle
```
بيطلّع في `out/<club-id>/`: Stacked + Hero + Swipe لكل طقم — كل واحدة بنسخة عادية ونسخة **clean**، وكلهم 1080×1920.

خيارات: `--layouts stacked,swipe` لاختيار layouts معينة، و `--no-clean` لإلغاء النسخ النظيفة.

> أول مرة على جهاز جديد: `npm install` (بتنزّل html2canvas محليًا عشان التصدير يشتغل حتى من غير cdnjs).
> أسماء الأندية (`club-id`): `arsenal`, `chelsea`, `tottenham-hotspur`, `psg`, `atletico-madrid`, `borussia-dortmund`, `napoli`, `aston-villa`, `bayer-leverkusen`, `al-ahly`, `zamalek`.

---

## 4) جريد التفاصيل 3×3 — `grid.html`

ستوري 1080×1920 فيه 9 صور (كل خانة 9:16) بفواصل بيضاء 8px — نفس ستايل صور المنتجات.

1. في `prompts.html` اختار **Grid · 6** — هيطلعلك 6 برومبتات (Front / Three-quarter / Chest / Crest macro / Sleeve / Collar)،
   مكتوبة لصورة طقم **فلات (flat-lay)** يتلبس على موديل في استوديو أبيض.
2. ولّد الـ 6 صور وارفعها في `grid.html` بالترتيب ← **Auto-fill grid**: بيملا الـ 9 خانات، وخانات القماش القريبة بتتعمل zoom/rotate من نفس الصور.
3. عدّل أي خانة (Zoom / Pan / Rotate) ← **Export PNG**.

من Claude Code:
```bash
# الصور في inbox/<club-id>/<kit>-grid/  (1-front.jpg, 2-threequarter.jpg, ... 6-collar.jpg)
node tools/kit.mjs prompts zamalek home --set grid
node tools/kit.mjs grid zamalek home
```
`recipe.json` اختياري في نفس الفولدر لتحديد كل خانة: `[{ "src": "1-front", "zoom": 100, "fx": 50, "fy": 50, "rot": 0 }, ...]`.
