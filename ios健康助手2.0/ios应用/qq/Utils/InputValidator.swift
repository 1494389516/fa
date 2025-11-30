//
//  InputValidator.swift
//  qq
//
//  Created by security fix on 2025/11/29.
//

import Foundation

/// 输入验证工具类，确保用户输入的安��性和有效性
struct InputValidator {

    // MARK: - 通用验证

    /// 验证字符串不为空且有效
    static func validateNonEmpty(_ value: String, fieldName: String) throws {
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            throw AppError.validationError("\(fieldName)不能为空")
        }

        // 检查是否包含恶意字符
        guard !containsMaliciousCharacters(trimmed) else {
            throw AppError.validationError("\(fieldName)包含非法字符")
        }
    }

    /// 验证数值范围
    static func validateRange<T: Comparable>(_ value: T, min: T, max: T, fieldName: String) throws {
        guard value >= min && value <= max else {
            throw AppError.outOfRange(fieldName, min: "\(min)", max: "\(max)")
        }
    }

    // MARK: - 健康数据验证

    /// 验证体重输入
    static func validateWeight(_ weightStr: String) throws -> Double {
        try validateNonEmpty(weightStr, fieldName: "体重")

        guard let weight = Double(weightStr) else {
            throw AppError.validationError("请输入有效的体重数值")
        }

        try validateRange(weight, min: 10.0, max: 500.0, fieldName: "体重")

        return weight
    }

    /// 验证心率输入
    static func validateHeartRate(_ heartRateStr: String) throws -> Int {
        try validateNonEmpty(heartRateStr, fieldName: "心率")

        guard let heartRate = Int(heartRateStr) else {
            throw AppError.validationError("请输入有效的心率数值")
        }

        try validateRange(heartRate, min: 30, max: 250, fieldName: "心率")

        return heartRate
    }

    /// 验证血压输入
    static func validateBloodPressure(systolic: String, diastolic: String) throws -> (systolic: Int, diastolic: Int) {
        guard !systolic.isEmpty || !diastolic.isEmpty else {
            throw AppError.validationError("请至少输入收缩压或舒张压")
        }

        let sysValue: Int
        if !systolic.isEmpty {
            guard let sys = Int(systolic) else {
                throw AppError.validationError("请输入有效的收缩压")
            }
            try validateRange(sys, min: 60, max: 300, fieldName: "收缩压")
            sysValue = sys
        } else {
            sysValue = 0
        }

        let diaValue: Int
        if !diastolic.isEmpty {
            guard let dia = Int(diastolic) else {
                throw AppError.validationError("请输入有效的舒张压")
            }
            try validateRange(dia, min: 40, max: 200, fieldName: "舒张压")
            diaValue = dia
        } else {
            diaValue = 0
        }

        // 验证收缩压应该大于舒张压
        if sysValue > 0 && diaValue > 0 && sysValue <= diaValue {
            throw AppError.validationError("收缩压应大于舒张压")
        }

        return (sysValue, diaValue)
    }

    /// 验证睡眠时长
    static func validateSleepHours(_ sleepStr: String) throws -> Double {
        if sleepStr.isEmpty {
            throw AppError.validationError("请输入睡眠时长")
        }

        guard let sleep = Double(sleepStr) else {
            throw AppError.validationError("请输入有效的睡眠时长")
        }

        try validateRange(sleep, min: 0.0, max: 24.0, fieldName: "睡眠时长")

        return sleep
    }

    /// 验证饮水量
    static func validateWaterIntake(_ waterStr: String) throws -> Double {
        if waterStr.isEmpty {
            throw AppError.validationError("请输入饮水量")
        }

        guard let water = Double(waterStr) else {
            throw AppError.validationError("请输入有效的饮水量")
        }

        try validateRange(water, min: 0.0, max: 10.0, fieldName: "饮水量")

        return water
    }

    /// 验证运动距离
    static func validateDistance(_ distanceStr: String) throws -> Double {
        try validateNonEmpty(distanceStr, fieldName: "距离")

        guard let distance = Double(distanceStr) else {
            throw AppError.validationError("请输入有效的距离数值")
        }

        try validateRange(distance, min: 0.0, max: 50000.0, fieldName: "距离") // 支持最长50km（马拉松）

        return distance
    }

    /// 验证运动时长
    static func validateDuration(_ duration: TimeInterval) throws {
        guard duration > 0 else {
            throw AppError.validationError("运动时长必须大于0")
        }

        try validateRange(duration, min: 1.0, max: 24 * 60 * 60, fieldName: "运动时长") // 最大24小时
    }

    /// 验证运动卡路里
    static func validateCalories(_ caloriesStr: String) throws -> Int {
        try validateNonEmpty(caloriesStr, fieldName: "卡路里")

        guard let calories = Int(caloriesStr) else {
            throw AppError.validationError("请输入有效的卡路里数值")
        }

        try validateRange(calories, min: 1, max: 10000, fieldName: "卡路里")

        return calories
    }

    // MARK: - 目标数据验证

    /// 验证目标值
    static func validateGoal(_ targetStr: String, unit: String, min: Double = 0.1, max: Double = 10000.0) throws -> Double {
        try validateNonEmpty(targetStr, fieldName: "目标值")

        guard let target = Double(targetStr) else {
            throw AppError.validationError("请输入有效的目标值")
        }

        try validateRange(target, min: min, max: max, fieldName: "目标\(unit)")

        return target
    }

    /// 验证目标日期
    static func validateGoalDate(_ date: Date) throws {
        let now = Date()
        guard date > now else {
            throw AppError.validationError("目标日期必须在今天之后")
        }

        // 检查日期是否过于遥远（比如超过10年）
        let calendar = Calendar.current
        guard let maxDate = calendar.date(byAdding: .year, value: 10, to: now), date <= maxDate else {
            throw AppError.validationError("目标日期过于遥远")
        }
    }

    // MARK: - 安全检查

    /// 检查是否包含恶意字符
    private static func containsMaliciousCharacters(_ text: String) -> Bool {
        let maliciousPatterns = [
            "<script", "</script>", // XSS
            "javascript:", // 协议注入
            "data:", // 数据URI
            "vbscript:", // VBScript
            "../", "..\\", // 路径遍历
            "SELECT", "INSERT", "UPDATE", "DELETE", "DROP", // SQL注入关键词
            "UNION", "OR", "AND", // SQL运算符
        ]

        let uppercased = text.uppercased()
        return maliciousPatterns.contains { uppercased.contains($0) }
    }

    /// 验证用户名称
    static func validateUserName(_ name: String) throws {
        try validateNonEmpty(name, fieldName: "用户名")

        // 长度限制
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.count >= 2 && trimmed.count <= 50 else {
            throw AppError.validationError("用户名长度必须在2-50个字符之间")
        }

        // 检查是否只包含允许的字符
        let allowedCharacters = CharacterSet.alphanumerics
            .union(CharacterSet.whitespaces)
            .union(CharacterSet(charactersIn: "-_"))

        guard trimmed.rangeOfCharacter(from: allowedCharacters.inverted) == nil else {
            throw AppError.validationError("用户名只能包含字母、数字、空格、下划线和连字符")
        }
    }

    /// 验证备注文本
    static func validateNotes(_ notes: String) throws -> String {
        let trimmed = notes.trimmingCharacters(in: .whitespacesAndNewlines)

        // 如果为空则返回空字符串
        guard !trimmed.isEmpty else {
            return ""
        }

        // 长度限制（最多1000个字符）
        guard trimmed.count <= 1000 else {
            throw AppError.validationError("备注长度不能超过1000个字符")
        }

        // 检查恶意内容
        guard !containsMaliciousCharacters(trimmed) else {
            throw AppError.validationError("备注包含非法字符")
        }

        return trimmed
    }

    // MARK: - 批量验证

    /// 验证结果
    enum ValidationResult {
        case success
        case errors([AppError])
    }

    /// 批量验证
    static func validateAll(_ validations: [(String) throws -> Void]) -> ValidationResult {
        var errors: [AppError] = []

        for validation in validations {
            do {
                try validation("")
            } catch let error as AppError {
                errors.append(error)
            } catch {
                errors.append(.unknownError(error.localizedDescription))
            }
        }

        return errors.isEmpty ? .success : .errors(errors)
    }
}