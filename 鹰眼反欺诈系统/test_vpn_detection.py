#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
VPN检测功能测试脚本
"""

import sys
import time
from core.extensions.vpn_detector import VPNDetector, Packet

def test_vpn_detection():
    """测试VPN检测功能"""
    print("=" * 60)
    print("🌐 VPN检测算法测试")
    print("=" * 60)
    
    # 创建VPN检测器
    detector = VPNDetector()
    
    # 测试数据1: 模拟VPN流量
    print("\n[测试1] 模拟VPN流量（OpenVPN端口）...")
    vpn_transaction = {
        'user_id': 'user_vpn_001',
        'ip': '192.168.1.100',
        'timestamp': time.time(),
        'amount': 1000,
        'action': 'purchase'
    }
    
    result1 = detector.detect(vpn_transaction)
    print(f"结果: {'✅ 检测到VPN' if result1.is_vpn else '❌ 未检测到VPN'}")
    print(f"VPN类型: {result1.vpn_type}")
    print(f"置信度: {result1.confidence:.2%}")
    print(f"检测阶段: {result1.detection_stage}")
    
    # 测试数据2: 模拟正常流量
    print("\n[测试2] 模拟正常流量...")
    normal_transaction = {
        'user_id': 'user_normal_001',
        'ip': '192.168.1.50',
        'timestamp': time.time(),
        'amount': 500,
        'action': 'browse'
    }
    
    result2 = detector.detect(normal_transaction)
    print(f"结果: {'✅ 检测到VPN' if result2.is_vpn else '❌ 未检测到VPN'}")
    print(f"VPN类型: {result2.vpn_type}")
    print(f"置信度: {result2.confidence:.2%}")
    print(f"检测阶段: {result2.detection_stage}")
    
    # 统计信息
    print("\n" + "=" * 60)
    print("📊 检测统计")
    print("=" * 60)
    stats = detector.get_stats()
    print(f"总检测次数: {stats['total_detections']}")
    print(f"VPN检测次数: {stats['vpn_detected']}")
    print(f"VPN检出率: {stats['vpn_rate']:.2%}")
    
    print("\n✅ 测试完成！")
    return result1, result2

if __name__ == "__main__":
    try:
        test_vpn_detection()
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

