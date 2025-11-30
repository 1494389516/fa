//
//  HealthKitManager.swift
//  qq
//
//  Created by mac on 2025/11/1.
//

import Foundation
import HealthKit
import Combine

class HealthKitManager: ObservableObject {
    private let healthStore = HKHealthStore()
    
    // 检查HealthKit是否可用
    var isHealthKitAvailable: Bool {
        return HKHealthStore.isHealthDataAvailable()
    }
    
    // 请求HealthKit权限
    func requestAuthorization(completion: @escaping (Bool, Error?) -> Void) {
        guard isHealthKitAvailable else {
            completion(false, NSError(domain: "HealthKitManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "HealthKit不可用"]))
            return
        }
        
        // 定义要读取的数据类型
        let typesToRead: Set<HKObjectType> = [
            HKObjectType.workoutType(),
            HKObjectType.quantityType(forIdentifier: .distanceWalkingRunning)!,
            HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!,
        ]
        
        // 请求权限
        healthStore.requestAuthorization(toShare: nil, read: typesToRead) { success, error in
            DispatchQueue.main.async {
                completion(success, error)
            }
        }
    }
    
    // 检查授权状态
    func getAuthorizationStatus(for type: HKObjectType) -> HKAuthorizationStatus {
        return healthStore.authorizationStatus(for: type)
    }
    
    // 从HealthKit读取跑步记录
    func fetchRunningWorkouts(from startDate: Date, to endDate: Date, completion: @escaping ([WorkoutRecord]?, Error?) -> Void) {
        guard isHealthKitAvailable else {
            completion(nil, NSError(domain: "HealthKitManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "HealthKit不可用"]))
            return
        }
        
        // 创建查询条件
        let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: .strictStartDate)
        
        // 创建查询
        let query = HKSampleQuery(sampleType: HKObjectType.workoutType(), predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)]) { _, samples, error in
            guard let workouts = samples as? [HKWorkout], error == nil else {
                DispatchQueue.main.async {
                    completion(nil, error)
                }
                return
            }
            
            // 转换HKWorkout为WorkoutRecord
            let records = workouts.compactMap { workout -> WorkoutRecord? in
                // 只处理跑步相关的运动
                let workoutType = workout.workoutActivityType
                guard workoutType == .running || workoutType == .walking else {
                    return nil
                }
                
                let distance = workout.totalDistance?.doubleValue(for: HKUnit.meter()) ?? 0
                let duration = workout.duration
                let calories = workout.totalEnergyBurned?.doubleValue(for: HKUnit.kilocalorie())
                
                let type = workoutType == .running ? "跑步" : "步行"
                
                return WorkoutRecord(
                    type: type,
                    distance: distance,
                    duration: duration,
                    calories: calories,
                    date: workout.startDate,
                    source: "healthkit"
                )
            }
            
            DispatchQueue.main.async {
                completion(records, nil)
            }
        }
        
        healthStore.execute(query)
    }
    
    // 获取最近30天的跑步记录
    func fetchRecentRunningWorkouts(completion: @escaping ([WorkoutRecord]?, Error?) -> Void) {
        let endDate = Date()
        let startDate = Calendar.current.date(byAdding: .day, value: -30, to: endDate) ?? endDate
        fetchRunningWorkouts(from: startDate, to: endDate, completion: completion)
    }
}

