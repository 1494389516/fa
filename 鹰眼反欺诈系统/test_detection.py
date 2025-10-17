#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
快速测试脚本 - 验证实时反欺诈检测系统
"""

import requests
import json
import time
from colorama import init, Fore, Style

init(autoreset=True)

API_ENDPOINT = "http://localhost:8080/api/v1/detect"

def print_banner():
    print(Fore.CYAN + "=" * 60)
    print(Fore.CYAN + "🤖 实时反欺诈检测系统 - 测试工具")
    print(Fore.CYAN + "=" * 60 + "\n")

def test_detection(test_case):
    """测试单个检测请求"""
    print(Fore.YELLOW + f"\n测试案例: {test_case['name']}")
    print(Fore.WHITE + "-" * 60)
    
    # 发送请求
    try:
        start_time = time.time()
        response = requests.post(API_ENDPOINT, json=test_case['data'], timeout=5)
        elapsed_time = (time.time() - start_time) * 1000
        
        if response.status_code == 200:
            result = response.json()
            
            # 打印结果
            print(Fore.GREEN + "✅ 检测成功")
            print(f"用户ID: {result['user_id']}")
            print(f"风险评分: {Fore.RED if result['risk_score'] > 0.7 else Fore.GREEN}{result['risk_score']:.3f}")
            print(f"风险等级: {get_risk_color(result['risk_level'])}{result['risk_level']}")
            print(f"欺诈概率: {result['fraud_probability']:.3f}")
            
            if result['detected_patterns']:
                print(f"检测模式: {Fore.YELLOW}{', '.join(result['detected_patterns'])}")
            
            if result['defense_layers']:
                print(f"触发防御层: {Fore.MAGENTA}{result['defense_layers']}")
            
            print(f"处理引擎: {Fore.CYAN}{result.get('processed_by', 'N/A')}")
            print(f"响应时间: {Fore.BLUE}{elapsed_time:.2f}ms")
            
            return True
        else:
            print(Fore.RED + f"❌ 请求失败: HTTP {response.status_code}")
            print(response.text)
            return False
            
    except requests.exceptions.ConnectionError:
        print(Fore.RED + "❌ 连接失败: 请确保API网关正在运行 (http://localhost:8080)")
        return False
    except Exception as e:
        print(Fore.RED + f"❌ 错误: {str(e)}")
        return False

def get_risk_color(risk_level):
    """根据风险等级返回颜色"""
    colors = {
        'LOW': Fore.GREEN,
        'MEDIUM': Fore.YELLOW,
        'HIGH': Fore.MAGENTA,
        'CRITICAL': Fore.RED
    }
    return colors.get(risk_level, Fore.WHITE)

def run_tests():
    """运行所有测试案例"""
    test_cases = [
        {
            'name': '正常交易',
            'data': {
                'user_id': 'user_normal_001',
                'item_id': 'item_123',
                'amount': 99.99,
                'timestamp': time.time(),
                'ip': '192.168.1.100',
                'device_id': 'device_normal_001',
                'action': 'purchase'
            }
        },
        {
            'name': '高额可疑交易',
            'data': {
                'user_id': 'user_suspicious_002',
                'item_id': 'item_456',
                'amount': 9999.99,
                'timestamp': time.time(),
                'ip': '192.168.1.101',
                'device_id': 'device_suspicious_002',
                'action': 'purchase'
            }
        },
        {
            'name': '深夜异常交易',
            'data': {
                'user_id': 'user_night_003',
                'item_id': 'item_789',
                'amount': 299.99,
                'timestamp': time.time() - 3600 * 3,  # 3小时前（深夜）
                'ip': '192.168.1.102',
                'device_id': 'device_night_003',
                'action': 'purchase'
            }
        },
        {
            'name': '批量刷单模拟',
            'data': {
                'user_id': 'user_fraud_004',
                'item_id': 'item_target',
                'amount': 0.01,
                'timestamp': time.time(),
                'ip': '192.168.1.200',
                'device_id': 'device_bot_004',
                'action': 'purchase'
            }
        }
    ]
    
    success_count = 0
    total_count = len(test_cases)
    
    for test_case in test_cases:
        if test_detection(test_case):
            success_count += 1
        time.sleep(0.5)  # 短暂延迟
    
    # 打印总结
    print(Fore.CYAN + "\n" + "=" * 60)
    print(Fore.CYAN + "测试总结")
    print(Fore.CYAN + "=" * 60)
    print(f"总测试数: {total_count}")
    print(f"成功: {Fore.GREEN}{success_count}")
    print(f"失败: {Fore.RED}{total_count - success_count}")
    print(f"成功率: {Fore.GREEN}{success_count/total_count*100:.1f}%")
    
    # 获取系统统计
    try:
        stats_response = requests.get("http://localhost:8080/api/v1/stats", timeout=5)
        if stats_response.status_code == 200:
            stats = stats_response.json()
            print(Fore.CYAN + "\n" + "=" * 60)
            print(Fore.CYAN + "系统统计")
            print(Fore.CYAN + "=" * 60)
            print(f"总请求数: {stats.get('total_requests', 0)}")
            print(f"检测到欺诈: {stats.get('fraud_detected', 0)}")
            print(f"欺诈率: {stats.get('fraud_rate', 0)*100:.2f}%")
            print(f"平均响应时间: {stats.get('avg_response_time', 0):.2f}ms")
            print(f"QPS: {stats.get('requests_per_sec', 0):.2f}")
    except:
        pass
    
    print(Fore.CYAN + "=" * 60 + "\n")

def main():
    print_banner()
    
    print(Fore.WHITE + "📋 测试说明:")
    print("  1. 确保系统已启动 (运行 ./start_all.sh 或单独启动各服务)")
    print("  2. API网关应在 http://localhost:8080 运行")
    print("  3. 测试将发送4个不同类型的交易请求\n")
    
    input(Fore.YELLOW + "按Enter开始测试... ")
    
    run_tests()

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print(Fore.YELLOW + "\n\n测试已中断")
    except Exception as e:
        print(Fore.RED + f"\n错误: {str(e)}")

