// middleware/errorHandler.js - 全局错误处理中间件
const logger = require('../utils/logger')

const errorHandler = (err, req, res, next) => {
  let error = { ...err }
  error.message = err.message

  // 记录错误日志
  logger.error(`错误: ${err.message}`, {
    error: err,
    request: {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    }
  })

  // Mongoose验证错误
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ')
    error = {
      code: 400,
      message: `数据验证失败: ${message}`
    }
  }

  // Mongoose重复键错误
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0]
    const value = err.keyValue[field]
    error = {
      code: 400,
      message: `${field}: ${value} 已存在`
    }
  }

  // Mongoose CastError
  if (err.name === 'CastError') {
    error = {
      code: 400,
      message: '资源ID格式错误'
    }
  }

  // JWT错误
  if (err.name === 'JsonWebTokenError') {
    error = {
      code: 401,
      message: '无效的访问令牌'
    }
  }

  // JWT过期错误
  if (err.name === 'TokenExpiredError') {
    error = {
      code: 401,
      message: '访问令牌已过期'
    }
  }

  // 语法错误
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    error = {
      code: 400,
      message: '请求数据格式错误'
    }
  }

  // 默认错误
  const statusCode = error.code || err.statusCode || 500
  const message = error.message || '服务器内部错误'

  res.status(statusCode).json({
    code: statusCode,
    message: message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      error: err
    })
  })
}

module.exports = errorHandler