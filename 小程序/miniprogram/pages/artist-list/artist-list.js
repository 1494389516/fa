// pages/artist-list/artist-list.js - 歌手列表页面
import api from '../../utils/api.js'
import authService from '../../utils/auth.js'
import { PAGE_PATHS } from '../../utils/constants.js'

Page({
  data: {
    // 歌手列表
    artistList: [],
    // 监控状态映射
    monitorStatusMap: {},
    // 加载状态
    loading: false,
    refreshing: false,
    loadingMore: false,
    hasMore: true,
    // 分页信息
    currentPage: 1,
    pageSize: 20,
    // 搜索相关
    searchKeyword: '',
    showSearch: false,
    searchResults: [],
    // 筛选相关
    currentFilter: 'all', // all, monitoring, popular, recent
    filterOptions: [
      { key: 'all', name: '全部歌手', icon: '🎤' },
      { key: 'monitoring', name: '监控中', icon: '🔔' },
      { key: 'popular', name: '热门歌手', icon: '🔥' },
      { key: 'recent', name: '最近活跃', icon: '⚡' }
    ],
    // 地区筛选
    regionFilter: 'all',
    regionOptions: [
      { key: 'all', name: '全部地区' },
      { key: 'mainland', name: '内地' },
      { key: 'hongkong', name: '港台' },
      { key: 'korea', name: '韩国' },
      { key: 'japan', name: '日本' },
      { key: 'western', name: '欧美' }
    ],
    // 错误状态
    error: null,
    // 空状态类型
    emptyType: 'no-data'
  },

  onLoad() {
    console.log('歌手列表页面加载')
    this.checkAuthAndLoad()
  },

  onShow() {
    // 刷新监控状态
    this.refreshMonitorStatus()
  },

  onPullDownRefresh() {
    this.refreshArtistList()
  },

  onReachBottom() {
    this.loadMoreArtists()
  },

  // 检查授权并加载数据
  async checkAuthAndLoad() {
    try {
      if (!authService.checkLoginStatus()) {
        this.navigateToAuth()
        return
      }

      await this.loadArtistList()
    } catch (error) {
      console.error('检查授权失败:', error)
      this.setData({
        error: '加载失败，请重试',
        emptyType: 'error'
      })
    }
  },

  // 加载歌手列表
  async loadArtistList(reset = true) {
    if (this.data.loading) return

    try {
      this.setData({
        loading: reset,
        error: null
      })

      const page = reset ? 1 : this.data.currentPage + 1
      const params = {
        page,
        limit: this.data.pageSize,
        filter: this.data.currentFilter,
        region: this.data.regionFilter !== 'all' ? this.data.regionFilter : undefined,
        keyword: this.data.searchKeyword || undefined
      }

      const response = await api.get('/artists/list', params)

      if (response.code === 0) {
        const newArtists = response.data.artists || []
        const artistList = reset ? newArtists : [...this.data.artistList, ...newArtists]

        this.setData({
          artistList,
          currentPage: page,
          hasMore: newArtists.length >= this.data.pageSize,
          loading: false,
          refreshing: false,
          loadingMore: false,
          emptyType: artistList.length === 0 ? this.getEmptyType() : null
        })

        // 加载监控状态
        await this.loadMonitorStatus(artistList)
      } else {
        throw new Error(response.message)
      }
    } catch (error) {
      console.error('加载歌手列表失败:', error)
      this.setData({
        loading: false,
        refreshing: false,
        loadingMore: false,
        error: error.message || '加载失败',
        emptyType: 'error'
      })
    } finally {
      wx.stopPullDownRefresh()
    }
  },

  // 加载监控状态
  async loadMonitorStatus(artists) {
    try {
      const artistIds = artists.map(artist => artist._id)
      const response = await api.post('/artists/monitor-status', { artistIds })

      if (response.code === 0) {
        const statusMap = {}
        response.data.forEach(item => {
          statusMap[item.artistId] = item.isMonitoring
        })

        this.setData({
          monitorStatusMap: {
            ...this.data.monitorStatusMap,
            ...statusMap
          }
        })
      }
    } catch (error) {
      console.error('加载监控状态失败:', error)
    }
  },

  // 刷新歌手列表
  refreshArtistList() {
    this.setData({
      refreshing: true,
      currentPage: 1,
      hasMore: true
    })
    this.loadArtistList(true)
  },

  // 加载更多歌手
  loadMoreArtists() {
    if (!this.data.hasMore || this.data.loadingMore) return

    this.setData({
      loadingMore: true
    })
    this.loadArtistList(false)
  },

  // 刷新监控状态
  async refreshMonitorStatus() {
    if (this.data.artistList.length > 0) {
      await this.loadMonitorStatus(this.data.artistList)
    }
  },

  // 获取空状态类型
  getEmptyType() {
    if (this.data.searchKeyword) {
      return 'search'
    } else if (this.data.currentFilter === 'monitoring') {
      return 'no-monitor'
    } else {
      return 'no-data'
    }
  },

  // 监控开关切换
  async onMonitorSwitchChange(e) {
    const { artist, isMonitoring } = e.detail

    try {
      wx.showLoading({
        title: isMonitoring ? '开启监控...' : '关闭监控...',
        mask: true
      })

      const response = isMonitoring 
        ? await api.post('/artists/monitor', { artistId: artist._id })
        : await api.delete(`/artists/monitor/${artist._id}`)

      wx.hideLoading()

      if (response.code === 0) {
        // 更新本地状态
        this.setData({
          [`monitorStatusMap.${artist._id}`]: isMonitoring
        })

        wx.showToast({
          title: isMonitoring ? '监控已开启' : '监控已关闭',
          icon: 'success',
          duration: 1500
        })
      } else {
        throw new Error(response.message)
      }
    } catch (error) {
      wx.hideLoading()
      console.error('切换监控状态失败:', error)
      
      wx.showModal({
        title: '操作失败',
        content: error.message || '网络错误，请重试',
        showCancel: false
      })
    }
  },

  // 点击歌手卡片
  onArtistCardTap(e) {
    const { artist } = e.detail
    
    // 跳转到歌手详情页面
    wx.navigateTo({
      url: `/pages/artist-detail/artist-detail?artistId=${artist._id}`
    })
  },

  // 长按歌手卡片
  onArtistCardLongPress(e) {
    const { artist } = e.detail
    const isMonitoring = this.data.monitorStatusMap[artist._id]

    wx.showActionSheet({
      itemList: [
        isMonitoring ? '关闭监控' : '开启监控',
        '查看详情',
        '分享歌手'
      ],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.onMonitorSwitchChange({
              detail: { artist, isMonitoring: !isMonitoring }
            })
            break
          case 1:
            this.onArtistCardTap({ detail: { artist } })
            break
          case 2:
            this.shareArtist(artist)
            break
        }
      }
    })
  },

  // 分享歌手
  shareArtist(artist) {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
  },

  // 切换筛选条件
  onFilterChange(e) {
    const filter = e.currentTarget.dataset.filter
    
    if (filter === this.data.currentFilter) return

    this.setData({
      currentFilter: filter,
      currentPage: 1,
      hasMore: true
    })

    this.loadArtistList(true)
  },

  // 切换地区筛选
  onRegionFilterChange(e) {
    const region = e.detail.value
    const selectedRegion = this.data.regionOptions[region]

    this.setData({
      regionFilter: selectedRegion.key,
      currentPage: 1,
      hasMore: true
    })

    this.loadArtistList(true)
  },

  // 显示搜索
  onShowSearch() {
    this.setData({
      showSearch: true
    })
  },

  // 隐藏搜索
  onHideSearch() {
    this.setData({
      showSearch: false,
      searchKeyword: '',
      searchResults: []
    })

    if (this.data.searchKeyword) {
      this.loadArtistList(true)
    }
  },

  // 搜索输入
  onSearchInput(e) {
    const keyword = e.detail.value.trim()
    this.setData({
      searchKeyword: keyword
    })

    // 防抖搜索
    clearTimeout(this.searchTimer)
    this.searchTimer = setTimeout(() => {
      if (keyword) {
        this.searchArtists(keyword)
      } else {
        this.setData({
          searchResults: []
        })
      }
    }, 500)
  },

  // 搜索歌手
  async searchArtists(keyword) {
    try {
      const response = await api.get('/artists/search', { keyword, limit: 10 })

      if (response.code === 0) {
        this.setData({
          searchResults: response.data.artists || []
        })
      }
    } catch (error) {
      console.error('搜索歌手失败:', error)
    }
  },

  // 选择搜索结果
  onSelectSearchResult(e) {
    const artist = e.currentTarget.dataset.artist
    
    this.setData({
      showSearch: false,
      searchKeyword: artist.name,
      searchResults: []
    })

    this.loadArtistList(true)
  },

  // 重试加载
  onRetry() {
    this.loadArtistList(true)
  },

  // 跳转到授权页面
  navigateToAuth() {
    wx.reLaunch({
      url: PAGE_PATHS.AUTH
    })
  },

  // 跳转到QQ音乐登录
  navigateToMusicLogin() {
    wx.navigateTo({
      url: '/pages/music-login/music-login'
    })
  }
})