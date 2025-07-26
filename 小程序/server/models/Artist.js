// models/Artist.js - 歌手数据模型
const mongoose = require('mongoose')

const artistSchema = new mongoose.Schema({
  // QQ音乐歌手ID
  qqMusicArtistId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // 基本信息
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  avatar: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: '',
    maxlength: 1000
  },
  
  // 统计信息
  fanCount: {
    type: Number,
    default: 0,
    min: 0
  },
  songCount: {
    type: Number,
    default: 0,
    min: 0
  },
  albumCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // 歌手类型和标签
  type: {
    type: String,
    enum: ['solo', 'group', 'band'],
    default: 'solo'
  },
  genres: [{
    type: String,
    trim: true
  }],
  tags: [{
    type: String,
    trim: true
  }],
  
  // 地区信息
  region: {
    type: String,
    enum: ['mainland', 'hongkong', 'taiwan', 'korea', 'japan', 'western', 'other'],
    default: 'other'
  },
  
  // 歌曲信息
  latestSongTime: {
    type: Date
  },
  latestSongId: {
    type: String
  },
  latestAlbumTime: {
    type: Date
  },
  latestAlbumId: {
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
  company: {
    type: String,
    default: ''
  },
  debutYear: {
    type: Number
  },
  socialMedia: {
    weibo: String,
    instagram: String,
    twitter: String
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
artistSchema.index({ qqMusicArtistId: 1 })
artistSchema.index({ name: 'text', description: 'text' })
artistSchema.index({ fanCount: -1 })
artistSchema.index({ latestSongTime: -1 })
artistSchema.index({ lastUpdateTime: -1 })
artistSchema.index({ isActive: 1, lastUpdateTime: -1 })
artistSchema.index({ region: 1, genres: 1 })

// 虚拟字段：粉丝数格式化
artistSchema.virtual('fanCountFormatted').get(function() {
  const count = this.fanCount
  if (count >= 10000) {
    return (count / 10000).toFixed(1) + '万'
  } else if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'k'
  }
  return count.toString()
})

// 虚拟字段：歌曲数格式化
artistSchema.virtual('songCountFormatted').get(function() {
  const count = this.songCount
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'k'
  }
  return count.toString()
})

// 虚拟字段：是否最近活跃
artistSchema.virtual('isRecentlyActive').get(function() {
  if (!this.latestSongTime) return false
  const daysDiff = (Date.now() - this.latestSongTime.getTime()) / (1000 * 60 * 60 * 24)
  return daysDiff <= 30 // 30天内有新歌
})

// 实例方法：更新歌手信息
artistSchema.methods.updateInfo = function(artistData) {
  this.name = artistData.name || this.name
  this.avatar = artistData.avatar || this.avatar
  this.description = artistData.description || this.description
  this.fanCount = artistData.fanCount || this.fanCount
  this.songCount = artistData.songCount || this.songCount
  this.albumCount = artistData.albumCount || this.albumCount
  this.type = artistData.type || this.type
  this.region = artistData.region || this.region
  this.company = artistData.company || this.company
  this.lastUpdateTime = new Date()
  this.updateCount += 1
  
  return this.save()
}

// 实例方法：更新最新歌曲信息
artistSchema.methods.updateLatestSong = function(songId, releaseTime) {
  this.latestSongId = songId
  this.latestSongTime = releaseTime
  this.lastUpdateTime = new Date()
  
  return this.save()
}

// 实例方法：更新最新专辑信息
artistSchema.methods.updateLatestAlbum = function(albumId, releaseTime) {
  this.latestAlbumId = albumId
  this.latestAlbumTime = releaseTime
  this.lastUpdateTime = new Date()
  
  return this.save()
}

// 静态方法：根据QQ音乐歌手ID查找或创建歌手
artistSchema.statics.findOrCreate = async function(qqMusicArtistId, artistData) {
  let artist = await this.findOne({ qqMusicArtistId })
  
  if (artist) {
    // 更新现有歌手信息
    await artist.updateInfo(artistData)
  } else {
    // 创建新歌手
    artist = new this({
      qqMusicArtistId,
      ...artistData
    })
    await artist.save()
  }
  
  return artist
}

// 静态方法：获取热门歌手
artistSchema.statics.getPopularArtists = function(limit = 20) {
  return this.find({ isActive: true })
    .sort({ fanCount: -1, latestSongTime: -1 })
    .limit(limit)
}

// 静态方法：获取最近活跃的歌手
artistSchema.statics.getRecentlyActiveArtists = function(days = 30, limit = 20) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)
  
  return this.find({
    isActive: true,
    latestSongTime: { $gte: cutoffDate }
  })
    .sort({ latestSongTime: -1 })
    .limit(limit)
}

// 静态方法：按地区获取歌手
artistSchema.statics.getArtistsByRegion = function(region, limit = 20) {
  return this.find({
    isActive: true,
    region: region
  })
    .sort({ fanCount: -1 })
    .limit(limit)
}

// 静态方法：按类型获取歌手
artistSchema.statics.getArtistsByGenre = function(genre, limit = 20) {
  return this.find({
    isActive: true,
    genres: { $in: [genre] }
  })
    .sort({ fanCount: -1 })
    .limit(limit)
}

// 静态方法：搜索歌手
artistSchema.statics.searchArtists = function(keyword, limit = 20) {
  return this.find({
    isActive: true,
    $or: [
      { name: { $regex: keyword, $options: 'i' } },
      { description: { $regex: keyword, $options: 'i' } },
      { tags: { $in: [new RegExp(keyword, 'i')] } }
    ]
  })
    .sort({ fanCount: -1 })
    .limit(limit)
}

// 静态方法：获取需要更新的歌手
artistSchema.statics.getArtistsNeedUpdate = function(hours = 2) {
  const cutoffDate = new Date()
  cutoffDate.setHours(cutoffDate.getHours() - hours)
  
  return this.find({
    isActive: true,
    lastUpdateTime: { $lte: cutoffDate }
  })
    .sort({ lastUpdateTime: 1 })
}

// 中间件：保存前处理
artistSchema.pre('save', function(next) {
  // 清理标签和类型数组
  if (this.genres && this.genres.length > 0) {
    this.genres = this.genres.filter(genre => genre && genre.trim())
      .map(genre => genre.trim())
      .slice(0, 10) // 最多10个类型
  }
  
  if (this.tags && this.tags.length > 0) {
    this.tags = this.tags.filter(tag => tag && tag.trim())
      .map(tag => tag.trim())
      .slice(0, 15) // 最多15个标签
  }
  
  next()
})

// 中间件：删除前清理相关数据
artistSchema.pre('remove', async function(next) {
  try {
    // 删除相关的监控配置
    await mongoose.model('ArtistMonitorConfig').deleteMany({ artistId: this._id })
    
    // 删除相关的歌曲更新记录
    await mongoose.model('SongUpdate').deleteMany({ artistId: this._id })
    
    next()
  } catch (error) {
    next(error)
  }
})

module.exports = mongoose.model('Artist', artistSchema)