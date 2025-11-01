//
//  ContentView.swift
//  qq
//
//  Created by mac on 2025/11/1.
//

import SwiftUI
import SwiftData

struct ContentView: View {
    @State private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            WorkoutListView()
                .tabItem {
                    Label("记录", systemImage: "list.bullet")
                }
                .tag(0)
            
            StatisticsView()
                .tabItem {
                    Label("统计", systemImage: "chart.bar")
                }
                .tag(1)
            
            GoalsView()
                .tabItem {
                    Label("目标", systemImage: "target")
                }
                .tag(2)
            
            ExportView()
                .tabItem {
                    Label("导出", systemImage: "square.and.arrow.up")
                }
                .tag(3)
        }
    }
}

#Preview {
    ContentView()
        .modelContainer(for: WorkoutRecord.self, inMemory: true)
}




