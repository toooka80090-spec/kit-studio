// العالم لـ "The Soldier Who Never Left": الديكور ثلاثي الأبعاد (جسر، نهر، معبد، قرية، تلال، سحب، خوذة)
// وحالته لكل إطار. هذا هو الملف ثلاثي الأبعاد الوحيد الذي تعيد كتابته القصة الجديدة؛ لا تعدّل main.js أبداً.
// main.js يستدعي build(ctx) مرة واحدة، ثم كل إطار: update(W, f) حيث W = worldAt(f) من story.js، وlight(L).
// ctx = { THREE, T, P, scene, M, add, box, tbox, uvScale, toon, texM, rx, waterNd }
//   M      المواد: plank beam beamDark rot rotB stone stoneMoss grass dirt plaster plaster2 roof marble marbleTop
//          trunk cypress pine bush hill hillFar mount snow iron bronze wood door window red banner helmIn helmOut
//   add(geo, mat, x, y, z, parent = scene, {cast}) ← mesh (بظلال)   tbox(w, h, d, tileMetres) صندوق بـ UV بمقياس العالم
//   toon({color}) / texM(P.painter(seed), rx, ry) مواد toon جديدة   rx(درجات) ← راديان   waterNd: مادة العمودي/العمق للماء
// يعيد { update(W, f), light(L), faceCamera: [مجسّمات تُدار نحو الكاميرا كل إطار] }.
import { DECK } from './story.js';

