// components/blogger-card/blogger-card.js - 博主卡片组件
import { formatCount, formatRelativeTime } from '../../utils/utils.js'
import logger from '../../utils/logger.js'

Component({
  properties: {
    // 博主信息
    blogger: {
      type: Object,
      value: {},
      observer: function(newVal) {
        this.updateBloggerInfo(newVal)
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
    },

    // 是否显示统计信息
    showStats: {
      type: Boolean,
      value: true
    },

    // 是否显示在线状态
    showOnlineStatus: {
      type: Boolean,
      value: true
    }
  },

  data: {
    // 格式化后的博主信息
    formattedBlogger: {},
    // 动画状态
    animating: false,
    // 悬停状态
    hovering: false,
    // 在线状态
    onlineStatus: 'unknown', // online, offline, unknown
    // 卡片动画数据
    cardAnimation: {},
    // 头像动画数据
    avatarAnimation: {}
  },

  lifetimes: {
    attached() {
      this.updateBloggerInfo(this.properties.blogger)
      this.initAnimations()
      this.checkOnlineStatus()
    },

    detached() {
      // 清理定时器
      if (this.onlineStatusTimer) {
        clearInterval(this.onlineStatusTimer)
      }
    }
  },

  methods: {
    // 更新博主信息
    updateBloggerInfo(blogger) {
      if (!blogger || !blogger.nickname) return

      const formattedBlogger = {
        ...blogger,
        followerCountText: formatCount(blogger.followerCount || 0),
        videoCountText: formatCount(blogger.videoCount || 0),
        avatarUrl: blogger.avatar || '/images/default-avatar.png',
        isVerifiedUser: blogger.isVerified || false,
        lastActiveText: this.formatLastActive(blogger.lastVideoTime)
      }

      this.setData({
        formattedBlogger
      })
    },



    // 格式化最后活跃时间
    formatLastActive(lastVideoTime) {
      if (!lastVideoTime) return '暂无更新'

      const now = new Date()
      const lastTime = new Date(lastVideoTime)
      const diffMs = now - lastTime
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      if (diffDays === 0) {
        return '今天更新'
      } else if (diffDays === 1) {
        return '昨天更新'
      } else if (diffDays <= 7) {
        return `${diffDays}天前更新`
      } else if (diffDays <= 30) {
        const weeks = Math.floor(diffDays / 7)
        return `${weeks}周前更新`
      } else {
        return '很久未更新'
      }
    },

    // 监控开关切换
    onSwitchChange(e) {
      if (this.properties.disabled) return

      const isMonitoring = e.detail.value
      
      logger.logUserAction('博主监控切换', {
        bloggerId: this.properties.blogger._id,
        bloggerName: this.properties.blogger.nickname,
        isMonitoring
      })
      
      this.setData({
        animating: true
      })

      // 触发父组件事件
      this.triggerEvent('switchchange', {
        blogger: this.properties.blogger,
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
        blogger: this.properties.blogger
      })
    },

    // 点击头像
    onAvatarTap() {
      this.triggerEvent('avatartap', {
        blogger: this.properties.blogger
      })
    },

    // 长按卡片
    onCardLongPress() {
      if (this.properties.disabled) return

      wx.vibrateShort()
      
      this.triggerEvent('cardlongpress', {
        blogger: this.properties.blogger
      })
    },

    // 头像加载失败
    onAvatarError() {
      this.setData({
        'formattedBlogger.avatarUrl': '/images/default-avatar.png'
      })
    },

    // 初始化动画
    initAnimations() {
      const cardAnimation = wx.createAnimation({
        duration: 300,
        timingFunction: 'ease-out'
      })

      const avatarAnimation = wx.createAnimation({
        duration: 200,
        timingFunction: 'ease-out'
      })

      this.cardAnimation = cardAnimation
      this.avatarAnimation = avatarAnimation
    },

    // 检查在线状态
    checkOnlineStatus() {
      if (!this.properties.showOnlineStatus) return

      const blogger = this.properties.blogger
      if (!blogger.lastVideoTime) {
        this.setData({ onlineStatus: 'unknown' })
        return
      }

      const now = new Date()
      const lastTime = new Date(blogger.lastVideoTime)
      const diffHours = (now - lastTime) / (1000 * 60 * 60)

      let status = 'offline'
      if (diffHours <= 24) {
        status = 'online'
      } else if (diffHours <= 72) {
        status = 'offline'
      } else {
        status = 'unknown'
      }

      this.setData({ onlineStatus: status })

      // 定期更新在线状态
      if (!this.onlineStatusTimer) {
        this.onlineStatusTimer = setInterval(() => {
          this.checkOnlineStatus()
        }, 60000) // 每分钟检查一次
      }
    },

    // 卡片悬停开始
    onCardTouchStart() {
      if (this.properties.disabled) return

      this.setData({ hovering: true })

      // 卡片悬停动画
      this.cardAnimation.scale(0.98).step()
      this.setData({
        cardAnimation: this.cardAnimation.export()
      })

      // 头像旋转动画
      this.avatarAnimation.rotate(5).step()
      this.setData({
        avatarAnimation: this.avatarAnimation.export()
      })
    },

    // 卡片悬停结束
    onCardTouchEnd() {
      this.setData({ hovering: false })

      // 恢复卡片动画
      this.cardAnimation.scale(1).step()
      this.setData({
        cardAnimation: this.cardAnimation.export()
      })

      // 恢复头像动画
      this.avatarAnimation.rotate(0).step()
      this.setData({
        avatarAnimation: this.avatarAnimation.export()
      })
    },

    // 获取在线状态文本
    getOnlineStatusText() {
      switch (this.data.onlineStatus) {
        case 'online':
          return '最近活跃'
        case 'offline':
          return '离线'
        default:
          return '未知'
      }
    },

    // 获取活跃度等级
    getActivityLevel() {
      const blogger = this.properties.blogger
      if (!blogger.lastVideoTime) return 0

      const now = new Date()
      const lastTime = new Date(blogger.lastVideoTime)
      const diffDays = (now - lastTime) / (1000 * 60 * 60 * 24)

      if (diffDays <= 1) return 5 // 非常活跃
      if (diffDays <= 3) return 4 // 很活跃
      if (diffDays <= 7) return 3 // 活跃
      if (diffDays <= 30) return 2 // 一般
      return 1 // 不活跃
    },

    // 获取活跃度颜色
    getActivityColor() {
      const level = this.getActivityLevel()
      const colors = {
        5: '#00ff88', // 绿色
        4: '#00d4ff', // 蓝色
        3: '#ffaa00', // 橙色
        2: '#ff6b35', // 红橙色
        1: '#666666'  // 灰色
      }
      return colors[level] || colors[1]
    }
  }
})