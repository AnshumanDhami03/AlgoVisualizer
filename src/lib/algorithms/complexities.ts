// src/lib/algorithms/complexities.ts

export type TimeComplexity = {
    best: string;
    average: string;
    worst: string;
    space?: string; // Optional space complexity
};

export type AlgorithmComplexity = TimeComplexity; // Alias for clarity

export const ALGORITHM_COMPLEXITIES: Record<string, AlgorithmComplexity> = {
    // Sorting
    'bubble-sort': {
        best: 'O(n)',
        average: 'O(n^2)',
        worst: 'O(n^2)',
        space: 'O(1)',
    },
    'selection-sort': {
        best: 'O(n^2)',
        average: 'O(n^2)',
        worst: 'O(n^2)',
        space: 'O(1)',
    },
    'insertion-sort': {
        best: 'O(n)',
        average: 'O(n^2)',
        worst: 'O(n^2)',
        space: 'O(1)',
    },
    'merge-sort': {
        best: 'O(n log n)',
        average: 'O(n log n)',
        worst: 'O(n log n)',
        space: 'O(n)', // Or O(log n) for linked lists/in-place variations, but typically O(n) for array implementation
    },
    'quick-sort': {
        best: 'O(n log n)',
        average: 'O(n log n)',
        worst: 'O(n^2)',
        space: 'O(log n)', // Average case stack space
    },
    // Searching
    'linear-search': {
        best: 'O(1)',
        average: 'O(n)',
        worst: 'O(n)',
        space: 'O(1)',
    },
    'binary-search': {
        best: 'O(1)',
        average: 'O(log n)',
        worst: 'O(log n)',
        space: 'O(1)', // Iterative version
    },
    // Graph (MST) - V = vertices (nodes), E = edges
    'prims-algorithm': {
        best: 'O(E + V log V)', // Using Fibonacci heap or Binary Heap with Adjacency List
        average: 'O(E + V log V)',
        worst: 'O(E log V)', // Binary Heap, dense graph E ~ V^2
        // Worst can also be O(V^2) with Adjacency Matrix or simple PQ
        space: 'O(V + E)', // For graph representation + auxiliary structures (PQ, visited set)
    },
    'kruskals-algorithm': {
        best: 'O(E log E)', // Dominated by edge sorting
        average: 'O(E log E)',
        worst: 'O(E log E)', // Or O(E log V) if E is close to V^2
        space: 'O(V + E)', // For graph representation + DSU structure + sorted edges
    },
};
