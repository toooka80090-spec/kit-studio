#!/usr/bin/env bash
# نقطة دخول واحدة لكل خطوة. شغّله داخل مجلد المشروع.
#   ./short.sh doctor                 فحص الجهاز (node، ffmpeg، python، chromium، webgl)
#   ./short.sh timing                 voice.mp3 + script.txt ← work/phrases.json
#   ./short.sh cast [outfits]         ورقة اختبار الشخصيات ← stills/cast_sheet.png
#   ./short.sh stills "5,40,90" [a]   رندر لقطات ثابتة + ورقة لقطات ← stills/sheet_<a>.jpg
#   ./short.sh sound                  audio.py ← المسارات، mix.py ← mix_raw.wav (يطبع المستويات)
#   ./short.sh render                 كل الإطارات (آمن في الخلفية؛ RESUME=1 للمتابعة؛ WORKERS=n)
#   ./short.sh finish "Title"         ترميز + علوّ الصوت + فحص ← out/<Title>.mp4
#   ./short.sh progress               عرض تقدّم الرندر
#   ./short.sh wait                   ينتظر حتى ~9.5 دقائق حتى ينتهي الرندر؛ يطبع سطراً واحداً (كرّره حتى "done")
# كل خطوة تطبع ملخصاً قصيراً فقط؛ السجلات الكاملة في work/<step>.log.
set -uo pipefail
cd "$(dirname "$0")"
cmd="${1:-help}"; shift || true
N() { python3 -c "import json;print(json.load(open('work/phrases.json'))['frames30'])"; }
case "$cmd" in
  doctor) bash "$0" _doctor 2>&1 | tee work/doctor.log | grep -v '^ok' ; grep -q '^MISS' work/doctor.log || echo "doctor: all OK" ;;
  _doctor)
    for c in node ffmpeg ffprobe python3; do command -v $c >/dev/null && echo "ok   $c" || echo "MISS $c"; done
    python3 -c "import numpy,PIL;print('ok   numpy + Pillow')" 2>/dev/null || echo "MISS numpy/Pillow"
    python3 -c "import faster_whisper;print('ok   faster-whisper (word timestamps)')" 2>/dev/null || echo "info no whisper: timing uses script + silence alignment (needs script.txt)"
    ffmpeg -hide_banner -filters 2>/dev/null | grep -w alimiter >/dev/null && echo "ok   ffmpeg alimiter/ebur128" || echo "MISS ffmpeg alimiter"
    ffmpeg -hide_banner -encoders 2>/dev/null | grep -w libx264 >/dev/null && echo "ok   libx264" || echo "MISS libx264"
    [ -s web/lib/three.module.js ] && echo "ok   three.js" || echo "MISS web/lib/three.module.js (re-run setup.sh with network)"
    node -e "
      const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
      const p=await b.newPage();const ok=await p.evaluate(()=>!!document.createElement('canvas').getContext('webgl2'));console.log(ok?'ok   chromium + WebGL2 (CPU)':'MISS WebGL2 in chromium');await b.close();})().catch(e=>console.log('MISS chromium: '+e.message.split('\n')[0]))" ;;
  timing)  python3 timing.py voice.mp3 script.txt --out work 2>&1 | tee work/timing.log ;;
  cast)    node castsheet.mjs stills/cast_sheet.png "${1:-}" > work/cast.log 2>&1 && echo "stills/cast_sheet.png" || { tail -5 work/cast.log; exit 1; } ;;
  stills)  L="${2:-a}"; node render.mjs "stills/$L" "${1:?frames, e.g. \"5,40,90\"}" > work/stills.log 2>&1; r=$?; grep -E '^(ERR|FATAL|PAGE|worker)' work/stills.log | head -8
           [ $r = 0 ] && python3 sheet.py "stills/$L" "stills/sheet_$L.jpg" || { echo "stills FAILED (see work/stills.log)"; exit 1; } ;;
  sound)   { python3 audio.py && python3 mix.py voice.mp3 music.wav sfx.wav; } > work/sound.log 2>&1; r=$?; grep -E 'vs voice|wrote|Error|error' work/sound.log; [ $r = 0 ] || { tail -5 work/sound.log; exit 1; } ;;
  render)  node render.mjs frames "0-$(( $(N) - 1 ))" > work/render.log 2>&1; r=$?; tail -1 work/render.log; exit $r ;;
  wait)    for i in $(seq 57); do grep -qE '^(done|FATAL)' work/render.log 2>/dev/null && break; sleep 10; done
           grep -E '^(ERR|FATAL)' work/render.log | head -3; tail -1 work/render.log ;;
  progress) cat frames/progress.json 2>/dev/null && echo || echo "no render running"; tail -2 work/render.log 2>/dev/null ;;
  finish)  bash finish.sh "${1:-short}" 2>&1 | tee work/finish.log; exit ${PIPESTATUS[0]} ;;
  *) sed -n '2,12p' "$0" ;;
esac
