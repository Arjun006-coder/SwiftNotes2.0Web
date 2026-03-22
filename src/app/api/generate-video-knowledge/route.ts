import { NextResponse } from 'next/server';
import { updateNotebookVideoAINotes } from '@/app/actions';

export async function POST(req: Request) {
    try {
        const { notebookId, videoId, transcript, url } = await req.json();

        if (!url) {
            return NextResponse.json({ error: "Video URL required for Python Video API" }, { status: 400 });
        }

        console.log(`Sending Video Extraction request to Python Backend for: ${url}`);

        // Proxy the request to the Local FastAPI Python Backend
        // Ensure app.py is running on localhost:8000
        const pythonResponse = await fetch("http://127.0.0.1:8000/extract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
            signal: AbortSignal.timeout(600000) // 10 minute timeout for video analysis
        });

        if (!pythonResponse.ok) {
            const errData = await pythonResponse.text();
            throw new Error(`Python Backend Error: ${errData}`);
        }

        const aiNotes = await pythonResponse.json();

        // Save cleanly to Database
        if (notebookId && videoId) {
            try {
                await updateNotebookVideoAINotes(notebookId, videoId, aiNotes);
            } catch (dbErr) {
                console.error("Failed to save AI Notes to DB:", dbErr);
            }
        }

        return NextResponse.json(aiNotes);

    } catch (error: any) {
        console.error("AI Pipeline Error:", error);
        return NextResponse.json({ error: error?.message || "Generation failed" }, { status: 500 });
    }
}
