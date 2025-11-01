//
//  AddWorkoutView.swift
//  qq
//
//  Created by mac on 2025/11/1.
//

import SwiftUI
import SwiftData

struct AddWorkoutView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    
    @State private var workoutType: String = "跑步"
    @State private var distance: String = ""
    @State private var distanceUnit: String = "km"
    @State private var hours: String = "0"
    @State private var minutes: String = "0"
    @State private var seconds: String = "0"
    @State private var calories: String = ""
    @State private var selectedDate: Date = Date()
    @State private var notes: String = ""
    @State private var showAlert = false
    @State private var alertMessage = ""
    
    let workoutTypes = ["跑步", "步行", "骑行", "游泳", "其他"]
    
    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("运动类型")) {
                    Picker("运动类型", selection: $workoutType) {
                        ForEach(workoutTypes, id: \.self) { type in
                            Text(type).tag(type)
                        }
                    }
                }
                
                Section(header: Text("距离")) {
                    HStack {
                        TextField("距离", text: $distance)
                            .keyboardType(.decimalPad)
                        Picker("单位", selection: $distanceUnit) {
                            Text("公里").tag("km")
                            Text("米").tag("m")
                        }
                        .pickerStyle(.menu)
                        .frame(width: 80)
                    }
                    Text(distanceUnit == "km" ? "例如：5.2 表示 5.2公里" : "例如：5200 表示 5200米")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Section(header: Text("时长")) {
                    HStack {
                        TextField("小时", text: $hours)
                            .keyboardType(.numberPad)
                            .frame(width: 60)
                        Text(":")
                        TextField("分钟", text: $minutes)
                            .keyboardType(.numberPad)
                            .frame(width: 60)
                        Text(":")
                        TextField("秒", text: $seconds)
                            .keyboardType(.numberPad)
                            .frame(width: 60)
                    }
                    .textFieldStyle(.roundedBorder)
                }
                
                Section(header: Text("卡路里（可选）")) {
                    TextField("卡路里", text: $calories)
                        .keyboardType(.decimalPad)
                }
                
                Section(header: Text("日期")) {
                    DatePicker("运动日期", selection: $selectedDate, displayedComponents: [.date, .hourAndMinute])
                }
                
                Section(header: Text("备注（可选）")) {
                    TextField("备注", text: $notes, axis: .vertical)
                        .lineLimit(3...6)
                }
            }
            .navigationTitle("添加运动记录")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("取消") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("保存") {
                        saveWorkout()
                    }
                }
            }
            .alert("提示", isPresented: $showAlert) {
                Button("确定", role: .cancel) { }
            } message: {
                Text(alertMessage)
            }
        }
    }
    
    private func saveWorkout() {
        // 验证距离
        guard let distanceValue = Double(distance), distanceValue > 0 else {
            alertMessage = "请输入有效的距离"
            showAlert = true
            return
        }
        
        // 转换距离为米
        let distanceInMeters = distanceUnit == "km" ? distanceValue * 1000 : distanceValue
        
        // 验证时长
        let h = Int(hours) ?? 0
        let m = Int(minutes) ?? 0
        let s = Int(seconds) ?? 0
        
        guard h >= 0 && m >= 0 && m < 60 && s >= 0 && s < 60 else {
            alertMessage = "请输入有效的时长"
            showAlert = true
            return
        }
        
        guard h > 0 || m > 0 || s > 0 else {
            alertMessage = "时长不能为0"
            showAlert = true
            return
        }
        
        let totalDuration = TimeInterval(h * 3600 + m * 60 + s)
        
        // 解析卡路里（可选）
        let caloriesValue = calories.isEmpty ? nil : Double(calories)
        
        // 创建记录
        let record = WorkoutRecord(
            type: workoutType,
            distance: distanceInMeters,
            duration: totalDuration,
            calories: caloriesValue,
            date: selectedDate,
            source: "manual",
            notes: notes.isEmpty ? nil : notes
        )
        
        // 保存到数据库
        modelContext.insert(record)
        
        do {
            try modelContext.save()
            dismiss()
        } catch {
            alertMessage = "保存失败: \(error.localizedDescription)"
            showAlert = true
        }
    }
}

#Preview {
    AddWorkoutView()
        .modelContainer(for: WorkoutRecord.self, inMemory: true)
}

