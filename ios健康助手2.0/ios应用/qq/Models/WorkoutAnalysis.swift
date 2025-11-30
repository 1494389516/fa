//
//  WorkoutAnalysis.swift
//  qq
//
//  Created by mac on 2025/11/30.
//

import Foundation

struct WorkoutAnalysis {
    // 进步分析
    let weeklyProgress: [WeeklyProgress]
    let frequencyImprovement: Int
    let averageDistance: Double
    let averagePace: String

    // 最佳成绩
    let longestDistance: Double
    let longestDistanceDate: Date
    let longestDuration: TimeInterval
    let longestDurationDate: Date
    let fastestPace: String
    let maxCalories: Double

    // 每周分布
    let weeklyDistribution: [DayDistribution]
    let mostActiveDay: String
    let averageWeekly: Double

    // 个性化建议
    let suggestions: [String]

    init(from workouts: [WorkoutRecord]) {
        guard !workouts.isEmpty else {
            // 空数据初始化
            self.weeklyProgress = []
            self.frequencyImprovement = 0
            self.averageDistance = 0
            self.averagePace = "--"
            self.longestDistance = 0
            self.longestDistanceDate = Date()
            self.longestDuration = 0
            self.longestDurationDate = Date()
            self.fastestPace = "--"
            self.maxCalories = 0
            self.weeklyDistribution = []
            self.mostActiveDay = "无数据"
            self.averageWeekly = 0
            self.suggestions = Self.generateBeginnerSuggestions()
            return
        }

        // 计算每周进度
        self.weeklyProgress = Self.calculateWeeklyProgress(workouts: workouts)

        // 计算频率改善
        self.frequencyImprovement = Self.calculateFrequencyImprovement(workouts: workouts)

        // 计算平均距离和配速
        self.averageDistance = workouts.reduce(0) { $0 + $1.distance } / Double(workouts.count)
        self.averagePace = Self.calculateAveragePace(workouts: workouts)

        // 计算最佳成绩
        let longestWorkout = workouts.max { $0.distance < $1.distance }!
        self.longestDistance = longestWorkout.distance
        self.longestDistanceDate = longestWorkout.date

        let durationWorkout = workouts.max { $0.duration < $1.duration }!
        self.longestDuration = durationWorkout.duration
        self.longestDurationDate = durationWorkout.date

        self.fastestPace = Self.calculateFastestPace(workouts: workouts)
        self.maxCalories = workouts.compactMap { $0.calories }.max() ?? 0

        // 计算每周分布
        self.weeklyDistribution = Self.calculateWeeklyDistribution(workouts: workouts)
        self.mostActiveDay = Self.findMostActiveDay(self.weeklyDistribution)
        self.averageWeekly = Double(workouts.count) / 4.0 // 假设4周的数据

        // 生成个性化建议
        self.suggestions = Self.generateSuggestions(
            workouts: workouts,
            averageDistance: averageDistance,
            weeklyDistribution: weeklyDistribution,
            averageWeekly: averageWeekly
        )
    }

    // 计算每周进度
    private static func calculateWeeklyProgress(workouts: [WorkoutRecord]) -> [WeeklyProgress] {
        let calendar = Calendar.current
        let now = Date()
        var weeklyProgress: [WeeklyProgress] = []

        // 获取过去4周的数据
        for weekOffset in 3...0 {
            guard let weekInterval = calendar.dateInterval(of: .weekOfYear, for: now.addingTimeInterval(-Double(weekOffset) * 7 * 24 * 3600)) else {
                continue
            }

            let weekWorkouts = workouts.filter { workout in
                weekInterval.contains(workout.date)
            }

            let totalDistance = weekWorkouts.reduce(0) { $0 + $1.distance }
            let progress = WeeklyProgress(
                week: weekInterval.start,
                totalDistance: totalDistance,
                workoutCount: weekWorkouts.count
            )
            weeklyProgress.append(progress)
        }

        return weeklyProgress.reversed()
    }

    // 计算频率改善
    private static func calculateFrequencyImprovement(workouts: [WorkoutRecord]) -> Int {
        let calendar = Calendar.current
        let now = Date()

        guard let currentWeekInterval = calendar.dateInterval(of: .weekOfYear, for: now),
              let lastWeekInterval = calendar.dateInterval(of: .weekOfYear, for: now.addingTimeInterval(-7 * 24 * 3600)) else {
            return 0
        }

        let currentWeekCount = workouts.filter { currentWeekInterval.contains($0.date) }.count
        let lastWeekCount = workouts.filter { lastWeekInterval.contains($0.date) }.count

        guard lastWeekCount > 0 else { return 0 }

        return Int((Double(currentWeekCount - lastWeekCount) / Double(lastWeekCount)) * 100)
    }

    // 计算平均配速
    private static func calculateAveragePace(workouts: [WorkoutRecord]) -> String {
        let runWorkouts = workouts.filter { $0.type == "跑步" }
        guard !runWorkouts.isEmpty, let totalDistance = runWorkouts.map({ $0.distance }).reduce(0, +) as Double?,
              totalDistance > 0 else { return "--" }

        let totalDuration = runWorkouts.reduce(0) { $0 + $1.duration }
        let paceInSeconds = totalDuration / (totalDistance / 1000) // 每公里秒数
        let minutes = Int(paceInSeconds) / 60
        let seconds = Int(paceInSeconds) % 60
        return String(format: "%d'%02d\"", minutes, seconds)
    }

