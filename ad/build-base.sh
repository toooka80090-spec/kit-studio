#!/usr/bin/env bash
# Cut + grade the Kling takes onto the Street Trial timeline (1080x1920, 30fps) -> out/base.mp4
set -e
cd "$(dirname "$0")"
S=shots
G="scale=1080:1920:flags=lanczos,setsar=1,fps=30"
ffmpeg -y -loglevel error \
  -ss 5.15 -t 3.0  -i $S/hook-b.mp4 \
  -ss 0.2 -t 3.01 -i $S/cotton-b.mp4 \
  -ss 1.0 -t 2.99 -i $S/sewing-a.mp4 \
  -ss 3.0 -t 5.53 -i $S/print-a.mp4 \
  -ss 1.8 -t 1.3  -i $S/fold-a.mp4 \
  -ss 0.6 -t 4.0  -i $S/bag-a.mp4 \
  -ss 0.0 -t 3.0  -i $S/plane-a.mp4 \
  -f lavfi -t 1.2 -i color=c=0x0b0b0b:s=1080x1920:r=30 \
  -f lavfi -t 3.8 -i color=c=0x0b0b0b:s=1080x1920:r=30 \
  -filter_complex "
   [0]$G,hue=h=9:s=1.05,eq=contrast=1.06:brightness=-0.02,setpts=PTS-STARTPTS,zoompan=z=1+0.04*on/90:x=iw/2-(iw/zoom/2):y=ih/2-(ih/zoom/2):d=1:s=1080x1920:fps=30[a];
   [1]$G,eq=contrast=1.08,setpts=PTS-STARTPTS[b];
   [2]$G,eq=contrast=1.05,setpts=PTS-STARTPTS[c];
   [3]$G,eq=contrast=1.08:saturation=1.1,setpts=PTS-STARTPTS[d];
   [4]$G,eq=contrast=1.05:brightness=-0.02,setpts=PTS-STARTPTS[e];
   [5]$G,eq=contrast=1.06,setpts=PTS-STARTPTS[f];
   [6]$G,setpts=(3.2/3.0)*(PTS-STARTPTS),fps=30,eq=contrast=1.1:brightness=-0.06:saturation=0.85,colorbalance=bs=-0.12:gs=0.06:bm=-0.08:gm=0.05[g];
   [7]setsar=1[h];[8]setsar=1[i];
   [a][b][c][d][e][h][f][g][i]concat=n=9:v=1:a=0,format=yuv420p[v]" \
  -map "[v]" -c:v libx264 -preset medium -crf 16 -r 30 out/base.mp4
ffprobe -v error -show_entries format=duration -of csv=p=0 out/base.mp4
