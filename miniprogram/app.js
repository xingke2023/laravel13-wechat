// app.js
App({
  globalData: {
    apiBaseUrl: 'https://paper.xingke888.com/api',
    token: '',
    user: null,
  },

  onLaunch: function () {
    try {
      var token = wx.getStorageSync('token') || '';
      var user = wx.getStorageSync('user') || null;
      this.globalData.token = token;
      this.globalData.user = user;
    } catch (e) {
      this.globalData.token = '';
      this.globalData.user = null;
    }
  },
});
