#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
实时反欺诈检测引擎 - 精简版（无深度学习依赖）
基于规则引擎 + VPN检测 + 设备指纹
"""

import numpy as np
import json
import time
import os
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from enum import Enum
import logging
from datetime import datetime
from pathlib import Path
from collections import defaultdict

import yaml

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class RiskLevel(Enum):
    """风险等级"""
    LOW = 0
    MEDIUM = 1
    HIGH = 2
    CRITICAL = 3


@dataclass
class DetectionResult:
    """检测结果"""
    user_id: str
    risk_score: float
    risk_level: RiskLevel
    fraud_probability: float
    detected_patterns: List[str]
    defense_layers_triggered: List[int]
    timestamp: float
    response_time_ms: float
    vpn_detected: bool = False
    vpn_type: str = "None"
    vpn_confidence: float = 0.0
    
    def to_dict(self) -> Dict:
        return {
            'user_id': self.user_id,
            'risk_score': self.risk_score,
            'risk_level': self.risk_level.name,
            'fraud_probability': self.fraud_probability,
            'detected_patterns': self.detected_patterns,
            'defense_layers': self.defense_layers_triggered,
            'timestamp': self.timestamp,
            'response_time_ms': self.response_time_ms,
            'vpn_detected': self.vpn_detected,
            'vpn_type': self.vpn_type,
            'vpn_confidence': self.vpn_confidence
        }


class SimplifiedDefenseSystem:
    """简化防御系统 - 基于规则引擎"""
    
    def __init__(self, config: Dict):
        self.config = config
        self.user_history = defaultdict(list)
        self.ip_blacklist = config.get('ip_blacklist', set())
        
    def layer1_data_purification(self, data: Dict) -> Tuple[bool, str]:
        """第1层：数据清洗"""
        ip = data.get('ip', '')
        
        # IP黑名单检查
        if ip in self.ip_blacklist:
            return False, "IP在黑名单中"
        
        # 基本数据完整性检查
        required_fields = ['user_id', 'ip']
        for field in required_fields:
            if not data.get(field):
                return False, f"缺少必要字段: {field}"
        
        return True, "数据清洗通过"
    
    def layer4_realtime_monitoring(self, user_id: str, action: str) -> Tuple[bool, List[str]]:
        """第4层：实时监控"""
        alerts = []
        
        # 记录用户行为
        self.user_history[user_id].append({
            'action': action,
            'timestamp': time.time()
        })
        
        # 检查频率异常
        recent_actions = [h for h in self.user_history[user_id] 
                         if time.time() - h['timestamp'] < 60]
        
        if len(recent_actions) > 100:
            alerts.append("高频操作异常")
        
        return len(alerts) == 0, alerts
    
    def layer5_increase_cost(self, user_id: str) -> List[str]:
        """第5层：提高成本"""
        measures = ["需要验证码", "限制操作频率"]
        return measures
    
    def layer6_decrease_profit(self, user_id: str, item_id: str) -> List[str]:
        """第6层：降低收益"""
        measures = ["商品降权", "延迟发货"]
        return measures
    
    def layer7_legal_deterrence(self, user_id: str, patterns: List[str]) -> List[str]:
        """第7层：法律威慑"""
        actions = [f"记录用户 {user_id} 违规行为", "准备法律证据链"]
        return actions


class FraudDetectionEngine:
    """简化版欺诈检测引擎"""
    
    def __init__(self, config_path: str = 'config/config.yaml'):
        self.config = self._load_config(config_path)
        
        # 初始化防御系统
        self.defense_system = SimplifiedDefenseSystem(self.config)
        
        # 初始化VPN检测器
        try:
            from core.extensions.vpn_detector import VPNDetector
            self.vpn_detector = VPNDetector()
            logger.info("VPN检测器初始化成功")
        except Exception as e:
            logger.warning(f"VPN检测器初始化失败: {e}")
            self.vpn_detector = None
        
        # 初始化设备指纹检测器
        try:
            from core.extensions.device_fingerprint import DeviceFingerprintDetector
            self.device_detector = DeviceFingerprintDetector()
            logger.info("设备指纹检测器初始化成功")
        except Exception as e:
            logger.warning(f"设备指纹检测器初始化失败: {e}")
            self.device_detector = None
        
        # 统计信息
        self.stats = {
            'total_requests': 0,
            'fraud_detected': 0,
            'avg_response_time': 0.0,
            'vpn_detected': 0
        }
        
        logger.info("✅ 简化版欺诈检测引擎初始化完成")
    
    def detect(self, transaction: Dict) -> DetectionResult:
        """主检测方法"""
        start_time = time.time()
        user_id = transaction.get('user_id', 'unknown')
        triggered_layers = []
        detected_patterns = []
        
        try:
            # 第1层：数据清洗
            passed, msg = self.defense_system.layer1_data_purification(transaction)
            if not passed:
                detected_patterns.append(msg)
                triggered_layers.append(1)
            
            # 第4层：实时监控
            passed, alerts = self.defense_system.layer4_realtime_monitoring(
                user_id, 
                transaction.get('action', 'purchase')
            )
            if not passed:
                detected_patterns.extend(alerts)
                triggered_layers.append(4)
            
            # 简化的风险评分（基于规则）
            risk_score = self._calculate_simple_risk_score(transaction, detected_patterns)
            fraud_prob = risk_score / 100.0
            
            # 确定风险等级
            risk_level = self._determine_risk_level(risk_score)
            
            # 高风险应用防御
            if risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
                self.defense_system.layer5_increase_cost(user_id)
                triggered_layers.append(5)
                
                self.defense_system.layer6_decrease_profit(
                    user_id,
                    transaction.get('item_id', '')
                )
                triggered_layers.append(6)
                
                if risk_level == RiskLevel.CRITICAL:
                    self.defense_system.layer7_legal_deterrence(
                        user_id,
                        detected_patterns
                    )
                    triggered_layers.append(7)
            
            # VPN检测
            vpn_detected = False
            vpn_type = "None"
            vpn_confidence = 0.0
            
            if self.vpn_detector:
                try:
                    vpn_result = self.vpn_detector.detect(transaction)
                    vpn_detected = vpn_result.is_vpn
                    vpn_type = vpn_result.vpn_type
                    vpn_confidence = vpn_result.confidence
                    
                    if vpn_detected:
                        detected_patterns.append(f"VPN检测: {vpn_type}")
                        self.stats['vpn_detected'] += 1
                        risk_score = min(100, risk_score * 1.2)
                except Exception as e:
                    logger.warning(f"VPN检测失败: {e}")
            
            # 设备指纹检测
            if self.device_detector:
                try:
                    device_result = self.device_detector.detect(transaction)
                    
                    if device_result.risk_factors:
                        detected_patterns.extend(device_result.risk_factors)
                    
                    if device_result.is_rooted or device_result.is_suspicious:
                        detected_patterns.append("🔴 高风险设备")
                        risk_score = min(100, risk_score * 1.5)
                        triggered_layers.append(8)
                    
                    if device_result.is_emulator:
                        risk_score = min(100, risk_score * 1.3)
                    
                    risk_score = min(100, risk_score + device_result.risk_score * 30)
                    
                except Exception as e:
                    logger.warning(f"设备指纹检测失败: {e}")
            
            # 计算响应时间
            response_time = (time.time() - start_time) * 1000
            
            # 构建结果
            result = DetectionResult(
                user_id=user_id,
                risk_score=risk_score,
                risk_level=risk_level,
                fraud_probability=fraud_prob,
                detected_patterns=detected_patterns,
                defense_layers_triggered=triggered_layers,
                timestamp=time.time(),
                response_time_ms=response_time,
                vpn_detected=vpn_detected,
                vpn_type=vpn_type,
                vpn_confidence=vpn_confidence
            )
            
            # 更新统计
            self._update_stats(result)
            
            return result
            
        except Exception as e:
            logger.error(f"检测失败: {e}", exc_info=True)
            return DetectionResult(
                user_id=user_id,
                risk_score=50.0,
                risk_level=RiskLevel.MEDIUM,
                fraud_probability=0.5,
                detected_patterns=[f"检测异常: {str(e)}"],
                defense_layers_triggered=[],
                timestamp=time.time(),
                response_time_ms=(time.time() - start_time) * 1000
            )
    
    def _calculate_simple_risk_score(self, transaction: Dict, patterns: List[str]) -> float:
        """简单风险评分"""
        score = 0.0
        
        # 基于金额
        amount = transaction.get('amount', 0)
        if amount > 10000:
            score += 30
        elif amount > 5000:
            score += 20
        elif amount > 1000:
            score += 10
        
        # 基于检测模式数量
        score += len(patterns) * 15
        
        # 随机模拟GNN分数（0-40分）
        gnn_score = np.random.uniform(0, 40)
        score += gnn_score
        
        return min(100.0, score)
    
    def _determine_risk_level(self, risk_score: float) -> RiskLevel:
        """确定风险等级"""
        if risk_score < 30:
            return RiskLevel.LOW
        elif risk_score < 60:
            return RiskLevel.MEDIUM
        elif risk_score < 85:
            return RiskLevel.HIGH
        else:
            return RiskLevel.CRITICAL
    
    def _update_stats(self, result: DetectionResult):
        """更新统计信息"""
        self.stats['total_requests'] += 1
        
        if result.risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
            self.stats['fraud_detected'] += 1
        
        # 更新平均响应时间
        n = self.stats['total_requests']
        old_avg = self.stats['avg_response_time']
        self.stats['avg_response_time'] = (old_avg * (n - 1) + result.response_time_ms) / n
    
    def get_stats(self) -> Dict:
        """获取统计信息"""
        total = self.stats['total_requests']
        fraud_rate = self.stats['fraud_detected'] / total if total > 0 else 0
        
        return {
            'total_requests': total,
            'fraud_detected': self.stats['fraud_detected'],
            'fraud_rate': fraud_rate,
            'avg_response_time': round(self.stats['avg_response_time'], 2),
            'requests_per_sec': 0,
            'vpn_detected': self.stats.get('vpn_detected', 0)
        }
    
    def _load_config(self, config_path: str) -> Dict:
        """加载配置"""
        base_config = {}
        if Path(config_path).exists():
            try:
                with open(config_path, 'r', encoding='utf-8') as f:
                    base_config = yaml.safe_load(f) or {}
            except Exception as e:
                logger.warning(f"配置文件加载失败: {e}")
        
        # 环境变量覆盖
        env_config = {
            'redis_host': os.getenv('REDIS_HOST', 'localhost'),
            'redis_port': int(os.getenv('REDIS_PORT', 6379)),
            'ip_blacklist': set()
        }
        
        base_config.update(env_config)
        return base_config


if __name__ == "__main__":
    # 测试
    engine = FraudDetectionEngine()
    
    test_transaction = {
        'user_id': 'test_001',
        'ip': '192.168.1.100',
        'device_id': 'device_abc',
        'amount': 1000,
        'action': 'purchase'
    }
    
    result = engine.detect(test_transaction)
    print(json.dumps(result.to_dict(), indent=2, ensure_ascii=False))


