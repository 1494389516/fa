// components/video-item/video-item.js - 视频条目组件
import { formatCount, formatDuration, formatRelativeTime } from '../../utils/utils.js'
import logger from '../../utils/logger.js'

Component({
  properties: {
    // 视频信息
    video: {
      type: Object,
      value: {},
      observer: function(newVal) {
        this.updateVideoInfo(newVal)
      }
    },
    
    // 是否显示博主信息
    showBlogger: {
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
    }
  },

  data: {
    // 格式化后的视频信息
    formattedVideo: {},
    // 图片加载状态
    imageLoaded: false
  },

  lifetimes: {
    attached() {
      this.updateVideoInfo(this.properties.video)
    }
  },

  methods: {
    // 更新视频信息
    updateVideoInfo(video) {
      if (!video || !video.title) return

      const formattedVideo = {
        ...video,
        coverUrl: video.cover || '/images/default-cover.png',
        titleText: video.title || '无标题',
        durationText: formatDuration(video.duration || 0),
        publishTimeText: this.formatPublishTime(video.publishTime),
        playCountText: formatCount(video.stats?.playCount || 0),
        likeCountText: formatCount(video.stats?.likeCount || 0),
        commentCountText: formatCount(video.stats?.commentCount || 0),
        shareCountText: formatCount(video.stats?.shareCount || 0),
        bloggerName: video.blogger?.nickname || '未知博主',
        bloggerAvatar: video.blogger?.avatar || '/images/default-avatar.png',
        isVerified: video.blogger?.isVerified || false
      }

      this.setData({
        formattedVideo
      })
    },



    // 格式化发布时间
    formatPublishTime(publishTime) {
      if (!publishTime) return '未知时间'

      const now = new Date()
      const publishDate = new Date(publishTime)
      const diffMs = now - publishDate
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
        return publishDate.toLocaleDateString('zh-CN', {
          month: 'short',
          day: 'numeric'
        })
      }
    },



    // 点击视频
    onVideoTap() {
      this.triggerEvent('videotap', {
        video: this.properties.video
      })
    },

    // 点击博主
    onBloggerTap() {
      this.triggerEvent('bloggertap', {
        blogger: this.properties.video.blogger
      })
    },

    // 长按视频
    onVideoLongPress() {
      wx.vibrateShort()
      
      this.triggerEvent('videolongpress', {
        video: this.properties.video
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
        'formattedVideo.coverUrl': '/images/default-cover.png',
        imageLoaded: true
      })
    },

    // 分享视频
    onShareTap() {
      this.triggerEvent('videoshare', {
        video: this.properties.video
      })
    },

    // 收藏视频
    onFavoriteTap() {
      this.triggerEvent('videofavorite', {
        video: this.properties.video
      })
    }
  }
})