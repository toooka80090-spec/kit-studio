#!/usr/bin/env node
// Frame-exact capture of index.html: steps window.render(t), screenshots each frame, pipes to ffmpeg.
//
//   node render.mjs --stills 0,1.5,3.5 [--cols 4] [--out out/sheet.png]   review contact sheet
//   node render.mjs [--scale 0.5] [--from 0] [--to 28] [--out out/video.mp4] [--audio out/sfx.wav]
import {createRequire} from 'node:module';
const {chromium} = createRequire(import.meta.url)('playwright');
import {spawn, execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i === -1 ? d : argv[i + 1]; };
const TL = JSON.parse(fs.readFileSync(path.join(HERE, 'timeline.json'), 'utf8'));
const OUTLINE = JSON.parse(fs.readFileSync(path.join(HERE, 'assets/outline.json'), 'utf8'));
const scale = Number(arg('scale', 1));
fs.mkdirSync(path.join(HERE, 'out'), {recursive: true});

const browser = await chromium.launch();
const page = await browser.newPage({viewport: {width: TL.width, height: TL.height}, deviceScaleFactor: scale});
page.on('pageerror', (e) => { console.error('page error:', e.message); process.exitCode = 1; });
await page.addInitScript(`window.TL=${JSON.stringify(TL)};window.OUTLINE=${JSON.stringify(OUTLINE)};window.CAPTURE=true;`);
await page.goto(pathToFileURL(path.join(HERE, 'index.html')).href);
await page.waitForFunction(() => window.READY === true, null, {timeout: 60000});
const shot = (t, type = 'jpeg') => page.evaluate((t) => window.render(t), t).then(() => page.screenshot(type === 'png' ? {type} : {type, quality: 94}));

const stills = arg('stills');
if (stills) {
  const ts = stills.split(',').map(Number);
  const dir = path.join(HERE, 'out/stills'); fs.rmSync(dir, {recursive: true, force: true}); fs.mkdirSync(dir, {recursive: true});
  for (const [i, t] of ts.entries()) fs.writeFileSync(path.join(dir, `${String(i).padStart(3, '0')}_${t}.png`), await shot(t, 'png'));
  await browser.close();
  const out = path.resolve(arg('out', path.join(HERE, 'out/sheet.png')));
  execFileSync('python3', ['-I', '-c', `
import sys,glob,os
from PIL import Image,ImageDraw
fs=sorted(glob.glob(os.path.join(sys.argv[1],'*.png'))); cols=int(sys.argv[3]); W=360; H=640
rows=(len(fs)+cols-1)//cols; s=Image.new('RGB',(cols*W+(cols+1)*8,rows*(H+30)+8),(20,20,20)); d=ImageDraw.Draw(s)
for i,f in enumerate(fs):
    im=Image.open(f).convert('RGB').resize((W,H)); x=8+(i%cols)*(W+8); y=8+(i//cols)*(H+30)
    s.paste(im,(x,y)); d.text((x+4,y+H+6),os.path.basename(f).split('_',1)[1][:-4]+'s',fill=(156,208,13))
s.save(sys.argv[2])`, dir, out, arg('cols', '4')]);
  console.log('sheet →', out);
  process.exit();
}

const from = Number(arg('from', 0)), to = Number(arg('to', TL.duration));
const silent = path.join(HERE, 'out/silent.mp4');
const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(TL.fps), '-i', '-',
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', scale < 1 ? '26' : '17', '-preset', 'medium', '-movflags', '+faststart', silent], {stdio: ['pipe', 'inherit', 'inherit']});
const n = Math.round((to - from) * TL.fps);
const t0 = Date.now();
for (let i = 0; i < n; i++) {
  const buf = await shot(from + i / TL.fps);
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  if (i % 60 === 0) process.stdout.write(`\rframe ${i}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
ff.stdin.end(); await new Promise((r) => ff.on('close', r)); await browser.close();
const out = path.resolve(arg('out', path.join(HERE, 'out/video.mp4')));
const audio = arg('audio');
if (audio) execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', silent, '-ss', String(from), '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', out]);
else fs.copyFileSync(silent, out);
console.log(`\ndone → ${out}`);
