import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const maxDuration = 60;

// The only model available on this API key
const MODEL = "gemini-1.5-flash";

const PROMPTS: Record<string, (ctx: string) => string> = {
    summary: (ctx) => `You are Spark AI, an expert study assistant. Summarize this educational content in extreme detail. You must cover every single topic discussed, leave nothing out, and even provide insightful extra facts or context to deepen understanding.

CONTENT:
${ctx || "No content provided."}

Write a comprehensive, highly-structured summary with:
# TL;DR
(2-3 sentence high-level overview)

# Deep Dive: Key Concepts
- Use detailed bullet points to explore every major and minor concept.
- If the content lacks detail, use your expert knowledge to inject insightful extra facts that directly enrich the topic.

# Important Details
Extract any historical context, exact definitions, and critical variables worth noting.`,

    cheatsheet: (ctx) => `You are Spark AI. Create a dense, highly scannable study cheatsheet from this content designed for lightning-fast quick revision.

CONTENT:
${ctx || "No content provided."}

Format exclusively with markdown headers, **bold key terms**, rapid-fire bullet points, and tables where useful. Make it the ultimate 1-page quick reference card. Condense the fluff, keep the absolute core concepts.`,

    flashcards: (ctx) => `You are Spark AI. Create 10-15 highly effective study flashcards from this content.

CONTENT:
${ctx || "No content provided."}

Format each strictly as:
---
**Q:** [Question]
**A:** [Answer]

Mix conceptual, factual, and strictly applied questions. Include code snippets or equations in the answer where highly relevant.`,

    formulae: (ctx) => `You are Spark AI specializing in extreme technical extraction. You must extract EVERY SINGLE mathematical formula, equation, OR programming code snippet from this content.

CONTENT:
${ctx || "No content provided."}

For each mathematical formula OR code block, format like this:
## [Formula / Code Name]
**Formula / Code:** (Use markdown code blocks or math formatting)
**Variables / Syntax:** (Define exactly what each variable or parameter means)
**Used when:** (Explain the exact scenario or condition where this is applied)
**Example:** (Provide one practical worked example or usage)`,

    theory: (ctx) => `You are Spark AI. Extract and explain all core theories and concepts from this content.

CONTENT:
${ctx || "No content provided."}

Use ## headers for each concept. Include intuitive explanations, step-by-step logic, and real-world analogies.`,

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

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Single-shot generation (Summary, Cheatsheet, Flashcards, Formulae, Theory)
        if (promptType !== "qna") {
            const result = await model.generateContent(systemPrompt);
            return NextResponse.json({ text: result.response.text() });
        }

        // QnA Chat Conversation
        if (messages.length === 0) {
            return NextResponse.json({ text: "Ask me anything about your notes or video!" });
        }

        // Gemini history expects: { role: 'user' | 'model', parts: [{text: string}] }
        // The last message in the array is typically the user's prompt. We must separate history and the exact msg.
        const userMessage = messages[messages.length - 1].text;
        const previousMessages = messages.slice(0, -1);

        const geminiHistory = [
            { role: "user", parts: [{ text: `System Instructions: ${systemPrompt}\n\nAcknowledge these instructions and wait for my question.` }] },
            { role: "model", parts: [{ text: "Understood. I will strictly follow these instructions to answer your questions based on the provided context." }] },
            ...previousMessages.map((m: any) => ({
                role: m.role === "assistant" ? "model" : "user",
                parts: [{ text: m.text }]
            }))
        ];

        const chat = model.startChat({ history: geminiHistory });
        const result = await chat.sendMessage(userMessage);

        return NextResponse.json({ text: result.response.text() || "" });

    } catch (error: any) {
        console.error("Gemini API Error:", error?.message || error);
        return NextResponse.json(
            { error: "Generation failed. Please try again." },
            { status: 500 }
        );
    }
}
