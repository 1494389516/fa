//
//  UserPreferences.swift
//  qq
//
//  Created by mac on 2025/11/29.
//

import SwiftUI

// MARK: - 用户偏好设置
struct UserPreferences {
    @AppStorage("firstLaunch") static var isFirstLaunch: Bool = true
    @AppStorage("onboardingCompleted") static var onboardingCompleted: Bool = false
    @AppStorage("tutorialShown") static var tutorialShown: Bool = false
    @AppStorage("defaultWorkoutType") static var defaultWorkoutType: String = "跑步"
    @AppStorage("enableNotifications") static var enableNotifications: Bool = true
    @AppStorage("enableDarkMode") static var enableDarkMode: Bool = false
    @AppStorage("enableHaptics") static var enableHaptics: Bool = true

    // 使用UserDefaults处理Date类型
    static var lastSyncDate: Date? {
        get {
            guard let timeInterval = UserDefaults.standard.object(forKey: "lastSyncDate") as? TimeInterval else { return nil }
            return Date(timeIntervalSince1970: timeInterval)
        }
        set {
            if let date = newValue {
                UserDefaults.standard.set(date.timeIntervalSince1970, forKey: "lastSyncDate")
            } else {
                UserDefaults.standard.removeObject(forKey: "lastSyncDate")
            }
        }
    }
}

// MARK: - 应用统计
struct AppUsageStatistics {
    @AppStorage("totalWorkouts") static var totalWorkouts: Int = 0
    @AppStorage("totalDistance") static var totalDistance: Double = 0.0
    @AppStorage("launchCount") static var launchCount: Int = 0

    // 使用UserDefaults处理Date类型
    static var lastLaunchDate: Date? {
        get {
            guard let timeInterval = UserDefaults.standard.object(forKey: "lastLaunchDate") as? TimeInterval else { return nil }
            return Date(timeIntervalSince1970: timeInterval)
        }
        set {
            if let date = newValue {
                UserDefaults.standard.set(date.timeIntervalSince1970, forKey: "lastLaunchDate")
            } else {
                UserDefaults.standard.removeObject(forKey: "lastLaunchDate")
            }
        }
    }
}

// MARK: - 数据设置
struct DataSettings {
    @AppStorage("autoBackup") static var autoBackup: Bool = true
    @AppStorage("exportFormat") static var exportFormat: String = "json"
    @AppStorage("maxCachedWorkouts") static var maxCachedWorkouts: Int = 100

    // 使用 UserDefaults 直接处理数组类型
    static var importHistory: [String] {
        get {
            let defaults = UserDefaults.standard
            return defaults.array(forKey: "importHistory") as? [String] ?? []
        }
        set {
            let defaults = UserDefaults.standard
            defaults.set(newValue, forKey: "importHistory")
        }
    }
}

// MARK: - 通知设置
struct NotificationSettings {
    @AppStorage("reminderEnabled") static var reminderEnabled: Bool = false
    // 使用UserDefaults处理Date类型
    static var reminderTime: Date {
        get {
            let timeInterval = UserDefaults.standard.double(forKey: "reminderTime")
            return timeInterval > 0 ? Date(timeIntervalSince1970: timeInterval) : Date()
        }
        set {
            UserDefaults.standard.set(newValue.timeIntervalSince1970, forKey: "reminderTime")
        }
    }
    @AppStorage("goalNotificationEnabled") static var goalNotificationEnabled: Bool = true

    // 使用 UserDefaults 直接处理数组类型
    static var reminderWeekdays: Set<Int> {
        get {
            let defaults = UserDefaults.standard
            let array = defaults.array(forKey: "reminderWeekdays") as? [Int] ?? []
            return Set(array)
        }
        set {
            let defaults = UserDefaults.standard
            defaults.set(Array(newValue), forKey: "reminderWeekdays")
        }
    }
}

// MARK: - 显示设置
struct DisplaySettings {
    @AppStorage("showDistanceInKm") static var showDistanceInKm: Bool = true
    @AppStorage("chartType") static var chartType: String = "bar"
    @AppStorage("animationEnabled") static var animationEnabled: Bool = true
    @AppStorage("hapticFeedbackEnabled") static var hapticFeedbackEnabled: Bool = true
    @AppStorage("showDateOnWorkoutCard") static var showDateOnWorkoutCard: Bool = true
}

// MARK: - 隐私设置
struct PrivacySettings {
    @AppStorage("shareDataAnalytics") static var shareDataAnalytics: Bool = false
    @AppStorage("crashReporting") static var crashReportingEnabled: Bool = true
    @AppStorage("usageTracking") static var usageTrackingEnabled: Bool = true
}

#Preview {
    VStack {
        Text("用户偏好设置预览")
            .font(.headline)

        VStack(alignment: .leading, spacing: 8) {
            Text("首次启动: \(UserPreferences.isFirstLaunch)")
            Text("通知启用: \(UserPreferences.enableNotifications)")
            Text("深色模式: \(UserPreferences.enableDarkMode)")
            Text("触觉反馈: \(UserPreferences.enableHaptics)")
        }
        .font(.caption)
        .foregroundColor(.secondary)
        .padding()
    }
}