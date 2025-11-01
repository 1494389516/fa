//
//  GoalsView.swift
//  qq
//
//  Created by mac on 2025/11/1.
//

import SwiftUI
import SwiftData

struct GoalsView: View {
    @AppStorage("dailyDistanceGoal") private var dailyDistanceGoal: Double = 5.0 // 公里
    @AppStorage("weeklyDistanceGoal") private var weeklyDistanceGoal: Double = 30.0 // 公里
    @AppStorage("dailyDurationGoal") private var dailyDurationGoal: Double = 30.0 // 分钟
    @AppStorage("weeklyDurationGoal") private var weeklyDurationGoal: Double = 180.0 // 分钟
    
    @Query(sort: \WorkoutRecord.date, order: .reverse) private var workouts: [WorkoutRecord]
    @Query(sort: \DailyGoal.date, order: .reverse) private var dailyGoals: [DailyGoal]
    @Environment(\.modelContext) private var modelContext
    
    @State private var showHistory = false
    @State private var showEditGoal = false
    @State private var editingDate: Date?
    @State private var showSaveSuccess = false
    
    var body: some View {
        NavigationView {
            Form {
                Section {
                    Text("设置您的运动目标，追踪完成进度")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Section(header: Text("每日目标")) {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text("距离目标")
                            Spacer()
                            Text("\(dailyDistanceGoal, specifier: "%.1f") 公里")
                                .foregroundColor(.blue)
                        }
                        
                        Slider(value: $dailyDistanceGoal, in: 1...20, step: 0.5)
                            .tint(.blue)
                        
                        ProgressView(value: todayDistanceProgress, total: 1.0) {
                            Text("今日完成: \(todayDistance, specifier: "%.2f") 公里")
                                .font(.caption)
                        }
                        .tint(.blue)
                    }
                    
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text("时长目标")
                            Spacer()
                            Text("\(Int(dailyDurationGoal)) 分钟")
                                .foregroundColor(.green)
                        }
                        
                        Slider(value: $dailyDurationGoal, in: 10...120, step: 5)
                            .tint(.green)
                        
                        ProgressView(value: todayDurationProgress, total: 1.0) {
                            Text("今日完成: \(Int(todayDuration / 60)) 分钟")
                                .font(.caption)
                        }
                        .tint(.green)
                    }
                    
                    Button {
                        saveTodayGoal()
                    } label: {
                        HStack {
                            Image(systemName: "checkmark.circle")
                            Text("保存今日目标")
                        }
                        .frame(maxWidth: .infinity)
                    }
                }
                
                Section(header: Text("每周目标")) {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text("距离目标")
                            Spacer()
                            Text("\(weeklyDistanceGoal, specifier: "%.1f") 公里")
                                .foregroundColor(.blue)
                        }
                        
                        Slider(value: $weeklyDistanceGoal, in: 5...100, step: 5)
                            .tint(.blue)
                        
