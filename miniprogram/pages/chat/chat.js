// pages/chat/chat.js
// 不使用 async/await，避免微信开发者工具触发 @babel/runtime 转译。
var api = require('../../utils/api.js');

var AI_SYSTEM_PROMPT = '你是 ClawCN 助手 🦞，一个面向中文用户的友好、简洁的助理。回答用中文，避免空洞客套，给出可操作的建议。';
var HISTORY_LIMIT = 10;

var _msgId = 0;
function nextId() { return 'm' + (++_msgId); }

// ─── 内联 SVG 图标（WeChat / WeUI 风格，细线 24x24，URL-encoded data URI）──
function svgIcon(svg) { return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg); }
var ICON_STROKE = '%232A1F19'; // #2A1F19
var ICON_RED = '%23E65C46';
function feather(path, color) {
  if (!color) color = '#2A1F19';
  return svgIcon('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>');
}
function botSvg(color) {
  // 友好机器人头像：天线 + 圆角头框 + 两眼 + 一抹微笑
  // 与 feather() 区别：眼睛是实心圆，需要 fill
  return svgIcon(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
    '<line x1="12" y1="2.5" x2="12" y2="5"/>' +
    '<circle cx="12" cy="5.2" r="1.2" fill="' + color + '" stroke="none"/>' +
    '<rect x="3.6" y="7" width="16.8" height="13" rx="2.6"/>' +
    '<circle cx="9" cy="13.5" r="1.4" fill="' + color + '" stroke="none"/>' +
    '<circle cx="15" cy="13.5" r="1.4" fill="' + color + '" stroke="none"/>' +
    '<path d="M9.5 17 Q12 18.4 14.5 17"/>' +
    '</svg>'
  );
}
var ICONS = {
  mic: feather('<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>'),
  keyboard: feather('<rect x="2" y="6" width="20" height="12" rx="2"/><line x1="6" y1="10" x2="6.01" y2="10"/><line x1="10" y1="10" x2="10.01" y2="10"/><line x1="14" y1="10" x2="14.01" y2="10"/><line x1="18" y1="10" x2="18.01" y2="10"/><line x1="6" y1="14" x2="6.01" y2="14"/><line x1="18" y1="14" x2="18.01" y2="14"/><line x1="10" y1="14" x2="14" y2="14"/>'),
  plus: feather('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'),
  close: feather('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'),
  camera: feather('<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>'),
  album: feather('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>'),
  file: feather('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="9" y2="9"/><line x1="10" y1="9" x2="8" y2="9"/>'),
  arrowUp: feather('<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>', '#FFFFFF'),
  bot: botSvg('#E65C46'),       // 红色版（用于白色圆形头像内部）
  botWhite: botSvg('#FFFFFF'),  // 白色版（用于红色按钮等深色背景）
};

// ─── Markdown → HTML (轻量版，给 rich-text 用) ──────────────────────────────
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * 把 markdown 文本解析成结构化块数组，由 wxml 逐块渲染。
 * 块类型：
 *   { type:'h',  level:1|2|3, html:'...' }
 *   { type:'li', ordered:bool, marker:'1.' | '•', html:'...' }
 *   { type:'code', text:'...' }
 *   { type:'p',  html:'...' }    // 包含可选的 <br>
 * inline html 仅含: <strong> <em> <code> <span style="link"> <br>
 */
