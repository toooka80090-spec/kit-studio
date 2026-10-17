#!/usr/bin/env node
// Drives prompts.html / story.html in headless Chromium so the CLI output is identical to the browser tool.
//
//   node tools/kit.mjs prompts <club-id|all> [home|away|third|all]
//   node tools/kit.mjs build <club-id> [--layouts stacked,hero,swipe] [--no-clean] [--handle @name]
//
// build reads images from inbox/<club-id>/{home,away,third}.(jpg|jpeg|png|webp) and writes PNGs to out/<club-id>/.
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath, pathToFileURL } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KITS = ['home', 'away', 'third'];
const require = createRequire(import.meta.url);

function loadPlaywright() {
  for (const p of ['playwright', '/opt/node-tools/node_modules/playwright']) {
    try { return require(p); } catch (e) { /* try next */ }
  }
  console.error('Playwright not found. Install it with: npm i -D playwright');
  process.exit(1);
}

function readClubs() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'data/clubs.json'), 'utf8'));
}

function parseFlags(argv) {
  const flags = {}, rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--no-')) flags[a.slice(5)] = false;
    else if (a.startsWith('--')) flags[a.slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    else rest.push(a);
  }
  return { flags, rest };
}

async function openPage(file) {
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  // Feed the current data/clubs.json to the page (file:// can't fetch it).
  const clubs = readClubs();
  await ctx.addInitScript(data => {
    try { localStorage.setItem('kitStudio.clubs.v1', data); } catch (e) { /* ignore */ }
  }, JSON.stringify(clubs));
  // Serve html2canvas locally when present so exports work offline / behind a strict proxy.
  const local = path.join(ROOT, 'node_modules/html2canvas/dist/html2canvas.min.js');
  if (fs.existsSync(local)) {
    await ctx.route('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/**', r => r.fulfill({ path: local, contentType: 'application/javascript' }));
  }
  const page = await ctx.newPage();
  await page.goto(pathToFileURL(path.join(ROOT, file)).href);
  return { browser, page };
}

// ---------- prompts ----------
async function prompts(clubArg, kitArg = 'all') {
  const clubs = readClubs().clubs;
  const targets = clubArg === 'all' ? clubs : clubs.filter(c => c.id === clubArg);
  if (!targets.length) fail('Unknown club "' + clubArg + '". Use one of: ' + clubs.map(c => c.id).join(', '));
  const kits = kitArg === 'all' ? KITS : [kitArg];
  if (!kits.every(k => KITS.includes(k))) fail('Kit must be home, away, third or all');

  const { browser, page } = await openPage('prompts.html');
  await page.waitForSelector('.prompt-card');
  for (const club of targets) {
    await page.selectOption('#club', club.id);
    const outDir = path.join(ROOT, 'out', club.id);
    fs.mkdirSync(outDir, { recursive: true });
    for (const kit of kits) {
      await page.click('[data-kit="' + kit + '"]');
      const texts = await page.$$eval('.prompt-text', els => els.map(e => e.textContent));
      const titles = ['FRONT VIEW', 'BACK VIEW', 'LIFESTYLE — STADIUM TUNNEL'];
      const body = texts.map((t, i) => (i + 1) + ') ' + titles[i] + '\n' + t).join('\n\n') + '\n';
      const file = path.join(outDir, 'prompts-' + kit + '.txt');
      fs.writeFileSync(file, body);
      console.log('# ' + club.name + ' — ' + kit.toUpperCase() + '  →  ' + path.relative(ROOT, file) + '\n\n' + body);
    }
  }
  await browser.close();
}

// ---------- story PNGs ----------
function findImages(clubId) {
  const dir = path.join(ROOT, 'inbox', clubId);
  const found = {};
  if (!fs.existsSync(dir)) return found;
  for (const f of fs.readdirSync(dir)) {
    const m = f.toLowerCase().match(/^(home|away|third)\.(jpe?g|png|webp)$/);
    if (m) found[m[1]] = path.join(dir, f);
  }
  return found;
}

async function build(clubId, flags) {
  const club = readClubs().clubs.find(c => c.id === clubId);
  if (!club) fail('Unknown club "' + clubId + '"');
  const images = findImages(clubId);
  const have = KITS.filter(k => images[k]);
  if (!have.length) fail('No images in inbox/' + clubId + '/ — name them home.jpg, away.jpg, third.jpg');

  const layouts = String(flags.layouts || 'stacked,hero,swipe').split(',');
  const clean = flags.clean !== false;
  const outDir = path.join(ROOT, 'out', clubId);
  fs.mkdirSync(outDir, { recursive: true });

  const { browser, page } = await openPage('story.html');
  await page.waitForSelector('#clubText');
  await page.selectOption('#club', clubId);
  if (typeof flags.handle === 'string') await page.fill('#handle', flags.handle);
  await page.evaluate(() => document.fonts.ready);

  for (const kit of have) {
    const b64 = fs.readFileSync(images[kit]).toString('base64');
    const ext = path.extname(images[kit]).slice(1).toLowerCase().replace('jpg', 'jpeg');
    await page.evaluate(async ([k, data, type]) => {
      const bin = Uint8Array.from(atob(data), c => c.charCodeAt(0));
      await window.KitStory.setImage(k, new File([bin], k, { type: 'image/' + type }));
    }, [kit, b64, ext]);
  }

  const jobs = [];
  for (const layout of layouts) {
    if (layout === 'swipe') have.forEach(k => jobs.push({ layout, swipeKit: k }));
    else if (layout === 'hero' && have.length < 3) console.warn('! hero layout needs all 3 kits — skipped');
    else if (layout === 'stacked' && have.length < 3) console.warn('! stacked layout needs all 3 kits — skipped');
    else jobs.push({ layout });
  }

  const written = [];
  for (const job of jobs) {
    for (const isClean of clean ? [false, true] : [false]) {
      await page.click('[data-layout="' + job.layout + '"]');
      if (job.swipeKit) await page.selectOption('#swipeKit', job.swipeKit);
      await page.setChecked('#clean', isClean);
      await page.evaluate(() => { window.__lastExport = null; });
      const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#exportBtn')]);
      const info = await page.evaluate(() => window.__lastExport);
      const file = path.join(outDir, dl.suggestedFilename());
      await dl.saveAs(file);
      if (!info || info.width !== 1080 || info.height !== 1920) fail('Export size wrong for ' + file + ': ' + JSON.stringify(info));
      written.push(path.relative(ROOT, file));
      console.log('✓ ' + path.relative(ROOT, file) + '  (' + info.width + '×' + info.height + ')');
    }
  }
  await browser.close();
  return written;
}

function fail(msg) {
  console.error('✗ ' + msg);
  process.exit(1);
}

const { flags, rest } = parseFlags(process.argv.slice(2));
const [cmd, a, b] = rest;
if (cmd === 'prompts' && a) await prompts(a, b);
else if (cmd === 'build' && a) await build(a, flags);
else {
  console.log('Usage:\n  node tools/kit.mjs prompts <club-id|all> [home|away|third|all]\n  node tools/kit.mjs build <club-id> [--layouts stacked,hero,swipe] [--no-clean] [--handle @name]');
  process.exit(cmd ? 1 : 0);
}
