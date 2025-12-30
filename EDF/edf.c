#include "edf.h"

void run_edf(Process p[], int n) {
    printf("Starting Simulation (EDF Preemptive)...\n");
    reset_processes(p, n);
    
    // Calculate Absolute Deadlines (Deadline relative to Arrival)
    for(int i=0; i<n; i++) p[i].abs_deadline = p[i].at + p[i].deadline;

    int current_time = 0;
    int completed = 0;

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
    print_table(p, n, "EDF");
}
