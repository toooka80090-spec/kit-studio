// ورقة اختبار الشخصيات (بدون three.js): كل زي × بعض الوضعيات والتعابير.
//   node castsheet.mjs [out.png] [outfit1,outfit2,...]
// تستخدم web/toon.js (أعد بناءه أولاً بعد تعديل الشخصيات: cat web/toonbase.js web/roman.js > web/toon.js).
// الصفوف = الأزياء، والأعمدة = تركيبات الوضعية/التعبير. عدّل COMBOS أدناه لاختبار وضعيات أو وجوه جديدة.
import { chromium } from 'playwright'; import http from 'http'; import fs from 'fs'; import path from 'path';

const out = process.argv[2] || 'stills/cast_sheet.png';
const only = process.argv[3] ? process.argv[3].split(',') : null;
const COMBOS = [
  { expr: 'neutral' },
  { expr: 'grin', L: 'wave' },
  { expr: 'shock', L: 'up', R: 'up' },
  { expr: 'stubborn', L: 'cross', R: 'cross' },
  { expr: 'laugh', L: 'belly', R: 'point' },
  { expr: 'squint', L: 'temple', R: 'hip', swirl: 0.5 },
  { expr: 'snore', blink: 1 },
];
const root = process.env.WEB || path.resolve('web');
const page = `<!doctype html><meta charset=utf-8><body style="margin:0;background:#e9e4da"><canvas id=c></canvas><script type=module>
import * as T from './toon.js';
const combos = ${JSON.stringify(COMBOS)}, only = ${JSON.stringify(only)};
const keys = Object.keys(T.OUTFITS).filter(k => !only || only.includes(k));
const CW = 300, CH = 520, c = document.getElementById('c'); c.width = CW * combos.length; c.height = (CH + 30) * keys.length;
const g = c.getContext('2d'); g.fillStyle = '#e9e4da'; g.fillRect(0, 0, c.width, c.height); g.font = 'bold 20px sans-serif';
keys.forEach((k, r) => combos.forEach((o, i) => {
  g.save(); g.translate(i * CW, r * (CH + 30) + 30); g.scale(CW / 600, CH / 1000);
  try { T.romanFront(new T.Pen(g), k, { seed: 3 + r, ...o }); } catch (e) { g.restore(); g.save(); g.fillStyle = '#c00'; g.fillText('ERR ' + e.message, i * CW + 6, r * (CH + 30) + 60); console.log('ERR ' + k + ' ' + JSON.stringify(o) + ' ' + e.message); }
  g.restore();
  g.fillStyle = '#241726'; g.fillText(k + ' · ' + o.expr + (o.L ? ' · ' + o.L : ''), i * CW + 8, r * (CH + 30) + 22);
}));
window.ready = true;
</script>`;
const srv = http.createServer((q, s) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/' || u === '/cast.html') { s.writeHead(200, { 'Content-Type': 'text/html' }); return s.end(page); }
  const p = path.join(root, path.normalize(u));
  if (!p.startsWith(root) || !fs.existsSync(p)) { s.writeHead(404); return s.end(); }
  s.writeHead(200, { 'Content-Type': 'text/javascript' }); fs.createReadStream(p).pipe(s);
}).listen(0);
await new Promise((r) => srv.on('listening', r));
const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 2100, height: 1200 } });
let errs = 0;
pg.on('console', (m) => { console.log('PAGE', m.text()); if (m.text().startsWith('ERR')) errs++; });
pg.on('pageerror', (e) => { console.log('ERR', e.message); errs++; });
await pg.goto(`http://localhost:${srv.address().port}/cast.html`);
await pg.waitForFunction(() => window.ready, null, { timeout: 60000 }).catch(() => {});
const d = await pg.evaluate(() => window.ready ? document.getElementById('c').toDataURL('image/png') : null);
await b.close(); srv.close();
if (!d) { console.log('cast sheet failed: toon.js did not load (check the ERR lines above)'); process.exit(1); }
fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, Buffer.from(d.split(',')[1], 'base64'));
console.log(`wrote ${out}${errs ? `  (${errs} errors - see above)` : ''}`); process.exit(errs ? 1 : 0);
