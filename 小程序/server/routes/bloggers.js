// routes/bloggers.js - 博主管理相关路由
const express = require('express')
const { body, query, validationResult } = require('express-validator')

const User = require('../models/User')
const Blogger = require('../models/Blogger')
const MonitorConfig = require('../models/MonitorConfig')
const douyinService = require('../services/douyinService')
const logger = require('../utils/logger')
const { authenticateToken, requireDouyinAuth } = require('../middleware/auth')

const router = express.Router()

// 获取用户关注的博主列表
router.get('/following', [
  authenticateToken,
  requireDouyinAuth,
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
  query('search').optional().isString().withMessage('搜索关键词格式错误')
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
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const search = req.query.search || ''

    logger.info('获取用户关注的博主列表', { userId, page, limit, search })

    // 获取用户信息
    const user = await User.findById(userId)
    if (!user || !user.douyinAccessToken) {
      return res.status(401).json({
        code: 401,
        message: '请先完成抖音授权'
      })
    }

    // 调用抖音API获取关注列表
    const followingData = await douyinService.getFollowingList(
      user.douyinAccessToken,
      user.douyinUserId,
      (page - 1) * limit,
      limit
    )

    if (!followingData || !followingData.list) {
      return res.json({
        code: 0,
        message: '获取成功',
        data: {
          list: [],
          total: 0,
          page,
          limit,
          hasMore: false
        }
      })
    }

    // 处理博主数据
    const bloggerPromises = followingData.list.map(async (item) => {
      try {
        // 查找或创建博主记录
        let blogger = await Blogger.findByDouyinUserId(item.open_id)
        
        if (!blogger) {
          blogger = new Blogger({
            douyinUserId: item.open_id,
            nickname: item.nickname,
            avatar: item.avatar,
            signature: item.signature || '',
            followerCount: item.follower_count || 0,
            videoCount: item.aweme_count || 0,
            isVerified: item.is_verified || false,
            lastVideoTime: item.latest_aweme_time ? new Date(item.latest_aweme_time * 1000) : null
          })
          await blogger.save()
        } else {
          // 更新博主信息
          blogger.nickname = item.nickname
          blogger.avatar = item.avatar
          blogger.signature = item.signature || blogger.signature
          blogger.followerCount = item.follower_count || blogger.followerCount
          blogger.videoCount = item.aweme_count || blogger.videoCount
          blogger.isVerified = item.is_verified || blogger.isVerified
          if (item.latest_aweme_time) {
            blogger.lastVideoTime = new Date(item.latest_aweme_time * 1000)
          }
          await blogger.save()
        }

        // 检查是否已监控
        const monitorConfig = await MonitorConfig.findOne({
          userId: userId,
          bloggerId: blogger._id,
          isActive: true
        })

        return {
          ...blogger.toObject(),
          isMonitoring: !!monitorConfig,
          monitorConfigId: monitorConfig?._id
        }
      } catch (error) {
        logger.error('处理博主数据失败', { item, error: error.message })
        return null
      }
    })

    const bloggers = (await Promise.all(bloggerPromises)).filter(Boolean)

    // 如果有搜索关键词，进行过滤
    let filteredBloggers = bloggers
    if (search) {
      const searchLower = search.toLowerCase()
      filteredBloggers = bloggers.filter(blogger => 
        blogger.nickname.toLowerCase().includes(searchLower) ||
        (blogger.signature && blogger.signature.toLowerCase().includes(searchLower))
      )
    }

    logger.info('获取关注列表成功', { 
      userId, 
      total: filteredBloggers.length,
      monitoring: filteredBloggers.filter(b => b.isMonitoring).length
    })

    res.json({
      code: 0,
      message: '获取成功',
      data: {
        list: filteredBloggers,
        total: filteredBloggers.length,
        page,
        limit,
        hasMore: followingData.has_more || false,
        cursor: followingData.cursor
      }
    })

  } catch (error) {
    logger.error('获取关注列表失败', { 
      userId: req.user?.userId,
      error: error.message,
      stack: error.stack
    })

    let errorMessage = '获取关注列表失败'
    let errorCode = 500

    if (error.message.includes('访问令牌')) {
      errorMessage = '抖音授权已过期，请重新授权'
      errorCode = 401
    } else if (error.message.includes('权限不足')) {
      errorMessage = '权限不足，请检查抖音授权范围'
      errorCode = 403
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

// 添加博主监控
router.post('/monitor', [
  authenticateToken,
  body('bloggerId').notEmpty().withMessage('博主ID不能为空'),
  body('isActive').optional().isBoolean().withMessage('监控状态必须是布尔值')
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
    const { bloggerId, isActive = true } = req.body

    logger.info('添加博主监控', { userId, bloggerId, isActive })

    // 检查博主是否存在
    const blogger = await Blogger.findById(bloggerId)
    if (!blogger) {
      return res.status(404).json({
        code: 404,
        message: '博主不存在'
      })
    }

    // 检查是否已存在监控配置
    let monitorConfig = await MonitorConfig.findOne({
      userId: userId,
      bloggerId: bloggerId
    })

    if (monitorConfig) {
      // 更新现有配置
      monitorConfig.isActive = isActive
      monitorConfig.updatedAt = new Date()
      await monitorConfig.save()
    } else {
      // 创建新的监控配置
      monitorConfig = new MonitorConfig({
        userId: userId,
        bloggerId: bloggerId,
        isActive: isActive,
        lastCheckTime: null,
        lastVideoId: null
      })
      await monitorConfig.save()
    }

    logger.info('博主监控配置成功', { 
      userId, 
      bloggerId, 
      bloggerName: blogger.nickname,
      isActive,
      configId: monitorConfig._id
    })

    res.json({
      code: 0,
      message: isActive ? '监控已开启' : '监控已关闭',
      data: {
        monitorConfigId: monitorConfig._id,
        isActive: monitorConfig.isActive,
        blogger: {
          id: blogger._id,
          nickname: blogger.nickname,
          avatar: blogger.avatar
        }
      }
    })

  } catch (error) {
    logger.error('添加博主监控失败', { 
      userId: req.user?.userId,
      bloggerId: req.body?.bloggerId,
      error: error.message
    })
    next(error)
  }
})

// 移除博主监控
router.delete('/monitor/:id', [
  authenticateToken
], async (req, res, next) => {
  try {
    const userId = req.user.userId
    const monitorConfigId = req.params.id

    logger.info('移除博主监控', { userId, monitorConfigId })

    // 查找监控配置
    const monitorConfig = await MonitorConfig.findOne({
      _id: monitorConfigId,
      userId: userId
    }).populate('bloggerId')

    if (!monitorConfig) {
      return res.status(404).json({
        code: 404,
        message: '监控配置不存在'
      })
    }

    // 删除监控配置
    await MonitorConfig.findByIdAndDelete(monitorConfigId)

    logger.info('博主监控移除成功', { 
      userId, 
      monitorConfigId,
      bloggerName: monitorConfig.bloggerId?.nickname
    })

    res.json({
      code: 0,
      message: '监控已移除',
      data: {
        monitorConfigId,
        blogger: {
          id: monitorConfig.bloggerId._id,
          nickname: monitorConfig.bloggerId.nickname
        }
      }
    })

  } catch (error) {
    logger.error('移除博主监控失败', { 
      userId: req.user?.userId,
      monitorConfigId: req.params?.id,
      error: error.message
    })
    next(error)
  }
})

// 获取已监控的博主列表
router.get('/monitored', [
  authenticateToken,
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间')
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
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit

    logger.info('获取已监控博主列表', { userId, page, limit })

    // 查询监控配置
    const monitorConfigs = await MonitorConfig.find({
      userId: userId,
      isActive: true
    })
    .populate('bloggerId')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)

    // 统计总数
    const total = await MonitorConfig.countDocuments({
      userId: userId,
      isActive: true
    })

    const bloggers = monitorConfigs.map(config => ({
      ...config.bloggerId.toObject(),
      monitorConfigId: config._id,
      isMonitoring: true,
      lastCheckTime: config.lastCheckTime,
      lastVideoId: config.lastVideoId,
      monitorStartTime: config.createdAt
    }))

    logger.info('获取已监控博主列表成功', { 
      userId, 
      total,
      currentPage: bloggers.length
    })

    res.json({
      code: 0,
      message: '获取成功',
      data: {
        list: bloggers,
        total,
        page,
        limit,
        hasMore: skip + bloggers.length < total
      }
    })

  } catch (error) {
    logger.error('获取已监控博主列表失败', { 
      userId: req.user?.userId,
      error: error.message
    })
    next(error)
  }
})

