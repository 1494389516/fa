// routes/auth.js - 认证相关路由
const express = require('express')
const jwt = require('jsonwebtoken')
const axios = require('axios')
const { body, validationResult } = require('express-validator')

const User = require('../models/User')
const logger = require('../utils/logger')
const { redis } = require('../config/redis')

const router = express.Router()

// 微信登录
router.post('/wechat-login', [
  body('code').notEmpty().withMessage('微信登录code不能为空'),
  body('userInfo').isObject().withMessage('用户信息格式错误'),
  body('userInfo.nickName').notEmpty().withMessage('用户昵称不能为空'),
  body('userInfo.avatarUrl').optional().isURL().withMessage('头像URL格式错误')
], async (req, res, next) => {
  try {
    // 验证请求参数
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        code: 400,
        message: '请求参数错误',
        errors: errors.array()
      })
    }

    const { code, userInfo } = req.body

    logger.info('开始微信登录', { code: code.substring(0, 10) + '...' })

    // 调用微信API获取session_key和openid
    const wechatResponse = await axios.get('https://api.weixin.qq.com/sns/jscode2session', {
      params: {
        appid: process.env.WECHAT_APP_ID,
        secret: process.env.WECHAT_APP_SECRET,
        js_code: code,
        grant_type: 'authorization_code'
      },
      timeout: 10000 // 10秒超时
    })

    if (wechatResponse.data.errcode) {
      logger.error('微信API调用失败', {
        errcode: wechatResponse.data.errcode,
        errmsg: wechatResponse.data.errmsg
      })
      
      let errorMessage = '微信登录失败'
      switch (wechatResponse.data.errcode) {
        case 40013:
          errorMessage = '无效的登录凭证，请重新登录'
          break
        case 40029:
          errorMessage = '登录凭证已过期，请重新登录'
          break
        case 45011:
          errorMessage = '登录频率限制，请稍后再试'
          break
        default:
          errorMessage = wechatResponse.data.errmsg || '微信登录失败'
      }
      
      return res.status(400).json({
        code: 400,
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? wechatResponse.data : undefined
      })
    }

    const { openid, unionid, session_key } = wechatResponse.data

    // 查找或创建用户
    let user = await User.findByWechatOpenId(openid)
    const isNewUser = !user
    
    if (user) {
      // 更新现有用户信息
      const updateData = {
        nickname: userInfo.nickName,
        lastLoginTime: new Date()
      }
      
      // 只在有新头像时更新
      if (userInfo.avatarUrl && userInfo.avatarUrl !== user.avatar) {
        updateData.avatar = userInfo.avatarUrl
      }
      
      // 只在有unionid且不同时更新
      if (unionid && unionid !== user.wechatUnionId) {
        updateData.wechatUnionId = unionid
      }
      
      Object.assign(user, updateData)
      await user.save()
      
      logger.info('用户信息已更新', { 
        userId: user._id, 
        nickname: user.nickname,
        hasUnionId: !!unionid
      })
    } else {
      // 创建新用户
      user = new User({
        wechatOpenId: openid,
        wechatUnionId: unionid,
        nickname: userInfo.nickName,
        avatar: userInfo.avatarUrl || '',
        lastLoginTime: new Date(),
        settings: {
          monitorInterval: 5, // 默认5分钟
          pushEnabled: true,
          pushTime: {
            start: '08:00',
            end: '22:00'
          }
        }
      })
      await user.save()
      
      logger.info('新用户已创建', { 
        userId: user._id, 
        nickname: user.nickname,
        openId: openid.substring(0, 10) + '...'
      })
    }

    // 生成JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        openId: openid
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    )

    // 生成refresh token
    const refreshToken = jwt.sign(
      { 
        userId: user._id,
        type: 'refresh'
      },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRE || '30d' }
    )

    // 缓存session_key（用于数据解密）
    await redis.set(`session_key:${user._id}`, session_key, 7 * 24 * 60 * 60) // 7天

    // 更新用户最后活跃时间
    await user.updateLastActive()

    logger.info(`用户登录成功: ${user.nickname} (${user._id})`)

    res.json({
      code: 0,
      message: isNewUser ? '注册成功' : '登录成功',
      data: {
        token,
        refreshToken,
        userInfo: {
          id: user._id,
          nickname: user.nickname,
          avatar: user.avatar,
          isDouyinBound: user.isDouyinBound,
          isQQMusicBound: user.isQQMusicBound || false,
          settings: user.settings,
          isNewUser
        }
      }
    })

  } catch (error) {
    logger.error('微信登录处理失败:', error)
    next(error)
  }
})

