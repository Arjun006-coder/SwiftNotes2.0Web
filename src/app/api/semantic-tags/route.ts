import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
    try {
        const { search } = await req.json();
        if (!search || !search.trim()) {
            return NextResponse.json({ tags: [] });
        }

        // 1. Fetch all unique global tags from the community
        const { data: notebooks, error } = await supabaseAdmin
            .from("Notebook")
            .select("tags")
            .eq("isPublic", true)
            .limit(1000);

        if (error) {
            console.error("Failed to fetch global tags:", error.message);
            return NextResponse.json({ tags: [search] }); // fallback to raw search
        }

        const allTags = new Set<string>();
        notebooks?.forEach(nb => {
            if (nb.tags && Array.isArray(nb.tags)) {
                nb.tags.forEach((t: string) => allTags.add(t));
            }
        });

        const tagList = Array.from(allTags);
        if (tagList.length === 0) {
            return NextResponse.json({ tags: [search] });
        }

        const prompt = `You are a semantic NLP search engine. 
Given the user's search query "${search}", find up to 10 most semantically related tags from this exact list of available database tags.
Available Database Tags: [${tagList.join(", ")}]

Return EXACTLY a pure JSON array of strings containing the matched tags from the list. Do not include tags that are not in the list unless it's the exact user query.
OUTPUT ONLY RAW JSON. NO CONVERSATION. NO MARKDOWN.
Example: ["machine learning", "python", "ai"]`;

        if (!process.env.GEMINI_API_KEY) {
            throw new Error("Missing GEMINI_API_KEY");
        }

        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        
        const response = await model.generateContent(prompt);
        let jsonText = response.response.text().trim();
        const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
        
        let mappedTags: string[] = [search]; // always include explicit search just in case
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                if (Array.isArray(parsed)) {
                    mappedTags = [...new Set([...parsed, search])];
                }
            } catch (e) {
                console.error("Failed to parse NLP JSON:", jsonText);
            }
        }

        return NextResponse.json({ tags: mappedTags });
    } catch (e: any) {
        console.error("Semantic Tag NLP Error:", e);
        return NextResponse.json({ error: "Failed to map semantic tags" }, { status: 500 });
    }
}
