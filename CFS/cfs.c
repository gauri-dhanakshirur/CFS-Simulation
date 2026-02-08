#include "cfs.h"
#include <stdio.h>
#include <stdlib.h>

// Linux Kernel Priority-to-Weight Mapping (Nice levels -20 to 19 approx)
// We map User Priority 0-9 to indices in this array for simulation
static const int prio_to_weight[] = {
    88761, // Prio 0 (Highest weight)
    29154, 
    9548, 
    3121, 
    1024,  // Prio 4 (Base weight)
    335, 
    110, 
    35, 
    10, 
    2      // Prio 9 (Lowest weight)
};

// --- AVL Tree Helper Functions ---

int height(Node *N) {
    if (N == NULL) return 0;
    return N->height;
}

int max_node(int a, int b) {
    return (a > b) ? a : b;
}

Node* newNode(Process *p) {
    Node* node = (Node*)malloc(sizeof(Node));
    node->process = p;
    node->left = NULL;
    node->right = NULL;
    node->height = 1;
    return node;
}

Node *rightRotate(Node *y) {
    Node *x = y->left;
    Node *T2 = x->right;
    
    x->right = y;
    y->left = T2;
    
    y->height = max_node(height(y->left), height(y->right)) + 1;
    x->height = max_node(height(x->left), height(x->right)) + 1;
    return x;
}

Node *leftRotate(Node *x) {
    Node *y = x->right;
    Node *T2 = y->left;
    
    y->left = x;
    x->right = T2;
    
    x->height = max_node(height(x->left), height(x->right)) + 1;
    y->height = max_node(height(y->left), height(y->right)) + 1;
    return y;
}

int getBalance(Node *N) {
    if (N == NULL) return 0;
    return height(N->left) - height(N->right);
}

Node* insert(Node* node, Process *p) {
    if (node == NULL) return newNode(p);

    // Standard BST Insert based on vruntime
    if (p->vruntime < node->process->vruntime)
        node->left = insert(node->left, p);
    else if (p->vruntime > node->process->vruntime)
        node->right = insert(node->right, p);
    else {
        // Tie-breaker: Use PID to ensure unique nodes
        if (p->pid < node->process->pid)
            node->left = insert(node->left, p);
        else
            node->right = insert(node->right, p);
    }

    // Update Height
    node->height = 1 + max_node(height(node->left), height(node->right));

    // Rebalance Tree
    int balance = getBalance(node);

    // Left Left Case
    if (balance > 1 && p->vruntime < node->left->process->vruntime)
        return rightRotate(node);

    // Right Right Case
    if (balance < -1 && p->vruntime > node->right->process->vruntime)
        return leftRotate(node);

    // Left Right Case
    if (balance > 1 && p->vruntime > node->left->process->vruntime) {
        node->left = leftRotate(node->left);
        return rightRotate(node);
    }

    // Right Left Case
    if (balance < -1 && p->vruntime < node->right->process->vruntime) {
        node->right = rightRotate(node->right);
        return leftRotate(node);
    }

    return node;
}

Node *minValueNode(Node* node) {
    Node* current = node;
    while (current->left != NULL)
        current = current->left;
    return current;
}

Node* deleteNode(Node* root, Process *p) {
    if (root == NULL) return root;

    // Navigate to find the node
    if (p->vruntime < root->process->vruntime)
        root->left = deleteNode(root->left, p);
    else if (p->vruntime > root->process->vruntime)
        root->right = deleteNode(root->right, p);
    else {
        // Vruntime matches, check PID tie-breaker
        if (p->pid != root->process->pid) {
            if (p->pid < root->process->pid)
                root->left = deleteNode(root->left, p);
            else
                root->right = deleteNode(root->right, p);
        } else {
            // Node found
            if ((root->left == NULL) || (root->right == NULL)) {
                Node *temp = root->left ? root->left : root->right;
                if (temp == NULL) {
                    temp = root;
                    root = NULL;
                } else
                    *root = *temp;
                free(temp);
            } else {
                Node* temp = minValueNode(root->right);
                root->process = temp->process;
                root->right = deleteNode(root->right, temp->process);
            }
        }
    }

    if (root == NULL) return root;

    // Update Height and Rebalance
    root->height = 1 + max_node(height(root->left), height(root->right));
    int balance = getBalance(root);

    if (balance > 1 && getBalance(root->left) >= 0)
        return rightRotate(root);
    if (balance > 1 && getBalance(root->left) < 0) {
        root->left = leftRotate(root->left);
        return rightRotate(root);
    }
    if (balance < -1 && getBalance(root->right) <= 0)
        return leftRotate(root);
    if (balance < -1 && getBalance(root->right) > 0) {
        root->right = rightRotate(root->right);
        return leftRotate(root);
    }
    return root;
}

