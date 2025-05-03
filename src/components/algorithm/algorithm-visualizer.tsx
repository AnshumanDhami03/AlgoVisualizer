
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Play, Pause, RotateCcw, Shuffle as ShuffleIcon, Search as SearchIcon, Share2 as GraphIcon, Target } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { AlgorithmStep, ArrayAlgorithmStep, GraphAlgorithmStep, Graph, Node, Edge } from '@/lib/types'; // Import types
import { isGraphStep, isArrayStep } from '@/lib/types'; // Import type guards
import GraphEditor from './graph-editor'; // Import the new GraphEditor component

// Array Algorithm Implementations
import { getBubbleSortSteps } from "@/lib/algorithms/sorting/bubbleSort";
import { getSelectionSortSteps } from "@/lib/algorithms/sorting/selectionSort";
import { getInsertionSortSteps } from "@/lib/algorithms/sorting/insertionSort";
import { getMergeSortSteps } from "@/lib/algorithms/sorting/mergeSort";
import { getQuickSortSteps } from "@/lib/algorithms/sorting/quickSort";
import { getLinearSearchSteps } from "@/lib/algorithms/searching/linearSearch";
import { getBinarySearchSteps } from "@/lib/algorithms/searching/binarySearch";

// Graph Algorithm Implementations
import { getPrimsSteps } from "@/lib/algorithms/graph/prims";
import { getKruskalsSteps } from "@/lib/algorithms/graph/kruskals";


interface AlgorithmVisualizerProps {
  algorithmId: string;
  category: 'sort' | 'search' | 'graph'; // Add 'graph' category
}

// Constants for Array Algorithms
const MAX_ARRAY_SIZE = 50;
const MIN_ARRAY_SIZE = 5;
const DEFAULT_ARRAY_SIZE = 15;

// Constants for Visualization
const MIN_SPEED = 50; // ms
const MAX_SPEED = 1000; // ms
const DEFAULT_SPEED = 300; // ms

// Constants for Graph Visualization
const NODE_RADIUS = 22; // Slightly larger node radius for better visibility of ID
const EDGE_WIDTH = 2;
const MST_EDGE_WIDTH = 4;
const START_NODE_COLOR = "hsl(var(--accent))"; // Color for the start node in Prim's (Orange)
const PIVOT_COLOR = "#E91E63"; // Pinkish color for pivot (consider theme integration if needed)
const TARGET_POTENTIAL_COLOR = "#FFC107"; // Yellowish for potential target

// Algorithm Function Mapping
const ALGORITHM_MAP: Record<string, Record<string, Function>> = {
    sort: {
        'bubble-sort': getBubbleSortSteps,
        'selection-sort': getSelectionSortSteps,
        'insertion-sort': getInsertionSortSteps,
        'merge-sort': getMergeSortSteps,
        'quick-sort': getQuickSortSteps,
    },
    search: {
        'linear-search': getLinearSearchSteps,
        'binary-search': getBinarySearchSteps,
    },
     graph: {
        'prims-algorithm': getPrimsSteps,
        'kruskals-algorithm': getKruskalsSteps,
    },
};

