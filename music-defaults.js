export function introGainForSanity(sanity) {
  const amount = 1 - Math.max(0, Math.min(999, sanity)) / 999;
  return amount * amount * (3 - 2 * amount);
}

export function defaultTrackIndex(tracks, selection, random = Math.random) {
  if (!tracks.length || !selection) return -1;
  if (selection === 'random') return Math.floor(random() * tracks.length);
  return tracks.findIndex(track => {
    if (track.file?.name === selection) return true;
    const name = new URL(track.src, 'http://music.local/').pathname.split('/').pop();
    try { return decodeURIComponent(name) === selection; } catch { return name === selection; }
  });
}

export function createDefaultMusic({ defaults, getTracks, isReady, play, onMissing, random = Math.random }) {
  let pendingPage = null;
  function flush() {
    if (pendingPage === null || !isReady()) return;
    const selection = defaults[pendingPage];
    pendingPage = null;
    if (!selection) return;
    const index = defaultTrackIndex(getTracks(), selection, random);
    if (index >= 0) play(index);
    else onMissing(selection);
  }
  return {
    enter(page) { pendingPage = page; flush(); },
    flush,
    reset() { pendingPage = null; },
  };
}