// 批量管理监控状态
router.put('/monitor/batch', [
  authenticateToken,
  body('bloggerIds').isArray().withMessage('博主ID列表必须是数组'),
  body('bloggerIds.*').notEmpty().withMessage('博主ID不能为空'),
  body('isActive').isBoolean().withMessage('监控状态必须是布尔值')
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
    const { bloggerIds, isActive } = req.body

    logger.info('批量管理监控状态', { userId, bloggerIds, isActive })

    const results = []
    
    for (const bloggerId of bloggerIds) {
      try {
        // 检查博主是否存在
        const blogger = await Blogger.findById(bloggerId)
        if (!blogger) {
          results.push({
            bloggerId,
            success: false,
            message: '博主不存在'
          })
          continue
        }

        // 查找或创建监控配置
        let monitorConfig = await MonitorConfig.findOne({
          userId: userId,
          bloggerId: bloggerId
        })

        if (monitorConfig) {
          monitorConfig.isActive = isActive
          monitorConfig.updatedAt = new Date()
          await monitorConfig.save()
        } else if (isActive) {
          monitorConfig = new MonitorConfig({
            userId: userId,
            bloggerId: bloggerId,
            isActive: true
          })
          await monitorConfig.save()
        }

        results.push({
          bloggerId,
          success: true,
          message: isActive ? '监控已开启' : '监控已关闭',
          monitorConfigId: monitorConfig?._id
        })

      } catch (error) {
        logger.error('批量处理单个博主失败', { bloggerId, error: error.message })
        results.push({
          bloggerId,
          success: false,
          message: '处理失败: ' + error.message
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.length - successCount

    logger.info('批量管理监控状态完成', { 
      userId, 
      total: results.length,
      success: successCount,
      fail: failCount
    })

    res.json({
      code: 0,
      message: `处理完成，成功${successCount}个，失败${failCount}个`,
      data: {
        results,
        summary: {
          total: results.length,
          success: successCount,
          fail: failCount
        }
      }
    })

  } catch (error) {
    logger.error('批量管理监控状态失败', { 
      userId: req.user?.userId,
      error: error.message
    })
    next(error)
  }
})

module.exports = router