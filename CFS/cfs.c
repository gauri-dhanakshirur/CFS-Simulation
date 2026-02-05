#include "cfs.h"

#define BASE_WEIGHT 1024

// Priority to Weight Mapping
static const int prio_to_weight[] = {88761, 29154, 9548, 3121, 1024, 335, 110, 35, 10, 2};

// --- AVL Tree Definitions ---
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

// Insert based on vruntime
Node* insert(Node* node, Process *p) {
    if (node == NULL) return newNode(p);

    if (p->vruntime < node->process->vruntime)
        node->left = insert(node->left, p);
    else if (p->vruntime > node->process->vruntime)
        node->right = insert(node->right, p);
    else {
        // Tie-break with PID
        if (p->pid < node->process->pid)
            node->left = insert(node->left, p);
        else
            node->right = insert(node->right, p);
    }

    node->height = 1 + max_node(height(node->left), height(node->right));
    int balance = getBalance(node);

    if (balance > 1 && p->vruntime < node->left->process->vruntime)
        return rightRotate(node);

    if (balance < -1 && p->vruntime > node->right->process->vruntime)
        return leftRotate(node);

    if (balance > 1 && p->vruntime > node->left->process->vruntime) {
        node->left = leftRotate(node->left);
        return rightRotate(node);
    }

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

    if (p->vruntime < root->process->vruntime)
        root->left = deleteNode(root->left, p);
    else if (p->vruntime > root->process->vruntime)
        root->right = deleteNode(root->right, p);
    else {
        if (p->pid != root->process->pid) {
            if (p->pid < root->process->pid)
                root->left = deleteNode(root->left, p);
            else
                root->right = deleteNode(root->right, p);
        } else {
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
    printf("Starting Simulation (CFS Red-Black/AVL Tree)...\n");
    reset_processes(p, n);

    // Initialize Weights
    for(int i=0; i<n; i++) {
        // Clamp priority to array bounds 0-9
        int safe_prio = p[i].priority;
        if(safe_prio < 0) safe_prio = 0;
        if(safe_prio > 9) safe_prio = 9;
        p[i].weight = prio_to_weight[safe_prio];
        p[i].vruntime = 0;
    }

    Node* root = NULL;
    int current_time = 0;
    int completed_count = 0;
    Process* current_process = NULL;
    
    // Gantt tracking variables
    int gantt_start_time = 0;
    int last_pid = -1;

    // Simulation Loop (Adapted from your logic)
    while (completed_count < n) {
        
        // A. Handle New Arrivals
        for (int i = 0; i < n; i++) {
            if (p[i].at == current_time) {
                if (root != NULL) {
                    Node* minNode = minValueNode(root);
                    if (minNode) p[i].vruntime = minNode->process->vruntime;
                }
                root = insert(root, &p[i]);
            }
        }

        // B. Preemption Check - Log Gantt event if context switch happens
        if (current_process != NULL) {
            // Log the Gantt event for the previous run segment
            if (last_pid != -1 && gantt_start_time < current_time) {
                add_gantt_event(last_pid, gantt_start_time, current_time);
            }
            
            root = insert(root, current_process);
            current_process = NULL;
        }

        // C. Select Task
        if (root != NULL) {
            Node* minNode = minValueNode(root);
            current_process = minNode->process;
            root = deleteNode(root, current_process);
            
            // Track new Gantt segment start
            gantt_start_time = current_time;
            last_pid = current_process->pid;

            if (!current_process->started) {
                current_process->start_time = current_time;
                current_process->rt = current_time - current_process->at; // rt
                current_process->started = true;
            }
        }

        // D. Execute
        if (current_process != NULL) {
            current_process->rem_bt--; // Decrement remaining time
            
            double delta = 1.0 * (BASE_WEIGHT / current_process->weight);
            current_process->vruntime += delta;
            
            // Log vruntime after update
            add_vruntime_log(current_time, current_process->pid, current_process->vruntime);

            current_time++;

            if (current_process->rem_bt == 0) {
                current_process->ct = current_time;
                current_process->tat = current_process->ct - current_process->at;
                current_process->wt = current_process->tat - current_process->bt;
                current_process->completed = true;
                
                // Log final Gantt event for completed process
                add_gantt_event(current_process->pid, gantt_start_time, current_time);
                last_pid = -1; // Reset so we don't double-log
                
                completed_count++;
                current_process = NULL; // Don't re-insert
            }
        } else {
            current_time++;
        }
    }

    print_table(p, n, "CFS Scheduling");
}