// 抖音OAuth授权
router.post('/douyin-oauth', [
  body('code').notEmpty().withMessage('抖音授权code不能为空'),
  body('state').optional().isString().withMessage('state参数格式错误')
], async (req, res, next) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        code: 400,
        message: '请求参数错误',
        errors: errors.array()
      })
    }

    const { code, state } = req.body
    const userId = req.user.userId

    logger.info('开始处理抖音OAuth授权', { 
      userId, 
      code: code.substring(0, 10) + '...',
      state
    })

    // 验证state参数（如果提供）
    if (state) {
      const cachedState = await redis.get(`douyin_state:${state}`)
      if (!cachedState) {
        logger.warn('无效的state参数', { state, userId })
        return res.status(400).json({
          code: 400,
          message: '授权状态验证失败，请重新授权'
        })
      }
      // 清除已使用的state
      await redis.del(`douyin_state:${state}`)
    }

    // 获取抖音access_token
    const douyinService = require('../services/douyinService')
    const tokenData = await douyinService.getAccessToken(code)

    const {
      access_token,
      refresh_token,
      expires_in,
      open_id,
      scope
    } = tokenData

    // 获取抖音用户信息
    const userInfo = await douyinService.getUserInfo(access_token, open_id)

    // 更新用户的抖音信息
    const user = await User.findById(userId)
    if (!user) {
      logger.error('用户不存在', { userId })
      return res.status(404).json({
        code: 404,
        message: '用户不存在'
      })
    }

    // 更新用户抖音绑定信息
    await user.updateDouyinToken(access_token, refresh_token, expires_in)
    user.douyinUserId = open_id
    user.douyinUserInfo = {
      nickname: userInfo.nickname,
      avatar: userInfo.avatar,
      uniqueId: userInfo.unique_id,
      signature: userInfo.signature,
      followerCount: userInfo.follower_count,
      followingCount: userInfo.following_count,
      totalFavorited: userInfo.total_favorited
    }
    await user.save()

    // 缓存抖音token信息
    const tokenCacheData = {
      access_token,
      refresh_token,
      expires_in,
      open_id,
      scope,
      user_info: userInfo,
      created_at: Date.now(),
      expires_at: Date.now() + (expires_in * 1000)
    }
    
    await redis.set(`douyin_token:${userId}`, tokenCacheData, expires_in)

    // 记录授权成功日志
    logger.info('用户抖音授权成功', { 
      userId: user._id,
      nickname: user.nickname,
      douyinNickname: userInfo.nickname,
      openId: open_id,
      scope,
      expiresIn: expires_in
    })

    res.json({
      code: 0,
      message: '抖音授权成功',
      data: {
        douyinToken: {
          access_token: access_token.substring(0, 20) + '...', // 只返回部分token用于前端显示
          expires_in,
          open_id,
          scope
        },
        userInfo: {
          nickname: userInfo.nickname,
          avatar: userInfo.avatar,
          uniqueId: userInfo.unique_id,
          signature: userInfo.signature,
          followerCount: userInfo.follower_count,
          followingCount: userInfo.following_count,
          totalFavorited: userInfo.total_favorited
        },
        bindTime: new Date().toISOString()
      }
    })

  } catch (error) {
    logger.error('抖音授权处理失败', { 
      userId: req.user?.userId,
      error: error.message,
      stack: error.stack
    })

    // 根据错误类型返回不同的错误信息
    let errorMessage = '抖音授权失败'
    let errorCode = 500

    if (error.message.includes('访问令牌')) {
      errorMessage = '授权码无效或已过期，请重新授权'
      errorCode = 400
    } else if (error.message.includes('权限不足')) {
      errorMessage = '权限不足，请确认已授权必要的权限'
      errorCode = 403
    } else if (error.message.includes('网络')) {
      errorMessage = '网络连接失败，请检查网络后重试'
      errorCode = 502
    } else if (error.message.includes('频繁')) {
      errorMessage = '请求过于频繁，请稍后再试'
      errorCode = 429
    }

    res.status(errorCode).json({
      code: errorCode,
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// 刷新访问令牌
router.post('/refresh-token', [
  body('refreshToken').notEmpty().withMessage('刷新令牌不能为空')
], async (req, res, next) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        code: 400,
        message: '请求参数错误',
        errors: errors.array()
      })
    }

    const { refreshToken } = req.body

    // 验证refresh token
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET)
    
    if (decoded.type !== 'refresh') {
      return res.status(400).json({
        code: 400,
        message: '无效的刷新令牌'
      })
    }

    // 查找用户
    const user = await User.findById(decoded.userId)
    if (!user || !user.isActive) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在或已被禁用'
      })
    }

    // 生成新的access token
    const newToken = jwt.sign(
      { 
        userId: user._id,
        openId: user.wechatOpenId
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    )

    // 生成新的refresh token
    const newRefreshToken = jwt.sign(
      { 
        userId: user._id,
        type: 'refresh'
      },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRE || '30d' }
    )

    // 更新用户最后活跃时间
    await user.updateLastActive()

    logger.info(`令牌刷新成功: ${user.nickname} (${user._id})`)

    res.json({
      code: 0,
      message: '令牌刷新成功',
      data: {
        token: newToken,
        refreshToken: newRefreshToken
      }
    })

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        code: 401,
        message: '刷新令牌无效或已过期'
      })
    }
    
    logger.error('令牌刷新失败:', error)
    next(error)
  }
})

// 获取抖音授权URL
router.get('/douyin-auth-url', async (req, res, next) => {
  try {
    const state = Math.random().toString(36).substring(2, 15)
    const scope = process.env.DOUYIN_SCOPE || 'user_info,following.list,video.list'
    
    const authUrl = `https://open.douyin.com/platform/oauth/connect/?client_key=${process.env.DOUYIN_CLIENT_ID}&response_type=code&scope=${scope}&redirect_uri=${encodeURIComponent(process.env.DOUYIN_REDIRECT_URI)}&state=${state}`

    // 缓存state用于验证
    await redis.set(`douyin_state:${state}`, req.user?.userId || 'anonymous', 10 * 60) // 10分钟

    res.json({
      code: 0,
      message: '获取授权URL成功',
      data: {
        authUrl,
        state
      }
    })

  } catch (error) {
    logger.error('获取抖音授权URL失败:', error)
    next(error)
  }
})

// 用户登出
router.delete('/logout', async (req, res, next) => {
  try {
    const userId = req.user?.userId

    if (userId) {
      // 清除缓存的token信息
      await redis.del(`session_key:${userId}`)
      await redis.del(`douyin_token:${userId}`)
      
      logger.info(`用户登出: ${userId}`)
    }

    res.json({
      code: 0,
      message: '登出成功'
    })

  } catch (error) {
    logger.error('用户登出失败:', error)
    next(error)
  }
})

module.exports = router