# برومبت التسليم: إعلان VAMOS "من القطن حتى باب بيتك"

> انسخ كل اللي تحت الخط ده والصقه في الشات التاني.

---

أنا صاحب براند **VAMOS** (متجر تيشيرتات وأطقم كورة في الكويت، "Home of Classic Jerseys"، `www.vamos-kw.com`). كنت شغال في شات تاني على إعلان موشن، وده ملخص كل اللي حصل عشان نكمّل من هنا. اتكلم معايا مصري، والمصطلحات التقنية بالإنجليزي.

## 1) هوية VAMOS (إجبارية في أي حاجة نعملها)
- **ألوان:** أسود `#0D0D0D` + lime `#9CD00D`، والـ neon `#A8F01E` للـ glow بس. الأبيض للكلام بس. ممنوع الرمادي والخلفيات الفاتحة والملمس اللي شبه الورق.
- **الأجواء:** dark فيها lime haze وrim light، زي صورة الشنطة. أو مساحة lime كاملة عليها V سودة، زي البوكس.
- **العنصر الأساسي:** **V عملاقة** بتقسم الكادر من الحافة للحافة (الموجودة على البوكس). بتتعمل كتقسيم للـ layout، وانتقال بين المشاهد (V بتقفل وتفتح على الـ beat)، وإطار للمنتج.
- **عنصر ثانوي:** خطين مايلين سميكين متوازيين في الركن (زي الشنطة).
- **اللوجو:** علامة `\V/` + كلمة `VAMOS®` (حرف الـ A مرسوم Λ من غير شرطة). لازم يتحط **الملف الحقيقي** دايماً، ومايتكتبش بخط شبهه.
- **المنتجات الحقيقية:**
  - تيشيرتات قطن ١٠٠٪ بـ 4 ألوان: أسود، رمادي داكن، رمادي، أبيض. وعليها طباعة VAMOS صغيرة في نص الصدر.
  - **بوكس** lime طويل عليه V سودة وفيه شباك التيشيرت باين منه.
  - **شنطة** lime نيون بحبل أسود.
- **الخطوط:** عربي تقيل ورياضي (Rubik 900 / Tajawal 800 / Cairo 800). أي إنجليزي يبقى geometric (Jost).
- **العربي في الموشن:** من غير letter-spacing خالص، والظهور كلمة كلمة مش حرف حرف، والـ wipes من اليمين للشمال.
- **النبرة:** واثقة وكورة وpremium وقصيرة. مفيش أرقام أو وعود متألفة (زي سرعة الشحن أو "أحسن جودة").
- **اللغة:** فصحى بسيطة للجمهور الخليجي، إلا لو طلبت كويتي. أي voiceover يتكتب مشكّل بالكامل.

## 2) الإعلان المطلوب
ريل **1080×1920**، مدته حوالي **28 ثانية**، بيحكي رحلة التيشيرت: **القطن ← الخياطة ← الطباعة ← التغليف ← التوصيل لحد باب البيت، حتى لو العميل بره الكويت** ← **٢٩ دولة** ← CTA.

**الدول الـ 29:** الكويت، السعودية، قطر، الإمارات، سلطنة عمان، البحرين، الأردن، أستراليا، أمريكا، السويد، ألمانيا، هولندا، كندا، بريطانيا، بلجيكا، بلغاريا، قبرص، تشيك، الدنمارك، فينلندا، فرنسا، اليونان، أيرلندا، النرويج، بولندا، البرتغال، أسبانيا، سويسرا، إنجلترا.

**ملاحظة الشحن (لازم تتكتب في آخر الإعلان):** "سعر الشحن يُحسب عبر الموقع الإلكتروني · غير شامل الرسوم الجمركية ما عدا السعودية / الإمارات / البحرين".

## 3) اللي اتعمل في النسخة الأولى (واترفض)
النسخة الأولى كانت موشن بالكود بس (HTML + Playwright + ffmpeg)، وتوقيتاتها:

| الوقت | المشهد |
|---|---|
| 0–3 | "رحلة تيشيرتك" |
| 3–6 | 01 القطن ١٠٠٪ |
| 6–9.5 | 02 الخياطة |
| 9.5–13.5 | 03 الطباعة + الألوان الأربعة |
| 13.5–17 | 04 التغليف |
| 17–20.5 | 05 التوصيل + "حتى لو كنت خارج الكويت" |
| 20.5–24.3 | ٢٩ دولة |
| 24.3–28 | CTA "اطلب الآن" |

**اترفضت لتلات أسباب:**
1. **بره ستايل VAMOS:** الخلفية كانت رمادي فاتح بملمس ورق، والخطوط في الأركان صغيرة، واللوجو اتكتب بخط شبهه، والبوكس اتعمل بوكس أسود عام مش البوكس الحقيقي.
2. **الموسيقى** كانت pad صناعي على E minor، وإحساسها غريب ومش حلو.
3. **الفيديو بسيط زيادة.** الحل إننا نخلط لقطات AI حقيقية مع الموشن.

## 4) خطة النسخة التانية
- **الأساس:** الهوية اللي في رقم 1. خلفية سودة فيها lime haze، والـ V العملاقة هي الانتقال بين المشاهد على الـ beat.
- **التقسيم:** لقطات AI (Kling) للواقعية، وفوقها موشن للنصوص العربي والعدّادات والأعلام واللوجو الحقيقي، وكمان الانتقالات.
- **التغليف:** التيشيرت يدخل **البوكس الحقيقي** ويبان من الشباك.
- **التوصيل:** **الشنطة الحقيقية** تتسلّم على باب البيت.
- **الـ CTA:** البوكس والشنطة جنب بعض، واللوجو الحقيقي، و"اطلب الآن"، والموقع، وملاحظة الشحن.
- **الصوت:** موسيقى أنا هولّدها في ElevenLabs (البرومبت تحت)، والمشاهد تتظبط على الـ beats والـ drop.

