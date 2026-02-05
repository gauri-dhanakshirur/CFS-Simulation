#include "sjf.h"

void run_sjf(Process p[], int n) {
    printf("Starting Simulation (SRTF - Preemptive SJF)...\n");
    reset_processes(p, n);
    
    int current_time = 0;
    int completed = 0;
    
    // Gantt tracking
    int last_pid = -1;
    int gantt_start = 0;
    
    while(completed != n) {
        int idx = -1;
        int min_rem = 100000;

        // Find process with shortest remaining time that has arrived
        for(int i=0; i<n; i++) {
            if(p[i].at <= current_time && !p[i].completed) {
                if(p[i].rem_bt < min_rem) {
                    min_rem = p[i].rem_bt;
                    idx = i;
                }
                // Tie-breaker: Arrival time
                else if(p[i].rem_bt == min_rem) {
                    if(p[i].at < p[idx].at) {
                        idx = i;
                    }
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
    print_table(p, n, "SRTF (Preemptive SJF)");
}

