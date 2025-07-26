// utils/constants.js - 常量定义

// API相关常量
export const API_CONFIG = {
  BASE_URL: 'https://your-server.com/api',
  TIMEOUT: 10000,
  RETRY_TIMES: 3
}

// 抖音API相关常量
export const DOUYIN_CONFIG = {
  CLIENT_ID: 'your-douyin-client-id',
  CLIENT_SECRET: 'your-douyin-client-secret',
  REDIRECT_URI: 'https://your-server.com/auth/douyin/callback',
  SCOPE: 'user_info,following.list,video.list'
}

// QQ音乐API相关常量
export const QQ_MUSIC_CONFIG = {
  BASE_URL: 'https://c.y.qq.com',
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  REFERER: 'https://y.qq.com/'
}

// 存储key常量
export const STORAGE_KEYS = {
  WECHAT_TOKEN: 'wechat_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_INFO: 'user_info',
  DOUYIN_TOKEN: 'douyin_token',
  QQ_MUSIC_TOKEN: 'qq_music_token',
  HAS_AUTHORIZED: 'has_authorized',
  USER_SETTINGS: 'user_settings',
  MONITORED_BLOGGERS: 'monitored_bloggers',
  MONITORED_ARTISTS: 'monitored_artists',
  VIDEO_UPDATES: 'video_updates',
  SONG_UPDATES: 'song_updates'
}

// 页面路径常量
export const PAGE_PATHS = {
  INDEX: '/pages/index/index',
  AUTH: '/pages/auth/auth',
  LOGIN: '/pages/login/login',
  MUSIC_LOGIN: '/pages/music-login/music-login',
  DASHBOARD: '/pages/dashboard/dashboard',
  BLOGGER_LIST: '/pages/blogger-list/blogger-list',
  ARTIST_LIST: '/pages/artist-list/artist-list',
  HISTORY: '/pages/history/history',
  SETTINGS: '/pages/settings/settings',
  VIDEO_DETAIL: '/pages/video-detail/video-detail',
  SONG_DETAIL: '/pages/song-detail/song-detail'
}

// 用户设置默认值
export const DEFAULT_SETTINGS = {
  monitorInterval: 5, // 监控间隔（分钟）
  pushEnabled: true,  // 推送开关
  pushTime: {
    start: '08:00',   // 推送开始时间
    end: '22:00'      // 推送结束时间
  },
  autoRefresh: true,  // 自动刷新
  soundEnabled: true, // 声音提醒
  vibrationEnabled: true // 震动提醒
}

// 错误码常量
export const ERROR_CODES = {
  SUCCESS: 0,
  INVALID_PARAMS: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
  NETWORK_ERROR: -1,
  TIMEOUT_ERROR: -2,
  UNKNOWN_ERROR: -999
}

// 错误消息
export const ERROR_MESSAGES = {
  [ERROR_CODES.INVALID_PARAMS]: '请求参数错误',
  [ERROR_CODES.UNAUTHORIZED]: '未授权，请重新登录',
  [ERROR_CODES.FORBIDDEN]: '拒绝访问',
  [ERROR_CODES.NOT_FOUND]: '请求的资源不存在',
  [ERROR_CODES.SERVER_ERROR]: '服务器内部错误',
  [ERROR_CODES.NETWORK_ERROR]: '网络连接失败',
  [ERROR_CODES.TIMEOUT_ERROR]: '请求超时',
  [ERROR_CODES.UNKNOWN_ERROR]: '未知错误'
}

// 监控状态常量
export const MONITOR_STATUS = {
  ACTIVE: 'active',     // 监控中
  INACTIVE: 'inactive', // 未监控
  ERROR: 'error',       // 错误状态
  PAUSED: 'paused'      // 暂停
}

// 视频状态常量
export const VIDEO_STATUS = {
  UNREAD: 'unread',     // 未读
  READ: 'read',         // 已读
  PUSHED: 'pushed'      // 已推送
}

// 推送消息模板ID
export const PUSH_TEMPLATE_IDS = {
  VIDEO_UPDATE: 'your-video-template-id',
  SONG_UPDATE: 'your-song-template-id',
  SYSTEM_NOTICE: 'your-system-template-id'
}

// 内容类型常量
export const CONTENT_TYPES = {
  VIDEO: 'video',
  SONG: 'song',
  ALBUM: 'album',
  LIVE: 'live'
}

// 平台常量
export const PLATFORMS = {
  DOUYIN: 'douyin',
  QQ_MUSIC: 'qq_music'
}

// 动画配置
export const ANIMATION_CONFIG = {
  DURATION: {
    FAST: 200,
    NORMAL: 300,
    SLOW: 500
  },
  EASING: {
    EASE: 'ease',
    EASE_IN: 'ease-in',
    EASE_OUT: 'ease-out',
    EASE_IN_OUT: 'ease-in-out'
  }
}

// 分页配置
export const PAGINATION_CONFIG = {
  PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100
}

// 缓存配置
export const CACHE_CONFIG = {
  EXPIRE_TIME: {
    SHORT: 5 * 60 * 1000,      // 5分钟
    MEDIUM: 30 * 60 * 1000,    // 30分钟
    LONG: 24 * 60 * 60 * 1000  // 24小时
  }
}

// 正则表达式
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^1[3-9]\d{9}$/,
  URL: /^https?:\/\/.+/,
  TIME: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
}

// 文件大小限制
export const FILE_LIMITS = {
  IMAGE_MAX_SIZE: 5 * 1024 * 1024, // 5MB
  VIDEO_MAX_SIZE: 50 * 1024 * 1024 // 50MB
}

// 颜色主题
export const THEME_COLORS = {
  PRIMARY: '#1a1a2e',
  SECONDARY: '#16213e',
  TECH_BLUE: '#00d4ff',
  WARNING_ORANGE: '#ff6b35',
  SUCCESS_GREEN: '#00ff88',
  ERROR_RED: '#ff4757',
  TEXT_PRIMARY: '#ffffff',
  TEXT_SECONDARY: '#b0b0b0',
  CARD_BG: 'rgba(255, 255, 255, 0.1)',
  BORDER: 'rgba(255, 255, 255, 0.1)'
}