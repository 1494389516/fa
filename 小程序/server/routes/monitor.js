// routes/monitor.js - 监控状态相关路由
const express = require('express')
const { body, validationResult } = require('express-validator')

const User = require('../models/User')
const MonitorConfig = require('../models/MonitorConfig')
const ArtistMonitorConfig = require('../models/ArtistMonitorConfig')
const VideoUpdate = require('../models/VideoUpdate')
const SongUpdate = require('../models/SongUpdate')
const monitorService = require('../services/monitorService')
const logger = require('../utils/logger')
const { authenticateToken } = require('../middleware/auth')

const router = express.Router()

// 获取监控状态
router.get('/status', [
  authenticateToken
], async (req, res, next) => {
  try {
    const userId = req.user.userId

    logger.info('获取监控状态', { userId })

    // 获取监控配置数量
    const [douyinConfigs, qqMusicConfigs] = await Promise.all([
      MonitorConfig.countDocuments({ userId, isActive: true }),
      ArtistMonitorConfig.countDocuments({ userId, isActive: true })
    ])

    const totalConfigs = douyinConfigs + qqMusicConfigs
    const isActive = totalConfigs > 0 && monitorService.isRunning

    // 获取最后检查时间
    let lastCheckTime = null
    if (totalConfigs > 0) {
      const [lastDouyinCheck, lastQQMusicCheck] = await Promise.all([
        MonitorConfig.findOne({ userId, isActive: true })
          .sort({ lastCheckTime: -1 })
          .select('lastCheckTime'),
        ArtistMonitorConfig.findOne({ userId, isActive: true })
          .sort({ lastCheckTime: -1 })
          .select('lastCheckTime')
      ])

      const times = [
        lastDouyinCheck?.lastCheckTime,
        lastQQMusicCheck?.lastCheckTime
      ].filter(Boolean)

      if (times.length > 0) {
        lastCheckTime = new Date(Math.max(...times.map(t => t.getTime())))
      }
    }

    const status = {
      isActive,
      totalConfigs,
      douyinConfigs,
      qqMusicConfigs,
      lastCheckTime,
      monitorServiceRunning: monitorService.isRunning
    }

    logger.info('获取监控状态成功', { userId, status })

    res.json({
      code: 0,
      message: '获取成功',
      data: status
    })

  } catch (error) {
    logger.error('获取监控状态失败', { 
      userId: req.user?.userId,
      error: error.message
    })
    next(error)
  }
})

// 切换监控状态
router.post('/toggle', [
  authenticateToken,
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
    const { isActive } = req.body

    logger.info('切换监控状态', { userId, isActive })

    if (isActive) {
      // 启动监控服务
      if (!monitorService.isRunning) {
        await monitorService.start()
      }
    } else {
      // 停止监控服务（如果没有其他用户在使用）
      const totalActiveConfigs = await Promise.all([
        MonitorConfig.countDocuments({ isActive: true }),
        ArtistMonitorConfig.countDocuments({ isActive: true })
      ])
      
      const totalConfigs = totalActiveConfigs[0] + totalActiveConfigs[1]
      
      if (totalConfigs === 0 && monitorService.isRunning) {
        await monitorService.stop()
      }
    }

    logger.info('监控状态切换成功', { userId, isActive })

    res.json({
      code: 0,
      message: isActive ? '监控已启动' : '监控已停止',
      data: {
        isActive,
        monitorServiceRunning: monitorService.isRunning
      }
    })

  } catch (error) {
    logger.error('切换监控状态失败', { 
      userId: req.user?.userId,
      error: error.message
    })
    next(error)
  }
})

// 手动检查更新
router.post('/check', [
  authenticateToken
], async (req, res, next) => {
  try {
    const userId = req.user.userId

    logger.info('手动检查更新', { userId })

    // 获取用户的监控配置
    const [douyinConfigs, qqMusicConfigs] = await Promise.all([
      MonitorConfig.find({ userId, isActive: true }).populate('bloggerId'),
      ArtistMonitorConfig.find({ userId, isActive: true }).populate('artistId')
    ])

    let newVideos = 0
    let newSongs = 0

    // 检查抖音视频更新
    if (douyinConfigs.length > 0) {
      try {
        const user = await User.findById(userId)
        if (user && user.douyinAccessToken && !user.isDouyinTokenExpired) {
          for (const config of douyinConfigs) {
            try {
              const result = await monitorService.processBloggerMonitorConfig(config, user)
              if (result.success && result.newVideos) {
                newVideos += result.newVideos
              }
            } catch (configError) {
              logger.error('处理博主监控配置失败', {
                configId: config._id,
                error: configError.message
              })
            }
          }
        }
      } catch (douyinError) {
        logger.error('检查抖音更新失败', { userId, error: douyinError.message })
      }
    }

    // 检查QQ音乐歌曲更新
    if (qqMusicConfigs.length > 0) {
      try {
        const user = await User.findById(userId)
        if (user && user.qqMusicAccessToken && !user.isQQMusicTokenExpired) {
          for (const config of qqMusicConfigs) {
            try {
              const result = await monitorService.processArtistMonitorConfig(config, user)
              if (result.success && result.newSongs) {
                newSongs += result.newSongs
              }
            } catch (configError) {
              logger.error('处理歌手监控配置失败', {
                configId: config._id,
                error: configError.message
              })
            }
          }
        }
      } catch (qqMusicError) {
        logger.error('检查QQ音乐更新失败', { userId, error: qqMusicError.message })
      }
    }

    logger.info('手动检查更新完成', { 
      userId, 
      newVideos, 
      newSongs,
      total: newVideos + newSongs
    })

    res.json({
      code: 0,
      message: '检查完成',
      data: {
        newVideos,
        newSongs,
        total: newVideos + newSongs,
        checkTime: new Date()
      }
    })

  } catch (error) {
    logger.error('手动检查更新失败', { 
      userId: req.user?.userId,
      error: error.message
    })
    next(error)
  }
})

