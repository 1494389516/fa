//
//  AppConstants.swift
//  qq
//
//  Created by mac on 2025/11/30.
//

import Foundation

// MARK: - 通用文本常量
struct AppText {
    // Tab标题
    static let recordTab = "记录"
    static let statisticsTab = "统计"
    static let settingsTab = "设置"

    // 通用
    static let confirm = "确定"
    static let cancel = "取消"
    static let save = "保存"
    static let delete = "删除"
    static let done = "完成"
    static let loading = "加载中..."

    // 错误消息
    static let error = "错误"
    static let dataLoadFailed = "数据加载失败"
    static let networkError = "网络错误，请稍后重试"

    // 成功消息
    static let success = "成功"
    static let dataSaved = "数据已保存"
    static let operationComplete = "操作完成"
}

// MARK: - 运动类型��量
struct WorkoutType {
    static let running = "跑步"
    static let walking = "步行"
    static let cycling = "骑行"
    static let swimming = "游泳"
    static let yoga = "瑜伽"
    static let strength = "力量训练"
    static let elliptical = "椭圆机"
    static let other = "其他"

    static let all = [
        running, walking, cycling, swimming, yoga, strength, elliptical, other
    ]

    static func icon(for type: String) -> String {
        switch type {
        case running: return "figure.run"
        case walking: return "figure.walk"
        case cycling: return "bicycle"
        case swimming: return "figure.pool.swim"
        case yoga: return "figure.yoga"
        case strength: return "dumbbell"
        case elliptical: return "figure.elliptical"
        default: return "figure.walk"
        }
    }

    static func color(for type: String) -> Color {
        switch type {
        case running: return .blue
        case walking: return .green
        case cycling: return .orange
        case swimming: return .cyan
        case yoga: return .purple
        case strength: return .red
        case elliptical: return .pink
        default: return .gray
        }
    }
}

// MARK: - 数值常量
struct AppValue {
    // 运动
    static let maxWorkoutDistance: Double = 100000 // 100km
    static let maxWorkoutDuration: TimeInterval = 86400 // 24小时

    // 目标
    static let defaultWeeklyGoal = 3
    static let defaultDistanceGoal: Double = 10000 // 10km

    // UI
    static let animationDuration: Double = 0.3
    static let chartHeight: CGFloat = 200
}

// MARK: - 格式化工具
struct AppFormat {
    static let distanceFormatter: NumberFormatter = {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.maximumFractionDigits = 2
        formatter.minimumFractionDigits = 0
        return formatter
    }()

    static let durationFormatter: DateComponentsFormatter = {
        let formatter = DateComponentsFormatter()
        formatter.unitsStyle = .abbreviated
        formatter.allowedUnits = [.hour, .minute, .second]
        return formatter
    }()
}

// MARK: - 存储键
struct StorageKey {
    static let selectedTheme = "selectedTheme"
    static let isDarkMode = "isDarkMode"
    static let isFirstLaunch = "isFirstLaunch"
    static let weeklyGoal = "weeklyGoal"
    static let distanceGoal = "distanceGoal"
}

// MARK: - 分析建议模板
struct AnalysisSuggestions {
    static let frequencyLow = "建议每周至少运动3次，可以提升心肺功能"
    static let frequencyHigh = "运动频率很高！注意休息，避免过度训练"
    static let distanceLow = "尝试逐渐增加单次运动距离到5公里，挑战自己"
    static let varietyLow = "尝试不同类型的运动（如游泳、骑行）来锻炼不同肌群"
    static let recoveryNeeded = "每周至少安排1-2天休息日，让身体恢复"
    static let intensityLow = "适当提高运动强度可以获得更好的健身效果"
}

import SwiftUI