// app.js - 主应用入口
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const compression = require('compression')
const rateLimit = require('express-rate-limit')
require('dotenv').config()

const connectDB = require('./config/database')
const connectRedis = require('./config/redis')
const logger = require('./utils/logger')
const errorHandler = require('./middleware/errorHandler')
const monitorService = require('./services/monitorService')

// 导入路由
const authRoutes = require('./routes/auth')
const bloggerRoutes = require('./routes/bloggers')
const videoRoutes = require('./routes/videos')
const settingsRoutes = require('./routes/settings')
const douyinRoutes = require('./routes/douyin')

// 创建Express应用
const app = express()

// 连接数据库
connectDB()
connectRedis()

// 中间件配置
app.use(helmet()) // 安全头
app.use(compression()) // 压缩响应
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['*'],
  credentials: true
}))

// 请求日志
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}))

// 请求限流
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP 15分钟内最多100个请求
  message: {
    code: 429,
    message: '请求过于频繁，请稍后再试'
  }
})
app.use('/api/', limiter)

// 解析请求体
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    code: 0,
    message: 'OK',
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }
  })
})

// API路由
app.use('/api/auth', authRoutes)
app.use('/api/bloggers', bloggerRoutes)
app.use('/api/videos', videoRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/douyin', douyinRoutes)

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    code: 404,
    message: '请求的资源不存在'
  })
})

// 错误处理中间件
app.use(errorHandler)

// 启动服务器
const PORT = process.env.PORT || 3000
const server = app.listen(PORT, () => {
  logger.info(`服务器启动成功，端口: ${PORT}`)
  logger.info(`环境: ${process.env.NODE_ENV || 'development'}`)
  
  // 启动监控服务
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_MONITOR === 'true') {
    monitorService.start()
  }
})

// 优雅关闭
process.on('SIGTERM', () => {
  logger.info('收到SIGTERM信号，开始优雅关闭...')
  monitorService.stop()
  server.close(() => {
    logger.info('HTTP服务器已关闭')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  logger.info('收到SIGINT信号，开始优雅关闭...')
  monitorService.stop()
  server.close(() => {
    logger.info('HTTP服务器已关闭')
    process.exit(0)
  })
})

// 未捕获的异常处理
process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的Promise拒绝:', reason)
  process.exit(1)
})

module.exports = app