// --- CFS Simulation Logic ---

void run_cfs(Process p[], int n) {
    printf("Starting Simulation (CFS with Red-Black/AVL Tree Logic)...\n");
    reset_processes(p, n);

    // 1. Initialize Weights based on Priority
    for(int i=0; i<n; i++) {
        int safe_prio = p[i].priority;
        if(safe_prio < 0) safe_prio = 0;
        if(safe_prio > 9) safe_prio = 9;
        
        // Assign weight from lookup table
        p[i].weight = prio_to_weight[safe_prio];
        p[i].vruntime = 0;
    }

    Node* root = NULL;
    int current_time = 0;
    int completed_count = 0;
    
    Process* current_process = NULL;
    double current_slice_rem = 0; // Tracks remaining time slice for current process
    double total_weight = 0;      // Sum of weights of all ready processes

    // Gantt tracking variables
    int gantt_start_time = 0;
    int last_pid = -1;

    while (completed_count < n) {
        
        // A. Handle New Arrivals
        for (int i = 0; i < n; i++) {
            if (p[i].at == current_time) {
                // Determine initial vruntime:
                // If tree is empty, vruntime = 0.
                // If tree exists, set to min_vruntime to prevent starving existing tasks.
                if (root != NULL) {
                    Node* minNode = minValueNode(root);
                    if (minNode) p[i].vruntime = minNode->process->vruntime;
                } else if (current_process != NULL) {
                    p[i].vruntime = current_process->vruntime;
                }
                
                root = insert(root, &p[i]);
                total_weight += p[i].weight;
            }
        }

        // B. Select Process if CPU is idle
        if (current_process == NULL && root != NULL) {
            Node* minNode = minValueNode(root);
            current_process = minNode->process;
            root = deleteNode(root, current_process);
            
            // --- TIME SLICE CALCULATION ---
            // Slice = Target_Latency * (Process_Weight / Total_Weight)
            double slice = SCHED_LATENCY * (1.0 * current_process->weight / total_weight);
            if (slice < MIN_GRANULARITY) slice = MIN_GRANULARITY;
            
            current_slice_rem = slice;
            
            // Track new Gantt segment start
            gantt_start_time = current_time;
            last_pid = current_process->pid;
            
            if (!current_process->started) {
                current_process->start_time = current_time;
                current_process->rt = current_time - current_process->at;
                current_process->started = true;
            }
        }

        // C. Execute Current Process
        if (current_process != NULL) {
            // Run for 1 tick
            current_process->rem_bt--;
            current_slice_rem--; 
            
            // Update Virtual Runtime
            // vruntime += delta * (BASE_WEIGHT / weight)
            double delta = 1.0 * (1.0 * BASE_WEIGHT / current_process->weight);
            current_process->vruntime += delta;
            
            // Log vruntime after update
            add_vruntime_log(current_time, current_process->pid, current_process->vruntime);
            
            current_time++;

            // D. Check Status
            if (current_process->rem_bt == 0) {
                // Process Completed
                current_process->ct = current_time;
                current_process->tat = current_process->ct - current_process->at;
                current_process->wt = current_process->tat - current_process->bt;
                current_process->completed = true;
                
                // Log final Gantt event for completed process
                add_gantt_event(current_process->pid, gantt_start_time, current_time);
                last_pid = -1; // Reset so we don't double-log
                
                total_weight -= current_process->weight; // Remove from load
                completed_count++;
                current_process = NULL;
            } 
            else if (current_slice_rem <= 0) {
                // Time Slice Expired: Check for Preemption
                if (root != NULL) {
                    Node* minNode = minValueNode(root);
                    // If the leftmost node has strictly less vruntime, switch.
                    if (minNode->process->vruntime < current_process->vruntime) {
                        // Log Gantt event for the previous run segment before context switch
                        if (last_pid != -1 && gantt_start_time < current_time) {
                            add_gantt_event(last_pid, gantt_start_time, current_time);
                        }
                        
                        root = insert(root, current_process);
                        current_process = NULL; // Trigger selection in next loop
                    } else {
                        // Keep running (renew slice simply by letting loop continue)
                        // In real CFS, we would recalculate slice, here we give it 
                        // MIN_GRANULARITY to avoid infinite loops if weights are weird
                         current_slice_rem = MIN_GRANULARITY;
                    }
                } else {
                    // No one else waiting, keep running
                    current_slice_rem = SCHED_LATENCY;
                }
            }
        } else {
            // CPU is idle
            current_time++;
        }
    }

    print_table(p, n, "CFS (Fair Scheduling)");
}
