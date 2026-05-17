// utils/api.js
// 全部使用 ES5 风格（function + var，无解构 / 无默认参数 / 无箭头函数），
// 避免微信开发者工具的 ES6→ES5 转译触发 @babel/runtime helper require。

var req = require('./request.js');
var request = req.request;
var exchangeWechatLogin = req.exchangeWechatLogin;

/**
 * ArrayBuffer → UTF-8 string，兼容老基础库
 */
function abToString(buf) {
  if (typeof TextDecoder !== 'undefined') {
    try { return new TextDecoder('utf-8').decode(buf); } catch (e) { /* fallthrough */ }
  }
  var bytes = new Uint8Array(buf);
  var s = '';
  for (var i = 0; i < bytes.length; i++) { s += String.fromCharCode(bytes[i]); }
  try { return decodeURIComponent(escape(s)); } catch (e2) { return s; }
}

/**
 * 流式 AI 聊天
 * @param {object} payload  { messages, system?, max_tokens?, temperature? }
 * @param {object} callbacks { onDelta?, onReasoning?, onError? }
 * @returns {Promise<void>}
 */
function aiChatStream(payload, callbacks) {
  if (!callbacks) callbacks = {};
  return new Promise(function (resolve, reject) {
    var app = getApp();
    var token = app.globalData.token || '';
    var base = app.globalData.apiBaseUrl;
    if (!token) { reject(new Error('未登录')); return; }

    var buffer = '';
    var done = false;

    function finalize(errOrNull) {
      if (done) return;
      done = true;
      if (errOrNull) { reject(errOrNull); } else { resolve(); }
    }

    var task;
    try {
      task = wx.request({
        url: base + '/ai/chat-stream',
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          Authorization: 'Bearer ' + token,
        },
        data: payload,
        enableChunked: true,
        responseType: 'text',
        timeout: 120000,
        success: function (res) {
          if (res.statusCode === 401) {
            finalize(new Error('Unauthenticated'));
          } else if (res.statusCode < 200 || res.statusCode >= 300) {
            finalize(new Error('HTTP ' + res.statusCode));
          } else {
            finalize(null);
          }
        },
        fail: function (err) {
          finalize(new Error(err && err.errMsg ? err.errMsg : '网络错误'));
        },
      });
    } catch (e) {
      reject(e);
      return;
    }

    if (!task || typeof task.onChunkReceived !== 'function') {
      // 老基础库不支持流式
      reject(new Error('STREAM_UNSUPPORTED'));
      return;
    }

    task.onChunkReceived(function (res) {
      if (done) return;
      try {
        var piece = abToString(res.data);
        buffer += piece;
        var sepIdx;
        while ((sepIdx = buffer.indexOf('\n\n')) >= 0) {
          var eventBlock = buffer.slice(0, sepIdx);
          buffer = buffer.slice(sepIdx + 2);
          var lines = eventBlock.split('\n');
          for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            if (line.indexOf('data:') !== 0) continue;
            var data = line.slice(5).trim();
            if (!data) continue;
            if (data === '[DONE]') {
              finalize(null);
              return;
            }
            var parsed;
            try { parsed = JSON.parse(data); } catch (eP) { continue; }
            if (parsed.delta && callbacks.onDelta) callbacks.onDelta(parsed.delta);
            if (parsed.reasoning && callbacks.onReasoning) callbacks.onReasoning(parsed.reasoning);
            if (parsed.error && callbacks.onError) callbacks.onError(parsed.error);
          }
        }
      } catch (eC) {
        // 解析失败吞掉，等下一块；最终通过 success/fail 收口
      }
    });
  });
}

function wechatLogin(extra) {
  return exchangeWechatLogin(extra);
}

function aiChat(payload) {
  return request('/ai/chat', {
    method: 'POST',
    data: payload,
    timeout: 90000,
  });
}

/**
 * 上传文件到 /api/uploads
 */
function uploadFile(filePath, kind, fileName) {
  return new Promise(function (resolve, reject) {
    var app = getApp();
    var token = app.globalData.token || '';
    var base = app.globalData.apiBaseUrl;
    if (!token) { reject(new Error('未登录')); return; }
    wx.uploadFile({
      url: base + '/uploads',
      filePath: filePath,
      name: 'file',
      header: {
        Authorization: 'Bearer ' + token,
        Accept: 'application/json',
      },
      formData: { kind: kind || 'file', name: fileName || '' },
      timeout: 120000,
      success: function (res) {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error('上传失败 HTTP ' + res.statusCode));
          return;
        }
        try {
          var data = JSON.parse(res.data);
          resolve(data);
        } catch (e) {
          reject(new Error('上传响应解析失败'));
        }
      },
      fail: function (err) {
        reject(new Error(err && err.errMsg ? err.errMsg : '上传失败'));
      },
    });
  });
}

module.exports = {
  wechatLogin: wechatLogin,
  aiChat: aiChat,
  aiChatStream: aiChatStream,
  uploadFile: uploadFile,
};
