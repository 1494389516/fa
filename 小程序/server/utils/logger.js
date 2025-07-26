// utils/logger.js - 日志工具
const winston = require('winston')
const path = require('path')

// 创建日志目录
const logDir = process.env.LOG_FILE_PATH || './logs'

// 日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`
    
    // 如果有错误堆栈，添加到日志中
    if (stack) {
      log += `\n${stack}`
    }
    
    // 如果有额外的元数据，添加到日志中
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`
    }
    
    return log
  })
)

// 控制台格式（开发环境）
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    let log = `${timestamp} ${level}: ${message}`
    if (stack) {
      log += `\n${stack}`
    }
    return log
  })
)

// 创建logger实例
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'douyin-monitor-server'
  },
  transports: [
    // 错误日志文件
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    
    // 所有日志文件
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ],
  
  // 异常处理
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'exceptions.log')
    })
  ],
  
  // 拒绝处理
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'rejections.log')
    })
  ]
})

// 开发环境添加控制台输出
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }))
}

// 生产环境不输出debug日志到文件
if (process.env.NODE_ENV === 'production') {
  logger.level = 'info'
}

// 扩展logger方法
logger.request = (req, message = '') => {
  const logData = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    message: message || `${req.method} ${req.originalUrl}`
  }
  
  logger.info(logData.message, logData)
}

logger.response = (req, res, responseTime) => {
  const logData = {
    method: req.method,
    url: req.originalUrl,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    ip: req.ip || req.connection.remoteAddress,
    message: `${req.method} ${req.originalUrl} ${res.statusCode} - ${responseTime}ms`
  }
  
  if (res.statusCode >= 400) {
    logger.warn(logData.message, logData)
  } else {
    logger.info(logData.message, logData)
  }
}

logger.error = (message, error = null) => {
  if (error instanceof Error) {
    winston.loggers.get('default').error(message, {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    })
  } else if (typeof error === 'object') {
    winston.loggers.get('default').error(message, { error })
  } else {
    winston.loggers.get('default').error(message)
  }
}

module.exports = logger