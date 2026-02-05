#pragma once //prevents definition of common.h multiple times

#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>

typedef struct {
    int pid;
    int at;       // Arrival Time
    int bt;       // Burst Time
    int priority; // 0-9
    
    int tickets;  // For PropShare

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

typedef struct {
    int timestamp;
    int pid;
    char action[20]; // e.g., "RUNNING", "COMPLETED"
} ExecutionLog;

// --- Gantt Chart Data ---
typedef struct {
    int pid;
    int start_time;
    int end_time;
} GanttEvent;

#define MAX_GANTT_EVENTS 1000
extern GanttEvent gantt_log[MAX_GANTT_EVENTS];
extern int gantt_log_count;

// --- VRuntime Tracking (CFS-specific) ---
typedef struct {
    int real_time;
    int pid;
    double vruntime;
} VRuntimeLog;

#define MAX_VRUNTIME_LOGS 1000
extern VRuntimeLog vruntime_log[MAX_VRUNTIME_LOGS];
extern int vruntime_log_count;

// --- Function Declarations ---
void print_table(Process p[], int n, const char* algo_name);
void reset_processes(Process p[], int n);
void reset_logs(void);
void add_gantt_event(int pid, int start, int end);
void add_vruntime_log(int real_time, int pid, double vruntime);
void print_gantt_json(void);
void print_vruntime_json(void);
double calculate_jain_fairness(Process p[], int n);