//
//  ImportHealthDataView.swift
//  qq
//
//  Created by mac on 2025/11/30.
//

import SwiftUI
import HealthKit
import SwiftData

struct ImportHealthDataView: View {
    @Binding var workouts: [WorkoutRecord]
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @State private var isImporting = false
    @State private var importStatus = ""
    @State private var importedCount = 0

    var body: some View {
        NavigationView {
            VStack(spacing: 30) {
                // 顶部图标和说明
                VStack(spacing: 15) {
                    Image(systemName: "heart.fill")
                        .font(.system(size: 60))
                        .foregroundColor(.red)

                    Text("从健康应用导入数据")
                        .font(.title2)
                        .fontWeight(.bold)

                    Text("我们将从您的健康应用中读取运动记录，包括跑步、步行、骑��等数据")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }

                // 导入选项
                VStack(spacing: 15) {
                    ImportOptionRow(
                        icon: "figure.run",
                        title: "跑步记录",
                        description: "导入所有跑步数据"
                    )

                    ImportOptionRow(
                        icon: "figure.walk",
                        title: "步行记录",
                        description: "导入所有步行数据"
                    )

                    ImportOptionRow(
                        icon: "bicycle",
                        title: "骑行记录",
                        description: "导入所有骑行数据"
                    )

                    ImportOptionRow(
                        icon: "figure.pool.swim",
                        title: "游泳记录",
                        description: "导入所有游泳数据"
                    )
                }
                .padding()

                Spacer()

                // 导入按钮
                Button(action: importHealthData) {
                    if isImporting {
                        HStack {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                .scaleEffect(0.8)
                            Text("正在导入...")
                        }
                    } else {
                        Text("开始导入")
                    }
                }
                .font(.headline)
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding()
                .background(isImporting ? Color.gray : Color.blue)
                .cornerRadius(12)
                .disabled(isImporting)

                // 状态信息
                if !importStatus.isEmpty {
                    Text(importStatus)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }
            }
            .padding()
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("取消") {
                        dismiss()
                    }
                    .disabled(isImporting)
                }
            }
        }
    }

    private func importHealthData() {
        isImporting = true
        importStatus = "正在请求健康数据权限..."

        let healthStore = HKHealthStore()

        // 检查健康数据是否可用
        guard HKHealthStore.isHealthDataAvailable() else {
            importStatus = "健康数据不可用"
            isImporting = false
            return
        }

        // 请求权限
        let typesToRead: Set<HKObjectType> = [
            HKObjectType.workoutType(),
            HKObjectType.quantityType(forIdentifier: .distanceWalkingRunning)!,
            HKObjectType.quantityType(forIdentifier: .distanceCycling)!,
            HKObjectType.quantityType(forIdentifier: .distanceSwimming)!,
            HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!
        ]

        healthStore.requestAuthorization(toShare: nil, read: typesToRead) { [self] success, error in
            DispatchQueue.main.async {
                if success {
                    self.importWorkouts(healthStore: healthStore)
                } else {
                    self.importStatus = "权限请求失败：\(error?.localizedDescription ?? "未知错误")"
                    self.isImporting = false
                }
            }
        }
    }

    private func importWorkouts(healthStore: HKHealthStore) {
        importStatus = "正在读取运动数据..."

        // 创建查询
        let runningPredicate = HKQuery.predicateForWorkouts(with: .running)
        let walkingPredicate = HKQuery.predicateForWorkouts(with: .walking)
        let cyclingPredicate = HKQuery.predicateForWorkouts(with: .cycling)
        let swimmingPredicate = HKQuery.predicateForWorkouts(with: .swimming)

        let workoutPredicate = NSCompoundPredicate(orPredicateWithSubpredicates: [
            runningPredicate,
            walkingPredicate,
            cyclingPredicate,
            swimmingPredicate
        ])

        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)

        let query = HKSampleQuery(
            sampleType: HKObjectType.workoutType(),
            predicate: workoutPredicate,
            limit: HKObjectQueryNoLimit,
            sortDescriptors: [sortDescriptor]
        ) { [self] query, samples, error in
            DispatchQueue.main.async {
                if let error = error {
                    self.importStatus = "读取数据失败：\(error.localizedDescription)"
                    self.isImporting = false
                    return
                }

                guard let workoutSamples = samples as? [HKWorkout] else {
                    self.importStatus = "没有找到运动数据"
                    self.isImporting = false
                    return
                }

                // 转换并保存数据
                self.saveWorkouts(workoutSamples)
            }
        }

        healthStore.execute(query)
    }

    private func saveWorkouts(_ workoutSamples: [HKWorkout]) {
        importStatus = "正在保存数据..."

        let dateFormatter = DateFormatter()
        dateFormatter.dateStyle = .medium
        dateFormatter.timeStyle = .short

        for hkWorkout in workoutSamples {
            // 检查是否已存在
            let existingWorkout = workouts.first { workout in
                // 使用日期和类型来检测重复
                return Calendar.current.isDate(workout.date, inSameDayAs: hkWorkout.startDate) &&
                       workout.type == workoutTypeString(hkWorkout.workoutActivityType)
            }

            guard existingWorkout == nil else { continue }

            // 创建新的运动记录
            let workout = WorkoutRecord(
                type: workoutTypeString(hkWorkout.workoutActivityType),
                distance: hkWorkout.totalDistance?.doubleValue(for: .meter()) ?? 0,
                duration: hkWorkout.duration,
                calories: hkWorkout.totalEnergyBurned?.doubleValue(for: .kilocalorie()),
                date: hkWorkout.startDate,
                source: "healthkit",
                notes: "从健康应用导入"
            )

            modelContext.insert(workout)
        }

        // 保存到数据库
        do {
            try modelContext.save()
            importedCount = workoutSamples.count
            importStatus = "成功导入 \(importedCount) 条运动记录！"

            // 刷新工作outs列表
            DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
                loadWorkouts()
            }
        } catch {
            importStatus = "保存数据失败：\(error.localizedDescription)"
        }

        isImporting = false

        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            dismiss()
        }
    }

    private func loadWorkouts() {
        let descriptor = FetchDescriptor<WorkoutRecord>(
            sortBy: [SortDescriptor(\WorkoutRecord.date, order: .reverse)]
        )
        workouts = (try? modelContext.fetch(descriptor)) ?? []
    }

    private func workoutTypeString(_ activityType: HKWorkoutActivityType) -> String {
        switch activityType {
        case .running: return "跑步"
        case .walking: return "步行"
        case .cycling: return "骑行"
        case .swimming: return "游泳"
        case .yoga: return "瑜伽"
        case .elliptical: return "椭圆机"
        case .functionalStrengthTraining: return "力量训练"
        case .traditionalStrengthTraining: return "传统力量训练"
        case .crossTraining: return "交叉训练"
        case .mixedCardio: return "混合有氧"
        case .flexibility: return "柔韧性训练"
        case .cooldown: return "放松运动"
        default: return "其他"
        }
    }
}

// MARK: - 导入选项行
struct ImportOptionRow: View {
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

            Image(systemName: "checkmark.circle.fill")
                .foregroundColor(.green)
        }
        .padding(.vertical, 5)
    }
}

#Preview {
    ImportHealthDataView(workouts: .constant([]))
        .modelContainer(for: WorkoutRecord.self)
}