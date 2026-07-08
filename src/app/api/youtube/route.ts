import { NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';
import { Groq } from 'groq-sdk';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

// Initialize Groq implicitly from process.env.GROQ_API_KEY
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

async function transcribeVideoOffline(url: string, videoId: string) {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) throw new Error("GROQ_API_KEY is missing in .env");

    console.log(`[Groq Pipeline] Forwarding transcription request to Python Backend for ${videoId}...`);
    
    // Forward the request to the ngrok backend which has yt-dlp natively installed.
    // We send the GROQ_API_KEY from the Next.js environment so the backend can use it.
    const res = await fetch("https://multigranular-darrin-nonartistical.ngrok-free.dev/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url, groq_key: groqKey })
    });
    
    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Backend transcription failed: ${err}`);
    }
    
    const data = await res.json();
    if (!data.text) throw new Error("Backend returned empty transcript text.");
    
    return data.text;
}

export async function POST(req: Request) {
    try {
        const { url } = await req.json();
        if (!url) return NextResponse.json({ error: 'YouTube URL is required' }, { status: 400 });

        let videoId = url;
        try {
            const urlObj = new URL(url);
            if (urlObj.hostname.includes('youtube.com')) {
                videoId = urlObj.searchParams.get('v') || url;
            } else if (urlObj.hostname === 'youtu.be') {
                videoId = urlObj.pathname.slice(1);
            }
        } catch (e) {}

        let transcriptText = "";
        try {
            // Plan A: Use YouTube's auto-generated subs network
            console.log(`[API] Attempting native YouTube transcript fetch for ${videoId}...`);
            const transcript = await YoutubeTranscript.fetchTranscript(videoId);
            transcriptText = transcript.map(t => t.text).join(' ').trim();
            if (!transcriptText || transcriptText.length < 10) {
                 throw new Error("Transcript is essentially empty or disabled.");
            }
        } catch (ytError) {
             // Plan B: The creator disabled captions or we are blocked. 
             // EXTREME BYPASS: Use yt-dlp to get the m4a audio and Groq Whisper to transcribe!
             console.log(`[API] Standard fetch failed/blocked. Activating Whisper Bypass for ${videoId}...`);
             try {
                 transcriptText = await transcribeVideoOffline(url, videoId);
                 console.log(`[API] Bypass successful! Transcription completed via Whisper.`);
             } catch (bypassError: any) {
                 console.error("[API] Whisper Bypass also failed:", bypassError?.message || bypassError);
                 transcriptText = "Transcript extraction failed even with AI bypass. Please check if the video has restricted access or is private.";
             }
        }

        return NextResponse.json({ text: transcriptText });
    } catch (error: any) {
        console.error("YouTube Pipeline Error:", error);
        return NextResponse.json({ error: error?.message || 'Failed to fetch or generate transcript.' }, { status: 500 });
    }
}
