#include <time.h>
#include <stdlib.h> // For rand()
#include "propshare.h"

void run_propshare(Process p[], int n) {
    printf("Starting Simulation (Proportional Share / Lottery)...\n");
    reset_processes(p, n);
    srand(time(NULL));

    int current_time = 0;
    int completed = 0;

    while(completed != n) {
        int total_tickets = 0;
        int active_indices[100];
        int active_count = 0;

        // Sum tickets for ready processes
        for(int i=0; i<n; i++) {
            if(p[i].at <= current_time && !p[i].completed) {
                // Use tickets field instead of priority
                total_tickets += p[i].tickets; 
                active_indices[active_count++] = i;
            }
        }

        if(total_tickets > 0) {
            int ticket = rand() % total_tickets;
            int current_sum = 0;
            int idx = -1;

            // Find winner
            for(int k=0; k<active_count; k++) {
                int i = active_indices[k];
                // Use tickets field
                current_sum += p[i].tickets; 
                if(ticket < current_sum) {
                    idx = i;
                    break;
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
            }
        } else {
            current_time++;
        }
    }
    print_table(p, n, "Proportional Share");
}