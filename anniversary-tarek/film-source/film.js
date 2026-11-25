// Tarek & Amira — a hand-drawn story in 16 scenes. Pure function of t.
(function () {
  const U = globalThis.U, G = globalThis.G, Ch = globalThis.Ch, SC = globalThis.SCORE, Studio = globalThis.Studio, Shots = globalThis.Shots;
  const { clamp, lerp, ease } = U;
  const W = G.W, H = G.H, WIDE = SC.WIDE, BEAT = SC.BEAT;
  const CUT = SC.CUTS;
  // ---------- layout: text block + stage, per format ----------
  const L = WIDE
    ? { TX: W * 0.265, TY: H * 0.25, TW: W * 0.36, AX: W * 0.665, GY: H * 0.9, CS: 0.84, SP: 1, AW: W * 0.58 }
    : { TX: W / 2, TY: H * 0.13, TW: W * 0.8, AX: W / 2, GY: H * 0.8, CS: 0.95, SP: 0.82, AW: W };
  const AX = (dx) => L.AX + dx * L.SP; // a stage x (dx designed around the stage centre)
  const fade = (dt, a, d = 0.5) => clamp((dt - a) / d);
  const popIn = (dt, a, d = 0.45) => (dt < a ? 0 : ease.outBack(clamp((dt - a) / d), 2.2));
  const beatPulse = (t) => Math.exp(-((t % BEAT) / BEAT) * 5);

  // ---------- the family ----------
  const ST = {
    tarek: { skin: '#E8B892', hair: '#1C130E', hairStyle: 'curlytop', facialHair: 'stubble', glasses: 'square', glassesColor: '#2B2B33', outfit: 'shirt', shirt: '#DCE6F5', collar: '#3F5A8C', trim: '#3F5A8C', bottoms: 'pants', shorts: '#2B2D42', sleeves: 'long' },
    amira: { skin: '#F2CDB0', hairStyle: 'hijab', hijab: '#1E9E96', glasses: 'round', glassesColor: '#7C818C', outfit: 'abaya', robe: '#2F3E5C', build: 'slim' },
    zeyad: { skin: '#D9A47E', hair: '#24160E', hairStyle: 'curlytop', glasses: 'square', glassesColor: '#C0283C', outfit: 'shirt', shirt: '#2E9E6B', collar: '#1F2A44', trim: '#1F2A44', bottoms: 'pants', shorts: '#1A1A1A', sleeves: 'long', build: 'slim' },
    dad: { skin: '#D9A47E', hair: '#C4C4C4', facialHair: 'mustache', hairStyle: 'short', outfit: 'thobe', robe: '#B8A88A', glasses: 'none', build: 'heavy' },
  };
  ST.tarekSuit = { ...ST.tarek, outfit: 'suit', robe: '#1E1F2B', trim: '#B3264C', shirt: '#FFFFFF' };
  ST.tarekEng = { ...ST.tarek, outfit: 'suit', robe: '#2C3E66', trim: '#8E2B4A', shirt: '#FFFFFF' };
  ST.amiraWed = { ...ST.amira, hijab: '#FFFFFF', outfit: 'lehenga', robe: '#FFFFFF', shirt: '#FFF6F0', trim: '#E8C66A', jewelry: false };
  ST.amiraEng = { ...ST.amira, hijab: '#F3D7EA', outfit: 'lehenga', robe: '#B784C9', shirt: '#C99AD8', trim: '#F2D48A' };
  ST.amiraBeach = { ...ST.amira, hijab: '#FFE3A0', robe: '#E8718D' };
  ST.tarekApron = { ...ST.tarek };
  globalThis.CAST = { tarek: ST.tarek, amira: ST.amira, zeyad: ST.zeyad, dad: ST.dad, groom: ST.tarekSuit, bride: ST.amiraWed, eng: ST.amiraEng };

  // person helper: everybody stands on the stage ground unless told otherwise
  const person = (ctx, style, x, o = {}) => Ch.person(ctx, { x, y: o.y ?? L.GY, s: (o.s ?? 1) * L.CS, pose: 'stand', style, seed: o.seed ?? 300, ...o });
  const HEAD_Y = (o) => (o.pose === 'sit' ? -254 : -404); // head centre, local units
  // tears rolling from both eyes (drawn after the person)
  function tears(ctx, x, y, s, t, k = 1, look = 0) {
    const hy = y - 404 * s * L.CS;
    for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) {
      const ph = ((t * 0.9 + i / 3 + (sd > 0 ? 0.17 : 0)) % 1);
      const ex = x + (sd * 24 + look * 10) * s * L.CS, ey = hy + 8 * s * L.CS + ph * 70 * s * L.CS;
      ctx.save(); ctx.globalAlpha = k * Math.sin(ph * Math.PI) * 0.95;
      G.ellipse(ctx, ex, ey, 5 * s * L.CS, 9 * s * L.CS, { fill: '#8FD0FF', lw: 2, seed: 900 + i });
      ctx.restore();
    }
  }

  // ---------- text block (scrapbook note) ----------
  const FONT = { title: 'Aref Ruqaa', body: 'Cairo' };
  function atext(ctx, str, x, y, size, color, font, alpha = 1) {
    G.SCRIPT_FONTS.arabic = font;
    G.text(ctx, str, x, y, { size, align: 'center', color, lang: 'ar', boil: 0.35, alpha, weight: 700 });
  }
  function fitSize(ctx, str, size, font, maxW) {
    G.SCRIPT_FONTS.arabic = font;
    const w = G.measure(ctx, str, size, 'Caveat', 700, 'ar');
    return w > maxW ? size * maxW / w : size;
  }
  // items: [{k:'title'|'sub'|'date'|'big', text, at, color, until}]
  function panel(ctx, dt, items, { paper = '#FBF5E8', ink = '#3A2A33', accent = '#B3264C', seed = 1 } = {}) {
    const SZ = { title: WIDE ? 86 : 100, sub: WIDE ? 44 : 50, date: WIDE ? 38 : 44, big: WIDE ? 130 : 150 };
    const GAP = WIDE ? 26 : 30;
    const lay = items.map((it) => {
      const font = it.k === 'title' || it.k === 'big' ? FONT.title : FONT.body;
      const size = fitSize(ctx, it.text, SZ[it.k], font, L.TW - 80);
      return { ...it, font, size, h: it.k === 'date' ? size * 1.7 : size * 1.25 };
    });
    const total = lay.reduce((s, it) => s + it.h, 0) + GAP * (lay.length - 1);
    const first = Math.min(...items.map((i) => i.at));
    const pa = fade(dt, first - 0.1, 0.5);
    if (pa <= 0) return;
    const top = WIDE ? L.TY + (H * 0.5 - L.TY) - total / 2 - 40 : L.TY;
    const pw = L.TW, ph = total + 90;
    ctx.save();
    ctx.globalAlpha *= pa;
    ctx.translate(L.TX, top + ph / 2);
    ctx.rotate(-0.012 + Math.sin(seed) * 0.01);
    ctx.scale(0.92 + 0.08 * ease.outBack(pa, 2), 0.92 + 0.08 * ease.outBack(pa, 2));
    G.tornPaper(ctx, -pw / 2, -ph / 2, pw, ph, { fill: paper, seed: 40 + seed, shadow: true });
    G.tape(ctx, -pw / 2 + 30, -ph / 2 - 4, 90, 30, -0.5, seed + 3);
    G.tape(ctx, pw / 2 - 30, -ph / 2 - 4, 90, 30, 0.5, seed + 5);
    ctx.restore();
    let y = top + 45;
    for (const it of lay) {
      const a = fade(dt, it.at, 0.6) * (it.until ? 1 - fade(dt, it.until, 0.4) : 1);
      const cy = y + it.h / 2;
      if (a > 0) {
        ctx.save(); ctx.globalAlpha *= a;
        ctx.translate(L.TX, cy + (1 - ease.outCubic(fade(dt, it.at, 0.6))) * 24);
        if (it.k === 'date') {
          const w = G.measure(ctx, it.text, it.size, 'Caveat', 700, 'ar') + 70;
          G.rrect(ctx, -w / 2, -it.size * 0.78, w, it.size * 1.56, it.size * 0.78, { fill: it.bg || accent, lw: 3.5, seed: seed + 11 });
          atext(ctx, it.text, 0, it.size * 0.36, it.size, '#FFFFFF', FONT.body);
        } else {
          atext(ctx, it.text, 0, it.size * 0.36, it.size, it.color || (it.k === 'title' || it.k === 'big' ? accent : ink), it.font);
        }
        ctx.restore();
      }
      y += it.h + GAP;
    }
  }
  // speech bubble with Arabic text
  function bubble(ctx, str, x, y, tx, ty, dt, a, b, { size = 50, fill = '#FFFFFF', color = '#B3264C' } = {}) {
    if (dt < a || dt > b + 0.3) return;
    const u = clamp((dt - a) / 0.3), out = clamp((dt - b) / 0.3);
    const sc = (0.3 + 0.7 * ease.outBack(u, 2.5)) * (1 - out * 0.4);
    const w = fitSize(ctx, str, size, FONT.body, 9999) && G.measure(ctx, str, size, 'Caveat', 700, 'ar') + 80, h = size * 1.7;
    ctx.save(); ctx.globalAlpha *= clamp(u * 3) * (1 - out);
    G.poly(ctx, [[x - 26, y + h / 2 - 6], [tx, ty], [x + 26, y + h / 2 - 6]], { fill, lw: 4, seed: 61 });
    ctx.translate(x, y); ctx.scale(sc, sc);
    G.rrect(ctx, -w / 2, -h / 2, w, h, h / 2, { fill, lw: 4.5, seed: 62 });
    atext(ctx, str, 0, size * 0.36, size, color, FONT.body);
    ctx.restore();
  }

  // ---------- backgrounds & props ----------
  const sky = (ctx, top, bot, y1 = H) => { const g = ctx.createLinearGradient(0, 0, 0, y1); g.addColorStop(0, top); g.addColorStop(1, bot); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); };
  const floor = (ctx, y, col, seed = 3) => G.poly(ctx, [[-60, y], [W + 60, y], [W + 60, H + 60], [-60, H + 60]], { fill: col, lw: 5, seed, hatch: { color: 'rgba(0,0,0,0.10)', gap: 9 } });
  const hill = (ctx, y, amp, col, seed) => { const pts = [[-60, H + 60]]; for (let x = -60; x <= W + 60; x += 120) pts.push([x, y - amp * (0.5 + 0.5 * Math.sin(x / 260 + seed))]); pts.push([W + 60, H + 60]); G.poly(ctx, pts, { fill: col, lw: 5, seed, hatch: { color: 'rgba(0,0,0,0.12)', gap: 9 } }); };
  function window_(ctx, x, y, w, h, skyCol, seed, night = false) {
    G.rrect(ctx, x, y, w, h, 12, { fill: skyCol, lw: 6, seed });
    if (!night) for (let i = 0; i < 5; i++) { const bw = w / 6, bh = h * (0.3 + 0.12 * ((i * 7) % 4)); G.rrect(ctx, x + 10 + i * (w - 20) / 5, y + h - bh, bw, bh, 3, { fill: '#9CB2CC', lw: 3, seed: seed + i }); }
    G.line(ctx, [[x + w / 2, y], [x + w / 2, y + h]], { lw: 8, color: '#FFFFFF', seed: seed + 9 });
    G.line(ctx, [[x, y + h / 2], [x + w, y + h / 2]], { lw: 8, color: '#FFFFFF', seed: seed + 10 });
  }
  function heartsUp(ctx, dt, start, x0, x1, y0, y1, n = 10, seed = 1, cols = ['#E8718D', '#F2B84B', '#FFFFFF']) {
    for (let i = 0; i < n; i++) {
      const per = 2.6 + G.rnd(seed, i, 1) * 1.4, lt = dt - start - G.rnd(seed, i, 2) * per;
      if (lt < 0) continue;
      const ph = (lt % per) / per;
      const x = lerp(x0, x1, G.rnd(seed, i, 3)) + Math.sin(lt * 2 + i) * 20, y = lerp(y1, y0, ph);
      ctx.save(); ctx.globalAlpha *= Math.sin(ph * Math.PI) * 0.9;
      G.heart(ctx, x, y, 1.1 + G.rnd(seed, i, 4) * 1.3, { fill: cols[i % cols.length], seed: seed * 10 + i });
      ctx.restore();
    }
  }
  function calendar(ctx, x, y, num, label, s = 1, seed = 5) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    G.rrect(ctx, -80, -80, 160, 160, 14, { fill: '#FFFFFF', lw: 5, seed });
    G.rrect(ctx, -80, -80, 160, 46, 14, { fill: '#E8718D', lw: 5, seed: seed + 1 });
    atext(ctx, label, 0, -46, 30, '#FFFFFF', FONT.body);
    atext(ctx, num, 0, 50, 84, '#2F3E5C', FONT.body);
    ctx.restore();
  }
  function crutch(ctx, x, yTop, yBot, rot, seed) {
    ctx.save(); ctx.translate(x, yTop); ctx.rotate(rot);
    const h = yBot - yTop;
    G.rrect(ctx, -34, -8, 68, 18, 9, { fill: '#5E6A75', lw: 4, seed });
    G.limb(ctx, [[-14, 8], [0, h * 0.55], [0, h]], { color: '#AEB7C0', lw: 12, outline: 3, seed: seed + 1 });
    G.limb(ctx, [[14, 8], [0, h * 0.55]], { color: '#AEB7C0', lw: 12, outline: 3, seed: seed + 2 });
    G.rrect(ctx, -22, h * 0.38, 44, 14, 6, { fill: '#5E6A75', lw: 3, seed: seed + 3 });
    ctx.restore();
  }
  function baby(ctx, x, y, s, col, seed) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    G.ellipse(ctx, 10, 0, 92, 46, { fill: col, lw: 4.5, seed, hatch: { color: 'rgba(0,0,0,0.1)', gap: 8 } });
    G.ellipse(ctx, -50, -14, 40, 38, { fill: col, lw: 4.5, seed: seed + 1 });
    G.ellipse(ctx, -50, -10, 28, 27, { fill: '#F2CDB0', lw: 3.5, seed: seed + 2 });
    G.line(ctx, [[-62, -12], [-55, -9]], { lw: 3, seed: seed + 3 }); G.line(ctx, [[-45, -9], [-38, -12]], { lw: 3, seed: seed + 4 });
    ctx.save(); ctx.globalAlpha = 0.5; G.ellipse(ctx, -64, 0, 6, 4, { fill: '#F28C9A', lw: 0, seed: seed + 5 }); G.ellipse(ctx, -36, 0, 6, 4, { fill: '#F28C9A', lw: 0, seed: seed + 6 }); ctx.restore();
    ctx.restore();
  }
  const ringAt = (ctx, x, y, r, col, seed) => { ctx.save(); ctx.lineWidth = r * 0.28; ctx.strokeStyle = '#2A2320'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke(); ctx.lineWidth = r * 0.2; ctx.strokeStyle = col; ctx.stroke(); ctx.restore(); };

  // ======================= SCENES =======================
  const scenes = [];
  // 0 INTRO
  scenes.push((ctx, t, s) => {
    const dt = s.dt;
    sky(ctx, '#21304F', '#5B3F6E');
    for (let i = 0; i < 60; i++) { const x = G.rnd(7, i, 1) * W, y = G.rnd(7, i, 2) * H * 0.7; ctx.save(); ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(t * 1.5 + i)); G.star(ctx, x, y, 4 + G.rnd(7, i, 3) * 6, { fill: '#FFF1D2', seed: i }); ctx.restore(); }
    const cx = AX(0), cy = WIDE ? H * 0.5 : H * 0.5, R = WIDE ? 300 : 330;
    const hp = ease.inOutCubic(fade(dt, 0.3, 2.2));
    // heart frame (drawn on), couple appears inside
    const pts = []; for (let i = 0; i <= 80 * hp; i++) { const a = (i / 80) * Math.PI * 2; pts.push([cx + 16 * Math.pow(Math.sin(a), 3) * R / 16, cy - (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * R / 16]); }
    const ca = fade(dt, 1.6, 1.2);
    if (ca > 0) {
      ctx.save(); const full = []; for (let i = 0; i <= 80; i++) { const a = (i / 80) * Math.PI * 2; full.push([cx + 16 * Math.pow(Math.sin(a), 3) * R / 16, cy - (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * R / 16]); }
      G.path(ctx, full, true); ctx.fillStyle = '#F7E6DA'; ctx.fill(); ctx.clip();
      ctx.globalAlpha *= ca;
      const yy = cy + R * 1.25 + (1 - ease.outCubic(ca)) * 80;
      Ch.person(ctx, { x: cx - 105, y: yy, s: 1.05, pose: 'stand', style: ST.tarek, look: 0.5, eyes: dt > 4 ? 'happy' : 'normal', mouth: 'smile', headRot: 0.08, blush: 0.5, handR: [120, -170], seed: 11 });
      Ch.person(ctx, { x: cx + 105, y: yy, s: 1.05, pose: 'stand', style: ST.amira, look: -0.5, eyes: dt > 4 ? 'happy' : 'normal', mouth: 'smile', headRot: -0.08, blush: 0.6, handL: [-120, -170], seed: 12 });
      ctx.restore();
    }
    if (pts.length > 2) { ctx.save(); ctx.lineWidth = 12; ctx.strokeStyle = '#F2B84B'; ctx.lineCap = 'round'; G.path(ctx, pts, false); ctx.stroke(); ctx.restore(); }
    heartsUp(ctx, dt, 3.5, cx - R, cx + R, cy - R, H, 12, 3);
    panel(ctx, dt, [{ k: 'sub', text: 'إلى أميرة… من طارق', at: 0.6 }, { k: 'title', text: 'طارق ♥ أميرة', at: 2.6 }, { k: 'date', text: '١٠ سنين حب • ٧ سنين جواز', at: 3.8 }], { seed: 1 });
  });
  // 1 OFFICE
  scenes.push((ctx, t, s) => {
    const dt = s.dt;
    sky(ctx, '#EEF2F8', '#D9E2EE');
    window_(ctx, AX(-60) - 200 * L.SP, L.GY - 700 * L.CS, 400 * L.SP, 300 * L.CS, '#BFE3F7', 21);
    // wall clock
    const ccx = AX(330), ccy = L.GY - 620 * L.CS;
    G.ellipse(ctx, ccx, ccy, 62, 62, { fill: '#FFFFFF', lw: 6, seed: 23 });
    G.line(ctx, [[ccx, ccy], [ccx + Math.sin(dt * 2) * 44, ccy - Math.cos(dt * 2) * 44]], { lw: 5, color: '#B3264C', seed: 24 });
    G.line(ctx, [[ccx, ccy], [ccx + Math.sin(dt * 0.2) * 30, ccy - Math.cos(dt * 0.2) * 30]], { lw: 7, seed: 25 });
    floor(ctx, L.GY - 30, '#C9B79F', 26);
    const xT = AX(-200), xA = AX(200);
    const turn = ease.inOutCubic(fade(dt, 6.6, 0.5)), turnA = ease.inOutCubic(fade(dt, 7.6, 0.6));
    const seatY = L.GY - 120 * L.CS;
    // chairs
    for (const x of [xT, xA]) G.rrect(ctx, x - 80 * L.CS, seatY - 160 * L.CS, 160 * L.CS, 180 * L.CS, 26, { fill: '#41506B', lw: 5, seed: 27 + x % 7 });
    Ch.person(ctx, { x: xT, y: seatY, s: L.CS, pose: 'sit', style: ST.tarek, gesture: dt < 6.6 ? 'typing' : null, look: lerp(0.2, 1, turn), lookY: 0.2 - turn * 0.2, headRot: 0.1 * turn, eyes: 'normal', mouth: dt > 7 && dt < 8.4 ? 'open' : 'smile', blush: 0.6 * turn, seed: 31 });
    Ch.person(ctx, { x: xA, y: seatY, s: L.CS, pose: 'sit', style: ST.amira, gesture: dt < 7.6 ? 'typing' : null, look: lerp(-0.2, -1, turnA), lookY: 0.2 - turnA * 0.2, headRot: -0.12 * turnA, eyes: dt > 9 ? 'happy' : turnA > 0.5 ? 'wide' : 'normal', mouth: dt > 9 ? 'grin' : turnA > 0.5 ? 'o' : 'smile', blush: 0.2 + 0.9 * turnA, seed: 32 });
    // desks in front (legs hidden)
    for (const [x, sd] of [[xT, 1], [xA, -1]]) {
      const dw = 340 * L.CS, dy = seatY - 40 * L.CS;
      G.rrect(ctx, x - dw / 2, dy, dw, 26, 8, { fill: '#9A6A45', lw: 5, seed: 33 + sd });
      G.rrect(ctx, x - dw / 2 + 14, dy + 24, dw - 28, 150 * L.CS, 6, { fill: '#7E5236', lw: 5, seed: 35 + sd, hatch: { color: 'rgba(0,0,0,0.15)', gap: 8 } });
      const mx = x + sd * 40 * L.CS;
      G.rrect(ctx, mx - 70 * L.CS, dy - 104 * L.CS, 140 * L.CS, 92 * L.CS, 8, { fill: '#2A2D3A', lw: 5, seed: 37 + sd });
      G.rrect(ctx, mx - 60 * L.CS, dy - 96 * L.CS, 120 * L.CS, 74 * L.CS, 5, { fill: sd > 0 ? '#9AD3F5' : '#F7C6D9', lw: 3, seed: 39 + sd });
      G.rrect(ctx, mx - 10, dy - 14, 20, 16, 3, { fill: '#2A2D3A', lw: 3, seed: 41 + sd });
    }
    bubble(ctx, 'هتوحشيني', xT + 60 * L.SP, seatY - 470 * L.CS, xT + 20, seatY - 320 * L.CS, dt, 7.0, 10.6, { size: WIDE ? 52 : 58 });
    // spark between them
    if (dt > 8.0 && dt < 9.8) { const pts = []; for (let k = 0; k <= 8; k++) pts.push([lerp(xT + 60, xA - 60, k / 8), seatY - 300 * L.CS + (k % 2 ? -1 : 1) * 24 * (1 + Math.sin(t * 40 + k))]); ctx.save(); ctx.globalAlpha = Math.sin(clamp((dt - 8) / 1.8) * Math.PI); G.line(ctx, pts, { lw: 8, color: '#F2B84B', seed: 43 }); ctx.restore(); }
    const hp = popIn(dt, 8.6, 0.6);
    if (hp > 0) G.heart(ctx, (xT + xA) / 2, seatY - 330 * L.CS, 4.2 * hp * (1 + 0.08 * beatPulse(t)), { fill: '#E0506A', seed: 44 });
    heartsUp(ctx, dt, 9.0, xT, xA, seatY - 700 * L.CS, seatY - 300 * L.CS, 10, 4);
    panel(ctx, dt, [{ k: 'title', text: 'البداية… في الشغل', at: 0.3 }, { k: 'date', text: '٩ / ٩ / ٢٠١٦', at: 1.0 }, { k: 'sub', text: 'كلمة واحدة: «هتوحشيني»', at: 7.2 }, { k: 'sub', text: 'ومن هنا… ابتدت الحكاية', at: 9.4, color: '#B3264C' }], { seed: 2 });
  });
  // 2 FATIHA
  scenes.push((ctx, t, s) => {
    const dt = s.dt;
    sky(ctx, '#FFF1DE', '#F4D2B0');
    // wall frame + lamp
    G.rrect(ctx, AX(-330) - 120, L.GY - 760 * L.CS, 240, 170, 8, { fill: '#E2C79E', lw: 6, seed: 51 });
    G.rrect(ctx, AX(-330) - 100, L.GY - 740 * L.CS, 200, 130, 4, { fill: '#9CC3A0', lw: 3, seed: 52 });
    G.ellipse(ctx, AX(360), L.GY - 640 * L.CS, 70, 50, { fill: '#F2B84B', lw: 5, seed: 53 });
    floor(ctx, L.GY - 40, '#B5835A', 54);
    // sofa
    const sy = L.GY - 150 * L.CS;
    G.rrect(ctx, AX(-420), sy - 300 * L.CS, AX(420) - AX(-420), 220 * L.CS, 50, { fill: '#9B4258', lw: 6, seed: 55, hatch: { color: 'rgba(0,0,0,0.12)', gap: 9 } });
    const dua = fade(dt, 0.4, 0.5) * (1 - fade(dt, 5.4, 0.5));
    const g = dua > 0.5 ? 'dua' : null;
    const look = dt > 7.6 ? 1 : 0;
    Ch.person(ctx, { x: AX(-260), y: sy, s: L.CS, pose: 'sit', style: ST.tarek, gesture: g, eyes: dua > 0.5 ? 'closed' : dt > 8.4 ? 'happy' : 'normal', look: dt > 7.6 ? 0.8 : 0, mouth: dt > 8.4 ? 'grin' : 'smile', seed: 56 });
    Ch.person(ctx, { x: AX(0), y: sy, s: L.CS * 1.05, pose: 'sit', style: ST.dad, gesture: dt < 5.6 ? 'dua' : dt < 8.6 ? 'point' : null, eyes: dt < 5.4 ? 'closed' : 'happy', mouth: dt > 5.4 && dt < 7.6 ? 'open' : 'grin', look: dt > 5.6 && dt < 8.6 ? 0.9 : 0, seed: 57 });
    Ch.person(ctx, { x: AX(260), y: sy, s: L.CS, pose: 'sit', style: ST.amira, gesture: g, eyes: dua > 0.5 ? 'closed' : dt > 8.4 ? 'happy' : 'normal', look: dt > 7.6 ? -0.6 : 0, mouth: dt > 8.4 ? 'grin' : 'smile', blush: dt > 8.4 ? 0.9 : 0.3, seed: 58 });
    G.rrect(ctx, AX(-440), sy - 20 * L.CS, AX(440) - AX(-440), 90 * L.CS, 30, { fill: '#B5546C', lw: 6, seed: 59 });
    // dad's line
    bubble(ctx, 'هنحط طوبة ونحجزها!', AX(0), sy - 520 * L.CS, AX(0) + 20, sy - 330 * L.CS, dt, 4.6, 8.4, { size: WIDE ? 46 : 52, color: '#8C3B4E' });
    // the brick drops in front of Amira, then the stamp
    const bx = AX(260), by = L.GY - 20;
    const bf = clamp((dt - 7.0) / 0.5);
    if (bf > 0) {
      const y = lerp(-200, by, bf * bf);
      const sq = dt > 7.5 ? 1 + 0.25 * Math.exp(-(dt - 7.5) * 8) * Math.cos((dt - 7.5) * 30) : 1;
      ctx.save(); ctx.translate(bx, y); ctx.scale(sq, 2 - sq);
      G.rrect(ctx, -110 * L.CS, -90 * L.CS, 220 * L.CS, 90 * L.CS, 8, { fill: '#C4553A', lw: 5, seed: 60, hatch: { color: 'rgba(0,0,0,0.15)', gap: 7 } });
      G.line(ctx, [[-110 * L.CS, -45 * L.CS], [110 * L.CS, -45 * L.CS]], { lw: 4, color: '#8F3A26', seed: 61 });
      ctx.restore();
      if (dt > 7.5 && dt < 8.4) for (let i = 0; i < 7; i++) { const lp = (dt - 7.5) / 0.9; ctx.save(); ctx.globalAlpha = 1 - lp; G.ellipse(ctx, bx + (i - 3) * 50 * lp * 2, by - 10 - Math.sin(i) * 20 * lp, 16, 12, { fill: '#E8D3B8', lw: 2, seed: 62 + i }); ctx.restore(); }
      const sp = dt < 8.2 ? 0 : lerp(2.4, 1, ease.outCubic(clamp((dt - 8.2) / 0.22)));
      if (sp > 0) { ctx.save(); ctx.translate(bx, by - 150 * L.CS); ctx.rotate(-0.12); ctx.scale(sp, sp); G.rrect(ctx, -160, -46, 320, 92, 14, { fill: 'rgba(255,255,255,0.85)', lw: 7, stroke: '#D6264F', seed: 70 }); atext(ctx, 'محجوزة لطارق ♥', 0, 16, 46, '#D6264F', FONT.body); ctx.restore(); }
    }
    panel(ctx, dt, [{ k: 'title', text: 'قرينا الفاتحة', at: 0.3 }, { k: 'date', text: '٢٣ / ٥ / ٢٠١٧', at: 1.0, bg: '#8C3B4E' }, { k: 'sub', text: 'واتحجزتِ ليّا ♥', at: 8.6, color: '#8C3B4E' }], { seed: 3, accent: '#8C3B4E' });
  });
  // 3 ENGAGEMENT
  scenes.push((ctx, t, s) => {
    const dt = s.dt;
    sky(ctx, '#2A1838', '#7A3E6E');
    // lights
    for (let i = 0; i < 26; i++) { const x = (i + 0.5) * W / 26, y = H * 0.08 + Math.sin((i / 25) * Math.PI) * H * 0.07; ctx.save(); ctx.globalAlpha = 0.5 + 0.5 * ((Math.floor(t / (BEAT / 2)) + i) % 2); G.ellipse(ctx, x, y, 9, 9, { fill: '#FFE08A', lw: 2, seed: 80 + i }); ctx.restore(); }
    // kosha
    const kx = AX(0), ky = L.GY - 80;
    G.rrect(ctx, kx - 360 * L.CS * L.SP, ky - 640 * L.CS, 720 * L.CS * L.SP, 560 * L.CS, 200, { fill: '#C78FB8', lw: 6, seed: 81, hatch: { color: 'rgba(255,255,255,0.15)', gap: 10 } });
    for (let i = 0; i < 24; i++) { const a = Math.PI + (i / 23) * Math.PI; G.ellipse(ctx, kx + Math.cos(a) * 360 * L.CS * L.SP, ky - 360 * L.CS + Math.sin(a) * 300 * L.CS, 18, 18, { fill: ['#F9C6D3', '#FFFFFF', '#E8718D'][i % 3], lw: 3, seed: 82 + i }); }
    floor(ctx, L.GY - 30, '#4A2C48', 83);
    const close = ease.inOutCubic(fade(dt, 4.0, 0.8));
    Ch.person(ctx, { x: AX(-120 + 15 * close), y: L.GY, s: L.CS, pose: 'stand', style: ST.tarekEng, look: 0.8, eyes: 'happy', mouth: 'grin', headRot: 0.06 * close, handR: [110, -200], seed: 84 });
    Ch.person(ctx, { x: AX(120 - 15 * close), y: L.GY, s: L.CS, pose: 'stand', style: ST.amiraEng, look: -0.8, eyes: 'happy', mouth: 'grin', blush: 0.8, headRot: -0.06 * close, handL: [-110, -200], seed: 85 });
    // rings dance and lock
    const rp = ease.inOutCubic(fade(dt, 1.4, 2.2)), ang = dt * 2.4, R = lerp(220, 30, rp);
    const rcx = AX(0), rcy = L.GY - 640 * L.CS;
    if (dt > 1.2) { ringAt(ctx, rcx + Math.cos(ang) * R, rcy + Math.sin(ang) * R * 0.4, 46, '#F2C94C', 86); ringAt(ctx, rcx - Math.cos(ang) * R, rcy - Math.sin(ang) * R * 0.4, 46, '#E9A84C', 87);
      if (rp >= 1) G.star(ctx, rcx + 10, rcy - 60, 16 + 6 * beatPulse(t), { fill: '#FFFFFF', seed: 88 }); }
    if (dt > 3.6) G.confetti(ctx, t, s.t0 + 3.6, { n: 90, seed: 9, spawn: 2.5 });
    panel(ctx, dt, [{ k: 'title', text: 'اتخطبنا', at: 0.3 }, { k: 'date', text: '١٨ / ٨ / ٢٠١٧', at: 0.9, bg: '#7A3E6E' }, { k: 'sub', text: 'خطوبة حلوة وجامدة… زيّك بالظبط', at: 2.4 }], { seed: 4, accent: '#7A3E6E' });
  });
  // 4 FIVE POUNDS -> BIR MASOUD
  scenes.push((ctx, t, s) => {
    const dt = s.dt;
    const night = 1 - fade(dt, 6.6, 0.8);
    sky(ctx, '#E8767A', '#FBD9B0', H * 0.6);
    const hor = L.GY - 420 * L.CS;
    G.ellipse(ctx, AX(260), hor - 30, 100, 100, { fill: '#FFE08A', lw: 4, seed: 91 });
    G.poly(ctx, [[-60, hor], [W + 60, hor], [W + 60, L.GY - 140 * L.CS], [-60, L.GY - 140 * L.CS]], { fill: '#5E8FBE', lw: 5, seed: 92, hatch: { color: 'rgba(255,255,255,0.18)', gap: 10, angle: 0 } });
    for (let k = 0; k < 3; k++) { const pts = []; for (let x = -60; x <= W + 60; x += 40) pts.push([x, hor + 40 + k * 70 + Math.sin(x / 70 + t * 1.5 + k) * 8]); G.line(ctx, pts, { lw: 4, color: 'rgba(255,255,255,0.7)', seed: 93 + k }); }
    // rocks
    G.poly(ctx, [[-60, L.GY - 150 * L.CS], [W * 0.3, L.GY - 190 * L.CS], [W * 0.6, L.GY - 160 * L.CS], [W + 60, L.GY - 200 * L.CS], [W + 60, H + 60], [-60, H + 60]], { fill: '#8B7F73', lw: 5, seed: 96, hatch: { color: 'rgba(0,0,0,0.15)', gap: 8 } });
    // the well (bir masoud) with its railing
    const wx = AX(330), wy = L.GY - 150 * L.CS;
    G.ellipse(ctx, wx, wy, 120 * L.CS, 34 * L.CS, { fill: '#4E4740', lw: 5, seed: 97 }); G.ellipse(ctx, wx, wy, 92 * L.CS, 22 * L.CS, { fill: '#1E2E3E', lw: 4, seed: 98 });
    G.line(ctx, [[wx - 120 * L.CS, wy], [wx - 120 * L.CS, wy - 70 * L.CS], [wx + 120 * L.CS, wy - 70 * L.CS], [wx + 120 * L.CS, wy]], { lw: 7, color: '#EDE6DA', seed: 99 });
    for (let k = 0; k < 8; k++) { const ph = ((dt * 0.5 + k / 8) % 1); if (ph < 0.4) { ctx.save(); ctx.globalAlpha = Math.sin(ph / 0.4 * Math.PI) * 0.8; G.ellipse(ctx, wx + (k - 3.5) * 22, wy - 30 - ph * 160 + ph * ph * 200, 9 + (k % 3) * 4, 9 + (k % 3) * 4, { fill: '#FFFFFF', lw: 2, seed: 100 + k }); ctx.restore(); } }
    // sitting on the rocks, cracking seeds
    const crack = dt > 7 && dt < 18.5;
    G.poly(ctx, [[AX(-300), L.GY - 30 * L.CS], [AX(-260), L.GY - 200 * L.CS], [AX(-80), L.GY - 225 * L.CS], [AX(120), L.GY - 205 * L.CS], [AX(150), L.GY - 30 * L.CS]], { fill: '#A39486', lw: 5, seed: 104, hatch: { color: 'rgba(0,0,0,0.15)', gap: 8 } });
    const sy = L.GY - 170 * L.CS;
    const ta = Math.sin(dt * 8), tb = Math.sin(dt * 8 + 1.6);
    Ch.person(ctx, { x: AX(-170), y: sy, s: L.CS, pose: 'sit', style: ST.tarek, look: 0.6, eyes: dt > 11 ? 'happy' : 'normal', mouth: crack && ta > 0.7 ? 'open' : 'grin', handR: crack ? [70, -150 - 60 * Math.max(0, ta)] : undefined, handL: [-40, -60], seed: 101 });
    Ch.person(ctx, { x: AX(10), y: sy, s: L.CS, pose: 'sit', style: ST.amira, look: -0.6, eyes: dt > 11 ? 'happy' : 'normal', mouth: crack && tb > 0.7 ? 'open' : 'grin', blush: 0.6, handL: crack ? [-70, -150 - 60 * Math.max(0, tb)] : undefined, seed: 102 });
    // the paper cone of seeds between them + shells piling
    const cx = AX(-80), cy = sy + 20;
    G.poly(ctx, [[cx - 34, cy - 40], [cx + 34, cy - 40], [cx, cy + 30]], { fill: '#F4E3C1', lw: 4, seed: 103 });
    const n = Math.floor(clamp((dt - 7.5) / 10) * 40);
    for (let i = 0; i < n; i++) G.ellipse(ctx, cx + (G.rnd(5, i, 1) - 0.5) * 220, sy + 140 * L.CS - G.rnd(5, i, 2) * 30, 8, 4, { fill: i % 2 ? '#FFFFFF' : '#DDDDDD', lw: 1.5, seed: 110 + i });
    // clock: 3 hours fly by
    if (dt > 7.6) {
      const hrs = clamp((dt - 8) / 6) * 3, ccx = WIDE ? AX(430) : W * 0.82, ccy = WIDE ? H * 0.16 : H * 0.28, cs = popIn(dt, 7.6);
      ctx.save(); ctx.translate(ccx, ccy); ctx.scale(cs, cs);
      G.ellipse(ctx, 0, 0, 70, 70, { fill: '#FFFFFF', lw: 6, seed: 150 });
      G.line(ctx, [[0, 0], [Math.sin(hrs * 2 * Math.PI) * 50, -Math.cos(hrs * 2 * Math.PI) * 50]], { lw: 5, color: '#B3264C', seed: 151 });
      G.line(ctx, [[0, 0], [Math.sin(hrs / 12 * 2 * Math.PI) * 32, -Math.cos(hrs / 12 * 2 * Math.PI) * 32]], { lw: 7, seed: 152 });
      atext(ctx, hrs > 2 ? '٣ ساعات' : hrs > 1 ? 'ساعتين' : 'ساعة', 0, 118, 40, '#FFFFFF', FONT.body);
      ctx.restore();
    }
    // the night/dim layer for the money part
    if (night > 0) { ctx.save(); ctx.globalAlpha = night * 0.85; ctx.fillStyle = '#2A1A2A'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    // 5 pound note, then the cone of seeds (big, centre stage)
    const nx = AX(0), ny = WIDE ? H * 0.5 : H * 0.5;
    const na = popIn(dt, 0.4, 0.7) * (1 - fade(dt, 4.0, 0.5));
    if (na > 0) { ctx.save(); ctx.translate(nx, ny); ctx.rotate(-0.06 + Math.sin(dt * 2) * 0.03); ctx.scale(na, na);
      G.rrect(ctx, -300, -140, 600, 280, 20, { fill: '#E9B98B', lw: 6, seed: 120, hatch: { color: 'rgba(140,80,30,0.18)', gap: 9 } });
      G.rrect(ctx, -276, -116, 552, 232, 14, { fill: 'rgba(0,0,0,0)', lw: 3, seed: 121 });
      G.ellipse(ctx, -160, 0, 86, 86, { fill: '#D69A68', lw: 4, seed: 122 });
      atext(ctx, '٥', 110, 60, 180, '#8A4B22', FONT.body); atext(ctx, 'جنيه', 110, 110, 44, '#8A4B22', FONT.body);
      ctx.restore(); }
    const co = popIn(dt, 4.2, 0.6) * (1 - fade(dt, 6.4, 0.5));
    if (co > 0) { ctx.save(); ctx.translate(nx, ny); ctx.scale(co, co); ctx.rotate(Math.sin(dt * 2) * 0.05);
      G.poly(ctx, [[-130, -110], [130, -110], [0, 180]], { fill: '#F4E3C1', lw: 6, seed: 125, hatch: { color: 'rgba(150,110,60,0.2)', gap: 8 } });
      for (let i = 0; i < 20; i++) G.ellipse(ctx, (G.rnd(6, i, 1) - 0.5) * 220, -120 - G.rnd(6, i, 2) * 50, 13, 8, { fill: '#FFFFFF', lw: 2, seed: 130 + i });
      atext(ctx, 'لب سوري', 0, 20, 48, '#8A4B22', FONT.body);
      ctx.restore(); }
    panel(ctx, dt, [{ k: 'title', text: 'خمسة جنيه بس…', at: 0.3 }, { k: 'sub', text: 'عند بير مسعود… في ميامي', at: 7.0 }, { k: 'sub', text: 'أحلى خروجة في حياتنا', at: 11.3, color: '#B3264C' }, { k: 'sub', text: 'السعادة معاكِ… ما بتتشريش بفلوس', at: 14.8 }], { seed: 5 });
  });
  // 5 TRAIN STATION
  scenes.push((ctx, t, s) => {
    const dt = s.dt;
    sky(ctx, '#3A4A6B', '#B9A6B6');
    for (let i = 0; i < 6; i++) { const x = (i + 0.5) * W / 6; G.rrect(ctx, x - 10, H * 0.12, 20, L.GY - H * 0.12, 4, { fill: '#5A6578', lw: 4, seed: 160 + i }); }
    G.rrect(ctx, -60, H * 0.1, W + 120, 30, 6, { fill: '#5A6578', lw: 4, seed: 167 });
    // board
    const bx = WIDE ? AX(380) : W * 0.78, by = WIDE ? H * 0.3 : H * 0.3;
    G.rrect(ctx, bx - 130, by - 60, 260, 120, 10, { fill: '#1A2233', lw: 5, seed: 168 });
    atext(ctx, 'القاهرة', bx, by - 4, 40, '#FFC24B', FONT.body); atext(ctx, 'رصيف ٣', bx, by + 40, 28, '#FFC24B', FONT.body);
    // the train (behind the platform)
    const tr = ease.inQuad(clamp((dt - 3.0) / 5.5));
    const trX = (WIDE ? AX(60) : AX(-40)) + tr * (W + 1600);
    const ty = L.GY - 170 * L.CS;
    ctx.save(); ctx.translate(trX, ty);
    G.rrect(ctx, -1500, -330 * L.CS, 1560, 330 * L.CS, 40, { fill: '#C8D3E0', lw: 6, seed: 170, hatch: { color: 'rgba(0,0,0,0.08)', gap: 10 } });
    G.rrect(ctx, -1500, -70 * L.CS, 1560, 34 * L.CS, 6, { fill: '#2F5E8C', lw: 4, seed: 171 });
    for (let i = 0; i < 5; i++) G.rrect(ctx, -1440 + i * 290, -280 * L.CS, 200, 130 * L.CS, 16, { fill: '#9CC9F2', lw: 5, seed: 172 + i });
    // Tarek in the last window, waving
    ctx.save(); G.path(ctx, G.rrPts(-1440 + 4 * 290, -280 * L.CS, 200, 130 * L.CS, 16), true); ctx.clip();
    Ch.person(ctx, { x: -1440 + 4 * 290 + 100, y: 60 * L.CS, s: 0.62 * L.CS, pose: 'stand', style: ST.tarek, gesture: 'wave', look: 1, eyes: 'normal', mouth: 'flat', brows: 'worried', shadow: false, seed: 178 });
    ctx.restore();
    ctx.restore();
    // platform
    G.poly(ctx, [[-60, L.GY - 150 * L.CS], [W + 60, L.GY - 150 * L.CS], [W + 60, H + 60], [-60, H + 60]], { fill: '#8E96A3', lw: 5, seed: 180, hatch: { color: 'rgba(0,0,0,0.1)', gap: 9 } });
    G.rrect(ctx, -60, L.GY - 156 * L.CS, W + 120, 16, 4, { fill: '#F2B84B', lw: 3, seed: 181 });
    // before boarding: Tarek with a bag on the platform, then he's gone (in the train)
    const board = fade(dt, 2.2, 0.5);
    if (board < 1) { ctx.save(); ctx.globalAlpha *= 1 - board; Ch.person(ctx, { x: AX(-200), y: L.GY, s: L.CS, pose: 'stand', style: ST.tarek, gesture: 'wave', look: 0.8, mouth: 'flat', brows: 'worried', seed: 182 }); G.rrect(ctx, AX(-200) + 70, L.GY - 120, 90, 80, 12, { fill: '#3C6E71', lw: 4, seed: 183 }); ctx.restore(); }
    // Amira on the platform, crying, waving
    const ax = AX(220);
    Ch.person(ctx, { x: ax, y: L.GY, s: L.CS, pose: 'stand', style: ST.amira, gesture: dt > 2.4 && dt < 7.5 ? 'wave' : null, handL: dt > 2.4 ? [-30, -360] : undefined, look: -0.8, eyes: 'normal', brows: 'worried', mouth: 'wavy', seed: 184 });
    tears(ctx, ax, L.GY, 1, t, fade(dt, 1.8, 0.6), -0.8);
    // 40 days counter
    if (dt > 5.4) { const c = Math.round(lerp(1, 40, ease.inOutCubic(clamp((dt - 5.4) / 2.6)))); }
    const cnt = Math.round(lerp(1, 40, ease.inOutCubic(clamp((dt - 5.4) / 2.6))));
    panel(ctx, dt, [{ k: 'title', text: 'سافرت القاهرة…', at: 0.3 }, { k: 'date', text: '٥ / ٧ / ٢٠١٨', at: 0.9, bg: '#2F5E8C' }, { k: 'big', text: dt > 5.4 ? `${String(cnt).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d])} يوم` : '٤٠ يوم', at: 5.4, color: '#2F5E8C' }, { k: 'sub', text: 'من غير ما نشوف بعض', at: 7.6 }], { seed: 6, accent: '#2F5E8C' });
  });
  // 6 DISTANCE
  scenes.push((ctx, t, s) => {
    const dt = s.dt;
    sky(ctx, '#121836', '#2E3470');
    for (let i = 0; i < 70; i++) { ctx.save(); ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(t * 1.5 + i)); G.ellipse(ctx, G.rnd(8, i, 1) * W, G.rnd(8, i, 2) * H * 0.8, 2.5, 2.5, { fill: '#FFFFFF', lw: 0, seed: i }); ctx.restore(); }
    G.line(ctx, [[AX(0), H * 0.08], [AX(0), H]], { lw: 4, color: 'rgba(255,255,255,0.3)', seed: 190 });
    const ph = (x, name, style, col, a, seed) => {
      if (a <= 0) return; const sc = ease.outBack(a, 2);
      const pw = 300 * L.CS * L.SP + 20, phh = 540 * L.CS, py = L.GY - 380 * L.CS;
      ctx.save(); ctx.translate(x, py); ctx.scale(sc, sc);
      G.rrect(ctx, -pw / 2, -phh / 2, pw, phh, 40, { fill: '#1A1A22', lw: 6, seed });
      G.rrect(ctx, -pw / 2 + 16, -phh / 2 + 26, pw - 32, phh - 52, 24, { fill: col, lw: 3, seed: seed + 1 });
      ctx.save(); G.path(ctx, G.rrPts(-pw / 2 + 16, -phh / 2 + 26, pw - 32, phh - 52, 24), true); ctx.clip();
      Ch.person(ctx, { x: 0, y: phh / 2 + 120 * L.CS, s: 0.78 * L.CS, pose: 'stand', style, gesture: 'wave', eyes: 'happy', mouth: 'grin', shadow: false, seed: seed + 2 });
      ctx.restore();
      atext(ctx, name, 0, -phh / 2 - 26, 40, '#FFE08A', FONT.body);
      ctx.restore();
    };
    ph(AX(-220), 'القاهرة', ST.tarek, '#DDEBF7', fade(dt, 1.8, 0.5), 191);
    ph(AX(220), 'إسكندرية', ST.amira, '#F7E1EA', fade(dt, 2.1, 0.5), 195);
    for (let i = 0; i < 5; i++) { const p = ((dt * 0.6 + i / 5) % 1); if (dt > 2.6) { ctx.save(); ctx.globalAlpha = Math.sin(p * Math.PI); G.heart(ctx, lerp(AX(-80), AX(80), p), L.GY - 420 * L.CS - Math.sin(p * Math.PI) * 50, 1.4, { fill: '#E8718D', seed: 200 + i }); ctx.restore(); } }
    // calendar: 30 days, then 4 days of outings
    const ca = popIn(dt, 4.8, 0.4) * (1 - fade(dt, 7.4, 0.3));
    if (ca > 0) calendar(ctx, AX(0), L.GY - 700 * L.CS, String(Math.max(1, Math.round(clamp((dt - 4.8) / 2.2) * 30))).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]), 'يوم', ca, 205);
    const icons = [[7.8, 'بحر', '#3B82C4'], [8.6, 'كافيه', '#8A5A3B'], [9.4, 'سينما', '#B3264C']];
    icons.forEach(([a, label, col], i) => { const p = popIn(dt, a); if (p <= 0) return; const x = AX((i - 1) * 200), y = L.GY - 700 * L.CS; ctx.save(); ctx.translate(x, y); ctx.scale(p, p); G.ellipse(ctx, 0, 0, 78, 78, { fill: '#FFFFFF', lw: 5, seed: 210 + i }); atext(ctx, label, 0, 14, 36, col, FONT.body); ctx.restore(); });
    panel(ctx, dt, [{ k: 'title', text: 'عمرنا ما بِعِدنا', at: 0.3 }, { k: 'sub', text: 'مكالمة فيديو كل ليلة', at: 2.2 }, { k: 'sub', text: 'وكل شهر… ٤ أيام أجازة', at: 4.6, color: '#B3264C' }], { seed: 7 });
  });
  // 7 KATB EL KETAB
  scenes.push((ctx, t, s) => {
    const dt = s.dt;
    sky(ctx, '#FFF8EE', '#F7E2D0');
    floor(ctx, L.GY - 30, '#D8C3A5', 220);
    // contract on a table
    const px = AX(0), py = L.GY - 640 * L.CS;
    const pa = popIn(dt, 0.3, 0.6);
    if (pa > 0) { ctx.save(); ctx.translate(px, py); ctx.scale(pa * L.CS, pa * L.CS);
      G.rrect(ctx, -300, -180, 600, 360, 14, { fill: '#FFFFFF', lw: 6, seed: 221 });
      atext(ctx, 'وثيقة عقد زواج', 0, -110, 54, '#8C3B4E', FONT.title);
      for (let i = 0; i < 3; i++) G.line(ctx, [[-230, -40 + i * 44], [230 - i * 50, -40 + i * 44]], { lw: 8, color: '#E8DCCF', seed: 222 + i });
      const s1 = clamp((dt - 0.9) / 0.7), s2 = clamp((dt - 1.5) / 0.7);
      const sig = (x0, k, col, seed) => { const pts = []; for (let i = 0; i <= 30 * k; i++) { const u = i / 30; pts.push([x0 + u * 180, 120 + Math.sin(u * 14) * 20 * (1 - u * 0.4)]); } if (pts.length > 1) G.line(ctx, pts, { lw: 5, color: col, seed }); };
      sig(-260, s1, '#2F5E8C', 225); sig(60, s2, '#E8718D', 226);
      ctx.restore(); }
    // the couple at the table
    Ch.person(ctx, { x: AX(-330), y: L.GY, s: L.CS, pose: 'stand', style: ST.tarekEng, look: 0.6, eyes: dt > 1.6 ? 'happy' : 'normal', mouth: 'grin', seed: 227 });
    Ch.person(ctx, { x: AX(330), y: L.GY, s: L.CS, pose: 'stand', style: ST.amiraEng, look: -0.6, eyes: dt > 1.6 ? 'happy' : 'normal', mouth: 'grin', blush: 0.8, seed: 228 });
    // saving jar + months
    const ja = popIn(dt, 2.4);
    if (ja > 0) { const jx = AX(-120), jy = L.GY - 60; ctx.save(); ctx.translate(jx, jy); ctx.scale(ja * L.CS, ja * L.CS);
      G.rrect(ctx, -80, -200, 160, 200, 30, { fill: 'rgba(220,240,250,0.8)', lw: 6, seed: 229 });
      const f = clamp((dt - 2.6) / 3.6); G.rrect(ctx, -72, -8 - 180 * f, 144, 180 * f + 2, 20, { fill: '#F2B84B', lw: 3, seed: 230 });
      G.rrect(ctx, -56, -224, 112, 28, 8, { fill: '#B08968', lw: 5, seed: 231 });
      for (let i = 0; i < 9; i++) { const lp = clamp((dt - 2.6 - i * 0.4) / 0.4); if (lp > 0 && lp < 1) G.ellipse(ctx, (i % 3 - 1) * 26, lerp(-420, -60, lp * lp), 22, 22, { fill: '#F2C94C', lw: 4, seed: 232 + i }); }
      ctx.restore(); }
    if (dt > 2.6) calendar(ctx, AX(130), L.GY - 150 * L.CS, String(Math.max(1, Math.min(9, 1 + Math.floor((dt - 2.6) / 0.4)))).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]), 'شهر', popIn(dt, 2.6) * 0.8 * L.CS, 240);
    panel(ctx, dt, [{ k: 'title', text: 'كتبنا الكتاب', at: 0.3 }, { k: 'date', text: '٢٢ / ٢ / ٢٠١٩', at: 0.8, bg: '#8C3B4E' }, { k: 'sub', text: '٩ شهور… نشتغل ونحوّش', at: 2.6 }, { k: 'sub', text: 'لحد ما جهّزنا عشنا الجميل', at: 4.6, color: '#8C3B4E' }], { seed: 8, accent: '#8C3B4E' });
  });
  // 8 WEDDING
  scenes.push((ctx, t, s) => {
    const dt = s.dt;
    const g = ctx.createRadialGradient(AX(0), L.GY - 400 * L.CS, 50, AX(0), L.GY - 400 * L.CS, Math.max(W, H) * 0.8);
    g.addColorStop(0, '#FFF6EC'); g.addColorStop(0.6, '#F8D3DC'); g.addColorStop(1, '#E39BB0'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    G.rays(ctx, AX(0), L.GY - 420 * L.CS, { n: 28, r0: 300, r1: 1600, color: 'rgba(255,255,255,0.5)', lw: 10, seed: 250, spin: t * 0.05 });
    floor(ctx, L.GY - 30, '#EBC1CC', 251);
    // flower arch drawn on
    const ap = ease.outCubic(fade(dt, 0.3, 1.4)), R = 430 * L.CS * (WIDE ? 1 : 0.95), acx = AX(0), acy = L.GY - 20;
    const n = Math.floor(26 * ap);
    for (let i = 0; i < n; i++) { const a = Math.PI + (i / 25) * Math.PI; const fx = acx + Math.cos(a) * R, fy = acy + Math.sin(a) * R * 1.35; G.ellipse(ctx, fx, fy, 22 + (i % 3) * 6, 22 + (i % 3) * 6, { fill: ['#F27B9A', '#FFFFFF', '#E9476F', '#F9C6D3'][i % 4], lw: 3.5, seed: 252 + i }); G.ellipse(ctx, fx, fy, 7, 7, { fill: '#F2B84B', lw: 2, seed: 280 + i }); }
    const ca = ease.outCubic(fade(dt, 0.4, 1));
    const close = ease.inOutCubic(fade(dt, 4.6, 0.8));
    ctx.save(); ctx.globalAlpha *= ca; ctx.translate(0, (1 - ca) * 100);
    Ch.person(ctx, { x: AX(-110), y: L.GY, s: L.CS, pose: 'stand', style: ST.tarekSuit, look: 0.8, eyes: 'happy', mouth: 'grin', headRot: 0.08 * close, handR: [118, -190], seed: 290 });
    Ch.person(ctx, { x: AX(110), y: L.GY, s: L.CS, pose: 'stand', style: ST.amiraWed, look: -0.8, eyes: 'happy', mouth: 'grin', blush: 0.9, headRot: -0.08 * close, handL: [-118, -190], handR: [40, -210], seed: 291 });
    // bouquet
    for (const [dx, dy, c] of [[-14, 0, '#F27B9A'], [12, -6, '#F9C6D3'], [0, -20, '#E9476F'], [-4, 14, '#FFFFFF']]) G.ellipse(ctx, AX(110) + 40 * L.CS + dx, L.GY - 210 * L.CS + dy, 14, 14, { fill: c, lw: 3, seed: 300 + dx });
    ctx.restore();
    const hp = popIn(dt, 5.4, 0.6);
    if (hp > 0) G.heart(ctx, AX(0), L.GY - 560 * L.CS, 4.4 * hp * (1 + 0.1 * beatPulse(t)), { fill: '#E0506A', seed: 310 });
    if (dt > 0.6) G.confetti(ctx, t, s.t0 + 0.6, { n: 160, seed: 11, spawn: 3 });
    // white flash on the cut
    if (dt < 0.8) { ctx.save(); ctx.globalAlpha = 1 - dt / 0.8; ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    panel(ctx, dt, [{ k: 'title', text: 'أحلى يوم في عمري', at: 0.8 }, { k: 'big', text: '٢٦ / ١١ / ٢٠١٩', at: 1.8, color: '#A8711C' }, { k: 'sub', text: 'يوم ما بقيتِ مراتي', at: 3.6, color: '#B3264C' }], { seed: 9 });
  });
  // 9 SHARM
  scenes.push((ctx, t, s) => {
    const dt = s.dt;
    sky(ctx, '#7EC8F0', '#FFE9C9', L.GY - 300 * L.CS);
    G.ellipse(ctx, WIDE ? AX(380) : W * 0.8, H * 0.18, 80, 80, { fill: '#FFD34D', lw: 5, seed: 320 });
    const hor = L.GY - 380 * L.CS;
    G.poly(ctx, [[-60, hor], [W * 0.12, hor - 160], [W * 0.25, hor - 60], [W * 0.42, hor - 220], [W * 0.6, hor - 80], [W * 0.78, hor - 190], [W + 60, hor - 40], [W + 60, hor], [-60, hor]], { fill: '#C9713F', lw: 5, seed: 321, hatch: { color: 'rgba(0,0,0,0.15)', gap: 8 } });
    G.poly(ctx, [[-60, hor], [W + 60, hor], [W + 60, L.GY - 150 * L.CS], [-60, L.GY - 150 * L.CS]], { fill: '#1FB3C2', lw: 5, seed: 322, hatch: { color: 'rgba(255,255,255,0.2)', gap: 12, angle: 0 } });
    for (let i = 0; i < 3; i++) { const p = ((dt * 0.45 + i / 3) % 1); const x = AX(-400 + i * 330), y = hor + 90 - Math.sin(p * Math.PI) * 150; ctx.save(); ctx.translate(x, y); ctx.rotate(lerp(-0.8, 0.8, p)); G.ellipse(ctx, 0, 0, 34, 16, { fill: ['#FF8C42', '#FFD34D', '#F27B9A'][i], lw: 4, seed: 323 + i }); G.poly(ctx, [[30, 0], [50, -14], [50, 14]], { fill: ['#FF8C42', '#FFD34D', '#F27B9A'][i], lw: 4, seed: 326 + i }); ctx.restore(); }
    G.poly(ctx, [[-60, L.GY - 160 * L.CS], [W + 60, L.GY - 140 * L.CS], [W + 60, H + 60], [-60, H + 60]], { fill: '#F3D9A4', lw: 5, seed: 330, hatch: { color: 'rgba(150,110,60,0.15)', gap: 9 } });
    // palm
    const pxx = WIDE ? AX(-430) : W * 0.12;
    G.limb(ctx, [[pxx, L.GY - 40], [pxx + 10, L.GY - 260], [pxx + 40, L.GY - 480]], { color: '#8A5A3B', lw: 26, outline: 4, seed: 331 });
    for (let k = 0; k < 5; k++) { const a = -2.6 + k * 0.55 + Math.sin(t + k) * 0.05; G.limb(ctx, [[pxx + 40, L.GY - 480], [pxx + 40 + Math.cos(a) * 90, L.GY - 480 + Math.sin(a) * 60], [pxx + 40 + Math.cos(a) * 190, L.GY - 440 + Math.sin(a) * 50]], { color: '#3F9E5B', lw: 22, outline: 4, seed: 332 + k }); }
    const bob = Math.abs(Math.sin(dt * 3.5)) * 6;
    Ch.person(ctx, { x: AX(-110), y: L.GY - bob, s: L.CS, pose: 'stand', style: ST.tarek, look: 0.8, eyes: 'happy', mouth: 'grin', handR: [118, -190], seed: 340 });
    Ch.person(ctx, { x: AX(110), y: L.GY, s: L.CS, pose: 'stand', style: ST.amiraBeach, look: -0.8, eyes: 'happy', mouth: 'grin', blush: 0.7, handL: [-118, -190], gesture: 'wave', seed: 341 });
    heartsUp(ctx, dt, 2.4, AX(-200), AX(200), L.GY - 900 * L.CS, L.GY - 500 * L.CS, 10, 9);
    panel(ctx, dt, [{ k: 'title', text: 'شهر العسل… شرم الشيخ', at: 0.3 }, { k: 'date', text: '٢٩ / ١١ / ٢٠١٩', at: 0.9, bg: '#1F8FA0' }, { k: 'sub', text: 'بحر… وشمس… وإنتِ', at: 2.6 }], { seed: 10, accent: '#1F7A8C' });
  });
  // 10 CORONA
  scenes.push((ctx, t, s) => {
    const dt = s.dt;
    sky(ctx, '#FCEFE3', '#F4D9C2');
    const wx = AX(-300), wy = L.GY - 760 * L.CS, ww = 360 * L.SP, wh = 300 * L.CS;
    G.rrect(ctx, wx - ww / 2, wy, ww, wh, 14, { fill: '#9ED3F0', lw: 6, seed: 350 });
    ctx.save(); G.path(ctx, G.rrPts(wx - ww / 2, wy, ww, wh, 14), true); ctx.clip();
    for (let i = 0; i < 6; i++) { const vx = wx - ww / 2 + 40 + G.rnd(3, i, 1) * (ww - 80) + Math.sin(t * 0.8 + i) * 20, vy = wy + 40 + G.rnd(3, i, 2) * (wh - 80) + Math.cos(t * 0.7 + i) * 16, r = 20 + (i % 3) * 7;
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + t * 0.6; G.line(ctx, [[vx + Math.cos(a) * r, vy + Math.sin(a) * r], [vx + Math.cos(a) * (r + 12), vy + Math.sin(a) * (r + 12)]], { lw: 4, color: '#5DAA4C', seed: 360 + k }); }
      G.ellipse(ctx, vx, vy, r, r, { fill: '#7DCB6A', lw: 4, seed: 370 + i }); G.ellipse(ctx, vx - 6, vy - 3, 3, 3, { fill: '#2A2320', lw: 0, seed: 1 }); G.ellipse(ctx, vx + 6, vy - 3, 3, 3, { fill: '#2A2320', lw: 0, seed: 2 }); }
    ctx.restore();
    G.line(ctx, [[wx, wy], [wx, wy + wh]], { lw: 8, color: '#FFFFFF', seed: 380 }); G.line(ctx, [[wx - ww / 2, wy + wh / 2], [wx + ww / 2, wy + wh / 2]], { lw: 8, color: '#FFFFFF', seed: 381 });
    floor(ctx, L.GY - 30, '#C8A27A', 382);
    // couch + couple on it, close together
    const sy = L.GY - 150 * L.CS;
    G.rrect(ctx, AX(-330), sy - 280 * L.CS, AX(330) - AX(-330), 210 * L.CS, 50, { fill: '#1E9E96', lw: 6, seed: 383, hatch: { color: 'rgba(0,0,0,0.12)', gap: 9 } });
    const close = ease.inOutCubic(fade(dt, 7.8, 0.6));
    Ch.person(ctx, { x: AX(-110), y: sy, s: L.CS, pose: 'sit', style: ST.tarek, look: 0.7, eyes: dt > 8 ? 'happy' : 'normal', mouth: 'grin', headRot: 0.1 * close, gesture: 'phone', seed: 384 });
    Ch.person(ctx, { x: AX(110), y: sy, s: L.CS, pose: 'sit', style: ST.amira, look: -0.7, eyes: dt > 8 ? 'happy' : 'normal', mouth: 'grin', blush: 0.7, headRot: -0.12 * close, seed: 385 });
    G.rrect(ctx, AX(-350), sy - 20 * L.CS, AX(350) - AX(-350), 90 * L.CS, 30, { fill: '#2BB3A9', lw: 6, seed: 386 });
    // Cairo job case sliding away, Alexandria pin dropping
    const ca = popIn(dt, 3.4) * (1 - fade(dt, 5.4, 0.4));
    if (ca > 0) { const x = (WIDE ? AX(330) : W * 0.78) + ease.inQuad(fade(dt, 5.0, 0.8)) * 600, y = L.GY - 620 * L.CS; ctx.save(); ctx.translate(x, y); ctx.scale(ca, ca);
      G.rrect(ctx, -90, -60, 180, 120, 14, { fill: '#7A4A2A', lw: 5, seed: 387 }); G.rrect(ctx, -30, -84, 60, 28, 10, { fill: 'rgba(0,0,0,0)', lw: 7, seed: 388 });
      ctx.rotate(-0.12); G.rrect(ctx, -86, -26, 172, 52, 10, { fill: '#E9476F', lw: 4, seed: 389 }); atext(ctx, 'شغل القاهرة ✕', 0, 14, 30, '#FFFFFF', FONT.body); ctx.restore(); }
    const pa = popIn(dt, 5.6);
    if (pa > 0) { const x = WIDE ? AX(330) : W * 0.78, y = L.GY - 640 * L.CS; ctx.save(); ctx.translate(x, y); ctx.scale(pa, pa);
      G.poly(ctx, [[0, 70], [-50, 0], [-40, -50], [0, -70], [40, -50], [50, 0]], { fill: '#E9476F', lw: 5, seed: 390 }); G.ellipse(ctx, 0, -18, 18, 18, { fill: '#FFFFFF', lw: 3, seed: 391 });
      atext(ctx, 'إسكندرية', 0, 130, 40, '#2F3E5C', FONT.body); ctx.restore(); }
    const hp = popIn(dt, 8.4, 0.6);
    if (hp > 0) G.heart(ctx, AX(0), sy - 470 * L.CS, 3.6 * hp * (1 + 0.1 * beatPulse(t)), { fill: '#E0506A', seed: 392 });
    panel(ctx, dt, [{ k: 'title', text: 'وجت كورونا…', at: 0.3 }, { k: 'date', text: '٢٠٢٠', at: 0.9, bg: '#2F3E5C' }, { k: 'sub', text: 'واستقرينا في عشنا في إسكندرية', at: 5.6 }, { k: 'sub', text: 'والحظر… جمعنا ♥', at: 8.4, color: '#B3264C' }], { seed: 11, accent: '#2F3E5C' });
  });
  // 11 ZEYAD
  scenes.push((ctx, t, s) => {
    const dt = s.dt;
    sky(ctx, '#CFE8FF', '#FFE4EC');
    hill(ctx, L.GY - 40, 50, '#BFE3B5', 400);
    const sf = clamp((dt - 0.2) / 0.7);
    if (sf < 1.3 && dt > 0.2) { const y = lerp(-80, L.GY - 450 * L.CS, ease.inQuad(clamp(sf))); ctx.save(); ctx.globalAlpha = 1 - clamp((dt - 0.9) / 0.4); G.star(ctx, AX(0), y, 50 + 40 * clamp((dt - 0.9) / 0.4), { fill: '#FFE08A', rot: t * 3, seed: 401 }); ctx.restore(); }
    Ch.person(ctx, { x: AX(-150), y: L.GY, s: L.CS, pose: 'stand', style: ST.tarek, look: 0.8, eyes: 'happy', mouth: 'grin', handR: [90, -230], seed: 402 });
    Ch.person(ctx, { x: AX(110), y: L.GY, s: L.CS, pose: 'stand', style: ST.amira, look: -0.2, lookY: 0.6, eyes: 'happy', mouth: 'smile', blush: 0.7, handL: [-30, -230], handR: [30, -230], seed: 403 });
    baby(ctx, AX(110), L.GY - 245 * L.CS, L.CS, '#9CC9F2', 404);
    heartsUp(ctx, dt, 1.2, AX(-250), AX(250), L.GY - 900 * L.CS, L.GY - 450 * L.CS, 12, 11, ['#9CC9F2', '#F2B84B', '#FFFFFF']);
    panel(ctx, dt, [{ k: 'sub', text: 'وربنا كرمنا بـ', at: 0.1 }, { k: 'big', text: 'زيدو', at: 1.0, color: '#2F5E8C' }, { k: 'date', text: '٢ / ٥ / ٢٠٢١', at: 1.8, bg: '#2F5E8C' }], { seed: 12, accent: '#2F5E8C' });
  });
  // 12 SURGERY
  scenes.push((ctx, t, s) => {
    const dt = s.dt;
    sky(ctx, '#EEF3F8', '#F6E3E8');
    floor(ctx, L.GY - 30, '#D8C7B5', 410);
    const stand = ease.inOutCubic(fade(dt, 9.0, 0.8));
    const tx = AX(-140), crO = 1 - fade(dt, 9.0, 0.3);
    // Tarek leaning on crutches, knee wrapped
    const sway = Math.sin(dt * 2) * 4 * (1 - stand);
    Ch.person(ctx, { x: tx + sway, y: L.GY - Math.sin(clamp((dt - 9) / 0.6) * Math.PI) * 40, s: L.CS, pose: 'stand', style: ST.tarek, look: 0.7, eyes: stand > 0.5 ? 'happy' : 'normal', mouth: stand > 0.5 ? 'grin' : dt > 5.5 ? 'smile' : 'flat', brows: stand > 0.5 ? 'up' : 'worried', handL: stand < 0.5 ? [-110, -170] : undefined, handR: stand < 0.5 ? [110, -170] : undefined, gesture: stand > 0.5 ? 'cheer' : null, legBend: 0, seed: 411 });
    // knee bandage
    G.rrect(ctx, tx + sway + 18 * L.CS, L.GY - 110 * L.CS, 50 * L.CS, 44 * L.CS, 10, { fill: '#FFFFFF', lw: 3.5, seed: 412 });
    if (crO > 0) { ctx.save(); ctx.globalAlpha *= crO; const fly = ease.inQuad(fade(dt, 9.0, 1.0));
      crutch(ctx, tx + sway - 120 * L.CS - fly * 500, L.GY - 300 * L.CS, L.GY, -0.05 - fly * 1.5, 413);
      crutch(ctx, tx + sway + 120 * L.CS + fly * 500, L.GY - 300 * L.CS, L.GY, 0.05 + fly * 1.5, 417); ctx.restore(); }
    // Amira caring: a tray with soup
    const ax = AX(190);
    Ch.person(ctx, { x: ax, y: L.GY, s: L.CS, pose: 'stand', style: ST.amira, look: -0.8, eyes: stand > 0.5 ? 'happy' : 'normal', mouth: stand > 0.5 ? 'grin' : 'smile', brows: stand > 0.5 ? 'up' : 'worried', handL: stand < 0.5 ? [-60, -220] : undefined, handR: stand < 0.5 ? [40, -220] : undefined, gesture: stand > 0.5 ? 'clap' : null, seed: 420 });
    if (stand < 0.5) { const yy = L.GY - 230 * L.CS; G.rrect(ctx, ax - 90 * L.CS, yy, 160 * L.CS, 14, 7, { fill: '#C99A62', lw: 4, seed: 421 }); G.poly(ctx, [[ax - 50 * L.CS, yy], [ax + 30 * L.CS, yy], [ax + 20 * L.CS, yy - 36], [ax - 40 * L.CS, yy - 36]], { fill: '#FFFFFF', lw: 4, seed: 422 });
      for (let k = 0; k < 3; k++) { const pts = []; for (let j = 0; j < 6; j++) pts.push([ax - 30 + k * 20 + Math.sin(t * 3 + j + k) * 6, yy - 46 - j * 12]); ctx.save(); ctx.globalAlpha = 0.6; G.line(ctx, pts, { lw: 4, color: '#FFFFFF', seed: 423 + k }); ctx.restore(); } }
    // months on a calendar
    const ca = popIn(dt, 3.0, 0.4) * (1 - fade(dt, 8.6, 0.4));
    if (ca > 0) calendar(ctx, WIDE ? AX(420) : W * 0.8, WIDE ? H * 0.2 : H * 0.36, String(Math.max(1, Math.min(3, 1 + Math.floor((dt - 3.0) / 1.2)))).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]), 'شهر', ca, 430);
    heartsUp(ctx, dt, 9.4, AX(-300), AX(300), L.GY - 900 * L.CS, L.GY - 400 * L.CS, 14, 12);
    panel(ctx, dt, [{ k: 'date', text: '٢٣ / ٣ / ٢٠٢٣', at: 0.4, bg: '#2F3E5C' }, { k: 'sub', text: '٣ شهور على العكازات', at: 2.8 }, { k: 'title', text: 'وإنتِ كنتِ سندي', at: 5.4 }, { k: 'sub', text: 'لحد ما وقفت على رجلي تاني', at: 8.8, color: '#B3264C' }], { seed: 13 });
  });
  // 13 NOW
  scenes.push((ctx, t, s) => {
    const dt = s.dt;
    sky(ctx, '#FFF4E6', '#FFE0EA');
    hill(ctx, L.GY - 40, 40, '#A9D6A0', 440);
    // school (from 3.6), kitchen corner (from 7.6)
    const sa = popIn(dt, 3.6, 0.5);
    if (sa > 0) { const x = WIDE ? AX(380) : W * 0.8, y = L.GY - 60; ctx.save(); ctx.translate(x, y); ctx.scale(sa * L.CS * 0.85, sa * L.CS * 0.85);
      G.rrect(ctx, -180, -300, 360, 300, 6, { fill: '#F7E6C4', lw: 6, seed: 441 }); G.poly(ctx, [[-210, -300], [0, -430], [210, -300]], { fill: '#D9534F', lw: 6, seed: 442 });
      G.rrect(ctx, -40, -140, 80, 140, 10, { fill: '#8A5A3B', lw: 5, seed: 443 }); for (const x2 of [-120, 120]) G.rrect(ctx, x2 - 40, -250, 80, 70, 6, { fill: '#9CC9F2', lw: 4, seed: 444 + x2 });
      G.rrect(ctx, -110, -400, 220, 56, 10, { fill: '#FFFFFF', lw: 4, seed: 446 }); atext(ctx, 'المدرسة', 0, -360, 34, '#2E9E6B', FONT.body); ctx.restore(); }
    // Tarek: apron + spoon (cooking) -> dishes -> walks Zeyad to school
    const walk = dt > 11.2;
    const wk = ease.inOutCubic(clamp((dt - 11.2) / 2.4));
    const txx = AX(-300) + wk * 180 * L.SP, zx = AX(-120) + wk * 140 * L.SP;
    Ch.person(ctx, { x: txx, y: L.GY, s: L.CS, pose: walk && wk < 1 ? 'walk' : 'stand', walk: (dt * 1.6) % 1, style: ST.tarek, look: 0.6, eyes: 'happy', mouth: 'grin', handR: !walk && dt > 7.8 ? [80 + Math.sin(dt * 7) * 20, -260] : walk ? [110, -170] : undefined, seed: 450 });
    // apron over him
    G.line(ctx, [[txx - 30 * L.CS, L.GY - 330 * L.CS], [txx, L.GY - 300 * L.CS], [txx + 30 * L.CS, L.GY - 330 * L.CS]], { lw: 5, color: '#E8718D', seed: 452 });
    G.poly(ctx, [[txx - 34 * L.CS, L.GY - 300 * L.CS], [txx + 34 * L.CS, L.GY - 300 * L.CS], [txx + 50 * L.CS, L.GY - 230 * L.CS], [txx + 56 * L.CS, L.GY - 120 * L.CS], [txx - 56 * L.CS, L.GY - 120 * L.CS], [txx - 50 * L.CS, L.GY - 230 * L.CS]], { fill: '#F7B6C6', lw: 4, seed: 451, hatch: { color: 'rgba(233,71,111,0.25)', gap: 9 } });
    G.rrect(ctx, txx - 26 * L.CS, L.GY - 200 * L.CS, 52 * L.CS, 36 * L.CS, 6, { fill: '#F48FAE', lw: 3, seed: 459 });
    G.heart(ctx, txx, L.GY - 252 * L.CS, 0.9, { fill: '#E0506A', seed: 458 });
    // pot with steam, then dishes with bubbles (before walking)
    if (dt > 7.8 && dt < 11.4) { const x = txx + 210 * L.CS, y = L.GY - 210 * L.CS, k = popIn(dt, 7.8) * (1 - fade(dt, 11.0, 0.4)); ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
      if (dt < 9.6) { G.poly(ctx, [[-70, -40], [70, -40], [60, 40], [-60, 40]], { fill: '#55535E', lw: 5, seed: 452 }); for (let i = 0; i < 3; i++) { const pts = []; for (let j = 0; j < 6; j++) pts.push([(i - 1) * 30 + Math.sin(t * 3 + j + i) * 7, -50 - j * 14]); ctx.save(); ctx.globalAlpha = 0.7; G.line(ctx, pts, { lw: 5, color: '#FFFFFF', seed: 453 + i }); ctx.restore(); } }
      else { G.ellipse(ctx, 0, 0, 80, 26, { fill: '#FFFFFF', lw: 5, seed: 456 }); for (let i = 0; i < 6; i++) { const p = ((dt * 0.8 + i / 6) % 1); ctx.save(); ctx.globalAlpha = Math.sin(p * Math.PI); G.ellipse(ctx, (i - 2.5) * 24, -p * 100, 10 + (i % 3) * 5, 10 + (i % 3) * 5, { fill: '#DDF3FF', lw: 2, seed: 457 + i }); ctx.restore(); } }
      ctx.restore(); }
    // Zeyad in uniform with a school bag, jumping at the news
    const jump = dt < 3.4 ? Math.abs(Math.sin(dt * 5)) * 30 * clamp((dt - 1.0) / 0.3) : 0;
    Ch.person(ctx, { x: zx, y: L.GY - jump, s: L.CS * 0.66, pose: walk && wk < 1 ? 'walk' : 'stand', walk: (dt * 1.6 + 0.5) % 1, style: ST.zeyad, eyes: 'happy', mouth: 'grin', look: 0.6, gesture: dt < 3.4 && dt > 1 ? 'cheer' : null, seed: 460 });
    G.rrect(ctx, zx + 60 * L.CS * 0.66, L.GY - 260 * L.CS * 0.66 - jump, 70 * L.CS * 0.66, 100 * L.CS * 0.66, 14, { fill: '#3C6E71', lw: 4, seed: 461 });
    // Amira, glowing with the baby on the way
    const ax = WIDE ? AX(140) : AX(240);
    Ch.person(ctx, { x: ax, y: L.GY, s: L.CS, pose: 'stand', style: ST.amira, look: -0.6, eyes: 'happy', mouth: 'grin', blush: 0.8, handL: [-30, -200], handR: [30, -200], seed: 470 });
    const ga = popIn(dt, 0.6, 0.6);
    if (ga > 0) { const gy = L.GY - 190 * L.CS; ctx.save(); const gg = ctx.createRadialGradient(ax, gy, 0, ax, gy, 110 * L.CS); gg.addColorStop(0, 'rgba(255,227,160,0.75)'); gg.addColorStop(1, 'rgba(255,227,160,0)'); ctx.fillStyle = gg; ctx.globalAlpha *= ga; ctx.fillRect(ax - 120 * L.CS, gy - 120 * L.CS, 240 * L.CS, 240 * L.CS); ctx.restore(); G.heart(ctx, ax, gy, 2.2 * ga * (1 + 0.12 * beatPulse(t)), { fill: '#F27B9A', seed: 471 }); }
    heartsUp(ctx, dt, 13.8, AX(-350), AX(350), L.GY - 900 * L.CS, L.GY - 400 * L.CS, 12, 13);
    panel(ctx, dt, [{ k: 'title', text: 'بيبي جديد في الطريق', at: 0.3 }, { k: 'date', text: '١٣ / ٩ / ٢٠٢٦', at: 3.6, bg: '#2E9E6B' }, { k: 'sub', text: 'زيدو دخل المدرسة', at: 3.8, color: '#2E9E6B' }, { k: 'sub', text: 'والدور عليّا… وبكل حب ♥', at: 7.4, color: '#B3264C' }], { seed: 14 });
  });
  // 14 FINALE
  scenes.push((ctx, t, s) => {
    const dt = s.dt;
    sky(ctx, '#1E2347', '#F29E72');
    G.rays(ctx, AX(0), L.GY - 400 * L.CS, { n: 30, r0: 260, r1: 1800, color: 'rgba(255,220,180,0.25)', lw: 14, seed: 480, spin: t * 0.04 });
    const hb = popIn(dt, 0.2, 0.9);
    if (hb > 0) { ctx.save(); ctx.globalAlpha = 0.85; G.heart(ctx, AX(0), L.GY - 470 * L.CS, 22 * hb * L.CS * (1 + 0.04 * beatPulse(t)), { fill: '#F7B6C6', seed: 481 }); ctx.restore(); }
    // fireworks of hearts
    for (let k = 0; k < 6; k++) { const a = 1.8 + k * 0.9, lp = dt - a; if (lp < 0 || lp > 1.6) continue; const cx = AX([-380, 380, 0, -250, 250, 0][k]), cy = H * [0.2, 0.18, 0.12, 0.3, 0.28, 0.22][k];
      for (let j = 0; j < 10; j++) { const ang = j / 10 * Math.PI * 2, r = ease.outCubic(clamp(lp / 1.2)) * 170; ctx.save(); ctx.globalAlpha = 1 - clamp(lp / 1.6); G.heart(ctx, cx + Math.cos(ang) * r, cy + Math.sin(ang) * r + lp * lp * 40, 1.1, { fill: ['#FFE08A', '#F27B9A', '#9EE0D8'][j % 3], seed: 490 + j }); ctx.restore(); } }
    floor(ctx, L.GY - 20, '#5A2D4E', 495);
    const ent = (a, dx) => { const p = ease.outCubic(fade(dt, a, 0.6)); return [p, (1 - p) * dx]; };
    const [p1, d1] = ent(0.4, -300), [p2, d2] = ent(0.8, -300), [p3, d3] = ent(1.2, 300);
    const close = ease.inOutCubic(fade(dt, 3.0, 0.8));
    ctx.save(); ctx.globalAlpha *= p1; Ch.person(ctx, { x: AX(-210) + d1, y: L.GY, s: L.CS, pose: 'stand', style: ST.tarek, look: 0.7, eyes: 'happy', mouth: 'grin', headRot: 0.08 * close, handR: [100, -150], seed: 500 }); ctx.restore();
    ctx.save(); ctx.globalAlpha *= p3; const ax = AX(210) + d3; Ch.person(ctx, { x: ax, y: L.GY, s: L.CS, pose: 'stand', style: ST.amira, look: -0.7, eyes: 'happy', mouth: 'grin', blush: 0.8, headRot: -0.08 * close, handL: [-100, -150], seed: 501 }); ctx.restore();
    ctx.save(); ctx.globalAlpha *= p2; Ch.person(ctx, { x: AX(0) + d2, y: L.GY, s: L.CS * 0.66, pose: 'stand', style: ST.zeyad, eyes: 'happy', mouth: 'grin', gesture: 'cheer', seed: 502 }); ctx.restore();
    const ga = popIn(dt, 1.8, 0.5);
    if (ga > 0) G.heart(ctx, ax, L.GY - 190 * L.CS, 2.0 * ga * (1 + 0.12 * beatPulse(t)), { fill: '#F27B9A', seed: 503 });
    heartsUp(ctx, dt, 1.6, 0, W, 0, H, 18, 14, ['#FFE08A', '#F27B9A', '#FFFFFF']);
    panel(ctx, dt, [{ k: 'big', text: '١٠ سنين حب', at: 2.0 }, { k: 'title', text: 'و٧ سنين جواز', at: 3.0 }, { k: 'sub', text: 'ولسه بحبك أكتر من أول يوم', at: 4.2, color: '#B3264C' }, { k: 'sub', text: 'طارق • أميرة • زيدو • والبيبي الجاي', at: 5.4, color: '#7A5A6A' }], { seed: 15 });
  });
  // 15 OUTRO
  scenes.push((ctx, t, s) => {
    const dt = s.dt;
    sky(ctx, '#21304F', '#5B3F6E');
    for (let i = 0; i < 60; i++) { ctx.save(); ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(t * 1.5 + i)); G.star(ctx, G.rnd(17, i, 1) * W, G.rnd(17, i, 2) * H, 4 + G.rnd(17, i, 3) * 6, { fill: '#FFF1D2', seed: i }); ctx.restore(); }
    heartsUp(ctx, dt, 1.0, 0, W, 0, H, 16, 15);
    // centred note
    const save = { ...L };
    L.TX = W / 2; L.TW = WIDE ? W * 0.5 : W * 0.82; L.TY = WIDE ? H * 0.2 : H * 0.28;
    panel(ctx, dt, [{ k: 'title', text: 'كل سنة وإنتِ حبيبتي', at: 0.4 }, { k: 'sub', text: 'يا أميرة… كل سنة وإنتِ عمري', at: 2.0, color: '#B3264C' }, { k: 'sub', text: 'Happy 7th Anniversary', at: 4.2, color: '#C9952F' }, { k: 'sub', text: 'مع كل حبي… طارق ♥', at: 5.6 }, { k: 'date', text: '٢٦ / ١١ / ٢٠١٩  —  ٢٦ / ١١ / ٢٠٢٦', at: 6.6 }], { seed: 16 });
    Object.assign(L, save);
  });

  // ---------- assemble ----------
  const ins = ['cut', 'paper', 'fade', 'fade', 'paper', { type: 'dip', color: '#1A1A2A', dur: 0.8 }, 'fade', 'paper', 'flash', 'fade', 'fade', { type: 'iris', color: '#FFE08A' }, 'fade', 'paper', { type: 'flash', dur: 0.6 }, { type: 'dip', color: '#21304F', dur: 1.2 }];
  const film = Shots.film(scenes.map((draw, i) => ({ at: CUT[i], draw, in: ins[i], cam: Shots.push(1, i === 0 || i === 15 ? 1.0 : 1.05) })), { end: SC.DURATION });
  Studio.film({
    async init() { await Studio.loadFont('Aref Ruqaa', 'assets/ArefRuqaa.woff2', '700'); await Studio.loadFont('Cairo', 'assets/Cairo.woff2', '700'); },
    draw: film,
    post: { paper: 0.4, vignette: 0.3, grain: 0.05 },
    fadeOut: 2.0,
  });
})();
