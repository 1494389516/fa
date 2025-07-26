// pages/dashboard/dashboard.js - 主控制台页面
import authService from '../../utils/auth.js'
import storage from '../../utils/storage.js'

Page({
  data: {
    // 用户信息
    userInfo: null,
    // 统计数据
    stats: {
      // 抖音相关
      douyinBloggers: 0,
      douyinVideos: 0,
      douyinUnread: 0,
      douyinToday: 0,
      // QQ音乐相关
      qqMusicArtists: 0,
      qqMusicSongs: 0,
      qqMusicUnread: 0,
      qqMusicToday: 0
    },
    // 最新更新
    recentUpdates: {
      videos: [],
      songs: []
    },
    // 加载状态
    loading: false,
    refreshing: false,
    // 功能状态
    douyinConnected: false,
    qqMusicConnected: false,
    // 监控状态
    monitoringActive: false,
    lastCheckTime: null
  },

  onLoad() {
    console.log('主控制台页面加载')
    
    // 检查登录状态
    if (!authService.checkLoginStatus()) {
      wx.reLaunch({
        url: '/pages/welcome/welcome'
      })
      return
    }
    
    this.initDashboard()
  },

  onShow() {
    console.log('页面显示')
    this.refreshConnectionStatus()
  },

  onPullDownRefresh() {
    this.refreshConnectionStatus()
    wx.stopPullDownRefresh()
  },

  // 初始化控制台
  initDashboard() {
    console.log('初始化控制台')
    
    // 设置用户信息
    this.setData({
      userInfo: authService.userInfo,
      loading: false
    })
    
    this.refreshConnectionStatus()
  },

  // 刷新连接状态
  refreshConnectionStatus() {
    const douyinConnected = authService.hasDouyinAuth()
    const qqMusicConnected = authService.hasQQMusicAuth()
    
    this.setData({
      douyinConnected,
      qqMusicConnected,
      monitoringActive: douyinConnected || qqMusicConnected
    })

    // 如果有连接，更新统计数据
    if (douyinConnected) {
      this.setData({
        'stats.douyinBloggers': 5,
        'stats.douyinVideos': 120,
        'stats.douyinUnread': 3,
        'stats.douyinToday': 8
      })
    }

    if (qqMusicConnected) {
      this.setData({
        'stats.qqMusicArtists': 10,
        'stats.qqMusicSongs': 200,
        'stats.qqMusicUnread': 5,
        'stats.qqMusicToday': 12
      })
    }
  },



  // 连接抖音
  connectDouyin() {
    wx.navigateTo({
      url: '/pages/douyin-auth/douyin-auth'
    })
  },

  // 连接QQ音乐
  connectQQMusic() {
    wx.navigateTo({
      url: '/pages/music-login/music-login'
    })
  },

  // 查看抖音博主
  viewDouyinBloggers() {
    wx.switchTab({
      url: '/pages/blogger-list/blogger-list'
    })
  },

  // 查看QQ音乐歌手
  viewQQMusicArtists() {
    wx.switchTab({
      url: '/pages/artist-list/artist-list'
    })
  },

  // 查看视频历史
  viewVideoHistory() {
    wx.navigateTo({
      url: '/pages/video-history/video-history'
    })
  },

  // 查看歌曲历史
  viewSongHistory() {
    wx.navigateTo({
      url: '/pages/song-history/song-history'
    })
  },

  // 查看所有历史
  viewAllHistory() {
    wx.switchTab({
      url: '/pages/history/history'
    })
  },

  // 点击视频条目
  onVideoTap(e) {
    wx.showToast({
      title: '视频详情功能开发中',
      icon: 'none'
    })
  },

  // 点击歌曲条目
  onSongTap(e) {
    wx.showToast({
      title: '歌曲详情功能开发中',
      icon: 'none'
    })
  },

  // 切换监控状态
  toggleMonitoring() {
    const newStatus = !this.data.monitoringActive
    this.setData({
      monitoringActive: newStatus
    })
    
    wx.showToast({
      title: newStatus ? '监控已开启' : '监控已暂停',
      icon: 'success'
    })
  },

  // 手动检查更新
  manualCheck() {
    wx.showToast({
      title: '手动检查功能开发中',
      icon: 'none'
    })
  },

  // 格式化相对时间
  formatRelativeTime(time) {
    return time || '未知'
  },

  // 查看API说明
  viewApiInfo() {
    wx.navigateTo({
      url: '/pages/api-info/api-info'
    })
  }
})