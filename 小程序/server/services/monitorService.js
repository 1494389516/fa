const cron = require('node-cron');
const MonitorConfig = require('../models/MonitorConfig');
const VideoUpdate = require('../models/VideoUpdate');
const User = require('../models/User');
const Blogger = require('../models/Blogger');
const douyinService = require('./douyinService');
const notificationService = require('./notificationService');
const logger = require('../utils/logger');

class MonitorService {
  constructor() {
    this.isRunning = false;
    this.monitorTask = null;
  }

  // 启动监控服务
  start() {
    if (this.isRunning) {
      logger.warn('监控服务已在运行中');
      return;
    }

    // 每5分钟执行一次监控任务
    this.monitorTask = cron.schedule('*/5 * * * *', async () => {
      await this.runMonitorCheck();
    }, {
      scheduled: false
    });

    this.monitorTask.start();
    this.isRunning = true;
    logger.info('视频更新监控服务已启动');
  }

  // 停止监控服务
  stop() {
    if (this.monitorTask) {
      this.monitorTask.stop();
      this.monitorTask = null;
    }
    this.isRunning = false;
    logger.info('视频更新监控服务已停止');
  }

  // 执行监控检查
  async runMonitorCheck() {
    if (!this.isRunning) return;

    logger.info('开始执行视频更新监控检查');
    
    try {
      // 获取所有启用的监控配置
      const monitorConfigs = await MonitorConfig.find({ 
        enabled: true 
      }).populate(['userId', 'bloggerId']);

      if (monitorConfigs.length === 0) {
        logger.info('没有启用的监控配置');
        return;
      }

      logger.info(`找到 ${monitorConfigs.length} 个监控配置`);

      // 按用户分组处理，避免频繁调用API
      const userGroups = this.groupConfigsByUser(monitorConfigs);

      for (const [userId, configs] of userGroups) {
        await this.checkUserBloggers(userId, configs);
        
        // 每个用户之间间隔1秒，避免API限流
        await this.sleep(1000);
      }

      logger.info('视频更新监控检查完成');
    } catch (error) {
      logger.error('监控检查执行失败:', error);
    }
  }

  // 按用户分组监控配置
  groupConfigsByUser(monitorConfigs) {
    const userGroups = new Map();
    
    for (const config of monitorConfigs) {
      const userId = config.userId._id.toString();
      if (!userGroups.has(userId)) {
        userGroups.set(userId, []);
      }
      userGroups.get(userId).push(config);
    }
    
    return userGroups;
  }

  // 检查用户的博主更新
  async checkUserBloggers(userId, configs) {
    try {
      const user = await User.findById(userId);
      
      if (!user || !user.douyinConnected || !user.douyinAccessToken) {
        logger.warn(`用户 ${userId} 未连接抖音账号，跳过监控`);
        return;
      }

      // 检查令牌是否过期
      if (user.douyinTokenExpires && user.douyinTokenExpires < new Date()) {
        logger.warn(`用户 ${userId} 抖音令牌已过期，尝试刷新`);
        
        try {
          await this.refreshUserToken(user);
        } catch (error) {
          logger.error(`刷新用户 ${userId} 令牌失败:`, error);
          return;
        }
      }

      // 检查每个博主的视频更新
      for (const config of configs) {
        await this.checkBloggerVideos(user, config);
        
        // 每个博主之间间隔500ms
        await this.sleep(500);
      }
    } catch (error) {
      logger.error(`检查用户 ${userId} 博主更新失败:`, error);
    }
  }

