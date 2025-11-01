//
//  WorkoutRecord.swift
//  qq
//
//  Created by mac on 2025/11/1.
//

import Foundation
import SwiftData

@Model
final class WorkoutRecord: Identifiable {
    var id: UUID
    var type: String // 运动类型：跑步、骑行、步行等
    var distance: Double // 距离（米）
    var duration: TimeInterval // 持续时间（秒）
    var calories: Double? // 卡路里
    var date: Date // 运动日期
    var source: String // 数据来源：manual, healthkit, keep
    var notes: String? // 备注
    
    init(type: String, distance: Double, duration: TimeInterval, calories: Double? = nil, date: Date = Date(), source: String = "manual", notes: String? = nil) {
        self.id = UUID()
        self.type = type
        self.distance = distance
        self.duration = duration
        self.calories = calories
        self.date = date
        self.source = source
        self.notes = notes
    }
    
    // 格式化距离显示
    var formattedDistance: String {
        if distance >= 1000 {
            return String(format: "%.2f km", distance / 1000)
        } else {
            return String(format: "%.0f m", distance)
        }
    }
    
    // 格式化时间显示
    var formattedDuration: String {
        let hours = Int(duration) / 3600
        let minutes = Int(duration) / 60 % 60
        let seconds = Int(duration) % 60
        
        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, seconds)
        } else {
            return String(format: "%d:%02d", minutes, seconds)
        }
    }
    
    // 格式化配速（跑步用）
    var formattedPace: String {
        guard distance > 0, duration > 0 else { return "--" }
        let paceInSeconds = duration / (distance / 1000) // 每公里秒数
        let minutes = Int(paceInSeconds) / 60
        let seconds = Int(paceInSeconds) % 60
        return String(format: "%d'%02d\"", minutes, seconds)
    }
}

