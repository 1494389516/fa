#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
实时反欺诈检测引擎 - 核心模块
基于图对抗算法的7层防御体系

作者: 基于您的图对抗算法和风控系统项目
版本: 1.0.0
"""

import numpy as np
import json
import time
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from enum import Enum
import logging
from datetime import datetime
from pathlib import Path
from copy import deepcopy

import yaml
import redis
import psycopg2
from kafka import KafkaProducer, KafkaConsumer

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


class GraphNeuralNetworkDetector(nn.Module):
    """
    图神经网络欺诈检测器
    基于GCN + GAT的混合架构，用于检测图中的异常节点和子图
    """
    
    def __init__(self, input_dim: int, hidden_dim: int = 64, output_dim: int = 2):
        super(GraphNeuralNetworkDetector, self).__init__()
        
        # GCN层 - 捕获局部结构
        self.conv1 = GCNConv(input_dim, hidden_dim)
        self.conv2 = GCNConv(hidden_dim, hidden_dim)
        
        # GAT层 - 注意力机制，关注重要邻居
        self.gat1 = GATConv(hidden_dim, hidden_dim, heads=4, concat=True)
        self.gat2 = GATConv(hidden_dim * 4, hidden_dim, heads=1, concat=False)
        
        # 分类层
        self.fc1 = nn.Linear(hidden_dim, hidden_dim // 2)
        self.fc2 = nn.Linear(hidden_dim // 2, output_dim)
        
        # Dropout防止过拟合
        self.dropout = nn.Dropout(0.5)
        
    def forward(self, x, edge_index):
        """
        前向传播
        x: 节点特征 [num_nodes, input_dim]
        edge_index: 边索引 [2, num_edges]
        """
        # GCN层
        x = self.conv1(x, edge_index)
        x = F.relu(x)
        x = self.dropout(x)
        
        x = self.conv2(x, edge_index)
        x = F.relu(x)
        x = self.dropout(x)
        
        # GAT层（注意力机制）
        x = self.gat1(x, edge_index)
        x = F.elu(x)
        x = self.dropout(x)
        
        x = self.gat2(x, edge_index)
        x = F.relu(x)
        
        # 分类
        x = self.fc1(x)
        x = F.relu(x)
        x = self.dropout(x)
        
        x = self.fc2(x)
        
        return F.log_softmax(x, dim=1)


class SevenLayerDefenseSystem:
    """
    7层纵深防御体系
    基于您的图对抗算法项目的防御哲学
    """
    
    def __init__(self, config: Dict):
        self.config = config
        self.layers_status = [True] * 8  # 扩展到8层（第0层+原7层）
        
        # 初始化环境检测器
        try:
            from core.extensions.environment_detector import EnvironmentDetector
            self.environment_detector = EnvironmentDetector()
        except Exception as e:
            logger.warning(f"防御系统中环境检测器初始化失败: {e}")
            self.environment_detector = None
        
        logger.info("8层防御体系初始化完成（第0层环境检测 + 原7层）")
    
    def layer0_environment_check(self, transaction: Dict) -> Tuple[bool, List[str], Optional[Any]]:
        """
        第0层：环境预检（最优先级）
        在所有业务检测之前检测运行环境是否安全
        
        检测内容：
        - eBPF 程序监控（eCapture 等）
        - 调试器附加（gdb, lldb, frida 等）
        - 性能分析工具（py-spy, cProfile 等）
        - 虚拟化环境
        - 时间异常（反调试）
        
        Args:
            transaction: 交易数据
        
        Returns:
            (是否安全, 威胁列表, 检测结果对象)
        """
        if not self.environment_detector:
            return True, [], None
        
        try:
            result = self.environment_detector.detect(transaction)
            
            # 严重威胁直接拒绝
            if result.threat_level == "CRITICAL":
                logger.critical(
                    f"第0层：检测到严重环境威胁，拒绝服务 - "
                    f"威胁: {result.threats_detected}"
                )
                return False, result.threats_detected, result
            
            # 高威胁发出警告
            if result.threat_level == "HIGH":
                logger.warning(
                    f"第0层：检测到高等级环境威胁 - "
                    f"威胁: {result.threats_detected}"
                )
            
            return result.is_safe, result.threats_detected, result
            
        except Exception as e:
            logger.error(f"第0层环境检测失败: {e}")
            return True, [], None
        
    def layer1_data_purification(self, data: Dict) -> Tuple[bool, str]:
        """
        第1层：数据清洗 - 图净化
        移除明显的异常数据和噪音
        """
        patterns_detected = []
        
        # 检查IP黑名单
        if data.get('ip') in self.config.get('ip_blacklist', set()):
            patterns_detected.append("IP_BLACKLISTED")
            return False, "IP在黑名单中"
        
        # 检查设备指纹异常
        if self._is_device_suspicious(data.get('device_id')):
            patterns_detected.append("SUSPICIOUS_DEVICE")
            return False, "可疑设备"
        
        # 检查时间异常（深夜高频操作）
        if self._is_time_anomaly(data.get('timestamp')):
            patterns_detected.append("TIME_ANOMALY")
        
        return True, "数据清洗通过"
    
    def layer2_adversarial_training(self, features: torch.Tensor) -> float:
        """
        第2层：对抗训练
        使用对抗样本训练的模型进行检测
        """
        # 对抗鲁棒性评分
        robustness_score = self._calculate_adversarial_robustness(features)
        return robustness_score
    
    def layer3_dynamic_retraining(self, user_id: str) -> bool:
        """
        第3层：动态重训练
        检查是否需要模型更新
        """
        # 检查最近的数据分布是否漂移
        drift_detected = self._detect_concept_drift(user_id)
        
        if drift_detected:
            logger.warning(f"检测到概念漂移，用户 {user_id}")
            # 触发增量学习
            self._trigger_incremental_learning()
        
        return not drift_detected
    
    def layer4_realtime_monitoring(self, user_id: str, action: str) -> Tuple[bool, List[str]]:
        """
        第4层：实时监控
        检测异常行为模式
        """
        alerts = []
        
        # 检查频率异常
        if self._is_high_frequency(user_id, action):
            alerts.append("HIGH_FREQUENCY_ATTACK")
        
        # 检查关系网络异常
        if self._is_collusion_network(user_id):
            alerts.append("COLLUSION_DETECTED")
        
        # 检查行为序列异常
        if self._is_behavior_anomaly(user_id):
            alerts.append("BEHAVIOR_ANOMALY")
        
        return len(alerts) == 0, alerts
    
    def layer5_increase_cost(self, user_id: str) -> Dict:
        """
        第5层：提高攻击成本（经济手段）
        实名认证、验证码、操作限制等
        """
        cost_measures = {
            'require_captcha': False,
            'require_phone_verification': False,
            'require_id_verification': False,
            'rate_limit': None
        }
        
        # 获取用户信用评分
        credit_score = self._get_user_credit_score(user_id)
        
        if credit_score < 60:
            cost_measures['require_captcha'] = True
            cost_measures['rate_limit'] = 10  # 每分钟最多10次
        
        if credit_score < 40:
            cost_measures['require_phone_verification'] = True
        
        if credit_score < 20:
            cost_measures['require_id_verification'] = True
        
        return cost_measures
    
    def layer6_decrease_profit(self, user_id: str, item_id: str) -> Dict:
        """
        第6层：降低攻击收益（经济手段）
        降权、延迟展示、人工审核等
        """
        profit_measures = {
            'rank_penalty': 0.0,
            'delay_hours': 0,
            'require_manual_review': False,
            'exposure_limit': None
        }
        
        # 获取用户和商品的风险评分
        user_risk = self._get_user_risk_score(user_id)
        item_risk = self._get_item_risk_score(item_id)
        
        combined_risk = (user_risk + item_risk) / 2
        
        if combined_risk > 0.7:
            profit_measures['rank_penalty'] = 0.5  # 排名降低50%
            profit_measures['delay_hours'] = 24     # 延迟24小时展示
            profit_measures['require_manual_review'] = True
        
        if combined_risk > 0.5:
            profit_measures['exposure_limit'] = 1000  # 曝光上限
        
        return profit_measures
    
    def layer7_legal_deterrence(self, user_id: str, evidence: List[str]) -> Dict:
        """
        第7层：法律威慑
        黑名单、证据收集、法律追责
        """
        actions = {
            'add_to_blacklist': False,
            'collect_evidence': False,
            'report_to_authority': False,
            'freeze_account': False
        }
        
        # 如果有明确的欺诈证据
        if len(evidence) >= 3:
            actions['add_to_blacklist'] = True
            actions['collect_evidence'] = True
        
        # 如果是重大欺诈
        if 'LARGE_SCALE_FRAUD' in evidence:
            actions['report_to_authority'] = True
            actions['freeze_account'] = True
            logger.critical(f"检测到重大欺诈行为，用户 {user_id}，已冻结账户并报告")
        
        return actions
    
    # 辅助方法
    def _is_device_suspicious(self, device_id: str) -> bool:
        """检查设备是否可疑"""
        # 简化实现，实际应该查询设备库
        return False
    
    def _is_time_anomaly(self, timestamp: float) -> bool:
        """检查时间是否异常"""
        hour = datetime.fromtimestamp(timestamp).hour
        return hour >= 2 and hour <= 5  # 深夜2-5点
    
    def _calculate_adversarial_robustness(self, features: torch.Tensor) -> float:
        """计算对抗鲁棒性"""
        # 简化实现
        return 0.85
    
    def _detect_concept_drift(self, user_id: str) -> bool:
        """检测概念漂移"""
        return False
    
    def _trigger_incremental_learning(self):
        """触发增量学习"""
        logger.info("触发增量学习...")
    
    def _is_high_frequency(self, user_id: str, action: str) -> bool:
        """检查是否高频操作"""
        # 实际应该从Redis查询
        return False
    
    def _is_collusion_network(self, user_id: str) -> bool:
        """检查是否存在共谋网络"""
        return False
    
    def _is_behavior_anomaly(self, user_id: str) -> bool:
        """检查行为序列是否异常"""
        return False
    
    def _get_user_credit_score(self, user_id: str) -> float:
        """获取用户信用评分"""
        return 75.0  # 简化实现
    
    def _get_user_risk_score(self, user_id: str) -> float:
        """获取用户风险评分"""
        return 0.3  # 简化实现
    
    def _get_item_risk_score(self, item_id: str) -> float:
        """获取商品风险评分"""
        return 0.2  # 简化实现


class FraudDetectionEngine:
    """
    欺诈检测引擎主类
    整合GNN模型和7层防御体系
    """
    
    def __init__(self, config_path: str = 'config/config.yaml'):
        self.config = self._load_config(config_path)
        
        # 初始化GNN模型
        self.gnn_model = self._load_gnn_model()
        
        # 初始化7层防御
        self.defense_system = SevenLayerDefenseSystem(self.config)
        
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
        
        # 初始化环境检测器
        try:
            from core.extensions.environment_detector import EnvironmentDetector
            self.environment_detector = EnvironmentDetector()
            logger.info("环境检测器初始化成功")
        except Exception as e:
            logger.warning(f"环境检测器初始化失败: {e}")
            self.environment_detector = None
        
        # 初始化数据库连接
        self.redis_client = self._init_redis()
        self.pg_conn = self._init_postgres()
        
        # 初始化Kafka
        self.kafka_producer = self._init_kafka_producer()
        
        # 统计信息
        self.stats = {
            'total_requests': 0,
            'fraud_detected': 0,
            'avg_response_time': 0.0,
            'vpn_detected': 0,
            'environment_threats': 0
        }
        
        logger.info("欺诈检测引擎初始化完成")
    
    def detect(self, transaction: Dict) -> DetectionResult:
        """
        主检测方法
        
        Args:
            transaction: 交易数据字典
                {
                    'user_id': str,
                    'item_id': str,
                    'amount': float,
                    'timestamp': float,
                    'ip': str,
                    'device_id': str,
                    'features': list
                }
        
        Returns:
            DetectionResult: 检测结果
        """
        start_time = time.time()
        user_id = transaction['user_id']
        triggered_layers = []
        detected_patterns = []
        
        try:
            # 第0层：环境安全检测（在所有检测之前）
            if self.environment_detector:
                try:
                    env_result = self.environment_detector.detect(transaction)
                    
                    if not env_result.is_safe:
                        triggered_layers.append(0)
                        self.stats['environment_threats'] += 1
                        
                        # 添加威胁信息到检测模式
                        for threat_name in env_result.threats_detected:
                            threat_info = env_result.threat_details.get(threat_name)
                            if threat_info:
                                detected_patterns.append(
                                    f"🔴 环境威胁[{threat_info.severity}]: {threat_name}"
                                )
                        
                        # 根据威胁等级决定是否拒绝服务
                        if env_result.threat_level == "CRITICAL":
                            logger.critical(
                                f"检测到严重环境威胁，拒绝处理请求 - "
                                f"用户: {user_id}, 威胁: {env_result.threats_detected}"
                            )
                            
                            # 直接返回高风险结果
                            return DetectionResult(
                                user_id=user_id,
                                risk_score=100.0,
                                risk_level=RiskLevel.CRITICAL,
                                fraud_probability=1.0,
                                detected_patterns=detected_patterns,
                                defense_layers_triggered=[0],
                                timestamp=time.time(),
                                response_time_ms=(time.time() - start_time) * 1000,
                                vpn_detected=False,
                                vpn_type="None",
                                vpn_confidence=0.0
                            )
                        
                        # HIGH 级别的威胁会大幅提高风险评分
                        logger.warning(
                            f"环境威胁检测 - 用户: {user_id}, "
                            f"等级: {env_result.threat_level}, "
                            f"风险: {env_result.risk_score:.2%}"
                        )
                        
                except Exception as e:
                    logger.warning(f"环境检测失败: {e}")
            
            # 第1层：数据清洗
            passed, msg = self.defense_system.layer1_data_purification(transaction)
            if not passed:
                detected_patterns.append(msg)
                triggered_layers.append(1)
            
            # 第2-7层防御检查
            # 第4层：实时监控
            passed, alerts = self.defense_system.layer4_realtime_monitoring(
                user_id, 
                transaction.get('action', 'purchase')
            )
            if not passed:
                detected_patterns.extend(alerts)
                triggered_layers.append(4)
            
            # 使用GNN模型进行预测
            fraud_prob = self._predict_with_gnn(transaction)
            
            # 计算综合风险评分
            risk_score = self._calculate_risk_score(fraud_prob, detected_patterns)
            
            # 确定风险等级
            risk_level = self._determine_risk_level(risk_score)
            
            # 如果是高风险，应用经济防御
            if risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
                # 第5层：提高成本
                cost_measures = self.defense_system.layer5_increase_cost(user_id)
                triggered_layers.append(5)
                
                # 第6层：降低收益
                profit_measures = self.defense_system.layer6_decrease_profit(
                    user_id,
                    transaction.get('item_id', '')
                )
                triggered_layers.append(6)
                
                # 第7层：法律威慑
                if risk_level == RiskLevel.CRITICAL:
                    legal_actions = self.defense_system.layer7_legal_deterrence(
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
                        # VPN使用提高风险评分
                        risk_score = min(100, risk_score * 1.2)
                except Exception as e:
                    logger.warning(f"VPN检测失败: {e}")
            
            # 设备指纹检测
            device_risk = 0.0
            if self.device_detector:
                try:
                    device_result = self.device_detector.detect(transaction)
                    device_risk = device_result.risk_score
                    
                    # 添加设备风险因素到检测模式
                    if device_result.risk_factors:
                        detected_patterns.extend(device_result.risk_factors)
                    
                    # 刷机/Root设备直接列入高风险
                    if device_result.is_rooted or device_result.is_suspicious:
                        detected_patterns.append("🔴 高风险设备")
                        risk_score = min(100, risk_score * 1.5)
                        triggered_layers.append(8)  # 标记为设备层检测
                    
                    # 模拟器设备提高风险
                    if device_result.is_emulator:
                        risk_score = min(100, risk_score * 1.3)
                    
                    # 设备风险分数直接影响总风险
                    risk_score = min(100, risk_score + device_risk * 30)
                    
                except Exception as e:
                    logger.warning(f"设备指纹检测失败: {e}")
            
            # 计算响应时间
            response_time = (time.time() - start_time) * 1000  # 转换为毫秒
            
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
            
            # 发送到Kafka进行异步处理
            self._send_to_kafka(result)
            
            # 存储结果
            self._store_result(result)
            
            logger.info(f"检测完成: {user_id}, 风险等级: {risk_level.name}, "
                       f"响应时间: {response_time:.2f}ms")
            
            return result
            
        except Exception as e:
            logger.error(f"检测过程出错: {str(e)}", exc_info=True)
            raise
    
    def _predict_with_gnn(self, transaction: Dict) -> float:
        """使用GNN模型进行预测"""
        try:
            # 构建图数据
            graph_data = self._build_graph(transaction)
            
            # 模型推理
            with torch.no_grad():
                self.gnn_model.eval()
                output = self.gnn_model(graph_data.x, graph_data.edge_index)
                probs = torch.exp(output)
                fraud_prob = probs[:, 1].mean().item()  # 欺诈类别的概率
            
            return fraud_prob
            
        except Exception as e:
            logger.error(f"GNN预测失败: {str(e)}")
            return 0.5  # 返回默认值
    
    def _build_graph(self, transaction: Dict) -> Data:
        """
        根据交易构建图数据
        包括用户-商品、用户-用户、商品-商品关系
        """
        # 简化实现 - 实际应该从数据库获取完整的关系图
        num_nodes = 10
        features = torch.randn(num_nodes, 32)  # 节点特征
        edge_index = torch.tensor([[0, 1, 2], [1, 2, 0]], dtype=torch.long)
        
        return Data(x=features, edge_index=edge_index)
    
    def _calculate_risk_score(self, fraud_prob: float, patterns: List[str]) -> float:
        """计算综合风险评分"""
        base_score = fraud_prob
        
        # 根据检测到的模式调整评分
        pattern_penalty = len(patterns) * 0.1
        
        final_score = min(base_score + pattern_penalty, 1.0)
        return final_score
    
    def _determine_risk_level(self, risk_score: float) -> RiskLevel:
        """确定风险等级"""
        if risk_score < 0.3:
            return RiskLevel.LOW
        elif risk_score < 0.6:
            return RiskLevel.MEDIUM
        elif risk_score < 0.85:
            return RiskLevel.HIGH
        else:
            return RiskLevel.CRITICAL
    
    def _load_config(self, config_path: str) -> Dict:
        """加载配置"""
        default_config = {
            'database': {
                'redis': {
                    'host': 'localhost',
                    'port': 6379,
                    'db': 0,
                    'password': None,
                    'max_connections': 50,
                },
                'postgresql': {
                    'dsn': 'postgresql://postgres:postgres@localhost:5432/frauddb',
                    'host': 'localhost',
                    'port': 5432,
                    'database': 'frauddb',
                    'user': 'postgres',
                    'password': 'postgres',
                },
            },
            'kafka': {
                'bootstrap_servers': ['localhost:9092'],
            },
            'rules': {
                'ip_blacklist': {
                    'enabled': False,
                    'file': None,
                }
            }
        }

        config = deepcopy(default_config)
        config_path_obj = Path(config_path)

        if config_path_obj.exists():
            try:
                with config_path_obj.open('r', encoding='utf-8') as f:
                    file_config = yaml.safe_load(f) or {}
                config = self._merge_dicts(config, file_config)
                logger.info("配置文件加载完成: %s", config_path_obj)
            except Exception as exc:
                logger.warning("加载配置文件失败，使用默认配置: %s", exc)
        else:
            logger.warning("配置文件 %s 不存在，使用默认配置", config_path_obj)

        redis_cfg = config.get('database', {}).get('redis', {})
        postgres_cfg = config.get('database', {}).get('postgresql', {})
        kafka_cfg = config.get('kafka', {})

        flattened = {
            'ip_blacklist': self._load_ip_blacklist(config),
            'redis_host': redis_cfg.get('host', 'localhost'),
            'redis_port': redis_cfg.get('port', 6379),
            'redis_db': redis_cfg.get('db', 0),
            'redis_password': redis_cfg.get('password'),
            'postgres_dsn': postgres_cfg.get('dsn') or self._build_postgres_dsn(postgres_cfg),
            'kafka_servers': kafka_cfg.get('bootstrap_servers', ['localhost:9092'])
        }

        # 合并平铺配置供旧逻辑使用
        config.update(flattened)
        return config

    def _merge_dicts(self, base: Dict, override: Dict) -> Dict:
        """递归合并配置字典"""
        result = deepcopy(base)
        for key, value in override.items():
            if isinstance(value, dict) and isinstance(result.get(key), dict):
                result[key] = self._merge_dicts(result[key], value)
            else:
                result[key] = value
        return result

    def _build_postgres_dsn(self, cfg: Dict) -> str:
        host = cfg.get('host', 'localhost')
        port = cfg.get('port', 5432)
        database = cfg.get('database', 'frauddb')
        user = cfg.get('user', 'postgres')
        password = cfg.get('password', 'postgres')
        return f"postgresql://{user}:{password}@{host}:{port}/{database}"

    def _load_ip_blacklist(self, config: Dict) -> set:
        rules_cfg = config.get('rules', {}).get('ip_blacklist', {})
        if not rules_cfg.get('enabled', False):
            return set()

        file_path = rules_cfg.get('file')
        if not file_path:
            logger.warning("IP 黑名单已启用但未提供文件路径")
            return set()

        path = Path(file_path)
        if not path.exists():
            logger.warning("IP 黑名单文件不存在: %s", file_path)
            return set()

        ip_set = set()
        try:
            with path.open('r', encoding='utf-8') as f:
                for line in f:
                    cleaned = line.strip()
                    if cleaned and not cleaned.startswith('#'):
                        ip_set.add(cleaned)
        except Exception as exc:
            logger.warning("读取 IP 黑名单失败: %s", exc)
            return set()

        logger.info("已加载 %d 条 IP 黑名单记录", len(ip_set))
        return ip_set
    
    def _load_gnn_model(self) -> nn.Module:
        """加载GNN模型"""
        model = GraphNeuralNetworkDetector(input_dim=32, hidden_dim=64)
        # 实际应该加载预训练权重
        return model
    
    def _init_redis(self):
        """初始化Redis连接"""
        try:
            return redis.Redis(
                host=self.config['redis_host'],
                port=self.config['redis_port'],
                decode_responses=True
            )
        except Exception as e:
            logger.warning(f"Redis连接失败: {str(e)}")
            return None
    
    def _init_postgres(self):
        """初始化PostgreSQL连接"""
        try:
            return psycopg2.connect(self.config['postgres_dsn'])
        except Exception as e:
            logger.warning(f"PostgreSQL连接失败: {str(e)}")
            return None
    
    def _init_kafka_producer(self):
        """初始化Kafka生产者"""
        try:
            return KafkaProducer(
                bootstrap_servers=self.config['kafka_servers'],
                value_serializer=lambda v: json.dumps(v).encode('utf-8')
            )
        except Exception as e:
            logger.warning(f"Kafka连接失败: {str(e)}")
            return None
    
    def _send_to_kafka(self, result: DetectionResult):
        """发送结果到Kafka"""
        if self.kafka_producer:
            try:
                self.kafka_producer.send('fraud_detection_results', result.to_dict())
            except Exception as e:
                logger.error(f"发送Kafka消息失败: {str(e)}")
    
    def _store_result(self, result: DetectionResult):
        """存储检测结果"""
        # 存储到Redis（快速查询）
        if self.redis_client:
            try:
                key = f"fraud:result:{result.user_id}:{int(result.timestamp)}"
                self.redis_client.setex(key, 3600, json.dumps(result.to_dict()))
            except Exception as e:
                logger.error(f"Redis存储失败: {str(e)}")
        
        # 存储到PostgreSQL（持久化）
        if self.pg_conn:
            try:
                cursor = self.pg_conn.cursor()
                cursor.execute("""
                    INSERT INTO fraud_detection_results 
                    (user_id, risk_score, risk_level, fraud_probability, 
                     detected_patterns, defense_layers, timestamp)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    result.user_id,
                    result.risk_score,
                    result.risk_level.name,
                    result.fraud_probability,
                    json.dumps(result.detected_patterns),
                    json.dumps(result.defense_layers_triggered),
                    result.timestamp
                ))
                self.pg_conn.commit()
            except Exception as e:
                logger.error(f"PostgreSQL存储失败: {str(e)}")
                self.pg_conn.rollback()
    
    def _update_stats(self, result: DetectionResult):
        """更新统计信息"""
        self.stats['total_requests'] += 1
        
        if result.risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
            self.stats['fraud_detected'] += 1
        
        # 更新平均响应时间
        n = self.stats['total_requests']
        avg = self.stats['avg_response_time']
        self.stats['avg_response_time'] = (avg * (n - 1) + result.response_time_ms) / n
    
    def get_stats(self) -> Dict:
        """获取统计信息"""
        return {
            **self.stats,
            'fraud_rate': self.stats['fraud_detected'] / max(self.stats['total_requests'], 1),
            'detection_rate': 1.0 if self.stats['fraud_detected'] > 0 else 0.0
        }


