// pages/history/history.js - 更新历史页面
import api from '../../utils/api.js'
import authService from '../../utils/auth.js'
import logger from '../../utils/logger.js'
import { formatRelativeTime, formatCount } from '../../utils/utils.js'

Page({
  data: {
    // 当前标签页
    activeTab: 'all', // all, videos, songs
    // 更新列表
    updates: [],
    // 分页信息
    page: 1,
    limit: 20,
    total: 0,
    hasMore: true,
    // 加载状态
    loading: false,
    refreshing: false,
    loadingMore: false,
    // 筛选条件
    filterType: 'all', // all, unread, read
    dateRange: 'week', // today, week, month, all
    // 统计信息
    stats: {
      totalVideos: 0,
      totalSongs: 0,
      unreadVideos: 0,
      unreadSongs: 0,
      todayVideos: 0,
      todaySongs: 0
    },
    // 批量操作
    batchMode: false,
    selectedItems: []
  },

  onLoad(options) {
    logger.info('更新历史页面加载', options)
    
    // 检查登录状态
    if (!authService.checkLoginStatus()) {
      wx.reLaunch({
        url: '/pages/auth/auth'
      })
      return
    }

    // 从参数中获取初始标签页
    if (options.tab) {
      this.setData({ activeTab: options.tab })
    }

    this.loadUpdates()
    this.loadStats()
  },

  onShow() {
    // 页面显示时刷新数据
    if (this.data.updates.length > 0) {
      this.refreshUpdates()
    }
  },

  onPullDownRefresh() {
    this.refreshUpdates()
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loadingMore) {
      this.loadMoreUpdates()
    }
  },

  // 切换标签页
  switchTab(e) {
    const { tab } = e.currentTarget.dataset
    if (tab === this.data.activeTab) return

    this.setData({ 
      activeTab: tab,
      updates: [],
      page: 1,
      hasMore: true
    })
    
    this.loadUpdates()
  },

  // 加载更新列表
  async loadUpdates() {
    if (this.data.loading) return

    try {
      this.setData({ loading: true })

      const updates = await this.fetchUpdates(1)
      
      this.setData({
        updates,
        page: 1,
        hasMore: updates.length >= this.data.limit
      })

      logger.info('更新列表加载成功', { 
        tab: this.data.activeTab,
        count: updates.length 
      })

    } catch (error) {
      logger.error('加载更新列表失败', error)
      this.showError('加载失败', error.message)
    } finally {
      this.setData({ loading: false })
    }
  },

  // 刷新更新列表
  async refreshUpdates() {
    if (this.data.refreshing) return

    try {
      this.setData({ refreshing: true })
      
      await Promise.all([
        this.loadUpdates(),
        this.loadStats()
      ])
      
      wx.showToast({
        title: '刷新成功',
        icon: 'success',
        duration: 1500
      })

    } catch (error) {
      logger.error('刷新更新列表失败', error)
    } finally {
      this.setData({ refreshing: false })
      wx.stopPullDownRefresh()
    }
  },

  // 加载更多更新
  async loadMoreUpdates() {
    if (this.data.loadingMore || !this.data.hasMore) return

    try {
      this.setData({ loadingMore: true })

      const nextPage = this.data.page + 1
      const newUpdates = await this.fetchUpdates(nextPage)
      
      if (newUpdates.length > 0) {
        const allUpdates = [...this.data.updates, ...newUpdates]
        
        this.setData({
          updates: allUpdates,
          page: nextPage,
          hasMore: newUpdates.length >= this.data.limit
        })

        logger.info('加载更多更新成功', { count: newUpdates.length })
      } else {
        this.setData({ hasMore: false })
      }

    } catch (error) {
      logger.error('加载更多更新失败', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loadingMore: false })
    }
  },

  // 获取更新数据
  async fetchUpdates(page) {
    const { activeTab, filterType, dateRange, limit } = this.data
    const params = { page, limit, filterType, dateRange }

    let allUpdates = []

    // 根据标签页获取不同类型的更新
    if (activeTab === 'all' || activeTab === 'videos') {
      if (authService.hasDouyinAuth()) {
        try {
          const videoResponse = await api.get('/videos/updates', params)
          if (videoResponse.code === 0) {
            const videos = videoResponse.data.list.map(item => ({
              ...item,
              type: 'video',
              sortTime: new Date(item.createdAt).getTime()
            }))
            allUpdates.push(...videos)
          }
        } catch (error) {
          logger.error('获取视频更新失败', error)
        }
      }
    }

    if (activeTab === 'all' || activeTab === 'songs') {
      if (authService.hasQQMusicAuth()) {
        try {
          const songResponse = await api.get('/songs/updates', params)
          if (songResponse.code === 0) {
            const songs = songResponse.data.list.map(item => ({
              ...item,
              type: 'song',
              sortTime: new Date(item.createdAt).getTime()
            }))
            allUpdates.push(...songs)
          }
        } catch (error) {
          logger.error('获取歌曲更新失败', error)
        }
      }
    }

    // 按时间排序
    allUpdates.sort((a, b) => b.sortTime - a.sortTime)

    // 如果是混合模式，需要限制数量
    if (activeTab === 'all') {
      allUpdates = allUpdates.slice(0, limit)
    }

    return allUpdates
  },

  // 加载统计信息
  async loadStats() {
    try {
      const [videoStats, songStats] = await Promise.all([
        this.loadVideoStats(),
        this.loadSongStats()
      ])

      this.setData({
        stats: {
          ...videoStats,
          ...songStats
        }
      })

    } catch (error) {
      logger.error('加载统计信息失败', error)
    }
  },

  // 加载视频统计
  async loadVideoStats() {
    try {
      if (!authService.hasDouyinAuth()) {
        return {
          totalVideos: 0,
          unreadVideos: 0,
          todayVideos: 0
        }
      }

      const response = await api.get('/videos/stats')
      
      if (response.code === 0) {
        return {
          totalVideos: response.data.total || 0,
          unreadVideos: response.data.unread || 0,
          todayVideos: response.data.today || 0
        }
      }

    } catch (error) {
      logger.error('加载视频统计失败', error)
    }

    return {
      totalVideos: 0,
      unreadVideos: 0,
      todayVideos: 0
    }
  },

  // 加载歌曲统计
  async loadSongStats() {
    try {
      if (!authService.hasQQMusicAuth()) {
        return {
          totalSongs: 0,
          unreadSongs: 0,
          todaySongs: 0
        }
      }

      const response = await api.get('/songs/stats')
      
      if (response.code === 0) {
        return {
          totalSongs: response.data.total || 0,
          unreadSongs: response.data.unread || 0,
          todaySongs: response.data.today || 0
        }
      }

    } catch (error) {
      logger.error('加载歌曲统计失败', error)
    }

    return {
      totalSongs: 0,
      unreadSongs: 0,
      todaySongs: 0
    }
  },

  // 点击更新条目
  onUpdateTap(e) {
    const { update } = e.detail
    
    if (update.type === 'video') {
      wx.navigateTo({
        url: `/pages/video-detail/video-detail?id=${update._id}`
      })
    } else if (update.type === 'song') {
      wx.navigateTo({
        url: `/pages/song-detail/song-detail?id=${update._id}`
      })
    }
  },

  // 筛选类型改变
  onFilterTypeChange(e) {
    const filterTypes = ['all', 'unread', 'read']
    const filterType = filterTypes[e.detail.value]
    this.setData({ filterType })
    this.loadUpdates()
  },

  // 日期范围改变
  onDateRangeChange(e) {
    const dateRanges = ['today', 'week', 'month', 'all']
    const dateRange = dateRanges[e.detail.value]
    this.setData({ dateRange })
    this.loadUpdates()
  },

  // 显示错误信息
  showError(title, message) {
    wx.showModal({
      title: title || '错误',
      content: message || '操作失败，请稍后重试',
      showCancel: false
    })
  },

  // 格式化相对时间
  formatRelativeTime,
  
  // 格式化数量
  formatCount
})