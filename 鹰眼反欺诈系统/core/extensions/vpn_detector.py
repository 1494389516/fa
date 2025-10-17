"""
VPN流量检测模块
基于多阶段级联检测架构
"""
import numpy as np
import json
import hashlib
import time
import logging
from collections import defaultdict, deque
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)

@dataclass
class Packet:
    """数据包结构"""
    timestamp: float
    src_ip: str
    dst_ip: str
    src_port: int
    dst_port: int
    protocol: str
    size: int
    direction: str  # 'up' or 'down'
    payload_size: int
    tls_info: Optional[Dict] = None
    
@dataclass
class VPNDetectionResult:
    """VPN检测结果"""
    flow_id: str
    is_vpn: bool
    confidence: float
    detection_stage: str
    vpn_type: str
    features: Dict[str, Any]
    timestamp: float
    
class VPNType(Enum):
    """VPN类型枚举"""
    OPENVPN = "OpenVPN"
    IPSEC = "IPSec"
    WIREGUARD = "WireGuard"
    PPTP = "PPTP"
    L2TP = "L2TP"
    SSTP = "SSTP"
    UNKNOWN = "Unknown"
    NONE = "None"

class BiDirectionalFeatureExtractor:
    """双向结构化特征提取器"""
    
    def extract_features(self, packets: List[Packet]) -> Dict[str, Any]:
        """提取双向结构化特征"""
        if not packets:
            return self._empty_features()
            
        # 分离上行和下行流量
        up_packets = [p for p in packets if p.direction == 'up']
        down_packets = [p for p in packets if p.direction == 'down']
        
        features = {
            # 包长直方图
            'packet_length_histogram': self._calculate_histogram([p.size for p in packets]),
            'up_packet_length_histogram': self._calculate_histogram([p.size for p in up_packets]),
            'down_packet_length_histogram': self._calculate_histogram([p.size for p in down_packets]),
            
            # IAT(到达间隔)直方图
            'iat_histogram': self._calculate_iat_histogram(packets),
            'up_iat_histogram': self._calculate_iat_histogram(up_packets),
            'down_iat_histogram': self._calculate_iat_histogram(down_packets),
            
            # 方向比/切换率
            'direction_ratio': len(up_packets) / len(packets) if packets else 0,
            'direction_switches': self._calculate_direction_switches(packets),
            
            # 突发度/熵
            'burstiness': self._calculate_burstiness(packets),
            'entropy': self._calculate_entropy([p.size for p in packets]),
            
            # 会话与上下文
            'flow_duration': packets[-1].timestamp - packets[0].timestamp if len(packets) > 1 else 0,
            'packet_count': len(packets),
            'total_bytes': sum(p.size for p in packets)
        }
        
        return features
        
    def _empty_features(self) -> Dict[str, Any]:
        """空特征"""
        return {
            'packet_length_histogram': [0] * 10,
            'up_packet_length_histogram': [0] * 10,
            'down_packet_length_histogram': [0] * 10,
            'iat_histogram': [0] * 10,
            'up_iat_histogram': [0] * 10,
            'down_iat_histogram': [0] * 10,
            'direction_ratio': 0,
            'direction_switches': 0,
            'burstiness': 0,
            'entropy': 0,
            'flow_duration': 0,
            'packet_count': 0,
            'total_bytes': 0
        }
        
    def _calculate_histogram(self, values: List[float], bins: int = 10) -> List[int]:
        """计算直方图"""
        if not values:
            return [0] * bins
        hist, _ = np.histogram(values, bins=bins)
        return hist.tolist()
        
    def _calculate_iat_histogram(self, packets: List[Packet], bins: int = 10) -> List[int]:
        """计算到达间隔直方图"""
        if len(packets) < 2:
            return [0] * bins
        iats = [packets[i].timestamp - packets[i-1].timestamp for i in range(1, len(packets))]
        return self._calculate_histogram(iats, bins)
        
    def _calculate_direction_switches(self, packets: List[Packet]) -> int:
        """计算方向切换次数"""
        if len(packets) < 2:
            return 0
        switches = sum(1 for i in range(1, len(packets)) 
                      if packets[i].direction != packets[i-1].direction)
        return switches
        
    def _calculate_burstiness(self, packets: List[Packet]) -> float:
        """计算突发度"""
        if len(packets) < 2:
            return 0
        iats = [packets[i].timestamp - packets[i-1].timestamp for i in range(1, len(packets))]
        if not iats:
            return 0
        mean_iat = np.mean(iats)
        var_iat = np.var(iats)
        return float(var_iat / (mean_iat ** 2)) if mean_iat > 0 else 0.0
        
    def _calculate_entropy(self, values: List[float]) -> float:
        """计算熵"""
        if not values:
            return 0
        _, counts = np.unique(values, return_counts=True)
        probabilities = counts / len(values)
        return -np.sum(probabilities * np.log2(probabilities + 1e-10))

