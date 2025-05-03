
// src/components/algorithm/graph-editor.tsx
"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Graph, Node, Edge } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Pencil, Check } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface GraphEditorProps {
    graph: Graph;
    onGraphChange: (newGraph: Graph) => void;
    width: number;
    height: number;
    readOnly?: boolean; // Make canvas non-interactive if true
}

const NODE_RADIUS = 20; // Match visualizer
const EDGE_HIT_WIDTH = 8; // Wider area for clicking edges

const GraphEditor: React.FC<GraphEditorProps> = ({
    graph,
    onGraphChange,
    width,
    height,
    readOnly = false,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [nodes, setNodes] = useState<Node[]>(graph.nodes);
    const [edges, setEdges] = useState<Edge[]>(graph.edges);
    const [draggingNode, setDraggingNode] = useState<number | null>(null);
    const [drawingEdge, setDrawingEdge] = useState<{ source: number; x: number; y: number } | null>(null);
    const [editingEdge, setEditingEdge] = useState<Edge | null>(null);
    const [newEdgeWeight, setNewEdgeWeight] = useState<string>('1');
    const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
    const [pendingEdge, setPendingEdge] = useState<{ source: number; target: number } | null>(null);
    const [nextNodeId, setNextNodeId] = useState(0);
    const { toast } = useToast();

    // Update internal state when graph prop changes
    useEffect(() => {
        setNodes(graph.nodes);
        setEdges(graph.edges);
        // Ensure nextNodeId is higher than any existing node ID
        const maxId = graph.nodes.reduce((max, node) => Math.max(max, node.id), -1);
        setNextNodeId(maxId + 1);
    }, [graph]);

    // Function to call onGraphChange when internal state changes
    const triggerGraphChange = useCallback(() => {
        // Create clean copies without circular references if any state holds references
        const cleanNodes = nodes.map(n => ({ ...n }));
        const cleanEdges = edges.map(e => ({ ...e }));
        onGraphChange({ nodes: cleanNodes, edges: cleanEdges });
    }, [nodes, edges, onGraphChange]);


    // Draw function
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Get computed styles for theme colors (needed for drawing)
        const computedStyle = getComputedStyle(document.documentElement);
        const primaryColor = computedStyle.getPropertyValue('--primary').trim();
        const primaryFgColor = computedStyle.getPropertyValue('--primary-foreground').trim();
        const accentColor = computedStyle.getPropertyValue('--accent').trim();
        const mutedColor = computedStyle.getPropertyValue('--muted').trim();
        const mutedFgColor = computedStyle.getPropertyValue('--muted-foreground').trim();
        const backgroundColor = computedStyle.getPropertyValue('--background').trim();
        const foregroundColor = computedStyle.getPropertyValue('--foreground').trim();


        ctx.clearRect(0, 0, width, height);

        // Draw edges first
        edges.forEach(edge => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetNode = nodes.find(n => n.id === edge.target);
            if (!sourceNode || !targetNode) return;

            ctx.beginPath();
            ctx.moveTo(sourceNode.x, sourceNode.y);
            ctx.lineTo(targetNode.x, targetNode.y);
            ctx.lineWidth = 2;
            // Use accent color if editing, otherwise muted-foreground with alpha
            ctx.strokeStyle = editingEdge?.id === edge.id ? `hsl(${accentColor})` : `hsla(${mutedFgColor}, 0.5)`;
            ctx.globalAlpha = editingEdge?.id === edge.id ? 1.0 : 0.5; // Make non-editing edges faded
            ctx.stroke();
            ctx.globalAlpha = 1.0; // Reset alpha


            // Draw edge weight (similar to visualizer)
            const midX = (sourceNode.x + targetNode.x) / 2;
            const midY = (sourceNode.y + targetNode.y) / 2;
            ctx.font = 'bold 11px Arial'; // Match visualizer
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
             const angle = Math.atan2(targetNode.y - sourceNode.y, targetNode.x - sourceNode.x);
            const offsetX = Math.sin(angle) * 10; // Match visualizer offset
            const offsetY = -Math.cos(angle) * 10;
             const text = edge.weight.toString();
             const textWidth = ctx.measureText(text).width;

            // Small background for readability
            ctx.fillStyle = `hsl(${backgroundColor})`;
            ctx.globalAlpha = 0.85;
            ctx.fillRect(midX + offsetX - textWidth / 2 - 3, midY + offsetY - 9, textWidth + 6, 12); // Match visualizer size

            // Text itself - use edge stroke color for consistency
            ctx.fillStyle = ctx.strokeStyle; // Use the same color as the line
            ctx.globalAlpha = 1.0;
            ctx.fillText(text, midX + offsetX, midY + offsetY);
        });

        // Draw temporary edge being drawn
        if (drawingEdge) {
            const sourceNode = nodes.find(n => n.id === drawingEdge.source);
            if (sourceNode) {
                ctx.beginPath();
                ctx.moveTo(sourceNode.x, sourceNode.y);
                ctx.lineTo(drawingEdge.x, drawingEdge.y);
                ctx.lineWidth = 2;
                ctx.strokeStyle = `hsl(${primaryColor})`; // Use primary color for drawing line
                ctx.globalAlpha = 0.7;
                ctx.setLineDash([5, 5]);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.globalAlpha = 1.0;
            }
        }

        // Draw nodes
        nodes.forEach(node => {
            ctx.beginPath();
            ctx.arc(node.x, node.y, NODE_RADIUS, 0, Math.PI * 2);

            // Fill Style - Use primary when dragging/drawing from, else muted
            ctx.fillStyle = draggingNode === node.id || drawingEdge?.source === node.id ? `hsl(${primaryColor})` : `hsl(${mutedColor})`;
             ctx.fill();

            // Stroke Style - Use corresponding foreground for contrast
             ctx.strokeStyle = draggingNode === node.id || drawingEdge?.source === node.id ? `hsl(${primaryFgColor})` : `hsl(${mutedFgColor})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();


            // Draw node ID - Use stroke color for contrast
            ctx.fillStyle = ctx.strokeStyle;
            ctx.font = 'bold 14px Arial'; // Match visualizer font
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(node.id.toString(), node.x, node.y);
        });
    }, [nodes, edges, draggingNode, drawingEdge, width, height, editingEdge]);

    // Effect to draw canvas when state changes
    useEffect(() => {
        draw();
    }, [draw]); // Redraw whenever draw function updates (due to state changes)

     // Get mouse position relative to canvas
     const getMousePos = (event: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        };
    };

     // Find node at a given position
     const getNodeAtPos = (x: number, y: number): Node | null => {
        for (const node of nodes) {
            const dx = x - node.x;
            const dy = y - node.y;
            if (dx * dx + dy * dy <= NODE_RADIUS * NODE_RADIUS) {
                return node;
            }
        }
        return null;
    };

     // Find edge at a given position (line-point distance check)
    const getEdgeAtPos = (x: number, y: number): Edge | null => {
        for (const edge of edges) {
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetNode = nodes.find(n => n.id === edge.target);
            if (!sourceNode || !targetNode) continue;

            const x1 = sourceNode.x, y1 = sourceNode.y;
            const x2 = targetNode.x, y2 = targetNode.y;

            // Check if point (x,y) is close to the line segment (x1,y1)-(x2,y2)
            const lenSq = (x2 - x1) ** 2 + (y2 - y1) ** 2;
             if (lenSq === 0) continue; // Avoid division by zero for overlapping nodes

             // Project point (x,y) onto the line defined by the edge
            let t = ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / lenSq;
            t = Math.max(0, Math.min(1, t)); // Clamp t to the segment [0, 1]

             // Find the closest point on the segment to (x,y)
            const closestX = x1 + t * (x2 - x1);
            const closestY = y1 + t * (y2 - y1);

             // Calculate distance from (x,y) to the closest point on the segment
            const distSq = (x - closestX) ** 2 + (y - closestY) ** 2;

             if (distSq <= EDGE_HIT_WIDTH ** 2) {
                return edge;
            }
        }
        return null;
    };


    // Mouse Down Handler
    const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
        if (readOnly) return;
        const { x, y } = getMousePos(event);
        const clickedNode = getNodeAtPos(x, y);

        if (clickedNode) {
            if (event.shiftKey) { // Start drawing edge if Shift is held
                setDrawingEdge({ source: clickedNode.id, x, y });
                setDraggingNode(null); // Don't drag while drawing edge
                 setEditingEdge(null);
            } else { // Start dragging node
                setDraggingNode(clickedNode.id);
                setDrawingEdge(null);
                 setEditingEdge(null);
            }
        } else {
             const clickedEdge = getEdgeAtPos(x, y);
             if (clickedEdge) {
                 setEditingEdge(clickedEdge); // Select edge for potential editing/deletion
                 setDraggingNode(null);
                 setDrawingEdge(null);
             } else {
                 // Clicked on empty space: Add a new node if within bounds
                 if (x > NODE_RADIUS && x < width - NODE_RADIUS && y > NODE_RADIUS && y < height - NODE_RADIUS) {
                     const newNode: Node = { id: nextNodeId, x, y };
                     setNodes(prevNodes => [...prevNodes, newNode]);
                     setNextNodeId(prevId => prevId + 1);
                     triggerGraphChange(); // Update parent immediately after adding node
                 }
                 setDraggingNode(null);
                 setDrawingEdge(null);
                 setEditingEdge(null);
             }

        }
    };

    // Mouse Move Handler
    const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
        if (readOnly) return;
        const { x, y } = getMousePos(event);

        if (draggingNode !== null) {
            // Keep node within canvas bounds
            const boundedX = Math.max(NODE_RADIUS, Math.min(width - NODE_RADIUS, x));
            const boundedY = Math.max(NODE_RADIUS, Math.min(height - NODE_RADIUS, y));
            setNodes(prevNodes =>
                prevNodes.map(node =>
                    node.id === draggingNode ? { ...node, x: boundedX, y: boundedY } : node
                )
            );
             // Debounce or throttle triggerGraphChange if performance is an issue
             triggerGraphChange();
        } else if (drawingEdge) {
            setDrawingEdge({ ...drawingEdge, x, y });
        }
    };

    // Mouse Up Handler
    const handleMouseUp = (event: React.MouseEvent<HTMLCanvasElement>) => {
        if (readOnly) return;
        const { x, y } = getMousePos(event);

        if (drawingEdge) {
            const targetNode = getNodeAtPos(x, y);
            if (targetNode && targetNode.id !== drawingEdge.source) {
                // Check if edge already exists (in either direction)
                const edgeExists = edges.some(edge =>
                    (edge.source === drawingEdge.source && edge.target === targetNode.id) ||
                    (edge.source === targetNode.id && edge.target === drawingEdge.source)
                );

                if (!edgeExists) {
                    // Set pending edge and open weight modal
                    setPendingEdge({ source: drawingEdge.source, target: targetNode.id });
                    setNewEdgeWeight('1'); // Reset weight input
                    setIsWeightModalOpen(true);
                } else {
                     toast({ title: "Edge Exists", description: "An edge between these nodes already exists.", variant: "destructive" });
                }
            } else if (!targetNode) {
                 // Don't show error if mouse up on empty space, just cancel drawing
            }
             else {
                 // Target node is the same as source node
                 toast({ title: "Invalid Edge Target", description: "Cannot create an edge from a node to itself.", variant: "destructive" });
            }
        }

        // Stop dragging or drawing
        setDraggingNode(null);
        setDrawingEdge(null);
        // Deselect edge if clicking empty space on mouse up
        if (!getNodeAtPos(x,y) && !getEdgeAtPos(x,y)){
            setEditingEdge(null);
        }


        // Trigger change if nodes were moved (even if not dragging now)
        if (draggingNode !== null) {
             triggerGraphChange();
         }
    };

     // Handle Weight Confirmation
    const handleConfirmWeight = () => {
        if (!pendingEdge) return;
        const weight = parseInt(newEdgeWeight, 10);
        if (isNaN(weight) || weight <= 0) {
            toast({ title: "Invalid Weight", description: "Weight must be a positive number.", variant: "destructive" });
            return;
        }

        const newEdge: Edge = {
            // Use a more robust ID generation if needed, ensure uniqueness
            id: `${pendingEdge.source}-${pendingEdge.target}-${Date.now()}`, // Simple unique ID for now
            source: pendingEdge.source,
            target: pendingEdge.target,
            weight: weight,
        };

        setEdges(prevEdges => [...prevEdges, newEdge]);
        setIsWeightModalOpen(false);
        setPendingEdge(null);
        triggerGraphChange(); // Update parent after adding edge
    };

     // Delete Node Function (example using context menu or button click)
     // TODO: Add a button or context menu to trigger this
     const deleteNode = (nodeId: number) => {
         if (readOnly) return;
         setNodes(prevNodes => prevNodes.filter(node => node.id !== nodeId));
         // Also remove edges connected to this node
         setEdges(prevEdges => prevEdges.filter(edge => edge.source !== nodeId && edge.target !== nodeId));
          setEditingEdge(null); // Deselect edge if its node is deleted
         triggerGraphChange();
     };

      // Delete Edge Function
     const deleteEdge = (edgeId: string) => {
         if (readOnly) return;
         setEdges(prevEdges => prevEdges.filter(edge => edge.id !== edgeId));
         setEditingEdge(null); // Deselect edge after deleting
         triggerGraphChange();
     };

      // Update Edge Weight Function
     const handleUpdateWeight = () => {
         if (!editingEdge) return;
         const weight = parseInt(newEdgeWeight, 10);
         if (isNaN(weight) || weight <= 0) {
             toast({ title: "Invalid Weight", description: "Weight must be a positive number.", variant: "destructive" });
             return;
         }

         setEdges(prevEdges => prevEdges.map(edge =>
              // Update weight and potentially the ID if it includes weight
             edge.id === editingEdge.id ? { ...edge, weight: weight, id: `${edge.source}-${edge.target}-${weight}` } : edge
         ));
         setIsWeightModalOpen(false);
         setEditingEdge(null); // Deselect after edit
         triggerGraphChange();
     };

     // Open weight modal for editing existing edge
     const openEditWeightModal = (edge: Edge) => {
         if (readOnly) return;
         setEditingEdge(edge);
         setNewEdgeWeight(edge.weight.toString());
         setIsWeightModalOpen(true);
         setPendingEdge(null); // Ensure we are editing, not creating
     };


    return (
        <div className="relative w-full h-full border rounded-md overflow-hidden bg-background">
             {/* Instruction overlay */}
            {!readOnly && (
                <div className={cn(
                    "absolute top-2 left-2 z-20 p-1.5 bg-background/80 border border-border rounded text-xs text-muted-foreground max-w-[200px]",
                    "transition-opacity duration-300",
                     (drawingEdge || draggingNode || isWeightModalOpen || editingEdge) ? "opacity-0 pointer-events-none" : "opacity-100" // Hide instructions during actions
                     )}>
                    Click: Add Node | Shift+Drag: Add Edge | Drag: Move | Click Edge: Edit/Delete
                 </div>
            )}
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => { // Stop actions if mouse leaves canvas
                    if (draggingNode !== null) triggerGraphChange(); // Ensure position updates if dragging stops outside
                    setDraggingNode(null);
                    setDrawingEdge(null);
                }}
                className={cn(
                    "cursor-crosshair block", // Ensure block display to prevent extra space
                    readOnly && "cursor-not-allowed",
                    draggingNode !== null && "cursor-grabbing",
                    drawingEdge !== null && "cursor-grabbing" // Also grabbing when drawing edge
                )}
            />


             {/* Buttons for selected edge */}
            {editingEdge && !readOnly && (
                <div className="absolute top-2 right-2 z-20 flex space-x-1 p-1 bg-background/80 rounded border">
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => openEditWeightModal(editingEdge)} aria-label="Edit Edge Weight">
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive/90" onClick={() => deleteEdge(editingEdge.id)} aria-label="Delete Edge">
                        <X className="h-4 w-4" />
                    </Button>
                 </div>
             )}


            {/* Weight Input Modal */}
            <Dialog open={isWeightModalOpen} onOpenChange={(open) => {
                setIsWeightModalOpen(open);
                 if (!open) {
                     setEditingEdge(null); // Deselect edge when modal closes
                     setPendingEdge(null);
                 }
                }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingEdge ? 'Edit Edge Weight' : 'Enter Edge Weight'}</DialogTitle>
                        <DialogDescription>
                            {editingEdge
                                ? `Update the weight for the edge between node ${editingEdge.source} and ${editingEdge.target}.`
                                : `Enter the weight for the new edge between node ${pendingEdge?.source} and ${pendingEdge?.target}. Weight must be a positive number.`
                            }
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="weight" className="text-right">
                                Weight
                            </Label>
                            <Input
                                id="weight"
                                type="number"
                                value={newEdgeWeight}
                                onChange={(e) => setNewEdgeWeight(e.target.value)}
                                className="col-span-3"
                                min="1"
                                step="1"
                                autoFocus
                                onKeyDown={(e) => {
                                     if (e.key === 'Enter') {
                                         e.preventDefault(); // Prevent form submission if any
                                         if (editingEdge) handleUpdateWeight(); else handleConfirmWeight();
                                     } else if (e.key === 'Escape'){
                                         setIsWeightModalOpen(false);
                                         setEditingEdge(null);
                                         setPendingEdge(null);
                                     }
                                 }}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                             <Button variant="outline">Cancel</Button>
                         </DialogClose>
                         <Button onClick={editingEdge ? handleUpdateWeight : handleConfirmWeight}>
                           {editingEdge ? <><Check className="mr-2 h-4 w-4"/> Update Weight</> : <><Check className="mr-2 h-4 w-4"/> Add Edge</>}
                         </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default GraphEditor;

