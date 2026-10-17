(function () {
  const { loadClubs, saveStore, clearStore, importFile, exportFile, SOURCE_LABELS } = window.KitStudio;

  const CONSTRAINT = 'No text, no letters, no logos added, no watermarks, no random graphics in the background or on the subject — keep only the original jersey details from the reference.';
  const MODEL_KEY = 'kitStudio.model.v1';
  const DEFAULT_MODEL = {
    model: 'a realistic athletic male fashion model in his mid-20s, warm olive skin tone, short dark textured crop haircut with a clean low fade, light stubble, calm confident expression',
    bottoms: 'plain matte black tailored track pants'
  };
  const KIT_WORD = { home: 'home', away: 'away', third: 'third' };

  const $ = id => document.getElementById(id);
  let data = null;
  let source = 'file';
  let kit = 'home';
  let current = [];
  let set = 'story';

  // ---------- prompt builder ----------
  function describeKit(desc) {
    const d = (desc || '').trim().replace(/\.+$/, '');
    if (!d || /^EDIT:/i.test(d)) return '';
    return ' Jersey design notes (must still match the reference exactly): ' + d + '.';
  }

  function buildPrompts(club, kitType, model) {
    const jersey = 'the EXACT ' + club.name + ' 2026/27 ' + KIT_WORD[kitType] + ' jersey shown in the reference image';
    const fidelity = 'Preserve the jersey from the reference image with 100% fidelity: identical cut, collar, sleeves, cuffs, colors, patterns, fabric texture, crest, sponsor and manufacturer marks, exactly as they appear in the reference — nothing redesigned, recolored, moved or invented.' + describeKit(club.kits[kitType].description);
    const who = model.model.trim().replace(/\.+$/, '');
    const bottoms = model.bottoms.trim().replace(/\.+$/, '');
    const identity = 'Keep the exact same model identity across all three shots of this set: same face, skin tone, hairstyle, build, ' + bottoms + ' and pose language.';
    const camera = 'Shot on a full-frame camera with an 85mm lens at f/2, soft key light, crisp rim light, shallow depth of field with smooth creamy bokeh, true-to-life fabric detail, 8k resolution, editorial sports fashion photography.';
    const frame = 'Vertical 9:16 composition: subject centered in the middle of the frame, with generous clean empty space at the top and bottom of the frame reserved for Instagram Story overlays.';
    // a white primary (e.g. Zamalek) can't tint a charcoal backdrop, so fall back to the secondary color
    const tint = window.KitStudio.color.luminance(club.primaryColor) > 0.9 ? club.secondaryColor : club.primaryColor;
    const studio = 'Seamless studio backdrop in deep charcoal with a subtle gradient tinted toward ' + tint + '.';

    return [
      {
        title: 'Front view',
        sub: 'Studio · full upper body',
        text: [
          'Ultra-realistic editorial sports fashion photograph of ' + who + ', wearing ' + jersey + ', paired with ' + bottoms + '.',
          fidelity,
          'FRONT VIEW: the model faces the camera straight on, full upper body framed from the waist to just above the head, relaxed confident stance, arms naturally at the sides, shoulders square so the full front of the jersey is clearly visible.',
          identity + ' This front view is the master reference for the back view and lifestyle shots.',
          studio + ' Lighting: large soft key light from front-left at 45°, gentle fill from the right, rim light from behind on both shoulders and hair to separate the model from the backdrop.',
          camera,
          frame,
          CONSTRAINT
        ].join(' ')
      },
      {
        title: 'Back view',
        sub: 'Same model · same light · same framing',
        text: [
          'Ultra-realistic editorial sports fashion photograph — BACK VIEW continuation of the front-view shot: the same model, ' + who + ', wearing ' + jersey + ', paired with ' + bottoms + '.',
          fidelity + ' Reproduce the back of the jersey exactly as in the reference; if the reference shows no name or number on the back, keep the back plain and do not invent any.',
          'BACK VIEW: the model is turned 180° away from the camera, head turned slightly over the left shoulder so the same hairstyle and jawline are recognizable, full upper body framed from the waist to just above the head — identical framing, camera height, distance and crop as the front view.',
          identity,
          'Identical studio setup as the front view: ' + studio.charAt(0).toLowerCase() + studio.slice(1) + ' Same soft key light position and intensity, same fill, rim light outlining the shoulders, neck and hair, same white balance and color grade, for perfect multi-angle continuity.',
          camera,
          frame,
          CONSTRAINT
        ].join(' ')
      },
      {
        title: 'Lifestyle',
        sub: 'Stadium tunnel',
        text: [
          'Ultra-realistic editorial sports fashion photograph, lifestyle scene in a stadium players\' tunnel: the same model, ' + who + ', wearing ' + jersey + ', paired with ' + bottoms + '.',
          fidelity,
          'The model walks slowly toward the camera down a dark concrete stadium tunnel, mid-stride, confident gaze just off-camera, upper body to mid-thigh in frame, the jersey front fully visible and unobstructed.',
          identity,
          'Lighting: soft key light from the front matching the studio shots for consistent skin tone, strong cool-white rim light spilling from the bright pitch opening at the end of the tunnel behind the model, faint overhead tunnel strip lights melting into round bokeh, subtle haze, background walls in dark neutral tones with a hint of ' + tint + ' color in the ambient light. Background completely free of signage, banners or readable markings.',
          camera,
          frame,
          CONSTRAINT
        ].join(' ')
      }
    ];
  }

  // Grid set: flat-lay product shot → 6 white-studio e-commerce shots that fill a 3x3 detail grid.
  function buildGridPrompts(club, kitType, model) {
    const who = model.model.trim().replace(/\.+$/, '');
    const bottoms = 'plain black athletic shorts';
    const jersey = 'the EXACT ' + club.name + ' 2026/27 ' + KIT_WORD[kitType] + ' jersey from the reference image';
    const flatlay = 'The reference image is a flat-lay product photo of the jersey: dress the model in exactly this jersey, translating the flat garment naturally onto the body with realistic drape, soft folds and slight stretch across the chest and shoulders, while keeping every stripe position, print texture, color, collar, cuff, hem, crest, sponsor and manufacturer mark exactly as in the reference — nothing redesigned, recolored, moved or invented.' + describeKit(club.kits[kitType].description);
    const identity = 'Same model in every shot of this set: ' + who + ', identical skin tone, stubble, build and ' + bottoms + '.';
    const studio = 'Pure white seamless e-commerce studio background, bright high-key soft key light from large softboxes, subtle rim light on the shoulders, clean soft shadows, true-to-life colors.';
    const lens85 = 'Shot on a full-frame camera with an 85mm lens, shallow depth of field, crisp fabric detail, 8k resolution, editorial sports fashion product photography.';
    const lensMacro = 'Shot with a 100mm macro lens, very shallow depth of field with soft bokeh fall-off, every knit fiber visible, 8k resolution, editorial sports fashion product photography.';
    const frame = 'Vertical 9:16 composition, subject filling the frame edge to edge (the image becomes one cell of a 3x3 story grid).';
    const shots = [
      ['Front', 'Waist-up · face cropped at nose', 'FRONT VIEW: the model wearing ' + jersey + ' faces the camera straight on, framed from the bridge of the nose down to mid-thigh, arms relaxed at the sides, the full jersey front centered and unobstructed.', lens85],
      ['Three-quarter', 'Hand on hip', 'THREE-QUARTER VIEW: the model wearing ' + jersey + ' turns about 25° toward camera-left with the right hand resting on the hip, framed from just below the eyes down to mid-thigh, jersey front and side seam clearly visible.', lens85],
      ['Chest close-up', 'Collar + crest', 'CHEST CLOSE-UP: the model wearing ' + jersey + ', framed from the chin down to mid-torso, crew-neck collar and chest crest in sharp focus, print texture clearly readable.', lens85],
      ['Crest macro', 'Diagonal detail', 'MACRO DETAIL: extreme close-up of the crest and the surrounding printed fabric of ' + jersey + ' worn on the model\'s chest, camera tilted about 30° so the stripes run diagonally across the frame, knit texture and crest stitching razor sharp.', lensMacro],
      ['Sleeve', 'Shoulder + arm profile', 'SLEEVE DETAIL: side-profile close-up of the model\'s shoulder and short sleeve of ' + jersey + ', framed from the collarbone to just below the elbow, sleeve hem and seam stitching visible, white background beside the arm.', lens85],
      ['Collar', 'Chin + neckline', 'COLLAR DETAIL: close-up of the model wearing ' + jersey + ', framed from the lower lip down to the upper chest, crew-neck collar ribbing and stitching in sharp focus, chin and light stubble visible above it.', lens85]
    ];
    return shots.map(([title, sub, shot, lens]) => ({
      title, sub,
      text: ['Ultra-realistic e-commerce sports fashion photograph.', shot, flatlay, identity, studio, lens, frame, CONSTRAINT].join(' ')
    }));
  }

  // ---------- UI ----------
  function loadModel() {
    try {
      return Object.assign({}, DEFAULT_MODEL, JSON.parse(localStorage.getItem(MODEL_KEY) || '{}'));
    } catch (e) {
      return Object.assign({}, DEFAULT_MODEL);
    }
  }
  function saveModel() {
    try {
      localStorage.setItem(MODEL_KEY, JSON.stringify({ model: $('modelDesc').value, bottoms: $('bottoms').value }));
    } catch (e) { /* ignore */ }
  }

  function currentClub() {
    return data.clubs.find(c => c.id === $('club').value) || data.clubs[0];
  }

  function setSource(s) {
    source = s;
    $('source').textContent = SOURCE_LABELS[s];
    $('fileNotice').classList.toggle('hidden', s !== 'embedded');
  }

  function fillClubSelect() {
    const prev = $('club').value;
    $('club').innerHTML = data.clubs.map(c => '<option value="' + c.id + '">' + c.name + '</option>').join('');
    if (data.clubs.some(c => c.id === prev)) $('club').value = prev;
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
  }

  function render() {
    const club = currentClub();
    $('clubName').textContent = club.name;
    $('clubLeague').textContent = club.league + ' · ' + club.primaryColor + ' / ' + club.secondaryColor;
    $('sw1').style.background = club.primaryColor;
    $('sw2').style.background = club.secondaryColor;
    if (document.activeElement !== $('kitDesc')) $('kitDesc').value = club.kits[kit].description || '';
    $('outTitle').textContent = club.name + ' — ' + kit.toUpperCase();

    const model = { model: $('modelDesc').value || DEFAULT_MODEL.model, bottoms: $('bottoms').value || DEFAULT_MODEL.bottoms };
    current = set === 'grid' ? buildGridPrompts(club, kit, model) : buildPrompts(club, kit, model);
    $('copyAll').textContent = 'Copy all ' + current.length;
    $('prompts').innerHTML = current.map((p, i) => {
      const body = escapeHtml(p.text.slice(0, -CONSTRAINT.length)) + '<span class="constraint">' + escapeHtml(CONSTRAINT) + '</span>';
      return '<article class="prompt-card">' +
        '<header><span class="num">0' + (i + 1) + '</span><div><div class="title">' + p.title + '</div><div class="sub">' + p.sub + '</div></div>' +
        '<button class="btn small" data-copy="' + i + '">Copy</button></header>' +
        '<pre class="prompt-text">' + body + '</pre></article>';
    }).join('');
  }

  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove('show'), 1400);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
  }

  function flash(btn, label) {
    const old = btn.textContent;
    btn.textContent = label;
    btn.classList.add('ok');
    setTimeout(() => { btn.textContent = old; btn.classList.remove('ok'); }, 1200);
  }

  function bind() {
    $('setSeg').addEventListener('click', e => {
      const b = e.target.closest('button[data-set]');
      if (!b) return;
      set = b.dataset.set;
      [...$('setSeg').children].forEach(x => x.classList.toggle('on', x === b));
      render();
    });
    $('club').addEventListener('change', render);
    $('kitSeg').addEventListener('click', e => {
      const b = e.target.closest('button[data-kit]');
      if (!b) return;
      kit = b.dataset.kit;
      [...$('kitSeg').children].forEach(x => x.classList.toggle('on', x === b));
      render();
    });
    $('kitDesc').addEventListener('input', () => {
      currentClub().kits[kit].description = $('kitDesc').value;
      if (saveStore(data)) setSource('local');
      render();
    });
    ['modelDesc', 'bottoms'].forEach(id => $(id).addEventListener('input', () => { saveModel(); render(); }));

    $('prompts').addEventListener('click', async e => {
      const b = e.target.closest('[data-copy]');
      if (!b) return;
      await copyText(current[+b.dataset.copy].text);
      flash(b, 'Copied ✓');
      toast('Prompt ' + (+b.dataset.copy + 1) + ' copied');
    });
    $('copyAll').addEventListener('click', async e => {
      const all = current.map((p, i) => (i + 1) + ') ' + p.title.toUpperCase() + '\n' + p.text).join('\n\n');
      await copyText(all);
      flash(e.currentTarget, 'Copied ✓');
      toast('All ' + current.length + ' prompts copied');
    });

    $('importBtn').addEventListener('click', () => $('importFile').click());
    $('importFile').addEventListener('change', async e => {
      const f = e.target.files[0];
      e.target.value = '';
      if (!f) return;
      try {
        data = await importFile(f);
        setSource('local');
        fillClubSelect();
        render();
        toast('clubs.json imported');
      } catch (err) {
        alert('Could not import: ' + err.message);
      }
    });
    $('exportBtn').addEventListener('click', () => exportFile(data));
    $('resetBtn').addEventListener('click', async () => {
      if (!confirm('Discard edits saved in this browser and reload data/clubs.json?')) return;
      clearStore();
      const r = await loadClubs();
      data = r.data;
      setSource(r.source);
      fillClubSelect();
      render();
    });
  }

  async function init() {
    const m = loadModel();
    $('modelDesc').value = m.model;
    $('bottoms').value = m.bottoms;
    try {
      const r = await loadClubs();
      data = r.data;
      setSource(r.source);
    } catch (e) {
      $('prompts').innerHTML = '<div class="card">Could not load club data: ' + escapeHtml(String(e.message || e)) + '</div>';
      return;
    }
    fillClubSelect();
    bind();
    render();
  }

  init();
})();
