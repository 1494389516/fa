// routes/songs.js - 歌曲更新相关路由
const express = require('express')
const { body, query, validationResult } = require('express-validator')

const User = require('../models/User')
const Artist = require('../models/Artist')
const SongUpdate = require('../models/SongUpdate')
const logger = require('../utils/logger')
const { authenticateToken, requireQQMusicAuth } = require('../middleware/auth')

const router = express.Router()

// 获取歌曲更新列表
router.get('/updates', [
  authenticateToken,
  requireQQMusicAuth,
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
  query('filterType').optional().isIn(['all', 'unread', 'read']).withMessage('筛选类型错误'),
  query('dateRange').optional().isIn(['today', 'week', 'month', 'all']).withMessage('日期范围错误')
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
    const skip = (page - 1) * limit

    logger.info('获取歌曲更新列表', { userId, page, limit, filterType, dateRange })

    // 构建查询条件
    const query = { userId }

    // 筛选已读状态
    if (filterType === 'unread') {
      query.isRead = false
    } else if (filterType === 'read') {
      query.isRead = true
    }

    // 筛选日期范围
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

    // 查询歌曲更新
    const songUpdates = await SongUpdate.find(query)
      .populate('artistId', 'name avatar qqMusicId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    // 统计总数
    const total = await SongUpdate.countDocuments(query)

    const hasMore = skip + songUpdates.length < total

    logger.info('获取歌曲更新列表成功', { 
      userId, 
      total,
      currentPage: songUpdates.length,
      hasMore
    })

    res.json({
      code: 0,
      message: '获取成功',
      data: {
        list: songUpdates,
        total,
        page,
        limit,
        hasMore
      }
    })

  } catch (error) {
    logger.error('获取歌曲更新列表失败', { 
      userId: req.user?.userId,
      error: error.message
    })
    next(error)
  }
})

// 获取歌曲更新统计
router.get('/stats', [
  authenticateToken,
  requireQQMusicAuth
], async (req, res, next) => {
  try {
    const userId = req.user.userId

    logger.info('获取歌曲更新统计', { userId })

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // 并行查询统计信息
    const [total, unread, todayCount, weekCount] = await Promise.all([
      SongUpdate.countDocuments({ userId }),
      SongUpdate.countDocuments({ userId, isRead: false }),
      SongUpdate.countDocuments({ userId, createdAt: { $gte: today } }),
      SongUpdate.countDocuments({ userId, createdAt: { $gte: weekAgo } })
    ])

    const stats = {
      total,
      unread,
      today: todayCount,
      week: weekCount
    }

    logger.info('获取歌曲更新统计成功', { userId, stats })

    res.json({
      code: 0,
      message: '获取成功',
      data: stats
    })

  } catch (error) {
    logger.error('获取歌曲更新统计失败', { 
      userId: req.user?.userId,
      error: error.message
    })
    next(error)
  }
})

// 标记歌曲为已读
router.post('/mark-read', [
  authenticateToken,
  body('songIds').isArray().withMessage('歌曲ID列表必须是数组'),
  body('songIds.*').notEmpty().withMessage('歌曲ID不能为空')
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
    const { songIds } = req.body

    logger.info('标记歌曲为已读', { userId, songIds })

    // 批量更新
    const result = await SongUpdate.updateMany(
      { 
        _id: { $in: songIds },
        userId: userId
      },
      { 
        isRead: true,
        readTime: new Date()
      }
    )

    logger.info('标记歌曲为已读成功', { 
      userId, 
      songIds,
      modifiedCount: result.modifiedCount
    })

    res.json({
      code: 0,
      message: '标记成功',
      data: {
        modifiedCount: result.modifiedCount
      }
    })

  } catch (error) {
    logger.error('标记歌曲为已读失败', { 
      userId: req.user?.userId,
      songIds: req.body?.songIds,
      error: error.message
    })
    next(error)
  }
})

