// components/empty-state/empty-state.js - 空状态组件
Component({
  properties: {
    // 空状态类型
    type: {
      type: String,
      value: 'default' // default, no-data, no-network, error, search
    },
    
    // 自定义图标
    icon: {
      type: String,
      value: ''
    },
    
    // 标题
    title: {
      type: String,
      value: ''
    },
    
    // 描述
    description: {
      type: String,
      value: ''
    },
    
    // 按钮文本
    buttonText: {
      type: String,
      value: ''
    },
    
    // 是否显示按钮
    showButton: {
      type: Boolean,
      value: false
    },
    
    // 图片URL
    imageUrl: {
      type: String,
      value: ''
    }
  },

  data: {
    // 预设的空状态配置
    presets: {
      'default': {
        icon: '📭',
        title: '暂无内容',
        description: '这里还没有任何内容'
      },
      'no-data': {
        icon: '📊',
        title: '暂无数据',
        description: '暂时没有相关数据'
      },
      'no-network': {
        icon: '📡',
        title: '网络连接失败',
        description: '请检查网络连接后重试'
      },
      'error': {
        icon: '⚠️',
        title: '出现错误',
        description: '页面加载失败，请稍后重试'
      },
      'search': {
        icon: '🔍',
        title: '未找到相关内容',
        description: '试试其他关键词吧'
      },
      'no-blogger': {
        icon: '👥',
        title: '暂无关注的博主',
        description: '完成抖音授权后即可查看关注列表'
      },
      'no-video': {
        icon: '📺',
        title: '暂无视频更新',
        description: '您关注的博主还没有新的视频更新'
      },
      'no-monitor': {
        icon: '🎯',
        title: '暂无监控任务',
        description: '添加要监控的博主开始使用吧'
      }
    }
  },

  lifetimes: {
    attached() {
      this.updateEmptyState()
    }
  },

  observers: {
    'type': function() {
      this.updateEmptyState()
    }
  },

  methods: {
    // 更新空状态显示
    updateEmptyState() {
      const preset = this.data.presets[this.properties.type] || this.data.presets['default']
      
      // 使用自定义内容或预设内容
      const finalIcon = this.properties.icon || preset.icon
      const finalTitle = this.properties.title || preset.title
      const finalDescription = this.properties.description || preset.description
      
      this.setData({
        finalIcon,
        finalTitle,
        finalDescription
      })
    },

    // 按钮点击事件
    onButtonTap() {
      this.triggerEvent('buttontap', {
        type: this.properties.type
      })
    },

    // 整个组件点击事件
    onEmptyTap() {
      this.triggerEvent('emptytap', {
        type: this.properties.type
      })
    },

    // 图片加载失败
    onImageError() {
      console.warn('空状态图片加载失败')
    }
  }
})