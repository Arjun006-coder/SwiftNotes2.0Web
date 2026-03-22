const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config({ path: ".env.local" });

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
    console.error("No Gemini API key found in .env.local!");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);

const PARAGRAPH = `
Photosynthesis is a system of biological processes by which photosynthetic organisms, such as most plants, algae, and cyanobacteria, convert light energy, typically from sunlight, into the chemical energy necessary to fuel their metabolism. The light energy is captured and used to synthesize sugars from carbon dioxide and water, with oxygen released as a waste product. The energy stored in these sugars is then used to fuel cellular processes. Photosynthesis is responsible for producing and maintaining the oxygen content of the Earth's atmosphere, and it supplies most of the biological energy necessary for complex life on Earth. 
The overall equation for photosynthesis is 6CO2 + 6H2O + Light Energy → C6H12O6 + 6O2. Plants capture light energy using pigments, the most important of which are chlorophylls. Chlorophylls absorb light primarily in the blue and red regions of the visible spectrum and reflect green light, giving plants their characteristic color. Photosynthesis consists of two main stages: the light-dependent reactions and the light-independent reactions (Calvin cycle). In the light-dependent reactions, light energy is captured and used to produce ATP and NADPH. These energy-rich molecules are then used in the Calvin cycle to convert carbon dioxide into glucose.

Cellular respiration is the process by which biological fuels are oxidized in the presence of an inorganic electron acceptor, such as oxygen, to produce large amounts of energy, to drive the bulk production of ATP. Cellular respiration may be described as a set of metabolic reactions and processes that take place in the cells of organisms to convert chemical energy from oxygen molecules or nutrients into adenosine triphosphate (ATP), and then release waste products. The reactions involved in respiration are catabolic reactions, which break large molecules into smaller ones, releasing energy because weak high-energy bonds, in particular in diatomic oxygen, are replaced by stronger bonds in the products. Respiration is one of the key ways a cell releases chemical energy to fuel cellular activity. The overall reaction occurs in a series of biochemical steps, some of which are redox reactions. Although cellular respiration is technically a combustion reaction, it clearly does not resemble one when it occurs in a living cell because of the slow, controlled release of energy from the series of reactions. Nutrients that are commonly used by animal and plant cells in respiration include sugar, amino acids and fatty acids, and the most common oxidizing agent (electron acceptor) is molecular oxygen (O2). The chemical energy stored in ATP (the bond of its third phosphate group to the rest of the molecule can be broken allowing more stable products to form, thereby releasing energy for use by the cell) can then be used to drive processes requiring energy, including biosynthesis, locomotion or transport of molecules across cell membranes.
`;

const PROMPTS = {
    summary: (ctx) => `You are Spark AI, an expert study assistant. Summarize this educational content clearly and concisely.

CONTENT:
${ctx || "No content provided."}

Write a well-structured summary with:
# TL;DR
(2-3 sentence overview)

# Key Ideas
- bullet point each major concept

# Important Details
Any formulas, dates, definitions worth noting.`
};

async function testGemini() {
    const MODEL = "gemini-2.5-flash"; 
    const model = genAI.getGenerativeModel({ model: MODEL });
    try {
        const result = await model.generateContent(PROMPTS.summary(PARAGRAPH));
        require('fs').writeFileSync('gemini-result.md', result.response.text(), 'utf8');
        console.log("Wrote cleanly to gemini-result.md");
    } catch (e) {
        console.error("Error:", e);
    }
}
testGemini();
