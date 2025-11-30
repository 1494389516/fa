//
//  WorkoutRecord.swift
//  qq
//
//  Created by mac on 2025/11/1.
//

import Foundation
import SwiftData

@Model
final class WorkoutRecord: Identifiable, Codable {
    var id: UUID
    var type: String // 运动类型：跑步、骑行、步行等
    var distance: Double // 距离（米）
    var duration: TimeInterval // 持续时间（秒）
    var calories: Double? // 卡路里
    var date: Date // 运动日期
    var source: String // 数据来源：manual, healthkit, keep
    var notes: String? // 备注

    // MARK: - 索引优化 (iOS 17不支持index属性，需��手动优化查询)
    
    init(id: UUID = UUID(), type: String, distance: Double, duration: TimeInterval, calories: Double? = nil, date: Date = Date(), source: String = "manual", notes: String? = nil) {
        self.id = id
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

    // MARK: - Codable
    enum CodingKeys: String, CodingKey {
        case id, type, distance, duration, calories, date, source, notes
    }

    convenience init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let id = try container.decode(UUID.self, forKey: .id)
        let type = try container.decode(String.self, forKey: .type)
        let distance = try container.decode(Double.self, forKey: .distance)
        let duration = try container.decode(TimeInterval.self, forKey: .duration)
        let calories = try container.decodeIfPresent(Double.self, forKey: .calories)
        let date = try container.decode(Date.self, forKey: .date)
        let source = try container.decode(String.self, forKey: .source)
        let notes = try container.decodeIfPresent(String.self, forKey: .notes)
        self.init(id: id, type: type, distance: distance, duration: duration, calories: calories, date: date, source: source, notes: notes)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(type, forKey: .type)
        try container.encode(distance, forKey: .distance)
        try container.encode(duration, forKey: .duration)
        try container.encodeIfPresent(calories, forKey: .calories)
        try container.encode(date, forKey: .date)
        try container.encode(source, forKey: .source)
        try container.encodeIfPresent(notes, forKey: .notes)
    }
}

