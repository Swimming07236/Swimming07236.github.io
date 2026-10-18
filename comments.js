const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);

function normalizeComment(item, replyTo = '') {
  const date = new Date(item.time ?? item.insertedAt ?? item.createdAt);
  return {
    id: String(item.objectId), name: item.nick || '访客', html: String(item.comment || ''), replyTo,
    createdAt: Number.isFinite(date.getTime()) ? date.toISOString() : '',
  };
}

function flattenComments(items, replyTo = '') {
  return items.flatMap(item => ['waiting', 'spam'].includes(item.status) ? [] : [
    normalizeComment(item, replyTo), ...flattenComments(item.children || [], item.nick || '访客'),
  ]);
}

function serviceError(status, message = '') {
  if (status === 429 || /too fast/i.test(message)) return '留言发送得有些频繁，请稍等一会儿再试。';
  if (/duplicate/i.test(message)) return '这条留言已经提交过了，请刷新查看。';
  if (/请输入 1–40 字|留言内容最多 2000 字/.test(message)) return message;
  return '留言服务暂时无法使用，请稍后再试。';
}

export function createCommentService(config = {}, pageUrl = location.href, fetchFile = fetch) {
  const page = new URL(pageUrl);
  let remote = null;
  let available = localHosts.has(page.hostname);
  if (config.serverUrl?.trim()) {
    try {
      remote = new URL(config.serverUrl.trim());
      if (remote.username || remote.password || remote.search || remote.hash ||
          (remote.protocol !== 'https:' && !(remote.protocol === 'http:' && localHosts.has(remote.hostname)))) throw new Error('Invalid service URL');
      remote.pathname = `${remote.pathname.replace(/\/(?:api|ui)\/?$/, '').replace(/\/$/, '')}/`;
      available = true;
    } catch { remote = null; available = false; }
  }
  function endpoint(workId) {
    if (!available) throw new Error('留言区暂未开放，请稍后再来。');
    if (!/^[a-z0-9-]+$/.test(workId)) throw new Error('没有找到这篇作品。');
    return remote ? new URL('api/comment', remote) : new URL(`/api/comments/${workId}`, page);
  }
  async function request(url, options = {}) {
    try {
      const timeout = AbortSignal.timeout(15000);
      const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
      const response = await fetchFile(url, { ...options, signal, credentials: 'omit' });
      let result;
      try { result = await response.json(); } catch { throw new Error(serviceError(response.status)); }
      if (!response.ok || (remote && result.errno)) throw new Error(serviceError(response.status, result.errmsg || result.error));
      return result;
    } catch (error) {
      if (options.signal?.aborted) throw error;
      if (error.name === 'TimeoutError') throw new Error('留言服务响应较慢，请稍后再试。');
      if (error instanceof TypeError) throw new Error('暂时无法连接留言服务，请稍后再试。');
      throw error;
    }
  }
  return {
    available,
    async list(workId, { page: number = 1, signal } = {}) {
      const url = endpoint(workId);
      if (remote) url.search = new URLSearchParams({ path: `/works/${workId}`, page: number, pageSize: 20, sortBy: 'insertedAt_desc', lang: 'zh-CN' });
      const result = await request(url, { signal, cache: 'no-store' });
      if (!remote) return { comments: result.comments, total: result.comments.length, page: 1, hasMore: false };
      const data = result.data;
      if (!Array.isArray(data?.data) || !Number.isFinite(data.count)) throw new Error('暂时无法读取留言，请稍后重试。');
      return { comments: flattenComments(data.data), total: data.count, page: data.page, hasMore: data.page < data.totalPages };
    },
    async count(workId) {
      const url = endpoint(workId);
      if (remote) url.search = new URLSearchParams({ type: 'count', url: `/works/${workId}` });
      const result = await request(url, { cache: 'no-store' });
      return remote ? Number(result.data[0]) : result.comments.length;
    },
    async submit(workId, { name, message }) {
      name = name.trim(); message = message.trim();
      if (!name || name.length > 40 || !message || message.length > 2000) throw new Error('请输入 1–40 字的名称和 1–2000 字的留言。');
      const url = endpoint(workId);
      const body = remote ? { nick: name, comment: message, url: `/works/${workId}` } : { name, message };
      const result = await request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      return { pending: remote && ['waiting', 'spam'].includes(result.data?.status) };
    },
  };
}

export function commentText(html) {
  const template = document.createElement('template');
  template.innerHTML = html.replace(/<br\s*\/?>(?:\r?\n)?/gi, '\n');
  template.content.querySelectorAll('script,style,iframe,object,embed,svg,math').forEach(node => node.remove());
  template.content.querySelectorAll('br').forEach(node => node.replaceWith(document.createTextNode('\n')));
  template.content.querySelectorAll('p,div,li,blockquote,pre,h1,h2,h3,h4,h5,h6').forEach(node => node.append(document.createTextNode('\n')));
  return template.content.textContent.trim();
}
