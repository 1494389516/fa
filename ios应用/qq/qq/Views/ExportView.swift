//
//  ExportView.swift
//  qq
//
//  Created by mac on 2025/11/1.
//

import SwiftUI
import SwiftData

struct ExportView: View {
    @Query(sort: \WorkoutRecord.date, order: .reverse) private var workouts: [WorkoutRecord]
    @State private var showShareSheet = false
    @State private var csvData: Data?
    
    var body: some View {
        NavigationView {
            Form {
                Section {
                    Text("导出您的运动数据为CSV格式，可以在Excel或其他表格软件中打开")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Section(header: Text("数据统计")) {
                    HStack {
                        Text("总记录数")
                        Spacer()
                        Text("\(workouts.count) 条")
                            .foregroundColor(.secondary)
                    }
                    
                    HStack {
                        Text("总距离")
                        Spacer()
                        Text(formatDistance(workouts.reduce(0) { $0 + $1.distance }))
                            .foregroundColor(.secondary)
                    }
                    
                    HStack {
                        Text("总时长")
                        Spacer()
                        Text(formatDuration(workouts.reduce(0) { $0 + $1.duration }))
                            .foregroundColor(.secondary)
                    }
                }
                
                Section(header: Text("导出选项")) {
                    Button {
                        exportToCSV()
                    } label: {
                        HStack {
                            Image(systemName: "square.and.arrow.up")
                            Text("导出为CSV文件")
                            Spacer()
                        }
                    }
                    .disabled(workouts.isEmpty)
                    
                    if workouts.isEmpty {
                        Text("暂无数据可导出")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
            .navigationTitle("数据导出")
            .sheet(isPresented: $showShareSheet) {
                if let csvData = csvData {
                    CSVShareSheet(activityItems: [csvData])
                }
            }
        }
    }
    
    private func exportToCSV() {
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
        
        var csvString = "日期,运动类型,距离(米),距离(公里),时长(秒),时长(分:秒),配速,卡路里(千卡),数据来源,备注\n"
        
        for workout in workouts {
            let dateStr = dateFormatter.string(from: workout.date)
            let distanceKm = String(format: "%.2f", workout.distance / 1000)
            let durationMin = Int(workout.duration) / 60
            let durationSec = Int(workout.duration) % 60
            let durationStr = String(format: "%d:%02d", durationMin, durationSec)
            let pace = workout.type == "跑步" ? workout.formattedPace : "--"
            let calories = workout.calories != nil ? String(format: "%.1f", workout.calories!) : ""
            let source = workout.source == "healthkit" ? "苹果健康" : workout.source == "keep" ? "Keep" : "手动"
            let notes = workout.notes ?? ""
            
            csvString += "\(dateStr),\(workout.type),\(Int(workout.distance)),\(distanceKm),\(Int(workout.duration)),\(durationStr),\(pace),\(calories),\(source),\(notes)\n"
        }
        
        csvData = csvString.data(using: .utf8)
        showShareSheet = true
    }
    
    private func formatDistance(_ distance: Double) -> String {
        if distance >= 1000 {
            return String(format: "%.2f km", distance / 1000)
        } else {
            return String(format: "%.0f m", distance)
        }
    }
    
    private func formatDuration(_ duration: TimeInterval) -> String {
        let hours = Int(duration) / 3600
        let minutes = Int(duration) / 60 % 60
        if hours > 0 {
            return String(format: "%d小时%d分钟", hours, minutes)
        } else {
            return String(format: "%d分钟", minutes)
        }
    }
}

struct CSVShareSheet: UIViewControllerRepresentable {
    let activityItems: [Any]
    
    func makeUIViewController(context: Context) -> UIActivityViewController {
        let controller = UIActivityViewController(
            activityItems: activityItems,
            applicationActivities: nil
        )
        return controller
    }
    
    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

#Preview {
    ExportView()
        .modelContainer(for: WorkoutRecord.self, inMemory: true)
}