def main():
    """主函数 - 示例"""
    print("=" * 60)
    print("🤖 实时反欺诈检测引擎")
    print("基于图对抗算法的7层防御体系")
    print("=" * 60)
    
    # 初始化引擎
    engine = FraudDetectionEngine()
    
    # 模拟交易
    test_transactions = [
        {
            'user_id': 'user_001',
            'item_id': 'item_123',
            'amount': 99.99,
            'timestamp': time.time(),
            'ip': '192.168.1.100',
            'device_id': 'device_001',
            'action': 'purchase'
        },
        {
            'user_id': 'user_002',
            'item_id': 'item_456',
            'amount': 1999.99,
            'timestamp': time.time(),
            'ip': '192.168.1.101',
            'device_id': 'device_002',
            'action': 'purchase'
        }
    ]
    
    print("\n开始检测...\n")
    
    for i, transaction in enumerate(test_transactions, 1):
        print(f"--- 交易 #{i} ---")
        result = engine.detect(transaction)
        
        print(f"用户ID: {result.user_id}")
        print(f"风险评分: {result.risk_score:.3f}")
        print(f"风险等级: {result.risk_level.name}")
        print(f"欺诈概率: {result.fraud_probability:.3f}")
        print(f"检测模式: {', '.join(result.detected_patterns) if result.detected_patterns else '无'}")
        print(f"触发防御层: {result.defense_layers_triggered}")
        print(f"响应时间: {result.response_time_ms:.2f}ms")
        print()
    
    # 显示统计
    stats = engine.get_stats()
    print("\n" + "=" * 60)
    print("📊 统计信息")
    print("=" * 60)
    print(f"总请求数: {stats['total_requests']}")
    print(f"检测到欺诈: {stats['fraud_detected']}")
    print(f"欺诈率: {stats['fraud_rate']:.2%}")
    print(f"平均响应时间: {stats['avg_response_time']:.2f}ms")
    print("=" * 60)


if __name__ == '__main__':
    main()

