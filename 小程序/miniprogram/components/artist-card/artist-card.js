// components/artist-card/artist-card.js - 歌手卡片组件
import { formatCount, formatRelativeTime } from '../../utils/utils.js'
import logger from '../../utils/logger.js'

Component({
  properties: {
    // 歌手信息
    artist: {
      type: Object,
      value: {},
      observer: function(newVal) {
        this.updateArtistInfo(newVal)
      }
    },
    
    // 是否显示监控开关
    showSwitch: {
      type: Boolean,
      value: true
    },
    
    // 监控状态
    isMonitoring: {
      type: Boolean,
      value: false
    },
    
    // 是否禁用
    disabled: {
      type: Boolean,
      value: false
    },
    
    // 卡片样式
    cardStyle: {
      type: String,
      value: 'default' // default, compact, detailed
    }
  },

  data: {
    // 格式化后的歌手信息
    formattedArtist: {},
    // 动画状态
    animating: false
  },

  lifetimes: {
    attached() {
      this.updateArtistInfo(this.properties.artist)
    }
  },

  methods: {
    // 更新歌手信息
    updateArtistInfo(artist) {
      if (!artist || !artist.name) return

      const formattedArtist = {
        ...artist,
        fanCountText: formatCount(artist.fanCount || 0),
        songCountText: formatCount(artist.songCount || 0),
        albumCountText: formatCount(artist.albumCount || 0),
        avatarUrl: artist.avatar || '/images/default-artist.png',
        regionText: this.getRegionText(artist.region),
        typeText: this.getTypeText(artist.type),
        lastActiveText: this.formatLastActive(artist.latestSongTime)
      }

      this.setData({
        formattedArtist
      })
    },



    // 获取地区文本
    getRegionText(region) {
      const regionMap = {
        'mainland': '内地',
        'hongkong': '港台',
        'taiwan': '港台',
        'korea': '韩国',
        'japan': '日本',
        'western': '欧美',
        'other': '其他'
      }
      return regionMap[region] || '其他'
    },

    // 获取类型文本
    getTypeText(type) {
      const typeMap = {
        'solo': '独唱',
        'group': '组合',
        'band': '乐队'
      }
      return typeMap[type] || '歌手'
    },

    // 格式化最后活跃时间
    formatLastActive(latestSongTime) {
      if (!latestSongTime) return '暂无新歌'

      const now = new Date()
      const lastTime = new Date(latestSongTime)
      const diffMs = now - lastTime
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      if (diffDays === 0) {
        return '今天发歌'
      } else if (diffDays === 1) {
        return '昨天发歌'
      } else if (diffDays <= 7) {
        return `${diffDays}天前发歌`
      } else if (diffDays <= 30) {
        const weeks = Math.floor(diffDays / 7)
        return `${weeks}周前发歌`
      } else if (diffDays <= 365) {
        const months = Math.floor(diffDays / 30)
        return `${months}个月前发歌`
      } else {
        return '很久未发歌'
      }
    },

    // 监控开关切换
    onSwitchChange(e) {
      if (this.properties.disabled) return

      const isMonitoring = e.detail.value
      
      logger.logUserAction('歌手监控切换', {
        artistId: this.properties.artist._id,
        artistName: this.properties.artist.name,
        isMonitoring
      })
      
      this.setData({
        animating: true
      })

      // 触发父组件事件
      this.triggerEvent('switchchange', {
        artist: this.properties.artist,
        isMonitoring: isMonitoring
      })

      // 动画结束后重置状态
      setTimeout(() => {
        this.setData({
          animating: false
        })
      }, 300)
    },

    // 点击卡片
    onCardTap() {
      if (this.properties.disabled) return

      this.triggerEvent('cardtap', {
        artist: this.properties.artist
      })
    },

    // 点击头像
    onAvatarTap() {
      this.triggerEvent('avatartap', {
        artist: this.properties.artist
      })
    },

    // 长按卡片
    onCardLongPress() {
      if (this.properties.disabled) return

      wx.vibrateShort()
      
      this.triggerEvent('cardlongpress', {
        artist: this.properties.artist
      })
    },

    // 头像加载失败
    onAvatarError() {
      this.setData({
        'formattedArtist.avatarUrl': '/images/default-artist.png'
      })
    }
  }
})