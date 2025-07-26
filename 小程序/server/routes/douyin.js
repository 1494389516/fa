const express = require('express')
const { body, validationResult } = require('express-validator')
const router = express.Router()

const User = require('../models/User')
const douyinService = require('../services/douyinService')
const logger = require('../utils/logger')
const { authenticateToken } = require('../middleware/auth')

// 获取抖音授权URL
router.get('/auth-url', [
  authenticateToken
], async (req, res, next) => {
  try {
    const userId = req.user.userId

    logger.info('获取抖音授权URL', { userId })

    // 生成授权URL和state
    const authData = await douyinService.generateAuthUrl(userId)

    logger.info('生成抖音授权URL成功', { userId, state: authData.state })

    res.json({
      code: 0,
      message: '获取成功',
      data: authData
    })

  } catch (error) {
    logger.error('获取抖音授权URL失败', { 
      userId: req.user?.userId,
      error: error.message
    })
    next(error)
  }
})

// 处理抖音授权回调
router.post('/callback', [
  authenticateToken,
  body('code').notEmpty().withMessage('授权码不能为空'),
  body('state').notEmpty().withMessage('状态参数不能为空')
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

    const userId = req.user.userId
    const { code, state } = req.body

    logger.info('处理抖音授权回调', { userId, code, state })

    // 验证state并交换访问令牌
    const tokenData = await douyinService.exchangeAccessToken(userId, code, state)

    // 获取用户信息
    const userInfo = await douyinService.getUserInfo(tokenData.access_token, tokenData.open_id)

    // 更新用户的抖音授权信息
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在'
      })
    }

    await user.updateDouyinToken(
      tokenData.access_token,
      tokenData.refresh_token,
      tokenData.expires_in,
      tokenData.open_id,
      userInfo
    )

    logger.info('抖音授权成功', { 
      userId, 
      openId: tokenData.open_id,
      nickname: userInfo.nickname
    })

    res.json({
      code: 0,
      message: '授权成功',
      data: {
        openId: tokenData.open_id,
        nickname: userInfo.nickname,
        avatar: userInfo.avatar,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000)
      }
    })

  } catch (error) {
    logger.error('处理抖音授权回调失败', { 
      userId: req.user?.userId,
      error: error.message
    })

    let errorMessage = '授权失败'
    let errorCode = 500

    if (error.message.includes('state')) {
      errorMessage = '授权状态验证失败，请重新授权'
      errorCode = 400
    } else if (error.message.includes('code')) {
      errorMessage = '授权码无效或已过期'
      errorCode = 400
    } else if (error.message.includes('网络')) {
      errorMessage = '网络连接失败，请稍后重试'
      errorCode = 502
    }

    res.status(errorCode).json({
      code: errorCode,
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// 获取抖音连接状态
router.get('/status', [
  authenticateToken
], async (req, res, next) => {
  try {
    const userId = req.user.userId

    logger.info('获取抖音连接状态', { userId })

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在'
      })
    }

    const connected = user.isDouyinBound && !user.isDouyinTokenExpired
    const userInfo = connected ? {
      openId: user.douyinOpenId,
      nickname: user.douyinNickname,
      avatar: user.douyinAvatar
    } : null

    logger.info('获取抖音连接状态成功', { userId, connected })

    res.json({
      code: 0,
      message: '获取成功',
      data: {
        connected,
        userInfo
      }
    })

  } catch (error) {
    logger.error('获取抖音连接状态失败', { 
      userId: req.user?.userId,
      error: error.message
    })
    next(error)
  }
})

// 断开抖音连接
router.post('/disconnect', [
  authenticateToken
], async (req, res, next) => {
  try {
    const userId = req.user.userId

    logger.info('断开抖音连接', { userId })

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在'
      })
    }

    // 清除抖音授权信息
    await user.clearDouyinAuth()

    logger.info('断开抖音连接成功', { userId })

    res.json({
      code: 0,
      message: '已断开连接',
      data: {}
    })

  } catch (error) {
    logger.error('断开抖音连接失败', { 
      userId: req.user?.userId,
      error: error.message
    })
    next(error)
  }
})

// 验证抖音授权状态
router.get('/auth/verify', [
  authenticateToken
], async (req, res, next) => {
  try {
    const userId = req.user.userId

    logger.info('验证抖音授权状态', { userId })

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在'
      })
    }

    if (!user.douyinAccessToken) {
      return res.status(401).json({
        code: 401,
        message: '未授权抖音账号'
      })
    }

    // 检查token是否过期
    if (user.isDouyinTokenExpired) {
      // 尝试刷新token
      if (user.douyinRefreshToken) {
        try {
          const newTokenData = await douyinService.refreshAccessToken(user.douyinRefreshToken)
          await user.updateDouyinToken(
            newTokenData.access_token,
            newTokenData.refresh_token,
            newTokenData.expires_in,
            user.douyinOpenId
          )
          
          logger.info('抖音token刷新成功', { userId })
        } catch (refreshError) {
          logger.error('抖音token刷新失败', { userId, error: refreshError.message })
          return res.status(401).json({
            code: 401,
            message: '授权已过期，请重新授权'
          })
        }
      } else {
        return res.status(401).json({
          code: 401,
          message: '授权已过期，请重新授权'
        })
      }
    }

    // 验证token有效性
    const isValid = await douyinService.validateAccessToken(user.douyinAccessToken, user.douyinOpenId)
    
    if (!isValid.valid) {
      return res.status(401).json({
        code: 401,
        message: '授权无效，请重新授权'
      })
    }

    logger.info('抖音授权验证成功', { userId })

    res.json({
      code: 0,
      message: '授权有效',
      data: {
        openId: user.douyinOpenId,
        nickname: user.douyinNickname,
        avatar: user.douyinAvatar,
        expiresAt: user.douyinTokenExpiresAt
      }
    })

  } catch (error) {
    logger.error('验证抖音授权状态失败', { 
      userId: req.user?.userId,
      error: error.message
    })
    next(error)
  }
})

module.exports = router