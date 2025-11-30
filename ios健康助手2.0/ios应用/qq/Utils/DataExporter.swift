//
//  DataExporter.swift
//  qq
//
//  Created by mac on 2025/11/30.
//

import Foundation
import SwiftUI
import UIKit

class DataExporter {

    // 导出为JSON格式
    static func exportToJSON(_ workouts: [WorkoutRecord]) -> String {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = .prettyPrinted

        do {
            let data = try encoder.encode(workouts)
            if let jsonString = String(data: data, encoding: .utf8) {
                return jsonString
            }
        } catch {
            print("JSON编码失败: \(error)")
        }

        return ""
    }

    // 导出为CSV格式
    static func exportToCSV(_ workouts: [WorkoutRecord]) -> String {
        var csvString = "日期,运动类型,距离(米),时长(秒),卡路里,数据来源,备注\n"

        for workout in workouts {
            let dateFormatter = DateFormatter()
            dateFormatter.dateFormat = "yyyy-MM-dd HH:mm:ss"

            let date = dateFormatter.string(from: workout.date)
            let type = workout.type
            let distance = String(format: "%.0f", workout.distance)
            let duration = String(format: "%.0f", workout.duration)
            let calories = workout.calories?.description ?? ""
            let source = workout.source
            let notes = workout.notes?.replacingOccurrences(of: ",", with: "，") ?? ""

            csvString += "\(date),\(type),\(distance),\(duration),\(calories),\(source),\(notes)\n"
        }

        return csvString
    }

    // 生成运动报告文本
    static func generateWorkoutReport(_ workouts: [WorkoutRecord], _ analysis: WorkoutAnalysis?) -> String {
        let dateFormatter = DateFormatter()
        dateFormatter.dateStyle = .long
        dateFormatter.timeStyle = .medium

        var report = "运动数据报告\n"
        report += "生成时间: \(dateFormatter.string(from: Date()))\n"
        report += String(repeating: "=", count: 50) + "\n\n"

        if workouts.isEmpty {
            report += "暂无运动数据\n"
            return report
        }

        // 基础统计
        report += "【基础统计】\n"
        report += "总运动次数: \(workouts.count) 次\n"

        let totalDistance = workouts.reduce(0) { $0 + $1.distance }
        report += "总距离: \(String(format: "%.2f", totalDistance / 1000)) 公里\n"

        let totalDuration = workouts.reduce(0) { $0 + $1.duration }
        let hours = Int(totalDuration) / 3600
        let minutes = Int(totalDuration) / 60 % 60
        report += "总时长: \(hours) 小时 \(minutes) 分钟\n\n"

        // 最佳成绩
        if let longest = workouts.max(by: { $0.distance < $1.distance }) {
            report += "【最佳成绩】\n"
            report += "最远距离: \(String(format: "%.2f", longest.distance / 1000)) 公里\n"
            report += "日期: \(longest.date.formatted(date: .long, time: .omitted))\n\n"
        }

        // 运动类型分布
        report += "【运动类型分布】\n"
        let typeGroups = Dictionary(grouping: workouts, by: { $0.type })
        for (type, workouts) in typeGroups.sorted(by: { $0.key < $1.key }) {
            let distance = workouts.reduce(0) { $0 + $1.distance }
            report += "\(type): \(workouts.count) 次, \(String(format: "%.2f", distance / 1000)) 公里\n"
        }
        report += "\n"

        // 个性化建议
        if let analysis = analysis {
            report += "【个性化建议】\n"
            for (index, suggestion) in analysis.suggestions.enumerated() {
                report += "\(index + 1). \(suggestion)\n"
            }
        }

        return report
    }

    // 分享数据
    static func shareData(_ workouts: [WorkoutRecord], from viewController: UIViewController) {
        let activityVC = UIActivityViewController(activityItems: [exportToJSON(workouts)], applicationActivities: nil)

        if UIDevice.current.userInterfaceIdiom == .pad {
            activityVC.popoverPresentationController?.sourceView = viewController.view
            activityVC.popoverPresentationController?.sourceRect = CGRect(x: viewController.view.bounds.midX, y: viewController.view.bounds.midY, width: 0, height: 0)
        }

        viewController.present(activityVC, animated: true)
    }

