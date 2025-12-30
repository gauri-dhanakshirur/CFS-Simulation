#pragma once //prevents definition of common.h multiple times

#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>

typedef struct {
    int pid;
    int at;       // Arrival Time
    int bt;       // Burst Time
    int priority; // 0-9
    
    // Real-time specific
    int period;   // For RMS
    int deadline; // For EDF (Relative)
    int abs_deadline;

    // CFS Specific (ADDED)
    double vruntime;
    double weight;

    // Scheduling internal state
    int rem_bt;   // Remaining Burst Time
    int start_time;
    int ct;       // Completion Time
    int wt;       // Waiting Time
    int tat;      // Turnaround Time
    int rt;       // Response Time
    bool started;
    bool completed;
    
    // MLFQ specific
    int queue_level; 
} Process;

void print_table(Process p[], int n, const char* algo_name);

void reset_processes(Process p[], int n);