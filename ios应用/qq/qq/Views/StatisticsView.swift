//
//  StatisticsView.swift
//  qq
//
//  Created by mac on 2025/11/1.
//

import SwiftUI
import SwiftData
import Charts

struct StatisticsView: View {
    @Query(sort: \WorkoutRecord.date, order: .reverse) private var workouts: [WorkoutRecord]
    @State private var selectedTimeRange: TimeRange = .week
    
    enum TimeRange: String, CaseIterable {
        case week = "本周"
        case month = "本月"
        case year = "本年"
        case all = "全部"
    }
    
    var filteredWorkouts: [WorkoutRecord] {
        let calendar = Calendar.current
        let now = Date()
        
        switch selectedTimeRange {
        case .week:
            let startOfWeek = calendar.dateInterval(of: .weekOfYear, for: now)?.start ?? now
            return workouts.filter { $0.date >= startOfWeek }
        case .month:
            let startOfMonth = calendar.dateInterval(of: .month, for: now)?.start ?? now
            return workouts.filter { $0.date >= startOfMonth }
        case .year:
            let startOfYear = calendar.dateInterval(of: .year, for: now)?.start ?? now
            return workouts.filter { $0.date >= startOfYear }
        case .all:
            return workouts
        }
    }
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // 时间范围选择
                    Picker("时间范围", selection: $selectedTimeRange) {
                        ForEach(TimeRange.allCases, id: \.self) { range in
                            Text(range.rawValue).tag(range)
                        }
                    }
                    .pickerStyle(.segmented)
                    .padding(.horizontal)
                    
                    // 统计卡片
                    StatisticsCards(workouts: filteredWorkouts)
                    
                    // 图表
                    if !filteredWorkouts.isEmpty {
                        DistanceChartView(workouts: filteredWorkouts)
                        DurationChartView(workouts: filteredWorkouts)
                    } else {
                        VStack(spacing: 16) {
                            Image(systemName: "chart.bar.xaxis")
                                .font(.system(size: 50))
                                .foregroundColor(.secondary)
                            Text("暂无数据")
                                .foregroundColor(.secondary)
                            Text("添加运动记录后即可查看统计图表")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 40)
                    }
                    
                    // 个人最佳记录
                    PersonalBestView(workouts: filteredWorkouts)
                }
                .padding()
            }
            .navigationTitle("统计")
        }
    }
}

struct StatisticsCards: View {
    let workouts: [WorkoutRecord]
    
    var totalDistance: Double {
        workouts.reduce(0) { $0 + $1.distance }
    }
    
    var totalDuration: TimeInterval {
        workouts.reduce(0) { $0 + $1.duration }
    }
    
    var totalCalories: Double {
        workouts.compactMap { $0.calories }.reduce(0, +)
    }
    
    var workoutCount: Int {
        workouts.count
    }
    
    var body: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 15) {
            StatCard(
                title: "总距离",
                value: formatDistance(totalDistance),
                icon: "figure.run",
                color: .blue
            )
            
            StatCard(
                title: "总时长",
                value: formatDuration(totalDuration),
                icon: "clock",
                color: .green
            )
            
            StatCard(
                title: "总卡路里",
                value: totalCalories > 0 ? String(format: "%.0f 千卡", totalCalories) : "--",
                icon: "flame.fill",
                color: .orange
            )
            
            StatCard(
                title: "运动次数",
                value: "\(workoutCount) 次",
                icon: "number",
                color: .purple
            )
        }
        .padding(.horizontal)
    }
    
    private func formatDistance(_ distance: Double) -> String {
        if distance >= 1000 {
            return String(format: "%.2f km", distance / 1000)
        } else {
            return String(format: "%.0f m", distance)
        }
    }
    
    private func formatDuration(_ duration: TimeInterval) -> String {
        let hours = Int(duration) / 3600
        let minutes = Int(duration) / 60 % 60
        if hours > 0 {
            return String(format: "%d时%d分", hours, minutes)
        } else {
            return String(format: "%d分钟", minutes)
        }
    }
}

struct StatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(color)
                    .font(.title2)
                Spacer()
            }
            
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
            
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(color.opacity(0.1))
        .cornerRadius(12)
    }
}

struct DistanceChartView: View {
    let workouts: [WorkoutRecord]
    
    var chartData: [(Date, Double)] {
        let calendar = Calendar.current
        let grouped = Dictionary(grouping: workouts) { workout in
            calendar.startOfDay(for: workout.date)
        }
        
        return grouped.map { (date, workouts) in
            let totalDistance = workouts.reduce(0) { $0 + $1.distance }
            return (date, totalDistance / 1000) // 转换为公里
        }.sorted { $0.0 < $1.0 }
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("距离趋势")
                .font(.headline)
                .padding(.horizontal)
            
            if #available(iOS 16.0, *) {
                Chart(chartData, id: \.0) { item in
                    BarMark(
                        x: .value("日期", item.0, unit: .day),
                        y: .value("距离", item.1)
                    )
                    .foregroundStyle(.blue.gradient)
                }
                .frame(height: 200)
                .padding()
            } else {
                // iOS 15 及以下使用简化视图
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(Array(chartData.prefix(7)), id: \.0) { item in
                        HStack {
                            Text(item.0, style: .date)
                                .font(.caption)
                                .frame(width: 80, alignment: .leading)
                            
                            GeometryReader { geometry in
                                Rectangle()
                                    .fill(Color.blue)
                                    .frame(width: geometry.size.width * CGFloat(min(item.1 / max(chartData.map { $0.1 }.max() ?? 1, 1), 1)))
                                    .frame(height: 20)
                            }
                            .frame(height: 20)
                            
                            Text(String(format: "%.2f km", item.1))
                                .font(.caption)
                                .frame(width: 60, alignment: .trailing)
                        }
                    }
                }
                .padding()
            }
        }
        .background(Color.gray.opacity(0.05))
        .cornerRadius(12)
        .padding(.horizontal)
    }
}

