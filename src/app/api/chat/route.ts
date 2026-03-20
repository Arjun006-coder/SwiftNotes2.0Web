import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const maxDuration = 60;

// The only model available on this API key
const MODEL = "gemini-1.5-flash";

const PROMPTS: Record<string, (ctx: string) => string> = {
    summary: (ctx) => `You are Spark AI, an expert study assistant. Summarize this educational content clearly and concisely.

CONTENT:
${ctx || "No content provided."}

Write a well-structured summary with:
# TL;DR
(2-3 sentence overview)

# Key Ideas
- bullet point each major concept

# Important Details
Any formulas, dates, definitions worth noting.`,

    cheatsheet: (ctx) => `You are Spark AI. Create a dense, scannable study cheatsheet from this content.

CONTENT:
${ctx || "No content provided."}

Format with markdown headers, **bold key terms**, tables where useful, code blocks for code. Make it a quick reference card.`,

    flashcards: (ctx) => `You are Spark AI. Create 10-15 study flashcards from this content.

CONTENT:
${ctx || "No content provided."}

Format each as:
---
**Q:** [Question]
**A:** [Answer]

Mix conceptual, factual, and applied questions. Include code snippets where relevant.`,

    formulae: (ctx) => `You are Spark AI specializing in formulas and equations. Extract all formulas from this content.

CONTENT:
${ctx || "No content provided."}

For each formula:
## [Formula Name]
**Formula:** E = mc²  (use this style)
**Variables:** define each variable
**Used when:** context/application
**Example:** one worked example`,

    theory: (ctx) => `You are Spark AI. Extract and explain all core theories and concepts from this content.

CONTENT:
${ctx || "No content provided."}

Use ## headers for each concept. Include intuitive explanations and real-world analogies.`,

    qna: (ctx) => `You are Spark AI, a highly intelligent educational assistant built to synthesize and explain video lessons.
Your primary source of truth is the provided VIDEO TRANSCRIPT and NOTES context below.
When answering questions:
1. Prioritize definitions, concepts, and context extracted directly from the VIDEO TRANSCRIPT.
2. Only refer to the user's raw NOTES if the transcript lacks the information.
3. Keep answers concise, direct, and heavily formatted with bullet points or bold text for readability.
4. If the answer cannot be found in the provided context, state that the context didn't cover it, but offer a helpful educational answer anyway.

CONTEXT:
${ctx ? `\n---\n${ctx}\n---` : "No context provided."}`,
};

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { messages = [], notebookText = "", promptType = "qna" } = body;

        const promptFn = PROMPTS[promptType] || PROMPTS.qna;
        const systemPrompt = promptFn(notebookText);

        // Single-shot generation (Summary, Cheatsheet, Flashcards, Formulae, Theory)
        if (promptType !== "qna") {
            const response = await fetch("http://localhost:11434/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "gemma:2b",
                    prompt: systemPrompt,
                    stream: false,
                }),
            });
            if (!response.ok) throw new Error("Ollama generation failed");
            const data = await response.json();
            return NextResponse.json({ text: data.response });
        }

        // QnA Chat Conversation
        if (messages.length === 0) {
            return NextResponse.json({ text: "Ask me anything about your notes or video!" });
        }

        // Ollama chat expects: { role: 'system'|'user'|'assistant', content: string }
        const ollamaMessages = [
            { role: "system", content: systemPrompt },
            ...messages.map((m: any) => ({
                role: m.role,
                content: m.text
            }))
        ];

        const response = await fetch("http://localhost:11434/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "gemma:2b",
                messages: ollamaMessages,
                stream: false,
            }),
        });
        if (!response.ok) throw new Error("Ollama chat failed");
        const data = await response.json();
        
        return NextResponse.json({ text: data.message?.content || "" });

    } catch (error: any) {
        console.error("Local AI (Ollama) Error:", error?.message || error);
        return NextResponse.json(
            { error: "Local AI failed. Please ensure Ollama is running and 'llama3' is pulled." },
            { status: 500 }
        );
    }
}
