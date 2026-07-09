"use client";

import React, { useState, useEffect } from 'react';
import { Loader2, FileDown, PlaySquare, CheckSquare, Square, ListVideo } from 'lucide-react';

export default function PlaylistImporter() {
    const [url, setUrl] = useState('');
    const [isFetching, setIsFetching] = useState(false);
    const [playlistData, setPlaylistData] = useState<any>(null);
    const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
    
    // Task States
    const [taskId, setTaskId] = useState<string | null>(null);
    const [status, setStatus] = useState('');
    const [progress, setProgress] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const BACKEND_URL = "https://multigranular-darrin-nonartistical.ngrok-free.dev";

    const fetchPlaylist = async () => {
        if (!url) return;
        setIsFetching(true);
        setError(null);
        setPlaylistData(null);
        setSelectedVideos([]);
        
        try {
            const res = await fetch(`${BACKEND_URL}/playlist-info`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url })
            });
            
            if (!res.ok) throw new Error("Failed to fetch playlist info.");
            const data = await res.json();
            
            if (data.videos && data.videos.length > 0) {
                setPlaylistData(data);
                // Pre-select all by default
                setSelectedVideos(data.videos.map((v: any) => v.url));
            } else {
                throw new Error("No videos found in this playlist.");
            }
        } catch (err: any) {
            setError(err.message || "Failed to load playlist.");
        } finally {
            setIsFetching(false);
        }
    };

    const toggleVideo = (videoUrl: string) => {
        if (selectedVideos.includes(videoUrl)) {
            setSelectedVideos(selectedVideos.filter(v => v !== videoUrl));
        } else {
            setSelectedVideos([...selectedVideos, videoUrl]);
        }
    };

    const startProcessing = async () => {
        if (selectedVideos.length === 0) {
            setError("Please select at least one video.");
            return;
        }

        setIsProcessing(true);
        setError(null);
        setPdfUrl(null);
        setProgress(0);
        setStatus("Starting...");

        // Map selected URLs back to title and url objects
        const chosenVids = playlistData.videos
            .filter((v: any) => selectedVideos.includes(v.url))
            .map((v: any) => ({ url: v.url, title: v.title }));

        try {
            const res = await fetch(`${BACKEND_URL}/custom-pdf`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    title: playlistData.title || "Custom Playlist Notes",
                    videos: chosenVids 
                })
            });
            
            if (!res.ok) throw new Error("Failed to start custom PDF generation.");
            const data = await res.json();
            setTaskId(data.task_id);
        } catch (err: any) {
            setError(err.message || "Something went wrong.");
            setIsProcessing(false);
        }
    };

    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (taskId && isProcessing) {
            interval = setInterval(async () => {
                try {
                    const res = await fetch(`${BACKEND_URL}/status/${taskId}`, {
                        headers: { "ngrok-skip-browser-warning": "true" }
                    });
                    if (!res.ok) throw new Error("Status check failed");
                    
                    const data = await res.json();
                    setStatus(data.status);
                    setProgress(data.progress);
                    
                    if (data.status.startsWith("Error")) {
                        setError(data.status);
                        setIsProcessing(false);
                        clearInterval(interval);
                    }
                    
                    if (data.progress === 100 && data.pdf_url) {
                        setPdfUrl(`${BACKEND_URL}${data.pdf_url}`);
                        setIsProcessing(false);
                        clearInterval(interval);
                    }
                } catch (err: any) {
                    console.error("Status Poll Error:", err);
                }
            }, 3000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [taskId, isProcessing]);

    // Reset everything
    const startOver = () => {
        setPdfUrl(null); 
        setUrl(''); 
        setProgress(0); 
        setTaskId(null);
        setPlaylistData(null);
        setSelectedVideos([]);
    };

    return (
        <div className="w-full bg-gray-900 border border-gray-800 rounded-xl shadow-xl overflow-hidden font-sans">
            <div className="p-4 border-b border-gray-800 bg-gray-800/50 flex items-center gap-3">
                <ListVideo className="text-blue-500 w-6 h-6" />
                <h2 className="text-xl font-bold text-white">Advanced Playlist Importer</h2>
            </div>
            
            <div className="p-6">
                {/* Step 1: Input URL */}
                {!playlistData && !isProcessing && !pdfUrl && (
                    <div className="space-y-4">
                        <p className="text-gray-400 text-sm">
                            Paste a YouTube Playlist or Channel URL. You will be able to hand-pick which videos to summarize.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <input
                                type="text"
                                placeholder="https://www.youtube.com/playlist?list=..."
                                className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && fetchPlaylist()}
                            />
                            <button 
                                onClick={fetchPlaylist}
                                disabled={isFetching || !url}
                                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2"
                            >
                                {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Fetch Videos"}
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Select Videos */}
                {playlistData && !isProcessing && !pdfUrl && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white line-clamp-1">{playlistData.title}</h3>
                            <span className="text-sm text-gray-400">{selectedVideos.length} / {playlistData.videos.length} selected</span>
                        </div>
                        
                        <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {playlistData.videos.map((video: any, idx: number) => {
                                const isSelected = selectedVideos.includes(video.url);
                                return (
                                    <div 
                                        key={idx} 
                                        onClick={() => toggleVideo(video.url)}
                                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border ${
                                            isSelected ? 'bg-blue-900/20 border-blue-500/50' : 'bg-gray-800 border-gray-700 hover:bg-gray-750'
                                        }`}
                                    >
                                        <button className={isSelected ? "text-blue-500" : "text-gray-500"}>
                                            {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                                        </button>
                                        <span className={`text-sm line-clamp-1 ${isSelected ? 'text-white font-medium' : 'text-gray-400'}`}>
                                            {video.title}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-gray-800">
                            <button 
                                onClick={startProcessing}
                                disabled={selectedVideos.length === 0}
                                className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-lg transition-colors"
                            >
                                Compile {selectedVideos.length} Videos to PDF
                            </button>
                            <button 
                                onClick={startOver}
                                className="bg-gray-800 hover:bg-gray-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {/* Step 3: Processing Status */}
                {isProcessing && (
                    <div className="mt-2 space-y-4">
                        <div className="flex justify-between text-sm text-gray-300">
                            <span className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                                {status}
                            </span>
                            <span>{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden border border-gray-700">
                            <div 
                                className="bg-gradient-to-r from-blue-600 to-cyan-400 h-3 rounded-full transition-all duration-500 ease-out" 
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <p className="text-xs text-gray-500 text-center">
                            Please do not close this window. Compiling knowledge may take a few minutes.
                        </p>
                    </div>
                )}

                {/* Step 4: Complete */}
                {pdfUrl && (
                    <div className="p-6 border border-green-500/30 bg-green-900/10 rounded-xl flex flex-col items-center text-center animate-in zoom-in-95">
                        <FileDown className="w-12 h-12 text-green-400 mb-3" />
                        <h3 className="text-lg font-bold text-white mb-1">Your Knowledge is Ready!</h3>
                        <p className="text-gray-400 text-sm mb-4">
                            {selectedVideos.length} videos have been summarized and merged into your custom PDF.
                        </p>
                        <div className="flex gap-3 w-full sm:w-auto">
                            <a 
                                href={pdfUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="bg-green-600 hover:bg-green-500 text-white font-medium px-8 py-3 rounded-lg transition-colors w-full sm:w-auto text-center"
                            >
                                Download PDF
                            </a>
                            <button 
                                onClick={startOver}
                                className="bg-gray-800 hover:bg-gray-700 text-white font-medium px-6 py-3 rounded-lg transition-colors w-full sm:w-auto text-center"
                            >
                                New Extraction
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
