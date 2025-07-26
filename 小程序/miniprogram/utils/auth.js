// utils/auth.js - 认证工具
import api from './api.js'
import storage from './storage.js'
import logger from './logger.js'
import { STORAGE_KEYS, PAGE_PATHS } from './constants.js'

class AuthService {
  constructor() {
    this.isLoggedIn = false
    this.userInfo = null
    this.douyinToken = null
    this.qqMusicToken = null
  }

  // 检查登录状态
  checkLoginStatus() {
    const token = storage.get(STORAGE_KEYS.WECHAT_TOKEN)
    const userInfo = storage.get(STORAGE_KEYS.USER_INFO)
    const douyinToken = storage.get(STORAGE_KEYS.DOUYIN_TOKEN)
    const qqMusicToken = storage.get(STORAGE_KEYS.QQ_MUSIC_TOKEN)

    if (token && userInfo) {
      this.isLoggedIn = true
      this.userInfo = userInfo
      this.douyinToken = douyinToken
      this.qqMusicToken = qqMusicToken
      
      console.log('用户登录状态检查', {
        hasDouyin: !!douyinToken,
        hasQQMusic: !!qqMusicToken
      })
      
      return true
    }

    console.log('用户未登录')
    return false
  }

  // 微信登录
  async wechatLogin() {
    try {
      // 获取微信登录code
      const loginRes = await this.getWechatLoginCode()
      
      // 获取用户信息
      const userInfo = await this.getUserProfile()
      
      // 调用后端登录接口
      const loginData = {
        code: loginRes.code,
        userInfo: userInfo
      }
      
      const response = await api.wechatLogin(loginData)
      
      if (response.code === 0) {
        // 保存登录信息
        storage.set(STORAGE_KEYS.WECHAT_TOKEN, response.data.token)
        storage.set(STORAGE_KEYS.USER_INFO, response.data.userInfo)
        
        this.isLoggedIn = true
        this.userInfo = response.data.userInfo
        
        logger.info('微信登录成功', { userId: response.data.userInfo.id })
        
        return response.data
      } else {
        throw new Error(response.message)
      }
    } catch (error) {
      console.error('微信登录失败:', error)
      throw error
    }
  }

