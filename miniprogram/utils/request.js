// utils/request.js
// wx.request 封装：自动注入 Authorization，401 触发重新 wx.login 并重试一次
// 用 Promise 链而非 async/await，避免触发微信开发者工具的 @babel/runtime 转译路径。

function wxLogin() {
  return new Promise(function (resolve, reject) {
    wx.login({
      success: function (r) { r.code ? resolve(r.code) : reject(new Error('wx.login 没返回 code')); },
      fail: function (err) { reject(err); },
    });
  });
}

function callBackend(path, options) {
  return new Promise(function (resolve, reject) {
    var app = getApp();
    var base = app.globalData.apiBaseUrl;
    var token = app.globalData.token || '';
    var headers = Object.assign(
      { 'Content-Type': 'application/json', Accept: 'application/json' },
      token ? { Authorization: 'Bearer ' + token } : {},
      options.header || {}
    );

    wx.request({
      url: base + path,
      method: options.method || 'GET',
      data: options.data || {},
      header: headers,
      timeout: options.timeout || 60000,
      success: function (res) { resolve(res); },
      fail: function (err) { reject(err); },
    });
  });
}

function exchangeWechatLogin(extra) {
  extra = extra || {};
  return wxLogin().then(function (code) {
    return callBackend('/auth/wechat-login', {
      method: 'POST',
      data: Object.assign({ code: code }, extra),
    });
  }).then(function (res) {
    if (res.statusCode !== 200 || !res.data || !res.data.access_token) {
      var msg = (res.data && (res.data.message || res.data.detail)) || ('HTTP ' + res.statusCode);
      throw new Error(msg);
    }
    var app = getApp();
    app.globalData.token = res.data.access_token;
    app.globalData.user = res.data.user;
    try {
      wx.setStorageSync('token', res.data.access_token);
      wx.setStorageSync('user', res.data.user);
    } catch (e) { /* ignore */ }
    return res.data;
  });
}

function request(path, options) {
  options = options || {};
  return callBackend(path, options).then(function (res) {
    if (res.statusCode === 401 && path !== '/auth/wechat-login') {
      var app = getApp();
      app.globalData.token = '';
      app.globalData.user = null;
      try { wx.removeStorageSync('token'); wx.removeStorageSync('user'); } catch (e) {}

      return exchangeWechatLogin().catch(function (e) {
        throw new Error('登录失败：' + (e.message || e));
      }).then(function () {
        return callBackend(path, options);
      });
    }
    return res;
  }).then(function (res) {
    if (res.statusCode < 200 || res.statusCode >= 300) {
      var msg = (res.data && (res.data.message || res.data.detail)) || ('HTTP ' + res.statusCode);
      throw new Error(msg);
    }
    return res.data;
  });
}

module.exports = { request: request, exchangeWechatLogin: exchangeWechatLogin };
