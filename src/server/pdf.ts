import { PDFParse } from 'pdf-parse';

export async function parsePdfToText(buffer: Buffer): Promise<string> {
  try {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    return result?.text || '';
  } catch (error) {
    console.error('[PDF Parser] Error during PDF parsing:', error);
    // Return empty string to allow falling back to Gemini Vision OCR
    return '';
  }
}
