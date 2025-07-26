const axios = require('axios');
const logger = require('../utils/logger');
const redis = require('../config/redis');

class NotificationService {
  constructor() {
    this.appId = process.env.WECHAT_APPID;
    this.appSecret = process.env.WECHAT_APPSECRET;
    this.templateId = process.env.WECHAT_TEMPLATE_ID;
    this.baseUrl = 'https://api.weixin.qq.com';
  }

  // 获取微信访问令牌
  async getAccessToken() {
    const cacheKey = 'wechat_access_token';
    
    // 先从缓存获取
    const cached = await redis.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/cgi-bin/token`, {
        params: {
          grant_type: 'client_credential',
          appid: this.appId,
          secret: this.appSecret
        }
      });

      if (response.data.access_token) {
        const accessToken = response.data.access_token;
        const expiresIn = response.data.expires_in || 7200;
        
        // 缓存令牌，提前5分钟过期
        await redis.setex(cacheKey, expiresIn - 300, accessToken);
        
        return accessToken;
      } else {
        throw new Error(`获取微信访问令牌失败: ${response.data.errmsg}`);
      }
    } catch (error) {
      logger.error('获取微信访问令牌失败:', error);
      throw error;
    }
  }

  // 发送订阅消息
  async sendSubscribeMessage(data) {
    try {
      const accessToken = await this.getAccessToken();
      
      const response = await axios.post(
        `${this.baseUrl}/cgi-bin/message/subscribe/send?access_token=${accessToken}`,
        data
      );

      if (response.data.errcode === 0) {
        logger.info('订阅消息发送成功', { openId: data.touser });
        return { success: true };
      } else {
        throw new Error(`发送订阅消息失败: ${response.data.errmsg}`);
      }
    } catch (error) {
      logger.error('发送订阅消息失败:', error);
      throw error;
    }
  }

  // 发送视频更新通知
  async sendVideoUpdateNotification(params) {
    const { userId, openId, bloggerName, videoTitle, videoId } = params;

    try {
      // 检查用户是否订阅了通知
      const subscriptionKey = `notification_subscription:${userId}`;
      const isSubscribed = await redis.get(subscriptionKey);
      
      if (!isSubscribed) {
        logger.debug(`用户 ${userId} 未订阅通知，跳过发送`);
        return { success: false, reason: 'not_subscribed' };
      }

      const messageData = {
        touser: openId,
        template_id: this.templateId,
        page: `pages/video-detail/video-detail?id=${videoId}`,
        miniprogram_state: process.env.NODE_ENV === 'production' ? 'formal' : 'trial',
        lang: 'zh_CN',
        data: {
          thing1: {
            value: this.truncateText(bloggerName, 20)
          },
          thing2: {
            value: this.truncateText(videoTitle, 20)
          },
          time3: {
            value: this.formatTime(new Date())
          },
          thing4: {
            value: '点击查看详情'
          }
        }
      };

      await this.sendSubscribeMessage(messageData);
      
      // 记录发送历史
      await this.recordNotificationHistory(userId, 'video_update', {
        bloggerName,
        videoTitle,
        videoId
      });

      return { success: true };
    } catch (error) {
      logger.error('发送视频更新通知失败:', error);
      
      // 如果是用户拒绝接收消息，移除订阅状态
      if (error.message.includes('43101') || error.message.includes('用户拒绝')) {
        await this.removeUserSubscription(userId);
      }
      
      throw error;
    }
  }

  // 批量发送通知
  async sendBatchNotifications(notifications) {
    const results = [];
    
    for (const notification of notifications) {
      try {
        const result = await this.sendVideoUpdateNotification(notification);
        results.push({
          userId: notification.userId,
          success: true,
          result
        });
        
        // 批量发送时添加延时，避免频率限制
        await this.sleep(100);
      } catch (error) {
        results.push({
          userId: notification.userId,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  // 用户订阅通知
  async subscribeUser(userId, openId) {
    try {
      const subscriptionKey = `notification_subscription:${userId}`;
      const userInfoKey = `user_notification_info:${userId}`;
      
      // 设置订阅状态，有效期30天
      await redis.setex(subscriptionKey, 30 * 24 * 60 * 60, 'true');
      
      // 保存用户信息
      await redis.setex(userInfoKey, 30 * 24 * 60 * 60, JSON.stringify({
        openId,
        subscribedAt: new Date().toISOString()
      }));
      
      logger.info(`用户 ${userId} 订阅通知成功`);
      return { success: true };
    } catch (error) {
      logger.error('用户订阅通知失败:', error);
      throw error;
    }
  }

  // 取消用户订阅
  async unsubscribeUser(userId) {
    try {
      const subscriptionKey = `notification_subscription:${userId}`;
      const userInfoKey = `user_notification_info:${userId}`;
      
      await redis.del(subscriptionKey);
      await redis.del(userInfoKey);
      
      logger.info(`用户 ${userId} 取消订阅通知`);
      return { success: true };
    } catch (error) {
      logger.error('取消用户订阅失败:', error);
      throw error;
    }
  }

  // 移除用户订阅（系统调用）
  async removeUserSubscription(userId) {
    await this.unsubscribeUser(userId);
    logger.warn(`系统自动移除用户 ${userId} 的订阅状态`);
  }

  // 检查用户订阅状态
  async checkUserSubscription(userId) {
    try {
      const subscriptionKey = `notification_subscription:${userId}`;
      const isSubscribed = await redis.get(subscriptionKey);
      
      return {
        subscribed: !!isSubscribed,
        userId
      };
    } catch (error) {
      logger.error('检查用户订阅状态失败:', error);
      return { subscribed: false, userId };
    }
  }

  // 记录通知历史
  async recordNotificationHistory(userId, type, data) {
    try {
      const historyKey = `notification_history:${userId}`;
      const record = {
        type,
        data,
        sentAt: new Date().toISOString()
      };
      
      // 使用列表存储，保留最近100条记录
      await redis.lpush(historyKey, JSON.stringify(record));
      await redis.ltrim(historyKey, 0, 99);
      await redis.expire(historyKey, 30 * 24 * 60 * 60); // 30天过期
      
    } catch (error) {
      logger.error('记录通知历史失败:', error);
    }
  }

  // 获取用户通知历史
  async getUserNotificationHistory(userId, limit = 20) {
    try {
      const historyKey = `notification_history:${userId}`;
      const records = await redis.lrange(historyKey, 0, limit - 1);
      
      return records.map(record => JSON.parse(record));
    } catch (error) {
      logger.error('获取用户通知历史失败:', error);
      return [];
    }
  }

  // 获取通知统计信息
  async getNotificationStats() {
    try {
      // 获取订阅用户数量
      const subscriptionKeys = await redis.keys('notification_subscription:*');
      const subscribedUsers = subscriptionKeys.length;
      
      // 获取今日发送数量（这里简化处理，实际可以用更精确的统计）
      const todayKey = `notification_count:${new Date().toISOString().split('T')[0]}`;
      const todayCount = await redis.get(todayKey) || 0;
      
      return {
        subscribedUsers,
        todayCount: parseInt(todayCount),
        serviceStatus: 'running'
      };
    } catch (error) {
      logger.error('获取通知统计信息失败:', error);
      throw error;
    }
  }

  // 工具方法：截断文本
  truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 1) + '…';
  }

  // 工具方法：格式化时间
  formatTime(date) {
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) { // 1分钟内
      return '刚刚';
    } else if (diff < 3600000) { // 1小时内
      return `${Math.floor(diff / 60000)}分钟前`;
    } else if (diff < 86400000) { // 1天内
      return `${Math.floor(diff / 3600000)}小时前`;
    } else {
      return date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }

  // 工具方法：延时
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new NotificationService();