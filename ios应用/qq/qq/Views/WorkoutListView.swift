//
//  WorkoutListView.swift
//  qq
//
//  Created by mac on 2025/11/1.
//

import SwiftUI
import SwiftData

struct WorkoutListView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \WorkoutRecord.date, order: .reverse) private var workouts: [WorkoutRecord]
    @StateObject private var healthKitManager = HealthKitManager()
    @State private var showImportSheet = false
    @State private var showAddWorkoutSheet = false
    @State private var searchText = ""
    @State private var selectedType: String? = nil
    
    let workoutTypes = ["全部", "跑步", "步行", "骑行", "游泳", "其他"]
    
    var filteredWorkouts: [WorkoutRecord] {
        var filtered = workouts
        
        // 按类型筛选
        if let selectedType = selectedType, selectedType != "全部" {
            filtered = filtered.filter { $0.type == selectedType }
        }
        
        // 搜索筛选
        if !searchText.isEmpty {
            filtered = filtered.filter { workout in
                workout.type.localizedCaseInsensitiveContains(searchText) ||
                (workout.notes?.localizedCaseInsensitiveContains(searchText) ?? false)
            }
        }
        
        return filtered
    }
    
    var body: some View {
        NavigationView {
            List {
                // 搜索和筛选
                Section {
                    VStack(spacing: 12) {
                        // 搜索框
                        HStack {
                            Image(systemName: "magnifyingglass")
                                .foregroundColor(.secondary)
                            TextField("搜索运动记录...", text: $searchText)
                        }
                        .padding(8)
                        .background(Color.gray.opacity(0.1))
                        .cornerRadius(8)
                        
                        // 类型筛选
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 10) {
                                ForEach(workoutTypes, id: \.self) { type in
                                    Button {
                                        selectedType = type
                                    } label: {
                                        Text(type)
                                            .font(.caption)
                                            .padding(.horizontal, 12)
                                            .padding(.vertical, 6)
                                            .background(selectedType == type ? Color.blue : Color.gray.opacity(0.2))
                                            .foregroundColor(selectedType == type ? .white : .primary)
                                            .cornerRadius(16)
                                    }
                                }
                            }
                            .padding(.horizontal, 4)
                        }
                    }
                    .padding(.vertical, 8)
                }
                
                // 统计卡片
                if !workouts.isEmpty {
                    Section {
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                VStack(alignment: .leading) {
                                    Text("总距离")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                    Text(formatDistance(totalDistance))
                                        .font(.title2)
                                        .fontWeight(.bold)
                                }
                                
                                Spacer()
                                
                                VStack(alignment: .trailing) {
                                    Text("总时长")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                    Text(formatDuration(totalDuration))
                                        .font(.title2)
                                        .fontWeight(.bold)
                                }
                            }
                            
                            if totalCalories > 0 {
                                HStack {
                                    Text("总卡路里")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                    Spacer()
                                    Text(String(format: "%.0f 千卡", totalCalories))
                                        .font(.title2)
                                        .fontWeight(.bold)
                                }
                            }
                            
                            HStack {
                                Text("运动次数")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                Spacer()
                                Text("\(workouts.count) 次")
                                    .font(.title2)
                                    .fontWeight(.bold)
                            }
                        }
                        .padding(.vertical, 8)
                    }
                }
                
                // 运动记录列表
                Section(header: Text("运动记录 (\(filteredWorkouts.count))")) {
                    if filteredWorkouts.isEmpty {
                        VStack(spacing: 16) {
                            Image(systemName: searchText.isEmpty ? "figure.run" : "magnifyingglass")
                                .font(.system(size: 50))
                                .foregroundColor(.secondary)
                            Text(searchText.isEmpty ? "还没有运动记录" : "未找到匹配的记录")
                                .foregroundColor(.secondary)
                            if searchText.isEmpty {
                                Text("点击左上角按钮添加记录，或右上角按钮导入数据")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                    .multilineTextAlignment(.center)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 40)
                    } else {
                        ForEach(filteredWorkouts) { workout in
                            WorkoutRowView(workout: workout)
                        }
                        .onDelete(perform: deleteWorkouts)
                    }
                }
            }
            .navigationTitle("运动记录")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button {
                        showAddWorkoutSheet = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        showImportSheet = true
                    } label: {
                        Image(systemName: "square.and.arrow.down")
                    }
                }
            }
            .sheet(isPresented: $showImportSheet) {
                ImportView()
                    .environment(\.modelContext, modelContext)
            }
            .sheet(isPresented: $showAddWorkoutSheet) {
                AddWorkoutView()
                    .environment(\.modelContext, modelContext)
            }
        }
    }
    
    private var totalDistance: Double {
        workouts.reduce(0) { $0 + $1.distance }
    }
    
    private var totalDuration: TimeInterval {
        workouts.reduce(0) { $0 + $1.duration }
    }
    
    private var totalCalories: Double {
        workouts.compactMap { $0.calories }.reduce(0, +)
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
            return String(format: "%d小时%d分钟", hours, minutes)
        } else {
            return String(format: "%d分钟", minutes)
        }
    }
    
    private func deleteWorkouts(at offsets: IndexSet) {
        for index in offsets {
            let workout = filteredWorkouts[index]
            modelContext.delete(workout)
        }
        do {
            try modelContext.save()
        } catch {
            print("删除失败: \(error)")
        }
    }
}

// 运动记录行视图
struct WorkoutRowView: View {
    let workout: WorkoutRecord
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(workout.type)
                    .font(.headline)
                Spacer()
                Text(workout.date, style: .date)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            HStack(spacing: 20) {
                Label(workout.formattedDistance, systemImage: "figure.run")
                Label(workout.formattedDuration, systemImage: "clock")
                if workout.type == "跑步" {
                    Label(workout.formattedPace, systemImage: "speedometer")
                }
            }
            .font(.subheadline)
            .foregroundColor(.secondary)
            
            if let calories = workout.calories {
                HStack {
                    Label(String(format: "%.0f 千卡", calories), systemImage: "flame.fill")
                        .font(.caption)
                        .foregroundColor(.orange)
                    Spacer()
                    Text(workout.source == "healthkit" ? "苹果健康" : workout.source == "keep" ? "Keep" : "手动")
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.blue.opacity(0.1))
                        .foregroundColor(.blue)
                        .cornerRadius(8)
                }
            }
        }
        .padding(.vertical, 4)
    }
}

