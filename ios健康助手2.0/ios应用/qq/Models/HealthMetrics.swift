//
//  HealthMetrics.swift
//  qq
//
//  Created by mac on 2025/11/29.
//

import Foundation
import SwiftData

// MARK: - 健康指标记录
@Model
final class HealthMetricsRecord: Identifiable {
    var id: UUID
    var date: Date // 记录日期
    var weight: Double? // 体重（公斤）
    var bodyFat: Double? // 体脂率（%）
    var bloodPressureSystolic: Int? // 收缩压
    var bloodPressureDiastolic: Int? // 舒张压
    var restingHeartRate: Int? // 静息心率
    var sleepHours: Double? // 睡眠时长（小时）
    var sleepQuality: Int? // 睡眠质量（1-5分）
    var waterIntake: Double? // 饮水量（升）
    var mood: Int? // 心情评分（1-5分）
    var stressLevel: Int? // 压力水平（1-5分）
    var notes: String? // 备注

    init(date: Date = Date()) {
        self.id = UUID()
        self.date = date
    }

    // 计算BMI（需要身高信息）
    func calculateBMI(height: Double) -> Double? {
        guard let weight = weight else { return nil }
        return weight / (height * height)
    }

    // 获取健康状态描述
    var healthStatus: String {
        var issues: [String] = []

        // 检查血压
        if let systolic = bloodPressureSystolic, let diastolic = bloodPressureDiastolic {
            if systolic > 130 || diastolic > 80 {
                issues.append("血压偏高")
            }
        }

        // 检查静息心率
        if let heartRate = restingHeartRate {
            if heartRate > 100 {
                issues.append("静息心率偏高")
            } else if heartRate < 60 {
                issues.append("静息心率偏低")
            }
        }

        // 检查睡眠
        if let sleep = sleepHours {
            if sleep < 7 {
                issues.append("睡眠不足")
            } else if sleep > 9 {
                issues.append("睡眠过多")
            }
        }

        return issues.isEmpty ? "健康状况良好" : issues.joined(separator: ", ")
    }
}

// MARK: - 健康习惯
@Model
final class HealthHabit: Identifiable {
    var id: UUID
    var name: String // 习惯名称
    var habitDescription: String // 习惯描述
    var category: HabitCategory // 习惯分类
    var targetValue: Int // 目标数值（如每天8杯水）
    var unit: String // 单位
    var isDaily: Bool // 是否为每日习惯
    var isActive: Bool // 是否激活
    var createdAt: Date // 创建时间
    var streakDays: Int // 连续天数
    var completedDates: [Date] // 完成日期列表

    init(name: String, description: String, category: HabitCategory, targetValue: Int, unit: String, isDaily: Bool = true) {
        self.id = UUID()
        self.name = name
        self.habitDescription = description
        self.category = category
        self.targetValue = targetValue
        self.unit = unit
        self.isDaily = isDaily
        self.isActive = true
        self.createdAt = Date()
        self.streakDays = 0
        self.completedDates = []
    }

    // 检查今天是否完成
    var isCompletedToday: Bool {
        let today = Calendar.current.startOfDay(for: Date())
        return completedDates.contains { date in
            Calendar.current.isDate(date, inSameDayAs: today)
        }
    }

    // 检查昨天是否完成
    var isCompletedYesterday: Bool {
        guard let yesterday = Calendar.current.date(byAdding: .day, value: -1, to: Date()) else {
            return false
        }
        return completedDates.contains { date in
            Calendar.current.isDate(date, inSameDayAs: yesterday)
        }
    }

    // 计算完成率（最近7天）
    var completionRate: Double {
        let calendar = Calendar.current
        let endDate = Date()
        let startDate = calendar.date(byAdding: .day, value: -6, to: endDate)!

        let completedDays = completedDates.filter { date in
            date >= startDate && date <= endDate
        }.count

        return Double(completedDays) / 7.0
    }
}

// MARK: - 习惯分类
enum HabitCategory: String, CaseIterable, Codable {
    case nutrition = "营养饮食"
    case exercise = "运动健身"
    case sleep = "睡眠休息"
    case hydration = "水分补充"
    case mental = "心理健康"
    case medical = "医疗保健"

