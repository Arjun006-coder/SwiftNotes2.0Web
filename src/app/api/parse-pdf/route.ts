import { NextResponse } from 'next/server';
const pdfParse = require('pdf-parse');

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'PDF file is required' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const data = await pdfParse(buffer);

        return NextResponse.json({ text: data.text });
    } catch (error) {
        console.error("PDF Parsing Error:", error);
        return NextResponse.json({ error: 'Failed to parse PDF file.' }, { status: 500 });
    }
}
