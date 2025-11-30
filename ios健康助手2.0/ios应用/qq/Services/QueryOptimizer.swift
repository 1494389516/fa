//
//  QueryOptimizerSimple.swift
//  qq
//
//  Created by mac on 2025/11/30.
//

import Foundation
import SwiftData

// MARK: - 优化的查询描述符

struct QueryOptimizer {
    // MARK: - 优化的查询描述符

    /// 获取最近日期的运动记录（带分页）
    static func recentWorkoutsDescriptor(offset: Int = 0, limit: Int = 50) -> FetchDescriptor<WorkoutRecord> {
        // 计算日期，在谓词外部处理
        let calendar = Calendar.current
        let thirtyDaysAgo = calendar.date(byAdding: .day, value: -30, to: Date()) ?? Date()
        let thirtyDaysAgoInterval = thirtyDaysAgo.timeIntervalSince1970

        var descriptor = FetchDescriptor<WorkoutRecord>(
            predicate: #Predicate<WorkoutRecord> { workout in
                workout.date.timeIntervalSince1970 >= thirtyDaysAgoInterval
            },
            sortBy: [SortDescriptor(\WorkoutRecord.date, order: .reverse)]
        )
        descriptor.fetchOffset = offset
        descriptor.fetchLimit = limit
        return descriptor
    }

    /// 按类型获取运动记录（带日期范围）
    static func workoutsByTypeDescriptor(_ type: String, startDate: Date, endDate: Date) -> FetchDescriptor<WorkoutRecord> {
        // 转换为时间戳以在谓词中使用
        let startInterval = startDate.timeIntervalSince1970
        let endInterval = endDate.timeIntervalSince1970

        return FetchDescriptor<WorkoutRecord>(
            predicate: #Predicate<WorkoutRecord> { workout in
                workout.type == type && workout.date.timeIntervalSince1970 >= startInterval && workout.date.timeIntervalSince1970 <= endInterval
            },
            sortBy: [SortDescriptor(\WorkoutRecord.date, order: .reverse)]
        )
    }

    /// 获取特定日期范围的运动统计
    static func workoutsStatsDescriptor(startDate: Date, endDate: Date) -> FetchDescriptor<WorkoutRecord> {
        // 转换为时间戳以在谓词中使用
        let startInterval = startDate.timeIntervalSince1970
        let endInterval = endDate.timeIntervalSince1970

        return FetchDescriptor<WorkoutRecord>(
            predicate: #Predicate<WorkoutRecord> { workout in
                workout.date.timeIntervalSince1970 >= startInterval && workout.date.timeIntervalSince1970 <= endInterval
            },
            sortBy: [SortDescriptor(\WorkoutRecord.date, order: .reverse)]
        )
    }

    /// 获取所有运动类型（去重）
    static func allWorkoutTypesDescriptor() -> FetchDescriptor<WorkoutRecord> {
        return FetchDescriptor<WorkoutRecord>(
            sortBy: [SortDescriptor(\WorkoutRecord.type)]
        )
    }

    /// 分页获取运动记录
    static func paginatedWorkoutsDescriptor(page: Int, pageSize: Int = 20) -> FetchDescriptor<WorkoutRecord> {
        var descriptor = FetchDescriptor<WorkoutRecord>(
            sortBy: [SortDescriptor(\WorkoutRecord.date, order: .reverse)]
        )
        descriptor.fetchOffset = page * pageSize
        descriptor.fetchLimit = pageSize
        return descriptor
    }

    // MARK: - 性能优化的查询方法

    /// 批量获取运动记录（避免内存峰值）
    static func fetchWorkoutsInBatches(
        modelContext: ModelContext,
        batchSize: Int = 100,
        completion: @MainActor @escaping ([WorkoutRecord]) -> Void
    ) {
        Task {
            var allWorkouts: [WorkoutRecord] = []
            var offset = 0

            while true {
                var descriptor = FetchDescriptor<WorkoutRecord>(
                    sortBy: [SortDescriptor(\WorkoutRecord.date, order: .reverse)]
                )
                descriptor.fetchOffset = offset
                descriptor.fetchLimit = batchSize

                do {
                    let batch = try modelContext.fetch(descriptor)
                    if batch.isEmpty { break }

                    await MainActor.run {
                        allWorkouts.append(contentsOf: batch)
                        completion(batch)
                    }

                    offset += batchSize

                    // 避免过度占用CPU
                    try await Task.sleep(nanoseconds: 10_000_000) // 0.01秒
                } catch {
                    print("批量获取失败: \(error)")
                    break
                }
            }
        }
    }

    /// 获取年月统计（预聚合查询）
    static func fetchMonthlyStats(
        modelContext: ModelContext,
        year: Int
    ) async throws -> [MonthStats] {
        let calendar = Calendar.current
        let startDate = calendar.date(from: DateComponents(year: year, month: 1, day: 1)) ?? Date()
        let endDate = calendar.date(from: DateComponents(year: year + 1, month: 1, day: 1)) ?? Date()

        let descriptor = workoutsStatsDescriptor(startDate: startDate, endDate: endDate)
        let workouts = try modelContext.fetch(descriptor)

        // 按月份分组统计
        var monthlyStats: [Int: MonthStats] = [:]

        for workout in workouts {
            let month = calendar.component(.month, from: workout.date)

            if monthlyStats[month] == nil {
                monthlyStats[month] = MonthStats(month: month, year: year)
            }

            monthlyStats[month]?.addWorkout(workout)
        }

        return monthlyStats.values.sorted { $0.month < $1.month }
    }

    /// 缓存优化的查询结果
    private static var queryCache: [String: (result: Any, timestamp: Date)] = [:]
    private static let cacheTimeout: TimeInterval = 300 // 5分钟

    static func cachedFetch<T>(
        key: String,
        fetch: () throws -> T
    ) rethrows -> T {
        let now = Date()

        if let cached = queryCache[key],
           now.timeIntervalSince(cached.timestamp) < cacheTimeout {
            return cached.result as! T
        }

        let result = try fetch()
        queryCache[key] = (result: result, timestamp: now)
        return result
    }
}

