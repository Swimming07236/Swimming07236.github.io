export function createTitle({ content }) {
  const title = document.querySelector('.intro-title');
  const chinese = document.querySelector('#intro-chinese');
  const italian = document.querySelector('#intro-italian');

  function prepare() {
    title.dataset.font = 'manuscript';
    chinese.textContent = content.title;
    italian.textContent = content.italianTitle;
    italian.title = content.italianTitle;
  }

  prepare();
  return { prepare };
}
