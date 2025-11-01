//
//  DailyGoal.swift
//  qq
//
//  Created by mac on 2025/11/1.
//

import Foundation
import SwiftData

@Model
final class DailyGoal: Identifiable {
    var id: UUID
    var date: Date // 目标日期
    var distanceGoal: Double // 距离目标（公里）
    var durationGoal: Double // 时长目标（分钟）
    var isCompleted: Bool // 是否完成目标
    var completedDistance: Double // 完成的距离（公里）
    var completedDuration: Double // 完成的时长（分钟）
    
    init(date: Date, distanceGoal: Double, durationGoal: Double) {
        self.id = UUID()
        self.date = date
        self.distanceGoal = distanceGoal
        self.durationGoal = durationGoal
        self.isCompleted = false
        self.completedDistance = 0
        self.completedDuration = 0
    }
    
    // 距离完成进度
    var distanceProgress: Double {
        guard distanceGoal > 0 else { return 0 }
        return min(completedDistance / distanceGoal, 1.0)
    }
    
    // 时长完成进度
    var durationProgress: Double {
        guard durationGoal > 0 else { return 0 }
        return min(completedDuration / durationGoal, 1.0)
    }
    
    // 是否完成距离目标
    var hasCompletedDistance: Bool {
        return completedDistance >= distanceGoal
    }
    
    // 是否完成时长目标
    var hasCompletedDuration: Bool {
        return completedDuration >= durationGoal
    }
    
    // 是否完成所有目标
    var hasCompletedAll: Bool {
        return hasCompletedDistance && hasCompletedDuration
    }
}

