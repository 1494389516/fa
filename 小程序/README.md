# 内容监控助手 - 微信小程序

<div align="center">

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-WeChat%20MiniProgram-green.svg)
![Node.js](https://img.shields.io/badge/node.js-v16+-brightgreen.svg)
![Status](https://img.shields.io/badge/status-Demo-orange.svg)

一个用于监控抖音博主和音乐歌手动态的微信小程序演示项目

[功能特性](#功能特性) • [技术栈](#技术栈) • [项目结构](#项目结构) • [快速开始](#快速开始) • [API说明](#api说明) • [贡献指南](#贡献指南)

</div>

## 📱 功能特性

### 🎯 核心功能
- **抖音博主监控** - 实时监控关注博主的最新视频动态
- **音乐歌手监控** - 跟踪喜爱歌手的最新歌曲发布
- **智能推送通知** - 第一时间获取内容更新提醒
- **统一管理面板** - 集中管理所有监控对象

### 🎨 用户体验
- **现代化UI设计** - 采用渐变背景和毛玻璃效果
- **响应式布局** - 适配不同尺寸的移动设备
- **流畅的交互动画** - 提供丝滑的用户体验
- **直观的数据展示** - 清晰的统计图表和状态指示

### 🔐 安全特性
- **用户隐私保护** - 严格遵循数据保护原则
- **安全的授权流程** - OAuth 2.0 标准授权
- **本地数据加密** - 敏感信息本地加密存储

## 🛠 技术栈

### 前端技术
- **微信小程序** - 原生小程序开发框架
- **WXSS** - 小程序样式语言，支持现代CSS特性
- **JavaScript ES6+** - 现代JavaScript语法

### 后端技术
- **Node.js** - 服务端运行环境
- **Express.js** - Web应用框架
- **MongoDB** - NoSQL数据库
- **Redis** - 缓存和会话存储

### 第三方集成
- **抖音开放平台** - 获取博主和视频数据
- **QQ音乐开放平台** - 获取歌手和歌曲信息
- **微信小程序云开发** - 云函数和云数据库

## 📁 项目结构

```
douyin-monitor-miniprogram/
├── miniprogram/                 # 小程序前端代码
│   ├── pages/                   # 页面文件
│   │   ├── welcome/            # 欢迎引导页
│   │   ├── dashboard/          # 主控制台
│   │   ├── blogger-list/       # 抖音博主列表
│   │   ├── artist-list/        # 音乐歌手列表
│   │   ├── history/            # 更新历史
│   │   ├── settings/           # 设置页面
│   │   ├── douyin-auth/        # 抖音授权
│   │   ├── music-login/        # 音乐平台登录
│   │   └── api-info/           # API集成说明
│   ├── components/             # 自定义组件
│   │   ├── video-item/         # 视频条目组件
│   │   ├── song-item/          # 歌曲条目组件
│   │   ├── blogger-card/       # 博主卡片组件
│   │   ├── empty-state/        # 空状态组件
│   │   └── loading/            # 加载组件
│   ├── utils/                  # 工具函数
│   │   ├── api.js             # API请求封装
│   │   ├── auth.js            # 认证工具
│   │   ├── storage.js         # 存储工具
│   │   ├── logger.js          # 日志工具
│   │   └── constants.js       # 常量定义
│   ├── images/                 # 图片资源
│   ├── app.js                  # 小程序入口文件
│   ├── app.json               # 小程序配置
│   └── app.wxss               # 全局样式
├── server/                     # 后端服务代码
│   ├── routes/                # 路由文件
│   │   ├── auth.js           # 认证路由
│   │   ├── douyin.js         # 抖音API路由
│   │   ├── songs.js          # 音乐API路由
│   │   └── monitor.js        # 监控服务路由
│   ├── services/             # 业务服务
│   │   ├── douyinService.js  # 抖音服务
│   │   ├── musicService.js   # 音乐服务
│   │   └── notificationService.js # 通知服务
│   ├── models/               # 数据模型
│   │   ├── User.js          # 用户模型
│   │   ├── Blogger.js       # 博主模型
│   │   └── Artist.js        # 歌手模型
│   ├── middleware/           # 中间件
│   ├── config/              # 配置文件
│   ├── app.js              # 服务器入口
│   └── package.json        # 依赖配置
├── .kiro/                    # Kiro IDE 配置
├── README.md                # 项目说明文档
└── LICENSE                  # 开源许可证
```

## 🚀 快速开始

### 环境要求
- Node.js 16.0+
- 微信开发者工具
- MongoDB 4.0+
- Redis 6.0+

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/yourusername/douyin-monitor-miniprogram.git
cd douyin-monitor-miniprogram
```

2. **安装后端依赖**
```bash
cd server
npm install
```

3. **配置环境变量**
```bash
cp .env.example .env
# 编辑 .env 文件，填入相关配置
```

4. **启动后端服务**
```bash
npm start
```

5. **配置小程序**
- 使用微信开发者工具打开 `miniprogram` 目录
- 配置 AppID 和服务器域名
- 编译并预览

### 环境变量配置

```env
# 服务器配置
PORT=3000
NODE_ENV=development

# 数据库配置
MONGODB_URI=mongodb://localhost:27017/douyin-monitor
REDIS_URL=redis://localhost:6379

# 抖音开放平台
DOUYIN_CLIENT_ID=your_douyin_client_id
DOUYIN_CLIENT_SECRET=your_douyin_client_secret
DOUYIN_REDIRECT_URI=your_redirect_uri

# QQ音乐开放平台
QQ_MUSIC_APP_ID=your_qq_music_app_id
QQ_MUSIC_APP_SECRET=your_qq_music_app_secret

# 微信小程序
WECHAT_APP_ID=your_wechat_app_id
WECHAT_APP_SECRET=your_wechat_app_secret
```

## 📋 API说明

### ⚠️ 重要说明

**当前版本为演示版本，使用模拟数据展示功能效果。**

真实的API集成需要：

#### 抖音开放平台
- ✅ 企业开发者账号
- ✅ 营业执照认证  
- ✅ 应用审核通过
- ❌ 个人开发者无法申请

#### QQ音乐开放平台
- ✅ 企业开发者资质
- ✅ 音乐相关业务场景
- ✅ 平台合作协议
- ❌ 不对个人开发者开放

### API接口文档

#### 认证相关
```javascript
POST /api/auth/wechat-login    # 微信登录
POST /api/auth/douyin-oauth    # 抖音OAuth授权
POST /api/auth/qq-music-oauth  # QQ音乐OAuth授权
```

#### 博主管理
```javascript
GET  /api/bloggers/following   # 获取关注的博主列表
POST /api/bloggers/monitor     # 添加监控博主
DELETE /api/bloggers/monitor/:id # 移除监控博主
```

#### 歌手管理
```javascript
GET  /api/artists/list         # 获取歌手列表
POST /api/artists/monitor      # 添加监控歌手
DELETE /api/artists/monitor/:id # 移除监控歌手
```

## 🎨 界面预览

### 主要页面

| 页面 | 功能描述 | 特色 |
|------|----------|------|
| 欢迎页 | 用户引导和授权 | 步骤指示器、渐变动画 |
| 控制台 | 数据统计和快捷操作 | 实时数据、卡片布局 |
| 博主列表 | 抖音博主管理 | 搜索筛选、状态切换 |
| 歌手列表 | 音乐歌手管理 | 分类展示、批量操作 |
| 更新历史 | 内容更新记录 | 时间轴、详情查看 |

### 设计特色
- 🌈 **现代渐变设计** - 深色主题配合科技蓝色调
- 🔍 **毛玻璃效果** - backdrop-filter 实现的现代视觉效果  
- 📱 **响应式布局** - 适配各种屏幕尺寸
- ⚡ **流畅动画** - CSS3 动画和过渡效果
- 🎯 **直观交互** - 清晰的视觉反馈和状态指示

## 🔧 开发指南

### 代码规范
- 使用 ESLint 进行代码检查
- 遵循微信小程序开发规范
- 采用模块化开发方式

### 调试技巧
```javascript
// 开启调试模式
console.log('调试信息:', data)

// 使用微信开发者工具调试
wx.setEnableDebug({
  enableDebug: true
})
```

### 性能优化
- 图片资源压缩和懒加载
- 代码分包和按需加载
- 缓存策略优化

## 🤝 贡献指南

我们欢迎所有形式的贡献！

### 如何贡献
1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 贡献类型
- 🐛 Bug 修复
- ✨ 新功能开发
- 📝 文档改进
- 🎨 UI/UX 优化
- ⚡ 性能提升

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- 感谢微信小程序团队提供的开发平台
- 感谢所有贡献者的辛勤付出
- 感谢开源社区的支持和帮助

## 📞 联系我们

- **项目地址**: [GitHub Repository](https://github.com/yourusername/douyin-monitor-miniprogram)
- **问题反馈**: [Issues](https://github.com/yourusername/douyin-monitor-miniprogram/issues)
- **功能建议**: [Discussions](https://github.com/yourusername/douyin-monitor-miniprogram/discussions)

---

<div align="center">

**如果这个项目对你有帮助，请给它一个 ⭐️**

Made with ❤️ by [Your Name]

</div>