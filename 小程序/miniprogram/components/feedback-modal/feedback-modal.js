// components/feedback-modal/feedback-modal.js - 用户反馈模态框组件
import api from '../../utils/api.js'
import logger from '../../utils/logger.js'
import { showToast, getSystemInfo } from '../../utils/ui.js'

Component({
  properties: {
    show: {
      type: Boolean,
      value: false
    }
  },

  data: {
    // 反馈类型
    feedbackTypes: [
      { value: 'bug', label: '问题反馈' },
      { value: 'feature', label: '功能建议' },
      { value: 'improvement', label: '体验优化' },
      { value: 'other', label: '其他' }
    ],
    // 表单数据
    formData: {
      type: 'bug',
      title: '',
      content: '',
      contact: ''
    },
    // 提交状态
    submitting: false,
    // 字符计数
    titleCount: 0,
    contentCount: 0
  },

  methods: {
    // 关闭模态框
    onClose() {
      this.triggerEvent('close')
      this.resetForm()
    },

    // 重置表单
    resetForm() {
      this.setData({
        formData: {
          type: 'bug',
          title: '',
          content: '',
          contact: ''
        },
        titleCount: 0,
        contentCount: 0,
        submitting: false
      })
    },

    // 反馈类型改变
    onTypeChange(e) {
      const type = this.data.feedbackTypes[e.detail.value].value
      this.setData({
        'formData.type': type
      })
    },

    // 标题输入
    onTitleInput(e) {
      const title = e.detail.value
      this.setData({
        'formData.title': title,
        titleCount: title.length
      })
    },

    // 内容输入
    onContentInput(e) {
      const content = e.detail.value
      this.setData({
        'formData.content': content,
        contentCount: content.length
      })
    },

    // 联系方式输入
    onContactInput(e) {
      const contact = e.detail.value
      this.setData({
        'formData.contact': contact
      })
    },

    // 表单验证
    validateForm() {
      const { title, content } = this.data.formData

      if (!title.trim()) {
        showToast({
          title: '请输入反馈标题',
          icon: 'none'
        })
        return false
      }

      if (title.length > 100) {
        showToast({
          title: '标题不能超过100个字符',
          icon: 'none'
        })
        return false
      }

      if (!content.trim()) {
        showToast({
          title: '请输入反馈内容',
          icon: 'none'
        })
        return false
      }

      if (content.length > 1000) {
        showToast({
          title: '内容不能超过1000个字符',
          icon: 'none'
        })
        return false
      }

      return true
    },

    // 提交反馈
    async onSubmit() {
      if (!this.validateForm()) {
        return
      }

      if (this.data.submitting) {
        return
      }

      try {
        this.setData({ submitting: true })

        logger.info('提交用户反馈', this.data.formData)

        // 获取系统信息
        const systemInfo = await getSystemInfo()

        // 提交反馈
        const response = await api.post('/errors/feedback', {
          ...this.data.formData,
          systemInfo
        })

        if (response.code === 0) {
          showToast({
            title: '反馈提交成功',
            icon: 'success'
          })

          logger.info('用户反馈提交成功', {
            feedbackId: response.data.feedbackId
          })

          // 触发提交成功事件
          this.triggerEvent('submit', {
            feedbackId: response.data.feedbackId
          })

          // 关闭模态框
          this.onClose()
        } else {
          throw new Error(response.message)
        }

      } catch (error) {
        logger.error('提交用户反馈失败', error)
        
        showToast({
          title: '提交失败，请稍后重试',
          icon: 'none'
        })
      } finally {
        this.setData({ submitting: false })
      }
    },

    // 阻止事件冒泡
    onTouchMove() {
      // 阻止滚动穿透
    }
  }
})