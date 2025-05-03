// src/lib/types.ts

// Basic Graph Structures
export type Node = {
  id: number;
  x: number; // Position for visualization
  y: number; // Position for visualization
};

export type Edge = {
  id: string; // Unique ID, e.g., "source-target-weight" or a generated UUID
  source: number; // Source node ID
  target: number; // Target node ID
  weight: number;
};

export type Graph = {
  nodes: Node[];
  edges: Edge[];
};

// Step definition for Array-based algorithms (Sorting/Searching)
export type ArrayAlgorithmStep = {
  array: number[];
  highlight?: number[]; // Indices to highlight
  pivot?: number; // For Quick Sort
  sortedIndices?: number[]; // Indices considered sorted
  target?: number; // For searching algorithms
  foundIndex?: number; // Index where target is found
  message: string;
};

// Step definition for Graph-based algorithms (MST)
export type GraphAlgorithmStep = {
  graph: Graph; // Includes nodes and all edges
  mstEdges: Edge[]; // Edges currently part of the MST
  highlightedNodes?: number[]; // Node IDs to highlight for this specific step
  highlightedEdges?: string[]; // Edge IDs to highlight (using edge.id)
  candidateEdge?: Edge; // Edge being considered (e.g., in Kruskal's/Prim's)
  message: string;
  dsuState?: { parent: Record<number, number>; rank: Record<number, number> }; // Optional: For visualizing DSU in Kruskal's
  startNodeId?: number; // Optional: To persistently highlight the start node in Prim's
};

// Union type for steps (can be refined if needed)
export type AlgorithmStep = ArrayAlgorithmStep | GraphAlgorithmStep;

// Type guard to check if a step is for a graph algorithm
export function isGraphStep(step: AlgorithmStep): step is GraphAlgorithmStep {
  // Check for graph property and potentially other graph-specific optional properties
  // Check if graph property exists and is an object
  return typeof (step as GraphAlgorithmStep).graph === 'object' && (step as GraphAlgorithmStep).graph !== null;
}


// Type guard to check if a step is for an array algorithm
export function isArrayStep(step: AlgorithmStep): step is ArrayAlgorithmStep {
    // Check if array property exists and is an array
    return Array.isArray((step as ArrayAlgorithmStep).array);
}
