// models/User.js - 用户数据模型
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const userSchema = new mongoose.Schema({
  // 微信信息
  wechatOpenId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  wechatUnionId: {
    type: String,
    index: true
  },
  
  // 抖音信息
  douyinUserId: {
    type: String,
    index: true
  },
  douyinAccessToken: {
    type: String
  },
  douyinRefreshToken: {
    type: String
  },
  tokenExpireTime: {
    type: Date
  },
  
  // 用户基本信息
  nickname: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  avatar: {
    type: String,
    default: ''
  },
  
  // 用户设置
  settings: {
    monitorInterval: {
      type: Number,
      default: 5,
      min: 1,
      max: 60
    },
    pushEnabled: {
      type: Boolean,
      default: true
    },
    pushTime: {
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
    autoRefresh: {
      type: Boolean,
      default: true
    },
    soundEnabled: {
      type: Boolean,
      default: true
    },
    vibrationEnabled: {
      type: Boolean,
      default: true
    }
  },
  
  // 状态信息
  isActive: {
    type: Boolean,
    default: true
  },
  lastLoginTime: {
    type: Date,
    default: Date.now
  },
  lastActiveTime: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      // 删除敏感信息
      delete ret.douyinAccessToken
      delete ret.douyinRefreshToken
      delete ret.__v
      return ret
    }
  }
})

// 索引
userSchema.index({ wechatOpenId: 1 })
userSchema.index({ douyinUserId: 1 })
userSchema.index({ createdAt: -1 })
userSchema.index({ lastActiveTime: -1 })

// 虚拟字段：是否绑定抖音
userSchema.virtual('isDouyinBound').get(function() {
  return !!(this.douyinUserId && this.douyinAccessToken)
})

// 虚拟字段：token是否过期
userSchema.virtual('isTokenExpired').get(function() {
  if (!this.tokenExpireTime) return true
  return new Date() > this.tokenExpireTime
})

// 实例方法：更新最后活跃时间
userSchema.methods.updateLastActive = function() {
  this.lastActiveTime = new Date()
  return this.save()
}

// 实例方法：检查推送时间
userSchema.methods.isInPushTime = function() {
  if (!this.settings.pushEnabled) return false
  
  const now = new Date()
  const currentTime = now.getHours().toString().padStart(2, '0') + ':' + 
                     now.getMinutes().toString().padStart(2, '0')
  
  const startTime = this.settings.pushTime.start
  const endTime = this.settings.pushTime.end
  
  // 处理跨天的情况
  if (startTime <= endTime) {
    return currentTime >= startTime && currentTime <= endTime
  } else {
    return currentTime >= startTime || currentTime <= endTime
  }
}

// 实例方法：更新抖音token
userSchema.methods.updateDouyinToken = function(accessToken, refreshToken, expiresIn) {
  this.douyinAccessToken = accessToken
  this.douyinRefreshToken = refreshToken
  this.tokenExpireTime = new Date(Date.now() + expiresIn * 1000)
  return this.save()
}

// 静态方法：根据微信openId查找用户
userSchema.statics.findByWechatOpenId = function(openId) {
  return this.findOne({ wechatOpenId: openId })
}

// 静态方法：根据抖音userId查找用户
userSchema.statics.findByDouyinUserId = function(userId) {
  return this.findOne({ douyinUserId: userId })
}

// 静态方法：获取活跃用户
userSchema.statics.getActiveUsers = function(days = 30) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)
  
  return this.find({
    isActive: true,
    lastActiveTime: { $gte: cutoffDate }
  })
}

// 静态方法：获取需要刷新token的用户
userSchema.statics.getUsersNeedTokenRefresh = function() {
  const now = new Date()
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000)
  
  return this.find({
    isActive: true,
    douyinAccessToken: { $exists: true, $ne: null },
    tokenExpireTime: { $lte: oneHourLater }
  })
}

// 中间件：保存前处理
userSchema.pre('save', function(next) {
  // 更新修改时间
  this.updatedAt = new Date()
  next()
})

// 中间件：删除前清理相关数据
userSchema.pre('remove', async function(next) {
  try {
    // 删除相关的监控配置
    await mongoose.model('MonitorConfig').deleteMany({ userId: this._id })
    
    // 删除相关的视频更新记录
    await mongoose.model('VideoUpdate').deleteMany({ userId: this._id })
    
    next()
  } catch (error) {
    next(error)
  }
})

module.exports = mongoose.model('User', userSchema)