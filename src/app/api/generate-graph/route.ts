import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text) return NextResponse.json({ error: 'Text required to generate graph' }, { status: 400 });

    const prompt = `Analyze the following educational notebook text and extract the core concepts and their relationships to create a mind map or topic dependency tree.
Return EXACTLY a valid JSON object with the following structure:
{
  "nodes": [
    { "id": "1", "data": { "label": "Main Topic" }, "position": { "x": 250, "y": 0 } }
  ],
  "edges": [
    { "id": "e1-2", "source": "1", "target": "2", "label": "is a", "type": "smoothstep" }
  ]
}
Make sure nodes have sensible relative x/y positions to look like a top-down tree or a radial mind map. Space the nodes out well! (e.g. 200px increments).
OUTPUT ONLY RAW JSON. NO CONVERSATION. NO MARKDOWN.
        
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
    
    // Robustly extract JSON even if the AI hallucinates conversational wrappers
    let jsonText = result.response.trim();
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        jsonText = jsonMatch[0];
    } else {
        throw new Error("No JSON structure found in output");
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