    var icon: String {
        switch self {
        case .nutrition: return "leaf.fill"
        case .exercise: return "figure.run"
        case .sleep: return "bed.double.fill"
        case .hydration: return "drop.fill"
        case .mental: return "brain.head.profile"
        case .medical: return "cross.fill"
        }
    }

    var color: String {
        switch self {
        case .nutrition: return "green"
        case .exercise: return "blue"
        case .sleep: return "purple"
        case .hydration: return "cyan"
        case .mental: return "pink"
        case .medical: return "red"
        }
    }
}

// MARK: - 健康目标
@Model
final class HealthGoal: Identifiable {
    var id: UUID
    var title: String // 目标标题
    var goalDescription: String // 目标描述
    var type: GoalType // 目标类型
    var targetValue: Double // 目标值
    var currentValue: Double // 当前值
    var unit: String // 单位
    var startDate: Date // 开始日期
    var targetDate: Date // 目标日期
    var isCompleted: Bool // 是否完成
    var isAchieved: Bool // 是否达成

    init(title: String, description: String, type: GoalType, targetValue: Double, unit: String, targetDate: Date) {
        self.id = UUID()
        self.title = title
        self.goalDescription = description
        self.type = type
        self.targetValue = targetValue
        self.currentValue = 0
        self.unit = unit
        self.startDate = Date()
        self.targetDate = targetDate
        self.isCompleted = false
        self.isAchieved = false
    }

    // 计算进度百分比
    var progressPercentage: Double {
        guard targetValue > 0 else { return 0 }
        let percentage = (currentValue / targetValue) * 100
        return min(percentage, 100)
    }

    // 剩余天数
    var remainingDays: Int {
        let calendar = Calendar.current
        let currentDate = Date()
        return calendar.dateComponents([.day], from: currentDate, to: targetDate).day ?? 0
    }
}

// MARK: - 目标类型
enum GoalType: String, CaseIterable, Codable {
    case weightLoss = "减重"
    case weightGain = "增重"
    case dailyExercise = "每日运动"
    case weeklyExercise = "每周运动"
    case sleep = "改善睡眠"
    case hydration = "饮水目标"
    case steps = "步数目标"
    case heartRate = "心率目标"

    var icon: String {
        switch self {
        case .weightLoss, .weightGain: return "scalemass.fill"
        case .dailyExercise, .weeklyExercise: return "figure.run"
        case .sleep: return "bed.double.fill"
        case .hydration: return "drop.fill"
        case .steps: return "figure.walk"
        case .heartRate: return "heart.fill"
        }
    }
}

// MARK: - 健康建议
struct HealthRecommendation: Identifiable {
    let id = UUID()
    let title: String
    let description: String
    let type: RecommendationType
    let priority: Priority
    let relatedMetric: String?

    enum RecommendationType {
        case exercise
        case nutrition
        case sleep
        case mental
        case medical

        var icon: String {
            switch self {
            case .exercise: return "figure.run"
            case .nutrition: return "leaf.fill"
            case .sleep: return "bed.double.fill"
            case .mental: return "brain.head.profile"
            case .medical: return "cross.fill"
            }
        }

        var color: String {
            switch self {
            case .exercise: return "blue"
            case .nutrition: return "green"
            case .sleep: return "purple"
            case .mental: return "pink"
            case .medical: return "red"
            }
        }
    }

    enum Priority: Int, CaseIterable {
        case low = 1
        case medium = 2
        case high = 3

        var description: String {
            switch self {
            case .low: return "低优先级"
            case .medium: return "中优先级"
            case .high: return "高优先级"
            }
        }
    }
}

// MARK: - 健康评分
struct HealthScore {
    let overall: Double // 总体评分（0-100）
    let exercise: Double // 运动评分
    let nutrition: Double // 营养评分
    let sleep: Double // 睡眠评分
    let mental: Double // 心理评分

    var grade: String {
        switch overall {
        case 90...100: return "优秀"
        case 80..<90: return "良好"
        case 70..<80: return "中等"
        case 60..<70: return "及格"
        default: return "需改善"
        }
    }

    var gradeColor: String {
        switch overall {
        case 90...100: return "green"
        case 80..<90: return "blue"
        case 70..<80: return "yellow"
        case 60..<70: return "orange"
        default: return "red"
        }
    }
}