function inlineMd(s) {
  if (s == null) return '';
  s = String(s);
  // inline code 先抽出（防止后续转义破坏）
  var codes = [];
  s = s.replace(/`([^`\n]+)`/g, function (_m, c) {
    codes.push(c);
    return ' IC' + (codes.length - 1) + ' ';
  });
  // 转义 HTML 特殊字符
  s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // 加粗
  s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/__([^_\n]+)__/g, '<strong>$1</strong>');
  // 斜体
  s = s.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  // 链接（仅视觉，rich-text 不能跳）
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<span style="color:#E65C46;text-decoration:underline;">$1</span>');
  // 还原 inline code
  s = s.replace(/ IC(\d+) /g, function (_m, i) {
    var c = codes[+i].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return '<code style="background:rgba(42,31,25,0.10);padding:1rpx 8rpx;border-radius:6rpx;font-family:monospace;font-size:0.92em;">' + c + '</code>';
  });
  return s;
}

function mdParse(text) {
  if (!text) return [];
  var raw = String(text);

  // 1. 抽出 fenced code block
  var codeBlocks = [];
  raw = raw.replace(/```([\s\S]*?)```/g, function (_m, code) {
    codeBlocks.push(code.replace(/^[a-zA-Z0-9_-]+\n/, ''));
    return 'CB' + (codeBlocks.length - 1) + '';
  });

  var blocks = [];
  var lines = raw.split('\n');
  var pBuf = []; // 累积普通段落的多行
  var orderedCounter = 0;

  function flushParagraph() {
    if (pBuf.length === 0) return;
    var joined = pBuf.join('\n');
    // 把段落里的 \n 转成 <br>
    var html = inlineMd(joined).replace(/\n/g, '<br>');
    blocks.push({ type: 'p', html: html });
    pBuf = [];
  }

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];

    // 代码块占位符 → 独立块
    var cbm = line.match(/CB(\d+)/);
    if (cbm) {
      flushParagraph();
      blocks.push({ type: 'code', text: codeBlocks[+cbm[1]] });
      continue;
    }

    // 标题
    var hm = line.match(/^(#{1,3})\s+(.+)$/);
    if (hm) {
      flushParagraph();
      blocks.push({ type: 'h', level: hm[1].length, html: inlineMd(hm[2]) });
      continue;
    }

    // 有序列表
    var olm = line.match(/^\s*(\d+)\.\s+(.+)$/);
    if (olm) {
      flushParagraph();
      blocks.push({ type: 'li', ordered: true, marker: olm[1] + '.', html: inlineMd(olm[2]) });
      continue;
    }

    // 无序列表
    var ulm = line.match(/^\s*[-*]\s+(.+)$/);
    if (ulm) {
      flushParagraph();
      blocks.push({ type: 'li', ordered: false, marker: '•', html: inlineMd(ulm[1]) });
      continue;
    }

    // 空行 → 段落分隔
    if (line.trim() === '') {
      flushParagraph();
      continue;
    }

    // 其它：累积为段落
    pBuf.push(line);
  }
  flushParagraph();

  // 计算 ordered list 的 marker 最大宽度（保证对齐）
  var maxOrderedDigits = 1;
  for (var k = 0; k < blocks.length; k++) {
    var b = blocks[k];
    if (b.type === 'li' && b.ordered) {
      var n = b.marker.length;
      if (n > maxOrderedDigits) maxOrderedDigits = n;
    }
  }
  for (var j = 0; j < blocks.length; j++) {
    if (blocks[j].type === 'li') {
      blocks[j].markerWidth = blocks[j].ordered
        ? Math.max(48, maxOrderedDigits * 18 + 8) + 'rpx'  // 18rpx/位
        : '36rpx';
    }
  }

  return blocks;
}

function mdToHtml(text) {
  if (!text) return '';
  var s = String(text);

  // 1. 先抽出 ```code block```（避免里面的字符被转义/被其它规则破坏）
  var codeBlocks = [];
  s = s.replace(/```([\s\S]*?)```/g, function (_m, code) {
    codeBlocks.push(code.replace(/^[a-zA-Z0-9_-]+\n/, ''));
    return 'CB' + (codeBlocks.length - 1) + '';
  });

  // 2. 抽出 `inline code`
  var inlineCodes = [];
  s = s.replace(/`([^`\n]+)`/g, function (_m, code) {
    inlineCodes.push(code);
    return 'IC' + (inlineCodes.length - 1) + '';
  });

  // 3. 转义剩余 HTML 特殊字符
  s = escapeHtml(s);

  // 4. 标题（行起始 # / ## / ###）
  s = s.replace(/(^|\n)### (.+)/g, '$1<h3 style="font-size:30rpx;font-weight:700;margin:10rpx 0 6rpx;">$2</h3>');
  s = s.replace(/(^|\n)## (.+)/g,  '$1<h2 style="font-size:34rpx;font-weight:700;margin:12rpx 0 8rpx;">$2</h2>');
  s = s.replace(/(^|\n)# (.+)/g,   '$1<h1 style="font-size:38rpx;font-weight:700;margin:14rpx 0 10rpx;">$2</h1>');

  // 5. 加粗 / 斜体（先 ** 后 *）
  s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong style="font-weight:700;">$1</strong>');
  s = s.replace(/__([^_\n]+)__/g,     '<strong style="font-weight:700;">$1</strong>');
  s = s.replace(/\*([^*\n]+)\*/g,     '<em style="font-style:italic;">$1</em>');

  // 6. 列表 —— 用文本内 marker + paragraph 缩进，避免 rich-text 不支持 list-style counter
  //    无序：•  有序：保留原数字
  //    text-indent 负值 + padding-left 实现"挂起缩进"
  s = s.replace(/(^|\n)[-*] (.+)/g,
    '$1<p style="margin:6rpx 0;padding-left:44rpx;text-indent:-28rpx;">•&nbsp;&nbsp;$2</p>');
  s = s.replace(/(^|\n)(\d+)\.\s+(.+)/g,
    '$1<p style="margin:6rpx 0;padding-left:56rpx;text-indent:-44rpx;"><span style="display:inline-block;width:44rpx;text-align:right;">$2.</span>&nbsp;$3</p>');

  // 7. 链接 [text](url) —— rich-text 不会真的跳转，仅作为视觉
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<span style="color:#E65C46;text-decoration:underline;">$1</span>');

  // 8. 收掉 block 元素紧邻的一个 \n（保留剩余 \n 用作段落分隔变 <br>）
  s = s.replace(/\n(<\/?(?:p|h[1-3]|li)[^>]*>)/g, '$1');
  s = s.replace(/(<\/(?:p|h[1-3]|li)>)\n/g, '$1');

  // 9. 剩余换行 → <br>
  s = s.replace(/\n/g, '<br>');

  // 9. 还原 inline code
  s = s.replace(/IC(\d+)/g, function (_m, i) {
    return '<code style="background:rgba(42,31,25,0.08);padding:2rpx 8rpx;border-radius:6rpx;font-family:monospace;font-size:0.92em;">' + escapeHtml(inlineCodes[+i]) + '</code>';
  });

  // 10. 还原代码块
  s = s.replace(/CB(\d+)/g, function (_m, i) {
    var code = escapeHtml(codeBlocks[+i]).replace(/\n/g, '<br>');
    return '<pre style="background:rgba(42,31,25,0.08);padding:14rpx 18rpx;border-radius:12rpx;font-family:monospace;font-size:24rpx;overflow:auto;margin:8rpx 0;"><code>' + code + '</code></pre>';
  });

  return s;
}

Page({
  data: {
    statusBarHeight: 0,
    user: null,
    logging: false,

    msgs: [],
    typing: false,
    fontSize: 'md',

    chatInput: '',
    aiBusy: false,

    scrollAnchor: 'anchor-bottom',
    msgsHeight: 400,

    plusOpen: false,
    voiceMode: false,
    recording: false,

    icons: ICONS,

    // 快捷功能菜单。badge 可以是数字（'3'）或字符（'NEW'），留空则不显示。
    // 点击后 prompt 直接作为用户消息发出去，AI 来响应。
    quickActions: [
      { key: 'customer', emoji: '👥', label: '客户管理', prompt: '帮我开始管理客户', badge: '' },
      { key: 'bill',     emoji: '💰', label: '录入账单', prompt: '我要录入一笔账单', badge: '' },
      { key: 'report',   emoji: '📊', label: '经营报表', prompt: '看看本月经营情况',  badge: '' },
      { key: 'help',     emoji: '💡', label: '使用说明', prompt: '简单介绍一下你能做什么', badge: '' },
    ],
  },

  onLoad: function () {
    var sys = wx.getSystemInfoSync ? wx.getSystemInfoSync() : {};
    this.setData({
      statusBarHeight: sys.statusBarHeight || 20,
      msgsHeight: (sys.windowHeight || 600) - 140,
    });

    var app = getApp();
    this.setData({ user: app.globalData.user });

    if (app.globalData.user && app.globalData.token) {
      this._greetLoggedIn(app.globalData.user);
    } else {
      this.onWxLogin();
    }
  },

  onReady: function () {
    this._recomputeMsgsHeight();
  },

  _recomputeMsgsHeight: function () {
    var self = this;
    var sys = wx.getSystemInfoSync ? wx.getSystemInfoSync() : {};
    var total = sys.windowHeight || 600;
    var q = wx.createSelectorQuery().in(self);
    q.select('.header').boundingClientRect();
    q.select('.bottom').boundingClientRect();
    q.exec(function (rects) {
      var headerH = (rects && rects[0] && rects[0].height) || 60;
      var bottomH = (rects && rects[1] && rects[1].height) || 80;
      var next = Math.max(120, Math.floor(total - headerH - bottomH));
      if (next !== self.data.msgsHeight) {
        self.setData({ msgsHeight: next });
        self._scrollDown();
      }
    });
  },

  _greetLoggedIn: function (user) {
    var name = (user && user.name) || '朋友';
    var self = this;
    self._pushAi('嗨，' + name + '！👋 欢迎回来～', 600);
    setTimeout(function () {
      self._pushAi('我是 ClawCN 助手 🦞\n\n直接在下面输入框跟我聊吧，我能：\n💬 回答问题\n💡 提供建议\n✍️ 帮你润色文字', 1100);
    }, 1500);
  },

  onFontSize: function (e) {
    var size = e.currentTarget.dataset.size;
    if (size === 'sm' || size === 'md' || size === 'lg') {
      this.setData({ fontSize: size });
    }
  },

  onInput: function (e) {
    this.setData({ chatInput: e.detail.value });
  },

  onQuickAction: function (e) {
    var prompt = e.currentTarget.dataset.prompt || '';
    if (!prompt || this.data.aiBusy) return;
    this.setData({ chatInput: prompt });
    this.onSend();
  },

  // ─── 媒体输入 ─────────────────────────────────────────────────────────────
  togglePlusMenu: function () {
    var self = this;
    self.setData({ plusOpen: !self.data.plusOpen, voiceMode: false });
    wx.nextTick(function () { self._recomputeMsgsHeight(); });
  },

  closePlusMenu: function () {
    var self = this;
    if (self.data.plusOpen) {
      self.setData({ plusOpen: false });
      wx.nextTick(function () { self._recomputeMsgsHeight(); });
    }
  },

  toggleVoiceMode: function () {
    var self = this;
    self.setData({ voiceMode: !self.data.voiceMode, plusOpen: false });
    wx.nextTick(function () { self._recomputeMsgsHeight(); });
  },

  onPickImage: function (e) {
    var self = this;
    var src = e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.src;
    self.closePlusMenu();
    var sourceType = src === 'camera' ? ['camera'] : ['album'];
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: sourceType,
      success: function (r) {
        var f = r.tempFiles && r.tempFiles[0];
        if (!f) return;
        self._pushMedia({ type: 'image', tempPath: f.tempFilePath, uploading: true });
        api.uploadFile(f.tempFilePath, 'image').then(function (data) {
          self._updateLastMedia({ url: data.url, uploading: false });
        }).catch(function (err) {
          self._updateLastMedia({ uploading: false, error: err.message || '上传失败' });
        });
      },
      fail: function () { /* user cancelled */ },
    });
  },

  onPickFile: function () {
    var self = this;
    self.closePlusMenu();
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      success: function (r) {
        var f = r.tempFiles && r.tempFiles[0];
        if (!f) return;
        self._pushMedia({ type: 'file', tempPath: f.path, name: f.name, size: f.size, uploading: true });
        api.uploadFile(f.path, 'file', f.name).then(function (data) {
          self._updateLastMedia({ url: data.url, uploading: false });
        }).catch(function (err) {
          self._updateLastMedia({ uploading: false, error: err.message || '上传失败' });
        });
      },
      fail: function () { /* user cancelled */ },
    });
  },

  onVoiceStart: function () {
    var self = this;
    if (self.data.recording) return;
    var mgr = wx.getRecorderManager();
    self._recorder = mgr;
    self._recordStart = Date.now();
    mgr.onError(function (err) {
      wx.showToast({ title: '录音错误：' + ((err && err.errMsg) || ''), icon: 'none' });
      self.setData({ recording: false });
    });
    mgr.onStop(function (res) {
      var dur = Math.round((Date.now() - self._recordStart) / 100) / 10;
      self.setData({ recording: false });
      if (!res || !res.tempFilePath) return;
      if (dur < 0.6) {
        wx.showToast({ title: '说话时间太短', icon: 'none' });
        return;
      }
      self._pushMedia({ type: 'voice', tempPath: res.tempFilePath, duration: dur, uploading: true });
      api.uploadFile(res.tempFilePath, 'voice').then(function (data) {
        self._updateLastMedia({ url: data.url, uploading: false });
      }).catch(function (err) {
        self._updateLastMedia({ uploading: false, error: err.message || '上传失败' });
      });
    });
    mgr.start({
      duration: 60000,
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 48000,
      format: 'mp3',
    });
    self.setData({ recording: true });
  },

  onVoiceEnd: function () {
    if (this._recorder && this.data.recording) {
      this._recorder.stop();
    }
  },

  onPlayVoice: function (e) {
    var url = e.currentTarget.dataset.url || e.currentTarget.dataset.path;
    if (!url) return;
    if (this._audio) { try { this._audio.destroy(); } catch (eD) {} }
    var a = wx.createInnerAudioContext();
    a.src = url;
    a.onError(function () { wx.showToast({ title: '播放失败', icon: 'none' }); });
    a.play();
    this._audio = a;
  },

  onPreviewImage: function (e) {
    var url = e.currentTarget.dataset.url || e.currentTarget.dataset.path;
    if (!url) return;
    wx.previewImage({ current: url, urls: [url] });
  },

  _pushMedia: function (entry) {
    var msg = { id: nextId(), from: 'user' };
    for (var k in entry) { if (entry.hasOwnProperty(k)) msg[k] = entry[k]; }
    var msgs = this.data.msgs.concat([msg]);
    this.setData({ msgs: msgs });
    this._scrollDown();
  },

  _updateLastMedia: function (patch) {
    var msgs = this.data.msgs.slice();
    var last = msgs[msgs.length - 1];
    if (!last || last.from !== 'user') return;
    var next = {};
    for (var k in last) { if (last.hasOwnProperty(k)) next[k] = last[k]; }
    for (var kk in patch) { if (patch.hasOwnProperty(kk)) next[kk] = patch[kk]; }
    msgs[msgs.length - 1] = next;
    this.setData({ msgs: msgs });
  },

  onWxLogin: function () {
    if (this.data.logging) return;
    var self = this;
    self.setData({ logging: true });
    wx.nextTick(function () { self._recomputeMsgsHeight(); });

    api.wechatLogin().then(function () {
      var app = getApp();
      self.setData({ user: app.globalData.user, logging: false });
      wx.nextTick(function () { self._recomputeMsgsHeight(); });
      self._greetLoggedIn(app.globalData.user);
    }).catch(function (err) {
      self.setData({ logging: false });
      wx.nextTick(function () { self._recomputeMsgsHeight(); });
      self._pushAi('❌ 登录失败：' + (err.message || err) + '\n请稍后再点"微信一键登录"重试。');
    });
  },

  _scrollDown: function () {
    var self = this;
    self.setData({ scrollAnchor: '' });
    setTimeout(function () { self.setData({ scrollAnchor: 'anchor-bottom' }); }, 30);
  },

  _pushUser: function (text) {
    var msgs = this.data.msgs.concat([{ id: nextId(), from: 'user', text: text }]);
    this.setData({ msgs: msgs });
    this._scrollDown();
  },

  _pushAi: function (text, delay) {
    var self = this;
    delay = delay || 0;
    if (delay > 0) {
      self.setData({ typing: true });
      self._scrollDown();
      setTimeout(function () {
        var msgs = self.data.msgs.concat([{ id: nextId(), from: 'ai', text: text, blocks: mdParse(text) }]);
        self.setData({ msgs: msgs, typing: false });
        self._scrollDown();
      }, delay);
    } else {
      var msgs = self.data.msgs.concat([{ id: nextId(), from: 'ai', text: text, blocks: mdParse(text) }]);
      self.setData({ msgs: msgs });
      self._scrollDown();
    }
  },

  _appendToLastAi: function (text) {
    var msgs = this.data.msgs.slice();
    var last = msgs[msgs.length - 1];
    if (!last || last.from !== 'ai') return;
    var newText = (last.text || '') + text;
    msgs[msgs.length - 1] = { id: last.id, from: 'ai', text: newText, blocks: mdParse(newText) };
    this.setData({ msgs: msgs });
    this._scrollDown();
  },

  onSend: function () {
    var self = this;
    var text = (self.data.chatInput || '').trim();
    if (!text || self.data.aiBusy) return;

    self._pushUser(text);
    self.setData({ chatInput: '', aiBusy: true, typing: true });
    self._scrollDown();

    var recent = self.data.msgs.slice(-HISTORY_LIMIT);
    var messages = recent.map(function (m) {
      var content;
      if (m.type === 'image') {
        content = '[用户发了一张图片' + (m.url ? '：' + m.url : '') + ']';
      } else if (m.type === 'file') {
        content = '[用户发了文件：' + (m.name || '未知') + (m.size ? '（' + m.size + ' 字节）' : '') + ']';
      } else if (m.type === 'voice') {
        content = '[用户发了一段语音' + (m.duration ? '，时长 ' + m.duration + ' 秒' : '') + ']';
      } else {
        content = m.text || '';
      }
      return { role: m.from === 'ai' ? 'assistant' : 'user', content: content };
    }).filter(function (m) { return m.content && m.content.length > 0; });

    var bubbleAdded = false;

    // 节流：把 50ms 内到达的 delta 合并成一次 setData，减少小程序渲染压力
    var pendingDelta = '';
    var flushTimer = null;
    function flushPending() {
      flushTimer = null;
      if (pendingDelta) {
        self._appendToLastAi(pendingDelta);
        pendingDelta = '';
      }
    }
    function scheduleFlush() {
      if (flushTimer) return;
      flushTimer = setTimeout(flushPending, 50);
    }
    function cancelAndFlush() {
      if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
      if (pendingDelta) {
        self._appendToLastAi(pendingDelta);
        pendingDelta = '';
      }
    }

    function handleFatal(msg) {
      cancelAndFlush();
      self.setData({ typing: false, aiBusy: false });
      if (bubbleAdded) {
        self._appendToLastAi('\n\n❌ ' + msg);
      } else {
        self._pushAi('❌ AI 暂时不可用：' + msg);
      }
    }

    function doNonStream() {
      return api.aiChat({ messages: messages, system: AI_SYSTEM_PROMPT, max_tokens: 800 }).then(function (res) {
        self.setData({ typing: false, aiBusy: false });
        var reply = (res && res.reply ? String(res.reply).trim() : '') || '（空回复）';
        self._pushAi(reply);
      });
    }

    api.aiChatStream(
      { messages: messages, system: AI_SYSTEM_PROMPT, max_tokens: 800 },
      {
        onDelta: function (chunk) {
          if (!bubbleAdded) {
            // 第一个 delta 立即出现，关 typing
            bubbleAdded = true;
            self.setData({ typing: false });
            self._pushAi(chunk);
          } else {
            pendingDelta += chunk;
            scheduleFlush();
          }
        },
        onError: function (msg) { handleFatal(msg); },
      }
    ).then(function () {
      cancelAndFlush();
      self.setData({ aiBusy: false, typing: false });
      if (!bubbleAdded) self._pushAi('（空回复）');
    }).catch(function (err) {
      var msg = (err && err.message) || String(err);

      if (msg === 'Unauthenticated') {
        api.wechatLogin().then(function () { return doNonStream(); }).catch(function (e2) {
          handleFatal('登录失败：' + ((e2 && e2.message) || e2));
        });
        return;
      }

      if (msg === 'STREAM_UNSUPPORTED') {
        doNonStream().catch(function (e2) { handleFatal((e2 && e2.message) || e2); });
        return;
      }

      handleFatal(msg);
    });
  },
});
