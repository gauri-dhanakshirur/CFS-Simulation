#pragma once
#include "common.h"

// --- Global Log Arrays ---
GanttEvent gantt_log[MAX_GANTT_EVENTS];
int gantt_log_count = 0;

VRuntimeLog vruntime_log[MAX_VRUNTIME_LOGS];
int vruntime_log_count = 0;

// --- Log Management Functions ---
void reset_logs(void) {
    gantt_log_count = 0;
    vruntime_log_count = 0;
}

void add_gantt_event(int pid, int start, int end) {
    if (gantt_log_count < MAX_GANTT_EVENTS) {
        gantt_log[gantt_log_count].pid = pid;
        gantt_log[gantt_log_count].start_time = start;
        gantt_log[gantt_log_count].end_time = end;
        gantt_log_count++;
    }
}

void add_vruntime_log(int real_time, int pid, double vruntime) {
    if (vruntime_log_count < MAX_VRUNTIME_LOGS) {
        vruntime_log[vruntime_log_count].real_time = real_time;
        vruntime_log[vruntime_log_count].pid = pid;
        vruntime_log[vruntime_log_count].vruntime = vruntime;
        vruntime_log_count++;
    }
}

// --- JSON Output Functions ---
void print_gantt_json(void) {
    printf("\n--- GANTT_DATA_START ---\n[");
    for (int i = 0; i < gantt_log_count; i++) {
        printf("{\"pid\":%d,\"start\":%d,\"end\":%d}%s",
               gantt_log[i].pid,
               gantt_log[i].start_time,
               gantt_log[i].end_time,
               (i < gantt_log_count - 1) ? "," : "");
    }
    printf("]\n--- GANTT_DATA_END ---\n");
}

void print_vruntime_json(void) {
    printf("\n--- VRUNTIME_DATA_START ---\n[");
    for (int i = 0; i < vruntime_log_count; i++) {
        printf("{\"time\":%d,\"pid\":%d,\"vruntime\":%.4f}%s",
               vruntime_log[i].real_time,
               vruntime_log[i].pid,
               vruntime_log[i].vruntime,
               (i < vruntime_log_count - 1) ? "," : "");
    }
    printf("]\n--- VRUNTIME_DATA_END ---\n");
}

// --- Jain's Fairness Index Calculation ---
// Formula: J = (Σxᵢ)² / (n × Σxᵢ²)
// where xᵢ is the normalized CPU allocation (actual_time / burst_time)
double calculate_jain_fairness(Process p[], int n) {
    if (n == 0) return 0.0;
    
    double sum = 0.0;
    double sum_sq = 0.0;
    
    for (int i = 0; i < n; i++) {
        // Use turnaround time as allocation metric
        // Normalized by burst time to account for different job sizes
        double allocation = (p[i].bt > 0) ? (double)p[i].bt / (double)p[i].tat : 0.0;
        sum += allocation;
        sum_sq += allocation * allocation;
    }
    
    if (sum_sq == 0.0) return 0.0;
    
    double jain = (sum * sum) / (n * sum_sq);
    return jain;
}

// Exact print format matching your screenshot
void print_table(Process p[], int n, const char* algo_name) {
    float total_wt = 0, total_tat = 0, total_rt = 0;
    int max_ct = 0;
    int min_at = 100000;

    printf("\n--- %s Results ---\n\n", algo_name);
    printf("PID\tAT\tBT\tWT\tTAT\tRT\n"); // Tab separated as per your CFS code

    long total_burst = 0;

    for(int i=0; i<n; i++) {
        total_wt += p[i].wt;
        total_tat += p[i].tat;
        total_rt += p[i].rt;
        total_burst += p[i].bt;

        if(p[i].ct > max_ct) max_ct = p[i].ct;
        if(p[i].at < min_at) min_at = p[i].at;

        printf("%d\t%d\t%d\t%d\t%d\t%d\n", 
            p[i].pid, p[i].at, p[i].bt, p[i].wt, p[i].tat, p[i].rt);
    }

    float avg_wt = total_wt / n;
    float avg_tat = total_tat / n;
    float avg_rt = total_rt / n;
    
    float total_time = max_ct - min_at;
    if(total_time <= 0) total_time = 1;

    // Fixed calculation to match your CFS snippet logic exactly
    float cpu_util = (total_time > 0) ? (((float)total_burst / total_time) * 100.0) : 0.0;
    float throughput = (total_time > 0) ? ((float)n / total_time) : 0.0;

    // Calculate Jain's Fairness Index
    double fairness = calculate_jain_fairness(p, n);

    printf("\n");
    printf("Average Waiting Time       = %.2f\n", avg_wt);
    printf("Average Turnaround Time    = %.2f\n", avg_tat);
    printf("Average Response Time      = %.2f\n", avg_rt);
    printf("CPU Utilization            = %.2f%%\n", cpu_util);
    printf("Throughput                 = %.2f processes/unit time\n", throughput);
    printf("Jain Fairness Index        = %.4f\n", fairness);

    // Print Gantt chart data
    print_gantt_json();
    
    // Print VRuntime data (if any was logged - only for CFS)
    if (vruntime_log_count > 0) {
        print_vruntime_json();
    }
}

void reset_processes(Process p[], int n) {
    for(int i=0; i<n; i++) {
        p[i].rem_bt = p[i].bt;
        p[i].started = false;
        p[i].completed = false;
        p[i].queue_level = 0;
        p[i].vruntime = 0; // Reset for CFS
    }
    reset_logs(); // Also reset the logging arrays
}
