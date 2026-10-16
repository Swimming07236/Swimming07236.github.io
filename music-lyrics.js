import { activeLyricIndex } from './music-metadata.js';

export function createLyricsView(audio) {
  const body = document.querySelector('#music-lyrics-lines');
  const mode = document.querySelector('#music-lyrics-mode');
  const follow = document.querySelector('#music-follow');
  let lyrics = { synchronized: false, lines: [] };
  let active = -2;
  let following = true;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function setFollow(value) {
    following = value;
    follow.setAttribute('aria-pressed', String(value));
  }
  function sync(force = false) {
    if (!lyrics.synchronized) return;
    const next = activeLyricIndex(lyrics.lines, audio.currentTime);
    if (!force && next === active) return;
    active = next;
    const time = next < 0 ? null : lyrics.lines[next].time;
    for (let i = 0; i < body.children.length; i++) {
      const selected = time !== null && lyrics.lines[i].time === time;
      body.children[i].classList.toggle('is-current', selected);
      if (selected) body.children[i].setAttribute('aria-current', 'true');
      else body.children[i].removeAttribute('aria-current');
    }
    if (following && next >= 0 && body.clientHeight) {
      const first = lyrics.lines.findIndex(line => line.time === time);
      const line = body.children[first];
      body.scrollTo({ top: Math.max(0, line.offsetTop - body.clientHeight / 2 + line.offsetHeight / 2), behavior: force || reducedMotion.matches ? 'instant' : 'smooth' });
    }
  }
  follow.addEventListener('click', () => { setFollow(true); sync(true); });
  for (const event of ['wheel', 'touchstart']) body.addEventListener(event, () => setFollow(false), { passive: true });
  body.addEventListener('keydown', event => { if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(event.key)) setFollow(false); });

  return {
    sync,
    render(value, emptyText = '这首音乐没有内嵌歌词。') {
      lyrics = value || { synchronized: false, lines: [] };
      active = -2;
      setFollow(true);
      follow.disabled = !lyrics.synchronized;
      mode.textContent = lyrics.lines.length ? lyrics.synchronized ? '同步歌词' : '歌词文本' : '歌词';
      body.replaceChildren();
      body.scrollTop = 0;
      if (!lyrics.lines.length) {
        const empty = document.createElement('p'); empty.className = 'music-lyrics-empty'; empty.textContent = emptyText; body.append(empty);
      }
      for (const line of lyrics.lines) {
        const element = document.createElement(lyrics.synchronized ? 'button' : 'p');
        element.className = 'music-lyric-line';
        element.textContent = line.text || '♪';
        if (lyrics.synchronized) {
          element.type = 'button';
          element.addEventListener('click', () => {
            if (Number.isFinite(audio.duration)) { audio.currentTime = Math.min(line.time, audio.duration); setFollow(true); sync(true); }
          });
        }
        body.append(element);
      }
      sync(true);
    },
  };
}