                        ProgressView(value: weekDistanceProgress, total: 1.0) {
                            Text("本周完成: \(weekDistance, specifier: "%.2f") 公里")
                                .font(.caption)
                        }
                        .tint(.blue)
                    }
                    
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text("时长目标")
                            Spacer()
                            Text("\(Int(weeklyDurationGoal)) 分钟")
                                .foregroundColor(.green)
                        }
                        
                        Slider(value: $weeklyDurationGoal, in: 60...600, step: 30)
                            .tint(.green)
                        
                        ProgressView(value: weekDurationProgress, total: 1.0) {
                            Text("本周完成: \(Int(weekDuration / 60)) 分钟")
                                .font(.caption)
                        }
                        .tint(.green)
                    }
                }
                
                Section(header: Text("历史记录")) {
                    Button {
                        showHistory = true
                    } label: {
                        HStack {
                            Image(systemName: "calendar")
                            Text("查看每日目标历史")
                            Spacer()
                            Image(systemName: "chevron.right")
                                .foregroundColor(.secondary)
                                .font(.caption)
                        }
                    }
                    
                    if !dailyGoals.isEmpty {
                        Text("共有 \(dailyGoals.count) 天的目标记录")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                
                Section(header: Text("成就")) {
                    if todayDistanceProgress >= 1.0 {
                        AchievementRow(
                            title: "🎯 今日距离目标达成！",
                            description: "您已完成今日距离目标"
                        )
                    }
                    
                    if todayDurationProgress >= 1.0 {
                        AchievementRow(
                            title: "⏱️ 今日时长目标达成！",
                            description: "您已完成今日时长目标"
                        )
                    }
                    
                    if weekDistanceProgress >= 1.0 {
                        AchievementRow(
                            title: "🏆 本周距离目标达成！",
                            description: "您已完成本周距离目标"
                        )
                    }
                    
                    if weekDurationProgress >= 1.0 {
                        AchievementRow(
                            title: "⭐ 本周时长目标达成！",
                            description: "您已完成本周时长目标"
                        )
                    }
                    
                    if todayDistanceProgress < 1.0 && todayDurationProgress < 1.0 && 
                       weekDistanceProgress < 1.0 && weekDurationProgress < 1.0 {
                        Text("继续加油！完成目标后这里会显示成就")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
            .navigationTitle("目标设置")
            .sheet(isPresented: $showHistory) {
                DailyGoalHistoryView()
                    .environment(\.modelContext, modelContext)
            }
            .onAppear {
                updateTodayGoal()
            }
        }
    }
    
    // 保存今日目标
    private func saveTodayGoal() {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        
        // 查找今日是否已有目标
        if let existingGoal = dailyGoals.first(where: { calendar.isDate($0.date, inSameDayAs: today) }) {
            // 更新现有目标
            existingGoal.distanceGoal = dailyDistanceGoal
            existingGoal.durationGoal = dailyDurationGoal
        } else {
            // 创建新目标
            let goal = DailyGoal(
                date: today,
                distanceGoal: dailyDistanceGoal,
                durationGoal: dailyDurationGoal
            )
            modelContext.insert(goal)
        }
        
        // 更新完成情况
        updateTodayGoal()
        
        // 保存
        do {
            try modelContext.save()
            // 保存成功后，延迟一点再跳转到历史页面
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                showHistory = true
            }
        } catch {
            print("保存目标失败: \(error)")
        }
    }
    
    // 更新今日目标完成情况
    private func updateTodayGoal() {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        
        // 查找今日目标
        if let todayGoal = dailyGoals.first(where: { calendar.isDate($0.date, inSameDayAs: today) }) {
            // 更新目标值（如果用户修改了默认值）
            todayGoal.distanceGoal = dailyDistanceGoal
            todayGoal.durationGoal = dailyDurationGoal
            
            // 更新完成情况
            todayGoal.completedDistance = todayDistance
            todayGoal.completedDuration = todayDuration / 60
            todayGoal.isCompleted = todayGoal.hasCompletedAll
            
            // 保存
            try? modelContext.save()
        }
    }
    
    // 今日数据
    private var todayWorkouts: [WorkoutRecord] {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        return workouts.filter { calendar.isDate($0.date, inSameDayAs: today) }
    }
    
    private var todayDistance: Double {
        todayWorkouts.reduce(0) { $0 + $1.distance } / 1000
    }
    
    private var todayDuration: TimeInterval {
        todayWorkouts.reduce(0) { $0 + $1.duration }
    }
    
    private var todayDistanceProgress: Double {
        min(todayDistance / dailyDistanceGoal, 1.0)
    }
    
    private var todayDurationProgress: Double {
        min((todayDuration / 60) / dailyDurationGoal, 1.0)
    }
    
    // 本周数据
    private var weekWorkouts: [WorkoutRecord] {
        let calendar = Calendar.current
        guard let startOfWeek = calendar.dateInterval(of: .weekOfYear, for: Date())?.start else {
            return []
        }
        return workouts.filter { $0.date >= startOfWeek }
    }
    
    private var weekDistance: Double {
        weekWorkouts.reduce(0) { $0 + $1.distance } / 1000
    }
    
    private var weekDuration: TimeInterval {
        weekWorkouts.reduce(0) { $0 + $1.duration }
    }
    
    private var weekDistanceProgress: Double {
        min(weekDistance / weeklyDistanceGoal, 1.0)
    }
    
    private var weekDurationProgress: Double {
        min((weekDuration / 60) / weeklyDurationGoal, 1.0)
    }
}

struct AchievementRow: View {
    let title: String
    let description: String
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.headline)
                Text(description)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            Spacer()
        }
        .padding(.vertical, 4)
    }
}

