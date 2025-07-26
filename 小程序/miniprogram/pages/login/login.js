// pages/login/login.js - 抖音登录页面
import api from '../../utils/api.js'
import authService from '../../utils/auth.js'
import { PAGE_PATHS } from '../../utils/constants.js'

Page({
  data: {
    loading: false,
    authUrl: '',
    showWebview: false,
    loginSteps: [
      {
        icon: '🔐',
        title: '安全授权',
        desc: '使用抖音官方授权，保障账号安全'
      },
      {
        icon: '👥',
        title: '获取关注',
        desc: '读取您关注的博主列表'
      },
      {
        icon: '📺',
        title: '监控视频',
        desc: '实时监控博主的最新视频更新'
      }
    ],
    currentStep: 0
  },

  onLoad(options) {
    console.log('抖音登录页面加载', options)
    
    // 检查是否从授权回调返回
    if (options.code) {
      this.handleAuthCallback(options.code, options.state)
    } else if (options.authUrl) {
      // 从权限页面传递的授权URL
      this.setData({
        authUrl: decodeURIComponent(options.authUrl)
      })
    }
    
    this.startStepAnimation()
  },

  onShow() {
    // 检查登录状态
    if (authService.checkLoginStatus() && authService.douyinToken) {
      // 已经完成抖音授权，跳转到主页
      this.navigateToDashboard()
    }
  },

  // 开始步骤动画
  startStepAnimation() {
    const timer = setInterval(() => {
      this.setData({
        currentStep: (this.data.currentStep + 1) % this.data.loginSteps.length
      })
    }, 2000)

    // 页面销毁时清除定时器
    this.timer = timer
  },

  onUnload() {
    if (this.timer) {
      clearInterval(this.timer)
    }
  },

  // 开始抖音授权
  async onStartDouyinAuth() {
    try {
      this.setData({ loading: true })

      // 获取抖音授权URL
      const response = await api.get('/auth/douyin-auth-url')
      
      if (response.code === 0) {
        const authUrl = response.data.authUrl
        
        // 跳转到webview进行授权
        wx.navigateTo({
          url: `/pages/webview/webview?url=${encodeURIComponent(authUrl)}&title=抖音授权`
        })
      } else {
        throw new Error(response.message)
      }

    } catch (error) {
      console.error('获取抖音授权URL失败:', error)
      wx.showModal({
        title: '授权失败',
        content: '获取授权链接失败，请检查网络连接后重试。',
        showCancel: false
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 处理授权回调
  async handleAuthCallback(code, state) {
    try {
      wx.showLoading({
        title: '正在授权...',
        mask: true
      })

      // 调用后端处理抖音授权
      const response = await authService.handleDouyinCallback(code)
      
      wx.hideLoading()

      if (response) {
        wx.showToast({
          title: '授权成功',
          icon: 'success',
          duration: 2000
        })

        // 延迟跳转，让用户看到成功提示
        setTimeout(() => {
          this.navigateToDashboard()
        }, 2000)
      }

    } catch (error) {
      wx.hideLoading()
      console.error('抖音授权回调处理失败:', error)
      
      wx.showModal({
        title: '授权失败',
        content: error.message || '授权过程中出现错误，请重试。',
        confirmText: '重新授权',
        cancelText: '稍后再说',
        success: (res) => {
          if (res.confirm) {
            this.onStartDouyinAuth()
          } else {
            this.navigateBack()
          }
        }
      })
    }
  },

  // 跳过抖音授权
  onSkipAuth() {
    wx.showModal({
      title: '跳过授权',
      content: '跳过抖音授权将无法使用监控功能，您可以稍后在设置中完成授权。',
      confirmText: '确定跳过',
      cancelText: '继续授权',
      success: (res) => {
        if (res.confirm) {
          this.navigateToDashboard()
        }
      }
    })
  },

  // 查看授权说明
  onViewAuthInfo() {
    wx.showModal({
      title: '授权说明',
      content: '我们需要获取您的抖音授权以实现以下功能：\n\n1. 读取您关注的博主列表\n2. 获取博主的最新视频信息\n3. 为您提供实时更新通知\n\n我们承诺不会获取您的私人信息，也不会进行任何未经授权的操作。',
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  // 联系客服
  onContactService() {
    wx.showModal({
      title: '联系客服',
      content: '如果您在授权过程中遇到问题，可以通过以下方式联系我们：\n\n微信客服：your-service-wechat\n邮箱：support@example.com',
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  // 跳转到主控制台
  navigateToDashboard() {
    wx.switchTab({
      url: PAGE_PATHS.DASHBOARD,
      fail: () => {
        wx.reLaunch({
          url: PAGE_PATHS.DASHBOARD
        })
      }
    })
  },

  // 返回上一页
  navigateBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack()
    } else {
      wx.reLaunch({
        url: PAGE_PATHS.AUTH
      })
    }
  }
})