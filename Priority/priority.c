#include "priority.h"

void run_priority(Process p[], int n) {
    printf("Starting Simulation (Preemptive Priority)...\n");
    reset_processes(p, n);

    int current_time = 0;
    int completed = 0;

    while(completed != n) {
        int idx = -1;
        int highest_priority = 10000; // Assuming lower number = higher priority

        for(int i=0; i<n; i++) {
            if(p[i].at <= current_time && !p[i].completed) {
                if(p[i].priority < highest_priority) {
                    highest_priority = p[i].priority;
                    idx = i;
                } else if(p[i].priority == highest_priority) {
                    // Tie-breaker: FCFS
                    if(idx == -1 || p[i].at < p[idx].at) idx = i;
                }
            }
        }

        if(idx != -1) {
            if(!p[idx].started) {
                p[idx].start_time = current_time;
                p[idx].rt = current_time - p[idx].at;
                p[idx].started = true;
            }
            p[idx].rem_bt--;
            current_time++;

            if(p[idx].rem_bt == 0) {
                p[idx].ct = current_time;
                p[idx].tat = p[idx].ct - p[idx].at;
                p[idx].wt = p[idx].tat - p[idx].bt;
                p[idx].completed = true;
                completed++;
            }
        } else {
            current_time++;
        }
    }
    print_table(p, n, "Preemptive Priority");
}