#pragma once
#include "common.h"

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

    printf("\n");
    printf("Average Waiting Time       = %.2f\n", avg_wt);
    printf("Average Turnaround Time    = %.2f\n", avg_tat);
    printf("Average Response Time      = %.2f\n", avg_rt);
    printf("CPU Utilization            = %.2f%%\n", cpu_util);
    printf("Throughput                 = %.2f processes/unit time\n", throughput);
}

void reset_processes(Process p[], int n) {
    for(int i=0; i<n; i++) {
        p[i].rem_bt = p[i].bt;
        p[i].started = false;
        p[i].completed = false;
        p[i].queue_level = 0;
        p[i].vruntime = 0; // Reset for CFS
    }
}
