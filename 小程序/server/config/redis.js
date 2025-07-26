// config/redis.js - Redis缓存连接配置
const redis = require('redis')
const logger = require('../utils/logger')

let redisClient = null

const connectRedis = async () => {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
    
    redisClient = redis.createClient({
      url: redisUrl,
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          logger.error('Redis服务器拒绝连接')
          return new Error('Redis服务器拒绝连接')
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          logger.error('Redis重试时间超过1小时，停止重试')
          return new Error('重试时间过长')
        }
        if (options.attempt > 10) {
          logger.error('Redis重试次数超过10次，停止重试')
          return undefined
        }
        // 重试间隔递增
        return Math.min(options.attempt * 100, 3000)
      }
    })

    // 连接事件监听
    redisClient.on('connect', () => {
      logger.info('Redis连接已建立')
    })

    redisClient.on('ready', () => {
      logger.info('Redis连接就绪')
    })

    redisClient.on('error', (err) => {
      logger.error('Redis连接错误:', err)
    })

    redisClient.on('end', () => {
      logger.warn('Redis连接已断开')
    })

    redisClient.on('reconnecting', () => {
      logger.info('Redis正在重连...')
    })

    // 连接Redis
    await redisClient.connect()
    logger.info('Redis连接成功')

    // 应用终止时关闭Redis连接
    process.on('SIGINT', async () => {
      if (redisClient) {
        await redisClient.quit()
        logger.info('Redis连接已关闭')
      }
    })

  } catch (error) {
    logger.error('Redis连接失败:', error)
    // Redis连接失败不应该导致应用崩溃，只是缓存功能不可用
  }
}

// Redis操作封装
const redisOperations = {
  // 设置键值对
  async set(key, value, expireSeconds = null) {
    try {
      if (!redisClient || !redisClient.isReady) {
        logger.warn('Redis未连接，跳过缓存操作')
        return false
      }

      const serializedValue = JSON.stringify(value)
      if (expireSeconds) {
        await redisClient.setEx(key, expireSeconds, serializedValue)
      } else {
        await redisClient.set(key, serializedValue)
      }
      return true
    } catch (error) {
      logger.error('Redis设置失败:', error)
      return false
    }
  },

  // 获取值
  async get(key) {
    try {
      if (!redisClient || !redisClient.isReady) {
        logger.warn('Redis未连接，跳过缓存操作')
        return null
      }

      const value = await redisClient.get(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      logger.error('Redis获取失败:', error)
      return null
    }
  },

  // 删除键
  async del(key) {
    try {
      if (!redisClient || !redisClient.isReady) {
        return false
      }

      await redisClient.del(key)
      return true
    } catch (error) {
      logger.error('Redis删除失败:', error)
      return false
    }
  },

  // 检查键是否存在
  async exists(key) {
    try {
      if (!redisClient || !redisClient.isReady) {
        return false
      }

      const result = await redisClient.exists(key)
      return result === 1
    } catch (error) {
      logger.error('Redis检查存在失败:', error)
      return false
    }
  },

  // 设置过期时间
  async expire(key, seconds) {
    try {
      if (!redisClient || !redisClient.isReady) {
        return false
      }

      await redisClient.expire(key, seconds)
      return true
    } catch (error) {
      logger.error('Redis设置过期时间失败:', error)
      return false
    }
  },

  // 获取剩余过期时间
  async ttl(key) {
    try {
      if (!redisClient || !redisClient.isReady) {
        return -1
      }

      return await redisClient.ttl(key)
    } catch (error) {
      logger.error('Redis获取TTL失败:', error)
      return -1
    }
  }
}

module.exports = {
  connectRedis,
  redis: redisOperations,
  getClient: () => redisClient
}