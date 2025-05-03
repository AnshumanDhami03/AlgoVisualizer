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
import type { GraphEditorMode } from './algorithm-visualizer'; // Import the mode type

interface GraphEditorProps {
    graph: Graph;
    onGraphChange: (newGraph: Graph) => void;
    width: number;
    height: number;
    readOnly?: boolean; // Make canvas non-interactive if true
    mode: GraphEditorMode; // Add mode prop
    onSetStartNode: (nodeId: number) => void; // Callback to set start node
}

const NODE_RADIUS = 22;
const EDGE_HIT_WIDTH = 8;

const GraphEditor: React.FC<GraphEditorProps> = ({
    graph,
    onGraphChange,
    width,
    height,
    readOnly = false,
    mode, // Receive mode
    onSetStartNode, // Receive start node setter
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
    useEffect(() => {
        setNodes(graph.nodes);
        setEdges(graph.edges);
        const maxId = graph.nodes.reduce((max, node) => Math.max(max, node.id), -1);
        setNextNodeId(maxId + 1);
    }, [graph]);

    // Function to call onGraphChange when internal state changes
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
        const destructiveColor = computedStyle.getPropertyValue('--destructive').trim(); // For source node indicator

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
            ctx.fillStyle = ctx.strokeStyle; // Use edge color for weight text
            ctx.globalAlpha = 1.0;
            ctx.fillText(text, midX + offsetX, midY + offsetY);
        });

        // Draw temporary edge being drawn (only in 'edge' mode)
        if (drawingEdge && mode === 'edge') {
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

            // Styling based on state and mode
             const isDraggingThisNode = draggingNodeId === node.id && mode === 'node';
             const isSourceForDrawingEdge = drawingEdge?.source === node.id && mode === 'edge';
             const isSetSourceCandidate = mode === 'set-source'; // Highlight potential source nodes


            if (isDraggingThisNode || isSourceForDrawingEdge) {
                ctx.fillStyle = `hsl(${primaryColor})`; // Primary color when interacting
            } else if (isSetSourceCandidate) {
                ctx.fillStyle = `hsla(${accentColor}, 0.7)`; // Semi-transparent accent when setting source
            }
             else {
                ctx.fillStyle = `hsl(${mutedColor})`; // Default muted color
            }
             ctx.fill();

             // Stroke styling
            let strokeStyle = `hsl(${mutedFgColor})`;
             let lineWidth = 1.5;
            if (isDraggingThisNode || isSourceForDrawingEdge) {
                strokeStyle = `hsl(${primaryFgColor})`; // Primary foreground for interaction stroke
            } else if (isSetSourceCandidate) {
                strokeStyle = `hsl(${accentColor})`; // Accent stroke when setting source
                 lineWidth = 2.0; // Slightly thicker stroke
            }


            ctx.strokeStyle = strokeStyle;
            ctx.lineWidth = lineWidth;
            ctx.stroke();

             // Text styling (same as stroke color)
            ctx.fillStyle = strokeStyle;
            ctx.font = 'bold 15px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(node.id.toString(), node.x, node.y);
        });
    // Depend on internal state variables that affect drawing AND mode
    }, [nodes, edges, draggingNodeId, drawingEdge, width, height, editingEdge, mode]);

    // Effect to redraw canvas when relevant state changes
    useEffect(() => {
        draw();
    }, [draw]);

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
        const clickedEdge = getEdgeAtPos(x, y);

        setEditingEdge(null); // Deselect edge on any mousedown initially
        setDraggingNodeId(null);
        setDrawingEdge(null);


        if (mode === 'node') {
            if (clickedNode) {
                setDraggingNodeId(clickedNode.id); // Allow dragging in node mode
            } else {
                 // Add node only if clicking empty space
                 if (!clickedEdge && x > NODE_RADIUS && x < width - NODE_RADIUS && y > NODE_RADIUS && y < height - NODE_RADIUS) {
                     const newNode: Node = { id: nextNodeId, x, y };
                     const updatedNodes = [...nodes, newNode];
                     setNodes(updatedNodes);
                     setNextNodeId(prevId => prevId + 1);
                     triggerGraphChange(updatedNodes, edges);
                 }
            }
        } else if (mode === 'edge') {
             if (clickedNode) {
                setDrawingEdge({ source: clickedNode.id, x, y }); // Start drawing edge
             } else if (clickedEdge) {
                 setEditingEdge(clickedEdge); // Select edge for editing/deletion
             }
        } else if (mode === 'set-source') {
             if (clickedNode) {
                onSetStartNode(clickedNode.id); // Call parent handler
                 // Don't initiate drag or edge drawing
             } else {
                  toast({ title: "Select a Node", description: "Click directly on a node to set it as the source.", variant:"default" });
             }
        }
    };

    const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
        if (readOnly) return;
        const { x, y } = getMousePos(event);

        // Only move node if in 'node' mode and dragging a node
        if (mode === 'node' && draggingNodeId !== null) {
            const boundedX = Math.max(NODE_RADIUS, Math.min(width - NODE_RADIUS, x));
            const boundedY = Math.max(NODE_RADIUS, Math.min(height - NODE_RADIUS, y));
            const updatedNodes = nodes.map(node =>
                node.id === draggingNodeId ? { ...node, x: boundedX, y: boundedY } : node
            );
            setNodes(updatedNodes);
            triggerGraphChange(updatedNodes, edges); // Update frequently during drag
        }
        // Only update drawing edge if in 'edge' mode
        else if (mode === 'edge' && drawingEdge) {
            setDrawingEdge({ ...drawingEdge, x, y });
        }
    };

    const handleMouseUp = (event: React.MouseEvent<HTMLCanvasElement>) => {
        if (readOnly) return;
        const { x, y } = getMousePos(event);

        // Finalize edge drawing only in 'edge' mode
        if (mode === 'edge' && drawingEdge) {
            const targetNode = getNodeAtPos(x, y);
            if (targetNode && targetNode.id !== drawingEdge.source) {
                const sourceId = drawingEdge.source;
                const targetId = targetNode.id;
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
            setDrawingEdge(null); // Stop drawing visualization
        }

        // Finalize node dragging only in 'node' mode
        if (mode === 'node' && draggingNodeId !== null) {
            setDraggingNodeId(null);
             // Trigger one last time to ensure final position is saved
            triggerGraphChange(nodes, edges);
        }


        // Deselect edge if clicking empty space on mouse up (relevant in edge mode)
        // Keep selected edge if modal opens
        if (mode === 'edge' && !isWeightModalOpen && !getNodeAtPos(x,y) && !getEdgeAtPos(x,y)){
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

     // Delete Node - Only available implicitly (not via button)
     // Consider adding explicit delete in 'node' mode if needed
     const deleteNode = (nodeId: number) => {
         if (readOnly || mode !== 'node') return; // Maybe restrict deletion?
         const updatedNodes = nodes.filter(node => node.id !== nodeId);
         const updatedEdges = edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId);
         setNodes(updatedNodes);
         setEdges(updatedEdges);
          if (editingEdge?.source === nodeId || editingEdge?.target === nodeId) {
             setEditingEdge(null);
         }
         triggerGraphChange(updatedNodes, updatedEdges);
     };

      // Delete Edge Function (Triggered by button when editingEdge is set in 'edge' mode)
     const deleteEdge = (edgeId: string) => {
         if (readOnly || mode !== 'edge') return;
         const updatedEdges = edges.filter(edge => edge.id !== edgeId);
         setEdges(updatedEdges);
         setEditingEdge(null); // Deselect edge after deleting
         triggerGraphChange(nodes, updatedEdges); // Propagate change
     };

      // Update Edge Weight Function (Triggered from modal)
     const handleUpdateWeight = () => {
         if (!editingEdge) return; // Should have an editing edge
         const weight = parseInt(newEdgeWeight, 10);
         if (isNaN(weight) || weight <= 0) {
             toast({ title: "Invalid Weight", description: "Weight must be a positive number.", variant: "destructive" });
             return;
         }

        // Update the weight and ID of the specific edge
         const updatedEdges = edges.map(edge =>
             edge.id === editingEdge.id
              // Generate a new ID based on potentially new weight
              ? { ...edge, weight: weight, id: `edge-${edge.source}-${edge.target}-${weight}-${Date.now() % 10000}` }
              : edge
         );

         setEdges(updatedEdges);
         setIsWeightModalOpen(false);
         setEditingEdge(null); // Deselect after edit
         triggerGraphChange(nodes, updatedEdges); // Propagate change
     };

     // Open edit modal (Triggered by button when editingEdge is set in 'edge' mode)
     const openEditWeightModal = (edge: Edge) => {
         if (readOnly || mode !== 'edge') return;
         setEditingEdge(edge);
         setNewEdgeWeight(edge.weight.toString());
         setIsWeightModalOpen(true);
         setPendingEdge(null);
     };

     // Determine cursor based on mode
     const getCursorStyle = () => {
        if (readOnly) return 'cursor-not-allowed';
        switch (mode) {
            case 'node': return draggingNodeId ? 'cursor-grabbing' : 'cursor-grab'; // Grab/Grabbing for nodes
            case 'edge': return drawingEdge ? 'cursor-grabbing' : 'cursor-crosshair'; // Crosshair/Grabbing for edges
            case 'set-source': return 'cursor-pointer'; // Pointer for setting source
            default: return 'cursor-default';
        }
     };


    return (
        <div className="relative w-full h-full border rounded-md overflow-hidden bg-background">
            {!readOnly && (
                <div className={cn(
                    "absolute top-2 left-2 z-20 p-1.5 bg-background/80 border border-border rounded text-xs text-muted-foreground max-w-[200px]",
                    "transition-opacity duration-300",
                     // Hide hint if interacting or modal is open
                     (drawingEdge || draggingNodeId || isWeightModalOpen || editingEdge || mode === 'set-source') ? "opacity-0 pointer-events-none" : "opacity-100"
                     )}>
                    {mode === 'node' && "Click: Add Node | Drag: Move Node"}
                    {mode === 'edge' && "Drag between Nodes: Add Edge | Click Edge: Edit/Delete"}
                    {mode === 'set-source' && "Click on a Node to set as Source"}
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
                    // Clean up state if mouse leaves canvas
                    if (mode === 'node' && draggingNodeId !== null) {
                         triggerGraphChange(nodes, edges); // Finalize potential move
                         setDraggingNodeId(null);
                    }
                     if (mode === 'edge' && drawingEdge !== null){
                         setDrawingEdge(null); // Cancel drawing edge
                     }
                }}
                className={cn(
                    "block",
                    getCursorStyle() // Apply dynamic cursor style
                )}
            />

             {/* Edit/Delete controls appear only in 'edge' mode when an edge is selected */}
             {mode === 'edge' && editingEdge && !readOnly && (
                <div className="absolute top-2 right-2 z-20 flex space-x-1 p-1 bg-background/80 rounded border">
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => openEditWeightModal(editingEdge)} aria-label="Edit Edge Weight">
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive/90" onClick={() => deleteEdge(editingEdge.id)} aria-label="Delete Edge">
                        <X className="h-4 w-4" />
                    </Button>
                 </div>
             )}

            {/* Weight Modal (used for both adding new and editing existing edges) */}
            <Dialog open={isWeightModalOpen} onOpenChange={(open) => {
                setIsWeightModalOpen(open);
                 if (!open) {
                     // If modal is closed, deselect edge and clear pending edge
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
                                         // Determine action based on whether we are editing or adding
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
