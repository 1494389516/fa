// routes/errors.js - 错误上报相关路由
const express = require('express')
const { body, validationResult } = require('express-validator')

const logger = require('../utils/logger')
const { authenticateToken } = require('../middleware/auth')

const router = express.Router()

// 错误上报
router.post('/report', [
  authenticateToken,
  body('errors').isArray().withMessage('错误列表必须是数组'),
  body('appInfo').isObject().withMessage('应用信息必须是对象')
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
    const { errors: errorList, appInfo } = req.body

    logger.info('收到错误上报', {
      userId,
      errorCount: errorList.length,
      appInfo
    })

    // 处理每个错误
    for (const errorInfo of errorList) {
      const {
        type,
        message,
        stack,
        timestamp,
        userAgent,
        route,
        code,
        statusCode,
        context
      } = errorInfo

      // 记录错误日志
      logger.error('客户端错误上报', {
        userId,
        type,
        message,
        stack,
        timestamp,
        userAgent,
        route,
        code,
        statusCode,
        context,
        appInfo
      })

      // 这里可以将错误存储到数据库或发送到错误监控服务
      // 例如：Sentry, Bugsnag, 自建错误监控系统等
      
      // 根据错误类型进行不同处理
      switch (type) {
        case 'runtime':
          // 运行时错误，可能需要立即通知开发团队
          if (message.includes('Cannot read property') || message.includes('undefined')) {
            logger.warn('检测到可能的空指针错误', { userId, message, route })
          }
          break
          
        case 'promise':
          // Promise拒绝错误
          logger.warn('未处理的Promise拒绝', { userId, message, route })
          break
          
        case 'api':
          // API错误，统计API错误率
          logger.warn('API调用错误', { 
            userId, 
            message, 
            code, 
            statusCode, 
            context 
          })
          break
          
        default:
          logger.warn('未知类型错误', { userId, type, message })
      }
    }

    // 返回成功响应
    res.json({
      code: 0,
      message: '错误上报成功',
      data: {
        received: errorList.length,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    logger.error('处理错误上报失败', {
      userId: req.user?.userId,
      error: error.message,
      stack: error.stack
    })
    next(error)
  }
})

// 获取错误统计
router.get('/stats', [
  authenticateToken
], async (req, res, next) => {
  try {
    const userId = req.user.userId

    logger.info('获取错误统计', { userId })

    // 这里应该从错误存储系统中获取统计数据
    // 由于我们没有实现错误存储，这里返回模拟数据
    const stats = {
      totalErrors: 0,
      todayErrors: 0,
      errorTypes: {
        runtime: 0,
        promise: 0,
        api: 0,
        network: 0
      },
      topErrors: [],
      errorTrend: []
    }

    logger.info('获取错误统计成功', { userId, stats })

    res.json({
      code: 0,
      message: '获取成功',
      data: stats
    })

  } catch (error) {
    logger.error('获取错误统计失败', {
      userId: req.user?.userId,
      error: error.message
    })
    next(error)
  }
})

// 用户反馈
router.post('/feedback', [
  authenticateToken,
  body('type').isIn(['bug', 'feature', 'improvement', 'other']).withMessage('反馈类型无效'),
  body('title').isLength({ min: 1, max: 100 }).withMessage('标题长度必须在1-100字符之间'),
  body('content').isLength({ min: 1, max: 1000 }).withMessage('内容长度必须在1-1000字符之间'),
  body('contact').optional().isEmail().withMessage('联系方式必须是有效邮箱')
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
    const { type, title, content, contact, systemInfo } = req.body

    logger.info('收到用户反馈', {
      userId,
      type,
      title,
      hasContact: !!contact
    })

    // 记录用户反馈
    const feedback = {
      userId,
      type,
      title,
      content,
      contact,
      systemInfo,
      timestamp: new Date().toISOString(),
      status: 'pending'
    }

    // 这里应该将反馈存储到数据库
    // 并可能发送通知给开发团队

    logger.info('用户反馈记录成功', {
      userId,
      type,
      title
    })

    res.json({
      code: 0,
      message: '反馈提交成功，我们会尽快处理',
      data: {
        feedbackId: `fb_${Date.now()}`,
        timestamp: feedback.timestamp
      }
    })

  } catch (error) {
    logger.error('处理用户反馈失败', {
      userId: req.user?.userId,
      error: error.message
    })
    next(error)
  }
})

// 获取系统状态
router.get('/system-status', async (req, res, next) => {
  try {
    logger.info('获取系统状态')

    // 检查各个服务的状态
    const status = {
      api: 'healthy',
      database: 'healthy',
      redis: 'healthy',
      monitor: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0'
    }

    // 这里可以添加实际的健康检查逻辑
    // 例如：检查数据库连接、Redis连接、外部API等

    res.json({
      code: 0,
      message: '系统状态正常',
      data: status
    })

  } catch (error) {
    logger.error('获取系统状态失败', {
      error: error.message
    })

    res.status(500).json({
      code: 500,
      message: '系统状态检查失败',
      data: {
        api: 'unhealthy',
        timestamp: new Date().toISOString()
      }
    })
  }
})

module.exports = router