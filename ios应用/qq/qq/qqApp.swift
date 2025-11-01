//
//  qqApp.swift
//  运动记录
//
//  Created by mac on 2025/11/1.
//

import SwiftUI
import SwiftData

@main
struct qqApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(for: [WorkoutRecord.self, DailyGoal.self])
    }
}


