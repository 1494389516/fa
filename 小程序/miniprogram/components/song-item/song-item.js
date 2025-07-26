// components/song-item/song-item.js - 歌曲条目组件
import { formatCount, formatDuration, formatRelativeTime } from '../../utils/utils.js'
import logger from '../../utils/logger.js'

Component({
  properties: {
    // 歌曲信息
    song: {
      type: Object,
      value: {},
      observer: function(newVal) {
        this.updateSongInfo(newVal)
      }
    },
    
    // 是否显示歌手信息
    showArtist: {
      type: Boolean,
      value: true
    },
    
    // 是否显示统计数据
    showStats: {
      type: Boolean,
      value: true
    },
    
    // 条目样式
    itemStyle: {
      type: String,
      value: 'default' // default, compact, card
    },
    
    // 是否已读
    isRead: {
      type: Boolean,
      value: false
    },
    
    // 是否收藏
    isFavorited: {
      type: Boolean,
      value: false
    }
  },

  data: {
    // 格式化后的歌曲信息
    formattedSong: {},
    // 图片加载状态
    imageLoaded: false,
    // 播放状态
    isPlaying: false
  },

  lifetimes: {
    attached() {
      this.updateSongInfo(this.properties.song)
    }
  },

  methods: {
    // 更新歌曲信息
    updateSongInfo(song) {
      if (!song || !song.title) return

      const formattedSong = {
        ...song,
        coverUrl: song.cover || '/images/default-song-cover.png',
        titleText: song.title || '无标题',
        durationText: formatDuration(song.duration || 0),
        releaseTimeText: this.formatReleaseTime(song.releaseTime),
        playCountText: formatCount(song.stats?.playCount || 0),
        likeCountText: formatCount(song.stats?.likeCount || 0),
        commentCountText: formatCount(song.stats?.commentCount || 0),
        shareCountText: formatCount(song.stats?.shareCount || 0),
        artistName: song.artist?.name || '未知歌手',
        artistAvatar: song.artist?.avatar || '/images/default-artist.png',
        albumName: song.album?.name || '',
        languageText: this.getLanguageText(song.content?.language)
      }

      this.setData({
        formattedSong
      })
    },



    // 格式化发布时间
    formatReleaseTime(releaseTime) {
      if (!releaseTime) return '未知时间'

      const now = new Date()
      const releaseDate = new Date(releaseTime)
      const diffMs = now - releaseDate
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      if (diffMinutes < 1) {
        return '刚刚发布'
      } else if (diffMinutes < 60) {
        return `${diffMinutes}分钟前`
      } else if (diffHours < 24) {
        return `${diffHours}小时前`
      } else if (diffDays < 7) {
        return `${diffDays}天前`
      } else {
        return releaseDate.toLocaleDateString('zh-CN', {
          month: 'short',
          day: 'numeric'
        })
      }
    },



    // 获取语言文本
    getLanguageText(language) {
      const languageMap = {
        'chinese': '中文',
        'english': '英文',
        'japanese': '日文',
        'korean': '韩文',
        'other': '其他'
      }
      return languageMap[language] || ''
    },

    // 点击歌曲
    onSongTap() {
      this.triggerEvent('songtap', {
        song: this.properties.song
      })
    },

    // 点击歌手
    onArtistTap() {
      this.triggerEvent('artisttap', {
        artist: this.properties.song.artist
      })
    },

    // 长按歌曲
    onSongLongPress() {
      wx.vibrateShort()
      
      this.triggerEvent('songlongpress', {
        song: this.properties.song
      })
    },

    // 封面加载完成
    onCoverLoad() {
      this.setData({
        imageLoaded: true
      })
    },

    // 封面加载失败
    onCoverError() {
      this.setData({
        'formattedSong.coverUrl': '/images/default-song-cover.png',
        imageLoaded: true
      })
    },

    // 播放/暂停
    onPlayTap() {
      const isPlaying = !this.data.isPlaying
      this.setData({
        isPlaying
      })

      this.triggerEvent('songplay', {
        song: this.properties.song,
        isPlaying: isPlaying
      })
    },

    // 收藏/取消收藏
    onFavoriteTap() {
      this.triggerEvent('songfavorite', {
        song: this.properties.song,
        isFavorited: !this.properties.isFavorited
      })
    },

    // 分享歌曲
    onShareTap() {
      this.triggerEvent('songshare', {
        song: this.properties.song
      })
    },

    // 下载歌曲
    onDownloadTap() {
      this.triggerEvent('songdownload', {
        song: this.properties.song
      })
    }
  }
})