"use client";

import React, { useState, useEffect } from 'react';
import { Loader2, FileDown, PlaySquare } from 'lucide-react';

export default function PlaylistPdfGenerator() {
    const [url, setUrl] = useState('');
    const [taskId, setTaskId] = useState<string | null>(null);
    const [status, setStatus] = useState('');
    const [progress, setProgress] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const BACKEND_URL = "https://multigranular-darrin-nonartistical.ngrok-free.dev";

    const startProcessing = async () => {
        if (!url || !url.includes('list=')) {
            setError("Please enter a valid YouTube Playlist URL.");
            return;
        }

        setIsProcessing(true);
        setError(null);
        setPdfUrl(null);
        setProgress(0);
        setStatus("Starting...");

        try {
            const res = await fetch(`${BACKEND_URL}/playlist-pdf`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url })
            });
            
            if (!res.ok) throw new Error("Failed to start processing on backend.");
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
                    const res = await fetch(`${BACKEND_URL}/status/${taskId}`);
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

    return (
        <div className="w-full max-w-2xl mx-auto p-6 bg-gray-900 border border-gray-800 rounded-xl shadow-xl mt-8 font-sans">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-2">
                <PlaySquare className="text-blue-500" />
                Playlist to PDF Master
            </h2>
            <p className="text-gray-400 mb-6 text-sm">
                Paste a YouTube Playlist URL. The AI will watch up to 10 videos, extract their knowledge, and compile a single comprehensive PDF study guide.
            </p>

            {!isProcessing && !pdfUrl && (
                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="text"
                        placeholder="https://www.youtube.com/playlist?list=..."
                        className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                    />
                    <button 
                        onClick={startProcessing}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-3 rounded-lg transition-colors whitespace-nowrap"
                    >
                        Generate PDF
                    </button>
                </div>
            )}

            {error && (
                <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">
                    {error}
                </div>
            )}

            {isProcessing && (
                <div className="mt-6 space-y-4">
                    <div className="flex justify-between text-sm text-gray-300">
                        <span className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                            {status}
                        </span>
                        <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden border border-gray-700">
                        <div 
                            className="bg-blue-500 h-3 rounded-full transition-all duration-500 ease-out" 
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            )}

            {pdfUrl && (
                <div className="mt-6 p-6 border border-green-500/30 bg-green-900/10 rounded-xl flex flex-col items-center text-center">
                    <FileDown className="w-12 h-12 text-green-400 mb-3" />
                    <h3 className="text-lg font-bold text-white mb-1">Your PDF is Ready!</h3>
                    <p className="text-gray-400 text-sm mb-4">
                        All videos have been summarized and combined successfully.
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
                            onClick={() => { setPdfUrl(null); setUrl(''); setProgress(0); setTaskId(null); }}
                            className="bg-gray-800 hover:bg-gray-700 text-white font-medium px-6 py-3 rounded-lg transition-colors w-full sm:w-auto text-center"
                        >
                            Start Over
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
