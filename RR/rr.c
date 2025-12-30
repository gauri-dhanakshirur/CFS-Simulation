#include "rr.h"

void run_rr(Process p[], int n) {
    int tq = 2; // Time Quantum default
    printf("Starting Simulation (RR, Time Quantum = %d)...\n", tq);
    reset_processes(p, n);

    int current_time = 0;
    int completed = 0;
    
    // Sort roughly by arrival for initial queue logic
    // (Simplification: using a loop to find available processes)
    
    // Check minimal arrival time
    int min_at = p[0].at;
    for(int i=1;i<n;i++) if(p[i].at < min_at) min_at = p[i].at;
    current_time = min_at;

    while(completed != n) {
        bool worked = false;
        
        for(int i=0; i<n; i++) {
            if(p[i].at <= current_time && !p[i].completed) {
                worked = true;
                if(!p[i].started) {
                    p[i].start_time = current_time;
                    p[i].rt = current_time - p[i].at;
                    p[i].started = true;
                }

                int exec_time = (p[i].rem_bt > tq) ? tq : p[i].rem_bt;
                
                // Advance time
                // Note: In real RR, new processes arriving during this time 
                // would enter queue. Here we iterate array which mimics RR 
                // if array is sorted by AT roughly.
                current_time += exec_time;
                p[i].rem_bt -= exec_time;

                if(p[i].rem_bt == 0) {
                    p[i].ct = current_time;
                    p[i].tat = p[i].ct - p[i].at;
                    p[i].wt = p[i].tat - p[i].bt;
                    p[i].completed = true;
                    completed++;
                }
            }
        }
        if(!worked) current_time++;
    }
    print_table(p, n, "Round Robin");
}