// Helper to generate a simpler, more spaced-out random graph
const generateRandomGraph = (numNodes = 5, edgeProbability = 0.4): Graph => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const canvasWidth = 700; // Keep canvas size reasonable
    const canvasHeight = 350;
    const padding = 100; // Significantly increased padding to spread nodes more
    const minNodeDistance = NODE_RADIUS * 4; // Minimum distance between node centers

    // Generate node positions somewhat spread out, avoiding overlaps
    for (let i = 0; i < numNodes; i++) {
        let x, y, tooClose;
        let attempts = 0;
        const maxAttempts = 50; // Prevent infinite loops
        do {
            tooClose = false;
            x = Math.random() * (canvasWidth - 2 * padding) + padding;
            y = Math.random() * (canvasHeight - 2 * padding) + padding;
            // Check distance from existing nodes
            for (const existingNode of nodes) {
                const distSq = (x - existingNode.x) ** 2 + (y - existingNode.y) ** 2;
                if (distSq < minNodeDistance ** 2) {
                    tooClose = true;
                    break;
                }
            }
            attempts++;
        } while (tooClose && attempts < maxAttempts);

        // If we couldn't find a good spot after many attempts, place it randomly anyway
        nodes.push({ id: i, x, y });
    }

    // Generate edges
    const edgeSet = new Set<string>(); // Avoid duplicate edges (e.g., 0-1 and 1-0)
    for (let i = 0; i < numNodes; i++) {
        for (let j = i + 1; j < numNodes; j++) {
            if (Math.random() < edgeProbability) {
                const weight = Math.floor(Math.random() * 20) + 1; // Weight between 1 and 20
                // Ensure unique ID format, avoiding potential collisions with other structures
                const edgeId = `edge-${i}-${j}-${weight}`;
                const reverseEdgeIdCheck = `edge-${j}-${i}`; // Check base connection without weight

                 // Check if an edge between i and j already exists (ignoring weight in the check for simplicity)
                 let exists = false;
                 edgeSet.forEach(id => {
                    if (id.startsWith(`edge-${i}-${j}-`) || id.startsWith(`edge-${j}-${i}-`)) {
                        exists = true;
                    }
                 });


                 if (!exists) {
                     edges.push({ id: edgeId, source: i, target: j, weight });
                     edgeSet.add(edgeId); // Add the specific weighted edge ID
                 }
            }
        }
    }

     // Ensure graph is connected (simple approach: add edges if needed)
    if (nodes.length > 1 && edges.length < nodes.length - 1) {
        // Check connectivity using a simple visited set approach
        const adj: Map<number, number[]> = new Map();
        edges.forEach(edge => {
            if (!adj.has(edge.source)) adj.set(edge.source, []);
            if (!adj.has(edge.target)) adj.set(edge.target, []);
            adj.get(edge.source)!.push(edge.target);
            adj.get(edge.target)!.push(edge.source);
        });

         let componentRoots: number[] = [];
         const visitedOverall = new Set<number>();

         for(const startNode of nodes) {
             if(visitedOverall.has(startNode.id)) continue;

             componentRoots.push(startNode.id); // Found a new component
             const componentVisited = new Set<number>();
             const queue = [startNode.id];
             componentVisited.add(startNode.id);
             visitedOverall.add(startNode.id);

             while(queue.length > 0) {
                 const u = queue.shift()!;
                 const neighbors = adj.get(u) || [];
                 neighbors.forEach(v => {
                     if (!componentVisited.has(v)) {
                         componentVisited.add(v);
                         visitedOverall.add(v);
                         queue.push(v);
                     }
                 });
             }
         }


        // If more than one component root was found, connect them
        if (componentRoots.length > 1) {
             for (let i = 0; i < componentRoots.length - 1; i++) {
                 const nodeA = componentRoots[i];
                 const nodeB = componentRoots[i+1];
                 const weight = Math.floor(Math.random() * 15) + 5; // Weight for connecting edges
                 const edgeId = `connect-${nodeA}-${nodeB}-${weight}`;

                 // Double check edge doesn't exist before adding
                  let exists = false;
                  edgeSet.forEach(id => {
                     if (id.startsWith(`edge-${nodeA}-${nodeB}-`) || id.startsWith(`edge-${nodeB}-${nodeA}-`) || id.startsWith(`connect-${nodeA}-${nodeB}-`) || id.startsWith(`connect-${nodeB}-${nodeA}-`)) {
                         exists = true;
                     }
                  });

                 if (!exists) {
                     edges.push({ id: edgeId, source: nodeA, target: nodeB, weight });
                     edgeSet.add(edgeId);
                 }
             }
        }
    }

    return { nodes, edges };
};


