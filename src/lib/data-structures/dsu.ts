// src/lib/data-structures/dsu.ts

/**
 * Disjoint Set Union (DSU) / Union-Find Data Structure
 * Used for Kruskal's algorithm to detect cycles.
 */
export class DSU {
  parent: Record<number, number>;
  rank: Record<number, number>;

  constructor(nodes: number[]) {
    this.parent = {};
    this.rank = {};
    nodes.forEach(nodeId => {
      this.parent[nodeId] = nodeId; // Each node is its own parent initially
      this.rank[nodeId] = 0; // Initial rank is 0
    });
  }

  // Find the representative (root) of the set containing element 'i' with path compression
  find(i: number): number {
    if (this.parent[i] === i) {
      return i;
    }
    // Path compression: Make the found root the direct parent of 'i'
    this.parent[i] = this.find(this.parent[i]);
    return this.parent[i];
  }

  // Union of two sets containing elements 'x' and 'y' using union by rank
  union(x: number, y: number): boolean {
    const rootX = this.find(x);
    const rootY = this.find(y);

    if (rootX !== rootY) { // Only union if they are in different sets
      // Union by rank: Attach the shorter tree to the taller tree
      if (this.rank[rootX] < this.rank[rootY]) {
        this.parent[rootX] = rootY;
      } else if (this.rank[rootX] > this.rank[rootY]) {
        this.parent[rootY] = rootX;
      } else {
        // If ranks are the same, make one the root and increment its rank
        this.parent[rootY] = rootX;
        this.rank[rootX]++;
      }
      return true; // Union was performed
    }
    return false; // Union not performed (already in the same set)
  }

  // Get the current state for visualization purposes
  getState(): { parent: Record<number, number>; rank: Record<number, number> } {
    return {
        parent: { ...this.parent }, // Return copies
        rank: { ...this.rank }
    };
  }
}
