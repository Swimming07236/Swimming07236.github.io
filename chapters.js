import { createScene, prepareScene } from './scenes.js';

const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

export function initChapters({ content, site, onCategory, onSceneReady }) {
  const home = document.querySelector('#home-view');
  const chapter = document.querySelector('#chapter-view');
  const overlay = document.querySelector('#chapter-transition');
  const art = document.querySelector('#transition-art');
  const main = document.querySelector('#main-content');
  const navigation = document.querySelector('#navigation');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const destinations = [content.home, ...content.navigation];
  let current = null;
  let pending = null;
  let running = false;
  let started = false;
  let skipWait = null;
  prepareScene('home').catch(() => {});

  for (const item of destinations) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = item.label;
    button.dataset.chapter = item.id;
    button.style.setProperty('--nav-color', item.color);
    button.title = item.description;
    button.addEventListener('click', () => navigate(item.id));
    navigation.append(button);
  }

  document.querySelector('#home-title').textContent = content.home.label;
  document.querySelector('#home-introduction').replaceChildren(...content.home.intro.map(text => {
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    return paragraph;
  }));
  for (const [index, item] of content.navigation.entries()) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chapter-index-entry';
    button.style.setProperty('--entry-color', item.color);
    const number = document.createElement('span');
    number.className = 'index-number';
    number.textContent = String(index + 1).padStart(2, '0');
    const body = document.createElement('span');
    const label = document.createElement('strong');
    label.textContent = item.label;
    const type = document.createElement('span');
    type.className = 'index-type';
    type.textContent = item.description;
    const description = document.createElement('span');
    description.className = 'index-description';
    description.textContent = item.overview;
    const arrow = document.createElement('span');
    arrow.className = 'index-arrow';
    arrow.textContent = '↗';
    arrow.setAttribute('aria-hidden', 'true');
    body.append(label, type, description);
    button.append(number, body, arrow);
    button.setAttribute('aria-label', `进入${item.label}`);
    button.addEventListener('click', () => navigate(item.id));
    document.querySelector('#chapter-index').append(button);
  }

  document.querySelector('.brand').addEventListener('click', event => {
    event.preventDefault();
    navigate('home');
  });
  document.querySelector('#transition-skip').addEventListener('click', () => skipWait?.());
  document.addEventListener('keydown', event => {
    if (!overlay.hidden && event.key === 'Escape') skipWait?.();
  });
  window.addEventListener('popstate', () => {
    if (started) navigate(location.hash.slice(1) || 'home', false);
  });

  function prime() {
    site.inert = true;
    overlay.hidden = false;
    overlay.dataset.phase = 'black';
    art.replaceChildren();
    document.body.classList.add('chapter-active');
  }

  async function display(item, scene) {
    const isHome = item.id === 'home';
    home.hidden = !isHome;
    chapter.hidden = isHome;
    document.documentElement.style.setProperty('--chapter-color', item.color);
    for (const button of navigation.children) {
      if (button.dataset.chapter === item.id) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    }
    if (isHome) document.querySelector('#home-art').replaceChildren(scene);
    else {
      document.querySelector('#chapter-art').replaceChildren(scene);
      document.querySelector('#chapter-title').textContent = item.label;
      document.querySelector('.collection-description').textContent = item.intro;
    }
    onCategory(isHome ? null : item);
    document.title = isHome ? `${content.title} · ${content.italianTitle}` : `${item.label} · ${content.title}`;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  async function enter(item) {
    prime();
    overlay.style.opacity = '';
    document.querySelector('#transition-title').textContent = item.label;
    document.querySelector('#transition-number').textContent = item.chapter;
    overlay.style.setProperty('--chapter-color', item.color);
    const [scene] = await Promise.all([createScene(item.id), wait(reducedMotion.matches ? 100 : 500)]);
    const moving = await createScene(item.id, true);
    art.replaceChildren(moving);
    overlay.dataset.scene = item.id;
    overlay.dataset.phase = 'assembling';
    await new Promise(resolve => {
      const timer = setTimeout(resolve, reducedMotion.matches ? 250 : 3000);
      skipWait = () => { clearTimeout(timer); moving.classList.remove('is-assembling'); resolve(); };
    });
    skipWait = null;
    overlay.dataset.phase = 'holding';
    onSceneReady?.(item);
    await wait(reducedMotion.matches ? 100 : 800);
    await display(item, scene);
    site.removeAttribute('aria-hidden');
    site.classList.add('is-visible');
    overlay.dataset.phase = 'leaving';
    const duration = reducedMotion.matches ? 160 : 700;
    if (!reducedMotion.matches) {
      const from = moving.getBoundingClientRect();
      const to = scene.getBoundingClientRect();
      const scale = Math.min(to.width / 1280, to.height / 720) / Math.min(from.width / 1280, from.height / 720);
      const x = to.left + to.width / 2 - from.left - from.width / 2;
      const y = to.top + to.height / 2 - from.top - from.height / 2;
      moving.animate([{ transform: 'none' }, { transform: `translate(${x}px,${y}px) scale(${scale})` }], { duration, easing: 'ease-in-out', fill: 'forwards' });
    }
    await overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration, easing: 'ease-in-out', fill: 'forwards' }).finished;
    overlay.hidden = true;
    overlay.getAnimations().forEach(animation => animation.cancel());
    art.replaceChildren();
    site.inert = false;
    document.body.classList.remove('chapter-active', 'intro-active');
    main.focus({ preventScroll: true });
  }

  async function drain() {
    running = true;
    while (pending) {
      const request = pending;
      pending = null;
      try {
        await enter(request.item);
        current = request.item.id;
        if (request.history && location.hash !== `#${current}`) {
          if (location.hash) history.pushState(null, '', `#${current}`);
          else history.replaceState(null, '', `#${current}`);
        }
      } catch (error) {
        document.querySelector('#transition-title').textContent = error.message;
        overlay.dataset.phase = 'error';
        site.inert = false;
        document.querySelector('#transition-skip').textContent = '重试 ↗';
        skipWait = () => { current = null; overlay.hidden = true; navigate(request.item.id, false); };
      }
    }
    running = false;
  }

  function navigate(id, updateHistory = true) {
    const item = destinations.find(destination => destination.id === id) || content.home;
    pending = { item, history: updateHistory };
    if (!running) void drain();
  }

  return {
    prime,
    start() { started = true; current = null; navigate('home'); },
    reset() {
      started = false;
      current = null;
      pending = null;
      overlay.hidden = true;
      document.body.classList.remove('chapter-active');
    },
  };
}
