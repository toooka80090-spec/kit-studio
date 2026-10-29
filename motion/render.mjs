// Render motion/how-to-order.html to MP4 (1080x1920, 60fps; FPS=30 env to override).
//   node motion/render.mjs [out.mp4] [--stills 1,5,12] [--variant gift] [--start cart]
import { createRequire } from 'module';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const stillsArg = args.indexOf('--stills');
const stills = stillsArg >= 0 ? args[stillsArg + 1].split(',').map(Number) : null;
const vi = args.indexOf('--variant'), variant = vi >= 0 ? args[vi + 1] : '';
const si = args.indexOf('--start'), start = si >= 0 ? args[si + 1] : '';
const out = path.resolve(args.find(a => a.endsWith('.mp4')) || path.join(here, 'out', `vamos-how-to-order${start ? '-' + start : ''}${variant ? '-' + variant : ''}.mp4`));
const FPS = +(process.env.FPS || 60);

const browser = await pw.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto(pathToFileURL(path.join(here, 'how-to-order.html')).href + '?render' + (variant ? '&variant=' + variant : '') + (start ? '&start=' + start : ''));
await page.evaluate(() => window.__ready);
const duration = await page.evaluate(() => window.DURATION);

if (stills) {
  for (const t of stills) {
    await page.evaluate(t => window.frame(t), t);
    const f = path.join(path.dirname(out), `still-${t}.png`);
    await page.screenshot({ path: f });
    console.log(f);
  }
} else {
  const ff = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  const total = Math.round(duration * FPS);
  for (let i = 0; i < total; i++) {
    await page.evaluate(t => window.frame(t), i / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 60 === 0) process.stderr.write(`frame ${i}/${total}\n`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  console.log(out);
}
await browser.close();
