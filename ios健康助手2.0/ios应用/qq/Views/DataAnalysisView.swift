//
//  DataAnalysisView.swift
//  qq
//
//  Created by mac on 2025/11/30.
//

import SwiftUI
import SwiftData
import Charts

struct DataAnalysisView: View {
    let workouts: [WorkoutRecord]
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var themeManager: ThemeManager

    @State private var analysisResult: WorkoutAnalysis?
    @State private var isAnalyzing = false

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 25) {
                    // 分析头部
                    AnalysisHeader(
                        isAnalyzing: isAnalyzing,
                        hasAnalysis: analysisResult != nil,
                        onAnalyze: performAnalysis
                    )

                    if let analysis = analysisResult {
                        if workouts.isEmpty {
                            // 新手引导卡片
                            BeginnerGuideCard(analysis: analysis, themeColor: themeManager.currentTheme.primary)

                            // 个性化建议
                            SuggestionsCard(analysis: analysis, themeColor: themeManager.currentTheme.primary)

                            // 目标设定
                            GoalSettingCard(analysis: analysis)

                            // 快速开始按钮
                            QuickStartCard(themeColor: themeManager.currentTheme.primary)
                        } else {
                            // 进步分析
                            ProgressAnalysisCard(analysis: analysis, themeColor: themeManager.currentTheme.primary)

                            // 最佳成绩
                            BestPerformanceCard(analysis: analysis)

                            // 每周分布
                            WeeklyDistributionCard(analysis: analysis)

                            // 个性化建议
                            SuggestionsCard(analysis: analysis, themeColor: themeManager.currentTheme.primary)

                            // 目标设定
                            GoalSettingCard(analysis: analysis)

                            // 导出分享
                            ExportCard(workouts: workouts, analysis: analysis)
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("数据分析")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("完成") {
                        dismiss()
                    }
                }
            }
        }
        .onAppear {
            if analysisResult == nil {
                performAnalysis()
            }
        }
    }

    private func performAnalysis() {
        isAnalyzing = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            analysisResult = WorkoutAnalysis(from: workouts)
            isAnalyzing = false
        }
    }
}

// MARK: - 新手引导卡片
struct BeginnerGuideCard: View {
    let analysis: WorkoutAnalysis
    let themeColor: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            HStack {
                Image(systemName: "star.circle.fill")
                    .foregroundColor(themeColor)
                    .font(.title2)
                Text("新手指南")
                    .font(.headline)
                Spacer()
            }

            Text("欢迎开始您的运动之旅！")
                .font(.title2)
                .fontWeight(.bold)

            VStack(alignment: .leading, spacing: 15) {
                GuideStep(
                    number: 1,
                    icon: "plus.circle.fill",
                    title: "添加第一条运动记录",
                    description: "点击\"手动添加\"，记录您的第一次运动",
                    color: .blue
                )

                GuideStep(
                    number: 2,
                    icon: "heart.circle.fill",
                    title: "连接健康应用",
                    description: "从Apple Health导入历史运动数据",
                    color: .red
                )

                GuideStep(
                    number: 3,
                    icon: "calendar.circle.fill",
                    title: "设定运动目标",
                    description: "制定合理的每周运动计划",
                    color: .green
                )

                GuideStep(
                    number: 4,
                    icon: "chart.bar.fill",
                    title: "查看数据分析",
                    description: "定期查看您的运动进步和趋势",
                    color: .orange
                )
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(15)
        .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)
    }
}

struct GuideStep: View {
    let number: Int
    let icon: String
    let title: String
    let description: String
    let color: Color

    var body: some View {
        HStack(alignment: .top, spacing: 15) {
            ZStack {
                Circle()
                    .fill(color)
                    .frame(width: 30, height: 30)

                Text("\(number)")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
            }

            VStack(alignment: .leading, spacing: 5) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.medium)

                Text(description)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.leading)
            }

            Spacer()
        }
    }
}

// MARK: - 快速开始卡片
struct QuickStartCard: View {
    let themeColor: Color

    var body: some View {
        VStack(spacing: 20) {
            Text("准备开始了吗？")
                .font(.title2)
                .fontWeight(.bold)

            Text("选择一种方式开始记录您的运动")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)

            Text("请返回记录页面开始")
                .font(.subheadline)
                .foregroundColor(themeColor)
                .multilineTextAlignment(.center)
                .padding()
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(15)
        .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)
    }
}

// MARK: - 分析头部
struct AnalysisHeader: View {
    let isAnalyzing: Bool
    let hasAnalysis: Bool
    let onAnalyze: () -> Void

