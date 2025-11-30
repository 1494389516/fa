//
//  SettingsView.swift
//  qq
//
//  Created by mac on 2025/11/30.
//

import SwiftUI
import SwiftData
import HealthKit

struct SettingsView: View {
    @EnvironmentObject var themeManager: ThemeManager
    @Environment(\.modelContext) private var modelContext
    @State private var showingAbout = false
    @State private var showingClearAlert = false
    @State private var workouts: [WorkoutRecord] = []

    var body: some View {
        NavigationView {
            Form {
                // 深色模式设置
                Section("外观设置") {
                    Toggle("深色模式", isOn: $themeManager.isDarkMode)
                        .tint(themeManager.currentTheme.primary)
                }

                // 主题颜色设置
                Section("主题颜色") {
                    ForEach(AppTheme.allCases) { theme in
                        ThemeOptionRow(
                            theme: theme,
                            isSelected: themeManager.currentTheme == theme
                        ) {
                            withAnimation(.easeInOut(duration: 0.3)) {
                                themeManager.currentTheme = theme
                            }
                        }
                    }
                }

                // 数据管理
                Section("数据管理") {
                    Button(action: exportData) {
                        HStack {
                            Image(systemName: "square.and.arrow.up")
                                .foregroundColor(.blue)
                            Text("导出数据")
                        }
                    }

                    Button(action: clearAllData) {
                        HStack {
                            Image(systemName: "trash")
                                .foregroundColor(.red)
                            Text("清除所有数据")
                                .foregroundColor(.red)
                        }
                    }
                }

                // 健康应用连接
                Section("健康应用") {
                    Button(action: connectHealthApp) {
                        HStack {
                            Image(systemName: "heart.fill")
                                .foregroundColor(.red)
                            Text("连接健康应用")
                            Spacer()
                            Image(systemName: "chevron.right")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }

                    Text("从苹果健康应用导入您的运动数据")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                // 关于
                Section {
                    Button(action: { showingAbout = true }) {
                        HStack {
                            Image(systemName: "info.circle")
                                .foregroundColor(.blue)
                            Text("关于应用")
                            Spacer()
                            Image(systemName: "chevron.right")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }
            }
            .navigationTitle("设置")
        }
        .sheet(isPresented: $showingAbout) {
            AboutView()
        }
        .alert("清除所有数据", isPresented: $showingClearAlert) {
            Button("取消", role: .cancel) { }
            Button("清除", role: .destructive) {
                performClearAllData()
            }
        } message: {
            Text("此操作将删除所有运动记录，且无法恢复。确定要继续吗？")
        }
        .onAppear {
            loadWorkouts()
        }
    }

    private func loadWorkouts() {
        let descriptor = FetchDescriptor<WorkoutRecord>(
            sortBy: [SortDescriptor(\WorkoutRecord.date, order: .reverse)]
        )
        workouts = (try? modelContext.fetch(descriptor)) ?? []
    }

    private func exportData() {
        let report = DataExporter.generateWorkoutReport(workouts, nil)
        let activityVC = UIActivityViewController(activityItems: [report], applicationActivities: nil)

        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let rootViewController = windowScene.windows.first?.rootViewController {
            rootViewController.present(activityVC, animated: true)
        }
    }

    private func clearAllData() {
        showingClearAlert = true
    }

    private func performClearAllData() {
        do {
            // 删除所有记录
            for workout in workouts {
                modelContext.delete(workout)
            }
            try modelContext.save()
            workouts.removeAll()
        } catch {
            print("清除数据失败: \(error)")
        }
    }

    private func connectHealthApp() {
        guard HKHealthStore.isHealthDataAvailable() else {
            print("健康应用不可用")
            return
        }

        let healthStore = HKHealthStore()
        let typesToRead: Set<HKObjectType> = [
            HKObjectType.workoutType(),
            HKObjectType.quantityType(forIdentifier: .distanceWalkingRunning)!
        ]

        healthStore.requestAuthorization(toShare: nil, read: typesToRead) { success, error in
            DispatchQueue.main.async {
                if success {
                    // 可以显示成功提示
                    print("健康应用授权成功")
                } else {
                    print("健康应用授权失败: \(error?.localizedDescription ?? "未知错误")")
                }
            }
        }
    }
}

// MARK: - 主题选项行
struct ThemeOptionRow: View {
    let theme: AppTheme
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 15) {
                // 主题颜色预览
                ZStack {
                    Circle()
                        .fill(theme.primary)
                        .frame(width: 40, height: 40)
                        .overlay(
                            Circle()
                                .stroke(Color.gray.opacity(0.2), lineWidth: 1)
                        )

                    if isSelected {
                        Image(systemName: "checkmark")
                            .foregroundColor(.white)
                            .font(.system(size: 16, weight: .bold))
                        }
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(theme.displayName)
                        .font(.subheadline)
                        .fontWeight(.medium)

                    Text("预览效果")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(theme.primary)
                        .font(.title3)
                }
            }
        }
        .buttonStyle(PlainButtonStyle())
        .padding(.vertical, 2)
    }
}

// MARK: - 关于页面
struct AboutView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            VStack(spacing: 30) {
                // 应用图标
                Image(systemName: "figure.walk")
                    .font(.system(size: 80))
                    .foregroundColor(.blue)
                    .padding(.top, 40)

                // 应用信息
                VStack(spacing: 10) {
                    Text("运动记录")
                        .font(.title)
                        .fontWeight(.bold)

                    Text("版本 1.0.0")
                        .font(.subheadline)
                        .foregroundColor(.secondary)

                    Text("记录您的每一次运动，见证健康的改变")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }

                Spacer()

                // 功能列表
                VStack(alignment: .leading, spacing: 15) {
                    FeatureRow(icon: "plus.circle.fill", title: "手动记录", description: "添加各种运动记录")
                    FeatureRow(icon: "square.and.arrow.down", title: "健康数据导入", description: "从健康应用同步数据")
                    FeatureRow(icon: "chart.bar.fill", title: "数据统计", description: "查看运动趋势和分析")
                    FeatureRow(icon: "paintbrush.fill", title: "主题切换", description: "个性化您的应用")
                }
                .padding()

                Spacer()

                // 版权信息
                Text("© 2025 运动记录\n保留所有权利")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.bottom)
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("完成") {
                        dismiss()
                    }
                }
            }
        }
    }
}

// MARK: - 功能行
struct FeatureRow: View {
    let icon: String
    let title: String
    let description: String

    var body: some View {
        HStack(spacing: 15) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(.blue)
                .frame(width: 30)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.medium)

                Text(description)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()
        }
    }
}

#Preview {
    SettingsView()
}