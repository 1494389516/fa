//
//  StatisticsView.swift
//  qq
//
//  Created by mac on 2025/11/30.
//

import SwiftUI
import SwiftData
import Charts

enum Period: String, CaseIterable, Identifiable {
    case week = "本周"
    case month = "本月"
    case year = "本年"
    case all = "全部"

    var id: String { rawValue }
}

struct StatisticsView: View {
    @Environment(\.modelContext) private var modelContext
    @EnvironmentObject var themeManager: ThemeManager
    @State private var workouts: [WorkoutRecord] = []
    @State private var selectedPeriod: Period = .week
    @State private var showingAnalysis = false
    @State private var showingAdvancedAnalysis = false

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // AI分析按钮组
                    VStack(spacing: 10) {
                        Button(action: { showingAnalysis = true }) {
                            HStack {
                                Image(systemName: "brain.head.profile")
                                    .font(.title2)
                                VStack(alignment: .leading) {
                                    Text("快速分析")
                                        .font(.subheadline)
                                    .fontWeight(.medium)
                                }
                                Spacer()
                                Image(systemName: "arrow.right")
                                    .font(.caption)
                            }
                            .padding(.horizontal, 20)
                            .padding(.vertical, 12)
                            .foregroundColor(themeManager.currentTheme.primary)
                            .background(themeManager.currentTheme.light)
                            .cornerRadius(12)
                        }
                    }
                    .padding(.horizontal)

                    // 时间��选择器
                    Picker("时间段", selection: $selectedPeriod) {
                        ForEach(Period.allCases, id: \.self) { period in
                            Text(period.rawValue).tag(period)
                        }
                    }
                    .pickerStyle(SegmentedPickerStyle())
                    .padding(.horizontal)

                    // 总览卡片
                    OverviewCards(workouts: filteredWorkouts)
                        .padding(.horizontal)

                    // 图表展示
                    if !filteredWorkouts.isEmpty {
                        // 距离趋势图
                        DistanceChartView(workouts: filteredWorkouts, period: selectedPeriod)
                            .padding()
                            .background(Color(.systemBackground))
                            .cornerRadius(12)
                            .padding(.horizontal)

                        // 运动类型分布
                        TypeDistributionView(workouts: filteredWorkouts)
                            .padding()
                            .background(Color(.systemBackground))
                            .cornerRadius(12)
                            .padding(.horizontal)

                        // 最近运动列表
                        RecentWorkoutsView(workouts: filteredWorkouts.prefix(5).map { $0 })
                            .padding(.horizontal)
                    } else {
                        EmptyStateView()
                    }
                }
                .padding(.vertical)
            }
            .navigationTitle("统计数据")
            .onAppear {
                loadWorkouts()
            }
            .onChange(of: selectedPeriod) {
                // No need to reload, just filter
            }
            .sheet(isPresented: $showingAnalysis) {
                DataAnalysisView(workouts: workouts)
            }
        }
    }

    private var filteredWorkouts: [WorkoutRecord] {
        let calendar = Calendar.current
        let now = Date()

        switch selectedPeriod {
        case .week:
            let weekStart = calendar.dateInterval(of: .weekOfYear, for: now)?.start ?? now
            return workouts.filter { $0.date >= weekStart }
        case .month:
            let monthStart = calendar.dateInterval(of: .month, for: now)?.start ?? now
            return workouts.filter { $0.date >= monthStart }
        case .year:
            let yearStart = calendar.dateInterval(of: .year, for: now)?.start ?? now
            return workouts.filter { $0.date >= yearStart }
        case .all:
            return workouts
        }
    }

    private func loadWorkouts() {
        let descriptor = FetchDescriptor<WorkoutRecord>(
            sortBy: [SortDescriptor(\WorkoutRecord.date, order: .reverse)]
        )
        workouts = (try? modelContext.fetch(descriptor)) ?? []
    }
}

// MARK: - 总览卡片
struct OverviewCards: View {
    let workouts: [WorkoutRecord]

    var body: some View {
        HStack(spacing: 15) {
            OverviewCard(
                title: "总次数",
                value: "\(workouts.count)",
                icon: "figure.walk",
                color: .blue,
                trend: nil
            )

            OverviewCard(
                title: "总距离",
                value: String(format: "%.1f km", workouts.reduce(0) { $0 + $1.distance } / 1000),
                icon: "location",
                color: .green,
                trend: nil
            )

            OverviewCard(
                title: "总时长",
                value: formatDuration(workouts.reduce(0) { $0 + $1.duration }),
                icon: "clock",
                color: .orange,
                trend: nil
            )
        }
    }

    private func formatDuration(_ duration: TimeInterval) -> String {
        let hours = Int(duration) / 3600
        let minutes = Int(duration) / 60 % 60

        if hours > 0 {
            return String(format: "%.0fh %.0fm", Double(hours), Double(minutes))
        } else {
            return String(format: "%.0fm", Double(minutes))
        }
    }
}

