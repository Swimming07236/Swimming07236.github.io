import { filenameTitle, mergeMusicTracks, normalizeMusicMetadata, embeddedCover, metadataOptions } from './music-metadata.js';
import { createLyricsView } from './music-lyrics.js';
import { createDefaultMusic, introGainForSanity } from './music-defaults.js';
import { readMusicLibrary } from './music-library-source.js';

export function formatMusicTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

export function initMusic(configured = [], defaults = {}) {
  const $ = selector => document.querySelector(selector);
  const player = $('#music-player');
  const panel = $('#music-panel');
  const toggle = $('#music-toggle');
  const audio = $('#music-audio');
  const play = $('#music-play');
  const seek = $('#music-seek');
  const volume = $('#music-volume');
  const cover = $('#music-cover');
  const status = $('#music-status');
  const importStatus = $('#music-import-status');
  const lyrics = createLyricsView(audio);
  const hover = window.matchMedia('(hover: hover)');
  const metadataCache = new Map();
  const objectUrls = new Set();
  const originals = configured.map(track => typeof track === 'string' ? { src: track } : track);
  const localTracks = [];
  let tracks = [...originals];
  let index = 0;
  let revision = 0;
  let pinned = false;
  let hasError = false;
  let libraryReady = false;
  let introActive = false;
  let introGain = 1;
  let autoplayBlocked = false;
  const defaultMusic = createDefaultMusic({
    defaults,
    getTracks: () => tracks,
    isReady: () => libraryReady,
    play: next => { importStatus.textContent = ''; load(next, true); },
    onMissing: selection => {
      audio.pause();
      importStatus.textContent = selection === 'random' ? '音乐文件夹中还没有可播放的歌曲。' : `没有找到本页默认音乐：${selection}。请检查音乐文件夹和默认音乐配置。`;
    },
  });

  function expand(open) {
    player.classList.toggle('is-open', open);
    panel.inert = !open;
    panel.setAttribute('aria-hidden', String(!open));
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? '收起音乐栏' : '展开音乐栏');
    if (open) requestAnimationFrame(() => lyrics.sync(true));
  }
  player.addEventListener('pointerenter', event => { if (hover.matches && event.pointerType !== 'touch') expand(true); });
  player.addEventListener('pointerleave', () => { if (!pinned && hover.matches) expand(false); });
  toggle.addEventListener('click', () => { pinned = !pinned; expand(pinned); });
  toggle.addEventListener('focus', () => { if (toggle.matches(':focus-visible')) expand(true); });
  player.addEventListener('focusout', event => { if (!pinned && !player.contains(event.relatedTarget)) expand(false); });
  player.addEventListener('keydown', event => {
    if (event.key === 'Escape') { pinned = false; toggle.focus({ preventScroll: true }); expand(false); }
  });
  document.addEventListener('pointerdown', event => {
    if (!player.contains(event.target)) { pinned = false; expand(false); }
  });
  window.addEventListener('pagehide', event => { if (!event.persisted) for (const url of objectUrls) URL.revokeObjectURL(url); });

  function objectUrl(blob) {
    const url = URL.createObjectURL(blob);
    objectUrls.add(url);
    return url;
  }
  function fallback(track) {
    if (track.file) return track.file.name;
    const name = new URL(track.src, location.href).pathname.split('/').pop();
    try { return decodeURIComponent(name); } catch { return name; }
  }
  function paintRange(input) {
    const percent = (input.value - input.min) / (input.max - input.min) * 100;
    input.style.setProperty('--range-progress', `${percent}%`);
  }
  function syncControls() {
    const ready = tracks.length > 0;
    play.disabled = volume.disabled = !ready;
    $('#music-previous').disabled = $('#music-next').disabled = tracks.length < 2;
    $('#music-count').textContent = `${String(ready ? index + 1 : 0).padStart(2, '0')} / ${String(tracks.length).padStart(2, '0')}`;
  }
  function syncTime() {
    const duration = audio.duration;
    const ready = Number.isFinite(duration) && duration > 0 && !hasError;
    seek.disabled = !ready;
    seek.value = ready ? audio.currentTime / duration * 100 : 0;
    seek.setAttribute('aria-valuetext', `${formatMusicTime(audio.currentTime)} / ${formatMusicTime(duration)}`);
    $('#music-elapsed').textContent = formatMusicTime(audio.currentTime);
    $('#music-duration').textContent = formatMusicTime(duration);
    paintRange(seek);
    lyrics.sync();
  }
  function syncPlayback() {
    const playing = !audio.paused && !audio.ended;
    player.dataset.playing = String(playing);
    play.setAttribute('aria-label', playing ? '暂停音乐' : '播放音乐');
    if (!hasError && tracks.length) status.textContent = playing ? '正在播放' : audio.currentTime > 0 ? '已暂停' : '点击播放，让声音流入。';
  }
  async function start() {
    const request = revision;
    hasError = false;
    try { await audio.play(); autoplayBlocked = false; }
    catch (error) {
      if (request !== revision || error.name === 'AbortError') return;
      autoplayBlocked = error.name === 'NotAllowedError';
      status.textContent = autoplayBlocked ? '请在音乐栏点击播放。' : '这首音乐暂时无法播放，请检查文件或切换歌曲。';
      hasError = true;
      syncPlayback();
    }
  }
  function readMetadata(track) {
    if (track.metadataReady) return Promise.resolve(track);
    if (!metadataCache.has(track.src)) {
      metadataCache.set(track.src, (async () => {
        if (!track.file && !/\.mp3(?:[?#]|$)/i.test(track.src)) return normalizeMusicMetadata({}, fallback(track));
        try {
          const { parseBlob } = await import('./vendor/music-metadata.js');
          let blob = track.file;
          if (!blob) {
            const response = await fetch(track.src);
            if (!response.ok) throw new Error('Audio unavailable');
            blob = await response.blob();
          }
          const metadata = await parseBlob(blob, metadataOptions);
          const picture = embeddedCover(metadata);
          return { ...normalizeMusicMetadata(metadata, fallback(track)), cover: picture ? objectUrl(new Blob([picture.data], { type: picture.format })) : '' };
        } catch {
          return { ...normalizeMusicMetadata({}, fallback(track)), metadataError: true };
        }
      })());
    }
    return metadataCache.get(track.src);
  }
  async function showMetadata(track, request) {
    const info = await readMetadata(track);
    if (request !== revision || tracks[index]?.src !== track.src) return;
    const title = track.title || info.title;
    $('#music-title').textContent = title;
    const byline = [track.artist || info.artist, track.album || info.album].filter(Boolean).join(' · ');
    $('#music-artist').textContent = byline;
    $('#music-artist').hidden = !byline;
    cover.src = track.cover || info.cover || '/assets/music-cover.svg';
    cover.alt = `${title}的专辑封面`;
    toggle.title = `音乐 · ${title}`;
    lyrics.render(info.lyrics, info.metadataError ? '未能读取内嵌歌词，仍可尝试播放音乐。' : '这首音乐没有内嵌歌词。');
  }
  function load(next, autoPlay = false) {
    revision++;
    audio.pause();
    hasError = false;
    if (!tracks.length) {
      audio.removeAttribute('src'); audio.load();
      $('#music-title').textContent = '等待一首音乐';
      $('#music-artist').hidden = true;
      cover.src = '/assets/music-cover.svg'; cover.alt = '';
      status.textContent = '此刻，静默也是一种声音。';
      lyrics.render(null, '添加 MP3，让歌词在这里展开。');
      syncControls(); syncTime(); syncPlayback();
      return;
    }
    index = (next + tracks.length) % tracks.length;
    const track = tracks[index];
    $('#music-title').textContent = track.title || filenameTitle(fallback(track));
    $('#music-artist').hidden = true;
    cover.src = track.cover || '/assets/music-cover.svg';
    lyrics.render(null, '正在读取内嵌歌词…');
    audio.src = track.src;
    audio.load();
    syncControls(); syncTime(); syncPlayback();
    void showMetadata(track, revision);
    if (autoPlay) void start();
  }
  async function refreshLibrary(manual = false) {
    const button = $('#music-refresh');
    button.disabled = true;
    try {
      const library = await readMusicLibrary({
        apiUrl: location.hostname.endsWith('.github.io') ? null : new URL('/api/music', location.href),
        manifestUrl: new URL('./assets/music/library.json', import.meta.url),
      });
      const current = tracks[index]?.src;
      tracks = mergeMusicTracks(originals, library, localTracks, location.href);
      const next = tracks.findIndex(track => track.src === current);
      if (next >= 0) { index = next; revision++; syncControls(); void showMetadata(tracks[index], revision); }
      else load(0);
      if (manual) importStatus.textContent = `已扫描音乐文件夹，共 ${library.length} 首。`;
    } catch { importStatus.textContent = '暂时无法读取音乐列表，请检查发布文件；仍可添加 MP3 试听。'; }
    finally { button.disabled = false; libraryReady = true; syncControls(); syncPlayback(); defaultMusic.flush(); }
  }

  cover.addEventListener('error', () => { if (cover.getAttribute('src') !== '/assets/music-cover.svg') cover.src = '/assets/music-cover.svg'; });
  play.addEventListener('click', () => {
    if (audio.paused) { if (audio.error) { audio.load(); hasError = false; } void start(); }
    else audio.pause();
  });
  $('#music-previous').addEventListener('click', () => load(index - 1, !audio.paused));
  $('#music-next').addEventListener('click', () => load(index + 1, !audio.paused));
  seek.addEventListener('input', () => {
    if (Number.isFinite(audio.duration) && audio.duration > 0) { audio.currentTime = Number(seek.value) / 100 * audio.duration; syncTime(); }
  });
  function applyVolume() { audio.volume = Number(volume.value) * (introActive ? introGain : 1); }
  volume.addEventListener('input', () => { applyVolume(); paintRange(volume); });
  for (const name of ['loadedmetadata', 'durationchange', 'timeupdate', 'emptied']) audio.addEventListener(name, syncTime);
  for (const name of ['play', 'pause', 'playing']) audio.addEventListener(name, syncPlayback);
  audio.addEventListener('waiting', () => { if (!audio.paused && !hasError) status.textContent = '正在缓冲…'; });
  audio.addEventListener('error', () => {
    hasError = true;
    status.textContent = '这首音乐暂时无法播放，请检查文件或切换歌曲。';
    syncTime(); syncPlayback();
  });
  audio.addEventListener('ended', () => load(index + 1, true));
  $('#music-refresh').addEventListener('click', () => void refreshLibrary(true));
  $('#music-show-lyrics').addEventListener('click', event => {
    const view = $('#music-lyrics');
    view.hidden = !view.hidden;
    event.currentTarget.setAttribute('aria-expanded', String(!view.hidden));
    if (!view.hidden) lyrics.sync(true);
  });
  $('#music-add').addEventListener('click', () => $('#music-files').click());
  $('#music-files').addEventListener('change', event => {
    const added = [];
    for (const file of event.target.files) {
      if (!/\.mp3$/i.test(file.name)) continue;
      const identity = `${file.name}:${file.size}:${file.lastModified}`;
      if (localTracks.some(track => track.identity === identity)) continue;
      const track = { src: objectUrl(file), file, identity };
      localTracks.push(track); added.push(track);
    }
    if (added.length) { tracks.push(...added); load(tracks.length - added.length); pinned = true; expand(true); }
    importStatus.textContent = added.length ? `已加入 ${added.length} 首，本次页面有效。` : '未加入新歌曲，请选择尚未添加的 MP3。';
    event.target.value = '';
  });
  applyVolume();
  paintRange(volume);
  load(0);
  const ready = refreshLibrary();
  return {
    ready,
    beginIntro() {
      defaultMusic.reset(); audio.pause(); autoplayBlocked = false;
      introActive = true; introGain = 0; applyVolume(); defaultMusic.enter('home');
    },
    setIntroSanity({ sanity }) { if (introActive) { introGain = introGainForSanity(sanity); applyVolume(); } },
    endIntro() { introActive = false; introGain = 1; applyVolume(); },
    pauseForGate() { defaultMusic.reset(); audio.pause(); introActive = false; introGain = 1; autoplayBlocked = false; applyVolume(); },
    resumeIntroIfBlocked() { if (introActive && autoplayBlocked && tracks.length) void start(); },
  };
}
