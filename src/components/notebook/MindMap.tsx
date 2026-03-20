"use client";

import { useEffect, useState } from 'react';
import {
    ReactFlow,
    Controls,
    Background,
    applyNodeChanges,
    applyEdgeChanges,
    Node,
    Edge,
    NodeChange,
    EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

interface MindMapProps {
    initialNodes: Node[];
    initialEdges: Edge[];
}

export default function MindMap({ initialNodes, initialEdges }: MindMapProps) {
    const [nodes, setNodes] = useState<Node[]>(initialNodes);
    const [edges, setEdges] = useState<Edge[]>(initialEdges);

    // Sync state if initial props change
    useEffect(() => {
        setNodes(initialNodes);
        setEdges(initialEdges);
    }, [initialNodes, initialEdges]);

    // Handle dragging and interactions without mutating original props directly
    const onNodesChange = (changes: NodeChange<Node>[]) => {
        setNodes((nds) => applyNodeChanges(changes, nds));
    }
    const onEdgesChange = (changes: EdgeChange<Edge>[]) => {
        setEdges((eds) => applyEdgeChanges(changes, eds));
    }

    return (
        <div className="w-full h-full min-h-[400px] bg-white rounded-xl shadow-inner border border-black/5 overflow-hidden relative">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                fitView
            >
                <Background color="#ccc" gap={16} />
                <Controls />
            </ReactFlow>
        </div>
    );
}
