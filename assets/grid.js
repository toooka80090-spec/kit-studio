(function () {
  const W = 1080, H = 1920, N = 9;
  const $ = id => document.getElementById(id);

  // Default 3x3 recipe, by shot order: 0 front · 1 three-quarter · 2 chest · 3 crest macro · 4 sleeve · 5 collar.
  // `alt` is used when that shot is missing: a zoomed crop of the front shot instead.
  const RECIPE = [
    { shot: 0, zoom: 100, fx: 50, fy: 50, rot: 0 },
    { shot: 1, zoom: 100, fx: 50, fy: 50, rot: 0 },
    { shot: 2, zoom: 100, fx: 50, fy: 50, rot: 0, alt: { shot: 0, zoom: 200, fx: 50, fy: 20, rot: 0 } },
    { shot: 3, zoom: 100, fx: 50, fy: 50, rot: 0, alt: { shot: 0, zoom: 380, fx: 62, fy: 30, rot: -25 } },
    { shot: 0, zoom: 380, fx: 40, fy: 60, rot: -22 },
    { shot: 1, zoom: 360, fx: 55, fy: 62, rot: -14 },
    { shot: 4, zoom: 100, fx: 50, fy: 50, rot: 0, alt: { shot: 1, zoom: 230, fx: 15, fy: 35, rot: 0 } },
    { shot: 0, zoom: 420, fx: 30, fy: 72, rot: -24 },
    { shot: 5, zoom: 100, fx: 50, fy: 50, rot: 0, alt: { shot: 0, zoom: 260, fx: 50, fy: 0, rot: 0 } }
  ];

  const state = {
    lib: [],            // [{ name, src, iw, ih }]
    cells: Array.from({ length: N }, () => ({ src: null, zoom: 100, fx: 50, fy: 50, rot: 0 })),
    sel: 0,
    gutter: 8,
    gutterColor: '#ffffff'
  };

  function geom(i) {
    const g = state.gutter;
    const cw = (W - 2 * g) / 3, ch = (H - 2 * g) / 3;
    return { x: (i % 3) * (cw + g), y: Math.floor(i / 3) * (ch + g), w: cw, h: ch };
  }

  // Rotated cover-fit: size the image so the rotated cell is always covered, then pan inside the slack.
  function place(img, c, w, h) {
    const t = c.rot * Math.PI / 180, cos = Math.abs(Math.cos(t)), sin = Math.abs(Math.sin(t));
    const needW = w * cos + h * sin, needH = w * sin + h * cos;
    const s = Math.max(needW / img.iw, needH / img.ih) * c.zoom / 100;
    const bw = img.iw * s, bh = img.ih * s;
    const dx = (0.5 - c.fx / 100) * (bw - needW), dy = (0.5 - c.fy / 100) * (bh - needH);
    const rx = dx * Math.cos(t) - dy * Math.sin(t), ry = dx * Math.sin(t) + dy * Math.cos(t);
    return { left: w / 2 + rx - bw / 2, top: h / 2 + ry - bh / 2, bw, bh };
  }

  const byName = name => state.lib.find(l => l.name === name);

  function render() {
    let html = '';
    for (let i = 0; i < N; i++) {
      const g = geom(i), c = state.cells[i], img = c.src && byName(c.src);
      html += '<div class="cell" data-i="' + i + '" style="left:' + g.x + 'px;top:' + g.y + 'px;width:' + g.w + 'px;height:' + g.h + 'px;background:' + (img ? '#fff' : '#ececec') + '">';
      if (img) {
        const p = place(img, c, g.w, g.h);
        html += '<div class="img" style="left:' + p.left.toFixed(1) + 'px;top:' + p.top.toFixed(1) + 'px;width:' + p.bw.toFixed(1) + 'px;height:' + p.bh.toFixed(1) +
          'px;background-image:url(' + img.src + ');transform:rotate(' + c.rot + 'deg)"></div>';
      } else {
        html += '<div class="ph">' + (i + 1) + '</div>';
      }
      html += '</div>';
    }
    const s = geom(state.sel);
    html += '<div class="sel" id="selBox" style="left:' + s.x + 'px;top:' + s.y + 'px;width:' + s.w + 'px;height:' + s.h + 'px"></div>';
    const stage = $('stage');
    stage.style.background = state.gutterColor;
    stage.innerHTML = html;
  }

  function renderLib() {
    $('lib').innerHTML = state.lib.map((l, i) =>
      '<div class="it" style="background-image:url(' + l.src + ')"><span>' + (i + 1) + ' · ' + l.name + '</span></div>').join('') ||
      '<div class="muted small" style="grid-column:1/-1">No photos yet</div>';
  }

  function renderCellEditor() {
    $('cellPick').innerHTML = state.cells.map((c, i) =>
      '<button data-i="' + i + '" class="' + (i === state.sel ? 'on' : '') + (c.src ? '' : ' empty') + '">' + (i + 1) + '</button>').join('');
    const c = state.cells[state.sel];
    $('cellSrc').innerHTML = '<option value="">— empty —</option>' +
      state.lib.map(l => '<option' + (l.name === c.src ? ' selected' : '') + '>' + l.name + '</option>').join('');
    $('cellSliders').innerHTML = [['zoom', 'Zoom', 100, 600], ['fx', 'Pan X', 0, 100], ['fy', 'Pan Y', 0, 100], ['rot', 'Rotate', -45, 45]]
      .map(([k, n, min, max]) => '<label class="slider"><span>' + n + '</span><input type="range" min="' + min + '" max="' + max + '" value="' + c[k] + '" data-key="' + k + '"><span>' + c[k] + '</span></label>').join('');
  }

  function renderAll() { renderLib(); renderCellEditor(); render(); }

  function readImage(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => {
        const im = new Image();
        im.onload = () => resolve({ src: fr.result, iw: im.naturalWidth, ih: im.naturalHeight });
        im.onerror = () => reject(new Error('Could not decode ' + file.name));
        im.src = fr.result;
      };
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(file);
    });
  }

  async function addImage(name, file) {
    const img = await readImage(file);
    const existing = byName(name);
    if (existing) Object.assign(existing, img);
    else state.lib.push(Object.assign({ name }, img));
    renderAll();
  }

  // recipe: optional array of 9 { src | shot, zoom, fx, fy, rot }. Without it, the default RECIPE runs on library order.
  function applyRecipe(recipe) {
    if (!state.lib.length) return;
    const list = recipe || RECIPE;
    state.cells = list.slice(0, N).map(r => {
      let step = r;
      if (!r.src && !state.lib[r.shot] && r.alt) step = r.alt;
      const lib = r.src ? byName(r.src) : state.lib[step.shot] || state.lib[0];
      return { src: lib ? lib.name : null, zoom: step.zoom ?? 100, fx: step.fx ?? 50, fy: step.fy ?? 50, rot: step.rot ?? 0 };
    });
    while (state.cells.length < N) state.cells.push({ src: null, zoom: 100, fx: 50, fy: 50, rot: 0 });
    renderAll();
  }

  function fitPreview() {
    const box = $('stageBox');
    const maxW = Math.min(box.parentElement.clientWidth, 520);
    const maxH = window.innerWidth > 900 ? window.innerHeight - 140 : Infinity;
    const s = Math.min(maxW / W, maxH / H);
    box.style.width = Math.floor(W * s) + 'px';
    box.style.height = Math.floor(H * s) + 'px';
    $('stage').style.transform = 'scale(' + s + ')';
    $('meta').textContent = '1080 × 1920 · preview ' + Math.round(s * 100) + '%';
  }

  async function exportPng(fileName) {
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
      const canvas = await html2canvas($('stage'), {
        width: W, height: H, scale: 1,
        windowWidth: Math.max(W, document.documentElement.clientWidth),
        windowHeight: Math.max(H, document.documentElement.clientHeight),
        backgroundColor: state.gutterColor, logging: false,
        onclone: doc => {
          const box = doc.getElementById('stageBox');
          box.style.width = W + 'px';
          box.style.height = H + 'px';
          box.style.borderRadius = '0';
          doc.getElementById('stage').style.transform = 'none';
          const sel = doc.getElementById('selBox');
          if (sel) sel.remove();
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
      const name = typeof fileName === 'string' ? fileName : 'kit-grid-2627.png';
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      window.__lastExport = { width: out.width, height: out.height, name };
      st.className = 'export-status ok';
      st.textContent = 'Saved ' + name + ' (' + out.width + '×' + out.height + ')';
    } catch (e) {
      st.className = 'export-status err';
      st.textContent = 'Export failed: ' + (e.message || e);
    } finally {
      btn.disabled = false;
    }
  }

  function bind() {
    $('addBtn').addEventListener('click', () => $('addFile').click());
    $('addFile').addEventListener('change', async e => {
      const files = [...e.target.files];
      e.target.value = '';
      for (const f of files) {
        try { await addImage(f.name.replace(/\.[^.]+$/, ''), f); } catch (err) { alert(err.message); }
      }
    });
    $('autoBtn').addEventListener('click', () => applyRecipe());
    $('cellPick').addEventListener('click', e => {
      const b = e.target.closest('button[data-i]');
      if (b) { state.sel = +b.dataset.i; renderCellEditor(); render(); }
    });
    $('stage').addEventListener('click', e => {
      const c = e.target.closest('.cell');
      if (c) { state.sel = +c.dataset.i; renderCellEditor(); render(); }
    });
    $('cellSrc').addEventListener('change', e => {
      state.cells[state.sel].src = e.target.value || null;
      renderCellEditor();
      render();
    });
    $('cellSliders').addEventListener('input', e => {
      const r = e.target.closest('input[type="range"]');
      if (!r) return;
      state.cells[state.sel][r.dataset.key] = +r.value;
      r.nextElementSibling.textContent = r.value;
      render();
    });
    $('gutter').addEventListener('input', e => { state.gutter = +e.target.value; $('gutterVal').textContent = e.target.value; render(); });
    $('gutterColor').addEventListener('input', e => { state.gutterColor = e.target.value; render(); });
    $('exportBtn').addEventListener('click', () => exportPng());
    window.addEventListener('resize', fitPreview);
  }

  window.KitGrid = { state, render: renderAll, addImage, applyRecipe, exportPng };
  bind();
  fitPreview();
  renderAll();
})();
