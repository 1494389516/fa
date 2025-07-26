// pages/video-detail/video-detail.js
Page({
  data: {
    video: null,
    loading: true
  },

  onLoad(options) {
    const videoId = options.id;
    if (videoId) {
      this.loadVideoDetail(videoId);
    }
  },

  loadVideoDetail(videoId) {
    this.setData({ loading: true });
    
    // TODO: 调用API获取视频详情
    setTimeout(() => {
      this.setData({
        video: {
          id: videoId,
          title: '示例视频标题',
          description: '这是一个示例视频描述',
          author: '示例作者',
          publishTime: '2024-01-01',
          viewCount: 10000,
          likeCount: 500,
          shareCount: 100
        },
        loading: false
      });
    }, 1000);
  },

  onShareVideo() {
    wx.showToast({
      title: '分享功能开发中',
      icon: 'none'
    });
  },

  onDownloadVideo() {
    wx.showToast({
      title: '下载功能开发中',
      icon: 'none'
    });
  }
});