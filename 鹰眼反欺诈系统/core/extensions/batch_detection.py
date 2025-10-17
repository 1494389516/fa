#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批量检测API - 扩展功能
支持批量提交检测请求，提高处理效率
"""

import asyncio
from typing import List, Dict
from concurrent.futures import ThreadPoolExecutor, as_completed
import logging

logger = logging.getLogger(__name__)


class BatchDetectionEngine:
    """批量检测引擎"""
    
    def __init__(self, detection_engine, max_workers: int = 10):
        self.detection_engine = detection_engine
        self.max_workers = max_workers
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
    
    def detect_batch(self, transactions: List[Dict]) -> List[Dict]:
        """
        批量检测（多线程）
        
        Args:
            transactions: 交易列表
            
        Returns:
            检测结果列表
        """
        results = []
        
        # 提交所有任务
        futures = {
            self.executor.submit(self.detection_engine.detect, txn): txn 
            for txn in transactions
        }
        
        # 收集结果
        for future in as_completed(futures):
            try:
                result = future.result()
                results.append(result.to_dict())
            except Exception as e:
                txn = futures[future]
                logger.error(f"批量检测失败: {txn.get('user_id')}, {str(e)}")
                results.append({
                    'user_id': txn.get('user_id'),
                    'error': str(e),
                    'risk_level': 'UNKNOWN'
                })
        
        return results
    
    async def detect_batch_async(self, transactions: List[Dict]) -> List[Dict]:
        """
        批量检测（异步）
        
        Args:
            transactions: 交易列表
            
        Returns:
            检测结果列表
        """
        tasks = [
            self._detect_async(txn) 
            for txn in transactions
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        return results
    
    async def _detect_async(self, transaction: Dict) -> Dict:
        """异步检测单个交易"""
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            self.executor,
            self.detection_engine.detect,
            transaction
        )
        return result.to_dict()
    
    def get_stats(self) -> Dict:
        """获取批量处理统计"""
        return {
            'max_workers': self.max_workers,
            'active_workers': self.executor._threads.__len__() if hasattr(self.executor, '_threads') else 0
        }


# 使用示例
if __name__ == '__main__':
    from fraud_detection_engine import FraudDetectionEngine
    
    # 初始化
    engine = FraudDetectionEngine()
    batch_engine = BatchDetectionEngine(engine, max_workers=5)
    
    # 批量交易
    transactions = [
        {
            'user_id': f'user_{i}',
            'item_id': f'item_{i % 10}',
            'amount': 99.99,
            'ip': f'192.168.1.{i}',
            'device_id': f'device_{i}'
        }
        for i in range(100)
    ]
    
    # 批量检测
    import time
    start = time.time()
    results = batch_engine.detect_batch(transactions)
    elapsed = time.time() - start
    
    print(f"批量检测完成: {len(results)} 个交易")
    print(f"总耗时: {elapsed:.2f}秒")
    print(f"平均每个: {elapsed/len(results)*1000:.2f}ms")
    print(f"吞吐量: {len(results)/elapsed:.2f} TPS")


