// pages/blogger-list/blogger-list.js
import authService from '../../utils/auth.js'

Page({
  data: {
    searchKeyword: '',
    filterType: 'all', // all, monitoring, not_monitoring
    loading: false,
    stats: {
      total: 0,
      monitoring: 0,
      notMonitoring: 0
    },
    bloggers: []
  },

  onLoad() {
    this.checkAuthAndLoad()
  },

  onShow() {
    this.loadBloggerList()
  },

  onPullDownRefresh() {
    this.onRefresh()
  },

  // 检查认证状态并加载
  checkAuthAndLoad() {
    if (!authService.hasDouyinAuth()) {
      wx.showModal({
        title: '未连接抖音',
        content: '请先连接抖音账号才能查看关注的博主',
        confirmText: '去连接',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/douyin-auth/douyin-auth'
            })
          } else {
            wx.switchTab({
              url: '/pages/dashboard/dashboard'
            })
          }
        }
      })
      return
    }

    // 显示数据说明
    wx.showModal({
      title: '数据说明',
      content: '当前显示的是演示数据。\n\n真实场景下，这里会显示您在抖音APP中关注的博主列表，并可以设置监控他们的最新动态。',
      confirmText: '了解',
      showCancel: false,
      success: () => {
        this.loadBloggerList()
      }
    })
  },

  // 加载博主列表
  async loadBloggerList() {
    if (this.data.loading) return

    try {
      this.setData({ loading: true })

      // 演示数据（真实场景下会从抖音API获取）
      const mockBloggers = [
        {
          id: '1',
          nickname: '美食达人小王 [演示]',
          signature: '分享各种美食制作技巧 - 这是演示数据',
          avatar: '/images/avatar1.jpg',
          followerCount: '128.5万',
          videoCount: '245',
          newVideoCount: 3,
          isMonitoring: true,
          isOnline: true,
          latestVideo: {
            title: '教你做正宗川菜回锅肉',
            publishTime: '2小时前'
          }
        },
        {
          id: '2',
          nickname: '旅行摄影师 [演示]',
          signature: '用镜头记录世界的美好 - 这是演示数据',
          avatar: '/images/avatar2.jpg',
          followerCount: '89.2万',
          videoCount: '156',
          newVideoCount: 1,
          isMonitoring: true,
          isOnline: false,
          latestVideo: {
            title: '西藏拉萨布达拉宫日出',
            publishTime: '1天前'
          }
        },
        {
          id: '3',
          nickname: '健身教练阿强 [演示]',
          signature: '科学健身，健康生活 - 这是演示数据',
          avatar: '/images/avatar3.jpg',
          followerCount: '45.8万',
          videoCount: '89',
          newVideoCount: 0,
          isMonitoring: false,
          isOnline: true
        },
        {
          id: '4',
          nickname: '萌宠日记 [演示]',
          signature: '记录毛孩子们的日常 - 这是演示数据',
          avatar: '/images/avatar4.jpg',
          followerCount: '67.3万',
          videoCount: '234',
          newVideoCount: 2,
          isMonitoring: true,
          isOnline: true,
          latestVideo: {
            title: '小猫咪第一次见雪的反应',
            publishTime: '30分钟前'
          }
        },
        {
          id: '5',
          nickname: '科技评测君 [演示]',
          signature: '专业数码产品评测 - 这是演示数据',
          avatar: '/images/avatar5.jpg',
          followerCount: '156.7万',
          videoCount: '178',
          newVideoCount: 0,
          isMonitoring: false,
          isOnline: false
        }
      ]

      // 计算统计数据
      const stats = {
        total: mockBloggers.length,
        monitoring: mockBloggers.filter(b => b.isMonitoring).length,
        notMonitoring: mockBloggers.filter(b => !b.isMonitoring).length
      }

      this.setData({
        bloggers: this.filterBloggers(mockBloggers),
        stats,
        loading: false
      })

    } catch (error) {
      console.error('加载博主列表失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
      wx.stopPullDownRefresh()
    }
  },

  // 筛选博主
  filterBloggers(bloggers) {
    let filtered = bloggers

    // 按类型筛选
    if (this.data.filterType === 'monitoring') {
      filtered = filtered.filter(b => b.isMonitoring)
    } else if (this.data.filterType === 'not_monitoring') {
      filtered = filtered.filter(b => !b.isMonitoring)
    }

    // 按关键词筛选
    if (this.data.searchKeyword) {
      const keyword = this.data.searchKeyword.toLowerCase()
      filtered = filtered.filter(b => 
        b.nickname.toLowerCase().includes(keyword) ||
        (b.signature && b.signature.toLowerCase().includes(keyword))
      )
    }

    return filtered
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value
    })
    this.loadBloggerList()
  },

  // 清除搜索
  onClearSearch() {
    this.setData({
      searchKeyword: ''
    })
    this.loadBloggerList()
  },

  // 筛选类型改变
  onFilterChange(e) {
    const filterType = e.currentTarget.dataset.type
    this.setData({
      filterType
    })
    this.loadBloggerList()
  },

  // 刷新
  onRefresh() {
    this.loadBloggerList()
  },

  // 博主卡片点击
  onBloggerTap(e) {
    const blogger = e.currentTarget.dataset.blogger
    wx.showToast({
      title: `点击了 ${blogger.nickname}`,
      icon: 'none'
    })
  },

  // 监控开关改变
  onSwitchChange(e) {
    const id = e.currentTarget.dataset.id
    const value = e.detail.value
    
    // 更新本地数据
    const bloggers = this.data.bloggers.map(blogger => {
      if (blogger.id === id) {
        return { ...blogger, isMonitoring: value }
      }
      return blogger
    })

    // 重新计算统计数据
    const stats = {
      total: bloggers.length,
      monitoring: bloggers.filter(b => b.isMonitoring).length,
      notMonitoring: bloggers.filter(b => !b.isMonitoring).length
    }

    this.setData({
      bloggers,
      stats
    })

    wx.showToast({
      title: value ? '已开启监控' : '已关闭监控',
      icon: 'success'
    })
  }
})