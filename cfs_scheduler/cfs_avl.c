#include <stdio.h>
#include <stdlib.h>
#include "cfs_avl.h"

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

// Insert based on vruntime (min vruntime goes left)
// If vruntimes are equal, use PID as tie-breaker to ensure unique nodes
Node* insert(Node* node, Process *p) {
    if (node == NULL) return newNode(p);

    if (p->vruntime < node->process->vruntime)
        node->left = insert(node->left, p);
    else if (p->vruntime > node->process->vruntime)
        node->right = insert(node->right, p);
    else {
        // Vruntime is equal, tie-break with PID
        if (p->pid < node->process->pid)
            node->left = insert(node->left, p);
        else
            node->right = insert(node->right, p);
    }

    node->height = 1 + max_node(height(node->left), height(node->right));
    int balance = getBalance(node);

    // LL Case
    if (balance > 1 && p->vruntime < node->left->process->vruntime)
        return rightRotate(node);

    // RR Case
    if (balance < -1 && p->vruntime > node->right->process->vruntime)
        return leftRotate(node);

    // LR Case
    if (balance > 1 && p->vruntime > node->left->process->vruntime) {
        node->left = leftRotate(node->left);
        return rightRotate(node);
    }

    // RL Case
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

// Delete a node (used when a process is picked to run)
Node* deleteNode(Node* root, Process *p) {
    if (root == NULL) return root;

    // Navigate to find the node
    if (p->vruntime < root->process->vruntime)
        root->left = deleteNode(root->left, p);
    else if (p->vruntime > root->process->vruntime)
        root->right = deleteNode(root->right, p);
    else {
        // vruntime matches, check PID
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