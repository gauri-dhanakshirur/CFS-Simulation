#include <stdio.h>
#include <stdlib.h>
#include "cfs_avl.h"          // Your existing AVL header

#define BASE_WEIGHT 1024

// Priority to Weight Mapping
const int prio_to_weight[] = {88761, 29154, 9548, 3121, 1024, 335, 110, 35, 10, 2};

void print_metrics(Process procs[], int n, int total_time, long total_burst) {
    double total_tat = 0, total_wt = 0, total_rt = 0;
    
    printf("\n--- CFS Scheduling Results ---\n\n");
    // Matching the screenshot column headers: PID, AT, BT, WT, TAT, RT
    printf("PID\tAT\tBT\tWT\tTAT\tRT\n");
    
    for(int i = 0; i < n; i++) {
        total_tat += procs[i].turnaround_time;
        total_wt += procs[i].waiting_time;
        total_rt += procs[i].response_time;
        
        printf("%d\t%d\t%d\t%d\t%d\t%d\n",
            procs[i].pid,
            procs[i].arrival_time,
            procs[i].burst_time,
            procs[i].waiting_time,
            procs[i].turnaround_time,
            procs[i].response_time
        );
    }

    double avg_wt = total_wt / n;
    double avg_tat = total_tat / n;
    double avg_rt = total_rt / n;
    
    // Throughput = Total Processes / Total Time
    double throughput = (total_time > 0) ? ((double)n / total_time) : 0.0;
    
    // CPU Utilization = (Total Burst Time / Total Time) * 100
    double cpu_utilization = (total_time > 0) ? (((double)total_burst / total_time) * 100.0) : 0.0;

    printf("\nAverage Waiting Time       = %.2f\n", avg_wt);
    printf("Average Turnaround Time    = %.2f\n", avg_tat);
    printf("Average Response Time      = %.2f\n", avg_rt);
    printf("CPU Utilization            = %.2f%%\n", cpu_utilization);
    printf("Throughput                 = %.2f processes/unit time\n", throughput);
}

int main() {
    int n;

    // 1. INPUT SECTION
    printf("Enter Total Number of Processes: ");
    if (scanf("%d", &n) != 1 || n <= 0) {
        printf("Invalid number of processes.\n");
        return 1;
    }

    Process* processes = (Process*)malloc(n * sizeof(Process));
    if (processes == NULL) {
        printf("Memory allocation failed.\n");
        return 1;
    }
    long total_burst_time = 0;

    for (int i = 0; i < n; i++) {
        printf("\nEnter Details for Process %d:\n", i + 1);
        
        printf("PID: ");
        scanf("%d", &processes[i].pid);
        
        printf("Arrival Time: ");
        scanf("%d", &processes[i].arrival_time);
        
        printf("Burst Time: ");
        scanf("%d", &processes[i].burst_time);
        
        printf("Priority (0-9): ");
        scanf("%d", &processes[i].priority);

        // Validation / Normalization
        if (processes[i].priority < 0) processes[i].priority = 0;
        if (processes[i].priority > 9) processes[i].priority = 9;

        // Initialize Internal State
        processes[i].remaining_time = processes[i].burst_time;
        processes[i].weight = prio_to_weight[processes[i].priority];
        processes[i].vruntime = 0;
        processes[i].is_started = false;
        
        total_burst_time += processes[i].burst_time;
    }

    // Scheduler Variables
    struct Node* root = NULL; 
    int current_time = 0;
    int completed_count = 0;
    Process* current_process = NULL;
    
    // Optional: Determine start time based on earliest arrival
    // (If user enters AT=100, we shouldn't spin CPU from 0 to 100)
    // For this strict simulation, we assume clock starts at 0 or first arrival.
    // Let's stick to 0 to catch idle time correctly.

    printf("\nStarting Simulation...\n");

    // 2. SIMULATION LOOP
    while (completed_count < n) {
        
        // A. Handle New Arrivals
        for (int i = 0; i < n; i++) {
            if (processes[i].arrival_time == current_time) {
                // Determine initial vruntime (min_vruntime in tree)
                if (root != NULL) {
                    struct Node* minNode = minValueNode(root); // Assumes generic void* or specific Process* return
                    if (minNode) processes[i].vruntime = minNode->process->vruntime;
                }
                root = insert(root, &processes[i]);
            }
        }

        // B. Preemption Check (Discrete Simulation)
        if (current_process != NULL) {
            root = insert(root, current_process);
            current_process = NULL;
        }

        // C. Select Task with Lowest vruntime
        if (root != NULL) {
            struct Node* minNode = minValueNode(root);
            current_process = minNode->process;
            root = deleteNode(root, current_process);

            // Record Response Time (First execution)
            if (!current_process->is_started) {
                current_process->start_time = current_time;
                current_process->response_time = current_time - current_process->arrival_time;
                current_process->is_started = true;
            }
        }

        // D. Execute
        if (current_process != NULL) {
            current_process->remaining_time--;
            
            // vruntime += delta * (BASE / weight)
            double delta = 1.0 * (BASE_WEIGHT / current_process->weight);
            current_process->vruntime += delta;

            current_time++;

            if (current_process->remaining_time == 0) {
                current_process->completion_time = current_time;
                current_process->turnaround_time = current_process->completion_time - current_process->arrival_time;
                current_process->waiting_time = current_process->turnaround_time - current_process->burst_time;
                
                completed_count++;
                current_process = NULL;
            }
        } else {
            // CPU Idle
            current_time++;
        }
    }

    // 3. OUTPUT
    print_metrics(processes, n, current_time, total_burst_time);
    free(processes);

    return 0;
}