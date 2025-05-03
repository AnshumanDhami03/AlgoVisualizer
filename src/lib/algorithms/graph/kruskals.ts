
// src/lib/algorithms/graph/kruskals.ts
'use client'; // If using DSU inside, might need client context depending on usage

import type { Graph, Edge, Node, GraphAlgorithmStep } from '@/lib/types';
import { DSU } from '@/lib/data-structures/dsu';

/**
 * Kruskal's algorithm finds a Minimum Spanning Tree (MST) for a weighted undirected graph.
 * It sorts all the edges by weight and iteratively adds the smallest edge that doesn't form a cycle.
 */
export function getKruskalsSteps(graph: Graph): GraphAlgorithmStep[] {
  const steps: GraphAlgorithmStep[] = [];
  const mstEdges: Edge[] = [];
  let currentCost = 0;

  // 0. Initial state
  steps.push({
    graph: graph,
    mstEdges: [],
    highlightedNodes: [],
    highlightedEdges: [],
    message: "Initial graph.",
    dsuState: undefined, // DSU not initialized yet
  });

  // 1. Sort edges by weight in ascending order
  const sortedEdges = [...graph.edges].sort((a, b) => a.weight - b.weight);

   steps.push({
    graph: graph,
    mstEdges: [],
    highlightedNodes: [],
    highlightedEdges: sortedEdges.map(e => e.id), // Highlight all edges being sorted
    message: `Sorting all ${sortedEdges.length} edges by weight (ascending).`, // Simplified message
    dsuState: undefined,
  });


  // 2. Initialize Disjoint Set Union (DSU) structure
  const nodeIds = graph.nodes.map(node => node.id);
  const dsu = new DSU(nodeIds);

   steps.push({
    graph: graph,
    mstEdges: [],
    highlightedNodes: nodeIds, // Highlight all nodes for DSU init
    highlightedEdges: [],
    message: "Initializing Disjoint Set Union (DSU). Each node is its own set.", // Simplified message
    dsuState: dsu.getState(),
  });


  // 3. Iterate through sorted edges
  for (const edge of sortedEdges) {
    steps.push({
      graph: graph,
      mstEdges: [...mstEdges],
      highlightedNodes: [edge.source, edge.target],
      highlightedEdges: [edge.id],
      candidateEdge: edge,
      message: `Considering edge between node ${edge.source} and node ${edge.target} (weight ${edge.weight}).`, // Simplified
      dsuState: dsu.getState(),
    });

    // Check if adding the edge forms a cycle using DSU
    const rootSource = dsu.find(edge.source);
    const rootTarget = dsu.find(edge.target);

     steps.push({
      graph: graph,
      mstEdges: [...mstEdges],
      highlightedNodes: [edge.source, edge.target], // Keep highlighting nodes
      highlightedEdges: [edge.id], // Keep highlighting edge
      candidateEdge: edge,
      message: `Checking connectivity: Node ${edge.source} (root: ${rootSource}), Node ${edge.target} (root: ${rootTarget}).`, // Simplified
      dsuState: dsu.getState(), // Show DSU state before union attempt
    });


    if (rootSource !== rootTarget) {
      // If not connected, add the edge to the MST and perform union
      mstEdges.push(edge);
      currentCost += edge.weight;
      dsu.union(edge.source, edge.target);

      steps.push({
        graph: graph,
        mstEdges: [...mstEdges],
        highlightedNodes: [edge.source, edge.target],
        highlightedEdges: mstEdges.map(e => e.id), // Highlight all MST edges + current edge
        candidateEdge: edge,
        message: `Nodes ${edge.source} & ${edge.target} not connected. Added edge to MST. Merging sets. MST Cost: ${currentCost}.`, // Simplified
        dsuState: dsu.getState(), // Show DSU state after union
      });
    } else {
      // If connected, adding the edge would form a cycle, so skip it
      steps.push({
        graph: graph,
        mstEdges: [...mstEdges],
        highlightedNodes: [edge.source, edge.target],
        highlightedEdges: mstEdges.map(e => e.id), // Highlight only existing MST edges
        candidateEdge: edge, // Still show the candidate edge, but faded/rejected
        message: `Nodes ${edge.source} & ${edge.target} already connected (root ${rootSource}). Skipping edge to avoid cycle.`, // Simplified
        dsuState: dsu.getState(),
      });
    }
  }

  // 4. Final MST state
  steps.push({
    graph: graph,
    mstEdges: [...mstEdges],
    highlightedNodes: [],
    highlightedEdges: mstEdges.map(e => e.id),
    message: `Kruskal's algorithm complete. Final MST Cost: ${currentCost} (${mstEdges.length} edges).`, // Simplified
    dsuState: dsu.getState(),
  });

  return steps;
}

    