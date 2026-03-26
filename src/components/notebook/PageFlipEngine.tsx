"use client";

import React, { forwardRef, useRef, useCallback, useState } from "react";
import HTMLFlipBook from "react-pageflip";
import LinedPaper from "./LinedPaper";
import PolaroidSnap from "./PolaroidSnap";
import NotebookEditor from "./NotebookEditor";
import DrawingCanvas from "./DrawingCanvas";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PageProps {
    number: number;
    id?: string;
    content: string;
    drawingData?: string | null;
    mode: "text" | "draw";
    onSaveText?: (content: string) => void;
    onSaveDrawing?: (data: string) => void;
    onSaveSnap?: (snapId: string, x: number, y: number) => void;
    onDeleteSnap?: (snapId: string) => void;
    onSeekTo?: (seconds: number) => void;
    onSnapSeek?: (imageUrl: string) => void;
    snaps?: any[];
    readOnly?: boolean;
    isActive?: boolean;
    onPageClick?: (pageId: string) => void;
}

const Page = forwardRef<HTMLDivElement, PageProps>((props, ref) => {
    return (
        // No overflow-hidden — polaroids must float freely
        <div 
            className="demoPage bg-[#fffce0] shadow-[inset_0_0_20px_rgba(0,0,0,0.02)] relative transition-shadow duration-500" 
            style={props.isActive ? { boxShadow: "inset 0 0 20px rgba(0, 0, 0, 0.02), inset 0 0 0 2px rgba(99, 102, 241, 0.15)" } : undefined}
            ref={ref}
            onClickCapture={() => { if (props.onPageClick && props.id) props.onPageClick(props.id); }}
        >
            <LinedPaper />

            {/* Drawing Canvas */}
            <div className={`absolute inset-0 z-10 ${props.mode === "draw" && !props.readOnly ? "pointer-events-auto" : "pointer-events-none"}`}>
                <DrawingCanvas
                    drawingData={props.drawingData || null}
                    onUpdate={(data) => { if (props.onSaveDrawing && !props.readOnly) props.onSaveDrawing(data); }}
                    isReadOnly={props.mode !== "draw" || props.readOnly}
                />
            </div>

            {/* Text Editor */}
            <div className={`absolute inset-0 z-20 ${props.mode === "text" && !props.readOnly ? "pointer-events-auto" : "pointer-events-none"}`}>
                <NotebookEditor
                    pageId={props.id || `temp-${props.number}`}
                    content={props.content}
                    onUpdate={(html: string) => { if (props.onSaveText && !props.readOnly) props.onSaveText(html); }}
                    isReadOnly={props.mode !== "text" || props.readOnly}
                />
            </div>

            {/* Polaroid snaps — z-30, above everything */}
            <div className="absolute inset-0 z-30 pointer-events-none">
                {props.snaps?.map((s: any, i: number) => (
                    <div key={s.id || i} className="pointer-events-auto">
                        <PolaroidSnap
                            id={s.id}
                            imageUrl={s.imageUrl || s.url}
                            caption={s.caption}
                            defaultX={s.defaultX ?? (60 + (i * 18))}
                            defaultY={s.defaultY ?? (80 + (i * 18))}
                            rotation={s.rotation ?? (i % 2 === 0 ? -4 : 3)}
                            onSavePosition={props.onSaveSnap}
                            onDelete={props.onDeleteSnap}
                            onSeekTo={props.onSeekTo}
                            onSnapSeek={props.onSnapSeek}
                            readOnly={props.readOnly}
                        />
                    </div>
                ))}
            </div>

            {/* Page number */}
            <div className={`absolute bottom-3 right-5 font-display text-xs font-bold z-30 select-none flex items-center gap-1.5 transition-colors ${props.isActive ? "text-indigo-400" : "text-gray-400/50"}`}>
                {props.isActive && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_5px_rgba(99,102,241,0.6)]" title="Target for inserted Snaps/Media" />}
                {props.number}
            </div>
        </div>
    );
});
Page.displayName = "Page";

interface PageFlipEngineProps {
    pages: { id?: string; content: string; drawingData?: string | null; snaps?: any[] }[];
    mode: "text" | "draw";
    onSaveText?: (pageId: string, content: string) => void;
    onSaveDrawing?: (pageId: string, data: string) => void;
    onSaveSnap?: (snapId: string, x: number, y: number) => void;
    onDeleteSnap?: (snapId: string) => void;
    onSeekTo?: (seconds: number) => void;
    onSnapSeek?: (imageUrl: string) => void;
    onFlip?: (pageIndex: number) => void;
    readOnly?: boolean;
    activePageId?: string | null;
    onPageClick?: (pageId: string) => void;
}

