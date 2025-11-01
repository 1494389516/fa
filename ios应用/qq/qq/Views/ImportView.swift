//
//  ImportView.swift
//  qq
//
//  Created by mac on 2025/11/1.
//

import SwiftUI
import SwiftData
import UniformTypeIdentifiers
import HealthKit

struct ImportView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @StateObject private var healthKitManager = HealthKitManager()
    @State private var isImportingHealthKit = false
    @State private var importStatus: String = ""
    @State private var showAlert = false
    @State private var alertMessage = ""
    @State private var showFilePicker = false
    
    var body: some View {
        NavigationView {
            List {
                Section {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Image(systemName: "heart.fill")
                                .foregroundColor(.red)
                                .font(.title2)
                            VStack(alignment: .leading) {
                                Text("苹果健康")
                                    .font(.headline)
                                Text("从苹果健康应用导入跑步和步行记录")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                        
                        Button {
                            importFromHealthKit()
                        } label: {
                            HStack {
                                if isImportingHealthKit {
                                    ProgressView()
                                }
                                Text(isImportingHealthKit ? "正在导入..." : "导入数据")
                            }
                            .frame(maxWidth: .infinity)
                        }
                        .disabled(isImportingHealthKit || !healthKitManager.isHealthKitAvailable)
                    }
                    .padding(.vertical, 8)
                }
                
                Section {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Image(systemName: "square.and.arrow.down")
                                .foregroundColor(.blue)
                                .font(.title2)
                            VStack(alignment: .leading) {
                                Text("Keep")
                                    .font(.headline)
                                Text("从Keep应用导出文件导入数据")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                        
                        Button {
                            importFromKeep()
                        } label: {
                            Text("选择文件导入")
                                .frame(maxWidth: .infinity)
                        }
                    }
                    .padding(.vertical, 8)
                }
                
                if !importStatus.isEmpty {
                    Section {
                        Text(importStatus)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
            .navigationTitle("导入数据")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("完成") {
                        dismiss()
                    }
                }
            }
            .alert("导入结果", isPresented: $showAlert) {
                Button("确定", role: .cancel) { }
            } message: {
                Text(alertMessage)
            }
            .fileImporter(
                isPresented: $showFilePicker,
                allowedContentTypes: [.json, .text, .commaSeparatedText],
                allowsMultipleSelection: false
            ) { result in
                handleKeepFileImport(result)
            }
            .onAppear {
                // 初始化时检查HealthKit授权状态
                if healthKitManager.isHealthKitAvailable {
                    let workoutType = HKObjectType.workoutType()
                    let status = healthKitManager.getAuthorizationStatus(for: workoutType)
                    if status == .notDetermined {
                        // 可以提示用户授权
                    }
                }
            }
        }
    }
    
    private func importFromHealthKit() {
        guard healthKitManager.isHealthKitAvailable else {
            alertMessage = "您的设备不支持HealthKit"
            showAlert = true
            return
        }
        
        isImportingHealthKit = true
        importStatus = "正在请求HealthKit权限..."
        
        healthKitManager.requestAuthorization { [self] success, error in
            if success {
                importStatus = "正在从HealthKit读取数据..."
                healthKitManager.fetchRecentRunningWorkouts { [self] records, error in
                    isImportingHealthKit = false
                    
                    if let error = error {
                        alertMessage = "导入失败: \(error.localizedDescription)"
                        showAlert = true
                        importStatus = ""
                        return
                    }
                    
                    guard let records = records, !records.isEmpty else {
                        alertMessage = "未找到可导入的运动记录"
                        showAlert = true
                        importStatus = ""
                        return
                    }
                    
                    // 检查是否已存在，避免重复导入
                    let existingWorkouts = try? modelContext.fetch(FetchDescriptor<WorkoutRecord>())
                    let existingIds = Set(existingWorkouts?.map { $0.id } ?? [])
                    
                    let newRecords = records.filter { !existingIds.contains($0.id) }
                    
                    if newRecords.isEmpty {
                        alertMessage = "所有数据已存在，无需重复导入"
                        showAlert = true
                        importStatus = ""
                        return
                    }
                    
                    // 保存到数据库
                    for record in newRecords {
                        modelContext.insert(record)
                    }
                    
                    do {
                        try modelContext.save()
                        alertMessage = "成功导入 \(newRecords.count) 条运动记录"
                        showAlert = true
                        importStatus = ""
                    } catch {
                        alertMessage = "保存失败: \(error.localizedDescription)"
                        showAlert = true
                        importStatus = ""
                    }
                }
            } else {
                isImportingHealthKit = false
                alertMessage = "授权失败: \(error?.localizedDescription ?? "未知错误")"
                showAlert = true
                importStatus = ""
            }
        }
    }
    
    private func importFromKeep() {
        showFilePicker = true
    }
    
    private func handleKeepFileImport(_ result: Result<[URL], Error>) {
        switch result {
        case .success(let urls):
            guard let url = urls.first else {
                alertMessage = "未选择文件"
                showAlert = true
                return
            }
            
            // 读取文件内容
            if url.startAccessingSecurityScopedResource() {
                defer { url.stopAccessingSecurityScopedResource() }
                
                do {
                    let data = try Data(contentsOf: url)
                    if let jsonString = String(data: data, encoding: .utf8) {
                        parseKeepData(jsonString)
                    } else {
                        alertMessage = "无法读取文件内容"
                        showAlert = true
                    }
                } catch {
                    alertMessage = "读取文件失败: \(error.localizedDescription)"
                    showAlert = true
                }
            } else {
                alertMessage = "无法访问文件"
                showAlert = true
            }
            
        case .failure(let error):
            alertMessage = "选择文件失败: \(error.localizedDescription)"
            showAlert = true
        }
    }
    
    private func parseKeepData(_ jsonString: String) {
        // 解析Keep数据格式
        // Keep通常导出为JSON格式，包含运动记录
        // 这里提供一个基础的解析框架，实际格式可能需要调整
        
        guard let data = jsonString.data(using: .utf8),
              let jsonObject = try? JSONSerialization.jsonObject(with: data) else {
            alertMessage = "文件格式不正确"
            showAlert = true
            return
        }
        
        var importedCount = 0
        
        // 尝试解析不同的可能格式
        if let json = jsonObject as? [String: Any] {
            // 字典格式
            if let records = json["records"] as? [[String: Any]] {
                for record in records {
                    if let workout = parseKeepRecord(record) {
                        modelContext.insert(workout)
                        importedCount += 1
                    }
                }
            } else if let workouts = json["workouts"] as? [[String: Any]] {
                for workout in workouts {
                    if let record = parseKeepRecord(workout) {
                        modelContext.insert(record)
                        importedCount += 1
                    }
                }
            } else if let data = json["data"] as? [[String: Any]] {
                for item in data {
                    if let record = parseKeepRecord(item) {
                        modelContext.insert(record)
                        importedCount += 1
                    }
                }
            }
        } else if let array = jsonObject as? [[String: Any]] {
            // 直接数组格式
            for item in array {
                if let record = parseKeepRecord(item) {
                    modelContext.insert(record)
                    importedCount += 1
                }
            }
        }
        
        if importedCount > 0 {
            do {
                try modelContext.save()
                alertMessage = "成功导入 \(importedCount) 条Keep运动记录"
                showAlert = true
            } catch {
                alertMessage = "保存失败: \(error.localizedDescription)"
                showAlert = true
            }
        } else {
            alertMessage = "未能解析出有效的运动记录，请检查文件格式"
            showAlert = true
        }
    }
    
    private func parseKeepRecord(_ record: [String: Any]) -> WorkoutRecord? {
        // 解析单个Keep记录
        // 根据Keep的实际数据格式调整字段名
        
        guard let type = record["type"] as? String ?? record["sportType"] as? String,
              let distance = record["distance"] as? Double ?? (record["distance"] as? NSNumber)?.doubleValue,
              let duration = record["duration"] as? Double ?? record["time"] as? Double ?? (record["duration"] as? NSNumber)?.doubleValue else {
            return nil
        }
        
        let calories = record["calories"] as? Double ?? (record["calories"] as? NSNumber)?.doubleValue
        let dateString = record["date"] as? String ?? record["startTime"] as? String
        
        let date: Date
        if let dateString = dateString {
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
            date = formatter.date(from: dateString) ?? Date()
        } else {
            date = Date()
        }
        
        // 转换Keep的运动类型
        let workoutType: String
        if type.contains("跑步") || type.contains("run") || type.contains("running") {
            workoutType = "跑步"
        } else if type.contains("步行") || type.contains("walk") || type.contains("walking") {
            workoutType = "步行"
        } else {
            workoutType = type
        }
        
        return WorkoutRecord(
            type: workoutType,
            distance: distance * 1000, // 假设Keep使用公里，转换为米
            duration: duration,
            calories: calories,
            date: date,
            source: "keep"
        )
    }
}

