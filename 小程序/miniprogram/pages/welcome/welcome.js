// pages/welcome/welcome.js - 欢迎引导页面
import authService from '../../utils/auth.js'
import storage from '../../utils/storage.js'
import { STORAGE_KEYS } from '../../utils/constants.js'

Page({
  data: {
    currentStep: 0,
    steps: [
      {
        title: '欢迎使用内容监控助手',
        desc: '实时监控您关注的抖音博主和音乐歌手的最新动态',
        image: '/images/welcome-1.png'
      },
      {
        title: '获取用户授权',
        desc: '我们需要获取您的基本信息以提供个性化服务',
        image: '/images/welcome-2.png'
      },
      {
        title: '连接社交平台',
        desc: '连接抖音和QQ音乐，开始监控您感兴趣的内容',
        image: '/images/welcome-3.png'
      }
    ],
    userAuthorized: false,
    loading: false
  },

  onLoad() {
    // 检查是否首次启动
    const hasWelcomed = storage.get('has_welcomed')
    if (hasWelcomed) {
      this.redirectToMain()
      return
    }
  },

  // 下一步
  nextStep() {
    if (this.data.currentStep < this.data.steps.length - 1) {
      this.setData({
        currentStep: this.data.currentStep + 1
      })
    } else {
      this.startAuth()
    }
  },

  // 上一步
  prevStep() {
    if (this.data.currentStep > 0) {
      this.setData({
        currentStep: this.data.currentStep - 1
      })
    }
  },

  // 开始授权
  async startAuth() {
    if (this.data.loading) return

    try {
      this.setData({ loading: true })

      // 获取用户授权
      const userProfile = await this.getUserProfile()
      
      // 模拟登录成功
      const userInfo = {
        id: Date.now(),
        nickname: userProfile.nickName,
        avatar: userProfile.avatarUrl
      }

      // 保存用户信息
      storage.set(STORAGE_KEYS.WECHAT_TOKEN, 'mock-token-' + Date.now())
      storage.set(STORAGE_KEYS.USER_INFO, userInfo)
      storage.set('has_welcomed', true)

      // 更新认证服务状态
      authService.isLoggedIn = true
      authService.userInfo = userInfo

      wx.showToast({
        title: '授权成功',
        icon: 'success'
      })

      setTimeout(() => {
        this.redirectToMain()
      }, 1500)

    } catch (error) {
      console.error('授权失败:', error)
      wx.showModal({
        title: '授权失败',
        content: '获取用户信息失败，请重试',
        showCancel: false
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 获取用户信息
  getUserProfile() {
    return new Promise((resolve, reject) => {
      wx.getUserProfile({
        desc: '用于完善用户资料',
        success: (res) => {
          resolve(res.userInfo)
        },
        fail: reject
      })
    })
  },

  // 跳转到主页面
  redirectToMain() {
    wx.reLaunch({
      url: '/pages/dashboard/dashboard'
    })
  },

  // 跳过引导
  skipWelcome() {
    wx.showModal({
      title: '提示',
      content: '跳过引导将无法使用完整功能，确定要跳过吗？',
      success: (res) => {
        if (res.confirm) {
          storage.set('has_welcomed', true)
          this.redirectToMain()
        }
      }
    })
  }
})