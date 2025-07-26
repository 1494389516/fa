// pages/douyin-auth/douyin-auth.js
import authService from '../../utils/auth.js'
import storage from '../../utils/storage.js'
import { STORAGE_KEYS } from '../../utils/constants.js'

Page({
  data: {
    loading: false,
    step: 1, // 1: 说明页, 2: 授权中, 3: 完成
    authSteps: [
      {
        title: '连接抖音账号',
        desc: '获取您关注的博主列表',
        icon: '🔗'
      },
      {
        title: '同步关注数据',
        desc: '导入您的关注列表',
        icon: '📥'
      },
      {
        title: '开始监控',
        desc: '实时监控博主动态',
        icon: '👀'
      }
    ]
  },

  onLoad() {
    console.log('抖音授权页面加载')
  },

  // 开始授权
  async startAuth() {
    if (this.data.loading) return

    try {
      this.setData({ 
        loading: true,
        step: 2
      })

      // 显示真实授权说明
      wx.showModal({
        title: '授权说明',
        content: '由于抖音开放平台的限制，小程序无法直接获取用户的关注列表。\n\n真实的授权流程需要：\n1. 企业开发者资质\n2. 抖音开放平台审核\n3. 用户在抖音APP内授权\n\n当前为演示版本，使用模拟数据。',
        confirmText: '了解',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            this.proceedWithDemo()
          } else {
            this.setData({ loading: false, step: 1 })
          }
        }
      })

    } catch (error) {
      console.error('授权失败:', error)
      this.setData({ loading: false })
    }
  },

  // 继续演示流程
  async proceedWithDemo() {
    try {
      // 模拟真实的授权步骤
      await this.simulateRealAuth()

      // 保存授权信息（演示用）
      storage.set(STORAGE_KEYS.DOUYIN_TOKEN, 'demo-douyin-token-' + Date.now())
      
      // 更新认证服务状态
      authService.douyinToken = 'demo-douyin-token-' + Date.now()

      this.setData({ 
        step: 3,
        loading: false
      })

      wx.showToast({
        title: '演示连接成功',
        icon: 'success'
      })

      // 2秒后返回
      setTimeout(() => {
        wx.navigateBack()
      }, 2000)

    } catch (error) {
      console.error('演示授权失败:', error)
      this.setData({ loading: false })
      
      wx.showModal({
        title: '连接失败',
        content: '演示授权失败，请重试',
        showCancel: false
      })
    }
  },

  // 模拟真实授权过程
  simulateRealAuth() {
    return new Promise((resolve) => {
      // 模拟真实的网络请求和授权流程
      let progress = 0
      const interval = setInterval(() => {
        progress += 25
        console.log(`授权进度: ${progress}%`)
        
        if (progress >= 100) {
          clearInterval(interval)
          resolve()
        }
      }, 500)
    })
  },

  // 跳过授权
  skipAuth() {
    wx.showModal({
      title: '提示',
      content: '跳过连接将无法监控抖音博主，确定要跳过吗？',
      success: (res) => {
        if (res.confirm) {
          wx.navigateBack()
        }
      }
    })
  },

  // 返回
  goBack() {
    wx.navigateBack()
  }
})