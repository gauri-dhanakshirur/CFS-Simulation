#define _CRT_SECURE_NO_WARNINGS // Signalling windows to allow standar c functions like scanf

#include <stdio.h>
#include <stdlib.h>
#include "common.h"

// Include all algorithm headers
#include "FCFS/fcfs.h"
#include "SJF/sjf.h"
#include "Priority/priority.h"
#include "RR/rr.h"
#include "MLFQ/mlfq.h"
#include "EDF/edf.h"
#include "PropShare/propshare.h"
#include "RMS/rms.h"
#include "CFS/cfs.h"

void export_results_to_json(Process *p, int n, const char *algo_name) {
    // This path goes "up" one level from the build folder to the root
    FILE *fp = fopen("../simulation_output.json", "w"); 
    if (fp == NULL) {
        // Fallback to local directory if root isn't accessible
        fp = fopen("simulation_output.json", "w");
    }

    if (fp != NULL) {
        fprintf(fp, "{\n  \"algorithm\": \"%s\",\n  \"processes\": [\n", algo_name);
        for (int i = 0; i < n; i++) {
            fprintf(fp, "    {\n");
            fprintf(fp, "      \"pid\": %d, \"at\": %d, \"bt\": %d, \"wt\": %d, \"tat\": %d, \"rt\": %d\n",
                    p[i].pid, p[i].at, p[i].bt, p[i].wt, p[i].tat, p[i].rt);
            fprintf(fp, "    }%s\n", (i == n - 1) ? "" : ",");
        }
        fprintf(fp, "  ]\n}");
        fclose(fp);
        printf("\nData exported to simulation_output.json\n");
    }
}

int main(int argc, char *argv[]) {
    // If running via command line arg
    int choice = 0;
    if (argc >= 2) {
        choice = atoi(argv[1]);
    } else {
        printf("Select Algorithm:\n");
        printf("1: FCFS\n2: Priority\n3: SJF (SRTF)\n4: RR\n5: MLFQ\n6: EDF\n7: Prop Share\n8: RMS\n9: CFS\n");
        printf("Enter Choice: ");
        scanf("%d", &choice);
    }

    int n;
    printf("Enter Total Number of Processes: ");
    scanf("%d", &n);

    Process *p = (Process*)malloc(n * sizeof(Process));

    for(int i=0; i<n; i++) {
        p[i].pid = i + 1;
        printf("\nEnter Details for Process %d:\n", p[i].pid);
        printf("PID: %d\n", p[i].pid);
        
        printf("Arrival Time: ");
        scanf("%d", &p[i].at);
        
        printf("Burst Time: ");
        scanf("%d", &p[i].bt);
        
        printf("Priority (0-9): ");
        scanf("%d", &p[i].priority);

        // Init optional fields
        p[i].deadline = 0;
        p[i].period = 0;
        
        if(choice == 6) { // EDF
            printf("Relative Deadline: ");
            scanf("%d", &p[i].deadline);
        }
        if(choice == 8) { // RMS
            printf("Period: ");
            scanf("%d", &p[i].period);
        }
        
        // Initialize common fields
        p[i].rem_bt = p[i].bt;
        p[i].completed = false;
        p[i].started = false;
        p[i].queue_level = 0;
        p[i].vruntime = 0;
    }

    switch(choice) {
        
        case 1: run_fcfs(p, n); break;
        case 2: run_priority(p, n); break;
        case 3: run_sjf(p, n); break;
        case 4: run_rr(p, n); break;
        case 5: run_mlfq(p, n); break;
        case 6: run_edf(p, n); break;
        case 7: run_propshare(p, n); break;
        case 8: run_rms(p, n); break;
        case 9: run_cfs(p, n); break;
        default: printf("Invalid Selection.\n");
        
    }
    char* algo_names[] = {"None", "FCFS", "Priority", "SJF", "RR", "MLFQ", "EDF", "Prop Share", "RMS", "CFS"};
    printf("\nDEBUG: Attempting to save file to simulation_output.json...\n");
    export_results_to_json(p, n, algo_names[choice]);
    printf("DEBUG: File save operation finished.\n");
    free(p);
    return 0;
}