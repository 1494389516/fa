// utils/eventBus.js - 全局事件总线（简化版本）
class EventBus {
  constructor() {
    this.events = {}
  }

  // 订阅事件
  on(eventName, callback) {
    if (!this.events[eventName]) {
      this.events[eventName] = []
    }
    this.events[eventName].push(callback)
  }

  // 取消订阅
  off(eventName, callback) {
    if (!this.events[eventName]) return
    
    if (callback) {
      this.events[eventName] = this.events[eventName].filter(cb => cb !== callback)
    } else {
      delete this.events[eventName]
    }
  }

  // 触发事件
  emit(eventName, data) {
    if (!this.events[eventName]) return
    
    this.events[eventName].forEach(callback => {
      try {
        callback(data)
      } catch (error) {
        console.error(`事件处理错误: ${eventName}`, error)
      }
    })
  }

  // 清除所有事件
  clear() {
    this.events = {}
  }
}

const eventBus = new EventBus()
export default eventBus