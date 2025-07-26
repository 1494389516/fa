// models/SongUpdate.js - 歌曲更新记录数据模型
const mongoose = require('mongoose')

const songUpdateSchema = new mongoose.Schema({
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
  
  // QQ音乐歌曲ID
  songId: {
    type: String,
    required: true,
    index: true
  },
  
  // 歌曲基本信息
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
  releaseTime: {
    type: Date,
    required: true,
    index: true
  },
  duration: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // 专辑信息
  album: {
    id: String,
    name: String,
    cover: String
  },
  
  // 歌曲统计数据
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
  
  // 歌曲内容信息
  content: {
    lyrics: {
      type: String,
      default: '',
      maxlength: 5000
    },
    language: {
      type: String,
      enum: ['chinese', 'english', 'japanese', 'korean', 'other'],
      default: 'chinese'
    },
    genre: [{
      type: String,
      trim: true,
      maxlength: 50
    }],
    tags: [{
      type: String,
      trim: true,
      maxlength: 50
    }],
    composers: [{
      type: String,
      trim: true,
      maxlength: 100
    }],
    lyricists: [{
      type: String,
      trim: true,
      maxlength: 100
    }]
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
    },
    isFavorited: {
      type: Boolean,
      default: false
    },
    favoriteTime: {
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
    songUrl: String,
    downloadUrl: String,
    mvId: String,
    mvUrl: String,
    quality: {
      type: String,
      enum: ['standard', 'high', 'lossless'],
      default: 'standard'
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
songUpdateSchema.index({ userId: 1, releaseTime: -1 })
songUpdateSchema.index({ artistId: 1, releaseTime: -1 })
songUpdateSchema.index({ userId: 1, 'status.isRead': 1, releaseTime: -1 })
songUpdateSchema.index({ songId: 1, userId: 1 }, { unique: true })

// 虚拟字段：播放量格式化
songUpdateSchema.virtual('playCountFormatted').get(function() {
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

// 虚拟字段：时长格式化
songUpdateSchema.virtual('durationFormatted').get(function() {
  const seconds = this.duration
  if (seconds < 60) {
    return `${seconds}秒`
  } else {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }
})

// 虚拟字段：发布时间相对格式
songUpdateSchema.virtual('releaseTimeRelative').get(function() {
  const now = new Date()
  const releaseTime = this.releaseTime
  const diffMs = now - releaseTime
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffMinutes < 1) {
    return '刚刚发布'
  } else if (diffMinutes < 60) {
    return `${diffMinutes}分钟前发布`
  } else if (diffHours < 24) {
    return `${diffHours}小时前发布`
  } else if (diffDays < 7) {
    return `${diffDays}天前发布`
  } else {
    return releaseTime.toLocaleDateString('zh-CN')
  }
})

// 实例方法：标记为已读
songUpdateSchema.methods.markAsRead = function() {
  this.status.isRead = true
  this.status.readTime = new Date()
  return this.save()
}

// 实例方法：标记为已推送
songUpdateSchema.methods.markAsPushed = function(templateId, result) {
  this.status.isPushed = true
  this.status.pushTime = new Date()
  this.pushInfo.templateId = templateId
  this.pushInfo.pushResult = result
  return this.save()
}

// 实例方法：收藏/取消收藏
songUpdateSchema.methods.toggleFavorite = function() {
  this.status.isFavorited = !this.status.isFavorited
  this.status.favoriteTime = this.status.isFavorited ? new Date() : null
  return this.save()
}

// 实例方法：更新统计数据
songUpdateSchema.methods.updateStats = function(stats) {
  this.stats.playCount = stats.playCount || this.stats.playCount
  this.stats.likeCount = stats.likeCount || this.stats.likeCount
  this.stats.commentCount = stats.commentCount || this.stats.commentCount
  this.stats.shareCount = stats.shareCount || this.stats.shareCount
  this.stats.collectCount = stats.collectCount || this.stats.collectCount
  return this.save()
}

// 实例方法：重试推送
songUpdateSchema.methods.retryPush = function() {
  this.pushInfo.retryCount += 1
  this.pushInfo.lastRetryTime = new Date()
  return this.save()
}

// 静态方法：获取用户的歌曲更新
songUpdateSchema.statics.getUserUpdates = function(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    isRead = null,
    artistId = null,
    startDate = null,
    endDate = null,
    isFavorited = null
  } = options
  
  const query = { userId }
  
  if (isRead !== null) {
    query['status.isRead'] = isRead
  }
  
  if (isFavorited !== null) {
    query['status.isFavorited'] = isFavorited
  }
  
  if (artistId) {
    query.artistId = artistId
  }
  
  if (startDate || endDate) {
    query.releaseTime = {}
    if (startDate) query.releaseTime.$gte = startDate
    if (endDate) query.releaseTime.$lte = endDate
  }
  
  return this.find(query)
    .populate('artistId', 'name avatar fanCount region')
    .sort({ releaseTime: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
}

// 静态方法：获取歌手的歌曲更新
songUpdateSchema.statics.getArtistUpdates = function(artistId, limit = 20) {
  return this.find({ artistId })
    .sort({ releaseTime: -1 })
    .limit(limit)
}

// 静态方法：获取未推送的歌曲更新
songUpdateSchema.statics.getUnpushedUpdates = function(limit = 100) {
  return this.find({
    'status.isPushed': false,
    'pushInfo.retryCount': { $lt: 3 }
  })
    .populate('userId', 'settings.pushEnabled settings.pushTime')
    .populate('artistId', 'name avatar')
    .sort({ releaseTime: 1 })
    .limit(limit)
}

// 静态方法：获取用户收藏的歌曲
songUpdateSchema.statics.getUserFavorites = function(userId, options = {}) {
  const { page = 1, limit = 20 } = options
  
  return this.find({
    userId,
    'status.isFavorited': true
  })
    .populate('artistId', 'name avatar')
    .sort({ 'status.favoriteTime': -1 })
    .skip((page - 1) * limit)
    .limit(limit)
}

// 静态方法：获取统计信息
songUpdateSchema.statics.getUpdateStats = function(userId = null, days = 30) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)
  
  const matchStage = {
    releaseTime: { $gte: cutoffDate }
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
        favoritedUpdates: {
          $sum: { $cond: ['$status.isFavorited', 1, 0] }
        },
        totalPlays: { $sum: '$stats.playCount' },
        totalLikes: { $sum: '$stats.likeCount' },
        avgDuration: { $avg: '$duration' }
      }
    }
  ])
}

// 静态方法：清理旧数据
songUpdateSchema.statics.cleanOldData = function(days = 180) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)
  
  return this.deleteMany({
    releaseTime: { $lt: cutoffDate },
    'status.isRead': true,
    'status.isFavorited': false
  })
}

