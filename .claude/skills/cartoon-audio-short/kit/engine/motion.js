// أدوات الحركة: حركة ناعمة ومتصلة و"حيّة" للكاميرات والبطاقات.
// الاستيراد في story.js:  import { M, clamp, lerp, lerp3, ramp, blinkAt, q, R, FX, dist } from './motion.js';
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const lerp3 = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
export const ramp = (f, a, b) => clamp((f - a) / (b - a));
export const M = {
  smooth: (t) => { t = clamp(t); return t * t * t * (t * (t * 6 - 15) + 10); },           // smootherstep (انزلاقات)
  easeOut: (t) => 1 - Math.pow(1 - clamp(t), 3),                                          // بداية سريعة وهبوط ناعم (حركات "الاندفاع")
  easeIn: (t) => Math.pow(clamp(t), 3),
  back: (t, s = 1.7) => { t = clamp(t) - 1; return t * t * ((s + 1) * t + s) + 1; },        // تجاوز ثم استقرار (ظهور، وصول)
  anticip: (t, s = 0.12) => { t = clamp(t); return t < 0.25 ? -s * Math.sin(t / 0.25 * Math.PI) : M.back((t - 0.25) / 0.75); }, // تمهيد ثم انطلاق
  spring: (t, freq = 3, damp = 5) => { t = Math.max(0, t); return 1 - Math.exp(-damp * t) * Math.cos(freq * 2 * Math.PI * t); },  // اهتزاز الاستقرار (t بالثواني)
};
/** Catmull-Rom مركزي عبر نقاط ثلاثية الأبعاد؛ u من 0 إلى 1 على المسار كله (سرعة شبه ثابتة). */
export const spline = (pts, u) => {
  const n = pts.length - 1, x = clamp(u) * n, i = Math.min(n - 1, Math.floor(x)), t = x - i;
  const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n, i + 2)];
  return p1.map((_, k) => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t * t * t));
};
/** كاميرا من مفاتيح {f,pos,look,fov,roll,ease?}. ثلاثة مفاتيح أو أكثر في انزلاق واحد تستخدم منحنى (بلا زوايا).
 *  كل ثبات فيه زحف (اقتراب) حتى لا يتجمد شيء؛ أضف kicks للاصطدامات. */
export const camFromKeys = (K, f, { creep = 0.0012, kicks = [] } = {}) => {
  let c;
  if (f <= K[0].f) c = { ...K[0] };
  else if (f >= K[K.length - 1].f) c = { ...K[K.length - 1] };
  else {
    const i = K.findIndex((k, j) => f >= k.f && f <= K[j + 1].f), a = K[i], b = K[i + 1];
    const ease = M[b.ease || 'smooth'], t = ease((f - a.f) / (b.f - a.f));
    if (b.path) { // نقاط عبور اختيارية للحركات المنحنية: b.path = [[x,y,z], ...]
      const pts = [a.pos, ...b.path, b.pos]; c = { pos: spline(pts, t), look: lerp3(a.look, b.look, t), fov: lerp(a.fov, b.fov, t), roll: lerp(a.roll || 0, b.roll || 0, t) };
    } else c = { pos: lerp3(a.pos, b.pos, t), look: lerp3(a.look, b.look, t), fov: lerp(a.fov, b.fov, t), roll: lerp(a.roll || 0, b.roll || 0, t) };
  }
  c.fov *= 1 - creep * Math.max(0, f - K[0].f) * 0.15; // اقتراب خفيف أثناء الثبات
  for (const k of kicks) { const d = f - k.f; if (d >= 0 && d < 7) { const s = (d % 2 ? -1 : 1) * k.a * (1 - d / 7); c.look = [c.look[0], c.look[1] + s * 3, c.look[2] + s * 2]; c.roll = (c.roll || 0) + s * 20; } }
  return c;
};
/** حياة البطاقة في السكون: تنفّس وتمايل خفيف، ثابت لكل seed. استخدمه على كل شخصية تظهر في الكادر. */
export const idle = (f, seed = 1) => ({
  bob: 0.006 * Math.sin((f + seed * 11) * 0.11),
  tilt: 1.2 * Math.sin((f + seed * 7) * 0.05),
  headTilt: 1.5 * Math.sin((f + seed * 5) * 0.037 + 1),
});
/** الرمش: جفن لـ 4 إطارات كل 0.5–2.3 ث. */
export const blinkAt = (f, seed) => { const per = 38 + (seed * 17) % 31, ph = (f + seed * 13) % per; return ph < 2 ? 0.5 : ph < 4 ? 1 : 0; };
/** المشي: طور دورة الخطوة + تنقّل بقدمين ثابتتين. السرعة م/ث، والخطوة بالمتر. */
export const walk = (f, f0, speed = 1.1, stride = 0.8) => { const t = Math.max(0, f - f0) / 30; return { dist: t * speed, phase: (t * speed / (2 * stride)) % 1 }; };
/** تقريب القيم المستخدمة في مفاتيح البطاقات حتى لا يُعاد رسم الـ canvas إلا عند تغيّر مرئي في الوضعية. */
export const q = (x, n = 2) => Math.round(x * 10 ** n) / 10 ** n;
/** بطاقة شخصية لـ actorsAt: R(T, مفتاح_الزي, خيارات romanFront, [x,y,z], {tint, order, ...}). */
export const R = (T, who, o, pos, extra = {}) => ({ key: who + JSON.stringify(o), draw: (p) => T.romanFront(p, who, o), x: pos[0], y: pos[1], z: pos[2], ...extra });
/** بطاقة مؤثر ثنائي الأبعاد لـ fxAt (بلا بقعة تلامس ولا ظل، تُرسم فوق الكل). */
export const FX = (key, draw, pos, s, extra = {}) => ({ key, draw, x: pos[0], y: pos[1], z: pos[2], s, blob: false, shadow: false, order: 5, ...extra });
/** المسافة بين نقطتين ثلاثيتي الأبعاد (مسافة التركيز لـ dofAt). */
export const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
