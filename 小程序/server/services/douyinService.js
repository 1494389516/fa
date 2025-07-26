const axios = require('axios');
const logger = require('../utils/logger');
const redis = require('../config/redis');

class DouyinService {
  constructor() {
    this.clientKey = process.env.DOUYIN_CLIENT_KEY;
    this.clientSecret = process.env.DOUYIN_CLIENT_SECRET;
    this.redirectUri = process.env.DOUYIN_REDIRECT_URI;
    this.baseUrl = 'https://open.douyin.com';
  }

  // 获取授权URL
  getAuthUrl(state) {
    const params = new URLSearchParams({
      client_key: this.clientKey,
      response_type: 'code',
      scope: 'user_info,following.list,video.list',
      redirect_uri: this.redirectUri,
      state: state
    });
    
    return `${this.baseUrl}/platform/oauth/connect/?${params.toString()}`;
  }

  // 通过授权码获取访问令牌
  async getAccessToken(code) {
    try {
      const response = await axios.post(`${this.baseUrl}/oauth/access_token/`, {
        client_key: this.clientKey,
        client_secret: this.clientSecret,
        code: code,
        grant_type: 'authorization_code'
      });

      if (response.data.error_code === 0) {
        const tokenData = response.data.data;
        
        // 缓存访问令牌
        await this.cacheToken(tokenData);
        
        return tokenData;
      } else {
        throw new Error(`获取访问令牌失败: ${response.data.description}`);
      }
    } catch (error) {
      logger.error('获取抖音访问令牌失败:', error);
      throw error;
    }
  }

  // 刷新访问令牌
  async refreshAccessToken(refreshToken) {
    try {
      const response = await axios.post(`${this.baseUrl}/oauth/refresh_token/`, {
        client_key: this.clientKey,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      });

      if (response.data.error_code === 0) {
        const tokenData = response.data.data;
        await this.cacheToken(tokenData);
        return tokenData;
      } else {
        throw new Error(`刷新访问令牌失败: ${response.data.description}`);
      }
    } catch (error) {
      logger.error('刷新抖音访问令牌失败:', error);
      throw error;
    }
  }

  // 缓存令牌
  async cacheToken(tokenData) {
    const cacheKey = `douyin_token:${tokenData.open_id}`;
    await redis.setex(cacheKey, tokenData.expires_in - 300, JSON.stringify(tokenData));
  }

  // 获取缓存的令牌
  async getCachedToken(openId) {
    const cacheKey = `douyin_token:${openId}`;
    const cached = await redis.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  }

  // 获取用户信息
  async getUserInfo(accessToken, openId) {
    try {
      const response = await axios.get(`${this.baseUrl}/oauth/userinfo/`, {
        params: {
          access_token: accessToken,
          open_id: openId
        }
      });

      if (response.data.error_code === 0) {
        return response.data.data;
      } else {
        throw new Error(`获取用户信息失败: ${response.data.description}`);
      }
    } catch (error) {
      logger.error('获取抖音用户信息失败:', error);
      throw error;
    }
  }

  // 获取关注列表
  async getFollowingList(accessToken, openId, cursor = 0, count = 20) {
    try {
      const response = await axios.get(`${this.baseUrl}/following/list/`, {
        params: {
          access_token: accessToken,
          open_id: openId,
          cursor: cursor,
          count: count
        }
      });

      if (response.data.error_code === 0) {
        return response.data.data;
      } else {
        throw new Error(`获取关注列表失败: ${response.data.description}`);
      }
    } catch (error) {
      logger.error('获取抖音关注列表失败:', error);
      throw error;
    }
  }

  // 获取用户视频列表
  async getUserVideos(accessToken, openId, cursor = 0, count = 20) {
    try {
      const response = await axios.get(`${this.baseUrl}/video/list/`, {
        params: {
          access_token: accessToken,
          open_id: openId,
          cursor: cursor,
          count: count
        }
      });

      if (response.data.error_code === 0) {
        return response.data.data;
      } else {
        throw new Error(`获取视频列表失败: ${response.data.description}`);
      }
    } catch (error) {
      logger.error('获取抖音视频列表失败:', error);
      throw error;
    }
  }

  // 带重试的API调用
  async callApiWithRetry(apiCall, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await apiCall();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        
        // 如果是令牌过期，尝试刷新
        if (error.response?.data?.error_code === 2190008) {
          // 令牌过期，需要重新授权
          throw new Error('访问令牌已过期，需要重新授权');
        }
        
        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }
}

module.exports = new DouyinService();