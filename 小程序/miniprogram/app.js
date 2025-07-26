// app.js - 应用入口文件（简化版本）
App({
  globalData: {
    userInfo: null,
    douyinToken: null,
    qqMusicToken: null,
    version: '1.0.0'
  },

  onLaunch(options) {
    console.log('应用启动', options)
    this.initializeApp()
  },

  onShow(options) {
    console.log('应用显示', options)
  },

  onHide() {
    console.log('应用隐藏')
  },

  onError(error) {
    console.error('应用错误', error)
  },

  // 初始化应用
  initializeApp() {
    console.log('初始化应用')
    
    // 获取系统信息
    wx.getSystemInfo({
      success: (res) => {
        console.log('系统信息', res)
      }
    })
  },

  // 获取用户信息
  getUserInfo() {
    return this.globalData.userInfo
  },

  // 设置用户信息
  setUserInfo(userInfo) {
    this.globalData.userInfo = userInfo
  },

  // 清除用户信息
  clearUserInfo() {
    this.globalData.userInfo = null
    this.globalData.douyinToken = null
    this.globalData.qqMusicToken = null
  }
})