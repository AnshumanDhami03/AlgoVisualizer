
// src/lib/algorithms/graph/prims.ts
import type { Graph, Edge, Node, GraphAlgorithmStep } from '@/lib/types';

// Basic Priority Queue implementation (min-heap based on edge weight)
// For simplicity, using an array and sorting/finding min.
// A more efficient heap implementation is better for large graphs.
class SimplePriorityQueue {
  elements: { edge: Edge; priority: number }[];

  constructor() {
    this.elements = [];
  }

  enqueue(edge: Edge, priority: number): void {
    // Ensure we don't add duplicates based on edge ID if IDs are unique like "source-target-weight"
    if (!this.elements.some(item => item.edge.id === edge.id)) {
      this.elements.push({ edge, priority });
      // Keep sorted by priority (weight) - Inefficient for large scale
      this.elements.sort((a, b) => a.priority - b.priority);
    }
  }

  dequeue(): Edge | undefined {
    return this.elements.shift()?.edge; // Removes and returns the element with the lowest priority
  }

  isEmpty(): boolean {
    return this.elements.length === 0;
  }

  // Update priority if a lower weight edge to the same target is found
  // Or add if not present. This is inefficient, a real PQ handles this better.
   updateOrAdd(edge: Edge, priority: number): void {
    const existingIndex = this.elements.findIndex(item => {
        // Check if an edge connecting to the same target node already exists in the queue
        // This logic assumes the edge direction in the PQ is always from visited to unvisited
        // Check both directions as the target might be the source in the stored edge
        return item.edge.target === edge.target || item.edge.source === edge.target;
    });


    if (existingIndex > -1) {
        const existingItem = this.elements[existingIndex];
        // Get the node ID from the existing edge that *is not* the source of the *new* edge
        // This identifies the unvisited node connected by the existing PQ edge.
        const existingTargetNodeId = existingItem.edge.source === edge.source ? existingItem.edge.target : existingItem.edge.source;

        // Only update if the new edge connects to the same *unvisited node* with a lower weight
        if (existingTargetNodeId === edge.target && priority < existingItem.priority) {
            this.elements[existingIndex] = { edge, priority };
            this.elements.sort((a, b) => a.priority - b.priority); // Re-sort needed
        } else if (existingTargetNodeId === edge.target) {
            // Exists with same target, but new edge is not cheaper, do nothing.
        } else {
            // Existing edge connects to a *different* unvisited node, add the new edge normally.
            this.enqueue(edge, priority);
        }

    } else {
      // If no edge to the target exists, enqueue the new edge
      this.enqueue(edge, priority);
    }
  }


   // Get current edges in PQ for visualization
   getEdges(): Edge[] {
    return this.elements.map(item => item.edge);
   }

    // Helper to format PQ content for messages
    getPQContents(): string {
        if (this.isEmpty()) return "empty";
        return this.elements.map(e => `(${e.edge.source}-${e.edge.target} w:${e.priority})`).join(', ');
    }
}


/**
 * Prim's algorithm finds a Minimum Spanning Tree (MST) for a weighted undirected graph.
 * It starts from an arbitrary node and grows the tree by adding the cheapest edge
 * connecting a node in the tree to a node outside the tree.
 */
