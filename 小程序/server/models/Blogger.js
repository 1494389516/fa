// models/Blogger.js - 博主数据模型
const mongoose = require('mongoose')

const bloggerSchema = new mongoose.Schema({
  // 抖音用户ID
  douyinUserId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // 基本信息
  nickname: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  avatar: {
    type: String,
    default: ''
  },
  signature: {
    type: String,
    default: '',
    maxlength: 500
  },
  
  // 统计信息
  followerCount: {
    type: Number,
    default: 0,
    min: 0
  },
  videoCount: {
    type: Number,
    default: 0,
    min: 0
  },
  likeCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // 认证信息
  isVerified: {
    type: Boolean,
    default: false
  },
  verifyInfo: {
    type: String,
    default: ''
  },
  
  // 视频信息
  lastVideoTime: {
    type: Date
  },
  lastVideoId: {
    type: String
  },
  
  // 更新信息
  lastUpdateTime: {
    type: Date,
    default: Date.now
  },
  updateCount: {
    type: Number,
    default: 0
  },
  
  // 状态信息
  isActive: {
    type: Boolean,
    default: true
  },
  
  // 额外信息
  tags: [{
    type: String,
    trim: true
  }],
  category: {
    type: String,
    default: ''
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

// 索引
bloggerSchema.index({ douyinUserId: 1 })
bloggerSchema.index({ nickname: 'text', signature: 'text' })
bloggerSchema.index({ followerCount: -1 })
bloggerSchema.index({ lastVideoTime: -1 })
bloggerSchema.index({ lastUpdateTime: -1 })
bloggerSchema.index({ isActive: 1, lastUpdateTime: -1 })

// 虚拟字段：粉丝数格式化
bloggerSchema.virtual('followerCountFormatted').get(function() {
  const count = this.followerCount
  if (count >= 10000) {
    return (count / 10000).toFixed(1) + '万'
  } else if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'k'
  }
  return count.toString()
})

// 虚拟字段：视频数格式化
bloggerSchema.virtual('videoCountFormatted').get(function() {
  const count = this.videoCount
  if (count >= 10000) {
    return (count / 10000).toFixed(1) + '万'
  } else if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'k'
  }
  return count.toString()
})

// 虚拟字段：是否最近活跃
bloggerSchema.virtual('isRecentlyActive').get(function() {
  if (!this.lastVideoTime) return false
  const daysDiff = (Date.now() - this.lastVideoTime.getTime()) / (1000 * 60 * 60 * 24)
  return daysDiff <= 7 // 7天内有更新视频
})

// 实例方法：更新博主信息
bloggerSchema.methods.updateInfo = function(bloggerData) {
  this.nickname = bloggerData.nickname || this.nickname
  this.avatar = bloggerData.avatar || this.avatar
  this.signature = bloggerData.signature || this.signature
  this.followerCount = bloggerData.followerCount || this.followerCount
  this.videoCount = bloggerData.videoCount || this.videoCount
  this.likeCount = bloggerData.likeCount || this.likeCount
  this.isVerified = bloggerData.isVerified !== undefined ? bloggerData.isVerified : this.isVerified
  this.verifyInfo = bloggerData.verifyInfo || this.verifyInfo
  this.lastUpdateTime = new Date()
  this.updateCount += 1
  
  return this.save()
}

// 实例方法：更新最新视频信息
bloggerSchema.methods.updateLatestVideo = function(videoId, publishTime) {
  this.lastVideoId = videoId
  this.lastVideoTime = publishTime
  this.lastUpdateTime = new Date()
  
  return this.save()
}

// 静态方法：根据抖音用户ID查找或创建博主
bloggerSchema.statics.findOrCreate = async function(douyinUserId, bloggerData) {
  let blogger = await this.findOne({ douyinUserId })
  
  if (blogger) {
    // 更新现有博主信息
    await blogger.updateInfo(bloggerData)
  } else {
    // 创建新博主
    blogger = new this({
      douyinUserId,
      ...bloggerData
    })
    await blogger.save()
  }
  
  return blogger
}

// 静态方法：获取热门博主
bloggerSchema.statics.getPopularBloggers = function(limit = 20) {
  return this.find({ isActive: true })
    .sort({ followerCount: -1, lastVideoTime: -1 })
    .limit(limit)
}

// 静态方法：获取最近活跃的博主
bloggerSchema.statics.getRecentlyActiveBloggers = function(days = 7, limit = 20) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)
  
  return this.find({
    isActive: true,
    lastVideoTime: { $gte: cutoffDate }
  })
    .sort({ lastVideoTime: -1 })
    .limit(limit)
}

// 静态方法：搜索博主
bloggerSchema.statics.searchBloggers = function(keyword, limit = 20) {
  return this.find({
    isActive: true,
    $or: [
      { nickname: { $regex: keyword, $options: 'i' } },
      { signature: { $regex: keyword, $options: 'i' } },
      { tags: { $in: [new RegExp(keyword, 'i')] } }
    ]
  })
    .sort({ followerCount: -1 })
    .limit(limit)
}

// 静态方法：获取需要更新的博主
bloggerSchema.statics.getBloggersNeedUpdate = function(hours = 1) {
  const cutoffDate = new Date()
  cutoffDate.setHours(cutoffDate.getHours() - hours)
  
  return this.find({
    isActive: true,
    lastUpdateTime: { $lte: cutoffDate }
  })
    .sort({ lastUpdateTime: 1 })
}

// 中间件：保存前处理
bloggerSchema.pre('save', function(next) {
  // 清理标签
  if (this.tags && this.tags.length > 0) {
    this.tags = this.tags.filter(tag => tag && tag.trim())
      .map(tag => tag.trim())
      .slice(0, 10) // 最多10个标签
  }
  
  next()
})

// 中间件：删除前清理相关数据
bloggerSchema.pre('remove', async function(next) {
  try {
    // 删除相关的监控配置
    await mongoose.model('MonitorConfig').deleteMany({ bloggerId: this._id })
    
    // 删除相关的视频更新记录
    await mongoose.model('VideoUpdate').deleteMany({ bloggerId: this._id })
    
    next()
  } catch (error) {
    next(error)
  }
})

module.exports = mongoose.model('Blogger', bloggerSchema)