    var body: some View {
        VStack(spacing: 15) {
            HStack {
                Image(systemName: "brain.head.profile")
                    .font(.system(size: 50))
                    .foregroundColor(.blue)

                VStack(alignment: .leading, spacing: 5) {
                    Text("智能数据分析")
                        .font(.title2)
                        .fontWeight(.bold)

                    if isAnalyzing {
                        Text("正在分析您的运动数据...")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    } else if hasAnalysis {
                        Text("基于您的运动数据生成深度分析")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    } else {
                        Text("点击按钮开始分析")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                }

                Spacer()
            }

            if isAnalyzing {
                ProgressView()
                    .scaleEffect(1.2)
            }

            if hasAnalysis == nil && !isAnalyzing {
                Button(action: onAnalyze) {
                    HStack {
                        Image(systemName: "sparkles")
                        Text("开始分析")
                    }
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .cornerRadius(12)
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(15)
    }
}

// MARK: - 进步分析卡片
struct ProgressAnalysisCard: View {
    let analysis: WorkoutAnalysis
    let themeColor: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 15) {
            HStack {
                Image(systemName: "chart.line.uptrend.xyaxis")
                    .foregroundColor(.green)
                    .font(.title2)
                Text("进步分析")
                    .font(.headline)
                Spacer()
            }

            if #available(iOS 16.0, *) {
                Chart(analysis.weeklyProgress, id: \.week) { item in
                    LineMark(
                        x: .value("周", item.week, unit: .day),
                        y: .value("距离", item.totalDistance / 1000)
                    )
                    .foregroundStyle(Color.green.gradient)
                    .symbol(Circle().strokeBorder(lineWidth: 2))
                    .foregroundStyle(Color.green)
                }
                .frame(height: 200)
            }

            VStack(alignment: .leading, spacing: 10) {
                ProgressItem(
                    icon: "arrow.up.circle.fill",
                    color: .green,
                    title: "运动频率",
                    value: "\(analysis.frequencyImprovement)%",
                    trend: analysis.frequencyImprovement > 0
                )

                ProgressItem(
                    icon: "figure.run",
                    color: themeColor,
                    title: "平均距离",
                    value: String(format: "%.1f km", analysis.averageDistance / 1000),
                    trend: nil
                )

                ProgressItem(
                    icon: "speedometer",
                    color: .orange,
                    title: "平均配速",
                    value: analysis.averagePace,
                    trend: nil
                )
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(15)
        .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)
    }
}

// MARK: - 进度项
struct ProgressItem: View {
    let icon: String
    let color: Color
    let title: String
    let value: String
    let trend: Bool?

    var body: some View {
        HStack {
            Image(systemName: icon)
                .foregroundColor(color)
                .frame(width: 24)

            Text(title)
                .font(.subheadline)

            Spacer()

            HStack(spacing: 5) {
                Text(value)
                    .font(.subheadline)
                    .fontWeight(.medium)

                if let trend = trend {
                    Image(systemName: trend ? "arrow.up" : "arrow.down")
                        .font(.caption)
                        .foregroundColor(trend ? .green : .red)
                }
            }
        }
    }
}

// MARK: - 最佳成绩卡片
struct BestPerformanceCard: View {
    let analysis: WorkoutAnalysis

    var body: some View {
        VStack(alignment: .leading, spacing: 15) {
            HStack {
                Image(systemName: "trophy.fill")
                    .foregroundColor(.yellow)
                    .font(.title2)
                Text("最佳成绩")
                    .font(.headline)
                Spacer()
            }

            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 15) {
                BestScoreItem(
                    icon: "location.circle.fill",
                    color: .blue,
                    title: "最远距离",
                    value: String(format: "%.1f km", analysis.longestDistance / 1000),
                    subtitle: analysis.longestDistanceDate.formatted(date: .abbreviated, time: .omitted)
                )

                BestScoreItem(
                    icon: "timer",
                    color: .green,
                    title: "最长时长",
                    value: formatDuration(analysis.longestDuration),
                    subtitle: analysis.longestDurationDate.formatted(date: .abbreviated, time: .omitted)
                )

                BestScoreItem(
                    icon: "speedometer",
                    color: .orange,
                    title: "最快配速",
                    value: analysis.fastestPace,
                    subtitle: "每公里"
                )

                BestScoreItem(
                    icon: "flame.fill",
                    color: .red,
                    title: "最高消耗",
                    value: String(format: "%.0f kcal", analysis.maxCalories),
                    subtitle: "单次运动"
                )
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(15)
        .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)
    }

    private func formatDuration(_ duration: TimeInterval) -> String {
        let hours = Int(duration) / 3600
        let minutes = Int(duration) / 60 % 60
        if hours > 0 {
            return String(format: "%d小时%d分", hours, minutes)
        } else {
            return String(format: "%d分钟", minutes)
        }
    }
}

// MARK: - 最佳成绩项
struct BestScoreItem: View {
    let icon: String
    let color: Color
    let title: String
    let value: String
    let subtitle: String

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title)
                .foregroundColor(color)

            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)

