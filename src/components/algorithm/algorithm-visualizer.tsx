
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Play, Pause, RotateCcw, Shuffle as ShuffleIcon, Search as SearchIcon, Share2 as GraphIcon, Target, Trash2, CircleDot, Waypoints, LocateFixed } from "lucide-react"; // Added editor mode icons
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { AlgorithmStep, ArrayAlgorithmStep, GraphAlgorithmStep, Graph, Node, Edge } from '@/lib/types';
import { isGraphStep, isArrayStep } from '@/lib/types';
import GraphEditor from './graph-editor';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group" // Import ToggleGroup

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
  category: 'sort' | 'search' | 'graph';
}

// Constants for Array Algorithms
const MAX_ARRAY_SIZE = 50;
const MIN_ARRAY_SIZE = 5;
const DEFAULT_ARRAY_SIZE = 15;

// Constants for Visualization
const MIN_SPEED = 50; // ms
const MAX_SPEED = 1000; // ms
const DEFAULT_SPEED = 300; // ms

// Constants for Graph Visualization/Editor
const GRAPH_CANVAS_WIDTH = 800;
const GRAPH_CANVAS_HEIGHT = 400;
const NODE_RADIUS = 22;
const EDGE_WIDTH = 2;
const MST_EDGE_WIDTH = 4;
const START_NODE_COLOR = "hsl(var(--accent))";
const PIVOT_COLOR = "#E91E63";
const TARGET_POTENTIAL_COLOR = "#FFC107";

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

export type GraphEditorMode = 'node' | 'edge' | 'set-source';


