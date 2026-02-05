#include "fcfs.h"

// Standard FCFS (Non-preemptive by definition, but simulates purely on arrival)
void run_fcfs(Process p[], int n) {
    printf("Starting Simulation (FCFS)...\n");
    int current_time = 0;
    int completed = 0;
    reset_processes(p, n);

    // Simple bubble sort by Arrival Time
    for(int i=0; i<n-1; i++) {
        for(int j=0; j<n-i-1; j++) {
            if(p[j].at > p[j+1].at) {
                Process temp = p[j]; p[j] = p[j+1]; p[j+1] = temp;
            }
        }
    }

    for(int i=0; i<n; i++) {
        if(current_time < p[i].at) current_time = p[i].at;
        
        p[i].start_time = current_time;
        p[i].rt = p[i].start_time - p[i].at;
        
        // Log Gantt event - FCFS has solid blocks (no preemption)
        int gantt_start = current_time;
        
        current_time += p[i].bt;
        
        // Log the complete execution block
        add_gantt_event(p[i].pid, gantt_start, current_time);
        
        p[i].ct = current_time;
        p[i].tat = p[i].ct - p[i].at;
        p[i].wt = p[i].tat - p[i].bt;
        p[i].rem_bt = 0;
        p[i].completed = true;
    }
    print_table(p, n, "FCFS Scheduling");
}

