"use client";
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Eraser, Trash2, Undo2, Redo2 } from 'lucide-react';

interface DrawingCanvasProps {
    drawingData: string | null;
    onUpdate: (data: string) => void;
    isReadOnly?: boolean;
}

const COLORS = [
    { label: 'Black',  val: '#1a1a1a' },
    { label: 'Blue',   val: '#3b82f6' },
    { label: 'Red',    val: '#ef4444' },
    { label: 'Green',  val: '#22c55e' },
    { label: 'Purple', val: '#a855f7' },
    { label: 'Orange', val: '#f97316' },
    { label: 'Pink',   val: '#ec4899' },
    { label: 'Yellow (HL)', val: 'rgba(253,224,71,0.5)' },
    { label: 'Cyan (HL)',   val: 'rgba(103,232,249,0.5)' },
];

const TOOLS = [
    { id: 'pen',         label: '🖊 Pen',        lineWidth: (size: number) => size * 1.2,   opacity: 1,   lineCap: 'round',  lineJoin: 'round'  },
    { id: 'pencil',      label: '✏️ Pencil',     lineWidth: (size: number) => size * 0.8,   opacity: 0.75, lineCap: 'round', lineJoin: 'round'  },
    { id: 'marker',      label: '🖍 Marker',     lineWidth: (size: number) => size * 2.5,   opacity: 0.9, lineCap: 'square', lineJoin: 'miter'  },
    { id: 'highlighter', label: '🟡 Highlight',  lineWidth: (size: number) => size * 5,    opacity: 0.35, lineCap: 'square', lineJoin: 'miter' },
];

const SIZES = [1, 2, 4, 8];

