//
//  ThemeManager.swift
//  qq
//
//  Created by mac on 2025/11/30.
//

import SwiftUI
import Combine

class ThemeManager: ObservableObject {
    @Published var currentTheme: AppTheme = .blue {
        didSet {
            UserDefaults.standard.set(currentTheme.rawValue, forKey: "selectedTheme")
            // 更新所有窗口的外观
            updateAllWindowsAppearance()
        }
    }

    @Published var isDarkMode: Bool = false {
        didSet {
            UserDefaults.standard.set(isDarkMode, forKey: "isDarkMode")
            updateAllWindowsAppearance()
        }
    }

    init() {
        // 加载保存的主题
        if let savedTheme = UserDefaults.standard.string(forKey: "selectedTheme"),
           let theme = AppTheme(rawValue: savedTheme) {
            self.currentTheme = theme
        }

        // 加载保存的颜色方案
        self.isDarkMode = UserDefaults.standard.bool(forKey: "isDarkMode")
    }

    private func updateAllWindowsAppearance() {
        // 通知所有窗口更新主题
        DispatchQueue.main.async {
            NotificationCenter.default.post(name: .themeDidChange, object: self)
        }
    }
}

// MARK: - 主题枚举
enum AppTheme: String, CaseIterable, Identifiable {
    case blue = "blue"
    case green = "green"
    case orange = "orange"
    case purple = "purple"
    case pink = "pink"
    case red = "red"
    case indigo = "indigo"
    case teal = "teal"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .blue: return "蓝色"
        case .green: return "绿色"
        case .orange: return "橙色"
        case .purple: return "紫色"
        case .pink: return "粉色"
        case .red: return "红色"
        case .indigo: return "靛蓝"
        case .teal: return "青色"
        }
    }

    // 主色调
    var primary: Color {
        switch self {
        case .blue: return Color(red: 0.0, green: 0.48, blue: 1.0)
        case .green: return Color(red: 0.0, green: 0.78, blue: 0.34)
        case .orange: return Color(red: 1.0, green: 0.58, blue: 0.0)
        case .purple: return Color(red: 0.68, green: 0.32, blue: 0.87)
        case .pink: return Color(red: 1.0, green: 0.41, blue: 0.71)
        case .red: return Color(red: 1.0, green: 0.23, blue: 0.19)
        case .indigo: return Color(red: 0.35, green: 0.34, blue: 0.84)
        case .teal: return Color(red: 0.0, green: 0.59, blue: 0.59)
        }
    }

    // 次要色调
    var secondary: Color {
        return primary.opacity(0.7)
    }

    // 浅色调
    var light: Color {
        return primary.opacity(0.15)
    }

    // 渐变色
    var gradient: LinearGradient {
        LinearGradient(
            colors: [primary, secondary],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    // 卡片背景
    var cardBackground: Color {
        return Color(UIColor.systemBackground)
    }

    // 文字颜色
    var textPrimary: Color {
        return Color.primary
    }

    var textSecondary: Color {
        return Color.secondary
    }
}

// MARK: - 主题扩展
extension View {
    func themedBackground(_ theme: AppTheme) -> some View {
        self.background(
            LinearGradient(
                colors: [theme.light, Color.clear],
                startPoint: .top,
                endPoint: .bottom
            )
        )
    }

    func themedButtonStyle(_ theme: AppTheme) -> some View {
        self.foregroundColor(theme.primary)
    }
}

// MARK: - 通知扩展
extension Notification.Name {
    static let themeDidChange = Notification.Name("themeDidChange")
}