// 每日目标历史视图
struct DailyGoalHistoryView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @Query(sort: \DailyGoal.date, order: .reverse) private var dailyGoals: [DailyGoal]
    @Query(sort: \WorkoutRecord.date) private var workouts: [WorkoutRecord]
    @State private var selectedGoal: DailyGoal?
    @State private var showEditSheet = false
    
    var body: some View {
        NavigationView {
            List {
                if dailyGoals.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "calendar.badge.exclamationmark")
                            .font(.system(size: 50))
                            .foregroundColor(.secondary)
                        Text("暂无目标记录")
                            .foregroundColor(.secondary)
                        Text("设置目标并保存后，这里会显示历史记录")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 40)
                } else {
                    ForEach(dailyGoals) { goal in
                        DailyGoalRow(goal: goal, workouts: workouts)
                            .contentShape(Rectangle())
                            .onTapGesture {
                                selectedGoal = goal
                                showEditSheet = true
                            }
                    }
                }
            }
            .navigationTitle("每日目标历史")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("完成") {
                        dismiss()
                    }
                }
            }
            .sheet(item: $selectedGoal) { goal in
                EditDailyGoalView(goal: goal)
                    .environment(\.modelContext, modelContext)
            }
            .onAppear {
                updateAllGoalsCompletion()
            }
        }
    }
    
    // 更新所有目标的完成情况
    private func updateAllGoalsCompletion() {
        let calendar = Calendar.current
        
        for goal in dailyGoals {
            // 获取该日期的所有运动记录
            let dayWorkouts = workouts.filter { calendar.isDate($0.date, inSameDayAs: goal.date) }
            
            // 更新完成情况
            goal.completedDistance = dayWorkouts.reduce(0) { $0 + $1.distance } / 1000
            goal.completedDuration = dayWorkouts.reduce(0) { $0 + $1.duration } / 60
            goal.isCompleted = goal.hasCompletedAll
        }
        
        // 保存更新
        try? modelContext.save()
    }
}

struct DailyGoalRow: View {
    let goal: DailyGoal
    let workouts: [WorkoutRecord]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(goal.date, style: .date)
                    .font(.headline)
                Spacer()
                if goal.hasCompletedAll {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                } else if goal.hasCompletedDistance || goal.hasCompletedDuration {
                    Image(systemName: "checkmark.circle")
                        .foregroundColor(.orange)
                }
            }
            
            // 距离目标
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text("距离目标")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Spacer()
                    Text("\(goal.completedDistance, specifier: "%.2f") / \(goal.distanceGoal, specifier: "%.1f") 公里")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                ProgressView(value: goal.distanceProgress, total: 1.0)
                    .tint(.blue)
            }
            
            // 时长目标
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text("时长目标")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Spacer()
                    Text("\(Int(goal.completedDuration)) / \(Int(goal.durationGoal)) 分钟")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                ProgressView(value: goal.durationProgress, total: 1.0)
                    .tint(.green)
            }
        }
        .padding(.vertical, 4)
    }
}

struct EditDailyGoalView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    
    @Bindable var goal: DailyGoal
    @State private var distanceGoal: Double
    @State private var durationGoal: Double
    
    init(goal: DailyGoal) {
        self.goal = goal
        _distanceGoal = State(initialValue: goal.distanceGoal)
        _durationGoal = State(initialValue: goal.durationGoal)
    }
    
    var body: some View {
        NavigationView {
            Form {
                Section {
                    Text("编辑 \(goal.date, style: .date) 的目标")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Section(header: Text("距离目标")) {
                    HStack {
                        Text("目标距离")
                        Spacer()
                        Text("\(distanceGoal, specifier: "%.1f") 公里")
                            .foregroundColor(.blue)
                    }
                    
                    Slider(value: $distanceGoal, in: 1...20, step: 0.5)
                        .tint(.blue)
                    
                    Text("已完成: \(goal.completedDistance, specifier: "%.2f") 公里")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Section(header: Text("时长目标")) {
                    HStack {
                        Text("目标时长")
                        Spacer()
                        Text("\(Int(durationGoal)) 分钟")
                            .foregroundColor(.green)
                    }
                    
                    Slider(value: $durationGoal, in: 10...120, step: 5)
                        .tint(.green)
                    
                    Text("已完成: \(Int(goal.completedDuration)) 分钟")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Section(header: Text("完成情况")) {
                    HStack {
                        Text("距离完成度")
                        Spacer()
                        Text("\(Int(goal.distanceProgress * 100))%")
                            .foregroundColor(.blue)
                    }
                    
                    HStack {
                        Text("时长完成度")
                        Spacer()
                        Text("\(Int(goal.durationProgress * 100))%")
                            .foregroundColor(.green)
                    }
                    
                    if goal.hasCompletedAll {
                        HStack {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(.green)
                            Text("已完成所有目标")
                                .foregroundColor(.green)
                        }
                    }
                }
            }
            .navigationTitle("编辑目标")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("取消") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("保存") {
                        goal.distanceGoal = distanceGoal
                        goal.durationGoal = durationGoal
                        do {
                            try modelContext.save()
                            dismiss()
                        } catch {
                            print("保存失败: \(error)")
                        }
                    }
                }
            }
        }
    }
}

#Preview {
    GoalsView()
        .modelContainer(for: WorkoutRecord.self, inMemory: true)
}
