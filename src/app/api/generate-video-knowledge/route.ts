import { NextResponse } from 'next/server';
import { updateNotebookVideoAINotes } from '@/app/actions';

function chunkText(text: string, chunkSize: number = 1500) {
    const words = text.split(/\s+/);
    const chunks = [];
    for (let i = 0; i < words.length; i += chunkSize) {
        chunks.push(words.slice(i, i + chunkSize).join(" "));
    }
    return chunks;
}

async function callOllama(prompt: string) {
    const response = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: "gemma:2b",
            prompt,
            stream: false,
        }),
    });
    if (!response.ok) throw new Error("Ollama generation failed");
    const data = await response.json();
    return data.response.trim();
}

export async function POST(req: Request) {
    try {
        const { notebookId, videoId, transcript } = await req.json();

        if (!transcript) {
            return NextResponse.json({ error: "Transcript required" }, { status: 400 });
        }

        // 1. Chunk Transcript
        const chunks = chunkText(transcript, 1500); // ~2000 tokens per chunk

        // 2. Map: Extract raw facts from every chunk
        let aggregatedFacts = "";
        for (let i = 0; i < chunks.length; i++) {
            const chunkPrompt = `Analyze the following video transcript chunk (${i+1}/${chunks.length}).
Extract all key topics, important facts, definitions, code blocks, and formulae/equations.
Format as bullet points. Be extremely dense and comprehensive so no information is lost.
TRANSCRIPT CHUNK:
${chunks[i]}`;
            
            const chunkFacts = await callOllama(chunkPrompt);
            aggregatedFacts += `\n\n--- CHUNK ${i+1} FACTS ---\n${chunkFacts}`;
        }

        // 3. Reduce: Generate final tabs from aggregated facts
        // Note: We use the aggregated facts as context instead of the raw transcript to bypass token limits.
        
        const summaryPrompt = `Based on these extracted facts from a video, write a highly detailed, visually appealing, comprehensive educational summary. Break it down using massive Markdown Headers (##) for different themes, use bold text excessively for keywords, and provide extremely deep explanations extracted from the facts. Make it look like a premium study guide. DO NOT use markdown ticks like \`\`\`
FACTS:
${aggregatedFacts}`;
        
        const cheatsheetPrompt = `Based on these extracted facts from a video, create a highly categorized visual Cheat Sheet using Markdown. Group items logically under H2 (##) headers. ADD A DEDICATED SECTION AT THE BOTTOM NAMED "## Quick Revision Points" featuring rapid-fire, high-yield bullet points for instant exam revision. Use bold text extensively. DO NOT use markdown ticks like \`\`\`
FACTS:
${aggregatedFacts}`;

        const flashcardsPrompt = `Based on these extracted facts, generate 10-15 deep, conceptual Question & Answer Flashcards. Format strictly as "Q: ... \nA: ...". Ask hard, deeply analytical questions, not just simple definitions. DO NOT use markdown ticks like \`\`\`
FACTS:
${aggregatedFacts}`;

        const formulaePrompt = `Extract ONLY the mathematical formulae, equations, code snippets, or rigid definitions from these facts. Format them beautifully using markdown headers (##) and bolding. If there are none, simply say "No structural formulae found." DO NOT use markdown ticks like \`\`\`
FACTS:
${aggregatedFacts}`;

        const theoryPrompt = `Explain the deep underlying theory and fundamental concepts behind these facts. Think abstractly and explain the "Why" and "How" in extreme detail. Make it read like a premium textbook chapter with H2 headers, bullet points, and exhaustive conceptual breakdowns. DO NOT use markdown ticks like \`\`\`
FACTS:
${aggregatedFacts}`;

        // Fetch all final formats in parallel
        const [summary, cheatsheet, flashcards, formulae, theory] = await Promise.all([
            callOllama(summaryPrompt),
            callOllama(cheatsheetPrompt),
            callOllama(flashcardsPrompt),
            callOllama(formulaePrompt),
            callOllama(theoryPrompt)
        ]);

        const aiNotes = { summary, cheatsheet, flashcards, formulae, theory };

        // 4. Save to Database
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