// MARK: - 单个总览卡片
struct OverviewCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color
    let trend: Double?

    var body: some View {
        VStack(spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(color)
                Spacer()
                if let trend = trend {
                    TrendIndicator(value: trend)
                }
            }

            Text(value)
                .font(.title)
                .fontWeight(.bold)

            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

// MARK: - 趋势指示器
struct TrendIndicator: View {
    let value: Double

    var body: some View {
        HStack(spacing: 2) {
            Image(systemName: value > 0 ? "arrow.up" : "arrow.down")
                .font(.caption)
            Text(String(format: "%.0f%%", abs(value)))
                .font(.caption)
        }
        .foregroundColor(value > 0 ? .green : .red)
    }
}

// MARK: - 距离趋势图
struct DistanceChartView: View {
    let workouts: [WorkoutRecord]
    let period: Period

    var body: some View {
        VStack(alignment: .leading, spacing: 15) {
            Text("距离趋势")
                .font(.headline)

            if #available(iOS 16.0, *) {
                Chart(workoutsByDate, id: \.date) { item in
                    LineMark(
                        x: .value("日期", item.date, unit: .day),
                        y: .value("距离", item.distance / 1000)
                    )
                    .foregroundStyle(Color.blue)
                    .symbol(.circle)
                }
                .frame(height: 200)
            } else {
                Text("图表需要 iOS 16 或更高版本")
                    .foregroundColor(.secondary)
            }
        }
    }

    private var workoutsByDate: [WorkoutRecord] {
        workouts.sorted { $0.date < $1.date }
    }
}

// MARK: - 运动类型分布
struct TypeDistributionView: View {
    let workouts: [WorkoutRecord]

    var body: some View {
        VStack(alignment: .leading, spacing: 15) {
            Text("运动类型分布")
                .font(.headline)

            VStack(spacing: 10) {
                ForEach(workoutTypeStats, id: \.type) { stat in
                    HStack {
                        Image(systemName: iconForType(stat.type))
                            .foregroundColor(colorForType(stat.type))
                            .frame(width: 20)

                        Text(stat.type)
                            .font(.subheadline)

                        Spacer()

                        Text(String(format: "%.1f km", stat.distance / 1000))
                            .font(.subheadline)
                            .fontWeight(.medium)

                        Text("(\(stat.count))")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
        }
    }

    private var workoutTypeStats: [(type: String, count: Int, distance: Double)] {
        Dictionary(grouping: workouts, by: { $0.type })
            .map { (type, workouts) in
                (type: type, count: workouts.count, distance: workouts.reduce(0) { $0 + $1.distance })
            }
            .sorted { $0.distance > $1.distance }
    }

    private func iconForType(_ type: String) -> String {
        switch type {
        case "跑步": return "figure.run"
        case "步行": return "figure.walk"
        case "骑行": return "bicycle"
        case "游泳": return "figure.pool.swim"
        case "瑜伽": return "figure.yoga"
        default: return "figure.walk"
        }
    }

    private func colorForType(_ type: String) -> Color {
        switch type {
        case "跑步": return .blue
        case "步行": return .green
        case "骑行": return .orange
        case "游泳": return .cyan
        case "瑜伽": return .purple
        default: return .gray
        }
    }
}

// MARK: - 最近运动列表
struct RecentWorkoutsView: View {
    let workouts: [WorkoutRecord]

    var body: some View {
        VStack(alignment: .leading, spacing: 15) {
            Text("最近运动")
                .font(.headline)

            VStack(spacing: 10) {
                ForEach(workouts) { workout in
                    HStack {
                        Image(systemName: iconForType(workout.type))
                            .foregroundColor(colorForType(workout.type))
                            .frame(width: 20)

                        VStack(alignment: .leading, spacing: 2) {
                            Text(workout.type)
                                .font(.subheadline)
                            Text(workout.date, style: .date)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }

                        Spacer()

                        Text(workout.formattedDistance)
                            .font(.subheadline)
                            .fontWeight(.medium)
                    }
                    .padding(.vertical, 5)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
    }

    private func iconForType(_ type: String) -> String {
        switch type {
        case "跑步": return "figure.run"
        case "步行": return "figure.walk"
        case "骑行": return "bicycle"
        case "游泳": return "figure.pool.swim"
        case "瑜伽": return "figure.yoga"
        default: return "figure.walk"
        }
    }

    private func colorForType(_ type: String) -> Color {
        switch type {
        case "跑步": return .blue
        case "步行": return .green
        case "骑行": return .orange
        case "游泳": return .cyan
        case "瑜伽": return .purple
        default: return .gray
        }
    }
}

// MARK: - 空状态视图
struct EmptyStateView: View {
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "chart.bar")
                .font(.system(size: 60))
                .foregroundColor(.gray)

            Text("暂无统计数据")
                .font(.title2)
                .foregroundColor(.gray)

            Text("添加运动记录后查看统计数据")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 100)
    }
}

#Preview {
    StatisticsView()
        .modelContainer(for: WorkoutRecord.self)
}