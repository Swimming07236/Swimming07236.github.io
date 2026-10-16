const TAU = Math.PI * 2;
export const STAR_MARGIN = 32;

export function createStarDrift({ speed = .65, intervalMin = 180000, intervalMax = 360000, random = Math.random } = {}) {
  let x, y, elapsed, lastTime, from, to, duration;
  function chooseSegment() {
    const angle = random() * TAU;
    to = from + Math.atan2(Math.sin(angle - from), Math.cos(angle - from));
    duration = intervalMin + random() * (intervalMax - intervalMin);
  }
  function reset() {
    x = y = elapsed = 0;
    lastTime = null;
    from = random() * TAU;
    chooseSegment();
  }
  function update(now, enabled = true) {
    const dt = lastTime === null ? 0 : Math.min(100, Math.max(0, now - lastTime));
    lastTime = now;
    if (!enabled) return { x, y };
    elapsed += dt;
    if (elapsed >= duration) {
      elapsed -= duration;
      from = to;
      chooseSegment();
    }
    const t = elapsed / duration;
    const smooth = t * t * (3 - 2 * t);
    const heading = from + (to - from) * smooth;
    x += Math.cos(heading) * speed * dt / 1000;
    y += Math.sin(heading) * speed * dt / 1000;
    return { x, y };
  }
  reset();
  return { update, reset };
}

export function wrapStar(value, size, margin = STAR_MARGIN) {
  const span = size + margin * 2;
  return ((value + margin) % span + span) % span - margin;
}
