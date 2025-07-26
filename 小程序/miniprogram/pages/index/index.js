// pages/index/index.js - 首页（启动页）
import authService from '../../utils/auth.js'
import { PAGE_PATHS } from '../../utils/constants.js'

Page({
  data: {
    loading: true,
    progress: 0,
    statusText: '正在初始化...'
  },

  onLoad() {
    console.log('应用启动')
    this.initApp()
  },

  // 初始化应用
  async initApp() {
    try {
      // 模拟加载过程
      await this.simulateLoading()
      
      // 检查登录状态
      const isLoggedIn = authService.checkLoginStatus()
      
      if (isLoggedIn) {
        // 已登录，跳转到主控制台
        this.navigateTo(PAGE_PATHS.DASHBOARD)
      } else {
        // 未登录，跳转到授权页面
        this.navigateTo(PAGE_PATHS.AUTH)
      }
      
    } catch (error) {
      console.error('应用初始化失败:', error)
      this.handleInitError(error)
    }
  },

  // 模拟加载过程
  simulateLoading() {
    return new Promise((resolve) => {
      const steps = [
        { progress: 20, text: '正在加载配置...' },
        { progress: 40, text: '正在连接服务器...' },
        { progress: 60, text: '正在检查更新...' },
        { progress: 80, text: '正在验证登录状态...' },
        { progress: 100, text: '初始化完成' }
      ]

      let currentStep = 0
      
      const updateProgress = () => {
        if (currentStep < steps.length) {
          const step = steps[currentStep]
          this.setData({
            progress: step.progress,
            statusText: step.text
          })
          
          currentStep++
          setTimeout(updateProgress, 300)
        } else {
          setTimeout(resolve, 500)
        }
      }
      
      updateProgress()
    })
  },

  // 处理初始化错误
  handleInitError(error) {
    this.setData({
      loading: false,
      statusText: '初始化失败'
    })

    wx.showModal({
      title: '启动失败',
      content: '应用启动时遇到问题，请检查网络连接后重试。',
      confirmText: '重试',
      cancelText: '退出',
      success: (res) => {
        if (res.confirm) {
          this.initApp()
        } else {
          // 用户选择退出，跳转到授权页面
          this.navigateTo(PAGE_PATHS.AUTH)
        }
      }
    })
  },

  // 导航到指定页面
  navigateTo(path) {
    // 使用reLaunch确保清除页面栈
    wx.reLaunch({
      url: path,
      fail: (error) => {
        console.error('页面跳转失败:', error)
        // 如果跳转失败，尝试跳转到授权页面
        wx.reLaunch({
          url: PAGE_PATHS.AUTH
        })
      }
    })
  },

  // 手动重试
  onRetry() {
    this.setData({
      loading: true,
      progress: 0,
      statusText: '正在重新初始化...'
    })
    
    this.initApp()
  }
})