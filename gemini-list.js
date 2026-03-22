const fs = require('fs');
require('dotenv').config({ path: '.env.local' });
const API_KEY = process.env.GEMINI_API_KEY;

async function list() {
    try {
        const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + API_KEY);
        const data = await res.json();
        
        if (data.models) {
            const models = data.models
                .filter(m => m.supportedGenerationMethods.includes('generateContent'))
                .map(m => m.name);
            console.log("AVAILABLE MODELS:\n", models.join("\n"));
        } else {
            console.error("API RESPONSE:", data);
        }
    } catch (e) {
        console.error("Fetch Error:", e);
    }
}
list();
