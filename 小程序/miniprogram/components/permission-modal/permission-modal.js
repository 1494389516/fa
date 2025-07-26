// components/permission-modal/permission-modal.js - 权限弹窗组件
Component({
  properties: {
    show: {
      type: Boolean,
      value: false
    },
    title: {
      type: String,
      value: '权限授权'
    },
    permissions: {
      type: Array,
      value: []
    },
    features: {
      type: Array,
      value: []
    }
  },

  data: {
    animationData: {},
    maskAnimation: {}
  },

  observers: {
    'show': function(show) {
      this.toggleModal(show)
    }
  },

  methods: {
    // 切换弹窗显示状态
    toggleModal(show) {
      const animation = wx.createAnimation({
        duration: 300,
        timingFunction: 'ease-out'
      })

      const maskAnimation = wx.createAnimation({
        duration: 300,
        timingFunction: 'ease-out'
      })

      if (show) {
        // 显示动画
        maskAnimation.opacity(1).step()
        animation.translateY(0).opacity(1).step()
      } else {
        // 隐藏动画
        maskAnimation.opacity(0).step()
        animation.translateY('100%').opacity(0).step()
      }

      this.setData({
        animationData: animation.export(),
        maskAnimation: maskAnimation.export()
      })
    },

    // 同意授权
    onAgree() {
      this.triggerEvent('agree')
    },

    // 拒绝授权
    onReject() {
      this.triggerEvent('reject')
    },

    // 关闭弹窗
    onClose() {
      this.triggerEvent('close')
    },

    // 查看隐私政策
    onViewPrivacy() {
      this.triggerEvent('viewPrivacy')
    },

    // 阻止冒泡
    onStopPropagation() {
      // 阻止点击弹窗内容时关闭弹窗
    }
  }
})