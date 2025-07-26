const api = require('../../utils/api');
const logger = require('../../utils/logger');
const { formatTime, formatCount } = require('../../utils/utils');

Page({
    data: {
        videos: [],
        page: 1,
        limit: 20,
        total: 0,
        hasMore: true,
        loading: false,
        refreshing: false,
        loadingMore: false,
        filterType: 'all', // all, today, week, month
        selectedBlogger: null
    },

    onLoad(options) {
        logger.info('视频更新历史页面加载', options);

        // 如果有指定博主，设置筛选条件
        if (options.bloggerId) {
            this.setData({
                selectedBlogger: {
                    id: options.bloggerId,
                    name: options.bloggerName || '指定博主'
                }
            });
        }

        this.loadVideoHistory();
    },

    onShow() {
        // 页面显示时刷新数据
        if (this.data.videos.length > 0) {
            this.refreshVideoHistory();
        }
    },

    onPullDownRefresh() {
        this.refreshVideoHistory();
    },

    onReachBottom() {
        if (this.data.hasMore && !this.data.loadingMore) {
            this.loadMoreVideos();
        }
    },

    // 加载视频历史
    async loadVideoHistory() {
        if (this.data.loading) return;

        this.setData({ loading: true });

        try {
            const params = {
                page: 1,
                limit: this.data.limit
            };

            // 添加筛选条件
            if (this.data.filterType !== 'all') {
                params.timeRange = this.data.filterType;
            }

            if (this.data.selectedBlogger) {
                params.bloggerId = this.data.selectedBlogger.id;
            }

            const response = await api.request('/videos/history', { data: params });

            if (response.success) {
                const videos = response.data.videos || [];

                this.setData({
                    videos: videos.map(video => ({
                        ...video,
                        formattedTime: formatTime(video.detectedAt),
                        formattedStats: {
                            playCount: formatCount(video.statistics.playCount),
                            likeCount: formatCount(video.statistics.likeCount),
                            commentCount: formatCount(video.statistics.commentCount),
                            shareCount: formatCount(video.statistics.shareCount)
                        }
                    })),
                    page: 1,
                    total: response.data.pagination.total,
                    hasMore: response.data.pagination.hasMore
                });

                logger.info('视频历史加载成功', { count: videos.length });
            } else {
                throw new Error(response.message || '加载失败');
            }
        } catch (error) {
            logger.error('加载视频历史失败:', error);
            wx.showToast({
                title: error.message || '加载失败',
                icon: 'none'
            });
        } finally {
            this.setData({ loading: false });
        }
    },

    // 刷新视频历史
    async refreshVideoHistory() {
        if (this.data.refreshing) return;

        this.setData({ refreshing: true });

        try {
            await this.loadVideoHistory();
            wx.showToast({
                title: '刷新成功',
                icon: 'success',
                duration: 1500
            });
        } catch (error) {
            logger.error('刷新视频历史失败:', error);
        } finally {
            this.setData({ refreshing: false });
            wx.stopPullDownRefresh();
        }
    },

    // 加载更多视频
    async loadMoreVideos() {
        if (this.data.loadingMore || !this.data.hasMore) return;

        this.setData({ loadingMore: true });

        try {
            const nextPage = this.data.page + 1;
            const params = {
                page: nextPage,
                limit: this.data.limit
            };

            if (this.data.filterType !== 'all') {
                params.timeRange = this.data.filterType;
            }

            if (this.data.selectedBlogger) {
                params.bloggerId = this.data.selectedBlogger.id;
            }

            const response = await api.request('/videos/history', { data: params });

            if (response.success) {
                const newVideos = response.data.videos || [];
                const allVideos = [...this.data.videos, ...newVideos.map(video => ({
                    ...video,
                    formattedTime: formatTime(video.detectedAt),
                    formattedStats: {
                        playCount: formatCount(video.statistics.playCount),
                        likeCount: formatCount(video.statistics.likeCount),
                        commentCount: formatCount(video.statistics.commentCount),
                        shareCount: formatCount(video.statistics.shareCount)
                    }
                }))];

                this.setData({
                    videos: allVideos,
                    page: nextPage,
                    hasMore: response.data.pagination.hasMore
                });

                logger.info('加载更多视频成功', { count: newVideos.length });
            }
        } catch (error) {
            logger.error('加载更多视频失败:', error);
            wx.showToast({
                title: '加载失败',
                icon: 'none'
            });
        } finally {
            this.setData({ loadingMore: false });
        }
    },

    // 筛选时间范围
    onFilterChange(e) {
        const filterType = e.currentTarget.dataset.type;
        this.setData({ filterType });
        this.loadVideoHistory();
    },

    // 点击视频项
    onVideoTap(e) {
        const video = e.currentTarget.dataset.video;

        // 显示操作选项
        wx.showActionSheet({
            itemList: ['查看详情', '跳转抖音', '分享视频'],
            success: (res) => {
                switch (res.tapIndex) {
                    case 0:
                        this.showVideoDetail(video);
                        break;
                    case 1:
                        this.openInDouyin(video);
                        break;
                    case 2:
                        this.shareVideo(video);
                        break;
                }
            }
        });
    },

    // 显示视频详情
    showVideoDetail(video) {
        wx.navigateTo({
            url: `/pages/video-detail/video-detail?id=${video._id}`
        });
    },

    // 在抖音中打开
    openInDouyin(video) {
        // 尝试打开抖音应用
        wx.navigateToMiniProgram({
            appId: 'wx2916499153a12c8e', // 抖音小程序appId
            path: `pages/video/video?id=${video.videoId}`,
            success: () => {
                logger.info('成功跳转到抖音');
            },
            fail: (error) => {
                logger.warn('跳转抖音失败，使用webview:', error);

                // 如果跳转失败，使用webview打开
                const douyinUrl = `https://www.douyin.com/video/${video.videoId}`;
                wx.navigateTo({
                    url: `/pages/webview/webview?url=${encodeURIComponent(douyinUrl)}&title=${encodeURIComponent(video.title)}`
                });
            }
        });
    },

    // 分享视频
    shareVideo(video) {
        wx.showShareMenu({
            withShareTicket: true,
            menus: ['shareAppMessage', 'shareTimeline']
        });

        // 设置分享内容
        wx.onShareAppMessage(() => ({
            title: `${video.blogger.nickname} 发布了新视频：${video.title}`,
            path: `/pages/video-detail/video-detail?id=${video._id}`,
            imageUrl: video.cover
        }));
    },

    // 点击博主头像
    onBloggerTap(e) {
        const blogger = e.currentTarget.dataset.blogger;

        wx.navigateTo({
            url: `/pages/blogger-detail/blogger-detail?id=${blogger._id}`
        });
    },

    // 清除博主筛选
    onClearBloggerFilter() {
        this.setData({ selectedBlogger: null });
        this.loadVideoHistory();
    },

    // 选择博主筛选
    onSelectBlogger() {
        wx.navigateTo({
            url: '/pages/blogger-select/blogger-select?type=filter'
        });
    },

    // 页面分享
    onShareAppMessage() {
        return {
            title: '抖音博主视频更新历史',
            path: '/pages/video-history/video-history',
            imageUrl: '/images/share-video-history.png'
        };
    },

    onShareTimeline() {
        return {
            title: '抖音博主视频更新历史',
            query: '',
            imageUrl: '/images/share-video-history.png'
        };
    }
});