// utils/storage.js - 本地存储工具（简化版本）
class StorageService {
  constructor() {
    this.prefix = 'douyin_monitor_'
  }

  // 生成带前缀的key
  getKey(key) {
    return this.prefix + key
  }

  // 设置数据
  set(key, value) {
    try {
      wx.setStorageSync(this.getKey(key), value)
      return true
    } catch (error) {
      console.error('存储数据失败:', error)
      return false
    }
  }

  // 获取数据
  get(key, defaultValue = null) {
    try {
      const data = wx.getStorageSync(this.getKey(key))
      return data || defaultValue
    } catch (error) {
      console.error('获取数据失败:', error)
      return defaultValue
    }
  }

  // 删除数据
  remove(key) {
    try {
      wx.removeStorageSync(this.getKey(key))
      return true
    } catch (error) {
      console.error('删除数据失败:', error)
      return false
    }
  }

  // 清空所有数据
  clear() {
    try {
      wx.clearStorageSync()
      return true
    } catch (error) {
      console.error('清空数据失败:', error)
      return false
    }
  }
}

const storage = new StorageService()
export default storage