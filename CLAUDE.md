# kit-studio

استوديو شغل لمحتوى رياضي وموشن ويوتيوب: قصص أطقم الأندية (VAMOS)، فيديوهات موشن بالكود، وسكريبتات وتغليف يوتيوب.

## أسلوب الشغل
- الرد بالعربي المصري افتراضياً، والمصطلحات التقنية وأسماء البرامج بالإنجليزي.
- الإجابات منظمة: عناوين، ونقاط، وخطوات مرقمة، ومن غير مقدمات.
- **برومبتات الصور** (Midjourney، Nano Banana، Kling، Magnific) تتكتب بالإنجليزي وبتفاصيل تصوير حقيقية: عدسة، وإضاءة، وزاوية، وتكوين. وكل برومبت لازم يقول صراحة: `no text, no letters, no logos, no watermarks, no random graphics`، إلا لو النص مطلوب.
- **الاستمرارية مع الصور المرجعية:** نفس زاوية الكاميرا، ونفس الإضاءة والكادر، ونفس الشعر واللبس ومكان كل عنصر بين الـ front والـ back والـ lifestyle.
- **أي voiceover أو نص إعلان عربي يتكتب مشكّل بالكامل.**
- مفيش أرقام أو نتايج متألفة على الشاشة أو في السكريبت.

## ستايل VAMOS (إجباري)
أي حاجة لـ VAMOS (إعلان، أو ستوري، أو موشن، أو برومبت AI) تبدأ بتحميل skill الـ **`vamos-brand`** الأول. بإيجاز:
- **أسود + lime** (`#9CD00D`) بتباين عالي، وأجواء dark فيها lime haze.
- **الـ V العملاقة** بتاعة البوكس هي العنصر الأساسي، وكمان الخطين المايلين بتوع الشنطة.
- **اللوجو الحقيقي** بس، والمنتجات الحقيقية: التيشيرتات والبوكس أبو شباك والشنطة.
- **ممنوع** الخلفيات الفاتحة والرمادي اللي بملمس ورق، لأنها اترفضت قبل كده.

## خريطة الـ skills (`.claude/skills/`)

| المهمة | الـ skill |
|---|---|
| هوية VAMOS (ألوان، لوجو، V، تغليف، نبرة) | `vamos-brand` |
| قصص أطقم الأندية من فولدر صور | `vamos-kit-story` |
| فيديو موشن / intro / promo / Reel بالكود | `remotion-motion-graphics` + قواعد `motion-design` |
| SFX ومزيكا متزامنة مع الـ timeline | `sound-design` |
| مراجعة الـ render قبل التسليم | `review-loop` |
| Simulation أو 3D أو particles | `web-sims` |
| سكريبت كلام وhooks متقيّمة | `yt-script` |
| سكريبت عمودين (صورة/صوت) للمونتير | `youtube-script-writer` |
| عنوان + thumbnail | `yt-package` (فيه 119 formula في `references/title-formulas.md`) |
| description وtags | `yt-seo` |
| chapters | `yt-chapters` |
| قص الفيديو من الـ transcript (EDL) | `yt-edit` |
| اختيار Shorts من فيديو طويل | `yt-shorts`، ولو هتقص الملفات من رابط: `youtube-clip-extractor` |
| فكرة Reel/TikTok أصلية | `short-form-video` |
| نص على الشاشة للكليبات | `video-caption-creation` |
| تحليل الـ retention من YouTube Studio | `yt-retention` |
| اللي شغال في النيش | `yt-viral` |
| audit للقناة / خطة النشر / الرد على الكومنتات | `yt-audit` / `yt-plan` / `yt-comment` |
| استراتيجية القناة، analytics بالـ API، monetization | `youtube` |

## أماكن الحاجات
- `index.html` و`prompts.html` و`story.html` و`grid.html`: أدوات الأطقم (اقرا `README.md`).
- `data/clubs.json`: بيانات الأندية، ونسختها الاحتياطية في `data/clubs.js`، والاتنين لازم يفضلوا متطابقين.
- `tools/`: سكريبتات pipeline الـ VAMOS.
- `motion/`: محرك الموشن (Remotion + `sfx/` + `sims/`). أي أمر من skills الموشن يتشغل من جوه `motion/`، وأول مرة `npm install`.
- `.claude/youtube/voice.md`: بروفايل الصوت اللي كل skills الـ `yt-*` بتقراه.

## الموشن بالعربي
اتبع قسم **Arabic text (RTL)** في `motion-design`: من غير letter-spacing، والـ reveal بالكلمة مش بالحرف، والـ wipes من اليمين للشمال، و`<bdi>` حوالين أي كلام إنجليزي جوه سطر عربي.
