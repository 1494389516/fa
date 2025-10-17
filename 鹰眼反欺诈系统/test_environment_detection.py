#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
环境检测功能测试脚本
测试针对 eCapture、Frida 等监控工具的检测能力
"""

import sys
import time
import json
from core.extensions.environment_detector import (
    EnvironmentDetector,
    quick_check,
    detailed_check
)


def print_separator(char='=', length=70):
    """打印分隔线"""
    print(char * length)


def print_section(title):
    """打印章节标题"""
    print("\n")
    print_separator()
    print(f"  {title}")
    print_separator()


def print_result(result):
    """打印检测结果"""
    # 状态
    status_icon = "✅" if result.is_safe else "❌"
    status_text = "安全" if result.is_safe else "不安全"
    
    print(f"\n【环境状态】: {status_icon} {status_text}")
    print(f"【风险评分】: {result.risk_score:.2%}")
    print(f"【威胁等级】: {result.threat_level}")
    print(f"【检测时间】: {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(result.timestamp))}")
    
    # 威胁详情
    if result.threats_detected:
        print(f"\n【检测到 {len(result.threats_detected)} 个威胁】:")
        
        for i, threat_name in enumerate(result.threats_detected, 1):
            threat_info = result.threat_details.get(threat_name)
            if threat_info:
                # 根据严重性选择图标
                severity_icons = {
                    'CRITICAL': '🔴',
                    'HIGH': '🟠',
                    'MEDIUM': '🟡',
                    'LOW': '🟢'
                }
                icon = severity_icons.get(threat_info.severity, '⚪')
                
                print(f"\n  {i}. {icon} {threat_name}")
                print(f"     严重性: {threat_info.severity}")
                print(f"     置信度: {threat_info.confidence:.2%}")
                print(f"     检测方法: {threat_info.detection_method}")
                print(f"     详细信息:")
                
                for detail in threat_info.details:
                    print(f"       • {detail}")
    else:
        print("\n✨ 未检测到任何威胁，环境安全！")


def test_basic_detection():
    """测试1: 基础检测"""
    print_section("🔍 测试 1: 基础环境检测")
    
    print("\n正在初始化环境检测器...")
    detector = EnvironmentDetector()
    
    print("开始检测...")
    result = detector.detect()
    
    print_result(result)
    
    return result


def test_with_transaction_data():
    """测试2: 带交易数据的检测"""
    print_section("🔍 测试 2: 带交易数据的环境检测")
    
    # 模拟交易数据
    transaction = {
        'user_id': 'test_user_001',
        'ip': '192.168.1.100',
        'timestamp': time.time(),
        'amount': 1000,
        'action': 'login'
    }
    
    print(f"\n交易数据:")
    print(f"  用户ID: {transaction['user_id']}")
    print(f"  IP地址: {transaction['ip']}")
    print(f"  操作: {transaction['action']}")
    print(f"  金额: {transaction['amount']}")
    
    detector = EnvironmentDetector()
    result = detector.detect(transaction)
    
    print_result(result)
    
    return result


def test_quick_check():
    """测试3: 快速检查"""
    print_section("⚡ 测试 3: 快速检查 (quick_check)")
    
    print("\n执行快速检查...")
    start_time = time.time()
    is_safe = quick_check()
    elapsed = (time.time() - start_time) * 1000
    
    status = "✅ 安全" if is_safe else "❌ 不安全"
    print(f"\n结果: {status}")
    print(f"耗时: {elapsed:.2f}ms")
    
    return is_safe


def test_detailed_check():
    """测试4: 详细检查"""
    print_section("📊 测试 4: 详细检查 (detailed_check)")
    
    print("\n执行详细检查...")
    start_time = time.time()
    result = detailed_check()
    elapsed = (time.time() - start_time) * 1000
    
    print_result(result)
    print(f"\n检测耗时: {elapsed:.2f}ms")
    
    return result


def test_custom_config():
    """测试5: 自定义配置"""
    print_section("⚙️  测试 5: 自定义配置检测")
    
    # 自定义配置
    config = {
        'enable_ebpf_detection': True,
        'enable_debugger_detection': True,
        'enable_profiling_detection': True,
        'enable_vm_detection': False,  # 禁用虚拟机检测
        'timing_threshold_ms': 20.0,  # 提高时间阈值
    }
    
    print("\n自定义配置:")
    for key, value in config.items():
        print(f"  {key}: {value}")
    
    detector = EnvironmentDetector(config=config)
    result = detector.detect()
    
    print_result(result)
    
    return result


def test_statistics():
    """测试6: 统计信息"""
    print_section("📈 测试 6: 统计信息")
    
    detector = EnvironmentDetector()
    
    # 执行多次检测
    num_tests = 5
    print(f"\n执行 {num_tests} 次检测...")
    
    for i in range(num_tests):
        result = detector.detect()
        status = "✅" if result.is_safe else "❌"
        print(f"  检测 {i+1}: {status} (威胁: {len(result.threats_detected)})")
    
    # 获取统计信息
    stats = detector.get_stats()
    
    print("\n统计信息:")
    print(f"  总检测次数: {stats['total_detections']}")
    print(f"  发现威胁次数: {stats['threats_found']}")
    print(f"  威胁率: {stats['threat_rate']:.2%}")
    print(f"  安全率: {stats['safe_rate']:.2%}")
    print(f"  eBPF检测次数: {stats['ebpf_detected']}")
    print(f"  调试器检测次数: {stats['debugger_detected']}")
    print(f"  性能分析工具检测次数: {stats['profiling_detected']}")
    print(f"  虚拟机检测次数: {stats['vm_detected']}")
    
    return stats


def test_performance():
    """测试7: 性能测试"""
    print_section("⏱️  测试 7: 性能测试")
    
    detector = EnvironmentDetector()
    num_iterations = 10
    
    print(f"\n执行 {num_iterations} 次检测，测试性能...")
    
    times = []
    for i in range(num_iterations):
        start = time.time()
        detector.detect()
        elapsed = (time.time() - start) * 1000
        times.append(elapsed)
        
        if (i + 1) % 10 == 0:
            print(f"  完成: {i + 1}/{num_iterations}")
    
    # 统计
    avg_time = sum(times) / len(times)
    min_time = min(times)
    max_time = max(times)
    
    print("\n性能统计:")
    print(f"  平均耗时: {avg_time:.2f}ms")
    print(f"  最快: {min_time:.2f}ms")
    print(f"  最慢: {max_time:.2f}ms")
    
    # 性能评估
    if avg_time < 10:
        print(f"  评级: ⭐⭐⭐⭐⭐ 优秀")
    elif avg_time < 50:
        print(f"  评级: ⭐⭐⭐⭐ 良好")
    elif avg_time < 100:
        print(f"  评级: ⭐⭐⭐ 一般")
    else:
        print(f"  评级: ⭐⭐ 需要优化")
    
    return avg_time


def test_integration_scenario():
    """测试8: 集成场景测试"""
    print_section("🎯 测试 8: 集成场景 - 完整检测流程")
    
    print("\n模拟真实场景：用户登录时的环境检测")
    
    # 模拟用户登录
    login_transaction = {
        'user_id': 'user_12345',
        'ip': '203.0.113.42',
        'timestamp': time.time(),
        'action': 'login',
        'device_id': 'device_abc123',
        'user_agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    }
    
    print("\n1️⃣ 步骤1: 接收登录请求")
    print(f"   用户: {login_transaction['user_id']}")
    print(f"   IP: {login_transaction['ip']}")
    
    print("\n2️⃣ 步骤2: 执行环境安全检测")
    detector = EnvironmentDetector()
    env_result = detector.detect(login_transaction)
    
    print(f"   环境状态: {'✅ 安全' if env_result.is_safe else '❌ 不安全'}")
    print(f"   威胁等级: {env_result.threat_level}")
    
    print("\n3️⃣ 步骤3: 根据检测结果决策")
    
    if env_result.threat_level == "CRITICAL":
        print("   ❌ 决策: 拒绝请求（检测到严重威胁）")
        print("   原因: 可能存在 eCapture、Frida 等监控工具")
        action = "REJECT"
        
    elif env_result.threat_level == "HIGH":
        print("   ⚠️  决策: 要求额外验证（高风险环境）")
        print("   措施: 发送短信验证码")
        action = "REQUIRE_2FA"
        
    elif env_result.threat_level == "MEDIUM":
        print("   ⚠️  决策: 记录警告，允许通过")
        print("   措施: 增加日志记录，监控后续行为")
        action = "ALLOW_WITH_LOG"
        
    else:
        print("   ✅ 决策: 正常处理")
        action = "ALLOW"
    
    print(f"\n4️⃣ 步骤4: 执行决策 - {action}")
    
    # 详细威胁信息
    if env_result.threats_detected:
        print("\n威胁详情:")
        print_result(env_result)
    
    return action, env_result


def run_all_tests():
    """运行所有测试"""
    print_separator('=', 70)
    print("🧪 环境检测功能测试套件")
    print("   测试 eCapture、Frida 等监控工具的检测能力")
    print_separator('=', 70)
    
    results = {}
    
    try:
        # 测试1: 基础检测
        results['basic'] = test_basic_detection()
        
        # 测试2: 带交易数据
        results['with_transaction'] = test_with_transaction_data()
        
        # 测试3: 快速检查
        results['quick_check'] = test_quick_check()
        
        # 测试4: 详细检查
        results['detailed'] = test_detailed_check()
        
        # 测试5: 自定义配置
        results['custom_config'] = test_custom_config()
        
        # 测试6: 统计信息
        results['statistics'] = test_statistics()
        
        # 测试7: 性能测试
        results['performance'] = test_performance()
        
        # 测试8: 集成场景
        results['integration'] = test_integration_scenario()
        
        # 总结
        print_section("✅ 测试总结")
        
        print("\n所有测试已完成！")
        print(f"\n关键指标:")
        print(f"  - 环境状态: {'✅ 安全' if results['basic'].is_safe else '❌ 不安全'}")
        print(f"  - 平均检测时间: {results['performance']:.2f}ms")
        print(f"  - 统计 - 威胁率: {results['statistics']['threat_rate']:.2%}")
        
        print("\n💡 提示:")
        print("  1. 如果检测到 eBPF/调试器威胁，说明系统正在运行监控工具")
        print("  2. 可以通过自定义配置调整检测灵敏度")
        print("  3. 建议在生产环境中启用环境检测作为第0层防御")
        
    except Exception as e:
        print(f"\n❌ 测试过程出错: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    print_separator('=', 70)
    return True


if __name__ == "__main__":
    try:
        success = run_all_tests()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  测试被用户中断")
        sys.exit(130)
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

