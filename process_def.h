#include <stdbool.h>

typedef struct {
    int pid;
    int arrival_time;
    int burst_time;
    int priority;
    
    // Scheduling variables
    int remaining_time;
    double vruntime;
    double weight;
    
    // Metrics
    int start_time;
    int completion_time;
    int response_time;
    int waiting_time;
    int turnaround_time;
    
    bool is_started;
} Process;