    // 计算最快配速
    private static func calculateFastestPace(workouts: [WorkoutRecord]) -> String {
        let runWorkouts = workouts.filter { workout in
            workout.type == "跑步" && workout.distance > 0 && workout.duration > 0
        }
        guard !runWorkouts.isEmpty else { return "--" }

        let fastestPace = runWorkouts.min { workout1, workout2 in
            let pace1 = workout1.duration / (workout1.distance / 1000)
            let pace2 = workout2.duration / (workout2.distance / 1000)
            return pace1 < pace2
        }

        guard let workout = fastestPace else { return "--" }
        let paceInSeconds = workout.duration / (workout.distance / 1000)
        let minutes = Int(paceInSeconds) / 60
        let seconds = Int(paceInSeconds) % 60
        return String(format: "%d'%02d\"", minutes, seconds)
    }

    // 计算每周分布
    private static func calculateWeeklyDistribution(workouts: [WorkoutRecord]) -> [DayDistribution] {
        let weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]
        var distribution: [DayDistribution] = []

        for (index, dayName) in weekdays.enumerated() {
            let dayWorkouts = workouts.filter { workout in
                Calendar.current.component(.weekday, from: workout.date) == index + 1
            }

            let dist = DayDistribution(day: dayName, count: dayWorkouts.count)
            distribution.append(dist)
        }

        return distribution
    }

    // 找出最活跃的一天
    private static func findMostActiveDay(_ distribution: [DayDistribution]) -> String {
        return distribution.max { $0.count < $1.count }?.day ?? "无数据"
    }

    // 生成个性化建议
    private static func generateSuggestions(
        workouts: [WorkoutRecord],
        averageDistance: Double,
        weeklyDistribution: [DayDistribution],
        averageWeekly: Double
    ) -> [String] {
        var suggestions: [String] = []

        // 频率建议
        if averageWeekly < 2 {
            suggestions.append("建议每周至少运动3次，可以提升心肺功能")
        } else if averageWeekly > 5 {
            suggestions.append("运动频率很高！注意休息，避免过度训练")
        } else {
            suggestions.append("运动频率良好，继续保持规律运动")
        }

        // 距离建议
        if averageDistance < 3000 { // 3公里
            suggestions.append("尝试逐渐增加单次运动距离到5公里，挑战自己")
        } else if averageDistance > 10000 { // 10公里
            suggestions.append("长距离运动很棒！记得进行适当的拉伸和恢复")
        }

        // 多样性建议
        let workoutTypes = Set(workouts.map { $0.type })
        if workoutTypes.count == 1 {
            suggestions.append("尝试不同类型的运动（如游泳、骑行）来锻炼不同肌群")
        }

        // 休息建议
        let restDays = weeklyDistribution.filter { $0.count == 0 }.count
        if restDays == 0 {
            suggestions.append("每周至少安排1-2天休息日，让身体恢复")
        } else if restDays > 4 {
            suggestions.append("运动日太少，尝试制定更规律的运动计划")
        }

        // 配速建议（针对跑步）
        let runWorkouts = workouts.filter { $0.type == "跑步" }
        if !runWorkouts.isEmpty {
            suggestions.append("跑步时注意保持稳定配速，避免开始过快")
        }

        // 卡路里建议
        let totalCalories = workouts.compactMap { $0.calories }.reduce(0, +)
        if totalCalories > 0 {
            let weeklyCalories = totalCalories / 4.0
            if weeklyCalories < 1500 {
                suggestions.append("尝试增加运动强度，达到每周1500千卡的消耗目标")
            }
        }

        // 默认建议
        if suggestions.isEmpty {
            suggestions.append("运动习惯很好！记得保持水分充足，运动后适当拉伸")
        }

        return Array(suggestions.prefix(5)) // 最多显示5条建议
    }

    // 生成新手建议
    private static func generateBeginnerSuggestions() -> [String] {
        return [
            "🏃‍♂️ 从简单的运动开始：建议从快走或慢跑开始，每次15-20分钟",
            "📅 制定合理的计划：每周3-4次运动，让身体有时间恢复",
            "🎯 设定小目标：先完成一个小目标，比如坚持运动一周",
            "📱 记录你的进步：每次运动后记录时间和距离，看到自己的成长",
            "🔗 连接健康应用：从Apple Health导入历史数据，了解自己的运动习惯",
            "👥 找个运动伙伴：和朋友一起运动，互相鼓励更容易坚持",
            "💧 记得补充水分：运动前后都要适量饮水",
            "🤸 运动前热身：运动前进行5-10分钟的热身，预防受伤",
            "🧘‍♂️ 运动后拉伸：运动后进行适当的拉伸放松",
            "🎵 享受运动：选择自己喜欢的音乐或播客，让运动更有趣"
        ]
    }
}

// MARK: - 数据结构
struct WeeklyProgress: Identifiable {
    let id = UUID()
    let week: Date
    let totalDistance: Double
    let workoutCount: Int
}

struct DayDistribution: Identifiable {
    let id = UUID()
    let day: String
    let count: Int
}