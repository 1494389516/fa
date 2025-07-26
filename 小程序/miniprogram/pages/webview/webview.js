// pages/webview/webview.js - WebView页面
import logger from '../../utils/logger.js'

Page({
  data: {
    url: '',
    title: 'WebView',
    loading: true,
    error: false,
    authType: '' // 'douyin' | 'qqmusic'
  },

  onLoad(options) {
    logger.info('WebView页面加载', options)

    if (options.url) {
      const url = decodeURIComponent(options.url)
      const title = options.title || 'WebView'
      const authType = options.authType || ''

      this.setData({
        url,
        title,
        authType
      })

      // 设置导航栏标题
      wx.setNavigationBarTitle({
        title: title
      })

      // 监听URL变化以检测授权回调
      this.startUrlMonitoring()

      logger.info('WebView初始化完成', { url: url.substring(0, 50) + '...', title, authType })
    } else {
      logger.error('WebView缺少URL参数')
      wx.showModal({
        title: '参数错误',
        content: '缺少必要的URL参数',
        showCancel: false,
        success: () => {
          wx.navigateBack()
        }
      })
    }
  },

  onUnload() {
    // 清理定时器
    if (this.urlMonitorTimer) {
      clearInterval(this.urlMonitorTimer)
    }
  },

  // 开始URL监控
  startUrlMonitoring() {
    // 定期检查URL变化以捕获授权回调
    this.urlMonitorTimer = setInterval(() => {
      // 这里可以通过webview的消息机制获取当前URL
      // 由于小程序限制，主要依赖onMessage事件
    }, 1000)
  },

  // WebView消息处理
  onMessage(e) {
    logger.info('WebView收到消息', e.detail.data)

    const messages = e.detail.data
    if (!Array.isArray(messages) || messages.length === 0) return

    const data = messages[messages.length - 1] // 取最新消息

    if (data && data.type === 'auth_callback') {
      // 处理授权回调
      this.handleAuthCallback(data.code, data.state, data.error)
    } else if (data && data.type === 'url_change') {
      // 处理URL变化
      this.handleUrlChange(data.url)
    } else if (data && data.type === 'page_loaded') {
      // 页面加载完成
      this.setData({ loading: false })
    }
  },

  // 处理URL变化
  handleUrlChange(url) {
    logger.info('WebView URL变化', { url: url.substring(0, 100) + '...' })

    // 检查是否是授权回调URL
    if (this.isAuthCallbackUrl(url)) {
      const params = this.parseUrlParams(url)
      this.handleAuthCallback(params.code, params.state, params.error)
    }
  },

  // 检查是否是授权回调URL
  isAuthCallbackUrl(url) {
    const callbackPatterns = [
      /redirect_uri/,
      /code=/,
      /state=/,
      /oauth/i,
      /callback/i
    ]

    return callbackPatterns.some(pattern => pattern.test(url))
  },

  // 解析URL参数
  parseUrlParams(url) {
    const params = {}
    try {
      const urlObj = new URL(url)
      urlObj.searchParams.forEach((value, key) => {
        params[key] = value
      })
    } catch (error) {
      logger.warn('URL解析失败', { url, error: error.message })

      // 备用解析方法
      const queryString = url.split('?')[1] || url.split('#')[1]
      if (queryString) {
        queryString.split('&').forEach(param => {
          const [key, value] = param.split('=')
          if (key && value) {
            params[decodeURIComponent(key)] = decodeURIComponent(value)
          }
        })
      }
    }

    return params
  },

  // 处理授权回调
  handleAuthCallback(code, state, error) {
    logger.info('处理授权回调', {
      hasCode: !!code,
      hasState: !!state,
      hasError: !!error,
      authType: this.data.authType
    })

    if (error) {
      logger.error('授权回调包含错误', { error })
      this.showAuthError('授权被拒绝或出现错误: ' + error)
      return
    }

    if (!code) {
      logger.error('授权回调缺少code参数')
      this.showAuthError('未获取到授权码，请重试')
      return
    }

    // 显示处理中状态
    wx.showLoading({
      title: '处理授权中...',
      mask: true
    })

    // 返回到上一页面并传递授权结果
    setTimeout(() => {
      wx.hideLoading()
      wx.navigateBack({
        success: () => {
          // 通过事件通知上一页面
          const pages = getCurrentPages()
          const prevPage = pages[pages.length - 1]

          if (prevPage && prevPage.handleAuthCallback) {
            prevPage.handleAuthCallback(code, state)
          } else {
            logger.warn('上一页面不支持授权回调处理')
          }
        },
        fail: (error) => {
          logger.error('返回上一页面失败', error)
          // 如果无法返回，尝试跳转到登录页
          wx.reLaunch({
            url: '/pages/login/login?code=' + encodeURIComponent(code) + '&state=' + encodeURIComponent(state || '')
          })
        }
      })
    }, 500)
  },

  // 显示授权错误
  showAuthError(message) {
    wx.showModal({
      title: '授权失败',
      content: message,
      confirmText: '重试',
      cancelText: '返回',
      success: (res) => {
        if (res.confirm) {
          // 重新加载页面
          this.reloadWebView()
        } else {
          wx.navigateBack()
        }
      }
    })
  },

  // WebView加载完成
  onWebViewLoad() {
    logger.info('WebView加载完成')
    this.setData({
      loading: false,
      error: false
    })
  },

  // WebView加载失败
  onWebViewError(e) {
    logger.error('WebView加载失败', e)

    this.setData({
      loading: false,
      error: true
    })

    wx.showModal({
      title: '加载失败',
      content: '页面加载失败，请检查网络连接后重试。如果问题持续存在，可能是网络限制导致。',
      confirmText: '重试',
      cancelText: '返回',
      success: (res) => {
        if (res.confirm) {
          this.reloadWebView()
        } else {
          wx.navigateBack()
        }
      }
    })
  },

  // 重新加载WebView
  reloadWebView() {
    this.setData({
      loading: true,
      error: false,
      url: this.data.url + (this.data.url.includes('?') ? '&' : '?') + 't=' + Date.now()
    })
  },

  // 手动刷新
  onRefresh() {
    this.reloadWebView()
  },

  // 返回上一页
  onGoBack() {
    wx.navigateBack({
      fail: () => {
        // 如果无法返回，跳转到首页
        wx.reLaunch({
          url: '/pages/index/index'
        })
      }
    })
  }
})