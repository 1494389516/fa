// models/ArtistMonitorConfig.js - 歌手监控配置数据模型
const mongoose = require('mongoose')

const artistMonitorConfigSchema = new mongoose.Schema({
  // 用户ID
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // 歌手ID
  artistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Artist',
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
      default: 30,
      min: 5,
      max: 1440 // 最长24小时
    },
    
    // 是否推送通知
    pushEnabled: {
      type: Boolean,
      default: true
    },
    
    // 监控类型
    monitorTypes: [{
      type: String,
      enum: ['new_song', 'new_album', 'new_mv', 'concert'],
      default: ['new_song']
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
    }],
    
    // 语言过滤
    languages: [{
      type: String,
      enum: ['chinese', 'english', 'japanese', 'korean', 'other']
    }],
    
    // 类型过滤
    genres: [{
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
    
    // 最后检查的歌曲ID
    lastSongId: {
      type: String,
      default: ''
    },
    
    // 最后检查的专辑ID
    lastAlbumId: {
      type: String,
      default: ''
    },
    
    // 检查次数
    checkCount: {
      type: Number,
      default: 0
    },
    
    // 发现新歌次数
    newSongCount: {
      type: Number,
      default: 0
    },
    
    // 发现新专辑次数
    newAlbumCount: {
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
  },
  
  // 用户偏好设置
  preferences: {
    // 推送时间段
    pushTimeRange: {
      start: {
        type: String,
        default: '08:00',
        validate: {
          validator: function(v) {
            return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v)
          },
          message: '时间格式错误，应为HH:MM'
        }
      },
      end: {
        type: String,
        default: '22:00',
        validate: {
          validator: function(v) {
            return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v)
          },
          message: '时间格式错误，应为HH:MM'
        }
      }
    },
    
    // 推送优先级
    priority: {
      type: String,
      enum: ['low', 'normal', 'high'],
      default: 'normal'
    },
    
    // 是否推送歌词
    includeLyrics: {
      type: Boolean,
      default: false
    },
    
    // 是否推送MV
    includeMV: {
      type: Boolean,
      default: true
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
artistMonitorConfigSchema.index({ userId: 1, artistId: 1 }, { unique: true })
artistMonitorConfigSchema.index({ isActive: 1, 'status.lastCheckTime': 1 })
artistMonitorConfigSchema.index({ userId: 1, isActive: 1 })
artistMonitorConfigSchema.index({ artistId: 1, isActive: 1 })

// 虚拟字段：是否需要检查
artistMonitorConfigSchema.virtual('needsCheck').get(function() {
  if (!this.isActive) return false
  
  const now = new Date()
  const lastCheck = this.status.lastCheckTime
  const interval = this.config.checkInterval * 60 * 1000 // 转换为毫秒
  
  return (now - lastCheck) >= interval
})

// 虚拟字段：监控时长（天）
artistMonitorConfigSchema.virtual('monitorDays').get(function() {
  const now = new Date()
  const created = this.createdAt
  return Math.floor((now - created) / (1000 * 60 * 60 * 24))
})

// 虚拟字段：是否在推送时间段内
artistMonitorConfigSchema.virtual('isInPushTime').get(function() {
  const now = new Date()
  const currentTime = now.getHours().toString().padStart(2, '0') + ':' + 
                     now.getMinutes().toString().padStart(2, '0')
  
  const startTime = this.preferences.pushTimeRange.start
  const endTime = this.preferences.pushTimeRange.end
  
  // 处理跨天的情况
  if (startTime <= endTime) {
    return currentTime >= startTime && currentTime <= endTime
  } else {
    return currentTime >= startTime || currentTime <= endTime
  }
})

// 实例方法：更新检查状态
artistMonitorConfigSchema.methods.updateCheckStatus = function(songId = null, albumId = null, error = null) {
  this.status.lastCheckTime = new Date()
  this.status.checkCount += 1
  
  if (songId) {
    this.status.lastSongId = songId
    this.status.newSongCount += 1
  }
  
  if (albumId) {
    this.status.lastAlbumId = albumId
    this.status.newAlbumCount += 1
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
artistMonitorConfigSchema.methods.updatePushStatus = function() {
  this.status.pushCount += 1
  this.status.lastPushTime = new Date()
  
  return this.save()
}

// 实例方法：重置错误状态
artistMonitorConfigSchema.methods.resetErrorStatus = function() {
  this.status.errorCount = 0
  this.status.lastErrorTime = null
  this.status.lastError = ''
  
  return this.save()
}

// 实例方法：暂停监控
artistMonitorConfigSchema.methods.pause = function() {
  this.isActive = false
  return this.save()
}

// 实例方法：恢复监控
artistMonitorConfigSchema.methods.resume = function() {
  this.isActive = true
  this.resetErrorStatus()
  return this.save()
}

// 实例方法：检查内容是否匹配过滤条件
artistMonitorConfigSchema.methods.matchesFilters = function(songData) {
  // 检查关键词过滤
  if (this.config.keywords && this.config.keywords.length > 0) {
    const hasKeyword = this.config.keywords.some(keyword => 
      songData.title.toLowerCase().includes(keyword.toLowerCase())
    )
    if (!hasKeyword) return false
  }
  
  // 检查排除关键词
  if (this.config.excludeKeywords && this.config.excludeKeywords.length > 0) {
    const hasExcludeKeyword = this.config.excludeKeywords.some(keyword => 
      songData.title.toLowerCase().includes(keyword.toLowerCase())
    )
    if (hasExcludeKeyword) return false
  }
  
  // 检查语言过滤
  if (this.config.languages && this.config.languages.length > 0) {
    if (!this.config.languages.includes(songData.language)) return false
  }
  
  // 检查类型过滤
  if (this.config.genres && this.config.genres.length > 0) {
    const hasGenre = this.config.genres.some(genre => 
      songData.genres && songData.genres.includes(genre)
    )
    if (!hasGenre) return false
  }
  
  return true
}

// 静态方法：获取用户的监控配置
artistMonitorConfigSchema.statics.getUserConfigs = function(userId, isActive = null) {
  const query = { userId }
  if (isActive !== null) {
    query.isActive = isActive
  }
  
  return this.find(query)
    .populate('artistId', 'name avatar fanCount region')
    .sort({ createdAt: -1 })
}

// 静态方法：获取歌手的监控配置
artistMonitorConfigSchema.statics.getArtistConfigs = function(artistId, isActive = true) {
  return this.find({ artistId, isActive })
    .populate('userId', 'nickname settings.pushEnabled')
    .sort({ createdAt: -1 })
}

// 静态方法：获取需要检查的监控配置
artistMonitorConfigSchema.statics.getConfigsNeedCheck = function(limit = 100) {
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
artistMonitorConfigSchema.statics.getMonitorStats = function(userId = null) {
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
        totalNewSongs: { $sum: '$status.newSongCount' },
        totalNewAlbums: { $sum: '$status.newAlbumCount' },
        totalPushes: { $sum: '$status.pushCount' },
        totalErrors: { $sum: '$status.errorCount' },
        avgSuccessRate: { $avg: '$stats.successRate' }
      }
    }
  ])
}

// 中间件：保存前处理
artistMonitorConfigSchema.pre('save', function(next) {
  // 清理关键词数组
  if (this.config.keywords) {
    this.config.keywords = this.config.keywords
      .filter(keyword => keyword && keyword.trim())
      .map(keyword => keyword.trim())
      .slice(0, 20)
  }
  
  if (this.config.excludeKeywords) {
    this.config.excludeKeywords = this.config.excludeKeywords
      .filter(keyword => keyword && keyword.trim())
      .map(keyword => keyword.trim())
      .slice(0, 20)
  }
  
  if (this.config.genres) {
    this.config.genres = this.config.genres
      .filter(genre => genre && genre.trim())
      .map(genre => genre.trim())
      .slice(0, 10)
  }
  
  next()
})

// 中间件：删除前清理相关数据
artistMonitorConfigSchema.pre('remove', async function(next) {
  try {
    // 删除相关的歌曲更新记录
    await mongoose.model('SongUpdate').deleteMany({
      userId: this.userId,
      artistId: this.artistId
    })
    
    next()
  } catch (error) {
    next(error)
  }
})

module.exports = mongoose.model('ArtistMonitorConfig', artistMonitorConfigSchema)