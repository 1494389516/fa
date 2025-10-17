#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FastAPI Web服务器
提供实时反欺诈检测API
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
import uvicorn
import logging
try:
    from fraud_detection_engine_lite import FraudDetectionEngine
    logger.info("使用精简版检测引擎（无深度学习依赖）")
except:
    from fraud_detection_engine import FraudDetectionEngine
    logger.info("使用完整版检测引擎")
import time

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 创建FastAPI应用
app = FastAPI(
    title="鹰眼反欺诈API",
    description="基于图对抗算法的实时欺诈检测系统",
    version="1.0.0"
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 全局检测引擎实例
detection_engine: Optional[FraudDetectionEngine] = None


class DetectionRequest(BaseModel):
    user_id: str
    item_id: Optional[str] = None
    amount: Optional[float] = None
    timestamp: Optional[float] = None
    ip: Optional[str] = None
    device_id: Optional[str] = None
    action: Optional[str] = "purchase"
    features: Optional[Dict[str, Any]] = None


@app.on_event("startup")
async def startup_event():
    """启动时初始化检测引擎"""
    global detection_engine
    try:
        logger.info("正在初始化欺诈检测引擎...")
        detection_engine = FraudDetectionEngine('config/config.yaml')
        logger.info("✅ 欺诈检测引擎初始化成功")
    except Exception as e:
        logger.error(f"❌ 检测引擎初始化失败: {e}")
        # 即使失败也启动服务，但检测会返回错误
        detection_engine = None


@app.get("/")
async def root():
    """根路径"""
    return {
        "service": "鹰眼反欺诈API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """健康检查"""
    if detection_engine is None:
        return {
            "status": "unhealthy",
            "error": "Detection engine not initialized"
        }
    return {
        "status": "healthy",
        "service": "python_engine"
    }


@app.post("/detect")
async def detect(request: DetectionRequest):
    """实时欺诈检测接口"""
    if detection_engine is None:
        raise HTTPException(status_code=503, detail="Detection engine not available")
    
    try:
        # 转换为引擎需要的格式
        transaction = {
            'user_id': request.user_id,
            'item_id': request.item_id or '',
            'amount': request.amount or 0.0,
            'timestamp': request.timestamp or time.time(),
            'ip': request.ip or '',
            'device_id': request.device_id or '',
            'action': request.action,
            'features': request.features or {}
        }
        
        # 执行检测
        result = detection_engine.detect(transaction)
        
        # 返回结果
        return result.to_dict()
        
    except Exception as e:
        logger.error(f"检测失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Detection failed: {str(e)}")


@app.get("/stats")
async def get_stats():
    """获取统计信息"""
    if detection_engine is None:
        raise HTTPException(status_code=503, detail="Detection engine not available")
    
    try:
        stats = detection_engine.get_stats()
        return stats
    except Exception as e:
        logger.error(f"获取统计失败: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")


if __name__ == "__main__":
    logger.info("=" * 60)
    logger.info("🐍 Python 反欺诈检测API服务器")
    logger.info("基于图对抗算法的7层防御体系")
    logger.info("=" * 60)
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=5000,
        log_level="info"
    )

