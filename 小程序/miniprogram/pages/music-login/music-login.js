// pages/music-login/music-login.js

Page({
  data: {
    platforms: [
      {
        id: 'netease',
        name: '网易云音乐',
        icon: '/images/netease-music.png',
        color: '#d33a31'
      },
      {
        id: 'qq',
        name: 'QQ音乐',
        icon: '/images/qq-music.png',
        color: '#31c27c'
      },
      {
        id: 'kugou',
        name: '酷狗音乐',
        icon: '/images/kugou-music.png',
        color: '#2196f3'
      }
    ],
    selectedPlatform: null
  },

  onLoad() {
    console.log('音乐登录页面加载')
  },

  onReady() {
    console.log('音乐登录页面准备完成')
  },

  onPlatformSelect(e) {
    console.log('onPlatformSelect 被调用', e.currentTarget.dataset.platform)
    const platform = e.currentTarget.dataset.platform;
    this.setData({
      selectedPlatform: platform
    });
    console.log('选中的平台:', platform)
  },

  onLogin() {
    console.log('onLogin 被调用', this.data.selectedPlatform)
    
    if (!this.data.selectedPlatform) {
      wx.showToast({
        title: '请选择音乐平台',
        icon: 'none'
      });
      return;
    }

    // 直接进入演示流程，跳过可能有问题的模态框
    wx.showToast({
      title: `正在连接${this.data.selectedPlatform.name}...`,
      icon: 'none',
      duration: 1000
    });

    setTimeout(() => {
      this.proceedWithDemo();
    }, 1000);
  },

  // 继续演示流程
  proceedWithDemo() {
    console.log('proceedWithDemo 被调用')
    
    wx.showLoading({
      title: '连接中...'
    });

    // 模拟授权过程
    setTimeout(() => {
      wx.hideLoading();
      
      try {
        // 保存授权信息（演示用）
        wx.setStorageSync('douyin_monitor_qq_music_token', 'demo-qqmusic-token-' + Date.now())
        console.log('授权信息保存成功')
        
        wx.showToast({
          title: '连接成功',
          icon: 'success',
          duration: 1500
        });
        
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
        
      } catch (error) {
        console.error('保存失败:', error)
        wx.showToast({
          title: '连接失败',
          icon: 'none'
        });
      }
    }, 1000);
  }
});