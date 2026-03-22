import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text) return NextResponse.json({ error: 'Text required to generate graph' }, { status: 400 });

    const prompt = `Analyze the following educational notebook or video context. Extract the core concepts, theories, and their explicit relationships to create a deep, highly structured educational mind map.
You MUST output EXACTLY a valid JSON object matching this schema. NO Markdown, NO conversational text.

{
  "nodes": [
    { "id": "1", "data": { "label": "Main Core Topic" }, "position": { "x": 400, "y": 0 } },
    { "id": "2", "data": { "label": "Sub Concept A" }, "position": { "x": 100, "y": 150 } },
    { "id": "3", "data": { "label": "Sub Concept B" }, "position": { "x": 700, "y": 150 } }
  ],
  "edges": [
    { "id": "e1-2", "source": "1", "target": "2", "label": "depends on", "type": "smoothstep" },
    { "id": "e1-3", "source": "1", "target": "3", "label": "is composed of", "type": "smoothstep" }
  ]
}

Make sure nodes have sensible Cartesian x/y positions to look like a massive top-down tree map. Space nodes effectively (at least 200px increments). Include 10-20 highly relevant educational nodes.

CONTEXT TEXT:
${text}`;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: {
            responseMimeType: "application/json",
        }
    });

    const result = await model.generateContent(prompt);
    const jsonText = result.response.text();

    try {
      const parsed = JSON.parse(jsonText);
      return NextResponse.json(parsed);
    } catch (parseError) {
      console.error("Gemini returned malformed JSON:", jsonText);
      return NextResponse.json({ error: "AI failed to generate structural JSON." }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Graph Generation Error:", error?.message || error);
    return NextResponse.json({ error: "Graph extraction failed." }, { status: 500 });
  }
}
