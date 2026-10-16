const clampProgress = progress => Math.max(0, Math.min(100, progress));

export function sanityAtProgress(progress) {
  const value = clampProgress(progress);
  if (value >= 100) return -1;
  if (value >= 90) return 0;
  return Math.ceil(999 * Math.pow(1 - value / 90, 2.8));
}

export function sanityDigits(value) {
  return String(Math.abs(value)).length;
}

export function loadingColor(progress) {
  const amount = clampProgress(progress) / 100;
  const yellow = [242, 213, 55];
  const white = [239, 244, 244];
  return yellow.map((channel, index) => Math.round(channel + (white[index] - channel) * amount));
}

export function vertexColor(progress, distance) {
  const front = clampProgress(progress) / 100 * 1.18;
  const amount = Math.max(0, Math.min(1, (front - distance) / .18));
  return loadingColor(amount * amount * (3 - 2 * amount) * 100);
}

export function loadingPhase(progress, count) {
  return Math.min(count - 1, Math.floor(clampProgress(progress) / 100 * count));
}

export function garbleMessage(seed) {
  const glyphs = '01░▒▓<>/\\{}[]#%&∴∷';
  let state = seed + 73;
  return Array.from({ length: 18 }, (_, index) => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return glyphs[state % glyphs.length] + (index === 4 || index === 9 || index === 14 ? ' ' : '');
  }).join('');
}
