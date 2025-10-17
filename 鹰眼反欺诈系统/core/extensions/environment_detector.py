#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
运行环境安全检测模块
检测是否在被监控、调试、分析的环境中运行

主要检测：
1. eBPF 程序检测（eCapture、bpftrace 等）
2. 调试器检测（gdb、lldb、frida 等）
3. 性能分析工具检测（py-spy、cProfile 等）
4. 虚拟化环境检测
5. 时间异常检测（反调试）
"""

import os
import sys
import time
import logging
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass, field
from pathlib import Path
from datetime import datetime

logger = logging.getLogger(__name__)

try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False
    logger.warning("psutil 未安装，部分检测功能将被禁用")


@dataclass
class ThreatInfo:
    """威胁信息"""
    name: str
    severity: str  # LOW, MEDIUM, HIGH, CRITICAL
    details: List[str]
    confidence: float  # 0.0-1.0
    detection_method: str
    timestamp: float = field(default_factory=time.time)


@dataclass
class EnvironmentDetectionResult:
    """环境检测结果"""
    is_safe: bool
    risk_score: float  # 0-1
    threats_detected: List[str]
    threat_level: str  # LOW, MEDIUM, HIGH, CRITICAL
    threat_details: Dict[str, ThreatInfo]
    timestamp: float
    
    def to_dict(self) -> Dict:
        """转换为字典"""
        return {
            'is_safe': self.is_safe,
            'risk_score': self.risk_score,
            'threats_detected': self.threats_detected,
            'threat_level': self.threat_level,
            'threat_count': len(self.threats_detected),
            'timestamp': self.timestamp
        }


class EnvironmentDetector:
    """
    环境安全检测器
    
    检测运行环境是否安全，防止在被监控的环境下运行
    这是针对 eCapture、Frida 等底层监控工具的防御机制
    """
    
    def __init__(self, config: Optional[Dict] = None):
        """
        初始化环境检测器
        
        Args:
            config: 配置字典，可选
                {
                    'enable_ebpf_detection': True,
                    'enable_debugger_detection': True,
                    'enable_profiling_detection': True,
                    'enable_vm_detection': True,
                    'timing_threshold_ms': 10.0,
                }
        """
        self.config = config or {}
        self.enable_ebpf = self.config.get('enable_ebpf_detection', True)
        self.enable_debugger = self.config.get('enable_debugger_detection', True)
        self.enable_profiling = self.config.get('enable_profiling_detection', True)
        self.enable_vm = self.config.get('enable_vm_detection', True)
        self.timing_threshold = self.config.get('timing_threshold_ms', 10.0)
        
        # 统计信息
        self.stats = {
            'total_detections': 0,
            'threats_found': 0,
            'ebpf_detected': 0,
            'debugger_detected': 0,
            'profiling_detected': 0,
            'vm_detected': 0
        }
        
        logger.info("环境检测器初始化完成")
    
    def detect(self, transaction_data: Optional[Dict] = None) -> EnvironmentDetectionResult:
        """
        执行综合环境检测
        
        Args:
            transaction_data: 交易数据（可选，用于上下文信息）
        
        Returns:
            EnvironmentDetectionResult: 检测结果
        """
        self.stats['total_detections'] += 1
        start_time = time.time()
        
        threat_details = {}
        threats = []
        
        # 检测方法列表
        detection_methods = []
        
        if self.enable_ebpf:
            detection_methods.append(('eBPF程序', self._detect_ebpf_programs))
        
        if self.enable_debugger:
            detection_methods.append(('调试器', self._detect_debugger))
        
        if self.enable_profiling:
            detection_methods.append(('性能分析工具', self._detect_profiling_tools))
        
        if self.enable_vm:
            detection_methods.append(('虚拟化环境', self._detect_virtualization))
        
        # 时间异常检测（总是启用）
        detection_methods.append(('时间异常', self._detect_timing_anomaly))
        
        # 执行所有检测
        for method_name, method in detection_methods:
            try:
                detected, threat_info = method()
                if detected and threat_info:
                    threat_name = threat_info.name
                    threats.append(threat_name)
                    threat_details[threat_name] = threat_info
                    
                    # 更新统计
                    self._update_stats(threat_name)
                    
                    logger.warning(f"检测到威胁: {method_name} - {threat_info.details}")
            except Exception as e:
                logger.error(f"检测方法 {method_name} 执行失败: {e}", exc_info=True)
        
        # 计算风险评分
        risk_score = self._calculate_risk_score(threats, threat_details)
        
        # 确定威胁等级
        threat_level = self._determine_threat_level(risk_score)
        
        # 判断环境是否安全
        is_safe = len(threats) == 0 or threat_level == "LOW"
        
        if not is_safe:
            self.stats['threats_found'] += 1
        
        detection_time = (time.time() - start_time) * 1000
        logger.info(f"环境检测完成: {'安全' if is_safe else '不安全'} | "
                   f"威胁等级: {threat_level} | 耗时: {detection_time:.2f}ms")
        
        return EnvironmentDetectionResult(
            is_safe=is_safe,
            risk_score=risk_score,
            threats_detected=threats,
            threat_level=threat_level,
            threat_details=threat_details,
            timestamp=time.time()
        )
    
    def _detect_ebpf_programs(self) -> Tuple[bool, Optional[ThreatInfo]]:
        """
        检测 eBPF 程序（如 eCapture、bpftrace）
        
        检测方法：
        1. 检查 /sys/kernel/debug/tracing/ 中的 kprobe/uprobe 事件
        2. 检查运行的进程中是否有 eBPF 工具
        3. 检测系统调用延迟异常
        
        Returns:
            (是否检测到, 威胁信息)
        """
        details = []
        
        # 方法1: 检查 eBPF 追踪点
        ebpf_paths = [
            "/sys/kernel/debug/tracing/kprobe_events",
            "/sys/kernel/debug/tracing/uprobe_events",
            "/sys/kernel/debug/tracing/trace",
            "/sys/fs/bpf/",
        ]
        
        for path in ebpf_paths:
            if not os.path.exists(path):
                continue
                
            try:
                # 尝试读取（需要权限）
                path_obj = Path(path)
                
                if path_obj.is_file():
                    content = path_obj.read_text()
                    
                    # 检查常见的 SSL/TLS hook
                    suspicious_keywords = [
                        "SSL_read", "SSL_write",
                        "ssl_read", "ssl_write",
                        "EVP_", "OpenSSL",
                        "ecapture", "bpftrace",
                        "SSL_do_handshake",
                        "tls_read", "tls_write"
                    ]
                    
                    for keyword in suspicious_keywords:
                        if keyword in content:
                            details.append(f"检测到 eBPF hook: {keyword} ({path})")
                            
            except PermissionError:
                # 无权限通常意味着文件存在但无法读取
                # 这本身可能是一个弱信号
                details.append(f"eBPF 追踪文件存在但无权限访问: {path}")
            except Exception as e:
                logger.debug(f"检查 {path} 失败: {e}")
        
        # 方法2: 检查进程列表
        if PSUTIL_AVAILABLE:
            try:
                ebpf_tools = [
                    'ecapture', 'bpftrace', 'bcc', 
                    'tcpdump', 'wireshark', 'tshark',
                    'bpftool', 'perf'
                ]
                
                for proc in psutil.process_iter(['name', 'cmdline']):
                    try:
                        proc_name = proc.info.get('name', '').lower()
                        cmdline_list = proc.info.get('cmdline', [])
                        cmdline = ' '.join(cmdline_list).lower() if cmdline_list else ''
                        
                        # 检测 eBPF 工具
                        for tool in ebpf_tools:
                            if tool in proc_name or tool in cmdline:
                                details.append(f"检测到监控工具进程: {proc.info.get('name')} (PID: {proc.pid})")
                                
                                # 特别检查是否 hook 了当前进程
                                if str(os.getpid()) in cmdline:
                                    details.append(f"⚠️ 工具正在监控本进程！")
                                    
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        continue
                        
            except Exception as e:
                logger.debug(f"进程检查失败: {e}")
        
        # 方法3: 系统调用延迟检测
        try:
            # 测试多次取平均值
            iterations = 5
            total_time = 0
            
            for _ in range(iterations):
                start = time.perf_counter()
                _ = os.urandom(1024)  # 简单的系统调用
                elapsed = time.perf_counter() - start
                total_time += elapsed
            
            avg_time = total_time / iterations
            
            # 正常应该 < 0.001 秒
            if avg_time > 0.01:  # 10ms
                details.append(f"系统调用延迟异常: {avg_time*1000:.2f}ms (正常 < 1ms)")
                
        except Exception as e:
            logger.debug(f"系统调用延迟检测失败: {e}")
        
        if details:
            return True, ThreatInfo(
                name='eBPF_Monitoring',
                severity='CRITICAL',
                details=details,
                confidence=0.85,
                detection_method='ebpf_detection'
            )
        
        return False, None
    
    def _detect_debugger(self) -> Tuple[bool, Optional[ThreatInfo]]:
        """
        检测调试器（gdb, lldb, frida, strace 等）
        
        Returns:
            (是否检测到, 威胁信息)
        """
        details = []
        
        # 方法1: 检查 TracerPid (Linux)
        if sys.platform.startswith('linux'):
            try:
                status_file = f'/proc/{os.getpid()}/status'
                with open(status_file, 'r') as f:
                    for line in f:
                        if line.startswith('TracerPid:'):
                            tracer_pid = int(line.split(':')[1].strip())
                            if tracer_pid != 0:
                                details.append(f"进程被 PID {tracer_pid} 追踪 (ptrace)")
            except Exception as e:
                logger.debug(f"检查 TracerPid 失败: {e}")
        
        # 方法2: 检查调试器进程
        if PSUTIL_AVAILABLE:
            debugger_names = [
                'gdb', 'lldb', 'strace', 'ltrace', 
                'frida-server', 'frida', 'frida-trace',
                'ida', 'ida64', 'x64dbg', 'ollydbg'
            ]
            
            try:
                current_pid = os.getpid()
                
                for proc in psutil.process_iter(['name', 'cmdline']):
                    try:
                        proc_name = proc.info.get('name', '').lower()
                        cmdline_list = proc.info.get('cmdline', [])
                        cmdline = ' '.join(cmdline_list).lower() if cmdline_list else ''
                        
                        # 检测调试器
                        for debugger in debugger_names:
                            if debugger in proc_name:
                                details.append(f"检测到调试器进程: {proc.info.get('name')}")
                                
                                # 检查是否附加到当前进程
                                if str(current_pid) in cmdline or f'--pid={current_pid}' in cmdline:
                                    details.append(f"🚨 调试器已附加到本进程！")
                                    
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        continue
                        
            except Exception as e:
                logger.debug(f"调试器进程检查失败: {e}")
        
        # 方法3: 时间检测（调试时会有断点延迟）
        try:
            start = time.perf_counter()
            time.sleep(0.001)  # 睡眠 1ms
            elapsed = time.perf_counter() - start
            
            # 如果实际耗时远大于预期，可能在调试
            if elapsed > 0.1:  # 100ms
                details.append(f"时间异常: 预期1ms，实际{elapsed*1000:.1f}ms (可能在调试)")
                
        except Exception as e:
            logger.debug(f"时间检测失败: {e}")
        
        # 方法4: 检查是否加载了调试相关的库
        try:
            loaded_modules = sys.modules.keys()
            debug_modules = ['pdb', 'ipdb', 'pudb', 'rpdb', 'bdb']
            
            loaded_debug = [m for m in debug_modules if m in loaded_modules]
            if loaded_debug:
                details.append(f"检测到调试模块: {', '.join(loaded_debug)}")
                
        except Exception as e:
            logger.debug(f"模块检查失败: {e}")
        
        if details:
            return True, ThreatInfo(
                name='Debugger_Detected',
                severity='HIGH',
                details=details,
                confidence=0.9,
                detection_method='debugger_detection'
            )
        
        return False, None
    
    def _detect_profiling_tools(self) -> Tuple[bool, Optional[ThreatInfo]]:
        """
        检测性能分析工具（py-spy, cProfile, line_profiler 等）
        
        Returns:
            (是否检测到, 威胁信息)
        """
        details = []
        
        # 方法1: 检查是否加载了 profiling 模块
        try:
            profiling_modules = [
                'cProfile', 'profile', 'pstats',
                'line_profiler', 'memory_profiler',
                'yappi', 'vmprof'
            ]
            
            loaded_modules = sys.modules.keys()
            loaded_profiling = [m for m in profiling_modules if m in loaded_modules]
            
            if loaded_profiling:
                details.append(f"检测到性能分析模块: {', '.join(loaded_profiling)}")
                
        except Exception as e:
            logger.debug(f"模块检查失败: {e}")
        
        # 方法2: 检查 sys.settrace
        try:
            if sys.gettrace() is not None:
                details.append("检测到 sys.settrace() 被设置（可能在追踪调用栈）")
        except Exception as e:
            logger.debug(f"settrace 检查失败: {e}")
        
        # 方法3: 检查 sys.setprofile
        try:
            if sys.getprofile() is not None:
                details.append("检测到 sys.setprofile() 被设置（可能在性能分析）")
        except Exception as e:
            logger.debug(f"setprofile 检查失败: {e}")
        
        # 方法4: 检查 py-spy 进程
        if PSUTIL_AVAILABLE:
            try:
                current_pid = os.getpid()
                
                for proc in psutil.process_iter(['name', 'cmdline']):
                    try:
                        proc_name = proc.info.get('name', '').lower()
                        cmdline_list = proc.info.get('cmdline', [])
                        cmdline = ' '.join(cmdline_list).lower() if cmdline_list else ''
                        
                        if 'py-spy' in proc_name or 'py-spy' in cmdline:
                            if str(current_pid) in cmdline:
                                details.append(f"检测到 py-spy 正在分析本进程 (PID: {proc.pid})")
                                
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        continue
                        
            except Exception as e:
                logger.debug(f"py-spy 检查失败: {e}")
        
        if details:
            return True, ThreatInfo(
                name='Profiling_Tools',
                severity='MEDIUM',
                details=details,
                confidence=0.95,
                detection_method='profiling_detection'
            )
        
        return False, None
    
    def _detect_virtualization(self) -> Tuple[bool, Optional[ThreatInfo]]:
        """
        检测虚拟化环境（VirtualBox, VMware, QEMU 等）
        
        Returns:
            (是否检测到, 威胁信息)
        """
        details = []
        
        # 方法1: 检查 DMI 信息（Linux）
        if sys.platform.startswith('linux'):
            dmi_files = [
                '/sys/class/dmi/id/product_name',
                '/sys/class/dmi/id/sys_vendor',
                '/sys/class/dmi/id/bios_vendor',
                '/sys/class/dmi/id/board_vendor',
            ]
            
            vm_keywords = [
                'VirtualBox', 'VMware', 'QEMU', 'KVM', 
                'Xen', 'Parallels', 'Bochs', 'Virtual'
            ]
            
            for dmi_file in dmi_files:
                if os.path.exists(dmi_file):
                    try:
                        content = Path(dmi_file).read_text().strip()
                        for keyword in vm_keywords:
                            if keyword.lower() in content.lower():
                                details.append(f"虚拟机检测: {keyword} ({dmi_file})")
                    except Exception as e:
                        logger.debug(f"读取 {dmi_file} 失败: {e}")
        
        # 方法2: 检查 Mac 虚拟化
        elif sys.platform == 'darwin':
            try:
                import subprocess
                result = subprocess.run(
                    ['sysctl', '-n', 'machdep.cpu.brand_string'],
                    capture_output=True,
                    text=True,
                    timeout=2
                )
                cpu_info = result.stdout.strip().lower()
                
                if 'virtual' in cpu_info or 'qemu' in cpu_info:
                    details.append(f"虚拟机检测: {cpu_info}")
            except Exception as e:
                logger.debug(f"Mac 虚拟化检测失败: {e}")
        
        # 方法3: 检查网络接口（虚拟网卡）
        if PSUTIL_AVAILABLE:
            try:
                net_interfaces = psutil.net_if_addrs()
                vm_interface_keywords = ['vbox', 'vmware', 'virtual', 'veth']
                
                for interface_name in net_interfaces.keys():
                    if any(keyword in interface_name.lower() for keyword in vm_interface_keywords):
                        details.append(f"检测到虚拟网卡: {interface_name}")
                        
            except Exception as e:
                logger.debug(f"网络接口检查失败: {e}")
        
        if details:
            return True, ThreatInfo(
                name='Virtualization',
                severity='LOW',
                details=details,
                confidence=0.7,
                detection_method='vm_detection'
            )
        
        return False, None
    
    def _detect_timing_anomaly(self) -> Tuple[bool, Optional[ThreatInfo]]:
        """
        检测时间异常（反调试技巧）
        
        测试代码执行时间是否异常，可能表示：
        1. 正在被调试（断点）
        2. 正在被监控（eBPF hook）
        3. 运行在虚拟机中（性能差）
        
        Returns:
            (是否检测到, 威胁信息)
        """
        details = []
        
        # 测试1: 简单计算
        try:
            iterations = 100000
            
            start = time.perf_counter()
            result = sum(i * i for i in range(iterations))
            elapsed = time.perf_counter() - start
            
            # 正常应该 < 10ms
            threshold = self.timing_threshold / 1000.0  # 转换为秒
            
            if elapsed > threshold:
                details.append(
                    f"计算延迟异常: {elapsed*1000:.2f}ms "
                    f"(阈值: {self.timing_threshold}ms)"
                )
        except Exception as e:
            logger.debug(f"计算延迟测试失败: {e}")
        
        # 测试2: 内存操作
        try:
            start = time.perf_counter()
            data = [0] * 10000
            _ = sum(data)
            elapsed = time.perf_counter() - start
            
            if elapsed > 0.01:  # 10ms
                details.append(f"内存操作延迟异常: {elapsed*1000:.2f}ms")
        except Exception as e:
            logger.debug(f"内存操作测试失败: {e}")
        
        if details:
            return True, ThreatInfo(
                name='Timing_Anomaly',
                severity='MEDIUM',
                details=details,
                confidence=0.6,
                detection_method='timing_detection'
            )
        
        return False, None
    
    def _calculate_risk_score(self, threats: List[str], 
                             threat_details: Dict[str, ThreatInfo]) -> float:
        """
        计算综合风险评分
        
        Args:
            threats: 威胁名称列表
            threat_details: 威胁详细信息
        
        Returns:
            风险评分 (0.0-1.0)
        """
        if not threats:
            return 0.0
        
        # 严重性权重
        severity_weights = {
            'CRITICAL': 0.4,
            'HIGH': 0.3,
            'MEDIUM': 0.2,
            'LOW': 0.1
        }
        
        total_score = 0.0
        
        for threat_name, threat_info in threat_details.items():
            severity = threat_info.severity
            confidence = threat_info.confidence
            weight = severity_weights.get(severity, 0.1)
            
            # 加权评分
            threat_score = weight * confidence
            total_score += threat_score
        
        # 归一化到 [0, 1]
        normalized_score = min(total_score, 1.0)
        
        return normalized_score
    
    def _determine_threat_level(self, risk_score: float) -> str:
        """
        根据风险评分确定威胁等级
        
        Args:
            risk_score: 风险评分 (0.0-1.0)
        
        Returns:
            威胁等级: LOW, MEDIUM, HIGH, CRITICAL
        """
        if risk_score < 0.3:
            return "LOW"
        elif risk_score < 0.6:
            return "MEDIUM"
        elif risk_score < 0.8:
            return "HIGH"
        else:
            return "CRITICAL"
    
    def _update_stats(self, threat_name: str):
        """更新统计信息"""
        if 'eBPF' in threat_name:
            self.stats['ebpf_detected'] += 1
        elif 'Debugger' in threat_name:
            self.stats['debugger_detected'] += 1
        elif 'Profiling' in threat_name:
            self.stats['profiling_detected'] += 1
        elif 'Virtualization' in threat_name:
            self.stats['vm_detected'] += 1
    
    def get_stats(self) -> Dict[str, Any]:
        """
        获取检测统计信息
        
        Returns:
            统计信息字典
        """
        total = self.stats['total_detections']
        
        return {
            **self.stats,
            'threat_rate': self.stats['threats_found'] / total if total > 0 else 0,
            'safe_rate': 1 - (self.stats['threats_found'] / total if total > 0 else 0)
        }


# 便捷函数
def quick_check() -> bool:
    """
    快速检查环境是否安全
    
    Returns:
        True: 安全, False: 不安全
    """
    detector = EnvironmentDetector()
    result = detector.detect()
    return result.is_safe


def detailed_check() -> EnvironmentDetectionResult:
    """
    详细环境检查
    
    Returns:
        完整的检测结果
    """
    detector = EnvironmentDetector()
    return detector.detect()


if __name__ == "__main__":
    # 测试代码
    print("=" * 70)
    print("🔍 环境安全检测")
    print("=" * 70)
    
    detector = EnvironmentDetector()
    result = detector.detect()
    
    print(f"\n环境状态: {'✅ 安全' if result.is_safe else '❌ 不安全'}")
    print(f"风险评分: {result.risk_score:.2%}")
    print(f"威胁等级: {result.threat_level}")
    print(f"检测到的威胁数: {len(result.threats_detected)}")
    
    if result.threats_detected:
        print("\n威胁详情:")
        for threat_name in result.threats_detected:
            threat_info = result.threat_details[threat_name]
            print(f"\n  [{threat_info.severity}] {threat_name}")
            print(f"  置信度: {threat_info.confidence:.2%}")
            for detail in threat_info.details:
                print(f"    • {detail}")
    
    print("\n" + "=" * 70)
    print("检测完成")
    print("=" * 70)

