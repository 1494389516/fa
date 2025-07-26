// middleware/auth.js - JWT认证中间件
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const logger = require('../utils/logger')

// JWT认证中间件
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        code: 401,
        message: '访问令牌缺失'
      })
    }

    // 验证token
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    
    // 查找用户
    const user = await User.findById(decoded.userId)
    if (!user || !user.isActive) {
      return res.status(401).json({
        code: 401,
        message: '用户不存在或已被禁用'
      })
    }

    // 更新用户最后活跃时间
    await user.updateLastActive()

    // 将用户信息添加到请求对象
    req.user = {
      userId: user._id,
      openId: user.wechatOpenId,
      nickname: user.nickname,
      isDouyinBound: user.isDouyinBound
    }

    next()

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        code: 401,
        message: '无效的访问令牌'
      })
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        code: 401,
        message: '访问令牌已过期'
      })
    }

    logger.error('JWT认证失败:', error)
    return res.status(500).json({
      code: 500,
      message: '认证服务异常'
    })
  }
}

// 可选认证中间件（不强制要求登录）
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const user = await User.findById(decoded.userId)
      
      if (user && user.isActive) {
        req.user = {
          userId: user._id,
          openId: user.wechatOpenId,
          nickname: user.nickname,
          isDouyinBound: user.isDouyinBound
        }
        await user.updateLastActive()
      }
    }

    next()

  } catch (error) {
    // 可选认证失败不阻止请求继续
    logger.warn('可选认证失败:', error.message)
    next()
  }
}

// 检查抖音授权中间件
const requireDouyinAuth = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        code: 401,
        message: '请先登录'
      })
    }

    const user = await User.findById(req.user.userId)
    if (!user.isDouyinBound || user.isTokenExpired) {
      return res.status(403).json({
        code: 403,
        message: '请先完成抖音授权'
      })
    }

    next()

  } catch (error) {
    logger.error('抖音授权检查失败:', error)
    return res.status(500).json({
      code: 500,
      message: '授权检查异常'
    })
  }
}

// 管理员权限中间件
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        code: 401,
        message: '请先登录'
      })
    }

    const user = await User.findById(req.user.userId)
    if (!user.isAdmin) {
      return res.status(403).json({
        code: 403,
        message: '需要管理员权限'
      })
    }

    next()

  } catch (error) {
    logger.error('管理员权限检查失败:', error)
    return res.status(500).json({
      code: 500,
      message: '权限检查异常'
    })
  }
}

// 请求限流中间件（基于用户）
const userRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map()

  return (req, res, next) => {
    const userId = req.user?.userId || req.ip
    const now = Date.now()
    const windowStart = now - windowMs

    // 清理过期记录
    if (requests.has(userId)) {
      const userRequests = requests.get(userId).filter(time => time > windowStart)
      requests.set(userId, userRequests)
    } else {
      requests.set(userId, [])
    }

    const userRequests = requests.get(userId)

    if (userRequests.length >= maxRequests) {
      return res.status(429).json({
        code: 429,
        message: '请求过于频繁，请稍后再试'
      })
    }

    userRequests.push(now)
    next()
  }
}

module.exports = {
  authenticateToken,
  optionalAuth,
  requireDouyinAuth,
  requireAdmin,
  userRateLimit
}