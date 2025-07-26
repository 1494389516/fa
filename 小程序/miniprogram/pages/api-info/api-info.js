// pages/api-info/api-info.js - API集成说明页面
Page({
  data: {
    apiInfo: [
      {
        platform: '抖音开放平台',
        status: '需要企业资质',
        requirements: [
          '企业开发者账号',
          '营业执照认证',
          '应用审核通过',
          '用户在抖音APP内授权'
        ],
        apis: [
          'oauth/access_token - 获取访问令牌',
          'user/info - 获取用户信息',
          'following/list - 获取关注列表',
          'video/list - 获取视频列表'
        ],
        limitations: [
          '个人开发者无法申请',
          '需要真实业务场景',
          '审核周期较长',
          '接口调用有频率限制'
        ]
      },
      {
        platform: 'QQ音乐开放平台',
        status: '需要合作申请',
        requirements: [
          '企业开发者资质',
          '音乐相关业务场景',
          '平台合作协议',
          '技术对接评估'
        ],
        apis: [
          'oauth/authorize - 用户授权',
          'user/info - 用户信息',
          'user/follow_singers - 关注歌手',
          'song/search - 歌曲搜索'
        ],
        limitations: [
          '不对个人开发者开放',
          '需要商务合作',
          '数据使用有严格限制',
          '需要版权合规'
        ]
      }
    ]
  },

  onLoad() {
    wx.setNavigationBarTitle({
      title: 'API集成说明'
    })
  },

  // 查看官方文档
  viewOfficialDoc(e) {
    const platform = e.currentTarget.dataset.platform
    let url = ''
    
    if (platform === '抖音开放平台') {
      url = 'https://developer.open-douyin.com/'
    } else if (platform === 'QQ音乐开放平台') {
      url = 'https://y.qq.com/m/client/developer'
    }
    
    if (url) {
      wx.setClipboardData({
        data: url,
        success: () => {
          wx.showToast({
            title: '链接已复制',
            icon: 'success'
          })
        }
      })
    }
  },

  // 返回
  goBack() {
    wx.navigateBack()
  }
})