  // 获取微信登录code
  getWechatLoginCode() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: resolve,
        fail: reject
      })
    })
  }

  // 获取用户信息
  getUserProfile() {
    return new Promise((resolve, reject) => {
      wx.getUserProfile({
        desc: '用于完善用户资料',
        success: (res) => {
          resolve(res.userInfo)
        },
        fail: reject
      })
    })
  }

  // 抖音OAuth登录
  async douyinOAuth() {
    try {
      // 这里需要跳转到抖音授权页面
      // 由于小程序限制，需要通过webview或其他方式实现
      const authUrl = await this.getDouyinAuthUrl()
      
      // 跳转到授权页面
      wx.navigateTo({
        url: `/pages/login/login?authUrl=${encodeURIComponent(authUrl)}`
      })
      
    } catch (error) {
      console.error('抖音授权失败:', error)
      throw error
    }
  }

  // 获取抖音授权URL
  async getDouyinAuthUrl() {
    try {
      const response = await api.get('/auth/douyin-auth-url')
      return response.data.authUrl
    } catch (error) {
      throw error
    }
  }

  // 处理抖音授权回调
  async handleDouyinCallback(code) {
    try {
      const response = await api.douyinOAuth({ code })
      
      if (response.code === 0) {
        // 保存抖音token
        storage.set(STORAGE_KEYS.DOUYIN_TOKEN, response.data.douyinToken)
        this.douyinToken = response.data.douyinToken
        
        logger.info('抖音授权成功')
        
        return response.data
      } else {
        throw new Error(response.message)
      }
    } catch (error) {
      logger.error('抖音授权回调处理失败', error)
      throw error
    }
  }

  // QQ音乐授权
  async qqMusicAuth(authData) {
    try {
      logger.info('开始QQ音乐授权')
      
      const response = await api.qqMusicAuth(authData)
      
      if (response.code === 0) {
        // 保存QQ音乐token
        storage.set(STORAGE_KEYS.QQ_MUSIC_TOKEN, response.data.qqMusicToken)
        this.qqMusicToken = response.data.qqMusicToken
        
        logger.info('QQ音乐授权成功')
        
        return response.data
      } else {
        throw new Error(response.message)
      }
    } catch (error) {
      logger.error('QQ音乐授权失败', error)
      throw error
    }
  }

  // 刷新token
  async refreshToken() {
    try {
      const refreshToken = storage.get(STORAGE_KEYS.REFRESH_TOKEN)
      if (!refreshToken) {
        throw new Error('没有刷新令牌')
      }

      const response = await api.refreshToken({ refreshToken })
      
      if (response.code === 0) {
        storage.set(STORAGE_KEYS.WECHAT_TOKEN, response.data.token)
        storage.set(STORAGE_KEYS.REFRESH_TOKEN, response.data.refreshToken)
        
        logger.info('Token刷新成功')
        
        return response.data
      } else {
        throw new Error(response.message)
      }
    } catch (error) {
      logger.error('刷新token失败', error)
      // 刷新失败，清除登录状态
      this.logout()
      throw error
    }
  }

  // 登出
  async logout() {
    try {
      await api.logout()
      logger.info('用户登出成功')
    } catch (error) {
      logger.error('登出请求失败', error)
    } finally {
      // 清除本地存储
      const app = getApp()
      if (app && app.clearUserInfo) {
        app.clearUserInfo()
      } else {
        // 兜底清理
        storage.remove(STORAGE_KEYS.WECHAT_TOKEN)
        storage.remove(STORAGE_KEYS.REFRESH_TOKEN)
        storage.remove(STORAGE_KEYS.USER_INFO)
        storage.remove(STORAGE_KEYS.DOUYIN_TOKEN)
        storage.remove(STORAGE_KEYS.QQ_MUSIC_TOKEN)
      }
      
      this.isLoggedIn = false
      this.userInfo = null
      this.douyinToken = null
      this.qqMusicToken = null
      
      // 跳转到授权页面
      wx.reLaunch({
        url: PAGE_PATHS.AUTH
      })
    }
  }

  // 检查是否需要权限授权
  checkPermissions() {
    return new Promise((resolve) => {
      // 检查是否已经授权过
      const hasAuthorized = storage.get(STORAGE_KEYS.HAS_AUTHORIZED)
      if (hasAuthorized) {
        logger.info('用户已完成授权')
        resolve(true)
        return
      }

      // 检查各项权限状态
      wx.getSetting({
        success: (res) => {
          const authSetting = res.authSetting || {}
          
          // 检查用户信息权限（新版本可能不需要）
          const hasUserInfoAuth = authSetting['scope.userInfo'] !== false
          
          // 检查通知权限
          const hasNotificationAuth = authSetting['scope.subscribeMessage'] !== false
          
          logger.info('权限检查结果', {
            hasUserInfoAuth,
            hasNotificationAuth,
            authSetting
          })
          
          // 只要没有明确拒绝就认为可以授权
          resolve(hasUserInfoAuth && hasNotificationAuth)
        },
        fail: (error) => {
          logger.error('获取权限设置失败', error)
          resolve(false)
        }
      })
    })
  }

  // 请求用户授权
  requestPermissions() {
    return new Promise((resolve, reject) => {
      wx.authorize({
        scope: 'scope.userInfo',
        success: () => {
          storage.set(STORAGE_KEYS.HAS_AUTHORIZED, true)
          logger.info('用户授权成功')
          resolve(true)
        },
        fail: (error) => {
          logger.warn('用户授权失败', error)
          reject(error)
        }
      })
    })
  }

  // 检查是否绑定抖音
  hasDouyinAuth() {
    return !!this.douyinToken
  }

  // 检查是否绑定QQ音乐
  hasQQMusicAuth() {
    return !!this.qqMusicToken
  }

  // 获取用户平台绑定状态
  getPlatformStatus() {
    return {
      douyin: this.hasDouyinAuth(),
      qqMusic: this.hasQQMusicAuth()
    }
  }
}

// 创建认证服务实例
const authService = new AuthService()

export default authService