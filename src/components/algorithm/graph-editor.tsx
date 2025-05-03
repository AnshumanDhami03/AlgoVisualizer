// src/components/algorithm/graph-editor.tsx
"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Graph, Node, Edge } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Pencil, Check, Touchpad } from 'lucide-react'; // Added Touchpad
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
import { useIsMobile } from '@/hooks/use-mobile'; // Import useIsMobile hook
import type { GraphEditorMode } from './algorithm-visualizer';

interface GraphEditorProps {
    graph: Graph;
    onGraphChange: (newGraph: Graph) => void;
    width: number;
    height: number;
    readOnly?: boolean;
    mode: GraphEditorMode;
    onSetStartNode: (nodeId: number) => void;
}

const NODE_RADIUS = 22;
const EDGE_HIT_WIDTH = 8;

const GraphEditor: React.FC<GraphEditorProps> = ({
    graph,
    onGraphChange,
    width,
    height,
    readOnly = false,
    mode,
    onSetStartNode,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [nodes, setNodes] = useState<Node[]>(graph.nodes);
    const [edges, setEdges] = useState<Edge[]>(graph.edges);
    const [draggingNodeId, setDraggingNodeId] = useState<number | null>(null);
    const [drawingEdge, setDrawingEdge] = useState<{ source: number; x: number; y: number } | null>(null); // Desktop drag state
    const [firstNodeForEdge, setFirstNodeForEdge] = useState<Node | null>(null); // Mobile tap state
    const [editingEdge, setEditingEdge] = useState<Edge | null>(null);
    const [newEdgeWeight, setNewEdgeWeight] = useState<string>('1');
    const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
    const [pendingEdge, setPendingEdge] = useState<{ source: number; target: number } | null>(null);
    const [nextNodeId, setNextNodeId] = useState(0);
    const { toast } = useToast();
    const isMobile = useIsMobile(); // Detect mobile device

    // Update internal state ONLY when the graph prop *identity* changes
    useEffect(() => {
        setNodes(graph.nodes);
        setEdges(graph.edges);
        const maxId = graph.nodes.reduce((max, node) => Math.max(max, node.id), -1);
        setNextNodeId(maxId + 1);
        // Reset interaction states if graph externally changes
        setDraggingNodeId(null);
        setDrawingEdge(null);
        setFirstNodeForEdge(null);
        setEditingEdge(null);
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
        // const foregroundColor = computedStyle.getPropertyValue('--foreground').trim(); // Removed unused
        // const destructiveColor = computedStyle.getPropertyValue('--destructive').trim(); // Removed unused

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

        // Draw temporary edge being drawn (only in 'edge' mode on DESKTOP)
        if (drawingEdge && mode === 'edge' && !isMobile) {
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
             const isSourceForDrawingEdge = drawingEdge?.source === node.id && mode === 'edge' && !isMobile; // Only for desktop drag
             const isFirstNodeForMobileEdge = firstNodeForEdge?.id === node.id && mode === 'edge' && isMobile; // Highlight first tapped node on mobile
             const isSetSourceCandidate = mode === 'set-source';

            // Fill styling
            if (isDraggingThisNode || isSourceForDrawingEdge) {
                ctx.fillStyle = `hsl(${primaryColor})`; // Primary color when interacting (desktop drag)
            } else if (isFirstNodeForMobileEdge) {
                 ctx.fillStyle = `hsl(${primaryColor})`; // Primary color for first tap on mobile
            } else if (isSetSourceCandidate) {
                ctx.fillStyle = `hsla(${accentColor}, 0.7)`; // Semi-transparent accent when setting source
            } else {
                ctx.fillStyle = `hsl(${mutedColor})`; // Default muted color
            }
             ctx.fill();

             // Stroke styling
            let strokeStyle = `hsl(${mutedFgColor})`;
             let lineWidth = 1.5;
            if (isDraggingThisNode || isSourceForDrawingEdge) {
                strokeStyle = `hsl(${primaryFgColor})`; // Primary foreground for desktop interaction stroke
            } else if (isFirstNodeForMobileEdge) {
                 strokeStyle = `hsl(${primaryFgColor})`; // Primary foreground for mobile first tap stroke
                 lineWidth = 2.5; // Make selection clearer on mobile
            } else if (isSetSourceCandidate) {
                strokeStyle = `hsl(${accentColor})`; // Accent stroke when setting source
                 lineWidth = 2.0;
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
    // Depend on internal state variables that affect drawing AND mode, isMobile, firstNodeForEdge
    }, [nodes, edges, draggingNodeId, drawingEdge, width, height, editingEdge, mode, isMobile, firstNodeForEdge]);

    // Effect to redraw canvas when relevant state changes
    useEffect(() => {
        draw();
    }, [draw]);

     const getMousePos = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): { x: number; y: number } => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        let clientX: number;
        let clientY: number;

        if ('touches' in event) { // Touch event
            clientX = event.touches[0]?.clientX ?? 0;
            clientY = event.touches[0]?.clientY ?? 0;
        } else { // Mouse event
            clientX = event.clientX;
            clientY = event.clientY;
        }

        return {
            x: clientX - rect.left,
            y: clientY - rect.top,
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

    // Combined handler for mouse down and touch start
    const handlePointerDown = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (readOnly) return;
        const { x, y } = getMousePos(event);
        const clickedNode = getNodeAtPos(x, y);
        const clickedEdge = getEdgeAtPos(x, y);

        // Reset states on new interaction
        setEditingEdge(null);
        setDraggingNodeId(null);
        if (!isMobile) setDrawingEdge(null); // Only reset desktop drag state
        // Don't reset firstNodeForEdge here, handle it in the mode logic

        if (mode === 'node') {
            if (clickedNode) {
                setDraggingNodeId(clickedNode.id); // Allow dragging in node mode (works for touch drag too)
                if ('touches' in event) event.preventDefault(); // Prevent scrolling on touch drag
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
            if (isMobile) {
                // Mobile tap interaction
                if (clickedNode) {
                    if (!firstNodeForEdge) {
                        // First tap: select the source node
                        setFirstNodeForEdge(clickedNode);
                    } else {
                        // Second tap: create edge if different node
                        if (clickedNode.id !== firstNodeForEdge.id) {
                            const sourceId = firstNodeForEdge.id;
                            const targetId = clickedNode.id;
                            createEdge(sourceId, targetId); // Call edge creation logic
                        } else {
                            // Tapped the same node twice, deselect
                            setFirstNodeForEdge(null);
                        }
                    }
                } else {
                    // Tapped empty space or an edge, deselect first node
                    setFirstNodeForEdge(null);
                    if (clickedEdge) {
                        setEditingEdge(clickedEdge); // Allow editing/deleting edge on tap
                    }
                }
            } else {
                // Desktop drag interaction
                if (clickedNode) {
                    setDrawingEdge({ source: clickedNode.id, x, y }); // Start drawing edge
                } else if (clickedEdge) {
                    setEditingEdge(clickedEdge); // Select edge for editing/deletion
                }
            }
        } else if (mode === 'set-source') {
             if (clickedNode) {
                onSetStartNode(clickedNode.id); // Call parent handler
             } else {
                  toast({ title: "Select a Node", description: "Click directly on a node to set it as the source.", variant:"default" });
             }
        }
    };

    // Combined handler for mouse move and touch move
    const handlePointerMove = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (readOnly) return;
        const { x, y } = getMousePos(event);

        // Only move node if in 'node' mode and dragging a node
        if (mode === 'node' && draggingNodeId !== null) {
             if ('touches' in event) event.preventDefault(); // Prevent scrolling on touch drag
            const boundedX = Math.max(NODE_RADIUS, Math.min(width - NODE_RADIUS, x));
            const boundedY = Math.max(NODE_RADIUS, Math.min(height - NODE_RADIUS, y));
            const updatedNodes = nodes.map(node =>
                node.id === draggingNodeId ? { ...node, x: boundedX, y: boundedY } : node
            );
            setNodes(updatedNodes);
            triggerGraphChange(updatedNodes, edges); // Update frequently during drag
        }
        // Only update drawing edge if in 'edge' mode and on DESKTOP
        else if (mode === 'edge' && drawingEdge && !isMobile) {
            setDrawingEdge({ ...drawingEdge, x, y });
        }
    };

     // Combined handler for mouse up and touch end
    const handlePointerUp = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (readOnly) return;
        const { x, y } = getMousePos(event); // Use adjusted position if needed (e.g., for touchEnd)

        // Finalize edge drawing only in 'edge' mode on DESKTOP
        if (mode === 'edge' && drawingEdge && !isMobile) {
            const targetNode = getNodeAtPos(x, y);
            if (targetNode && targetNode.id !== drawingEdge.source) {
                const sourceId = drawingEdge.source;
                const targetId = targetNode.id;
                createEdge(sourceId, targetId); // Call edge creation logic
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
        // Keep selected edge if modal opens. Reset firstNodeForEdge on mobile if tapping empty.
        if (mode === 'edge') {
             if (!isWeightModalOpen && !getNodeAtPos(x,y) && !getEdgeAtPos(x,y)){
                 setEditingEdge(null);
                 if (isMobile) setFirstNodeForEdge(null); // Reset mobile selection on empty tap
             }
        }
    };

    // Refactored edge creation logic
    const createEdge = (sourceId: number, targetId: number) => {
         const edgeExists = edges.some(edge =>
             (edge.source === sourceId && edge.target === targetId) ||
             (edge.source === targetId && edge.target === sourceId)
         );

         if (!edgeExists) {
             setPendingEdge({ source: sourceId, target: targetId });
             setNewEdgeWeight('1'); // Reset to default weight
             setIsWeightModalOpen(true);
         } else {
              toast({ title: "Edge Exists", description: `Edge between node ${sourceId} and ${targetId} already exists.`, variant: "destructive" });
         }
          // Reset mobile selection after attempting edge creation
         if (isMobile) setFirstNodeForEdge(null);
    }


    const handleConfirmWeight = () => {
        if (!pendingEdge) return;
        const weight = parseInt(newEdgeWeight, 10);
        if (isNaN(weight) || weight <= 0) {
            toast({ title: "Invalid Weight", description: "Weight must be a positive number.", variant: "destructive" });
            return;
        }

        const newEdge: Edge = {
            id: `edge-${pendingEdge.source}-${pendingEdge.target}-${weight}-${Date.now() % 10000}`,
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

     // Delete Node - Placeholder, might need explicit controls
     /*
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
     */

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
         if (!editingEdge) return;
         const weight = parseInt(newEdgeWeight, 10);
         if (isNaN(weight) || weight <= 0) {
             toast({ title: "Invalid Weight", description: "Weight must be a positive number.", variant: "destructive" });
             return;
         }

         const updatedEdges = edges.map(edge =>
             edge.id === editingEdge.id
              ? { ...edge, weight: weight, id: `edge-${edge.source}-${edge.target}-${weight}-${Date.now() % 10000}` } // Update weight and ID
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
         setFirstNodeForEdge(null); // Ensure mobile selection is reset
     };

     // Determine cursor based on mode and device
     const getCursorStyle = () => {
        if (readOnly) return 'cursor-not-allowed';
        if (isMobile) {
            // Mobile uses tap, generally default cursor is fine, maybe pointer in edge/source mode
            switch (mode) {
                case 'edge':
                case 'set-source':
                    return 'cursor-pointer';
                case 'node':
                    return 'cursor-default'; // Or maybe 'grab' if you want to indicate movability
                default:
                    return 'cursor-default';
            }
        } else {
            // Desktop cursor logic
            switch (mode) {
                case 'node': return draggingNodeId ? 'cursor-grabbing' : 'cursor-grab';
                case 'edge': return drawingEdge ? 'cursor-grabbing' : 'cursor-crosshair';
                case 'set-source': return 'cursor-pointer';
                default: return 'cursor-default';
            }
        }
     };


    return (
        <div className="relative w-full h-full border rounded-md overflow-hidden bg-background touch-none"> {/* Added touch-none */}
            {!readOnly && (
                <div className={cn(
                    "absolute top-2 left-2 z-20 p-1.5 bg-background/80 border border-border rounded text-xs text-muted-foreground max-w-[calc(100%-1rem)] sm:max-w-[250px]", // Adjusted max-width
                    "transition-opacity duration-300",
                     // Hide hint if interacting or modal is open
                     (drawingEdge || draggingNodeId || firstNodeForEdge || isWeightModalOpen || editingEdge || mode === 'set-source') ? "opacity-0 pointer-events-none" : "opacity-100"
                     )}>
                    {mode === 'node' && "Click: Add Node | Drag: Move Node"}
                    {mode === 'edge' && (isMobile ? "Tap Node: Select | Tap 2nd Node: Add Edge" : "Drag between Nodes: Add Edge | Click Edge: Edit/Delete")}
                    {mode === 'set-source' && "Click on a Node to set as Source"}
                 </div>
            )}
            {isMobile && mode === 'edge' && firstNodeForEdge && (
                 <div className="absolute top-2 right-2 z-20 p-1.5 bg-primary/80 text-primary-foreground rounded text-xs flex items-center gap-1">
                     <Touchpad className="h-3 w-3"/> Tap 2nd node
                 </div>
            )}

            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                onMouseDown={handlePointerDown}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
                onTouchStart={handlePointerDown}
                onTouchMove={handlePointerMove}
                onTouchEnd={handlePointerUp}
                onMouseLeave={() => {
                     if (mode === 'node' && draggingNodeId !== null) {
                         triggerGraphChange(nodes, edges);
                         setDraggingNodeId(null);
                     }
                      if (mode === 'edge' && drawingEdge !== null && !isMobile){
                          setDrawingEdge(null);
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
                     setEditingEdge(null);
                     setPendingEdge(null);
                     setFirstNodeForEdge(null); // Reset mobile selection on modal close
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
                                         setFirstNodeForEdge(null); // Reset mobile selection on escape
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
                           {editingEdge ? <><Check className="mr-2 h-4 w-4"/> Update</> : <><Check className="mr-2 h-4 w-4"/> Add Edge</>}
                         </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default GraphEditor;

    