class RulePreFilter:
    """阶段A: 规则预筛"""
    
    def __init__(self):
        self.ike_esp_ports = [500, 4500]  # IPsec IKE/ESP
        self.openvpn_ports = [1194]       # OpenVPN
        self.wireguard_ports = [51820]    # WireGuard
        
    def check_protocol_indicators(self, packets: List[Packet]) -> Dict[str, Any]:
        """检查协议指示器"""
        indicators = {
            'ike_esp_detected': False,
            'dtls_tls_tunnel': False,
            'vpn_port_detected': False,
            'vpn_type': VPNType.NONE.value
        }
        
        for packet in packets:
            # 检查IPsec IKE/ESP
            if packet.dst_port in self.ike_esp_ports or packet.src_port in self.ike_esp_ports:
                indicators['ike_esp_detected'] = True
                indicators['vpn_type'] = VPNType.IPSEC.value
                
            # 检查OpenVPN
            if packet.dst_port in self.openvpn_ports or packet.src_port in self.openvpn_ports:
                indicators['vpn_port_detected'] = True
                indicators['vpn_type'] = VPNType.OPENVPN.value
                
            # 检查WireGuard
            if packet.dst_port in self.wireguard_ports or packet.src_port in self.wireguard_ports:
                indicators['vpn_port_detected'] = True
                indicators['vpn_type'] = VPNType.WIREGUARD.value
                
            # 检查DTLS/TLS隧道
            if packet.dst_port == 443 and packet.protocol == 'UDP':
                indicators['dtls_tls_tunnel'] = True
                if indicators['vpn_type'] == VPNType.NONE.value:
                    indicators['vpn_type'] = VPNType.UNKNOWN.value
                
        return indicators
        
class RelativeEntropyFilter:
    """阶段B: 相对熵过滤"""
    
    def __init__(self, threshold_l: float = 0.1):
        self.threshold_l = threshold_l
        
    def calculate_kl_divergence(self, p: np.ndarray, q: np.ndarray) -> float:
        """计算KL散度"""
        p = p + 1e-10
        q = q + 1e-10
        p = p / np.sum(p)
        q = q / np.sum(q)
        return float(np.sum(p * np.log(p / q)))
        
    def multi_dimensional_kl_filter(self, features: Dict[str, Any]) -> bool:
        """多维KL过滤"""
        # 简化版：基于熵和突发度判断
        entropy = features.get('entropy', 0)
        burstiness = features.get('burstiness', 0)
        
        # VPN流量通常有较低的熵和较高的规律性
        return entropy < 5.0 or burstiness < 0.5
        
class SequenceModel:
    """阶段C: 序列模型精判"""
    
    def prepare_sequence_input(self, packets: List[Packet]) -> Dict[str, np.ndarray]:
        """准备序列输入"""
        if not packets:
            return {
                'packet_sizes': np.array([]),
                'directions': np.array([]),
                'iats': np.array([]),
            }
            
        packet_sizes = np.array([p.size for p in packets])
        directions = np.array([1 if p.direction == 'up' else 0 for p in packets])
        
        iats = np.array([0] + [packets[i].timestamp - packets[i-1].timestamp 
                              for i in range(1, len(packets))])
        
        return {
            'packet_sizes': packet_sizes,
            'directions': directions,
            'iats': iats,
        }
        
    def cnn_lstm_predict(self, sequence_input: Dict[str, np.ndarray]) -> float:
        """模拟1D-CNN + LSTM预测"""
        packet_sizes = sequence_input['packet_sizes']
        directions = sequence_input['directions']
        iats = sequence_input['iats']
        
        if len(packet_sizes) == 0:
            return 0.5
            
        # 模拟特征提取
        size_variance = np.var(packet_sizes) if len(packet_sizes) > 1 else 0
        direction_score = np.mean(directions) if len(directions) > 0 else 0.5
        iat_regularity = 1.0 / (1.0 + np.var(iats)) if len(iats) > 1 else 0.5
        
        # VPN流量特征：包大小方差小、时间规律性高
        vpn_score = (
            (1.0 - min(size_variance / 10000, 1.0)) * 0.4 +  # 低方差
            iat_regularity * 0.4 +  # 高规律性
            abs(direction_score - 0.5) * 0.2  # 方向平衡
        )
        
        return float(np.clip(vpn_score, 0, 1))