// MARK: - 统计数据模型

struct MonthStats {
    let month: Int
    let year: Int
    var totalDistance: Double = 0
    var totalDuration: TimeInterval = 0
    var totalCalories: Double = 0
    var workoutCount: Int = 0

    init(month: Int, year: Int) {
        self.month = month
        self.year = year
    }

    mutating func addWorkout(_ workout: WorkoutRecord) {
        totalDistance += workout.distance
        totalDuration += workout.duration
        totalCalories += workout.calories ?? 0
        workoutCount += 1
    }

    var averageDistance: Double {
        workoutCount > 0 ? totalDistance / Double(workoutCount) : 0
    }

    var averageDuration: TimeInterval {
        workoutCount > 0 ? totalDuration / Double(workoutCount) : 0
    }

    var formattedMonth: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy年M月"
        return formatter.string(from: DateComponents(year: year, month: month).date ?? Date())
    }
}

// MARK: - 查询修饰器

extension ModelContext {
    /// 安全执行查询（带错误处理）
    func safeFetch<T>(_ descriptor: FetchDescriptor<T>) -> Result<[T], Error> where T: PersistentModel {
        do {
            let results = try fetch(descriptor)
            return .success(results)
        } catch {
            return .failure(error)
        }
    }

    /// 获取记录总数（优化版）
    func count<T>(_ type: T.Type, predicate: Predicate<T>? = nil) -> Result<Int, Error> where T: PersistentModel {
        do {
            var descriptor = FetchDescriptor<T>(predicate: predicate)
            descriptor.fetchLimit = 0
            let count = try fetchCount(descriptor)
            return .success(count)
        } catch {
            return .failure(error)
        }
    }
}

// MARK: - 查询构建器

struct QueryBuilder {
    var sortDescriptors: [SortDescriptor<WorkoutRecord>] = []
    var offset: Int = 0
    var limit: Int? = nil

    init() {}

    func sort(by descriptor: SortDescriptor<WorkoutRecord>) -> QueryBuilder {
        var builder = self
        builder.sortDescriptors.append(descriptor)
        return builder
    }

    func offset(_ offset: Int) -> QueryBuilder {
        var builder = self
        builder.offset = offset
        return builder
    }

    func limit(_ limit: Int) -> QueryBuilder {
        var builder = self
        builder.limit = limit
        return builder
    }

    func build() -> FetchDescriptor<WorkoutRecord> {
        // 由于Predicate限制，使用简化的构建方式
        var descriptor = FetchDescriptor<WorkoutRecord>(sortBy: sortDescriptors)
        descriptor.fetchOffset = offset
        if let limit = limit {
            descriptor.fetchLimit = limit
        }
        return descriptor
    }
}