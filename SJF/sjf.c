#include "sjf.h"

void run_sjf(Process p[], int n) {
    printf("Starting Simulation (SRTF - Preemptive SJF)...\n");
    reset_processes(p, n);
    
    int current_time = 0;
    int completed = 0;
    
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
    print_table(p, n, "SRTF (Preemptive SJF)");
}
