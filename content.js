export const content = {
  title: '虚实疆界',
  italianTitle: 'Il confine tra reale e immaginario',
  comments: {
    serverUrl: '',
  },
  music: [],
  musicDefaults: {
    home: 'random',
  },
  introDuration: 8000,
  introEffects: {
    glitchIntervalMin: 8000,
    glitchIntervalMax: 14000,
    starDriftSpeed: .65,
    starDriftIntervalMin: 180000,
    starDriftIntervalMax: 360000,
  },
  loadingMessages: [
    '正在关闭认知滤网',
    '正在关闭现实稳定锚',
    '正在建立超距连接',
    '░▒▓ /0x∅ %∷# ⟁▓▒░',
  ],
  home: {
    id: 'home', label: '玻利瓦尔肤层', color: '#6e9b77', chapter: 'PROLOGUE',
    description: '关于这里',
    intro: [
      '欢迎来到虚实疆界，这里是孙逸铭的个人网站。我把写下的故事、生活中的记录，以及关于音乐、电影和美术的想法放在这里，希望它能成为一处可以慢慢阅读、随时回访的个人作品集。',
      '网站分为四个章节：非科幻的虚构故事、科幻想象、文艺作品的评价与感悟，以及关于生活与生命的记录。你可以从下方的章节介绍或顶部导航进入，点击图文卡片阅读完整作品。开放留言的作品下方，只需填写一个名称和想说的话就能留下回声，不需要注册。点击左上角站名可以回到本页，右上角的按钮可以重看入场动画。',
      '网站的视觉灵感主要来自《明日方舟》的「沉沦者的黑流树海」肉鸽玩法。入场时的多面体、SANITY 计数和黑场过渡，与章节中的器官、动物、植物及手稿符号，共同构成了这里的美术风格。章节画面沿用了对应 PPT 模板的图层，站名字体和页边装饰则呼应伏尼契手稿的书写感。',
      '这里既会放虚构的世界，也会留下现实生活的片段。你不必按顺序阅读，选一个感兴趣的章节即可。读到有共鸣、想讨论，或只是想打个招呼的地方，欢迎在作品下方留言。',
    ],
  },
  navigation: [
    {
      id: 'fiction', label: '甜美的伤口', color: '#ad83df', chapter: 'CHAPTER I',
      description: '虚构 · 非科幻', intro: '让温柔与疼痛并置，让不曾发生的事，留下真实的触感。',
      overview: '有些伤口并不流血，它们藏在一次相逢、一段失去，或一句迟迟没有说出口的话里。这里存放非科幻的虚构故事：也许是陌生人的一生，也许只是几个人短暂交错的片刻。甜美来自仍然愿意靠近，伤口则提醒我们，靠近总会留下痕迹。让人物走进彼此的生活，也让那些不曾发生的事，留下真实的触感。',
    },
    {
      id: 'science-fiction', label: '血色空脉', color: '#d8bb46', chapter: 'CHAPTER II',
      description: '虚构 · 科幻', intro: '在看似空无的地方，寻找未来仍在跳动的脉搏。',
      overview: '当熟悉的世界退去，仍有某种脉搏在空处跳动。这一章收录科幻故事，以及围绕未来、技术、异星与未知的想象。人会在怎样的秩序中生活，又会在怎样的异常中发现自己？沿着那些仿佛没有尽头的血管，走进尚未命名的现实，看看未来的回声如何抵达此刻，也看看遥远的世界里，是否仍有与我们相似的渴望。',
    },
    {
      id: 'arts', label: '受害者腐殖', color: '#bd8b56', chapter: 'CHAPTER III',
      description: '音乐 · 电影 · 美术', intro: '让观看与聆听留下的碎片，慢慢长成自己的理解。',
      overview: '一段音乐、一部电影、一幅画，都会在离开之后继续发生。它们被记忆拆散，与自己的经验混在一起，慢慢成为新的理解。这里记录音乐、电影和美术带来的评价、感悟与联想：有喜欢，也有不认同，有仍未想通的细节，也有反复回来的余味。让那些被作品触动、改变过的部分，像腐殖一样滋养下一次观看。',
    },
    {
      id: 'daily', label: '卡德霍之颅', color: '#bc484b', chapter: 'CHAPTER IV',
      description: '生活 · 生命', intro: '记录身体与日常，也思考我们怎样生活、怎样感受生命。',
      overview: '颅骨保存的不只是思想，也有身体对每一天的记忆。这一章留下生活中的见闻、琐事与情绪，也容纳关于成长、关系、身体和生命的思考。有些文字从一顿饭、一场雨开始，有些会走向更长的时间。把微小的日常与无法轻易回答的问题并置，试着辨认：我们怎样生活，又怎样感受自己仍然活着。',
    },
  ],
  works: [
    {
      id: 'mountain-mist', category: 'science-fiction', type: '虚构 · 科幻',
      title: '雾停在山的另一边', subtitle: 'MOUNTAIN & MIST', image: '/assets/mountain.svg',
      imageAlt: '薄雾中层叠的青绿色山峦', date: '示例 01', commentsEnabled: true,
      excerpt: '山并不说话。那些漫长的、安静的时刻，都留在了雾里。',
      paragraphs: ['示例作品 · 一次静默的远望。', '远处的山在雾里一层层退去，像尚未说完的句子。我停下来，看光怎样从树梢移向山脊。', '有时候，记录只是为了留下一个曾经认真看过世界的瞬间。'],
    },
    {
      id: 'letters-from-sea', category: 'science-fiction', type: '虚构 · 科幻',
      title: '海的来信', subtitle: 'LETTERS FROM THE SEA', image: '/assets/sea.svg',
      imageAlt: '蓝色海面与白色浪花的抽象图像', date: '示例 02', commentsEnabled: true,
      excerpt: '听见浪声的时候，时间忽然有了另一种计量方式。',
      paragraphs: ['示例作品 · 写给海，也写给岸。', '海把每一句话拆开，又送回岸边。我们坐了很久，没有急着把它们重新拼好。'],
    },
    {
      id: 'late-sunset', category: 'fiction', type: '虚构 · 非科幻',
      title: '迟到的黄昏', subtitle: 'A LITTLE MORE LIGHT', image: '/assets/sunset.svg',
      imageAlt: '金色夕阳下的田野与细长的草茎', date: '示例 03', commentsEnabled: true,
      excerpt: '在日落之前，还有一点点光，足够照亮回去的路。',
      paragraphs: ['示例作品 · 黄昏里的日常切片。', '今天的黄昏来得很慢。我沿着田埂走，手里什么也没有，影子却替我收下了整片金色。'],
    },
    {
      id: 'botanical-study', category: 'fiction', type: '虚构 · 非科幻',
      title: '植物练习', subtitle: 'WAYS OF GROWING', image: '/assets/botanical.svg',
      imageAlt: '米色纸面上的绿色植物与枝叶', date: '示例 04', commentsEnabled: true,
      excerpt: '向着光的方向，缓慢地、生长成自己的样子。',
      paragraphs: ['示例作品 · 观察一片叶子的时间。', '一片叶子的纹路里，也藏着许多条路。它们向不同的方向展开，却共享同一个春天。'],
    },
    {
      id: 'city-in-rain', category: 'daily', type: '生活 · 生命',
      title: '城市在雨中', subtitle: 'AFTER THE RAIN', image: '/assets/city.svg',
      imageAlt: '暮色中有温暖灯光的城市建筑与雨线', date: '示例 05', commentsEnabled: true,
      excerpt: '窗里的灯一盏盏亮起来，雨替这座城市按下了慢放。',
      paragraphs: ['示例作品 · 一封寄给雨夜的短笺。', '车窗上流下的雨，带着街灯的颜色。那些熟悉的转角，也因此显得像第一次经过。'],
    },
    {
      id: 'unnamed-moments', category: 'arts', type: '文艺 · 感悟',
      title: '一些尚未命名的瞬间', subtitle: 'THE QUIET IN BETWEEN', image: '/assets/still-life.svg',
      imageAlt: '阳光里的一本书、玻璃杯与枝条', date: '示例 06', commentsEnabled: true,
      excerpt: '一页翻到一半的书，一杯水，以及窗外恰好经过的风。',
      paragraphs: ['示例作品 · 留住一些安静的空白。', '并不是每一个瞬间都需要名字。把它放在这里，等某一天再回头看，也许就够了。'],
    },
  ],
};
