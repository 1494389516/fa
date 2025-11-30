//
//  qqApp.swift
//  运动记录
//
//  Created by mac on 2025/11/1.
//

import SwiftUI
import SwiftData
import Combine

@main
struct qqApp: App {
    @StateObject private var themeManager = ThemeManager()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(themeManager)
                .preferredColorScheme(themeManager.isDarkMode ? .dark : .light)
                .onAppear {
                    // 首次启动处理
                    if UserPreferences.isFirstLaunch {
                        print("🎉 欢迎使用运动记录应用！")
                        UserPreferences.isFirstLaunch = false
                    }
                }
                .onReceive(NotificationCenter.default.publisher(for: .themeDidChange)) { _ in
                    // 主题更改时强制刷新视图
                    themeManager.objectWillChange.send()
                }
        }
        .modelContainer(for: [WorkoutRecord.self, DailyGoal.self])
    }
}