// 更新歌曲已读状态
router.put('/:id/read-status', [
  authenticateToken,
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
    const songId = req.params.id
    const { isRead } = req.body

    logger.info('更新歌曲已读状态', { userId, songId, isRead })

    // 查找并更新歌曲
    const songUpdate = await SongUpdate.findOneAndUpdate(
      { 
        _id: songId,
        userId: userId
      },
      { 
        isRead,
        readTime: isRead ? new Date() : null
      },
      { new: true }
    ).populate('artistId', 'name avatar')

    if (!songUpdate) {
      return res.status(404).json({
        code: 404,
        message: '歌曲记录不存在'
      })
    }

    logger.info('更新歌曲已读状态成功', { 
      userId, 
      songId,
      isRead,
      title: songUpdate.title
    })

    res.json({
      code: 0,
      message: '更新成功',
      data: songUpdate
    })

  } catch (error) {
    logger.error('更新歌曲已读状态失败', { 
      userId: req.user?.userId,
      songId: req.params?.id,
      error: error.message
    })
    next(error)
  }
})

// 删除歌曲记录
router.delete('/:id', [
  authenticateToken
], async (req, res, next) => {
  try {
    const userId = req.user.userId
    const songId = req.params.id

    logger.info('删除歌曲记录', { userId, songId })

    // 查找并删除歌曲记录
    const songUpdate = await SongUpdate.findOneAndDelete({
      _id: songId,
      userId: userId
    })

    if (!songUpdate) {
      return res.status(404).json({
        code: 404,
        message: '歌曲记录不存在'
      })
    }

    logger.info('删除歌曲记录成功', { 
      userId, 
      songId,
      title: songUpdate.title
    })

    res.json({
      code: 0,
      message: '删除成功',
      data: {
        songId,
        title: songUpdate.title
      }
    })

  } catch (error) {
    logger.error('删除歌曲记录失败', { 
      userId: req.user?.userId,
      songId: req.params?.id,
      error: error.message
    })
    next(error)
  }
})

// 批量删除歌曲记录
router.delete('/batch', [
  authenticateToken,
  body('songIds').isArray().withMessage('歌曲ID列表必须是数组'),
  body('songIds.*').notEmpty().withMessage('歌曲ID不能为空')
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
    const { songIds } = req.body

    logger.info('批量删除歌曲记录', { userId, songIds })

    // 批量删除
    const result = await SongUpdate.deleteMany({
      _id: { $in: songIds },
      userId: userId
    })

    logger.info('批量删除歌曲记录成功', { 
      userId, 
      songIds,
      deletedCount: result.deletedCount
    })

    res.json({
      code: 0,
      message: '批量删除成功',
      data: {
        deletedCount: result.deletedCount
      }
    })

  } catch (error) {
    logger.error('批量删除歌曲记录失败', { 
      userId: req.user?.userId,
      songIds: req.body?.songIds,
      error: error.message
    })
    next(error)
  }
})

// 获取歌曲详情
router.get('/:id', [
  authenticateToken
], async (req, res, next) => {
  try {
    const userId = req.user.userId
    const songId = req.params.id

    logger.info('获取歌曲详情', { userId, songId })

    // 查找歌曲记录
    const songUpdate = await SongUpdate.findOne({
      _id: songId,
      userId: userId
    }).populate('artistId', 'name avatar qqMusicId description')

    if (!songUpdate) {
      return res.status(404).json({
        code: 404,
        message: '歌曲记录不存在'
      })
    }

    // 标记为已读
    if (!songUpdate.isRead) {
      songUpdate.isRead = true
      songUpdate.readTime = new Date()
      await songUpdate.save()
    }

    logger.info('获取歌曲详情成功', { 
      userId, 
      songId,
      title: songUpdate.title
    })

    res.json({
      code: 0,
      message: '获取成功',
      data: songUpdate
    })

  } catch (error) {
    logger.error('获取歌曲详情失败', { 
      userId: req.user?.userId,
      songId: req.params?.id,
      error: error.message
    })
    next(error)
  }
})

module.exports = router