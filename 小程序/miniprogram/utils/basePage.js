// utils/basePage.js - 页面基类
import logger from './logger.js'
import eventBus from './eventBus.js'
import authService from './auth.js'
import { PAGE_PATHS } from './constants.js'

/**
 * 页面基类，提供通用的页面功能
 */
export default class BasePage {
  constructor() {
    this.eventUnsubscribers = []
    this.isDestroyed = false
  }

  // 页面生命周期 - 加载
  onLoad(options = {}) {
    logger.logPageView(this.route || 'unknown', options)
    
    // 订阅全局事件
    this.subscribeGlobalEvents()
    
    // 检查登录状态
    this.checkAuthStatus()
  }

  // 页面生命周期 - 显示
  onShow() {
    logger.debug(`页面显示: ${this.route || 'unknown'}`)
  }

  // 页面生命周期 - 隐藏
  onHide() {
    logger.debug(`页面隐藏: ${this.route || 'unknown'}`)
  }

  // 页面生命周期 - 卸载
  onUnload() {
    logger.debug(`页面卸载: ${this.route || 'unknown'}`)
    
    this.isDestroyed = true
    
    // 取消所有事件订阅
    this.unsubscribeAllEvents()
  }

  // 订阅全局事件
  subscribeGlobalEvents() {
    // 网络恢复事件
    const networkRestoreUnsub = eventBus.on('networkRestore', () => {
      this.onNetworkRestore && this.onNetworkRestore()
    })
    
    // 应用恢复事件
    const appRestoreUnsub = eventBus.on('appRestore', () => {
      this.onAppRestore && this.onAppRestore()
    })
    
    // 用户登录状态变化
    const authChangeUnsub = eventBus.on('authChange', (data) => {
      this.onAuthChange && this.onAuthChange(data)
    })
    
    this.eventUnsubscribers.push(
      networkRestoreUnsub,
      appRestoreUnsub,
      authChangeUnsub
    )
  }

  // 取消所有事件订阅
  unsubscribeAllEvents() {
    this.eventUnsubscribers.forEach(unsubscribe => {
      try {
        unsubscribe()
      } catch (error) {
        logger.warn('取消事件订阅失败', error)
      }
    })
    this.eventUnsubscribers = []
  }

  // 检查登录状态
  checkAuthStatus() {
    if (!authService.checkLoginStatus()) {
      this.onUnauthorized && this.onUnauthorized()
    }
  }

  // 显示加载提示
  showLoading(title = '加载中...') {
    if (this.isDestroyed) return
    
    wx.showLoading({
      title,
      mask: true
    })
  }

  // 隐藏加载提示
  hideLoading() {
    if (this.isDestroyed) return
    
    wx.hideLoading()
  }

  // 显示成功提示
  showSuccess(title, duration = 1500) {
    if (this.isDestroyed) return
    
    wx.showToast({
      title,
      icon: 'success',
      duration
    })
  }

  // 显示错误提示
  showError(title, duration = 2000) {
    if (this.isDestroyed) return
    
    wx.showToast({
      title,
      icon: 'none',
      duration
    })
  }

  // 显示确认对话框
  showConfirm(options = {}) {
    if (this.isDestroyed) return Promise.reject('页面已销毁')
    
    const {
      title = '提示',
      content = '',
      confirmText = '确定',
      cancelText = '取消',
      showCancel = true
    } = options

    return new Promise((resolve) => {
      wx.showModal({
        title,
        content,
        confirmText,
        cancelText,
        showCancel,
        success: (res) => {
          resolve(res.confirm)
        },
        fail: () => {
          resolve(false)
        }
      })
    })
  }

  // 安全的setData
  safeSetData(data, callback) {
    if (this.isDestroyed) {
      logger.warn('页面已销毁，跳过setData操作')
      return
    }
    
    try {
      this.setData(data, callback)
    } catch (error) {
      logger.error('setData执行失败', { error, data })
    }
  }

  // 防抖setData
  debounceSetData(data, delay = 100) {
    clearTimeout(this._setDataTimer)
    this._setDataTimer = setTimeout(() => {
      this.safeSetData(data)
    }, delay)
  }

  // 跳转到登录页
  navigateToAuth() {
    wx.reLaunch({
      url: PAGE_PATHS.AUTH
    })
  }

  // 返回上一页
  navigateBack(delta = 1) {
    const pages = getCurrentPages()
    if (pages.length > delta) {
      wx.navigateBack({ delta })
    } else {
      wx.reLaunch({
        url: PAGE_PATHS.INDEX
      })
    }
  }

  // 处理网络恢复
  onNetworkRestore() {
    logger.info('网络已恢复，刷新页面数据')
    this.refreshData && this.refreshData()
  }

  // 处理应用恢复
  onAppRestore() {
    logger.info('应用从后台恢复，刷新页面数据')
    this.refreshData && this.refreshData()
  }

  // 处理认证状态变化
  onAuthChange(data) {
    logger.info('用户认证状态变化', data)
    
    if (!data.isLoggedIn) {
      this.onUnauthorized && this.onUnauthorized()
    }
  }

  // 处理未授权状态
  onUnauthorized() {
    logger.warn('用户未授权，跳转到登录页')
    this.navigateToAuth()
  }

  // 处理全局事件（子类可重写）
  onGlobalEvent(eventName, data) {
    switch (eventName) {
      case 'networkRestore':
        this.onNetworkRestore()
        break
      case 'appRestore':
        this.onAppRestore()
        break
      case 'authChange':
        this.onAuthChange(data)
        break
      default:
        logger.debug(`未处理的全局事件: ${eventName}`, data)
    }
  }

  // 记录用户行为
  logUserAction(action, data = {}) {
    logger.logUserAction(action, {
      page: this.route || 'unknown',
      ...data
    })
  }

  // 错误处理
  handleError(error, context = '') {
    logger.error(`页面错误${context ? ` - ${context}` : ''}`, {
      error,
      page: this.route || 'unknown'
    })
    
    this.showError(error.message || '操作失败，请重试')
  }
}

/**
 * 创建页面的工厂函数
 * @param {Object} pageConfig - 页面配置
 * @returns {Object} 页面对象
 */
export function createPage(pageConfig = {}) {
  const basePage = new BasePage()
  
  // 合并基类方法和页面配置
  const page = {
    ...basePage,
    ...pageConfig,
    
    // 重写生命周期方法，确保基类方法被调用
    onLoad(options) {
      basePage.onLoad.call(this, options)
      pageConfig.onLoad && pageConfig.onLoad.call(this, options)
    },
    
    onShow() {
      basePage.onShow.call(this)
      pageConfig.onShow && pageConfig.onShow.call(this)
    },
    
    onHide() {
      basePage.onHide.call(this)
      pageConfig.onHide && pageConfig.onHide.call(this)
    },
    
    onUnload() {
      basePage.onUnload.call(this)
      pageConfig.onUnload && pageConfig.onUnload.call(this)
    }
  }
  
  return page
}