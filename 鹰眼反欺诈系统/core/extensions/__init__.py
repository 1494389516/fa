"""
鹰眼反欺诈系统 - 扩展功能模块
FraudHawk Extensions
"""

from .alert_system import AlertSystem, AlertLevel, AlertChannel
from .batch_detection import BatchDetectionEngine
from .export_report import ReportGenerator
from .environment_detector import (
    EnvironmentDetector,
    EnvironmentDetectionResult,
    ThreatInfo,
    quick_check,
    detailed_check
)

__all__ = [
    'AlertSystem',
    'AlertLevel',
    'AlertChannel',
    'BatchDetectionEngine',
    'ReportGenerator',
    'EnvironmentDetector',
    'EnvironmentDetectionResult',
    'ThreatInfo',
    'quick_check',
    'detailed_check'
]

__version__ = '1.0.0'