export function getPrimsSteps(graph: Graph, startNodeIdInput: number): GraphAlgorithmStep[] {
  const steps: GraphAlgorithmStep[] = [];
  const mstEdges: Edge[] = [];
  const visited = new Set<number>();
  const edgeQueue = new SimplePriorityQueue(); // Stores edges {targetNode, weight, sourceNode}
  let currentCost = 0;

   // Ensure startNodeId is valid
   let startNodeId = startNodeIdInput;
   if (!graph.nodes.some(n => n.id === startNodeId)) {
     startNodeId = graph.nodes[0]?.id ?? -1; // Use input, fallback to first node, then -1 if no nodes
   }

   if (graph.nodes.length === 0 || startNodeId === -1) {
       steps.push({ graph, mstEdges: [], message: "Graph has no nodes or start node is invalid.", highlightedEdges: [], highlightedNodes: [], startNodeId: undefined });
       return steps;
   }


  // 0. Initial state
  steps.push({
    graph: graph,
    mstEdges: [],
    highlightedNodes: [startNodeId], // Highlight start node from the beginning
    highlightedEdges: [],
    message: `Initial graph. Starting Prim's algorithm from node ${startNodeId}.`,
    startNodeId: startNodeId, // Include startNodeId for persistent highlighting
  });

  // 1. Start with the initial node
  visited.add(startNodeId);
   // Step already included in step 0 effectively

  // Add all edges connected to the start node to the priority queue
  graph.edges.forEach(edge => {
    let neighborNodeId = -1;
    let edgeToAdd = edge; // Use a mutable copy
    if (edge.source === startNodeId && !visited.has(edge.target)) {
        neighborNodeId = edge.target;
        // Ensure edge direction is consistent: source=visited, target=unvisited
        edgeToAdd = { ...edge, source: startNodeId, target: neighborNodeId };
    } else if (edge.target === startNodeId && !visited.has(edge.source)) {
        neighborNodeId = edge.source;
        // Ensure edge representation is consistent: source=visited, target=unvisited
        edgeToAdd = { ...edge, source: startNodeId, target: neighborNodeId };
    }

    if (neighborNodeId !== -1) {
        edgeQueue.enqueue(edgeToAdd, edgeToAdd.weight);
    }
  });

  steps.push({
    graph: graph,
    mstEdges: [],
    highlightedNodes: [startNodeId],
    highlightedEdges: edgeQueue.getEdges().map(e => e.id), // Highlight edges added to PQ
    message: `Added edges from node ${startNodeId} to PQ. PQ: [${edgeQueue.getPQContents()}]`, // Simplified message
    startNodeId: startNodeId,
  });


  // 2. Main loop: While the MST doesn't include all nodes (or PQ is empty)
  while (!edgeQueue.isEmpty() && visited.size < graph.nodes.length) {
    // Get the edge with the minimum weight from the priority queue
    const minEdge = edgeQueue.dequeue();

    if (!minEdge) break; // Should not happen if !isEmpty, but safety check

    // Determine the node that is not yet visited (this should be the target based on our PQ logic)
     // The edge source should be visited, target should be unvisited
     let nextNode = -1;
     if (visited.has(minEdge.source) && !visited.has(minEdge.target)) {
         nextNode = minEdge.target;
     } else if (visited.has(minEdge.target) && !visited.has(minEdge.source)) {
         nextNode = minEdge.source; // Handle case where edge was added in reverse
     }


     steps.push({
      graph: graph,
      mstEdges: [...mstEdges],
      highlightedNodes: [...Array.from(visited), nextNode].filter(id => id !== -1), // Highlight nodes already in MST + potential next node
      highlightedEdges: [...mstEdges.map(e => e.id), minEdge.id], // Highlight MST edges + candidate
      candidateEdge: minEdge,
      message: `Selecting cheapest edge from PQ: ${minEdge.source}-${minEdge.target} (weight ${minEdge.weight}). Considering node ${nextNode}.`, // Simplified
      startNodeId: startNodeId,
    });


    // If the target node is already visited, skip this edge (avoids cycles implicitly)
     if (nextNode === -1 || visited.has(nextNode)) {
         steps.push({
          graph: graph,
          mstEdges: [...mstEdges],
          highlightedNodes: Array.from(visited), // Only highlight visited
          highlightedEdges: mstEdges.map(e => e.id), // Only highlight existing MST edges
           candidateEdge: minEdge, // Show rejected edge
          message: `Node ${nextNode} is already visited. Skipping edge. PQ: [${edgeQueue.getPQContents()}]`, // Simplified
          startNodeId: startNodeId,
        });
      continue;
    }

    // Add the node to visited and the edge to the MST
    visited.add(nextNode);
    // Ensure edge added to MST has consistent direction if needed, though not strictly necessary for cost calculation
    mstEdges.push(minEdge);
    currentCost += minEdge.weight;

     steps.push({
      graph: graph,
      mstEdges: [...mstEdges],
      highlightedNodes: Array.from(visited), // Highlight updated visited set
      highlightedEdges: mstEdges.map(e => e.id), // Highlight updated MST edges
      candidateEdge: minEdge, // Show the edge just added
      message: `Added node ${nextNode} and edge ${minEdge.source}-${minEdge.target} to MST. MST Cost: ${currentCost}.`, // Simplified
      startNodeId: startNodeId,
    });


    // Add/update edges connected to the newly added node 'nextNode' to the priority queue
    // let addedToQueueInfo: string[] = [];
    graph.edges.forEach(edge => {
      let neighborNodeId = -1;
      let edgeToAdd = edge; // Mutable copy

      // Find neighbor NOT in visited set, connected to the newly added node 'nextNode'
      if (edge.source === nextNode && !visited.has(edge.target)) {
          neighborNodeId = edge.target;
          // Ensure edge direction: source = just visited, target = unvisited
          edgeToAdd = { ...edge, source: nextNode, target: neighborNodeId };
      } else if (edge.target === nextNode && !visited.has(edge.source)) {
          neighborNodeId = edge.source;
          // Ensure edge direction: source = just visited, target = unvisited
          edgeToAdd = { ...edge, source: nextNode, target: neighborNodeId };
      }

      if (neighborNodeId !== -1) {
          edgeQueue.updateOrAdd(edgeToAdd, edgeToAdd.weight);
          // Check if it was actually added or updated (updateOrAdd handles logic)
          // For message simplicity, we might just list potential candidates.
          // A more precise message requires checking if updateOrAdd actually modified the PQ.
          // addedToQueueInfo.push(`${edgeToAdd.id}(${edgeToAdd.weight})`);

      }
    });

     steps.push({
      graph: graph,
      mstEdges: [...mstEdges],
      highlightedNodes: Array.from(visited),
      highlightedEdges: [...mstEdges.map(e => e.id), ...edgeQueue.getEdges().map(e=> e.id)], // Highlight MST + PQ edges
      message: `Exploring neighbors of node ${nextNode}. Updated PQ: [${edgeQueue.getPQContents()}]`, // Simplified
       startNodeId: startNodeId,
    });

  }

  // 3. Final MST state
   const finalMessage = visited.size === graph.nodes.length
    ? `Prim's algorithm complete. Final MST Cost: ${currentCost} (${mstEdges.length} edges).` // Simplified
    : `Prim's algorithm complete (graph might be disconnected). Visited ${visited.size}/${graph.nodes.length} nodes. Final MST Cost: ${currentCost} (${mstEdges.length} edges).`; // Simplified


  steps.push({
    graph: graph,
    mstEdges: [...mstEdges],
    highlightedNodes: Array.from(visited), // Highlight final visited nodes
    highlightedEdges: mstEdges.map(e => e.id), // Highlight final MST edges
    message: finalMessage,
    startNodeId: startNodeId,
  });

  return steps;
}

    