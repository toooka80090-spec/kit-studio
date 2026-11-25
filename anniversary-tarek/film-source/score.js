// Tarek & Amira — 7 years. The soundtrack (Tarek's own voice-over + an original score) is pre-mixed into
// out/music.wav; every scene time below comes from that voice-over, so picture and sound share one clock.
(function () {
  const node = typeof require !== 'undefined';
  const U = node ? require('./engine/util') : globalThis.U;
  const MU = node ? require('./engine/music') : globalThis.MUSIC;
  const { makeClock } = MU;

  const FPS = 30;
  const FORMAT = U.pickFormat('16:9');
  const [W, H] = U.formatSize(FORMAT);
  const SAFE = U.safeArea(W, H);
  const WIDE = W / H > 1.2;
  const clock = makeClock({ bpm: 68, offset: 0 });
  const { T, BEAT } = clock;
  const CUTS = [0.0, 7.56, 20.73, 30.74, 39.14, 59.28, 68.74, 79.64, 87.33, 95.73, 102.76, 114.59, 119.96, 133.94, 150.79, 158.7];
  const DURATION = 171.45;
  const NAMES = ['intro', 'office', 'fatiha', 'engage', 'five', 'train', 'distance', 'katb', 'wedding', 'sharm', 'corona', 'zeyad', 'surgery', 'now', 'finale', 'outro'];
  const S = {};
  NAMES.forEach((n, i) => { S[n] = [CUTS[i], i + 1 < CUTS.length ? CUTS[i + 1] : DURATION]; });
  const markers = {};
  NAMES.forEach((n, i) => { markers[n] = CUTS[i]; });
  const SCORE = { FPS, FORMAT, W, H, SAFE, WIDE, DURATION, clock, T, BEAT, S, CUTS, NAMES, markers, ev: {} };
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
