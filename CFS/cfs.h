#include "common.h"

#define BASE_WEIGHT 1024

// --- AVL Tree Definitions ---
typedef struct Node {
    Process *process;
    struct Node *left;
    struct Node *right;
    int height;
} Node;

int height(Node *N);

int max_node(int a, int b);

Node* newNode(Process *p);

Node *rightRotate(Node *y);

Node *leftRotate(Node *x);

int getBalance(Node *N);

// Insert based on vruntime
Node* insert(Node* node, Process *p);

Node *minValueNode(Node* node);

Node* deleteNode(Node* root, Process *p);

// --- CFS Simulation Logic ---
void run_cfs(Process p[], int n);
