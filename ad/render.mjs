// Render ad/overlay.html as a transparent PNG sequence and composite it over out/base.mp4.
//   node ad/render.mjs                -> out/overlay.mov (alpha) + out/ad.mp4 (with music)
//   node ad/render.mjs --stills 2,9,11.2   -> out/still-<t>.png (overlay over the base frame)
import { createRequire } from 'module';
import { spawn, execFileSync } from 'child_process';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }

const here = path.dirname(fileURLToPath(import.meta.url));
const out = p => path.join(here, 'out', p);
const args = process.argv.slice(2);
const si = args.indexOf('--stills');
const stills = si >= 0 ? args[si + 1].split(',').map(Number) : null;
const FPS = 30;

const browser = await pw.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto(pathToFileURL(path.join(here, 'overlay.html')).href);
await page.evaluate(() => window.__ready);
const duration = await page.evaluate(() => window.DURATION);
const shot = async t => { await page.evaluate(t => window.frame(t), t); return page.screenshot({ omitBackground: true }); };

if (stills) {
  for (const t of stills) {
    const ov = out(`ov-${t}.png`);
    require('fs').writeFileSync(ov, await shot(t));
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(t), '-i', out('base.mp4'), '-i', ov,
      '-filter_complex', '[0][1]overlay', '-frames:v', '1', out(`still-${t}.png`)]);
    console.log(out(`still-${t}.png`));
  }
} else {
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-c:v', 'png', '-pix_fmt', 'rgba', out('overlay.mov')], { stdio: ['pipe', 'inherit', 'inherit'] });
  const total = Math.round(duration * FPS);
  for (let i = 0; i < total; i++) {
    const buf = await shot(i / FPS);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 90 === 0) process.stderr.write(`frame ${i}/${total}\n`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  console.log(out('overlay.mov'));
}
await browser.close();