## 5) الملفات اللي معايا (هرفعها كـ attachments)
- 4 صور تيشيرتات على خلفية بيضا: أسود، ورمادي داكن، ورمادي، وأبيض.
- ستوري الدول (فيها الأعلام).
- صورة الشنطة.
- 4 صور للبوكس.
- اللوجو وعلامة `\V/` (PNG شفاف أو SVG).

## 6) برومبت الموسيقى (ElevenLabs Music) بـ 120 BPM عشان المشاهد تقع على الـ beat
**A: Afro House رياضي (الاختيار الأول):**
```
Instrumental only, no vocals, no spoken words. 28 seconds, 120 BPM, key of A minor.
Premium sportswear brand ad. Afro house meets modern football anthem: punchy four-on-the-floor kick, tight shakers and congas, warm deep sub bass, bright plucked synth hook, subtle Middle Eastern darbuka accents.
Structure: 0-3s filtered intro with rising riser, full kick drops at 3s; 3-20s steady driving groove with small fills every 4 bars; 20-24s build-up with snare roll and riser; hard drop with big impact at 24.3s; 24.3-28s full energy outro ending on a clean final hit, no fade out.
Confident, energetic, clean mix, festival-grade production, loud and polished.
```
**B: Cinematic Phonk-lite:**
```
Instrumental only, no vocals. 28 seconds, 120 BPM, key of D minor.
Cinematic sports trailer meets light phonk: heavy 808 bass, crisp trap hi-hats, cowbell melody kept subtle, orchestral string stabs, deep braam hits on transitions.
Structure: dark tense intro 0-3s, beat drops at 3s, groove until 20s, tension build 20-24s, massive drop at 24.3s with impact, confident ending at 28s, no fade.
Premium, aggressive but clean, modern streetwear energy.
```

## 7) لقطات الـ AI (Kling: Image-to-Video، مقاس 9:16، مدة 5s، Professional)
**Suffix يتحط في آخر كل برومبت:**
```
Dark moody environment, deep black background, neon lime green (#9CD00D) rim light and soft lime haze, high contrast, premium sportswear commercial look. No text, no letters, no logos, no watermarks, no random graphics.
```
(شيل "no logos" بس لو أول frame صورة منتج VAMOS حقيقية.)

**Negative:**
```
text, letters, words, logos, watermark, subtitles, random graphics, extra fingers, deformed hands, warped fabric, flicker, morphing
```

1. **Hook (0–3s):**
   - **Nano Banana** (المرجع: التيشيرت الأسود):
     ```
     Use the reference t-shirt exactly: same black cotton tee, same crew neck, same fit, same small chest print placement. A confident Gulf Arab young man in his twenties wearing this exact black t-shirt in a dark concrete stadium tunnel, stadium floodlights behind him as rim light, medium shot chest up, 50mm lens, shallow depth of field, cinematic grade, 8k photorealistic.
     ```
   - **Kling:**
     ```
     Slow cinematic push-in, he lifts his chin and looks into the camera with confidence, subtle fabric movement, haze drifting.
     ```
2. **القطن (3–6s)**، text-to-video:
   ```
   Extreme macro of fluffy white cotton bolls, soft wind moving the fibers, slow sideways dolly, backlight making the fibers glow, 100mm macro, slow motion, photorealistic.
   ```
3. **الخياطة (6–9.5s):**
   ```
   Macro of an industrial sewing machine needle stitching a hem on black cotton jersey, fast rhythmic needle, fabric sliding under the presser foot, dramatic side light, 85mm macro, shallow depth of field.
   ```
4. **الطباعة (9.5–13.5s)**، المرجع: التيشيرت الأسود **من غير طباعة**:
   ```
   Top-down shot of a heat press closing slowly onto the chest of a blank black t-shirt laid flat, a puff of steam as it opens, slow motion, photorealistic. No print visible on the shirt.
   ```
   اللوجو هيظهر بالموشن لحظة ما المكبس يفتح.
5. **التغليف (13.5–17s)**، أول frame صورة البوكس الحقيقية:
   ```
   Hands slide a folded black t-shirt into this exact box, the shirt becomes visible through the window cut-out, top-down, smooth controlled motion, keep the box design, colors and print exactly as in the image.
   ```
6. **التوصيل (17–20.5s)**، أول frame صورة الشنطة الحقيقية:
   ```
   A hand grabs the black rope handles and lifts this exact bag towards the camera at the front door of a modern Gulf villa, slow push-in, lime haze drifting, keep the bag design exactly as in the image.
   ```
7. **الشحن الدولي (20.5–24s)**، خلفية للأعلام:
   ```
   Cargo airplane taking off at blue hour, runway lights streaking, slow motion low-angle tracking shot, cinematic. No airline logos or markings.
   ```

## 8) المطلوب منك دلوقتي
1. ابدأ بـ **الهوية في رقم 1**، وطبّقها على كل قرار.
2. لما أرفعلك الملفات والموسيقى واللقطات، اعمل النسخة التانية بالخطة اللي في رقم 4. **الانتقالات تقع على الـ beats**، والـ CTA يقع على الـ drop.
3. قبل ما تسلّم، راجع frames من كل مشهد على الـ checklist دي: lime وأسود بس، والـ V حاضرة، واللوجو الحقيقي، والمنتجات الحقيقية، والعربي تقيل ومن غير letter-spacing، ومفيش وعود متألفة.
4. لو فيه حاجة مش واضحة، اسألني سؤال واحد محدد. ماتفترضش ستايل من عندك.
