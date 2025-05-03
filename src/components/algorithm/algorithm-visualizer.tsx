"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Play, Pause, RotateCcw, FastForward, Shuffle as ShuffleIcon, Search as SearchIcon, Share2 as GraphIcon, Plus, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { AlgorithmStep, ArrayAlgorithmStep, GraphAlgorithmStep, Graph, Node, Edge } from '@/lib/types'; // Import types
import { isGraphStep, isArrayStep } from '@/lib/types'; // Import type guards

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
const NODE_RADIUS = 15;
const EDGE_WIDTH = 2;
const MST_EDGE_WIDTH = 4;

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

// Helper to generate a simple graph for testing
const generateRandomGraph = (numNodes = 7, edgeProbability = 0.4): Graph => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const width = 750; // Match canvas width roughly
    const height = 350; // Match canvas height roughly
    const padding = 50;

    // Generate node positions somewhat spread out
    for (let i = 0; i < numNodes; i++) {
        nodes.push({
            id: i,
            x: Math.random() * (width - 2 * padding) + padding,
            y: Math.random() * (height - 2 * padding) + padding,
        });
    }

    // Generate edges
    const edgeSet = new Set<string>(); // Avoid duplicate edges (e.g., 0-1 and 1-0)
    for (let i = 0; i < numNodes; i++) {
        for (let j = i + 1; j < numNodes; j++) {
            if (Math.random() < edgeProbability) {
                const weight = Math.floor(Math.random() * 20) + 1; // Weight between 1 and 20
                const edgeId = `${i}-${j}-${weight}`;
                 const reverseEdgeId = `${j}-${i}-${weight}`; // Check for reverse too, just in case

                 if (!edgeSet.has(edgeId) && !edgeSet.has(reverseEdgeId)) {
                     edges.push({ id: edgeId, source: i, target: j, weight });
                     edgeSet.add(edgeId);
                 }
            }
        }
    }

    // Ensure graph is connected (simple approach: add edges if needed)
     if (numNodes > 1 && edges.length < numNodes - 1) {
         const dsu = { parent: {} as Record<number, number> };
         nodes.forEach(n => dsu.parent[n.id] = n.id);
         const find = (k: number): number => {
             if (dsu.parent[k] === k) return k;
             return dsu.parent[k] = find(dsu.parent[k]);
         };
         const union = (a: number, b: number) => {
             const rootA = find(a);
             const rootB = find(b);
             if (rootA !== rootB) dsu.parent[rootA] = rootB;
         };
         edges.forEach(e => union(e.source, e.target));

         for(let i = 1; i < numNodes; i++){
             if(find(0) !== find(i)){
                 const weight = Math.floor(Math.random() * 20) + 1;
                 const edgeId = `connect-${0}-${i}-${weight}`;
                  if (!edgeSet.has(edgeId) && !edgeSet.has(`connect-${i}-${0}-${weight}`)) {
                     edges.push({ id: edgeId, source: 0, target: i, weight });
                     union(0, i);
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
  const [graphInput, setGraphInput] = useState<string>(JSON.stringify(graph, null, 2)); // For editing graph JSON

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

   const initializeGraph = useCallback(() => {
        const initialGraph = generateRandomGraph();
        setGraph(initialGraph);
        setGraphInput(JSON.stringify(initialGraph, null, 2));
        resetVisualization();
        setIsGenerated(true);
    }, []); // Removed resetVisualization from dependencies

  // Initialize based on category when component mounts or category/algorithm changes
  useEffect(() => {
     resetVisualization(); // Reset visualization state first
    if (category === 'sort' || category === 'search') {
      generateRandomArray();
    } else if (category === 'graph') {
      initializeGraph();
    }
     // Cleanup timeouts/intervals on unmount or change
    return () => {
      if (timeoutId.current) clearTimeout(timeoutId.current);
    };
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [algorithmId, category]); // Dependencies: algorithmId, category

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

    const parseGraphInput = (input: string): Graph | null => {
        try {
            const parsed = JSON.parse(input);
            // Basic validation (can be extended)
            if (!parsed || typeof parsed !== 'object') throw new Error("Invalid JSON format.");
            if (!Array.isArray(parsed.nodes)) throw new Error("Missing or invalid 'nodes' array.");
            if (!Array.isArray(parsed.edges)) throw new Error("Missing or invalid 'edges' array.");
            // TODO: Add more detailed validation for node/edge properties if needed
            return parsed as Graph;
        } catch (error: any) {
            toast({ title: "Invalid Graph Input", description: error.message || "Please enter valid JSON for the graph.", variant: "destructive" });
            return null;
        }
    };


  // --- Input Handling ---

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
     if (category === 'graph') {
         setGraphInput(event.target.value);
     } else {
        setInputValue(event.target.value);
     }
    setIsGenerated(false); // Mark as user input
  };

  const handleTargetChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTargetValue(event.target.value);
  };

    const handleSetData = () => {
        resetVisualization(); // Reset steps/playing state
        if (category === 'graph') {
            const parsedGraph = parseGraphInput(graphInput);
            if (parsedGraph) {
                setGraph(parsedGraph);
            }
        } else {
            const parsedArray = parseArrayInput(inputValue);
            if (parsedArray) {
                if (algorithmId === 'binary-search' && category === 'search') {
                    parsedArray.sort((a, b) => a - b);
                    setInputValue(parsedArray.join(", "));
                    toast({ title: "Array Sorted", description: "Binary Search requires a sorted array." });
                }
                setArray(parsedArray);
            }
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
           drawGraph(graph, [], []); // Draw initial graph state
        } else {
           drawArray(array); // Draw initial array state
        }
      });
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, array, graph]); // Depend on category and the relevant data structure


 const startVisualization = () => {
    const algorithmFunction = ALGORITHM_MAP[category]?.[algorithmId];
    if (!algorithmFunction) {
        toast({ title: "Error", description: "Algorithm not found.", variant: "destructive" });
        return;
    }

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
                currentArray.sort((a, b) => a - b);
                 // Check if sorting actually changed the user's input array
                 const originalInputArray = parseArrayInput(inputValue);
                if (originalInputArray && JSON.stringify(originalInputArray) !== JSON.stringify(currentArray)) {
                    toast({ title: "Array Sorted", description: "Input array sorted for Binary Search." });
                    setArray(currentArray);
                    setInputValue(currentArray.join(", "));
                 }
            }
            newSteps = algorithmFunction(currentArray, targetNum);
        } else if (category === 'graph') {
            if (!graph || graph.nodes.length === 0) throw new Error("Please provide a valid graph.");
            // Prim's might need a start node, Kruskal's doesn't. Pass graph directly.
            // Let the algorithm function handle specific needs.
            newSteps = algorithmFunction(graph);
        }

        if (newSteps.length > 0) {
            setSteps(newSteps);
            setCurrentStepIndex(0);
            setIsPlaying(true);
        } else {
             toast({ title: "Visualization Ready", description: "Generated 0 steps. Check input or algorithm.", variant: "default"});
        }
    } catch (error: any) {
        toast({ title: "Visualization Error", description: error.message || "Could not start visualization.", variant: "destructive" });
         resetVisualization();
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

    currentArrayState.forEach((value, index) => {
      const barHeight = Math.max(1, (value / maxVal) * (height * 0.85)); // Ensure barHeight is at least 1
      const x = spacing + index * (barWidth + spacing);
      const y = height - barHeight - 20; // Leave space at bottom for numbers

      // Determine bar color
      if (foundIndex === index) ctx.fillStyle = "hsl(var(--accent))"; // Found item (accent)
      else if (target === value && category === 'search') ctx.fillStyle = "#FFC107"; // Potential target
      else if (sortedIndices.includes(index)) ctx.fillStyle = "hsl(var(--secondary))"; // Sorted (secondary)
      else if (highlight.includes(index)) ctx.fillStyle = "hsl(var(--accent))"; // Highlighted (accent)
       else if (pivot === index) ctx.fillStyle = "#E91E63"; // Pivot (Pink) - Consider using a theme color?
      else ctx.fillStyle = "hsl(var(--primary))"; // Default (primary)

      ctx.fillRect(x, y, barWidth, barHeight);

       // Draw number below bar if space allows
      if (barWidth > 15) {
          ctx.fillStyle = "hsl(var(--foreground))"; // Use foreground color
          ctx.textAlign = "center";
          ctx.font = "12px Arial";
          ctx.fillText(value.toString(), x + barWidth / 2, height - 5);
      }
    });
  }, [category]); // Include category as dependency


  const drawGraph = useCallback((
        graphData: Graph,
        mstEdges: Edge[],
        highlightedNodes: number[] = [],
        highlightedEdges: string[] = [],
        candidateEdge?: Edge
    ) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { width, height } = canvas;
        ctx.clearRect(0, 0, width, height);

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

            // Styling
            if (mstEdgeIds.has(edge.id)) {
                ctx.strokeStyle = "hsl(var(--secondary))"; // MST Edge color (Teal)
                ctx.lineWidth = MST_EDGE_WIDTH;
                ctx.globalAlpha = 1.0;
            } else if (candidateEdge && edge.id === candidateEdge.id) {
                 // Check if candidate was accepted (is in mstEdges) or rejected
                 if (mstEdgeIds.has(candidateEdge.id)) {
                      ctx.strokeStyle = "hsl(var(--secondary))"; // Accepted candidate (already drawn as MST)
                      ctx.lineWidth = MST_EDGE_WIDTH;
                      ctx.globalAlpha = 1.0;
                 } else {
                     // Rejected or still considering candidate
                     ctx.strokeStyle = "hsl(var(--destructive))"; // Rejected/Considering Candidate Edge (Reddish)
                     ctx.lineWidth = EDGE_WIDTH * 1.5; // Slightly thicker
                     ctx.setLineDash([5, 5]); // Dashed line
                     ctx.globalAlpha = 0.8;
                 }
            } else if (highlightedEdgeIds.has(edge.id)) {
                 ctx.strokeStyle = "hsl(var(--primary))"; // Highlighted edge (Purple)
                 ctx.lineWidth = EDGE_WIDTH * 1.2;
                  ctx.globalAlpha = 0.9;
            }
             else {
                ctx.strokeStyle = "hsl(var(--muted-foreground))"; // Default edge color
                ctx.lineWidth = EDGE_WIDTH;
                 ctx.globalAlpha = 0.5; // More faded
            }

            ctx.stroke();
            ctx.setLineDash([]); // Reset line dash
             ctx.globalAlpha = 1.0; // Reset alpha

            // Draw edge weight
            const midX = (sourceNode.x + targetNode.x) / 2;
            const midY = (sourceNode.y + targetNode.y) / 2;
            ctx.fillStyle = ctx.strokeStyle; // Match text color to line color slightly faded
            ctx.globalAlpha = ctx.globalAlpha * 0.8; // Fade text slightly more
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
             // Simple offset to avoid overlap with node
            const angle = Math.atan2(targetNode.y - sourceNode.y, targetNode.x - sourceNode.x);
            const offsetX = Math.sin(angle) * 5;
            const offsetY = -Math.cos(angle) * 5;
            ctx.fillText(edge.weight.toString(), midX + offsetX, midY + offsetY);
             ctx.globalAlpha = 1.0; // Reset alpha
        });


        // --- Draw Nodes ---
        graphData.nodes.forEach(node => {
            ctx.beginPath();
            ctx.arc(node.x, node.y, NODE_RADIUS, 0, Math.PI * 2);

            // Styling
            if (highlightedNodeIds.has(node.id)) {
                ctx.fillStyle = "hsl(var(--accent))"; // Highlighted node (Orange)
                ctx.strokeStyle = "hsl(var(--accent-foreground))";
            } else if (mstEdges.some(e => e.source === node.id || e.target === node.id) || (mstEdges.length === 0 && highlightedNodeIds.has(node.id))) {
                 // Part of MST (or the single starting node)
                 ctx.fillStyle = "hsl(var(--primary))"; // Visited/MST node color (Purple)
                 ctx.strokeStyle = "hsl(var(--primary-foreground))";
            }
             else {
                ctx.fillStyle = "hsl(var(--muted))"; // Default node color
                ctx.strokeStyle = "hsl(var(--muted-foreground))";
            }
            ctx.lineWidth = 1.5;
            ctx.fill();
            ctx.stroke();


            // Draw node ID
            ctx.fillStyle = ctx.strokeStyle; // Match ID color to border
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(node.id.toString(), node.x, node.y);
        });

    }, []); // No dependencies needed if graphData is passed directly

  // --- Effects for Drawing and Animation ---

 useEffect(() => {
    if (steps.length === 0) {
         // Draw initial state when steps are cleared or component initializes
          requestAnimationFrame(() => {
             if (category === 'graph' && graph) {
                 drawGraph(graph, []);
             } else if (array) {
                 drawArray(array);
             }
          });
         return; // Exit early if no steps
     }


     const currentStep = steps[currentStepIndex];
     if (!currentStep) return; // Should not happen if steps.length > 0

    requestAnimationFrame(() => {
         if (isGraphStep(currentStep)) {
             const { graph: currentGraph, mstEdges, highlightedNodes, highlightedEdges, candidateEdge } = currentStep;
             drawGraph(currentGraph, mstEdges, highlightedNodes, highlightedEdges, candidateEdge);
         } else if (isArrayStep(currentStep)) {
             const { array: stepArray, highlight, pivot, sortedIndices, target, foundIndex } = currentStep;
             drawArray(stepArray, highlight, pivot, sortedIndices, target, foundIndex);
         }
    });

 }, [currentStepIndex, steps, drawArray, drawGraph, category, graph, array]);


   useEffect(() => {
    if (isPlaying && currentStepIndex < steps.length) {
      timeoutId.current = setTimeout(() => {
        setCurrentStepIndex((prevIndex) => prevIndex + 1);
      }, speed);
    } else if (isPlaying && currentStepIndex >= steps.length) {
        setIsPlaying(false); // Stop playing when finished
         // Ensure the last step message is displayed
         const lastStepMessage = steps[steps.length -1]?.message || "Finished.";
         toast({ title: "Visualization Complete", description: lastStepMessage });
         // Explicitly draw the final state
          requestAnimationFrame(() => {
             const finalStep = steps[steps.length - 1];
             if (finalStep) {
                  if (isGraphStep(finalStep)) {
                      drawGraph(finalStep.graph, finalStep.mstEdges, finalStep.highlightedNodes, finalStep.highlightedEdges, finalStep.candidateEdge);
                  } else if (isArrayStep(finalStep)) {
                      drawArray(finalStep.array, finalStep.highlight, finalStep.pivot, finalStep.sortedIndices, finalStep.target, finalStep.foundIndex);
                  }
             }
         });

    }

    // Cleanup timeout on pause, finish, or speed change
    return () => {
      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
      }
    };
  }, [isPlaying, currentStepIndex, steps, speed, toast, drawGraph, drawArray]);


  // --- Event Handlers ---

  const handlePlayPause = () => {
    if (steps.length === 0) {
        startVisualization(); // Start if no steps exist yet
    } else if (currentStepIndex >= steps.length) {
        // If finished, restart from the beginning
        setCurrentStepIndex(0);
        setIsPlaying(true);
    }
     else {
       setIsPlaying(!isPlaying);
    }
  };

  const handleReset = () => {
     resetVisualization(); // Resets steps, playing state, and draws initial state via useEffect
     // No need to explicitly draw here, resetVisualization handles it
  };

  const handleSpeedChange = (value: number[]) => {
    setSpeed(MAX_SPEED + MIN_SPEED - value[0]);
  };


  // --- Render ---

  const currentExplanation = steps[currentStepIndex]?.message || (steps.length > 0 && currentStepIndex >= steps.length ? steps[steps.length -1]?.message : "Ready to visualize.");
  const isGraphCategory = category === 'graph';


  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Controls Column */}
      <Card className="w-full lg:w-1/3 xl:w-1/4"> {/* Adjusted width */}
        <CardHeader>
          <CardTitle>Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Input Section - Conditional */}
          {isGraphCategory ? (
            <div className="space-y-2">
                <Label htmlFor="graph-input">Graph Data (JSON)</Label>
                <textarea
                    id="graph-input"
                    value={graphInput}
                    onChange={handleInputChange}
                    placeholder='Enter graph JSON: { "nodes": [...], "edges": [...] }'
                    className="h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                 <div className="flex gap-2">
                    <Button onClick={handleSetData} variant="secondary" size="sm" className="flex-grow">Set Graph</Button>
                     <Button onClick={initializeGraph} variant="outline" size="sm">
                         <GraphIcon className="mr-2 h-4 w-4" /> Random
                     </Button>
                 </div>
            </div>
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
                  <Button onClick={handleSetData} variant="secondary" size="sm">Set</Button>
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
                    <p className="text-xs text-muted-foreground">(Input array will be sorted automatically if needed)</p>
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
          <div className="flex justify-center space-x-2 mt-4">
            <Button onClick={handlePlayPause} variant="default" size="icon" aria-label={isPlaying ? "Pause" : "Play/Restart"}>
              {isPlaying ? <Pause className="h-5 w-5"/> : <Play className="h-5 w-5"/>}
            </Button>
            <Button onClick={handleReset} variant="outline" size="icon" aria-label="Reset">
              <RotateCcw className="h-5 w-5"/>
            </Button>
             {/* Add Previous/Next Step Buttons? */}
              {/* <Button onClick={() => setCurrentStepIndex(s => Math.max(0, s - 1))} variant="outline" size="icon" disabled={currentStepIndex === 0 || isPlaying}><Minus className="h-5 w-5"/></Button>
             <Button onClick={() => setCurrentStepIndex(s => Math.min(steps.length -1 , s + 1))} variant="outline" size="icon" disabled={currentStepIndex >= steps.length -1 || isPlaying}><Plus className="h-5 w-5"/></Button> */}
          </div>
        </CardContent>
      </Card>

      {/* Visualization Column */}
      <div className="flex-grow flex flex-col gap-4 lg:w-2/3 xl:w-3/4"> {/* Adjusted width */}
         <Card className="flex-grow">
            <CardHeader>
                <CardTitle>Visualization</CardTitle>
                <CardDescription className={cn("transition-opacity duration-300 min-h-[1.2em]", steps.length > 0 ? 'opacity-100' : 'opacity-50')}>
                     {/* Use a non-breaking space or min-height to prevent layout shift */}
                     {currentExplanation || '\u00A0'}
                </CardDescription>
            </CardHeader>
            <CardContent className="aspect-[2/1] p-0 overflow-hidden relative"> {/* Maintain aspect ratio */}
                 <canvas
                    ref={canvasRef}
                    width="800" // Intrinsic width
                    height="400" // Intrinsic height
                    className="absolute top-0 left-0 w-full h-full bg-muted/30 rounded-b-lg border-t"
                 ></canvas>
            </CardContent>
         </Card>
         {/* Optional: DSU State Visualization for Kruskal's */}
         {algorithmId === 'kruskals-algorithm' && isGraphStep(steps[currentStepIndex] || {}) && steps[currentStepIndex]?.dsuState && (
             <Card>
                 <CardHeader><CardTitle className="text-lg">Disjoint Set State</CardTitle></CardHeader>
                 <CardContent className="text-xs overflow-x-auto">
                     <pre>Parent: {JSON.stringify(steps[currentStepIndex].dsuState?.parent)}</pre>
                     <pre>Rank:   {JSON.stringify(steps[currentStepIndex].dsuState?.rank)}</pre>
                 </CardContent>
             </Card>
         )}
      </div>
    </div>
  );
}
