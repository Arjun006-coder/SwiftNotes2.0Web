import { NextResponse } from 'next/server';
import Tesseract from 'tesseract.js';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'Image file is required' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Tesseract.recognize accepts a Buffer
        const { data: { text } } = await Tesseract.recognize(buffer, 'eng', {
            logger: m => console.log(m)
        });

        return NextResponse.json({ text });
    } catch (error) {
        console.error("Image OCR Error:", error);
        return NextResponse.json({ error: 'Failed to process image OCR.' }, { status: 500 });
    }
}
