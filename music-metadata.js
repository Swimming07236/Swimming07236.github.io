export const metadataOptions = { duration: false, maxMemoryAllocation: 16 * 1024 * 1024 };

export function filenameTitle(filename) {
  return filename.replace(/\.[^.]+$/, '') || '未命名音乐';
}

export function mergeMusicTracks(configured, discovered, local, baseUrl) {
  const key = src => new URL(src, baseUrl).href;
  const library = new Map(discovered.map(track => [key(track.src), track]));
  const merged = new Map(configured.map(track => [key(track.src), { ...library.get(key(track.src)), ...track }]));
  for (const track of [...discovered, ...local]) if (!merged.has(key(track.src))) merged.set(key(track.src), track);
  return [...merged.values()];
}

export function parseLyricText(input = '') {
  const text = String(input);
  const lines = text.replace(/\r/g, '').split('\n');
  const offset = Number(text.match(/\[offset:([+-]?\d+)\]/i)?.[1] || 0) / 1000;
  const timed = [];
  for (const line of lines) {
    const stamps = [...line.matchAll(/\[(\d+):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
    const words = line.replace(/\[(\d+):(\d{2})(?:[.:](\d{1,3}))?\]/g, '').replace(/<\d+:\d{2}(?:\.\d+)?>/g, '').trim();
    for (const stamp of stamps) {
      if (Number(stamp[2]) >= 60) continue;
      timed.push({ time: Math.max(0, Number(stamp[1]) * 60 + Number(stamp[2]) + Number(`0.${stamp[3] || 0}`) - offset), text: words });
    }
  }
  if (timed.length) return { synchronized: true, lines: timed.sort((a, b) => a.time - b.time) };
  return { synchronized: false, lines: lines.filter(line => !/^\s*\[(?:ar|al|ti|by|offset|length|re|ve):.*\]\s*$/i.test(line)).map(text => ({ time: null, text: text.trim() })).filter(line => line.text) };
}

export function normalizeMusicMetadata(metadata = {}, fallback = '') {
  const common = metadata.common || {};
  const candidates = [...(common.lyrics || [])];
  for (const tags of Object.values(metadata.native || {})) {
    for (const tag of tags) {
      if (/^(?:ULT|USLT|SYLT)$/i.test(tag.id) && tag.value && typeof tag.value === 'object') candidates.push(tag.value);
      if (/^(?:TXXX:)?(?:UNSYNCED)?LYRICS$/i.test(tag.id) && typeof tag.value === 'string') candidates.push({ text: tag.value });
    }
  }
  let lyrics = { synchronized: false, lines: [] };
  for (const candidate of candidates) {
    const item = typeof candidate === 'string' ? { text: candidate } : candidate;
    const parsed = parseLyricText(item.text || '');
    const sync = item.timeStampFormat === 2 ? (item.syncText || []).filter(line => Number.isFinite(line.timestamp) && line.timestamp >= 0).map(line => ({ time: line.timestamp / 1000, text: line.text || '' })).sort((a, b) => a.time - b.time) : [];
    const result = sync.length ? { synchronized: true, lines: sync } : parsed.lines.length ? parsed : { synchronized: false, lines: (item.syncText || []).map(line => ({ time: null, text: line.text || '' })).filter(line => line.text) };
    if (result.synchronized || !lyrics.lines.length) lyrics = result;
    if (lyrics.synchronized) break;
  }
  return { title: common.title?.trim() || filenameTitle(fallback), artist: common.artist || '', album: common.album || '', lyrics };
}

export function embeddedCover(metadata) {
  const pictures = (metadata.common?.picture || []).filter(picture => /^image\/(?:jpeg|png|webp|gif)$/i.test(picture.format) && picture.data?.length > 0 && picture.data.length <= 12 * 1024 * 1024);
  return pictures.find(picture => /front|^cover$/i.test(picture.type || '')) || pictures[0] || null;
}

export function activeLyricIndex(lines, time) {
  let low = 0;
  let high = lines.length - 1;
  let found = -1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (lines[middle].time <= time) { found = middle; low = middle + 1; }
    else high = middle - 1;
  }
  return found;
}
