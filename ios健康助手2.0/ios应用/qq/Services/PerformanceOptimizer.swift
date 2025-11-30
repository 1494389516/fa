//
//  PerformanceOptimizer.swift
//  qq
//
//  Created by mac on 2025/11/29.
//

import Foundation
import SwiftData
import Combine
import SwiftUI
import UIKit

@MainActor
class PerformanceOptimizer: ObservableObject {
    @Published var memoryUsage: MemoryUsage = MemoryUsage(
        usedMemory: 0,
        totalMemory: 0,
        percentage: 0,
        pressureLevel: .normal
    )
    @Published var cacheStatus: CacheStatus = CacheStatus()

    private var cancellables = Set<AnyCancellable>()
    private let memoryMonitor = MemoryMonitor()
    private let cacheManager = CacheManager()

    deinit {
        // 在deinit中不能调用@MainActor方法
        cancellables.removeAll()
    }

    // MARK: - 性能监控
    func startMonitoring() {
        // 监控内存使用
        Timer.publish(every: 5.0, on: .main, in: .common)
            .autoconnect()
            .sink { [weak self] _ in
                self?.updateMemoryUsage()
            }
            .store(in: &cancellables)

        // 监控缓存状态
        Timer.publish(every: 30.0, on: .main, in: .common)
            .autoconnect()
            .sink { [weak self] _ in
                self?.updateCacheStatus()
            }
            .store(in: &cancellables)
    }

    // MARK: - 更新内存使用情况
    private func updateMemoryUsage() {
        memoryUsage = memoryMonitor.getCurrentMemoryUsage()

        // 内存压力过高时自动清理
        if memoryUsage.pressureLevel == .critical {
            performMemoryCleanup()
        }
    }

    // MARK: - 更新缓存状态
    private func updateCacheStatus() {
        cacheStatus = cacheManager.getCacheStatus()

        // 缓存过大时自动清理
        if cacheStatus.totalSize > 50 * 1024 * 1024 { // 50MB
            performCacheCleanup()
        }
    }

    // MARK: - 内存清理
    func performMemoryCleanup() {
        // 清理图片缓存
        cacheManager.clearImageCache()

        // 清理临时数据
        cacheManager.clearTemporaryData()

        // 发送内存警告通知
        NotificationCenter.default.post(name: .memoryPressureDetected, object: nil)
    }

    // MARK: - 缓存清理
    func performCacheCleanup() {
        cacheManager.performCleanup()
    }

    // MARK: - 停止监控
    func stopMonitoring() {
        cancellables.removeAll()
    }

    // MARK: - 优化数据查询
    func optimizeDataFetch<T>(_ fetchDescriptor: FetchDescriptor<T>) -> FetchDescriptor<T> {
        // 添加限制以提高性能
        var optimizedDescriptor = fetchDescriptor
        optimizedDescriptor.fetchLimit = 1000
        return optimizedDescriptor
    }

    // MARK: - 预加载数据
    func preloadData(modelContext: ModelContext) async {
        // 预加载最近的数据
        await withTaskGroup(of: Void.self) { group in
            group.addTask {
                await self.preloadRecentWorkouts(modelContext: modelContext)
            }
            group.addTask {
                await self.preloadGoals(modelContext: modelContext)
            }
        }
    }

    private func preloadRecentWorkouts(modelContext: ModelContext) async {
        let calendar = Calendar.current
        let startDate = calendar.date(byAdding: .day, value: -7, to: Date()) ?? Date()

        let descriptor = FetchDescriptor<WorkoutRecord>(
            predicate: #Predicate<WorkoutRecord> { $0.date >= startDate },
            sortBy: [SortDescriptor(\WorkoutRecord.date, order: .reverse)]
        )

        do {
            _ = try modelContext.fetch(descriptor)
        } catch {
            print("Failed to preload workouts: \(error)")
        }
    }

    private func preloadGoals(modelContext: ModelContext) async {
        let today = Calendar.current.startOfDay(for: Date())
        let weekFromNow = Calendar.current.date(byAdding: .day, value: 7, to: today) ?? Date()

        let descriptor = FetchDescriptor<DailyGoal>(
            predicate: #Predicate<DailyGoal> { $0.date >= today && $0.date <= weekFromNow },
            sortBy: [SortDescriptor(\DailyGoal.date)]
        )

        do {
            _ = try modelContext.fetch(descriptor)
        } catch {
            print("Failed to preload goals: \(error)")
        }
    }
}

// MARK: - 内存监控器
class MemoryMonitor {
    func getCurrentMemoryUsage() -> MemoryUsage {
        let physicalMemory = ProcessInfo.processInfo.physicalMemory
        var usedMemory = mach_task_basic_info()

        var count = mach_msg_type_number_t(MemoryLayout<mach_task_basic_info>.size)/4

        let kerr: kern_return_t = withUnsafeMutablePointer(to: &usedMemory) {
            $0.withMemoryRebound(to: integer_t.self, capacity: 1) {
                task_info(mach_task_self_,
                         task_flavor_t(MACH_TASK_BASIC_INFO),
                         $0,
                         &count)
            }
        }

        if kerr == KERN_SUCCESS {
            let residentMemory = Double(usedMemory.resident_size)
            let percentage = (residentMemory / Double(physicalMemory)) * 100

            let pressureLevel: MemoryPressureLevel
            if percentage > 80 {
                pressureLevel = .critical
            } else if percentage > 60 {
                pressureLevel = .warning
            } else {
                pressureLevel = .normal
            }

            return MemoryUsage(
                usedMemory: residentMemory / (1024 * 1024), // MB
                totalMemory: Double(physicalMemory) / (1024 * 1024), // MB
                percentage: percentage,
                pressureLevel: pressureLevel
            )
        }

        return MemoryUsage(
            usedMemory: 0,
            totalMemory: Double(physicalMemory) / (1024 * 1024),
            percentage: 0,
            pressureLevel: .normal
        )
    }
}

