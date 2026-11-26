#!/usr/bin/env bash
# ترميز الإطارات + المزيج ← MP4، ثم الفحص.      bash finish.sh "عنوان الفيديو"
# علوّ الصوت: كسب خطي واحد إلى −14 LUFS (مقاس، لا loudnorm ديناميكي) + محدِّد ذروة عند −1 dBFS. لا شيء غير ذلك.
# يكتب out/<العنوان>.mp4 وout/qa.txt وout/qa_sheet.jpg. رمز الخروج 1 إذا فشل فحص أساسي.
set -euo pipefail
T="${1:-short}"; SAFE="$(echo "$T" | tr ' /' '--' | tr -cd '[:alnum:]_.-')"; F="out/${SAFE:-short}.mp4"
FPS=30; mkdir -p out
[ -f mix_raw.wav ] || { echo "finish: mix_raw.wav missing - run: python3 mix.py voice.mp3 music.wav sfx.wav"; exit 1; }
ls frames/f*.jpg >/dev/null 2>&1 || { echo "finish: no frames in frames/ - run the render first"; exit 1; }

# ---- الإطارات: متتالية وكاملة
N=$(python3 -c "import json;print(json.load(open('work/phrases.json'))['frames30'])" 2>/dev/null || ls frames/f*.jpg | wc -l)
MISSING=$(python3 - "$N" <<'PY'
import os, sys
n = int(sys.argv[1]); miss = [i for i in range(n) if not os.path.exists(f"frames/f{i:04d}.jpg") or os.path.getsize(f"frames/f{i:04d}.jpg") == 0]
print(",".join(map(str, miss[:20])) + (" ..." if len(miss) > 20 else ""))
PY
)
[ -z "$MISSING" ] || { echo "finish: missing frames: $MISSING  (re-render with RESUME=1)"; exit 1; }

# ---- كسب خطي واحد إلى −14 LUFS، ثم محدِّد ذروة عند −1 dBFS (بلا ضبط تلقائي)
I=$(ffmpeg -hide_banner -nostats -i mix_raw.wav -af ebur128 -f null - 2>&1 | awk '/Integrated loudness/{f=1} f&&/I:/{print $2; exit}')
GAIN=$(python3 -c "print(round(-14.0 - float('$I'), 2))")
echo "mix integrated ${I} LUFS -> linear gain ${GAIN} dB"
ffmpeg -v error -y -i mix_raw.wav -af "volume=${GAIN}dB,alimiter=limit=0.891:attack=5:release=50:level=0" -ar 48000 -ac 2 -c:a pcm_s16le mix.wav

# ---- الترميز (طول الفيديو = N إطاراً؛ الصوت = طول التعليق)
ffmpeg -v error -y -framerate $FPS -i frames/f%04d.jpg -i mix.wav -map 0:v:0 -map 1:a:0 \
  -frames:v "$N" -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -r $FPS \
  -c:a aac -b:a 192k -movflags +faststart "$F"

# ---- الفحص
Q=out/qa.txt; FAIL=0; : > "$Q"
say() { echo "$*" | tee -a "$Q"; }
IFS=x read -r W H < <(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0:s=x "$F")
VD=$(ffprobe -v error -select_streams v:0 -show_entries stream=duration -of csv=p=0 "$F")
AD=$(ffprobe -v error -show_entries format=duration -of csv=p=0 mix_raw.wav)
say "file        $F"
say "size        ${W}x${H}  $( [ "$W$H" = "10801920" ] && echo OK || { echo FAIL; FAIL=1; } )"
DOK=$(python3 -c "print('OK' if abs($VD-$AD) <= 1.5/$FPS else 'FAIL')"); [ "$DOK" = OK ] || FAIL=1
say "duration    video ${VD}s  voice ${AD}s  $DOK"
FRZ=$(ffmpeg -i "$F" -vf "freezedetect=n=0.0005:d=0.4,blackdetect=d=0.05" -an -f null - 2>&1 | grep -oE "(freeze|black)_start: ?[0-9.]+" || true)
if [ -z "$FRZ" ]; then say "freeze/black none  OK"; else say "freeze/black FAIL:"; say "$FRZ"; FAIL=1; fi
LOUD=$(ffmpeg -hide_banner -nostats -i "$F" -af ebur128=peak=true -f null - 2>&1)
LI=$(echo "$LOUD" | awk '/Integrated loudness/{f=1} f&&/I:/{print $2; exit}')
TP=$(echo "$LOUD" | awk '/True peak/{f=1} f&&/Peak:/{print $2; exit}')
say "loudness    ${LI} LUFS (target -14)   true peak ${TP} dBFS (limit -1)"
if [ -f mix_levels.json ]; then say "mix levels  $(python3 -c "import json;d=json.load(open('mix_levels.json'));print(f\"music {d['music_vs_voice_db']} dB, sfx {d['sfx_vs_voice_db']} dB vs voice\")")"; fi
ffmpeg -v error -y -i "$F" -vf "fps=2,scale=180:-1,drawtext=text='%{pts\:hms}':x=4:y=4:fontsize=14:fontcolor=white:box=1:boxcolor=black@0.5,tile=10x4" -frames:v 1 out/qa_sheet.jpg 2>/dev/null \
  || ffmpeg -v error -y -i "$F" -vf "fps=2,scale=180:-1,tile=10x4" -frames:v 1 out/qa_sheet.jpg
say "qa sheet    out/qa_sheet.jpg"
[ $FAIL = 0 ] && say "RESULT      PASS" || { say "RESULT      FAIL (see above)"; exit 1; }
echo "$F"
