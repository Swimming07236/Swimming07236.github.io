import { content } from './content.js';
import { initIntro } from './intro.js';
import { initChapters } from './chapters.js';
import { initMusic } from './music.js';
import { initStartGate } from './start-gate.js';

const $ = selector => document.querySelector(selector);
const site = $('#site');
const dialog = $('#work-dialog');
const counts = new Map();
let selectedCategory = 'home';
let activeWork = null;
let commentRequest = null;
let openingButton = null;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

document.title = `${content.title} · ${content.italianTitle}`;
$('#brand-title').textContent = content.title;
$('#intro-chinese').textContent = content.title;
$('#intro-italian').textContent = content.italianTitle;
$('.site-footer p').textContent = content.italianTitle;
const music = initMusic(content.music, content.musicDefaults);

function renderWorks() {
  const works = content.works.filter(work => work.category === selectedCategory);
  $('#work-count').textContent = `${String(works.length).padStart(2, '0')} 件作品`;
  $('#empty-collection').hidden = works.length !== 0;
  $('#work-grid').replaceChildren();
  for (const work of works) {
    const card = element('article', 'work-card');
    const link = element('button', 'card-link');
    link.type = 'button';
    link.setAttribute('aria-label', `阅读作品：${work.title}`);
    link.addEventListener('click', () => openWork(work, link));
    const imageWrap = element('div', 'card-image-wrap');
    const image = element('img', 'card-image');
    image.src = work.image;
    image.alt = work.imageAlt;
    image.loading = 'lazy';
    image.width = 800;
    image.height = 540;
    imageWrap.append(image);
    const body = element('div', 'card-body');
    const meta = element('div', 'card-meta');
    meta.append(element('span', 'card-kind', work.type), element('span', 'card-demo', work.date));
    body.append(meta, element('h2', '', work.title), element('p', '', work.excerpt));
    link.append(imageWrap, body);
    const bottom = element('div', 'card-bottom');
    if (work.commentsEnabled) {
      const comments = element('button');
      comments.type = 'button';
      comments.dataset.commentsFor = work.id;
      const symbol = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      symbol.setAttribute('viewBox', '0 0 20 20');
      symbol.setAttribute('aria-hidden', 'true');
      const shape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      shape.setAttribute('d', 'M4 3h12a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H8l-4 3v-3H3V4a1 1 0 0 1 1-1Z');
      symbol.append(shape);
      comments.append(symbol, element('span', '', `${counts.get(work.id) || 0} 条回声`));
      comments.setAttribute('aria-label', `查看${work.title}的留言`);
      comments.addEventListener('click', () => openWork(work, comments, true));
      bottom.append(comments);
    } else bottom.append(element('span', '', '静静阅读'));
    bottom.append(element('span', 'card-arrow', '↗'));
    card.append(link, bottom);
    $('#work-grid').append(card);
  }
}

async function api(workId, options = {}) {
  const response = await fetch(`/api/comments/${encodeURIComponent(workId)}`, options);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || '暂时无法读取留言。');
  return result;
}

function updateCount(workId, count) {
  counts.set(workId, count);
  const label = document.querySelector(`[data-comments-for="${workId}"] span`);
  if (label) label.textContent = `${count} 条回声`;
}

function renderComments(comments) {
  $('#comments-count').textContent = `${comments.length} 条留言`;
  $('#comments-list').replaceChildren();
  if (!comments.length) {
    $('#comments-list').append(element('p', 'comment-empty', '这里还很安静。你的话，可以是第一道回声。'));
    return;
  }
  for (const comment of comments) {
    const row = element('div', 'comment');
    row.append(element('span', 'comment-avatar', Array.from(comment.name)[0]));
    const body = element('div', 'comment-content');
    const meta = element('div', 'comment-meta');
    const time = element('time', '', new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(comment.createdAt)));
    time.dateTime = comment.createdAt;
    meta.append(element('strong', '', comment.name), time);
    body.append(meta, element('p', '', comment.message));
    row.append(body);
    $('#comments-list').append(row);
  }
}

async function openWork(work, trigger, scrollToComments = false) {
  activeWork = work;
  openingButton = trigger;
  commentRequest?.abort();
  commentRequest = new AbortController();
  const controller = commentRequest;
  $('#detail-image').src = work.image;
  $('#detail-image').alt = work.imageAlt;
  $('#detail-type').textContent = work.type;
  $('#detail-title').textContent = work.title;
  $('#detail-subtitle').textContent = work.subtitle;
  $('#detail-paragraphs').replaceChildren(...work.paragraphs.map(text => element('p', '', text)));
  $('#comments-section').hidden = !work.commentsEnabled;
  $('#comment-form').reset();
  $('#form-status').textContent = '';
  $('#form-status').className = '';
  $('#submit-comment').disabled = false;
  $('#comments-count').textContent = '…';
  $('#comments-list').replaceChildren(element('p', 'comment-empty', '正在聆听回声…'));
  document.body.classList.add('dialog-open');
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
  if (scrollToComments) requestAnimationFrame(() => $('#comments-section').scrollIntoView({ behavior: 'smooth', block: 'start' }));
  if (!work.commentsEnabled) return;
  try {
    const { comments } = await api(work.id, { signal: controller.signal });
    if (activeWork?.id !== work.id || controller.signal.aborted) return;
    renderComments(comments);
    updateCount(work.id, comments.length);
  } catch (error) {
    if (error.name === 'AbortError' || controller.signal.aborted) return;
    $('#comments-count').textContent = '';
    $('#comments-list').replaceChildren(element('p', 'comment-empty', '暂时无法读取留言，请稍后重新打开作品。'));
  }
}

$('#close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  const rect = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
});
dialog.addEventListener('close', () => {
  document.body.classList.remove('dialog-open');
  commentRequest?.abort();
  activeWork = null;
  openingButton?.focus({ preventScroll: true });
});

$('#comment-form').addEventListener('submit', async event => {
  event.preventDefault();
  const work = activeWork;
  if (!work || $('#submit-comment').disabled) return;
  const submissionRequest = commentRequest;
  const name = $('#comment-name').value.trim();
  const message = $('#comment-message').value.trim();
  const status = $('#form-status');
  status.className = '';
  if (!name || !message) {
    status.className = 'error';
    status.textContent = '名字和留言都需要一点内容。';
    return;
  }
  $('#submit-comment').disabled = true;
  status.textContent = '正在保存…';
  try {
    const { comments } = await api(work.id, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, message }) });
    updateCount(work.id, comments.length);
    if (activeWork?.id === work.id && commentRequest === submissionRequest) {
      renderComments(comments);
      $('#comment-message').value = '';
      status.textContent = '你的回声，已经留在这里。';
    }
  } catch (error) {
    if (activeWork?.id === work.id && commentRequest === submissionRequest) {
      status.className = 'error';
      status.textContent = error.message || '保存失败了，请稍后重试。';
    }
  } finally {
    if (activeWork?.id === work.id && commentRequest === submissionRequest) $('#submit-comment').disabled = false;
  }
});

$('#back-to-top').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
const chapters = initChapters({ content, site, onSceneReady: music.endIntro, onCategory: category => {
  selectedCategory = category?.id || 'home';
  renderWorks();
} });
const intro = initIntro({ content, onEnter: chapters.prime, onComplete: chapters.start, onProgress: music.setIntroSanity, onInteraction: music.resumeIntroIfBlocked });
initStartGate({ music, intro, chapters, site });

for (const work of content.works.filter(item => item.commentsEnabled)) {
  api(work.id).then(({ comments }) => updateCount(work.id, comments.length)).catch(() => {});
}
