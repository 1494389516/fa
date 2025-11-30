//
//  Logger.swift
//  qq
//
//  Created by security fix on 2025/11/29.
//

import Foundation
import os.log

/// 安全的日志记录系统
enum LogLevel: String, CaseIterable {
    case debug = "DEBUG"
    case info = "INFO"
    case warning = "WARNING"
    case error = "ERROR"
    case critical = "CRITICAL"
}

/// 安全日志记录器，避免在生产环境泄露敏感信息
struct AppLogger {
    // 使用系统日志API，仅在Debug模式下输出详细信息
    private static let osLog = OSLog(subsystem: "com.healthapp.qq", category: "Main")

    /// 记录日志（仅在Debug模式下显示详细信息）
    /// - Parameters:
    ///   - message: 日志消息
    ///   - level: 日志级别
    ///   - category: 日志分类（可选）
    static func log(_ message: String, level: LogLevel = .info, category: String = "General") {
        #if DEBUG
        let formattedMessage = "[\(category)] \(message)"

        switch level {
        case .debug:
            print(formattedMessage)
        case .info:
            print(formattedMessage)
        case .warning:
            print("⚠️ \(formattedMessage)")
        case .error:
            print("❌ \(formattedMessage)")
        case .critical:
            print("🚨 CRITICAL: \(formattedMessage)")
        }
        #endif

        // 生产环境只记录错误和关键问题
        if level == .error || level == .critical {
            os_log("%{public}@", log: osLog, type: .error, "[\(level.rawValue)] [\(category)] \(message)")
        }
    }

    /// 记录错误（安全方式，不暴露敏感信息）
    static func logError(_ error: Error, context: String = "") {
        let errorType = String(describing: type(of: error))
        let localizedDescription = error.localizedDescription

        // 不记录敏感的堆栈信息，只记录错误类型和描述
        let safeMessage = context.isEmpty ?
            "Error occurred: \(errorType) - \(localizedDescription)" :
            "Error in \(context): \(errorType) - \(localizedDescription)"

        log(safeMessage, level: .error, category: "Error")
    }

    /// 记录用户操作（用于分析，不包含敏感数据）
    static func logUserAction(_ action: String) {
        log("User action: \(action)", level: .info, category: "Analytics")
    }

    /// 记录性能指标
    static func logPerformance(_ operation: String, duration: TimeInterval) {
        log("Performance: \(operation) took \(String(format: "%.2f", duration))s", level: .debug, category: "Performance")
    }

    /// 记录安全相关事件
    static func logSecurity(_ event: String, severity: LogLevel = .warning) {
        log("Security: \(event)", level: severity, category: "Security")
    }
}

// MARK: - 便捷扩展
extension AppLogger {
    static func debug(_ message: String, category: String = "Debug") {
        log(message, level: .debug, category: category)
    }

    static func info(_ message: String, category: String = "Info") {
        log(message, level: .info, category: category)
    }

    static func warning(_ message: String, category: String = "Warning") {
        log(message, level: .warning, category: category)
    }

    static func error(_ message: String, category: String = "Error") {
        log(message, level: .error, category: category)
    }

    static func critical(_ message: String, category: String = "Critical") {
        log(message, level: .critical, category: category)
    }
}