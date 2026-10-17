(function () {
  const { KIT_TYPES, loadClubs, color } = window.KitStudio;
  const W = 1080, H = 1920;
  const $ = id => document.getElementById(id);

  const state = {
    data: null,
    club: null,
    layout: 'stacked',
    heroKit: 'home',
    swipeKit: 'home',
    primary: '#888888',
    secondary: '#ffffff',
    images: { home: null, away: null, third: null }
  };
  let pendingKit = null;

  // ---------- colors ----------
  function palette() {
    const p = state.primary, s = state.secondary;
    const lp = color.luminance(p), ls = color.luminance(s);
    // Accent must read on a near-black background; avoid near-black and pure white when a real color exists.
    let accent = [p, s].find(c => { const l = color.luminance(c); return l > 0.1 && l < 0.95; });
    if (!accent) accent = lp >= ls ? p : s;
    const base = lp > 0.9 ? s : p;
    const other = base === p ? s : p;
    return {
      accent,
      accentInk: color.luminance(accent) > 0.45 ? '#0b0b0f' : '#ffffff',
      base,
      other,
      bg: 'linear-gradient(160deg, ' + color.mix(base, '#000000', 0.3) + ' 0%, ' + color.mix(base, '#060608', 0.78) + ' 40%, #060608 66%, ' + color.mix(other, '#060608', 0.72) + ' 100%)'
    };
  }

  // ---------- arrows (inline SVG, colors as attributes so html2canvas keeps them) ----------
  function arrowSvg(dir, stroke, w) {
    if (dir === 'up') {
      const h = w;
      return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M20 140 C 30 80, 70 40, 140 25 M140 25 l-29 -9 M140 25 l-22 20" fill="none" stroke="' + stroke + '" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }
    const h = Math.round(w * 100 / 220);
    const g = dir === 'left' ? ' transform="translate(220,0) scale(-1,1)"' : '';
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 220 100" xmlns="http://www.w3.org/2000/svg"><g' + g + '>' +
      '<path d="M10 70 C 60 15, 140 10, 205 45 M205 45 l-16 -25 M205 45 l-30 1" fill="none" stroke="' + stroke + '" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></g></svg>';
  }

  // ---------- layouts ----------
  // Each slot: kit, panel rect, label placement ('left' | 'right' = beside the panel, 'inside' = overlaid bottom-left).
  function slots() {
    if (state.layout === 'stacked') {
      return KIT_TYPES.map((k, i) => {
        const even = i % 2 === 0;
        return { kit: k, x: even ? 70 : 360, y: 410 + i * 450, w: 650, h: 410, label: even ? 'right' : 'left', size: 104 };
      });
    }
    if (state.layout === 'hero') {
      const rest = KIT_TYPES.filter(k => k !== state.heroKit);
      return [
        { kit: state.heroKit, x: 70, y: 410, w: 940, h: 860, label: 'inside', size: 120 },
        { kit: rest[0], x: 70, y: 1300, w: 455, h: 420, label: 'inside', size: 76 },
        { kit: rest[1], x: 555, y: 1300, w: 455, h: 420, label: 'inside', size: 76 }
      ];
    }
    return [{ kit: state.swipeKit, x: 70, y: 410, w: 940, h: 1240, label: 'inside', size: 130 }];
  }

  // cover-fit with zoom + focal point, in explicit px (html2canvas-safe)
  function bgFor(img, w, h) {
    const s = Math.max(w / img.iw, h / img.ih) * img.zoom / 100;
    const bw = img.iw * s, bh = img.ih * s;
    return {
      size: bw.toFixed(1) + 'px ' + bh.toFixed(1) + 'px',
      pos: ((w - bw) * img.fx / 100).toFixed(1) + 'px ' + ((h - bh) * img.fy / 100).toFixed(1) + 'px'
    };
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
  }

  function labelHtml(slot, pal) {
    const text = esc($('lbl-' + slot.kit).value || slot.kit.toUpperCase());
    const arrows = $('arrows').checked;
    const name = '<div class="kitname" style="font-size:' + slot.size + 'px">' + text + '</div>';
    if (slot.label === 'inside') {
      const aw = Math.round(slot.size * 1.15);
      return '<div class="abs label txt" style="left:' + (slot.x + 44) + 'px;top:' + (slot.y + slot.h - 44 - slot.size - 24 - (arrows ? aw + 8 : 0)) + 'px;align-items:flex-start">' +
        (arrows ? '<div style="margin:0 0 8px ' + Math.round(slot.size * 0.25) + 'px">' + arrowSvg('up', pal.accent, aw) + '</div>' : '') +
        name + '<div class="bar" style="width:' + Math.round(slot.size * 1.1) + 'px;background:' + pal.accent + '"></div></div>';
    }
    const right = slot.label === 'right';
    const lx = right ? slot.x + slot.w + 22 : 70;
    const lw = right ? W - 70 - lx + 30 : slot.x - 22 - 70;
    return '<div class="abs label txt" style="left:' + lx + 'px;top:' + slot.y + 'px;width:' + lw + 'px;height:' + slot.h + 'px;align-items:' + (right ? 'flex-start' : 'flex-end') + '">' +
      (arrows ? '<div style="margin-bottom:10px">' + arrowSvg(right ? 'left' : 'right', pal.accent, 190) + '</div>' : '') +
      name + '<div class="bar" style="width:120px;background:' + pal.accent + '"></div></div>';
  }

  function panelHtml(slot, pal) {
    const img = state.images[slot.kit];
    let inner = '';
    if (img) {
      const b = bgFor(img, slot.w, slot.h);
      inner += '<div class="abs img" style="width:' + slot.w + 'px;height:' + slot.h + 'px;background-image:url(' + img.src + ');background-size:' + b.size + ';background-position:' + b.pos + '"></div>';
    } else {
      inner += '<div class="abs ph txt">+ ' + slot.kit.toUpperCase() + ' IMAGE</div>';
    }
    if (slot.label === 'inside') {
      inner += '<div class="abs shade" style="height:' + Math.round(slot.h * 0.5) + 'px;background:linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,.7) 100%)"></div>';
    }
    inner += '<div class="abs frame" style="width:' + slot.w + 'px;height:' + slot.h + 'px;border:' + (img ? '4px solid ' + color.rgba('#ffffff', 0.14) : '4px dashed ' + color.rgba('#ffffff', 0.22)) + '"></div>';
    return '<div class="abs panel" data-kit="' + slot.kit + '" style="left:' + slot.x + 'px;top:' + slot.y + 'px;width:' + slot.w + 'px;height:' + slot.h + 'px;background:' + (img ? '#111' : color.rgba(pal.base, 0.12)) + '">' + inner + '</div>';
  }

  function render() {
    if (!state.club) return;
    const pal = palette();
    const stage = $('stage');
    const sl = slots();
    let html = '';
    html += '<div class="abs bg" style="background:' + pal.bg + '"></div>';
    html += '<div class="abs band" style="top:1180px;height:300px;background:' + color.rgba(pal.base, 0.22) + '"></div>';
    html += '<div class="abs band" style="top:1520px;height:16px;background:' + color.rgba(pal.accent, 0.55) + '"></div>';
    html += '<div class="abs band" style="top:330px;height:10px;background:' + color.rgba(pal.other, 0.35) + '"></div>';

    sl.forEach(s => { html += panelHtml(s, pal); });
    sl.forEach(s => { html += labelHtml(s, pal); });

    html += '<div class="abs badge txt" style="background:' + pal.accent + ';color:' + pal.accentInk + '">' + esc($('season').value) + '</div>';
    html += '<div class="abs league txt">' + esc($('league').value) + '</div>';
    html += '<div class="abs club txt" id="clubText">' + esc($('clubName').value) + '</div>';
    html += '<div class="abs subtitle txt" style="color:' + pal.accent + '">' + esc($('subtitle').value) + '</div>';
    html += '<div class="abs handle txt">' + esc($('handle').value) + '</div>';

    if (state.layout === 'swipe') {
      const idx = KIT_TYPES.indexOf(state.swipeKit);
      html += '<div class="abs swipe">' + KIT_TYPES.map((k, i) =>
        '<span class="d' + (i === idx ? ' on' : '') + '" style="background:' + (i === idx ? pal.accent : 'rgba(255,255,255,.35)') + '"></span>').join('') + '</div>';
    }

    stage.innerHTML = html;
    stage.classList.toggle('clean', $('clean').checked);
    fitClubName();
  }

  function fitClubName() {
    const el = $('clubText');
    if (!el) return;
    let size = 150;
    el.style.fontSize = size + 'px';
    while (el.scrollWidth > 940 && size > 60) {
      size -= 4;
      el.style.fontSize = size + 'px';
    }
  }

  // ---------- preview scaling ----------
  function fitPreview() {
    const box = $('stageBox');
    const col = box.parentElement;
    const maxW = Math.min(col.clientWidth, 520);
    const maxH = window.innerWidth > 900 ? window.innerHeight - 140 : Infinity;
    const s = Math.min(maxW / W, maxH / H);
    box.style.width = Math.floor(W * s) + 'px';
    box.style.height = Math.floor(H * s) + 'px';
    $('stage').style.transform = 'scale(' + s + ')';
    $('meta').textContent = '1080 × 1920 · preview ' + Math.round(s * 100) + '%';
  }

  // ---------- images ----------
  function readImage(file) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\//.test(file.type)) return reject(new Error('Not an image'));
      const fr = new FileReader();
      fr.onload = () => {
        const im = new Image();
        im.onload = () => resolve({ src: fr.result, iw: im.naturalWidth, ih: im.naturalHeight, zoom: 100, fx: 50, fy: 30 });
        im.onerror = () => reject(new Error('Could not decode image'));
        im.src = fr.result;
      };
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(file);
    });
  }

  async function setImage(kit, file) {
    try {
      state.images[kit] = await readImage(file);
      renderKitRows();
      render();
    } catch (e) {
      toast(e.message);
    }
  }

  function renderKitRows() {
    $('kitRows').innerHTML = KIT_TYPES.map(k => {
      const img = state.images[k];
      const sliders = img ? '<details><summary>Crop · zoom ' + img.zoom + '%</summary>' +
        ['zoom:Zoom:100:300', 'fx:Pan X:0:100', 'fy:Pan Y:0:100'].map(def => {
          const [key, name, min, max] = def.split(':');
          return '<label class="slider"><span>' + name + '</span><input type="range" min="' + min + '" max="' + max + '" value="' + img[key] + '" data-kit="' + k + '" data-key="' + key + '"><span>' + img[key] + '</span></label>';
        }).join('') + '</details>' : '';
      return '<div class="kit-row"><div class="row">' +
        '<div class="thumb' + (img ? ' has' : '') + '" style="' + (img ? 'background-image:url(' + img.src + ')' : '') + '"></div>' +
        '<div class="grow"><div class="kname">' + k + '</div><div class="muted small">' + (img ? img.iw + '×' + img.ih : 'No image') + '</div></div>' +
        '<button class="btn small" data-up="' + k + '">' + (img ? 'Replace' : 'Upload') + '</button>' +
        (img ? '<button class="btn small" data-clear="' + k + '" title="Remove">✕</button>' : '') +
        '</div>' + sliders + '</div>';
    }).join('');
  }

  function openPicker(kit) {
    pendingKit = kit;
    $('oneFile').click();
  }

  // ---------- export ----------
  async function exportPng() {
    const btn = $('exportBtn'), st = $('exportStatus');
    if (typeof html2canvas !== 'function') {
      st.className = 'export-status err';
      st.textContent = 'html2canvas did not load (needs internet for cdnjs).';
      return;
    }
    btn.disabled = true;
    st.className = 'export-status';
    st.textContent = 'Rendering…';
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const canvas = await html2canvas($('stage'), {
        width: W, height: H, scale: 1,
        windowWidth: Math.max(W, document.documentElement.clientWidth),
        windowHeight: Math.max(H, document.documentElement.clientHeight),
        backgroundColor: '#060608', useCORS: true, logging: false,
        onclone: doc => {
          const box = doc.getElementById('stageBox');
          box.style.width = W + 'px';
          box.style.height = H + 'px';
          box.style.borderRadius = '0';
          doc.getElementById('stage').style.transform = 'none';
        }
      });
      let out = canvas;
      if (canvas.width !== W || canvas.height !== H) {
        out = document.createElement('canvas');
        out.width = W;
        out.height = H;
        out.getContext('2d').drawImage(canvas, 0, 0, W, H);
      }
      const blob = await new Promise(r => out.toBlob(r, 'image/png'));
      const name = state.club.id + '-' + state.layout + (state.layout === 'swipe' ? '-' + state.swipeKit : '') + ($('clean').checked ? '-clean' : '') + '-2627.png';
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      window.__lastExport = { width: out.width, height: out.height, name: name };
      st.className = 'export-status ok';
      st.textContent = 'Saved ' + name + ' (' + out.width + '×' + out.height + ')';
    } catch (e) {
      st.className = 'export-status err';
      st.textContent = 'Export failed: ' + (e.message || e);
    } finally {
      btn.disabled = false;
    }
  }

  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove('show'), 1600);
  }

  // ---------- club ----------
  function applyClub(id) {
    state.club = state.data.clubs.find(c => c.id === id) || state.data.clubs[0];
    state.primary = state.club.primaryColor;
    state.secondary = state.club.secondaryColor;
    $('c1').value = state.primary.toLowerCase();
    $('c2').value = state.secondary.toLowerCase();
    $('clubName').value = state.club.name.toUpperCase();
    $('league').value = (state.club.league || '').toUpperCase();
    render();
  }

  function bind() {
    $('club').addEventListener('change', e => applyClub(e.target.value));
    $('layoutSeg').addEventListener('click', e => {
      const b = e.target.closest('button[data-layout]');
      if (!b) return;
      state.layout = b.dataset.layout;
      [...$('layoutSeg').children].forEach(x => x.classList.toggle('on', x === b));
      $('heroField').classList.toggle('hidden', state.layout !== 'hero');
      $('swipeField').classList.toggle('hidden', state.layout !== 'swipe');
      render();
    });
    $('heroKit').addEventListener('change', e => { state.heroKit = e.target.value; render(); });
    $('swipeKit').addEventListener('change', e => { state.swipeKit = e.target.value; render(); });

    ['clubName', 'lbl-home', 'lbl-away', 'lbl-third', 'season', 'league', 'subtitle', 'handle']
      .forEach(id => $(id).addEventListener('input', render));
    ['arrows', 'clean'].forEach(id => $(id).addEventListener('change', render));

    $('c1').addEventListener('input', e => { state.primary = e.target.value; render(); });
    $('c2').addEventListener('input', e => { state.secondary = e.target.value; render(); });
    $('swap').addEventListener('click', () => {
      [state.primary, state.secondary] = [state.secondary, state.primary];
      $('c1').value = state.primary.toLowerCase();
      $('c2').value = state.secondary.toLowerCase();
      render();
    });
    $('resetColors').addEventListener('click', () => {
      state.primary = state.club.primaryColor;
      state.secondary = state.club.secondaryColor;
      $('c1').value = state.primary.toLowerCase();
      $('c2').value = state.secondary.toLowerCase();
      render();
    });

    $('kitRows').addEventListener('click', e => {
      const up = e.target.closest('[data-up]');
      const clr = e.target.closest('[data-clear]');
      if (up) openPicker(up.dataset.up);
      if (clr) { state.images[clr.dataset.clear] = null; renderKitRows(); render(); }
    });
    $('kitRows').addEventListener('input', e => {
      const r = e.target.closest('input[type="range"]');
      if (!r) return;
      const img = state.images[r.dataset.kit];
      img[r.dataset.key] = +r.value;
      r.nextElementSibling.textContent = r.value;
      if (r.dataset.key === 'zoom') r.closest('details').querySelector('summary').textContent = 'Crop · zoom ' + r.value + '%';
      render();
    });
    $('oneFile').addEventListener('change', e => {
      const f = e.target.files[0];
      e.target.value = '';
      if (f && pendingKit) setImage(pendingKit, f);
    });
    $('multiBtn').addEventListener('click', () => $('multiFile').click());
    $('multiFile').addEventListener('change', async e => {
      const files = [...e.target.files].slice(0, 3);
      e.target.value = '';
      for (let i = 0; i < files.length; i++) {
        try { state.images[KIT_TYPES[i]] = await readImage(files[i]); } catch (err) { toast(err.message); }
      }
      renderKitRows();
      render();
    });

    // click / drop directly on preview panels
    const stage = $('stage');
    stage.addEventListener('click', e => {
      const p = e.target.closest('.panel');
      if (p) openPicker(p.dataset.kit);
    });
    stage.addEventListener('dragover', e => { if (e.target.closest('.panel')) e.preventDefault(); });
    stage.addEventListener('drop', e => {
      const p = e.target.closest('.panel');
      if (!p) return;
      e.preventDefault();
      const f = e.dataTransfer.files[0];
      if (f) setImage(p.dataset.kit, f);
    });

    $('exportBtn').addEventListener('click', exportPng);
    window.addEventListener('resize', fitPreview);
  }

  async function init() {
    const r = await loadClubs();
    state.data = r.data;
    $('fileNotice').classList.toggle('hidden', r.source !== 'embedded');
    $('club').innerHTML = state.data.clubs.map(c => '<option value="' + c.id + '">' + c.name + '</option>').join('');
    bind();
    renderKitRows();
    fitPreview();
    applyClub(state.data.clubs[0].id);
    // re-fit the club name once web fonts have arrived
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(render);
  }

  window.KitStory = { state, render, exportPng, setImage };
  init().catch(e => { $('stage').innerHTML = '<div style="padding:60px;font:40px sans-serif">Could not load clubs: ' + esc(e.message || e) + '</div>'; });
})();
