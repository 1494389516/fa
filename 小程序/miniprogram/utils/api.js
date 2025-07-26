// utils/api.js - API请求封装（简化版本）
class ApiService {
  constructor() {
    this.baseUrl = 'https://mock-api.com'
  }

  // 模拟 GET 请求
  get(url, params = {}) {
    return new Promise((resolve) => {
      console.log(`模拟 GET 请求: ${url}`, params)
      
      // 模拟延迟
      setTimeout(() => {
        resolve({
          code: 0,
          data: this.getMockData(url),
          message: 'success'
        })
      }, 500)
    })
  }

  // 模拟 POST 请求
  post(url, data = {}) {
    return new Promise((resolve) => {
      console.log(`模拟 POST 请求: ${url}`, data)
      
      setTimeout(() => {
        resolve({
          code: 0,
          data: this.getMockData(url),
          message: 'success'
        })
      }, 500)
    })
  }

  // 获取模拟数据
  getMockData(url) {
    const mockData = {
      '/auth/profile': {
        id: 1,
        nickname: '测试用户',
        avatar: ''
      },
      '/videos/stats': {
        bloggers: 5,
        total: 120,
        unread: 3,
        today: 8
      },
      '/songs/stats': {
        artists: 10,
        total: 200,
        unread: 5,
        today: 12
      },
      '/videos/updates': {
        list: []
      },
      '/songs/updates': {
        list: []
      },
      '/monitor/status': {
        isActive: true,
        lastCheckTime: '2024-01-26 10:30:00'
      },
      '/monitor/toggle': {
        success: true
      },
      '/monitor/check': {
        newVideos: 0,
        newSongs: 0
      }
    }

    return mockData[url] || {}
  }
}

// 创建API实例
const api = new ApiService()

export default api