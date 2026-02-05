#include "edf.h"

void run_edf(Process p[], int n) {
    printf("Starting Simulation (EDF Preemptive)...\n");
    reset_processes(p, n);
    
    // Calculate Absolute Deadlines (Deadline relative to Arrival)
    for(int i=0; i<n; i++) p[i].abs_deadline = p[i].at + p[i].deadline;

    int current_time = 0;
    int completed = 0;
    
    // Gantt tracking
    int last_pid = -1;
    int gantt_start = 0;

    while(completed != n) {
        int idx = -1;
        int earliest_dl = 100000;

        for(int i=0; i<n; i++) {
            if(p[i].at <= current_time && !p[i].completed) {
                if(p[i].abs_deadline < earliest_dl) {
                    earliest_dl = p[i].abs_deadline;
                    idx = i;
                }
            }
            // Tie-breaker using priority if deadlines are equal
            else if(p[i].abs_deadline == earliest_dl) {
                if (idx != -1 && p[i].priority < p[idx].priority) { // Lower no. = higher priority
                    idx = i;
                }
            }
        }

        if(idx != -1) {
            // Check for context switch
            if(last_pid != p[idx].pid && last_pid != -1) {
                add_gantt_event(last_pid, gantt_start, current_time);
                gantt_start = current_time;
            } else if(last_pid == -1) {
                gantt_start = current_time;
            }
            last_pid = p[idx].pid;
            
            if(!p[idx].started) {
                p[idx].start_time = current_time;
                p[idx].rt = current_time - p[idx].at;
                p[idx].started = true;
            }
            p[idx].rem_bt--;
            current_time++;

            if(p[idx].rem_bt == 0) {
                add_gantt_event(p[idx].pid, gantt_start, current_time);
                last_pid = -1;
                
                p[idx].ct = current_time;
                p[idx].tat = p[idx].ct - p[idx].at;
                p[idx].wt = p[idx].tat - p[idx].bt;
                p[idx].completed = true;
                completed++;
            }
        } else {
            if(last_pid != -1) {
                add_gantt_event(last_pid, gantt_start, current_time);
                last_pid = -1;
            }
            current_time++;
        }
    }
    print_table(p, n, "EDF");
}