// 静态方法：检查歌曲是否已存在
songUpdateSchema.statics.songExists = function(userId, songId) {
  return this.findOne({ userId, songId })
}

// 静态方法：获取热门歌曲
songUpdateSchema.statics.getPopularSongs = function(days = 7, limit = 50) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)
  
  return this.find({
    releaseTime: { $gte: cutoffDate }
  })
    .sort({ 'stats.playCount': -1, 'stats.likeCount': -1 })
    .populate('artistId', 'name avatar')
    .limit(limit)
}

// 中间件：保存前处理
songUpdateSchema.pre('save', function(next) {
  // 清理标签和类型数组
  if (this.content.genre) {
    this.content.genre = this.content.genre
      .filter(genre => genre && genre.trim())
      .map(genre => genre.trim())
      .slice(0, 10)
  }
  
  if (this.content.tags) {
    this.content.tags = this.content.tags
      .filter(tag => tag && tag.trim())
      .map(tag => tag.trim())
      .slice(0, 15)
  }
  
  if (this.content.composers) {
    this.content.composers = this.content.composers
      .filter(composer => composer && composer.trim())
      .map(composer => composer.trim())
      .slice(0, 10)
  }
  
  if (this.content.lyricists) {
    this.content.lyricists = this.content.lyricists
      .filter(lyricist => lyricist && lyricist.trim())
      .map(lyricist => lyricist.trim())
      .slice(0, 10)
  }
  
  next()
})

module.exports = mongoose.model('SongUpdate', songUpdateSchema)