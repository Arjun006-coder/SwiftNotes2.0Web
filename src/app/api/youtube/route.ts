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
    if (!groq) throw new Error("GROQ_API_KEY is missing in .env but required for Whisper Audio fallback.");
    
    // Save to OS temp directory structure where it's accessible
    const tempDir = path.join(os.tmpdir(), "swiftnotes-media");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    
    const outputPathTemplate = path.join(tempDir, `${videoId}.%(ext)s`);
    const finalAudioPath = path.join(tempDir, `${videoId}.m4a`);
    
    console.log(`[Groq Pipeline] Executing yt-dlp binary natively to extract raw audio for ${videoId}...`);
    // Explicitly select the pre-encoded m4a audio stream to entirely bypass any system FFmpeg requirement!
    const isWin = os.platform() === 'win32';
    const ytDlpBinaryName = isWin ? 'yt-dlp.exe' : 'yt-dlp';
    const ytDlpPath = path.resolve(process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin', ytDlpBinaryName);
    
    // Check if the binary exists just in case
    if (!fs.existsSync(ytDlpPath)) {
        throw new Error(`Critical Dependency Missing: yt-dlp binary not found at ${ytDlpPath}`);
    }

    const cmd = `"${ytDlpPath}" -f "bestaudio[ext=m4a]" -o "${outputPathTemplate}" "${url}"`;
    
    try {
        await execPromise(cmd);
    } catch (e: any) {
        console.error("Yt-dlp error:", e);
        throw new Error("Failed to download video audio stream using yt-dlp. Make sure npx is working.");
    }
    
    if (!fs.existsSync(finalAudioPath)) throw new Error("Audio extraction from yt-dlp failed (no m4a found).");

    console.log(`[Groq Pipeline] Transcribing native M4A via Groq Whisper...`);
    // Pass to Groq Whisper Large V3 Turbo for instant transcription
    const transcription = await groq.audio.transcriptions.create({
        file: fs.createReadStream(finalAudioPath),
        model: "whisper-large-v3-turbo",
        response_format: "json",
    });
    
    return transcription.text;
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
