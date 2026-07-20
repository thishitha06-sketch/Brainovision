import { createRequire } from 'module';

const require = createRequire(import.meta.url);
let pdfParse: any;

try {
  pdfParse = require('pdf-parse');
  // Check if it's default exported or a nested function
  if (pdfParse && typeof pdfParse.default === 'function') {
    pdfParse = pdfParse.default;
  }
} catch (err) {
  console.error('[PDF Parser] Failed to require pdf-parse:', err);
}

export async function parsePdfToText(buffer: Buffer): Promise<string> {
  if (!pdfParse) {
    console.error('[PDF Parser] pdf-parse library is not loaded properly');
    return '';
  }

  try {
    const data = await pdfParse(buffer);
    return data?.text || '';
  } catch (error) {
    console.error('[PDF Parser] Error during PDF parsing:', error);
    // Return empty string to allow falling back to Gemini Vision OCR
    return '';
  }
}