    // 生成并分享PDF（简化版本）
    static func generateAndSharePDF(_ workouts: [WorkoutRecord], _ analysis: WorkoutAnalysis?, from viewController: UIViewController) {
        // 创建PDF内容（简化处理）
        let report = generateWorkoutReport(workouts, analysis)

        // 创建文本视图用于PDF转换
        let textView = UITextView(frame: CGRect(x: 0, y: 0, width: 595, height: 842)) // A4 size
        textView.text = report
        textView.font = UIFont.systemFont(ofSize: 14)

        // 创建PDF渲染器
        let pdfData = NSMutableData()
        UIGraphicsBeginPDFContextToData(pdfData, textView.bounds, nil)
        UIGraphicsBeginPDFPage()
        textView.drawHierarchy(in: textView.bounds, afterScreenUpdates: true)
        UIGraphicsEndPDFContext()

        // 分享PDF
        let activityVC = UIActivityViewController(activityItems: [pdfData], applicationActivities: nil)

        if UIDevice.current.userInterfaceIdiom == .pad {
            activityVC.popoverPresentationController?.sourceView = viewController.view
            activityVC.popoverPresentationController?.sourceRect = CGRect(x: viewController.view.bounds.midX, y: viewController.view.bounds.midY, width: 0, height: 0)
        }

        viewController.present(activityVC, animated: true)
    }
}

// MARK: - 分享视图修饰符
struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        let controller = UIActivityViewController(activityItems: items, applicationActivities: nil)
        return controller
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

// MARK: - 数据统计工具
extension WorkoutRecord {
    // 计算配速（仅跑步）
    var pace: String {
        guard type == "跑步", distance > 0, duration > 0 else { return "--" }
        let paceInSeconds = duration / (distance / 1000)
        let minutes = Int(paceInSeconds) / 60
        let seconds = Int(paceInSeconds) % 60
        return String(format: "%d'%02d\"", minutes, seconds)
    }

    // 计算速度（公里/小时）
    var speed: Double {
        guard duration > 0 else { return 0 }
        return (distance / 1000) / (duration / 3600)
    }

    // 计算消耗的卡路里/分钟
    var caloriesPerMinute: Double? {
        guard let calories = calories, duration > 0 else { return nil }
        return calories / (duration / 60)
    }
}

// MARK: - 月度统计
struct MonthlyStats: Identifiable {
    let id = UUID()
    let month: Date
    let totalWorkouts: Int
    let totalDistance: Double
    let totalDuration: TimeInterval
    let totalCalories: Double

    var averageDistance: Double {
        guard totalWorkouts > 0 else { return 0 }
        return totalDistance / Double(totalWorkouts)
    }

    var formattedMonth: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy年MM月"
        return formatter.string(from: month)
    }
}

// 统计计算工具
struct StatsCalculator {

    // 计算月度统计
    static func calculateMonthlyStats(_ workouts: [WorkoutRecord]) -> [MonthlyStats] {
        let calendar = Calendar.current
        let grouped = Dictionary(grouping: workouts) { workout in
            calendar.dateInterval(of: .month, for: workout.date)?.start ?? workout.date
        }

        return grouped.map { (month, workouts) in
            MonthlyStats(
                month: month,
                totalWorkouts: workouts.count,
                totalDistance: workouts.reduce(0) { $0 + $1.distance },
                totalDuration: workouts.reduce(0) { $0 + $1.duration },
                totalCalories: workouts.compactMap { $0.calories }.reduce(0, +)
            )
        }.sorted { $0.month < $1.month }
    }

    // 计算周平均值
    static func calculateWeeklyAverages(_ workouts: [WorkoutRecord]) -> Double {
        guard !workouts.isEmpty else { return 0 }

        let calendar = Calendar.current
        guard let firstDate = workouts.map({ $0.date }).min(),
              let lastDate = workouts.map({ $0.date }).max() else {
            return 0
        }

        let weeks = calendar.dateComponents([.weekOfYear], from: firstDate, to: lastDate).weekOfYear ?? 1
        return Double(workouts.count) / Double(weeks)
    }

    // 计算进步趋势
    static func calculateProgressTrend(_ workouts: [WorkoutRecord]) -> Trend {
        let calendar = Calendar.current
        let now = Date()

        guard let lastMonthInterval = calendar.dateInterval(of: .month, for: now),
              let twoMonthsAgoInterval = calendar.dateInterval(of: .month, for: calendar.date(byAdding: .month, value: -1, to: now) ?? now) else {
            return .stable
        }

        let lastMonthWorkouts = workouts.filter { lastMonthInterval.contains($0.date) }
        let twoMonthsAgoWorkouts = workouts.filter { twoMonthsAgoInterval.contains($0.date) }

        let lastMonthDistance = lastMonthWorkouts.reduce(0) { $0 + $1.distance }
        let twoMonthsAgoDistance = twoMonthsAgoWorkouts.reduce(0) { $0 + $1.distance }

        if lastMonthDistance > twoMonthsAgoDistance * 1.2 {
            return .improving
        } else if lastMonthDistance < twoMonthsAgoDistance * 0.8 {
            return .declining
        } else {
            return .stable
        }
    }
}

enum Trend {
    case improving
    case stable
    case declining

    var displayText: String {
        switch self {
        case .improving: return "进步中 📈"
        case .stable: return "稳定 ➡️"
        case .declining: return "需要努力 📉"
        }
    }

    var color: Color {
        switch self {
        case .improving: return .green
        case .stable: return .blue
        case .declining: return .orange
        }
    }
}