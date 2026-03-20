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

function runProcess(cmd: string, args: string[], timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
        const proc = spawn(cmd, args, { stdio: "pipe" });
        let stderr = "";
        proc.stderr?.on("data", (d) => (stderr += d.toString()));
        const timer = setTimeout(() => { proc.kill(); reject(new Error(`Timeout: ${path.basename(cmd)}`)); }, timeoutMs);
        proc.on("close", (code) => {
            clearTimeout(timer);
            if (code === 0) resolve();
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
        const startSec = Math.max(0, Math.floor(seconds) - 2);

        // Step 1: download ~6s clip around timestamp
        await runProcess(ytdlp, [
            "--ffmpeg-location", ffmpeg,
            "--download-sections", `*${startSec}-${startSec + 6}`,
            "-f", "bestvideo[height<=480][ext=mp4]/bestvideo[height<=480]/bestvideo",
            "--no-playlist",
            "--force-overwrites",
            "-o", videoFile,
            url,
        ], 25000);

        // Step 2: extract 1 frame
        const offsetInClip = Math.max(0, seconds - startSec);
        await runProcess(ffmpeg, [
            "-ss", String(offsetInClip),
            "-i", videoFile,
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
