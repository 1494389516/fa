// config/database.js - MongoDB数据库连接配置
const mongoose = require('mongoose')
const logger = require('../utils/logger')

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/douyin_monitor'
    
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10, // 连接池最大连接数
      serverSelectionTimeoutMS: 5000, // 服务器选择超时时间
      socketTimeoutMS: 45000, // Socket超时时间
      bufferMaxEntries: 0, // 禁用mongoose缓冲
      bufferCommands: false // 禁用mongoose缓冲命令
    }

    const conn = await mongoose.connect(mongoURI, options)
    
    logger.info(`MongoDB连接成功: ${conn.connection.host}`)
    
    // 监听连接事件
    mongoose.connection.on('connected', () => {
      logger.info('MongoDB连接已建立')
    })
    
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB连接错误:', err)
    })
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB连接已断开')
    })
    
    // 应用终止时关闭数据库连接
    process.on('SIGINT', async () => {
      await mongoose.connection.close()
      logger.info('MongoDB连接已关闭')
      process.exit(0)
    })
    
  } catch (error) {
    logger.error('MongoDB连接失败:', error)
    process.exit(1)
  }
}

module.exports = connectDB