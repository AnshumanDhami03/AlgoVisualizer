
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Play, Pause, RotateCcw, Shuffle as ShuffleIcon, Search as SearchIcon, Share2 as GraphIcon, Target, Trash2, CircleDot, Waypoints, LocateFixed, Info } from "lucide-react"; // Added Info icon
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { AlgorithmStep, ArrayAlgorithmStep, GraphAlgorithmStep, Graph, Node, Edge } from '@/lib/types';
import { isGraphStep, isArrayStep } from '@/lib/types';
import GraphEditor from './graph-editor';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group" // Import ToggleGroup
import { useIsMobile } from '@/hooks/use-mobile'; // Import hook
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"; // Import Tooltip components

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

// Time Complexity Data
import { ALGORITHM_COMPLEXITIES } from '@/lib/algorithms/complexities';
import type { AlgorithmComplexity } from '@/lib/algorithms/complexities';


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
const NODE_RADIUS = 18; // Slightly smaller node radius for better spacing
const EDGE_WIDTH = 1.5; // Slightly thinner edge
const MST_EDGE_WIDTH = 3; // Slightly thinner MST edge
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
const generateRandomGraph = (numNodes = 7, edgeDensity = 0.35, canvasWidth = 800, canvasHeight = 400): Graph => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const padding = NODE_RADIUS * 3; // Padding around edges
    const minNodeDistance = NODE_RADIUS * 6; // Increased minimum distance between nodes

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
                    const edgeId = `edge-${i}-${j}-${weight}-${Date.now() % 10000}`;
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
            for (let i = 0; i < components.length - 1; i++) {
                const compA = components[i];
                const compB = components[i + 1];
                const nodeAId = compA[Math.floor(Math.random() * compA.length)];
                const nodeBId = compB[Math.floor(Math.random() * compB.length)];
                const canonicalEdgeId = nodeAId < nodeBId ? `${nodeAId}-${nodeBId}` : `${nodeBId}-${nodeAId}`;

                if (!edgeSet.has(canonicalEdgeId)) {
                    const weight = Math.floor(Math.random() * 15) + 5;
                    const edgeId = `connect-${nodeAId}-${nodeBId}-${weight}-${Date.now() % 10000}`;
                    edges.push({ id: edgeId, source: nodeAId, target: nodeBId, weight });
                    edgeSet.add(canonicalEdgeId);
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
  const [visualizerGraph, setVisualizerGraph] = useState<Graph>(() => generateRandomGraph()); // Visualizer starts with random graph
  const [startNode, setStartNode] = useState<number | null>(null);
  const [editorMode, setEditorMode] = useState<GraphEditorMode>('node'); // State for editor mode

  // Common State
  const [steps, setSteps] = useState<AlgorithmStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(DEFAULT_SPEED);
  const [isUsingEditorGraph, setIsUsingEditorGraph] = useState<boolean>(false); // Track which graph source is used for visualization
  const visualizationCanvasRef = useRef<HTMLCanvasElement>(null);
  const [visCanvasSize, setVisCanvasSize] = useState({ width: 800, height: 400 });
  const visualizationContainerRef = useRef<HTMLDivElement>(null); // Ref for container
  const timeoutId = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const complexity = ALGORITHM_COMPLEXITIES[algorithmId];


  // --- Dynamic Canvas Sizing for Visualization Canvas ---
  useEffect(() => {
    const canvas = visualizationCanvasRef.current;
    const container = visualizationContainerRef.current;
    if (!canvas || !container) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width } = entry.contentRect;
         // Calculate height based on aspect ratio (e.g., 16:9 or 2:1 for wider)
        const height = width / (isMobile ? 1.5 : 2.0); // Adjust aspect ratio based on device
        setVisCanvasSize({ width, height });
        canvas.width = width;
        canvas.height = height;
      }
    });

    resizeObserver.observe(container);

    // Initial size setting
    const initialWidth = container.clientWidth;
    const initialHeight = initialWidth / (isMobile ? 1.5 : 2.0);
    setVisCanvasSize({ width: initialWidth, height: initialHeight });
    canvas.width = initialWidth;
    canvas.height = initialHeight;

    return () => resizeObserver.disconnect();
  }, [isMobile]); // Rerun on mobile state change

  // --- Drawing Functions ---

    const drawArray = useCallback((
        currentArrayState: number[],
        highlight: number[] = [],
        pivot?: number,
        sortedIndices: number[] = [],
        target?: number,
        foundIndex?: number
        ) => {
    const canvas = visualizationCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = visCanvasSize; // Use dynamic canvas size
    ctx.clearRect(0, 0, width, height);

    const n = currentArrayState.length;
    if (n === 0) return;

    const spacing = isMobile ? 3 : 4; // Less spacing on mobile
    const totalSpacing = (n + 1) * spacing;
    const availableWidth = width - totalSpacing;
    const barWidth = Math.max(1, availableWidth / n);
    const maxVal = Math.max(...currentArrayState, 1); // Ensure maxVal is at least 1

    const computedStyle = getComputedStyle(document.documentElement);
    const primaryColor = computedStyle.getPropertyValue('--primary').trim();
    const secondaryColor = computedStyle.getPropertyValue('--secondary').trim();
    const accentColor = computedStyle.getPropertyValue('--accent').trim();
    const foregroundColor = computedStyle.getPropertyValue('--foreground').trim();

    currentArrayState.forEach((value, index) => {
      const barHeight = Math.max(1, (value / maxVal) * (height * 0.85));
      const x = spacing + index * (barWidth + spacing);
      const y = height - barHeight - (barWidth > 10 ? 20 : 5); // Adjust Y based on label visibility

      if (foundIndex === index) ctx.fillStyle = `hsl(${accentColor})`;
      else if (target === value && category === 'search' && !sortedIndices.includes(index)) ctx.fillStyle = TARGET_POTENTIAL_COLOR;
      else if (sortedIndices.includes(index)) ctx.fillStyle = `hsl(${secondaryColor})`;
      else if (highlight.includes(index)) ctx.fillStyle = `hsl(${accentColor})`;
       else if (pivot === index) ctx.fillStyle = PIVOT_COLOR;
      else ctx.fillStyle = `hsl(${primaryColor})`;

      ctx.fillRect(x, y, barWidth, barHeight);

       // Draw value text only if bar width is sufficient
       if (barWidth > 10) { // Reduced threshold for showing label
          ctx.fillStyle = `hsl(${foregroundColor})`;
          ctx.textAlign = "center";
          ctx.font = isMobile ? "10px Arial" : "12px Arial"; // Smaller font on mobile
          ctx.fillText(value.toString(), x + barWidth / 2, height - 5);
      }
    });
  }, [category, visCanvasSize, isMobile]); // Added isMobile dependency


    const drawGraphVisualization = useCallback((
        graphData: Graph,
        mstEdges: Edge[] = [],
        highlightedNodes: number[] = [],
        highlightedEdges: string[] = [],
        candidateEdge?: Edge,
        persistentStartNodeId?: number
    ) => {
        const canvas = visualizationCanvasRef.current;
        if (!canvas || !graphData || graphData.nodes.length === 0) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { width, height } = visCanvasSize; // Use dynamic canvas size
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
            ctx.font = `bold ${isMobile ? '10px' : '11px'} Arial`; // Smaller font on mobile
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            const angle = Math.atan2(targetNode.y - sourceNode.y, targetNode.x - sourceNode.x);
            const offsetDist = 12; // Distance to offset text
            const offsetX = Math.sin(angle) * offsetDist; // Offset perpendicular to edge
            const offsetY = -Math.cos(angle) * offsetDist;
            const text = edge.weight.toString();
            const textWidth = ctx.measureText(text).width;
            const textHeight = isMobile ? 9 : 10; // Approximate height

            // Draw a small background rectangle behind the text for better visibility
            ctx.fillStyle = `hsl(${backgroundColor})`;
            ctx.globalAlpha = 0.9;
            ctx.fillRect(midX + offsetX - textWidth/2 - 2, midY + offsetY - textHeight - 1, textWidth + 4, textHeight + 2);
             ctx.fillStyle = edgeColor; // Use the edge's color for the text
             ctx.globalAlpha = 1.0; // Reset alpha
            ctx.fillText(text, midX + offsetX, midY + offsetY);
             ctx.globalAlpha = 1.0; // Ensure alpha is reset
        });


        // --- Draw Nodes ---
        graphData.nodes.forEach(node => {
            ctx.beginPath();
            ctx.arc(node.x, node.y, NODE_RADIUS, 0, Math.PI * 2);

             if (node.id === persistentStartNodeId) {
                 ctx.fillStyle = START_NODE_COLOR; // Specific color for the designated start node
             } else if (highlightedNodeIds.has(node.id)) {
                ctx.fillStyle = `hsl(${accentColor})`; // Highlight active nodes
             } else if (mstEdges.some(e => e.source === node.id || e.target === node.id) ) {
                 ctx.fillStyle = `hsl(${primaryColor})`;
            } else {
                ctx.fillStyle = `hsl(${mutedColor})`; // Default state
            }
            ctx.fill();

            let strokeColor = `hsl(${mutedFgColor})`;
             let strokeWidth = 1.5;
             if (node.id === persistentStartNodeId) {
                 strokeColor = `hsl(${accentFgColor})`;
                 strokeWidth = 2.5;
             } else if (highlightedNodeIds.has(node.id)) {
                 strokeColor = `hsl(${accentFgColor})`;
             } else if (mstEdges.some(e => e.source === node.id || e.target === node.id)) {
                  strokeColor = `hsl(${primaryFgColor})`;
             }
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = strokeWidth;
            ctx.stroke();

            ctx.fillStyle = strokeColor;
            ctx.font = `bold ${isMobile ? '11px' : '13px'} Arial`; // Smaller font on mobile
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(node.id.toString(), node.x, node.y);
        });

    }, [visCanvasSize, isMobile]); // Added isMobile dependency

  const resetVisualization = useCallback((graphToDraw?: Graph) => {
    setIsPlaying(false);
    setSteps([]);
    setCurrentStepIndex(0);
    if (timeoutId.current) clearTimeout(timeoutId.current);
    timeoutId.current = null;

    const activeGraph = graphToDraw ?? (isUsingEditorGraph ? editorGraph : visualizerGraph);

    requestAnimationFrame(() => {
        const canvas = visualizationCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
         const { width, height } = canvas; // Get current canvas dimensions

        if (category === 'graph') {
            if (activeGraph && activeGraph.nodes.length > 0) {
                let persistentStartId: number | undefined = undefined;
                if (algorithmId === 'prims-algorithm') {
                    if (startNode !== null && activeGraph.nodes.some(n => n.id === startNode)) {
                        persistentStartId = startNode;
                    } else if (activeGraph.nodes.length > 0) {
                         persistentStartId = activeGraph.nodes[0].id;
                    }
                }
                drawGraphVisualization(activeGraph, [], [], [], undefined, persistentStartId);
            } else {
                ctx.clearRect(0, 0, width, height);
            }
        } else if (category === 'sort' || category === 'search') {
           if (array && array.length > 0) {
               drawArray(array);
           } else {
                ctx.clearRect(0, 0, width, height);
           }
        }
    });

  }, [category, array, editorGraph, visualizerGraph, isUsingEditorGraph, startNode, algorithmId, drawArray, drawGraphVisualization]);

  // --- Input Handling Logic moved above its usage in handleSetStartNodeFromEditor ---
  const handleSetStartNodeFromEditor = useCallback((nodeId: number) => {
    if (algorithmId !== 'prims-algorithm') {
        toast({ title: "Action Unavailable", description: "Setting a source node directly is only needed for Prim's algorithm.", variant: "default" });
        return;
    }
    if (editorGraph.nodes.some(n => n.id === nodeId)) {
        setStartNode(nodeId);
         setIsUsingEditorGraph(true); // Assume user wants to visualize the editor graph now
        resetVisualization(editorGraph); // Now safe to call resetVisualization
        toast({ title: "Start Node Set", description: `Node ${nodeId} selected as the start node for Prim's algorithm on the workspace graph.` });
        setEditorMode('node');
    } else {
        toast({ title: "Invalid Node", description: `Node ${nodeId} does not exist in the workspace graph.`, variant: "destructive" });
    }
 }, [algorithmId, editorGraph, toast, resetVisualization]); // Add resetVisualization to dependency array


  // --- Initialization and Reset ---

  const generateRandomArray = useCallback((size: number = DEFAULT_ARRAY_SIZE) => {
    const newArray = Array.from({ length: size }, () => Math.floor(Math.random() * 100) + 1);
    setArray(newArray);
    setInputValue(newArray.join(", "));
    resetVisualization();
    setIsUsingEditorGraph(false); // Reset graph source flag
  }, [resetVisualization]);

   const initializeRandomGraphForVisualizer = useCallback(() => {
        const { width, height } = visCanvasSize; // Use current canvas size
        const randomGraph = generateRandomGraph(isMobile ? 5 : 7, 0.35, width, height);
        setVisualizerGraph(randomGraph);
        setStartNode(randomGraph.nodes.length > 0 ? randomGraph.nodes[0].id : null);
        resetVisualization(randomGraph);
        setIsUsingEditorGraph(false);
    }, [resetVisualization, visCanvasSize.width, visCanvasSize.height, isMobile]);

   const clearGraphWorkspace = useCallback(() => {
        const emptyGraph = { nodes: [], edges: [] };
        setEditorGraph(emptyGraph);
        setStartNode(null);
        resetVisualization(emptyGraph);
        setIsUsingEditorGraph(true); // Switch to visualizing the (now empty) workspace
        toast({ title: "Workspace Cleared", description: "Graph editor has been reset." });
    }, [resetVisualization, toast]);

  useEffect(() => {
     resetVisualization();
    if (category === 'sort' || category === 'search') {
      generateRandomArray();
      setEditorMode('node');
    } else if (category === 'graph') {
       setEditorGraph({ nodes: [], edges: [] }); // Start with empty editor
       initializeRandomGraphForVisualizer(); // Initialize visualizer with a random graph
       setEditorMode('node');
        if (algorithmId !== 'prims-algorithm' && editorMode === 'set-source') {
            setEditorMode('node');
        }
    }
    return () => {
      if (timeoutId.current) clearTimeout(timeoutId.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [algorithmId, category]);


   useEffect(() => {
       const activeGraph = isUsingEditorGraph ? editorGraph : visualizerGraph;
       if (category === 'graph' && algorithmId === 'prims-algorithm' && activeGraph.nodes.length > 0) {
            const currentStartNodeValid = startNode !== null && activeGraph.nodes.some(n => n.id === startNode);
            if (!currentStartNodeValid) {
                 setStartNode(activeGraph.nodes[0].id);
            }
       }
       else if (category !== 'graph' || algorithmId !== 'prims-algorithm' || activeGraph.nodes.length === 0) {
            if (startNode !== null) setStartNode(null);
       }

   }, [editorGraph, visualizerGraph, isUsingEditorGraph, category, startNode, algorithmId]);


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

  const handleEditorGraphChange = useCallback((newGraph: Graph) => {
      setEditorGraph(newGraph);
      // Only reset visualization if the editor graph is currently being visualized
      if (isUsingEditorGraph) {
         resetVisualization(newGraph);
      }
      // If user starts editing, assume they want to visualize this graph NEXT time they press play
      // setIsUsingEditorGraph(true); // We set this when 'Use Workspace Graph' is clicked

      if (algorithmId === 'prims-algorithm') {
           const startNodeValid = startNode !== null && newGraph.nodes.some(n => n.id === startNode);
           if (!startNodeValid && newGraph.nodes.length > 0) {
               setStartNode(newGraph.nodes[0].id);
           } else if (newGraph.nodes.length === 0) {
               setStartNode(null);
           }
       } else {
            setStartNode(null);
       }
  }, [resetVisualization, startNode, algorithmId, isUsingEditorGraph]);


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
            // Redraw with new array
            requestAnimationFrame(() => drawArray(parsedArray));
        }
    };

   const handleStartNodeChange = (value: string) => {
       if (algorithmId !== 'prims-algorithm') return;

       const activeGraph = isUsingEditorGraph ? editorGraph : visualizerGraph;
       // Handle "no-nodes" selection explicitly
       if (value === "no-nodes" || value === "") {
          setStartNode(null);
          resetVisualization(activeGraph);
          return;
       }

       const nodeId = parseInt(value, 10);
       if (!isNaN(nodeId) && activeGraph.nodes.some(n => n.id === nodeId)) {
           setStartNode(nodeId);
           resetVisualization(activeGraph); // Reset visualization with the active graph
       } else {
            let newStartNode : number | null = null;
            if (activeGraph.nodes.length > 0) {
                newStartNode = activeGraph.nodes[0].id;
            }
           setStartNode(newStartNode); // Fallback to first or null
           resetVisualization(activeGraph);
           if (value !== "no-nodes") { // Avoid toast if selection was disabled item
             toast({title: "Invalid Selection", description:"Selected start node doesn't exist in the current graph. Resetting.", variant: "destructive"})
           }
       }
   };




    const handleEditorModeChange = (value: GraphEditorMode | null) => {
        if (value) {
             if (value === 'set-source' && algorithmId !== 'prims-algorithm') {
                 toast({ title: "Mode Unavailable", description: "'Set Source Node' mode is only for Prim's algorithm.", variant: "default" });
                 return;
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

    const graphToVisualize = isUsingEditorGraph ? editorGraph : visualizerGraph;

    resetVisualization(graphToVisualize); // Reset and draw initial state of the chosen graph

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
            if (!graphToVisualize || graphToVisualize.nodes.length === 0) {
                toast({ title: "Empty Graph", description: `Cannot visualize - ${isUsingEditorGraph ? 'workspace graph is empty.' : 'random graph generation failed.'}`, variant: "destructive" });
                return;
             }

            let currentStartNodeIdForAlgo = startNode;

            if (algorithmId === 'prims-algorithm') {
                 if (currentStartNodeIdForAlgo === null || !graphToVisualize.nodes.some(n => n.id === currentStartNodeIdForAlgo)) {
                    currentStartNodeIdForAlgo = graphToVisualize.nodes[0]?.id ?? null;
                     if (currentStartNodeIdForAlgo === null) {
                         throw new Error("Graph has no nodes to select a start node from.");
                     }
                     if(startNode !== currentStartNodeIdForAlgo) {
                         setStartNode(currentStartNodeIdForAlgo);
                     }
                     toast({title: "Start Node Selected", description: `Using node ${currentStartNodeIdForAlgo} as start node for Prim's.`});
                 }

                 if (currentStartNodeIdForAlgo === null) {
                    throw new Error("Cannot run Prim's without a valid start node.");
                 }
                newSteps = algorithmFunction(graphToVisualize, currentStartNodeIdForAlgo);
            } else { // Kruskal's
                 newSteps = algorithmFunction(graphToVisualize);
            }
        }

        if (newSteps.length > 0) {
            setSteps(newSteps);
            setCurrentStepIndex(0);
            setIsPlaying(true);
             // Draw first step immediately after setting state
             requestAnimationFrame(() => {
                const firstStep = newSteps[0];
                 if (firstStep) {
                    if (isGraphStep(firstStep)) {
                        const persistentStartId = (algorithmId === 'prims-algorithm') ? (firstStep.startNodeId ?? startNode ?? undefined) : undefined;
                        drawGraphVisualization(firstStep.graph, firstStep.mstEdges, firstStep.highlightedNodes, firstStep.highlightedEdges, firstStep.candidateEdge, persistentStartId);
                    } else if (isArrayStep(firstStep)) {
                        drawArray(firstStep.array, firstStep.highlight, firstStep.pivot, firstStep.sortedIndices, firstStep.target, firstStep.foundIndex);
                    }
                 }
             });

        } else {
             toast({ title: "No Steps", description: "Algorithm generated 0 steps. Check input or algorithm.", variant: "default"});
             resetVisualization(graphToVisualize);
        }
    } catch (error: any) {
        toast({ title: "Visualization Error", description: error.message || "Could not start visualization.", variant: "destructive" });
         resetVisualization(graphToVisualize);
    }
};


 // --- Effects for Drawing and Animation ---

 useEffect(() => {
     if (!steps || steps.length === 0 || currentStepIndex < 0 || currentStepIndex >= steps.length) {
         requestAnimationFrame(() => {
             const activeGraph = isUsingEditorGraph ? editorGraph : visualizerGraph;
             if (category === 'graph') {
                if (activeGraph && activeGraph.nodes.length > 0) {
                    let persistentStartId: number | undefined = undefined;
                    if (algorithmId === 'prims-algorithm') {
                         if (startNode !== null && activeGraph.nodes.some(n => n.id === startNode)) {
                             persistentStartId = startNode;
                         } else if (activeGraph.nodes.length > 0) {
                             persistentStartId = activeGraph.nodes[0].id;
                         }
                    }
                    drawGraphVisualization(activeGraph, [], [], [], undefined, persistentStartId);
                } else {
                     const canvas = visualizationCanvasRef.current;
                     if (canvas) {
                         const ctx = canvas.getContext('2d');
                         if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
                     }
                }
             } else if ((category === 'sort' || category === 'search') && array && array.length > 0) {
                 drawArray(array);
             } else {
                 const canvas = visualizationCanvasRef.current;
                  if (canvas) {
                      const ctx = canvas.getContext('2d');
                      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
                  }
             }
         });
         return;
     }


     let currentStep = steps[currentStepIndex];
     if (!currentStep) return;

    requestAnimationFrame(() => {
         if (isGraphStep(currentStep)) {
             const { graph: stepGraph, mstEdges, highlightedNodes, highlightedEdges, candidateEdge, startNodeId: stepStartNodeId } = currentStep;
             const currentPersistentStartId = (algorithmId === 'prims-algorithm') ? (stepStartNodeId ?? startNode ?? undefined) : undefined;
             drawGraphVisualization(stepGraph, mstEdges, highlightedNodes, highlightedEdges, candidateEdge, currentPersistentStartId);
         } else if (isArrayStep(currentStep)) {
             const { array: stepArray, highlight, pivot, sortedIndices, target, foundIndex } = currentStep;
             drawArray(stepArray, highlight, pivot, sortedIndices, target, foundIndex);
         }
    });

 }, [currentStepIndex, steps, drawArray, drawGraphVisualization, category, editorGraph, visualizerGraph, isUsingEditorGraph, array, startNode, algorithmId]);


   useEffect(() => {
    if (isPlaying && currentStepIndex < steps.length -1) {
      timeoutId.current = setTimeout(() => {
        setCurrentStepIndex((prevIndex) => prevIndex + 1);
      }, speed);
    } else if (isPlaying && currentStepIndex >= steps.length - 1 && steps.length > 0) {
        setIsPlaying(false);
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
        setCurrentStepIndex(0);
        setIsPlaying(true);
             requestAnimationFrame(() => {
                const firstStep = steps[0];
                if (firstStep) {
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
       setIsPlaying(!isPlaying);
    }
  };

  const handleReset = () => {
     if (category === 'graph') {
           const graphToResetTo = isUsingEditorGraph ? editorGraph : visualizerGraph;
           resetVisualization(graphToResetTo);
     } else {
         const currentArray = parseArrayInput(inputValue);
         if (currentArray) {
            setArray(currentArray);
            resetVisualization(); // drawArray will be called inside resetVisualization
             requestAnimationFrame(() => drawArray(currentArray)); // Explicit draw after state set
         } else {
             generateRandomArray(DEFAULT_ARRAY_SIZE);
         }
     }
  };


  const handleRandomizeGraph = () => {
      initializeRandomGraphForVisualizer();
      setIsUsingEditorGraph(false);
  }

  const handleSpeedChange = (value: number[]) => {
    setSpeed(MAX_SPEED + MIN_SPEED - value[0]);
  };


  // --- Render ---

   const currentStepData = (steps && currentStepIndex >= 0 && currentStepIndex < steps.length) ? steps[currentStepIndex] : null;
   let currentExplanation = "Ready to visualize.";

   if (isPlaying && currentStepData) {
       currentExplanation = currentStepData.message;
   } else if (!isPlaying && steps.length > 0) {
       const indexToShow = currentStepIndex < steps.length ? currentStepIndex : steps.length - 1;
       const stepToShow = (indexToShow >= 0 && indexToShow < steps.length) ? steps[indexToShow] : null;
       currentExplanation = stepToShow?.message || "Finished.";
   }


  const isGraphCategory = category === 'graph';
  const activeGraph = isUsingEditorGraph ? editorGraph : visualizerGraph;

  const getWorkspaceDescription = () => {
        switch (editorMode) {
            case 'node': return "Click/Tap to add nodes. Drag nodes to move.";
            case 'edge': return "Desktop: Drag between nodes. Mobile: Tap two nodes. Click/Tap edge to edit/delete.";
            case 'set-source': return "Click/Tap on a node to set it as the source (for Prim's).";
            default: return "Graph Workspace";
        }
    };


  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
      {/* Controls Column */}
      <Card className="w-full lg:w-1/3 xl:w-1/4 flex-shrink-0">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Controls
             {complexity && (
               <TooltipProvider>
                 <Tooltip>
                    <TooltipTrigger asChild>
                       <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground">
                           <Info className="h-4 w-4" />
                       </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" align="end" className="max-w-[250px] text-xs">
                       <p className="font-semibold mb-1">Time Complexity:</p>
                       <ul className="list-disc list-inside space-y-0.5">
                          <li>Best: {complexity.best}</li>
                          <li>Average: {complexity.average}</li>
                          <li>Worst: {complexity.worst}</li>
                          {complexity.space && <li>Space: {complexity.space}</li>}
                       </ul>
                       <p className="mt-2 text-muted-foreground text-[10px]">
                            {category === 'graph' ? "(V=Nodes, E=Edges)" : "(n=Input size)"}
                        </p>
                    </TooltipContent>
                 </Tooltip>
               </TooltipProvider>
             )}
          </CardTitle>
           <CardDescription>Adjust algorithm parameters and control playback.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Input Section - Conditional */}
          {isGraphCategory ? (
             // Graph controls
              <div className="space-y-3">
                  <Button
                      onClick={() => {
                          if (editorGraph.nodes.length === 0) {
                              toast({ title: "Empty Workspace", description: "Cannot visualize an empty graph from the workspace.", variant: "destructive" });
                              return;
                          }
                          setIsUsingEditorGraph(true);
                          resetVisualization(editorGraph);
                          toast({ title: "Using Workspace Graph", description: "Visualization will now use the graph from the workspace." });
                      }}
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      disabled={editorGraph.nodes.length === 0 || isUsingEditorGraph}
                  >
                      Use Workspace Graph
                  </Button>
                  <Button
                        onClick={handleRandomizeGraph}
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled={!isUsingEditorGraph}
                   >
                      <ShuffleIcon className="mr-2 h-4 w-4" /> Use Random Graph
                  </Button>


                 {algorithmId === 'prims-algorithm' && (
                    <>
                    <Separator />
                     <Label htmlFor="start-node-select">Start Node (Prim's)</Label>
                     <div className="flex gap-2">
                     <Select
                        value={startNode !== null ? startNode.toString() : ""}
                        onValueChange={handleStartNodeChange}
                        disabled={!activeGraph || activeGraph.nodes.length === 0}
                     >
                       <SelectTrigger id="start-node-select" className="flex-grow">
                         <SelectValue placeholder="Select node..." />
                       </SelectTrigger>
                       <SelectContent>
                           {activeGraph && activeGraph.nodes.length > 0 ? (
                                [...activeGraph.nodes].sort((a, b) => a.id - b.id).map(node => (
                                    <SelectItem key={node.id} value={node.id.toString()}>
                                        Node {node.id}
                                    </SelectItem>
                                ))
                            ) : (
                                <SelectItem value="no-nodes" disabled>No nodes available</SelectItem>
                            )
                           }
                       </SelectContent>
                     </Select>
                     </div>
                     </>
                 )}
                  <Separator />
                   <p className="text-sm text-muted-foreground text-center">
                       {isUsingEditorGraph
                           ? "Visualizing graph from workspace."
                           : "Visualizing randomly generated graph."
                       }
                   </p>
             </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="array-input">Array ({MIN_ARRAY_SIZE}-{MAX_ARRAY_SIZE} elements, 1-100)</Label>
                <div className="flex gap-2">
                  <Input
                    id="array-input"
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    placeholder="e.g., 5, 3, 8, 1, 9"
                    className="flex-grow min-w-0"
                  />
                  <Button onClick={handleSetArrayData} variant="secondary" size="sm" className="flex-shrink-0">Set</Button>
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
             </div>
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
              className="my-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Slow</span>
              <span>Fast</span>
            </div>
          </div>

          {/* Playback Controls */}
           <div className="flex items-center justify-center space-x-2 pt-2">
              <Button
                    onClick={handlePlayPause}
                    variant="default"
                    size="icon"
                    aria-label={isPlaying ? "Pause" : (steps.length > 0 && currentStepIndex < steps.length -1 ? "Play" : "Start/Restart")}
                    disabled={(isGraphCategory && (!activeGraph || activeGraph.nodes.length === 0)) || (!isGraphCategory && array.length === 0)}
               >
                   {isPlaying ? <Pause className="h-5 w-5"/> : <Play className="h-5 w-5"/>}
               </Button>
               <Button
                    onClick={handleReset}
                    variant="outline"
                    size="icon"
                    aria-label="Reset Visualization"
                    disabled={(isGraphCategory && (!activeGraph || activeGraph.nodes.length === 0)) || (!isGraphCategory && array.length === 0)}
                >
                   <RotateCcw className="h-5 w-5"/>
               </Button>
           </div>
        </CardContent>
      </Card>

      {/* Main Content Area (Workspace + Visualization) */}
      <div className="flex-grow flex flex-col gap-4 lg:gap-6 min-w-0">

        {/* Conditional Rendering for Graph Workspace */}
        {isGraphCategory && (
             <Card>
                 <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 flex-wrap pb-3 pt-4 px-4 sm:px-6">
                     <div className="flex-grow min-w-[150px]">
                        <CardTitle className="text-xl lg:text-2xl">Graph Workspace</CardTitle>
                         <CardDescription className="text-xs sm:text-sm">
                            {getWorkspaceDescription()}
                         </CardDescription>
                     </div>
                      <div className="flex items-center gap-2 flex-wrap justify-end">
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
                         <Button onClick={clearGraphWorkspace} variant="destructive" size="sm" className="flex-shrink-0">
                             <Trash2 className="mr-1.5 h-4 w-4" /> Clear
                         </Button>
                      </div>
                 </CardHeader>
                 <CardContent className="aspect-video md:aspect-[2/1] p-0 overflow-hidden relative border-t border-b-0 sm:border rounded-b-lg">
                     <GraphEditor
                         graph={editorGraph}
                         onGraphChange={handleEditorGraphChange}
                         readOnly={isPlaying}
                         mode={editorMode}
                         onSetStartNode={handleSetStartNodeFromEditor}
                     />
                 </CardContent>
             </Card>
        )}


         {/* Visualization Area */}
         <Card className="flex-grow flex flex-col">
            <CardHeader className="pb-3 pt-4 px-4 sm:px-6">
                <CardTitle className="text-xl lg:text-2xl">Visualization</CardTitle>
                 <CardDescription className={cn("transition-opacity duration-300 min-h-[1.25em] text-xs sm:text-sm", (steps.length > 0 || !isPlaying) ? 'opacity-100' : 'opacity-50')}>
                     {currentExplanation || '\u00A0'}
                </CardDescription>
            </CardHeader>
            <CardContent ref={visualizationContainerRef} className="flex-grow p-0 overflow-hidden relative border-t rounded-b-lg min-h-[250px] sm:min-h-[300px] md:min-h-[400px]">
                 <canvas
                    ref={visualizationCanvasRef}
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
                               <span key={node}>{node} → {parent}{node === parent.toString() ? ' (root)' : ''}</span>
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
