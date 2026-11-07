# تصدير الـ Skills لباقي الشاتات

اتعملوا بـ `python3 tools/export_skills.py`. أي تعديل على `.claude/skills/` شغّل السكريبت ده تاني وارفع النسخة الجديدة.

## 1) شاتات claude.ai وCowork
1. **Settings ← Capabilities ← Skills ← Upload skill.**
2. ارفع كل ملف `.zip` من الفولدر ده لوحده.
3. لازم **Code execution** يبقى شغال من نفس الصفحة.

**الأولوية:**
1. `vamos-brand`: ده اللي هيخلّي أي شات يمشي على ستايل VAMOS.
2. `remotion-motion-graphics`، و`motion-design`، و`sound-design`.
3. `yt-script`، و`yt-package`، و`youtube-script-writer`، و`short-form-video`، و`video-caption-creation`.
4. الباقي حسب الحاجة.

## 2) Claude Code في أي مشروع تاني
```
/plugin marketplace add toooka80090-spec/kit-studio
/plugin install vamos-studio@kit-studio
```
الـ skills بتتنزّل من `plugin/vamos-studio/`.