export default function PageFlipEngine({ pages, mode, onSaveText, onSaveDrawing, onSaveSnap, onDeleteSnap, onSeekTo, onSnapSeek, onFlip, readOnly, activePageId, onPageClick }: PageFlipEngineProps) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bookRef = useRef<any>(null);
    const [currentPage, setCurrentPage] = useState(0);
    const totalPages = pages.length;

    const flipPrev = useCallback(() => {
        try {
            const rf = bookRef.current;
            if (!rf) return;
            const flip = typeof rf.pageFlip === "function" ? rf.pageFlip() : rf.pageFlip;
            if (flip && typeof flip.flipPrev === "function") flip.flipPrev();
        } catch (e) { console.warn("flipPrev error:", e); }
    }, []);

    const flipNext = useCallback(() => {
        try {
            const rf = bookRef.current;
            if (!rf) return;
            const flip = typeof rf.pageFlip === "function" ? rf.pageFlip() : rf.pageFlip;
            if (flip && typeof flip.flipNext === "function") flip.flipNext();
        } catch (e) { console.warn("flipNext error:", e); }
    }, []);

    return (
        <div className="w-full h-full flex flex-col justify-center items-center overflow-hidden perspective-1000 gap-3">
            {/* The book */}
            <div className="relative flex items-center gap-4">
                {/* Prev arrow */}
                <button
                    onClick={flipPrev}
                    className="shrink-0 w-10 h-10 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm text-white/70 hover:text-white flex items-center justify-center transition shadow-lg z-40"
                    title="Previous page"
                >
                    <ChevronLeft size={20} />
                </button>

                {/* @ts-expect-error - react-pageflip types */}
                <HTMLFlipBook
                    key={pages.length} // Force re-mount on page count change
                    ref={bookRef}
                    width={450}
                    height={650}
                    size="fixed"
                    minWidth={315}
                    maxWidth={500}
                    minHeight={400}
                    maxHeight={700}
                    maxShadowOpacity={0.15}
                    showCover={false}
                    usePortrait={false}
                    mobileScrollSupport={false}
                    className="mx-auto drop-shadow-2xl"
                    style={{ margin: "0 auto" }}
                    drawShadow={true}
                    flippingTime={500}
                    useMouseEvents={false}
                    disableFlipByClick={true}
                    onFlip={(e: any) => {
                        setCurrentPage(e.data);
                        if (onFlip) onFlip(e.data);
                    }}
                >
                    {pages.map((p, i) => (
                        <Page
                            key={p.id || i}
                            number={i + 1}
                            id={p.id}
                            content={p.content}
                            drawingData={p.drawingData}
                            mode={mode}
                            snaps={p.snaps}
                            readOnly={readOnly}
                            isActive={p.id === activePageId}
                            onPageClick={onPageClick}
                            onSaveText={(content) => p.id && onSaveText && onSaveText(p.id, content)}
                            onSaveDrawing={(data) => p.id && onSaveDrawing && onSaveDrawing(p.id, data)}
                            onSaveSnap={(snapId, x, y) => onSaveSnap && onSaveSnap(snapId, x, y)}
                            onDeleteSnap={(snapId) => onDeleteSnap && onDeleteSnap(snapId)}
                            onSeekTo={(secs) => onSeekTo && onSeekTo(secs)}
                            onSnapSeek={(imageUrl) => onSnapSeek && onSnapSeek(imageUrl)}
                        />
                    ))}
                </HTMLFlipBook>

                {/* Next arrow */}
                <button
                    onClick={flipNext}
                    className="shrink-0 w-10 h-10 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm text-white/70 hover:text-white flex items-center justify-center transition shadow-lg z-40"
                    title="Next page"
                >
                    <ChevronRight size={20} />
                </button>
            </div>
            
            {/* Page Counter UI */}
            <div className="text-white/80 font-medium text-sm mt-4 bg-black/40 px-4 py-1.5 rounded-full backdrop-blur-sm shadow-lg border border-white/5 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary/80 animate-pulse" />
                Page {currentPage + 1} of {totalPages}
            </div>
        </div>
    );
}
