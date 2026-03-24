import { NextResponse } from "next/server";
import { spawn } from "child_process";
import { readFile, unlink, access } from "fs/promises";
import { tmpdir } from "os";
import path from "path";

export const maxDuration = 30;

// Full paths to yt-dlp and ffmpeg (winget installs these but doesn't always add to PATH in Node.js env)
const YTDLP_PATHS = [
    "yt-dlp",
    "C:\\Users\\HP\\AppData\\Local\\Microsoft\\WinGet\\Packages\\yt-dlp.yt-dlp_Microsoft.Winget.Source_8wekyb3d8bbwe\\yt-dlp.exe",
];
const FFMPEG_PATHS = [
    "ffmpeg",
    "C:\\Users\\HP\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.0.1-full_build\\bin\\ffmpeg.exe",
];

async function findExe(candidates: string[]): Promise<string> {
    for (const p of candidates) {
        if (!p.includes("\\")) {
            // For short names, we can't easily access() them globally. We will just let them pass if it's the only option,
            // but we *should* prioritize absolute paths that actually exist.
            continue;
        }
        try { await access(p); return p; } catch { /* not found */ }
    }
    // If no absolute paths exist, fallback to short name and hope it's in PATH
    return candidates[0];
}

function runProcess(cmd: string, args: string[], timeoutMs: number): Promise<string> {
    return new Promise((resolve, reject) => {
        const proc = spawn(cmd, args, { stdio: "pipe" });
        let stdout = "";
        let stderr = "";
        proc.stdout?.on("data", (d) => (stdout += d.toString()));
        proc.stderr?.on("data", (d) => (stderr += d.toString()));
        const timer = setTimeout(() => { proc.kill(); reject(new Error(`Timeout: ${path.basename(cmd)}`)); }, timeoutMs);
        proc.on("close", (code) => {
            clearTimeout(timer);
            if (code === 0) resolve(stdout.trim());
            else reject(new Error(`${path.basename(cmd)} exit ${code}: ${stderr.slice(-400)}`));
        });
        proc.on("error", (e) => { clearTimeout(timer); reject(e); });
    });
}

export async function POST(req: Request) {
    const tmpBase = path.join(tmpdir(), `yt_snap_${Date.now()}`);
    const videoFile = `${tmpBase}.mp4`;
    const framePath = `${tmpBase}_frame.jpg`;

    try {
        const { videoId, seconds } = await req.json();
        if (!videoId || seconds === undefined) {
            return NextResponse.json({ error: "videoId and seconds required" }, { status: 400 });
        }

        const [ytdlp, ffmpeg] = await Promise.all([
            findExe(YTDLP_PATHS),
            findExe(FFMPEG_PATHS),
        ]);

        const url = `https://www.youtube.com/watch?v=${videoId}`;

        const streamUrl = await runProcess(ytdlp, [
            "-f", "bestvideo[height<=720]+bestaudio/best",
            "-g",
            "--no-playlist",
            url,
        ], 15000);

        if (!streamUrl) throw new Error("Could not extract stream URL");

        // Step 2: extract exactly 1 frame instantly from the streaming buffer at exact second
        await runProcess(ffmpeg, [
            "-user_agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "-ss", String(seconds),
            "-i", streamUrl.split("\n")[0].trim(),
            "-vframes", "1",
            "-q:v", "3",
            "-y",
            framePath,
        ], 10000);

        // Step 3: base64 encode & return
        const frameBuffer = await readFile(framePath);
        const frameBase64 = `data:image/jpeg;base64,${frameBuffer.toString("base64")}`;
        Promise.allSettled([unlink(videoFile), unlink(framePath)]).catch(() => {});

        return NextResponse.json({ frameBase64 });

    } catch (err: any) {
        console.error("Frame extraction error:", err?.message);
        Promise.allSettled([unlink(videoFile), unlink(framePath)]).catch(() => {});
        // Return error so caller can show thumbnail fallback
        return NextResponse.json({ error: err?.message || "Frame extraction failed" }, { status: 500 });
    }
}
