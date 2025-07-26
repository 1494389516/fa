// components/loading/loading.js - 加载动画组件
Component({
  properties: {
    // 加载类型
    type: {
      type: String,
      value: 'spinner' // spinner, dots, wave, pulse
    },
    
    // 大小
    size: {
      type: String,
      value: 'medium' // small, medium, large
    },
    
    // 颜色
    color: {
      type: String,
      value: '#00d4ff'
    },
    
    // 加载文本
    text: {
      type: String,
      value: ''
    },
    
    // 是否显示
    show: {
      type: Boolean,
      value: true
    },
    
    // 是否全屏
    fullscreen: {
      type: Boolean,
      value: false
    }
  },

  data: {
    // 动画状态
    animating: true
  },

  lifetimes: {
    attached() {
      this.startAnimation()
    },
    
    detached() {
      this.stopAnimation()
    }
  },

  observers: {
    'show': function(show) {
      if (show) {
        this.startAnimation()
      } else {
        this.stopAnimation()
      }
    }
  },

  methods: {
    // 开始动画
    startAnimation() {
      this.setData({
        animating: true
      })
    },

    // 停止动画
    stopAnimation() {
      this.setData({
        animating: false
      })
    },

    // 点击遮罩
    onMaskTap() {
      if (!this.properties.fullscreen) {
        this.triggerEvent('masktap')
      }
    }
  }
})