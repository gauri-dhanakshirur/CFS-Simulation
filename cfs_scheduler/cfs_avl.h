#include "process_def.h"

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

Node* insert(Node* node, Process *p);

Node *minValueNode(Node* node);

Node* deleteNode(Node* root, Process *p);