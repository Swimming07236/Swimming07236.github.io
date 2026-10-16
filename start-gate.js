export function initStartGate({ music, intro, chapters, site }) {
  const gate = document.querySelector('#start-gate');
  const button = document.querySelector('#start-journey');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let ready = false;
  let leaving = false;
  let timer;

  function show() {
    clearTimeout(timer);
    leaving = false;
    music.pauseForGate();
    chapters.reset();
    intro.wait();
    site.inert = true;
    site.setAttribute('aria-hidden', 'true');
    site.classList.remove('is-visible');
    document.body.classList.add('intro-active');
    gate.hidden = false;
    gate.classList.remove('is-leaving');
    button.disabled = !ready;
    window.scrollTo(0, 0);
  }

  button.addEventListener('click', () => {
    if (!ready || leaving) return;
    leaving = true;
    button.disabled = true;
    music.beginIntro();
    gate.classList.add('is-leaving');
    timer = setTimeout(() => {
      gate.hidden = true;
      intro.replay();
    }, reducedMotion.matches ? 0 : 380);
  });
  document.querySelector('#replay-intro').addEventListener('click', show);
  void music.ready.then(() => { ready = true; if (!leaving) button.disabled = false; });
  show();
}
