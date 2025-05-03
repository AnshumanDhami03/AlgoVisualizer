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

const NODE_RADIUS = 18;
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
        onGraphChange({ nodes: [...nodes], edges: [...edges] });
    }, [nodes, edges, onGraphChange]);

    // Draw function
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

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
            ctx.strokeStyle = editingEdge?.id === edge.id ? 'hsl(var(--accent))' : 'hsl(var(--muted-foreground) / 0.5)';
            ctx.stroke();

            // Draw edge weight
            const midX = (sourceNode.x + targetNode.x) / 2;
            const midY = (sourceNode.y + targetNode.y) / 2;
             const angle = Math.atan2(targetNode.y - sourceNode.y, targetNode.x - sourceNode.x);
            const offsetX = Math.sin(angle) * 6;
            const offsetY = -Math.cos(angle) * 6;
            ctx.font = '10px Arial';
            ctx.fillStyle = 'hsl(var(--foreground))';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
             const text = edge.weight.toString();
             const textWidth = ctx.measureText(text).width;
             // Small background for readability
            ctx.fillStyle = 'hsl(var(--background))';
            ctx.fillRect(midX + offsetX - textWidth / 2 - 2, midY + offsetY - 7, textWidth + 4, 12);
             // Text itself
             ctx.fillStyle = editingEdge?.id === edge.id ? 'hsl(var(--accent))' : 'hsl(var(--foreground))';
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
                ctx.strokeStyle = 'hsl(var(--primary) / 0.7)';
                ctx.setLineDash([5, 5]);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }

        // Draw nodes
        nodes.forEach(node => {
            ctx.beginPath();
            ctx.arc(node.x, node.y, NODE_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = draggingNode === node.id || drawingEdge?.source === node.id ? 'hsl(var(--primary))' : 'hsl(var(--muted))';
             ctx.fill();
             ctx.strokeStyle = draggingNode === node.id || drawingEdge?.source === node.id ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))';
            ctx.lineWidth = 1.5;
            ctx.stroke();


            // Draw node ID
            ctx.fillStyle = draggingNode === node.id || drawingEdge?.source === node.id ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))';
            ctx.font = 'bold 12px Arial';
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
                 // Clicked on empty space: Add a new node
                 const newNode: Node = { id: nextNodeId, x, y };
                 setNodes([...nodes, newNode]);
                 setNextNodeId(prevId => prevId + 1);
                 setDraggingNode(null);
                 setDrawingEdge(null);
                 setEditingEdge(null);
                 triggerGraphChange(); // Update parent immediately after adding node
             }

        }
    };

    // Mouse Move Handler
    const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
        if (readOnly) return;
        const { x, y } = getMousePos(event);

        if (draggingNode !== null) {
            setNodes(prevNodes =>
                prevNodes.map(node =>
                    node.id === draggingNode ? { ...node, x, y } : node
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
            } else {
                 toast({ title: "Invalid Edge Target", description: "Please drag to a different node to create an edge.", variant: "destructive" });
            }
        }

        // Stop dragging or drawing
        setDraggingNode(null);
        setDrawingEdge(null);
        // Don't reset editingEdge on mouse up, allow deletion/editing after selection
        // Resetting it here would require clicking again.
        // setEditingEdge(null);

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
            id: `${pendingEdge.source}-${pendingEdge.target}-${weight}`, // Simple ID
            source: pendingEdge.source,
            target: pendingEdge.target,
            weight: weight,
        };

        setEdges([...edges, newEdge]);
        setIsWeightModalOpen(false);
        setPendingEdge(null);
        triggerGraphChange(); // Update parent after adding edge
    };

     // Delete Node Function (example using context menu or button click)
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
             edge.id === editingEdge.id ? { ...edge, weight: weight, id: `${edge.source}-${edge.target}-${weight}` } : edge // Update ID too
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
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => { // Stop actions if mouse leaves canvas
                    setDraggingNode(null);
                    setDrawingEdge(null);
                     // Maybe trigger change if dragging stopped abruptly
                     // if(draggingNode !== null) triggerGraphChange();
                }}
                className={cn(
                    "cursor-crosshair",
                    readOnly && "cursor-not-allowed",
                    (draggingNode !== null || drawingEdge !== null) && "cursor-grabbing"
                )}
            />
            {!readOnly && (
                <div className="absolute top-2 left-2 p-1 bg-background/80 rounded border text-xs text-muted-foreground max-w-[200px]">
                    Click: Add Node | Shift+Drag Node: Add Edge | Drag Node: Move | Click Edge: Select/Edit
                 </div>
            )}

             {/* Buttons for selected edge */}
            {editingEdge && !readOnly && (
                <div className="absolute top-2 right-2 flex space-x-1 p-1 bg-background/80 rounded border">
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => openEditWeightModal(editingEdge)} aria-label="Edit Edge Weight">
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive/90" onClick={() => deleteEdge(editingEdge.id)} aria-label="Delete Edge">
                        <X className="h-4 w-4" />
                    </Button>
                 </div>
             )}


            {/* Weight Input Modal */}
            <Dialog open={isWeightModalOpen} onOpenChange={setIsWeightModalOpen}>
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
                                     }
                                 }}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                             <Button variant="outline" onClick={() => setEditingEdge(null)}>Cancel</Button>
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
