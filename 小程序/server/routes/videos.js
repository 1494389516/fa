// routes/videos.js - 视频相关路由
const express = require('express')
const { query, body, param, validationResult } = require('express-validator')

const VideoUpdate = require('../models/VideoUpdate')
const Blogger = require('../models/Blogger')
const logger = require('../utils/logger')
const { authenticateToken } = require('../middleware/auth')

const router = express.Router()

// 获取视频更新列表
router.get('/updates', [
  authenticateToken,
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
  query('filterType').optional().isIn(['all', 'unread', 'read']).withMessage('筛选类型无效'),
  query('dateRange').optional().isIn(['today', 'week', 'month', 'all']).withMessage('时间范围无效'),
  query('bloggerId').optional().isMongoId().withMessage('博主ID格式错误')
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
    const filterType = req.query.filterType || 'all'
    const dateRange = req.query.dateRange || 'all'
    const bloggerId = req.query.bloggerId
    const skip = (page - 1) * limit

    logger.info('获取视频更新列表', { 
      userId, page, limit, filterType, dateRange, bloggerId 
    })

    // 构建查询条件
    const query = { userId }

    // 筛选博主
    if (bloggerId) {
      query.bloggerId = bloggerId
    }

    // 筛选阅读状态
    if (filterType === 'unread') {
      query.isRead = false
    } else if (filterType === 'read') {
      query.isRead = true
    }

    // 筛选时间范围
    if (dateRange !== 'all') {
      const now = new Date()
      let startDate

      switch (dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
      }

      if (startDate) {
        query.createdAt = { $gte: startDate }
      }
    }

    // 查询视频更新
    const videoUpdates = await VideoUpdate.find(query)
      .populate('bloggerId', 'nickname avatar isVerified')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    // 统计总数
    const total = await VideoUpdate.countDocuments(query)

    // 格式化数据
    const formattedUpdates = videoUpdates.map(update => ({
      ...update,
      blogger: update.bloggerId,
      bloggerId: update.bloggerId._id,
      publishTimeText: formatRelativeTime(update.publishTime),
      createdAtText: formatRelativeTime(update.createdAt)
    }))

    logger.info('获取视频更新列表成功', { 
      userId, 
      total,
      currentPage: formattedUpdates.length
    })

    res.json({
      code: 0,
      message: '获取成功',
      data: {
        list: formattedUpdates,
        total,
        page,
        limit,
        hasMore: skip + formattedUpdates.length < total
      }
    })

  } catch (error) {
    logger.error('获取视频更新列表失败', { 
      userId: req.user?.userId,
      error: error.message
    })
    next(error)
  }
})

// 获取视频更新统计
router.get('/stats', [
  authenticateToken
], async (req, res, next) => {
  try {
    const userId = req.user.userId

    logger.info('获取视频更新统计', { userId })

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // 并行查询各项统计
    const [total, unread, todayCount, weekCount] = await Promise.all([
      VideoUpdate.countDocuments({ userId }),
      VideoUpdate.countDocuments({ userId, isRead: false }),
      VideoUpdate.countDocuments({ userId, createdAt: { $gte: today } }),
      VideoUpdate.countDocuments({ userId, createdAt: { $gte: weekAgo } })
    ])

    const stats = {
      total,
      unread,
      today: todayCount,
      week: weekCount
    }

    logger.info('获取视频更新统计成功', { userId, stats })

    res.json({
      code: 0,
      message: '获取成功',
      data: stats
    })

  } catch (error) {
    logger.error('获取视频更新统计失败', { 
      userId: req.user?.userId,
      error: error.message
    })
    next(error)
  }
})

// 标记视频为已读
router.post('/mark-read', [
  authenticateToken,
  body('videoIds').isArray().withMessage('视频ID列表必须是数组'),
  body('videoIds.*').isMongoId().withMessage('视频ID格式错误')
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
    const { videoIds } = req.body

    logger.info('标记视频为已读', { userId, videoIds })

    // 更新视频状态
    const result = await VideoUpdate.updateMany(
      {
        _id: { $in: videoIds },
        userId: userId
      },
      {
        isRead: true,
        readAt: new Date()
      }
    )

    logger.info('标记视频为已读成功', { 
      userId, 
      requested: videoIds.length,
      updated: result.modifiedCount
    })

    res.json({
      code: 0,
      message: `成功标记${result.modifiedCount}个视频为已读`,
      data: {
        updated: result.modifiedCount
      }
    })

  } catch (error) {
    logger.error('标记视频为已读失败', { 
      userId: req.user?.userId,
      error: error.message
    })
    next(error)
  }
})

