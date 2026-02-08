#ifndef CFS_H
#define CFS_H

#include "common.h"

// Constants for CFS Logic
#define BASE_WEIGHT 1024
#define SCHED_LATENCY 6      // Target Latency (e.g., 6ms/ticks)
#define MIN_GRANULARITY 1    // Minimum time a task must run

// --- AVL Tree Definitions ---
typedef struct Node {
    Process *process;
    struct Node *left;
    struct Node *right;
    int height;
} Node;

// Tree Management Functions
int height(Node *N);
int max_node(int a, int b);
Node* newNode(Process *p);
Node *rightRotate(Node *y);
Node *leftRotate(Node *x);
int getBalance(Node *N);

// Core CFS Operations
Node* insert(Node* node, Process *p);
Node *minValueNode(Node* node);
Node* deleteNode(Node* root, Process *p);

// Simulation Entry Point
void run_cfs(Process p[], int n);

#endif
