import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
    try {
        const { examDate, topics, weakAreas, studySpeed } = await req.json();

        if (!process.env.GEMINI_API_KEY) {
            console.warn("GEMINI_API_KEY missing, returning mock plan data.");
            return NextResponse.json({
                plan: [
                    { date: "Day 1 (Mock)", learning: ["Introduction to " + topics], review: [] },
                    { date: "Day 2 (Mock)", learning: ["Deep dive into " + topics], review: ["Introduction to " + topics] },
                    { date: "Day 3 (Mock)", learning: ["Advanced applications"], review: ["Deep dive into " + topics, weakAreas || 'None specified'] },
                ],
                summary: "This is a mock AI schedule since the GEMINI_API_KEY is missing from your environment. Add your API key to `.env.local` to generate real personalized spaced-repetition timelines!"
            });
        }

        if (!examDate || !topics) {
            return NextResponse.json({ error: 'Exam Date and Topics are required' }, { status: 400 });
        }

        const prompt = `Act as an expert study planner and scheduling AI. Create a highly optimized, daily spaced-repetition revision plan.
User's constraints:
- Exam Date: ${examDate}
- Topics to cover (with optional weightage/priority): ${topics}
- Weak areas (needs extra repetition): ${weakAreas || 'None specified'}
- Study Speed: ${studySpeed || 'Medium'}

Generate a structured daily revision plan starting from tomorrow, ending on the exam date. Group the workload logically. Incorporate spaced repetition (learn a topic, review it 2 days later, review it 1 week later). For weak areas, increase review frequency.
Return ONLY valid JSON text in the following structure, with NO markdown ticks or extra formatting:

{
  "plan": [
    {
      "date": "YYYY-MM-DD",
      "learning": ["Topic A", "Topic B"],
      "review": ["Topic C (from previous days)"]
    }
  ],
  "summary": "Short encouraging paragraph about the strategy employed."
}
`;

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
        
        let jsonText = result.response.trim();
        // Llama might still output markdown ticks despite instructions
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
        console.error("Planner Generation Error:", error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