export function build({ THREE, T, P, scene, M, add, box, tbox, toon, rx, waterNd }) {
  const HALF = 26, BW = 2.3; // نصف طول الجسر ونصف عرضه (DECK = ارتفاع سطح الجسر، من story.js)
  const world = new THREE.Group(); scene.add(world);
  // النهر
  const waterU = { t: { value: 0 }, deep: { value: new THREE.Color('#2f6f8f') }, shal: { value: new THREE.Color('#5fa8bf') }, glint: { value: new THREE.Color('#e9f6ff') } };
  const waterMat = new THREE.ShaderMaterial({
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...waterU }, fog: true,
    vertexShader: `#include <fog_pars_vertex>
      varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; vec4 mvPosition = viewMatrix*w; gl_Position = projectionMatrix*mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: `#include <fog_pars_fragment>
      uniform float t; uniform vec3 deep, shal, glint; varying vec3 vW;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
      void main(){ vec2 p = vW.xz*vec2(.35,.12) + vec2(0., -t*.25);
        float n = noise(p) * .6 + noise(p*2.3 + 7.) * .4; float edge = smoothstep(10., 17., abs(vW.x));
        vec3 c = mix(deep, shal, .35 + .4*n + .4*edge);
        float streak = smoothstep(.72, .78, noise(vW.xz*vec2(.8,.09) + vec2(0., -t*.6))) * (1.-edge*.5);
        c = mix(c, glint, streak*.75);
        gl_FragColor = vec4(c,1.);
        #include <fog_fragment>
      }`,
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(60, 2300), waterMat); water.rotation.x = -Math.PI / 2; water.position.y = 0;
  water.userData.nd = waterNd; water.receiveShadow = false; scene.add(water);
  // الضفتان: سطح مستوٍ عند DECK، ومنحدر إلى الماء
  const bankGeo = (s) => { // s=-1 القريبة (x<0)، و+1 البعيدة
    const shape = new THREE.Shape(); shape.moveTo(14.5 * s, -1.2); shape.lineTo(20.5 * s, DECK - 0.02); shape.lineTo(1150 * s, DECK - 0.02); shape.lineTo(1150 * s, -1.2);
    const g = new THREE.ExtrudeGeometry(shape, { depth: 2300, bevelEnabled: false }); g.translate(0, 0, -1150); return g;
  };
  const bankMat = M.grass.clone(); bankMat.map = M.grass.map.clone(); bankMat.map.repeat.set(0.25, 0.25); bankMat.map.needsUpdate = true;
  for (const s of [-1, 1]) add(bankGeo(s), [M.dirt, bankMat], 0, 0, 0, world, { cast: false });
  // طريق من البوابة إلى القرية (الضفة القريبة)
  const road = add(new THREE.PlaneGeometry(40, 4.2), M.dirt, -46, DECK + 0.01, 0, world, { cast: false }); road.rotation.x = -Math.PI / 2;
  const road2 = add(new THREE.PlaneGeometry(40, 4.2), M.dirt, 46, DECK + 0.01, 0, world, { cast: false }); road2.rotation.x = -Math.PI / 2;
  // دعامات حجرية
  for (const s of [-1, 1]) add(tbox(7, DECK + 1.5, 6.4, 2.4), M.stone, s * 21.2, (DECK - 1.5) / 2 - 0.25, 0, world);
  // سطح الجسر
  const deck = add(tbox(HALF * 2 - 2, 0.28, BW * 2, 1), M.plank, 0, DECK - 0.14, 0, world);
  { const uv = deck.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i), uv.getY(i)); }
  M.plank.map.rotation = Math.PI / 2;
  // العوارض الطولية والعوارض العلوية
  for (const z of [-1.6, 0, 1.6]) add(tbox(HALF * 2 - 4, 0.45, 0.35, 2), M.beam, 0, DECK - 0.5, z, world);
  const PILES_X = [-12, -6, 0, 6, 12], piles = [];
  for (const x of PILES_X) {
    add(tbox(0.5, 0.45, BW * 2 + 0.6, 2), M.beam, x, DECK - 0.95, 0, world);
    for (const z of [-1.8, 0, 1.8]) {
      const g = new THREE.CylinderGeometry(0.3, 0.34, DECK + 1.2, 12, 1); const pm = add(g, z === 0 ? M.rotB : M.rot, x, (DECK - 1.2) / 2 - 0.6, z, world);
      piles.push(pm);
    }
    // دعامات X عبر الهيكل
    for (const s of [-1, 1]) { const b = add(tbox(0.18, 6.0, 0.22, 2), M.beamDark, x + 0.32, 2.8, 0, world); b.rotation.x = s * Math.atan2(3.6, 5.6); }
  }
  // دعامات قطرية طولية بين الهياكل (واحدة تنكسر في اللقطة 8)
  const braces = [];
  for (let i = 0; i < PILES_X.length - 1; i++) for (const z of [-1.8, 1.8]) {
    const x0 = PILES_X[i], x1 = PILES_X[i + 1], L = Math.hypot(6, 3.4);
    const b = add(tbox(L, 0.22, 0.18, 2), M.beamDark, (x0 + x1) / 2, 3.2, z + Math.sign(z) * 0.36, world); b.rotation.z = (i % 2 ? 1 : -1) * Math.atan2(3.4, 6);
    braces.push(b);
  }
  // فطريات رفّية + طحالب متدلية على الأعمدة (ثلاثية الأبعاد، بحبر)
  const fung = toon({ color: '#e9dcb8' }), mossM = toon({ color: '#557a2e' });
  { const r = P.rng(31); for (const pm of piles) for (let k = 0; k < 4; k++) {
    const y = 1 + r() * 3.5, a = r() * 6.28, f = add(new THREE.SphereGeometry(0.22 + r() * 0.12, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), fung, pm.position.x + Math.cos(a) * 0.3, y, pm.position.z + Math.sin(a) * 0.3, world);
    f.scale.set(1, 0.35, 1); f.rotation.y = a;
    if (k < 2) { const mo = add(new THREE.ConeGeometry(0.12, 0.6 + r() * 0.5, 5), mossM, pm.position.x + Math.cos(a + 2) * 0.32, DECK - 1.4 - r() * 0.4, pm.position.z + Math.sin(a + 2) * 0.32, world); mo.rotation.x = Math.PI; }
  } }
  // الدرابزين
  for (let x = -HALF + 2; x <= HALF - 2; x += 2.5) for (const z of [-BW + 0.12, BW - 0.12]) add(tbox(0.16, 1.15, 0.16, 1), M.beam, x, DECK + 0.57, z, world);
  for (const z of [-BW + 0.12, BW - 0.12]) { add(tbox(HALF * 2 - 4, 0.16, 0.2, 2), M.beam, 0, DECK + 1.12, z, world); add(tbox(HALF * 2 - 4, 0.1, 0.12, 2), M.beam, 0, DECK + 0.6, z, world); }
  // البوابة عند الطرف القريب (x=-20.2)
  const gate = new THREE.Group(); world.add(gate);
  const gateStone = [];
  for (const z of [-2.95, 2.95]) { gateStone.push(add(tbox(1.1, 5.2, 1.1, 1.6), M.stone, -20.2, DECK + 2.6, z, gate)); gateStone.push(add(tbox(1.4, 0.4, 1.4, 1.6), M.stone, -20.2, DECK + 5.3, z, gate)); }
  gateStone.push(add(tbox(1.2, 0.9, 7.2, 1.6), M.stone, -20.2, DECK + 5.9, 0, gate));
  const eagle = add(new THREE.ConeGeometry(0.35, 0.9, 4), M.bronze, -20.2, DECK + 6.8, 0, gate);
  // عمود الراية + الراية
  const bannerG = new THREE.Group(); bannerG.position.set(-22.6, DECK, -3.3); world.add(bannerG);
  add(new THREE.CylinderGeometry(0.07, 0.07, 6.2, 8), M.wood, 0, 3.1, 0, bannerG);
  add(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 8), M.wood, 0, 5.9, 0, bannerG).rotation.x = Math.PI / 2;
  const bannerCloth = add(new THREE.PlaneGeometry(1.4, 2.8, 8, 8), M.banner, 0.06, 4.4, 0, bannerG); bannerCloth.rotation.y = Math.PI / 2;
  bannerCloth.userData.cloth = bannerCloth.geometry.attributes.position.array.slice();
  // كوخ الحارس بجانب البوابة
  const hut = new THREE.Group(); hut.position.set(-25.5, DECK, -6.2); world.add(hut);
  add(tbox(4, 3.2, 3.4, 2), M.stone, 0, 1.6, 0, hut);
  const hr = add(new THREE.ConeGeometry(3.2, 1.6, 4), M.roof, 0, 4.0, 0, hut); hr.rotation.y = Math.PI / 4; hr.scale.set(1, 1, 0.85);
  add(box(1, 1.9, 0.1), M.door, 0.6, 0.95, 1.72, hut);
  // المعبد على التلة البعيدة
  const TEMPLE = new THREE.Vector3(62, 0, -16);
  const hill = add(new THREE.SphereGeometry(30, 32, 16), M.hill, TEMPLE.x + 4, -10, TEMPLE.z - 4, world, { cast: false }); hill.scale.set(1, 0.85, 0.8);
  const temple = new THREE.Group(); temple.position.set(TEMPLE.x, 15.2, TEMPLE.z); temple.rotation.y = rx(-80); world.add(temple);
  add(tbox(14, 1.6, 22, 2), M.marbleTop, 0, 0.8, 0, temple);
  for (let i = 0; i < 4; i++) add(tbox(14 - i * 0.0, 0.3, 1.4, 2), M.marbleTop, 0, 0.15 + i * 0.3, 11.3 + i * -0.0 + 0.7 - i * 0.35, temple);
  const cella = add(tbox(9, 7, 13, 2), M.plaster, 0, 5.1, -3.5, temple);
  const columns = [];
  const colGeo = new THREE.CylinderGeometry(0.55, 0.62, 7, 14); colGeo.translate(0, 3.5, 0);
  const colPos = [];
  for (let i = 0; i < 6; i++) colPos.push([-5.6 + i * 2.24, 9.5]);
  for (let i = 0; i < 5; i++) { colPos.push([-5.6, 7 - i * 3.6]); colPos.push([5.6, 7 - i * 3.6]); }
  for (const [x, z] of colPos) { const c = add(colGeo, M.marble, x, 1.6, z, temple); c.userData.base = c.position.clone(); columns.push(c); }
  const entab = add(tbox(13, 1.1, 21, 2), M.marbleTop, 0, 9.15, -0.5, temple);
  const pedShape = new THREE.Shape(); pedShape.moveTo(-6.8, 0); pedShape.lineTo(6.8, 0); pedShape.lineTo(0, 2.6); pedShape.closePath();
  const roofG = new THREE.Group(); roofG.position.set(0, 9.7, -0.5); temple.add(roofG);
  const ped = add(new THREE.ExtrudeGeometry(pedShape, { depth: 21.6, bevelEnabled: false }), M.marbleTop, 0, 0, -10.8, roofG);
  for (const s of [-1, 1]) { const rf = add(tbox(7.4, 0.35, 22.2, 2), M.roof, s * 3.35, 1.3, 0, roofG); rf.rotation.z = -s * Math.atan2(2.6, 6.8); }
  entab.userData.base = entab.position.clone(); roofG.userData.base = roofG.position.clone();
  // بيوت القرية (الضفة القريبة) + بعض البيوت البعيدة
  const houses = [];
  const house = (x, z, w, d, h, rot, mat = M.plaster) => {
    const g = new THREE.Group(); g.position.set(x, DECK, z); g.rotation.y = rot; world.add(g);
    add(tbox(w, h, d, 2), mat, 0, h / 2, 0, g);
    const rf = add(new THREE.ConeGeometry(Math.hypot(w, d) / 2 + 0.5, 1.8, 4), M.roof, 0, h + 0.9, 0, g); rf.rotation.y = Math.PI / 4; rf.scale.set(w / Math.hypot(w, d) * 1.414, 1, d / Math.hypot(w, d) * 1.414);
    add(box(0.9, 1.8, 0.1), M.door, 0, 0.9, d / 2 + 0.03, g, { cast: false });
    for (const s of [-1, 1]) add(box(0.6, 0.7, 0.1), M.window, s * w * 0.3, h * 0.62, d / 2 + 0.03, g, { cast: false });
    houses.push(g); return g;
  };
  const rh = P.rng(12);
  [[-34, -12], [-41, 9], [-48, -14], [-56, 6], [-63, -20], [-70, 0], [-52, 24], [-75, 18]].forEach(([x, z], i) =>
    house(x, z, 4 + rh() * 3, 4 + rh() * 2.5, 3.2 + rh() * 2.4, rh() * 0.6 - 0.3 + (z > 0 ? Math.PI : 0), i % 2 ? M.plaster : M.plaster2));
  [[34, 14], [42, 24], [36, -30], [48, 32], [30, 30]].forEach(([x, z], i) => house(x, z, 4 + rh() * 3, 4 + rh() * 2, 3 + rh() * 2, rh() * 3, i % 2 ? M.plaster2 : M.plaster));
  // الأشجار
  const cypress = (x, z, h = 7, y = DECK) => { const g = new THREE.Group(); g.position.set(x, y, z); world.add(g); add(new THREE.CylinderGeometry(0.15, 0.2, 1, 6), M.trunk, 0, 0.5, 0, g); const c = add(new THREE.SphereGeometry(1, 10, 10), M.cypress, 0, 0.9 + h / 2, 0, g); c.scale.set(0.95, h / 2, 0.95); return g; };
  const pine = (x, z, h = 6, y = DECK) => { const g = new THREE.Group(); g.position.set(x, y, z); world.add(g); const t = add(new THREE.CylinderGeometry(0.2, 0.3, h, 6), M.trunk, 0, h / 2, 0, g); t.rotation.z = 0.08; const c = add(new THREE.SphereGeometry(1, 12, 8), M.pine, 0.3, h + 0.3, 0, g); c.scale.set(3.2, 1.1, 3.2); return g; };
  const rt = P.rng(44);
  for (let i = 0; i < 34; i++) { const x = -(24 + rt() * 70), z = (rt() - 0.5) * 120; if (Math.abs(z) < 5 && x > -60) continue; (i % 3 ? cypress : pine)(x, z, 5 + rt() * 4); }
  for (let i = 0; i < 30; i++) { const x = 24 + rt() * 70, z = (rt() - 0.5) * 140; if (Math.abs(z) < 5 && x < 60) continue; if (Math.hypot(x - TEMPLE.x, z - TEMPLE.z) < 22) continue; (i % 3 ? cypress : pine)(x, z, 5 + rt() * 4); }
  for (let i = 0; i < 8; i++) { const a = rt() * 6.28; cypress(TEMPLE.x + Math.cos(a) * 16, TEMPLE.z + Math.sin(a) * 14, 6 + rt() * 3, 13); }
  for (let i = 0; i < 26; i++) { const s = i % 2 ? 1 : -1; if (s < 0) { rt(); rt(); rt(); continue; } add(new THREE.SphereGeometry(0.9 + rt() * 0.8, 10, 8), M.bush, s * (21.5 + rt() * 12), DECK + 0.3, (rt() - 0.5) * 60, world).scale.y = 0.7; }
  // تلال متموجة + جبال (بعيدة)
  for (let i = 0; i < 16; i++) { const a = rt() * Math.PI * 2, d = 160 + rt() * 160; const h = add(new THREE.SphereGeometry(40 + rt() * 40, 20, 10), i % 2 ? M.hill : M.hillFar, Math.cos(a) * d, -12, Math.sin(a) * d, world, { cast: false }); h.scale.y = 0.5 + rt() * 0.3; }
  for (let i = 0; i < 14; i++) { const a = rt() * Math.PI * 2, d = 520 + rt() * 200, hh = 120 + rt() * 120, r_ = 110 + rt() * 70; const g = new THREE.Group(); g.position.set(Math.cos(a) * d, -5, Math.sin(a) * d); world.add(g); add(new THREE.ConeGeometry(r_, hh, 7), M.mount, 0, hh / 2, 0, g, { cast: false }); add(new THREE.ConeGeometry(r_ * 0.3, hh * 0.3, 7), M.snow, 0, hh * 0.86, 0, g, { cast: false }); }

  // السحب: لوحات مرسومة بعيدة (بلا ضباب ولا حبر)
  const clouds = [];
  { const r = P.rng(90);
    for (let i = 0; i < 14; i++) {
      const c = document.createElement('canvas'); c.width = 600; c.height = 400; const pen = new T.Pen(c.getContext('2d')); pen.ol = 0;
      pen.g.translate(300, 200); pen.g.scale(1.4, 1.2); pen.g.translate(-300, -200); T.fxCloud(pen, i + 1);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.667), new THREE.MeshBasicMaterial({ map: P.tex(c), transparent: true, fog: false, depthWrite: false }));
      const a = r() * Math.PI * 2, d = 650 + r() * 250; m.position.set(Math.cos(a) * d, 120 + r() * 160, Math.sin(a) * d); m.scale.setScalar(160 + r() * 140);
      m.userData.ndSkip = true; m.renderOrder = -1; scene.add(m); clouds.push(m);
    } }

  // ---------- الخوذة (غرض ثلاثي الأبعاد) ----------
  const helmet = new THREE.Group(); scene.add(helmet); helmet.visible = false;
  {
    const inGeo = new THREE.SphereGeometry(0.98, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2);
    const uv = inGeo.attributes.uv, pos = inGeo.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.5 - pos.getX(i) / 2.1, 0.5 - pos.getZ(i) / 2.1);
    add(inGeo, M.helmIn, 0, 0, 0, helmet);
    add(new THREE.SphereGeometry(1.0, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), M.helmOut, 0, 0, 0, helmet);
    const band = add(new THREE.TorusGeometry(1.0, 0.07, 8, 48), toon({ color: '#a88a4a' }), 0, 0.02, 0, helmet); band.rotation.x = Math.PI / 2;
    const crest = add(new THREE.CylinderGeometry(1.3, 1.3, 0.22, 32, 1, false, 0, Math.PI), toon({ color: '#8d4b3f' }), 0, 0.95, 0, helmet);
    crest.rotation.z = Math.PI / 2; crest.rotation.y = Math.PI / 2; crest.scale.set(1, 1, 0.6);
  }

  // ---------- الحالة لكل إطار ----------
  function update(S, f) {
    // انهيار المعبد
    const k = S.collapse; // 0..1+
    columns.forEach((c, i) => {
      const ord = (i * 7) % columns.length, t = Math.min(1, Math.max(0, (k * 1.6 - ord / columns.length * 0.6)));
      const e = t * t; c.rotation.set(0, 0, 0); c.position.copy(c.userData.base);
      if (t > 0) { const dir = (i % 3) - 1 || 1; c.rotation.z = dir * e * 1.45; c.rotation.x = ((i % 2) * 2 - 1) * e * 0.35; c.position.y -= e * 0.4; }
    });
    const kr = Math.min(1, Math.max(0, k * 1.4 - 0.15)), er = kr * kr;
    entab.position.copy(entab.userData.base); entab.position.y -= er * 7.6; entab.rotation.set(er * 0.1, 0, er * 0.22);
    roofG.position.copy(roofG.userData.base); roofG.position.y -= er * 8.2; roofG.rotation.set(-er * 0.12, 0, -er * 0.38);
    cella.scale.y = 1 - er * 0.45; cella.position.y = 5.1 - er * 1.6;
    // الراية: تموج، تسقط في الانهيار، ثم تختفي
    bannerG.visible = S.banner !== 'gone';
    bannerG.rotation.x = S.banner === 'fall' ? -Math.min(1.45, Math.pow(Math.max(0, S.bannerFall), 2) * 1.45) : 0;
    const pa = bannerCloth.geometry.attributes.position, base = bannerCloth.userData.cloth;
    for (let i = 0; i < pa.count; i++) { const x = base[i * 3], y = base[i * 3 + 1]; const amp = (1.4 - (y + 1.4)) * 0; pa.setZ(i, Math.sin(f * 0.18 + x * 3.2 + y * 1.3) * 0.08 * (x + 0.7)); }
    pa.needsUpdate = true;
    // التقدّم في العمر: طحالب / لبلاب على البوابة والكوخ
    for (const m of gateStone) m.material = S.old ? M.stoneMoss : M.stone;
    eagle.visible = !S.old;
    // الدعامة المكسورة في اللقطة 8
    const br = braces[2]; br.userData.p0 = br.userData.p0 || br.position.clone(); br.userData.r0 = br.userData.r0 ?? br.rotation.z;
    br.position.copy(br.userData.p0); br.rotation.set(0, 0, br.userData.r0);
    if (S.braceFall > 0) { const t = S.braceFall; br.position.y -= 0.5 * 9.8 * t * t * 0.55; br.position.x += t * 0.6; br.rotation.z = br.userData.r0 + t * 1.3; br.rotation.x = t * 0.5; br.visible = br.position.y > -0.4; }
    else br.visible = true;
    waterU.t.value = f / 30;
    // الخوذة
    const h = S.helmet;
    helmet.visible = !!h;
    if (h) { helmet.position.set(h.x, h.y, h.z); helmet.rotation.set(h.rx || 0, h.ry || 0, h.rz || 0); helmet.scale.setScalar(h.s || 0.17); }
  }
  const light = (L) => { waterU.deep.value.set(L.waterDeep); waterU.shal.value.set(L.waterShal); waterU.glint.value.set(L.glint); };
  return { update, light, faceCamera: clouds };
}
