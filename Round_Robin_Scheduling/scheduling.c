#include <stdio.h>

#define MAX 20

typedef struct {
    int pid;
    int arrival_time;
    int burst_time;
    int remaining_time;
    int start_time;      // first time the process gets CPU
    int completion_time;
    int waiting_time;
    int turnaround_time;
    int response_time;
    int started;         // flag to check first execution
} Process;

int main() {
    Process p[MAX];
    int n, time_quantum;
    int time = 0;
    int completed = 0;
    int cpu_busy_time = 0;

    float avg_wt = 0, avg_tat = 0, avg_rt = 0;

    printf("Enter number of processes: ");
    scanf("%d", &n);

    printf("Enter Time Quantum: ");
    scanf("%d", &time_quantum);

    printf("\nEnter Arrival Time and Burst Time:\n");
    for (int i = 0; i < n; i++) {
        p[i].pid = i + 1;
        printf("Process %d Arrival Time: ", p[i].pid);
        scanf("%d", &p[i].arrival_time);
        printf("Process %d Burst Time: ", p[i].pid);
        scanf("%d", &p[i].burst_time);

        p[i].remaining_time = p[i].burst_time;
        p[i].started = 0;
    }

    printf("\n--- Round Robin Scheduling ---\n");

    while (completed < n) {
        int done = 1;

        for (int i = 0; i < n; i++) {
            if (p[i].arrival_time <= time && p[i].remaining_time > 0) {
                done = 0;

                if (!p[i].started) {
                    p[i].start_time = time;
                    p[i].response_time = time - p[i].arrival_time;
                    p[i].started = 1;
                }

                int exec_time = (p[i].remaining_time > time_quantum)
                                ? time_quantum
                                : p[i].remaining_time;

                p[i].remaining_time -= exec_time;
                time += exec_time;
                cpu_busy_time += exec_time;

                if (p[i].remaining_time == 0) {
                    p[i].completion_time = time;
                    p[i].turnaround_time =
                        p[i].completion_time - p[i].arrival_time;
                    p[i].waiting_time =
                        p[i].turnaround_time - p[i].burst_time;

                    avg_wt += p[i].waiting_time;
                    avg_tat += p[i].turnaround_time;
                    avg_rt += p[i].response_time;

                    completed++;
                }
            }
        }

        if (done) {
            time++;  // CPU is idle
        }
    }

    avg_wt /= n;
    avg_tat /= n;
    avg_rt /= n;

    float cpu_utilization =
        ((float)cpu_busy_time / time) * 100;

    float throughput =
        (float)n / time;

    printf("\nPID\tAT\tBT\tWT\tTAT\tRT\n");
    for (int i = 0; i < n; i++) {
        printf("%d\t%d\t%d\t%d\t%d\t%d\n",
        p[i].pid,
        p[i].arrival_time,
        p[i].burst_time,
        p[i].waiting_time,
        p[i].turnaround_time,
        p[i].response_time);
    }

    printf("\nAverage Waiting Time     = %.2f", avg_wt);
    printf("\nAverage Turnaround Time  = %.2f", avg_tat);
    printf("\nAverage Response Time    = %.2f", avg_rt);
    printf("\nCPU Utilization          = %.2f%%", cpu_utilization);
    printf("\nThroughput               = %.2f processes/unit time\n", throughput);

    return 0;
}
