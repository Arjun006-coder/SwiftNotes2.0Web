import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY missing, returning mock graph data.");
      return NextResponse.json({
        nodes: [
          { id: "1", data: { label: "Mock Knowledge Base" }, position: { x: 250, y: 0 } },
          { id: "2", data: { label: "Set GEMINI_API_KEY in .env.local" }, position: { x: 100, y: 150 } },
          { id: "3", data: { label: "Unlock AI Generation" }, position: { x: 400, y: 150 } }
        ],
        edges: [
          { id: "e1-2", source: "1", target: "2", label: "requires", type: "smoothstep" },
          { id: "e1-3", source: "1", target: "3", label: "enables", type: "smoothstep" }
        ]
      });
    }

    const { text } = await req.json();
    if (!text) return NextResponse.json({ error: 'Text required to generate graph' }, { status: 400 });

    const prompt = `Analyze the following educational notebook text and extract the key concepts and their relationships to create a mind map or topic dependency tree.
Return ONLY a valid JSON object with the following structure:
{
  "nodes": [
    { "id": "1", "data": { "label": "Main Topic" }, "position": { "x": 250, "y": 0 } }
  ],
  "edges": [
    { "id": "e1-2", "source": "1", "target": "2", "label": "is a", "type": "smoothstep" }
  ]
}
Make sure nodes have sensible relative x/y positions to look like a top-down tree or a radial mind map. Space the nodes out well! (e.g. 200px increments).
Do not include markdown blocks like \`\`\`json, just return raw JSON text.
        
Text:
${text}`;

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
    const result = await response.json();
    
    // Remove markdown formatting if any exists
    let jsonText = result.response.trim();
    if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    }

    try {
      const parsed = JSON.parse(jsonText);
      return NextResponse.json(parsed);
    } catch (parseError) {
      console.error("AI returned malformed JSON:", jsonText);
      return NextResponse.json({ error: "AI failed to generate structural JSON." }, { status: 500 });
    }
  } catch (error) {
    console.error("Graph Generation Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
