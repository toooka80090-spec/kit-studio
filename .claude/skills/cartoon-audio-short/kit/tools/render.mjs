// رندر الإطارات بـ Chromium بلا واجهة (WebGL على المعالج، بلا كرت شاشة).
//   node render.mjs <مجلد_الإخراج> <الإطارات: "a-b" | "1,5,9" | "0-591"> [الخطوة] [جودة_jpeg]
// متغيرات البيئة:
//   WORKERS=n   صفحات متصفح متوازية (الافتراضي 1؛ جرّب 2–3 على 8 أنوية أو أكثر)
//   RESUME=1    تخطّي الإطارات الموجودة (آمن بعد انهيار أو إيقاف)
//   HASH=#nd    تشخيص: مرحلة العمودي/العمق     HASH=#e  تشخيص: حواف الحبر فقط
//   WEB=dir     جذر الويب (الافتراضي ./web)
// يكتب <مجلد_الإخراج>/fNNNN.jpg بشكل ذرّي و<مجلد_الإخراج>/progress.json. رمز الخروج 1 عند فشل أي إطار.
import { chromium } from 'playwright'; import http from 'http'; import fs from 'fs'; import path from 'path'; import os from 'os';

const [, , outdir, spec, step = '1', qual = '0.95'] = process.argv;
if (!outdir || !spec) { console.log('usage: node render.mjs <outdir> <"a-b" | "1,2,3"> [step] [quality]'); process.exit(2); }
fs.mkdirSync(outdir, { recursive: true });
let frames = [];
for (const part of spec.split(',')) {
  if (part.includes('-')) { const [a, b] = part.split('-').map(Number); for (let f = a; f <= b; f += +step) frames.push(f); }
  else if (part.trim() !== '') frames.push(+part);
}
const fname = (f) => path.join(outdir, `f${String(f).padStart(4, '0')}.jpg`);
if (process.env.RESUME) frames = frames.filter((f) => !(fs.existsSync(fname(f)) && fs.statSync(fname(f)).size > 0));
const total = frames.length;
if (!total) { console.log('nothing to render'); process.exit(0); }

const root = process.env.WEB || path.resolve('web');
const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.css': 'text/css' };
const srv = http.createServer((q, s) => {
  const p = path.join(root, path.normalize(decodeURIComponent(q.url.split('?')[0])).replace(/^(\.\.[/\\])+/, ''));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { s.writeHead(404); return s.end(); }
  s.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(s);
}).listen(0);
await new Promise((r) => srv.on('listening', r));

const ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const browser = await chromium.launch({ args: ARGS });
const W = Math.max(1, Math.min(+process.env.WORKERS || 1, os.cpus().length, total));

async function openPage() {
  const pg = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  pg.on('console', (m) => { const t = m.text(); if (!/GPU stall|swiftshader/i.test(t)) console.log('PAGE', t); });
  pg.on('pageerror', (e) => console.log('ERR', e.message));
  await pg.goto(`http://localhost:${srv.address().port}/index.html${process.env.HASH || ''}`);
  await pg.waitForFunction(() => window.ready || window.err, null, { timeout: 300000 });
  const err = await pg.evaluate(() => window.err);
  if (err) throw new Error('page failed to load: ' + err);
  return pg;
}

const t0 = Date.now(); let done = 0; const failed = [];
const queue = [...frames];
const report = () => {
  const el = (Date.now() - t0) / 1000, per = el / Math.max(done, 1), eta = per * (total - done);
  const line = `${done}/${total} frames  ${(100 * done / total).toFixed(1)}%  ${per.toFixed(2)} s/frame  ETA ${Math.floor(eta / 60)}m${String(Math.round(eta % 60)).padStart(2, '0')}s`;
  console.log(line);
  try { fs.writeFileSync(path.join(outdir, 'progress.json'), JSON.stringify({ done, total, sPerFrame: +per.toFixed(2), etaS: Math.round(eta), failed })); } catch {}
};
const every = Math.max(1, Math.round(total / 40));

async function worker(id) {
  let pg = await openPage();
  while (queue.length) {
    const f = queue.shift();
    let ok = false;
    for (let attempt = 0; attempt < 2 && !ok; attempt++) {
      try {
        const d = await pg.evaluate(([f, q]) => {
          if (location.hash === '#nd') window.DEBUG_ND = 1; if (location.hash === '#e') window.DEBUG_E = 1;
          window.renderFrame(f); return document.getElementById('c').toDataURL('image/jpeg', q);
        }, [f, +qual]);
        const tmp = fname(f) + '.part';
        fs.writeFileSync(tmp, Buffer.from(d.split(',')[1], 'base64')); fs.renameSync(tmp, fname(f));
        ok = true;
      } catch (e) {
        console.log(`worker ${id}: frame ${f} failed (${e.message.split('\n')[0]})${attempt === 0 ? ', reopening page and retrying' : ''}`);
        try { await pg.close(); } catch {} pg = await openPage();
      }
    }
    if (!ok) failed.push(f);
    done++; if (done % every === 0 || done === total) report();
  }
  await pg.close();
}

try { await Promise.all(Array.from({ length: W }, (_, i) => worker(i))); }
catch (e) { console.log('FATAL', e.message); await browser.close(); srv.close(); process.exit(1); }
console.log(`done ${total} frames with ${W} worker(s) in ${((Date.now() - t0) / 60000).toFixed(1)} min${failed.length ? `, FAILED: ${failed.join(',')}` : ''}`);
await browser.close(); srv.close();
process.exit(failed.length ? 1 : 0);
