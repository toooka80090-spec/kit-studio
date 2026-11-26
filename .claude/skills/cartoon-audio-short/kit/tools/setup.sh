#!/usr/bin/env bash
# مشروع فيديو جديد:   bash <المهارة>/kit/tools/setup.sh ~/shorts/<slug>
# ينسخ المحرّك والأدوات والمثال الجاهز (web/story.js، web/world.js، audio.py) إلى المشروع، ويثبّت three.js r160 وقاعدة toon،
# ويبني web/toon.js، ويربط Playwright. لا يكتب أبداً داخل الحزمة (مجلد المهارة للقراءة فقط)؛
# التنزيلات تُخزَّن في ~/.cache/cartoon-short-kit فتحدث مرة واحدة لكل جهاز.
set -uo pipefail
KIT="$(cd "$(dirname "$0")/.." && pwd)"; P="${1:?usage: setup.sh <project_dir>}"
CACHE="${XDG_CACHE_HOME:-$HOME/.cache}/cartoon-short-kit"; mkdir -p "$CACHE"
ok() { echo "  ok    $*"; }
warn() { echo "  WARN  $*"; }
die() { echo "  FAIL  $*"; exit 1; }
echo "cartoon-short-kit setup -> $P"

# ---- المتطلبات
NODE_V=$(node -v 2>/dev/null | tr -d v) || true
[ -n "$NODE_V" ] || die "node not found (need >= 22.6)"
python3 -c "import sys;a=list(map(int,'$NODE_V'.split('.')));sys.exit(0 if a>=[22,6] else 1)" || die "node $NODE_V is too old (need >= 22.6 for type stripping)"
ok "node $NODE_V"
command -v ffmpeg >/dev/null || die "ffmpeg not found"; ok "ffmpeg"
python3 -c "import numpy, PIL" 2>/dev/null || die "python3 needs numpy + Pillow (pip install numpy pillow)"; ok "python3 + numpy + Pillow"

# ---- هيكل المشروع (ملفات القصة والصوت الموجودة لا تُستبدل أبداً)
mkdir -p "$P/web/lib" "$P/work" "$P/stills" "$P/out" "$P/frames"
cp "$KIT"/engine/*.js "$KIT"/engine/index.html "$P/web/"
[ -f "$P/web/story.js" ] || cp "$KIT/example/soldier/story.js" "$P/web/story.js"
[ -f "$P/web/world.js" ] || cp "$KIT/example/soldier/world.js" "$P/web/world.js"
[ -f "$P/audio.py" ]     || cp "$KIT/example/soldier/audio.py" "$P/audio.py"
cp "$KIT"/tools/render.mjs "$KIT"/tools/castsheet.mjs "$KIT"/tools/timing.py "$KIT"/tools/sheet.py \
   "$KIT"/tools/synth.py "$KIT"/tools/mix.py "$KIT"/tools/finish.sh "$KIT"/tools/short.sh "$P/"
chmod +x "$P"/*.sh
ok "engine, tools and example copied"

# ---- three.js r160: من الحزمة ← الذاكرة المؤقتة ← npm ← git
T3="$CACHE/three-r160.module.js"
if [ -f "$KIT/vendor/three.module.js" ]; then cp "$KIT/vendor/three.module.js" "$T3"; fi
if [ ! -s "$T3" ]; then
  ( cd "$(mktemp -d)" && npm pack three@0.160.0 >/dev/null 2>&1 && tar xzf three-0.160.0.tgz && cp package/build/three.module.js "$T3" ) 2>/dev/null \
  || ( D=$(mktemp -d) && git clone -q --depth 1 --filter=blob:none --sparse --branch r160 https://github.com/mrdoob/three.js "$D/t3" && cd "$D/t3" && git sparse-checkout set build && cp build/three.module.js "$T3" ) 2>/dev/null
fi
THREE_OK=0
if [ -s "$T3" ]; then cp "$T3" "$P/web/lib/three.module.js"; THREE_OK=1; ok "three.js r160"
else warn "three.js r160 could not be fetched (no network?). Put three.module.js (r160 build) in $CACHE/three-r160.module.js and re-run. Cast sheets still work without it."; fi

# ---- قاعدة toon (مكتبة Pen / الرأس / الوجه، رخصة MIT): من الحزمة ← الذاكرة المؤقتة ← git
TOON="$CACHE/toon.ts"
[ -f "$KIT/vendor/toon.ts" ] && cp "$KIT/vendor/toon.ts" "$TOON"
if [ ! -s "$TOON" ]; then D=$(mktemp -d); git clone -q --depth 1 https://github.com/mromidev/claude-animated-shorts "$D/cas" 2>/dev/null && cp "$D/cas/templates/bridge/toon.ts" "$TOON"; fi
[ -s "$TOON" ] || die "toon.ts missing (kit/vendor/toon.ts not found and GitHub unreachable)"
node --no-warnings -e "const m=require('node:module'),fs=require('fs');fs.writeFileSync(process.argv[2],m.stripTypeScriptTypes(fs.readFileSync(process.argv[1],'utf8'),{mode:'transform'}))" "$TOON" "$P/web/toonbase.js" \
  || die "type stripping failed (node $NODE_V)"
cat "$P/web/toonbase.js" "$P/web/roman.js" > "$P/web/toon.js"
cp "$P/web/toon.js" "$CACHE/_check.mjs" && node --check "$CACHE/_check.mjs" || die "web/toon.js has a syntax error"
ok "web/toon.js built"

# ---- playwright (تثبيت عام مربوط بالمشروع)
mkdir -p "$P/node_modules"
if [ ! -e "$P/node_modules/playwright" ]; then
  G="$(npm root -g 2>/dev/null)/playwright"; [ -d "$G" ] && ln -sf "$G" "$P/node_modules/playwright"
fi
if ( cd "$P" && node -e "require('playwright')" ) 2>/dev/null; then ok "playwright"
else warn "playwright not found: npm i -g playwright && npx playwright install chromium, then re-run setup"; fi

echo
echo "ready: $P"
echo "next:  cd $P && cp <voice> voice.mp3 && printf '%s' '<script>' > script.txt && ./short.sh timing"
[ $THREE_OK = 1 ] || exit 3