// 全部标记为已读
router.post('/mark-all-read', [
  authenticateToken
], async (req, res, next) => {
  try {
    const userId = req.user.userId

    logger.info('全部标记为已读', { userId })

    // 更新所有未读视频
    const result = await VideoUpdate.updateMany(
      {
        userId: userId,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    )

    logger.info('全部标记为已读成功', { 
      userId, 
      updated: result.modifiedCount
    })

    res.json({
      code: 0,
      message: `成功标记${result.modifiedCount}个视频为已读`,
      data: {
        updated: result.modifiedCount
      }
    })

  } catch (error) {
    logger.error('全部标记为已读失败', { 
      userId: req.user?.userId,
      error: error.message
    })
    next(error)
  }
})

// 更新视频已读状态
router.put('/:id/read-status', [
  authenticateToken,
  param('id').isMongoId().withMessage('视频ID格式错误'),
  body('isRead').isBoolean().withMessage('已读状态必须是布尔值')
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
    const videoId = req.params.id
    const { isRead } = req.body

    logger.info('更新视频已读状态', { userId, videoId, isRead })

    // 查找并更新视频
    const video = await VideoUpdate.findOneAndUpdate(
      {
        _id: videoId,
        userId: userId
      },
      {
        isRead,
        readAt: isRead ? new Date() : null
      },
      { new: true }
    )

    if (!video) {
      return res.status(404).json({
        code: 404,
        message: '视频记录不存在'
      })
    }

    logger.info('更新视频已读状态成功', { userId, videoId, isRead })

    res.json({
      code: 0,
      message: isRead ? '已标记为已读' : '已标记为未读',
      data: {
        video: {
          id: video._id,
          isRead: video.isRead,
          readAt: video.readAt
        }
      }
    })

  } catch (error) {
    logger.error('更新视频已读状态失败', { 
      userId: req.user?.userId,
      videoId: req.params?.id,
      error: error.message
    })
    next(error)
  }
})

// 删除视频记录
router.delete('/:id', [
  authenticateToken,
  param('id').isMongoId().withMessage('视频ID格式错误')
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
    const videoId = req.params.id

    logger.info('删除视频记录', { userId, videoId })

    // 查找并删除视频记录
    const video = await VideoUpdate.findOneAndDelete({
      _id: videoId,
      userId: userId
    })

    if (!video) {
      return res.status(404).json({
        code: 404,
        message: '视频记录不存在'
      })
    }

    logger.info('删除视频记录成功', { userId, videoId })

    res.json({
      code: 0,
      message: '删除成功',
      data: {
        deletedId: videoId
      }
    })

  } catch (error) {
    logger.error('删除视频记录失败', { 
      userId: req.user?.userId,
      videoId: req.params?.id,
      error: error.message
    })
    next(error)
  }
})

// 批量删除视频记录
router.delete('/batch', [
  authenticateToken,
  body('videoIds').isArray().withMessage('视频ID列表必须是数组'),
  body('videoIds.*').isMongoId().withMessage('视频ID格式错误')
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
    const { videoIds } = req.body

    logger.info('批量删除视频记录', { userId, videoIds })

    // 批量删除视频记录
    const result = await VideoUpdate.deleteMany({
      _id: { $in: videoIds },
      userId: userId
    })

    logger.info('批量删除视频记录成功', { 
      userId, 
      requested: videoIds.length,
      deleted: result.deletedCount
    })

    res.json({
      code: 0,
      message: `成功删除${result.deletedCount}条记录`,
      data: {
        deleted: result.deletedCount
      }
    })

  } catch (error) {
    logger.error('批量删除视频记录失败', { 
      userId: req.user?.userId,
      error: error.message
    })
    next(error)
  }
})

// 获取视频详情
router.get('/:id', [
  authenticateToken,
  param('id').isMongoId().withMessage('视频ID格式错误')
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
    const videoId = req.params.id

    logger.info('获取视频详情', { userId, videoId })

    // 查找视频记录
    const video = await VideoUpdate.findOne({
      _id: videoId,
      userId: userId
    }).populate('bloggerId', 'nickname avatar signature isVerified')

    if (!video) {
      return res.status(404).json({
        code: 404,
        message: '视频记录不存在'
      })
    }

    // 如果是未读状态，标记为已读
    if (!video.isRead) {
      video.isRead = true
      video.readAt = new Date()
      await video.save()
    }

    // 格式化数据
    const formattedVideo = {
      ...video.toObject(),
      blogger: video.bloggerId,
      bloggerId: video.bloggerId._id,
      publishTimeText: formatRelativeTime(video.publishTime),
      createdAtText: formatRelativeTime(video.createdAt)
    }

    logger.info('获取视频详情成功', { userId, videoId })

    res.json({
      code: 0,
      message: '获取成功',
      data: formattedVideo
    })

  } catch (error) {
    logger.error('获取视频详情失败', { 
      userId: req.user?.userId,
      videoId: req.params?.id,
      error: error.message
    })
    next(error)
  }
})

// 格式化相对时间
function formatRelativeTime(date) {
  const now = new Date()
  const target = new Date(date)
  const diffMs = now - target
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMinutes < 1) {
    return '刚刚'
  } else if (diffMinutes < 60) {
    return `${diffMinutes}分钟前`
  } else if (diffHours < 24) {
    return `${diffHours}小时前`
  } else if (diffDays < 7) {
    return `${diffDays}天前`
  } else {
    return target.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
}

module.exports = router