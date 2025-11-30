//
//  RecordView.swift
//  qq
//
//  Created by mac on 2025/11/30.
//

import SwiftUI
import SwiftData
import HealthKit

struct RecordView: View {
    @Environment(\.modelContext) private var modelContext
    @EnvironmentObject var themeManager: ThemeManager
    @State private var showingImportSheet = false
    @State private var showingAddSheet = false
    @State private var workouts: [WorkoutRecord] = []
    @State private var isLoading = false

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // 顶部操作按钮
                HStack(spacing: 20) {
                    Button(action: { showingImportSheet = true }) {
                        HStack {
                            Image(systemName: "square.and.arrow.down")
                            Text("导入健康数据")
                        }
                        .font(.subheadline)
                        .foregroundColor(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .background(themeManager.currentTheme.primary)
                        .cornerRadius(8)
                    }

                    Button(action: { showingAddSheet = true }) {
                        HStack {
                            Image(systemName: "plus")
                            Text("手动添加")
                        }
                        .font(.subheadline)
                        .foregroundColor(themeManager.currentTheme.primary)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .background(themeManager.currentTheme.light)
                        .cornerRadius(8)
                    }
                }
                .padding()

                // 统计卡片
                if !workouts.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 15) {
                            StatCard(
                                title: "总运动次数",
                                value: "\(workouts.count)",
                                icon: "figure.walk",
                                color: .blue
                            )

                            StatCard(
                                title: "总距离",
                                value: String(format: "%.1f km", workouts.reduce(0) { $0 + $1.distance } / 1000),
                                icon: "location",
                                color: .green
                            )

                            StatCard(
                                title: "总时长",
                                value: formatDuration(workouts.reduce(0) { $0 + $1.duration }),
                                icon: "clock",
                                color: .orange
                            )
                        }
                        .padding(.horizontal)
                    }
                    .padding(.vertical, 10)
                }

                Divider()

                // 运动记录列表
                if workouts.isEmpty {
                    VStack(spacing: 20) {
                        Image(systemName: "figure.walk")
                            .font(.system(size: 60))
                            .foregroundColor(.gray)

                        Text("还没有运动记录")
                            .font(.title2)
                            .foregroundColor(.gray)

                        Text("从健康应用导入数据或手动添加记录")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List {
                        ForEach(workouts) { workout in
                            WorkoutRowView(workout: workout)
                        }
                        .onDelete(perform: deleteWorkouts)
                    }
                }
            }
            .navigationTitle("运动记录")
            .sheet(isPresented: $showingImportSheet) {
                ImportHealthDataView(workouts: $workouts)
            }
            .sheet(isPresented: $showingAddSheet) {
                AddWorkoutView()
            }
            .onAppear {
                loadWorkouts()
            }
        }
    }

    private func loadWorkouts() {
        let descriptor = FetchDescriptor<WorkoutRecord>(
            sortBy: [SortDescriptor(\WorkoutRecord.date, order: .reverse)]
        )
        workouts = (try? modelContext.fetch(descriptor)) ?? []
    }

    private func deleteWorkouts(offsets: IndexSet) {
        for index in offsets {
            modelContext.delete(workouts[index])
        }
        try? modelContext.save()
        loadWorkouts()
    }

    private func formatDuration(_ duration: TimeInterval) -> String {
        let hours = Int(duration) / 3600
        let minutes = Int(duration) / 60 % 60

        if hours > 0 {
            return String(format: "%d小时%d分钟", hours, minutes)
        } else {
            return String(format: "%d分钟", minutes)
        }
    }
}

// MARK: - 统计卡片
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
        .frame(width: 120)
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)
    }
}

// MARK: - 运动记录行
struct WorkoutRowView: View {
    let workout: WorkoutRecord

    var body: some View {
        HStack(spacing: 15) {
            // 运动类型图标
            Image(systemName: iconForType(workout.type))
                .font(.title2)
                .foregroundColor(colorForType(workout.type))
                .frame(width: 40)

            VStack(alignment: .leading, spacing: 4) {
                Text(workout.type)
                    .font(.headline)

                Text(workout.date, style: .date)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                Text(workout.formattedDistance)
                    .font(.subheadline)
                    .fontWeight(.medium)

                Text(workout.formattedDuration)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.vertical, 8)
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

#Preview {
    RecordView()
        .modelContainer(for: WorkoutRecord.self)
}