//
//  AppError.swift
//  qq
//
//  Created by security fix on 2025/11/29.
//

import Foundation

/// 应用程序统一错误类型
enum AppError: LocalizedError, Equatable {
    // 数据相关错误
    case dataCorruption(String? = nil)
    case dataNotFound
    case saveFailed
    case loadFailed(String? = nil)
    case invalidData(String)

    // 验证错误
    case validationError(String)
    case invalidInput(String)
    case outOfRange(String, min: String, max: String)

    // 网络相关错误
    case networkError
    case serverError(Int)
    case timeout
    case noInternetConnection

    // 权限错误
    case permissionDenied(String)
    case healthKitAccessDenied
    case notificationsDenied

    // 系统错误
    case unknownError(String? = nil)
    case systemError(String)
    case configurationError(String)

    // 业务逻辑错误
    case workoutInProgress
    case goalAlreadyExists(String)
    case invalidGoalRange

    public var errorDescription: String? {
        switch self {
        // 数据相关
        case .dataCorruption(let detail):
            return detail != nil ? "数据已损坏：\(detail!)" : "数据已损坏，请重试"
        case .dataNotFound:
            return "未找到相关数据"
        case .saveFailed:
            return "保存失败，请重试"
        case .loadFailed(let detail):
            return detail != nil ? "加载数据失败：\(detail!)" : "加载数据失败"
        case .invalidData(let detail):
            return "数据格式错误：\(detail)"

        // 验证错误
        case .validationError(let message):
            return "验证失败：\(message)"
        case .invalidInput(let field):
            return "请输入有效的\(field)"
        case .outOfRange(let field, let min, let max):
            return "\(field)必须在\(min)到\(max)之间"

        // 网络相关
        case .networkError:
            return "网络连接失败，请检查网络设置"
        case .serverError(let code):
            return "服务器错误（\(code)），请稍后重试"
        case .timeout:
            return "请求超时，请重试"
        case .noInternetConnection:
            return "无网络连接"

        // 权限错误
        case .permissionDenied(let permission):
            return "需要\(permission)权限"
        case .healthKitAccessDenied:
            return "需要健康数据访问权限，请在设置中允许"
        case .notificationsDenied:
            return "需要通知权限，请在设置中允许"

        // 系统错误
        case .unknownError(let detail):
            return detail != nil ? "未知错误：\(detail!)" : "发生未知错误"
        case .systemError(let message):
            return "系统错误：\(message)"
        case .configurationError(let message):
            return "配置错误：\(message)"

        // 业务逻辑错误
        case .workoutInProgress:
            return "当前有正在进行的运动"
        case .goalAlreadyExists(let goal):
            return "目标\(goal)已存在"
        case .invalidGoalRange:
            return "目标范围无效"
        }
    }

    public var failureReason: String? {
        return errorDescription
    }

    public var recoverySuggestion: String? {
        switch self {
        case .dataCorruption, .saveFailed, .loadFailed:
            return "请重启应用或重新安装"
        case .networkError, .serverError, .timeout:
            return "请检查网络连接后重试"
        case .permissionDenied, .healthKitAccessDenied, .notificationsDenied:
            return "请在设置中允许相关权限"
        case .validationError, .invalidInput:
            return "请检查输入内容"
        default:
            return "请稍后重试"
        }
    }

    // 用于错误上报的代码
    var errorCode: String {
        switch self {
        case .dataCorruption: return "DATA_001"
        case .dataNotFound: return "DATA_002"
        case .saveFailed: return "DATA_003"
        case .loadFailed: return "DATA_004"
        case .validationError: return "VAL_001"
        case .invalidInput: return "VAL_002"
        case .networkError: return "NET_001"
        case .serverError: return "SRV_001"
        case .permissionDenied: return "PERM_001"
        case .healthKitAccessDenied: return "PERM_002"
        case .unknownError: return "SYS_000"
        default: return "OTHER"
        }
    }
}

// MARK: - 错误处理器协议
protocol ErrorHandler {
    func handle(_ error: AppError)
}

// MARK: - 默认错误处理器
class DefaultErrorHandler: ErrorHandler {
    func handle(_ error: AppError) {
        // 记录错误
        AppLogger.error(error.errorDescription ?? "Unknown error occurred")

        // 在实际应用中，这里可以显示错误提示给用户
        DispatchQueue.main.async {
            // 可以实现通用的错误提示视图
        }
    }
}

// MARK: - 扩展：将普通错误转换为AppError
extension Error {
    func toAppError() -> AppError {
        if let appError = self as? AppError {
            return appError
        }

        if self is DecodingError {
            return .dataCorruption("数据解析失败")
        }

        if let urlError = self as? URLError {
            switch urlError.code {
            case .notConnectedToInternet:
                return .noInternetConnection
            case .timedOut:
                return .timeout
            default:
                return .networkError
            }
        }

        return .unknownError(self.localizedDescription)
    }
}