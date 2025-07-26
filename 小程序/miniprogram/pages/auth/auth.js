// pages/auth/auth.js - 权限授权页面
import authService from '../../utils/auth.js'
import { PAGE_PATHS } from '../../utils/constants.js'
import logger from '../../utils/logger.js'

Page({
  data: {
    showModal: false,
    hasAuthorized: false,
    loading: false,
    authStep: 0, // 0: 初始状态, 1: 权限检查中, 2: 微信登录中, 3: 完成
    permissions: [
      {
        icon: '👤',
        title: '用户信息',
        desc: '获取您的微信头像和昵称，用于个性化显示',
        required: true
      },
      {
        icon: '🔔',
        title: '推送通知',
        desc: '当关注的博主发布新视频时及时通知您',
        required: true
      },
      {
        icon: '📱',
        title: '抖音授权',
        desc: '获取您关注的抖音博主列表，实现监控功能',
        required: true
      }
    ],
    features: [
      '实时监控关注博主的视频更新',
      '智能推送通知，第一时间获知新内容',
      '个性化设置，自定义监控频率和推送时间',
      '历史记录查看，不错过任何精彩内容'
    ],
    appInfo: {
      name: '抖音监控助手',
      version: '1.0.0',
      description: '专业的抖音博主监控工具'
    }
  },

  onLoad() {
    logger.info('权限授权页面加载')
    this.checkAuthStatus()
    this.initPageAnimation()
  },

  onShow() {
    // 检查是否从其他页面返回
    this.checkAuthStatus()
  },

  onUnload() {
    // 清理定时器
    if (this.animationTimer) {
      clearInterval(this.animationTimer)
    }
  },

  // 初始化页面动画
  initPageAnimation() {
    // 添加页面加载动画效果
    const animation = wx.createAnimation({
      duration: 800,
      timingFunction: 'ease-out'
    })
    
    animation.opacity(1).translateY(0).step()
    this.setData({
      pageAnimation: animation.export()
    })
  },

  // 检查授权状态
  async checkAuthStatus() {
    try {
      this.setData({ authStep: 1 })
      
      const hasPermission = await authService.checkPermissions()
      const isLoggedIn = authService.checkLoginStatus()
      
      this.setData({
        hasAuthorized: hasPermission && isLoggedIn,
        authStep: hasPermission && isLoggedIn ? 3 : 0
      })

      // 如果已经授权且登录，延迟跳转到主页
      if (hasPermission && isLoggedIn) {
        logger.info('用户已授权，准备跳转到主页')
        setTimeout(() => {
          this.navigateToDashboard()
        }, 1000)
      }
    } catch (error) {
      logger.error('检查授权状态失败', error)
      this.setData({ authStep: 0 })
      this.showErrorToast('检查授权状态失败，请重试')
    }
  },

  // 开始授权
  onStartAuth() {
    this.setData({
      showModal: true
    })
  },

  // 同意授权
  async onAgreeAuth() {
    if (this.data.loading) return
    
    try {
      this.setData({ 
        loading: true,
        authStep: 2,
        showModal: false
      })

      wx.showLoading({
        title: '正在授权...',
        mask: true
      })

      // 请求用户授权
      logger.info('开始请求用户权限')
      await authService.requestPermissions()
      
      // 微信登录
      logger.info('开始微信登录')
      const loginResult = await authService.wechatLogin()
      
      wx.hideLoading()
      
      // 保存授权状态
      wx.setStorageSync('has_authorized', true)
      
      this.setData({
        hasAuthorized: true,
        authStep: 3,
        loading: false
      })

      // 显示成功提示
      wx.showToast({
        title: '授权成功',
        icon: 'success',
        duration: 2000
      })

      logger.info('用户授权成功', { userId: loginResult.userInfo?.id })

      // 延迟跳转，让用户看到成功提示
      setTimeout(() => {
        this.navigateToDashboard()
      }, 2000)

    } catch (error) {
      wx.hideLoading()
      logger.error('用户授权失败', error)
      
      this.setData({ 
        loading: false,
        authStep: 0
      })
      
      // 根据错误类型显示不同的提示
      let errorMessage = '授权过程中出现错误，请重试'
      
      if (error.message?.includes('getUserProfile')) {
        errorMessage = '需要您的授权才能使用完整功能，请重新尝试'
      } else if (error.message?.includes('network')) {
        errorMessage = '网络连接异常，请检查网络后重试'
      } else if (error.message?.includes('login')) {
        errorMessage = '微信登录失败，请重试'
      }
      
      wx.showModal({
        title: '授权失败',
        content: errorMessage,
        confirmText: '重新授权',
        cancelText: '稍后再说',
        success: (res) => {
          if (res.confirm) {
            this.onStartAuth()
          }
        }
      })
    }
  },

  // 拒绝授权
  onRejectAuth() {
    this.setData({
      showModal: false
    })

    logger.info('用户拒绝授权')

    wx.showModal({
      title: '功能受限提醒',
      content: '未授权将无法使用监控和推送功能。您可以随时在设置中重新授权，或者以访客模式浏览基础功能。',
      confirmText: '重新授权',
      cancelText: '访客模式',
      success: (res) => {
        if (res.confirm) {
          this.onStartAuth()
        } else {
          // 进入访客模式
          this.enterGuestMode()
        }
      }
    })
  },

  // 进入访客模式
  enterGuestMode() {
    logger.info('用户选择访客模式')
    
    // 设置访客模式标识
    wx.setStorageSync('guest_mode', true)
    
    wx.showToast({
      title: '已进入访客模式',
      icon: 'none',
      duration: 2000
    })

    setTimeout(() => {
      this.navigateToDashboard()
    }, 2000)
  },

  // 关闭弹窗
  onCloseModal() {
    this.setData({
      showModal: false
    })
  },

  // 跳转到主控制台
  navigateToDashboard() {
    // 优先使用switchTab，如果失败则使用reLaunch
    wx.switchTab({
      url: PAGE_PATHS.INDEX || '/pages/index/index',
      fail: (error) => {
        logger.warn('switchTab失败，尝试reLaunch', error)
        wx.reLaunch({
          url: PAGE_PATHS.INDEX || '/pages/index/index'
        })
      }
    })
  },

  // 查看隐私政策
  onViewPrivacy() {
    logger.info('用户查看隐私政策')
    
    wx.showModal({
      title: '隐私政策',
      content: '我们承诺严格保护您的隐私安全：\n\n• 仅收集必要的用户信息用于提供服务\n• 不会泄露、出售或滥用您的个人数据\n• 所有数据传输均采用加密保护\n• 您有权随时查看、修改或删除个人数据\n• 我们遵循最小权限原则，仅在必要时使用相关权限',
      showCancel: true,
      confirmText: '我知道了',
      cancelText: '查看详情',
      success: (res) => {
        if (!res.confirm) {
          // 跳转到详细隐私政策页面
          this.showDetailedPrivacyPolicy()
        }
      }
    })
  },

  // 显示详细隐私政策
  showDetailedPrivacyPolicy() {
    wx.navigateTo({
      url: '/pages/webview/webview?url=' + encodeURIComponent('https://your-domain.com/privacy-policy') + '&title=隐私政策详情',
      fail: () => {
        wx.showToast({
          title: '页面加载失败',
          icon: 'none'
        })
      }
    })
  },

  // 联系客服
  onContactService() {
    logger.info('用户联系客服')
    
    wx.showActionSheet({
      itemList: ['在线客服', '邮件反馈', '用户群'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            // 在线客服
            this.openCustomerService()
            break
          case 1:
            // 邮件反馈
            this.openEmailFeedback()
            break
          case 2:
            // 用户群
            this.showUserGroup()
            break
        }
      }
    })
  },

  // 打开在线客服
  openCustomerService() {
    wx.navigateTo({
      url: '/pages/customer-service/customer-service',
      fail: () => {
        wx.showToast({
          title: '客服功能暂未开放',
          icon: 'none'
        })
      }
    })
  },

  // 邮件反馈
  openEmailFeedback() {
    wx.setClipboardData({
      data: 'support@douyin-monitor.com',
      success: () => {
        wx.showToast({
          title: '邮箱已复制',
          icon: 'success'
        })
      }
    })
  },

  // 显示用户群信息
  showUserGroup() {
    wx.showModal({
      title: '加入用户群',
      content: '扫描二维码或搜索群号加入用户交流群：\n\n群号：123456789\n\n在群里可以获得更及时的技术支持和功能更新通知。',
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  // 显示错误提示
  showErrorToast(message) {
    wx.showToast({
      title: message,
      icon: 'none',
      duration: 3000
    })
  }
})