struct DurationChartView: View {
    let workouts: [WorkoutRecord]
    
    var chartData: [(Date, TimeInterval)] {
        let calendar = Calendar.current
        let grouped = Dictionary(grouping: workouts) { workout in
            calendar.startOfDay(for: workout.date)
        }
        
        return grouped.map { (date, workouts) in
            let totalDuration = workouts.reduce(0) { $0 + $1.duration }
            return (date, totalDuration)
        }.sorted { $0.0 < $1.0 }
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("时长趋势")
                .font(.headline)
                .padding(.horizontal)
            
            if #available(iOS 16.0, *) {
                Chart(chartData, id: \.0) { item in
                    LineMark(
                        x: .value("日期", item.0, unit: .day),
                        y: .value("时长", item.1 / 60) // 转换为分钟
                    )
                    .foregroundStyle(.green)
                    .interpolationMethod(.catmullRom)
                    
                    AreaMark(
                        x: .value("日期", item.0, unit: .day),
                        y: .value("时长", item.1 / 60)
                    )
                    .foregroundStyle(.green.gradient.opacity(0.3))
                    .interpolationMethod(.catmullRom)
                }
                .frame(height: 200)
                .padding()
            } else {
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(Array(chartData.prefix(7)), id: \.0) { item in
                        HStack {
                            Text(item.0, style: .date)
                                .font(.caption)
                                .frame(width: 80, alignment: .leading)
                            
                            GeometryReader { geometry in
                                Rectangle()
                                    .fill(Color.green)
                                    .frame(width: geometry.size.width * CGFloat(min(item.1 / max(chartData.map { $0.1 }.max() ?? 1, 1), 1)))
                                    .frame(height: 20)
                            }
                            .frame(height: 20)
                            
                            Text(formatDuration(item.1))
                                .font(.caption)
                                .frame(width: 60, alignment: .trailing)
                        }
                    }
                }
                .padding()
            }
        }
        .background(Color.gray.opacity(0.05))
        .cornerRadius(12)
        .padding(.horizontal)
    }
    
    private func formatDuration(_ duration: TimeInterval) -> String {
        let minutes = Int(duration) / 60
        return "\(minutes)分"
    }
}

struct PersonalBestView: View {
    let workouts: [WorkoutRecord]
    
    var longestDistance: WorkoutRecord? {
        workouts.max { $0.distance < $1.distance }
    }
    
    var longestDuration: WorkoutRecord? {
        workouts.max { $0.duration < $1.duration }
    }
    
    var fastestPace: WorkoutRecord? {
        workouts
            .filter { $0.type == "跑步" && $0.distance > 0 && $0.duration > 0 }
            .min { ($0.duration / ($0.distance / 1000)) < ($1.duration / ($1.distance / 1000)) }
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 15) {
            Text("个人最佳记录")
                .font(.headline)
                .padding(.horizontal)
            
            if longestDistance != nil || longestDuration != nil || fastestPace != nil {
                VStack(spacing: 12) {
                    if let record = longestDistance {
                        PersonalBestCard(
                            title: "最长距离",
                            value: record.formattedDistance,
                            date: record.date,
                            icon: "arrow.up.right.circle.fill",
                            color: .blue
                        )
                    }
                    
                    if let record = longestDuration {
                        PersonalBestCard(
                            title: "最长时长",
                            value: record.formattedDuration,
                            date: record.date,
                            icon: "clock.fill",
                            color: .green
                        )
                    }
                    
                    if let record = fastestPace {
                        PersonalBestCard(
                            title: "最快配速",
                            value: record.formattedPace,
                            date: record.date,
                            icon: "speedometer",
                            color: .orange
                        )
                    }
                }
                .padding(.horizontal)
            } else {
                Text("暂无个人最佳记录")
                    .foregroundColor(.secondary)
                    .padding()
            }
        }
    }
}

struct PersonalBestCard: View {
    let title: String
    let value: String
    let date: Date
    let icon: String
    let color: Color
    
    var body: some View {
        HStack {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)
                .frame(width: 40)
            
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Text(value)
                    .font(.headline)
            }
            
            Spacer()
            
            Text(date, style: .date)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(color.opacity(0.1))
        .cornerRadius(10)
    }
}

#Preview {
    StatisticsView()
        .modelContainer(for: WorkoutRecord.self, inMemory: true)
}