// 获取监控统计
router.get('/stats', [
  authenticateToken
], async (req, res, next) => {
  try {
    const userId = req.user.userId

    logger.info('获取监控统计', { userId })

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // 并行查询统计信息
    const [
      totalDouyinConfigs,
      activeDouyinConfigs,
      totalQQMusicConfigs,
      activeQQMusicConfigs,
      totalVideos,
      unreadVideos,
      todayVideos,
      weekVideos,
      totalSongs,
      unreadSongs,
      todaySongs,
      weekSongs
    ] = await Promise.all([
      MonitorConfig.countDocuments({ userId }),
      MonitorConfig.countDocuments({ userId, isActive: true }),
      ArtistMonitorConfig.countDocuments({ userId }),
      ArtistMonitorConfig.countDocuments({ userId, isActive: true }),
      VideoUpdate.countDocuments({ userId }),
      VideoUpdate.countDocuments({ userId, isRead: false }),
      VideoUpdate.countDocuments({ userId, createdAt: { $gte: today } }),
      VideoUpdate.countDocuments({ userId, createdAt: { $gte: weekAgo } }),
      SongUpdate.countDocuments({ userId }),
      SongUpdate.countDocuments({ userId, isRead: false }),
      SongUpdate.countDocuments({ userId, createdAt: { $gte: today } }),
      SongUpdate.countDocuments({ userId, createdAt: { $gte: weekAgo } })
    ])

    const stats = {
      // 监控配置统计
      totalConfigs: totalDouyinConfigs + totalQQMusicConfigs,
      activeConfigs: activeDouyinConfigs + activeQQMusicConfigs,
      douyinConfigs: {
        total: totalDouyinConfigs,
        active: activeDouyinConfigs
      },
      qqMusicConfigs: {
        total: totalQQMusicConfigs,
        active: activeQQMusicConfigs
      },
      // 更新统计
      totalUpdates: totalVideos + totalSongs,
      unreadUpdates: unreadVideos + unreadSongs,
      todayUpdates: todayVideos + todaySongs,
      weekUpdates: weekVideos + weekSongs,
      // 分类统计
      videos: {
        total: totalVideos,
        unread: unreadVideos,
        today: todayVideos,
        week: weekVideos
      },
      songs: {
        total: totalSongs,
        unread: unreadSongs,
        today: todaySongs,
        week: weekSongs
      }
    }

    logger.info('获取监控统计成功', { userId, stats })

    res.json({
      code: 0,
      message: '获取成功',
      data: stats
    })

  } catch (error) {
    logger.error('获取监控统计失败', { 
      userId: req.user?.userId,
      error: error.message
    })
    next(error)
  }
})

// 获取监控日志
router.get('/logs', [
  authenticateToken
], async (req, res, next) => {
  try {
    const userId = req.user.userId
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit

    logger.info('获取监控日志', { userId, page, limit })

    // 获取最近的更新记录作为日志
    const [videoLogs, songLogs] = await Promise.all([
      VideoUpdate.find({ userId })
        .populate('bloggerId', 'nickname avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Math.ceil(limit / 2))
        .lean(),
      SongUpdate.find({ userId })
        .populate('artistId', 'name avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Math.ceil(limit / 2))
        .lean()
    ])

    // 合并并排序日志
    const allLogs = [
      ...videoLogs.map(log => ({
        ...log,
        type: 'video',
        sortTime: new Date(log.createdAt).getTime()
      })),
      ...songLogs.map(log => ({
        ...log,
        type: 'song',
        sortTime: new Date(log.createdAt).getTime()
      }))
    ].sort((a, b) => b.sortTime - a.sortTime).slice(0, limit)

    const total = await Promise.all([
      VideoUpdate.countDocuments({ userId }),
      SongUpdate.countDocuments({ userId })
    ]).then(counts => counts[0] + counts[1])

    logger.info('获取监控日志成功', { 
      userId, 
      total,
      currentPage: allLogs.length
    })

    res.json({
      code: 0,
      message: '获取成功',
      data: {
        list: allLogs,
        total,
        page,
        limit,
        hasMore: skip + allLogs.length < total
      }
    })

  } catch (error) {
    logger.error('获取监控日志失败', { 
      userId: req.user?.userId,
      error: error.message
    })
    next(error)
  }
})

module.exports = router