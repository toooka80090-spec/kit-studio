// Shared club data loader + color helpers for prompts.html and story.html.
// Load order: edits saved in this browser → data/clubs.json → data/clubs.js (offline copy).
(function () {
  const STORE_KEY = 'kitStudio.clubs.v1';
  const KIT_TYPES = ['home', 'away', 'third'];

  function readStore() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveStore(data) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  }

  function clearStore() {
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
  }

  function validate(data) {
    if (!data || !Array.isArray(data.clubs) || !data.clubs.length) {
      throw new Error('clubs.json must contain a non-empty "clubs" array');
    }
    data.clubs.forEach((c, i) => {
      if (!c.name) throw new Error('Club #' + (i + 1) + ' has no name');
      c.id = c.id || c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      c.primaryColor = c.primaryColor || '#888888';
      c.secondaryColor = c.secondaryColor || '#FFFFFF';
      c.kits = c.kits || {};
      KIT_TYPES.forEach(k => {
        c.kits[k] = c.kits[k] || { description: 'EDIT: describe kit' };
      });
    });
    return data;
  }

  async function loadClubs() {
    const saved = readStore();
    if (saved) {
      try { return { data: validate(saved), source: 'local' }; } catch (e) { clearStore(); }
    }
    try {
      const res = await fetch('data/clubs.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return { data: validate(await res.json()), source: 'file' };
    } catch (e) {
      if (window.CLUBS_FALLBACK) {
        return { data: validate(JSON.parse(JSON.stringify(window.CLUBS_FALLBACK))), source: 'embedded' };
      }
      throw e;
    }
  }

  function importFile(file) {
    return file.text().then(txt => {
      const data = validate(JSON.parse(txt));
      saveStore(data);
      return data;
    });
  }

  function exportFile(data) {
    const blob = new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'clubs.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  const SOURCE_LABELS = {
    local: 'Edits saved in this browser',
    file: 'data/clubs.json',
    embedded: 'Offline copy (data/clubs.js)'
  };

  // ---- color helpers ----
  function hexToRgb(hex) {
    let h = String(hex).replace('#', '').trim();
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16);
    if (isNaN(n) || h.length !== 6) return [136, 136, 136];
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function rgbToHex(rgb) {
    return '#' + rgb.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  }

  // t = 0 → a, t = 1 → b
  function mix(a, b, t) {
    const A = hexToRgb(a), B = hexToRgb(b);
    return rgbToHex(A.map((v, i) => v + (B[i] - v) * t));
  }

  function luminance(hex) {
    const c = hexToRgb(hex).map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }

  function rgba(hex, a) {
    const [r, g, b] = hexToRgb(hex);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  window.KitStudio = {
    KIT_TYPES, loadClubs, saveStore, clearStore, importFile, exportFile, SOURCE_LABELS,
    color: { hexToRgb, rgbToHex, mix, luminance, rgba }
  };
})();
