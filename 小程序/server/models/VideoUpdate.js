// models/VideoUpdate.js - 视频更新记录数据模型
const mongoose = require('mongoose')

const videoUpdateSchema = new mongoose.Schema({
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
  
  // 抖音视频ID
  videoId: {
    type: String,
    required: true,
    index: true
  },
  
  // 视频基本信息
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  cover: {
    type: String,
    default: ''
  },
  publishTime: {
    type: Date,
    required: true,
    index: true
  },
  duration: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // 视频统计数据
  stats: {
    playCount: {
      type: Number,
      default: 0,
      min: 0
    },
    likeCount: {
      type: Number,
      default: 0,
      min: 0
    },
    commentCount: {
      type: Number,
      default: 0,
      min: 0
    },
    shareCount: {
      type: Number,
      default: 0,
      min: 0
    },
    collectCount: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  
  // 视频内容信息
  content: {
    description: {
      type: String,
      default: '',
      maxlength: 1000
    },
    hashtags: [{
      type: String,
      trim: true,
      maxlength: 50
    }],
    mentions: [{
      type: String,
      trim: true,
      maxlength: 50
    }],
    music: {
      title: String,
      author: String,
      id: String
    }
  },
  
  // 用户状态
  status: {
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    isPushed: {
      type: Boolean,
      default: false,
      index: true
    },
    pushTime: {
      type: Date
    },
    readTime: {
      type: Date
    }
  },
  
  // 推送信息
  pushInfo: {
    templateId: String,
    pushResult: String,
    retryCount: {
      type: Number,
      default: 0
    },
    lastRetryTime: Date
  },
  
  // 额外信息
  extra: {
    videoUrl: String,
    webUrl: String,
    downloadUrl: String,
    thumbnails: [String]
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
videoUpdateSchema.index({ userId: 1, publishTime: -1 })
videoUpdateSchema.index({ bloggerId: 1, publishTime: -1 })
videoUpdateSchema.index({ userId: 1, 'status.isRead': 1, publishTime: -1 })
videoUpdateSchema.index({ videoId: 1, userId: 1 }, { unique: true })

// 虚拟字段：播放量格式化
videoUpdateSchema.virtual('playCountFormatted').get(function() {
  const count = this.stats.playCount
  if (count >= 100000000) {
    return (count / 100000000).toFixed(1) + '亿'
  } else if (count >= 10000) {
    return (count / 10000).toFixed(1) + '万'
  } else if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'k'
  }
  return count.toString()
})

// 虚拟字段：点赞量格式化
videoUpdateSchema.virtual('likeCountFormatted').get(function() {
  const count = this.stats.likeCount
  if (count >= 10000) {
    return (count / 10000).toFixed(1) + '万'
  } else if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'k'
  }
  return count.toString()
})

// 虚拟字段：时长格式化
videoUpdateSchema.virtual('durationFormatted').get(function() {
  const seconds = this.duration
  if (seconds < 60) {
    return `${seconds}秒`
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  } else {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }
})

// 虚拟字段：发布时间相对格式
videoUpdateSchema.virtual('publishTimeRelative').get(function() {
  const now = new Date()
  const publishTime = this.publishTime
  const diffMs = now - publishTime
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffMinutes < 1) {
    return '刚刚'
  } else if (diffMinutes < 60) {
    return `${diffMinutes}分钟前`
  } else if (diffHours < 24) {
    return `${diffHours}小时前`
  } else if (diffDays < 7) {
    return `${diffDays}天前`
  } else {
    return publishTime.toLocaleDateString('zh-CN')
  }
})

// 实例方法：标记为已读
videoUpdateSchema.methods.markAsRead = function() {
  this.status.isRead = true
  this.status.readTime = new Date()
  return this.save()
}

// 实例方法：标记为已推送
videoUpdateSchema.methods.markAsPushed = function(templateId, result) {
  this.status.isPushed = true
  this.status.pushTime = new Date()
  this.pushInfo.templateId = templateId
  this.pushInfo.pushResult = result
  return this.save()
}

// 实例方法：更新统计数据
videoUpdateSchema.methods.updateStats = function(stats) {
  this.stats.playCount = stats.playCount || this.stats.playCount
  this.stats.likeCount = stats.likeCount || this.stats.likeCount
  this.stats.commentCount = stats.commentCount || this.stats.commentCount
  this.stats.shareCount = stats.shareCount || this.stats.shareCount
  this.stats.collectCount = stats.collectCount || this.stats.collectCount
  return this.save()
}

// 实例方法：重试推送
videoUpdateSchema.methods.retryPush = function() {
  this.pushInfo.retryCount += 1
  this.pushInfo.lastRetryTime = new Date()
  return this.save()
}

// 静态方法：获取用户的视频更新
videoUpdateSchema.statics.getUserUpdates = function(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    isRead = null,
    bloggerId = null,
    startDate = null,
    endDate = null
  } = options
  
  const query = { userId }
  
  if (isRead !== null) {
    query['status.isRead'] = isRead
  }
  
  if (bloggerId) {
    query.bloggerId = bloggerId
  }
  
  if (startDate || endDate) {
    query.publishTime = {}
    if (startDate) query.publishTime.$gte = startDate
    if (endDate) query.publishTime.$lte = endDate
  }
  
  return this.find(query)
    .populate('bloggerId', 'nickname avatar isVerified')
    .sort({ publishTime: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
}

// 静态方法：获取博主的视频更新
videoUpdateSchema.statics.getBloggerUpdates = function(bloggerId, limit = 20) {
  return this.find({ bloggerId })
    .sort({ publishTime: -1 })
    .limit(limit)
}

// 静态方法：获取未推送的视频更新
videoUpdateSchema.statics.getUnpushedUpdates = function(limit = 100) {
  return this.find({
    'status.isPushed': false,
    'pushInfo.retryCount': { $lt: 3 }
  })
    .populate('userId', 'settings.pushEnabled settings.pushTime')
    .populate('bloggerId', 'nickname avatar')
    .sort({ publishTime: 1 })
    .limit(limit)
}

// 静态方法：获取统计信息
videoUpdateSchema.statics.getUpdateStats = function(userId = null, days = 30) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)
  
  const matchStage = {
    publishTime: { $gte: cutoffDate }
  }
  
  if (userId) {
    matchStage.userId = new mongoose.Types.ObjectId(userId)
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalUpdates: { $sum: 1 },
        readUpdates: {
          $sum: { $cond: ['$status.isRead', 1, 0] }
        },
        pushedUpdates: {
          $sum: { $cond: ['$status.isPushed', 1, 0] }
        },
        totalPlays: { $sum: '$stats.playCount' },
        totalLikes: { $sum: '$stats.likeCount' },
        avgDuration: { $avg: '$duration' }
      }
    }
  ])
}

// 静态方法：清理旧数据
videoUpdateSchema.statics.cleanOldData = function(days = 90) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)
  
  return this.deleteMany({
    publishTime: { $lt: cutoffDate },
    'status.isRead': true
  })
}

// 静态方法：检查视频是否已存在
videoUpdateSchema.statics.videoExists = function(userId, videoId) {
  return this.findOne({ userId, videoId })
}

// 中间件：保存前处理
videoUpdateSchema.pre('save', function(next) {
  // 清理hashtags和mentions
  if (this.content.hashtags) {
    this.content.hashtags = this.content.hashtags
      .filter(tag => tag && tag.trim())
      .map(tag => tag.trim())
      .slice(0, 20)
  }
  
  if (this.content.mentions) {
    this.content.mentions = this.content.mentions
      .filter(mention => mention && mention.trim())
      .map(mention => mention.trim())
      .slice(0, 10)
  }
  
  next()
})

module.exports = mongoose.model('VideoUpdate', videoUpdateSchema)