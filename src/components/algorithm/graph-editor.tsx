
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

const NODE_RADIUS = 22;
const EDGE_HIT_WIDTH = 8;

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
    const [draggingNodeId, setDraggingNodeId] = useState<number | null>(null);
    const [drawingEdge, setDrawingEdge] = useState<{ source: number; x: number; y: number } | null>(null);
    const [editingEdge, setEditingEdge] = useState<Edge | null>(null);
    const [newEdgeWeight, setNewEdgeWeight] = useState<string>('1');
    const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
    const [pendingEdge, setPendingEdge] = useState<{ source: number; target: number } | null>(null);
    const [nextNodeId, setNextNodeId] = useState(0);
    const { toast } = useToast();

    // Update internal state ONLY when the graph prop *identity* changes
    // This prevents overwriting local state during interactions if parent re-renders
    useEffect(() => {
        setNodes(graph.nodes);
        setEdges(graph.edges);
        const maxId = graph.nodes.reduce((max, node) => Math.max(max, node.id), -1);
        setNextNodeId(maxId + 1);
    }, [graph]); // Depend only on the graph object itself


    // Function to call onGraphChange when internal state changes
    // This is crucial for syncing the editor state back to the parent
    const triggerGraphChange = useCallback((updatedNodes: Node[], updatedEdges: Edge[]) => {
        onGraphChange({ nodes: updatedNodes, edges: updatedEdges });
    }, [onGraphChange]);


    // Draw function
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const computedStyle = getComputedStyle(document.documentElement);
        const primaryColor = computedStyle.getPropertyValue('--primary').trim();
        const primaryFgColor = computedStyle.getPropertyValue('--primary-foreground').trim();
        const accentColor = computedStyle.getPropertyValue('--accent').trim();
        const mutedColor = computedStyle.getPropertyValue('--muted').trim();
        const mutedFgColor = computedStyle.getPropertyValue('--muted-foreground').trim();
        const backgroundColor = computedStyle.getPropertyValue('--background').trim();
        const foregroundColor = computedStyle.getPropertyValue('--foreground').trim();

        ctx.clearRect(0, 0, width, height);

        // Draw edges
        edges.forEach(edge => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetNode = nodes.find(n => n.id === edge.target);
            if (!sourceNode || !targetNode) return;

            ctx.beginPath();
            ctx.moveTo(sourceNode.x, sourceNode.y);
            ctx.lineTo(targetNode.x, targetNode.y);
            ctx.lineWidth = 2;
            ctx.strokeStyle = editingEdge?.id === edge.id ? `hsl(${accentColor})` : `hsla(${mutedFgColor}, 0.5)`;
            ctx.globalAlpha = editingEdge?.id === edge.id ? 1.0 : 0.5;
            ctx.stroke();
            ctx.globalAlpha = 1.0;

            // Draw edge weight
            const midX = (sourceNode.x + targetNode.x) / 2;
            const midY = (sourceNode.y + targetNode.y) / 2;
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
             const angle = Math.atan2(targetNode.y - sourceNode.y, targetNode.x - sourceNode.x);
            const offsetX = Math.sin(angle) * 15;
            const offsetY = -Math.cos(angle) * 15;
             const text = edge.weight.toString();
             const textWidth = ctx.measureText(text).width;

            ctx.fillStyle = `hsl(${backgroundColor})`;
            ctx.globalAlpha = 0.9;
            ctx.fillRect(midX + offsetX - textWidth / 2 - 4, midY + offsetY - 10, textWidth + 8, 14);
            ctx.fillStyle = ctx.strokeStyle;
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
                ctx.strokeStyle = `hsl(${primaryColor})`;
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
            ctx.fillStyle = draggingNodeId === node.id || drawingEdge?.source === node.id ? `hsl(${primaryColor})` : `hsl(${mutedColor})`;
             ctx.fill();
             ctx.strokeStyle = draggingNodeId === node.id || drawingEdge?.source === node.id ? `hsl(${primaryFgColor})` : `hsl(${mutedFgColor})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.fillStyle = ctx.strokeStyle;
            ctx.font = 'bold 15px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(node.id.toString(), node.x, node.y);
        });
    // Depend on internal state variables that affect drawing
    }, [nodes, edges, draggingNodeId, drawingEdge, width, height, editingEdge]);

    // Effect to redraw canvas when relevant state changes
    useEffect(() => {
        draw();
    }, [draw]); // Trigger redraw whenever the draw function itself updates

     const getMousePos = (event: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        };
    };

     const getNodeAtPos = (x: number, y: number): Node | null => {
        // Iterate in reverse so top-most node is found first if overlapping
        for (let i = nodes.length - 1; i >= 0; i--) {
            const node = nodes[i];
            const dx = x - node.x;
            const dy = y - node.y;
            if (dx * dx + dy * dy <= NODE_RADIUS * NODE_RADIUS) {
                return node;
            }
        }
        return null;
    };

    const getEdgeAtPos = (x: number, y: number): Edge | null => {
        for (const edge of edges) {
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetNode = nodes.find(n => n.id === edge.target);
            if (!sourceNode || !targetNode) continue;
            const x1 = sourceNode.x, y1 = sourceNode.y;
            const x2 = targetNode.x, y2 = targetNode.y;
            const lenSq = (x2 - x1) ** 2 + (y2 - y1) ** 2;
             if (lenSq === 0) continue;
            let t = ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / lenSq;
            t = Math.max(0, Math.min(1, t));
            const closestX = x1 + t * (x2 - x1);
            const closestY = y1 + t * (y2 - y1);
            const distSq = (x - closestX) ** 2 + (y - closestY) ** 2;
             if (distSq <= EDGE_HIT_WIDTH ** 2) {
                return edge;
            }
        }
        return null;
    };

    const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
        if (readOnly) return;
        const { x, y } = getMousePos(event);
        const clickedNode = getNodeAtPos(x, y);

        if (clickedNode) {
            if (event.shiftKey) {
                setDrawingEdge({ source: clickedNode.id, x, y });
                setDraggingNodeId(null);
                 setEditingEdge(null);
            } else {
                setDraggingNodeId(clickedNode.id);
                setDrawingEdge(null);
                 setEditingEdge(null);
            }
        } else {
             const clickedEdge = getEdgeAtPos(x, y);
             if (clickedEdge) {
                 setEditingEdge(clickedEdge);
                 setDraggingNodeId(null);
                 setDrawingEdge(null);
             } else {
                 if (x > NODE_RADIUS && x < width - NODE_RADIUS && y > NODE_RADIUS && y < height - NODE_RADIUS) {
                     const newNode: Node = { id: nextNodeId, x, y };
                     const updatedNodes = [...nodes, newNode];
                     setNodes(updatedNodes);
                     setNextNodeId(prevId => prevId + 1);
                     triggerGraphChange(updatedNodes, edges); // Propagate change immediately
                 }
                 setDraggingNodeId(null);
                 setDrawingEdge(null);
                 setEditingEdge(null);
             }
        }
    };

    const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
        if (readOnly) return;
        const { x, y } = getMousePos(event);

        if (draggingNodeId !== null) {
            const boundedX = Math.max(NODE_RADIUS, Math.min(width - NODE_RADIUS, x));
            const boundedY = Math.max(NODE_RADIUS, Math.min(height - NODE_RADIUS, y));
            // Update internal state directly
            const updatedNodes = nodes.map(node =>
                node.id === draggingNodeId ? { ...node, x: boundedX, y: boundedY } : node
            );
            setNodes(updatedNodes);
            // Trigger change frequently during drag for smoother visual updates if parent uses it
            triggerGraphChange(updatedNodes, edges);
        } else if (drawingEdge) {
            setDrawingEdge({ ...drawingEdge, x, y });
        }
    };

    const handleMouseUp = (event: React.MouseEvent<HTMLCanvasElement>) => {
        if (readOnly) return;
        const { x, y } = getMousePos(event);

        // If drawing an edge, check target node
        if (drawingEdge) {
            const targetNode = getNodeAtPos(x, y);
            if (targetNode && targetNode.id !== drawingEdge.source) {
                const sourceId = drawingEdge.source;
                const targetId = targetNode.id;
                // Check if edge already exists (undirected)
                const edgeExists = edges.some(edge =>
                    (edge.source === sourceId && edge.target === targetId) ||
                    (edge.source === targetId && edge.target === sourceId)
                );

                if (!edgeExists) {
                    setPendingEdge({ source: sourceId, target: targetId });
                    setNewEdgeWeight('1');
                    setIsWeightModalOpen(true);
                } else {
                     toast({ title: "Edge Exists", description: `Edge between node ${sourceId} and ${targetId} already exists.`, variant: "destructive" });
                }
            } else if (targetNode && targetNode.id === drawingEdge.source) {
                toast({ title: "Invalid Edge", description: "Cannot create an edge connecting a node to itself.", variant: "destructive" });
            }
            setDrawingEdge(null); // Stop drawing regardless of outcome
        }

        // If dragging a node, finalize position
        if (draggingNodeId !== null) {
            // Final position already set in mouseMove, just clear dragging state
            setDraggingNodeId(null);
             // Trigger one last time to ensure final position is saved if not triggered enough during move
            triggerGraphChange(nodes, edges);
        }


        // Deselect edge if clicking empty space on mouse up
        if (!getNodeAtPos(x,y) && !getEdgeAtPos(x,y)){
            setEditingEdge(null);
        }
    };

    const handleConfirmWeight = () => {
        if (!pendingEdge) return;
        const weight = parseInt(newEdgeWeight, 10);
        if (isNaN(weight) || weight <= 0) {
            toast({ title: "Invalid Weight", description: "Weight must be a positive number.", variant: "destructive" });
            return;
        }

        const newEdge: Edge = {
            id: `edge-${pendingEdge.source}-${pendingEdge.target}-${Date.now() % 10000}`,
            source: pendingEdge.source,
            target: pendingEdge.target,
            weight: weight,
        };

        const updatedEdges = [...edges, newEdge];
        setEdges(updatedEdges);
        setIsWeightModalOpen(false);
        setPendingEdge(null);
        triggerGraphChange(nodes, updatedEdges); // Propagate change
    };

     const deleteNode = (nodeId: number) => {
         if (readOnly) return;
         const updatedNodes = nodes.filter(node => node.id !== nodeId);
         const updatedEdges = edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId);
         setNodes(updatedNodes);
         setEdges(updatedEdges);
          if (editingEdge?.source === nodeId || editingEdge?.target === nodeId) {
             setEditingEdge(null);
         }
         triggerGraphChange(updatedNodes, updatedEdges);
     };

      // Delete Edge Function
     const deleteEdge = (edgeId: string) => {
         if (readOnly) return;
         const updatedEdges = edges.filter(edge => edge.id !== edgeId);
         setEdges(updatedEdges);
         setEditingEdge(null); // Deselect edge after deleting
         triggerGraphChange(nodes, updatedEdges); // Propagate change
     };

      // Update Edge Weight Function
     const handleUpdateWeight = () => {
         if (!editingEdge) return;
         const weight = parseInt(newEdgeWeight, 10);
         if (isNaN(weight) || weight <= 0) {
             toast({ title: "Invalid Weight", description: "Weight must be a positive number.", variant: "destructive" });
             return;
         }

        // Update the weight and ID of the specific edge
         const updatedEdges = edges.map(edge =>
             edge.id === editingEdge.id
              // Generate a new ID based on potentially new weight to avoid issues if ID depends on weight
              ? { ...edge, weight: weight, id: `edge-${edge.source}-${edge.target}-${weight}-${Date.now() % 10000}` }
              : edge
         );

         setEdges(updatedEdges);
         setIsWeightModalOpen(false);
         setEditingEdge(null); // Deselect after edit
         triggerGraphChange(nodes, updatedEdges); // Propagate change
     };

     const openEditWeightModal = (edge: Edge) => {
         if (readOnly) return;
         setEditingEdge(edge);
         setNewEdgeWeight(edge.weight.toString());
         setIsWeightModalOpen(true);
         setPendingEdge(null);
     };


    return (
        <div className="relative w-full h-full border rounded-md overflow-hidden bg-background">
            {!readOnly && (
                <div className={cn(
                    "absolute top-2 left-2 z-20 p-1.5 bg-background/80 border border-border rounded text-xs text-muted-foreground max-w-[200px]",
                    "transition-opacity duration-300",
                     (drawingEdge || draggingNodeId || isWeightModalOpen || editingEdge) ? "opacity-0 pointer-events-none" : "opacity-100"
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
                onMouseLeave={() => {
                    if (draggingNodeId !== null) {
                         // Finalize drag state if mouse leaves while dragging
                         triggerGraphChange(nodes, edges);
                         setDraggingNodeId(null);
                    }
                     if (drawingEdge !== null){
                         setDrawingEdge(null); // Cancel drawing edge
                     }
                }}
                className={cn(
                    "cursor-crosshair block",
                    readOnly && "cursor-not-allowed",
                    draggingNodeId !== null && "cursor-grabbing",
                    drawingEdge !== null && "cursor-grabbing"
                )}
            />

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

            <Dialog open={isWeightModalOpen} onOpenChange={(open) => {
                setIsWeightModalOpen(open);
                 if (!open) {
                     setEditingEdge(null);
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
                                         e.preventDefault();
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
