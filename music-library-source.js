export async function readMusicLibrary({ apiUrl, manifestUrl, fetchFile = fetch }) {
  for (const url of [apiUrl, manifestUrl].filter(Boolean)) {
    try {
      const response = await fetchFile(url, { cache: 'no-cache' });
      if (!response.ok) continue;
      const data = await response.json();
      if (!Array.isArray(data.tracks) || data.tracks.some(track => typeof track.src !== 'string' || !track.src)) continue;
      const base = response.url || String(url);
      return data.tracks.map(track => ({
        ...track,
        src: new URL(track.src, base).href,
        cover: track.cover ? new URL(track.cover, base).href : '',
      }));
    } catch { /* Try the static manifest when a live music service is unavailable. */ }
  }
  throw new Error('Music library unavailable');
}
