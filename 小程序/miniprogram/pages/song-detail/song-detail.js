// pages/song-detail/song-detail.js
Page({
  data: {
    song: null,
    loading: true
  },

  onLoad(options) {
    const songId = options.id;
    if (songId) {
      this.loadSongDetail(songId);
    }
  },

  loadSongDetail(songId) {
    this.setData({ loading: true });
    
    // TODO: 调用API获取歌曲详情
    setTimeout(() => {
      this.setData({
        song: {
          id: songId,
          title: '示例歌曲标题',
          artist: '示例歌手',
          album: '示例专辑',
          duration: '03:45',
          releaseDate: '2024-01-01',
          playCount: 50000,
          likeCount: 2000
        },
        loading: false
      });
    }, 1000);
  },

  onPlaySong() {
    wx.showToast({
      title: '播放功能开发中',
      icon: 'none'
    });
  },

  onDownloadSong() {
    wx.showToast({
      title: '下载功能开发中',
      icon: 'none'
    });
  }
});