            Text(value)
                .font(.title3)
                .fontWeight(.bold)

            Text(subtitle)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

// MARK: - 每周分布卡片
struct WeeklyDistributionCard: View {
    let analysis: WorkoutAnalysis

    var body: some View {
        VStack(alignment: .leading, spacing: 15) {
            HStack {
                Image(systemName: "calendar.circle.fill")
                    .foregroundColor(.purple)
                    .font(.title2)
                Text("每周分布")
                    .font(.headline)
                Spacer()
            }

            if #available(iOS 16.0, *) {
                Chart(analysis.weeklyDistribution, id: \.day) { item in
                    BarMark(
                        x: .value("星期", item.day),
                        y: .value("次数", item.count)
                    )
                    .foregroundStyle(Color.purple.gradient)
                }
                .frame(height: 180)
            }

            HStack {
                VStack(alignment: .leading) {
                    Text("最活跃")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    Text(analysis.mostActiveDay)
                        .font(.headline)
                        .foregroundColor(.purple)
                }

                Spacer()

                VStack(alignment: .trailing) {
                    Text("平均/周")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    Text(String(format: "%.1f次", analysis.averageWeekly))
                        .font(.headline)
                        .foregroundColor(.purple)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(15)
        .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)
    }
}

// MARK: - 建议卡片
struct SuggestionsCard: View {
    let analysis: WorkoutAnalysis
    let themeColor: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 15) {
            HStack {
                Image(systemName: "lightbulb.fill")
                    .foregroundColor(themeColor)
                    .font(.title2)
                Text("个性化建议")
                    .font(.headline)
                Spacer()
            }

            ForEach(analysis.suggestions, id: \.self) { suggestion in
                HStack(alignment: .top, spacing: 12) {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(themeColor)
                        .font(.subheadline)

                    Text(suggestion)
                        .font(.subheadline)
                        .multilineTextAlignment(.leading)

                    Spacer()
                }
                .padding(.vertical, 5)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(15)
        .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)
    }
}

// MARK: - 目标设定卡片
struct GoalSettingCard: View {
    let analysis: WorkoutAnalysis
    @State private var weeklyGoal = 3
    @State private var distanceGoal = 10.0

    var body: some View {
        VStack(alignment: .leading, spacing: 15) {
            HStack {
                Image(systemName: "target")
                    .foregroundColor(.red)
                    .font(.title2)
                Text("目标设定")
                    .font(.headline)
                Spacer()
            }

            VStack(spacing: 20) {
                HStack {
                    Text("每周运动")
                        .font(.subheadline)
                    Spacer()
                    Stepper("\(weeklyGoal) 次", value: $weeklyGoal, in: 1...7)
                        .foregroundColor(.red)
                }

                HStack {
                    Text("每周距离")
                        .font(.subheadline)
                    Spacer()
                    HStack {
                        Slider(value: $distanceGoal, in: 5...50, step: 2.5)
                            .accentColor(.red)
                        Text(String(format: "%.0f km", distanceGoal))
                            .font(.subheadline)
                            .frame(width: 60, alignment: .trailing)
                    }
                }

                Button("设置目标") {
                    // TODO: 保存目标
                    print("设置目标: \(weeklyGoal)次/周, \(distanceGoal)km/周")
                }
                .font(.subheadline)
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.red)
                .cornerRadius(10)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(15)
        .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)
    }
}

// MARK: - 导出卡片
struct ExportCard: View {
    let workouts: [WorkoutRecord]
    let analysis: WorkoutAnalysis

    var body: some View {
        VStack(alignment: .leading, spacing: 15) {
            HStack {
                Image(systemName: "square.and.arrow.up.circle.fill")
                    .foregroundColor(.blue)
                    .font(.title2)
                Text("分享报告")
                    .font(.headline)
                Spacer()
            }

            Text("生成包含详细分析和图表的运动报告，与朋友分享您的进步！")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.leading)

            HStack(spacing: 15) {
                Button("生成PDF") {
                    // TODO: 生成PDF报告
                    print("生成PDF报告")
                }
                .font(.subheadline)
                .foregroundColor(.blue)
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.blue.opacity(0.1))
                .cornerRadius(10)

                Button("分享数据") {
                    // TODO: 分享数据
                    print("分享数据")
                }
                .font(.subheadline)
                .foregroundColor(.green)
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.green.opacity(0.1))
                .cornerRadius(10)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(15)
        .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)
    }
}

#Preview {
    DataAnalysisView(workouts: [])
}