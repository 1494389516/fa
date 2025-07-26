// utils/errorHandler.js - 全局错误处理工具（简化版本）
class ErrorHandler {
  constructor() {
    this.bindGlobalHandlers()
  }

  // 绑定全局错误处理器
  bindGlobalHandlers() {
    // 监听小程序错误
    wx.onError((error) => {
      this.handleGlobalError('runtime', error)
    })

    // 监听未处理的Promise拒绝
    wx.onUnhandledRejection((res) => {
      this.handleGlobalError('promise', res.reason)
    })
  }

  // 处理全局错误
  handleGlobalError(type, error) {
    console.error(`全局错误[${type}]:`, error)
    
    // 简单的错误提示
    wx.showToast({
      title: '系统错误',
      icon: 'none',
      duration: 2000
    })
  }

  // 处理API错误
  handleApiError(error) {
    console.error('API错误:', error)
    
    wx.showToast({
      title: error.message || '请求失败',
      icon: 'none',
      duration: 2000
    })
  }

  // 处理页面错误
  handlePageError(error) {
    console.error('页面错误:', error)
    
    wx.showToast({
      title: '页面加载失败',
      icon: 'none',
      duration: 2000
    })
  }
}

const errorHandler = new ErrorHandler()
export default errorHandler