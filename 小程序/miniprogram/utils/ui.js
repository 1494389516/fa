// utils/ui.js - UI工具函数（简化版本）

// 显示Toast提示
export function showToast(options) {
  const {
    title = '',
    icon = 'none',
    duration = 2000,
    mask = false
  } = options

  wx.showToast({
    title,
    icon,
    duration,
    mask
  })
}

// 显示模态对话框
export function showModal(options) {
  const {
    title = '提示',
    content = '',
    showCancel = true,
    cancelText = '取消',
    confirmText = '确定'
  } = options

  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      showCancel,
      cancelText,
      confirmText,
      success: (res) => {
        resolve(res)
      },
      fail: () => {
        resolve({ confirm: false, cancel: true })
      }
    })
  })
}

// 显示加载提示
export function showLoading(title = '加载中...') {
  wx.showLoading({
    title,
    mask: true
  })
}

// 隐藏加载提示
export function hideLoading() {
  wx.hideLoading()
}

// 显示操作菜单
export function showActionSheet(options) {
  const {
    itemList = [],
    itemColor = '#000000'
  } = options

  return new Promise((resolve) => {
    wx.showActionSheet({
      itemList,
      itemColor,
      success: (res) => {
        resolve(res)
      },
      fail: () => {
        resolve({ cancel: true })
      }
    })
  })
}