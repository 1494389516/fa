//
//  AddWorkoutView.swift
//  qq
//
//  Created by mac on 2025/11/30.
//

import SwiftUI
import SwiftData

struct AddWorkoutView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var themeManager: ThemeManager

    @State private var selectedType = "跑步"
    @State private var distance = ""
    @State private var durationHours = "0"
    @State private var durationMinutes = "0"
    @State private var durationSeconds = "0"
    @State private var calories = ""
    @State private var notes = ""
    @State private var date = Date()

    let workoutTypes = ["跑步", "步行", "骑行", "游泳", "瑜伽", "力量训练", "椭圆机", "其他"]

    var body: some View {
        NavigationView {
            Form {
                // 运动类型选择
                Section("运动类型") {
                    Picker("类型", selection: $selectedType) {
                        ForEach(workoutTypes, id: \.self) { type in
                            Text(type).tag(type)
                        }
                    }
                    .pickerStyle(SegmentedPickerStyle())
                }

                // 日期时间
                Section("运动时间") {
                    DatePicker("日期", selection: $date, displayedComponents: [.date, .hourAndMinute])
                }

                // 运动数据
                Section("运动数据") {
                    HStack {
                        Text("距离")
                        Spacer()
                        TextField("0", text: $distance)
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.trailing)
                        Text(selectedType == "游泳" ? "米" : "公里")
                            .foregroundColor(.secondary)
                    }

                    HStack {
                        Text("时长")
                        Spacer()
                        HStack {
                            TextField("0", text: $durationHours)
                                .keyboardType(.numberPad)
                                .frame(width: 40)
                                .multilineTextAlignment(.center)
                            Text("时")
                                .foregroundColor(.secondary)

                            TextField("0", text: $durationMinutes)
                                .keyboardType(.numberPad)
                                .frame(width: 40)
                                .multilineTextAlignment(.center)
                            Text("分")
                                .foregroundColor(.secondary)

                            TextField("0", text: $durationSeconds)
                                .keyboardType(.numberPad)
                                .frame(width: 40)
                                .multilineTextAlignment(.center)
                            Text("秒")
                                .foregroundColor(.secondary)
                        }
                    }

                    HStack {
                        Text("卡路里")
                        Spacer()
                        TextField("可选", text: $calories)
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.trailing)
                        Text("千卡")
                            .foregroundColor(.secondary)
                    }
                }

                // 备注
                Section("备注") {
                    TextField("添加备注...", text: $notes, axis: .vertical)
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
                    .foregroundColor(themeManager.currentTheme.primary)
                    .disabled(!canSave)
                }
            }
        }
    }

    private var canSave: Bool {
        !distance.isEmpty &&
        (Double(distance) ?? 0) > 0 &&
        totalDuration > 0
    }

    private var totalDuration: TimeInterval {
        let hours = Int(durationHours) ?? 0
        let minutes = Int(durationMinutes) ?? 0
        let seconds = Int(durationSeconds) ?? 0
        return TimeInterval(hours * 3600 + minutes * 60 + seconds)
    }

    private func saveWorkout() {
        let distanceValue = (Double(distance) ?? 0) * (selectedType == "游泳" ? 1 : 1000) // 游泳用米，其他用公里转米
        let caloriesValue = calories.isEmpty ? nil : Double(calories)

        let workout = WorkoutRecord(
            type: selectedType,
            distance: distanceValue,
            duration: totalDuration,
            calories: caloriesValue,
            date: date,
            source: "manual",
            notes: notes.isEmpty ? nil : notes
        )

        modelContext.insert(workout)

        do {
            try modelContext.save()
            dismiss()
        } catch {
            print("保存失败: \(error)")
        }
    }
}

#Preview {
    AddWorkoutView()
        .modelContainer(for: WorkoutRecord.self)
}