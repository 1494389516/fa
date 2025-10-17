#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
设备指纹检测模块
检测刷机、虚拟设备、模拟器等高风险行为
"""

import hashlib
import time
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)

@dataclass
class DeviceFingerprint:
    """设备指纹"""
    device_id: str
    ip: str
    user_agent: str = ""
    screen_resolution: str = ""
    timezone: str = ""
    language: str = ""
    plugins: List[str] = None
    canvas_hash: str = ""
    webgl_hash: str = ""
    
    def generate_fingerprint(self) -> str:
        """生成设备指纹哈希"""
        components = [
            self.device_id,
            self.ip,
            self.user_agent,
            self.screen_resolution,
            self.timezone,
            self.language,
            ','.join(self.plugins or []),
            self.canvas_hash,
            self.webgl_hash
        ]
        raw = '|'.join(components)
        return hashlib.sha256(raw.encode()).hexdigest()

@dataclass
class DeviceRiskResult:
    """设备风险检测结果"""
    device_id: str
    is_rooted: bool
    is_emulator: bool
    is_suspicious: bool
    risk_score: float
    risk_factors: List[str]
    timestamp: float

class DeviceFingerprintDetector:
    """设备指纹检测器"""
    
    def __init__(self):
        # 设备历史记录
        self.device_history = defaultdict(list)
        # IP-设备映射
        self.ip_device_mapping = defaultdict(set)
        # 设备-IP映射
        self.device_ip_mapping = defaultdict(set)
        # 黑名单
        self.blacklisted_devices = set()
        self.blacklisted_ips = set()
        
        # 刷机特征库
        self.root_indicators = [
            'su', 'supersu', 'magisk', 'xposed',
            '/system/xbin/su', '/system/bin/su',
            'com.topjohnwu.magisk', 'eu.chainfire.supersu'
        ]
        
        # 模拟器特征
        self.emulator_indicators = [
            'generic', 'emulator', 'sdk_gphone',
            'vbox', 'android sdk', 'genymotion',
            'nox', 'bluestacks', 'memu'
        ]
        
    def detect(self, transaction: Dict) -> DeviceRiskResult:
        """检测设备风险"""
        device_id = transaction.get('device_id', 'unknown')
        ip = transaction.get('ip', 'unknown')
        user_agent = transaction.get('user_agent', '')
        
        risk_factors = []
        risk_score = 0.0
        is_rooted = False
        is_emulator = False
        is_suspicious = False
        
        # 1. 检测Root/越狱
        is_rooted = self._check_root_jailbreak(transaction)
        if is_rooted:
            risk_factors.append("🔓 设备已Root/越狱")
            risk_score += 0.4
        
        # 2. 检测模拟器/虚拟设备
        is_emulator = self._check_emulator(transaction)
        if is_emulator:
            risk_factors.append("📱 检测到模拟器")
            risk_score += 0.35
        
        # 3. 设备指纹变化检测（刷机识别）
        fingerprint_change = self._check_fingerprint_change(device_id, transaction)
        if fingerprint_change:
            risk_factors.append("🔄 设备指纹异常变化（疑似刷机）")
            risk_score += 0.5
            is_suspicious = True
        
        # 4. 多设备共享IP检测
        shared_ip_risk = self._check_ip_sharing(ip, device_id)
        if shared_ip_risk > 0.3:
            risk_factors.append(f"🌐 IP共享异常 (风险:{shared_ip_risk:.0%})")
            risk_score += shared_ip_risk * 0.3
        
        # 5. 设备频繁更换IP
        ip_change_risk = self._check_ip_hopping(device_id, ip)
        if ip_change_risk > 0.4:
            risk_factors.append(f"🔀 设备频繁更换IP (风险:{ip_change_risk:.0%})")
            risk_score += ip_change_risk * 0.25
        
        # 6. 黑名单检查
        if device_id in self.blacklisted_devices:
            risk_factors.append("⛔ 设备已被拉黑")
            risk_score += 0.6
            is_suspicious = True
        
        if ip in self.blacklisted_ips:
            risk_factors.append("⛔ IP已被拉黑")
            risk_score += 0.4
            is_suspicious = True
        
        # 7. 设备信息不一致检测
        inconsistency = self._check_device_inconsistency(transaction)
        if inconsistency:
            risk_factors.append("⚠️ 设备信息不一致")
            risk_score += 0.3
        
        # 更新记录
        self._update_device_history(device_id, ip, transaction)
        
        # 归一化风险分数
        risk_score = min(1.0, risk_score)
        
        return DeviceRiskResult(
            device_id=device_id,
            is_rooted=is_rooted,
            is_emulator=is_emulator,
            is_suspicious=is_suspicious or risk_score > 0.6,
            risk_score=risk_score,
            risk_factors=risk_factors,
            timestamp=time.time()
        )
    
    def _check_root_jailbreak(self, transaction: Dict) -> bool:
        """检测Root/越狱"""
        device_info = transaction.get('device_info', {})
        installed_apps = transaction.get('installed_apps', [])
        system_props = transaction.get('system_props', {})
        
        # 检查已安装的Root工具
        for app in installed_apps:
            for indicator in self.root_indicators:
                if indicator.lower() in app.lower():
                    return True
        
        # 检查系统属性
        if system_props.get('ro.secure') == '0':
            return True
        
        if system_props.get('ro.debuggable') == '1':
            return True
        
        # 检查设备信息中的Root标记
        if device_info.get('rooted') or device_info.get('jailbroken'):
            return True
        
        return False
    
    def _check_emulator(self, transaction: Dict) -> bool:
        """检测模拟器"""
        device_id = transaction.get('device_id', '').lower()
        device_model = transaction.get('device_model', '').lower()
        device_brand = transaction.get('device_brand', '').lower()
        user_agent = transaction.get('user_agent', '').lower()
        
        # 检查设备ID特征
        for indicator in self.emulator_indicators:
            if (indicator in device_id or 
                indicator in device_model or 
                indicator in device_brand or
                indicator in user_agent):
                return True
        
        # 检查可疑的IMEI（如全0、全1等）
        imei = transaction.get('imei', '')
        if imei and (imei == '0' * len(imei) or imei == '1' * len(imei)):
            return True
        
        return False
    
    def _check_fingerprint_change(self, device_id: str, transaction: Dict) -> bool:
        """检测设备指纹变化（刷机识别）"""
        history = self.device_history.get(device_id, [])
        
        if len(history) < 2:
            return False
        
        # 提取当前指纹
        current_fp = DeviceFingerprint(
            device_id=device_id,
            ip=transaction.get('ip', ''),
            user_agent=transaction.get('user_agent', ''),
            screen_resolution=transaction.get('screen_resolution', ''),
            timezone=transaction.get('timezone', ''),
            language=transaction.get('language', ''),
            plugins=transaction.get('plugins', []),
            canvas_hash=transaction.get('canvas_hash', ''),
            webgl_hash=transaction.get('webgl_hash', '')
        )
        
        current_hash = current_fp.generate_fingerprint()
        
        # 比对历史指纹
        last_record = history[-1]
        last_hash = last_record.get('fingerprint_hash', '')
        
        # 如果指纹完全不同，且时间间隔短，可能是刷机
        if last_hash and current_hash != last_hash:
            time_diff = time.time() - last_record.get('timestamp', 0)
            if time_diff < 86400:  # 24小时内指纹变化
                return True
        
        return False
    
    def _check_ip_sharing(self, ip: str, device_id: str) -> float:
        """检测IP共享异常"""
        devices_on_ip = self.ip_device_mapping.get(ip, set())
        
        # 同一IP下的设备数量
        device_count = len(devices_on_ip)
        
        # 正常情况下，一个IP可能有几个设备（家庭、公司网络）
        if device_count <= 3:
            return 0.0
        elif device_count <= 10:
            return 0.3
        elif device_count <= 50:
            return 0.6
        else:
            # 超过50个设备共享同一IP，极度可疑
            return 0.9
    
    def _check_ip_hopping(self, device_id: str, current_ip: str) -> float:
        """检测设备频繁更换IP"""
        ips = self.device_ip_mapping.get(device_id, set())
        
        # IP数量
        ip_count = len(ips)
        
        # 检查最近的IP变化频率
        history = self.device_history.get(device_id, [])
        if len(history) >= 5:
            recent_ips = [h.get('ip') for h in history[-5:]]
            unique_recent_ips = len(set(recent_ips))
            
            # 最近5次请求来自5个不同IP，高度可疑
            if unique_recent_ips >= 4:
                return 0.8
            elif unique_recent_ips >= 3:
                return 0.5
        
        # 总体IP数量评估
        if ip_count >= 20:
            return 0.7
        elif ip_count >= 10:
            return 0.4
        elif ip_count >= 5:
            return 0.2
        
        return 0.0
    
    def _check_device_inconsistency(self, transaction: Dict) -> bool:
        """检测设备信息不一致"""
        device_id = transaction.get('device_id', '')
        
        history = self.device_history.get(device_id, [])
        if len(history) < 2:
            return False
        
        # 检查设备型号是否一致
        current_model = transaction.get('device_model', '')
        last_model = history[-1].get('device_model', '')
        
        if current_model and last_model and current_model != last_model:
            return True
        
        # 检查操作系统版本是否合理
        current_os = transaction.get('os_version', '')
        last_os = history[-1].get('os_version', '')
        
        if current_os and last_os:
            # 操作系统版本降级，可疑
            try:
                current_ver = float(current_os.split('.')[0])
                last_ver = float(last_os.split('.')[0])
                if current_ver < last_ver:
                    return True
            except:
                pass
        
        return False
    
    def _update_device_history(self, device_id: str, ip: str, transaction: Dict):
        """更新设备历史记录"""
        # 生成指纹
        fp = DeviceFingerprint(
            device_id=device_id,
            ip=ip,
            user_agent=transaction.get('user_agent', ''),
            screen_resolution=transaction.get('screen_resolution', ''),
            timezone=transaction.get('timezone', ''),
            language=transaction.get('language', ''),
            plugins=transaction.get('plugins', []),
            canvas_hash=transaction.get('canvas_hash', ''),
            webgl_hash=transaction.get('webgl_hash', '')
        )
        
        record = {
            'timestamp': time.time(),
            'ip': ip,
            'fingerprint_hash': fp.generate_fingerprint(),
            'device_model': transaction.get('device_model', ''),
            'os_version': transaction.get('os_version', '')
        }
        
        self.device_history[device_id].append(record)
        
        # 只保留最近50条记录
        if len(self.device_history[device_id]) > 50:
            self.device_history[device_id] = self.device_history[device_id][-50:]
        
        # 更新映射关系
        self.ip_device_mapping[ip].add(device_id)
        self.device_ip_mapping[device_id].add(ip)
    
    def add_to_blacklist(self, device_id: str = None, ip: str = None):
        """添加到黑名单"""
        if device_id:
            self.blacklisted_devices.add(device_id)
            logger.warning(f"设备 {device_id} 已加入黑名单")
        if ip:
            self.blacklisted_ips.add(ip)
            logger.warning(f"IP {ip} 已加入黑名单")
    
    def get_device_profile(self, device_id: str) -> Dict:
        """获取设备画像"""
        history = self.device_history.get(device_id, [])
        ips = self.device_ip_mapping.get(device_id, set())
        
        return {
            'device_id': device_id,
            'history_count': len(history),
            'unique_ips': len(ips),
            'ips': list(ips)[:10],  # 只返回前10个IP
            'is_blacklisted': device_id in self.blacklisted_devices,
            'first_seen': history[0]['timestamp'] if history else None,
            'last_seen': history[-1]['timestamp'] if history else None
        }