// MARK: - 缓存管理器
class CacheManager {
    private let imageCache = NSCache<NSString, UIImage>()
    private let dataCache = NSCache<NSString, NSData>()

    init() {
        // 设置缓存限制
        imageCache.countLimit = 100
        imageCache.totalCostLimit = 50 * 1024 * 1024 // 50MB

        dataCache.countLimit = 50
        dataCache.totalCostLimit = 20 * 1024 * 1024 // 20MB
    }

    func getCacheStatus() -> CacheStatus {
        // 由于NSCache不提供当前使用量的API，我们返回配置的限制值
        let imageCacheSize = imageCache.totalCostLimit
        let dataCacheSize = dataCache.totalCostLimit
        let totalSize = imageCacheSize + dataCacheSize

        // 同样，NSCache不提供当前项目计数，我们返回限制值
        let imageCacheCount = imageCache.countLimit
        let dataCacheCount = dataCache.countLimit

        return CacheStatus(
            imageCacheSize: imageCacheSize,
            dataCacheSize: dataCacheSize,
            totalSize: totalSize,
            imageCacheCount: imageCacheCount,
            dataCacheCount: dataCacheCount
        )
    }

    func clearImageCache() {
        imageCache.removeAllObjects()
    }

    func clearDataCache() {
        dataCache.removeAllObjects()
    }

    func clearTemporaryData() {
        // 清理临时文件
        let tempDir = NSTemporaryDirectory()
        if let enumerator = FileManager.default.enumerator(at: URL(fileURLWithPath: tempDir), includingPropertiesForKeys: nil) {
            for case let fileURL as URL in enumerator {
                try? FileManager.default.removeItem(at: fileURL)
            }
        }
    }

    func performCleanup() {
        // 清理超过时间限制的缓存项
        clearImageCache()
        clearDataCache()
        clearTemporaryData()
    }
}

// MARK: - 数据模型
struct MemoryUsage {
    let usedMemory: Double
    let totalMemory: Double
    let percentage: Double
    let pressureLevel: MemoryPressureLevel
}

enum MemoryPressureLevel {
    case normal
    case warning
    case critical
}

struct CacheStatus {
    let imageCacheSize: Int
    let dataCacheSize: Int
    let totalSize: Int
    let imageCacheCount: Int
    let dataCacheCount: Int

    init(imageCacheSize: Int = 0, dataCacheSize: Int = 0, totalSize: Int = 0, imageCacheCount: Int = 0, dataCacheCount: Int = 0) {
        self.imageCacheSize = imageCacheSize
        self.dataCacheSize = dataCacheSize
        self.totalSize = totalSize
        self.imageCacheCount = imageCacheCount
        self.dataCacheCount = dataCacheCount
    }
}

// MARK: - 通知扩展
extension Notification.Name {
    static let memoryPressureDetected = Notification.Name("MemoryPressureDetected")
    static let cacheCleanupRequired = Notification.Name("CacheCleanupRequired")
}

// MARK: - 性能优化视图修饰器
struct PerformanceOptimizedView<Content: View>: View {
    let content: Content
    @StateObject private var optimizer = PerformanceOptimizer()

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        content
            .onAppear {
                optimizer.startMonitoring()
            }
            .onDisappear {
                optimizer.stopMonitoring()
            }
            .onReceive(NotificationCenter.default.publisher(for: .memoryPressureDetected)) { _ in
                // 处理内存压力
                performAdditionalCleanup()
            }
    }

    private func performAdditionalCleanup() {
        // 清理非必要的UI缓存
        // 降低图片质量
        // 暂停后台任务
    }
}

// MARK: - 智能图片加载
struct OptimizedAsyncImage: View {
    let url: URL?
    let placeholder: Image

    @State private var image: UIImage?
    @State private var isLoading = true

    var body: some View {
        Group {
            if let image = image {
                Image(uiImage: image)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } else {
                placeholder
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .opacity(isLoading ? 0.5 : 1.0)
            }
        }
        .onAppear {
            loadImage()
        }
        .onChange(of: url) { _ in
            loadImage()
        }
    }

    private func loadImage() {
        isLoading = true

        Task {
            if let url = url {
                do {
                    let (data, _) = try await URLSession.shared.data(from: url)

                    if let image = UIImage(data: data) {
                        await MainActor.run {
                            self.image = image
                            self.isLoading = false
                        }
                    }
                } catch {
                    await MainActor.run {
                        self.isLoading = false
                    }
                }
            } else {
                await MainActor.run {
                    self.image = nil
                    self.isLoading = false
                }
            }
        }
    }
}