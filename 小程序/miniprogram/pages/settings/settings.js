// pages/settings/settings.js - 用户设置页面
import api from '../../utils/api.js'
import authService from '../../utils/auth.js'
import logger from '../../utils/logger.js'
import { formatCount } from '../../utils/utils.js'

Page({
  data: {
    // 用户信息
    userInfo: {},
    // 设置项
    settings: {
      monitorInterval: 5,
      pushEnabled: true,
      pushTime: {
        start: '08:00',
        end: '22:00'
      }
    },
    // 统计信息
    stats: {
      monitoringCount: 0,
      totalUpdates: 0,
      todayUpdates: 0
    },
    // 平台绑定状态
    platformStatus: {
      douyin: false,
      qqMusic: false
    },
    // 加载状态
    loading: false,
    saving: false,
    // 临时设置（用于编辑）
    tempSettings: {},
    // 显示状态
    showIntervalPicker: false,
    showTimePicker: false,
    timePickerType: '', // start | end
    // 间隔选项
    intervalOptions: [
      { value: 1, label: '1分钟' },
      { value: 5, label: '5分钟' },
      { value: 10, label: '10分钟' },
      { value: 15, label: '15分钟' },
      { value: 30, label: '30分钟' },
      { value: 60, label: '60分钟' }
    ]
  },

  onLoad(options) {
    logger.info('设置页面加载', options)
    
    // 检查登录状态
    if (!authService.checkLoginStatus()) {
      wx.reLaunch({
        url: '/pages/auth/auth'
      })
      return
    }

    this.loadUserSettings()
    this.loadUserStats()
    this.checkPlatformStatus()
  },

  onShow() {
    // 页面显示时刷新平台状态
    this.checkPlatformStatus()
  },

  // 加载用户设置
  async loadUserSettings() {
    if (this.data.loading) return

    try {
      this.setData({ loading: true })

      const response = await api.get('/settings/user')

      if (response.code === 0) {
        const { userInfo, settings } = response.data
        
        this.setData({
          userInfo,
          settings,
          tempSettings: { ...settings }
        })

        logger.info('用户设置加载成功', { settings })
      } else {
        throw new Error(response.message)
      }

    } catch (error) {
      logger.error('加载用户设置失败', error)
      this.showError('加载失败', error.message)
    } finally {
      this.setData({ loading: false })
    }
  },

  // 加载用户统计
  async loadUserStats() {
    try {
      const response = await api.get('/settings/stats')

      if (response.code === 0) {
        this.setData({
          stats: response.data
        })
      }

    } catch (error) {
      logger.error('加载用户统计失败', error)
    }
  },

  // 检查平台绑定状态
  checkPlatformStatus() {
    const platformStatus = authService.getPlatformStatus()
    this.setData({ platformStatus })
  },

  // 保存设置
  async saveSettings() {
    if (this.data.saving) return

    try {
      this.setData({ saving: true })

      wx.showLoading({
        title: '保存中...',
        mask: true
      })

      const response = await api.put('/settings/user', {
        settings: this.data.tempSettings
      })

      if (response.code === 0) {
        this.setData({
          settings: { ...this.data.tempSettings }
        })

        wx.showToast({
          title: '保存成功',
          icon: 'success'
        })

        logger.info('用户设置保存成功', { settings: this.data.tempSettings })
      } else {
        throw new Error(response.message)
      }

    } catch (error) {
      logger.error('保存用户设置失败', error)
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      })
    } finally {
      this.setData({ saving: false })
      wx.hideLoading()
    }
  },

  // 监控间隔设置
  onIntervalTap() {
    this.setData({ showIntervalPicker: true })
  },

  onIntervalChange(e) {
    const index = e.detail.value
    const interval = this.data.intervalOptions[index].value
    
    this.setData({
      'tempSettings.monitorInterval': interval,
      showIntervalPicker: false
    })
  },

  onIntervalCancel() {
    this.setData({ showIntervalPicker: false })
  },

  // 推送开关
  onPushToggle(e) {
    const pushEnabled = e.detail.value
    
    if (pushEnabled) {
      // 检查推送权限
      this.checkPushPermission()
    }
    
    this.setData({
      'tempSettings.pushEnabled': pushEnabled
    })
  },

  // 检查推送权限
  async checkPushPermission() {
    try {
      const setting = await new Promise((resolve) => {
        wx.getSetting({
          success: resolve,
          fail: () => resolve({ authSetting: {} })
        })
      })

      const hasPermission = setting.authSetting['scope.subscribeMessage'] !== false

      if (!hasPermission) {
        wx.showModal({
          title: '推送权限',
          content: '需要订阅消息权限才能接收推送通知，是否前往设置？',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting()
            }
          }
        })
      }

    } catch (error) {
      logger.error('检查推送权限失败', error)
    }
  },

  // 推送时间设置
  onPushTimeStartTap() {
    this.setData({
      showTimePicker: true,
      timePickerType: 'start'
    })
  },

  onPushTimeEndTap() {
    this.setData({
      showTimePicker: true,
      timePickerType: 'end'
    })
  },

  onTimeChange(e) {
    const time = e.detail.value
    const type = this.data.timePickerType
    
    this.setData({
      [`tempSettings.pushTime.${type}`]: time,
      showTimePicker: false
    })
  },

  onTimeCancel() {
    this.setData({ showTimePicker: false })
  },

  // 平台绑定管理
  onDouyinBind() {
    if (this.data.platformStatus.douyin) {
      // 已绑定，显示解绑选项
      wx.showModal({
        title: '解绑抖音',
        content: '解绑后将无法监控抖音博主，确定要解绑吗？',
        success: (res) => {
          if (res.confirm) {
            this.unbindDouyin()
          }
        }
      })
    } else {
      // 未绑定，跳转到绑定页面
      wx.navigateTo({
        url: '/pages/login/login'
      })
    }
  },

  onQQMusicBind() {
    if (this.data.platformStatus.qqMusic) {
      // 已绑定，显示解绑选项
      wx.showModal({
        title: '解绑QQ音乐',
        content: '解绑后将无法监控QQ音乐歌手，确定要解绑吗？',
        success: (res) => {
          if (res.confirm) {
            this.unbindQQMusic()
          }
        }
      })
    } else {
      // 未绑定，跳转到绑定页面
      wx.navigateTo({
        url: '/pages/music-login/music-login'
      })
    }
  },

  // 解绑平台
  async unbindDouyin() {
    try {
      wx.showLoading({
        title: '解绑中...',
        mask: true
      })

      const response = await api.delete('/auth/douyin-unbind')

      if (response.code === 0) {
        this.setData({
          'platformStatus.douyin': false
        })

        wx.showToast({
          title: '解绑成功',
          icon: 'success'
        })

        logger.info('抖音解绑成功')
      }

    } catch (error) {
      logger.error('抖音解绑失败', error)
      wx.showToast({
        title: '解绑失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  async unbindQQMusic() {
    try {
      wx.showLoading({
        title: '解绑中...',
        mask: true
      })

      const response = await api.delete('/auth/qqmusic-unbind')

      if (response.code === 0) {
        this.setData({
          'platformStatus.qqMusic': false
        })

        wx.showToast({
          title: '解绑成功',
          icon: 'success'
        })

        logger.info('QQ音乐解绑成功')
      }

    } catch (error) {
      logger.error('QQ音乐解绑失败', error)
      wx.showToast({
        title: '解绑失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 测试推送
  async testPush() {
    try {
      wx.showLoading({
        title: '发送测试推送...',
        mask: true
      })

      const response = await api.post('/settings/test-push')

      if (response.code === 0) {
        wx.showToast({
          title: '测试推送已发送',
          icon: 'success'
        })
      } else {
        throw new Error(response.message)
      }

    } catch (error) {
      logger.error('测试推送失败', error)
      wx.showToast({
        title: '发送失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 清除缓存
  async clearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '确定要清除所有缓存数据吗？这将提高应用性能。',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({
              title: '清除中...',
              mask: true
            })

            // 清除本地存储
            wx.clearStorageSync()
            
            // 清除网络缓存
            await new Promise((resolve) => {
              wx.clearStorage({
                success: resolve,
                fail: resolve
              })
            })

            wx.showToast({
              title: '缓存已清除',
              icon: 'success'
            })

            logger.info('缓存清除成功')

          } catch (error) {
            logger.error('清除缓存失败', error)
            wx.showToast({
              title: '清除失败',
              icon: 'none'
            })
          } finally {
            wx.hideLoading()
          }
        }
      }
    })
  },

  // 导出数据
  async exportData() {
    try {
      wx.showLoading({
        title: '导出中...',
        mask: true
      })

      const response = await api.get('/settings/export-data')

      if (response.code === 0) {
        // 这里可以实现数据导出功能
        wx.showToast({
          title: '导出成功',
          icon: 'success'
        })
      }

    } catch (error) {
      logger.error('导出数据失败', error)
      wx.showToast({
        title: '导出失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 关于应用
  onAbout() {
    wx.navigateTo({
      url: '/pages/about/about'
    })
  },

  // 意见反馈
  onFeedback() {
    wx.navigateTo({
      url: '/pages/feedback/feedback'
    })
  },

  // 隐私政策
  onPrivacyPolicy() {
    wx.navigateTo({
      url: '/pages/webview/webview?url=' + encodeURIComponent('https://your-domain.com/privacy-policy') + '&title=隐私政策'
    })
  },

  // 用户协议
  onUserAgreement() {
    wx.navigateTo({
      url: '/pages/webview/webview?url=' + encodeURIComponent('https://your-domain.com/user-agreement') + '&title=用户协议'
    })
  },

  // 退出登录
  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？退出后需要重新授权。',
      success: (res) => {
        if (res.confirm) {
          this.performLogout()
        }
      }
    })
  },

  async performLogout() {
    try {
      wx.showLoading({
        title: '退出中...',
        mask: true
      })

      await authService.logout()

      wx.showToast({
        title: '已退出登录',
        icon: 'success'
      })

      logger.info('用户退出登录')

    } catch (error) {
      logger.error('退出登录失败', error)
      wx.showToast({
        title: '退出失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 获取间隔显示文本
  getIntervalText() {
    const interval = this.data.tempSettings.monitorInterval || this.data.settings.monitorInterval
    const option = this.data.intervalOptions.find(opt => opt.value === interval)
    return option ? option.label : `${interval}分钟`
  },

  // 显示错误信息
  showError(title, content) {
    wx.showModal({
      title,
      content,
      showCancel: false,
      confirmText: '我知道了'
    })
  }
})