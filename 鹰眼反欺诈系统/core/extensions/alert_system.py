#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
实时告警系统 - 扩展功能
当检测到高风险时，通过多种渠道发送告警
"""

import json
import logging
from typing import Dict, List
from datetime import datetime
from enum import Enum
import requests

logger = logging.getLogger(__name__)


class AlertChannel(Enum):
    """告警渠道"""
    EMAIL = "email"
    SMS = "sms"
    WEBHOOK = "webhook"
    WECHAT = "wechat"
    SLACK = "slack"
    DINGTALK = "dingtalk"


class AlertLevel(Enum):
    """告警级别"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class AlertSystem:
    """实时告警系统"""
    
    def __init__(self, config: Dict = None):
        self.config = config or {}
        self.enabled_channels = self._init_channels()
        logger.info("告警系统初始化完成")
    
    def _init_channels(self) -> Dict[AlertChannel, bool]:
        """初始化告警渠道"""
        return {
            AlertChannel.EMAIL: self.config.get('email_enabled', False),
            AlertChannel.SMS: self.config.get('sms_enabled', False),
            AlertChannel.WEBHOOK: self.config.get('webhook_enabled', True),
            AlertChannel.WECHAT: self.config.get('wechat_enabled', False),
            AlertChannel.SLACK: self.config.get('slack_enabled', False),
            AlertChannel.DINGTALK: self.config.get('dingtalk_enabled', False),
        }
    
    def send_alert(self, 
                   level: AlertLevel,
                   title: str,
                   message: str,
                   details: Dict = None,
                   channels: List[AlertChannel] = None):
        """
        发送告警
        
        Args:
            level: 告警级别
            title: 告警标题
            message: 告警消息
            details: 详细信息
            channels: 指定渠道，None则使用所有启用的渠道
        """
        if channels is None:
            channels = [ch for ch, enabled in self.enabled_channels.items() if enabled]
        
        alert_data = {
            'level': level.value,
            'title': title,
            'message': message,
            'details': details or {},
            'timestamp': datetime.now().isoformat(),
            'source': 'FraudHawk'
        }
        
        for channel in channels:
            try:
                if channel == AlertChannel.EMAIL:
                    self._send_email(alert_data)
                elif channel == AlertChannel.SMS:
                    self._send_sms(alert_data)
                elif channel == AlertChannel.WEBHOOK:
                    self._send_webhook(alert_data)
                elif channel == AlertChannel.WECHAT:
                    self._send_wechat(alert_data)
                elif channel == AlertChannel.SLACK:
                    self._send_slack(alert_data)
                elif channel == AlertChannel.DINGTALK:
                    self._send_dingtalk(alert_data)
            except Exception as e:
                logger.error(f"发送告警失败 ({channel.value}): {str(e)}")
    
    def _send_webhook(self, alert_data: Dict):
        """发送Webhook告警"""
        webhook_url = self.config.get('webhook_url')
        if not webhook_url:
            return
        
        try:
            response = requests.post(
                webhook_url,
                json=alert_data,
                timeout=5
            )
            response.raise_for_status()
            logger.info(f"Webhook告警发送成功")
        except Exception as e:
            logger.error(f"Webhook发送失败: {str(e)}")
    
    def _send_dingtalk(self, alert_data: Dict):
        """发送钉钉告警"""
        webhook_url = self.config.get('dingtalk_webhook')
        if not webhook_url:
            return
        
        # 钉钉消息格式
        level_emoji = {
            'info': '💡',
            'warning': '⚠️',
            'error': '❌',
            'critical': '🚨'
        }
        
        message = {
            "msgtype": "markdown",
            "markdown": {
                "title": f"🦅 鹰眼告警 - {alert_data['title']}",
                "text": f"""### {level_emoji.get(alert_data['level'], '📢')} {alert_data['title']}
                
**级别**: {alert_data['level'].upper()}

**消息**: {alert_data['message']}

**时间**: {alert_data['timestamp']}

**来源**: FraudHawk 鹰眼系统
"""
            }
        }
        
        try:
            response = requests.post(webhook_url, json=message, timeout=5)
            response.raise_for_status()
            logger.info("钉钉告警发送成功")
        except Exception as e:
            logger.error(f"钉钉告警发送失败: {str(e)}")
    
    def _send_slack(self, alert_data: Dict):
        """发送Slack告警"""
        webhook_url = self.config.get('slack_webhook')
        if not webhook_url:
            return
        
        color_map = {
            'info': '#36a64f',
            'warning': '#ff9900',
            'error': '#ff0000',
            'critical': '#8b0000'
        }
        
        message = {
            "attachments": [{
                "color": color_map.get(alert_data['level'], '#cccccc'),
                "title": f"🦅 FraudHawk Alert - {alert_data['title']}",
                "text": alert_data['message'],
                "fields": [
                    {"title": "Level", "value": alert_data['level'].upper(), "short": True},
                    {"title": "Time", "value": alert_data['timestamp'], "short": True}
                ],
                "footer": "FraudHawk Alert System"
            }]
        }
        
        try:
            response = requests.post(webhook_url, json=message, timeout=5)
            response.raise_for_status()
            logger.info("Slack告警发送成功")
        except Exception as e:
            logger.error(f"Slack告警发送失败: {str(e)}")
    
    def _send_email(self, alert_data: Dict):
        """发送邮件告警"""
        # TODO: 实现邮件发送
        logger.info("邮件告警功能待实现")
    
    def _send_sms(self, alert_data: Dict):
        """发送短信告警"""
        # TODO: 实现短信发送
        logger.info("短信告警功能待实现")
    
    def _send_wechat(self, alert_data: Dict):
        """发送微信告警"""
        # TODO: 实现微信发送
        logger.info("微信告警功能待实现")
    
    def fraud_detected_alert(self, user_id: str, risk_score: float, details: Dict):
        """欺诈检测告警"""
        level = AlertLevel.CRITICAL if risk_score > 0.85 else AlertLevel.WARNING
        
        self.send_alert(
            level=level,
            title=f"检测到高风险用户",
            message=f"用户 {user_id} 的风险评分为 {risk_score:.2f}",
            details={
                'user_id': user_id,
                'risk_score': risk_score,
                **details
            }
        )
    
    def system_error_alert(self, error_type: str, message: str):
        """系统错误告警"""
        self.send_alert(
            level=AlertLevel.ERROR,
            title=f"系统错误: {error_type}",
            message=message
        )


# 使用示例
if __name__ == '__main__':
    # 配置示例
    config = {
        'webhook_enabled': True,
        'webhook_url': 'https://your-webhook-url.com/alert',
        'dingtalk_enabled': True,
        'dingtalk_webhook': 'https://oapi.dingtalk.com/robot/send?access_token=xxx'
    }
    
    alert_system = AlertSystem(config)
    
    # 发送测试告警
    alert_system.send_alert(
        level=AlertLevel.INFO,
        title="系统测试",
        message="这是一条测试告警",
        details={'test': True}
    )
    
    # 欺诈检测告警
    alert_system.fraud_detected_alert(
        user_id="user_12345",
        risk_score=0.92,
        details={
            'detected_patterns': ['HIGH_FREQUENCY', 'SUSPICIOUS_DEVICE'],
            'defense_layers': [1, 4, 5, 6, 7]
        }
    )