export default function AlgorithmVisualizer({ algorithmId, category }: AlgorithmVisualizerProps) {
  // State for Array Algorithms
  const [array, setArray] = useState<number[]>([]);
  const [inputValue, setInputValue] = useState<string>("");
  const [targetValue, setTargetValue] = useState<string>(""); // For search

  // State for Graph Algorithms
  const [graph, setGraph] = useState<Graph>(generateRandomGraph()); // Initialize with a default graph
  const [startNode, setStartNode] = useState<number | null>(null); // For Prim's start node


  // Common State
  const [steps, setSteps] = useState<AlgorithmStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(DEFAULT_SPEED);
  const [isGenerated, setIsGenerated] = useState<boolean>(true); // Track if data is default or user-provided
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeoutId = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // --- Initialization and Reset ---

  const generateRandomArray = useCallback((size: number = DEFAULT_ARRAY_SIZE) => {
    const newArray = Array.from({ length: size }, () => Math.floor(Math.random() * 100) + 1);
    setArray(newArray);
    setInputValue(newArray.join(", "));
    resetVisualization();
    setIsGenerated(true);
  }, []); // Removed resetVisualization from dependencies to avoid loops

   const initializeGraph = useCallback((newGraph?: Graph) => {
        const graphToUse = newGraph || generateRandomGraph();
        setGraph(graphToUse);
        // Automatically select the first node as the default start node if available
        setStartNode(graphToUse.nodes.length > 0 ? graphToUse.nodes[0].id : null);
        resetVisualization();
        setIsGenerated(!newGraph); // Mark as generated only if no specific graph was provided
    }, []); // Removed resetVisualization from dependencies

  // Initialize based on category when component mounts or category/algorithm changes
  useEffect(() => {
     resetVisualization(); // Reset visualization state first
    if (category === 'sort' || category === 'search') {
      generateRandomArray();
    } else if (category === 'graph') {
      initializeGraph(); // Generate a random graph and set default start node
    }
     // Cleanup timeouts/intervals on unmount or change
    return () => {
      if (timeoutId.current) clearTimeout(timeoutId.current);
    };
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [algorithmId, category]); // Dependencies: algorithmId, category

   // Update default start node if graph changes and has nodes
   useEffect(() => {
       if (category === 'graph' && graph.nodes.length > 0 && startNode === null) {
           setStartNode(graph.nodes[0].id);
       }
        if (category === 'graph' && graph.nodes.length > 0 && startNode !== null && !graph.nodes.some(n => n.id === startNode)) {
             // If current start node doesn't exist anymore, reset to first node
             setStartNode(graph.nodes[0].id);
         }
       if (category === 'graph' && graph.nodes.length === 0) {
           setStartNode(null); // Clear start node if graph becomes empty
       }
   }, [graph, category, startNode]); // Depend on graph and category

  // --- Input Parsing ---

  const parseArrayInput = (input: string): number[] | null => {
    try {
      const parsedArray = input
        .split(",")
        .map((s) => s.trim())
        .filter(s => s !== '')
        .map((s) => {
          const num = parseInt(s, 10);
          if (isNaN(num)) throw new Error(`Invalid number: "${s}"`);
          if (num < 1 || num > 100) throw new Error(`Number out of range (1-100): ${num}`);
          return num;
        });
      if (parsedArray.length < MIN_ARRAY_SIZE || parsedArray.length > MAX_ARRAY_SIZE) {
        throw new Error(`Array size must be between ${MIN_ARRAY_SIZE} and ${MAX_ARRAY_SIZE}.`);
      }
      return parsedArray;
    } catch (error: any) {
      toast({ title: "Invalid Input", description: error.message, variant: "destructive" });
      return null;
    }
  };

  const parseTargetInput = (input: string): number | null => {
    try {
      const num = parseInt(input, 10);
      if (isNaN(num)) throw new Error(`Invalid target number: "${input}"`);
      if (num < 1 || num > 100) throw new Error(`Target must be between 1 and 100.`);
      return num;
    } catch (error: any) {
      toast({ title: "Invalid Target", description: error.message, variant: "destructive" });
      return null;
    }
  };

  // --- Input Handling ---

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(event.target.value);
      setIsGenerated(false); // Mark as user input
  };

  const handleTargetChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTargetValue(event.target.value);
  };

  const handleGraphChange = (newGraph: Graph) => {
      setGraph(newGraph);
      // Reset visualization when graph is manually edited
      resetVisualization();
      setIsGenerated(false);
      // Ensure start node is still valid, or reset if not
        if (startNode !== null && !newGraph.nodes.some(n => n.id === startNode)) {
            setStartNode(newGraph.nodes.length > 0 ? newGraph.nodes[0].id : null);
        } else if (newGraph.nodes.length > 0 && startNode === null) {
            setStartNode(newGraph.nodes[0].id);
        }
  };


  const handleSetArrayData = () => {
        resetVisualization(); // Reset steps/playing state
        const parsedArray = parseArrayInput(inputValue);
        if (parsedArray) {
            if (algorithmId === 'binary-search' && category === 'search') {
                parsedArray.sort((a, b) => a - b);
                setInputValue(parsedArray.join(", "));
                toast({ title: "Array Sorted", description: "Binary Search requires a sorted array." });
            }
            setArray(parsedArray);
        }
    };

   const handleStartNodeChange = (value: string) => {
       const nodeId = parseInt(value, 10);
       if (!isNaN(nodeId) && graph.nodes.some(n => n.id === nodeId)) {
           setStartNode(nodeId);
           resetVisualization(); // Reset if start node changes, as steps depend on it
       }
   };

  // --- Visualization Logic ---

  const resetVisualization = useCallback(() => {
    setIsPlaying(false);
    setSteps([]);
    setCurrentStepIndex(0);
    if (timeoutId.current) clearTimeout(timeoutId.current);
    timeoutId.current = null;
     // Immediately draw the current state after reset
      requestAnimationFrame(() => { // Ensure canvas context is ready
        if (category === 'graph') {
           drawGraph(graph, [], [], [], undefined, algorithmId === 'prims-algorithm' ? startNode ?? undefined : undefined); // Draw initial graph state with potential start node highlight
        } else {
           drawArray(array); // Draw initial array state
        }
      });
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, array, graph, startNode, algorithmId]); // Depend on graph, category, startNode and algorithmId


 const startVisualization = () => {
    const algorithmFunction = ALGORITHM_MAP[category]?.[algorithmId];
    if (!algorithmFunction) {
        toast({ title: "Error", description: "Algorithm not found.", variant: "destructive" });
        return;
    }

    resetVisualization(); // Ensure clean state before starting

    let newSteps: AlgorithmStep[] = [];

    try {
        if (category === 'sort') {
            if (array.length === 0) throw new Error("Please provide an array.");
            newSteps = algorithmFunction([...array]);
        } else if (category === 'search') {
            if (array.length === 0) throw new Error("Please provide an array.");
            const targetNum = parseTargetInput(targetValue);
            if (targetNum === null) return; // Error handled in parseTargetInput

            let currentArray = [...array];
            if (algorithmId === 'binary-search') {
                // Only sort if not already sorted by the user (check against original input string if possible)
                const isSorted = currentArray.every((val, i, arr) => !i || val >= arr[i - 1]);
                 if(!isSorted){
                    currentArray.sort((a, b) => a - b);
                    toast({ title: "Array Sorted", description: "Input array sorted for Binary Search." });
                    setArray(currentArray); // Update state if sorted
                    setInputValue(currentArray.join(", ")); // Update input display
                 }
            }
            newSteps = algorithmFunction(currentArray, targetNum);
        } else if (category === 'graph') {
            if (!graph || graph.nodes.length === 0) throw new Error("Please provide a valid graph.");
            if (algorithmId === 'prims-algorithm') {
                if (startNode === null) {
                    // Automatically select the first node if none is selected
                    const defaultStartNode = graph.nodes[0]?.id ?? null;
                    if (defaultStartNode === null) {
                        throw new Error("Graph has no nodes to start Prim's algorithm from.");
                    }
                    setStartNode(defaultStartNode); // Set state
                    toast({title: "Start Node Selected", description: `Using node ${defaultStartNode} as start node for Prim's.`});
                    newSteps = algorithmFunction(graph, defaultStartNode); // Use default start node
                } else {
                     newSteps = algorithmFunction(graph, startNode); // Pass user-selected start node to Prim's
                }
            } else {
                // Kruskal's doesn't need a start node
                 newSteps = algorithmFunction(graph);
            }

        }

        if (newSteps.length > 0) {
            setSteps(newSteps);
            setCurrentStepIndex(0);
            setIsPlaying(true);
            // Draw the first step immediately after setting state
             requestAnimationFrame(() => {
                const firstStep = newSteps[0];
                 if (isGraphStep(firstStep)) {
                    drawGraph(firstStep.graph, firstStep.mstEdges, firstStep.highlightedNodes, firstStep.highlightedEdges, firstStep.candidateEdge, firstStep.startNodeId);
                 } else if (isArrayStep(firstStep)) {
                    drawArray(firstStep.array, firstStep.highlight, firstStep.pivot, firstStep.sortedIndices, firstStep.target, firstStep.foundIndex);
                 }
             });

        } else {
             toast({ title: "No Steps", description: "Algorithm generated 0 steps. Check input or algorithm.", variant: "default"});
             // Draw initial state if no steps are generated
             resetVisualization();
        }
    } catch (error: any) {
        toast({ title: "Visualization Error", description: error.message || "Could not start visualization.", variant: "destructive" });
         resetVisualization(); // Reset on error
    }
};


  // --- Drawing Functions ---

  const drawArray = useCallback((
        currentArrayState: number[],
        highlight: number[] = [],
        pivot?: number,
        sortedIndices: number[] = [],
        target?: number,
        foundIndex?: number
        ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    const n = currentArrayState.length;
    if (n === 0) return;

    const spacing = 5;
    const totalSpacing = (n + 1) * spacing;
    const availableWidth = width - totalSpacing;
    const barWidth = Math.max(1, availableWidth / n); // Ensure barWidth is at least 1
    const maxVal = Math.max(...currentArrayState, 1);

    // Get computed styles for theme colors
    const computedStyle = getComputedStyle(document.documentElement);
    const primaryColor = computedStyle.getPropertyValue('--primary').trim();
    const secondaryColor = computedStyle.getPropertyValue('--secondary').trim();
    const accentColor = computedStyle.getPropertyValue('--accent').trim();
    const foregroundColor = computedStyle.getPropertyValue('--foreground').trim();

    currentArrayState.forEach((value, index) => {
      const barHeight = Math.max(1, (value / maxVal) * (height * 0.85)); // Ensure barHeight is at least 1
      const x = spacing + index * (barWidth + spacing);
      const y = height - barHeight - 20; // Leave space at bottom for numbers

      // Determine bar color using theme variables
      if (foundIndex === index) ctx.fillStyle = `hsl(${accentColor})`; // Found item (accent)
      else if (target === value && category === 'search' && !sortedIndices.includes(index)) ctx.fillStyle = TARGET_POTENTIAL_COLOR; // Potential target (Yellowish)
      else if (sortedIndices.includes(index)) ctx.fillStyle = `hsl(${secondaryColor})`; // Sorted (secondary)
      else if (highlight.includes(index)) ctx.fillStyle = `hsl(${accentColor})`; // Highlighted (accent)
       else if (pivot === index) ctx.fillStyle = PIVOT_COLOR; // Pivot (Pink) - Use defined constant
      else ctx.fillStyle = `hsl(${primaryColor})`; // Default (primary)

      ctx.fillRect(x, y, barWidth, barHeight);

       // Draw number below bar if space allows
      if (barWidth > 15) {
          ctx.fillStyle = `hsl(${foregroundColor})`; // Use foreground color
          ctx.textAlign = "center";
          ctx.font = "12px Arial";
          ctx.fillText(value.toString(), x + barWidth / 2, height - 5);
      }
    });
  }, [category]); // Include category as dependency


  const drawGraph = useCallback((
        graphData: Graph,
        mstEdges: Edge[] = [],
        highlightedNodes: number[] = [],
        highlightedEdges: string[] = [],
        candidateEdge?: Edge,
        persistentStartNodeId?: number // Add parameter for persistent start node highlight
    ) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { width, height } = canvas;
        ctx.clearRect(0, 0, width, height);

        // Get computed styles for theme colors
        const computedStyle = getComputedStyle(document.documentElement);
        const primaryColor = computedStyle.getPropertyValue('--primary').trim();
        const primaryFgColor = computedStyle.getPropertyValue('--primary-foreground').trim();
        const secondaryColor = computedStyle.getPropertyValue('--secondary').trim();
        const accentColor = computedStyle.getPropertyValue('--accent').trim();
        const accentFgColor = computedStyle.getPropertyValue('--accent-foreground').trim();
        const destructiveColor = computedStyle.getPropertyValue('--destructive').trim();
        const mutedColor = computedStyle.getPropertyValue('--muted').trim();
        const mutedFgColor = computedStyle.getPropertyValue('--muted-foreground').trim();
        const backgroundColor = computedStyle.getPropertyValue('--background').trim(); // For text backgrounds
        const foregroundColor = computedStyle.getPropertyValue('--foreground').trim(); // Default text

        const nodeMap = new Map(graphData.nodes.map(node => [node.id, node]));
        const mstEdgeIds = new Set(mstEdges.map(edge => edge.id));
        const highlightedEdgeIds = new Set(highlightedEdges);
        const highlightedNodeIds = new Set(highlightedNodes); // Step-specific highlights


        // --- Draw Edges ---
        graphData.edges.forEach(edge => {
            const sourceNode = nodeMap.get(edge.source);
            const targetNode = nodeMap.get(edge.target);
            if (!sourceNode || !targetNode) return;

            ctx.beginPath();
            ctx.moveTo(sourceNode.x, sourceNode.y);
            ctx.lineTo(targetNode.x, targetNode.y);

            // Styling
            let edgeColor = `hsl(${mutedFgColor})`; // Default: muted-foreground
            let edgeAlpha = 0.5; // Default fade for non-MST edges
            let edgeWidth = EDGE_WIDTH;
            let lineDash: number[] = [];

             if (mstEdgeIds.has(edge.id)) {
                edgeColor = `hsl(${secondaryColor})`; // MST Edge color (Teal)
                edgeWidth = MST_EDGE_WIDTH;
                edgeAlpha = 1.0;
            } else if (candidateEdge && edge.id === candidateEdge.id) {
                 // Check if candidate was accepted (is in mstEdges) or rejected/considering
                 if (mstEdgeIds.has(candidateEdge.id)) {
                     // Already handled by the MST edge style
                 } else {
                     // Rejected or still considering candidate
                     edgeColor = `hsl(${destructiveColor})`; // Rejected/Considering Candidate Edge (Reddish)
                     edgeWidth = EDGE_WIDTH * 1.5; // Slightly thicker
                     lineDash = [5, 5]; // Dashed line
                     edgeAlpha = 0.8;
                 }
            } else if (highlightedEdgeIds.has(edge.id)) {
                 edgeColor = `hsl(${primaryColor})`; // Highlighted edge (Purple)
                 edgeWidth = EDGE_WIDTH * 1.2;
                 edgeAlpha = 0.9;
            }
             // else: Keep default edgeColor, edgeWidth, edgeAlpha

            ctx.strokeStyle = edgeColor;
            ctx.lineWidth = edgeWidth;
            ctx.globalAlpha = edgeAlpha;
            ctx.setLineDash(lineDash);
            ctx.stroke();
            ctx.setLineDash([]); // Reset line dash
             ctx.globalAlpha = 1.0; // Reset alpha for text

            // Draw edge weight
            const midX = (sourceNode.x + targetNode.x) / 2;
            const midY = (sourceNode.y + targetNode.y) / 2;
            ctx.font = 'bold 12px Arial'; // Slightly larger weight font
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            const angle = Math.atan2(targetNode.y - sourceNode.y, targetNode.x - sourceNode.x);
            // Increase offset significantly for better separation from line/nodes
            const offsetX = Math.sin(angle) * 15;
            const offsetY = -Math.cos(angle) * 15;
            const text = edge.weight.toString();
            const textWidth = ctx.measureText(text).width;

            // Add a background for readability using theme background
            ctx.fillStyle = `hsl(${backgroundColor})`; // Use background for text box
            ctx.globalAlpha = 0.9; // Slightly less transparent background
             // Adjust background rectangle size and position based on font size
            ctx.fillRect(midX + offsetX - textWidth/2 - 4, midY + offsetY - 10, textWidth + 8, 14);

            // Draw text on top - Use edge color for weight text
             ctx.fillStyle = edgeColor; // Use the stroke color for the text
             ctx.globalAlpha = 1.0; // Make text fully opaque
            ctx.fillText(text, midX + offsetX, midY + offsetY);
             ctx.globalAlpha = 1.0; // Reset alpha
        });


        // --- Draw Nodes ---
        graphData.nodes.forEach(node => {
            ctx.beginPath();
            ctx.arc(node.x, node.y, NODE_RADIUS, 0, Math.PI * 2);

            // Determine Fill Style using theme colors
             if (node.id === persistentStartNodeId) {
                 ctx.fillStyle = START_NODE_COLOR; // Specific color for start node (accent)
             } else if (highlightedNodeIds.has(node.id)) {
                ctx.fillStyle = `hsl(${accentColor})`; // Step-specific highlighted node (accent)
             } else if (mstEdges.some(e => e.source === node.id || e.target === node.id) ) {
                 // Node is part of the final MST (or intermediate MST)
                 ctx.fillStyle = `hsl(${primaryColor})`; // Visited/MST node color (primary)
            } else {
                ctx.fillStyle = `hsl(${mutedColor})`; // Default node color (muted)
            }

            // Determine Stroke Style (Border) using theme colors
             let strokeColor = `hsl(${mutedFgColor})`; // Default border (muted-foreground)
             if (node.id === persistentStartNodeId) {
                 strokeColor = `hsl(${accentFgColor})`; // Contrast border for start node (accent-foreground)
             } else if (highlightedNodeIds.has(node.id)) {
                 strokeColor = `hsl(${accentFgColor})`; // Contrast border for step highlight (accent-foreground)
             } else if (mstEdges.some(e => e.source === node.id || e.target === node.id)) {
                  strokeColor = `hsl(${primaryFgColor})`; // Contrast border for MST nodes (primary-foreground)
             }
             // else: Keep default strokeColor

            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 1.5;
             if (node.id === persistentStartNodeId) {
                 ctx.lineWidth = 2.5; // Make start node border thicker
             }
            ctx.fill();
            ctx.stroke();


            // Draw node ID (inside the node) - Use stroke color for visibility
            ctx.fillStyle = strokeColor; // Use border color for text to ensure contrast against fill
            ctx.font = 'bold 15px Arial'; // Ensure node ID is large enough
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(node.id.toString(), node.x, node.y);
        });

    }, []); // No dependencies needed if graphData is passed directly

  // --- Effects for Drawing and Animation ---

 useEffect(() => {
     let currentStep = steps[currentStepIndex];
     const isAnimating = steps.length > 0 && currentStepIndex < steps.length;

     // Determine the start node ID for persistent highlighting
     let persistentStartId: number | undefined = undefined;
     if (algorithmId === 'prims-algorithm') {
         // Find the first step to get the intended startNodeId if available
         const firstStep = steps.find(isGraphStep);
         persistentStartId = firstStep?.startNodeId ?? startNode ?? undefined;
     }


    if (!isAnimating) {
         // Draw initial/reset state when not animating
          requestAnimationFrame(() => {
             if (category === 'graph' && graph) {
                 // Draw graph with MST edges empty, no step highlights, but potential persistent start node
                 drawGraph(graph, [], [], [], undefined, persistentStartId);
             } else if (array) {
                 drawArray(array);
             }
          });
         return; // Exit early
     }

     // We have a valid step to draw during animation
     if (!currentStep) return;

    requestAnimationFrame(() => {
         if (isGraphStep(currentStep)) {
             const { graph: currentGraph, mstEdges, highlightedNodes, highlightedEdges, candidateEdge } = currentStep;
             // Use the determined persistentStartId for drawing
             drawGraph(currentGraph, mstEdges, highlightedNodes, highlightedEdges, candidateEdge, persistentStartId);
         } else if (isArrayStep(currentStep)) {
             const { array: stepArray, highlight, pivot, sortedIndices, target, foundIndex } = currentStep;
             drawArray(stepArray, highlight, pivot, sortedIndices, target, foundIndex);
         }
    });

 }, [currentStepIndex, steps, drawArray, drawGraph, category, graph, array, startNode, algorithmId]);


   useEffect(() => {
    if (isPlaying && currentStepIndex < steps.length -1) { // Check against length - 1 to stop *before* last step is processed by timeout
      timeoutId.current = setTimeout(() => {
        setCurrentStepIndex((prevIndex) => prevIndex + 1);
      }, speed);
    } else if (isPlaying && currentStepIndex >= steps.length - 1 && steps.length > 0) { // Handle completion
        setIsPlaying(false); // Stop playing when finished
         // Ensure the last step message is displayed
         const lastStepMessage = steps[steps.length -1]?.message || "Finished.";
         toast({ title: "Visualization Complete", description: lastStepMessage });
         // CurrentStepIndex should be at the last step, useEffect[currentStepIndex] will draw it.

    }

    // Cleanup timeout on pause, finish, or speed change
    return () => {
      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
      }
    };
  }, [isPlaying, currentStepIndex, steps, speed, toast]); // Removed drawGraph, drawArray


  // --- Event Handlers ---

  const handlePlayPause = () => {
    if (steps.length === 0) {
        startVisualization(); // Start if no steps exist yet
    } else if (currentStepIndex >= steps.length -1 ) { // If on last step or beyond
        // If finished, restart from the beginning
        setCurrentStepIndex(0);
        setIsPlaying(true);
         // Trigger drawing of the first step
             requestAnimationFrame(() => {
                const firstStep = steps[0];
                let persistentStartId = undefined;
                 if (isGraphStep(firstStep) && algorithmId === 'prims-algorithm') {
                     persistentStartId = firstStep?.startNodeId ?? startNode ?? undefined;
                 }

                 if (isGraphStep(firstStep)) {
                     drawGraph(firstStep.graph, firstStep.mstEdges, firstStep.highlightedNodes, firstStep.highlightedEdges, firstStep.candidateEdge, persistentStartId);
                 } else if (isArrayStep(firstStep)) {
                     drawArray(firstStep.array, firstStep.highlight, firstStep.pivot, firstStep.sortedIndices, firstStep.target, firstStep.foundIndex);
                 }
             });
    }
     else {
       setIsPlaying(!isPlaying);
    }
  };

  const handleReset = () => {
     if (category === 'graph') {
         // Reset graph to a new random one or keep the current structure?
         // Option 1: Keep current edited structure, just reset algorithm state
          // initializeGraph(graph); // Keep user's edits
          setIsGenerated(false); // Ensure it's marked as not freshly generated
          resetVisualization(); // Just reset the algorithm state
         // Option 2: Generate a completely new random graph
         // initializeGraph(); // Generate new random
     } else {
         // For array, reset based on current input value or generate new random
         const currentArray = parseArrayInput(inputValue);
         if (currentArray && !isGenerated) {
            setArray(currentArray); // Keep user's array
            resetVisualization();
         } else {
             generateRandomArray(array.length || DEFAULT_ARRAY_SIZE); // Generate new random
         }

     }
     // resetVisualization is called within initializeGraph/generateRandomArray or explicitly above
  };


  const handleRandomizeGraph = () => {
      initializeGraph(); // This generates a new random graph and resets visualization
      setIsGenerated(true); // Mark as generated
  }

  const handleSpeedChange = (value: number[]) => {
    setSpeed(MAX_SPEED + MIN_SPEED - value[0]);
  };


  // --- Render ---

   const currentStepData = steps[currentStepIndex];
   let currentExplanation = "Ready to visualize.";
   if (currentStepData) {
       currentExplanation = currentStepData.message;
   } else if (steps.length > 0 && currentStepIndex >= steps.length) {
       currentExplanation = steps[steps.length - 1]?.message || "Finished.";
   }


  const isGraphCategory = category === 'graph';


  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Controls Column */}
      <Card className="w-full lg:w-1/3 xl:w-1/4">
        <CardHeader>
          <CardTitle>Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Input Section - Conditional */}
          {isGraphCategory ? (
             // Graph controls (delegated to GraphEditor, plus start node selection)
              <>
                  <Button onClick={handleRandomizeGraph} variant="outline" size="sm" className="w-full">
                      <ShuffleIcon className="mr-2 h-4 w-4" /> Generate Random Graph
                  </Button>

                 {algorithmId === 'prims-algorithm' && (
                   <div className="space-y-2">
                     <Label htmlFor="start-node-select">Start Node (Prim's)</Label>
                     <Select
                        value={startNode !== null ? startNode.toString() : ""}
                        onValueChange={handleStartNodeChange}
                        disabled={graph.nodes.length === 0}
                     >
                       <SelectTrigger id="start-node-select" className="w-full">
                         <SelectValue placeholder="Select start node..." />
                       </SelectTrigger>
                       <SelectContent>
                           {graph.nodes.length > 0 ? (
                                // Sort nodes by ID for consistent order
                                [...graph.nodes].sort((a, b) => a.id - b.id).map(node => (
                                    <SelectItem key={node.id} value={node.id.toString()}>
                                        Node {node.id}
                                    </SelectItem>
                                ))
                            ) : (
                                <SelectItem value="" disabled>No nodes available</SelectItem>
                            )
                           }
                       </SelectContent>
                     </Select>
                   </div>
                 )}
             </>
          ) : (
             // Array and Target Inputs
            <>
              <div className="space-y-2">
                <Label htmlFor="array-input">Array ({MIN_ARRAY_SIZE}-{MAX_ARRAY_SIZE} elements, 1-100)</Label>
                <div className="flex gap-2">
                  <Input
                    id="array-input"
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    placeholder="e.g., 5, 3, 8, 1, 9"
                    className="flex-grow"
                  />
                  <Button onClick={handleSetArrayData} variant="secondary" size="sm">Set</Button>
                </div>
                <Button onClick={() => generateRandomArray(array.length || DEFAULT_ARRAY_SIZE)} variant="outline" size="sm" className="w-full">
                  <ShuffleIcon className="mr-2 h-4 w-4" /> Randomize Array
                </Button>
              </div>

              {category === 'search' && (
                <div className="space-y-2">
                  <Label htmlFor="target-input">Target Value (1-100)</Label>
                   <Input
                    id="target-input"
                    type="number"
                    value={targetValue}
                    onChange={handleTargetChange}
                    placeholder="e.g., 7"
                    min="1"
                    max="100"
                  />
                  {algorithmId === 'binary-search' && (
                    <p className="text-xs text-muted-foreground">(Input array will be sorted if necessary)</p>
                  )}
                </div>
              )}
             </>
          )}


          {/* Speed Slider */}
          <div className="space-y-2">
            <Label htmlFor="speed-slider">Speed</Label>
            <Slider
              id="speed-slider"
              min={MIN_SPEED}
              max={MAX_SPEED}
              step={10}
              value={[MAX_SPEED + MIN_SPEED - speed]}
              onValueChange={handleSpeedChange}
              className="my-4"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Slow</span>
              <span>Fast</span>
            </div>
          </div>

          {/* Playback Controls */}
           <div className="flex items-center justify-center space-x-2 mt-4">
              <Button onClick={handlePlayPause} variant="default" size="icon" aria-label={isPlaying ? "Pause" : (steps.length > 0 ? "Play/Restart" : "Start")}>
                   {isPlaying ? <Pause className="h-5 w-5"/> : <Play className="h-5 w-5"/>}
               </Button>
               <Button onClick={handleReset} variant="outline" size="icon" aria-label="Reset Visualization">
                   <RotateCcw className="h-5 w-5"/>
               </Button>
                {/* Add Previous/Next Step Buttons if desired */}
           </div>
        </CardContent>
      </Card>

      {/* Visualization Column */}
      <div className="flex-grow flex flex-col gap-4 lg:w-2/3 xl:w-3/4"> {/* Adjusted width */}
         <Card className="flex-grow">
            <CardHeader>
                <CardTitle>Visualization</CardTitle>
                <CardDescription className={cn("transition-opacity duration-300 min-h-[1.5em]", steps.length > 0 ? 'opacity-100' : 'opacity-50')}>
                     {currentExplanation || '\u00A0'} {/* Non-breaking space, increased min-height */}
                </CardDescription>
            </CardHeader>
             {/* Conditional Rendering: Canvas for Arrays, GraphEditor for Graphs */}
             {isGraphCategory ? (
                 <CardContent className="aspect-[2/1] p-0 overflow-hidden relative border rounded-b-lg">
                    {/* GraphEditor for interactive editing */}
                    <GraphEditor
                        graph={graph}
                        onGraphChange={handleGraphChange}
                        width={800} // Keep consistent size
                        height={400}
                        readOnly={isPlaying} // Make editor read-only during visualization
                    />
                    {/* Visualization Canvas sits *on top* (z-index) during playback */}
                     <canvas
                        ref={canvasRef}
                        width="800"
                        height="400"
                        className={cn(
                            "absolute top-0 left-0 w-full h-full rounded-b-lg", // Apply rounding
                            isPlaying ? "z-10 pointer-events-none bg-background/10" : "z-0 pointer-events-none bg-transparent" // Layer control
                             )}
                     ></canvas>
                 </CardContent>
             ) : (
                 // Original Canvas for Array Visualizations
                 <CardContent className="aspect-[2/1] p-0 overflow-hidden relative border rounded-b-lg">
                     <canvas
                        ref={canvasRef}
                        width="800"
                        height="400"
                         className="absolute top-0 left-0 w-full h-full bg-transparent rounded-b-lg" // Use transparent background, ensure rounding
                     ></canvas>
                 </CardContent>
             )}

         </Card>
         {/* Optional: DSU State Visualization for Kruskal's */}
         {algorithmId === 'kruskals-algorithm' && isGraphStep(currentStepData || {}) && currentStepData?.dsuState && (
             <Card>
                 <CardHeader><CardTitle className="text-lg">Disjoint Set State</CardTitle></CardHeader>
                 <CardContent className="text-xs overflow-x-auto bg-muted/50 p-2 rounded">
                     <pre className="font-mono whitespace-pre-wrap break-all">Parent: {JSON.stringify(currentStepData.dsuState?.parent)}</pre>
                     <pre className="font-mono whitespace-pre-wrap break-all">Rank:   {JSON.stringify(currentStepData.dsuState?.rank)}</pre>
                 </CardContent>
             </Card>
         )}
      </div>
    </div>
  );
}
