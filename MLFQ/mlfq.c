#include "mlfq.h"

void run_mlfq(Process p[], int n) {
    printf("Starting Simulation (MLFQ: Q0=RR(2), Q1=FCFS)...\n");
    reset_processes(p, n);
    int tq0 = 2;
    int current_time = 0;
    int completed = 0;
    
    // Gantt tracking
    int last_pid = -1;
    int gantt_start = 0;

    while(completed != n) {
        int idx = -1;
        int queue = -1;

        // 1. Look for process in Q0 (High priority)
        for(int i=0; i<n; i++) {
            if(p[i].at <= current_time && !p[i].completed && p[i].queue_level == 0) {
                idx = i;
                queue = 0;
                break; // Pick first available for RR simulation
            }
        }

        // 2. If Q0 empty, look in Q1
        if(idx == -1) {
            for(int i=0; i<n; i++) {
                if(p[i].at <= current_time && !p[i].completed && p[i].queue_level == 1) {
                    idx = i;
                    queue = 1;
                    break; // FCFS
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

            if(queue == 0) {
                // RR logic
                int exec = 1; // Tick by tick to allow preemption by new Q0 arrivals
                p[idx].rem_bt -= exec;
                current_time += exec;
                
                // If finished
                if(p[idx].rem_bt == 0) {
                    add_gantt_event(p[idx].pid, gantt_start, current_time);
                    last_pid = -1;
                    
                    p[idx].ct = current_time;
                    p[idx].completed = true;
                    completed++;
                } 
                // If used TQ (simple logic: check if executed 2 units in Q0 total)
                // In tick-by-tick, we assume if it didn't finish, we demote it 
                // Logic simplified: if rem_bt > 0 after 2 ticks (conceptually)
                else if ((p[idx].bt - p[idx].rem_bt) % tq0 == 0) {
                    add_gantt_event(p[idx].pid, gantt_start, current_time);
                    last_pid = -1;
                    p[idx].queue_level = 1; // Demote to Q1
                }
            } 
            else {
                // FCFS logic (Q1)
                // Can be preempted by Q0 arrival
                p[idx].rem_bt--;
                current_time++;
                 if(p[idx].rem_bt == 0) {
                    add_gantt_event(p[idx].pid, gantt_start, current_time);
                    last_pid = -1;
                    
                    p[idx].ct = current_time;
                    p[idx].completed = true;
                    completed++;
                }
            }
            
            if(p[idx].completed) {
                p[idx].tat = p[idx].ct - p[idx].at;
                p[idx].wt = p[idx].tat - p[idx].bt;
            }

        } else {
            if(last_pid != -1) {
                add_gantt_event(last_pid, gantt_start, current_time);
                last_pid = -1;
            }
            current_time++;
        }
    }
    print_table(p, n, "MLFQ");
}