// Helper to generate a random graph, ensuring connectivity
const generateRandomGraph = (numNodes = 7, edgeDensity = 0.35): Graph => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const canvasWidth = GRAPH_CANVAS_WIDTH;
    const canvasHeight = GRAPH_CANVAS_HEIGHT;
    const padding = NODE_RADIUS * 3; // Padding around edges
    const minNodeDistance = NODE_RADIUS * 5.5; // Increased minimum distance between nodes

    // Generate node positions, trying to space them out
    for (let i = 0; i < numNodes; i++) {
        let x, y, tooClose;
        let attempts = 0;
        const maxAttempts = 150;
        do {
            tooClose = false;
            x = Math.random() * (canvasWidth - 2 * padding) + padding;
            y = Math.random() * (canvasHeight - 2 * padding) + padding;
            for (const existingNode of nodes) {
                const distSq = (x - existingNode.x) ** 2 + (y - existingNode.y) ** 2;
                if (distSq < minNodeDistance ** 2) {
                    tooClose = true;
                    break;
                }
            }
            attempts++;
        } while (tooClose && attempts < maxAttempts);
        nodes.push({ id: i, x, y });
    }

    // Generate edges based on density, allowing cycles
    const edgeSet = new Set<string>();
    for (let i = 0; i < numNodes; i++) {
        for (let j = i + 1; j < numNodes; j++) {
            if (Math.random() < edgeDensity) {
                const weight = Math.floor(Math.random() * 20) + 1;
                const canonicalEdgeId = `${Math.min(i, j)}-${Math.max(i, j)}`;
                if (!edgeSet.has(canonicalEdgeId)) {
                    // Use a slightly more robust ID including weight to avoid potential conflicts if same nodes have multiple edges (though not typical here)
                    const edgeId = `edge-${i}-${j}-${weight}-${Date.now() % 10000}`; // Add timestamp suffix for better uniqueness chance
                    edges.push({ id: edgeId, source: i, target: j, weight });
                    edgeSet.add(canonicalEdgeId);
                }
            }
        }
    }

    // --- Ensure Graph Connectivity ---
    if (nodes.length > 1) {
        const adj = new Map<number, number[]>();
        nodes.forEach(node => adj.set(node.id, []));
        edges.forEach(edge => {
            adj.get(edge.source)?.push(edge.target);
            adj.get(edge.target)?.push(edge.source);
        });

        const visited = new Set<number>();
        const components: number[][] = [];
        for (const node of nodes) {
            if (!visited.has(node.id)) {
                const currentComponent: number[] = [];
                const queue = [node.id];
                visited.add(node.id);
                currentComponent.push(node.id);
                while (queue.length > 0) {
                    const u = queue.shift()!;
                    const neighbors = adj.get(u) || [];
                    for (const v of neighbors) {
                        if (!visited.has(v)) {
                            visited.add(v);
                            queue.push(v);
                            currentComponent.push(v);
                        }
                    }
                }
                components.push(currentComponent);
            }
        }
        if (components.length > 1) {
            // console.log(`Graph is not connected. Found ${components.length} components. Adding edges to connect.`);
            for (let i = 0; i < components.length - 1; i++) {
                const compA = components[i];
                const compB = components[i + 1];
                // Connect random nodes from the two components
                const nodeAId = compA[Math.floor(Math.random() * compA.length)];
                const nodeBId = compB[Math.floor(Math.random() * compB.length)];
                const canonicalEdgeId = nodeAId < nodeBId ? `${nodeAId}-${nodeBId}` : `${nodeBId}-${nodeAId}`;

                // Avoid adding duplicate edges
                if (!edgeSet.has(canonicalEdgeId)) {
                    const weight = Math.floor(Math.random() * 15) + 5; // Give connecting edges reasonable weight
                    const edgeId = `connect-${nodeAId}-${nodeBId}-${weight}-${Date.now() % 10000}`;
                    // console.log(`Adding edge between ${nodeAId} and ${nodeBId} with weight ${weight}`);
                    edges.push({ id: edgeId, source: nodeAId, target: nodeBId, weight });
                    edgeSet.add(canonicalEdgeId);
                     // Update adjacency list for subsequent checks (if any needed, though one pass should suffice here)
                     adj.get(nodeAId)?.push(nodeBId);
                     adj.get(nodeBId)?.push(nodeAId);
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
  const [editorGraph, setEditorGraph] = useState<Graph>({ nodes: [], edges: [] }); // Editor starts empty
  const [visualizerGraph, setVisualizerGraph] = useState<Graph>(generateRandomGraph()); // Visualizer starts with random graph
  const [startNode, setStartNode] = useState<number | null>(null);
  const [editorMode, setEditorMode] = useState<GraphEditorMode>('node'); // State for editor mode

  // Common State
  const [steps, setSteps] = useState<AlgorithmStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(DEFAULT_SPEED);
  const [isUsingEditorGraph, setIsUsingEditorGraph] = useState<boolean>(false); // Track which graph source is used for visualization
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeoutId = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();


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
    const barWidth = Math.max(1, availableWidth / n);
    const maxVal = Math.max(...currentArrayState, 1);

    const computedStyle = getComputedStyle(document.documentElement);
    const primaryColor = computedStyle.getPropertyValue('--primary').trim();
    const secondaryColor = computedStyle.getPropertyValue('--secondary').trim();
    const accentColor = computedStyle.getPropertyValue('--accent').trim();
    const foregroundColor = computedStyle.getPropertyValue('--foreground').trim();

    currentArrayState.forEach((value, index) => {
      const barHeight = Math.max(1, (value / maxVal) * (height * 0.85));
      const x = spacing + index * (barWidth + spacing);
      const y = height - barHeight - 20;

      if (foundIndex === index) ctx.fillStyle = `hsl(${accentColor})`;
      else if (target === value && category === 'search' && !sortedIndices.includes(index)) ctx.fillStyle = TARGET_POTENTIAL_COLOR;
      else if (sortedIndices.includes(index)) ctx.fillStyle = `hsl(${secondaryColor})`;
      else if (highlight.includes(index)) ctx.fillStyle = `hsl(${accentColor})`;
       else if (pivot === index) ctx.fillStyle = PIVOT_COLOR;
      else ctx.fillStyle = `hsl(${primaryColor})`;

      ctx.fillRect(x, y, barWidth, barHeight);

      if (barWidth > 15) {
          ctx.fillStyle = `hsl(${foregroundColor})`;
          ctx.textAlign = "center";
          ctx.font = "12px Arial";
          ctx.fillText(value.toString(), x + barWidth / 2, height - 5);
      }
    });
  }, [category]);


    const drawGraphVisualization = useCallback((
        graphData: Graph,
        mstEdges: Edge[] = [],
        highlightedNodes: number[] = [],
        highlightedEdges: string[] = [],
        candidateEdge?: Edge,
        persistentStartNodeId?: number
    ) => {
        const canvas = canvasRef.current;
        if (!canvas || !graphData) return; // Add check for graphData
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { width, height } = canvas;
        ctx.clearRect(0, 0, width, height);

        const computedStyle = getComputedStyle(document.documentElement);
        const primaryColor = computedStyle.getPropertyValue('--primary').trim();
        const primaryFgColor = computedStyle.getPropertyValue('--primary-foreground').trim();
        const secondaryColor = computedStyle.getPropertyValue('--secondary').trim();
        const accentColor = computedStyle.getPropertyValue('--accent').trim();
        const accentFgColor = computedStyle.getPropertyValue('--accent-foreground').trim();
        const destructiveColor = computedStyle.getPropertyValue('--destructive').trim();
        const mutedColor = computedStyle.getPropertyValue('--muted').trim();
        const mutedFgColor = computedStyle.getPropertyValue('--muted-foreground').trim();
        const backgroundColor = computedStyle.getPropertyValue('--background').trim();
        const foregroundColor = computedStyle.getPropertyValue('--foreground').trim();

        const nodeMap = new Map(graphData.nodes.map(node => [node.id, node]));
        const mstEdgeIds = new Set(mstEdges.map(edge => edge.id));
        const highlightedEdgeIds = new Set(highlightedEdges);
        const highlightedNodeIds = new Set(highlightedNodes);


        // --- Draw Edges ---
        graphData.edges.forEach(edge => {
            const sourceNode = nodeMap.get(edge.source);
            const targetNode = nodeMap.get(edge.target);
            if (!sourceNode || !targetNode) return;

            ctx.beginPath();
            ctx.moveTo(sourceNode.x, sourceNode.y);
            ctx.lineTo(targetNode.x, targetNode.y);

            let edgeColor = `hsl(${mutedFgColor})`;
            let edgeAlpha = 0.5;
            let edgeWidth = EDGE_WIDTH;
            let lineDash: number[] = [];

             if (mstEdgeIds.has(edge.id)) {
                edgeColor = `hsl(${secondaryColor})`;
                edgeWidth = MST_EDGE_WIDTH;
                edgeAlpha = 1.0;
            } else if (candidateEdge && edge.id === candidateEdge.id) {
                 if (mstEdgeIds.has(candidateEdge.id)) {
                    // Should already be handled by MST edge style
                 } else {
                     edgeColor = `hsl(${destructiveColor})`; // Considered but rejected (e.g., forms cycle in Kruskal's)
                     edgeWidth = EDGE_WIDTH * 1.5;
                     lineDash = [5, 5];
                     edgeAlpha = 0.8;
                 }
            } else if (highlightedEdgeIds.has(edge.id)) {
                 edgeColor = `hsl(${primaryColor})`; // Being actively considered or part of PQ in Prim's
                 edgeWidth = EDGE_WIDTH * 1.2;
                 edgeAlpha = 0.9;
            }

            ctx.strokeStyle = edgeColor;
            ctx.lineWidth = edgeWidth;
            ctx.globalAlpha = edgeAlpha;
            ctx.setLineDash(lineDash);
            ctx.stroke();
            ctx.setLineDash([]);
             ctx.globalAlpha = 1.0;

            // Draw edge weight
            const midX = (sourceNode.x + targetNode.x) / 2;
            const midY = (sourceNode.y + targetNode.y) / 2;
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            // Angle calculation to offset weight text slightly from the edge line
            const angle = Math.atan2(targetNode.y - sourceNode.y, targetNode.x - sourceNode.x);
            const offsetX = Math.sin(angle) * 15; // Offset perpendicular to edge
            const offsetY = -Math.cos(angle) * 15;
            const text = edge.weight.toString();
            const textWidth = ctx.measureText(text).width;

            // Draw a small background rectangle behind the text for better visibility
            ctx.fillStyle = `hsl(${backgroundColor})`;
            ctx.globalAlpha = 0.9;
            ctx.fillRect(midX + offsetX - textWidth/2 - 4, midY + offsetY - 10, textWidth + 8, 14);
             ctx.fillStyle = edgeColor; // Use the edge's color for the text
             ctx.globalAlpha = 1.0; // Reset alpha
            ctx.fillText(text, midX + offsetX, midY + offsetY);
             ctx.globalAlpha = 1.0; // Ensure alpha is reset
        });


        // --- Draw Nodes ---
        graphData.nodes.forEach(node => {
            ctx.beginPath();
            ctx.arc(node.x, node.y, NODE_RADIUS, 0, Math.PI * 2);

             // Determine Fill Color
             if (node.id === persistentStartNodeId) {
                 ctx.fillStyle = START_NODE_COLOR; // Specific color for the designated start node
             } else if (highlightedNodeIds.has(node.id)) {
                ctx.fillStyle = `hsl(${accentColor})`; // Highlight active nodes
             } else if (mstEdges.some(e => e.source === node.id || e.target === node.id) ) {
                 // Part of the MST (implicitly visited in Prim's, connected in Kruskal's result)
                 ctx.fillStyle = `hsl(${primaryColor})`;
            } else {
                ctx.fillStyle = `hsl(${mutedColor})`; // Default state
            }

            ctx.fill();

            // Determine Stroke Color and Width
             let strokeColor = `hsl(${mutedFgColor})`; // Default stroke
             let strokeWidth = 1.5;
             if (node.id === persistentStartNodeId) {
                 strokeColor = `hsl(${accentFgColor})`; // Matching foreground for start node
                 strokeWidth = 2.5; // Thicker border for start node
             } else if (highlightedNodeIds.has(node.id)) {
                 strokeColor = `hsl(${accentFgColor})`; // Matching foreground for highlighted nodes
             } else if (mstEdges.some(e => e.source === node.id || e.target === node.id)) {
                  strokeColor = `hsl(${primaryFgColor})`; // Matching foreground for nodes in MST
             }


            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = strokeWidth;
            ctx.stroke();

            // Draw Node ID Text
            ctx.fillStyle = strokeColor; // Use the stroke color for the text for contrast
            ctx.font = 'bold 15px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(node.id.toString(), node.x, node.y);
        });

    }, []); // Removed category dependency


 // Define resetVisualization using useCallback BEFORE it's used as a dependency
 // Modified resetVisualization to accept an optional graph to draw initially
  const resetVisualization = useCallback((graphToDraw?: Graph) => {
    setIsPlaying(false);
    setSteps([]);
    setCurrentStepIndex(0);
    if (timeoutId.current) clearTimeout(timeoutId.current);
    timeoutId.current = null;

    const activeGraph = graphToDraw ?? (isUsingEditorGraph ? editorGraph : visualizerGraph);

    requestAnimationFrame(() => {
        if (category === 'graph' && activeGraph && activeGraph.nodes.length > 0) { // Check activeGraph has nodes
            let persistentStartId: number | undefined = undefined;
            if (algorithmId === 'prims-algorithm') {
                 // Use the state's startNode if valid within the active graph, otherwise default
                 if (startNode !== null && activeGraph.nodes.some(n => n.id === startNode)) {
                     persistentStartId = startNode;
                 } else if (activeGraph.nodes.length > 0) {
                     persistentStartId = activeGraph.nodes[0].id; // Fallback to first node
                 }
            }
           drawGraphVisualization(activeGraph, [], [], [], undefined, persistentStartId);
        } else if (category === 'sort' || category === 'search'){ // Only draw array if relevant category
           drawArray(array);
        } else if (category === 'graph' && (!activeGraph || activeGraph.nodes.length === 0)) {
             // Clear canvas if graph is empty
             const canvas = canvasRef.current;
             if (canvas) {
                 const ctx = canvas.getContext('2d');
                 if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
             }
        }
      });
  }, [category, array, editorGraph, visualizerGraph, isUsingEditorGraph, startNode, algorithmId, drawArray, drawGraphVisualization]); // Include drawArray/Graph dependencies


  // --- Initialization and Reset ---

  const generateRandomArray = useCallback((size: number = DEFAULT_ARRAY_SIZE) => {
    const newArray = Array.from({ length: size }, () => Math.floor(Math.random() * 100) + 1);
    setArray(newArray);
    setInputValue(newArray.join(", "));
    resetVisualization();
    setIsUsingEditorGraph(false); // Reset graph source flag
  }, [resetVisualization]);

   // Generates a new random graph ONLY for the visualizer
   const initializeRandomGraphForVisualizer = useCallback(() => {
        const randomGraph = generateRandomGraph();
        setVisualizerGraph(randomGraph);
        // Automatically select the first node as the default start node if available
        setStartNode(randomGraph.nodes.length > 0 ? randomGraph.nodes[0].id : null);
        resetVisualization(randomGraph); // Pass the new graph to reset
        setIsUsingEditorGraph(false); // Indicate we are using the random graph
    }, [resetVisualization]);

    // Clears the graph editor workspace
   const clearGraphWorkspace = useCallback(() => {
        setEditorGraph({ nodes: [], edges: [] });
        setStartNode(null); // Clear start node when workspace clears
        resetVisualization({ nodes: [], edges: [] }); // Reset visualization with empty graph
        setIsUsingEditorGraph(true); // Assume user wants to visualize the (now empty) workspace
        toast({ title: "Workspace Cleared", description: "Graph editor has been reset." });
    }, [resetVisualization, toast]);

  // Initialize based on category when component mounts or category/algorithm changes
  useEffect(() => {
     resetVisualization(); // Reset visualization state first
    if (category === 'sort' || category === 'search') {
      generateRandomArray();
      setEditorMode('node'); // Reset editor mode if switching away from graph
    } else if (category === 'graph') {
       // Keep editor empty, initialize visualizer with random
       setEditorGraph({ nodes: [], edges: [] });
       initializeRandomGraphForVisualizer();
       setEditorMode('node'); // Default to node mode
       // Reset start node mode availability based on algorithm
        if (algorithmId !== 'prims-algorithm' && editorMode === 'set-source') {
            setEditorMode('node');
        }
    }
     // Cleanup function to clear any running timeouts
    return () => {
      if (timeoutId.current) clearTimeout(timeoutId.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [algorithmId, category]); // Dependencies are algorithmId and category


   // Update default start node based on the CURRENTLY ACTIVE graph for visualization
   useEffect(() => {
       const activeGraph = isUsingEditorGraph ? editorGraph : visualizerGraph;
       // Set default start node only if needed for Prim's and no valid start node is set
       if (category === 'graph' && algorithmId === 'prims-algorithm' && activeGraph.nodes.length > 0) {
            const currentStartNodeValid = startNode !== null && activeGraph.nodes.some(n => n.id === startNode);
            if (!currentStartNodeValid) {
                 setStartNode(activeGraph.nodes[0].id); // Default to first node if current is invalid or null
            }
       }
       // If not Prim's or graph is empty, clear start node
       else if (category !== 'graph' || algorithmId !== 'prims-algorithm' || activeGraph.nodes.length === 0) {
            if (startNode !== null) setStartNode(null);
       }

   }, [editorGraph, visualizerGraph, isUsingEditorGraph, category, startNode, algorithmId]);


   // Effect to switch back to node mode if 'Set Source' is selected but not applicable (Kruskal's)
    useEffect(() => {
        if (category === 'graph' && algorithmId === 'kruskals-algorithm' && editorMode === 'set-source') {
            setEditorMode('node');
            toast({ title: "Mode Changed", description: "'Set Source Node' mode is only available for Prim's algorithm.", variant: "default" });
        }
    }, [algorithmId, category, editorMode, toast]);


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
  };

  const handleTargetChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTargetValue(event.target.value);
  };

  // This updates the EDITOR's graph state
  const handleEditorGraphChange = useCallback((newGraph: Graph) => {
      setEditorGraph(newGraph);
      // Reset visualization steps whenever editor graph changes
      resetVisualization(); // Uses current isUsingEditorGraph flag
      // If user starts editing, assume they want to visualize this graph
      setIsUsingEditorGraph(true);
      // Ensure start node is valid for the EDITOR graph (if Prim's)
       if (algorithmId === 'prims-algorithm') {
           const startNodeValid = startNode !== null && newGraph.nodes.some(n => n.id === startNode);
           if (!startNodeValid && newGraph.nodes.length > 0) {
               setStartNode(newGraph.nodes[0].id); // Set to first node if current becomes invalid or null
           } else if (newGraph.nodes.length === 0) {
               setStartNode(null); // Clear start node if editor becomes empty
           }
       } else {
            setStartNode(null); // Not Prim's, clear start node
       }
  }, [resetVisualization, startNode, algorithmId]); // Include algorithmId


  const handleSetArrayData = () => {
        resetVisualization();
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

   // Handles manual start node selection VIA THE SELECT DROPDOWN
   const handleStartNodeChange = (value: string) => {
       if (algorithmId !== 'prims-algorithm') return; // Only relevant for Prim's

       const activeGraph = isUsingEditorGraph ? editorGraph : visualizerGraph;
       const nodeId = parseInt(value, 10);
       if (!isNaN(nodeId) && activeGraph.nodes.some(n => n.id === nodeId)) {
           setStartNode(nodeId);
           resetVisualization(); // Reset if start node changes, steps depend on it
       } else {
           // Attempt to set to a non-existent node or invalid value, maybe reset to default or null?
            if (activeGraph.nodes.length > 0) {
                setStartNode(activeGraph.nodes[0].id); // Fallback to first node
            } else {
                 setStartNode(null); // No nodes available
            }
           resetVisualization();
           toast({title: "Invalid Selection", description:"Selected start node doesn't exist in the current graph.", variant: "destructive"})
       }
   };


    // Handles start node selection VIA THE GRAPH EDITOR (Set Source Mode)
   const handleSetStartNodeFromEditor = useCallback((nodeId: number) => {
       if (algorithmId !== 'prims-algorithm') {
           toast({ title: "Action Unavailable", description: "Setting a source node directly is only needed for Prim's algorithm.", variant: "default" });
           return; // Only allow for Prim's
       }
       // Note: GraphEditor works on editorGraph, so we check against that
       if (editorGraph.nodes.some(n => n.id === nodeId)) {
           setStartNode(nodeId);
            setIsUsingEditorGraph(true); // Assume user wants to visualize the editor graph now
           resetVisualization(editorGraph); // Reset visualization using the editor graph
           toast({ title: "Start Node Set", description: `Node ${nodeId} selected as the start node for Prim's algorithm on the workspace graph.` });
           // Optional: Switch back to node mode after setting the source
           setEditorMode('node');
       } else {
           toast({ title: "Invalid Node", description: `Node ${nodeId} does not exist in the workspace graph.`, variant: "destructive" });
       }
   }, [algorithmId, editorGraph, resetVisualization, toast]); // Dependencies


    const handleEditorModeChange = (value: GraphEditorMode | null) => {
        if (value) {
             // Prevent switching to 'set-source' if not Prim's
             if (value === 'set-source' && algorithmId !== 'prims-algorithm') {
                 toast({ title: "Mode Unavailable", description: "'Set Source Node' mode is only for Prim's algorithm.", variant: "default" });
                 return; // Stay in the current mode
             }
            setEditorMode(value);
        }
    };

  // --- Visualization Logic ---


 const startVisualization = () => {
    const algorithmFunction = ALGORITHM_MAP[category]?.[algorithmId];
    if (!algorithmFunction) {
        toast({ title: "Error", description: "Algorithm not found.", variant: "destructive" });
        return;
    }

    // Determine which graph to use for visualization
    const graphToVisualize = isUsingEditorGraph ? editorGraph : visualizerGraph;

    // Reset visualization using the chosen graph
    resetVisualization(graphToVisualize);

    let newSteps: AlgorithmStep[] = [];

    try {
        if (category === 'sort') {
            if (array.length === 0) throw new Error("Please provide an array.");
            newSteps = algorithmFunction([...array]);
        } else if (category === 'search') {
            if (array.length === 0) throw new Error("Please provide an array.");
            const targetNum = parseTargetInput(targetValue);
            if (targetNum === null) return;

            let currentArray = [...array];
            if (algorithmId === 'binary-search') {
                const isSorted = currentArray.every((val, i, arr) => !i || val >= arr[i - 1]);
                 if(!isSorted){
                    currentArray.sort((a, b) => a - b);
                    toast({ title: "Array Sorted", description: "Input array sorted for Binary Search." });
                    setArray(currentArray);
                    setInputValue(currentArray.join(", "));
                 }
            }
            newSteps = algorithmFunction(currentArray, targetNum);
        } else if (category === 'graph') {
            // Use the determined graph (editor or random)
            if (!graphToVisualize || graphToVisualize.nodes.length === 0) {
                toast({ title: "Empty Graph", description: `Cannot visualize - ${isUsingEditorGraph ? 'workspace graph is empty.' : 'random graph generation failed.'}`, variant: "destructive" });
                return;
             }


            let currentStartNodeIdForAlgo = startNode; // Use the state's start node

             // For Prim's, validate or select default start node for the *graph being visualized*
            if (algorithmId === 'prims-algorithm') {
                 if (currentStartNodeIdForAlgo === null || !graphToVisualize.nodes.some(n => n.id === currentStartNodeIdForAlgo)) {
                    currentStartNodeIdForAlgo = graphToVisualize.nodes[0]?.id ?? null;
                     if (currentStartNodeIdForAlgo === null) {
                         throw new Error("Graph has no nodes to select a start node from.");
                     }
                     // Update state ONLY if we had to pick a default because the current one was invalid/null
                     if(startNode !== currentStartNodeIdForAlgo) {
                         setStartNode(currentStartNodeIdForAlgo);
                     }
                     toast({title: "Start Node Selected", description: `Using node ${currentStartNodeIdForAlgo} as start node for Prim's.`});
                 }

                 if (currentStartNodeIdForAlgo === null) { // Double check after potential default selection
                    throw new Error("Cannot run Prim's without a valid start node.");
                 }
                newSteps = algorithmFunction(graphToVisualize, currentStartNodeIdForAlgo);
            } else { // Kruskal's (doesn't need start node)
                 newSteps = algorithmFunction(graphToVisualize);
            }
        }

        if (newSteps.length > 0) {
            setSteps(newSteps);
            setCurrentStepIndex(0);
            setIsPlaying(true);
             requestAnimationFrame(() => {
                const firstStep = newSteps[0];
                 if (firstStep) { // Ensure firstStep exists
                    if (isGraphStep(firstStep)) {
                        // Use startNodeId from the first step or the selected startNode (for Prim's)
                        const persistentStartId = (algorithmId === 'prims-algorithm') ? (firstStep.startNodeId ?? startNode ?? undefined) : undefined;
                        drawGraphVisualization(firstStep.graph, firstStep.mstEdges, firstStep.highlightedNodes, firstStep.highlightedEdges, firstStep.candidateEdge, persistentStartId);
                    } else if (isArrayStep(firstStep)) {
                        drawArray(firstStep.array, firstStep.highlight, firstStep.pivot, firstStep.sortedIndices, firstStep.target, firstStep.foundIndex);
                    }
                 }
             });

        } else {
             toast({ title: "No Steps", description: "Algorithm generated 0 steps. Check input or algorithm.", variant: "default"});
             resetVisualization(graphToVisualize); // Draw initial state of the chosen graph
        }
    } catch (error: any) {
        toast({ title: "Visualization Error", description: error.message || "Could not start visualization.", variant: "destructive" });
         resetVisualization(graphToVisualize); // Reset on error, showing the graph that caused it
    }
};





  // --- Effects for Drawing and Animation ---

 useEffect(() => {
     // Guard against accessing steps array when empty or index out of bounds
     if (!steps || steps.length === 0 || currentStepIndex < 0 || currentStepIndex >= steps.length) {
        // Reset to initial state if visualization finished or hasn't started
         requestAnimationFrame(() => {
             const activeGraph = isUsingEditorGraph ? editorGraph : visualizerGraph;
             if (category === 'graph') {
                if (activeGraph && activeGraph.nodes.length > 0) {
                    let persistentStartId: number | undefined = undefined;
                    if (algorithmId === 'prims-algorithm') {
                        // Recalculate start node based on current state and active graph
                         if (startNode !== null && activeGraph.nodes.some(n => n.id === startNode)) {
                             persistentStartId = startNode;
                         } else if (activeGraph.nodes.length > 0) {
                             persistentStartId = activeGraph.nodes[0].id;
                         }
                    }
                    drawGraphVisualization(activeGraph, [], [], [], undefined, persistentStartId);
                } else {
                    // Clear canvas if graph is empty
                     const canvas = canvasRef.current;
                     if (canvas) {
                         const ctx = canvas.getContext('2d');
                         if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
                     }
                }
             } else if ((category === 'sort' || category === 'search') && array) {
                 drawArray(array);
             }
         });
         return;
     }


     // If we have steps and are within bounds, draw the current step
     let currentStep = steps[currentStepIndex];
     if (!currentStep) return; // Safety check

    requestAnimationFrame(() => {
         if (isGraphStep(currentStep)) {
             const { graph: stepGraph, mstEdges, highlightedNodes, highlightedEdges, candidateEdge, startNodeId: stepStartNodeId } = currentStep;
              // Determine the start node to highlight for THIS step
             const currentPersistentStartId = (algorithmId === 'prims-algorithm') ? (stepStartNodeId ?? startNode ?? undefined) : undefined;
             // IMPORTANT: Draw using the graph state *from the step*, not the component state
             drawGraphVisualization(stepGraph, mstEdges, highlightedNodes, highlightedEdges, candidateEdge, currentPersistentStartId);
         } else if (isArrayStep(currentStep)) {
             const { array: stepArray, highlight, pivot, sortedIndices, target, foundIndex } = currentStep;
             drawArray(stepArray, highlight, pivot, sortedIndices, target, foundIndex);
         }
    });

 // Include all dependencies that influence the drawing logic
 }, [currentStepIndex, steps, drawArray, drawGraphVisualization, category, editorGraph, visualizerGraph, isUsingEditorGraph, array, startNode, algorithmId]);


   useEffect(() => {
    if (isPlaying && currentStepIndex < steps.length -1) {
      timeoutId.current = setTimeout(() => {
        setCurrentStepIndex((prevIndex) => prevIndex + 1);
      }, speed);
    } else if (isPlaying && currentStepIndex >= steps.length - 1 && steps.length > 0) {
        setIsPlaying(false);
         // Guard against accessing message if steps[lastIndex] is undefined
         const lastStep = steps[steps.length - 1];
         const lastStepMessage = lastStep?.message || "Finished.";
         toast({ title: "Visualization Complete", description: lastStepMessage });

    }
    return () => {
      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
      }
    };
  }, [isPlaying, currentStepIndex, steps, speed, toast]);


  // --- Event Handlers ---

  const handlePlayPause = () => {
    if (steps.length === 0) {
        startVisualization();
    } else if (currentStepIndex >= steps.length -1 ) {
        // If finished, restart from beginning
        setCurrentStepIndex(0);
        setIsPlaying(true);
             requestAnimationFrame(() => {
                const firstStep = steps[0];
                if (firstStep) { // Check if firstStep exists
                    if (isGraphStep(firstStep)) {
                        const persistentStartId = (algorithmId === 'prims-algorithm') ? (firstStep.startNodeId ?? startNode ?? undefined) : undefined;
                        drawGraphVisualization(firstStep.graph, firstStep.mstEdges, firstStep.highlightedNodes, firstStep.highlightedEdges, firstStep.candidateEdge, persistentStartId);
                    } else if (isArrayStep(firstStep)) {
                        drawArray(firstStep.array, firstStep.highlight, firstStep.pivot, firstStep.sortedIndices, firstStep.target, firstStep.foundIndex);
                    }
                }
             });
    }
     else {
         // If paused in the middle, resume/pause
       setIsPlaying(!isPlaying);
    }
  };

  const handleReset = () => {
     if (category === 'graph') {
          // Reset visualization state, keep the appropriate graph source
           const graphToResetTo = isUsingEditorGraph ? editorGraph : visualizerGraph;
           resetVisualization(graphToResetTo);
     } else {
         // For array, reset based on current input value or generate new random
         const currentArray = parseArrayInput(inputValue);
         if (currentArray) { // Always try to parse current input first
            setArray(currentArray);
            resetVisualization();
         } else {
             generateRandomArray(DEFAULT_ARRAY_SIZE); // Generate new random if input is invalid
         }
     }
  };


  const handleRandomizeGraph = () => {
      // This generates a new random graph for the *visualizer*
      initializeRandomGraphForVisualizer();
      // It also sets the flag to use this random graph
      setIsUsingEditorGraph(false);
  }

  const handleSpeedChange = (value: number[]) => {
    setSpeed(MAX_SPEED + MIN_SPEED - value[0]);
  };


  // --- Render ---

   // Ensure currentStepData is accessed safely
   const currentStepData = (steps && currentStepIndex >= 0 && currentStepIndex < steps.length) ? steps[currentStepIndex] : null;
   let currentExplanation = "Ready to visualize.";

   if (isPlaying && currentStepData) {
       currentExplanation = currentStepData.message;
   } else if (!isPlaying && steps.length > 0) {
       // Show message of the current step even when paused, or last step if finished
       const indexToShow = currentStepIndex < steps.length ? currentStepIndex : steps.length - 1;
       const stepToShow = (indexToShow >= 0 && indexToShow < steps.length) ? steps[indexToShow] : null;
       currentExplanation = stepToShow?.message || "Finished.";
   }


  const isGraphCategory = category === 'graph';
  const activeGraph = isUsingEditorGraph ? editorGraph : visualizerGraph; // Determine active graph for display logic

  const getWorkspaceDescription = () => {
        switch (editorMode) {
            case 'node': return "Click to add nodes. Drag nodes to move.";
            case 'edge': return "Desktop: Drag between nodes. Mobile: Tap two nodes. Click/Tap edge to edit/delete.";
            case 'set-source': return "Click on a node to set it as the source (for Prim's).";
            default: return "Graph Workspace";
        }
    };


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
             // Graph controls
              <>
                 {/* Button to use the Editor's graph for visualization */}
                  <Button
                      onClick={() => {
                          if (editorGraph.nodes.length === 0) {
                              toast({ title: "Empty Workspace", description: "Cannot visualize an empty graph from the workspace.", variant: "destructive" });
                              return;
                          }
                          setIsUsingEditorGraph(true);
                          resetVisualization(editorGraph); // Reset visualization to show editor graph
                          toast({ title: "Using Workspace Graph", description: "Visualization will now use the graph from the workspace." });
                      }}
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      disabled={editorGraph.nodes.length === 0 || isUsingEditorGraph} // Disable if editor is empty or already in use
                  >
                      Use Workspace Graph
                  </Button>
                  {/* Button to generate and use a Random graph */}
                  <Button
                        onClick={handleRandomizeGraph}
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled={!isUsingEditorGraph} // Disable if already using random graph
                   >
                      <ShuffleIcon className="mr-2 h-4 w-4" /> Use Random Graph
                  </Button>


                 {algorithmId === 'prims-algorithm' && (
                    <>
                    <Separator />
                     <Label htmlFor="start-node-select">Start Node (Prim's)</Label>
                     <div className="flex gap-2">
                     <Select
                        value={startNode !== null ? startNode.toString() : ""} // Ensure value is string or empty string
                        onValueChange={handleStartNodeChange}
                        disabled={!activeGraph || activeGraph.nodes.length === 0} // Disable based on *active* graph
                     >
                       <SelectTrigger id="start-node-select" className="flex-grow">
                         {/* Use placeholder in SelectValue */}
                         <SelectValue placeholder="Select node..." />
                       </SelectTrigger>
                       <SelectContent>
                           {activeGraph && activeGraph.nodes.length > 0 ? ( // Check activeGraph exists before accessing nodes
                                [...activeGraph.nodes].sort((a, b) => a.id - b.id).map(node => (
                                    <SelectItem key={node.id} value={node.id.toString()}>
                                        Node {node.id}
                                    </SelectItem>
                                ))
                            ) : (
                                /* No fallback item needed here, placeholder handles empty state */
                                null
                            )
                           }
                       </SelectContent>
                     </Select>
                     </div>
                     </>
                 )}
                  <Separator />
                   <p className="text-sm text-muted-foreground">
                       {isUsingEditorGraph
                           ? "Visualizing graph from workspace."
                           : "Visualizing randomly generated graph."
                       }
                   </p>
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
                <Button onClick={() => generateRandomArray(array?.length || DEFAULT_ARRAY_SIZE)} variant="outline" size="sm" className="w-full">
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
              <Button
                    onClick={handlePlayPause}
                    variant="default"
                    size="icon"
                    aria-label={isPlaying ? "Pause" : (steps.length > 0 && currentStepIndex < steps.length -1 ? "Play" : "Start/Restart")}
                    // Disable play/pause if graph is empty and it's a graph algo
                    disabled={isGraphCategory && (!activeGraph || activeGraph.nodes.length === 0)}
               >
                   {isPlaying ? <Pause className="h-5 w-5"/> : <Play className="h-5 w-5"/>}
               </Button>
               <Button
                    onClick={handleReset}
                    variant="outline"
                    size="icon"
                    aria-label="Reset Visualization"
                     // Disable reset if graph is empty and it's a graph algo
                    disabled={isGraphCategory && (!activeGraph || activeGraph.nodes.length === 0)}
                >
                   <RotateCcw className="h-5 w-5"/>
               </Button>
           </div>
        </CardContent>
      </Card>

      {/* Main Content Area (Workspace + Visualization) */}
      <div className="flex-grow flex flex-col gap-4 lg:w-2/3 xl:w-3/4">

        {/* Conditional Rendering for Graph Workspace */}
        {isGraphCategory && (
             <Card>
                 <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
                     <div className="flex-grow min-w-[150px]">
                        <CardTitle>Graph Workspace</CardTitle>
                         <CardDescription className="text-xs sm:text-sm">
                            {getWorkspaceDescription()}
                         </CardDescription>
                     </div>
                      {/* Editor Mode Toggle */}
                     <ToggleGroup type="single" value={editorMode} onValueChange={handleEditorModeChange} size="sm" aria-label="Graph Editor Mode">
                         <ToggleGroupItem value="node" aria-label="Node Mode" title="Node Mode (Add/Move)">
                           <CircleDot className="h-4 w-4" />
                         </ToggleGroupItem>
                         <ToggleGroupItem value="edge" aria-label="Edge Mode" title="Edge Mode (Add/Edit)">
                           <Waypoints className="h-4 w-4" />
                         </ToggleGroupItem>
                         <ToggleGroupItem
                            value="set-source"
                            aria-label="Set Source Node Mode"
                            title="Set Source Node (Prim's)"
                            disabled={algorithmId !== 'prims-algorithm'}
                            >
                           <LocateFixed className="h-4 w-4" />
                         </ToggleGroupItem>
                     </ToggleGroup>
                     {/* Clear Button */}
                     <Button onClick={clearGraphWorkspace} variant="destructive" size="sm" className="flex-shrink-0">
                         <Trash2 className="mr-2 h-4 w-4" /> Clear
                     </Button>
                 </CardHeader>
                 <CardContent className="aspect-[2/1] p-0 overflow-hidden relative border rounded-b-lg">
                     <GraphEditor
                         // Pass the editorGraph state and its updater
                         graph={editorGraph}
                         onGraphChange={handleEditorGraphChange}
                         width={GRAPH_CANVAS_WIDTH}
                         height={GRAPH_CANVAS_HEIGHT}
                         readOnly={isPlaying} // Make editor read-only during visualization playback
                         mode={editorMode} // Pass current mode
                         onSetStartNode={handleSetStartNodeFromEditor} // Pass handler
                     />
                 </CardContent>
             </Card>
        )}


         {/* Visualization Area */}
         <Card className="flex-grow">
            <CardHeader>
                <CardTitle>Visualization</CardTitle>
                 <CardDescription className={cn("transition-opacity duration-300 min-h-[1.5em]", (steps.length > 0 || !isPlaying) ? 'opacity-100' : 'opacity-50')}>
                     {currentExplanation || '\u00A0'}
                </CardDescription>
            </CardHeader>
            <CardContent className="aspect-[2/1] p-0 overflow-hidden relative border rounded-b-lg">
                 <canvas
                    ref={canvasRef}
                    width={GRAPH_CANVAS_WIDTH}
                    height={GRAPH_CANVAS_HEIGHT}
                     className="absolute top-0 left-0 w-full h-full bg-transparent rounded-b-lg"
                 ></canvas>
             </CardContent>

         </Card>

         {/* Optional: DSU State Visualization for Kruskal's */}
         {algorithmId === 'kruskals-algorithm' && currentStepData && isGraphStep(currentStepData) && currentStepData.dsuState && (
             <Card>
                 <CardHeader><CardTitle className="text-lg">Disjoint Set State</CardTitle></CardHeader>
                 <CardContent className="text-xs overflow-x-auto bg-muted/50 p-2 rounded">
                     <div>
                        <strong>Parent pointers:</strong>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono">
                           {Object.entries(currentStepData.dsuState.parent).map(([node, parent]) => (
                               <span key={node}>{node} → {parent}{node === parent.toString() ? ' (root)' : ''}</span> // Compare node as string potentially
                           ))}
                        </div>
                     </div>
                     <Separator className="my-2" />
                      <div>
                        <strong>Ranks:</strong>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono">
                             {Object.entries(currentStepData.dsuState.rank).map(([node, rank]) => (
                                <span key={node}>{node}: {rank}</span>
                             ))}
                        </div>
                     </div>
                 </CardContent>
             </Card>
         )}
      </div>
    </div>
  );
}