export default function DrawingCanvas({ drawingData, onUpdate, isReadOnly = false }: DrawingCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const drawing = useRef(false);
    const lastPos = useRef<{ x: number; y: number } | null>(null);

    const [color, setColor] = useState(COLORS[0].val);
    const [size, setSize] = useState(2);
    const [toolId, setToolId] = useState('pen');
    const [isEraser, setIsEraser] = useState(false);

    // Undo/redo stacks — stored as dataURL snapshots
    const undoStack = useRef<string[]>([]);
    const redoStack = useRef<string[]>([]);

    const activeTool = TOOLS.find(t => t.id === toolId) || TOOLS[0];

    /* ---- Canvas helpers ---- */
    const getCtx = () => canvasRef.current?.getContext('2d') ?? null;

    const saveSnapshot = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        undoStack.current.push(canvas.toDataURL());
        if (undoStack.current.length > 30) undoStack.current.shift();
        redoStack.current = [];
    }, []);

    const applyDataURL = useCallback((dataUrl: string) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d')!;
        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        };
        img.src = dataUrl;
    }, []);

    const handleUndo = useCallback(() => {
        if (undoStack.current.length === 0) return;
        const canvas = canvasRef.current!;
        redoStack.current.push(canvas.toDataURL());
        const prev = undoStack.current.pop()!;
        applyDataURL(prev);
        onUpdate(prev);
    }, [applyDataURL, onUpdate]);

    const handleRedo = useCallback(() => {
        if (redoStack.current.length === 0) return;
        const canvas = canvasRef.current!;
        undoStack.current.push(canvas.toDataURL());
        const next = redoStack.current.pop()!;
        applyDataURL(next);
        onUpdate(next);
    }, [applyDataURL, onUpdate]);

    /* ---- Keyboard shortcuts ---- */
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (!e.ctrlKey && !e.metaKey) return;
            if (e.key === 'z') { e.preventDefault(); handleUndo(); }
            if (e.key === 'y') { e.preventDefault(); handleRedo(); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [handleUndo, handleRedo]);

    /* ---- Init canvas size and load existing data ---- */
    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const resize = () => {
            const { width, height } = container.getBoundingClientRect();
            const snapshot = canvas.toDataURL();
            canvas.width = width;
            canvas.height = height;
            if (snapshot !== 'data:,') applyDataURL(snapshot);
        };
        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(container);
        return () => ro.disconnect();
    }, [applyDataURL]);

    useEffect(() => {
        if (drawingData && drawingData.startsWith('data:image')) {
            applyDataURL(drawingData);
        }
    }, [drawingData, applyDataURL]);

    /* ---- Drawing utilities ---- */
    const getPos = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        if ('touches' in e) {
            const t = e.touches[0];
            return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
        }
        return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
    };

    const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
        if (isReadOnly) return;
        saveSnapshot();
        drawing.current = true;
        lastPos.current = getPos(e);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!drawing.current || isReadOnly) return;
        const ctx = getCtx();
        const canvas = canvasRef.current;
        if (!ctx || !canvas) return;

        const pos = getPos(e);
        const from = lastPos.current || pos;

        if (isEraser) {
            const w = size * 10;
            ctx.clearRect(pos.x - w / 2, pos.y - w / 2, w, w);
        } else {
            ctx.save();
            ctx.globalAlpha = activeTool.opacity;
            ctx.strokeStyle = color;
            ctx.lineWidth = activeTool.lineWidth(size);
            ctx.lineCap = activeTool.lineCap as CanvasLineCap;
            ctx.lineJoin = activeTool.lineJoin as CanvasLineJoin;

            // Pencil: add slight noise
            if (toolId === 'pencil') {
                ctx.globalAlpha = 0.6 + Math.random() * 0.2;
            }

            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
            ctx.restore();
        }

        lastPos.current = pos;
    };

    const endDraw = () => {
        if (!drawing.current) return;
        drawing.current = false;
        lastPos.current = null;
        const canvas = canvasRef.current;
        if (canvas) onUpdate(canvas.toDataURL());
    };

    const handleClear = () => {
        const canvas = canvasRef.current;
        const ctx = getCtx();
        if (!canvas || !ctx) return;
        saveSnapshot();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        onUpdate('');
    };

    const stopProp = (e: React.SyntheticEvent) => { if (!isReadOnly) e.stopPropagation(); };

    return (
        <div
            ref={containerRef}
            className={`absolute inset-0 z-30 ${isReadOnly ? 'pointer-events-none' : 'pointer-events-auto'}`}
            onPointerDown={stopProp} onMouseDown={stopProp} onTouchStart={stopProp}
            onMouseMove={stopProp} onTouchMove={stopProp}
        >
            {/* ---- Toolbar ---- */}
            {!isReadOnly && (
                <div
                    className="absolute top-2 left-1/2 -translate-x-1/2 z-50 flex flex-wrap items-center gap-1.5 bg-white/95 backdrop-blur-xl px-3 py-1.5 rounded-2xl shadow-xl border border-black/8 max-w-[96vw]"
                    onPointerDown={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}
                >
                    {/* Tool selector */}
                    <div className="flex items-center gap-1 pr-2 border-r border-black/10">
                        {TOOLS.map(t => (
                            <button
                                key={t.id}
                                title={t.label}
                                onClick={() => { setToolId(t.id); setIsEraser(false); }}
                                className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition ${toolId === t.id && !isEraser ? 'bg-primary/15 text-primary' : 'text-gray-500 hover:bg-black/5'}`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Color swatches */}
                    <div className="flex items-center gap-1 pr-2 border-r border-black/10">
                        {COLORS.map(c => (
                            <button
                                key={c.val}
                                title={c.label}
                                onClick={() => { setColor(c.val); setIsEraser(false); }}
                                className={`w-5 h-5 rounded-full border transition-all hover:scale-125 ${color === c.val && !isEraser ? 'ring-2 ring-offset-1 ring-black/40 scale-125' : 'border-black/10'}`}
                                style={{ background: c.val }}
                            />
                        ))}
                    </div>

                    {/* Size dots */}
                    <div className="flex items-center gap-1 pr-2 border-r border-black/10">
                        {SIZES.map(s => (
                            <button
                                key={s}
                                title={`Width ${s}`}
                                onClick={() => { setSize(s); setIsEraser(false); }}
                                className={`w-6 h-6 rounded-lg flex items-center justify-center transition hover:bg-black/5 ${size === s && !isEraser ? 'bg-black/10' : ''}`}
                            >
                                <div className="rounded-full bg-gray-700" style={{ width: Math.max(s * 2.2, 3), height: Math.max(s * 2.2, 3) }} />
                            </button>
                        ))}
                    </div>

                    {/* Eraser */}
                    <button
                        title="Eraser (E)"
                        onClick={() => setIsEraser(v => !v)}
                        className={`p-1.5 rounded-lg transition ${isEraser ? 'bg-primary text-white' : 'hover:bg-black/5 text-gray-600'}`}
                    >
                        <Eraser size={15} />
                    </button>

                    {/* Undo */}
                    <button title="Undo (Ctrl+Z)" onClick={handleUndo} className="p-1.5 rounded-lg hover:bg-black/5 text-gray-600 transition disabled:opacity-30">
                        <Undo2 size={15} />
                    </button>

                    {/* Redo */}
                    <button title="Redo (Ctrl+Y)" onClick={handleRedo} className="p-1.5 rounded-lg hover:bg-black/5 text-gray-600 transition disabled:opacity-30">
                        <Redo2 size={15} />
                    </button>

                    {/* Clear */}
                    <button title="Clear all" onClick={handleClear} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition">
                        <Trash2 size={15} />
                    </button>
                </div>
            )}

            {/* ---- Canvas ---- */}
            <canvas
                ref={canvasRef}
                className="w-full h-full"
                style={{
                    cursor: isEraser ? 'cell' : isReadOnly ? 'default' : 'crosshair',
                    background: 'transparent',
                    touchAction: 'none',
                }}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
            />
        </div>
    );
}