  // 检查单个博主的视频更新
  async checkBloggerVideos(user, config) {
    try {
      const blogger = config.bloggerId;
      
      logger.debug(`检查博主 ${blogger.nickname} 的视频更新`);

      // 获取博主最新视频
      const videosData = await douyinService.callApiWithRetry(async () => {
        return await douyinService.getUserVideos(
          user.douyinAccessToken,
          blogger.openId,
          0,
          10
        );
      });

      if (!videosData || !videosData.list || videosData.list.length === 0) {
        logger.debug(`博主 ${blogger.nickname} 暂无视频`);
        return;
      }

      const latestVideo = videosData.list[0];
      const videoId = latestVideo.item_id;

      // 检查是否为新视频
      if (config.lastVideoId === videoId) {
        logger.debug(`博主 ${blogger.nickname} 无新视频更新`);
        return;
      }

      // 如果是首次监控，只更新lastVideoId，不发送通知
      if (!config.lastVideoId) {
        await MonitorConfig.findByIdAndUpdate(config._id, {
          lastVideoId: videoId,
          lastCheckTime: new Date()
        });
        logger.info(`初始化博主 ${blogger.nickname} 的监控状态`);
        return;
      }

      // 发现新视频，保存到数据库
      const videoUpdate = new VideoUpdate({
        userId: user._id,
        bloggerId: blogger._id,
        videoId: videoId,
        title: latestVideo.title || '',
        description: latestVideo.desc || '',
        cover: latestVideo.video?.cover?.url_list?.[0] || '',
        playUrl: latestVideo.video?.play_addr?.url_list?.[0] || '',
        duration: latestVideo.video?.duration || 0,
        statistics: {
          playCount: latestVideo.statistics?.play_count || 0,
          likeCount: latestVideo.statistics?.digg_count || 0,
          commentCount: latestVideo.statistics?.comment_count || 0,
          shareCount: latestVideo.statistics?.share_count || 0
        },
        publishTime: new Date(latestVideo.create_time * 1000),
        detectedAt: new Date()
      });

      await videoUpdate.save();

      // 更新监控配置
      await MonitorConfig.findByIdAndUpdate(config._id, {
        lastVideoId: videoId,
        lastCheckTime: new Date()
      });

      logger.info(`发现博主 ${blogger.nickname} 的新视频: ${latestVideo.title}`);

      // 发送推送通知
      if (config.notificationEnabled) {
        await this.sendVideoUpdateNotification(user, blogger, videoUpdate);
      }

    } catch (error) {
      logger.error(`检查博主 ${config.bloggerId.nickname} 视频更新失败:`, error);
      
      // 更新最后检查时间，即使失败也要记录
      await MonitorConfig.findByIdAndUpdate(config._id, {
        lastCheckTime: new Date()
      });
    }
  }

  // 刷新用户令牌
  async refreshUserToken(user) {
    if (!user.douyinRefreshToken) {
      throw new Error('没有刷新令牌');
    }

    const tokenData = await douyinService.refreshAccessToken(user.douyinRefreshToken);
    
    await User.findByIdAndUpdate(user._id, {
      douyinAccessToken: tokenData.access_token,
      douyinRefreshToken: tokenData.refresh_token,
      douyinTokenExpires: new Date(Date.now() + tokenData.expires_in * 1000),
      updatedAt: new Date()
    });

    logger.info(`用户 ${user._id} 令牌刷新成功`);
  }

  // 发送视频更新通知
  async sendVideoUpdateNotification(user, blogger, videoUpdate) {
    try {
      await notificationService.sendVideoUpdateNotification({
        userId: user._id,
        openId: user.openId,
        bloggerName: blogger.nickname,
        videoTitle: videoUpdate.title,
        videoId: videoUpdate.videoId
      });
      
      logger.info(`已发送视频更新通知给用户 ${user._id}`);
    } catch (error) {
      logger.error('发送视频更新通知失败:', error);
    }
  }

  // 手动触发监控检查
  async triggerManualCheck(userId, bloggerId) {
    try {
      const config = await MonitorConfig.findOne({
        userId,
        bloggerId,
        enabled: true
      }).populate(['userId', 'bloggerId']);

      if (!config) {
        throw new Error('监控配置不存在或未启用');
      }

      const user = config.userId;
      await this.checkBloggerVideos(user, config);
      
      return { success: true, message: '手动检查完成' };
    } catch (error) {
      logger.error('手动监控检查失败:', error);
      throw error;
    }
  }

  // 获取监控统计信息
  async getMonitorStats() {
    try {
      const totalConfigs = await MonitorConfig.countDocuments({ enabled: true });
      const totalUsers = await MonitorConfig.distinct('userId', { enabled: true });
      const totalBloggers = await MonitorConfig.distinct('bloggerId', { enabled: true });
      const recentUpdates = await VideoUpdate.countDocuments({
        detectedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });

      return {
        totalConfigs,
        totalUsers: totalUsers.length,
        totalBloggers: totalBloggers.length,
        recentUpdates,
        isRunning: this.isRunning
      };
    } catch (error) {
      logger.error('获取监控统计信息失败:', error);
      throw error;
    }
  }

  // 工具方法：延时
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new MonitorService();