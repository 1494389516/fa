// models/MonitorConfig.js - 监控配置数据模型
const mongoose = require('mongoose')

const monitorConfigSchema = new mongoose.Schema({
  // 用户ID
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // 博主ID
  bloggerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Blogger',
    required: true,
    index: true
  },
  
  // 监控状态
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // 监控配置
  config: {
    // 检查间隔（分钟）
    checkInterval: {
      type: Number,
      default: 5,
      min: 1,
      max: 60
    },
    
    // 是否推送通知
    pushEnabled: {
      type: Boolean,
      default: true
    },
    
    // 推送类型
    pushTypes: [{
      type: String,
      enum: ['new_video', 'live_start', 'live_end'],
      default: ['new_video']
    }],
    
    // 关键词过滤
    keywords: [{
      type: String,
      trim: true,
      maxlength: 50
    }],
    
    // 排除关键词
    excludeKeywords: [{
      type: String,
      trim: true,
      maxlength: 50
    }]
  },
  
  // 监控状态信息
  status: {
    // 最后检查时间
    lastCheckTime: {
      type: Date,
      default: Date.now
    },
    
    // 最后检查的视频ID
    lastVideoId: {
      type: String,
      default: ''
    },
    
    // 检查次数
    checkCount: {
      type: Number,
      default: 0
    },
    
    // 发现新视频次数
    newVideoCount: {
      type: Number,
      default: 0
    },
    
    // 推送次数
    pushCount: {
      type: Number,
      default: 0
    },
    
    // 最后推送时间
    lastPushTime: {
      type: Date
    },
    
    // 错误次数
    errorCount: {
      type: Number,
      default: 0
    },
    
    // 最后错误时间
    lastErrorTime: {
      type: Date
    },
    
    // 最后错误信息
    lastError: {
      type: String,
      default: ''
    }
  },
  
  // 统计信息
  stats: {
    // 总监控时长（小时）
    totalMonitorHours: {
      type: Number,
      default: 0
    },
    
    // 平均响应时间（毫秒）
    avgResponseTime: {
      type: Number,
      default: 0
    },
    
    // 成功率
    successRate: {
      type: Number,
      default: 100,
      min: 0,
      max: 100
    }
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.__v
      return ret
    }
  }
})

// 复合索引
monitorConfigSchema.index({ userId: 1, bloggerId: 1 }, { unique: true })
monitorConfigSchema.index({ isActive: 1, 'status.lastCheckTime': 1 })
monitorConfigSchema.index({ userId: 1, isActive: 1 })
monitorConfigSchema.index({ bloggerId: 1, isActive: 1 })

// 虚拟字段：是否需要检查
monitorConfigSchema.virtual('needsCheck').get(function() {
  if (!this.isActive) return false
  
  const now = new Date()
  const lastCheck = this.status.lastCheckTime
  const interval = this.config.checkInterval * 60 * 1000 // 转换为毫秒
  
  return (now - lastCheck) >= interval
})

// 虚拟字段：监控时长（天）
monitorConfigSchema.virtual('monitorDays').get(function() {
  const now = new Date()
  const created = this.createdAt
  return Math.floor((now - created) / (1000 * 60 * 60 * 24))
})

// 实例方法：更新检查状态
monitorConfigSchema.methods.updateCheckStatus = function(videoId = null, error = null) {
  this.status.lastCheckTime = new Date()
  this.status.checkCount += 1
  
  if (videoId) {
    this.status.lastVideoId = videoId
    this.status.newVideoCount += 1
  }
  
  if (error) {
    this.status.errorCount += 1
    this.status.lastErrorTime = new Date()
    this.status.lastError = error.toString()
  }
  
  // 更新成功率
  this.stats.successRate = ((this.status.checkCount - this.status.errorCount) / this.status.checkCount) * 100
  
  return this.save()
}

// 实例方法：更新推送状态
monitorConfigSchema.methods.updatePushStatus = function() {
  this.status.pushCount += 1
  this.status.lastPushTime = new Date()
  
  return this.save()
}

// 实例方法：重置错误状态
monitorConfigSchema.methods.resetErrorStatus = function() {
  this.status.errorCount = 0
  this.status.lastErrorTime = null
  this.status.lastError = ''
  
  return this.save()
}

// 实例方法：暂停监控
monitorConfigSchema.methods.pause = function() {
  this.isActive = false
  return this.save()
}

// 实例方法：恢复监控
monitorConfigSchema.methods.resume = function() {
  this.isActive = true
  this.resetErrorStatus()
  return this.save()
}

// 静态方法：获取用户的监控配置
monitorConfigSchema.statics.getUserConfigs = function(userId, isActive = null) {
  const query = { userId }
  if (isActive !== null) {
    query.isActive = isActive
  }
  
  return this.find(query)
    .populate('bloggerId', 'nickname avatar followerCount isVerified')
    .sort({ createdAt: -1 })
}

// 静态方法：获取博主的监控配置
monitorConfigSchema.statics.getBloggerConfigs = function(bloggerId, isActive = true) {
  return this.find({ bloggerId, isActive })
    .populate('userId', 'nickname settings.pushEnabled')
    .sort({ createdAt: -1 })
}

// 静态方法：获取需要检查的监控配置
monitorConfigSchema.statics.getConfigsNeedCheck = function(limit = 100) {
  const now = new Date()
  
  return this.aggregate([
    {
      $match: {
        isActive: true
      }
    },
    {
      $addFields: {
        nextCheckTime: {
          $add: [
            '$status.lastCheckTime',
            { $multiply: ['$config.checkInterval', 60000] }
          ]
        }
      }
    },
    {
      $match: {
        nextCheckTime: { $lte: now }
      }
    },
    {
      $sort: {
        'status.lastCheckTime': 1
      }
    },
    {
      $limit: limit
    }
  ])
}

// 静态方法：获取监控统计
monitorConfigSchema.statics.getMonitorStats = function(userId = null) {
  const matchStage = userId ? { userId: new mongoose.Types.ObjectId(userId) } : {}
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalConfigs: { $sum: 1 },
        activeConfigs: {
          $sum: { $cond: ['$isActive', 1, 0] }
        },
        totalChecks: { $sum: '$status.checkCount' },
        totalNewVideos: { $sum: '$status.newVideoCount' },
        totalPushes: { $sum: '$status.pushCount' },
        totalErrors: { $sum: '$status.errorCount' },
        avgSuccessRate: { $avg: '$stats.successRate' }
      }
    }
  ])
}

// 中间件：保存前处理
monitorConfigSchema.pre('save', function(next) {
  // 清理关键词数组
  if (this.config.keywords) {
    this.config.keywords = this.config.keywords
      .filter(keyword => keyword && keyword.trim())
      .map(keyword => keyword.trim())
      .slice(0, 20) // 最多20个关键词
  }
  
  if (this.config.excludeKeywords) {
    this.config.excludeKeywords = this.config.excludeKeywords
      .filter(keyword => keyword && keyword.trim())
      .map(keyword => keyword.trim())
      .slice(0, 20) // 最多20个排除关键词
  }
  
  next()
})

// 中间件：删除前清理相关数据
monitorConfigSchema.pre('remove', async function(next) {
  try {
    // 删除相关的视频更新记录
    await mongoose.model('VideoUpdate').deleteMany({
      userId: this.userId,
      bloggerId: this.bloggerId
    })
    
    next()
  } catch (error) {
    next(error)
  }
})

module.exports = mongoose.model('MonitorConfig', monitorConfigSchema)