class VPNDetector:
    """VPN检测器主类"""
    
    def __init__(self):
        self.feature_extractor = BiDirectionalFeatureExtractor()
        self.rule_filter = RulePreFilter()
        self.entropy_filter = RelativeEntropyFilter()
        self.sequence_model = SequenceModel()
        self.detection_count = 0
        self.vpn_detected_count = 0
        
    def detect(self, transaction_data: Dict[str, Any]) -> VPNDetectionResult:
        """检测VPN流量"""
        self.detection_count += 1
        
        # 从交易数据构建数据包（简化版）
        packets = self._build_packets_from_transaction(transaction_data)
        
        if not packets:
            return VPNDetectionResult(
                flow_id=transaction_data.get('user_id', 'unknown'),
                is_vpn=False,
                confidence=0.0,
                detection_stage="NoPackets",
                vpn_type=VPNType.NONE.value,
                features={},
                timestamp=time.time()
            )
        
        flow_id = f"{packets[0].src_ip}:{packets[0].dst_ip}"
        
        # 阶段A: 规则预筛
        protocol_indicators = self.rule_filter.check_protocol_indicators(packets)
        
        # 提取特征
        features = self.feature_extractor.extract_features(packets)
        features.update(protocol_indicators)
        
        # 如果有明确的VPN协议指示器
        if any([protocol_indicators.get('ike_esp_detected'), 
                protocol_indicators.get('vpn_port_detected'),
                protocol_indicators.get('dtls_tls_tunnel')]):
            
            # 阶段C: 序列模型验证
            sequence_input = self.sequence_model.prepare_sequence_input(packets)
            sequence_score = self.sequence_model.cnn_lstm_predict(sequence_input)
            
            is_vpn = sequence_score > 0.5
            confidence = sequence_score if is_vpn else 1.0 - sequence_score
            
            if is_vpn:
                self.vpn_detected_count += 1
            
            return VPNDetectionResult(
                flow_id=flow_id,
                is_vpn=is_vpn,
                confidence=confidence,
                detection_stage="SequenceModel",
                vpn_type=protocol_indicators.get('vpn_type', VPNType.UNKNOWN.value),
                features=features,
                timestamp=time.time()
            )
        
        # 阶段B: 相对熵过滤
        if self.entropy_filter.multi_dimensional_kl_filter(features):
            sequence_input = self.sequence_model.prepare_sequence_input(packets)
            sequence_score = self.sequence_model.cnn_lstm_predict(sequence_input)
            
            is_vpn = sequence_score > 0.6  # 更高的阈值
            confidence = sequence_score if is_vpn else 1.0 - sequence_score
            
            if is_vpn:
                self.vpn_detected_count += 1
            
            return VPNDetectionResult(
                flow_id=flow_id,
                is_vpn=is_vpn,
                confidence=confidence,
                detection_stage="EntropyFilter",
                vpn_type=VPNType.UNKNOWN.value,
                features=features,
                timestamp=time.time()
            )
        
        # 非VPN流量
        return VPNDetectionResult(
            flow_id=flow_id,
            is_vpn=False,
            confidence=0.85,
            detection_stage="RulePreFilter",
            vpn_type=VPNType.NONE.value,
            features=features,
            timestamp=time.time()
        )
    
    def _build_packets_from_transaction(self, data: Dict[str, Any]) -> List[Packet]:
        """从交易数据构建数据包（模拟）"""
        packets = []
        
        # 从交易数据提取网络信息
        ip = data.get('ip', f"192.168.1.{np.random.randint(1, 254)}")
        user_id = data.get('user_id', 'unknown')
        timestamp = data.get('timestamp', time.time())
        
        # 生成模拟数据包序列
        n_packets = np.random.randint(5, 20)
        for i in range(n_packets):
            packet = Packet(
                timestamp=timestamp + i * 0.1,
                src_ip=ip,
                dst_ip=f"8.8.8.{np.random.randint(1, 254)}",
                src_port=np.random.randint(1024, 65535),
                dst_port=np.random.choice([80, 443, 53, 1194, 500]),
                protocol=np.random.choice(["TCP", "UDP"]),
                size=np.random.randint(64, 1500),
                direction=np.random.choice(["up", "down"]),
                payload_size=np.random.randint(20, 1400)
            )
            packets.append(packet)
        
        return packets
    
    def get_stats(self) -> Dict[str, Any]:
        """获取检测统计"""
        return {
            'total_detections': self.detection_count,
            'vpn_detected': self.vpn_detected_count,
            'vpn_rate': self.vpn_detected_count / self.detection_count if self.detection_count > 0 else 0
        }

